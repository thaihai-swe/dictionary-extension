import { AppSettings, DictionaryEntry, PhraseExplanationSection, TranslationResult } from '../types';
import { fetchFreeDictionary } from './provider.free-dictionary';
import { fetchGoogleTranslate, lookupGoogleTranslation } from './provider.google-translate';
import { fetchWiktionary } from './provider.wiktionary';
import { fetchMerriamWebster } from './provider.merriam-webster';
import { fetchWordnik } from './provider.wordnik';
import { fetchLibreTranslate, lookupLibreTranslation } from './provider.libre-translate';
import { fetchWordsApi } from './provider.words-api';
import { NotFoundError, isFatalDictionaryError } from './errors';
import {
  DICTIONARY_FALLBACK_ORDER,
  getPrimaryDictionaryLookupAttempts,
  isPhraseLike,
  extractLexicalProfileFromMarkdown,
  mergeLexicalProfiles,
  parseLexicalProfile,
  splitPhraseExplanation,
} from '../shared/query-utils';
import { cloneDictionaryEntry, isThinDictionaryEntry, mergeDictionaryEntries, mergeMeanings, mergeSourceBadges } from '../shared/enrichment';

const ENRICHMENT_CONCURRENCY = 2;
const ENRICHMENT_TTL_MS = 10 * 60 * 1000;
const MAX_ENRICHMENT_CACHE = 20;
const COMBINED_RESULT_TTL_MS = 10 * 60 * 1000;
const MAX_COMBINED_RESULT_CACHE = 20;

interface CombinedResultCacheEntry {
  result: DictionaryEntry;
  timestamp: number;
}

const combinedResultCache = new Map<string, CombinedResultCacheEntry>();

interface EnrichmentCacheEntry {
  results: DictionaryEntry[];
  timestamp: number;
}

const enrichmentMemoryCache = new Map<string, EnrichmentCacheEntry>();

export function clearEnrichmentCache() {
  enrichmentMemoryCache.clear();
  combinedResultCache.clear();
}

function combinedResultCacheKey(word: string, settings: AppSettings): string {
  return JSON.stringify({
    word: word.toLowerCase().trim(),
    provider: settings.dictionaryProvider || 'free_dictionary',
    lang: String(settings.translateTargetLanguage || '').toLowerCase(),
    enableTranslate: Boolean(settings.enableTranslate),
    enableDictionary: Boolean(settings.enableDictionary),
    enablePhraseFallback: Boolean(settings.enablePhraseFallback),
    enableLexicalProfile: settings.enableLexicalProfile !== false,
  });
}

function readCombinedResultCache(key: string): DictionaryEntry | undefined {
  const entry = combinedResultCache.get(key);
  if (!entry) return undefined;
  if (Date.now() - entry.timestamp > COMBINED_RESULT_TTL_MS) {
    combinedResultCache.delete(key);
    return undefined;
  }
  combinedResultCache.delete(key);
  combinedResultCache.set(key, entry);
  return cloneDictionaryEntry(entry.result);
}

function writeCombinedResultCache(key: string, result: DictionaryEntry) {
  if (!result.enriched) return;
  combinedResultCache.delete(key);
  combinedResultCache.set(key, { result: cloneDictionaryEntry(result), timestamp: Date.now() });
  while (combinedResultCache.size > MAX_COMBINED_RESULT_CACHE) {
    const oldest = combinedResultCache.keys().next().value;
    if (!oldest) break;
    combinedResultCache.delete(oldest);
  }
}

function isProviderConfigured(providerId: string, settings?: AppSettings): boolean {
  if (providerId === 'merriam_webster') return Boolean(settings?.dictionaryApiKey?.trim());
  if (providerId === 'wordnik') return Boolean(settings?.wordnikApiKey?.trim());
  if (providerId === 'words_api') return Boolean(settings?.wordsApiKey?.trim());
  return true;
}

function resolvePrimaryProviderId(provider: string, settings?: AppSettings): string {
  const requested = provider || settings?.dictionaryProvider || 'free_dictionary';
  if (isProviderConfigured(requested, settings)) return requested;
  return DICTIONARY_FALLBACK_ORDER.find((id) => isProviderConfigured(id, settings)) || requested;
}

function hasUsableDefinitions(entry?: DictionaryEntry | null): boolean {
  return Boolean(entry?.meanings?.some((meaning) => meaning.definitions?.some((item) => item.definition?.trim())));
}

function normalizeDictionaryResult(result: DictionaryEntry, settings?: AppSettings, originalText?: string): DictionaryEntry {
  let lexicalProfile = settings?.enableLexicalProfile === false ? undefined : parseLexicalProfile(result.lexicalProfile) || result.lexicalProfile;
  if (settings?.enableLexicalProfile !== false) {
    const blob = [
      ...(result.meanings || []).flatMap((meaning) => meaning.definitions.map((item) => item.definition)),
      ...(result.examples || []).map((item) => item.text),
    ].join('\n');
    const extracted = extractLexicalProfileFromMarkdown(blob);
    if (extracted) lexicalProfile = mergeLexicalProfiles(lexicalProfile, extracted);
  }
  return {
    ...result,
    lexicalProfile,
    originalText: originalText || result.originalText,
    meanings: mergeMeanings(result.meanings || [], []),
  };
}

async function lookupSingleProvider(
  providerId: string,
  query: string,
  targetLang: string,
  signal?: AbortSignal,
  settings?: AppSettings,
): Promise<DictionaryEntry> {
  switch (providerId) {
    case 'google_translate':
      return fetchGoogleTranslate(query, targetLang, signal);
    case 'wiktionary':
      return fetchWiktionary(query, targetLang, signal);
    case 'merriam_webster':
      return fetchMerriamWebster(query, targetLang, signal, settings?.dictionaryApiKey);
    case 'wordnik':
      return fetchWordnik(query, targetLang, signal, settings?.wordnikApiKey);
    case 'words_api':
      return fetchWordsApi(query, targetLang, signal, settings?.wordsApiKey);
    case 'libre_translate':
      return fetchLibreTranslate(query, targetLang, signal);
    case 'gemini_ai': {
      const { fetchAiAnalysis } = await import('./provider.gemini-ai');
      const aiRes = await fetchAiAnalysis('default', query, targetLang, settings?.aiApiKey, settings?.aiModel, signal, undefined, settings);
      return {
        word: query,
        phonetic: `Gemini AI Engine (${settings?.aiModel || 'gemini-2.5-flash'})`,
        meanings: [{ partOfSpeech: 'AI Explanation', definitions: [{ definition: aiRes.summary || aiRes.translation || query }] }],
        providerId: 'gemini_ai',
        sourceBadges: [{ label: 'Gemini AI', kind: 'dictionary', providerId: 'gemini_ai' }],
      };
    }
    case 'free_dictionary':
    default:
      return fetchFreeDictionary(query, targetLang, signal);
  }
}

export async function lookupTranslationResult(
  text: string,
  settings?: AppSettings,
  signal?: AbortSignal,
): Promise<TranslationResult | null> {
  if (settings && settings.enableTranslate === false) return null;
  const targetLang = settings?.translateTargetLanguage || 'Vietnamese';
  try {
    if (settings?.translateProvider === 'libretranslate') {
      return await lookupLibreTranslation(text, targetLang, signal, settings.libreTranslateBaseUrl, settings.libreTranslateApiKey);
    }
    return await lookupGoogleTranslation(text, targetLang, signal);
  } catch {
    return null;
  }
}

export async function fetchDictionaryResult(
  word: string,
  provider: string,
  targetLang: string = 'Vietnamese',
  signal?: AbortSignal,
  userApiKey?: string,
  userModelName?: string,
  settings?: AppSettings,
): Promise<DictionaryEntry> {
  const cleanWord = word.trim();
  const settingsWithKeys = settings || {
    aiApiKey: userApiKey || '',
    aiModel: userModelName || '',
    dictionaryProvider: provider,
    translateTargetLanguage: targetLang,
    enableTranslate: true,
    enableDictionary: true,
  } as AppSettings;

  if (provider === 'google_translate' || provider === 'libre_translate' || provider === 'gemini_ai') {
    return normalizeDictionaryResult(
      await lookupSingleProvider(provider, cleanWord, targetLang, signal, settingsWithKeys),
      settingsWithKeys,
      cleanWord,
    );
  }

  const primaryId = resolvePrimaryProviderId(provider, settingsWithKeys);
  const attempts = getPrimaryDictionaryLookupAttempts(cleanWord, primaryId);
  let lastNotFoundError: unknown = null;
  let lastLookupError: unknown = null;
  let bestPartial: DictionaryEntry | null = null;

  for (const attempt of attempts) {
    if (signal?.aborted) throw new DOMException('The user aborted a request.', 'AbortError');
    if (!isProviderConfigured(attempt.providerId, settingsWithKeys)) continue;
    try {
      const result = await lookupSingleProvider(attempt.providerId, attempt.query, targetLang, signal, settingsWithKeys);
      const normalized = normalizeDictionaryResult(result, settingsWithKeys, cleanWord);
      if (hasUsableDefinitions(normalized)) return normalized;
      if (!bestPartial) bestPartial = normalized;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') throw error;
      if (error instanceof NotFoundError) {
        lastNotFoundError = error;
        continue;
      }
      if (isFatalDictionaryError(error)) throw error;
      lastLookupError = error;
    }
  }

  if (bestPartial) return bestPartial;

  throw lastNotFoundError instanceof Error
    ? lastNotFoundError
    : lastLookupError instanceof Error
      ? lastLookupError
      : new Error(`No dictionary definition found for "${cleanWord}".`);
}

function enrichmentCacheKey(word: string, settings: AppSettings, primaryId: string, lemma: string): string {
  return `enrich_${primaryId}_${lemma || word}_${settings.translateTargetLanguage || ''}`.toLowerCase();
}

function hasSessionStorage(): boolean {
  try {
    if (typeof chrome === 'undefined' || typeof chrome.storage?.session?.get !== 'function') return false;
    if (typeof window !== 'undefined' && window.location?.protocol !== 'chrome-extension:') return false;
    return true;
  } catch {
    return false;
  }
}

async function readSessionEnrichment(key: string): Promise<DictionaryEntry[] | null> {
  const memory = enrichmentMemoryCache.get(key);
  if (memory && Date.now() - memory.timestamp < ENRICHMENT_TTL_MS) return memory.results;
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

async function writeSessionEnrichment(key: string, results: DictionaryEntry[]) {
  const entry = { results, timestamp: Date.now() };
  if (enrichmentMemoryCache.size >= MAX_ENRICHMENT_CACHE) {
    const oldest = enrichmentMemoryCache.keys().next().value;
    if (oldest) enrichmentMemoryCache.delete(oldest);
  }
  enrichmentMemoryCache.set(key, entry);
  if (!hasSessionStorage()) return;
  try {
    await Promise.resolve(chrome.storage.session.set({ [key]: entry })).catch(() => undefined);
  } catch {
    // Memory cache is enough if session storage is unavailable in this context.
  }
}

function emitUpdate(
  onUpdate: ((entry: DictionaryEntry) => void) | undefined,
  entry: DictionaryEntry,
  revision: number,
) {
  onUpdate?.({ ...entry, revision });
}

async function lookupPhraseFallback(
  text: string,
  settings: AppSettings,
  signal?: AbortSignal,
): Promise<PhraseExplanationSection[] | null> {
  if (!settings.enableAI || settings.enablePhraseFallback === false) return null;
  const { fetchAiAnalysis } = await import('./provider.gemini-ai');
  const result = await fetchAiAnalysis(
    'phrase_fallback',
    text,
    settings.translateTargetLanguage || 'Vietnamese',
    settings.aiApiKey,
    settings.aiModel,
    signal,
  );
  const summary = String(result.summary || '').trim();
  if (!summary) return null;
  const sections = splitPhraseExplanation(summary);
  return sections.length ? sections : null;
}

export async function runDictionaryEnrichment(
  word: string,
  baseResult: DictionaryEntry,
  settings: AppSettings,
  onEnrichUpdate: (enriched: DictionaryEntry) => void,
  signal?: AbortSignal,
) {
  const primaryProviderId = baseResult.providerId || settings.dictionaryProvider || 'free_dictionary';
  const queryTerm = word.trim();
  const targetLang = settings.translateTargetLanguage || 'Vietnamese';
  const cacheKey = enrichmentCacheKey(word, settings, primaryProviderId, queryTerm);

  const cached = await readSessionEnrichment(cacheKey);
  let currentCombined = cloneDictionaryEntry(baseResult);

  const applyResults = (results: DictionaryEntry[]) => {
    for (const item of results) {
      currentCombined = mergeDictionaryEntries(currentCombined, item);
      currentCombined.lexicalProfile = mergeLexicalProfiles(currentCombined.lexicalProfile, item.lexicalProfile);
    }
    currentCombined.translation = currentCombined.translation || baseResult.translation;
    currentCombined.phraseExplanation = currentCombined.phraseExplanation?.length
      ? currentCombined.phraseExplanation
      : baseResult.phraseExplanation;
    currentCombined.enriched = true;
    onEnrichUpdate(currentCombined);
  };

  if (cached?.length) {
    applyResults(cached);
    return;
  }

  const secondaryProviders = DICTIONARY_FALLBACK_ORDER.filter(
    (id) => id !== primaryProviderId && isProviderConfigured(id, settings),
  );
  const collected: DictionaryEntry[] = [];

  for (let index = 0; index < secondaryProviders.length; index += ENRICHMENT_CONCURRENCY) {
    if (signal?.aborted) break;
    const batch = secondaryProviders.slice(index, index + ENRICHMENT_CONCURRENCY);
    const settled = await Promise.allSettled(
      batch.map((providerId) => lookupSingleProvider(providerId, queryTerm, targetLang, signal, settings)),
    );
    const batchResults: DictionaryEntry[] = [];
    for (const item of settled) {
      if (item.status === 'fulfilled' && item.value?.meanings?.length) {
        batchResults.push(normalizeDictionaryResult(item.value, settings, word));
      }
    }
    if (batchResults.length) {
      collected.push(...batchResults);
      applyResults(batchResults);
    }
  }

  if (collected.length) await writeSessionEnrichment(cacheKey, collected);
}

export async function fetchCombinedDictionaryResult(
  word: string,
  settings: AppSettings,
  signal?: AbortSignal,
  onEnrichUpdate?: (enriched: DictionaryEntry) => void,
  enrichSignal?: AbortSignal,
): Promise<DictionaryEntry> {
  const cleanWord = word.trim();
  const provider = settings.dictionaryProvider || 'free_dictionary';
  const targetLang = settings.translateTargetLanguage || 'Vietnamese';
  const combinedKey = combinedResultCacheKey(cleanWord, settings);
  const cachedCombined = readCombinedResultCache(combinedKey);
  if (cachedCombined?.enriched) {
    emitUpdate(onEnrichUpdate, cachedCombined, cachedCombined.revision || 0);
    return cachedCombined;
  }

  const dictionaryPromise = settings.enableDictionary !== false
    ? fetchDictionaryResult(cleanWord, provider, targetLang, signal, settings.aiApiKey, settings.aiModel, settings)
      .catch((error) => {
        if (error instanceof Error && error.name === 'AbortError') throw error;
        return null;
      })
    : Promise.resolve(null);

  const translationState: { outcome: { ok: boolean; value?: TranslationResult | null } | null } = { outcome: null };
  const translationPromise = settings.enableTranslate === false
    ? null
    : lookupTranslationResult(cleanWord, settings, signal).then(
      (value) => {
        translationState.outcome = { ok: true, value };
        return value;
      },
      () => {
        translationState.outcome = { ok: false, value: null };
        return null;
      },
    );

  const dictionary = await dictionaryPromise;
  const canEnrich = settings.enableDictionary !== false
    && DICTIONARY_FALLBACK_ORDER.some((id) => id !== provider && isProviderConfigured(id, settings));

  if (!dictionary && translationPromise && !translationState.outcome) {
    await translationPromise;
  }

  const settledTranslation = translationState.outcome?.ok ? translationState.outcome.value : undefined;
  if (!dictionary && !settledTranslation && !canEnrich) {
    throw new Error(`No dictionary definition found for "${cleanWord}".`);
  }

  let current: DictionaryEntry = dictionary
    ? { ...dictionary, revision: 0, originalText: cleanWord, meanings: mergeMeanings(dictionary.meanings || [], []) }
    : {
        word: cleanWord,
        meanings: [],
        originalText: cleanWord,
        translation: settledTranslation || undefined,
        sourceBadges: settledTranslation?.sourceBadges,
        revision: 0,
      };

  if (dictionary && settledTranslation) current.translation = settledTranslation;
  if (!current.translation && dictionary?.translation) current.translation = dictionary.translation;
  if (!dictionary && settledTranslation) current.originalText = cleanWord;

  const pendingTranslation = Boolean(translationPromise && !translationState.outcome);
  const needsPhraseFallback = isPhraseLike(cleanWord) && !hasUsableDefinitions(dictionary);
  let latest = current;
  emitUpdate(onEnrichUpdate, latest, latest.revision || 0);

  const applyLiveUpdate = (updated: DictionaryEntry, revision: number) => {
    latest = {
      ...updated,
      translation: updated.translation || latest.translation,
      phraseExplanation: updated.phraseExplanation?.length ? updated.phraseExplanation : latest.phraseExplanation,
      sourceBadges: mergeSourceBadges(latest.sourceBadges, updated.sourceBadges),
      revision: Math.max(latest.revision || 0, revision),
    };
    emitUpdate(onEnrichUpdate, latest, latest.revision || revision);
  };

  const backgroundSignal = enrichSignal || signal;

  const translationTask = pendingTranslation && translationPromise
    ? translationPromise.then((lateTranslation) => {
      if (!lateTranslation || backgroundSignal?.aborted) return;
      applyLiveUpdate({
        ...latest,
        translation: lateTranslation,
        originalText: dictionary ? latest.originalText : cleanWord,
        sourceBadges: mergeSourceBadges(latest.sourceBadges, lateTranslation.sourceBadges),
      }, 1);
    }).catch((error) => {
      if (error instanceof Error && error.name === 'AbortError') return;
    })
    : Promise.resolve();

  const shouldEnrichSecondaries = settings.enableDictionary !== false && isThinDictionaryEntry(latest);
  const enrichmentTask = shouldEnrichSecondaries
    ? runDictionaryEnrichment(cleanWord, latest, settings, (updated) => {
      applyLiveUpdate({ ...updated, enriched: true }, 3);
    }, backgroundSignal)
    : Promise.resolve();

  const phraseTask = needsPhraseFallback
    ? lookupPhraseFallback(cleanWord, settings, backgroundSignal).then((phraseSections) => {
      if (!phraseSections?.length || backgroundSignal?.aborted) return;
      applyLiveUpdate({
        ...latest,
        phraseExplanation: phraseSections,
        sourceBadges: mergeSourceBadges(latest.sourceBadges, [{ label: 'AI · Phrase explanation', kind: 'ai', providerId: 'ai' }]),
        enriched: true,
      }, 2);
    }).catch((error) => {
      if (error instanceof Error && error.name === 'AbortError') return;
    })
    : Promise.resolve();

  const backgroundWork = Promise.allSettled([translationTask, enrichmentTask, phraseTask]).then(() => {
    latest = {
      ...latest,
      enriched: true,
      revision: Math.max(latest.revision || 0, pendingTranslation || shouldEnrichSecondaries || needsPhraseFallback ? 3 : 0),
    };
    writeCombinedResultCache(combinedKey, latest);
    emitUpdate(onEnrichUpdate, latest, latest.revision || 0);
    return latest;
  }).catch((error) => {
    if (error instanceof Error && error.name === 'AbortError') return latest;
    throw error;
  });

  if (onEnrichUpdate) {
    void backgroundWork;
    return latest;
  }
  return backgroundWork;
}

export interface ProviderValidationResult {
  ok: boolean;
  providerId?: string;
  latencyMs?: number;
  error?: string;
  message?: string;
}

export async function validateDictionaryProvider(
  providerId: string,
  settings: AppSettings,
): Promise<ProviderValidationResult> {
  const id = providerId || 'free_dictionary';
  if (id === 'merriam_webster' && !String(settings?.dictionaryApiKey || '').trim()) {
    return { ok: false, providerId: id, error: 'Merriam-Webster API key is missing.' };
  }
  if (id === 'wordnik' && !String(settings?.wordnikApiKey || '').trim()) {
    return { ok: false, providerId: id, error: 'Wordnik API key is missing.' };
  }
  if (id === 'words_api' && !String(settings?.wordsApiKey || '').trim()) {
    return { ok: false, providerId: id, error: 'WordsAPI key is missing.' };
  }

  const startTime = Date.now();
  try {
    await lookupSingleProvider(id, 'hello', settings.translateTargetLanguage || 'Vietnamese', undefined, settings);
    const latencyMs = Date.now() - startTime;
    return { ok: true, providerId: id, latencyMs, message: `${id} is connected (${latencyMs}ms).` };
  } catch (error) {
    const latencyMs = Date.now() - startTime;
    if (error instanceof NotFoundError) {
      return { ok: true, providerId: id, latencyMs, message: `${id} is reachable (${latencyMs}ms).` };
    }
    return {
      ok: false,
      providerId: id,
      latencyMs,
      error: error instanceof Error ? error.message : `${id} connection failed.`,
    };
  }
}

export async function validateTranslationProvider(settings: AppSettings): Promise<ProviderValidationResult> {
  const providerId = settings.translateProvider || 'google';
  const startTime = Date.now();
  try {
    const result = await lookupTranslationResult('hello', { ...settings, enableTranslate: true });
    const latencyMs = Date.now() - startTime;
    if (!result?.translatedText) {
      return { ok: false, providerId, latencyMs, error: 'Translation provider returned an empty response.' };
    }
    return { ok: true, providerId, latencyMs, message: `${providerId} is connected (${latencyMs}ms).` };
  } catch (error) {
    const latencyMs = Date.now() - startTime;
    return {
      ok: false,
      providerId,
      latencyMs,
      error: error instanceof Error ? error.message : 'Translation connection failed.',
    };
  }
}
