import { ref, watch, Ref } from 'vue';
import { TabId, AiIntentId, AppSettings } from '../types';
import {
  DEFAULT_SETTINGS,
  SECRET_KEYS,
  getPublicSettings,
  loadFullSettings,
  loadPublicSettings,
  normalizeSettings,
  parsePublicSettingsImport,
  saveSettingsPartial,
  serializePublicSettings,
} from '../shared/settings';

export {
  DEFAULT_SETTINGS,
  getPublicSettings,
  parsePublicSettingsImport,
  serializePublicSettings,
};

const CACHE_INVALIDATION_KEYS = new Set([
  'dictionaryProvider',
  'enableDictionary',
  'enableTranslate',
  'enablePhraseFallback',
  'enableLexicalProfile',
  'enableAI',
  'translateTargetLanguage',
  'translateProvider',
  'libreTranslateBaseUrl',
  'dictionaryApiKey',
  'wordnikApiKey',
  'wordsApiKey',
  'libreTranslateApiKey',
  'aiApiKey',
  'aiModel',
  'aiBaseUrl',
  'aiPromptTemplate',
  'aiDefaultPromptTemplate',
  'aiContextPromptTemplate',
  'aiGrammarPromptTemplate',
  'aiSentencePromptTemplate',
  'aiPhraseExplorerPromptTemplate',
  'aiComparePromptTemplate',
  'aiRephrasePromptTemplate',
]);

function shouldInvalidateLookupCache(keys: string[]): boolean {
  return keys.some((key) => CACHE_INVALIDATION_KEYS.has(key));
}

async function invalidateLookupCaches() {
  try {
    const [{ clearDictionaryCache }, { clearAiCache }] = await Promise.all([
      import('./composable.dictionary'),
      import('./composable.ai-assistant'),
    ]);
    clearDictionaryCache();
    clearAiCache();
  } catch (error) {
    console.warn('Lookup cache invalidation failed:', error);
  }
}

const STORAGE_KEYS = {
  ACTIVE_TAB: 'dict_last_tab_v2',
  ACTIVE_INTENT: 'dict_last_intent_v2',
};

const settingsRef: Ref<AppSettings> = ref<AppSettings>({ ...DEFAULT_SETTINGS });
let initialized = false;

function normalizeSettingsArrayFields(settings: AppSettings): AppSettings {
  if (!Array.isArray(settings.pausedHostnames)) {
    if (typeof settings.pausedHostnames === 'string' && (settings.pausedHostnames as string).trim()) {
      settings.pausedHostnames = (settings.pausedHostnames as string)
        .split('\n')
        .map(s => s.trim().toLowerCase())
        .filter(Boolean);
    } else {
      settings.pausedHostnames = [];
    }
  }
  return settings;
}

function isExtensionPopup(): boolean {
  try {
    return typeof window !== 'undefined' && window.location?.protocol === 'chrome-extension:';
  } catch {
    return false;
  }
}

async function loadSettingsFromStorage(): Promise<AppSettings> {
  try {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      const loaded = isExtensionPopup() ? await loadFullSettings() : await loadPublicSettings();
      return normalizeSettingsArrayFields(loaded);
    }
  } catch (e) {
    console.warn('Chrome storage read failed:', e);
  }

  const current: AppSettings = { ...DEFAULT_SETTINGS };
  if (typeof localStorage !== 'undefined') {
    for (const key of Object.keys(DEFAULT_SETTINGS) as (keyof AppSettings)[]) {
      if (SECRET_KEYS.has(key)) continue;
      const val = localStorage.getItem(`dict_setting_${key}`);
      if (val !== null) {
        try {
          (current as any)[key] = JSON.parse(val);
        } catch {
          (current as any)[key] = val;
        }
      }
    }
  }

  return normalizeSettingsArrayFields(normalizeSettings(current));
}

export async function saveSettingsToStorage(partial: Partial<AppSettings>): Promise<void> {
  const writable: Record<string, unknown> = { ...partial };
  const secretWrites: Record<string, unknown> = {};
  if (!isExtensionPopup()) {
    for (const key of SECRET_KEYS) {
      const value = writable[key];
      if (String(value || '').trim()) secretWrites[key] = value;
      delete writable[key];
    }
  }
  Object.assign(settingsRef.value, writable);
  normalizeSettingsArrayFields(settingsRef.value);

  for (const [key, val] of Object.entries(writable)) {
    if (SECRET_KEYS.has(key)) continue;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(`dict_setting_${key}`, typeof val === 'object' ? JSON.stringify(val) : String(val));
    }
  }

  if (typeof chrome !== 'undefined' && chrome.storage) {
    try {
      await saveSettingsPartial({
        ...(writable as Partial<AppSettings>),
        ...(secretWrites as Partial<AppSettings>),
      });
    } catch (e) {
      console.warn('Chrome storage write failed:', e);
    }
  }

  if (shouldInvalidateLookupCache([...Object.keys(writable), ...Object.keys(secretWrites)])) {
    void invalidateLookupCaches();
  }
}

export function useStorage() {
  if (!initialized) {
    initialized = true;
    loadSettingsFromStorage().then((s) => {
      settingsRef.value = s;
    });

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
      chrome.storage.onChanged.addListener((changes) => {
        for (const [key, change] of Object.entries(changes)) {
          if (SECRET_KEYS.has(key)) continue;
          if (key in settingsRef.value) {
            (settingsRef.value as any)[key] = change.newValue;
          }
        }
        normalizeSettingsArrayFields(settingsRef.value);
        if (shouldInvalidateLookupCache(Object.keys(changes))) {
          void invalidateLookupCaches();
        }
      });
    }
  }

  const activeTab: Ref<TabId> = ref((readSessionKey(STORAGE_KEYS.ACTIVE_TAB) as TabId) || 'dictionary');
  const activeIntent: Ref<AiIntentId> = ref((readSessionKey(STORAGE_KEYS.ACTIVE_INTENT) as AiIntentId) || 'default');

  function readSessionKey(key: string): string | null {
    try {
      return sessionStorage.getItem(key) || localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  function writeSessionKey(key: string, value: string): void {
    try {
      sessionStorage.setItem(key, value);
      localStorage.setItem(key, value);
    } catch (e) {
      console.warn('Storage write failed:', e);
    }
  }

  watch(activeTab, (newTab) => {
    writeSessionKey(STORAGE_KEYS.ACTIVE_TAB, newTab);
  });

  watch(activeIntent, (newIntent) => {
    writeSessionKey(STORAGE_KEYS.ACTIVE_INTENT, newIntent);
  });

  return {
    settings: settingsRef,
    saveSettings: saveSettingsToStorage,
    activeTab,
    activeIntent,
    readSessionKey,
    writeSessionKey,
  };
}
