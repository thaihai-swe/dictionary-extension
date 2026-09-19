import type { AppSettings, DictionaryEntry } from '../../types';
import { getSecondaryDictionaryProviderIds } from '../../shared/query-utils';
import { createDictionaryEntryAccumulator } from '../../shared/enrichment';
import { hasEnrichmentPayload } from '../../domain/dictionary/result-policy';
import { collectProviderOutcomes } from './provider-aggregator';
import { normalizeDictionaryResult, providerLabel } from './normalizer';
import { lookupSingleProvider } from './primary-lookup';
import { dictionaryCacheRepository } from '../../infrastructure/storage/cache-repository';
import { enrichmentCacheKey } from '../../providers/cache';

export const ENRICHMENT_CONCURRENCY = 2;

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

  const cached = await dictionaryCacheRepository.readEnrichment(cacheKey);
  const accumulator = createDictionaryEntryAccumulator(baseResult);
  let currentCombined = accumulator.snapshot();

  const applyResults = (results: DictionaryEntry[]) => {
    for (const item of results) {
      accumulator.add(item);
    }
    currentCombined = accumulator.snapshot();
    currentCombined.translation = currentCombined.translation || baseResult.translation;
    currentCombined.phraseExplanation = currentCombined.phraseExplanation?.length
      ? currentCombined.phraseExplanation
      : baseResult.phraseExplanation;
    currentCombined.enriched = false;
    onEnrichUpdate(currentCombined);
  };

  if (cached?.length) {
    applyResults(cached);
    return;
  }

  const secondaryProviders = getSecondaryDictionaryProviderIds(primaryProviderId);
  const collected: DictionaryEntry[] = [];
  await collectProviderOutcomes(
    secondaryProviders,
    queryTerm,
    (providerId, query, options) => lookupSingleProvider(
      providerId,
      query,
      options.targetLang,
      options.signal,
      options.settings,
      options.onPartial,
    ),
    {
      targetLang,
      settings,
      signal,
      concurrency: ENRICHMENT_CONCURRENCY,
      onProviderPartial: (providerId, partial) => {
        const normalized = normalizeDictionaryResult(partial, settings, word, providerId);
        if (hasEnrichmentPayload(normalized)) applyResults([normalized]);
      },
      onOutcome: (outcome) => {
        if (outcome.status === 'contributed') {
          const normalized = normalizeDictionaryResult(outcome.result, settings, word, outcome.providerId);
          if (hasEnrichmentPayload(normalized)) {
            collected.push(normalized);
            applyResults([normalized]);
          }
          return;
        }
        accumulator.add({
          word,
          meanings: [],
          sources: [{
            providerId: outcome.providerId,
            label: providerLabel(outcome.providerId),
            status: outcome.status === 'no_match' ? 'not_found' : outcome.status,
          }],
        });
        currentCombined = accumulator.snapshot();
        onEnrichUpdate(currentCombined);
      },
    },
  );
  if (!signal?.aborted && collected.length) await dictionaryCacheRepository.writeEnrichment(cacheKey, collected);
}
