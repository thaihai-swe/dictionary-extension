import { safeFetch } from './provider.http';
import { DictionaryEntry, Meaning, Phonetic, AttributedItem } from '../types';
import { normalizeDictionaryTerm } from '../shared/query-utils';
import { NotFoundError, throwForHttpStatus } from './errors';

function accentFromAudio(audio?: string): Phonetic['region'] {
  const value = String(audio || '').toLowerCase();
  if (value.includes('-uk') || value.includes('_uk') || value.includes('-gb')) return 'uk';
  if (value.includes('-us') || value.includes('_us')) return 'us';
  return 'all';
}

function languageFromRegion(region?: Phonetic['region']): string {
  if (region === 'uk') return 'en-GB';
  if (region === 'us') return 'en-US';
  return 'en-US';
}

export async function fetchFreeDictionary(word: string, _targetLang: string = 'vi', signal?: AbortSignal): Promise<DictionaryEntry> {
  const term = normalizeDictionaryTerm(word);
  const url = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(term)}`;
  const res = await safeFetch(url, { signal });

  if (!res.ok) {
    throwForHttpStatus(res.status, `No dictionary entry found for "${term}".`, `Free Dictionary lookup failed (HTTP ${res.status}).`);
  }

  const data = await res.json();
  if (!data || !Array.isArray(data) || data.length === 0) {
    throw new NotFoundError(`No definition found for '${term}'`);
  }

  const entry = data[0];
  const rawPhonetics = (entry.phonetics as Array<{ text?: string; audio?: string }>) || [];
  const phonetics: Phonetic[] = rawPhonetics
    .filter((p) => p.text || p.audio)
    .map((p) => {
      const region = accentFromAudio(p.audio);
      return {
        text: p.text || '',
        phonetic: p.text || '',
        audio: p.audio || '',
        audioUrl: p.audio || '',
        region,
        language: languageFromRegion(region),
        label: region === 'uk' ? 'Listen (UK)' : region === 'us' ? 'Listen (US)' : 'Listen',
        fallbackOnly: !p.audio,
      };
    });

  const examples: AttributedItem[] = [];
  const synonyms: AttributedItem[] = [];
  const antonyms: AttributedItem[] = [];
  const meanings: Meaning[] = ((entry.meanings as Meaning[]) || []).map((meaning) => {
    const definitions = (meaning.definitions || []).map((definition) => {
      if (definition.example && examples.length < 8 && !examples.some((item) => item.text === definition.example)) {
        examples.push({ text: definition.example, source: 'Free Dictionary API' });
      }
      for (const syn of definition.synonyms || []) {
        if (synonyms.length < 12 && !synonyms.some((item) => item.text === syn)) {
          synonyms.push({ text: syn, source: 'Free Dictionary API' });
        }
      }
      for (const ant of definition.antonyms || []) {
        if (antonyms.length < 12 && !antonyms.some((item) => item.text === ant)) {
          antonyms.push({ text: ant, source: 'Free Dictionary API' });
        }
      }
      return { ...definition, source: 'Free Dictionary API' };
    });
    for (const syn of meaning.synonyms || []) {
      if (synonyms.length < 12 && !synonyms.some((item) => item.text === syn)) {
        synonyms.push({ text: syn, source: 'Free Dictionary API' });
      }
    }
    for (const ant of meaning.antonyms || []) {
      if (antonyms.length < 12 && !antonyms.some((item) => item.text === ant)) {
        antonyms.push({ text: ant, source: 'Free Dictionary API' });
      }
    }
    return {
      ...meaning,
      definitions,
      source: 'Free Dictionary API',
    };
  });

  return {
    word: (entry.word as string) || term,
    phonetics,
    pronunciations: phonetics,
    phonetic: phonetics.find((p) => p.text)?.text || '',
    meanings,
    examples,
    synonyms,
    antonyms,
    sourceUrl: entry.sourceUrls ? (entry.sourceUrls as string[])[0] : undefined,
    providerId: 'free_dictionary',
    sourceBadges: [{ label: 'Free Dictionary API', kind: 'dictionary', providerId: 'free_dictionary' }],
  };
}
