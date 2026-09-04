import { signal, useSignal } from '../ui/signal';
import { registerCacheInvalidator, settingsStore, whenSettingsReady } from './composable.storage';
import {
  cancelDictionaryLookup,
  createRequestId,
  startDictionaryLookup,
  subscribeLookupUpdates,
} from '../shared/dictionary-lookup-client';
import { createPersistedLruCache } from '../shared/lookup-cache';
import { AppSettings, DictionaryEntry, PracticeResult } from '../types';

const queryRef = signal<string>('');
const resultRef = signal<DictionaryEntry | null>(null);
const isLoadingRef = signal<boolean>(false);
const errorRef = signal<string | null>(null);
const practiceResultRef = signal<PracticeResult | null>(null);
const isPracticingRef = signal<boolean>(false);

export const isAudioPlayingRef = signal<boolean>(false);
export const playingKeyRef = signal<string | null>(null);

let activeDictRequestId: string | null = null;
let currentAudioElement: HTMLAudioElement | null = null;
let activeRecognition: { stop: () => void; abort?: () => void } | null = null;
let speechStartTimer: ReturnType<typeof setTimeout> | null = null;
let lookupGeneration = 0;
let playGeneration = 0;
const practiceResults = new Map<string, PracticeResult>();

const MAX_DICT_CACHE_SIZE = 200;
const DICT_CACHE_TTL_MS = 48 * 60 * 60 * 1000; // 48 hours
const DICT_STORAGE_KEY = 'dict_lookup_cache_v2';

const dictCache = createPersistedLruCache<DictionaryEntry>({
  maxSize: MAX_DICT_CACHE_SIZE,
  ttlMs: DICT_CACHE_TTL_MS,
  storageKey: DICT_STORAGE_KEY,
  persistDelayMs: 300,
});

const dictPendingMap = new Map<string, Promise<DictionaryEntry>>();
const dictPendingRequestIds = new Map<string, string>();

function getDictCacheKey(word: string, settings: AppSettings, provider: string, lang: string): string {
  return `${word.toLowerCase().trim()}|${provider.toLowerCase()}|${lang.toLowerCase()}|${settings.translateProvider || ''}|${Boolean(settings.enableTranslate)}|${Boolean(settings.enableDictionary)}|${Boolean(settings.enablePhraseFallback)}|${settings.enableLexicalProfile !== false}`;
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

  let prev = new Array<number>(right.length + 1);
  let curr = new Array<number>(right.length + 1);
  for (let j = 0; j <= right.length; j += 1) prev[j] = j;
  for (let i = 1; i <= left.length; i += 1) {
    curr[0] = i;
    for (let j = 1; j <= right.length; j += 1) {
      const cost = left.charCodeAt(i - 1) === right.charCodeAt(j - 1) ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    const swap = prev;
    prev = curr;
    curr = swap;
  }
  return prev[right.length];
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
  isAudioPlayingRef.value = false;
  isPracticingRef.value = false;
  playingKeyRef.value = null;
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
  dictCache.clear();
  dictPendingMap.clear();
  dictPendingRequestIds.clear();
}

registerCacheInvalidator(clearDictionaryCache);

let dictPreloadGeneration = 0;
let aiPreloadTimer: ReturnType<typeof setTimeout> | null = null;
const AI_PRELOAD_DEBOUNCE_MS = 600;

export function abortActiveDictRequest() {
  stopAllAudio();
  lookupGeneration += 1;
  dictPreloadGeneration += 1;
  if (aiPreloadTimer) {
    clearTimeout(aiPreloadTimer);
    aiPreloadTimer = null;
  }
  if (activeDictRequestId) {
    cancelDictionaryLookup(activeDictRequestId);
    activeDictRequestId = null;
  }
  dictPendingMap.clear();
  dictPendingRequestIds.clear();
  isLoadingRef.value = false;
}

function maybePreloadAi(text: string, targetLang: string, context?: string, generation = dictPreloadGeneration) {
  if (aiPreloadTimer) {
    clearTimeout(aiPreloadTimer);
    aiPreloadTimer = null;
  }
  aiPreloadTimer = setTimeout(() => {
    aiPreloadTimer = null;
    void (async () => {
      await whenSettingsReady();
      if (generation !== dictPreloadGeneration) return;
      const { getAiAssistantStore } = await import('./composable.ai-assistant');
      if (generation !== dictPreloadGeneration) return;
      await getAiAssistantStore().preloadIntents(text, context, targetLang);
    })();
  }, AI_PRELOAD_DEBOUNCE_MS);
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

export function speakTTS(text: string, accent: 'uk' | 'us' = 'us', key?: string) {
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
    isAudioPlayingRef.value = false;
    playingKeyRef.value = null;
    return;
  }

  const playKey = key || playingKeyRef.value || (accent === 'uk' ? 'en-GB' : 'en-US');
  playingKeyRef.value = playKey;
  isAudioPlayingRef.value = true;

  if (typeof window.speechSynthesis.cancel === 'function') {
    window.speechSynthesis.cancel();
  }

  const settings = settingsStore.value;
  speechStartTimer = setTimeout(() => {
    speechStartTimer = null;
    try {
      if (window.speechSynthesis.paused) window.speechSynthesis.resume();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = accent === 'uk' ? 'en-GB' : 'en-US';
      utterance.rate = settings.pronunciationRate || 0.95;
      if (settings.pronunciationVoiceURI) {
        const voices = window.speechSynthesis.getVoices();
        const match = voices.find((v) => v.voiceURI === settings.pronunciationVoiceURI);
        if (match) utterance.voice = match;
      }
      utterance.onstart = () => {
        isAudioPlayingRef.value = true;
        playingKeyRef.value = playKey;
      };
      utterance.onend = () => {
        if (playingKeyRef.value === playKey) {
          playingKeyRef.value = null;
          isAudioPlayingRef.value = false;
        }
      };
      utterance.onerror = () => {
        if (playingKeyRef.value === playKey) {
          playingKeyRef.value = null;
          isAudioPlayingRef.value = false;
        }
      };
      window.speechSynthesis.speak(utterance);
      if (window.speechSynthesis.paused) window.speechSynthesis.resume();
    } catch {
      playingKeyRef.value = null;
      isAudioPlayingRef.value = false;
    }
  }, 60);
}

export async function playAudio(
  audioUrl?: string,
  fallbackWord?: string,
  accent: 'uk' | 'us' = 'us',
  language = accent === 'uk' ? 'en-GB' : 'en-US',
  key = language,
) {
  stopAllAudio();
  const generation = ++playGeneration;
  const text = String(fallbackWord || queryRef.value || '').trim();
  playingKeyRef.value = key;
  isAudioPlayingRef.value = true;

  const isCurrent = () => generation === playGeneration;

  const finish = () => {
    if (!isCurrent()) return;
    if (playingKeyRef.value === key) {
      playingKeyRef.value = null;
      isAudioPlayingRef.value = false;
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

export function playPronunciation(options: { text?: string; audioUrl?: string; language?: string; key?: string }) {
  const language = options.language || 'en-US';
  const accent = language.toLowerCase().includes('gb') ? 'uk' : 'us';
  const key = options.key || language;
  void playAudio(options.audioUrl, options.text, accent, language, key);
}

export function startSpeechPractice(text = queryRef.value, language = 'en-US') {
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
    practiceResultRef.value = { score: 0, grade: 'retry', gradeLabel: 'Practice needs Chrome speech recognition.' };
    return;
  }
  const recognition = new SpeechRecognitionCtor();
  recognition.lang = language;
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  recognition.continuous = false;
  isPracticingRef.value = true;
  playingKeyRef.value = 'practice';
  recognition.onresult = (event) => {
    const spoken = event.results?.[0]?.[0]?.transcript || '';
    const scored = scorePractice(text, spoken);
    practiceResultRef.value = scored;
    practiceResults.set(practiceKey(text, language), scored);
    isPracticingRef.value = false;
    playingKeyRef.value = null;
    activeRecognition = null;
  };
  recognition.onerror = (event) => {
    const message = recognitionErrorMessage(String(event?.error || ''));
    isPracticingRef.value = false;
    playingKeyRef.value = null;
    activeRecognition = null;
    if (message) {
      practiceResultRef.value = { score: 0, grade: 'retry', gradeLabel: message };
    }
  };
  recognition.onend = () => {
    isPracticingRef.value = false;
    if (playingKeyRef.value === 'practice') playingKeyRef.value = null;
    activeRecognition = null;
  };
  activeRecognition = recognition;
  try {
    recognition.start();
  } catch {
    isPracticingRef.value = false;
    playingKeyRef.value = null;
    activeRecognition = null;
    practiceResultRef.value = { score: 0, grade: 'retry', gradeLabel: 'Unable to start speech recognition.' };
  }
}

export async function searchWord(
  wordToSearch: string,
  providerName?: string,
  targetLang?: string,
  context?: string,
  attachedRequestId?: string,
) {
  if (!wordToSearch || !wordToSearch.trim()) return;

  stopAllAudio();
  dictPreloadGeneration += 1;
  const preloadGeneration = dictPreloadGeneration;
  void import('./composable.ai-assistant')
    .then(({ cancelAiPreload }) => cancelAiPreload())
    .catch(() => undefined);

  const cleanWord = wordToSearch.trim();
  const settings = settingsStore.value;
  const provider = providerName || settings.dictionaryProvider || 'free_dictionary';
  const lang = targetLang || settings.translateTargetLanguage || 'Vietnamese';
  maybePreloadAi(cleanWord, lang, context, preloadGeneration);
  const lookupSettings = {
    ...settings,
    dictionaryProvider: provider as typeof settings.dictionaryProvider,
    translateTargetLanguage: lang,
  };
  const cacheKey = getDictCacheKey(cleanWord, lookupSettings, provider, lang);
  const pending = dictPendingMap.get(cacheKey);
  const reusedRequestId = attachedRequestId || (pending ? dictPendingRequestIds.get(cacheKey) : undefined);

  if (!pending && !attachedRequestId && activeDictRequestId) {
    cancelDictionaryLookup(activeDictRequestId);
    activeDictRequestId = null;
  }

  const generation = ++lookupGeneration;
  const requestId = reusedRequestId || createRequestId('dict');
  activeDictRequestId = requestId;

  queryRef.value = cleanWord;
  errorRef.value = null;
  practiceResultRef.value = practiceResults.get(practiceKey(cleanWord)) || null;

  const cached = dictCache.read(cacheKey);
  resultRef.value = cached || null;
  isLoadingRef.value = !cached;
  if (cached?.enriched && !attachedRequestId) return;

  let enrichmentTimeout: ReturnType<typeof setTimeout> | null = null;
  let pendingUpdate: DictionaryEntry | null = null;
  let updateFrame = 0;
  const flushUpdate = () => {
    updateFrame = 0;
    if (!pendingUpdate) return;
    const enriched = pendingUpdate;
    pendingUpdate = null;
    if ((resultRef.value?.revision || 0) > (enriched.revision || 0)) return;
    resultRef.value = enriched;
    isLoadingRef.value = false;
    dictCache.write(cacheKey, enriched);
    if (enriched.enriched) {
      if (enrichmentTimeout) clearTimeout(enrichmentTimeout);
      unsubscribe();
    }
  };
  const unsubscribe = subscribeLookupUpdates((payload) => {
    if (generation !== lookupGeneration) return;
    if (payload.requestId !== requestId || payload.source !== 'dictionary') return;
    const enriched = payload.result as DictionaryEntry;
    if ((resultRef.value?.revision || 0) > (enriched.revision || 0)) return;
    pendingUpdate = enriched;
    if (typeof requestAnimationFrame === 'function') {
      if (!updateFrame) updateFrame = requestAnimationFrame(flushUpdate);
    } else {
      flushUpdate();
    }
  });

  const request = pending || startDictionaryLookup({
    text: cleanWord,
    context,
    ...(attachedRequestId ? {} : { provider, targetLang: lang }),
    requestId,
  });
  if (!pending) {
    dictPendingMap.set(cacheKey, request);
    dictPendingRequestIds.set(cacheKey, requestId);
  }

  try {
    const data = await request;
    if (generation !== lookupGeneration) return;
    if ((resultRef.value?.revision || 0) < (data.revision || 0) || !resultRef.value) {
      resultRef.value = data;
      dictCache.write(cacheKey, data);
    } else if (!cached) {
      dictCache.write(cacheKey, resultRef.value);
    }
  } catch (err: unknown) {
    if (err instanceof Error && (/abort/i.test(err.message) || err.name === 'AbortError')) {
      return;
    }
    if (generation !== lookupGeneration) return;
    const message = err instanceof Error ? err.message : 'Không tìm thấy dữ liệu từ điển.';
    errorRef.value = /Extension context invalidated|runtime is unavailable/i.test(message)
      ? 'Extension was reloaded. Refresh this page and try again.'
      : message;
    resultRef.value = null;
  } finally {
    if (generation === lookupGeneration) {
      dictPendingMap.delete(cacheKey);
      dictPendingRequestIds.delete(cacheKey);
      isLoadingRef.value = false;
      if (activeDictRequestId === requestId) activeDictRequestId = null;
    }
  }

  enrichmentTimeout = setTimeout(() => {
    if (generation === lookupGeneration) unsubscribe();
  }, 20000);
}

export function useDictionaryResult() {
  const result = useSignal(resultRef);
  const isLoading = useSignal(isLoadingRef);
  const error = useSignal(errorRef);
  return { result, isLoading, error };
}

export function useDictionaryAudio() {
  const isAudioPlaying = useSignal(isAudioPlayingRef);
  const playingKey = useSignal(playingKeyRef);
  return {
    isAudioPlaying,
    playingKey,
    playAudio,
    playPronunciation,
    speakTTS,
    stopAllAudio,
  };
}

export function useDictionaryPractice() {
  const practiceResult = useSignal(practiceResultRef);
  const isPracticing = useSignal(isPracticingRef);
  return {
    practiceResult,
    isPracticing,
    startSpeechPractice,
    supportsSpeechPractice: supportsSpeechPractice(),
  };
}

export function useDictionaryQuery() {
  return useSignal(queryRef);
}
