import { ref, watch, Ref } from 'vue';
import { TabId, AiIntentId, AppSettings } from '../types';

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark',
  fontFamily: 'learner',
  selectionTriggerMode: 'icon',
  postSelectionModifier: 'shift',
  enableContextMenuTrigger: true,
  defaultTab: 'dictionary',
  translateTargetLanguage: 'Vietnamese',
  customLanguages: 'Vietnamese, English, Chinese, Japanese, Korean, French, German, Spanish',
  translateProvider: 'google',
  libreTranslateBaseUrl: 'https://libretranslate.com',
  libreTranslateApiKey: '',
  dictionaryProvider: 'free_dictionary',
  dictionaryApiKey: '',
  wordnikApiKey: '',
  wordsApiKey: '',
  popupWidth: 620,
  popupHeight: 720,
  enableTranslate: true,
  enableDictionary: true,
  enableLexicalProfile: true,
  enableAI: true,
  enableAiPreload: false,
  enablePhraseFallback: true,
  disablePageContextExtraction: false,
  pausedHostnames: [],
  pronunciationRate: 0.95,
  pronunciationVoiceURI: '',
  aiBaseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai/',
  aiApiKey: '',
  aiModel: 'gemini-2.5-flash',
  aiPromptTemplate: `Explain the selected text in its surrounding context for an English language learner.`,
  aiContextPromptTemplate: `### Meaning in Context\nExplain what "{query}" means specifically in this sentence.\n\n### Direct Substitutions\nList 2-3 natural synonyms.\n\n### Nuance & Connotation\nExplain tone or formality.\n\n### Natural Paraphrases\nProvide 2 natural paraphrases.`,
  aiGrammarPromptTemplate: `### Syntactic Breakdown\nIdentify part of speech and clause structure.\n\n### Formality & Tone\nExplain register.\n\n### Pattern Rules\nList syntactic rules.\n\n### Short Examples\nGive 2 short example sentences.`,
  aiSentencePromptTemplate: `### Clause & Structure Breakdown\nBreak down subject, predicate, and object.\n\n### Grammatical Roles\nExplain clause linking.\n\n### Translation & Context\nProvide smooth translation.`,
  aiPhraseExplorerPromptTemplate: `### Core Meaning\nExplain phrase or idiom.\n\n### Grammar & Patterns\nShow required prepositions.\n\n### Natural Collocations\nList word partnerships.\n\n### Natural Examples\nGive 2 example sentences.`,
  aiComparePromptTemplate: `### Core Distinction\nRule of thumb difference.\n\n### Comparison Matrix\nCompare dimensions.\n\n### Minimal Pairs & Examples\nMinimal pair comparisons.`,
  aiRephrasePromptTemplate: `### Simplified Version\nOxford 3000 level.\n\n### Academic & Formal\nFormal essay register.\n\n### Native & Idiomatic\nInformal native phrasing.`,
};

const SECRET_KEYS = new Set([
  'aiApiKey',
  'dictionaryApiKey',
  'wordnikApiKey',
  'wordsApiKey',
  'libreTranslateApiKey',
]);

const STORAGE_KEYS = {
  ACTIVE_TAB: 'dict_last_tab_v2',
  ACTIVE_INTENT: 'dict_last_intent_v2',
  RECENT_QUERIES: 'dict_recent_queries_v2',
};

const settingsRef: Ref<AppSettings> = ref<AppSettings>({ ...DEFAULT_SETTINGS });
let initialized = false;

function normalizeSettingsArrayFields(settings: AppSettings): AppSettings {
  if (!Array.isArray(settings.pausedHostnames)) {
    if (typeof settings.pausedHostnames === 'string' && (settings.pausedHostnames as string).trim()) {
      settings.pausedHostnames = (settings.pausedHostnames as string)
        .split('\n')
        .map(s => s.trim().toLowerCase())
        .filter(Boolean);
    } else {
      settings.pausedHostnames = [];
    }
  }
  return settings;
}

async function loadSettingsFromStorage(): Promise<AppSettings> {
  const current: AppSettings = { ...DEFAULT_SETTINGS };

  if (typeof chrome !== 'undefined' && chrome.storage) {
    try {
      const syncItems = await new Promise<any>((res) => chrome.storage.sync.get(null, res));
      const localItems = await new Promise<any>((res) => chrome.storage.local.get(null, res));
      Object.assign(current, syncItems, localItems);
      return normalizeSettingsArrayFields(current);
    } catch (e) {
      console.warn('Chrome storage read failed:', e);
    }
  }

  if (typeof localStorage !== 'undefined') {
    for (const key of Object.keys(DEFAULT_SETTINGS) as (keyof AppSettings)[]) {
      const val = localStorage.getItem(`dict_setting_${key}`);
      if (val !== null) {
        try {
          (current as any)[key] = JSON.parse(val);
        } catch {
          (current as any)[key] = val;
        }
      }
    }
  }

  return normalizeSettingsArrayFields(current);
}

export async function saveSettingsToStorage(partial: Partial<AppSettings>): Promise<void> {
  Object.assign(settingsRef.value, partial);
  normalizeSettingsArrayFields(settingsRef.value);

  const syncData: Record<string, any> = {};
  const localData: Record<string, any> = {};

  for (const [key, val] of Object.entries(partial)) {
    if (SECRET_KEYS.has(key)) {
      localData[key] = val;
    } else {
      syncData[key] = val;
    }

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(`dict_setting_${key}`, typeof val === 'object' ? JSON.stringify(val) : String(val));
    }
  }

  if (typeof chrome !== 'undefined' && chrome.storage) {
    try {
      if (Object.keys(syncData).length > 0) chrome.storage.sync.set(syncData);
      if (Object.keys(localData).length > 0) chrome.storage.local.set(localData);
    } catch (e) {
      console.warn('Chrome storage write failed:', e);
    }
  }
}

export function useStorage() {
  if (!initialized) {
    initialized = true;
    loadSettingsFromStorage().then((s) => {
      settingsRef.value = s;
    });

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
      chrome.storage.onChanged.addListener((changes) => {
        for (const [key, change] of Object.entries(changes)) {
          if (key in settingsRef.value) {
            (settingsRef.value as any)[key] = change.newValue;
          }
        }
        normalizeSettingsArrayFields(settingsRef.value);
      });
    }
  }

  const activeTab: Ref<TabId> = ref((readSessionKey(STORAGE_KEYS.ACTIVE_TAB) as TabId) || 'dictionary');
  const activeIntent: Ref<AiIntentId> = ref((readSessionKey(STORAGE_KEYS.ACTIVE_INTENT) as AiIntentId) || 'explain_in_context');
  const recentQueries: Ref<string[]> = ref(readRecentQueries());

  function readSessionKey(key: string): string | null {
    try {
      return sessionStorage.getItem(key) || localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  function writeSessionKey(key: string, value: string): void {
    try {
      sessionStorage.setItem(key, value);
      localStorage.setItem(key, value);
    } catch (e) {
      console.warn('Storage write failed:', e);
    }
  }

  function readRecentQueries(): string[] {
    try {
      const raw = readSessionKey(STORAGE_KEYS.RECENT_QUERIES);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  function addRecentQuery(word: string): void {
    const trimmed = word.trim().toLowerCase();
    if (!trimmed) return;
    const filtered = recentQueries.value.filter(q => q.toLowerCase() !== trimmed);
    const updated = [trimmed, ...filtered].slice(0, 6);
    recentQueries.value = updated;
    writeSessionKey(STORAGE_KEYS.RECENT_QUERIES, JSON.stringify(updated));
  }

  watch(activeTab, (newTab) => {
    writeSessionKey(STORAGE_KEYS.ACTIVE_TAB, newTab);
  });

  watch(activeIntent, (newIntent) => {
    writeSessionKey(STORAGE_KEYS.ACTIVE_INTENT, newIntent);
  });

  return {
    settings: settingsRef,
    saveSettings: saveSettingsToStorage,
    activeTab,
    activeIntent,
    recentQueries,
    addRecentQuery,
    readSessionKey,
    writeSessionKey,
  };
}
