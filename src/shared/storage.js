/**
 * Unified storage management for Chrome MV3.
 * Automatically keeps key AI API keys inside chrome.storage.local
 * while other user preferences synchronize via chrome.storage.sync.
 */

import {
    DEFAULT_DICTIONARY_PROVIDER,
    normalizeDictionaryProviderId
} from "../providers/dictionary.js";
import {
    DEFAULT_TRANSLATION_PROVIDER,
    normalizeTranslationProviderId
} from "../providers/translate.js";
import {
    DEFAULT_CUSTOM_LANGUAGES,
    normalizeCustomLanguages,
    resolveLanguageName
} from "./languages.js";
import {
    DEFAULT_AI_PROMPTS,
    getLegacyDefaultPromptUpdates
} from "./ai-prompts.js";

export const DEFAULT_SETTINGS = {
    theme: "system",
    fontFamily: "editorial",
    selectionTriggerMode: "icon",
    postSelectionModifier: "shift",
    enableContextMenuTrigger: true,
    defaultTab: "dictionary",
    translateTargetLanguage: "English",
    customLanguages: DEFAULT_CUSTOM_LANGUAGES,
    translateProvider: DEFAULT_TRANSLATION_PROVIDER,
    libreTranslateBaseUrl: "https://libretranslate.com",
    libreTranslateApiKey: "",
    dictionaryProvider: DEFAULT_DICTIONARY_PROVIDER,
    dictionaryApiKey: "",
    wordnikApiKey: "",
    wordsApiKey: "",
    popupWidth: 500,
    popupHeight: 600,
    enableTranslate: true,
    enableDictionary: true,
    enableLexicalProfile: true,
    enableAI: true,
    enableAiPreload: false,
    disablePageContextExtraction: false,
    pronunciationRate: 0.95,
    pronunciationVoiceURI: "",
    aiBaseUrl: "https://generativelanguage.googleapis.com/v1beta/openai/",
    aiApiKey: "",
    aiModel: "gemini-3.5-flash-lite",
    ...DEFAULT_AI_PROMPTS
};

export const SETTINGS_SCHEMA_VERSION = 8;
const SETTINGS_SCHEMA_VERSION_KEY = "dictionaryHelperSettingsSchemaVersion";

export const SECRET_SETTING_KEYS = Object.freeze([
    "aiApiKey",
    "dictionaryApiKey",
    "wordnikApiKey",
    "wordsApiKey",
    "libreTranslateApiKey"
]);

const LOCAL_STORAGE_KEYS = new Set(SECRET_SETTING_KEYS);
export const UI_SETTING_KEYS = Object.freeze([
    "theme",
    "fontFamily",
    "selectionTriggerMode",
    "postSelectionModifier",
    "enableContextMenuTrigger",
    "defaultTab",
    "translateTargetLanguage",
    "customLanguages",
    "translateProvider",
    "libreTranslateBaseUrl",
    "dictionaryProvider",
    "popupWidth",
    "popupHeight",
    "enableTranslate",
    "enableDictionary",
    "enableLexicalProfile",
    "enableAI",
    "enableAiPreload",
    "disablePageContextExtraction",
    "pronunciationRate",
    "pronunciationVoiceURI",
    "aiBaseUrl",
    "aiModel"
]);
const UI_SETTING_DEFAULTS = Object.freeze(
    Object.fromEntries(UI_SETTING_KEYS.map((key) => [key, DEFAULT_SETTINGS[key]]))
);
const LOCAL_KEY_DEFAULTS = {
    aiApiKey: DEFAULT_SETTINGS.aiApiKey,
    dictionaryApiKey: DEFAULT_SETTINGS.dictionaryApiKey,
    wordnikApiKey: DEFAULT_SETTINGS.wordnikApiKey,
    wordsApiKey: DEFAULT_SETTINGS.wordsApiKey,
    libreTranslateApiKey: DEFAULT_SETTINGS.libreTranslateApiKey
};
export async function getSettings() {
    // Fetch preferences from sync and API keys from local.
    const [rawSyncData, localData] = await Promise.all([
        chrome.storage.sync.get(null),
        chrome.storage.local.get(LOCAL_KEY_DEFAULTS)
    ]);

    const syncData = rawSyncData || {};
    const merged = {
        ...DEFAULT_SETTINGS,
        ...syncData,
        aiApiKey: localData.aiApiKey ?? DEFAULT_SETTINGS.aiApiKey,
        dictionaryApiKey: localData.dictionaryApiKey ?? DEFAULT_SETTINGS.dictionaryApiKey,
        wordnikApiKey: localData.wordnikApiKey ?? DEFAULT_SETTINGS.wordnikApiKey,
        wordsApiKey: localData.wordsApiKey ?? DEFAULT_SETTINGS.wordsApiKey,
        libreTranslateApiKey: localData.libreTranslateApiKey ?? DEFAULT_SETTINGS.libreTranslateApiKey
    };

    return normalizeSettings(merged);
}

/**
 * Load only the non-sensitive preferences required by toolbar and content UI.
 * This function never reads chrome.storage.local, so API keys cannot enter
 * those execution contexts even transiently.
 */
export async function getUiSettings() {
    const syncData = await chrome.storage.sync.get(UI_SETTING_DEFAULTS);
    const normalized = normalizeSettings({
        ...DEFAULT_SETTINGS,
        ...(syncData || {})
    });

    return Object.fromEntries(
        UI_SETTING_KEYS.map((key) => [key, normalized[key]])
    );
}

/**
 * Move any API keys written by older versions from sync to local storage,
 * preserving a newer local value when one already exists. Secrets are removed
 * from sync in all cases after this migration.
 */
export async function migrateLegacySecretSettings() {
    const [syncData, localData] = await Promise.all([
        chrome.storage.sync.get(SECRET_SETTING_KEYS),
        chrome.storage.local.get(LOCAL_KEY_DEFAULTS)
    ]);
    const localUpdates = {};
    const syncKeysToRemove = [];

    for (const key of SECRET_SETTING_KEYS) {
        if (!Object.prototype.hasOwnProperty.call(syncData || {}, key)) {
            continue;
        }

        const legacyValue = String(syncData[key] || "").trim();
        const localValue = String(localData[key] || "").trim();
        if (legacyValue && !localValue) {
            localUpdates[key] = legacyValue;
        }
        syncKeysToRemove.push(key);
    }

    await Promise.all([
        Object.keys(localUpdates).length
            ? chrome.storage.local.set(localUpdates)
            : Promise.resolve(),
        syncKeysToRemove.length
            ? chrome.storage.sync.remove(syncKeysToRemove)
            : Promise.resolve()
    ]);

    return {
        migrated: Object.keys(localUpdates),
        removedFromSync: syncKeysToRemove
    };
}


/**
 * Migrate saved settings across schema versions.
 * Version 2 replaces the saved Sentence Breakdown template with the
 * CEFR-free default contract. Version 3 removes deprecated Collocations
 * settings and the unused local vocabulary data. Version 4 replaces only
 * matching built-in AI, Context, Grammar, and Phrase Explorer defaults so
 * Markdown no longer duplicates lexical-profile cards. Version 5 updates only
 * matching Phrase Explorer built-ins so reserved profile headings stay
 * structured. Version 6 streamlines built-in Main, Context, and Grammar
 * prompts to remove duplicated dictionary/translation sections and align
 * with the focused intent outlines. Version 7 updates only matching Main AI
 * built-ins so Translation & Meaning asks for sense-aware target-language
 * glosses. Version 8 enriches built-in Main AI example translations, context
 * meaning translation glosses, and phrase core meaning target-language
 * equivalents; custom templates are left unchanged.
 */
export async function migrateSettingsSchema() {
    const syncData = await chrome.storage.sync.get([
        SETTINGS_SCHEMA_VERSION_KEY,
        "aiSentencePromptTemplate",
        "aiPromptTemplate",
        "aiContextPromptTemplate",
        "aiGrammarPromptTemplate",
        "aiPhraseExplorerPromptTemplate"
    ]);
    const currentVersion = Number(syncData?.[SETTINGS_SCHEMA_VERSION_KEY] || 0);

    if (currentVersion >= SETTINGS_SCHEMA_VERSION) {
        return { migrated: false, version: currentVersion };
    }

    const updates = {
        [SETTINGS_SCHEMA_VERSION_KEY]: SETTINGS_SCHEMA_VERSION
    };

    if (currentVersion < 2 && syncData?.aiSentencePromptTemplate) {
        updates.aiSentencePromptTemplate = DEFAULT_SETTINGS.aiSentencePromptTemplate;
    }

    if (currentVersion < 3) {
        await Promise.all([
            chrome.storage.sync.remove(["aiCollocationsPromptTemplate"]),
            chrome.storage.local?.remove
                ? chrome.storage.local.remove(["savedVocabulary"]).catch(() => {})
                : Promise.resolve()
        ]);
    }

    if (currentVersion < 8) {
        Object.assign(updates, getLegacyDefaultPromptUpdates(syncData));
    }

    await chrome.storage.sync.set(updates);
    return { migrated: true, version: SETTINGS_SCHEMA_VERSION };
}

export function serializePublicSettings(settings) {
    const publicSettings = {};
    for (const key of Object.keys(DEFAULT_SETTINGS)) {
        if (SECRET_SETTING_KEYS.includes(key)) {
            continue;
        }
        publicSettings[key] = settings?.[key] ?? DEFAULT_SETTINGS[key];
    }

    return {
        version: SETTINGS_SCHEMA_VERSION,
        exportedAt: new Date().toISOString(),
        settings: publicSettings
    };
}

export function parsePublicSettingsImport(raw) {
    let parsed = raw;
    if (typeof raw === "string") {
        parsed = JSON.parse(raw);
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("Settings file must contain a JSON object.");
    }

    const incoming = parsed.settings && typeof parsed.settings === "object" && !Array.isArray(parsed.settings)
        ? parsed.settings
        : parsed;
    const ignoredSecrets = SECRET_SETTING_KEYS.filter((key) => Object.prototype.hasOwnProperty.call(incoming, key));
    const next = {};
    for (const key of Object.keys(DEFAULT_SETTINGS)) {
        if (SECRET_SETTING_KEYS.includes(key) || !Object.prototype.hasOwnProperty.call(incoming, key)) {
            continue;
        }
        next[key] = incoming[key];
    }

    const normalized = normalizeSettings({
        ...DEFAULT_SETTINGS,
        ...next
    });
    const publicSettings = {};
    for (const key of Object.keys(normalized)) {
        if (SECRET_SETTING_KEYS.includes(key)) {
            continue;
        }
        publicSettings[key] = normalized[key];
    }

    return {
        settings: publicSettings,
        ignoredSecrets
    };
}

export async function saveSettings(partialSettings) {
    const current = await getSettings();
    const normalized = normalizeSettings({
        ...current,
        ...partialSettings
    });
    const syncData = {};
    const localData = {};

    for (const [key, val] of Object.entries(normalized)) {
        if (!(key in DEFAULT_SETTINGS)
            || !Object.prototype.hasOwnProperty.call(partialSettings || {}, key)
            || current[key] === val) {
            continue;
        }

        if (LOCAL_STORAGE_KEYS.has(key)) {
            localData[key] = val;
        } else {
            syncData[key] = val;
        }
    }

    await Promise.all([
        Object.keys(syncData).length ? chrome.storage.sync.set(syncData) : Promise.resolve(),
        Object.keys(localData).length ? chrome.storage.local.set(localData) : Promise.resolve(),
        chrome.storage.sync.remove(SECRET_SETTING_KEYS)
    ]);
}

export function normalizeSettings(settings) {
    const normalized = { ...settings };

    for (const key of [
        "defaultTab",
        "translateTargetLanguage",
        "customLanguages",
        "translateProvider",
        "dictionaryProvider",
        "dictionaryApiKey",
        "wordnikApiKey",
        "wordsApiKey",
        "aiBaseUrl",
        "aiApiKey",
        "aiModel",
        "aiPromptTemplate",
        "aiContextPromptTemplate",
        "aiGrammarPromptTemplate",
        "aiSentencePromptTemplate",
        "aiPhraseExplorerPromptTemplate",
        "selectionTriggerMode",
        "postSelectionModifier",
        "pronunciationVoiceURI",
        "libreTranslateBaseUrl",
        "libreTranslateApiKey"
    ]) {
        if (typeof normalized[key] === "string") {
            normalized[key] = normalized[key].trim();
        }
    }

    if (!["system", "light", "dark"].includes(normalized.theme)) {
        normalized.theme = "system";
    }

    if (!["editorial", "learner"].includes(normalized.fontFamily)) {
        normalized.fontFamily = "editorial";
    }

    normalized.popupWidth = clampNumber(normalized.popupWidth, 320, 840, 500);
    normalized.popupHeight = clampNumber(normalized.popupHeight, 360, 900, 600);
    normalized.pronunciationRate = clampFloat(normalized.pronunciationRate, 0.5, 1.5, 0.95);
    normalized.customLanguages = normalizeCustomLanguages(normalized.customLanguages);
    normalized.translateTargetLanguage = resolveLanguageName(
        normalized.translateTargetLanguage,
        normalized.customLanguages
    );
    normalized.translateProvider = normalizeTranslationProviderId(normalized.translateProvider);
    normalized.dictionaryProvider = normalizeDictionaryProviderId(normalized.dictionaryProvider);
    normalized.dictionaryApiKey = String(normalized.dictionaryApiKey || "").trim();
    normalized.wordnikApiKey = String(normalized.wordnikApiKey || "").trim();
    normalized.wordsApiKey = String(normalized.wordsApiKey || "").trim();
    normalized.libreTranslateApiKey = String(normalized.libreTranslateApiKey || "").trim();
    normalized.libreTranslateBaseUrl = String(
        normalized.libreTranslateBaseUrl || DEFAULT_SETTINGS.libreTranslateBaseUrl
    ).trim().replace(/\/+$/, "") || DEFAULT_SETTINGS.libreTranslateBaseUrl;
    normalized.pronunciationVoiceURI = String(normalized.pronunciationVoiceURI || "").trim();

    const hasExplicitMode = typeof settings?.selectionTriggerMode === "string"
        && ["off", "icon", "direct"].includes(settings.selectionTriggerMode.trim().toLowerCase());

    normalized.selectionTriggerMode = hasExplicitMode
        ? settings.selectionTriggerMode.trim().toLowerCase()
        : DEFAULT_SETTINGS.selectionTriggerMode;

    const postSelectionModifier = String(normalized.postSelectionModifier || "").toLowerCase();
    normalized.postSelectionModifier = ["shift", "alt", "ctrl"].includes(postSelectionModifier)
        ? postSelectionModifier
        : DEFAULT_SETTINGS.postSelectionModifier;

    normalized.enableContextMenuTrigger = Boolean(normalized.enableContextMenuTrigger);
    normalized.enableTranslate = Boolean(normalized.enableTranslate);
    normalized.enableDictionary = Boolean(normalized.enableDictionary);
    normalized.enableLexicalProfile = Boolean(normalized.enableLexicalProfile);
    normalized.enableAI = Boolean(normalized.enableAI);
    normalized.enableAiPreload = Boolean(normalized.enableAiPreload);
    normalized.disablePageContextExtraction = Boolean(normalized.disablePageContextExtraction);

    if (!normalized.aiPromptTemplate) {
        normalized.aiPromptTemplate = DEFAULT_SETTINGS.aiPromptTemplate;
    }

    if (!normalized.aiContextPromptTemplate) {
        normalized.aiContextPromptTemplate = DEFAULT_SETTINGS.aiContextPromptTemplate;
    }

    if (!normalized.aiGrammarPromptTemplate) {
        normalized.aiGrammarPromptTemplate = DEFAULT_SETTINGS.aiGrammarPromptTemplate;
    }

    if (!normalized.aiSentencePromptTemplate) {
        normalized.aiSentencePromptTemplate = DEFAULT_SETTINGS.aiSentencePromptTemplate;
    }

    if (!normalized.aiPhraseExplorerPromptTemplate) {
        normalized.aiPhraseExplorerPromptTemplate = DEFAULT_SETTINGS.aiPhraseExplorerPromptTemplate;
    }

    return normalized;
}

function clampNumber(value, min, max, fallback) {
    const numeric = Number(value);

    if (!Number.isFinite(numeric)) {
        return fallback;
    }

    return Math.min(max, Math.max(min, Math.round(numeric)));
}

function clampFloat(value, min, max, fallback) {
    const numeric = Number(value);

    if (!Number.isFinite(numeric)) {
        return fallback;
    }

    const clamped = Math.min(max, Math.max(min, numeric));
    return Math.round(clamped * 100) / 100;
}
