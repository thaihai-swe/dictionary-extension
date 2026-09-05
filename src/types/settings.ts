import type { TabId } from './models';

export type SelectionTriggerMode = 'off' | 'icon' | 'direct';
export type PostSelectionModifier = 'shift' | 'alt' | 'ctrl';
export type AppTheme = 'system' | 'light' | 'dark';
export type AppFontFamily = 'editorial' | 'learner';
export type AiProviderId = 'gemini' | 'openai';
export type TranslationProviderId = 'google' | 'libretranslate' | 'mymemory';
export type DictionaryProviderId =
  | 'free_dictionary'
  | 'google_translate'
  | 'wiktionary'
  | 'wiktionary_etymology'
  | 'wiktionary_bilingual'
  | 'datamuse'
  | 'urban_dictionary'
  | 'wikipedia'
  | 'rhymebrain'
  | 'tatoeba'
  | 'gemini_ai';

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
  aiProvider: AiProviderId;
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
