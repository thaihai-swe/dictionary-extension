/**
 * content.js — Main content script entry point and DOM event listener bootstrap.
 */
if (window.__dictionaryHelperContentInitialized) {
    // no-op
} else {
    window.__dictionaryHelperContentInitialized = true;

    const ns = window.DictionaryHelperContent || {};

    init();

    function init() {
        const renderer = window.DictionaryHelperRenderer;
        const audio = window.DictionaryHelperAudio;
        const lookupCache = window.DictionaryHelperCache;
        const popupHelpers = window.DictionaryHelperPopupHelpers;

        if (!renderer || !audio || !lookupCache || !popupHelpers) {
            return;
        }

        ns.messageRouter?.loadSettings().catch((err) => ns.messageRouter?.handleExtensionContextError(err));

        window.addEventListener("mousedown", (e) => ns.selectionTriggers?.handleMouseDown(e), true);
        window.addEventListener("mouseup", (e) => ns.selectionTriggers?.handleMouseUpTrigger(e), true);
        window.addEventListener("dblclick", (e) => ns.selectionTriggers?.handleDoubleClickTrigger(e), true);
        window.addEventListener("keydown", (e) => ns.keyboard?.handleKeydown(e), true);
        document.addEventListener("selectionchange", () => ns.selectionTriggers?.handleSelectionChange());

        if (window === window.top) {
            window.addEventListener("mouseup", (e) => ns.selectionTriggers?.handleTopFrameIframeSelection(e), true);
            window.addEventListener("dblclick", (e) => ns.selectionTriggers?.handleTopFrameIframeSelection(e), true);
        }

        try {
            chrome.storage.onChanged.addListener((changes, area) => ns.messageRouter?.handleStorageChanges(changes, area));
            chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => ns.messageRouter?.handleRuntimeMessage(msg, sender, sendResponse));
        } catch (error) {
            ns.messageRouter?.handleExtensionContextError(error);
        }
    }
}
