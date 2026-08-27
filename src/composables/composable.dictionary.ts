import { ref } from 'vue';
import { fetchDictionaryResult } from '../providers/provider.index';
import { useStorage } from './composable.storage';
import { DictionaryEntry } from '../types';

const query = ref<string>('');
const result = ref<DictionaryEntry | null>(null);
const isLoading = ref<boolean>(false);
const error = ref<string | null>(null);

let activeDictController: AbortController | null = null;
let currentAudioElement: HTMLAudioElement | null = null;

// High-performance LRU Cache for Dictionary Lookups
const MAX_DICT_CACHE_SIZE = 100;
const dictCacheMap = new Map<string, DictionaryEntry>();

function getDictCacheKey(word: string, provider: string, lang: string): string {
  return `${provider.toLowerCase()}:${lang.toLowerCase()}:${word.toLowerCase().trim()}`;
}

export function stopAllAudio() {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
  if (currentAudioElement) {
    try {
      currentAudioElement.pause();
      currentAudioElement.currentTime = 0;
    } catch {
      // Ignore audio pause error
    }
    currentAudioElement = null;
  }
}

export function clearDictionaryCache() {
  dictCacheMap.clear();
}

export function abortActiveDictRequest() {
  stopAllAudio();
  if (activeDictController) {
    activeDictController.abort();
    activeDictController = null;
  }
  isLoading.value = false;
}

export function useDictionary() {
  const { settings } = useStorage();

  async function searchWord(wordToSearch: string, providerName?: string, targetLang?: string) {
    if (!wordToSearch || !wordToSearch.trim()) return;

    abortActiveDictRequest();
    activeDictController = new AbortController();

    const cleanWord = wordToSearch.trim();
    query.value = cleanWord;
    error.value = null;

    const provider = providerName || settings.value.dictionaryProvider || 'free_dictionary';
    const lang = targetLang || settings.value.translateTargetLanguage || 'vi';
    const cacheKey = getDictCacheKey(cleanWord, provider, lang);

    // ⚡ Instant Cache Hit (0ms Response Time)
    if (dictCacheMap.has(cacheKey)) {
      result.value = dictCacheMap.get(cacheKey)!;
      isLoading.value = false;
      return;
    }

    isLoading.value = true;

    try {
      const data = await fetchDictionaryResult(cleanWord, provider, lang, activeDictController.signal);
      result.value = data;

      // Save entry to LRU Cache
      if (dictCacheMap.size >= MAX_DICT_CACHE_SIZE) {
        const oldestKey = dictCacheMap.keys().next().value;
        if (oldestKey) dictCacheMap.delete(oldestKey);
      }
      dictCacheMap.set(cacheKey, data);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      error.value = err instanceof Error ? err.message : 'Không tìm thấy dữ liệu từ điển.';
      result.value = null;
    } finally {
      isLoading.value = false;
      activeDictController = null;
    }
  }

  function playAudio(audioUrl?: string, fallbackWord?: string, accent: 'uk' | 'us' = 'us') {
    stopAllAudio();
    if (audioUrl) {
      currentAudioElement = new Audio(audioUrl);
      currentAudioElement.play().catch(() => speakTTS(fallbackWord || query.value, accent));
    } else {
      speakTTS(fallbackWord || query.value, accent);
    }
  }

  function speakTTS(text: string, accent: 'uk' | 'us' = 'us') {
    stopAllAudio();
    if (!text || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = accent === 'uk' ? 'en-GB' : 'en-US';
    utterance.rate = settings.value.pronunciationRate || 0.9;

    if (settings.value.pronunciationVoiceURI) {
      const voices = window.speechSynthesis.getVoices();
      const match = voices.find(v => v.voiceURI === settings.value.pronunciationVoiceURI);
      if (match) utterance.voice = match;
    }

    window.speechSynthesis.speak(utterance);
  }

  return {
    query,
    result,
    isLoading,
    error,
    searchWord,
    playAudio,
    speakTTS,
    stopAllAudio,
    abortActiveDictRequest,
    clearDictionaryCache,
  };
}
