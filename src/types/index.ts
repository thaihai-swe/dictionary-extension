export type TabId = 'dictionary' | 'ai_assistant';

export type AiIntentId = 
  | 'explain_in_context'
  | 'grammar'
  | 'collocations'
  | 'sentence_breakdown'
  | 'confusables'
  | 'rephrase';

export interface AiIntent {
  id: AiIntentId;
  label: string;
  icon: string;
}

export interface SentenceStructureItem {
  text: string;
  role: string;
}

export interface AiResult {
  type: string;
  query: string;
  summary?: string;
  translation?: string;
  structure?: SentenceStructureItem[];
}

export interface Phonetic {
  text?: string;
  audio?: string;
  region?: 'uk' | 'us' | 'all';
}

export interface Definition {
  definition: string;
  example?: string;
  synonyms?: string[];
  antonyms?: string[];
}

export interface Meaning {
  partOfSpeech: string;
  definitions: Definition[];
  synonyms?: string[];
  antonyms?: string[];
}

export interface WordFamily {
  nouns?: string[];
  verbs?: string[];
  adjectives?: string[];
  adverbs?: string[];
  inflections?: string[];
}

export interface Collocations {
  verbs?: string[];
  nouns?: string[];
  adjectives?: string[];
  prepositions?: string[];
}

export interface LearnerMistake {
  mistake: string;
  correction: string;
  exampleIncorrect?: string;
  exampleCorrect?: string;
}

export interface LexicalProfile {
  cefr?: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
  frequencyPill?: string;
  register?: string;
  wordFamily?: WordFamily;
  usageNotes?: string;
  wordFormation?: string;
  learnerMistakes?: LearnerMistake[];
  collocations?: Collocations;
}

export interface DictionaryEntry {
  word: string;
  phonetic?: string;
  phonetics?: Phonetic[];
  meanings: Meaning[];
  sourceUrl?: string;
  lexicalProfile?: LexicalProfile;
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
  aiModel: string;
  aiPromptTemplate: string;
  aiContextPromptTemplate: string;
  aiGrammarPromptTemplate: string;
  aiSentencePromptTemplate: string;
  aiPhraseExplorerPromptTemplate: string;
  aiComparePromptTemplate: string;
  aiRephrasePromptTemplate: string;
}

export type ExtensionSettings = AppSettings;
