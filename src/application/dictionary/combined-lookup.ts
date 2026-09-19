import type {
  AppSettings,
  DictionaryEntry,
  PhraseExplanationSection,
  TranslationResult,
} from '../../types';
import { NotFoundError } from '../../providers/errors';
import { isPhraseLike, splitPhraseExplanation, getSecondaryDictionaryProviderIds } from '../../shared/query-utils';
import { createDictionaryEntryAccumulator, mergeDictionaryEntries, mergeMeanings } from '../../shared/enrichment';
import { hasUsableDefinitions } from '../../domain/dictionary/result-policy';
import { fetchAiAnalysis } from '../../infrastructure/providers/ai';
import { combinedResultCacheKey } from '../../providers/cache';
import { dictionaryCacheRepository } from '../../infrastructure/storage/cache-repository';
import { fetchDictionaryResult } from './primary-lookup';
import { lookupTranslationResult } from './translation-service';
import { runDictionaryEnrichment } from './enrichment-service';
import { normalizeDictionaryResult, providerLabel } from './normalizer';

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

export async function fetchCombinedDictionaryResult(
  word: string,
  settings: AppSettings,
  signal?: AbortSignal,
  onEnrichUpdate?: (enriched: DictionaryEntry) => void,
  enrichSignal?: AbortSignal,
  onBackgroundComplete?: () => void,
): Promise<DictionaryEntry> {
  const cleanWord = word.trim();
  const provider = settings.dictionaryProvider || 'wiktionary';
  const targetLang = settings.translateTargetLanguage || 'Vietnamese';
  const combinedKey = combinedResultCacheKey(cleanWord, settings);
  const cachedCombined = await dictionaryCacheRepository.readCombined(combinedKey);
  if (cachedCombined?.enriched) {
    emitUpdate(onEnrichUpdate, cachedCombined, cachedCombined.revision || 0);
    onBackgroundComplete?.();
    return cachedCombined;
  }

  let primaryError: unknown = null;
  let primaryPartial: DictionaryEntry | null = null;
  let primaryAccumulator: ReturnType<typeof createDictionaryEntryAccumulator> | null = null;
  let primaryPartialRevision = 0;
  const dictionaryPromise = settings.enableDictionary !== false
    ? fetchDictionaryResult(
      cleanWord,
      provider,
      targetLang,
      signal,
      settings.aiApiKey,
      settings.aiModel,
      settings,
      (partial) => {
        const normalized = normalizeDictionaryResult(partial, settings, cleanWord, partial.providerId);
        if (!hasUsableDefinitions(normalized) && !normalized.synonyms?.length && !normalized.lexicalProfile) return;
        if (!primaryAccumulator) primaryAccumulator = createDictionaryEntryAccumulator(normalized);
        else primaryAccumulator.add(normalized);
        primaryPartial = primaryAccumulator.snapshot();
        primaryPartialRevision += 1;
        emitUpdate(onEnrichUpdate, {
          ...primaryPartial,
          originalText: cleanWord,
          revision: primaryPartialRevision,
        }, primaryPartialRevision);
      },
    )
      .catch((error) => {
        if (error instanceof Error && error.name === 'AbortError') throw error;
        primaryError = error;
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
    && getSecondaryDictionaryProviderIds(primaryProviderId).length > 0;

  if (!dictionary && translationPromise && !translationState.outcome) await translationPromise;

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
        sources: primaryError ? [{
          providerId: provider,
          label: providerLabel(provider),
          status: primaryError instanceof NotFoundError ? 'not_found' : 'failed',
        }] : undefined,
        revision: 0,
      };

  if (primaryPartial) {
    current = mergeDictionaryEntries(primaryPartial, current);
    current.originalText = cleanWord;
    current.revision = primaryPartialRevision;
  }

  if (dictionary && settledTranslation) current.translation = settledTranslation;
  if (!current.translation && dictionary?.translation) current.translation = dictionary.translation;
  if (!dictionary && settledTranslation) current.originalText = cleanWord;

  const pendingTranslation = Boolean(translationPromise && !translationState.outcome);
  const needsPhraseFallback = isPhraseLike(cleanWord) && !hasUsableDefinitions(dictionary);
  let latest = current;
  emitUpdate(onEnrichUpdate, latest, latest.revision || 0);

  const applyLiveUpdate = (updated: DictionaryEntry, revision?: number) => {
    latest = {
      ...updated,
      translation: updated.translation || latest.translation,
      phraseExplanation: updated.phraseExplanation?.length ? updated.phraseExplanation : latest.phraseExplanation,
      revision: Math.max((latest.revision || 0) + 1, revision || 0),
    };
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

  const enrichmentTask = canEnrich
    ? runDictionaryEnrichment(cleanWord, latest, settings, applyLiveUpdate, backgroundSignal)
    : Promise.resolve();

  const phraseTask = needsPhraseFallback
    ? lookupPhraseFallback(cleanWord, settings, backgroundSignal).then((phraseSections) => {
      if (!phraseSections?.length || backgroundSignal?.aborted) return;
      applyLiveUpdate({ ...latest, phraseExplanation: phraseSections });
    }).catch((error) => {
      if (error instanceof Error && error.name === 'AbortError') return;
    })
    : Promise.resolve();

  void Promise.allSettled([translationTask, enrichmentTask, phraseTask]).then(() => {
    if (backgroundSignal?.aborted) return latest;
    latest = {
      ...latest,
      enriched: true,
      revision: (latest.revision || 0) + 1,
    };
    dictionaryCacheRepository.writeCombined(combinedKey, latest);
    emitUpdate(onEnrichUpdate, latest, latest.revision || 0);
    return latest;
  }).catch((error) => {
    if (error instanceof Error && error.name === 'AbortError') return latest;
    return latest;
  }).finally(onBackgroundComplete);

  return current;
}
