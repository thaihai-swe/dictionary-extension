import { migrateLegacySecretSettings, migrateSettingsSchema } from "./shared/storage.js";
import {
    LOOKUP_TEXT,
    VALIDATE_PROVIDER,
    CANCEL_LOOKUP,
    INJECT_FRAME,
    OPEN_LOOKUP_POPUP
} from "./shared/messages.js";
import { canInjectIntoUrl } from "./shared/page-utils.js";
import { cancelRequestsForTab } from "./background/request-controller.js";
import {
    clearEnrichmentMemoryCache,
    clearEnrichmentSessionCache,
    migrateEnrichmentCacheSchema
} from "./background/enrichment-cache.js";
import {
    getCachedSettings,
    handleValidateProvider,
    invalidateCachedSettings
} from "./background/settings-cache.js";
import { handleLookup } from "./background/lookup-core.js";
import {
    CONTEXT_MENU_ID,
    initializeContextMenu,
    injectContentScript,
    notifyPageRestricted,
    sendMessageToTabWithRetry,
    tryOpenInPagePopup
} from "./background/context-menu.js";

const ENRICHMENT_CACHE_INVALIDATION_KEYS = new Set([
    "dictionaryProvider",
    "enableDictionary",
    "enableTranslate",
    "translateProvider",
    "translateTargetLanguage",
    "libreTranslateBaseUrl",
    "libreTranslateApiKey",
    "dictionaryApiKey",
    "wordnikApiKey",
    "wordsApiKey",
    "enableLexicalProfile"
]);

// Initial migrations and context menu setup
Promise.all([
    migrateLegacySecretSettings(),
    migrateSettingsSchema(),
    migrateEnrichmentCacheSchema(),
    initializeContextMenu()
]).catch(() => { });

chrome.runtime.onInstalled.addListener(() => {
    Promise.all([
        migrateLegacySecretSettings(),
        migrateSettingsSchema(),
        migrateEnrichmentCacheSchema(),
        initializeContextMenu()
    ]).catch(() => { });
});

chrome.runtime.onStartup?.addListener(() => {
    Promise.all([
        migrateLegacySecretSettings(),
        migrateSettingsSchema(),
        initializeContextMenu()
    ]).catch(() => { });
});

// Message Dispatch Table (Strategy Pattern)
const MESSAGE_HANDLERS = {
    [VALIDATE_PROVIDER]: async (payload) => {
        const result = await handleValidateProvider(payload);
        return { ok: true, result };
    },
    [CANCEL_LOOKUP]: (_payload, sender) => {
        cancelRequestsForTab(sender?.tab?.id);
        return { ok: true };
    },
    [INJECT_FRAME]: async (payload, sender) => {
        const tabId = sender?.tab?.id;
        if (!Number.isInteger(tabId)) {
            return { ok: false, error: "Missing tab." };
        }
        const frameId = Number(payload?.frameId);
        const allFrames = Boolean(payload?.allFrames);
        await injectContentScript(tabId, allFrames ? null : (Number.isInteger(frameId) ? frameId : 0));
        return { ok: true };
    },
    [LOOKUP_TEXT]: async (payload, sender) => {
        const result = await handleLookup(payload, sender);
        return { ok: true, result };
    }
};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    const handler = MESSAGE_HANDLERS[message?.type];
    if (!handler) {
        return false;
    }

    Promise.resolve(handler(message.payload, sender))
        .then(sendResponse)
        .catch((error) => {
            sendResponse({
                ok: false,
                error: error instanceof Error ? error.message : "Operation failed."
            });
        });

    return true;
});

// Storage changes listener (reactive settings & cache invalidation)
chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === "sync" || areaName === "local") {
        invalidateCachedSettings();
    }

    if (areaName === "sync" && changes.enableContextMenuTrigger) {
        initializeContextMenu().catch(() => { });
    }

    if (areaName !== "sync" && areaName !== "local") {
        return;
    }

    const shouldInvalidate = Object.keys(changes || {}).some((key) => ENRICHMENT_CACHE_INVALIDATION_KEYS.has(key));
    if (shouldInvalidate) {
        clearEnrichmentMemoryCache();
        clearEnrichmentSessionCache().catch(() => { });
    }
});

// Context menu click listener
if (chrome.contextMenus?.onClicked) {
    chrome.contextMenus.onClicked.addListener(async (info, tab) => {
        if (info.menuItemId !== CONTEXT_MENU_ID || !tab?.id) {
            return;
        }

        try {
            const settings = await getCachedSettings();
            if (!settings.enableContextMenuTrigger) {
                return;
            }

            const selectedText = String(info.selectionText || "").trim();
            if (!selectedText) {
                return;
            }

            const opened = await tryOpenInPagePopup(tab, selectedText, info.frameId);
            if (!opened && tab?.id) {
                await notifyPageRestricted(tab.id, selectedText);
            }
        } catch (_error) {
            if (tab?.id && info?.selectionText) {
                await notifyPageRestricted(tab.id, String(info.selectionText).trim());
            }
        }
    });
}

// Global keyboard commands listener
if (chrome.commands?.onCommand) {
    chrome.commands.onCommand.addListener(async (command) => {
        if (command !== "lookup-selection") {
            return;
        }

        const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
        if (!tab?.id || !canInjectIntoUrl(tab.url)) {
            return;
        }

        try {
            await sendMessageToTabWithRetry(tab.id, { type: OPEN_LOOKUP_POPUP, payload: { fromSelection: true } }, 0);
        } catch (_error) {
            // Restricted pages already surface via toolbar badge.
        }
    });
}
