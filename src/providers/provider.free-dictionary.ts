import { safeFetch } from './provider.http';
import { Meaning, Phonetic, AttributedItem, ProviderLookupDto } from '../types';
import { normalizeDictionaryTerm } from '../shared/query-utils';
import { NotFoundError, throwForHttpStatus } from './errors';

function accentFromAudio(audio?: string): Phonetic['region'] {
  const value = String(audio || '').toLowerCase();
  if (value.includes('-uk') || value.includes('_uk') || value.includes('-gb') || value.includes('/uk/')) return 'uk';
  if (value.includes('-us') || value.includes('_us') || value.includes('/us/')) return 'us';
  return 'all';
}

function languageFromRegion(region?: Phonetic['region']): string | undefined {
  if (region === 'uk') return 'en-GB';
  if (region === 'us') return 'en-US';
  return undefined;
}

export async function fetchFreeDictionary(word: string, _targetLang: string = 'vi', signal?: AbortSignal): Promise<ProviderLookupDto> {
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
        audio: p.audio || '',
        region,
        language: languageFromRegion(region),
        label: region === 'uk' ? 'Listen (UK)' : region === 'us' ? 'Listen (US)' : 'Listen',
      };
    });

  const examples: AttributedItem[] = [];
  const synonyms: AttributedItem[] = [];
  const antonyms: AttributedItem[] = [];
  const meanings: Meaning[] = ((entry.meanings as Meaning[]) || []).map((meaning) => {
    const definitions = (meaning.definitions || []).map((definition) => {
      if (definition.example && examples.length < 8 && !examples.some((item) => item.text === definition.example)) {
        examples.push({ text: definition.example });
      }
      for (const syn of definition.synonyms || []) {
        if (synonyms.length < 12 && !synonyms.some((item) => item.text === syn)) {
          synonyms.push({ text: syn });
        }
      }
      for (const ant of definition.antonyms || []) {
        if (antonyms.length < 12 && !antonyms.some((item) => item.text === ant)) {
          antonyms.push({ text: ant });
        }
      }
      return { ...definition };
    });
    for (const syn of meaning.synonyms || []) {
      if (synonyms.length < 12 && !synonyms.some((item) => item.text === syn)) {
        synonyms.push({ text: syn });
      }
    }
    for (const ant of meaning.antonyms || []) {
      if (antonyms.length < 12 && !antonyms.some((item) => item.text === ant)) {
        antonyms.push({ text: ant });
      }
    }
    return {
      ...meaning,
      definitions,
    };
  });

  return {
    word: (entry.word as string) || term,
    phonetics,
    meanings,
    examples,
    synonyms,
    antonyms,
    providerId: 'free_dictionary',
  };
}
