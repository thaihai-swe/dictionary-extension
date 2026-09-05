import type {
  AppSettings,
  DictionaryEntry,
  PhraseExplanationSection,
  ProviderLookupDto,
  TranslationResult,
} from '../types';
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
import { cloneDictionaryEntry, mergeDictionaryEntries, mergeMeanings, toDictionaryEntry } from '../shared/enrichment';
import { fetchAiAnalysis } from './provider.gemini-ai';
import { providerRegistry } from './registry';
import './register-adapters';
import {
  combinedResultCacheKey,
  enrichmentCacheKey,
  readSessionCombinedResult,
  readSessionEnrichment,
  writeCombinedResultCache,
  writeSessionEnrichment,
} from './cache';

export const ENRICHMENT_CONCURRENCY = 2;

export function resolvePrimaryProviderId(provider: string, settings?: AppSettings): string {
  return provider || settings?.dictionaryProvider || 'wiktionary';
}

export function hasUsableDefinitions(entry?: DictionaryEntry | null): boolean {
  return Boolean(entry?.meanings?.some((meaning) => meaning.definitions?.some((item) => item.definition?.trim())));
}

export function hasEnrichmentPayload(entry?: DictionaryEntry | null): boolean {
  if (!entry) return false;
  return Boolean(
    hasUsableDefinitions(entry)
    || entry.phonetics?.some((item) => item.text || item.audio)
    || entry.synonyms?.length
    || entry.antonyms?.length
    || entry.examples?.length
    || entry.lexicalProfile
  );
}

export function normalizeDictionaryResult(
  result: ProviderLookupDto | DictionaryEntry,
  settings?: AppSettings,
  originalText?: string,
): DictionaryEntry {
  const entry = toDictionaryEntry(result);
  let lexicalProfile = settings?.enableLexicalProfile === false ? undefined : parseLexicalProfile(entry.lexicalProfile) || entry.lexicalProfile;
  if (settings?.enableLexicalProfile !== false) {
    const blob = [
      ...(entry.meanings || []).flatMap((meaning) => meaning.definitions.map((item) => item.definition)),
      ...(entry.examples || []).map((item) => item.text),
    ].join('\n');
    const extracted = extractLexicalProfileFromMarkdown(blob);
    if (extracted) lexicalProfile = mergeLexicalProfiles(lexicalProfile, extracted);
  }
  return {
    ...entry,
    lexicalProfile,
    originalText: originalText || entry.originalText,
    meanings: mergeMeanings(entry.meanings || [], []),
  };
}

export async function lookupSingleProvider(
  providerId: string,
  query: string,
  targetLang: string,
  signal?: AbortSignal,
  settings?: AppSettings,
): Promise<ProviderLookupDto> {
  const adapter = providerRegistry.getDictionary(providerId) || providerRegistry.getDictionary('free_dictionary');
  if (!adapter) {
    throw new Error(`Unknown dictionary provider: ${providerId}`);
  }
  const result = await adapter.lookup(query, { targetLang, signal, settings });
  console.log(`[Dictionary] Raw provider result (${providerId}):`, result);
  return result;
}

export async function lookupTranslationResult(
  text: string,
  settings?: AppSettings,
  signal?: AbortSignal,
): Promise<TranslationResult | null> {
  if (settings && settings.enableTranslate === false) return null;
  const targetLang = settings?.translateTargetLanguage || 'Vietnamese';
  const providerId = settings?.translateProvider || 'google';
  const adapter = providerRegistry.getTranslation(providerId) || providerRegistry.getTranslation('google');
  const lookupPrimary = async (): Promise<TranslationResult | null> => {
    if (!adapter) return null;
    return adapter.lookup(text, {
      targetLang,
      signal,
      baseUrl: settings?.libreTranslateBaseUrl,
      apiKey: settings?.libreTranslateApiKey,
    });
  };
  try {
    return await lookupPrimary();
  } catch {
    if (providerId === 'mymemory') return null;
    try {
      const fallback = providerRegistry.getTranslation('mymemory');
      if (!fallback) return null;
      return await fallback.lookup(text, { targetLang, signal });
    } catch {
      return null;
    }
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
    const normalized = normalizeDictionaryResult(
      await lookupSingleProvider(provider, cleanWord, targetLang, signal, settingsWithKeys),
      settingsWithKeys,
      cleanWord,
    );
    return normalized;
  }

  const primaryId = resolvePrimaryProviderId(provider, settingsWithKeys);
  const attempts = getPrimaryDictionaryLookupAttempts(cleanWord, primaryId);
  let lastNotFoundError: unknown = null;
  let lastLookupError: unknown = null;
  let bestPartial: DictionaryEntry | null = null;

  for (const attempt of attempts) {
    if (signal?.aborted) throw new DOMException('The user aborted a request.', 'AbortError');
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
  const primaryProviderId = settings.dictionaryProvider || 'wiktionary';
  const queryTerm = word.trim();
  const targetLang = settings.translateTargetLanguage || 'Vietnamese';
  const cacheKey = enrichmentCacheKey(word, settings, primaryProviderId, queryTerm);

  const cached = await readSessionEnrichment(cacheKey);
  let currentCombined = cloneDictionaryEntry(baseResult);

  const applyResults = (results: DictionaryEntry[]) => {
    for (const item of results) {
      currentCombined = mergeDictionaryEntries(currentCombined, item);
      currentCombined.lexicalProfile = mergeLexicalProfiles(currentCombined.lexicalProfile, item.lexicalProfile);
      console.log('[Dictionary] Merged model after provider:', currentCombined);
    }
    currentCombined.translation = currentCombined.translation || baseResult.translation;
    currentCombined.phraseExplanation = currentCombined.phraseExplanation?.length
      ? currentCombined.phraseExplanation
      : baseResult.phraseExplanation;
    // ponytail: enriched stays false until fetchCombinedDictionaryResult finishes all tasks
    currentCombined.enriched = false;
    onEnrichUpdate(currentCombined);
  };

  if (cached?.length) {
    applyResults(cached);
    return;
  }

  const secondaryProviders = DICTIONARY_FALLBACK_ORDER.filter((id) => id !== primaryProviderId);
  const collected: DictionaryEntry[] = [];

  for (let index = 0; index < secondaryProviders.length; index += ENRICHMENT_CONCURRENCY) {
    if (signal?.aborted) break;
    const batch = secondaryProviders.slice(index, index + ENRICHMENT_CONCURRENCY);
    const settled = await Promise.allSettled(
      batch.map((providerId) => lookupSingleProvider(providerId, queryTerm, targetLang, signal, settings)),
    );
    const batchResults: DictionaryEntry[] = [];
    for (const item of settled) {
      if (item.status !== 'fulfilled' || !item.value) continue;
      const normalized = normalizeDictionaryResult(item.value, settings, word);
      if (hasEnrichmentPayload(normalized)) batchResults.push(normalized);
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
  const provider = settings.dictionaryProvider || 'wiktionary';
  const targetLang = settings.translateTargetLanguage || 'Vietnamese';
  const combinedKey = combinedResultCacheKey(cleanWord, settings);
  const cachedCombined = await readSessionCombinedResult(combinedKey);
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
  const primaryProviderId = provider;
  const canEnrich = settings.enableDictionary !== false
    && DICTIONARY_FALLBACK_ORDER.some((id) => id !== primaryProviderId);

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
        revision: 0,
      };

  if (dictionary && settledTranslation) current.translation = settledTranslation;
  if (!current.translation && dictionary?.translation) current.translation = dictionary.translation;
  if (!dictionary && settledTranslation) current.originalText = cleanWord;

  const pendingTranslation = Boolean(translationPromise && !translationState.outcome);
  const needsPhraseFallback = isPhraseLike(cleanWord) && !hasUsableDefinitions(dictionary);
  let latest = current;
  console.log('[Dictionary] Initial merged model (revision 0):', latest);
  emitUpdate(onEnrichUpdate, latest, latest.revision || 0);

  const applyLiveUpdate = (updated: DictionaryEntry, revision?: number) => {
    latest = {
      ...updated,
      translation: updated.translation || latest.translation,
      phraseExplanation: updated.phraseExplanation?.length ? updated.phraseExplanation : latest.phraseExplanation,
      revision: Math.max((latest.revision || 0) + 1, revision || 0),
    };
    console.log(`[Dictionary] Merged model (revision ${latest.revision}):`, latest);
    emitUpdate(onEnrichUpdate, latest, latest.revision || 0);
  };

  const backgroundSignal = enrichSignal || signal;

  const translationTask = pendingTranslation && translationPromise
    ? translationPromise.then((lateTranslation) => {
      if (!lateTranslation || backgroundSignal?.aborted) return;
      applyLiveUpdate({
        ...latest,
        translation: lateTranslation,
        originalText: dictionary ? latest.originalText : cleanWord,
      });
    }).catch((error) => {
      if (error instanceof Error && error.name === 'AbortError') return;
    })
    : Promise.resolve();

  const shouldEnrichSecondaries = canEnrich;
  const enrichmentTask = shouldEnrichSecondaries
    ? runDictionaryEnrichment(cleanWord, latest, settings, (updated) => {
      applyLiveUpdate(updated);
    }, backgroundSignal)
    : Promise.resolve();

  const phraseTask = needsPhraseFallback
    ? lookupPhraseFallback(cleanWord, settings, backgroundSignal).then((phraseSections) => {
      if (!phraseSections?.length || backgroundSignal?.aborted) return;
      applyLiveUpdate({
        ...latest,
        phraseExplanation: phraseSections,
      });
    }).catch((error) => {
      if (error instanceof Error && error.name === 'AbortError') return;
    })
    : Promise.resolve();

  const backgroundWork = Promise.allSettled([translationTask, enrichmentTask, phraseTask]).then(() => {
    latest = {
      ...latest,
      enriched: true,
      revision: (latest.revision || 0) + 1,
    };
    writeCombinedResultCache(combinedKey, latest);
    console.log(`[Dictionary] Final merged model (revision ${latest.revision}):`, latest);
    emitUpdate(onEnrichUpdate, latest, latest.revision || 0);
    return latest;
  }).catch((error) => {
    if (error instanceof Error && error.name === 'AbortError') return latest;
    throw error;
  });

  return backgroundWork;
}
