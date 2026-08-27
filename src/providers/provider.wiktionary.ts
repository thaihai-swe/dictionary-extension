import { safeFetch } from './provider.http';
import { DictionaryEntry } from '../types';

export async function fetchWiktionary(word: string, targetLang = 'vi', signal?: AbortSignal): Promise<DictionaryEntry> {
  const clean = word.trim();
  const url = `https://en.wiktionary.org/api/rest_v1/page/definition/${encodeURIComponent(clean)}`;

  try {
    const res = await safeFetch(url, { signal });
    const data = await res.json();
    const enSections = data.en;
    if (!enSections || !Array.isArray(enSections) || enSections.length === 0) {
      throw new Error(`Wiktionary: No entry found for '${clean}'`);
    }

    const meanings = enSections.map((sec: { partOfSpeech?: string; definitions?: Array<{ definition?: string }> }) => ({
      partOfSpeech: sec.partOfSpeech || 'general',
      definitions: (sec.definitions || []).map((d: { definition?: string }) => ({
        definition: (d.definition || '').replace(/<[^>]*>/g, '').trim()
      })).filter((d: { definition: string }) => d.definition.length > 0)
    })).filter((m: { definitions: Array<{ definition: string }> }) => m.definitions.length > 0);

    return {
      word: clean,
      phonetics: [],
      meanings
    };
  } catch (e: unknown) {
    if (e instanceof Error && e.name === 'AbortError') throw e;
    throw new Error(`Wiktionary lookup failed for '${clean}'`);
  }
}
