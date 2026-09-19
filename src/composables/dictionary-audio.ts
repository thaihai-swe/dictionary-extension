import { signal } from '../ui/signal';
import { requestPlayAudio, requestSpeakTts, requestStopAudio } from '../shared/runtime-client';
import { settingsStore } from './composable.storage';
import {
  startSpeechPracticeSession,
  stopSpeechPractice,
} from './dictionary-practice';

export const isAudioPlayingRef = signal<boolean>(false);
export const playingKeyRef = signal<string | null>(null);

let currentAudioElement: HTMLAudioElement | null = null;
let speechStartTimer: ReturnType<typeof setTimeout> | null = null;
let playGeneration = 0;

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
      // Ignore audio pause error.
    }
    currentAudioElement = null;
  }
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
      // Ignore audio pause error.
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

  if (typeof window.speechSynthesis.cancel === 'function') window.speechSynthesis.cancel();

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
        const match = voices.find((voice) => voice.voiceURI === settings.pronunciationVoiceURI);
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
  const text = String(fallbackWord || '').trim();
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

export function startSpeechPractice(text: string, language = 'en-US') {
  stopAllAudio();
  startSpeechPracticeSession(text, language, playingKeyRef);
}
