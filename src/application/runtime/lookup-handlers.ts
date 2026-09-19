import type { AiIntentId, AiResult, AppSettings, DictionaryEntry } from '../../types';
import {
  aiAbortScope,
  createRequestId,
  dictionaryAbortScope,
  type AiLookupPayload,
  type LookupTextPayload,
  type RuntimeSender,
  type ProviderValidationResult as RuntimeProviderValidationResult,
  type ValidateProviderPayload,
} from '../../shared/messages';
import { canonicalAiIntent } from '../../shared/ai-prompts';
import { normalizeSettings } from '../../shared/settings';
import { requestKey } from './request-coordinator';

export interface LookupHandlerDependencies {
  getSettings: () => Promise<AppSettings>;
  registerController: (tabId: number | undefined, scope: string, requestId: string) => AbortController;
  unregisterController: (tabId: number | undefined, scope: string, requestId: string) => void;
  publishLookupUpdate: (options: {
    requestId: string;
    source: 'dictionary' | 'ai';
    text: string;
    revision: number;
    result: DictionaryEntry | AiResult;
    sender?: RuntimeSender;
  }) => Promise<void>;
  dictionaryRequests: Map<string, Promise<DictionaryEntry & { requestId: string }>>;
  lookupDictionary: (
    text: string,
    settings: AppSettings,
    signal?: AbortSignal,
    onUpdate?: (entry: DictionaryEntry) => void,
    enrichmentSignal?: AbortSignal,
    onBackgroundComplete?: () => void,
  ) => Promise<DictionaryEntry>;
  analyzeAi: (
    intent: AiIntentId,
    text: string,
    targetLang: string,
    apiKey?: string,
    model?: string,
    signal?: AbortSignal,
    context?: string,
    settings?: AppSettings,
  ) => Promise<AiResult>;
  validateDictionary: (providerId: string, settings: AppSettings) => Promise<RuntimeProviderValidationResult>;
  validateTranslation: (settings: AppSettings) => Promise<RuntimeProviderValidationResult>;
  validateAi: (settings: AppSettings) => Promise<RuntimeProviderValidationResult>;
}

function mergeValidationSettings(stored: AppSettings, incoming?: Partial<AppSettings>): AppSettings {
  const sanitized: Record<string, unknown> = { ...(incoming || {}) };
  for (const key of ['aiApiKey', 'libreTranslateApiKey']) {
    if (!String(sanitized[key] || '').trim()) delete sanitized[key];
  }
  return normalizeSettings({ ...stored, ...sanitized });
}

export function createLookupHandlers(deps: LookupHandlerDependencies) {
  async function handleDictionaryLookup(payload: LookupTextPayload, sender: RuntimeSender) {
    const text = String(payload?.text || '').trim();
    if (!text) throw new Error('No text selected.');

    const requestId = payload.requestId || createRequestId('dict');
    const tabId = sender?.tab?.id;
    const scope = dictionaryAbortScope();
    const key = requestKey(tabId, scope, requestId);
    const existing = deps.dictionaryRequests.get(key);
    if (existing) return existing;

    const work = (async () => {
      const settings = await deps.getSettings();
      const lookupSettings = normalizeSettings({
        ...settings,
        dictionaryProvider: (payload.provider || settings.dictionaryProvider) as AppSettings['dictionaryProvider'],
        translateTargetLanguage: payload.targetLang || settings.translateTargetLanguage,
      });
      const controller = deps.registerController(tabId, scope, requestId);

      let backgroundStarted = false;
      try {
        const result = await deps.lookupDictionary(
          text,
          lookupSettings,
          controller.signal,
          (enriched) => {
            void deps.publishLookupUpdate({
              requestId,
              source: 'dictionary',
              text,
              revision: enriched.revision || 0,
              result: enriched,
              sender,
            });
            if (enriched.enriched) deps.unregisterController(tabId, scope, requestId);
          },
          controller.signal,
          () => {
            deps.unregisterController(tabId, scope, requestId);
            deps.dictionaryRequests.delete(key);
          },
        );
        backgroundStarted = true;
        return { ...result, requestId };
      } catch (error) {
        if (!backgroundStarted) {
          deps.unregisterController(tabId, scope, requestId);
          deps.dictionaryRequests.delete(key);
        }
        throw error;
      }
    })();

    deps.dictionaryRequests.set(key, work);
    return work;
  }

  async function handleAiLookup(payload: AiLookupPayload, sender: RuntimeSender) {
    const text = String(payload?.text || '').trim();
    if (!text) throw new Error('No text selected.');

    const settings = await deps.getSettings();
    if (!settings.enableAI) throw new Error('AI provider is disabled in settings.');

    const intent = canonicalAiIntent(payload.intent);
    const requestId = payload.requestId || createRequestId('ai');
    const tabId = sender?.tab?.id;
    const scope = aiAbortScope(intent);
    const controller = deps.registerController(tabId, scope, requestId);

    try {
      const result = await deps.analyzeAi(
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
      deps.unregisterController(tabId, scope, requestId);
    }
  }

  async function handleValidateProvider(
    payload: ValidateProviderPayload = { kind: 'dictionary' },
  ): Promise<RuntimeProviderValidationResult> {
    const stored = await deps.getSettings();
    const settings = mergeValidationSettings(stored, payload.settings);
    const kind = payload.kind || 'dictionary';

    if (kind === 'dictionary') {
      return deps.validateDictionary(payload.providerId || settings.dictionaryProvider, settings);
    }
    if (kind === 'translation') return deps.validateTranslation(settings);
    if (kind === 'ai') return deps.validateAi(settings);
    return { ok: false, error: `Unknown validation kind: ${kind}` };
  }

  return { handleDictionaryLookup, handleAiLookup, handleValidateProvider };
}
