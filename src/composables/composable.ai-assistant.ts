import { ref } from 'vue';
import { fetchAiAnalysis, abortGeminiApiRequest } from '../providers/provider.gemini-ai';
import { useStorage } from './composable.storage';
import { stopAllAudio } from './composable.dictionary';
import { AiResult, AiIntentId } from '../types';

export interface AiIntentOption {
  id: AiIntentId;
  label: string;
  icon: string;
}

export const AI_INTENTS: AiIntentOption[] = [
  { id: 'explain_in_context', label: 'Context Explain', icon: '🔍' },
  { id: 'grammar', label: 'Grammar & Nuance', icon: '📐' },
  { id: 'collocations', label: 'Phrase & Collocations', icon: '💡' },
  { id: 'sentence_breakdown', label: 'Sentence Breakdown', icon: '🧩' },
  { id: 'confusables', label: 'Compare Confusables', icon: '⚖️' },
  { id: 'rephrase', label: 'Rephrase', icon: '✨' },
];

const activeContext = ref<string>('');
const activeIntent = ref<AiIntentId>('explain_in_context');
const aiResult = ref<AiResult | null>(null);
const isAiLoading = ref<boolean>(false);
const aiError = ref<string | null>(null);

let activeAiController: AbortController | null = null;

// High-performance LRU Cache for Gemini AI Responses
const MAX_AI_CACHE_SIZE = 50;
const aiCacheMap = new Map<string, AiResult>();

function getAiCacheKey(intentId: AiIntentId, text: string, lang: string): string {
  return `${intentId}:${lang.toLowerCase()}:${text.toLowerCase().trim()}`;
}

export function clearAiCache() {
  aiCacheMap.clear();
}

export function abortActiveAiRequest() {
  stopAllAudio();
  if (activeAiController) {
    activeAiController.abort();
    activeAiController = null;
  }
  abortGeminiApiRequest();
  isAiLoading.value = false;
}

export function useAiAssistant() {
  const { settings } = useStorage();

  async function runIntent(intentId: AiIntentId, text: string, targetLang?: string) {
    if (!text || !text.trim()) return;

    abortActiveAiRequest();
    activeAiController = new AbortController();

    const cleanText = text.trim();
    activeContext.value = cleanText;
    activeIntent.value = intentId;
    aiError.value = null;

    const lang = targetLang || settings.value.translateTargetLanguage || 'vi';
    const cacheKey = getAiCacheKey(intentId, cleanText, lang);

    // ⚡ Instant Cache Hit for AI Intent (0ms Response, Saves Gemini Tokens)
    if (aiCacheMap.has(cacheKey)) {
      aiResult.value = aiCacheMap.get(cacheKey)!;
      isAiLoading.value = false;
      return;
    }

    isAiLoading.value = true;

    try {
      const result = await fetchAiAnalysis(
        intentId,
        cleanText,
        lang,
        settings.value.aiApiKey,
        settings.value.aiModel || 'gemini-2.5-flash',
        activeAiController.signal
      );
      aiResult.value = result;

      // Save to LRU Cache
      if (aiCacheMap.size >= MAX_AI_CACHE_SIZE) {
        const oldestKey = aiCacheMap.keys().next().value;
        if (oldestKey) aiCacheMap.delete(oldestKey);
      }
      aiCacheMap.set(cacheKey, result);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      aiError.value = err instanceof Error ? err.message : 'Dịch vụ AI phản hồi không hợp lệ.';
    } finally {
      isAiLoading.value = false;
      activeAiController = null;
    }
  }

  return {
    activeContext,
    activeIntent,
    aiResult,
    isAiLoading,
    aiError,
    runIntent,
    abortActiveAiRequest,
    clearAiCache,
  };
}
