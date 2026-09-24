import { DICTIONARY_FETCH_TIMEOUT_MS, safeFetch } from './provider.http';
import type { Meaning, ProviderLookupDto } from '../types';
import { normalizeDictionaryTerm } from '../shared/query-utils';
import { NotFoundError, throwForHttpStatus } from './errors';

interface WikipediaSummaryResponse {
  type?: string;
  title?: string;
  extract?: string;
  description?: string;
}

export async function fetchWikipedia(
  word: string,
  _targetLang = 'vi',
  signal?: AbortSignal,
): Promise<ProviderLookupDto> {
  const clean = normalizeDictionaryTerm(word);
  if (!clean) throw new NotFoundError('Wikipedia: empty query');

  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(clean)}`;
  const res = await safeFetch(url, {
    signal,
    timeoutMs: DICTIONARY_FETCH_TIMEOUT_MS,
    requestClass: 'dictionary',
    retries: 0,
  });

  if (!res.ok) {
    throwForHttpStatus(
      res.status,
      `Wikipedia: No entry found for '${clean}'`,
      `Wikipedia lookup failed (HTTP ${res.status}).`,
    );
  }

  const data = (await res.json()) as WikipediaSummaryResponse;
  const extract = String(data?.extract || '').trim();
  if (!extract || data.type === 'disambiguation' || data.type === 'no-extract') {
    throw new NotFoundError(`Wikipedia: No substantive extract found for '${clean}'`);
  }

  const meanings: Meaning[] = [{
    partOfSpeech: 'encyclopedia',
    definitions: [{
      definition: extract,
    }],
  }];

  return {
    word: data.title || clean,
    meanings,
    providerId: 'wikipedia',
  };
}
