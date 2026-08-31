import { ref } from 'vue';
import { useStorage } from './composable.storage';
import { cancelDictionaryLookup, createRequestId, requestDictionaryLookup, subscribeLookupUpdates } from '../shared/runtime-client';
import { AppSettings, DictionaryEntry, PracticeResult } from '../types';

const query = ref<string>('');
const result = ref<DictionaryEntry | null>(null);
const isLoading = ref<boolean>(false);
const error = ref<string | null>(null);
const practiceResult = ref<PracticeResult | null>(null);
const isPracticing = ref<boolean>(false);

export const isAudioPlaying = ref<boolean>(false);
export const playingKey = ref<string | null>(null);

let activeDictRequestId: string | null = null;
let currentAudioElement: HTMLAudioElement | null = null;
let activeRecognition: { stop: () => void; abort?: () => void } | null = null;
let speechStartTimer: ReturnType<typeof setTimeout> | null = null;
let lookupGeneration = 0;
let playGeneration = 0;
const practiceResults = new Map<string, PracticeResult>();

const MAX_DICT_CACHE_SIZE = 100;
const DICT_CACHE_TTL_MS = 10 * 60 * 1000;
const DICT_SESSION_CACHE_KEY = 'dict_lookup_cache_v1';

interface DictCacheEntry {
  value: DictionaryEntry;
  createdAt: number;
}

const dictCacheMap = new Map<string, DictCacheEntry>();
const dictPendingMap = new Map<string, Promise<DictionaryEntry>>();
const dictPendingRequestIds = new Map<string, string>();
let dictSessionHydrated = false;

function canUseSessionCache(): boolean {
  try {
    return typeof chrome !== 'undefined'
      && typeof chrome.storage?.session?.get === 'function'
      && typeof window !== 'undefined'
      && window.location?.protocol === 'chrome-extension:';
  } catch {
    return false;
  }
}

function pruneDictCache() {
  const now = Date.now();
  for (const [key, entry] of dictCacheMap.entries()) {
    if (now - entry.createdAt > DICT_CACHE_TTL_MS) dictCacheMap.delete(key);
  }
  while (dictCacheMap.size > MAX_DICT_CACHE_SIZE) {
    const oldestKey = dictCacheMap.keys().next().value;
    if (!oldestKey) break;
    dictCacheMap.delete(oldestKey);
  }
}

function persistDictCache() {
  if (!canUseSessionCache()) return;
  pruneDictCache();
  const snapshot: Record<string, DictCacheEntry> = {};
  for (const [key, entry] of dictCacheMap.entries()) snapshot[key] = entry;
  void Promise.resolve(chrome.storage.session.set({ [DICT_SESSION_CACHE_KEY]: snapshot })).catch(() => undefined);
}

function hydrateDictCacheFromSession() {
  if (dictSessionHydrated || !canUseSessionCache()) {
    dictSessionHydrated = true;
    return;
  }
  dictSessionHydrated = true;
  void Promise.resolve(chrome.storage.session.get(DICT_SESSION_CACHE_KEY))
    .then((stored) => {
      const snapshot = (stored as Record<string, Record<string, DictCacheEntry> | undefined>)?.[DICT_SESSION_CACHE_KEY];
      if (!snapshot || typeof snapshot !== 'object') return;
      const now = Date.now();
      for (const [key, entry] of Object.entries(snapshot)) {
        if (!entry?.value || now - entry.createdAt > DICT_CACHE_TTL_MS) continue;
        if (!dictCacheMap.has(key)) dictCacheMap.set(key, entry);
      }
      pruneDictCache();
    })
    .catch(() => undefined);
}

hydrateDictCacheFromSession();

function getDictCacheKey(word: string, settings: AppSettings, provider: string, lang: string): string {
  return JSON.stringify({
    word: word.toLowerCase().trim(),
    provider: provider.toLowerCase(),
    lang: lang.toLowerCase(),
    enableTranslate: Boolean(settings.enableTranslate),
    enableDictionary: Boolean(settings.enableDictionary),
    enablePhraseFallback: Boolean(settings.enablePhraseFallback),
    enableLexicalProfile: settings.enableLexicalProfile !== false,
    translateProvider: settings.translateProvider || '',
  });
}

function readDictCache(key: string): DictionaryEntry | undefined {
  const entry = dictCacheMap.get(key);
  if (!entry) return undefined;
  if (Date.now() - entry.createdAt > DICT_CACHE_TTL_MS) {
    dictCacheMap.delete(key);
    return undefined;
  }
  dictCacheMap.delete(key);
  dictCacheMap.set(key, entry);
  return entry.value;
}

function writeDictCache(key: string, value: DictionaryEntry) {
  dictCacheMap.delete(key);
  dictCacheMap.set(key, { value, createdAt: Date.now() });
  pruneDictCache();
  persistDictCache();
}

function practiceKey(text: string, language = 'en-US'): string {
  return `${String(text || '').trim().toLowerCase()}|${language.toLowerCase()}`;
}

function normalizeSpeechText(value: string): string {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9'\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function levenshteinDistance(a: string, b: string): number {
  const left = String(a || '');
  const right = String(b || '');
  if (left === right) return 0;
  if (!left.length) return right.length;
  if (!right.length) return left.length;
  const rows = left.length + 1;
  const cols = right.length + 1;
  const matrix = Array.from({ length: rows }, () => Array(cols).fill(0));
  for (let i = 0; i < rows; i += 1) matrix[i][0] = i;
  for (let j = 0; j < cols; j += 1) matrix[0][j] = j;
  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      const cost = left[i - 1] === right[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost,
      );
    }
  }
  return matrix[left.length][right.length];
}

function scorePractice(target: string, spoken: string): PracticeResult {
  const normTarget = normalizeSpeechText(target);
  const normSpoken = normalizeSpeechText(spoken);
  if (!normTarget) {
    return { score: 0, grade: 'retry', gradeLabel: 'Try again', spoken: '', details: [] };
  }
  if (!normSpoken) {
    return { score: 0, grade: 'retry', gradeLabel: 'Try again', spoken: '', details: [] };
  }

  const targetWords = normTarget.split(/\s+/).filter(Boolean);
  const spokenWords = normSpoken.split(/\s+/).filter(Boolean);
  const remaining = [...spokenWords];
  const details = targetWords.map((word) => {
    const idx = remaining.indexOf(word);
    if (idx >= 0) {
      remaining.splice(idx, 1);
      return { word, matched: true };
    }
    const closeMatch = spokenWords.some(
      (sw) => levenshteinDistance(word, sw) <= Math.max(1, Math.floor(word.length * 0.3)),
    );
    return { word, matched: false, closeMatch };
  });

  const matchedCount = details.filter((d) => d.matched).length;
  const wordScore = targetWords.length > 0
    ? Math.round((matchedCount / targetWords.length) * 100)
    : 0;
  const distance = levenshteinDistance(normTarget, normSpoken);
  const maxLength = Math.max(normTarget.length, normSpoken.length, 1);
  const charScore = Math.max(0, Math.round((1 - distance / maxLength) * 100));
  const score = Math.max(wordScore, charScore);
  const grade = score >= 90 ? 'excellent' : score >= 70 ? 'good' : score >= 50 ? 'almost' : 'retry';
  const gradeLabel = grade === 'excellent' ? 'Excellent' : grade === 'good' ? 'Good' : grade === 'almost' ? 'Almost there' : 'Try again';
  return { score, grade, gradeLabel, spoken: normSpoken, details };
}

function recognitionErrorMessage(errorType: string): string | null {
  if (errorType === 'not-allowed' || errorType === 'service-not-allowed') return 'Microphone permission denied.';
  if (errorType === 'no-speech') return 'No speech detected. Try again.';
  if (errorType === 'audio-capture') return 'No microphone found.';
  if (errorType === 'network') return 'Speech recognition network error.';
  if (errorType === 'aborted') return null;
  return 'Speech recognition failed.';
}

function getFreeTtsUrl(text: string, language = 'en-US'): string {
  const clean = String(text || '').trim();
  if (!clean) return '';
  const langCode = String(language || 'en-US').toLowerCase().startsWith('en-gb') ? 'en-GB' : 'en';
  return `https://translate.googleapis.com/translate_tts?client=gtx&ie=UTF-8&tl=${encodeURIComponent(langCode)}&q=${encodeURIComponent(clean)}`;
}

export function supportsSpeechPractice(): boolean {
  if (typeof window === 'undefined') return false;
  const win = window as Window & {
    SpeechRecognition?: unknown;
    webkitSpeechRecognition?: unknown;
  };
  return Boolean(win.SpeechRecognition || win.webkitSpeechRecognition);
}

export function stopAllAudio() {
  playGeneration += 1;
  isAudioPlaying.value = false;
  isPracticing.value = false;
  playingKey.value = null;
  if (speechStartTimer) {
    clearTimeout(speechStartTimer);
    speechStartTimer = null;
  }
  if (activeRecognition) {
    try { activeRecognition.abort?.() ?? activeRecognition.stop(); } catch { /* ignore */ }
    activeRecognition = null;
  }
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
  dictPendingMap.clear();
  dictPendingRequestIds.clear();
  if (canUseSessionCache()) {
    void Promise.resolve(chrome.storage.session.remove(DICT_SESSION_CACHE_KEY)).catch(() => undefined);
  }
}

export function abortActiveDictRequest() {
  stopAllAudio();
  lookupGeneration += 1;
  if (activeDictRequestId) {
    cancelDictionaryLookup(activeDictRequestId);
    activeDictRequestId = null;
  }
  dictPendingMap.clear();
  dictPendingRequestIds.clear();
  isLoading.value = false;
}

function maybePreloadAi(text: string, targetLang: string, context?: string) {
  void import('./composable.ai-assistant').then(({ useAiAssistant }) => {
    useAiAssistant().preloadIntents(text, context, targetLang);
  });
}

export function useDictionary() {
  const { settings } = useStorage();

  async function searchWord(wordToSearch: string, providerName?: string, targetLang?: string, context?: string) {
    if (!wordToSearch || !wordToSearch.trim()) return;

    stopAllAudio();
    void import('./composable.ai-assistant').then(({ cancelAiPreload }) => cancelAiPreload());

    const cleanWord = wordToSearch.trim();
    const provider = providerName || settings.value.dictionaryProvider || 'free_dictionary';
    const lang = targetLang || settings.value.translateTargetLanguage || 'Vietnamese';
    const lookupSettings = {
      ...settings.value,
      dictionaryProvider: provider as typeof settings.value.dictionaryProvider,
      translateTargetLanguage: lang,
    };
    const cacheKey = getDictCacheKey(cleanWord, lookupSettings, provider, lang);
    const pending = dictPendingMap.get(cacheKey);
    const reusedRequestId = pending ? dictPendingRequestIds.get(cacheKey) : undefined;

    if (!pending && activeDictRequestId) {
      cancelDictionaryLookup(activeDictRequestId);
      activeDictRequestId = null;
    }

    const generation = ++lookupGeneration;
    const requestId = reusedRequestId || createRequestId('dict');
    activeDictRequestId = requestId;

    query.value = cleanWord;
    error.value = null;
    practiceResult.value = practiceResults.get(practiceKey(cleanWord)) || null;

    const cached = readDictCache(cacheKey);
    result.value = cached || null;
    isLoading.value = !cached;
    if (cached) {
      maybePreloadAi(cleanWord, lang, context);
      if (cached.enriched) return;
    }

    let enrichmentTimeout: ReturnType<typeof setTimeout> | null = null;
    const unsubscribe = subscribeLookupUpdates((payload) => {
      if (generation !== lookupGeneration) return;
      if (payload.requestId !== requestId || payload.source !== 'dictionary') return;
      const enriched = payload.result as DictionaryEntry;
      if ((result.value?.revision || 0) > (enriched.revision || 0)) return;
      result.value = enriched;
      isLoading.value = false;
      writeDictCache(cacheKey, enriched);
      if (enriched.enriched) {
        if (enrichmentTimeout) clearTimeout(enrichmentTimeout);
        unsubscribe();
      }
    });

    const request = pending || requestDictionaryLookup({
      text: cleanWord,
      context,
      provider,
      targetLang: lang,
      requestId,
    });
    if (!pending) {
      dictPendingMap.set(cacheKey, request);
      dictPendingRequestIds.set(cacheKey, requestId);
    }

    try {
      const data = await request;
      if (generation !== lookupGeneration) return;
      if ((result.value?.revision || 0) < (data.revision || 0) || !result.value) {
        result.value = data;
        writeDictCache(cacheKey, data);
      } else if (!cached) {
        writeDictCache(cacheKey, result.value);
      }
      maybePreloadAi(cleanWord, lang, context);
    } catch (err: unknown) {
      if (err instanceof Error && (/abort/i.test(err.message) || err.name === 'AbortError')) {
        return;
      }
      if (generation !== lookupGeneration) return;
      const message = err instanceof Error ? err.message : 'Không tìm thấy dữ liệu từ điển.';
      error.value = /Extension context invalidated|runtime is unavailable/i.test(message)
        ? 'Extension was reloaded. Refresh this page and try again.'
        : message;
      result.value = null;
    } finally {
      if (generation === lookupGeneration) {
        dictPendingMap.delete(cacheKey);
        dictPendingRequestIds.delete(cacheKey);
        isLoading.value = false;
        if (activeDictRequestId === requestId) activeDictRequestId = null;
      }
    }

    enrichmentTimeout = setTimeout(() => {
      if (generation === lookupGeneration) unsubscribe();
    }, 20000);
  }

  function playPronunciation(options: { text?: string; audioUrl?: string; language?: string; key?: string }) {
    const language = options.language || 'en-US';
    const accent = language.toLowerCase().includes('gb') ? 'uk' : 'us';
    const key = options.key || language;
    void playAudio(options.audioUrl, options.text, accent, language, key);
  }

  function startSpeechPractice(text = query.value, language = 'en-US') {
    stopAllAudio();
    type RecognitionLike = {
      lang: string;
      interimResults: boolean;
      maxAlternatives: number;
      continuous?: boolean;
      onresult: ((event: { results?: ArrayLike<ArrayLike<{ transcript?: string }>> }) => void) | null;
      onerror: ((event: { error?: string }) => void) | null;
      onend: (() => void) | null;
      start: () => void;
      stop: () => void;
      abort?: () => void;
    };
    const SpeechRecognitionCtor = (window as Window & {
      SpeechRecognition?: new () => RecognitionLike;
      webkitSpeechRecognition?: new () => RecognitionLike;
    }).SpeechRecognition || (window as Window & { webkitSpeechRecognition?: new () => RecognitionLike }).webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) {
      practiceResult.value = { score: 0, grade: 'retry', gradeLabel: 'Practice needs Chrome speech recognition.' };
      return;
    }
    const recognition = new SpeechRecognitionCtor();
    recognition.lang = language;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.continuous = false;
    isPracticing.value = true;
    playingKey.value = 'practice';
    recognition.onresult = (event) => {
      const spoken = event.results?.[0]?.[0]?.transcript || '';
      const scored = scorePractice(text, spoken);
      practiceResult.value = scored;
      practiceResults.set(practiceKey(text, language), scored);
      isPracticing.value = false;
      playingKey.value = null;
      activeRecognition = null;
    };
    recognition.onerror = (event) => {
      const message = recognitionErrorMessage(String(event?.error || ''));
      isPracticing.value = false;
      playingKey.value = null;
      activeRecognition = null;
      if (message) {
        practiceResult.value = { score: 0, grade: 'retry', gradeLabel: message };
      }
    };
    recognition.onend = () => {
      isPracticing.value = false;
      if (playingKey.value === 'practice') playingKey.value = null;
      activeRecognition = null;
    };
    activeRecognition = recognition;
    try {
      recognition.start();
    } catch {
      isPracticing.value = false;
      playingKey.value = null;
      activeRecognition = null;
      practiceResult.value = { score: 0, grade: 'retry', gradeLabel: 'Unable to start speech recognition.' };
    }
  }

  function playAudioClip(url: string, rate = 1): Promise<boolean> {
    return new Promise((resolve) => {
      const clip = new Audio(url);
      currentAudioElement = clip;
      clip.playbackRate = Number.isFinite(rate) && rate > 0 ? rate : 1;
      let settled = false;
      const finish = (ok: boolean) => {
        if (settled) return;
        settled = true;
        if (currentAudioElement === clip) currentAudioElement = null;
        resolve(ok);
      };
      clip.addEventListener('ended', () => finish(true), { once: true });
      clip.addEventListener('error', () => finish(false), { once: true });
      clip.play().catch(() => finish(false));
    });
  }

  async function playAudio(
    audioUrl?: string,
    fallbackWord?: string,
    accent: 'uk' | 'us' = 'us',
    language = accent === 'uk' ? 'en-GB' : 'en-US',
    key = language,
  ) {
    stopAllAudio();
    const generation = ++playGeneration;
    const text = String(fallbackWord || query.value || '').trim();
    playingKey.value = key;
    isAudioPlaying.value = true;

    const isCurrent = () => generation === playGeneration;

    const finish = () => {
      if (!isCurrent()) return;
      if (playingKey.value === key) {
        playingKey.value = null;
        isAudioPlaying.value = false;
      }
    };

    const cleanAudioUrl = String(audioUrl || '').trim();
    if (cleanAudioUrl) {
      const played = await playAudioClip(cleanAudioUrl);
      if (!isCurrent()) return;
      if (played) {
        finish();
        return;
      }
    }

    const googleTtsUrl = getFreeTtsUrl(text, language);
    if (googleTtsUrl && typeof navigator !== 'undefined' && navigator.onLine !== false) {
      const playedGoogle = await playAudioClip(googleTtsUrl);
      if (!isCurrent()) return;
      if (playedGoogle) {
        finish();
        return;
      }
    }

    if (!isCurrent()) return;
    speakTTS(text, accent, key);
  }

  function speakTTS(text: string, accent: 'uk' | 'us' = 'us', key?: string) {
    if (speechStartTimer) {
      clearTimeout(speechStartTimer);
      speechStartTimer = null;
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
    if (!text || typeof window === 'undefined' || !('speechSynthesis' in window)) {
      isAudioPlaying.value = false;
      playingKey.value = null;
      return;
    }

    const playKey = key || playingKey.value || (accent === 'uk' ? 'en-GB' : 'en-US');
    playingKey.value = playKey;
    isAudioPlaying.value = true;

    if (typeof window.speechSynthesis.cancel === 'function') {
      window.speechSynthesis.cancel();
    }

    speechStartTimer = setTimeout(() => {
      speechStartTimer = null;
      try {
        if (window.speechSynthesis.paused) window.speechSynthesis.resume();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = accent === 'uk' ? 'en-GB' : 'en-US';
        utterance.rate = settings.value.pronunciationRate || 0.95;
        if (settings.value.pronunciationVoiceURI) {
          const voices = window.speechSynthesis.getVoices();
          const match = voices.find((v) => v.voiceURI === settings.value.pronunciationVoiceURI);
          if (match) utterance.voice = match;
        }
        utterance.onstart = () => {
          isAudioPlaying.value = true;
          playingKey.value = playKey;
        };
        utterance.onend = () => {
          if (playingKey.value === playKey) {
            playingKey.value = null;
            isAudioPlaying.value = false;
          }
        };
        utterance.onerror = () => {
          if (playingKey.value === playKey) {
            playingKey.value = null;
            isAudioPlaying.value = false;
          }
        };
        window.speechSynthesis.speak(utterance);
        if (window.speechSynthesis.paused) window.speechSynthesis.resume();
      } catch {
        playingKey.value = null;
        isAudioPlaying.value = false;
      }
    }, 60);
  }

  return {
    query,
    result,
    isLoading,
    error,
    isAudioPlaying,
    playingKey,
    searchWord,
    playAudio,
    playPronunciation,
    speakTTS,
    startSpeechPractice,
    practiceResult,
    isPracticing,
    supportsSpeechPractice: supportsSpeechPractice(),
    stopAllAudio,
    abortActiveDictRequest,
    clearDictionaryCache,
  };
}
