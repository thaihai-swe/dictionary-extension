/**
 * event-utils.js — DOM containment, editable target checks, and focus trapping.
 */
(function (global) {
    "use strict";

    const ns = global.DictionaryHelperContent = global.DictionaryHelperContent || {};

    function nodeContains(root, target) {
        if (!root || !target) {
            return false;
        }

        try {
            if (root.contains(target)) {
                return true;
            }
            if (typeof target.composedPath === "function") {
                return false;
            }
            if (typeof target.getRootNode === "function") {
                const rootNode = target.getRootNode();
                const host = rootNode && rootNode.host;
                if (host && root.contains(host)) {
                    return true;
                }
            }
        } catch (_error) {
            return false;
        }

        return false;
    }

    function eventContainsNode(root, event) {
        if (!root || !event) {
            return false;
        }

        if (event.target && nodeContains(root, event.target)) {
            return true;
        }

        if (typeof event.composedPath === "function") {
            try {
                for (const node of event.composedPath()) {
                    if (node && (node === root || nodeContains(root, node))) {
                        return true;
                    }
                }
            } catch (_error) {
                return false;
            }
        }

        return false;
    }

    function isSitePaused(hostnames) {
        const list = hostnames || ns.state?.settings?.pausedHostnames;
        if (!Array.isArray(list) || !list.length) {
            return false;
        }
        const hostname = typeof location !== "undefined" ? location.hostname.toLowerCase() : "";
        if (!hostname) {
            return false;
        }
        return list.some((item) => String(item || "").trim().toLowerCase() === hostname);
    }

    function trapPopupFocus(event, popupRoot) {
        if (event.key !== "Tab" || !popupRoot) return;
        const focusable = [...popupRoot.querySelectorAll('button:not([disabled]), [href], select:not([disabled]), textarea:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])')]
            .filter((node) => !node.hidden && node.offsetParent !== null);
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
        }
    }

    function isEditableTarget(target, event) {
        return ns.selection?.isEditableTarget(target, event);
    }

    function extractSurroundingContext(selectedText) {
        if (ns.state?.settings?.disablePageContextExtraction) {
            return { context: "", source: "", confidence: "none" };
        }
        return ns.context?.extractSurroundingContext(selectedText) || { context: "", source: "", confidence: "none" };
    }

    ns.eventUtils = {
        nodeContains,
        eventContainsNode,
        isSitePaused,
        trapPopupFocus,
        isEditableTarget,
        extractSurroundingContext
    };
})(typeof window !== "undefined" ? window : globalThis);
