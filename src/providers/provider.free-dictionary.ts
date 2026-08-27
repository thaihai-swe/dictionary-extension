import { safeFetch } from './provider.http';
import { DictionaryEntry } from '../types';

export async function fetchFreeDictionary(word: string, targetLang: string = 'vi', signal?: AbortSignal): Promise<DictionaryEntry> {
  const url = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`;
  const res = await safeFetch(url, { signal });
  const data = await res.json();

  if (!data || !Array.isArray(data) || data.length === 0) {
    throw new Error(`No definition found for '${word}'`);
  }

  const entry = data[0];
  const phonetics = (entry.phonetics as Array<{ text?: string; audio?: string }>) || [];

  return {
    word: (entry.word as string) || word,
    phonetics: phonetics.map(p => ({
      text: p.text || '',
      audio: p.audio || ''
    })),
    meanings: (entry.meanings as Array<{ partOfSpeech: string; definitions: Array<{ definition: string; example?: string; synonyms?: string[]; antonyms?: string[] }> }>) || [],
    sourceUrl: entry.sourceUrls ? (entry.sourceUrls as string[])[0] : undefined
  };
}
