import { signal, useSignal } from '../ui/signal';
import { settingsStore, whenSettingsReady } from './composable.storage';
import { stopAllAudio } from './composable.dictionary';
import { AiResult, AiIntentId, AppSettings } from '../types';
import { canonicalAiIntent, PRELOAD_ALL_INTENTS, PRELOAD_FOLLOW_UPS } from '../shared/ai-prompts';
import { hasConfiguredAiApiKey } from '../shared/settings-export';
import { cancelAiLookup, createRequestId, requestAiLookup } from '../shared/runtime-client';
import { createPersistedLruCache } from '../shared/lookup-cache';

export { PRELOAD_ALL_INTENTS, PRELOAD_FOLLOW_UPS };

export interface AiIntentOption {
  id: AiIntentId;
  label: string;
  icon: string;
}

export const AI_INTENTS: AiIntentOption[] = [
  { id: 'default', label: 'Main AI', icon: '📖' },
  { id: 'explain_in_context', label: 'Context Explain', icon: '🔍' },
  { id: 'grammar', label: 'Grammar & Nuance', icon: '📐' },
  { id: 'collocations', label: 'Phrase & Collocations', icon: '💡' },
  { id: 'sentence_breakdown', label: 'Sentence Breakdown', icon: '🧩' },
  { id: 'confusables', label: 'Compare Confusables', icon: '⚖️' },
  { id: 'rephrase', label: 'Rephrase', icon: '✨' },
];

const activeContextRef = signal<string>('');
const activeIntentRef = signal<AiIntentId>('default');
const aiResultRef = signal<AiResult | null>(null);
const isAiLoadingRef = signal<boolean>(false);
const aiErrorRef = signal<string | null>(null);
const intentStatusEpochRef = signal(0);

const activeAiRequestIds = new Map<AiIntentId, string>();
let preloadToken = 0;
let activePreloadKey = '';
let activeLookupKey = '';
let aiGeneration = 0;

const AI_STORAGE_KEY = 'ai_lookup_cache_v2';
const MAX_AI_CACHE_SIZE = 100;
const AI_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

const aiCache = createPersistedLruCache<AiResult>({
  maxSize: MAX_AI_CACHE_SIZE,
  ttlMs: AI_CACHE_TTL_MS,
  storageKey: AI_STORAGE_KEY,
  persistDelayMs: 300,
});

const aiPendingMap = new Map<string, Promise<AiResult>>();

function getAiCacheKey(
  intentId: AiIntentId,
  text: string,
  lang: string,
  context: string | undefined,
  settings: AppSettings,
): string {
  return JSON.stringify({
    intent: canonicalAiIntent(intentId),
    lang: String(lang || '').toLowerCase(),
    text: String(text || '').toLowerCase().trim(),
    context: String(context || '').toLowerCase().trim(),
    model: settings.aiModel || '',
    baseUrl: settings.aiBaseUrl || '',
    enableLexicalProfile: settings.enableLexicalProfile !== false,
  });
}

let intentStatusRaf = 0;
function bumpIntentStatus() {
  if (intentStatusRaf) return;
  const schedule =
    typeof requestAnimationFrame === 'function'
      ? requestAnimationFrame
      : (cb: FrameRequestCallback) => setTimeout(cb, 16) as unknown as number;
  intentStatusRaf = schedule(() => {
    intentStatusRaf = 0;
    intentStatusEpochRef.value += 1;
  });
}

function normalizeLookupInput(text: string, context?: string, targetLang?: string) {
  const settings = settingsStore.value;
  const cleanText = String(text || '').trim();
  const rawContext = String(context || '').replace(/\s+/g, ' ').trim();
  const cleanContext = rawContext && rawContext.toLowerCase() !== cleanText.toLowerCase() ? rawContext : '';
  const lang = targetLang || settings.translateTargetLanguage || 'Vietnamese';
  return { cleanText, cleanContext, lang, settings };
}

function cacheKeyFor(
  intentId: AiIntentId,
  text: string,
  context?: string,
  targetLang?: string,
) {
  const { cleanText, cleanContext, lang, settings } = normalizeLookupInput(text, context, targetLang);
  return getAiCacheKey(canonicalAiIntent(intentId), cleanText, lang, cleanContext, settings);
}

export function isAiIntentReady(
  intentId: AiIntentId,
  text: string,
  context?: string,
  targetLang?: string,
): boolean {
  return Boolean(aiCache.read(cacheKeyFor(intentId, text, context, targetLang)));
}

export function isAiIntentPending(
  intentId: AiIntentId,
  text: string,
  context?: string,
  targetLang?: string,
): boolean {
  return aiPendingMap.has(cacheKeyFor(intentId, text, context, targetLang));
}

export type AiIntentStatus = 'ready' | 'loading' | 'unrequested';

export function getAiIntentStatus(
  intentId: AiIntentId,
  text: string,
  context?: string,
  targetLang?: string,
): AiIntentStatus {
  const nextIntent = canonicalAiIntent(intentId);
  const { cleanText, cleanContext } = normalizeLookupInput(text, context, targetLang);
  if (nextIntent === 'explain_in_context' && !cleanContext) return 'unrequested';
  if (!cleanText) return 'unrequested';
  if (isAiIntentReady(nextIntent, cleanText, cleanContext, targetLang)) return 'ready';
  if (isAiIntentPending(nextIntent, cleanText, cleanContext, targetLang)) return 'loading';
  return 'unrequested';
}

export function isAiIntentDisabled(
  intentId: AiIntentId,
  text: string,
  context?: string,
  targetLang?: string,
): boolean {
  const nextIntent = canonicalAiIntent(intentId);
  const { cleanText, cleanContext } = normalizeLookupInput(text, context, targetLang);
  if (nextIntent === 'explain_in_context' && !cleanContext) return true;
  if (!cleanText) return true;
  return false;
}

export function clearAiCache() {
  aiCache.clear();
  aiPendingMap.clear();
  bumpIntentStatus();
}

function abortAllAiRequests() {
  stopAllAudio();
  aiGeneration += 1;
  for (const [intentId, reqId] of activeAiRequestIds.entries()) {
    cancelAiLookup(intentId, reqId);
  }
  activeAiRequestIds.clear();
  cancelAiLookup();
  aiPendingMap.clear();
  bumpIntentStatus();
}

export function abortActiveAiRequest() {
  abortAllAiRequests();
  activeLookupKey = '';
  isAiLoadingRef.value = false;
}

export function cancelAiPreload() {
  preloadToken += 1;
  activePreloadKey = '';
}

function makePreloadKey(text: string, context: string, lang: string): string {
  return `${text.toLowerCase()}\0${context.toLowerCase()}\0${lang.toLowerCase()}`;
}

function shouldPreloadAi(settings: AppSettings): boolean {
  return Boolean(settings.enableAiPreload && settings.enableAI && hasConfiguredAiApiKey(settings));
}

async function requestAnalysis(
  intentId: AiIntentId,
  text: string,
  targetLang: string,
  context: string,
): Promise<AiResult> {
  await whenSettingsReady();
  const settings = settingsStore.value;
  const canonicalIntent = canonicalAiIntent(intentId);
  const cacheKey = getAiCacheKey(canonicalIntent, text, targetLang, context, settings);
  const cached = aiCache.read(cacheKey);
  if (cached) return cached;

  const pending = aiPendingMap.get(cacheKey);
  if (pending) return pending;

  const requestId = createRequestId('ai');
  const request = requestAiLookup({
    text,
    context,
    intent: canonicalIntent,
    targetLang,
    requestId,
  }).then((result) => {
    aiCache.write(cacheKey, result);
    return result;
  }).finally(() => {
    if (activeAiRequestIds.get(canonicalIntent) === requestId) {
      activeAiRequestIds.delete(canonicalIntent);
    }
    aiPendingMap.delete(cacheKey);
    bumpIntentStatus();
  });

  activeAiRequestIds.set(canonicalIntent, requestId);
  aiPendingMap.set(cacheKey, request);
  bumpIntentStatus();
  return request;
}

function preloadFollowUpIntents(text: string, context: string, lang: string) {
  const token = preloadToken;
  const queryKey = makePreloadKey(text, context, lang);
  void preloadIntentChunks(PRELOAD_FOLLOW_UPS);
  const queue = PRELOAD_FOLLOW_UPS.filter(
    (intent) => !(intent === 'explain_in_context' && !context),
  );

  const runNext = (index: number) => {
    if (token !== preloadToken) return;
    if (activeLookupKey && activeLookupKey !== queryKey && activePreloadKey !== queryKey) return;
    const intent = queue[index];
    if (!intent) return;
    void requestAnalysis(intent, text, lang, context)
      .catch(() => undefined)
      .finally(() => {
        if (token !== preloadToken) return;
        const idle = (globalThis as typeof globalThis & {
          requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
        }).requestIdleCallback;
        if (typeof idle === 'function') {
          idle(() => runNext(index + 1), { timeout: 600 });
          return;
        }
        setTimeout(() => runNext(index + 1), 250);
      });
  };

  runNext(0);
}

async function runIntent(intentId: AiIntentId, text: string, targetLang?: string, context?: string) {
  if (!text || !text.trim()) return;
  const settings = settingsStore.value;
  if (!settings.enableAI) {
    aiErrorRef.value = 'AI is disabled in Settings.';
    return;
  }

  const cleanText = text.trim();
  const rawContext = String(context || '').replace(/\s+/g, ' ').trim();
  const cleanContext = rawContext && rawContext.toLowerCase() !== cleanText.toLowerCase() ? rawContext : '';
  const nextIntent = canonicalAiIntent(intentId);
  const lang = targetLang || settings.translateTargetLanguage || 'Vietnamese';
  const cacheKey = getAiCacheKey(nextIntent, cleanText, lang, cleanContext, settings);
  const cached = aiCache.read(cacheKey);
  const nextQueryKey = makePreloadKey(cleanText, cleanContext, lang);
  if (activeLookupKey !== nextQueryKey) {
    abortAllAiRequests();
    activeLookupKey = nextQueryKey;
  }

  activeContextRef.value = cleanContext;
  activeIntentRef.value = nextIntent;
  aiErrorRef.value = null;

  if (cached) {
    aiResultRef.value = cached;
    isAiLoadingRef.value = false;
    if (shouldPreloadAi(settings)) {
      void preloadFollowUpIntents(cleanText, cleanContext, lang);
    }
    return;
  }

  const generation = aiGeneration;
  if (aiResultRef.value?.query?.trim().toLowerCase() !== cleanText.toLowerCase()) {
    aiResultRef.value = null;
  }
  isAiLoadingRef.value = true;

  try {
    const result = await requestAnalysis(nextIntent, cleanText, lang, cleanContext);
    if (generation !== aiGeneration || activeIntentRef.value !== nextIntent) return;
    aiResultRef.value = result;
  } catch (err: unknown) {
    if (err instanceof Error && (/abort/i.test(err.message) || err.name === 'AbortError')) return;
    if (generation !== aiGeneration || activeIntentRef.value !== nextIntent) return;
    const message = err instanceof Error ? err.message : 'Dịch vụ AI phản hồi không hợp lệ.';
    aiErrorRef.value = /Extension context invalidated|runtime is unavailable/i.test(message)
      ? 'Extension was reloaded. Refresh this page and try again.'
      : message;
    aiResultRef.value = null;
  } finally {
    if (generation === aiGeneration && activeIntentRef.value === nextIntent) {
      isAiLoadingRef.value = false;
    }
  }

  if (shouldPreloadAi(settings) && generation === aiGeneration) {
    void preloadFollowUpIntents(cleanText, cleanContext, lang);
  }
}

async function preloadIntentChunks(intentIds: AiIntentId[] = PRELOAD_ALL_INTENTS) {
  try {
    const { preloadAiIntentChunks } = await import('../components/async-views');
    await preloadAiIntentChunks(intentIds);
  } catch {
    // Code preloading fails gracefully
  }
}

export async function preloadSpecificIntent(
  intentId: AiIntentId,
  text: string,
  context?: string,
  targetLang?: string,
) {
  await whenSettingsReady();
  const settings = settingsStore.value;
  if (!shouldPreloadAi(settings)) return;
  const cleanText = String(text || '').trim();
  if (!cleanText) return;
  const lang = targetLang || settings.translateTargetLanguage || 'Vietnamese';
  const rawContext = String(context || activeContextRef.value || '').replace(/\s+/g, ' ').trim();
  const cleanContext = rawContext && rawContext.toLowerCase() !== cleanText.toLowerCase() ? rawContext : '';
  const nextIntent = canonicalAiIntent(intentId);
  if (nextIntent === 'explain_in_context' && !cleanContext) return;
  void preloadIntentChunks([nextIntent]);

  try {
    await requestAnalysis(nextIntent, cleanText, lang, cleanContext);
  } catch {
    // Hover preload errors fail silently
  }
}

async function preloadIntents(text: string, context?: string, targetLang?: string) {
  await whenSettingsReady();
  const settings = settingsStore.value;
  if (!shouldPreloadAi(settings)) return;
  const cleanText = String(text || '').trim();
  if (!cleanText) return;
  const lang = targetLang || settings.translateTargetLanguage || 'Vietnamese';
  const rawContext = String(context || activeContextRef.value || '').replace(/\s+/g, ' ').trim();
  const cleanContext = rawContext && rawContext.toLowerCase() !== cleanText.toLowerCase() ? rawContext : '';
  activeContextRef.value = cleanContext;

  const key = makePreloadKey(cleanText, cleanContext, lang);
  if (activePreloadKey === key) return;
  const token = ++preloadToken;
  activePreloadKey = key;

  void preloadIntentChunks(['default']);

  try {
    await requestAnalysis('default', cleanText, lang, cleanContext);
  } catch {
    // Main AI preload can fail silently; Dictionary tab stays usable.
  }
  if (token !== preloadToken) return;
}

export function getAiAssistantStore() {
  return {
    activeContext: activeContextRef,
    activeIntent: activeIntentRef,
    aiResult: aiResultRef,
    isAiLoading: isAiLoadingRef,
    aiError: aiErrorRef,
    intentStatusEpoch: intentStatusEpochRef,
    runIntent,
    preloadIntents,
    preloadSpecificIntent,
    isAiIntentReady,
    isAiIntentPending,
    getAiIntentStatus,
    isAiIntentDisabled,
    abortActiveAiRequest,
    cancelAiPreload,
    clearAiCache,
  };
}

export function useAiAssistant() {
  return {
    activeContext: useSignal(activeContextRef),
    activeIntent: useSignal(activeIntentRef),
    aiResult: useSignal(aiResultRef),
    isAiLoading: useSignal(isAiLoadingRef),
    aiError: useSignal(aiErrorRef),
    intentStatusEpoch: useSignal(intentStatusEpochRef),
    runIntent,
    preloadIntents,
    preloadSpecificIntent,
    isAiIntentReady,
    isAiIntentPending,
    getAiIntentStatus,
    isAiIntentDisabled,
    abortActiveAiRequest,
    cancelAiPreload,
    clearAiCache,
  };
}
