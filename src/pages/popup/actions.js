import { LOOKUP_UPDATE } from "../../shared/messages.js";
import { populateLanguageSelect } from "../../shared/languages.js";
import {
    audio,
    contextInput,
    getRenderOptions,
    input,
    languageSelect,
    lookupCache,
    lookupClient,
    popupHelpers,
    providerSelect,
    renderer,
    resultRoot,
    state
} from "./state.js";
import {
    applyDimensions,
    clearContextError,
    getAvailableTabs,
    isSentenceLikeQuery,
    renderIdleState,
    renderState,
    renderTabs,
    setContextActionButtonsDisabled,
    showContextError,
    syncAiActionButtonStatus,
    updateContextActionVisibility,
    updateContextHelp,
    updatePauseSiteButton
} from "./view.js";
import {
    loadTab,
    maybePreloadAi,
    prefillPageContext
} from "./lookup.js";

const OUTPUT_AFFECTING_SETTING_KEYS = popupHelpers?.OUTPUT_AFFECTING_SETTING_KEYS || new Set();

export async function executeContextAction({
    intent,
    loadingMessage,
    errorMessage,
    validate = null,
    resolveContext = null
}, extraOptions = {}) {
    if (!state.activeQuery || !state.settings?.enableAI || state.activeTab !== "ai") {
        return;
    }

    state.requestToken += 1;
    const token = state.requestToken;

    return popupHelpers.runAiContextAction({
        intent,
        query: state.activeQuery,
        validate: () => {
            if (validate) {
                const error = validate();
                if (error) {
                    showContextError(error);
                    contextInput?.focus();
                    return error;
                }
                return null;
            }
            const validation = popupHelpers.validateContext(contextInput?.value || state.contextText);
            state.contextText = resolveContext ? resolveContext(validation) : (validation.ok ? validation.context : "");
            return null;
        },
        getContext: () => state.contextText,
        setBusy: (busy) => {
            setContextActionButtonsDisabled(busy);
            if (!busy && token === state.requestToken) {
                updateContextActionVisibility();
                syncAiActionButtonStatus();
            }
        },
        renderBusy: () => {
            clearContextError();
            state.activeAiIntent = intent;
            syncAiActionButtonStatus();
            audio.stopPronunciation();
            renderState(loadingMessage, false, true);
        },
        renderResult: (result) => {
            state.activeTab = "ai";
            renderTabs();
            updateContextActionVisibility();
            resultRoot.innerHTML = renderer.renderResult(result, getRenderOptions({ followUps: [] }));
            syncAiActionButtonStatus();
        },
        renderError: (error) => {
            renderState(error.message || errorMessage, true);
        },
        getLookup: (text, requestOptions) => lookupClient.getLookupResponse({
            tab: "ai",
            text,
            settings: state.settings,
            requestOptions: {
                trigger: "manual",
                ...requestOptions,
                ...extraOptions
            },
            cache: lookupCache
        }),
        isCurrent: () => token === state.requestToken
    });
}

export function handleExplainInContext() {
    return executeContextAction({
        intent: "explain_in_context",
        loadingMessage: "Explaining in context...",
        errorMessage: "Unable to explain in context.",
        validate: () => {
            const validation = popupHelpers.validateContext(contextInput?.value || state.contextText);
            if (!validation.ok) return "Paste or type the sentence that contains this word.";
            state.contextText = validation.context;
            return null;
        }
    });
}

export function handleExplainGrammar() {
    return executeContextAction({
        intent: "grammar",
        loadingMessage: "Analyzing grammar and nuance...",
        errorMessage: "Unable to analyze grammar.",
        validate: () => {
            const validation = popupHelpers.validateContext(contextInput?.value || state.contextText);
            if (!validation.ok) return "Paste or type the sentence that contains this word.";
            state.contextText = validation.context;
            return null;
        }
    });
}

export function handleExplainPhraseExplorer() {
    return executeContextAction({
        intent: "phrase_explorer",
        loadingMessage: "Exploring phrase and collocations...",
        errorMessage: "Unable to explore this phrase."
    });
}

export function handleSentenceBreakdown() {
    return executeContextAction({
        intent: "sentence_breakdown",
        loadingMessage: "Breaking down the sentence...",
        errorMessage: "Unable to break down the sentence.",
        validate: () => {
            const queryIsSentence = isSentenceLikeQuery(state.activeQuery);
            const validation = popupHelpers.validateContext(contextInput?.value || state.contextText);
            if (!queryIsSentence && !validation.ok) {
                return "Enter or paste the sentence to break down.";
            }
            state.contextText = validation.ok ? validation.context : state.activeQuery.trim();
            return null;
        }
    });
}

export function handleCompareConfusables() {
    return executeContextAction({
        intent: "compare_confusables",
        loadingMessage: "Comparing similar words...",
        errorMessage: "Unable to compare these words."
    });
}

export function handleRephrase() {
    return executeContextAction({
        intent: "rephrase",
        loadingMessage: "Rephrasing...",
        errorMessage: "Unable to rephrase this text."
    });
}

export function handleOpenSettings() {
    if (typeof chrome !== "undefined" && chrome.runtime?.openOptionsPage) {
        chrome.runtime.openOptionsPage();
        return;
    }

    const optionsUrl = typeof chrome !== "undefined" && chrome.runtime?.getURL
        ? chrome.runtime.getURL("options/options.html")
        : "options/options.html";
    window.open(optionsUrl, "_blank", "noopener,noreferrer");
}

export function handleSubmit(event) {
    event.preventDefault();

    const query = input?.value.trim() || "";
    const queryChanged = query !== state.activeQuery;
    state.activeQuery = query;
    state.lastPreloadKey = "";
    if (queryChanged) {
        state.activeAiIntent = "";
    }

    if (!query) {
        state.contextText = "";
        state.contextSource = "";
        state.contextConfidence = "none";
        if (contextInput) {
            contextInput.value = "";
            popupHelpers.autosizeTextarea(contextInput, { minRows: 2, maxRows: 4 });
        }
        clearContextError();
        updateContextHelp();
        audio.stopPronunciation();
        updateContextActionVisibility();
        renderIdleState();
        return;
    }

    if (queryChanged) {
        audio.clearPracticeResults();
        state.contextText = "";
        state.contextSource = "";
        state.contextConfidence = "none";
        if (contextInput) {
            contextInput.value = "";
            popupHelpers.autosizeTextarea(contextInput, { minRows: 2, maxRows: 4 });
        }
        clearContextError();
        updateContextHelp();
    }

    updateContextActionVisibility();
    maybePreloadAi(query, state.activeTab);
    void loadTab(state.activeTab);

    if (state.activeTab === "ai" && !state.contextText) {
        void prefillPageContext();
    }
}

export function handleTabClick(event) {
    const button = event.target.closest("[data-tab]");
    if (!button) {
        return;
    }

    state.activeTab = button.dataset.tab;
    void popupHelpers.writeLastTab(state.activeTab);
    renderTabs();
    audio.stopPronunciation();
    updateContextActionVisibility();
    if (state.activeTab === "ai" && state.activeQuery.trim()) {
        void prefillPageContext();
    }

    if (!state.activeQuery) {
        renderIdleState();
        return;
    }

    void loadTab(state.activeTab);
}

export function handleKeydown(event) {
    if (event.key === "Escape") {
        audio.stopPronunciation();
        window.close();
    }
}

export function handleStorageChanges(changes, areaName) {
    if (areaName !== "sync" && areaName !== "local") {
        return;
    }

    let shouldRefreshCurrentResult = false;
    if (areaName === "local") {
        return;
    }
    for (const [key, change] of Object.entries(changes)) {
        if (areaName !== "sync") {
            continue;
        }
        state.settings[key] = change.newValue;

        if (["defaultTab", ...OUTPUT_AFFECTING_SETTING_KEYS].includes(key)) {
            shouldRefreshCurrentResult = true;
        }

        if (key === "theme") {
            document.documentElement.setAttribute("data-theme", state.settings.theme || "system");
        }
        if (key === "fontFamily") {
            document.documentElement.setAttribute("data-font", state.settings.fontFamily || "editorial");
        }
        if (key === "pausedHostnames") {
            void updatePauseSiteButton();
        }
    }

    if (Object.keys(changes).some((key) => OUTPUT_AFFECTING_SETTING_KEYS.has(key))) {
        lookupCache.clear();
        state.lastPreloadKey = "";
    }

    const availableTabs = getAvailableTabs();
    if (!availableTabs.includes(state.activeTab)) {
        state.activeTab = availableTabs[0] || "dictionary";
    }

    if (providerSelect && state.settings.dictionaryProvider) {
        providerSelect.value = state.settings.dictionaryProvider;
    }
    if (languageSelect) {
        populateLanguageSelect(
            languageSelect,
            state.settings.translateTargetLanguage,
            state.settings.customLanguages
        );
    }

    applyDimensions();
    renderTabs();
    updateContextActionVisibility();

    if (!availableTabs.length) {
        renderState("Turn on Dictionary or AI in the extension settings.", true);
        return;
    }

    if (!state.activeQuery) {
        renderIdleState();
        return;
    }

    if (shouldRefreshCurrentResult) {
        void loadTab(state.activeTab);
    }
}

export function handleRuntimeMessage(message) {
    if (message?.type !== LOOKUP_UPDATE) {
        return false;
    }

    const payload = message.payload || {};
    const result = payload.result;
    if (!popupHelpers.shouldApplyLookupUpdate({
        payload,
        activeTab: state.activeTab,
        activeText: state.activeQuery,
        activeRequestId: state.activeRequestId,
        lastRevision: state.lastLookupRevision
    })) {
        return false;
    }

    if (result.requestId) {
        state.activeRequestId = result.requestId;
    }
    if (Number.isFinite(payload.revision)) {
        state.lastLookupRevision = payload.revision;
        result.revision = payload.revision;
    }

    const cacheKey = lookupClient.buildRequestCacheKey("dictionary", state.activeQuery.trim(), state.settings, {});
    lookupCache.set(cacheKey, result);
    popupHelpers.paintLookupResult(resultRoot, renderer.renderResult(result, getRenderOptions()));
    audio.restorePracticeResult(resultRoot, state.activeQuery, result.pronunciation?.language);
    return false;
}
