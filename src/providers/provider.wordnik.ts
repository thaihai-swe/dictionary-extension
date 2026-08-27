import { safeFetch } from './provider.http';
import { DictionaryEntry } from '../types';

export async function fetchWordnik(word: string, targetLang = 'vi', signal?: AbortSignal): Promise<DictionaryEntry> {
  const clean = word.trim();
  const apiKey = 'a2a73e7b926c924fad7001ca3111acd55af2ffabf50eb4ae5'; // Public demo key
  const url = `https://api.wordnik.com/v4/word.json/${encodeURIComponent(clean)}/definitions?limit=5&includeRelated=false&useCanonical=true&includeTags=false&api_key=${apiKey}`;

  try {
    const res = await safeFetch(url, { signal });
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error(`Wordnik: No definition found for '${clean}'`);
    }

    const meaningsMap: Record<string, Array<{ definition: string }>> = {};

    for (const item of data) {
      const pos = (item.partOfSpeech as string) || 'general';
      const text = (item.text as string) || '';
      if (!text) continue;

      if (!meaningsMap[pos]) meaningsMap[pos] = [];
      meaningsMap[pos].push({ definition: text.replace(/<[^>]*>/g, '').trim() });
    }

    const meanings = Object.entries(meaningsMap).map(([partOfSpeech, definitions]) => ({
      partOfSpeech,
      definitions
    }));

    return {
      word: clean,
      phonetics: [],
      meanings
    };
  } catch (e: unknown) {
    if (e instanceof Error && e.name === 'AbortError') throw e;
    throw new Error(`Wordnik lookup failed for '${clean}'`);
  }
}
