/**
 * state.js — Constants, default UI settings, shared mutable state object.
 *
 * Classic script (no module system) loaded in content_scripts before
 * other content modules and content.js.
 * Attaches to globalThis.DictionaryHelperContent for cross-module access.
 */
(function (global) {
    "use strict";

    const TAB_ORDER = ["dictionary", "ai"];

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
        enableAI: false,
        enableAiPreload: false,
        enablePhraseFallback: true,
        disablePageContextExtraction: false,
        pausedHostnames: [],
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

    const state = {
        popupHostWrapper: null,
        shadowRoot: null,
        popupRoot: null,
        popupCard: null,
        triggerIconRoot: null,
        activeText: "",
        activeContext: "",
        activeContextSource: "",
        activeContextConfidence: "none",
        activeTab: "dictionary",
        currentPosition: { x: 24, y: 24 },
        currentSelectionRect: null,
        unbindViewportReposition: null,
        requestToken: 0,
        lastPreloadKey: "",
        activeFollowUps: [],
        activeAiIntent: "",
        activeRequestId: "",
        lastLookupRevision: -1,
        isPointerSelecting: false,
        selectionClearTimer: 0,
        selectionCaptureToken: 0,
        currentSelectionSnapshot: null,
        restoreFocusElement: null,
        focusPopupOnOpen: false,
        isPopupClosing: false,
        unbindPopupResize: null,
        settings: { ...DEFAULT_UI_SETTINGS },
        extensionContextValid: true
    };

    const ns = global.DictionaryHelperContent = global.DictionaryHelperContent || {};
    ns.TAB_ORDER = TAB_ORDER;
    ns.DEFAULT_UI_SETTINGS = DEFAULT_UI_SETTINGS;
    ns.state = state;

    ns.getRenderOptions = (extra = {}) => ({
        prefix: "dictionary-helper",
        titleTag: "h3",
        sectionTitleTag: "h4",
        pronunciationRate: ns.state.settings?.pronunciationRate ?? 0.95,
        pronunciationVoiceURI: ns.state.settings?.pronunciationVoiceURI ?? "",
        followUps: extra.followUps || (ns.state.activeTab === "ai" ? ns.state.activeFollowUps : [])
    });
})(typeof window !== "undefined" ? window : globalThis);
