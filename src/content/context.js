/**
 * context.js — Page sentence/context extraction.
 *
 * This module is intentionally independent from popup lifecycle state. It is
 * loaded as a classic content script before content.js and exposes one pure
 * page-context API through DictionaryHelperContent.context.
 */
(function (global) {
    "use strict";

    const ns = global.DictionaryHelperContent = global.DictionaryHelperContent || {};
    const popupHelpers = global.DictionaryHelperPopupHelpers;
    const MAX_CANDIDATE_TEXT_LENGTH = 12000;
    const MAX_FALLBACK_TEXT_LENGTH = 50000;
    const MAX_SCAN_ELEMENTS = 120;
    const LEAF_CONTENT_SELECTOR = "p, li, blockquote, td, th, figcaption, dd, dt, h1, h2, h3, h4, h5, h6, pre, .reader-content, .textLayer";
    const SEMANTIC_CONTAINER_SELECTOR = "main, article, section, [role='main'], [role='article'], .content, #content, .reader-content, .textLayer";

    function extractSurroundingContext(selectedText) {
        const needle = String(selectedText || "").trim();
        if (!needle) {
            return { context: "", source: "", confidence: "none" };
        }

        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
            const selected = selection.toString().trim();
            if (selected && selected === needle) {
                const range = selection.getRangeAt(0);
                const exactSentence = extractExactSentenceFromRange(range, needle);
                if (exactSentence) {
                    return { context: exactSentence, source: "selection", confidence: "exact" };
                }
            }
        }

        return findBestPageSentenceCandidate(needle);
    }

    function extractExactSentenceFromRange(range, needle) {
        if (!range) return "";

        let container = range.commonAncestorContainer;
        if (container && container.nodeType === Node.TEXT_NODE) {
            container = container.parentNode;
        }
        if (!container || typeof container.closest !== "function") return "";

        const block = container.closest(
            "p, li, td, th, blockquote, figcaption, dd, dt, h1, h2, h3, h4, h5, h6, pre, article, section, main, [role='article'], .reader-content, .textLayer, .pdfViewer, div"
        ) || container;
        const rawBlockText = getSanitizedBlockText(block);
        const normalizedBlockText = popupHelpers.normalizeSentenceText(rawBlockText);
        if (!normalizedBlockText) return "";

        const offset = getSelectionOffsetInBlock(block, range);
        if (offset >= 0 && popupHelpers.extractSentenceAtOffset) {
            const exact = popupHelpers.extractSentenceAtOffset(rawBlockText, offset);
            if (exact && popupHelpers.findSentenceContaining(exact, needle)) {
                return popupHelpers.normalizeContext(exact);
            }
        }

        const blockSentence = popupHelpers.findSentenceContaining(normalizedBlockText, needle);
        return blockSentence ? popupHelpers.normalizeContext(blockSentence) : "";
    }

    function getSanitizedBlockText(element, maxLength = MAX_CANDIDATE_TEXT_LENGTH) {
        if (!element) return "";
        const raw = String(element.textContent || "");
        return raw.slice(0, maxLength)
            .replace(/[­​‌‍]/g, "")
            .replace(/([A-Za-zÀ-ɏ]+)-\s*\r?\n\s*([A-Za-zÀ-ɏ]+)/g, "$1$2")
            .replace(/\s+/g, " ");
    }

    function getSelectionOffsetInBlock(block, range) {
        try {
            const preRange = range.cloneRange();
            preRange.selectNodeContents(block);
            preRange.setEnd(range.startContainer, range.startOffset);
            return preRange.toString().length;
        } catch (_error) {
            return -1;
        }
    }

    function findBestPageSentenceCandidate(needle) {
        const pattern = popupHelpers.buildWordBoundaryPattern(needle);
        if (!pattern) return { context: "", source: "", confidence: "none" };

        const mainContent = document.querySelector(SEMANTIC_CONTAINER_SELECTOR);
        let elements = mainContent?.querySelectorAll(LEAF_CONTENT_SELECTOR);
        if (!elements?.length) {
            elements = document.querySelectorAll(LEAF_CONTENT_SELECTOR);
        }
        if (!elements?.length) {
            // Only use generic containers as a bounded final fallback. This
            // avoids scanning every layout div on modern, component-heavy pages.
            elements = mainContent?.querySelectorAll("div") || document.querySelectorAll("div");
        }

        const candidates = [];
        const viewportHeight = window.innerHeight || 800;
        const maxScanElements = Math.min(elements.length, MAX_SCAN_ELEMENTS);

        for (let index = 0; index < maxScanElements; index += 1) {
            const element = elements[index];
            const text = popupHelpers.normalizeSentenceText(
                getSanitizedBlockText(element, MAX_CANDIDATE_TEXT_LENGTH)
            );
            if (!text || !pattern.test(text)) continue;

            const sentences = popupHelpers.splitIntoSentences(text);
            const matchingSentence = sentences.find((sentence) => pattern.test(sentence));
            if (!matchingSentence) continue;

            const rect = element.getBoundingClientRect();
            candidates.push({
                sentence: popupHelpers.normalizeContext(matchingSentence),
                visible: rect.bottom >= 0 && rect.top <= viewportHeight,
                inMainContent: Boolean(element.closest("main, article, [role='main'], [role='article'], .content, #content, .reader-content, .textLayer, .pdfViewer")),
                viewportDistance: Math.abs(rect.top),
                documentOrder: index
            });

            if (candidates.length >= 8) {
                break;
            }
        }

        if (!candidates.length) {
            const pageText = popupHelpers.normalizeSentenceText(
                String(document.body?.innerText || document.body?.textContent || "").slice(0, MAX_FALLBACK_TEXT_LENGTH)
            );
            const fallbackSentence = popupHelpers.findSentenceContaining(pageText, needle);
            return fallbackSentence
                ? { context: popupHelpers.normalizeContext(fallbackSentence), source: "page", confidence: "suggested" }
                : { context: "", source: "", confidence: "none" };
        }

        const ranked = popupHelpers.rankSentenceCandidates(candidates);
        return { context: ranked[0].sentence, source: "page", confidence: "suggested" };
    }

    ns.context = {
        extractSurroundingContext,
        extractExactSentenceFromRange,
        findBestPageSentenceCandidate
    };
})(typeof window !== "undefined" ? window : globalThis);
