import { TRANSLATION_FETCH_TIMEOUT_MS, safeFetch } from './provider.http';
import { TranslationResult } from '../types';
import { resolveLanguageCode } from '../shared/languages';

function isGarbageTranslation(value: string): boolean {
  const text = String(value || '').trim();
  if (!text) return true;
  if (/\[object\s+\w+\]/i.test(text)) return true;
  if (/^MYMEMORY WARNING/i.test(text)) return true;
  return false;
}

export async function lookupMyMemoryTranslation(
  text: string,
  targetLang = 'vi',
  signal?: AbortSignal,
): Promise<TranslationResult> {
  const clean = text.trim();
  if (!clean) throw new Error('Empty query');

  const target = resolveLanguageCode(targetLang);
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(clean)}&langpair=en|${encodeURIComponent(target)}`;
  const res = await safeFetch(url, { signal, timeoutMs: TRANSLATION_FETCH_TIMEOUT_MS });
  if (!res.ok) {
    throw new Error(`MyMemory lookup failed (HTTP ${res.status}).`);
  }

  const data = await res.json() as {
    responseData?: { translatedText?: string };
    matches?: Array<{ translation?: string; quality?: string | number }>;
  };

  const candidates = [
    data?.responseData?.translatedText,
    ...(Array.isArray(data?.matches)
      ? [...data.matches]
          .sort((a, b) => Number(b.quality) - Number(a.quality))
          .map((item) => item.translation)
      : []),
  ]
    .map((item) => String(item || '').trim())
    .filter((item) => item && !isGarbageTranslation(item) && item.toLowerCase() !== clean.toLowerCase());

  const translatedText = candidates[0];
  if (!translatedText) {
    throw new Error(`MyMemory returned no translation for '${clean}'`);
  }

  return {
    translatedText,
    detectedLanguage: 'en',
    targetLanguage: target,
    sourceBadges: [{ label: 'MyMemory', kind: 'translation', providerId: 'mymemory' }],
  };
}
