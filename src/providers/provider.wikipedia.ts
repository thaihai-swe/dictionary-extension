import { safeFetch } from './provider.http';
import { DictionaryEntry } from '../types';
import { normalizeDictionaryTerm } from '../shared/query-utils';
import { NotFoundError, throwForHttpStatus } from './errors';

const MAX_EXTRACT_CHARS = 420;

interface WikipediaSummary {
  type?: string;
  title?: string;
  description?: string;
  extract?: string;
  content_urls?: { desktop?: { page?: string } };
}

export async function fetchWikipediaSummary(
  word: string,
  _targetLang = 'vi',
  signal?: AbortSignal,
): Promise<DictionaryEntry> {
  const clean = normalizeDictionaryTerm(word) || String(word || '').trim();
  if (!clean) throw new NotFoundError('Wikipedia: empty query');

  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(clean)}`;
  const res = await safeFetch(url, {
    signal,
    timeoutMs: 30000,
    headers: {
      Accept: 'application/json',
      'Api-User-Agent': 'DictionaryExtension/2.0 (language-learning)',
    },
  });

  if (res.status === 404) {
    throw new NotFoundError(`Wikipedia: No page found for '${clean}'`);
  }
  if (!res.ok) {
    throwForHttpStatus(
      res.status,
      `Wikipedia: No page found for '${clean}'`,
      `Wikipedia lookup failed (HTTP ${res.status}).`,
    );
  }

  const data = await res.json() as WikipediaSummary;
  const extract = String(data?.extract || '').trim();
  const type = String(data?.type || '').toLowerCase();

  if (!extract || type === 'disambiguation' || /^.* may refer to/i.test(extract)) {
    throw new NotFoundError(`Wikipedia: No usable summary for '${clean}'`);
  }

  const clipped = extract.length > MAX_EXTRACT_CHARS
    ? `${extract.slice(0, MAX_EXTRACT_CHARS).replace(/\s+\S*$/, '')}…`
    : extract;
  const description = String(data?.description || '').trim();
  const title = String(data?.title || clean).trim() || clean;
  const sourceUrl = data?.content_urls?.desktop?.page;

  return {
    word: title,
    phonetics: [],
    meanings: [{
      partOfSpeech: 'encyclopedia',
      source: 'Wikipedia',
      definitions: [{
        definition: description ? `${description}. ${clipped}` : clipped,
        source: 'Wikipedia',
      }],
    }],
    sourceUrl,
    providerId: 'wikipedia',
    sourceBadges: [{ label: 'Wikipedia', kind: 'dictionary', providerId: 'wikipedia' }],
  };
}
