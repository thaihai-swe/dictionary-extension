import { safeFetch } from './provider.http';
import { DictionaryEntry } from '../types';

export async function fetchGoogleTranslate(text: string, targetLang = 'vi', signal?: AbortSignal): Promise<DictionaryEntry> {
  const clean = text.trim();
  if (!clean) {
    throw new Error('Empty query');
  }

  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${encodeURIComponent(targetLang)}&dt=t&q=${encodeURIComponent(clean)}`;
  
  try {
    const res = await safeFetch(url, { signal });
    const data = await res.json();
    let translation = clean;
    if (Array.isArray(data) && Array.isArray(data[0])) {
      translation = (data[0] as Array<[string]>).map((item) => item[0]).join('');
    }

    return {
      word: clean,
      phonetics: [],
      meanings: [
        {
          partOfSpeech: 'phrase / translation',
          definitions: [
            {
              definition: translation,
              example: `Bản dịch tự động cho: "${clean}"`
            }
          ]
        }
      ]
    };
  } catch (e: unknown) {
    if (e instanceof Error && e.name === 'AbortError') throw e;
    throw new Error(`Dịch tự động Google Translate thất bại cho '${clean}'`);
  }
}
