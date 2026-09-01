import { DEFAULT_AI_PROMPTS, getLegacyDefaultPromptUpdates } from './ai-prompts';
import type { AppSettings } from '../types';
import {
  SECRET_KEYS,
  SECRET_SETTING_KEYS,
  SETTINGS_SCHEMA_VERSION,
  hasConfiguredAiApiKey,
  mergePublicSettings,
  mergeStoredSettings,
  stripSecretRecord,
} from './settings-export';

export {
  SECRET_KEYS,
  SECRET_SETTING_KEYS,
  SETTINGS_SCHEMA_VERSION,
  hasConfiguredAiApiKey,
  mergePublicSettings,
  mergeStoredSettings,
};
export const SETTINGS_SCHEMA_VERSION_KEY = 'dictionaryHelperSettingsSchemaVersion';

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark',
  fontFamily: 'learner',
  selectionTriggerMode: 'icon',
  postSelectionModifier: 'shift',
  enableContextMenuTrigger: true,
  defaultTab: 'dictionary',
  translateTargetLanguage: 'Vietnamese',
  customLanguages: 'Vietnamese, English, Chinese, Japanese, Korean, French, German, Spanish',
  translateProvider: 'google',
  libreTranslateBaseUrl: 'https://libretranslate.com',
  libreTranslateApiKey: '',
  dictionaryProvider: 'free_dictionary',
  dictionaryApiKey: '',
  wordnikApiKey: '',
  wordsApiKey: '',
  popupWidth: 620,
  popupHeight: 720,
  enableTranslate: true,
  enableDictionary: true,
  enableLexicalProfile: true,
  enableAI: true,
  enableAiPreload: true,
  enablePhraseFallback: true,
  disablePageContextExtraction: false,
  pausedHostnames: [],
  pronunciationRate: 0.95,
  pronunciationVoiceURI: '',
  aiBaseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai/',
  aiApiKey: '',
  hasAiApiKey: false,
  aiModel: 'gemini-2.5-flash',
  aiPromptTemplate: '',
  aiDefaultPromptTemplate: '',
  aiContextPromptTemplate: '',
  aiGrammarPromptTemplate: '',
  aiSentencePromptTemplate: '',
  aiPhraseExplorerPromptTemplate: '',
  aiComparePromptTemplate: '',
  aiRephrasePromptTemplate: '',
};

export const PUBLIC_SETTING_KEYS = (Object.keys(DEFAULT_SETTINGS) as Array<keyof AppSettings>)
  .filter((key) => !SECRET_KEYS.has(key));

const SYNC_SETTING_KEYS = [...PUBLIC_SETTING_KEYS, SETTINGS_SCHEMA_VERSION_KEY, ...SECRET_SETTING_KEYS];

export function normalizePausedHostnames(value: unknown): string[] {
  const raw = Array.isArray(value) ? value : String(value || '').split(/[\n,]/);
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of raw) {
    let host = String(item || '').trim().toLowerCase();
    host = host.replace(/^[a-z]+:\/\//, '').replace(/\/.*$/, '').replace(/:\d+$/, '');
    if (!host || seen.has(host)) continue;
    seen.add(host);
    result.push(host);
    if (result.length >= 100) break;
  }
  return result;
}

function clampFloat(value: unknown, min: number, max: number, fallback: number): number {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.min(max, Math.max(min, num));
}

export function normalizeSettings(input?: Partial<AppSettings> | Record<string, unknown>): AppSettings {
  const merged = {
    ...DEFAULT_SETTINGS,
    ...(input || {}),
  } as AppSettings;

  merged.pausedHostnames = normalizePausedHostnames(merged.pausedHostnames);
  merged.pronunciationRate = clampFloat(merged.pronunciationRate, 0.5, 1.5, 0.95);
  merged.popupWidth = Math.round(clampFloat(merged.popupWidth, 360, 1000, 620));
  merged.popupHeight = Math.round(clampFloat(merged.popupHeight, 380, 900, 720));
  merged.libreTranslateBaseUrl = String(merged.libreTranslateBaseUrl || DEFAULT_SETTINGS.libreTranslateBaseUrl)
    .trim()
    .replace(/\/+$/, '') || DEFAULT_SETTINGS.libreTranslateBaseUrl;
  merged.pronunciationVoiceURI = String(merged.pronunciationVoiceURI || '').trim();

  const mode = String(merged.selectionTriggerMode || '').trim().toLowerCase();
  merged.selectionTriggerMode = mode === 'off' || mode === 'direct' || mode === 'icon'
    ? mode
    : DEFAULT_SETTINGS.selectionTriggerMode;

  const modifier = String(merged.postSelectionModifier || '').trim().toLowerCase();
  merged.postSelectionModifier = modifier === 'alt' || modifier === 'ctrl' || modifier === 'shift'
    ? modifier
    : DEFAULT_SETTINGS.postSelectionModifier;

  merged.enableContextMenuTrigger = Boolean(merged.enableContextMenuTrigger);
  merged.enableTranslate = Boolean(merged.enableTranslate);
  merged.enableDictionary = Boolean(merged.enableDictionary);
  merged.enableLexicalProfile = merged.enableLexicalProfile !== false;
  merged.enableAI = Boolean(merged.enableAI);
  merged.enableAiPreload = Boolean(merged.enableAiPreload);
  merged.enablePhraseFallback = merged.enablePhraseFallback !== false;
  merged.disablePageContextExtraction = Boolean(merged.disablePageContextExtraction);
  merged.hasAiApiKey = hasConfiguredAiApiKey(merged);

  if (!String(merged.aiModel || '').trim()) merged.aiModel = DEFAULT_SETTINGS.aiModel;
  if (!String(merged.aiPromptTemplate || '').trim()) merged.aiPromptTemplate = DEFAULT_SETTINGS.aiPromptTemplate;

  return merged;
}

export function getPublicSettings(settings: Partial<AppSettings> | AppSettings): Partial<AppSettings> {
  const publicSettings: Record<string, unknown> = {};
  for (const key of Object.keys(DEFAULT_SETTINGS) as Array<keyof AppSettings>) {
    if (SECRET_KEYS.has(key)) continue;
    publicSettings[key] = settings[key] ?? DEFAULT_SETTINGS[key];
  }
  return publicSettings as Partial<AppSettings>;
}

export function stripSecretSettings(settings?: Partial<AppSettings>): Partial<AppSettings> {
  return stripSecretRecord({ ...(settings || {}) }) as Partial<AppSettings>;
}

export function serializePublicSettings(settings: AppSettings) {
  return {
    version: SETTINGS_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    settings: getPublicSettings(settings),
  };
}

export function parsePublicSettingsImport(raw: unknown): Partial<AppSettings> {
  const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
  const source = parsed && typeof parsed === 'object' && 'settings' in (parsed as Record<string, unknown>)
    ? (parsed as { settings: unknown }).settings
    : parsed;
  if (!source || typeof source !== 'object' || Array.isArray(source)) {
    throw new Error('Invalid settings backup.');
  }
  const imported: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(source as Record<string, unknown>)) {
    if (SECRET_KEYS.has(key) || key === 'hasAiApiKey') continue;
    if (key in DEFAULT_SETTINGS) imported[key] = value;
  }
  return imported as Partial<AppSettings>;
}

export function looksLikeLegacyMainInstall(syncData?: Record<string, unknown>): boolean {
  if (!syncData || typeof syncData !== 'object') return false;
  return Boolean(
    syncData.aiPromptTemplate
    || syncData.aiContextPromptTemplate
    || syncData.aiGrammarPromptTemplate
    || syncData.enablePhraseFallback !== undefined
    || syncData.pausedHostnames
  );
}

export async function loadFullSettings(): Promise<AppSettings> {
  if (typeof chrome === 'undefined' || !chrome.storage) {
    return normalizeSettings({ ...DEFAULT_SETTINGS, ...DEFAULT_AI_PROMPTS });
  }
  const [syncData, localData] = await Promise.all([
    chrome.storage.sync.get(SYNC_SETTING_KEYS),
    chrome.storage.local.get([...SECRET_SETTING_KEYS, 'hasAiApiKey']),
  ]);
  const merged = mergeStoredSettings(syncData || {}, localData || {});
  const recoveredSecrets: Record<string, unknown> = {};
  const straySyncSecrets: string[] = [];
  for (const key of SECRET_SETTING_KEYS) {
    if (Object.prototype.hasOwnProperty.call(syncData || {}, key)) straySyncSecrets.push(key);
    const value = merged[key];
    if (String(value ?? '').trim() && !String((localData || {})[key] ?? '').trim()) {
      recoveredSecrets[key] = value;
    }
  }
  if (Object.keys(recoveredSecrets).length) {
    await chrome.storage.local.set(recoveredSecrets);
  }
  if (straySyncSecrets.length) {
    await chrome.storage.sync.remove(straySyncSecrets);
  }
  const latestLocal = await chrome.storage.local.get(['aiApiKey', 'hasAiApiKey']);
  const hasAiApiKey = Boolean(String((latestLocal.aiApiKey ?? merged.aiApiKey) ?? '').trim());
  merged.aiApiKey = latestLocal.aiApiKey ?? merged.aiApiKey;
  merged.hasAiApiKey = hasAiApiKey;
  if (Boolean(syncData?.hasAiApiKey) !== hasAiApiKey || Boolean(latestLocal?.hasAiApiKey) !== hasAiApiKey) {
    await Promise.all([
      chrome.storage.sync.set({ hasAiApiKey }),
      chrome.storage.local.set({ hasAiApiKey }),
    ]);
  }
  return normalizeSettings({
    ...DEFAULT_AI_PROMPTS,
    ...merged,
  });
}

export async function loadPublicSettings(): Promise<AppSettings> {
  if (typeof chrome === 'undefined' || !chrome.storage) {
    return normalizeSettings(stripSecretSettings(DEFAULT_SETTINGS));
  }
  const [syncData, localFlags] = await Promise.all([
    chrome.storage.sync.get(PUBLIC_SETTING_KEYS as unknown as string[]),
    chrome.storage.local.get(['hasAiApiKey']),
  ]);
  return normalizeSettings(mergePublicSettings(syncData || {}, localFlags || {}));
}

export async function saveSettingsPartial(partial: Partial<AppSettings>): Promise<void> {
  if (typeof chrome === 'undefined' || !chrome.storage) return;
  const syncData: Record<string, unknown> = {};
  const localData: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(partial)) {
    if (!(key in DEFAULT_SETTINGS)) continue;
    if (SECRET_KEYS.has(key)) localData[key] = value;
    else syncData[key] = value;
  }
  if (Object.prototype.hasOwnProperty.call(localData, 'aiApiKey')) {
    const hasAiApiKey = Boolean(String(localData.aiApiKey ?? '').trim());
    syncData.hasAiApiKey = hasAiApiKey;
    localData.hasAiApiKey = hasAiApiKey;
  } else {
    delete syncData.hasAiApiKey;
  }
  const writes: Promise<unknown>[] = [];
  if (Object.keys(syncData).length) writes.push(chrome.storage.sync.set(syncData));
  if (Object.keys(localData).length) writes.push(chrome.storage.local.set(localData));
  if (writes.length) await Promise.all(writes);
}

export async function migrateSettingsSchema(): Promise<{ migrated: boolean; version: number }> {
  if (typeof chrome === 'undefined' || !chrome.storage?.sync) {
    return { migrated: false, version: SETTINGS_SCHEMA_VERSION };
  }

  const syncData = await chrome.storage.sync.get([
    SETTINGS_SCHEMA_VERSION_KEY,
    'enableAI',
    'hasAiApiKey',
    'aiPromptTemplate',
    'aiContextPromptTemplate',
    'aiGrammarPromptTemplate',
    'aiSentencePromptTemplate',
    'aiPhraseExplorerPromptTemplate',
    'aiComparePromptTemplate',
    'aiRephrasePromptTemplate',
  ]) as Record<string, unknown>;
  const currentVersion = Number(syncData?.[SETTINGS_SCHEMA_VERSION_KEY] || 0);
  if (currentVersion >= SETTINGS_SCHEMA_VERSION) {
    return { migrated: false, version: currentVersion };
  }

  const updates: Record<string, unknown> = {
    [SETTINGS_SCHEMA_VERSION_KEY]: SETTINGS_SCHEMA_VERSION,
  };

  if (currentVersion > 0 && currentVersion < 9) {
    Object.assign(updates, getLegacyDefaultPromptUpdates(syncData));
  }

  if (currentVersion < 10 && currentVersion >= 1 && !Object.prototype.hasOwnProperty.call(syncData || {}, 'enableAI')) {
    updates.enableAI = true;
  }

  if (currentVersion < 12) {
    const localData = await chrome.storage.local.get(['aiApiKey']);
    updates.hasAiApiKey = hasConfiguredAiApiKey({
      ...(syncData || {}),
      ...(localData || {}),
    });
  }

  if (currentVersion === 0 && looksLikeLegacyMainInstall(syncData)) {
    // Preserve custom prompts/keys from main; only stamp the new schema version.
  }

  await chrome.storage.sync.set(updates);
  return { migrated: true, version: SETTINGS_SCHEMA_VERSION };
}
