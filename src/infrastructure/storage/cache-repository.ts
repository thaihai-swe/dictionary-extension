import type { DictionaryEntry } from '../../types';
import type { DictionaryCachePort } from '../../application/dictionary/runtime-ports';
import {
  clearEnrichmentCache,
  readSessionCombinedResult,
  readSessionEnrichment,
  writeCombinedResultCache,
  writeSessionEnrichment,
} from '../../providers/cache';

/** Browser-storage implementation kept behind the application cache port. */
export const dictionaryCacheRepository: DictionaryCachePort = {
  readCombined: readSessionCombinedResult,
  writeCombined: writeCombinedResultCache,
  readEnrichment: readSessionEnrichment,
  writeEnrichment: writeSessionEnrichment,
  clear: clearEnrichmentCache,
};
