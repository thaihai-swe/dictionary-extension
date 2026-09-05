import { TRANSLATION_FETCH_TIMEOUT_MS, safeFetch } from './provider.http';
import { ProviderLookupDto, TranslationResult } from '../types';
import { resolveLanguageCode } from '../shared/languages';

export async function fetchLibreTranslate(text: string, targetLang = 'vi', signal?: AbortSignal): Promise<ProviderLookupDto> {
  const translation = await lookupLibreTranslation(text, targetLang, signal);
  const clean = text.trim();

  return {
    word: clean,
    providerId: 'libre_translate',
    phonetics: [],
    meanings: [
      {
        partOfSpeech: 'phrase / translation',
        definitions: [
          {
            definition: translation.translatedText,
          }
        ]
      }
    ],
    translation,
  };
}

export async function lookupLibreTranslation(
  text: string,
  targetLang = 'vi',
  signal?: AbortSignal,
  baseUrl = 'https://libretranslate.com',
  apiKey = '',
): Promise<TranslationResult> {
  const clean = text.trim();
  if (!clean) throw new Error('Empty query');

  const target = resolveLanguageCode(targetLang);
  const endpoint = `${String(baseUrl || 'https://libretranslate.com').replace(/\/$/, '')}/translate`;
  const res = await safeFetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      q: clean,
      source: 'auto',
      target,
      format: 'text',
      ...(apiKey ? { api_key: apiKey } : {}),
    }),
    signal,
    timeoutMs: TRANSLATION_FETCH_TIMEOUT_MS,
  });

  const data = await res.json();
  const translatedText = (data?.translatedText as string) || clean;

  return {
    translatedText,
    targetLanguage: target,
    sourceBadges: [{ label: 'LibreTranslate', kind: 'translation' }],
  };
}
