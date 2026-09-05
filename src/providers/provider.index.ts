import type { AppSettings, ProviderValidationResult } from '../types';
import { NotFoundError } from './errors';
import { lookupSingleProvider, lookupTranslationResult } from './pipeline';

export { clearEnrichmentCache } from './cache';
export {
  fetchCombinedDictionaryResult,
  fetchDictionaryResult,
  runDictionaryEnrichment,
  lookupSingleProvider,
  lookupTranslationResult,
  resolvePrimaryProviderId,
  normalizeDictionaryResult,
} from './pipeline';
export { providerRegistry } from './registry';

export async function validateDictionaryProvider(
  providerId: string,
  settings: AppSettings,
): Promise<ProviderValidationResult> {
  const id = providerId || 'wiktionary';
  const startTime = Date.now();
  try {
    await lookupSingleProvider(id, 'hello', settings.translateTargetLanguage || 'Vietnamese', undefined, settings);
    const latencyMs = Date.now() - startTime;
    return { ok: true, providerId: id, latencyMs, message: `${id} is connected (${latencyMs}ms).` };
  } catch (error) {
    const latencyMs = Date.now() - startTime;
    if (error instanceof NotFoundError) {
      return { ok: true, providerId: id, latencyMs, message: `${id} is reachable (${latencyMs}ms).` };
    }
    return {
      ok: false,
      providerId: id,
      latencyMs,
      error: error instanceof Error ? error.message : `${id} connection failed.`,
    };
  }
}

export async function validateTranslationProvider(settings: AppSettings): Promise<ProviderValidationResult> {
  const providerId = settings.translateProvider || 'google';
  const startTime = Date.now();
  try {
    const result = await lookupTranslationResult('hello', { ...settings, enableTranslate: true });
    const latencyMs = Date.now() - startTime;
    if (!result?.translatedText) {
      return { ok: false, providerId, latencyMs, error: 'Translation provider returned an empty response.' };
    }
    return { ok: true, providerId, latencyMs, message: `${providerId} is connected (${latencyMs}ms).` };
  } catch (error) {
    const latencyMs = Date.now() - startTime;
    return {
      ok: false,
      providerId,
      latencyMs,
      error: error instanceof Error ? error.message : 'Translation connection failed.',
    };
  }
}
