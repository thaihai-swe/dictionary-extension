import type { DictionaryEntry } from '../types';
import { createBoundedLruCache } from '../shared/bounded-cache.ts';
import { recordLookupMetric } from '../shared/performance/lookup-metrics.ts';
import { clearHttpCache } from './provider.http';

export const ENRICHMENT_TTL_MS = 10 * 60 * 1000;
export const MAX_ENRICHMENT_CACHE = 20;
export const COMBINED_RESULT_TTL_MS = 48 * 60 * 60 * 1000;
export const MAX_COMBINED_RESULT_CACHE = 32;
const MAX_DICTIONARY_CACHE_CHARS = 6 * 1024 * 1024;
const DICTIONARY_STORAGE_KEY = 'dict_lookup_cache';

export interface CombinedResultCacheEntry {
  result: DictionaryEntry;
  timestamp: number;
}

export interface EnrichmentCacheEntry {
  results: DictionaryEntry[];
  timestamp: number;
}

type DictionaryCacheRecord =
  | { kind: 'combined'; value: DictionaryEntry; timestamp: number }
  | { kind: 'enrichment'; value: DictionaryEntry[]; timestamp: number };

const dictionaryCache = createBoundedLruCache<string, DictionaryCacheRecord>({
  maxSize: MAX_COMBINED_RESULT_CACHE,
  maxBytes: MAX_DICTIONARY_CACHE_CHARS,
  estimateSize: (value) => {
    try {
      return JSON.stringify(value).length;
    } catch {
      return 0;
    }
  },
});

let persistenceEnabled = true;
let hydrated = false;
let hydrationPromise: Promise<void> | null = null;
let persistTimer: ReturnType<typeof setTimeout> | null = null;
let dirty = false;

function canUseLocalStorage(): boolean {
  try {
    return typeof chrome !== 'undefined' && typeof chrome.storage?.local?.get === 'function';
  } catch {
    return false;
  }
}

function estimateCacheChars(value: unknown): number {
  try {
    return JSON.stringify(value).length;
  } catch {
    return 0;
  }
}

export function setDictionaryCachePersistenceEnabled(value: boolean): void {
  if (persistenceEnabled === value) return;
  if (value) {
    hydrated = false;
    hydrationPromise = null;
  }
  persistenceEnabled = value;
  if (!value && canUseLocalStorage()) {
    void Promise.resolve(chrome.storage.local.remove(DICTIONARY_STORAGE_KEY)).catch(() => undefined);
  }
}

function persistNow() {
  persistTimer = null;
  if (!dirty || !canUseLocalStorage()) return;
  dirty = false;
  if (!persistenceEnabled) {
    void Promise.resolve(chrome.storage.local.remove(DICTIONARY_STORAGE_KEY)).catch(() => undefined);
    return;
  }
  const snapshot: Record<string, { value: DictionaryEntry; timestamp: number }> = {};
  for (const [key, record] of dictionaryCache.entries()) {
    if (record.kind === 'combined' && record.value.enriched) {
      snapshot[key] = { value: record.value, timestamp: record.timestamp };
    }
  }
  recordLookupMetric('dictionary.cache.persist', {
    entries: Object.keys(snapshot).length,
    bytes: estimateCacheChars(snapshot),
  });
  void Promise.resolve(chrome.storage.local.set({ [DICTIONARY_STORAGE_KEY]: snapshot })).catch(() => undefined);
}

function schedulePersist() {
  if (!canUseLocalStorage()) return;
  dirty = true;
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(persistNow, 1500);
}

function hydrate(): Promise<void> {
  if (hydrated) return Promise.resolve();
  hydrated = true;
  if (!canUseLocalStorage() || !persistenceEnabled) return Promise.resolve();
  hydrationPromise = Promise.resolve(chrome.storage.local.get(DICTIONARY_STORAGE_KEY))
    .then((stored) => {
      const snapshot = (stored as Record<string, unknown>)?.[DICTIONARY_STORAGE_KEY];
      if (!snapshot || typeof snapshot !== 'object') return;
      const now = Date.now();
      for (const [key, raw] of Object.entries(snapshot as Record<string, unknown>)) {
        const entry = raw as { value?: DictionaryEntry; timestamp?: number; createdAt?: number } | undefined;
        const timestamp = entry?.timestamp || entry?.createdAt;
        if (!entry?.value?.enriched || !timestamp) continue;
        if (now - timestamp > COMBINED_RESULT_TTL_MS) continue;
        dictionaryCache.set(key, { kind: 'combined', value: entry.value, timestamp });
      }
    })
    .catch(() => undefined)
    .then(() => undefined);
  return hydrationPromise;
}

export { combinedResultCacheKey, enrichmentCacheKey } from '../application/dictionary/cache-keys';

function readCombinedMemory(key: string): DictionaryEntry | undefined {
  const record = dictionaryCache.get(key);
  if (!record || record.kind !== 'combined') return undefined;
  if (Date.now() - record.timestamp > COMBINED_RESULT_TTL_MS) {
    dictionaryCache.delete(key);
    return undefined;
  }
  return record.value;
}

export function readCombinedResultCache(key: string): DictionaryEntry | undefined {
  return readCombinedMemory(key);
}

export async function readSessionCombinedResult(key: string): Promise<DictionaryEntry | undefined> {
  const memory = readCombinedMemory(key);
  if (memory) {
    recordLookupMetric('dictionary.cache.read', { kind: 'combined', hit: true, source: 'memory' });
    return memory;
  }
  await hydrate();
  const hydratedResult = readCombinedMemory(key);
  recordLookupMetric('dictionary.cache.read', { kind: 'combined', hit: Boolean(hydratedResult), source: 'persistent' });
  return hydratedResult;
}

export function writeCombinedResultCache(key: string, result: DictionaryEntry) {
  if (!result.enriched) return;
  dictionaryCache.set(key, { kind: 'combined', value: result, timestamp: Date.now() });
  recordLookupMetric('dictionary.cache.write', { kind: 'combined', bytes: estimateCacheChars(result) });
  schedulePersist();
}

export async function readSessionEnrichment(key: string): Promise<DictionaryEntry[] | null> {
  const record = dictionaryCache.get(key);
  if (!record || record.kind !== 'enrichment') return null;
  if (Date.now() - record.timestamp >= ENRICHMENT_TTL_MS) {
    dictionaryCache.delete(key);
    return null;
  }
  recordLookupMetric('dictionary.cache.read', { kind: 'enrichment', hit: true, source: 'memory' });
  return record.value;
}

export async function writeSessionEnrichment(key: string, results: DictionaryEntry[]) {
  dictionaryCache.set(key, { kind: 'enrichment', value: results, timestamp: Date.now() });
}

export function clearEnrichmentCache() {
  dictionaryCache.clear();
  clearHttpCache();
  dirty = false;
  if (persistTimer) {
    clearTimeout(persistTimer);
    persistTimer = null;
  }
  if (canUseLocalStorage()) {
    void Promise.resolve(chrome.storage.local.remove(DICTIONARY_STORAGE_KEY)).catch(() => undefined);
  }
}

export function dictionaryCacheStats() {
  return {
    entries: dictionaryCache.size,
    estimatedChars: Array.from(dictionaryCache.entries()).reduce((total, [, value]) => total + estimateCacheChars(value), 0),
    hydrated,
  };
}
