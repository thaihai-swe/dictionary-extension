/**
 * popup-position.js — VisualViewport-aware, collision-safe in-page placement.
 * Classic script loaded before content.js.
 */
(function (global) {
    "use strict";

    const ns = global.DictionaryHelperContent = global.DictionaryHelperContent || {};
    const DEFAULT_MARGIN = 16;
    const SELECTION_CLEARANCE = 8;
    const MIN_HEIGHT = 200;

    function getViewport(viewport, useFixed) {
        const visual = typeof window !== "undefined" ? window.visualViewport : null;
        const width = viewport?.width || visual?.width || (typeof window !== "undefined" ? window.innerWidth : 800);
        const height = viewport?.height || visual?.height || (typeof window !== "undefined" ? window.innerHeight : 600);
        const offsetLeft = viewport?.offsetLeft ?? (visual?.offsetLeft || 0);
        const offsetTop = viewport?.offsetTop ?? (visual?.offsetTop || 0);
        return {
            width,
            height,
            offsetLeft,
            offsetTop,
            scrollX: useFixed ? 0 : (viewport?.scrollX ?? (typeof window !== "undefined" ? window.scrollX : 0)),
            scrollY: useFixed ? 0 : (viewport?.scrollY ?? (typeof window !== "undefined" ? window.scrollY : 0))
        };
    }

    /** Returns document or visual-viewport coordinates suitable for the card. */
    function computePopupPosition(options = {}) {
        const margin = Number.isFinite(options.margin) ? options.margin : DEFAULT_MARGIN;
        const popupWidth = Math.max(320, Number(options.popupSize?.width) || 620);
        const preferredHeight = Math.max(MIN_HEIGHT, Number(options.popupSize?.height) || 720);
        const useFixed = Boolean(options.useFixed);
        const viewport = getViewport(options.viewport, useFixed);
        const rect = options.selectionRect;
        const event = options.event || null;

        let anchorLeft;
        let anchorRight;
        let anchorTop;
        let anchorBottom;
        if (rect && Number.isFinite(rect.left) && Number.isFinite(rect.bottom)) {
            anchorLeft = rect.left;
            anchorRight = Number.isFinite(rect.right) ? rect.right : rect.left + (rect.width || 0);
            anchorTop = rect.top;
            anchorBottom = rect.bottom;
        } else if (event && Number.isFinite(event.clientX) && Number.isFinite(event.clientY)) {
            anchorLeft = anchorRight = event.clientX;
            anchorTop = anchorBottom = event.clientY;
        } else {
            const maxHeight = Math.max(MIN_HEIGHT, viewport.height - margin * 2);
            return {
                x: viewport.scrollX + viewport.offsetLeft + Math.max(margin, (viewport.width - popupWidth) / 2),
                y: viewport.scrollY + viewport.offsetTop + Math.max(margin, (viewport.height - Math.min(preferredHeight, maxHeight)) / 2),
                maxHeight,
                anchor: "center",
                horizontalAnchor: "center",
                useFixed
            };
        }

        const viewportLeft = viewport.offsetLeft;
        const viewportTop = viewport.offsetTop;
        const viewportRight = viewportLeft + viewport.width;
        const viewportBottom = viewportTop + viewport.height;
        const spaceBelow = viewportBottom - anchorBottom - margin - SELECTION_CLEARANCE;
        const spaceAbove = anchorTop - viewportTop - margin - SELECTION_CLEARANCE;
        const anchor = spaceBelow >= MIN_HEIGHT || spaceBelow >= spaceAbove ? "below" : "above";
        const availableHeight = Math.max(MIN_HEIGHT, anchor === "below" ? spaceBelow : spaceAbove);
        const maxHeight = Math.min(preferredHeight, availableHeight);

        // Prefer the selected text's left edge, then its right edge, then clamp.
        let left = anchorLeft;
        let horizontalAnchor = "left";
        if (left + popupWidth > viewportRight - margin && anchorRight - popupWidth >= viewportLeft + margin) {
            left = anchorRight - popupWidth;
            horizontalAnchor = "right";
        }
        left = Math.max(viewportLeft + margin, Math.min(left, viewportRight - popupWidth - margin));

        const top = anchor === "below"
            ? anchorBottom + SELECTION_CLEARANCE
            : anchorTop - maxHeight - SELECTION_CLEARANCE;
        const clampedTop = Math.max(viewportTop + margin, Math.min(top, viewportBottom - Math.min(maxHeight, MIN_HEIGHT) - margin));

        return {
            x: viewport.scrollX + left,
            y: viewport.scrollY + clampedTop,
            maxHeight,
            anchor,
            horizontalAnchor,
            useFixed
        };
    }

    function shouldUseFixedPopup() {
        try {
            if (typeof location !== "undefined" && /\.pdf($|[?#])/i.test(location.href)) return true;
            if (typeof document === "undefined") return false;
            return Boolean(document.querySelector(
                ".textLayer, .pdfViewer, .page canvas, embed[type='application/pdf'], object[type='application/pdf']"
            )) || window.self !== window.top;
        } catch (_error) {
            return false;
        }
    }

    function applyPopupPosition(popupCard, position, settings = {}) {
        if (!popupCard || !position) return;
        const useFixed = position.useFixed != null ? Boolean(position.useFixed) : shouldUseFixedPopup();
        const visual = typeof window !== "undefined" ? window.visualViewport : null;
        const viewWidth = visual?.width || (typeof window !== "undefined" ? window.innerWidth : 800);
        const viewHeight = visual?.height || (typeof window !== "undefined" ? window.innerHeight : 600);
        const offsetLeft = visual?.offsetLeft || 0;
        const offsetTop = visual?.offsetTop || 0;
        const width = Math.min(Number(settings.popupWidth) || 620, Math.max(320, viewWidth - DEFAULT_MARGIN * 2));

        popupCard.classList.toggle("is-fixed-overlay", useFixed);
        popupCard.style.transformOrigin = `${position.anchor === "above" ? "bottom" : "top"} ${position.horizontalAnchor === "right" ? "right" : "left"}`;
        if (Number.isFinite(position.maxHeight)) popupCard.style.maxHeight = `${Math.round(position.maxHeight)}px`;

        if (useFixed) {
            const top = Math.max(offsetTop + 8, Math.min(position.y - (window.scrollY || 0), offsetTop + viewHeight - 80));
            const left = Math.max(offsetLeft + 8, Math.min(position.x - (window.scrollX || 0), offsetLeft + viewWidth - width - 8));
            popupCard.style.position = "fixed";
            popupCard.style.top = `${Math.round(top)}px`;
            popupCard.style.left = `${Math.round(left)}px`;
            return;
        }
        popupCard.style.position = "absolute";
        popupCard.style.top = `${Math.round(position.y)}px`;
        popupCard.style.left = `${Math.round(position.x)}px`;
    }

    function bindViewportReposition(popupCard, getState, settings = {}) {
        if (!popupCard || typeof getState !== "function") {
            return () => {};
        }

        let timer = 0;
        const reposition = () => {
            window.clearTimeout(timer);
            timer = window.setTimeout(() => {
                const state = getState() || {};
                const next = computePopupPosition({
                    selectionRect: state.selectionRect,
                    popupSize: state.popupSize,
                    event: state.event,
                    useFixed: state.useFixed,
                    margin: state.margin
                });
                applyPopupPosition(popupCard, next, settings);
                if (typeof state.onPosition === "function") {
                    state.onPosition(next);
                }
            }, 50);
        };

        window.addEventListener("resize", reposition);
        const visual = typeof window !== "undefined" ? window.visualViewport : null;
        visual?.addEventListener("resize", reposition);
        visual?.addEventListener("scroll", reposition);

        return () => {
            window.clearTimeout(timer);
            window.removeEventListener("resize", reposition);
            visual?.removeEventListener("resize", reposition);
            visual?.removeEventListener("scroll", reposition);
        };
    }

    function refinePopupMaxHeight(popupCard, position = {}) {
        if (!popupCard) return;
        const visual = typeof window !== "undefined" ? window.visualViewport : null;
        const viewportHeight = visual?.height || (typeof window !== "undefined" ? window.innerHeight : 600);
        const viewportTop = visual?.offsetTop || 0;
        const rect = popupCard.getBoundingClientRect();
        const available = position.anchor === "above"
            ? rect.bottom - viewportTop - DEFAULT_MARGIN
            : viewportTop + viewportHeight - rect.top - DEFAULT_MARGIN;
        if (Number.isFinite(available) && available > 0) {
            popupCard.style.maxHeight = `${Math.max(MIN_HEIGHT, Math.floor(available))}px`;
        }
    }

    ns.positioning = { computePopupPosition, shouldUseFixedPopup, applyPopupPosition, refinePopupMaxHeight, bindViewportReposition, DEFAULT_MARGIN, MIN_HEIGHT };
})(typeof window !== "undefined" ? window : globalThis);
