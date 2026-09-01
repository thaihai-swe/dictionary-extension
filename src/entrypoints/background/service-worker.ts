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
  fetchCombinedDictionaryResult,
  validateDictionaryProvider,
  validateTranslationProvider,
} from '../../providers/provider.index';
import { loadFullSettings, migrateSettingsSchema, normalizeSettings } from '../../shared/settings';
import { canonicalAiIntent } from '../../shared/ai-prompts';

const CONTENT_SCRIPT_JS = ['content-script.js'];
const SETTINGS_TTL_MS = 15_000;
const RESTRICTED_URL_RE = /^(chrome|chrome-extension|edge|about|devtools|https:\/\/chromewebstore\.google\.com)/i;

const activeProxyRequests = new Map<string, AbortController>();
const lookupControllers = new Map<string, AbortController>();
const inflightDictionaryLookups = new Map<string, Promise<DictionaryEntry & { requestId: string }>>();

let cachedSettings: AppSettings | null = null;
let cachedSettingsAt = 0;
let cachedSettingsPromise: Promise<AppSettings> | null = null;

function getRequestKey(tabId: number | undefined, scope: string, requestId: string): string {
  return `${Number.isInteger(tabId) ? tabId : 'popup'}:${scope}:${requestId}`;
}

function registerController(tabId: number | undefined, scope: string, requestId: string): AbortController {
  const key = getRequestKey(tabId, scope, requestId);
  const existing = lookupControllers.get(key);
  if (existing) return existing;
  cancelRequestsForScope(tabId, scope, requestId);
  const controller = new AbortController();
  lookupControllers.set(key, controller);
  return controller;
}

function unregisterController(tabId: number | undefined, scope: string, requestId: string) {
  lookupControllers.delete(getRequestKey(tabId, scope, requestId));
}

function cancelRequestsForScope(tabId: number | undefined, scope: string, exceptRequestId?: string) {
  const prefix = `${Number.isInteger(tabId) ? tabId : 'popup'}:${scope}:`;
  const exceptKey = exceptRequestId ? getRequestKey(tabId, scope, exceptRequestId) : '';
  for (const [key, controller] of lookupControllers.entries()) {
    if (!key.startsWith(prefix) || key === exceptKey) continue;
    controller.abort();
    lookupControllers.delete(key);
  }
  if (scope === dictionaryAbortScope()) {
    for (const key of inflightDictionaryLookups.keys()) {
      if (!key.startsWith(prefix) || key === exceptKey) continue;
      inflightDictionaryLookups.delete(key);
    }
  }
}

function cancelRequestsForTab(tabId: number | undefined) {
  const prefix = `${Number.isInteger(tabId) ? tabId : 'popup'}:`;
  for (const [key, controller] of lookupControllers.entries()) {
    if (key.startsWith(prefix)) {
      controller.abort();
      lookupControllers.delete(key);
    }
  }
  for (const key of inflightDictionaryLookups.keys()) {
    if (key.startsWith(prefix)) inflightDictionaryLookups.delete(key);
  }
}

async function getCachedSettings(): Promise<AppSettings> {
  if (cachedSettings && Date.now() - cachedSettingsAt < SETTINGS_TTL_MS) return cachedSettings;
  if (!cachedSettingsPromise) {
    cachedSettingsPromise = loadFullSettings()
      .then((settings) => {
        cachedSettings = settings;
        cachedSettingsAt = Date.now();
        return settings;
      })
      .finally(() => {
        cachedSettingsPromise = null;
      });
  }
  return cachedSettingsPromise;
}

function invalidateSettingsCache() {
  cachedSettings = null;
  cachedSettingsAt = 0;
}

function canInjectIntoUrl(url?: string): boolean {
  const value = String(url || '');
  if (!value) return false;
  return !RESTRICTED_URL_RE.test(value);
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
        },
        controller.signal,
      );
      return { ...result, requestId };
    } finally {
      unregisterController(tabId, scope, requestId);
      inflightDictionaryLookups.delete(requestKey);
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
  void Promise.all([
    migrateSettingsSchema(),
    loadFullSettings(),
    Promise.resolve(initializeContextMenu()),
  ]).catch(() => undefined);
});

chrome.runtime.onStartup?.addListener(() => {
  void migrateSettingsSchema().catch(() => undefined);
  void loadFullSettings().catch(() => undefined);
  initializeContextMenu();
});

chrome.storage?.onChanged?.addListener((changes, area) => {
  if (area !== 'sync' && area !== 'local') return;
  invalidateSettingsCache();
  if (area === 'sync' && toolbarWindowId && (changes.popupWidth || changes.popupHeight)) {
    void applyToolbarWindowSize(toolbarWindowId);
  }
});

chrome.windows?.onRemoved?.addListener((removedId) => {
  if (removedId === toolbarWindowId) {
    toolbarWindowId = null;
    void chrome.storage.session?.remove(TOOLBAR_WINDOW_ID_KEY).catch(() => undefined);
  }
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
    const requestId = String(message.requestId || createRequestId('proxy'));
    const controller = new AbortController();
    activeProxyRequests.set(requestId, controller);
    const timeoutMs = Math.max(1000, Math.min(Number(message.timeoutMs) || 8000, 30000));
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    fetch(message.url, { ...(message.options || {}), signal: controller.signal })
      .then(async (res) => {
        const text = await res.text();
        let data: unknown = text;
        try { data = JSON.parse(text); } catch { /* keep text */ }
        sendResponse({ ok: res.ok, status: res.status, data });
      })
      .catch((err: Error) => {
        sendResponse({ ok: false, status: 0, error: err.message });
      })
      .finally(() => {
        clearTimeout(timeoutId);
        activeProxyRequests.delete(requestId);
      });
    return true;
  }

  if (message?.type === ABORT_FETCH_PROXY && message.requestId) {
    const controller = activeProxyRequests.get(String(message.requestId));
    controller?.abort();
    activeProxyRequests.delete(String(message.requestId));
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

  return false;
});
