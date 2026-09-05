import { TRANSLATION_FETCH_TIMEOUT_MS, safeFetch } from './provider.http';
import { ProviderLookupDto, TranslationResult } from '../types';
import { resolveLanguageCode } from '../shared/languages';

export async function fetchGoogleTranslate(text: string, targetLang = 'vi', signal?: AbortSignal): Promise<ProviderLookupDto> {
  const translation = await lookupGoogleTranslation(text, targetLang, signal);
  const clean = text.trim();

  return {
    word: clean,
    providerId: 'google_translate',
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

export async function lookupGoogleTranslation(text: string, targetLang = 'vi', signal?: AbortSignal): Promise<TranslationResult> {
  const clean = text.trim();
  if (!clean) {
    throw new Error('Empty query');
  }

  const target = resolveLanguageCode(targetLang);
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${encodeURIComponent(target)}&dt=t&q=${encodeURIComponent(clean)}`;
  
  try {
    const res = await safeFetch(url, { signal, timeoutMs: TRANSLATION_FETCH_TIMEOUT_MS });
    const data = await res.json();
    let translation = clean;
    if (Array.isArray(data) && Array.isArray(data[0])) {
      translation = (data[0] as Array<[string]>).map((item) => item[0]).join('');
    }
    const detectedLanguage = typeof data?.[2] === 'string' ? data[2] : 'auto';

    return {
      translatedText: translation,
      detectedLanguage,
      targetLanguage: target,
      sourceBadges: [{ label: 'Google Translate', kind: 'translation' }],
    };
  } catch (e: unknown) {
    if (e instanceof Error && e.name === 'AbortError') throw e;
    throw new Error(`Google Translate failed for '${clean}'`);
  }
}
