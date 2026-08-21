/**
 * state.js — Constants, default UI settings, render options.
 *
 * Classic script (no module system) loaded in content_scripts before
 * content.js. Attaches to globalThis.DictionaryHelperContent for cross-module
 * access. This is a safe extraction of the pure constants and helpers from
 * the monolithic content.js.
 */
(function (global) {
    "use strict";

    const TAB_ORDER = ["dictionary", "ai"];

    // Minimal UI fallbacks used only until storage-backed settings load.
    // Authoritative defaults and normalization live in src/shared/storage.js.
    const DEFAULT_UI_SETTINGS = {
        selectionTriggerMode: "icon",
        postSelectionModifier: "shift",
        defaultTab: "dictionary",
        theme: "system",
        fontFamily: "editorial",
        popupWidth: 620,
        popupHeight: 720,
        enableTranslate: true,
        enableDictionary: true,
        enableLexicalProfile: true,
        enableAI: true,
        enableAiPreload: false,
        disablePageContextExtraction: false,
        translateTargetLanguage: "English",
        customLanguages: "English, Vietnamese",
        translateProvider: "google",
        libreTranslateBaseUrl: "https://libretranslate.com",
        dictionaryProvider: "free_dictionary",
        pronunciationRate: 0.95,
        pronunciationVoiceURI: "",
        aiBaseUrl: "https://generativelanguage.googleapis.com/v1beta/openai/",
        aiModel: "gemini-3.5-flash-lite"
    };

    const ns = global.DictionaryHelperContent = global.DictionaryHelperContent || {};
    ns.TAB_ORDER = TAB_ORDER;
    ns.DEFAULT_UI_SETTINGS = DEFAULT_UI_SETTINGS;
})(typeof window !== "undefined" ? window : globalThis);
