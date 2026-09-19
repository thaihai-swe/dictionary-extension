import { settingsStore } from './composable.storage';
import { createPersistedLruCache, hashCacheKey } from '../shared/lookup-cache';
import type { AppSettings, DictionaryEntry } from '../types';

const MAX_DICT_CACHE_SIZE = 80;
const DICT_CACHE_TTL_MS = 48 * 60 * 60 * 1000;
const DICT_STORAGE_KEY = 'dict_lookup_cache';

export const dictCache = createPersistedLruCache<DictionaryEntry>({
  maxSize: MAX_DICT_CACHE_SIZE,
  maxBytes: 6 * 1024 * 1024,
  ttlMs: DICT_CACHE_TTL_MS,
  storageKey: DICT_STORAGE_KEY,
  persistDelayMs: 1500,
  isPersistenceEnabled: () => settingsStore.value.persistLookupCache !== false,
  shouldPersist: (value) => Boolean(value?.enriched),
});

export const dictPendingMap = new Map<string, Promise<DictionaryEntry>>();
export const dictPendingRequestIds = new Map<string, string>();

export function getDictCacheKey(word: string, settings: AppSettings, provider: string, lang: string): string {
  return hashCacheKey(`${word.toLowerCase().trim()}|${provider.toLowerCase()}|${lang.toLowerCase()}|${settings.translateProvider || ''}|${Boolean(settings.enableTranslate)}|${Boolean(settings.enableDictionary)}|${Boolean(settings.enablePhraseFallback)}|${settings.enableLexicalProfile !== false}`);
}
