import { getUiSettings, saveSettings } from "../src/shared/storage.js";
import { populateLanguageSelect } from "../src/shared/languages.js";
import {
    audio,
    contextInput,
    explainCompareButton,
    explainContextButton,
    explainGrammarButton,
    explainPhraseExplorerButton,
    explainRephraseButton,
    explainSentenceButton,
    form,
    input,
    languageSelect,
    lookupCache,
    lookupClient,
    openSettingsButton,
    pauseSiteButton,
    popupHelpers,
    providerSelect,
    renderer,
    resultRoot,
    state,
    tabsRoot
} from "./popup-state.js";
import {
    applyDimensions,
    clearContextError,
    getInitialTab,
    handlePauseSite,
    renderIdleState,
    renderState,
    renderTabs,
    updateContextActionVisibility,
    updateContextHelp,
    updatePauseSiteButton
} from "./popup-ui.js";
import {
    cancelPendingLookup,
    consumeStashedFallbackLookup,
    loadTab,
    prefillPageContext
} from "./popup-lookup.js";
import {
    handleCompareConfusables,
    handleExplainGrammar,
    handleExplainInContext,
    handleExplainPhraseExplorer,
    handleKeydown,
    handleOpenSettings,
    handleRephrase,
    handleRuntimeMessage,
    handleSentenceBreakdown,
    handleStorageChanges,
    handleSubmit,
    handleTabClick
} from "./popup-actions.js";

init().catch((error) => {
    renderState(error.message || "Unable to load popup.", true);
});

async function init() {
    if (!renderer || !audio || !lookupCache || !popupHelpers || !lookupClient) {
        throw new Error("Shared UI modules failed to load. Reload the extension.");
    }

    state.settings = await getUiSettings();
    document.documentElement.setAttribute("data-theme", state.settings.theme || "system");
    document.documentElement.setAttribute("data-font", state.settings.fontFamily || "editorial");
    state.activeTab = await getInitialTab();
    applyDimensions();
    updateContextActionVisibility();
    renderTabs();
    renderIdleState();

    if (state.activeTab === "ai" && state.activeQuery.trim()) {
        void prefillPageContext();
    }

    await consumeStashedFallbackLookup();

    if (providerSelect) {
        providerSelect.value = state.settings.dictionaryProvider || "free_dictionary";
        providerSelect.addEventListener("change", async (event) => {
            const next = event.target.value;
            state.settings.dictionaryProvider = next;
            await saveSettings({ dictionaryProvider: next });
            lookupCache.clear();
            if (state.activeQuery) {
                void loadTab(state.activeTab);
            }
        });
    }

    if (languageSelect) {
        populateLanguageSelect(
            languageSelect,
            state.settings.translateTargetLanguage,
            state.settings.customLanguages
        );
        languageSelect.addEventListener("change", async (event) => {
            const next = String(event.target.value || "").trim();
            if (!next) return;
            state.settings.translateTargetLanguage = next;
            await saveSettings({ translateTargetLanguage: next });
            lookupCache.clear();
            if (state.activeQuery) {
                void loadTab(state.activeTab);
            }
        });
    }

    form?.addEventListener("submit", handleSubmit);
    openSettingsButton?.addEventListener("click", handleOpenSettings);

    const themeToggleBtn = document.querySelector(".dictionary-helper-theme-toggle");
    themeToggleBtn?.addEventListener("click", async () => {
        const currentTheme = state.settings.theme || "system";
        let isCurrentlyDark = false;
        if (currentTheme === "dark") {
            isCurrentlyDark = true;
        } else if (currentTheme === "light") {
            isCurrentlyDark = false;
        } else {
            isCurrentlyDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
        }
        const nextTheme = isCurrentlyDark ? "light" : "dark";
        state.settings.theme = nextTheme;
        document.documentElement.setAttribute("data-theme", nextTheme);
        await saveSettings({ theme: nextTheme });
    });

    const shortcutsBtn = document.querySelector(".dictionary-helper-shortcuts-btn");
    const shortcutsModal = document.querySelector(".dictionary-helper-shortcuts-modal");
    const shortcutsClose = document.querySelector(".dictionary-helper-shortcuts-close");

    shortcutsBtn?.addEventListener("click", (event) => {
        event.stopPropagation();
        if (shortcutsModal) {
            shortcutsModal.hidden = !shortcutsModal.hidden;
        }
    });

    shortcutsClose?.addEventListener("click", (event) => {
        event.stopPropagation();
        if (shortcutsModal) {
            shortcutsModal.hidden = true;
        }
    });

    pauseSiteButton?.addEventListener("click", handlePauseSite);
    void updatePauseSiteButton();
    tabsRoot?.addEventListener("click", handleTabClick);

    resultRoot?.addEventListener("click", (event) => {
        audio.handlePronunciationClick(event);

        const phraseBtn = event.target.closest("[data-lookup-query]");
        if (phraseBtn) {
            const query = String(phraseBtn.dataset.lookupQuery || "").trim();
            if (query && input && query.toLowerCase() !== String(state.activeQuery || "").trim().toLowerCase()) {
                audio.clearPracticeResults();
                input.value = query;
                state.activeQuery = query;
                state.activeTab = "dictionary";
                state.activeAiIntent = "";
                void popupHelpers.writeLastTab(state.activeTab);
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
        state.contextText = popupHelpers.normalizeContext(contextInput.value);
        state.contextSource = state.contextText ? "manual" : "";
        state.contextConfidence = state.contextText ? "manual" : "none";
        clearContextError();
        updateContextHelp();
        popupHelpers.autosizeTextarea(contextInput, { minRows: 2, maxRows: 4 });
    });

    document.addEventListener("keydown", handleKeydown);
    chrome.storage.onChanged.addListener(handleStorageChanges);
    chrome.runtime.onMessage.addListener(handleRuntimeMessage);
    window.addEventListener("pagehide", cancelPendingLookup, { once: true });

    input?.focus();
}
