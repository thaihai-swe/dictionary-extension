import { canInjectIntoUrl } from "../shared/page-utils.js";
import { CONTENT_SCRIPT_CSS, CONTENT_SCRIPT_JS } from "../shared/content-scripts.js";
import { OPEN_LOOKUP_POPUP } from "../shared/messages.js";
import { getCachedSettings } from "./settings-cache.js";

export const CONTEXT_MENU_ID = "dictionary-helper-lookup";

let contextMenuInitPromise = null;

export async function initializeContextMenu() {
    if (!chrome.contextMenus) {
        return;
    }

    if (contextMenuInitPromise) {
        return contextMenuInitPromise;
    }

    contextMenuInitPromise = (async () => {
        try {
            const settings = await getCachedSettings();

            await new Promise((resolve) => {
                chrome.contextMenus.removeAll(() => {
                    if (chrome.runtime.lastError) {
                        // Suppress removeAll error
                    }
                    resolve();
                });
            });

            if (!settings.enableContextMenuTrigger) {
                return;
            }

            await new Promise((resolve) => {
                chrome.contextMenus.create({
                    id: CONTEXT_MENU_ID,
                    title: 'Look up "%s"',
                    contexts: ["selection"]
                }, () => {
                    if (chrome.runtime.lastError) {
                        // Suppress duplicate ID warning if racing
                    }
                    resolve();
                });
            });
        } catch (_err) {
            // Best-effort
        } finally {
            contextMenuInitPromise = null;
        }
    })();

    return contextMenuInitPromise;
}

export async function notifyPageRestricted(tabId, text) {
    try {
        if (chrome.action?.setBadgeText) {
            await chrome.action.setBadgeText({ text: "!", tabId });
            await chrome.action.setBadgeBackgroundColor({ color: "#8C2B2B", tabId });
            await chrome.action.setTitle({
                title: `Dictionary unavailable on this browser page for "${text.slice(0, 30)}"`,
                tabId
            });
        }
    } catch (_badgeError) {
        // Best-effort badge update.
    }
}

export async function tryOpenInPagePopup(tab, text, frameId = 0) {
    if (!tab?.id || !canInjectIntoUrl(tab.url)) {
        return false;
    }

    const payload = { text: String(text || "").trim() };
    if (!payload.text) {
        return false;
    }

    const selectionFrameId = Number.isInteger(frameId) ? frameId : 0;
    if (selectionFrameId > 0) {
        try {
            const extracted = await sendMessageToTabWithRetry(tab.id, {
                type: "GET_PAGE_CONTEXT",
                payload: { text: payload.text }
            }, selectionFrameId);
            const context = String(extracted?.context || "").trim();
            if (context) {
                payload.context = context;
                payload.contextSource = "selection";
                payload.contextConfidence = "exact";
            }
        } catch (_contextError) {
            // Context is optional; still attempt to open the lookup surface.
        }
    }

    const frameCandidates = selectionFrameId > 0 ? [0, selectionFrameId] : [0];
    for (const candidate of frameCandidates) {
        try {
            await sendMessageToTabWithRetry(tab.id, {
                type: OPEN_LOOKUP_POPUP,
                payload
            }, candidate);
            return true;
        } catch (_error) {
            // Try the next visible or selection frame.
        }
    }

    return false;
}

export async function sendMessageToTabWithRetry(tabId, message, frameId = 0) {
    const options = Number.isInteger(frameId) ? { frameId } : undefined;
    try {
        return await chrome.tabs.sendMessage(tabId, message, options);
    } catch (error) {
        if (!isMissingReceiverError(error)) {
            throw error;
        }

        await injectContentScript(tabId, frameId);
        return chrome.tabs.sendMessage(tabId, message, options);
    }
}

export async function injectContentScript(tabId, frameId = 0) {
    const targets = [];

    if (frameId === null) {
        targets.push({ tabId, allFrames: true });
    } else if (Number.isInteger(frameId) && frameId > 0) {
        targets.push({ tabId, frameIds: [frameId] });
        targets.push({ tabId, allFrames: true });
    } else {
        targets.push({ tabId, frameIds: [0] });
    }

    let lastError = null;
    for (const target of targets) {
        try {
            await chrome.scripting.insertCSS({
                target,
                files: CONTENT_SCRIPT_CSS
            });
            await chrome.scripting.executeScript({
                target,
                files: CONTENT_SCRIPT_JS
            });
            return;
        } catch (error) {
            lastError = error;
        }
    }

    if (lastError) {
        throw lastError;
    }
}

export function isMissingReceiverError(error) {
    const message = error?.message || String(error || "");
    return message.includes("Could not establish connection") || message.includes("Receiving end does not exist");
}
