import { safeFetch } from './provider.http';
import { DictionaryEntry, Phonetic } from '../types';
import { normalizeDictionaryTerm } from '../shared/query-utils';
import { NotFoundError, throwForHttpStatus } from './errors';

interface RhymeBrainWordInfo {
  word?: string;
  pron?: string;
  ipa?: string;
  freq?: number;
  flags?: string;
  syllables?: string | number;
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
): Promise<DictionaryEntry> {
  const clean = normalizeDictionaryTerm(word);
  if (!clean) throw new NotFoundError('RhymeBrain: empty query');

  // Dummy trailing param: some RhymeBrain CGI builds append " HTTP/1.1" to the last query value.
  const url = `https://rhymebrain.com/talk?function=getWordInfo&word=${encodeURIComponent(clean)}&maxResults=1`;
  const res = await safeFetch(url, { signal, timeoutMs: 30000 });
  if (!res.ok) {
    throwForHttpStatus(
      res.status,
      `RhymeBrain: No entry found for '${clean}'`,
      `RhymeBrain lookup failed (HTTP ${res.status}).`,
    );
  }

  const data = await res.json() as RhymeBrainWordInfo;
  const ipa = stripHttpArtifact(String(data?.ipa || ''));
  const syllableCount = Number(data?.syllables);
  const syllables = Number.isFinite(syllableCount) && syllableCount > 0
    ? `${syllableCount} syllable${syllableCount === 1 ? '' : 's'}`
    : undefined;

  if (!ipa && !syllables) {
    throw new NotFoundError(`RhymeBrain: No pronunciation for '${clean}'`);
  }

  const phonetics: Phonetic[] = ipa
    ? [{
        text: ipa,
        phonetic: ipa,
        language: 'en-US',
        label: 'Speak',
        fallbackOnly: true,
      }]
    : [];

  return {
    word: clean,
    phonetic: ipa || undefined,
    phonetics,
    pronunciations: phonetics,
    meanings: [],
    syllables,
    providerId: 'rhymebrain',
    sourceBadges: [{ label: 'RhymeBrain', kind: 'dictionary', providerId: 'rhymebrain' }],
  };
}
