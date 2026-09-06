import { DICTIONARY_FETCH_TIMEOUT_MS, safeFetch } from './provider.http.ts';
import type { Meaning, ProviderLookupDto } from '../types/index.ts';
import { normalizeDictionaryTerm } from '../shared/query-utils.ts';
import { NotFoundError, throwForHttpStatus } from './errors.ts';

const MAX_SLANG_DEFINITIONS = 5;
const MIN_THUMBS_UP = 100;
const MIN_NET_SCORE = 50;
const MIN_APPROVAL_RATIO = 0.70;

export interface UrbanListItem {
  word?: string;
  definition?: string;
  example?: string;
  thumbs_up?: number;
  thumbs_down?: number;
}

export interface FilteredUrbanEntry {
  word: string;
  definition: string;
  example: string;
  thumbsUp: number;
  thumbsDown: number;
  score: number;
}

export function stripUrbanMarkup(value: string): string {
  return String(value || '')
    .replace(/\[([^\]]+)\]/g, '$1')
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function filterUrbanItems(list: UrbanListItem[], cleanQuery: string): FilteredUrbanEntry[] {
  const query = cleanQuery.toLowerCase();
  const ranked = list
    .map((item) => {
      const up = Math.max(0, Number(item.thumbs_up) || 0);
      const down = Math.max(0, Number(item.thumbs_down) || 0);
      const total = up + down;
      const ratio = total > 0 ? up / total : 0;
      return {
        word: String(item.word || cleanQuery).trim() || cleanQuery,
        definition: stripUrbanMarkup(item.definition || ''),
        example: stripUrbanMarkup(item.example || ''),
        thumbsUp: up,
        thumbsDown: down,
        ratio,
        score: up - down,
      };
    })
    .filter((item) => {
      if (!item.definition || item.definition.length < 5) return false;
      // Exact term match only — discard loose associative queries
      if (item.word.toLowerCase() !== query) return false;
      // Strict quality gates: popular and strongly approved
      if (item.thumbsUp < MIN_THUMBS_UP) return false;
      if (item.score < MIN_NET_SCORE) return false;
      if (item.ratio < MIN_APPROVAL_RATIO) return false;
      return true;
    })
    .sort((a, b) => b.score - a.score || b.thumbsUp - a.thumbsUp);

  const unique: FilteredUrbanEntry[] = [];
  for (const item of ranked) {
    if (unique.some((row) => row.definition.toLowerCase() === item.definition.toLowerCase())) continue;
    unique.push({
      word: item.word,
      definition: item.definition,
      example: item.example,
      thumbsUp: item.thumbsUp,
      thumbsDown: item.thumbsDown,
      score: item.score,
    });
    if (unique.length >= MAX_SLANG_DEFINITIONS) break;
  }
  return unique;
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

  const data = (await res.json()) as { list?: UrbanListItem[] };
  const list = Array.isArray(data?.list) ? data.list : [];
  const unique = filterUrbanItems(list, clean);

  if (!unique.length) {
    throw new NotFoundError(`Urban Dictionary: No high-quality entry found for '${clean}'`);
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
