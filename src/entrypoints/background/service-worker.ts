import type { AiIntentId, AiResult, AppSettings, DictionaryEntry } from '../../types';
import {
  ABORT_FETCH_PROXY,
  AI_LOOKUP,
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
  aiAbortScope,
  createRequestId,
  dictionaryAbortScope,
  isMissingReceiverError,
  type AiLookupPayload,
  type CancelLookupPayload,
  type LookupTextPayload,
  type OpenLookupPopupPayload,
  type ProviderValidationResult,
  type ValidateProviderPayload,
} from '../../shared/messages';
import { fetchAiAnalysis, validateAiProvider } from '../../providers/provider.gemini-ai';
import {
  clearEnrichmentCache,
  fetchCombinedDictionaryResult,
  validateDictionaryProvider,
  validateTranslationProvider,
} from '../../providers/provider.index';
import { clearHttpCache } from '../../providers/provider.http';
import { loadFullSettings, normalizeSettings } from '../../shared/settings';
import { canonicalAiIntent } from '../../shared/ai-prompts';
import { canInjectIntoUrl } from '../../shared/ext';
import { AbortRegistry } from '../../shared/abort-registry';
import { createTtlCache } from './ttl-cache';
import { abortAllFetchProxies, abortFetchProxy, handleFetchProxy } from './fetch-proxy';
import { handleAudioMessage, releaseOffscreenAudio } from './offscreen-audio';

const CONTENT_SCRIPT_JS = ['content-script.js'];
const SETTINGS_TTL_MS = 15_000;

const lookupControllers = new AbortRegistry();
const inflightDictionaryLookups = new Map<string, Promise<DictionaryEntry & { requestId: string }>>();

const settingsCache = createTtlCache(loadFullSettings, SETTINGS_TTL_MS);

function getRequestKey(tabId: number | undefined, scope: string, requestId: string): string {
  return `${Number.isInteger(tabId) ? tabId : 'popup'}:${scope}:${requestId}`;
}

function registerController(tabId: number | undefined, scope: string, requestId: string): AbortController {
  const key = getRequestKey(tabId, scope, requestId);
  const prefix = `${Number.isInteger(tabId) ? tabId : 'popup'}:${scope}:`;
  return lookupControllers.register(key, prefix);
}

function unregisterController(tabId: number | undefined, scope: string, requestId: string) {
  lookupControllers.unregister(getRequestKey(tabId, scope, requestId));
}

function releaseIdleState() {
  lookupControllers.cancelAll();
  inflightDictionaryLookups.clear();
  abortAllFetchProxies();
  clearHttpCache();
  settingsCache.clear();
  releaseOffscreenAudio();
}

function cancelRequestsForScope(tabId: number | undefined, scope: string, exceptRequestId?: string) {
  const prefix = `${Number.isInteger(tabId) ? tabId : 'popup'}:${scope}:`;
  const exceptKey = exceptRequestId ? getRequestKey(tabId, scope, exceptRequestId) : '';
  lookupControllers.cancelPrefix(prefix, exceptKey);
  if (scope === dictionaryAbortScope()) {
    for (const key of inflightDictionaryLookups.keys()) {
      if (!key.startsWith(prefix) || key === exceptKey) continue;
      inflightDictionaryLookups.delete(key);
    }
  }
}

function cancelRequestsForTab(tabId: number | undefined) {
  const prefix = `${Number.isInteger(tabId) ? tabId : 'popup'}:`;
  lookupControllers.cancelPrefix(prefix);
  for (const key of inflightDictionaryLookups.keys()) {
    if (key.startsWith(prefix)) inflightDictionaryLookups.delete(key);
  }
}

async function getCachedSettings(): Promise<AppSettings> {
  return settingsCache.get();
}

function invalidateSettingsCache() {
  settingsCache.invalidate();
}

async function publishLookupUpdate(options: {
  requestId: string;
  source: 'dictionary' | 'ai';
  text: string;
  revision: number;
  result: DictionaryEntry | AiResult;
  sender?: chrome.runtime.MessageSender;
}) {
  const message = {
    type: LOOKUP_UPDATE,
    payload: {
      requestId: options.requestId,
      source: options.source,
      text: options.text,
      revision: options.revision,
      result: options.result,
    },
  };
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

async function handleDictionaryLookup(payload: LookupTextPayload, sender: chrome.runtime.MessageSender) {
  const text = String(payload?.text || '').trim();
  if (!text) throw new Error('No text selected.');

  const requestId = payload.requestId || createRequestId('dict');
  const tabId = sender?.tab?.id;
  const scope = dictionaryAbortScope();
  const requestKey = getRequestKey(tabId, scope, requestId);
  const existing = inflightDictionaryLookups.get(requestKey);
  if (existing) return existing;

  const work = (async () => {
    const settings = await getCachedSettings();
    const lookupSettings = normalizeSettings({
      ...settings,
      dictionaryProvider: (payload.provider || settings.dictionaryProvider) as AppSettings['dictionaryProvider'],
      translateTargetLanguage: payload.targetLang || settings.translateTargetLanguage,
    });
    const controller = registerController(tabId, scope, requestId);

    let backgroundStarted = false;
    try {
      const result = await fetchCombinedDictionaryResult(
        text,
        lookupSettings,
        controller.signal,
        (enriched) => {
          void publishLookupUpdate({
            requestId,
            source: 'dictionary',
            text,
            revision: enriched.revision || 0,
            result: enriched,
            sender,
          });
          if (enriched.enriched) {
            unregisterController(tabId, scope, requestId);
          }
        },
        controller.signal,
        () => {
          unregisterController(tabId, scope, requestId);
          inflightDictionaryLookups.delete(requestKey);
        },
      );
      backgroundStarted = true;
      return { ...result, requestId };
    } catch (error) {
      if (!backgroundStarted) {
        unregisterController(tabId, scope, requestId);
        inflightDictionaryLookups.delete(requestKey);
      }
      throw error;
    }
  })();

  inflightDictionaryLookups.set(requestKey, work);
  return work;
}

async function handleAiLookup(payload: AiLookupPayload, sender: chrome.runtime.MessageSender) {
  const text = String(payload?.text || '').trim();
  if (!text) throw new Error('No text selected.');

  const settings = await getCachedSettings();
  if (!settings.enableAI) throw new Error('AI provider is disabled in settings.');

  const intent = canonicalAiIntent(payload.intent);
  const requestId = payload.requestId || createRequestId('ai');
  const tabId = sender?.tab?.id;
  const scope = aiAbortScope(intent);
  const controller = registerController(tabId, scope, requestId);

  try {
    const result = await fetchAiAnalysis(
      intent as AiIntentId,
      text,
      payload.targetLang || settings.translateTargetLanguage || 'Vietnamese',
      settings.aiApiKey,
      settings.aiModel,
      controller.signal,
      payload.context,
      settings,
    );
    return { ...result, requestId };
  } finally {
    unregisterController(tabId, scope, requestId);
  }
}

function mergeValidationSettings(stored: AppSettings, incoming?: Partial<AppSettings>): AppSettings {
  const sanitized: Record<string, unknown> = { ...(incoming || {}) };
  for (const key of ['aiApiKey', 'libreTranslateApiKey']) {
    if (!String(sanitized[key] || '').trim()) delete sanitized[key];
  }
  return normalizeSettings({ ...stored, ...sanitized });
}

async function handleValidateProvider(payload: ValidateProviderPayload = { kind: 'dictionary' }): Promise<ProviderValidationResult> {
  const stored = await getCachedSettings();
  const settings = mergeValidationSettings(stored, payload.settings);
  const kind = payload.kind || 'dictionary';

  if (kind === 'dictionary') {
    return validateDictionaryProvider(payload.providerId || settings.dictionaryProvider, settings);
  }
  if (kind === 'translation') {
    return validateTranslationProvider(settings);
  }
  if (kind === 'ai') {
    return validateAiProvider(settings);
  }
  return { ok: false, error: `Unknown validation kind: ${kind}` };
}

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
  void loadFullSettings().catch(() => undefined);
});

chrome.runtime.onStartup?.addListener(() => {
  void loadFullSettings().catch(() => undefined);
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
    sendResponse({ ok: true });
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
