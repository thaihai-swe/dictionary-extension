import type { AppSettings, TranslationResult } from '../../types';
import { getTranslationProviderCatalog } from './provider-ports';

/** Translation is a separate application capability from dictionary lookup. */
export async function lookupTranslationResult(
  text: string,
  settings?: AppSettings,
  signal?: AbortSignal,
): Promise<TranslationResult | null> {
  if (settings && settings.enableTranslate === false) return null;
  const targetLang = settings?.translateTargetLanguage || 'Vietnamese';
  const providerId = settings?.translateProvider || 'google';
  const catalog = getTranslationProviderCatalog();
  const adapter = catalog.getTranslation(providerId) || catalog.getTranslation('google');
  const lookupPrimary = async (): Promise<TranslationResult | null> => {
    if (!adapter) return null;
    return adapter.lookup(text, {
      targetLang,
      signal,
      baseUrl: settings?.libreTranslateBaseUrl,
      apiKey: settings?.libreTranslateApiKey,
    });
  };
  try {
    return await lookupPrimary();
  } catch {
    if (providerId === 'mymemory') return null;
    try {
      const fallback = catalog.getTranslation('mymemory');
      if (!fallback) return null;
      return await fallback.lookup(text, { targetLang, signal });
    } catch {
      return null;
    }
  }
}
