/**
 * trigger.js — Floating selection lookup icon.
 *
 * Keeps trigger DOM and positioning separate from popup/lookup orchestration.
 * Exposes `window.DictionaryHelperContent.trigger`.
 */
(function (global) {
    "use strict";

    const ns = global.DictionaryHelperContent = global.DictionaryHelperContent || {};

    function createTriggerIcon({ onOpen, onPointerDown } = {}) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "dictionary-helper-trigger-icon";
        button.setAttribute("aria-label", "Look up selected text");
        button.title = "Look up selected text";
        button.style.position = "fixed";
        button.style.zIndex = "2147483646";
        button.innerHTML = ns.icons?.search || "";

        button.addEventListener("mousedown", (event) => {
            event.preventDefault();
            event.stopPropagation();
            onPointerDown?.(event);
        });
        button.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            onOpen?.(event);
        });
        return button;
    }

    function applyTheme(node, settings = {}) {
        if (!node) return;
        if (settings.theme === "system" || !settings.theme) {
            node.removeAttribute("data-theme");
        } else {
            node.setAttribute("data-theme", settings.theme);
        }
    }

    function positionTriggerIcon(node, snapshot, event) {
        if (!node || !snapshot) return;

        const iconSize = 34;
        const margin = 8;
        const visual = window.visualViewport;
        const viewportWidth = visual?.width || window.innerWidth || document.documentElement.clientWidth || 0;
        const viewportHeight = visual?.height || window.innerHeight || document.documentElement.clientHeight || 0;
        const offsetLeft = visual?.offsetLeft || 0;
        const offsetTop = visual?.offsetTop || 0;
        const rect = snapshot.rect;

        let x = typeof event?.clientX === "number" ? event.clientX + 10 : offsetLeft + 24;
        let y = typeof event?.clientY === "number" ? event.clientY + 10 : offsetTop + 24;
        if (rect) {
            // Prefer the right side, flip left at the boundary, then put the
            // icon above/below if the selected line has no horizontal room.
            x = rect.right + margin;
            y = rect.top + Math.max(0, (rect.height - iconSize) / 2);
            if (x + iconSize > offsetLeft + viewportWidth - margin) x = rect.left - iconSize - margin;
            if (x < offsetLeft + margin) {
                x = Math.max(offsetLeft + margin, Math.min(rect.left, offsetLeft + viewportWidth - iconSize - margin));
                y = rect.bottom + margin;
                if (y + iconSize > offsetTop + viewportHeight - margin) y = rect.top - iconSize - margin;
            }
        }

        x = Math.min(Math.max(offsetLeft + margin, x), Math.max(offsetLeft + margin, offsetLeft + viewportWidth - iconSize - margin));
        y = Math.min(Math.max(offsetTop + margin, y), Math.max(offsetTop + margin, offsetTop + viewportHeight - iconSize - margin));
        node.style.position = "fixed";
        node.style.top = `${Math.round(y)}px`;
        node.style.left = `${Math.round(x)}px`;

        // Pages that put transform/filter on html/body make position:fixed
        // relative to that ancestor. Correct so client coordinates still land
        // in the visible viewport.
        const placed = node.getBoundingClientRect();
        if (placed && Number.isFinite(placed.left) && Number.isFinite(placed.top)) {
            const dx = placed.left - x;
            const dy = placed.top - y;
            if (dx || dy) {
                node.style.left = `${Math.round(x - dx)}px`;
                node.style.top = `${Math.round(y - dy)}px`;
            }
        }
    }

    function renderTriggerIcon({ root, snapshot, event, settings, onOpen, onPointerDown } = {}) {
        if (!snapshot?.text) {
            root?.remove();
            return null;
        }

        let node = root;
        if (!node) {
            node = createTriggerIcon({ onOpen, onPointerDown });
            (document.documentElement || document.body).appendChild(node);
        }

        applyTheme(node, settings);
        positionTriggerIcon(node, snapshot, event);
        return node;
    }

    function destroyTriggerIcon(node) {
        node?.remove();
        return null;
    }

    ns.trigger = {
        createTriggerIcon,
        renderTriggerIcon,
        positionTriggerIcon,
        destroyTriggerIcon,
        applyTheme
    };
})(typeof window !== "undefined" ? window : globalThis);
