import { resolvePreloadedAiIntents } from './ai-prompts';
import { DEFAULT_AI_PROMPTS } from '../prompts/prompt-templates';
import type { AppSettings } from '../types';
import {
  LOCAL_ONLY_KEYS,
  LOCAL_SETTING_KEYS,
  SECRET_KEYS,
  SECRET_SETTING_KEYS,
  hasConfiguredAiApiKey,
  mergePublicSettings,
  mergeStoredSettings,
  stripSecretRecord,
} from './settings-export';

export {
  LOCAL_ONLY_KEYS,
  LOCAL_SETTING_KEYS,
  SECRET_KEYS,
  SECRET_SETTING_KEYS,
  hasConfiguredAiApiKey,
  mergePublicSettings,
  mergeStoredSettings,
};

export const DEFAULT_GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/openai';
export const DEFAULT_OPENAI_BASE_URL = 'http://localhost:20128/v1';
export const DEFAULT_GEMINI_MODEL = 'gemini-3.5-flash-lite';
export const DEFAULT_OPENAI_MODEL = '';

export function isOpenAiStandard(settings?: Partial<AppSettings> | null): boolean {
  return settings?.aiProvider === 'openai';
}

export function defaultAiModelFor(provider: AppSettings['aiProvider']): string {
  return provider === 'openai' ? DEFAULT_OPENAI_MODEL : DEFAULT_GEMINI_MODEL;
}

export function defaultAiBaseUrlFor(provider: AppSettings['aiProvider']): string {
  return provider === 'openai' ? DEFAULT_OPENAI_BASE_URL : DEFAULT_GEMINI_BASE_URL;
}

const DICTIONARY_PROVIDERS = new Set<string>([
  'free_dictionary',
  'google_translate',
  'wiktionary',
  'wiktionary_etymology',
  'wiktionary_bilingual',
  'datamuse',
  'wikipedia',
  'rhymebrain',
  'urban_dictionary',
  'tatoeba',
]);

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
  dictionaryProvider: 'wiktionary',
  popupWidth: 620,
  popupHeight: 720,
  enableTranslate: true,
  enableDictionary: true,
  enableLexicalProfile: true,
  enableAI: true,
  enableAiPreload: false,
  preloadedAiIntents: [],
  enablePhraseFallback: true,
  disablePageContextExtraction: false,
  pausedHostnames: [],
  pronunciationRate: 0.95,
  pronunciationVoiceURI: '',
  aiProvider: 'gemini',
  aiBaseUrl: DEFAULT_GEMINI_BASE_URL,
  aiApiKey: '',
  hasAiApiKey: false,
  aiModel: DEFAULT_GEMINI_MODEL,
  ...DEFAULT_AI_PROMPTS,
};

export const PUBLIC_SETTING_KEYS = (Object.keys(DEFAULT_SETTINGS) as Array<keyof AppSettings>)
  .filter((key) => !LOCAL_ONLY_KEYS.has(key));

const SYNC_SETTING_KEYS = [...PUBLIC_SETTING_KEYS];

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
  const source = input || {};
  const merged = {
    ...DEFAULT_SETTINGS,
    ...source,
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
  const sourceSettings = (source || {}) as Partial<AppSettings> & Record<string, unknown>;
  merged.preloadedAiIntents = resolvePreloadedAiIntents(sourceSettings);
  merged.enableAiPreload = merged.preloadedAiIntents.length > 0;
  merged.enablePhraseFallback = merged.enablePhraseFallback !== false;
  merged.disablePageContextExtraction = Boolean(merged.disablePageContextExtraction);
  merged.hasAiApiKey = hasConfiguredAiApiKey(merged);

  const aiProv = String(merged.aiProvider || '').trim().toLowerCase();
  merged.aiProvider = aiProv === 'openai' ? 'openai' : 'gemini';
  merged.aiBaseUrl = String(sourceSettings.aiBaseUrl || '').trim().replace(/\/+$/, '') || defaultAiBaseUrlFor(merged.aiProvider);
  if (!String(sourceSettings.aiModel || '').trim()) {
    merged.aiModel = defaultAiModelFor(merged.aiProvider);
  }

  const provider = String(merged.dictionaryProvider || '').trim();
  merged.dictionaryProvider = DICTIONARY_PROVIDERS.has(provider)
    ? (provider as AppSettings['dictionaryProvider'])
    : DEFAULT_SETTINGS.dictionaryProvider;

  for (const key of Object.keys(DEFAULT_AI_PROMPTS) as Array<keyof typeof DEFAULT_AI_PROMPTS>) {
    if (!String(merged[key] || '').trim()) merged[key] = DEFAULT_AI_PROMPTS[key];
  }

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

export async function loadFullSettings(): Promise<AppSettings> {
  if (typeof chrome === 'undefined' || !chrome.storage) {
    return normalizeSettings({ ...DEFAULT_SETTINGS, ...DEFAULT_AI_PROMPTS });
  }
  const [syncData, localData] = await Promise.all([
    chrome.storage.sync.get([...SYNC_SETTING_KEYS, ...SECRET_SETTING_KEYS]),
    chrome.storage.local.get([...LOCAL_SETTING_KEYS, 'hasAiApiKey']),
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
  const legacyDictionaryKeys = ['dictionaryApiKey', 'wordnikApiKey', 'wordsApiKey'];
  await chrome.storage.local.remove(legacyDictionaryKeys).catch(() => {});
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
    chrome.storage.local.get(['hasAiApiKey', 'aiRewritePromptTemplate']),
  ]);
  return normalizeSettings(mergePublicSettings(syncData || {}, localFlags || {}));
}

export async function saveSettingsPartial(partial: Partial<AppSettings>): Promise<void> {
  if (typeof chrome === 'undefined' || !chrome.storage) return;
  const syncData: Record<string, unknown> = {};
  const localData: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(partial)) {
    if (!(key in DEFAULT_SETTINGS)) continue;
    if (LOCAL_ONLY_KEYS.has(key)) localData[key] = value;
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
