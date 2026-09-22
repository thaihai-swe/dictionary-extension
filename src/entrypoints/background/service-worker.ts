import type { AiResult, AppSettings, DictionaryEntry } from '../../types';
import {
  ABORT_FETCH_PROXY,
  AI_LOOKUP,
  CLEAR_DICTIONARY_CACHE,
  CANCEL_LOOKUP,
  FETCH_PROXY,
  LOOKUP_TEXT,
  LOOKUP_UPDATE,
  OPEN_LOOKUP_POPUP,
  OPEN_OPTIONS,
  PLAY_AUDIO,
  SPEAK_TTS,
  STOP_AUDIO,
  OFFSCREEN_AUDIO,
  VALIDATE_PROVIDER,
  isMissingReceiverError,
  type AiLookupPayload,
  type CancelLookupPayload,
  type LookupTextPayload,
  type OpenLookupPopupPayload,
  type RuntimeSender,
  type ValidateProviderPayload,
} from '../../shared/messages';
import { createDictionaryEntryPatch } from '../../shared/lookup-updates';
import { recordLookupMetric } from '../../shared/performance/lookup-metrics.ts';
import {
  clearEnrichmentCache,
  setDictionaryCachePersistenceEnabled,
  validateDictionaryProvider,
  validateTranslationProvider,
} from '../../providers/provider.index';
import { clearHttpCache } from '../../providers/provider.http';
import { settingsRepository } from '../../infrastructure/storage/settings-repository';
import '../../infrastructure/providers/register-adapters';
import { canInjectIntoUrl } from '../../shared/ext';
import { RequestCoordinator } from '../../application/runtime/request-coordinator';
import { createLookupHandlers } from '../../application/runtime/lookup-handlers';
import { fetchCombinedDictionaryResult } from '../../application/dictionary';
import { fetchAiAnalysis, validateAiProvider } from '../../infrastructure/providers/ai';
import { createTtlCache } from './ttl-cache';
import { abortAllFetchProxies, abortFetchProxy, handleFetchProxy } from './fetch-proxy';
import { handleAudioMessage, releaseOffscreenAudio } from './offscreen-audio';

export function startServiceWorker() {
const CONTENT_SCRIPT_JS = ['content-scripts/content.js'];
const SETTINGS_TTL_MS = 15_000;

const requestCoordinator = new RequestCoordinator<DictionaryEntry & { requestId: string }>();
const inflightDictionaryLookups = requestCoordinator.dictionaryRequests;

const settingsCache = createTtlCache(() => settingsRepository.load({ includeSecrets: true }), SETTINGS_TTL_MS);

function registerController(tabId: number | undefined, scope: string, requestId: string): AbortController {
  return requestCoordinator.register(tabId, scope, requestId);
}

function unregisterController(tabId: number | undefined, scope: string, requestId: string) {
  requestCoordinator.unregister(tabId, scope, requestId);
}

const LOOKUP_UPDATE_COALESCE_MS = 50;

interface LookupUpdateState {
  lastPublished: DictionaryEntry;
  pending?: DictionaryEntry;
  timer?: ReturnType<typeof setTimeout>;
  sender?: RuntimeSender;
  sendPromise: Promise<void>;
}

const lookupUpdateStates = new Map<string, LookupUpdateState>();

function lookupUpdateKey(requestId: string, source: string): string {
  return `${source}:${requestId}`;
}

function clearLookupUpdateState(requestId?: string) {
  for (const [key, state] of lookupUpdateStates.entries()) {
    if (requestId && !key.endsWith(`:${requestId}`)) continue;
    if (state.timer) clearTimeout(state.timer);
    lookupUpdateStates.delete(key);
  }
}

function releaseIdleState() {
  clearLookupUpdateState();
  requestCoordinator.clear();
  abortAllFetchProxies();
  clearHttpCache();
  settingsCache.clear();
  releaseOffscreenAudio();
}

function cancelRequestsForScope(tabId: number | undefined, scope: string, exceptRequestId?: string) {
  requestCoordinator.cancelScope(tabId, scope, exceptRequestId);
}

function cancelRequestsForTab(tabId: number | undefined) {
  requestCoordinator.cancelTab(tabId);
}

async function getCachedSettings(): Promise<AppSettings> {
  const settings = await settingsCache.get();
  setDictionaryCachePersistenceEnabled(settings.persistLookupCache !== false);
  return settings;
}

function invalidateSettingsCache() {
  settingsCache.invalidate();
}

async function sendLookupUpdateMessage(
  options: {
    requestId: string;
    source: 'dictionary' | 'ai';
    text: string;
    revision: number;
    result: DictionaryEntry | AiResult;
    sender?: RuntimeSender;
  },
  payload: Record<string, unknown>,
) {
  const message = { type: LOOKUP_UPDATE, payload };
  let serializedBytes = 0;
  try {
    serializedBytes = new TextEncoder().encode(JSON.stringify(payload)).byteLength;
  } catch {
    // Metrics are best effort and never affect delivery.
  }
  recordLookupMetric('lookup.update.sent', {
    requestId: options.requestId,
    source: options.source,
    revision: options.revision,
    bytes: serializedBytes,
    kind: String(payload.kind || 'snapshot'),
  });

  const tabId = options.sender?.tab?.id;
  if (Number.isInteger(tabId)) {
    try {
      await chrome.tabs.sendMessage(tabId as number, message);
    } catch {
      // Restricted pages or missing receiver are fine.
    }
  }
  try {
    await chrome.runtime.sendMessage(message);
  } catch {
    // No popup listener is fine.
  }
}

async function flushLookupUpdate(requestId: string, source: 'dictionary' | 'ai') {
  const key = lookupUpdateKey(requestId, source);
  const state = lookupUpdateStates.get(key);
  if (!state?.pending) return;
  state.timer = undefined;
  const next = state.pending;
  state.pending = undefined;
  const patch = createDictionaryEntryPatch(state.lastPublished, next);
  if (!Object.keys(patch.changed).length && !patch.removed.length) return;

  const baseRevision = state.lastPublished.revision || 0;
  state.lastPublished = next;
  state.sendPromise = state.sendPromise.catch(() => undefined).then(() => sendLookupUpdateMessage(
    {
      requestId,
      source,
      text: next.originalText || next.word,
      revision: next.revision || 0,
      result: next,
      sender: state.sender,
    },
    {
      requestId,
      source,
      revision: next.revision || 0,
      baseRevision,
      patch,
      kind: 'patch',
    },
  ));
  await state.sendPromise;
}

async function publishLookupUpdate(options: {
  requestId: string;
  source: 'dictionary' | 'ai';
  text: string;
  revision: number;
  result: DictionaryEntry | AiResult;
  sender?: RuntimeSender;
}) {
  if (options.source !== 'dictionary') {
    await sendLookupUpdateMessage(options, {
      requestId: options.requestId,
      source: options.source,
      text: options.text,
      revision: options.revision,
      result: options.result,
      kind: 'snapshot',
    });
    return;
  }

  const result = options.result as DictionaryEntry;
  const key = lookupUpdateKey(options.requestId, options.source);
  const state = lookupUpdateStates.get(key);
  if (!state) {
    const initialState: LookupUpdateState = {
      lastPublished: result,
      sender: options.sender,
      sendPromise: Promise.resolve(),
    };
    lookupUpdateStates.set(key, initialState);
    initialState.sendPromise = initialState.sendPromise.then(() => sendLookupUpdateMessage(options, {
      requestId: options.requestId,
      source: options.source,
      text: options.text,
      revision: options.revision,
      result,
      kind: 'snapshot',
    }));
    await initialState.sendPromise;
    if (result.enriched) lookupUpdateStates.delete(key);
    return;
  }

  state.sender = options.sender || state.sender;
  state.pending = result;
  if (result.enriched) {
    if (state.timer) clearTimeout(state.timer);
    state.timer = undefined;
    state.pending = undefined;
    state.lastPublished = result;
    state.sendPromise = state.sendPromise.catch(() => undefined).then(() => sendLookupUpdateMessage(options, {
      requestId: options.requestId,
      source: options.source,
      text: options.text,
      revision: options.revision,
      result,
      kind: 'snapshot',
    }));
    await state.sendPromise;
    lookupUpdateStates.delete(key);
    return;
  }
  if (!state.timer) {
    state.timer = setTimeout(() => {
      void flushLookupUpdate(options.requestId, options.source);
    }, LOOKUP_UPDATE_COALESCE_MS);
  }
}

const {
  handleDictionaryLookup,
  handleAiLookup,
  handleValidateProvider,
} = createLookupHandlers({
  getSettings: getCachedSettings,
  registerController,
  unregisterController,
  publishLookupUpdate,
  dictionaryRequests: inflightDictionaryLookups,
  lookupDictionary: fetchCombinedDictionaryResult,
  analyzeAi: fetchAiAnalysis,
  validateDictionary: validateDictionaryProvider,
  validateTranslation: validateTranslationProvider,
  validateAi: validateAiProvider,
});

async function injectContentScript(tabId: number) {
  await chrome.scripting.executeScript({
    target: { tabId },
    files: CONTENT_SCRIPT_JS,
  });
}

async function sendMessageToTabWithRetry(tabId: number, message: unknown) {
  try {
    return await chrome.tabs.sendMessage(tabId, message);
  } catch (error) {
    if (!isMissingReceiverError(error)) throw error;
    await injectContentScript(tabId);
    return chrome.tabs.sendMessage(tabId, message);
  }
}

async function openLookupOnTab(tab: chrome.tabs.Tab | undefined, payload: OpenLookupPopupPayload) {
  if (!tab?.id || !canInjectIntoUrl(tab.url)) return false;
  await sendMessageToTabWithRetry(tab.id, {
    type: OPEN_LOOKUP_POPUP,
    payload,
  });
  return true;
}

const TOOLBAR_WINDOW_ID_KEY = 'toolbarWindowId';
let toolbarWindowId: number | null = null;

async function getSharedPopupSize() {
  const settings = await getCachedSettings();
  return {
    width: Math.max(360, Math.min(1000, Number(settings.popupWidth) || 620)),
    height: Math.max(380, Math.min(900, Number(settings.popupHeight) || 720)),
  };
}

async function applyToolbarWindowSize(windowId: number, focused = false) {
  const size = await getSharedPopupSize();
  try {
    await chrome.windows.update(windowId, {
      ...size,
      ...(focused ? { focused: true } : {}),
    });
  } catch {
    // Chrome clamps oversized windows to the display max; ignore if the window is gone.
  }
}

async function openToolbarWindow() {
  const stored = await chrome.storage.session?.get(TOOLBAR_WINDOW_ID_KEY).catch(() => ({} as Record<string, unknown>));
  const existingId = Number(stored?.[TOOLBAR_WINDOW_ID_KEY] || toolbarWindowId || 0) || null;
  if (existingId) {
    try {
      await applyToolbarWindowSize(existingId, true);
      toolbarWindowId = existingId;
      return;
    } catch {
      toolbarWindowId = null;
    }
  }

  const size = await getSharedPopupSize();
  const win = await chrome.windows.create({
    url: chrome.runtime.getURL('index.html'),
    type: 'popup',
    width: size.width,
    height: size.height,
    focused: true,
  });
  toolbarWindowId = win?.id ?? null;
  if (toolbarWindowId != null) {
    // macOS often ignores create() size; update() applies settings or Chrome's display max.
    await applyToolbarWindowSize(toolbarWindowId);
    await chrome.storage.session?.set({ [TOOLBAR_WINDOW_ID_KEY]: toolbarWindowId }).catch(() => undefined);
  }
}

function initializeContextMenu() {
  if (!chrome.contextMenus) return;
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: 'lookup_selection',
      title: 'Lookup "%s" in Dictionary',
      contexts: ['selection'],
    });
  });
}

chrome.runtime.onInstalled.addListener(() => {
  initializeContextMenu();
  void settingsRepository.load({ includeSecrets: true }).catch(() => undefined);
});

chrome.runtime.onStartup?.addListener(() => {
  void settingsRepository.load({ includeSecrets: true }).catch(() => undefined);
});

chrome.runtime.onSuspend?.addListener(() => {
  releaseIdleState();
});

chrome.storage?.onChanged?.addListener((changes, area) => {
  if (area !== 'sync' && area !== 'local') return;
  const cacheKeys = [
    'dictionaryProvider',
    'enableDictionary',
    'enableTranslate',
    'enablePhraseFallback',
    'enableLexicalProfile',
    'translateTargetLanguage',
    'translateProvider',
    'libreTranslateBaseUrl',
    'libreTranslateApiKey',
    'aiApiKey',
    'hasAiApiKey',
    'aiModel',
    'aiBaseUrl',
    'persistLookupCache',
  ];
  const sizeChanged = Boolean(changes.popupWidth || changes.popupHeight);
  if (!cacheKeys.some((key) => key in changes) && !sizeChanged) return;
  invalidateSettingsCache();
  if (cacheKeys.some((key) => key in changes)) clearEnrichmentCache();
  if (area === 'sync' && toolbarWindowId && sizeChanged) {
    void applyToolbarWindowSize(toolbarWindowId);
  }
});

chrome.windows?.onRemoved?.addListener((removedId) => {
  if (removedId === toolbarWindowId) {
    toolbarWindowId = null;
    void chrome.storage.session?.remove(TOOLBAR_WINDOW_ID_KEY).catch(() => undefined);
  }
});

chrome.tabs?.onRemoved?.addListener((tabId) => {
  cancelRequestsForTab(tabId);
});

chrome.action?.onClicked?.addListener(() => {
  void openToolbarWindow().catch(() => undefined);
});

chrome.contextMenus?.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== 'lookup_selection') return;
  const selectedText = String(info.selectionText || '').trim();
  if (!selectedText) return;
  try {
    await openLookupOnTab(tab, { text: selectedText });
  } catch {
    // Restricted pages fail quietly.
  }
});

chrome.commands?.onCommand.addListener(async (command) => {
  if (command !== 'lookup-selection') return;
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  try {
    await openLookupOnTab(tab, { fromSelection: true });
  } catch {
    // Restricted pages fail quietly.
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === FETCH_PROXY && message.url) {
    void handleFetchProxy(message, sendResponse);
    return true;
  }

  if (message?.type === ABORT_FETCH_PROXY && message.requestId) {
    abortFetchProxy(String(message.requestId));
    sendResponse({ ok: true });
    return false;
  }

  if (message?.type === VALIDATE_PROVIDER) {
    handleValidateProvider(message.payload as ValidateProviderPayload)
      .then((result) => sendResponse({ ok: true, result }))
      .catch((error) => sendResponse({
        ok: false,
        error: error instanceof Error ? error.message : 'Validation failed.',
      }));
    return true;
  }

  if (message?.type === CANCEL_LOOKUP) {
    const payload = (message.payload || {}) as CancelLookupPayload;
    if (payload.scope) cancelRequestsForScope(sender?.tab?.id, payload.scope);
    else cancelRequestsForTab(sender?.tab?.id);
    clearLookupUpdateState(payload.requestId);
    sendResponse({ ok: true });
    return false;
  }

  if (message?.type === CLEAR_DICTIONARY_CACHE) {
    clearEnrichmentCache();
    sendResponse({ ok: true, result: true });
    return false;
  }

  if (message?.type === LOOKUP_TEXT) {
    handleDictionaryLookup(message.payload as LookupTextPayload, sender)
      .then((result) => sendResponse({ ok: true, result, requestId: result.requestId }))
      .catch((error) => sendResponse({
        ok: false,
        error: error instanceof Error ? error.message : 'Lookup failed.',
      }));
    return true;
  }

  if (message?.type === OPEN_OPTIONS) {
    chrome.runtime.openOptionsPage()
      .then(() => sendResponse({ ok: true, result: true }))
      .catch((error) => sendResponse({
        ok: false,
        error: error instanceof Error ? error.message : 'Failed to open settings.',
      }));
    return true;
  }

  if (message?.type === AI_LOOKUP) {
    handleAiLookup(message.payload as AiLookupPayload, sender)
      .then((result) => sendResponse({ ok: true, result }))
      .catch((error) => sendResponse({
        ok: false,
        error: error instanceof Error ? error.message : 'AI lookup failed.',
      }));
    return true;
  }

  if (message?.type === PLAY_AUDIO || message?.type === SPEAK_TTS || message?.type === STOP_AUDIO) {
    handleAudioMessage(message.type, message.payload)
      .then(sendResponse)
      .catch((error) => sendResponse({
        ok: false,
        error: error instanceof Error ? error.message : 'Audio playback failed.',
      }));
    return true;
  }

  return false;
});
}
