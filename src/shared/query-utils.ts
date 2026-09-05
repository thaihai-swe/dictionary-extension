export {
  normalizeDictionaryTerm,
  DICTIONARY_FALLBACK_ORDER,
  isPhraseLike,
  getPrimaryDictionaryLookupAttempts,
  extractJsonObject,
} from './text-utils.ts';
export type { LookupAttemptKind, DictionaryLookupAttempt } from './text-utils.ts';

export {
  parseLexicalProfile,
  extractLexicalProfileFromMarkdown,
  mergeLexicalProfiles,
  stripLexicalProfileBlock,
  parseLexicalProfileFromResponse,
} from './lexical-profile.ts';

export {
  splitPhraseExplanation,
  normalizeSentenceBreakdown,
  normalizeComparisonData,
  normalizeRephraseStyles,
} from './ai-parser.ts';
