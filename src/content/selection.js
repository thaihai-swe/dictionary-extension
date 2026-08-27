/**
 * selection.js — DOM selection capture and editable-target detection.
 *
 * Classic script loaded before content.js.
 * Exposes `window.DictionaryHelperContent.selection`.
 */
(function (global) {
    "use strict";

    const ns = global.DictionaryHelperContent = global.DictionaryHelperContent || {};

    function isFormField(node) {
        const tagName = node && node.tagName ? node.tagName.toLowerCase() : "";
        return tagName === "input" || tagName === "textarea" || tagName === "select";
    }

    function isEditableTarget(target, event) {
        const nodes = [];
        if (event && typeof event.composedPath === "function") {
            try {
                nodes.push(...event.composedPath());
            } catch (_error) {
                // Ignore unreadable composed paths and fall back to the target.
            }
        }
        if (!nodes.length && target) {
            nodes.push(target);
        }

        for (const node of nodes) {
            if (!node || node.nodeType !== 1) {
                continue;
            }
            if (node.isContentEditable || isFormField(node)) {
                return true;
            }
        }

        const selection = getActiveSelection(event);
        const anchor = selection && selection.anchorNode;
        const anchorElement = anchor && (anchor.nodeType === 1 ? anchor : anchor.parentElement);
        if (anchorElement) {
            if (anchorElement.isContentEditable || isFormField(anchorElement)) {
                return true;
            }
            if (typeof anchorElement.closest === "function") {
                const editableHost = anchorElement.closest("input, textarea, select, [contenteditable=''], [contenteditable='true']");
                if (editableHost) {
                    return true;
                }
            }
        }

        return false;
    }

    function getActiveSelection(event) {
        if (event && typeof event.composedPath === "function") {
            try {
                for (const node of event.composedPath()) {
                    const root = node && typeof node.getRootNode === "function" ? node.getRootNode() : null;
                    if (root && typeof root.getSelection === "function") {
                        const nestedSelection = root.getSelection();
                        if (nestedSelection && String(nestedSelection.toString() || "").trim()) {
                            return nestedSelection;
                        }
                    }
                }
            } catch (_error) {
                // Fall through to window.getSelection().
            }
        }

        return typeof window !== "undefined" ? window.getSelection() : null;
    }

    function captureSelectionSnapshot(event) {
        try {
            const selection = getActiveSelection(event);
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
            let extracted = { context: "", source: "", confidence: "none" };
            try {
                if (contextModule?.extractSurroundingContext) {
                    extracted = contextModule.extractSurroundingContext(text) || extracted;
                }
            } catch (_error) {
                // Context is optional; a page DOM exception must not suppress the trigger.
            }

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
        } catch (_error) {
            return null;
        }
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
