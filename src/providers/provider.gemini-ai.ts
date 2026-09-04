import { AiIntentId, AiResult, AppSettings } from '../types';
import { lookupGoogleTranslation } from './provider.google-translate';
import { AI_FETCH_TIMEOUT_MS, safeFetch } from './provider.http';
import {
  DEFAULT_AI_COMPARE_PROMPT_TEMPLATE,
  DEFAULT_AI_CONTEXT_PROMPT_TEMPLATE,
  DEFAULT_AI_GRAMMAR_PROMPT_TEMPLATE,
  DEFAULT_AI_PHRASE_EXPLORER_PROMPT_TEMPLATE,
  DEFAULT_AI_PHRASE_FALLBACK_PROMPT_TEMPLATE,
  DEFAULT_AI_PROMPT_TEMPLATE,
  DEFAULT_AI_REPHRASE_PROMPT_TEMPLATE,
  DEFAULT_AI_SENTENCE_PROMPT_TEMPLATE,
  appendInputContract,
  applyTemplate,
  canonicalAiIntent,
  countWords,
  lexicalExtrasForIntent,
  shouldRequestLexicalProfile,
} from '../shared/ai-prompts';
import {
  normalizeComparisonData,
  normalizeRephraseStyles,
  normalizeSentenceBreakdown,
  parseLexicalProfileFromResponse,
  stripLexicalProfileBlock,
  extractJsonObject,
} from '../shared/query-utils';
import {
  errorMessageFromOpenAiBody,
  extractOpenAiContent,
} from '../shared/openai-response';
import {
  DEFAULT_GEMINI_MODEL,
  DEFAULT_OPENAI_BASE_URL,
  defaultAiBaseUrlFor,
  defaultAiModelFor,
  isOpenAiStandard,
} from '../shared/settings.ts';

const GEMINI_MODELS = [
  DEFAULT_GEMINI_MODEL,
];

function resolveQueryAndContext(query: string, context?: string): { term: string; surrounding: string } {
  const term = query.trim();
  const surrounding = String(context || '').trim();
  return {
    term,
    surrounding: surrounding && surrounding.toLowerCase() !== term.toLowerCase() ? surrounding : '',
  };
}

function isTransientGeminiError(message: string, status?: number): boolean {
  const text = String(message || '').toLowerCase();
  return (
    status === 429
    || status === 500
    || status === 503
    || text.includes('high demand')
    || text.includes('overloaded')
    || text.includes('resource_exhausted')
    || text.includes('too many requests')
    || text.includes('rate limit')
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function templateForIntent(intent: AiIntentId, settings?: AppSettings): string {
  const pick = (value?: string, fallback?: string) => (value && value.trim() ? value : fallback || '');
  switch (intent) {
    case 'explain_in_context':
      return pick(settings?.aiContextPromptTemplate, DEFAULT_AI_CONTEXT_PROMPT_TEMPLATE);
    case 'grammar':
      return pick(settings?.aiGrammarPromptTemplate, DEFAULT_AI_GRAMMAR_PROMPT_TEMPLATE);
    case 'sentence_breakdown':
      return pick(settings?.aiSentencePromptTemplate, DEFAULT_AI_SENTENCE_PROMPT_TEMPLATE);
    case 'collocations':
      return pick(settings?.aiPhraseExplorerPromptTemplate, DEFAULT_AI_PHRASE_EXPLORER_PROMPT_TEMPLATE);
    case 'confusables':
      return pick(settings?.aiComparePromptTemplate, DEFAULT_AI_COMPARE_PROMPT_TEMPLATE);
    case 'rephrase':
      return pick(settings?.aiRephrasePromptTemplate, DEFAULT_AI_REPHRASE_PROMPT_TEMPLATE);
    case 'phrase_fallback':
      return DEFAULT_AI_PHRASE_FALLBACK_PROMPT_TEMPLATE;
    default:
      return pick(settings?.aiPromptTemplate || settings?.aiDefaultPromptTemplate, DEFAULT_AI_PROMPT_TEMPLATE);
  }
}

export function buildPrompt(
  text: string,
  settings: AppSettings | undefined,
  context: string,
  intent: AiIntentId,
): string {
  const canonical = canonicalAiIntent(intent);
  if (canonical === 'explain_in_context' && !String(context || '').trim()) {
    throw new Error('No surrounding page context is available for this lookup.');
  }
  const variables = {
    text,
    str: text,
    sentence: context || text,
    context: context || '',
    word_count: countWords(text),
    targetLang: settings?.translateTargetLanguage || 'Vietnamese',
    enableLexicalProfile: shouldRequestLexicalProfile(canonical, settings?.enableLexicalProfile),
    lexicalExtras: shouldRequestLexicalProfile(canonical, settings?.enableLexicalProfile)
      ? lexicalExtrasForIntent(canonical)
      : [],
  };
  return appendInputContract(applyTemplate(templateForIntent(canonical, settings), variables), variables);
}

async function requestGeminiText(prompt: string, apiKey: string, model: string, signal?: AbortSignal): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const res = await safeFetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.3, maxOutputTokens: 6144, responseMimeType: 'text/plain' },
    }),
    signal,
    timeoutMs: AI_FETCH_TIMEOUT_MS,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = data?.error?.message || `Gemini request failed (HTTP ${res.status}).`;
    const error = new Error(message) as Error & { status?: number };
    error.status = res.status;
    throw error;
  }
  const text = data.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text || '').join('\n');
  if (!text) throw new Error('Gemini returned an empty response.');
  return String(text).trim();
}

async function callGeminiApi(prompt: string, apiKey: string, preferredModel?: string, signal?: AbortSignal): Promise<string> {
  const models = preferredModel
    ? [preferredModel, ...GEMINI_MODELS.filter((model) => model !== preferredModel)]
    : GEMINI_MODELS;
  let lastErr = 'Gemini API call failed';

  for (let i = 0; i < models.length; i += 1) {
    const model = models[i];
    const maxAttempts = i === 0 ? 2 : 1;
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      if (signal?.aborted) throw new DOMException('The user aborted a request.', 'AbortError');
      try {
        return await requestGeminiText(prompt, apiKey, model, signal);
      } catch (error: unknown) {
        if (error instanceof Error && error.name === 'AbortError') throw error;
        const status = (error as { status?: number })?.status;
        const message = error instanceof Error ? error.message : String(error);
        lastErr = message;
        if (!isTransientGeminiError(message, status)) {
          if (i === models.length - 1) throw error;
          break;
        }
        if (attempt < maxAttempts - 1) await sleep(700 * (attempt + 1));
      }
    }
  }

  throw new Error(lastErr);
}

function buildChatCompletionsUrl(baseUrl?: string): string {
  const normalized = String(baseUrl || DEFAULT_OPENAI_BASE_URL).trim().replace(/\/+$/, '');
  if (normalized.endsWith('/chat/completions')) return normalized;
  return `${normalized}/chat/completions`;
}

async function requestOpenAiCompatible(prompt: string, settings: AppSettings, signal?: AbortSignal): Promise<string> {
  const url = buildChatCompletionsUrl(settings.aiBaseUrl);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json, text/event-stream',
  };
  const key = String(settings.aiApiKey || '').trim();
  if (key) {
    headers.Authorization = `Bearer ${key}`;
  }
  const body = {
    model: settings.aiModel?.trim() || '',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.2,
    stream: false,
  };
  const res = await safeFetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    signal,
    timeoutMs: AI_FETCH_TIMEOUT_MS,
  });
  const rawText = await res.text();
  if (!res.ok) {
    throw new Error(errorMessageFromOpenAiBody(rawText, res.status));
  }
  const content = extractOpenAiContent(rawText);
  if (!content.trim()) throw new Error('AI provider returned an empty response.');
  return content;
}

export async function validateAiProvider(settings: AppSettings): Promise<{ ok: boolean; latencyMs?: number; error?: string; message?: string }> {
  const isStandard = isOpenAiStandard(settings);
  const missing: string[] = [];
  if (!isStandard && !settings?.aiApiKey?.trim()) missing.push('API key');
  if (!settings?.aiModel?.trim()) missing.push('model');
  if (missing.length) return { ok: false, error: `Missing AI setting: ${missing.join(', ')}.` };

  const startTime = Date.now();
  try {
    const prompt = 'Reply with exactly: ok';
    const content = isStandard
      ? await requestOpenAiCompatible(prompt, settings)
      : await callGeminiApi(prompt, settings.aiApiKey, settings.aiModel);
    const latencyMs = Date.now() - startTime;
    if (!String(content || '').trim()) return { ok: false, latencyMs, error: 'AI provider returned an empty response.' };
    return { ok: true, latencyMs, message: `AI provider is connected (${latencyMs}ms).` };
  } catch (error) {
    return {
      ok: false,
      latencyMs: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'AI provider connection failed.',
    };
  }
}

function buildOfflineFallback(intentId: AiIntentId, term: string, trimmed: string, translation: string, targetLang: string): AiResult {
  const isLong = trimmed.split(/\s+/).length > 4;
  if (intentId === 'sentence_breakdown') {
    return {
      type: 'sentence_breakdown',
      query: trimmed,
      summary: `### Clause & Structure Breakdown\nConfigure an AI endpoint in Settings for a real syntactic parse.\n\n### Translation & Context\n${translation}`,
      structure: [
        { text: trimmed, role: 'Full clause', explanation: 'Complete query or context sentence' },
      ],
      translation,
    };
  }
  if (intentId === 'default') {
    return {
      type: intentId,
      query: term,
      summary: `**${term}** *word*\n\n${translation}\n\n### Senses & Meanings\n1. *(word)* Concise definition — ${translation}\n\n### Translation & Meaning\n**${term}** — ${translation}\n\n### Usage Note\nRegister and nuance depend on the surrounding sentence.\n\n### Example Sentences\n> "${trimmed}"\n\n### Deep Understanding\nConfigure an AI endpoint in Settings for Oxford-style senses, bilingual glosses, usage notes, and etymology.`,
      translation,
    };
  }
  if (intentId === 'explain_in_context') {
    return {
      type: intentId,
      query: term,
      summary: `### Meaning in Context\nIn this sentence, **"${term}"** means **${translation}**.\n\n### Role & Quick Test\nEnter an API key to see the grammatical job of this word and a one-line substitution test.\n\n### Direct Substitutions\nEnter an API key for contextual synonyms.\n\n> "${trimmed}"`,
      translation,
    };
  }
  if (intentId === 'grammar') {
    return {
      type: intentId,
      query: term,
      summary: `### Syntactic Breakdown\n• Selected text: "${term}"\n• Structure: ${isLong ? 'clause / complex sentence' : 'phrase'}\n• Translation: ${translation}\n\n> "${trimmed}"`,
      translation,
    };
  }
  if (intentId === 'collocations') {
    return {
      type: intentId,
      query: term,
      summary: `### Core Meaning\n• Query: "${term}"\n• Translation: ${translation}\n\n> "${trimmed}"`,
      translation,
    };
  }
  if (intentId === 'confusables') {
    return {
      type: intentId,
      query: term,
      summary: `### Core Distinction\n• Term: "${term}"\n• Meaning: ${translation}\n\n> "${trimmed}"`,
      translation,
      comparison: {
        coreDistinction: `Enter an API key to compare "${term}" with its nearest confusable.`,
        rows: [],
      },
    };
  }
  if (intentId === 'rephrase') {
    return {
      type: intentId,
      query: term,
      summary: `### Simplified Version\n> "${trimmed}"\n\n### Academic & Formal\nConfigure an AI endpoint to rewrite in three styles (${targetLang}).`,
      translation,
      rephraseStyles: [
        {
          style: 'simplified',
          label: 'Simplified',
          text: trimmed,
          note: `Enter an API key to rewrite this sentence in three styles (${targetLang}).`,
        },
      ],
    };
  }
  return {
    type: intentId,
    query: term,
    summary: `### AI analysis\n"${term}": ${translation}`,
    translation,
  };
}

export async function fetchAiAnalysis(
  intentId: AiIntentId,
  text: string,
  targetLang = 'vi',
  userApiKey?: string,
  userModelName?: string,
  signal?: AbortSignal,
  context?: string,
  settings?: AppSettings,
): Promise<AiResult> {
  const trimmed = text.trim();
  if (!trimmed) throw new Error('Context text cannot be empty');

  const canonical = canonicalAiIntent(intentId);
  const { term, surrounding } = resolveQueryAndContext(trimmed, context);
  const promptContext = surrounding || (canonical === 'explain_in_context' ? '' : trimmed);

  let translation = trimmed;
  try {
    const gtResult = await lookupGoogleTranslation(trimmed, targetLang, signal);
    translation = gtResult.translatedText || trimmed;
  } catch {
    // Ignore translation fallback failure
  }

  if (signal?.aborted) throw new DOMException('The user aborted a request.', 'AbortError');

  const apiKey = userApiKey?.trim() || settings?.aiApiKey?.trim() || '';
  const isStandard = isOpenAiStandard(settings);
  const provider = isStandard ? 'openai' : 'gemini';
  const modelName = userModelName?.trim() || settings?.aiModel?.trim() || defaultAiModelFor(provider);
  const baseUrl = settings?.aiBaseUrl?.trim() || defaultAiBaseUrlFor(provider);

  const effectiveSettings = {
    ...(settings || {}),
    aiProvider: provider,
    aiApiKey: apiKey,
    aiModel: modelName,
    aiBaseUrl: baseUrl,
    translateTargetLanguage: targetLang,
  } as AppSettings;

  const canAttemptNetwork = isStandard ? Boolean(modelName) : Boolean(apiKey);

  if (canAttemptNetwork) {
    try {
      const prompt = buildPrompt(term, effectiveSettings, promptContext, canonical);
      const raw = isStandard
        ? await requestOpenAiCompatible(prompt, effectiveSettings, signal)
        : await callGeminiApi(prompt, apiKey, modelName, signal);
      const lexicalProfile = parseLexicalProfileFromResponse(raw) || undefined;
      const content = stripLexicalProfileBlock(raw);

      if (canonical === 'sentence_breakdown') {
        const structured = normalizeSentenceBreakdown(extractJsonObject(raw) || extractJsonObject(content), {
          text: trimmed,
          context: promptContext,
          sentence: promptContext || trimmed,
        });
        if (structured) {
          return {
            type: 'sentence_breakdown',
            query: trimmed,
            summary: content,
            structure: structured.structure,
            phrases: structured.phrases,
            translation: structured.translation || translation,
            lexicalProfile,
          };
        }
      }

      if (canonical === 'confusables') {
        const comparison = normalizeComparisonData(content, { text: term });
        return {
          type: canonical,
          query: term,
          summary: content,
          translation,
          lexicalProfile,
          comparison: comparison || undefined,
        };
      }

      if (canonical === 'rephrase') {
        const rephraseStyles = normalizeRephraseStyles(content);
        return {
          type: canonical,
          query: term,
          summary: content,
          translation,
          lexicalProfile,
          rephraseStyles: rephraseStyles.length ? rephraseStyles : undefined,
        };
      }

      return {
        type: canonical,
        query: term,
        summary: content,
        translation,
        lexicalProfile,
      };
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') throw err;
      throw err instanceof Error ? err : new Error('AI provider request failed.');
    }
  }

  return buildOfflineFallback(canonical, term, trimmed, translation, targetLang);
}
