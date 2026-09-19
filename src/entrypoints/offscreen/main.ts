const PLAY_AUDIO = 'PLAY_AUDIO';
const STOP_AUDIO = 'STOP_AUDIO';
const SPEAK_TTS = 'SPEAK_TTS';
const OFFSCREEN_AUDIO = 'OFFSCREEN_AUDIO';

let currentAudio: HTMLAudioElement | null = null;
let speechTimer: ReturnType<typeof setTimeout> | null = null;

function stopLocalAudio() {
  if (speechTimer) {
    clearTimeout(speechTimer);
    speechTimer = null;
  }
  if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
  if (currentAudio) {
    try {
      currentAudio.pause();
      currentAudio.removeAttribute('src');
      currentAudio.load();
    } catch {
      // Ignore
    }
    currentAudio = null;
  }
}

function playClip(url: string, rate = 1): Promise<boolean> {
  return new Promise((resolve) => {
    stopLocalAudio();
    const clip = new Audio(url);
    currentAudio = clip;
    clip.playbackRate = Number.isFinite(rate) && rate > 0 ? rate : 1;
    let settled = false;
    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      if (currentAudio === clip) currentAudio = null;
      resolve(ok);
    };
    clip.addEventListener('ended', () => finish(true), { once: true });
    clip.addEventListener('error', () => finish(false), { once: true });
    clip.play().catch(() => finish(false));
  });
}

function speak(text: string, lang = 'en-US', rate = 0.95, voiceURI?: string): Promise<boolean> {
  return new Promise((resolve) => {
    stopLocalAudio();
    if (!text || typeof speechSynthesis === 'undefined') {
      resolve(false);
      return;
    }
    speechTimer = setTimeout(() => {
      speechTimer = null;
      try {
        if (speechSynthesis.paused) speechSynthesis.resume();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang;
        utterance.rate = Number.isFinite(rate) && rate > 0 ? rate : 0.95;
        if (voiceURI) {
          const match = speechSynthesis.getVoices().find((voice) => voice.voiceURI === voiceURI);
          if (match) utterance.voice = match;
        }
        utterance.onend = () => resolve(true);
        utterance.onerror = () => resolve(false);
        speechSynthesis.speak(utterance);
      } catch {
        resolve(false);
      }
    }, 40);
  });
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  const type = message?.type;
  const payload = message?.payload || message || {};
  if (type !== PLAY_AUDIO && type !== STOP_AUDIO && type !== SPEAK_TTS && type !== OFFSCREEN_AUDIO) {
    return false;
  }

  const action = type === OFFSCREEN_AUDIO ? payload.action : type === PLAY_AUDIO ? 'play' : type === SPEAK_TTS ? 'speak' : 'stop';

  if (action === 'stop') {
    stopLocalAudio();
    sendResponse({ ok: true });
    return false;
  }

  if (action === 'play' && payload.url) {
    playClip(String(payload.url), Number(payload.rate) || 1)
      .then((ok) => sendResponse({ ok }))
      .catch(() => sendResponse({ ok: false }));
    return true;
  }

  if (action === 'speak' && payload.text) {
    speak(String(payload.text), payload.lang, Number(payload.rate) || 0.95, payload.voiceURI)
      .then((ok) => sendResponse({ ok }))
      .catch(() => sendResponse({ ok: false }));
    return true;
  }

  sendResponse({ ok: false });
  return false;
});
