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

// Initial migrations and menu setup
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

// Runtime message listener
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message?.type === VALIDATE_PROVIDER) {
        handleValidateProvider(message.payload)
            .then((result) => sendResponse({ ok: true, result }))
            .catch((error) => {
                sendResponse({
                    ok: false,
                    error: error instanceof Error ? error.message : "Validation failed."
                });
            });
        return true;
    }

    if (message?.type === CANCEL_LOOKUP) {
        cancelRequestsForTab(sender?.tab?.id);
        sendResponse({ ok: true });
        return false;
    }

    if (message?.type === INJECT_FRAME) {
        const tabId = sender?.tab?.id;
        if (!Number.isInteger(tabId)) {
            sendResponse({ ok: false, error: "Missing tab." });
            return false;
        }
        const frameId = Number(message.payload?.frameId);
        const allFrames = Boolean(message.payload?.allFrames);
        injectContentScript(tabId, allFrames ? null : (Number.isInteger(frameId) ? frameId : 0))
            .then(() => sendResponse({ ok: true }))
            .catch((error) => sendResponse({
                ok: false,
                error: error instanceof Error ? error.message : "Unable to inject into this frame."
            }));
        return true;
    }

    if (message?.type !== LOOKUP_TEXT) {
        return false;
    }

    handleLookup(message.payload, sender)
        .then((result) => sendResponse({ ok: true, result }))
        .catch((error) => {
            sendResponse({
                ok: false,
                error: error instanceof Error ? error.message : "Lookup failed."
            });
        });

    return true;
});

// Storage changes listener
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
            // Restricted pages already surface via the toolbar badge path when possible.
        }
    });
}
