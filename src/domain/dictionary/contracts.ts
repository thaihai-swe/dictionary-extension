import type {
  DictionaryEntry,
  DictionaryLookupOptions,
  DictionaryProviderSettings,
  IDictionaryProvider,
  ProviderLookupDto,
} from '../../types';

/**
 * Boundary contract between the dictionary application service and provider adapters.
 * The application layer depends on this shape instead of a concrete registry.
 */
export interface DictionaryProviderCatalog {
  getDictionary(id: string): IDictionaryProvider | undefined;
  listDictionaryIds(): string[];
  getLabel(id: string): string;
}

export interface DictionaryLookupContext {
  targetLang: string;
  settings?: DictionaryProviderSettings;
  signal?: AbortSignal;
  onPartial?: (result: ProviderLookupDto) => void;
}

export type DictionaryProviderOutcome =
  | {
      status: 'contributed';
      providerId: string;
      result: ProviderLookupDto;
      latencyMs: number;
    }
  | {
      status: 'no_match';
      providerId: string;
      latencyMs: number;
    }
  | {
      status: 'failed';
      providerId: string;
      errorCode: string;
      latencyMs: number;
    }
  | {
      status: 'cancelled';
      providerId: string;
    };

export interface DictionaryAggregate {
  entry: DictionaryEntry;
  outcomes: DictionaryProviderOutcome[];
}

export type DictionaryProviderLookup = (
  providerId: string,
  query: string,
  options: DictionaryLookupContext,
) => Promise<ProviderLookupDto>;

export type DictionaryProviderOptions = DictionaryLookupOptions;
