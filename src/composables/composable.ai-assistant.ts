import { ref } from 'vue';
import { useStorage } from './composable.storage';
import { stopAllAudio } from './composable.dictionary';
import { AiResult, AiIntentId, AppSettings } from '../types';
import { canonicalAiIntent, PRELOAD_ALL_INTENTS, PRELOAD_FOLLOW_UPS } from '../shared/ai-prompts';
import { cancelAiLookup, createRequestId, requestAiLookup } from '../shared/runtime-client';

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

const activeContext = ref<string>('');
const activeIntent = ref<AiIntentId>('default');
const aiResult = ref<AiResult | null>(null);
const isAiLoading = ref<boolean>(false);
const aiError = ref<string | null>(null);

let activeAiRequestId: string | null = null;
let preloadToken = 0;
let aiGeneration = 0;

const MAX_AI_CACHE_SIZE = 50;
const AI_CACHE_TTL_MS = 10 * 60 * 1000;

interface AiCacheEntry {
  value: AiResult;
  createdAt: number;
}

const aiCacheMap = new Map<string, AiCacheEntry>();
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

function readAiCache(key: string): AiResult | undefined {
  const entry = aiCacheMap.get(key);
  if (!entry) return undefined;
  if (Date.now() - entry.createdAt > AI_CACHE_TTL_MS) {
    aiCacheMap.delete(key);
    return undefined;
  }
  aiCacheMap.delete(key);
  aiCacheMap.set(key, entry);
  return entry.value;
}

function writeAiCache(key: string, value: AiResult) {
  aiCacheMap.delete(key);
  aiCacheMap.set(key, { value, createdAt: Date.now() });
  while (aiCacheMap.size > MAX_AI_CACHE_SIZE) {
    const oldestKey = aiCacheMap.keys().next().value;
    if (!oldestKey) break;
    aiCacheMap.delete(oldestKey);
  }
}

export function clearAiCache() {
  aiCacheMap.clear();
  aiPendingMap.clear();
}

export function abortActiveAiRequest() {
  stopAllAudio();
  aiGeneration += 1;
  if (activeAiRequestId) {
    cancelAiLookup(activeIntent.value, activeAiRequestId);
    activeAiRequestId = null;
  }
  isAiLoading.value = false;
}

export function cancelAiPreload() {
  preloadToken += 1;
}

export function useAiAssistant() {
  const { settings } = useStorage();

  async function requestAnalysis(
    intentId: AiIntentId,
    text: string,
    targetLang: string,
    context: string,
  ): Promise<AiResult> {
    const cacheKey = getAiCacheKey(intentId, text, targetLang, context, settings.value);
    const cached = readAiCache(cacheKey);
    if (cached) return cached;

    const pending = aiPendingMap.get(cacheKey);
    if (pending) return pending;

    const request = requestAiLookup({
      text,
      context,
      intent: intentId,
      targetLang,
      requestId: createRequestId('ai'),
    }).then((result) => {
      writeAiCache(cacheKey, result);
      return result;
    }).finally(() => {
      aiPendingMap.delete(cacheKey);
    });

    aiPendingMap.set(cacheKey, request);
    return request;
  }

  async function runIntent(intentId: AiIntentId, text: string, targetLang?: string, context?: string) {
    if (!text || !text.trim()) return;
    if (!settings.value.enableAI) {
      aiError.value = 'AI is disabled in Settings.';
      return;
    }

    const cleanText = text.trim();
    const rawContext = String(context || '').replace(/\s+/g, ' ').trim();
    const cleanContext = rawContext && rawContext.toLowerCase() !== cleanText.toLowerCase() ? rawContext : '';
    const nextIntent = canonicalAiIntent(intentId);
    const lang = targetLang || settings.value.translateTargetLanguage || 'Vietnamese';
    const cacheKey = getAiCacheKey(nextIntent, cleanText, lang, cleanContext, settings.value);
    const cached = readAiCache(cacheKey);
    const pending = aiPendingMap.get(cacheKey);

    activeContext.value = cleanContext;
    activeIntent.value = nextIntent;
    aiError.value = null;

    if (cached) {
      aiResult.value = cached;
      isAiLoading.value = false;
      if (settings.value.enableAiPreload) {
        void continuePreloadAfter(nextIntent, cleanText, cleanContext, lang);
      }
      return;
    }

    abortActiveAiRequest();
    const requestId = createRequestId('ai');
    activeAiRequestId = requestId;
    const generation = ++aiGeneration;
    if (aiResult.value?.query?.trim().toLowerCase() !== cleanText.toLowerCase()) {
      aiResult.value = null;
    }
    isAiLoading.value = true;

    try {
      const result = await (pending || requestAiLookup({
        text: cleanText,
        context: cleanContext,
        intent: nextIntent,
        targetLang: lang,
        requestId,
      }).then((value) => {
        writeAiCache(cacheKey, value);
        return value;
      }));
      if (generation !== aiGeneration) return;
      aiResult.value = result;
      if (settings.value.enableAiPreload) {
        void continuePreloadAfter(nextIntent, cleanText, cleanContext, lang);
      }
    } catch (err: unknown) {
      if (err instanceof Error && (/abort/i.test(err.message) || err.name === 'AbortError')) return;
      if (generation !== aiGeneration) return;
      const message = err instanceof Error ? err.message : 'Dịch vụ AI phản hồi không hợp lệ.';
      aiError.value = /Extension context invalidated|runtime is unavailable/i.test(message)
        ? 'Extension was reloaded. Refresh this page and try again.'
        : message;
      aiResult.value = null;
    } finally {
      if (generation === aiGeneration) {
        isAiLoading.value = false;
        if (activeAiRequestId === requestId) activeAiRequestId = null;
      }
    }
  }

  async function preloadIntentChunks(intentIds: AiIntentId[] = PRELOAD_ALL_INTENTS) {
    const { preloadAiIntentChunks } = await import('../components/async-views');
    await preloadAiIntentChunks(intentIds);
  }

  async function preloadRemainingIntents(
    text: string,
    context: string,
    targetLang: string,
    skipIntent?: AiIntentId,
    token = ++preloadToken,
  ) {
    const remaining = PRELOAD_FOLLOW_UPS.filter((intent) => intent !== skipIntent);
    void preloadIntentChunks(remaining);
    await Promise.allSettled(remaining.map(async (intent) => {
      if (token !== preloadToken) return;
      if (intent === 'explain_in_context' && !context) return;
      try {
        await requestAnalysis(intent, text, targetLang, context);
      } catch {
        // Keep follow-up preload failures silent.
      }
    }));
  }

  async function continuePreloadAfter(
    currentIntent: AiIntentId,
    text: string,
    context: string,
    targetLang: string,
  ) {
    if (!settings.value.enableAiPreload || !settings.value.enableAI) return;
    await preloadRemainingIntents(text, context, targetLang, currentIntent);
  }

  async function preloadIntents(text: string, context?: string, targetLang?: string) {
    if (!settings.value.enableAiPreload || !settings.value.enableAI) return;
    const cleanText = String(text || '').trim();
    if (!cleanText) return;
    const lang = targetLang || settings.value.translateTargetLanguage || 'Vietnamese';
    const rawContext = String(context || activeContext.value || '').replace(/\s+/g, ' ').trim();
    const cleanContext = rawContext && rawContext.toLowerCase() !== cleanText.toLowerCase() ? rawContext : '';
    activeContext.value = cleanContext;
    const token = ++preloadToken;
    void preloadIntentChunks(PRELOAD_ALL_INTENTS);

    try {
      await requestAnalysis('default', cleanText, lang, cleanContext);
    } catch {
      // Main AI preload can fail silently; Dictionary tab stays usable.
    }

    if (token !== preloadToken) return;
    await preloadRemainingIntents(cleanText, cleanContext, lang, 'default', token);
  }

  return {
    activeContext,
    activeIntent,
    aiResult,
    isAiLoading,
    aiError,
    runIntent,
    preloadIntents,
    abortActiveAiRequest,
    cancelAiPreload,
    clearAiCache,
  };
}
