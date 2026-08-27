/**
 * selection-triggers.js — Mouseup, dblclick, iframe selection triggers, and floating icon management.
 */
(function (global) {
    "use strict";

    const ns = global.DictionaryHelperContent = global.DictionaryHelperContent || {};

    function cancelSelectionClear() {
        const state = ns.state;
        if (!state.selectionClearTimer) {
            return;
        }
        window.clearTimeout(state.selectionClearTimer);
        state.selectionClearTimer = 0;
    }

    function getSelectionTriggerMode() {
        return ns.trigger?.getSelectionTriggerMode?.(ns.state.settings) || ns.state.settings.selectionTriggerMode || "icon";
    }

    function captureSelectionSnapshot(event) {
        return ns.selection?.captureSelectionSnapshot(event);
    }

    function applySelectionTriggerMode(snapshot, event) {
        if (!snapshot?.text) {
            destroyTriggerIcon();
            return;
        }

        const mode = getSelectionTriggerMode();
        if (mode === "instant") {
            destroyTriggerIcon();
            ns.tabLoader?.openPopupFromSnapshot(snapshot, event);
            return;
        }

        if (mode === "icon") {
            renderTriggerIcon(snapshot, event);
            return;
        }

        destroyTriggerIcon();
    }

    function renderTriggerIcon(snapshot, event) {
        const state = ns.state;
        const triggerModule = ns.trigger;

        state.triggerIconRoot = triggerModule.renderTriggerIcon({
            root: state.triggerIconRoot,
            snapshot,
            event,
            settings: state.settings,
            onOpen: (clickEvent) => {
                const targetSnapshot = state.currentSelectionSnapshot || snapshot;
                destroyTriggerIcon();
                ns.tabLoader?.openPopupFromSnapshot(targetSnapshot, clickEvent);
            },
            onPointerDown: () => {
                cancelSelectionClear();
            }
        });
    }

    function destroyTriggerIcon() {
        const state = ns.state;
        state.triggerIconRoot = ns.trigger?.destroyTriggerIcon(state.triggerIconRoot);
    }

    function handleTopFrameIframeSelection(event) {
        const state = ns.state;
        const utils = ns.eventUtils;

        if (utils?.isSitePaused(state.settings.pausedHostnames) || window !== window.top || utils?.eventContainsNode(state.popupRoot, event) || utils?.eventContainsNode(state.triggerIconRoot, event)) {
            return;
        }
        const target = event.target;
        if (!target || target.tagName !== "IFRAME") {
            return;
        }
        try {
            if (!target.contentDocument) {
                return;
            }
        } catch (_error) {
            return;
        }
        if (target.dataset.dictionaryHelperInjecting === "1") {
            return;
        }
        target.dataset.dictionaryHelperInjecting = "1";
        chrome.runtime.sendMessage({
            type: window.DictionaryHelperMessages?.INJECT_FRAME || "INJECT_FRAME",
            payload: { allFrames: true }
        }).catch(() => {
            target.dataset.dictionaryHelperInjecting = "";
        });
    }

    function handleMouseDown(event) {
        const state = ns.state;
        const utils = ns.eventUtils;

        if (utils?.isSitePaused(state.settings.pausedHostnames) && !utils?.eventContainsNode(state.popupRoot, event) && !utils?.eventContainsNode(state.triggerIconRoot, event)) {
            return;
        }
        if (utils?.eventContainsNode(state.popupRoot, event) || utils?.eventContainsNode(state.triggerIconRoot, event)) {
            ns.keyboard?.handleOutsidePointer(event);
            return;
        }

        state.isPointerSelecting = true;
        cancelSelectionClear();
        if (event.detail <= 1) {
            state.currentSelectionSnapshot = null;
            destroyTriggerIcon();
        }
        ns.keyboard?.handleOutsidePointer(event);
    }

    function handleSelectionChange() {
        const state = ns.state;
        const utils = ns.eventUtils;

        if (utils?.isSitePaused(state.settings.pausedHostnames) || state.isPointerSelecting || state.currentSelectionSnapshot) {
            return;
        }

        const selection = window.getSelection();
        if (selection && String(selection.toString() || "").trim()) {
            cancelSelectionClear();
            return;
        }

        cancelSelectionClear();
        state.selectionClearTimer = window.setTimeout(() => {
            state.selectionClearTimer = 0;
            if (state.isPointerSelecting || state.currentSelectionSnapshot) {
                return;
            }
            const nextSelection = window.getSelection();
            if (nextSelection && String(nextSelection.toString() || "").trim()) {
                return;
            }
            destroyTriggerIcon();
        }, 80);
    }

    function applyCapturedSelection(event) {
        const snapshot = captureSelectionSnapshot(event);
        if (!snapshot) {
            return false;
        }

        cancelSelectionClear();
        ns.state.currentSelectionSnapshot = snapshot;
        applySelectionTriggerMode(snapshot, event);
        return true;
    }

    function handleMouseUpTrigger(event) {
        const state = ns.state;
        const utils = ns.eventUtils;

        state.isPointerSelecting = false;

        if (utils?.isSitePaused(state.settings.pausedHostnames)) {
            return;
        }

        if (typeof event.button === "number" && event.button !== 0) {
            return;
        }

        if (utils?.eventContainsNode(state.popupRoot, event) || utils?.eventContainsNode(state.triggerIconRoot, event)) {
            return;
        }

        if (utils?.isEditableTarget(event.target, event)) {
            cancelSelectionClear();
            destroyTriggerIcon();
            state.currentSelectionSnapshot = null;
            return;
        }

        const token = (state.selectionCaptureToken += 1);
        const delay = event.detail > 1 ? 30 : 0;

        const finishCapture = () => {
            if (token !== state.selectionCaptureToken) {
                return;
            }
            if (applyCapturedSelection(event)) {
                return;
            }
            requestAnimationFrame(() => {
                if (token !== state.selectionCaptureToken) {
                    return;
                }
                if (applyCapturedSelection(event)) {
                    return;
                }
                window.setTimeout(() => {
                    if (token !== state.selectionCaptureToken || state.currentSelectionSnapshot) {
                        return;
                    }
                    if (!applyCapturedSelection(event) && !state.currentSelectionSnapshot) {
                        cancelSelectionClear();
                        destroyTriggerIcon();
                    }
                }, 40);
            });
        };

        if (delay) {
            window.setTimeout(finishCapture, delay);
        } else {
            finishCapture();
        }
    }

    function handleDoubleClickTrigger(event) {
        const state = ns.state;
        const utils = ns.eventUtils;

        if (utils?.isSitePaused(state.settings.pausedHostnames)) {
            return;
        }
        const mode = getSelectionTriggerMode();
        if (mode === "off") {
            return;
        }

        if (utils?.eventContainsNode(state.popupRoot, event) || utils?.eventContainsNode(state.triggerIconRoot, event)) {
            return;
        }

        if (utils?.isEditableTarget(event.target, event)) {
            return;
        }

        const token = (state.selectionCaptureToken += 1);
        if (applyCapturedSelection(event)) {
            return;
        }

        requestAnimationFrame(() => {
            if (token !== state.selectionCaptureToken) {
                return;
            }
            if (applyCapturedSelection(event)) {
                return;
            }
            window.setTimeout(() => {
                if (token !== state.selectionCaptureToken) {
                    return;
                }
                applyCapturedSelection(event);
            }, 40);
        });
    }

    ns.selectionTrigger = ns.selectionTriggers = {
        cancelSelectionClear,
        getSelectionTriggerMode,
        captureSelectionSnapshot,
        applySelectionTriggerMode,
        renderTriggerIcon,
        destroyTriggerIcon,
        handleTopFrameIframeSelection,
        handleMouseDown,
        handleSelectionChange,
        applyCapturedSelection,
        handleMouseUpTrigger,
        handleDoubleClickTrigger
    };
})(typeof window !== "undefined" ? window : globalThis);
