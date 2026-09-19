import type {
  AppSettings,
  DictionaryEntry,
  DictionaryProviderSettings,
  ProviderLookupDto,
} from '../../types';
import { NotFoundError, isFatalDictionaryError } from '../../domain/dictionary/errors';
import {
  getPrimaryDictionaryLookupAttempts,
} from '../../shared/query-utils';
import { hasUsableDefinitions } from '../../domain/dictionary/result-policy';
import { normalizeDictionaryResult } from './normalizer';
import { getDictionaryProviderCatalog } from './provider-ports';

export function resolvePrimaryProviderId(provider: string, settings?: AppSettings): string {
  return provider || settings?.dictionaryProvider || 'wiktionary';
}

export async function lookupSingleProvider(
  providerId: string,
  query: string,
  targetLang: string,
  signal?: AbortSignal,
  settings?: DictionaryProviderSettings,
  onPartial?: (result: ProviderLookupDto) => void,
): Promise<ProviderLookupDto> {
  const catalog = getDictionaryProviderCatalog();
  const adapter = catalog.getDictionary(providerId)
    || catalog.getDictionary('free_dictionary');
  if (!adapter) {
    throw new Error(`Unknown dictionary provider: ${providerId}`);
  }
  return adapter.lookup(query, { targetLang, signal, settings, onPartial });
}

export async function fetchDictionaryResult(
  word: string,
  provider: string,
  targetLang: string = 'Vietnamese',
  signal?: AbortSignal,
  userApiKey?: string,
  userModelName?: string,
  settings?: AppSettings,
  onPartial?: (result: ProviderLookupDto) => void,
): Promise<DictionaryEntry> {
  const cleanWord = word.trim();
  const settingsWithKeys = settings || {
    aiApiKey: userApiKey || '',
    aiModel: userModelName || '',
    dictionaryProvider: provider,
    translateTargetLanguage: targetLang,
    enableTranslate: true,
    enableDictionary: true,
  } as AppSettings;

  if (provider === 'google_translate' || provider === 'libre_translate') {
    return normalizeDictionaryResult(
      await lookupSingleProvider(provider, cleanWord, targetLang, signal, settingsWithKeys),
      settingsWithKeys,
      cleanWord,
    );
  }

  const primaryId = resolvePrimaryProviderId(provider, settingsWithKeys);
  const attempts = getPrimaryDictionaryLookupAttempts(cleanWord, primaryId);
  let lastNotFoundError: unknown = null;
  let lastLookupError: unknown = null;
  let bestPartial: DictionaryEntry | null = null;

  for (const attempt of attempts) {
    if (signal?.aborted) throw new DOMException('The user aborted a request.', 'AbortError');
    try {
      const result = await lookupSingleProvider(
        attempt.providerId,
        attempt.query,
        targetLang,
        signal,
        settingsWithKeys,
        onPartial,
      );
      const normalized = normalizeDictionaryResult(result, settingsWithKeys, cleanWord, attempt.providerId);
      if (hasUsableDefinitions(normalized)) return normalized;
      if (!bestPartial) bestPartial = normalized;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') throw error;
      if (error instanceof NotFoundError) {
        lastNotFoundError = error;
        continue;
      }
      if (isFatalDictionaryError(error)) throw error;
      lastLookupError = error;
    }
  }

  if (bestPartial) return bestPartial;

  throw lastNotFoundError instanceof Error
    ? lastNotFoundError
    : lastLookupError instanceof Error
      ? lastLookupError
      : new Error(`No dictionary definition found for "${cleanWord}".`);
}
