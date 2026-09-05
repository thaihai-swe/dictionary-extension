import { DICTIONARY_FETCH_TIMEOUT_MS, safeFetch } from './provider.http';
import { Phonetic, ProviderLookupDto } from '../types';
import { normalizeDictionaryTerm } from '../shared/query-utils';
import { NotFoundError, throwForHttpStatus } from './errors';

interface RhymeBrainWordInfo {
  word?: string;
  pron?: string;
  ipa?: string;
  freq?: number;
  flags?: string;
}

function stripHttpArtifact(value: string): string {
  return String(value || '')
    .replace(/\s*HTTP\/1\.[01]\s*$/i, '')
    .replace(/ttp$/i, '')
    .replace(/\sT T P\s*$/i, '')
    .trim();
}

export async function fetchRhymeBrain(
  word: string,
  _targetLang = 'vi',
  signal?: AbortSignal,
): Promise<ProviderLookupDto> {
  const clean = normalizeDictionaryTerm(word);
  if (!clean) throw new NotFoundError('RhymeBrain: empty query');

  // Dummy trailing param: some RhymeBrain CGI builds append " HTTP/1.1" to the last query value.
  const url = `https://rhymebrain.com/talk?function=getWordInfo&word=${encodeURIComponent(clean)}&maxResults=1`;
  const res = await safeFetch(url, { signal, timeoutMs: DICTIONARY_FETCH_TIMEOUT_MS });
  if (!res.ok) {
    throwForHttpStatus(
      res.status,
      `RhymeBrain: No entry found for '${clean}'`,
      `RhymeBrain lookup failed (HTTP ${res.status}).`,
    );
  }

  const data = await res.json() as RhymeBrainWordInfo;
  const ipa = stripHttpArtifact(String(data?.ipa || ''));

  if (!ipa) {
    throw new NotFoundError(`RhymeBrain: No pronunciation for '${clean}'`);
  }

  const phonetics: Phonetic[] = [{
    text: ipa,
    language: 'en-US',
    label: 'Speak',
    fallbackOnly: true,
  }];

  return {
    word: clean,
    phonetics,
    meanings: [],
    providerId: 'rhymebrain',
  };
}
