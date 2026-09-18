import { settingsStore } from './composable.storage';
import { AiIntentId, AiResult, AppSettings } from '../types';
import { canonicalAiIntent } from '../shared/ai-prompts';
import { createPersistedLruCache, hashCacheKey } from '../shared/lookup-cache';

const AI_STORAGE_KEY = 'ai_lookup_cache_v2';
const MAX_AI_CACHE_SIZE = 50;
const AI_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export const aiCache = createPersistedLruCache<AiResult>({
  maxSize: MAX_AI_CACHE_SIZE,
  maxBytes: 8 * 1024 * 1024,
  ttlMs: AI_CACHE_TTL_MS,
  storageKey: AI_STORAGE_KEY,
  persistDelayMs: 1500,
  isPersistenceEnabled: () => settingsStore.value.persistLookupCache !== false,
});

export function getAiCacheKey(
  intentId: AiIntentId,
  text: string,
  lang: string,
  context: string | undefined,
  settings: AppSettings,
): string {
  return hashCacheKey(`${canonicalAiIntent(intentId)}|${String(text || '').toLowerCase().trim()}|${String(lang || '').toLowerCase()}|${String(context || '').toLowerCase().trim()}|${settings.aiModel || ''}|${settings.aiBaseUrl || ''}|${settings.enableLexicalProfile !== false}`);
}

export function normalizeAiLookupInput(text: string, context?: string, targetLang?: string) {
  const settings = settingsStore.value;
  const cleanText = String(text || '').trim();
  const rawContext = String(context || '').replace(/\s+/g, ' ').trim();
  const cleanContext = rawContext && rawContext.toLowerCase() !== cleanText.toLowerCase() ? rawContext : '';
  const lang = targetLang || settings.translateTargetLanguage || 'Vietnamese';
  return { cleanText, cleanContext, lang, settings };
}

export function aiCacheKeyFor(
  intentId: AiIntentId,
  text: string,
  context?: string,
  targetLang?: string,
): string {
  const { cleanText, cleanContext, lang, settings } = normalizeAiLookupInput(text, context, targetLang);
  return getAiCacheKey(canonicalAiIntent(intentId), cleanText, lang, cleanContext, settings);
}
