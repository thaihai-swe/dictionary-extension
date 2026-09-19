import type { AppSettings, DictionaryEntry, ProviderLookupDto } from '../../types';
import { extractLexicalProfileFromMarkdown, mergeLexicalProfiles, parseLexicalProfile } from '../../shared/query-utils';
import { mergeMeanings, toDictionaryEntry } from '../../shared/enrichment';
import { hasEnrichmentPayload } from '../../domain/dictionary/result-policy';
import { dictionaryProviderCatalog } from '../../infrastructure/providers/catalog';
import { recordLookupMetric } from '../../shared/performance/lookup-metrics.ts';

export function providerLabel(providerId: string): string {
  return dictionaryProviderCatalog.getLabel(providerId);
}

export function normalizeDictionaryResult(
  result: ProviderLookupDto | DictionaryEntry,
  settings?: AppSettings,
  originalText?: string,
  sourceProviderId?: string,
): DictionaryEntry {
  const startedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const entry = toDictionaryEntry(result);
  let lexicalProfile = settings?.enableLexicalProfile === false
    ? undefined
    : parseLexicalProfile(entry.lexicalProfile) || entry.lexicalProfile;
  if (settings?.enableLexicalProfile !== false) {
    const blob = [
      ...(entry.meanings || []).flatMap((meaning) => meaning.definitions.map((item) => item.definition)),
      ...(entry.examples || []).map((item) => item.text),
    ].join('\n');
    const extracted = extractLexicalProfileFromMarkdown(blob);
    if (extracted) lexicalProfile = mergeLexicalProfiles(lexicalProfile, extracted);
  }
  const normalized: DictionaryEntry = {
    ...entry,
    lexicalProfile,
    originalText: originalText || entry.originalText,
    sources: sourceProviderId
      ? [{ providerId: sourceProviderId, label: providerLabel(sourceProviderId), status: hasEnrichmentPayload(entry) ? 'contributed' : 'empty' }]
      : entry.sources,
    meanings: mergeMeanings(entry.meanings || [], []),
  };
  recordLookupMetric('dictionary.normalize', {
    providerId: sourceProviderId || String((result as ProviderLookupDto).providerId || 'unknown'),
    durationMs: (typeof performance !== 'undefined' ? performance.now() : Date.now()) - startedAt,
  });
  return normalized;
}
