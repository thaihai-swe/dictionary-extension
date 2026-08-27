import { getUiSettings, saveSettings } from "../../shared/storage.js";
import { populateLanguageSelect } from "../../shared/languages.js";
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
} from "./state.js";
import {
    applyDimensions,
    clearContextError,
    getInitialTab,
    handlePauseSite,
    isSentenceLikeQuery,
    renderIdleState,
    renderState,
    renderTabs,
    setContextActionButtonsDisabled,
    syncAiActionButtonStatus,
    updateContextActionVisibility,
    updateContextHelp,
    updatePauseSiteButton
} from "./view.js";
import {
    cancelPendingLookup,
    consumeStashedFallbackLookup,
    loadTab,
    prefillPageContext,
    preloadFollowUpIntents
} from "./lookup.js";
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
} from "./actions.js";

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
    if (popupHelpers?.readLastIntentSync) {
        state.activeAiIntent = popupHelpers.readLastIntentSync();
    }
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

    const themeToggleBtn = document.querySelector(".toolbar-popup-theme-toggle, .dictionary-helper-theme-toggle");
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

    const shortcutsBtn = document.querySelector(".toolbar-popup-shortcuts-btn, .dictionary-helper-shortcuts-btn");
    const shortcutsModal = document.querySelector(".toolbar-popup-shortcuts-modal, .dictionary-helper-shortcuts-modal");
    const shortcutsClose = document.querySelector(".toolbar-popup-shortcuts-close, .dictionary-helper-shortcuts-close");

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
    });

    PopupController.attachCommonListeners({
        container: document.querySelector(".toolbar-popup") || document.documentElement,
        state,
        loadTab: (targetTab) => {
            if (input && state.activeQuery) {
                input.value = state.activeQuery;
            }
            renderTabs();
            updateContextActionVisibility();
            return loadTab(targetTab);
        },
        runAiAction: (intent) => {
            switch (intent) {
                case "explain_in_context": return handleExplainInContext();
                case "grammar": return handleExplainGrammar();
                case "phrase_explorer": return handleExplainPhraseExplorer();
                case "sentence_breakdown": return handleSentenceBreakdown();
                case "compare_confusables": return handleCompareConfusables();
                case "rephrase": return handleRephrase();
                default: break;
            }
        },
        updateContextHelp,
        clearContextError,
        audio,
        popupHelpers
    });

    document.addEventListener("keydown", handleKeydown);
    chrome.storage.onChanged.addListener(handleStorageChanges);
    chrome.runtime.onMessage.addListener(handleRuntimeMessage);
    window.addEventListener("pagehide", cancelPendingLookup, { once: true });

    input?.focus();
}
