import { signal, useSignal } from '../ui/signal';
import { registerCacheInvalidator, settingsStore } from './composable.storage';
import {
  cancelDictionaryLookup,
  createRequestId,
  startDictionaryLookup,
  subscribeLookupUpdates,
} from '../shared/dictionary-lookup-client';
import { toDictionaryEntry } from '../shared/enrichment';
import { GenerationGate } from '../shared/generation-gate';
import { AppSettings, DictionaryEntry } from '../types';
import { aiPreloadGeneration, cancelAiPreload, scheduleAiPreload } from './dictionary-preload';
import {
  isAudioPlayingRef,
  playAudio as playAudioFromAudio,
  playingKeyRef,
  speakTTS,
  startSpeechPractice as startAudioPractice,
  stopAllAudio,
} from './dictionary-audio';
import {
  isPracticingRef,
  practiceResultRef,
  readPracticeResult,
  supportsSpeechPractice,
} from './dictionary-practice';
import { dictCache, dictPendingMap, dictPendingRequestIds, getDictCacheKey } from './dictionary-cache';

export { supportsSpeechPractice } from './dictionary-practice';

const queryRef = signal<string>('');
const resultRef = signal<DictionaryEntry | null>(null);
const isLoadingRef = signal<boolean>(false);
const isEnrichingRef = signal<boolean>(false);
const errorRef = signal<string | null>(null);
export {
  isAudioPlayingRef,
  playingKeyRef,
  speakTTS,
  stopAllAudio,
} from './dictionary-audio';

let activeDictRequestId: string | null = null;
const lookupGeneration = new GenerationGate();
let lookupUnsubscribe: (() => void) | null = null;
let activeLookupCleanup: (() => void) | null = null;
export function clearDictionaryCache() {
  abortActiveDictRequest();
  dictCache.clear();
  dictPendingMap.clear();
  dictPendingRequestIds.clear();
}

registerCacheInvalidator(clearDictionaryCache);

export function abortActiveDictRequest() {
  stopAllAudio();
  activeLookupCleanup?.();
  activeLookupCleanup = null;
  lookupGeneration.invalidate();
  lookupUnsubscribe = null;
  cancelAiPreload();
  if (activeDictRequestId) {
    cancelDictionaryLookup(activeDictRequestId);
    activeDictRequestId = null;
  }
  dictPendingMap.clear();
  dictPendingRequestIds.clear();
  isLoadingRef.value = false;
  isEnrichingRef.value = false;
}

export function startSpeechPractice(text = queryRef.value, language = 'en-US') {
  startAudioPractice(text, language);
}

export function playAudio(
  audioUrl?: string,
  fallbackWord?: string,
  accent: 'uk' | 'us' = 'us',
  language = accent === 'uk' ? 'en-GB' : 'en-US',
  key = language,
) {
  return playAudioFromAudio(audioUrl, fallbackWord || queryRef.value, accent, language, key);
}

export function playPronunciation(options: { text?: string; audioUrl?: string; language?: string; key?: string }) {
  const language = options.language || 'en-US';
  const accent = language.toLowerCase().includes('gb') ? 'uk' : 'us';
  const key = options.key || language;
  void playAudio(options.audioUrl, options.text || queryRef.value, accent, language, key);
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
  const preloadGeneration = aiPreloadGeneration.next();
  void import('./composable.ai-assistant')
    .then(({ cancelAiPreload }) => cancelAiPreload())
    .catch(() => undefined);

  const cleanWord = wordToSearch.trim();
  const settings = settingsStore.value;
  const provider = providerName || settings.dictionaryProvider || 'wiktionary';
  const lang = targetLang || settings.translateTargetLanguage || 'Vietnamese';
  scheduleAiPreload(cleanWord, lang, context, preloadGeneration);
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
