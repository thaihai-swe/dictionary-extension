/**
 * Shared state, DOM references, and constants for toolbar action popup.
 */
export const TAB_ORDER = ["dictionary", "ai"];
export const DEFAULT_BODY_MESSAGE = "Type a word or phrase, then press Search.";

export const popupShell = window.DictionaryHelperPopupShell;
export const popupRoot = document.querySelector(".toolbar-popup");

if (popupRoot && popupShell) {
    popupRoot.innerHTML = popupShell.createMarkup({ prefix: "toolbar-popup", host: "toolbar" });
}

export const form = document.querySelector("#lookup-form");
export const input = document.querySelector("#lookup-input");
export const tabsRoot = document.querySelector("#tabs");
export const resultRoot = document.querySelector("#result");
export const contextActionContainer = document.querySelector("#context-action-container");
export const contextInput = document.querySelector("#context-input");
export const contextError = document.querySelector("#context-error");
export const explainContextButton = document.querySelector("#explain-context-btn");
export const explainGrammarButton = document.querySelector("#explain-grammar-btn");
export const explainPhraseExplorerButton = document.querySelector("#explain-phrase-explorer-btn");
export const explainSentenceButton = document.querySelector("#explain-sentence-btn");
export const explainCompareButton = document.querySelector("#explain-compare-btn");
export const explainRephraseButton = document.querySelector("#explain-rephrase-btn");
export const openSettingsButton = document.querySelector("#open-settings-btn");
export const pauseSiteButton = document.querySelector("#pause-site-btn");
export const providerSelect = document.querySelector("#provider-select");
export const languageSelect = document.querySelector("#lang-select");

export const renderer = window.DictionaryHelperRenderer;
export const audio = window.DictionaryHelperAudio;
export const lookupCache = window.DictionaryHelperCache ? window.DictionaryHelperCache.createLookupCache() : null;
export const popupHelpers = window.DictionaryHelperPopupHelpers;
export const lookupClient = window.DictionaryHelperLookup;

export const state = {
    settings: null,
    activeTab: "dictionary",
    activeQuery: "",
    contextText: "",
    contextSource: "",
    contextConfidence: "none",
    requestToken: 0,
    lastPreloadKey: "",
    activeFollowUps: [],
    activeAiIntent: "",
    activeRequestId: "",
    lastLookupRevision: -1
};

export const getRenderOptions = (extra = {}) => ({
    prefix: "toolbar-popup",
    titleTag: "h2",
    sectionTitleTag: "h3",
    pronunciationRate: state.settings?.pronunciationRate ?? 0.95,
    pronunciationVoiceURI: state.settings?.pronunciationVoiceURI ?? "",
    followUps: extra.followUps || (state.activeTab === "ai" ? state.activeFollowUps : [])
});
