import type {
  AttributedItem,
  DictionaryEntry,
  LexicalProfile,
  Meaning,
  Phonetic,
  PhraseExplanationSection,
  TranslationResult,
} from './models';
import type { AppSettings, DictionaryProviderId, TranslationProviderId } from './settings';

export interface ProviderValidationResult {
  ok: boolean;
  providerId?: string;
  latencyMs?: number;
  error?: string;
  message?: string;
}

/**
 * Standard DTO returned by dictionary/enrichment providers before consolidation & merging.
 */
export interface ProviderLookupDto {
  word: string;
  providerId: DictionaryProviderId | string;
  phonetics?: Phonetic[];
  meanings?: Meaning[];
  examples?: AttributedItem[];
  synonyms?: AttributedItem[];
  antonyms?: AttributedItem[];
  lexicalProfile?: LexicalProfile;
  translation?: TranslationResult;
  phraseExplanation?: PhraseExplanationSection[];
}

/** Narrow options for dictionary adapters — do not pass full AppSettings. */
export interface DictionaryLookupOptions {
  targetLang: string;
  signal?: AbortSignal;
  settings?: AppSettings;
}

/** Narrow options for translation adapters. */
export interface TranslationLookupOptions {
  targetLang: string;
  signal?: AbortSignal;
  baseUrl?: string;
  apiKey?: string;
}

export interface IDictionaryProvider {
  readonly id: DictionaryProviderId | string;
  readonly name: string;
  lookup(word: string, options: DictionaryLookupOptions): Promise<ProviderLookupDto>;
}

export interface ITranslationProvider {
  readonly id: TranslationProviderId | string;
  readonly name: string;
  lookup(text: string, options: TranslationLookupOptions): Promise<TranslationResult>;
}

export type { DictionaryEntry };
