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
        "enablePhraseFallback",
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
        "aiComparePromptTemplate",
        "aiRephrasePromptTemplate",
        "enableLexicalProfile",
        "pronunciationRate",
        "pronunciationVoiceURI"
    ]);

    const LAST_TAB_SESSION_KEY = "dictionaryHelperLastTab";

    const FOLLOW_UP_INTENTS = Object.freeze([
        {
            intent: "explain_in_context",
            title: "🔍 Context Explain",
            loadingMessage: "Explaining in context...",
            errorMessage: "Unable to explain in context.",
            requiresContext: true,
            requiresSentence: false
        },
        {
            intent: "grammar",
            title: "📐 Grammar & Nuance",
            loadingMessage: "Analyzing grammar and nuance...",
            errorMessage: "Unable to analyze grammar.",
            requiresContext: true,
            requiresSentence: false
        },
        {
            intent: "phrase_explorer",
            title: "💡 Phrase & Collocations",
            loadingMessage: "Exploring phrase and collocations...",
            errorMessage: "Unable to explore this phrase.",
            requiresContext: false,
            requiresSentence: false
        },
        {
            intent: "sentence_breakdown",
            title: "🧩 Sentence Breakdown",
            loadingMessage: "Breaking down the sentence...",
            errorMessage: "Unable to break down the sentence.",
            requiresContext: false,
            requiresSentence: true
        },
        {
            intent: "compare_confusables",
            title: "⚖️ Compare Confusables",
            loadingMessage: "Comparing similar words...",
            errorMessage: "Unable to compare these words.",
            requiresContext: false,
            requiresSentence: false,
            requiresComparison: true
        },
        {
            intent: "rephrase",
            title: "✨ Rephrase",
            loadingMessage: "Rephrasing...",
            errorMessage: "Unable to rephrase.",
            requiresContext: false,
            requiresSentence: false
        }
    ]);

    function isSentenceLikeQuery(value) {
        const text = String(value || "").trim();
        return /[.!?]/.test(text) || text.split(/\s+/).filter(Boolean).length >= 7;
    }

    function isComparisonQuery(value) {
        const text = String(value || "").trim();
        if (!text) {
            return false;
        }
        return /\b(?:vs\.?|versus|or|and)\b/i.test(text) && text.split(/\s+/).filter(Boolean).length >= 2;
    }

    function getEligibleFollowUpIntents({ text, context } = {}) {
        const query = String(text || "").trim();
        const normalizedContext = normalizeContext(context);
        const hasContext = Boolean(normalizedContext);
        const hasSentence = hasContext || isSentenceLikeQuery(query);
        const hasComparison = isComparisonQuery(query);

        if (!query) {
            return [];
        }

        return FOLLOW_UP_INTENTS.filter((item) => {
            if (item.requiresContext && !hasContext) {
                return false;
            }
            if (item.requiresSentence && !hasSentence) {
                return false;
            }
            if (item.requiresComparison && !hasComparison) {
                return false;
            }
            return true;
        });
    }

    function followUpButtonState(item, activeIntent) {
        if (item?.intent && item.intent === activeIntent) {
            return "active";
        }
        if (item?.loading) {
            return "loading";
        }
        if (item?.error && !item.result) {
            return "error";
        }
        if (item?.result) {
            return "ready";
        }
        return "pending";
    }

    function syncAiActionButtonStatus(buttons, activeFollowUps, activeIntent, prefix) {
        if (!buttons || !buttons.forEach) {
            return;
        }
        const statusSelector = `.${prefix}-context-btn-status, .${prefix}-followup-status`;
        const dotSelector = `.${prefix}-progress-dot`;

        buttons.forEach((button) => {
            const intent = button.getAttribute("data-ai-intent") || "";
            const item = activeFollowUps.find((entry) => entry.intent === intent);
            const state = followUpButtonState(item, activeIntent);
            const isActive = activeIntent === intent;
            button.classList.toggle("is-active", isActive);
            button.setAttribute("aria-pressed", String(isActive));

            const dotState = isActive ? "active" : state;
            const shouldShowDot = isActive || dotState === "ready" || dotState === "loading" || dotState === "error";

            button.querySelectorAll(statusSelector).forEach((el) => el.remove());

            let dotEl = button.querySelector(dotSelector);
            if (shouldShowDot) {
                if (!dotEl) {
                    dotEl = document.createElement("span");
                    dotEl.setAttribute("aria-hidden", "true");
                    button.appendChild(dotEl);
                }
                dotEl.className = `${prefix}-progress-dot is-${dotState}`;
                dotEl.textContent = "";
            } else if (dotEl) {
                dotEl.remove();
            }
        });
    }

    async function readLastTab() {
        try {
            if (global.chrome?.storage?.local) {
                const data = await chrome.storage.local.get(LAST_TAB_SESSION_KEY);
                const tab = String(data?.[LAST_TAB_SESSION_KEY] || "").trim();
                if (tab === "ai" || tab === "dictionary") return tab;
            }
            if (global.chrome?.storage?.sync) {
                const data = await chrome.storage.sync.get("lastActiveTab");
                const tab = String(data?.lastActiveTab || "").trim();
                if (tab === "ai" || tab === "dictionary") return tab;
            }
            if (typeof localStorage !== "undefined") {
                const tab = String(localStorage.getItem(LAST_TAB_SESSION_KEY) || "").trim();
                if (tab === "ai" || tab === "dictionary") return tab;
            }
        } catch (_error) {
            // Ignore storage read errors
        }
        return "";
    }

    function shouldApplyLookupUpdate({
        payload,
        activeTab,
        activeText,
        activeRequestId,
        lastRevision = -1,
        surfaceReady = true
    } = {}) {
        const result = payload?.result;
        if (!result || !surfaceReady || activeTab !== "dictionary") {
            return false;
        }

        const requestId = String(payload?.requestId || "").trim();
        if (requestId && activeRequestId && requestId !== activeRequestId) {
            return false;
        }

        const text = String(payload?.text || "").trim();
        if (text && text.toLowerCase() !== String(activeText || "").trim().toLowerCase()) {
            return false;
        }

        const revision = Number(payload?.revision);
        if (Number.isFinite(revision) && Number.isFinite(lastRevision) && revision <= lastRevision) {
            return false;
        }

        return true;
    }

    function paintLookupResult(container, html) {
        if (!container) {
            return;
        }
        const scrollTop = container.scrollTop;
        container.innerHTML = html;
        container.scrollTop = scrollTop;
    }

    async function runAiContextAction({
        intent,
        query,
        getContext,
        validate,
        setBusy,
        renderBusy,
        renderResult,
        renderError,
        getLookup,
        isCurrent
    } = {}) {
        const validationError = typeof validate === "function" ? validate() : null;
        if (validationError) {
            return { ok: false, error: validationError, cancelled: false };
        }

        setBusy?.(true);
        renderBusy?.();

        try {
            const response = await getLookup(query, {
                context: typeof getContext === "function" ? getContext() : "",
                intent
            });
            if (isCurrent && !isCurrent()) {
                return { ok: false, cancelled: true };
            }
            if (!response?.ok) {
                throw new Error(response?.error || "Request failed.");
            }
            renderResult?.(response.result);
            return { ok: true, result: response.result };
        } catch (error) {
            if ((isCurrent && !isCurrent()) || error?.name === "AbortError") {
                return { ok: false, cancelled: true };
            }
            renderError?.(error);
            return { ok: false, error };
        } finally {
            if (!isCurrent || isCurrent()) {
                setBusy?.(false);
            }
        }
    }

    async function writeLastTab(tab) {
        const next = tab === "ai" ? "ai" : tab === "dictionary" ? "dictionary" : "";
        if (!next) {
            return;
        }
        try {
            if (global.chrome?.storage?.local) {
                await chrome.storage.local.set({ [LAST_TAB_SESSION_KEY]: next });
            }
            if (global.chrome?.storage?.sync) {
                await chrome.storage.sync.set({ lastActiveTab: next });
            }
            if (typeof localStorage !== "undefined") {
                localStorage.setItem(LAST_TAB_SESSION_KEY, next);
            }
        } catch (_error) {
            // Best effort
        }
    }

    const PopupHelpers = {
        MAX_CONTEXT_CHARS,
        LAST_TAB_SESSION_KEY,
        OUTPUT_AFFECTING_SETTING_KEYS,
        FOLLOW_UP_INTENTS,
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
        isSentenceLikeQuery,
        isComparisonQuery,
        getEligibleFollowUpIntents,
        followUpButtonState,
        syncAiActionButtonStatus,
        shouldApplyLookupUpdate,
        paintLookupResult,
        runAiContextAction,
        readLastTab,
        writeLastTab
    };

    global.DictionaryHelperPopupHelpers = PopupHelpers;
})(typeof window !== "undefined" ? window : globalThis);
