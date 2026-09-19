import type { AppSettings, DictionaryEntry } from '../types';
import { isExtensionPage } from '../shared/ext.ts';
import { createBoundedLruCache } from '../shared/bounded-cache.ts';
import { clearHttpCache } from './provider.http';

export const ENRICHMENT_TTL_MS = 10 * 60 * 1000;
export const MAX_ENRICHMENT_CACHE = 20;
export const COMBINED_RESULT_TTL_MS = 10 * 60 * 1000;
export const MAX_COMBINED_RESULT_CACHE = 20;
const MAX_PROVIDER_CACHE_CHARS = 4 * 1024 * 1024;

export interface CombinedResultCacheEntry {
  result: DictionaryEntry;
  timestamp: number;
}

export interface EnrichmentCacheEntry {
  results: DictionaryEntry[];
  timestamp: number;
}

const combinedSessionKeys: string[] = [];
const enrichmentSessionKeys: string[] = [];

function estimateCacheChars(value: unknown): number {
  try {
    return JSON.stringify(value).length;
  } catch {
    return 0;
  }
}

const combinedResultCache = createBoundedLruCache<string, CombinedResultCacheEntry>({
  maxSize: MAX_COMBINED_RESULT_CACHE,
  maxBytes: MAX_PROVIDER_CACHE_CHARS,
  estimateSize: estimateCacheChars,
});
const enrichmentMemoryCache = createBoundedLruCache<string, EnrichmentCacheEntry>({
  maxSize: MAX_ENRICHMENT_CACHE,
  maxBytes: MAX_PROVIDER_CACHE_CHARS,
  estimateSize: estimateCacheChars,
});

function rememberSessionKey(list: string[], key: string, max: number) {
  const existing = list.indexOf(key);
  if (existing >= 0) list.splice(existing, 1);
  list.push(key);
  const excess = list.splice(0, Math.max(0, list.length - max));
  if (excess.length && hasSessionStorage()) {
    void chrome.storage.session.remove(excess).catch(() => undefined);
  }
}

export function hasSessionStorage(): boolean {
  try {
    if (typeof chrome === 'undefined' || typeof chrome.storage?.session?.get !== 'function') return false;
    if (typeof window !== 'undefined' && !isExtensionPage()) return false;
    return true;
  } catch {
    return false;
  }
}

export function combinedResultCacheKey(word: string, settings: AppSettings): string {
  return `${word.toLowerCase().trim()}|${settings.dictionaryProvider || 'wiktionary'}|${String(settings.translateTargetLanguage || '').toLowerCase()}|${Boolean(settings.enableTranslate)}|${Boolean(settings.enableDictionary)}|${Boolean(settings.enablePhraseFallback)}|${settings.enableLexicalProfile !== false}`;
}

export function combinedSessionStorageKey(key: string): string {
  return `comb_${key.replace(/[^a-z0-9_]/gi, '_')}`.toLowerCase().slice(0, 100);
}

export function enrichmentCacheKey(word: string, settings: AppSettings, primaryId: string, lemma: string): string {
  return `enrich_${primaryId}_${lemma || word}_${settings.translateTargetLanguage || ''}`.toLowerCase();
}

export function readCombinedResultCache(key: string): DictionaryEntry | undefined {
  const entry = combinedResultCache.get(key);
  if (!entry) return undefined;
  if (Date.now() - entry.timestamp > COMBINED_RESULT_TTL_MS) {
    combinedResultCache.delete(key);
    return undefined;
  }
  return entry.result;
}

export async function readSessionCombinedResult(key: string): Promise<DictionaryEntry | undefined> {
  const mem = readCombinedResultCache(key);
  if (mem) return mem;
  if (!hasSessionStorage()) return undefined;
  try {
    const sKey = combinedSessionStorageKey(key);
    const stored = await Promise.resolve(chrome.storage.session.get(sKey)).catch(() => ({})) as Record<string, CombinedResultCacheEntry | undefined>;
    const entry = stored?.[sKey];
    if (!entry || Date.now() - entry.timestamp > COMBINED_RESULT_TTL_MS) return undefined;
    combinedResultCache.set(key, entry);
    return entry.result;
  } catch {
    return undefined;
  }
}

export function writeCombinedResultCache(key: string, result: DictionaryEntry) {
  if (!result.enriched) return;
  const entry: CombinedResultCacheEntry = { result, timestamp: Date.now() };
  combinedResultCache.set(key, entry);
  if (hasSessionStorage()) {
    const sKey = combinedSessionStorageKey(key);
    rememberSessionKey(combinedSessionKeys, sKey, MAX_COMBINED_RESULT_CACHE);
    void Promise.resolve(chrome.storage.session.set({ [sKey]: entry })).catch(() => undefined);
  }
}

export async function readSessionEnrichment(key: string): Promise<DictionaryEntry[] | null> {
  const memory = enrichmentMemoryCache.get(key);
  if (memory) {
    if (Date.now() - memory.timestamp < ENRICHMENT_TTL_MS) {
      return memory.results;
    }
    enrichmentMemoryCache.delete(key);
  }
  if (!hasSessionStorage()) return null;
  try {
    const stored = await Promise.resolve(chrome.storage.session.get(key)).catch(() => ({})) as Record<string, EnrichmentCacheEntry | undefined>;
    const entry = stored?.[key];
    if (!entry || Date.now() - entry.timestamp >= ENRICHMENT_TTL_MS) return null;
    enrichmentMemoryCache.set(key, entry);
    return entry.results;
  } catch {
    return null;
  }
}

export async function writeSessionEnrichment(key: string, results: DictionaryEntry[]) {
  const entry: EnrichmentCacheEntry = { results, timestamp: Date.now() };
  enrichmentMemoryCache.set(key, entry);
  if (!hasSessionStorage()) return;
  try {
    rememberSessionKey(enrichmentSessionKeys, key, MAX_ENRICHMENT_CACHE);
    await Promise.resolve(chrome.storage.session.set({ [key]: entry })).catch(() => undefined);
  } catch {
    // Memory cache suffices if session storage is unavailable.
  }
}

export function clearEnrichmentCache() {
  enrichmentMemoryCache.clear();
  combinedResultCache.clear();
  clearHttpCache();
  combinedSessionKeys.length = 0;
  enrichmentSessionKeys.length = 0;
  if (hasSessionStorage()) {
    try {
      void chrome.storage.session.get(null).then((all) => {
        const keysToRemove = Object.keys(all || {}).filter((k) => k.startsWith('enrich_') || k.startsWith('comb_'));
        if (keysToRemove.length) void chrome.storage.session.remove(keysToRemove);
      }).catch(() => undefined);
    } catch {
      // Ignore
    }
  }
}
