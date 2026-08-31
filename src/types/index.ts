export type TabId = 'dictionary' | 'ai_assistant';

export type AiIntentId = 
  | 'default'
  | 'explain_in_context'
  | 'grammar'
  | 'collocations'
  | 'sentence_breakdown'
  | 'confusables'
  | 'rephrase'
  | 'phrase_fallback';

export interface AiIntent {
  id: AiIntentId;
  label: string;
  icon: string;
}

export interface SentenceStructureItem {
  text: string;
  role: string;
}

export interface AiPhraseItem {
  text: string;
  type?: string;
  meaning?: string;
  role?: string;
  example?: string;
}

export interface AiComparisonRow {
  dimension: string;
  left: string;
  right: string;
}

export interface Phonetic {
  text?: string;
  audio?: string;
  audioUrl?: string;
  phonetic?: string;
  language?: string;
  label?: string;
  region?: 'uk' | 'us' | 'all';
  fallbackOnly?: boolean;
}

export interface Definition {
  definition: string;
  example?: string;
  synonyms?: string[];
  antonyms?: string[];
  source?: string;
}

export interface Meaning {
  partOfSpeech: string;
  definitions: Definition[];
  synonyms?: string[];
  antonyms?: string[];
  source?: string;
}

export interface AttributedItem {
  text: string;
  source?: string;
}

export interface WordFamily {
  nouns?: string[];
  verbs?: string[];
  adjectives?: string[];
  adverbs?: string[];
  inflections?: string[];
  derivatives?: string[];
}

export interface Collocations {
  verbs?: string[];
  nouns?: string[];
  adjectives?: string[];
  prepositions?: string[];
  patterns?: string[];
}

export interface LearnerMistake {
  mistake: string;
  correction: string;
  example?: string;
  exampleIncorrect?: string;
  exampleCorrect?: string;
}

export interface ConfusablePair {
  word: string;
  distinction: string;
}

export interface WordFormation {
  prefixes?: string[];
  suffixes?: string[];
  explanation?: string;
}

export interface LexicalProfile {
  cefr?: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
  frequencyPill?: string;
  register?: string;
  wordFamily?: WordFamily;
  usageNotes?: string;
  usageWarnings?: string[];
  confusablePairs?: ConfusablePair[];
  wordFormation?: string | WordFormation;
  learnerMistakes?: LearnerMistake[];
  collocations?: Collocations;
}

export interface AiResult {
  type: string;
  query: string;
  summary?: string;
  translation?: string;
  structure?: SentenceStructureItem[];
  lexicalProfile?: LexicalProfile;
  phrases?: AiPhraseItem[];
  comparison?: {
    coreDistinction?: string;
    rows?: AiComparisonRow[];
    leftTerm?: string;
    rightTerm?: string;
  };
}

export interface SourceBadge {
  label: string;
  kind: 'dictionary' | 'translation' | 'ai';
  providerId?: string;
}

export interface PhraseExplanationSection {
  title?: string;
  kind?: string;
  text?: string;
  markdown?: boolean;
  items?: string[];
  source?: string;
}

export interface PracticeResult {
  score: number;
  grade: 'excellent' | 'good' | 'almost' | 'retry';
  gradeLabel: string;
  spoken?: string;
  details?: Array<{ word: string; matched: boolean; closeMatch?: boolean }>;
}

export interface TranslationResult {
  translatedText: string;
  detectedLanguage?: string;
  targetLanguage?: string;
  sourceBadges?: SourceBadge[];
}

export interface DictionaryEntry {
  word: string;
  phonetic?: string;
  phonetics?: Phonetic[];
  pronunciations?: Phonetic[];
  meanings: Meaning[];
  examples?: AttributedItem[];
  synonyms?: AttributedItem[];
  antonyms?: AttributedItem[];
  sourceUrl?: string;
  lexicalProfile?: LexicalProfile;
  subtitle?: string;
  sourceBadges?: SourceBadge[];
  providerId?: string;
  translation?: TranslationResult;
  originalText?: string;
  phraseExplanation?: PhraseExplanationSection[];
  syllables?: string;
  enriched?: boolean;
  revision?: number;
}

export type SelectionTriggerMode = 'off' | 'icon' | 'direct';
export type PostSelectionModifier = 'shift' | 'alt' | 'ctrl';
export type AppTheme = 'system' | 'light' | 'dark';
export type AppFontFamily = 'editorial' | 'learner';
export type TranslationProviderId = 'google' | 'libretranslate';
export type DictionaryProviderId = 'free_dictionary' | 'google_translate' | 'wiktionary' | 'merriam_webster' | 'wordnik' | 'words_api' | 'gemini_ai';

export interface AppSettings {
  theme: AppTheme;
  fontFamily: AppFontFamily;
  selectionTriggerMode: SelectionTriggerMode;
  postSelectionModifier: PostSelectionModifier;
  enableContextMenuTrigger: boolean;
  defaultTab: TabId;
  translateTargetLanguage: string;
  customLanguages: string;
  translateProvider: TranslationProviderId;
  libreTranslateBaseUrl: string;
  libreTranslateApiKey: string;
  dictionaryProvider: DictionaryProviderId;
  dictionaryApiKey: string;
  wordnikApiKey: string;
  wordsApiKey: string;
  popupWidth: number;
  popupHeight: number;
  enableTranslate: boolean;
  enableDictionary: boolean;
  enableLexicalProfile: boolean;
  enableAI: boolean;
  enableAiPreload: boolean;
  enablePhraseFallback: boolean;
  disablePageContextExtraction: boolean;
  pausedHostnames: string[];
  pronunciationRate: number;
  pronunciationVoiceURI: string;
  aiBaseUrl: string;
  aiApiKey: string;
  hasAiApiKey: boolean;
  aiModel: string;
  aiPromptTemplate: string;
  aiDefaultPromptTemplate: string;
  aiContextPromptTemplate: string;
  aiGrammarPromptTemplate: string;
  aiSentencePromptTemplate: string;
  aiPhraseExplorerPromptTemplate: string;
  aiComparePromptTemplate: string;
  aiRephrasePromptTemplate: string;
}

export type ExtensionSettings = AppSettings;
