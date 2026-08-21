import { getUiSettings, saveSettings } from "../src/shared/storage.js";
import {
    CANCEL_LOOKUP,
    LOOKUP_UPDATE
} from "../src/shared/messages.js";
import { populateLanguageSelect } from "../src/shared/languages.js";
import { canInjectIntoUrl, classifyPageRestriction } from "../src/shared/page-utils.js";

const TAB_ORDER = ["dictionary", "ai"];
const DEFAULT_BODY_MESSAGE = "Type a word or phrase, then press Search.";
const popupShell = window.DictionaryHelperPopupShell;
const popupRoot = document.querySelector(".toolbar-popup");

if (popupRoot && popupShell) {
    popupRoot.innerHTML = popupShell.createMarkup({ prefix: "toolbar-popup", host: "toolbar" });
}

const getRenderOptions = (extra = {}) => ({
    prefix: "toolbar-popup",
    titleTag: "h2",
    sectionTitleTag: "h3",
    pronunciationRate: settings?.pronunciationRate ?? 0.95,
    pronunciationVoiceURI: settings?.pronunciationVoiceURI ?? "",
    followUps: extra.followUps || (activeTab === "ai" ? activeFollowUps : [])
});

const form = document.querySelector("#lookup-form");
const input = document.querySelector("#lookup-input");
const tabsRoot = document.querySelector("#tabs");
const resultRoot = document.querySelector("#result");
const contextActionContainer = document.querySelector("#context-action-container");
const contextInput = document.querySelector("#context-input");
const contextError = document.querySelector("#context-error");
const explainContextButton = document.querySelector("#explain-context-btn");
const explainGrammarButton = document.querySelector("#explain-grammar-btn");
const explainPhraseExplorerButton = document.querySelector("#explain-phrase-explorer-btn");
const explainSentenceButton = document.querySelector("#explain-sentence-btn");
const explainCompareButton = document.querySelector("#explain-compare-btn");
const explainRephraseButton = document.querySelector("#explain-rephrase-btn");
const openSettingsButton = document.querySelector("#open-settings-btn");
const providerSelect = document.querySelector("#provider-select");
const languageSelect = document.querySelector("#lang-select");

const renderer = window.DictionaryHelperRenderer;
const audio = window.DictionaryHelperAudio;
const lookupCache = window.DictionaryHelperCache.createLookupCache();
const popupHelpers = window.DictionaryHelperPopupHelpers;
const lookupClient = window.DictionaryHelperLookup;

let settings = null;
let activeTab = "dictionary";
let activeQuery = "";
let contextText = "";
let contextSource = "";
let contextConfidence = "none";
let requestToken = 0;
let lastPreloadKey = "";
let activeFollowUps = [];
let activeAiIntent = "";
let activeRequestId = "";

const OUTPUT_AFFECTING_SETTING_KEYS = popupHelpers.OUTPUT_AFFECTING_SETTING_KEYS;

init().catch((error) => {
    renderState(error.message || "Unable to load popup.", true);
});

async function init() {
    if (!renderer || !audio || !lookupCache || !popupHelpers || !lookupClient) {
        throw new Error("Shared UI modules failed to load. Reload the extension.");
    }

    settings = await getUiSettings();
    document.documentElement.setAttribute("data-theme", settings.theme || "system");
    document.documentElement.setAttribute("data-font", settings.fontFamily || "editorial");
    activeTab = await getInitialTab();
    applyDimensions();
    updateContextActionVisibility();
    renderTabs();
    renderIdleState();
    
    if (activeTab === "ai" && activeQuery.trim()) {
        void prefillPageContext();
    }

    await consumeStashedFallbackLookup();

    if (providerSelect) {
        providerSelect.value = settings.dictionaryProvider || "free_dictionary";
        providerSelect.addEventListener("change", async (event) => {
            const next = event.target.value;
            settings.dictionaryProvider = next;
            await saveSettings({ dictionaryProvider: next });
            lookupCache.clear();
            if (activeQuery) {
                void loadTab(activeTab);
            }
        });
    }

    if (languageSelect) {
        populateLanguageSelect(
            languageSelect,
            settings.translateTargetLanguage,
            settings.customLanguages
        );
        languageSelect.addEventListener("change", async (event) => {
            const next = String(event.target.value || "").trim();
            if (!next) return;
            settings.translateTargetLanguage = next;
            await saveSettings({ translateTargetLanguage: next });
            lookupCache.clear();
            if (activeQuery) {
                void loadTab(activeTab);
            }
        });
    }

    form.addEventListener("submit", handleSubmit);
    openSettingsButton?.addEventListener("click", handleOpenSettings);
    tabsRoot.addEventListener("click", handleTabClick);
    resultRoot.addEventListener("click", (event) => {
        audio.handlePronunciationClick(event);

        const phraseBtn = event.target.closest("[data-lookup-query]");
        if (phraseBtn) {
            const query = String(phraseBtn.dataset.lookupQuery || "").trim();
            if (query && input && query.toLowerCase() !== String(activeQuery || "").trim().toLowerCase()) {
                audio.clearPracticeResults();
                input.value = query;
                activeQuery = query;
                activeTab = "dictionary";
                activeAiIntent = "";
                void popupHelpers.writeLastTab(activeTab);
                renderTabs();
                updateContextActionVisibility();
                void loadTab("dictionary");
            }
        }
    });
    explainContextButton?.addEventListener("click", handleExplainInContext);
    explainGrammarButton?.addEventListener("click", handleExplainGrammar);
    explainPhraseExplorerButton?.addEventListener("click", handleExplainPhraseExplorer);
    explainSentenceButton?.addEventListener("click", handleSentenceBreakdown);
    explainCompareButton?.addEventListener("click", handleCompareConfusables);
    explainRephraseButton?.addEventListener("click", handleRephrase);
    contextInput?.addEventListener("input", () => {
        contextText = popupHelpers.normalizeContext(contextInput.value);
        contextSource = contextText ? "manual" : "";
        contextConfidence = contextText ? "manual" : "none";
        clearContextError();
        updateContextHelp();
        popupHelpers.autosizeTextarea(contextInput, { minRows: 2, maxRows: 4 });
    });
    document.addEventListener("keydown", handleKeydown);
    chrome.storage.onChanged.addListener(handleStorageChanges);
    chrome.runtime.onMessage.addListener(handleRuntimeMessage);
    window.addEventListener("pagehide", cancelPendingLookup, { once: true });

    input.focus();
}

function handleRuntimeMessage(message) {
    if (message?.type !== LOOKUP_UPDATE) {
        return false;
    }

    const payload = message.payload || {};
    const text = String(payload.text || "").trim();
    const requestId = String(payload.requestId || "").trim();
    const result = payload.result;

    if (!result || activeTab !== "dictionary") {
        return false;
    }

    if (requestId && activeRequestId && requestId !== activeRequestId) {
        return false;
    }

    if (text && text.toLowerCase() !== String(activeQuery || "").trim().toLowerCase()) {
        return false;
    }

    if (result.requestId) {
        activeRequestId = result.requestId;
    }

    const cacheKey = lookupClient.buildRequestCacheKey("dictionary", activeQuery.trim(), settings, {});
    lookupCache.set(cacheKey, result);
    resultRoot.innerHTML = renderer.renderResult(result, getRenderOptions());
    audio.restorePracticeResult(resultRoot, activeQuery, result.pronunciation?.language);
    return false;
}

function applyDimensions() {
    const dimensions = popupShell?.clampDimensions(settings.popupWidth, settings.popupHeight)
        || { width: 620, height: 720 };
    const { width, height } = dimensions;
    // Chrome action popups have a constrained viewport. Keep the toolbar
    // document within it so the internal scroll container remains reachable;
    // the in-page popup still uses the full configured height.
    const toolbarHeight = Math.min(height, 580);

    document.documentElement.style.width = `${width}px`;
    document.documentElement.style.height = `${toolbarHeight}px`;
    document.documentElement.style.minWidth = "280px";
    document.documentElement.style.maxWidth = "100%";
    document.documentElement.style.maxHeight = `${toolbarHeight}px`;
    document.documentElement.style.overflow = "hidden";

    document.body.style.width = "100%";
    document.body.style.height = "100%";
    document.body.style.minWidth = "280px";
    document.body.style.overflow = "hidden";

    popupRoot.style.width = "100%";
    popupRoot.style.height = "100%";
    popupRoot.style.maxWidth = "100%";
    popupRoot.style.maxHeight = "100%";
    popupRoot.style.overflowY = "auto";
    popupRoot.style.overflowX = "hidden";

    resultRoot.style.maxHeight = "none";
    resultRoot.style.flex = "none";
    resultRoot.style.overflow = "visible";
}

function handleOpenSettings() {
    if (typeof chrome !== "undefined" && chrome.runtime?.openOptionsPage) {
        chrome.runtime.openOptionsPage();
        return;
    }

    const optionsUrl = typeof chrome !== "undefined" && chrome.runtime?.getURL
        ? chrome.runtime.getURL("options/options.html")
        : "options/options.html";
    window.open(optionsUrl, "_blank", "noopener,noreferrer");
}

function handleSubmit(event) {
    event.preventDefault();

    const query = input.value.trim();
    const queryChanged = query !== activeQuery;
    activeQuery = query;
    lastPreloadKey = "";
    if (queryChanged) {
        activeAiIntent = "";
    }

    if (!query) {
        contextText = "";
        contextSource = "";
        contextConfidence = "none";
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
        // New query invalidates previous context; preserve user edits only for the same query.
        contextText = "";
        contextSource = "";
        contextConfidence = "none";
        if (contextInput) {
            contextInput.value = "";
            popupHelpers.autosizeTextarea(contextInput, { minRows: 2, maxRows: 4 });
        }
        clearContextError();
        updateContextHelp();
    }

    updateContextActionVisibility();
    maybePreloadAi(query, activeTab);
    void loadTab(activeTab);

    if (activeTab === "ai" && !contextText) {
        void prefillPageContext();
    }
}

async function executeContextAction({
    intent,
    loadingMessage,
    errorMessage,
    validate = null,
    resolveContext = null
}, extraOptions = {}) {
    if (!activeQuery || !settings?.enableAI || activeTab !== "ai") {
        return;
    }

    if (validate) {
        const error = validate();
        if (error) {
            showContextError(error);
            contextInput?.focus();
            return;
        }
    } else {
        const validation = popupHelpers.validateContext(contextInput?.value || contextText);
        contextText = resolveContext ? resolveContext(validation) : (validation.ok ? validation.context : "");
    }

    clearContextError();
    setContextActionButtonsDisabled(true);
    activeAiIntent = intent;
    syncAiActionButtonStatus();

    requestToken += 1;
    const token = requestToken;
    audio.stopPronunciation();
    renderState(loadingMessage, false, true);

    try {
        const response = await lookupClient.getLookupResponse({
            tab: "ai",
            text: activeQuery,
            settings,
            requestOptions: {
                trigger: "manual",
                context: contextText,
                intent,
                ...extraOptions
            },
            cache: lookupCache
        });

        if (token !== requestToken) {
            return;
        }

        if (!response?.ok) {
            throw new Error(response?.error || "Request failed.");
        }

        activeTab = "ai";
        renderTabs();
        updateContextActionVisibility();
        resultRoot.innerHTML = renderer.renderResult(response.result, getRenderOptions({ followUps: [] }));
        syncAiActionButtonStatus();
    } catch (error) {
        if (token !== requestToken || error?.name === "AbortError") {
            return;
        }
        renderState(error.message || errorMessage, true);
    } finally {
        if (token === requestToken) {
            updateContextActionVisibility();
            syncAiActionButtonStatus();
        }
    }
}

function handleExplainInContext() {
    return executeContextAction({
        intent: "explain_in_context",
        loadingMessage: "Explaining in context...",
        errorMessage: "Unable to explain in context.",
        validate: () => {
            const validation = popupHelpers.validateContext(contextInput?.value || contextText);
            if (!validation.ok) return "Paste or type the sentence that contains this word.";
            contextText = validation.context;
            return null;
        }
    });
}

function handleExplainGrammar() {
    return executeContextAction({
        intent: "grammar",
        loadingMessage: "Analyzing grammar and nuance...",
        errorMessage: "Unable to analyze grammar.",
        validate: () => {
            const validation = popupHelpers.validateContext(contextInput?.value || contextText);
            if (!validation.ok) return "Paste or type the sentence that contains this word.";
            contextText = validation.context;
            return null;
        }
    });
}

function handleExplainPhraseExplorer() {
    return executeContextAction({
        intent: "phrase_explorer",
        loadingMessage: "Exploring phrase and collocations...",
        errorMessage: "Unable to explore this phrase."
    });
}

function handleSentenceBreakdown() {
    return executeContextAction({
        intent: "sentence_breakdown",
        loadingMessage: "Breaking down the sentence...",
        errorMessage: "Unable to break down the sentence.",
        validate: () => {
            const queryIsSentence = isSentenceLikeQuery(activeQuery);
            const validation = popupHelpers.validateContext(contextInput?.value || contextText);
            if (!queryIsSentence && !validation.ok) {
                return "Enter or paste the sentence to break down.";
            }
            contextText = validation.ok ? validation.context : activeQuery.trim();
            return null;
        }
    });
}

function handleCompareConfusables() {
    return executeContextAction({
        intent: "compare_confusables",
        loadingMessage: "Comparing similar words...",
        errorMessage: "Unable to compare these words."
    });
}

function handleRephrase() {
    return executeContextAction({
        intent: "rephrase",
        loadingMessage: "Rephrasing...",
        errorMessage: "Unable to rephrase this text."
    });
}

function handleTabClick(event) {
    const button = event.target.closest("[data-tab]");
    if (!button) {
        return;
    }

    activeTab = button.dataset.tab;
    void popupHelpers.writeLastTab(activeTab);
    renderTabs();
    audio.stopPronunciation();
    updateContextActionVisibility();
    if (activeTab === "ai" && activeQuery.trim()) {
        void prefillPageContext();
    }

    if (!activeQuery) {
        renderIdleState();
        return;
    }

    void loadTab(activeTab);
}

function handleKeydown(event) {
    if (event.key === "Escape") {
        audio.stopPronunciation();
        window.close();
    }
}

function handleStorageChanges(changes, areaName) {
    if (areaName !== "sync" && areaName !== "local") {
        return;
    }

    let shouldRefreshCurrentResult = false;
    // Secret keys are never stored in this UI context and must not propagate
    // through runtime messaging from here. Ignore local storage mutations;
    // the background worker reads secrets directly when it needs them.
    if (areaName === "local") {
        return;
    }
    for (const [key, change] of Object.entries(changes)) {
if (areaName !== "sync") {
            continue;
        }
        settings[key] = change.newValue;

        if (["defaultTab", ...OUTPUT_AFFECTING_SETTING_KEYS].includes(key)) {
            shouldRefreshCurrentResult = true;
        }

        if (key === "theme") {
            document.documentElement.setAttribute("data-theme", settings.theme || "system");
        }
        if (key === "fontFamily") {
            document.documentElement.setAttribute("data-font", settings.fontFamily || "editorial");
        }
    }

    if (Object.keys(changes).some((key) => OUTPUT_AFFECTING_SETTING_KEYS.has(key))) {
        lookupCache.clear();
        lastPreloadKey = "";
    }

    const availableTabs = getAvailableTabs();
    if (!availableTabs.includes(activeTab)) {
        activeTab = availableTabs[0] || "dictionary";
    }

    // Sync in-popup selectors with the updated settings
    if (providerSelect && settings.dictionaryProvider) {
        providerSelect.value = settings.dictionaryProvider;
    }
    if (languageSelect) {
        populateLanguageSelect(
            languageSelect,
            settings.translateTargetLanguage,
            settings.customLanguages
        );
    }

    applyDimensions();
    renderTabs();
    updateContextActionVisibility();

    if (!availableTabs.length) {
        renderState("Turn on Dictionary or AI in the extension settings.", true);
        return;
    }

    if (!activeQuery) {
        renderIdleState();
        return;
    }

    if (shouldRefreshCurrentResult) {
        void loadTab(activeTab);
    }
}

function getAvailableTabs() {
    return TAB_ORDER.filter((tab) => {
        if (tab === "dictionary") {
            return settings.enableTranslate || settings.enableDictionary;
        }

        if (tab === "ai") {
            return settings.enableAI;
        }

        return false;
    });
}

async function getInitialTab() {
    const availableTabs = getAvailableTabs();
    const lastTab = await popupHelpers.readLastTab();
    if (availableTabs.includes(lastTab)) {
        return lastTab;
    }
    if (availableTabs.includes(settings.defaultTab)) {
        return settings.defaultTab;
    }

    return availableTabs[0] || "dictionary";
}

function renderTabs() {
    const availableTabs = getAvailableTabs();
    tabsRoot.setAttribute("role", "tablist");
    tabsRoot.innerHTML = availableTabs
        .map((tab) => {
            const activeClass = tab === activeTab ? " is-active" : "";
            return `<button class="toolbar-popup-tab${activeClass}" data-tab="${tab}" type="button" role="tab" aria-selected="${tab === activeTab}" aria-controls="result" id="tab-${tab}">${renderer.labelForTab(tab)}</button>`;
        })
        .join("");
    if (resultRoot) {
        resultRoot.setAttribute("role", "tabpanel");
        resultRoot.setAttribute("aria-labelledby", `tab-${activeTab}`);
    }
}

function renderIdleState() {
    audio.stopPronunciation();
    renderState(DEFAULT_BODY_MESSAGE);
}

async function loadTab(tab) {
    const availableTabs = getAvailableTabs();
    if (!availableTabs.includes(tab)) {
        renderState("Enable this source in the extension settings.", true);
        return;
    }

    const query = activeQuery.trim();
    if (!query) {
        renderIdleState();
        return;
    }

    requestToken += 1;
    const token = requestToken;
    activeRequestId = "";
    audio.stopPronunciation();
    if (tab !== "ai") {
        activeFollowUps = [];
        activeAiIntent = "";
    } else {
        activeAiIntent = "default";
    }
    syncAiActionButtonStatus();

    const cacheKey = lookupClient.buildRequestCacheKey(tab, query, settings, {});
    const cached = lookupCache.get(cacheKey);
    if (cached) {
        if (cached.requestId) {
            activeRequestId = cached.requestId;
        }
        if (tab === "ai") {
            syncFollowUpState(query, contextText);
        }
        resultRoot.setAttribute("aria-busy", "false");
        resultRoot.innerHTML = renderer.renderResult(cached, getRenderOptions());
        audio.restorePracticeResult(resultRoot, query, cached.pronunciation?.language);
        syncAiActionButtonStatus();
        if (tab === "ai") {
            void preloadFollowUpIntents(query, contextText, token);
        } else {
            maybePreloadAi(query, tab);
        }
        return;
    }
    resultRoot.setAttribute("aria-busy", "true");
    renderState(`Loading ${renderer.labelForTab(tab).toLowerCase()}...`, false, true);

    try {
        const response = await lookupClient.getLookupResponse({
            tab,
            text: query,
            settings,
            requestOptions: { trigger: "manual" },
            cache: lookupCache
        });

        if (token !== requestToken) {
            return;
        }

        if (!response?.ok) {
            throw new Error(response?.error || "Request failed.");
        }

        if (response.result?.requestId) {
            activeRequestId = response.result.requestId;
        }
        if (tab === "ai") {
            syncFollowUpState(query, contextText);
        }
        resultRoot.innerHTML = renderer.renderResult(response.result, getRenderOptions());
        audio.restorePracticeResult(resultRoot, query, response.result?.pronunciation?.language);
        syncAiActionButtonStatus();
        if (tab === "ai") {
            void preloadFollowUpIntents(query, contextText, token);
        } else {
            maybePreloadAi(query, tab);
        }
    } catch (error) {
        if (token !== requestToken || error?.name === "AbortError" || String(error?.message || "").includes("aborted")) {
            return;
        }

        renderState(error.message || "Unable to load results.", true);
    } finally {
        if (token === requestToken) {
            resultRoot.setAttribute("aria-busy", "false");
        }
    }
}

function syncFollowUpState(text = activeQuery, context = contextText) {
    if (!settings?.enableAiPreload || !settings?.enableAI) {
        activeFollowUps = [];
        return;
    }

    const eligible = popupHelpers.getEligibleFollowUpIntents({ text, context });
    activeFollowUps = eligible.map((item) => {
        const cacheKey = lookupClient.buildRequestCacheKey("ai", text, settings, {
            context,
            intent: item.intent
        });
        const cached = lookupCache.get(cacheKey);
        return {
            ...item,
            result: cached || null,
            loading: !cached,
            error: ""
        };
    });
}

function patchActiveFollowUps() {
    if (activeTab !== "ai" || !resultRoot) {
        return;
    }
    syncAiActionButtonStatus();
}

async function preloadFollowUpIntents(text = activeQuery, context = contextText, token = requestToken) {
    if (!settings?.enableAiPreload || !settings?.enableAI) {
        return;
    }

    const query = String(text || "").trim();
    if (!query) {
        return;
    }

    syncFollowUpState(query, context);
    if (!activeFollowUps.length) {
        return;
    }

    if (token === requestToken && activeTab === "ai") {
        patchActiveFollowUps();
    }

    for (const item of activeFollowUps) {
        if (token !== requestToken) {
            return;
        }
        if (item.result) {
            continue;
        }

        try {
            const response = await lookupClient.getLookupResponse({
                tab: "ai",
                text: query,
                settings,
                requestOptions: {
                    trigger: "manual",
                    context,
                    intent: item.intent
                },
                cache: lookupCache
            });

            if (token !== requestToken) {
                return;
            }

            const target = activeFollowUps.find((entry) => entry.intent === item.intent);
            if (!target) {
                continue;
            }

            if (response?.ok && response.result) {
                target.result = response.result;
                target.loading = false;
                target.error = "";
            } else {
                target.loading = false;
                target.error = response?.error || item.errorMessage;
            }
        } catch (error) {
            if (token !== requestToken) {
                return;
            }
            const target = activeFollowUps.find((entry) => entry.intent === item.intent);
            if (target) {
                target.loading = false;
                target.error = error?.message || item.errorMessage;
            }
        }

        if (token === requestToken && activeTab === "ai") {
            patchActiveFollowUps();
        }
    }
}

function maybePreloadAi(query = activeQuery, currentTab = activeTab) {
    const normalizedQuery = String(query || "").trim();
    const preloadKey = lookupClient.buildRequestCacheKey("ai", normalizedQuery, settings, {});

    if (
        !settings.enableAiPreload ||
        !settings.enableAI ||
        !normalizedQuery ||
        currentTab === "ai" ||
        lastPreloadKey === preloadKey
    ) {
        return;
    }

    lastPreloadKey = preloadKey;
    void lookupClient.getLookupResponse({
        tab: "ai",
        text: normalizedQuery,
        settings,
        requestOptions: { trigger: "manual" },
        cache: lookupCache
    })
        .then(() => preloadFollowUpIntents(normalizedQuery, contextText, requestToken))
        .catch(() => {
            // Keep preload failures silent until the user opens the AI tab.
        });
}

function updateContextActionVisibility() {
    if (!contextActionContainer) {
        return;
    }

    const shouldShow = Boolean(settings?.enableAI) && activeTab === "ai" && Boolean(activeQuery.trim());
    contextActionContainer.hidden = !shouldShow;

    if (contextInput) {
        contextInput.disabled = !shouldShow;
    }

    if (explainContextButton) {
        explainContextButton.disabled = !shouldShow || !activeQuery.trim();
    }

    if (explainGrammarButton) {
        explainGrammarButton.disabled = !shouldShow || !activeQuery.trim();
    }

    if (explainSentenceButton) {
        explainSentenceButton.disabled = !shouldShow || !activeQuery.trim();
    }

    if (explainPhraseExplorerButton) {
        explainPhraseExplorerButton.disabled = !shouldShow || !activeQuery.trim();
    }

    if (explainCompareButton) {
        explainCompareButton.disabled = !shouldShow || !activeQuery.trim();
    }

    if (explainRephraseButton) {
        explainRephraseButton.disabled = !shouldShow || !activeQuery.trim();
    }

    syncAiActionButtonStatus();
}

function syncAiActionButtonStatus() {
    popupHelpers.syncAiActionButtonStatus(
        [explainContextButton, explainGrammarButton, explainPhraseExplorerButton, explainSentenceButton, explainCompareButton, explainRephraseButton].filter(Boolean),
        activeFollowUps,
        activeAiIntent,
        "toolbar-popup"
    );
}

async function prefillPageContext() {
    if (contextText || !activeQuery.trim()) {
        return;
    }

    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab?.id) {
            return;
        }

        if (!canInjectIntoUrl(tab.url)) {
            updateContextHelpForRestriction(classifyPageRestriction(tab.url));
            return;
        }

        const response = await chrome.tabs.sendMessage(tab.id, {
            type: "GET_PAGE_CONTEXT",
            payload: { text: activeQuery }
        });
        const pageContext = String(response?.context || "").trim();
        if (!pageContext || contextText || !contextInput) {
            return;
        }
        contextText = pageContext;
        contextSource = response?.source || "page";
        contextConfidence = response?.confidence || (contextSource === "selection" ? "exact" : "suggested");
        contextInput.value = pageContext;
        updateContextHelp();
        popupHelpers.autosizeTextarea(contextInput, { minRows: 2, maxRows: 4 });
    } catch (_error) {
        // Manual context entry remains available when extraction is unavailable.
        updateContextHelpForRestriction("content_script_unavailable");
    }
}

function updateContextHelpForRestriction(reason) {
    const help = document.querySelector("#context-help");
    if (!help) {
        return;
    }

    if (reason === "pdf_viewer") {
        help.textContent = "PDF viewer pages cannot auto-extract context. Paste the sentence here.";
        return;
    }

    if (reason === "file_url") {
        help.textContent = "Local files need Allow access to file URLs, or paste the sentence here.";
        return;
    }

    if (reason === "restricted_page") {
        help.textContent = "This page cannot provide context automatically. Paste the sentence here.";
        return;
    }

    help.textContent = "Page context unavailable. Paste the sentence here.";
}

function showContextError(message = "Paste or type the sentence that contains this word.") {
    if (contextError) {
        contextError.textContent = message;
        contextError.hidden = false;
    }
    if (contextInput) {
        contextInput.setAttribute("aria-invalid", "true");
    }
}

function clearContextError() {
    if (contextError) {
        contextError.hidden = true;
    }
    if (contextInput) {
        contextInput.removeAttribute("aria-invalid");
    }
}

function setContextActionButtonsDisabled(disabled) {
    [explainContextButton, explainGrammarButton, explainPhraseExplorerButton, explainSentenceButton, explainCompareButton, explainRephraseButton].forEach((button) => {
        if (button) {
            button.disabled = disabled;
        }
    });
}

function isSentenceLikeQuery(value) {
    const text = String(value || "").trim();
    return /[.!?]/.test(text) || text.split(/\s+/).filter(Boolean).length >= 7;
}

function updateContextHelp() {
    const help = document.querySelector("#context-help");
    if (!help) return;
    if (contextConfidence === "exact") {
        help.textContent = "Context detected from your selection. You can edit it.";
    } else if (contextConfidence === "suggested") {
        help.textContent = "Suggested sentence from this page. You can edit or replace it.";
    } else {
        help.textContent = "Used only for this explanation. Not saved.";
    }
}

function renderState(message, isError = false, isLoading = false) {
    if (isLoading) {
        resultRoot.innerHTML = renderer.renderSkeleton("toolbar-popup");
        return;
    }

    const errorClass = isError ? " is-error" : "";
    const title = isError ? "Something went wrong" : "Ready";
    const showTitle = isError || message === DEFAULT_BODY_MESSAGE;
    const titleHtml = showTitle ? `<strong>${renderer.escapeHtml(isError ? title : "Look up a word")}</strong>` : "";
    resultRoot.innerHTML = `<div class="toolbar-popup-state${errorClass}">${titleHtml}<span>${renderer.escapeHtml(message)}</span></div>`;
}

function cancelPendingLookup() {
    if (!activeQuery && !activeRequestId && requestToken === 0) {
        return;
    }

    requestToken += 1;
    activeRequestId = "";
    void chrome.runtime.sendMessage({ type: CANCEL_LOOKUP }).catch(() => {
        // The toolbar popup is closing; cancellation is best-effort.
    });
}

async function consumeStashedFallbackLookup() {
    const params = new URLSearchParams(window.location.search);
    const queryFallback = String(params.get("lookup") || "").trim();
    if (queryFallback) {
        applyFallbackQuery(queryFallback);
        return;
    }

    if (!chrome.storage?.session) {
        return;
    }

    const key = "dictionaryHelperToolbarFallbackLookup";
    try {
        const data = await chrome.storage.session.get(key);
        const item = data?.[key];
        if (!item?.text) {
            return;
        }

        await chrome.storage.session.remove(key);

        const ageMs = Date.now() - (Number(item.createdAt) || 0);
        if (ageMs > 60000) {
            return;
        }

        applyFallbackQuery(item.text);
    } catch (_error) {
        // Fallback consumption is best-effort.
    }
}

function applyFallbackQuery(value) {
    const query = String(value || "").trim();
    if (!query) {
        return;
    }

    if (input) {
        input.value = query;
    }
    activeQuery = query;
    updateContextActionVisibility();
    void loadTab(activeTab);

    if (activeTab === "ai" && !contextText) {
        void prefillPageContext();
    }
}
