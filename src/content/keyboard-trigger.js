/**
 * keyboard-handlers.js — Global keydown, Shift+Q shortcut triggers, and outside pointer dismissal.
 */
(function (global) {
    "use strict";

    const ns = global.DictionaryHelperContent = global.DictionaryHelperContent || {};

    function isConfiguredPostSelectionKey(event, modifier) {
        const key = String(event.key || "").toLowerCase();

        if (modifier === "shift" || modifier === "shift_q") {
            return event.shiftKey && (key === "q" || event.code === "KeyQ");
        }

        if (modifier === "alt") {
            return (event.altKey || event.key === "Alt" || key === "alt") && (key === "q" || event.code === "KeyQ" || event.key === "Alt");
        }

        if (modifier === "ctrl") {
            return (event.ctrlKey || event.metaKey) && (key === "q" || event.code === "KeyQ" || event.key === "Control" || event.key === "Meta");
        }

        return false;
    }

    function handleKeydown(event) {
        const state = ns.state;
        if (event.key === "Escape") {
            ns.selectionTriggers?.destroyTriggerIcon();
            if (state.popupRoot) {
                ns.popupDom?.destroyPopup({ animate: true });
            }
            return;
        }

        handlePostSelectionModifier(event);
    }

    function handlePostSelectionModifier(event) {
        const state = ns.state;
        const utils = ns.eventUtils;

        if (utils?.isSitePaused(state.settings.pausedHostnames) || state.isPointerSelecting || event.repeat) {
            return;
        }

        const mode = ns.selectionTriggers?.getSelectionTriggerMode();
        if (mode === "off") {
            return;
        }

        if (utils?.isEditableTarget(event.target, event)) {
            return;
        }

        if (utils?.eventContainsNode(state.popupRoot, event) || utils?.eventContainsNode(state.triggerIconRoot, event)) {
            return;
        }

        let snapshot = state.currentSelectionSnapshot;
        if (!snapshot || !snapshot.text) {
            const rawSelection = typeof window !== "undefined" && window.getSelection ? window.getSelection().toString().trim() : "";
            if (rawSelection) {
                snapshot = {
                    text: rawSelection,
                    rect: ns.tabLoader?.getSelectionRectForText(rawSelection),
                    context: "",
                    contextSource: "",
                    contextConfidence: "none"
                };
            }
        }

        if (!snapshot || !snapshot.text) {
            return;
        }

        const modifier = state.settings.postSelectionModifier || "shift";
        if (!isConfiguredPostSelectionKey(event, modifier)) {
            return;
        }

        // Ignore chorded shortcuts with other modifier keys
        if (modifier === "shift" && (event.altKey || event.ctrlKey || event.metaKey)) {
            return;
        }
        if (modifier === "alt" && (event.shiftKey || event.ctrlKey || event.metaKey)) {
            return;
        }
        if (modifier === "ctrl" && (event.shiftKey || event.altKey)) {
            return;
        }

        if (state.popupRoot && state.activeText === snapshot.text) {
            return;
        }

        event.preventDefault();
        ns.tabLoader?.openPopupFromSnapshot(snapshot, event, { keyboard: true });
    }

    function handleOutsidePointer(event) {
        const state = ns.state;
        const utils = ns.eventUtils;

        if (utils?.eventContainsNode(state.triggerIconRoot, event)) {
            return;
        }

        if (state.popupRoot && !utils?.eventContainsNode(state.popupRoot, event)) {
            const selection = window.getSelection();
            if (!selection || !selection.toString().trim()) {
                ns.popupDom?.destroyPopup();
            }
        }

        if (
            state.triggerIconRoot
            && (!state.currentSelectionSnapshot || !state.currentSelectionSnapshot.text)
            && !utils?.eventContainsNode(state.popupRoot, event)
        ) {
            ns.selectionTriggers?.destroyTriggerIcon();
        }
    }

    ns.keyboardTrigger = ns.keyboard = {
        handleKeydown,
        handlePostSelectionModifier,
        isConfiguredPostSelectionKey,
        handleOutsidePointer
    };
})(typeof window !== "undefined" ? window : globalThis);
