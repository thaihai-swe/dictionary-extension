import { DictionaryEntry } from '../types';
import { fetchFreeDictionary } from './provider.free-dictionary';
import { fetchGoogleTranslate } from './provider.google-translate';
import { fetchWiktionary } from './provider.wiktionary';
import { fetchMerriamWebster } from './provider.merriam-webster';
import { fetchWordnik } from './provider.wordnik';
import { fetchLibreTranslate } from './provider.libre-translate';

export async function fetchDictionaryResult(
  word: string,
  provider: string,
  targetLang: string = 'vi',
  signal?: AbortSignal
): Promise<DictionaryEntry> {
  const cleanWord = word.trim();

  switch (provider) {
    case 'google_translate':
      return fetchGoogleTranslate(cleanWord, targetLang, signal);
    case 'wiktionary':
      return fetchWiktionary(cleanWord, targetLang, signal);
    case 'merriam_webster':
      return fetchMerriamWebster(cleanWord, targetLang, signal);
    case 'wordnik':
      return fetchWordnik(cleanWord, targetLang, signal);
    case 'libre_translate':
      return fetchLibreTranslate(cleanWord, targetLang, signal);
    case 'free_dictionary':
    default:
      try {
        return await fetchFreeDictionary(cleanWord, targetLang, signal);
      } catch (err) {
        // Fallback to Google Translate if free dictionary fails
        return await fetchGoogleTranslate(cleanWord, targetLang, signal);
      }
  }
}
