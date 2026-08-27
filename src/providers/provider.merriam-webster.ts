import { safeFetch } from './provider.http';
import { DictionaryEntry } from '../types';

export async function fetchMerriamWebster(word: string, targetLang = 'vi', signal?: AbortSignal): Promise<DictionaryEntry> {
  const clean = word.trim();
  const apiKey = 'test_key'; // Fallback / default
  const url = `https://www.dictionaryapi.com/api/v3/references/collegiate/json/${encodeURIComponent(clean)}?key=${apiKey}`;

  try {
    const res = await safeFetch(url, { signal });
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0 || typeof data[0] === 'string') {
      throw new Error(`Merriam-Webster: No definition found for '${clean}'`);
    }

    const first = data[0];
    const fl = (first.fl as string) || 'noun';
    const shortdefs = (first.shortdef as string[]) || [];

    return {
      word: clean,
      phonetics: [],
      meanings: [
        {
          partOfSpeech: fl,
          definitions: shortdefs.map(d => ({ definition: d }))
        }
      ]
    };
  } catch (e: unknown) {
    if (e instanceof Error && e.name === 'AbortError') throw e;
    throw new Error(`Merriam-Webster lookup failed for '${clean}'`);
  }
}
