import { signal, useSignal } from '../ui/signal';
import { registerCacheInvalidator, settingsStore, whenSettingsReady } from './composable.storage';
import {
  cancelDictionaryLookup,
  createRequestId,
  startDictionaryLookup,
  subscribeLookupUpdates,
} from '../shared/dictionary-lookup-client';
import { requestPlayAudio, requestSpeakTts, requestStopAudio } from '../shared/runtime-client';
import { toDictionaryEntry } from '../shared/enrichment';
import { GenerationGate } from '../shared/generation-gate';
import { AppSettings, DictionaryEntry } from '../types';
import {
  isPracticingRef,
  practiceResultRef,
  readPracticeResult,
  startSpeechPracticeSession,
  stopSpeechPractice,
  supportsSpeechPractice,
} from './dictionary-practice';
import { dictCache, dictPendingMap, dictPendingRequestIds, getDictCacheKey } from './dictionary-cache';

export { supportsSpeechPractice } from './dictionary-practice';

const queryRef = signal<string>('');
const resultRef = signal<DictionaryEntry | null>(null);
const isLoadingRef = signal<boolean>(false);
const isEnrichingRef = signal<boolean>(false);
const errorRef = signal<string | null>(null);
export const isAudioPlayingRef = signal<boolean>(false);
export const playingKeyRef = signal<string | null>(null);

let activeDictRequestId: string | null = null;
let currentAudioElement: HTMLAudioElement | null = null;
let speechStartTimer: ReturnType<typeof setTimeout> | null = null;
const lookupGeneration = new GenerationGate();
let playGeneration = 0;
let lookupUnsubscribe: (() => void) | null = null;
let activeLookupCleanup: (() => void) | null = null;
function getFreeTtsUrl(text: string, language = 'en-US'): string {
  const clean = String(text || '').trim();
  if (!clean) return '';
  const langCode = String(language || 'en-US').toLowerCase().startsWith('en-gb') ? 'en-GB' : 'en';
  return `https://translate.googleapis.com/translate_tts?client=gtx&ie=UTF-8&tl=${encodeURIComponent(langCode)}&q=${encodeURIComponent(clean)}`;
}

export function stopAllAudio() {
  playGeneration += 1;
  isAudioPlayingRef.value = false;
  stopSpeechPractice(playingKeyRef);
  playingKeyRef.value = null;
  requestStopAudio();
  if (speechStartTimer) {
    clearTimeout(speechStartTimer);
    speechStartTimer = null;
  }
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
  if (currentAudioElement) {
    try {
      currentAudioElement.pause();
      currentAudioElement.removeAttribute('src');
      currentAudioElement.load();
    } catch {
      // Ignore audio pause error
    }
    currentAudioElement = null;
  }
}

export function clearDictionaryCache() {
  abortActiveDictRequest();
  dictCache.clear();
  dictPendingMap.clear();
  dictPendingRequestIds.clear();
}

registerCacheInvalidator(clearDictionaryCache);

const dictPreloadGeneration = new GenerationGate();
let aiPreloadTimer: ReturnType<typeof setTimeout> | null = null;
const AI_PRELOAD_DEBOUNCE_MS = 600;

export function abortActiveDictRequest() {
  stopAllAudio();
  activeLookupCleanup?.();
  activeLookupCleanup = null;
  lookupGeneration.invalidate();
  lookupUnsubscribe = null;
  dictPreloadGeneration.invalidate();
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
  isEnrichingRef.value = false;
}

function maybePreloadAi(text: string, targetLang: string, context?: string, generation = dictPreloadGeneration.current()) {
  const settings = settingsStore.value;
  if (!settings.enableAI || !settings.preloadedAiIntents?.length) return;
  if (aiPreloadTimer) {
    clearTimeout(aiPreloadTimer);
    aiPreloadTimer = null;
  }
  aiPreloadTimer = setTimeout(() => {
    aiPreloadTimer = null;
    void (async () => {
      await whenSettingsReady();
      if (!dictPreloadGeneration.isCurrent(generation)) return;
      const next = settingsStore.value;
      if (!next.enableAI || !next.preloadedAiIntents?.length) return;
      const { getAiAssistantStore } = await import('./composable.ai-assistant');
      if (!dictPreloadGeneration.isCurrent(generation)) return;
      await getAiAssistantStore().preloadIntents(text, context, targetLang);
    })();
  }, AI_PRELOAD_DEBOUNCE_MS);
}

async function playAudioClip(url: string, rate = 1): Promise<boolean> {
  const offscreenPlayed = await requestPlayAudio({ url, rate });
  if (offscreenPlayed) return true;

  return new Promise((resolve) => {
    const clip = new Audio(url);
    currentAudioElement = clip;
    clip.playbackRate = Number.isFinite(rate) && rate > 0 ? rate : 1;
    let settled = false;

    const cleanup = () => {
      clip.removeEventListener('ended', onEnded);
      clip.removeEventListener('error', onError);
      if (currentAudioElement === clip) currentAudioElement = null;
    };

    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(ok);
    };

    const onEnded = () => finish(true);
    const onError = () => finish(false);

    clip.addEventListener('ended', onEnded, { once: true });
    clip.addEventListener('error', onError, { once: true });
    clip.play().catch(() => finish(false));
  });
}

export function speakTTS(text: string, accent: 'uk' | 'us' = 'us', key?: string) {
  const playKey = key || playingKeyRef.value || (accent === 'uk' ? 'en-GB' : 'en-US');
  const settings = settingsStore.value;
  playingKeyRef.value = playKey;
  isAudioPlayingRef.value = true;

  void requestSpeakTts({
    text,
    lang: accent === 'uk' ? 'en-GB' : 'en-US',
    rate: settings.pronunciationRate || 0.95,
    voiceURI: settings.pronunciationVoiceURI,
  }).then((ok) => {
    if (ok) {
      if (playingKeyRef.value === playKey) {
        playingKeyRef.value = null;
        isAudioPlayingRef.value = false;
      }
      return;
    }
    speakTtsLocal(text, accent, playKey);
  });
}

function speakTtsLocal(text: string, accent: 'uk' | 'us' = 'us', key?: string) {
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
  startSpeechPracticeSession(text, language, playingKeyRef);
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
  const preloadGeneration = dictPreloadGeneration.next();
  void import('./composable.ai-assistant')
    .then(({ cancelAiPreload }) => cancelAiPreload())
    .catch(() => undefined);

  const cleanWord = wordToSearch.trim();
  const settings = settingsStore.value;
  const provider = providerName || settings.dictionaryProvider || 'wiktionary';
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
  activeLookupCleanup?.();
  activeLookupCleanup = null;
  lookupUnsubscribe = null;

  const generation = lookupGeneration.next();
  const requestId = reusedRequestId || createRequestId('dict');
  activeDictRequestId = requestId;

  queryRef.value = cleanWord;
  errorRef.value = null;
  practiceResultRef.value = readPracticeResult(cleanWord) || null;

  const cachedRaw = dictCache.read(cacheKey);
  const cached = cachedRaw ? toDictionaryEntry(cachedRaw) : null;
  resultRef.value = cached;
  isLoadingRef.value = !cached;
  isEnrichingRef.value = Boolean(cached) && !cached?.enriched;
  if (cached?.enriched && !attachedRequestId) {
    isEnrichingRef.value = false;
    return;
  }

  let enrichmentTimeout: ReturnType<typeof setTimeout> | null = null;
  let pendingUpdate: DictionaryEntry | null = null;
  let updateFrame = 0;
  let lookupClosed = false;
  const flushUpdate = () => {
    updateFrame = 0;
    if (!lookupGeneration.isCurrent(generation)) {
      pendingUpdate = null;
      return;
    }
    if (!pendingUpdate) return;
    const enriched = pendingUpdate;
    pendingUpdate = null;
    if ((resultRef.value?.revision || 0) > (enriched.revision || 0)) return;
    resultRef.value = enriched;
    isLoadingRef.value = false;
    isEnrichingRef.value = !enriched.enriched;
    dictCache.write(cacheKey, enriched);
    if (enriched.enriched) {
      isEnrichingRef.value = false;
      cleanupLookup();
    }
  };
  const unsubscribe = subscribeLookupUpdates((payload) => {
    if (!lookupGeneration.isCurrent(generation)) return;
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
  const cleanupLookup = () => {
    if (lookupClosed) return;
    lookupClosed = true;
    if (enrichmentTimeout) {
      clearTimeout(enrichmentTimeout);
      enrichmentTimeout = null;
    }
    if (updateFrame) {
      cancelAnimationFrame(updateFrame);
      updateFrame = 0;
    }
    pendingUpdate = null;
    unsubscribe();
    if (lookupUnsubscribe === unsubscribe) lookupUnsubscribe = null;
    if (activeLookupCleanup === cleanupLookup) activeLookupCleanup = null;
  };
  activeLookupCleanup = cleanupLookup;
  lookupUnsubscribe = unsubscribe;

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
    if (!lookupGeneration.isCurrent(generation)) return;
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
    if (!lookupGeneration.isCurrent(generation)) return;
    const message = err instanceof Error ? err.message : 'Không tìm thấy dữ liệu từ điển.';
    errorRef.value = /Extension context invalidated|runtime is unavailable/i.test(message)
      ? 'Extension was reloaded. Refresh this page and try again.'
      : message;
    resultRef.value = null;
  } finally {
    if (lookupGeneration.isCurrent(generation)) {
      dictPendingMap.delete(cacheKey);
      dictPendingRequestIds.delete(cacheKey);
      isLoadingRef.value = false;
      if (!resultRef.value || resultRef.value.enriched) isEnrichingRef.value = false;
      else isEnrichingRef.value = true;
      if (activeDictRequestId === requestId) activeDictRequestId = null;
    }
  }

  if (!lookupClosed) {
    enrichmentTimeout = setTimeout(() => {
      if (lookupGeneration.isCurrent(generation)) {
        isEnrichingRef.value = false;
        cleanupLookup();
      }
    }, 20000);
  }
}

export function useDictionaryResult() {
  const result = useSignal(resultRef);
  const isLoading = useSignal(isLoadingRef);
  const isEnriching = useSignal(isEnrichingRef);
  const error = useSignal(errorRef);
  return { result, isLoading, isEnriching, error };
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
