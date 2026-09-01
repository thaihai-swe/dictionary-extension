import { useEffect } from 'react';
import { signal, useSignal } from '../ui/signal';
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
import { hasConfiguredAiApiKey, shouldPersistSecretValue } from '../shared/settings-export';

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
  'libreTranslateApiKey',
  'aiApiKey',
  'hasAiApiKey',
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

export function readSessionKey(key: string): string | null {
  try {
    if (typeof sessionStorage !== 'undefined') {
      const v = sessionStorage.getItem(key);
      if (v) return v;
    }
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(key);
    }
    return null;
  } catch {
    return null;
  }
}

export function writeSessionKey(key: string, value: string): void {
  try {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(key, value);
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, value);
    }
  } catch (e) {
    console.warn('Storage write failed:', e);
  }
}

const settingsRef = signal<AppSettings>({ ...DEFAULT_SETTINGS });
const settingsHydratedRef = signal<boolean>(false);
const activeTabRef = signal<TabId>((readSessionKey(STORAGE_KEYS.ACTIVE_TAB) as TabId) || 'dictionary');
const activeIntentRef = signal<AiIntentId>((readSessionKey(STORAGE_KEYS.ACTIVE_INTENT) as AiIntentId) || 'default');

activeTabRef.subscribe(() => {
  writeSessionKey(STORAGE_KEYS.ACTIVE_TAB, activeTabRef.value);
});
activeIntentRef.subscribe(() => {
  writeSessionKey(STORAGE_KEYS.ACTIVE_INTENT, activeIntentRef.value);
});

let initialized = false;
let settingsWriteEpoch = 0;
let resolveSettingsReady: (() => void) | null = null;
const settingsReady: Promise<void> = new Promise((resolve) => {
  resolveSettingsReady = resolve;
});

function markSettingsReady() {
  settingsHydratedRef.value = true;
  resolveSettingsReady?.();
  resolveSettingsReady = null;
}

export function whenSettingsReady(): Promise<void> {
  return settingsHydratedRef.value ? Promise.resolve() : settingsReady;
}

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

export function canAccessSecretSettings(): boolean {
  try {
    if (typeof window === 'undefined') return false;
    const path = window.location?.pathname || '';
    return path.includes('options.html');
  } catch {
    return false;
  }
}

async function loadSettingsFromStorage(): Promise<AppSettings> {
  try {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      const loaded = canAccessSecretSettings() ? await loadFullSettings() : await loadPublicSettings();
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
  settingsWriteEpoch += 1;
  const writable: Record<string, unknown> = { ...partial };
  const secretWrites: Record<string, unknown> = {};
  const trustedSecrets = canAccessSecretSettings();
  for (const key of SECRET_KEYS) {
    if (!(key in writable)) continue;
    const value = writable[key];
    delete writable[key];
    if (!trustedSecrets) continue;
    if (!shouldPersistSecretValue(value, settingsHydratedRef.value)) continue;
    secretWrites[key] = value;
  }
  if (trustedSecrets && Object.prototype.hasOwnProperty.call(secretWrites, 'aiApiKey')) {
    writable.hasAiApiKey = Boolean(String(secretWrites.aiApiKey ?? '').trim());
  } else {
    delete writable.hasAiApiKey;
  }
  const nextSettings = { ...settingsRef.value, ...writable };
  if (trustedSecrets) {
    Object.assign(nextSettings, secretWrites);
  }
  normalizeSettingsArrayFields(nextSettings);
  settingsRef.value = nextSettings;

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

export function initStorage() {
  if (initialized) return;
  initialized = true;
  const loadEpoch = settingsWriteEpoch;
  loadSettingsFromStorage()
    .then((s) => {
      if (settingsWriteEpoch !== loadEpoch) return;
      settingsRef.value = s;
    })
    .catch((error) => {
      console.warn('Settings load failed:', error);
    })
    .finally(() => {
      markSettingsReady();
    });

  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      const allowSecrets = canAccessSecretSettings();
      const nextSettings = { ...settingsRef.value };
      for (const [key, change] of Object.entries(changes)) {
        if (SECRET_KEYS.has(key) && (!allowSecrets || areaName !== 'local')) continue;
        if (key in nextSettings) {
          (nextSettings as any)[key] = change.newValue ?? DEFAULT_SETTINGS[key as keyof AppSettings];
        }
      }
      if (allowSecrets) {
        nextSettings.hasAiApiKey = hasConfiguredAiApiKey(nextSettings);
      } else if ('hasAiApiKey' in changes) {
        nextSettings.hasAiApiKey = Boolean(changes.hasAiApiKey.newValue);
      }
      normalizeSettingsArrayFields(nextSettings);
      settingsRef.value = nextSettings;
      if (shouldInvalidateLookupCache(Object.keys(changes))) {
        void invalidateLookupCaches();
      }
    });
  }
}

export function useStorage() {
  useEffect(() => {
    initStorage();
  }, []);

  return {
    settings: useSignal(settingsRef),
    settingsHydrated: useSignal(settingsHydratedRef),
    saveSettings: saveSettingsToStorage,
    activeTab: useSignal(activeTabRef),
    activeIntent: useSignal(activeIntentRef),
    setActiveTab: (tab: TabId) => {
      activeTabRef.value = tab;
    },
    setActiveIntent: (intent: AiIntentId) => {
      activeIntentRef.value = intent;
    },
    readSessionKey,
    writeSessionKey,
  };
}

export const settingsStore = settingsRef;
export const activeTabStore = activeTabRef;
export const activeIntentStore = activeIntentRef;
export function getStorageStore() {
  return {
    settings: settingsRef,
    settingsHydrated: settingsHydratedRef,
    activeTab: activeTabRef,
    activeIntent: activeIntentRef,
  };
}
