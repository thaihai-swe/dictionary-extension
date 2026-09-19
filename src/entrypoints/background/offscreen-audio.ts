import { OFFSCREEN_AUDIO, PLAY_AUDIO, SPEAK_TTS } from '../../shared/messages';

let creating: Promise<void> | null = null;
let idleTimer: ReturnType<typeof setTimeout> | null = null;
const IDLE_TIMEOUT_MS = 5_000;

type OffscreenApi = {
  hasDocument: () => Promise<boolean>;
  createDocument: (options: { url: string; reasons: string[]; justification: string }) => Promise<void>;
  closeDocument: () => Promise<void>;
};

function getOffscreenApi(): OffscreenApi | undefined {
  return (chrome as typeof chrome & { offscreen?: OffscreenApi }).offscreen;
}

async function ensureDocument(): Promise<boolean> {
  const api = getOffscreenApi();
  if (!api?.createDocument) return false;
  if (idleTimer) {
    clearTimeout(idleTimer);
    idleTimer = null;
  }
  try {
    if (await api.hasDocument()) return true;
  } catch { /* create below */ }
  if (creating) {
    await creating;
    return true;
  }
  creating = api.createDocument({
    url: 'offscreen.html',
    reasons: ['AUDIO_PLAYBACK'],
    justification: 'Playback pronunciation audio and speech synthesis without content script overhead.',
  }).finally(() => { creating = null; });
  try {
    await creating;
    return true;
  } catch {
    return false;
  }
}

function scheduleClose() {
  const api = getOffscreenApi();
  if (!api?.closeDocument) return;
  if (idleTimer) clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    idleTimer = null;
    void api.hasDocument().then(async (exists) => {
      if (exists) await api.closeDocument();
    }).catch(() => undefined);
  }, IDLE_TIMEOUT_MS);
}

export function releaseOffscreenAudio() {
  if (idleTimer) clearTimeout(idleTimer);
  idleTimer = null;
  void getOffscreenApi()?.closeDocument().catch(() => undefined);
}

export async function handleAudioMessage(type: string, payload: unknown): Promise<unknown> {
  if (!(await ensureDocument())) return { ok: false, error: 'Offscreen audio is unavailable.' };
  const action = type === PLAY_AUDIO ? 'play' : type === SPEAK_TTS ? 'speak' : 'stop';
  const response = await chrome.runtime.sendMessage({
    type: OFFSCREEN_AUDIO,
    payload: { ...(payload as Record<string, unknown> || {}), action },
  });
  scheduleClose();
  return response || { ok: Boolean((response as { ok?: boolean } | undefined)?.ok) };
}
