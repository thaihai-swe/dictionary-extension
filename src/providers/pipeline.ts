/**
 * Compatibility facade for the dictionary application services.
 * New code should import from `src/application/dictionary`; this export surface
 * remains stable for the background runtime and existing consumers.
 */
export { normalizeDictionaryResult, providerLabel } from '../application/dictionary/normalizer';
export { lookupTranslationResult } from '../application/dictionary/translation-service';
export {
  fetchDictionaryResult,
  lookupSingleProvider,
  resolvePrimaryProviderId,
} from '../application/dictionary/primary-lookup';
export { runDictionaryEnrichment, ENRICHMENT_CONCURRENCY } from '../application/dictionary/enrichment-service';
export { fetchCombinedDictionaryResult } from '../application/dictionary/combined-lookup';
export { hasEnrichmentPayload, hasUsableDefinitions } from '../domain/dictionary/result-policy';
export { getSecondaryDictionaryProviderIds } from '../domain/dictionary/policies';
