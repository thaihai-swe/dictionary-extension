import { safeFetch } from './provider.http';
import { DictionaryEntry, Meaning, LexicalProfile, WordFamily } from '../types';
import { normalizeDictionaryTerm } from '../shared/query-utils';
import { NotFoundError, errorWithStatus } from './errors';

const MAX_DEFINITIONS_PER_POS = 4;
const MAX_POS_GROUPS = 4;
const MAX_EXAMPLES = 6;
const MAX_RELATED = 8;
const WORDS_API_HOST = 'wordsapiv1.p.rapidapi.com';
const WORDS_API_BASE = `https://${WORDS_API_HOST}`;

function collectUnique(target: string[], values: unknown, limit: number) {
  if (!Array.isArray(values)) return;
  for (const value of values) {
    const item = String(value || '').trim();
    if (item && target.length < limit && !target.includes(item)) {
      target.push(item);
    }
  }
}

function extractPronunciation(value: unknown): string {
  if (!value) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'object') {
    const row = value as Record<string, unknown>;
    return String(row.all || row.us || row.uk || '').trim();
  }
  return '';
}

function formatFrequency(value: unknown): string {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return '';
  if (num >= 4.5) return 'Very common';
  if (num >= 3.5) return 'Common';
  if (num >= 2.5) return 'Fairly common';
  return 'Less common';
}

function formatSyllables(value: unknown): string {
  if (!value || typeof value !== 'object') return '';
  const row = value as { count?: number; list?: string[] };
  if (Array.isArray(row.list) && row.list.length) return row.list.join(' · ');
  if (row.count) return `${row.count} syllables`;
  return '';
}

function categorizePos(pos: string): keyof WordFamily | null {
  const lower = String(pos || '').toLowerCase();
  if (lower.startsWith('noun')) return 'nouns';
  if (lower.startsWith('verb')) return 'verbs';
  if (lower.startsWith('adjective')) return 'adjectives';
  if (lower.startsWith('adverb')) return 'adverbs';
  return null;
}

export async function fetchWordsApi(
  word: string,
  _targetLang = 'Vietnamese',
  signal?: AbortSignal,
  apiKey = '',
): Promise<DictionaryEntry> {
  const term = normalizeDictionaryTerm(word);
  const key = String(apiKey || '').trim();
  if (!key) {
    throw errorWithStatus('WordsAPI key is required. Add your RapidAPI key in Settings.', 401);
  }

  const url = `${WORDS_API_BASE}/words/${encodeURIComponent(term)}`;
  const res = await safeFetch(url, {
    method: 'GET',
    signal,
    headers: {
      'X-RapidAPI-Key': key,
      'X-RapidAPI-Host': WORDS_API_HOST,
    },
  });

  if (res.status === 401 || res.status === 403) {
    throw errorWithStatus('WordsAPI key is invalid or unauthorized.', res.status);
  }
  if (res.status === 404) {
    throw new NotFoundError(`No WordsAPI entry found for "${term}".`);
  }
  if (res.status === 429) {
    throw errorWithStatus('WordsAPI rate limit reached. Try again later.', 429);
  }
  if (!res.ok) {
    throw errorWithStatus(`WordsAPI lookup failed (HTTP ${res.status}).`, res.status);
  }

  const data = await res.json();
  const resolvedWord = String(data?.word || term).trim() || term;
  const results = Array.isArray(data?.results) ? data.results : [];

  const byPos = new Map<string, string[]>();
  const examples: string[] = [];
  const synonyms: string[] = [];
  const antonyms: string[] = [];
  const meanings: Meaning[] = [];

  for (const item of results) {
    const definition = String(item?.definition || '').trim();
    const pos = String(item?.partOfSpeech || 'Definition').trim() || 'Definition';
    if (definition) {
      if (!byPos.has(pos)) byPos.set(pos, []);
      const bucket = byPos.get(pos)!;
      if (bucket.length < MAX_DEFINITIONS_PER_POS) bucket.push(definition);
    }
    if (Array.isArray(item?.examples)) {
      for (const example of item.examples) {
        const value = String(example || '').trim();
        if (value && examples.length < MAX_EXAMPLES && !examples.includes(value)) {
          examples.push(value);
        }
      }
    }
    collectUnique(synonyms, item?.synonyms, MAX_RELATED);
    collectUnique(antonyms, item?.antonyms, MAX_RELATED);
  }

  let groupCount = 0;
  for (const [pos, items] of byPos) {
    if (groupCount >= MAX_POS_GROUPS || !items.length) continue;
    meanings.push({
      partOfSpeech: pos,
      definitions: items.map((definition) => ({ definition, source: 'WordsAPI' })),
      source: 'WordsAPI',
    });
    groupCount += 1;
  }

  const family: WordFamily = {
    nouns: [],
    verbs: [],
    adjectives: [],
    adverbs: [],
    inflections: [],
    derivatives: [],
  };
  for (const [pos] of byPos) {
    const category = categorizePos(pos);
    if (!category) continue;
    const current = family[category] || [];
    if (!current.includes(resolvedWord)) current.push(resolvedWord);
    family[category] = current;
  }

  const partOfSpeechWords = [
    ...(family.nouns || []),
    ...(family.verbs || []),
    ...(family.adjectives || []),
    ...(family.adverbs || []),
  ];
  const derivation = Array.isArray(data?.derivation) ? data.derivation : [];
  for (const item of derivation) {
    const value = String(item || '').trim();
    if (!value) continue;
    const lower = value.toLocaleLowerCase();
    const isInflection = partOfSpeechWords.some((part) => {
      const target = part.toLocaleLowerCase();
      return target === lower || target.startsWith(lower) || lower.startsWith(target);
    });
    if (family.inflections?.includes(value) || family.derivatives?.includes(value)) continue;
    if (isInflection && (family.inflections?.length || 0) < 8) {
      family.inflections = [...(family.inflections || []), value];
    } else if ((family.derivatives?.length || 0) < 12) {
      family.derivatives = [...(family.derivatives || []), value];
    }
  }

  const compactFamily: WordFamily = {};
  for (const key of ['nouns', 'verbs', 'adjectives', 'adverbs', 'inflections', 'derivatives'] as const) {
    if (family[key]?.length) compactFamily[key] = family[key];
  }

  const frequencyText = formatFrequency(data?.frequency);
  const phonetic = extractPronunciation(data?.pronunciation);
  const lexicalProfile: LexicalProfile | undefined = Object.keys(compactFamily).length || frequencyText
    ? {
        wordFamily: Object.keys(compactFamily).length ? compactFamily : undefined,
        frequencyPill: frequencyText || undefined,
      }
    : undefined;

  return {
    word: resolvedWord,
    phonetic,
    phonetics: phonetic
      ? [{ text: phonetic, phonetic, language: 'en-US', label: 'Speak', fallbackOnly: true }]
      : [],
    pronunciations: phonetic
      ? [{ text: resolvedWord, phonetic, language: 'en-US', label: 'Speak', fallbackOnly: true }]
      : [],
    meanings,
    examples: examples.map((text) => ({ text, source: 'WordsAPI' })),
    synonyms: synonyms.map((text) => ({ text, source: 'WordsAPI' })),
    antonyms: antonyms.map((text) => ({ text, source: 'WordsAPI' })),
    providerId: 'words_api',
    sourceBadges: [{ label: 'WordsAPI', kind: 'dictionary', providerId: 'words_api' }],
    subtitle: frequencyText || undefined,
    syllables: formatSyllables(data?.syllables) || undefined,
    lexicalProfile,
  };
}
