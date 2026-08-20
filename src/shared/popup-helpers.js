/**
 * Shared popup logic: query classification, context normalization,
 * request option builder, request cancellation, and UI helpers.
 * Classic script popup utilities for the content script.
 */
(function (global) {
    const MAX_CONTEXT_CHARS = 800;

    const classifyQuery = function (text) {
        const str = String(text || "").trim();
        if (!str) return "empty";
        const hasPunctuation = /[.!?]/.test(str);
        const words = str.split(/\s+/).filter(Boolean);
        if (words.length === 1) return "word";
        if (hasPunctuation || words.length >= 7) return "sentence";
        return "phrase";
    };

    const normalizeContext = function (value) {
        const normalized = String(value || "").replace(/\s+/g, " ").trim();
        if (!normalized) return "";
        if (normalized.length <= MAX_CONTEXT_CHARS) return normalized;
        return `${normalized.slice(0, MAX_CONTEXT_CHARS).trim()}…`;
    };

    function escapeRegExp(value) {
        return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }

    function buildWordBoundaryPattern(value) {
        const normalized = String(value || "").replace(/\s+/g, " ").trim();
        if (!normalized) {
            return null;
        }

        const escaped = escapeRegExp(normalized).replace(/ /g, "\\s+");
        return new RegExp(`(^|[^\\p{L}\\p{N}_])${escaped}(?=$|[^\\p{L}\\p{N}_])`, "iu");
    }

    function normalizeSentenceText(value) {
        return String(value || "").replace(/\s+/g, " ").trim();
    }

    function splitIntoSentences(value) {
        const text = normalizeSentenceText(value);
        if (!text) {
            return [];
        }

        return (text.match(/[^.!?。！？]+(?:[.!?。！？]+["'”’»)]*|$)/g) || [])
            .map((sentence) => sentence.trim())
            .filter(Boolean);
    }

    function isSentenceBoundary(character) {
        return /[.!?。！？]/.test(character || "");
    }

    function extractSentenceAtOffset(value, offset) {
        const rawText = String(value || "");
        if (!rawText.trim()) {
            return "";
        }

        const safeOffset = Math.max(0, Math.min(Number(offset) || 0, rawText.length));
        let start = 0;
        let end = rawText.length;

        for (let index = safeOffset - 1; index >= 0; index -= 1) {
            if (isSentenceBoundary(rawText[index])) {
                start = index + 1;
                break;
            }
        }

        for (let index = safeOffset; index < rawText.length; index += 1) {
            if (!isSentenceBoundary(rawText[index])) {
                continue;
            }

            end = index + 1;
            while (end < rawText.length && /["'”’»)]/.test(rawText[end])) {
                end += 1;
            }
            break;
        }

        return normalizeSentenceText(rawText.slice(start, end));
    }

    function findSentenceContaining(value, needle) {
        const pattern = buildWordBoundaryPattern(needle);
        if (!pattern) {
            return "";
        }

        return splitIntoSentences(value).find((sentence) => pattern.test(sentence)) || "";
    }

    function rankSentenceCandidates(candidates = []) {
        return [...candidates].sort((left, right) => {
            const visibilityDifference = Number(right.visible) - Number(left.visible);
            if (visibilityDifference !== 0) {
                return visibilityDifference;
            }

            const contentDifference = Number(right.inMainContent) - Number(left.inMainContent);
            if (contentDifference !== 0) {
                return contentDifference;
            }

            const distanceDifference = Number(left.viewportDistance || 0) - Number(right.viewportDistance || 0);
            if (distanceDifference !== 0) {
                return distanceDifference;
            }

            return Number(left.documentOrder || 0) - Number(right.documentOrder || 0);
        });
    }

    const validateContext = function (contextText) {
        const text = normalizeContext(contextText);
        if (!text) {
            return {
                ok: false,
                error: "Please enter or paste the sentence containing this word."
            };
        }

        return {
            ok: true,
            context: text
        };
    };

    function autosizeTextarea(textarea, options = {}) {
        if (!textarea) {
            return;
        }

        const minRows = Number(options.minRows) || 2;
        const maxRows = Number(options.maxRows) || 4;
        const lineHeight = Number.parseFloat(window.getComputedStyle(textarea).lineHeight) || 20;
        const maxHeight = lineHeight * maxRows;
        const minHeight = lineHeight * minRows;

        textarea.style.height = "auto";
        const next = Math.max(minHeight, Math.min(textarea.scrollHeight, maxHeight));
        textarea.style.height = `${next}px`;
        textarea.style.overflowY = textarea.scrollHeight > maxHeight ? "auto" : "hidden";
    }

    const OUTPUT_AFFECTING_SETTING_KEYS = new Set([
        "translateTargetLanguage",
        "customLanguages",
        "translateProvider",
        "libreTranslateBaseUrl",
        "libreTranslateApiKey",
        "dictionaryProvider",
        "theme",
        "enableTranslate",
        "enableDictionary",
        "enableAI",
        "aiBaseUrl",
        "aiApiKey",
        "aiModel",
        "dictionaryApiKey",
        "wordnikApiKey",
        "wordsApiKey",
        "aiPromptTemplate",
        "aiContextPromptTemplate",
        "aiGrammarPromptTemplate",
        "aiSentencePromptTemplate",
        "aiPhraseExplorerPromptTemplate",
        "enableLexicalProfile",
        "pronunciationRate",
        "pronunciationVoiceURI"
    ]);

    const LAST_TAB_SESSION_KEY = "dictionaryHelperLastTab";

    async function readLastTab() {
        if (!global.chrome?.storage?.session) {
            return "";
        }
        try {
            const data = await chrome.storage.session.get(LAST_TAB_SESSION_KEY);
            const tab = String(data?.[LAST_TAB_SESSION_KEY] || "").trim();
            return tab === "ai" || tab === "dictionary" ? tab : "";
        } catch (_error) {
            return "";
        }
    }

    async function writeLastTab(tab) {
        if (!global.chrome?.storage?.session) {
            return;
        }
        const next = tab === "ai" ? "ai" : tab === "dictionary" ? "dictionary" : "";
        if (!next) {
            return;
        }
        try {
            await chrome.storage.session.set({ [LAST_TAB_SESSION_KEY]: next });
        } catch (_error) {
            // Session memory is optional.
        }
    }

    const PopupHelpers = {
        MAX_CONTEXT_CHARS,
        LAST_TAB_SESSION_KEY,
        OUTPUT_AFFECTING_SETTING_KEYS,
        classifyQuery,
        normalizeContext,
        escapeRegExp,
        buildWordBoundaryPattern,
        normalizeSentenceText,
        splitIntoSentences,
        extractSentenceAtOffset,
        findSentenceContaining,
        rankSentenceCandidates,
        validateContext,
        autosizeTextarea,
        readLastTab,
        writeLastTab
    };

    global.DictionaryHelperPopupHelpers = PopupHelpers;
})(typeof window !== "undefined" ? window : globalThis);
