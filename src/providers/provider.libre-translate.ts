import { safeFetch } from './provider.http';
import { DictionaryEntry } from '../types';

export async function fetchLibreTranslate(text: string, targetLang = 'vi', signal?: AbortSignal): Promise<DictionaryEntry> {
  const clean = text.trim();
  if (!clean) throw new Error('Empty query');

  const url = `https://libretranslate.com/translate`;
  const res = await safeFetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      q: clean,
      source: 'auto',
      target: targetLang,
      format: 'text'
    }),
    signal
  });

  const data = await res.json();
  const translatedText = (data?.translatedText as string) || clean;

  return {
    word: clean,
    phonetics: [],
    meanings: [
      {
        partOfSpeech: 'phrase / translation',
        definitions: [
          {
            definition: translatedText,
            example: `LibreTranslate: "${clean}"`
          }
        ]
      }
    ]
  };
}
