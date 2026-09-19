import type { DictionaryEntry } from '../../types';
import {
  clearEnrichmentCache,
  readSessionCombinedResult,
  readSessionEnrichment,
  writeCombinedResultCache,
  writeSessionEnrichment,
} from '../../providers/cache';

export interface DictionaryCacheRepository {
  readCombined(key: string): Promise<DictionaryEntry | undefined>;
  writeCombined(key: string, result: DictionaryEntry): void;
  readEnrichment(key: string): Promise<DictionaryEntry[] | null>;
  writeEnrichment(key: string, results: DictionaryEntry[]): Promise<void>;
  clear(): void;
}

/** Browser-storage implementation kept behind the application cache port. */
export const dictionaryCacheRepository: DictionaryCacheRepository = {
  readCombined: readSessionCombinedResult,
  writeCombined: writeCombinedResultCache,
  readEnrichment: readSessionEnrichment,
  writeEnrichment: writeSessionEnrichment,
  clear: clearEnrichmentCache,
};
