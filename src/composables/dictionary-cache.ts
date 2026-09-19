import { createBoundedLruCache } from '../shared/bounded-cache';
import { hashCacheKey } from '../shared/lookup-cache';
import type { AppSettings, DictionaryEntry } from '../types';

const MAX_DICT_CACHE_SIZE = 16;
const DICT_CACHE_TTL_MS = 30 * 60 * 1000;
const cache = createBoundedLruCache<string, DictionaryEntry>({
  maxSize: MAX_DICT_CACHE_SIZE,
  maxBytes: 1024 * 1024,
  estimateSize: (value) => {
    try {
      return JSON.stringify(value).length * 2;
    } catch {
      return 0;
    }
  },
});
const timestamps = new Map<string, number>();

/** UI-local hot cache. Persistent dictionary storage is owned by the service worker. */
export const dictCache = {
  read(key: string): DictionaryEntry | undefined {
    const createdAt = timestamps.get(key);
    if (!createdAt || Date.now() - createdAt > DICT_CACHE_TTL_MS) {
      cache.delete(key);
      timestamps.delete(key);
      return undefined;
    }
    return cache.get(key);
  },
  write(key: string, value: DictionaryEntry): void {
    cache.set(key, value);
    timestamps.set(key, Date.now());
  },
  clear(): void {
    cache.clear();
    timestamps.clear();
  },
};

export const dictPendingMap = new Map<string, Promise<DictionaryEntry>>();
export const dictPendingRequestIds = new Map<string, string>();

export function getDictCacheKey(word: string, settings: AppSettings, provider: string, lang: string): string {
  return hashCacheKey(`${word.toLowerCase().trim()}|${provider.toLowerCase()}|${lang.toLowerCase()}|${settings.translateProvider || ''}|${Boolean(settings.enableTranslate)}|${Boolean(settings.enableDictionary)}|${Boolean(settings.enablePhraseFallback)}|${settings.enableLexicalProfile !== false}`);
}
