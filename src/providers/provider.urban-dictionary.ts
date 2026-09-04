import { safeFetch } from './provider.http';
import { DictionaryEntry, Meaning } from '../types';
import { normalizeDictionaryTerm } from '../shared/query-utils';
import { NotFoundError, throwForHttpStatus } from './errors';

const MAX_SLANG_DEFINITIONS = 3;
const MIN_THUMBS_UP = 5;

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
): Promise<DictionaryEntry> {
  const clean = normalizeDictionaryTerm(word) || String(word || '').trim();
  if (!clean) throw new NotFoundError('Urban Dictionary: empty query');

  const url = `https://api.urbandictionary.com/v0/define?term=${encodeURIComponent(clean)}`;
  const res = await safeFetch(url, { signal, timeoutMs: 30000 });
  if (!res.ok) {
    throwForHttpStatus(
      res.status,
      `Urban Dictionary: No entry found for '${clean}'`,
      `Urban Dictionary lookup failed (HTTP ${res.status}).`,
    );
  }

  const data = await res.json() as { list?: UrbanListItem[] };
  const list = Array.isArray(data?.list) ? data.list : [];
  const ranked = list
    .map((item) => ({
      word: String(item.word || clean).trim() || clean,
      definition: stripUrbanMarkup(item.definition || ''),
      example: stripUrbanMarkup(item.example || ''),
      thumbsUp: Number(item.thumbs_up) || 0,
    }))
    .filter((item) => item.definition && item.thumbsUp >= MIN_THUMBS_UP)
    .sort((a, b) => b.thumbsUp - a.thumbsUp)
    .slice(0, MAX_SLANG_DEFINITIONS);

  if (!ranked.length) {
    throw new NotFoundError(`Urban Dictionary: No entry found for '${clean}'`);
  }

  const meanings: Meaning[] = [{
    partOfSpeech: 'slang',
    source: 'Urban Dictionary',
    definitions: ranked.map((item) => ({
      definition: item.definition,
      example: item.example || undefined,
      source: 'Urban Dictionary',
    })),
  }];

  return {
    word: ranked[0].word || clean,
    phonetics: [],
    meanings,
    examples: ranked
      .filter((item) => item.example)
      .map((item) => ({ text: item.example, source: 'Urban Dictionary' })),
    providerId: 'urban_dictionary',
    sourceBadges: [{ label: 'Urban Dictionary', kind: 'dictionary', providerId: 'urban_dictionary' }],
  };
}
