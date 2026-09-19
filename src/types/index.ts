export type {
  TabId,
  AiIntentId,
  SentenceStructureItem,
  AiPhraseItem,
  AiComparisonRow,
  AiMinimalPair,
  RephraseStyleItem,
  Phonetic,
  Definition,
  Meaning,
  AttributedItem,
  WordFamily,
  Collocations,
  LearnerMistake,
  ConfusablePair,
  WordFormation,
  LexicalProfile,
  AiResult,
  SourceBadge,
  DictionarySourceSummary,
  PhraseExplanationSection,
  PracticeResult,
  TranslationResult,
  DictionaryEntry,
} from './models';

export type {
  SelectionTriggerMode,
  PostSelectionModifier,
  AppTheme,
  TextSizePreference,
  AiProviderId,
  TranslationProviderId,
  DictionaryProviderId,
  AppSettings,
} from './settings';

export type {
  ProviderValidationResult,
  ProviderLookupDto,
  DictionaryProviderSettings,
  DictionaryLookupOptions,
  TranslationLookupOptions,
  IDictionaryProvider,
  ITranslationProvider,
} from './providers';

export type {
  DictionaryProviderCatalog,
  DictionaryLookupContext,
  DictionaryProviderOutcome,
  DictionaryAggregate,
  DictionaryProviderLookup,
} from '../domain/dictionary/contracts';
