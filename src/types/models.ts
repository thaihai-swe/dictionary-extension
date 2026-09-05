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

export interface SentenceStructureItem {
  text: string;
  role: string;
  explanation?: string;
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

export interface AiMinimalPair {
  sentenceA: string;
  sentenceB: string;
  explanation?: string;
}

export interface RephraseStyleItem {
  style: 'simplified' | 'formal' | 'idiomatic' | string;
  label: string;
  text: string;
  note?: string;
}

export interface Phonetic {
  text?: string;
  audio?: string;
  language?: string;
  label?: string;
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

export interface AttributedItem {
  text: string;
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
    minimalPairs?: AiMinimalPair[];
  };
  rephraseStyles?: RephraseStyleItem[];
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
  phonetics?: Phonetic[];
  meanings: Meaning[];
  examples?: AttributedItem[];
  synonyms?: AttributedItem[];
  antonyms?: AttributedItem[];
  lexicalProfile?: LexicalProfile;
  translation?: TranslationResult;
  originalText?: string;
  phraseExplanation?: PhraseExplanationSection[];
  enriched?: boolean;
  revision?: number;
}
