/**
 * message-router.js — Storage changes listener, runtime message dispatcher, and error handler.
 */
(function (global) {
    "use strict";

    const ns = global.DictionaryHelperContent = global.DictionaryHelperContent || {};

    async function loadSettings() {
        const state = ns.state;
        const popupHelpers = window.DictionaryHelperPopupHelpers;
        state.settings = await ns.settings?.loadSettings() || state.settings;
        const lastTab = await popupHelpers?.readLastTab();
        const availableTabs = ns.tabLoader?.getAvailableTabs() || [];
        state.activeTab = availableTabs.includes(lastTab)
            ? lastTab
            : availableTabs.includes(state.settings.defaultTab)
                ? state.settings.defaultTab
                : availableTabs[0] || "dictionary";
    }

    function handleStorageChanges(changes, areaName) {
        const state = ns.state;
        const utils = ns.eventUtils;
        const lookupCache = window.DictionaryHelperCache ? window.DictionaryHelperCache.createLookupCache() : null;

        if (!state.extensionContextValid) {
            return;
        }

        if (areaName !== "sync" && areaName !== "local") {
            return;
        }

        state.settings = ns.settings?.applyStorageChanges(state.settings, changes, areaName) || state.settings;

        if (
            areaName === "sync"
            && (
                changes.theme
                || changes.fontFamily
                || changes.selectionTriggerMode
                || changes.postSelectionModifier
                || changes.pausedHostnames
            )
        ) {
            ns.popupDom?.applyTheme();
            if (state.settings.selectionTriggerMode !== "icon" || utils?.isSitePaused(state.settings.pausedHostnames)) {
                ns.selectionTriggers?.destroyTriggerIcon();
            }
        }

        let outputChanged = false;
        if (changes) {
            outputChanged = ns.settings?.affectsOutput
                ? ns.settings.affectsOutput(changes)
                : false;

            if (outputChanged) {
                lookupCache?.clear();
                state.lastPreloadKey = "";
            }
        }

        const availableTabs = ns.tabLoader?.getAvailableTabs() || [];
        const tabAvailabilityChanged = !availableTabs.includes(state.activeTab);
        if (tabAvailabilityChanged) {
            state.activeTab = availableTabs[0] || "dictionary";
        }

        if (state.popupRoot && (outputChanged || tabAvailabilityChanged)) {
            ns.popupDom?.applyPopupDimensions();
            ns.tabLoader?.setPopupPosition(state.currentPosition);
            ns.popupDom?.renderShell();
            if (state.activeText) {
                void ns.tabLoader?.loadTab(state.activeTab);
            }
        }
    }

    function handleRuntimeMessage(message, _sender, sendResponse) {
        const state = ns.state;
        const renderer = window.DictionaryHelperRenderer;
        const audio = window.DictionaryHelperAudio;
        const popupHelpers = window.DictionaryHelperPopupHelpers;
        const lookupCache = window.DictionaryHelperCache ? window.DictionaryHelperCache.createLookupCache() : null;

        if (message?.type === "GET_PAGE_CONTEXT") {
            const text = String(message.payload?.text || state.activeText || "").trim();
            const extracted = state.activeContext && (!text || text === state.activeText)
                ? {
                    context: state.activeContext,
                    source: state.activeContextSource,
                    confidence: state.activeContextConfidence
                }
                : ns.eventUtils?.extractSurroundingContext(text) || { context: "", source: "", confidence: "none" };
            sendResponse({
                context: extracted.context || "",
                source: extracted.source || "",
                confidence: extracted.confidence || "none"
            });
            return true;
        }

        const updateType = window.DictionaryHelperMessages?.LOOKUP_UPDATE || "LOOKUP_UPDATE";
        if (message?.type === updateType) {
            const payload = message.payload || {};
            const result = payload.result;
            if (!popupHelpers?.shouldApplyLookupUpdate({
                payload,
                activeTab: state.activeTab,
                activeText: state.activeText,
                activeRequestId: state.activeRequestId,
                lastRevision: state.lastLookupRevision,
                surfaceReady: Boolean(state.popupRoot)
            })) {
                return false;
            }

            if (result?.requestId) {
                state.activeRequestId = result.requestId;
            }
            if (Number.isFinite(payload.revision)) {
                state.lastLookupRevision = payload.revision;
                if (result) result.revision = payload.revision;
            }

            const cacheKey = ns.lookup?.buildRequestCacheKey("dictionary", state.activeText.trim(), state.settings, {});
            if (lookupCache && cacheKey && result) {
                lookupCache.set(cacheKey, result);
            }

            const body = state.popupRoot?.querySelector(".dictionary-helper-body");
            if (body && result) {
                popupHelpers.paintLookupResult(body, renderer?.renderResult(result, ns.getRenderOptions()));
                audio?.restorePracticeResult(body, state.activeText, result.pronunciation?.language);
            }
            return false;
        }

        if (message?.type !== "OPEN_LOOKUP_POPUP") {
            return false;
        }

        if (message.payload?.fromSelection) {
            const snapshot = state.currentSelectionSnapshot || ns.selectionTriggers?.captureSelectionSnapshot(null);
            if (snapshot?.text) {
                ns.tabLoader?.openPopupFromSnapshot(snapshot, null, { keyboard: true });
            }
            sendResponse?.({ ok: Boolean(snapshot?.text) });
            return true;
        }

        ns.tabLoader?.openPopupForText(message.payload?.text || "", null, {
            context: message.payload?.context || "",
            contextSource: message.payload?.contextSource || "",
            contextConfidence: message.payload?.contextConfidence || ""
        });
        sendResponse?.({ ok: true });
        return true;
    }

    function handleExtensionContextError(error) {
        if (!isExtensionContextInvalidated(error)) {
            return;
        }
        ns.state.extensionContextValid = false;
    }

    function isExtensionContextInvalidated(error) {
        return ns.lookup?.isExtensionContextInvalidated(error);
    }

    ns.messageRouter = {
        loadSettings,
        handleStorageChanges,
        handleRuntimeMessage,
        handleExtensionContextError,
        isExtensionContextInvalidated
    };
})(typeof window !== "undefined" ? window : globalThis);
