import { DICTIONARY_FETCH_TIMEOUT_MS, safeFetch } from './provider.http';
import { Meaning, ProviderLookupDto } from '../types';
import { normalizeDictionaryTerm } from '../shared/query-utils';
import { NotFoundError, throwForHttpStatus } from './errors';

const MAX_SLANG_DEFINITIONS = 8;

interface UrbanListItem {
  word?: string;
  definition?: string;
  example?: string;
  thumbs_up?: number;
  thumbs_down?: number;
}

function stripUrbanMarkup(value: string): string {
  return String(value || '')
    .replace(/\[([^\]]+)\]/g, '$1')
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export async function fetchUrbanDictionary(
  word: string,
  _targetLang = 'vi',
  signal?: AbortSignal,
): Promise<ProviderLookupDto> {
  const clean = normalizeDictionaryTerm(word) || String(word || '').trim();
  if (!clean) throw new NotFoundError('Urban Dictionary: empty query');

  const url = `https://api.urbandictionary.com/v0/define?term=${encodeURIComponent(clean)}`;
  const res = await safeFetch(url, { signal, timeoutMs: DICTIONARY_FETCH_TIMEOUT_MS });
  if (!res.ok) {
    throwForHttpStatus(
      res.status,
      `Urban Dictionary: No entry found for '${clean}'`,
      `Urban Dictionary lookup failed (HTTP ${res.status}).`,
    );
  }

  const data = await res.json() as { list?: UrbanListItem[] };
  const list = Array.isArray(data?.list) ? data.list : [];
  const query = clean.toLowerCase();
  const ranked = list
    .map((item) => ({
      word: String(item.word || clean).trim() || clean,
      definition: stripUrbanMarkup(item.definition || ''),
      example: stripUrbanMarkup(item.example || ''),
      thumbsUp: Number(item.thumbs_up) || 0,
    }))
    .filter((item) => {
      if (!item.definition) return false;
      // Keep exact-term slang; skip nearby phrases like "successful poo"
      return item.word.toLowerCase() === query;
    })
    .sort((a, b) => b.thumbsUp - a.thumbsUp);

  const unique: typeof ranked = [];
  for (const item of ranked) {
    if (unique.some((row) => row.definition.toLowerCase() === item.definition.toLowerCase())) continue;
    unique.push(item);
    if (unique.length >= MAX_SLANG_DEFINITIONS) break;
  }

  if (!unique.length) {
    throw new NotFoundError(`Urban Dictionary: No entry found for '${clean}'`);
  }

  const meanings: Meaning[] = [{
    partOfSpeech: 'slang',
    definitions: unique.map((item) => ({
      definition: item.definition,
      example: item.example || undefined,
    })),
  }];

  return {
    word: unique[0].word || clean,
    phonetics: [],
    meanings,
    examples: unique
      .filter((item) => item.example)
      .map((item) => ({ text: item.example })),
    providerId: 'urban_dictionary',
  };
}
