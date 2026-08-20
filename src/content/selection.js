/**
 * selection.js — DOM selection capture and editable-target detection.
 *
 * Classic script loaded before content.js.
 * Exposes `window.DictionaryHelperContent.selection`.
 */
(function (global) {
    "use strict";

    const ns = global.DictionaryHelperContent = global.DictionaryHelperContent || {};

    function isEditableTarget(target) {
        if (!target) {
            return false;
        }
        if (target.isContentEditable) {
            return true;
        }
        const tagName = target.tagName ? target.tagName.toLowerCase() : "";
        return tagName === "input" || tagName === "textarea" || tagName === "select";
    }

    function captureSelectionSnapshot(event) {
        const selection = typeof window !== "undefined" ? window.getSelection() : null;
        const text = selection ? String(selection.toString() || "").trim() : "";

        if (!text || !selection || !selection.rangeCount) {
            return null;
        }

        let range = null;
        try {
            range = selection.getRangeAt(0).cloneRange();
        } catch (_error) {
            range = null;
        }

        const rect = range ? range.getBoundingClientRect() : null;
        const contextModule = global.DictionaryHelperContent?.context;
        const extracted = contextModule?.extractSurroundingContext
            ? contextModule.extractSurroundingContext(text)
            : { context: "", source: "", confidence: "none" };

        return {
            text,
            range,
            rect: rect && (rect.width || rect.height)
                ? {
                    top: rect.top,
                    right: rect.right,
                    bottom: rect.bottom,
                    left: rect.left,
                    width: rect.width,
                    height: rect.height
                }
                : null,
            context: extracted.context || "",
            contextSource: extracted.source || "",
            contextConfidence: extracted.confidence || "none",
            clientX: event?.clientX,
            clientY: event?.clientY,
            createdAt: Date.now()
        };
    }

    function getSelectionRectForText(text) {
        const selection = typeof window !== "undefined" ? window.getSelection?.() : null;
        if (!selection || selection.rangeCount === 0) {
            return null;
        }

        const selectedText = selection.toString().trim();
        if (!selectedText || selectedText.toLowerCase() !== String(text || "").trim().toLowerCase()) {
            return null;
        }

        try {
            const rect = selection.getRangeAt(0).getBoundingClientRect();
            return rect.width || rect.height ? rect : null;
        } catch (_error) {
            return null;
        }
    }

    function clearSelection() {
        const selection = typeof window !== "undefined" ? window.getSelection() : null;
        if (selection && selection.rangeCount > 0) {
            try {
                selection.removeAllRanges();
            } catch (_error) {
                // Some documents can reject selection clearing; in that case we keep going.
            }
        }
    }

    ns.selection = {
        isEditableTarget,
        captureSelectionSnapshot,
        getSelectionRectForText,
        clearSelection
    };
})(typeof window !== "undefined" ? window : globalThis);
