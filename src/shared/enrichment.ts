import type {
  AttributedItem,
  DictionaryEntry,
  Meaning,
  Phonetic,
  SourceBadge,
  TranslationResult,
} from '../types';
import { mergeLexicalProfiles } from './query-utils.ts';

export const MAX_DEFINITIONS_PER_POS = 8;
export const MAX_MEANINGS = 6;
export const MAX_PHONETICS = 4;
export const MAX_ITEMS_PER_SECTION = 8;

const PHONETICS_CACHE_TTL_MS = 30 * 60 * 1000;
const MAX_PHONETICS_CACHE = 50;

interface PhoneticsCacheEntry {
  phonetics: Phonetic[];
  timestamp: number;
}

const phoneticsMemoryCache = new Map<string, PhoneticsCacheEntry>();

function phoneticsStorageKey(word: string): string {
  return `phn_${word.toLowerCase().replace(/[^a-z0-9_]/gi, '_').slice(0, 80)}`;
}

export function readPhoneticsCache(word: string): Phonetic[] | undefined {
  const key = word.trim().toLowerCase();
  if (!key) return undefined;
  const entry = phoneticsMemoryCache.get(key);
  if (!entry) return undefined;
  if (Date.now() - entry.timestamp > PHONETICS_CACHE_TTL_MS) {
    phoneticsMemoryCache.delete(key);
    return undefined;
  }
  return sanitizePhonetics(entry.phonetics);
}

function sanitizePhonetics(phonetics: Phonetic[]): Phonetic[] {
  return phonetics
    .map((item) => {
      const phonetic = cleanPhoneticString(item.phonetic || item.text);
      return {
        ...item,
        phonetic,
        text: phonetic || undefined,
      };
    })
    .filter((item) => Boolean(item.phonetic || item.audioUrl || item.audio));
}

export async function readSessionPhonetics(word: string): Promise<Phonetic[] | undefined> {
  const mem = readPhoneticsCache(word);
  if (mem) return mem;
  const key = word.trim().toLowerCase();
  if (!key) return undefined;
  try {
    if (typeof chrome === 'undefined' || !chrome.storage?.session?.get) return undefined;
    const sKey = phoneticsStorageKey(key);
    const stored = await Promise.resolve(chrome.storage.session.get(sKey)).catch(() => ({})) as Record<string, PhoneticsCacheEntry | undefined>;
    const entry = stored?.[sKey];
    if (!entry || Date.now() - entry.timestamp > PHONETICS_CACHE_TTL_MS) return undefined;
    const cleaned = sanitizePhonetics(entry.phonetics);
    phoneticsMemoryCache.set(key, { ...entry, phonetics: cleaned });
    return cleaned.map((item) => ({ ...item }));
  } catch {
    return undefined;
  }
}

export function writePhoneticsCache(word: string, phonetics: Phonetic[]): void {
  const key = word.trim().toLowerCase();
  const cleaned = sanitizePhonetics(phonetics);
  if (!key || !cleaned.length) return;
  const entry: PhoneticsCacheEntry = {
    phonetics: cleaned,
    timestamp: Date.now(),
  };
  phoneticsMemoryCache.delete(key);
  phoneticsMemoryCache.set(key, entry);
  while (phoneticsMemoryCache.size > MAX_PHONETICS_CACHE) {
    const oldest = phoneticsMemoryCache.keys().next().value;
    if (!oldest) break;
    phoneticsMemoryCache.delete(oldest);
  }
  try {
    if (typeof chrome !== 'undefined' && chrome.storage?.session?.set) {
      const sKey = phoneticsStorageKey(key);
      void Promise.resolve(chrome.storage.session.set({ [sKey]: entry })).catch(() => undefined);
    }
  } catch {
    // Ignore storage write issues
  }
}

export function isValidPhoneticText(value?: string): boolean {
  const clean = String(value || '').trim();
  if (!clean || clean.length < 2) return false;
  const inner = clean.replace(/^[/\[\]]+|[/\[\]]+$/g, '').trim();
  if (!inner) return false;
  // Reject wiki links, html tags, URLs, or path-like artifacts
  if (/wiki|\.org|\.com|http|href|<|>|=/i.test(inner)) return false;
  if (/^[a-z]+$/i.test(inner) && inner.length <= 6 && /wiki|html|http|href/.test(inner.toLowerCase())) return false;
  return true;
}

export function cleanPhoneticString(value?: string): string {
  const clean = String(value || '').trim();
  if (!isValidPhoneticText(clean)) return '';
  return clean;
}

const POS_ALIASES: Record<string, string> = {
  n: 'noun',
  noun: 'noun',
  nouns: 'noun',
  'proper noun': 'noun',
  'proper-noun': 'noun',
  'noun-plural': 'noun',
  v: 'verb',
  verb: 'verb',
  verbs: 'verb',
  'transitive verb': 'verb',
  'intransitive verb': 'verb',
  'verb-intransitive': 'verb',
  'phrasal verb': 'verb',
  adj: 'adjective',
  adjective: 'adjective',
  adjectives: 'adjective',
  adv: 'adverb',
  adverb: 'adverb',
  adverbs: 'adverb',
  pron: 'pronoun',
  pronoun: 'pronoun',
  prep: 'preposition',
  preposition: 'preposition',
  conj: 'conjunction',
  conjunction: 'conjunction',
  interj: 'interjection',
  interjection: 'interjection',
  det: 'determiner',
  determiner: 'determiner',
  article: 'article',
  slang: 'slang',
  idiom: 'slang',
  'slang idiom': 'slang',
  encyclopedia: 'encyclopedia',
  encyclopedic: 'encyclopedia',
};

export function normalizeComparableText(str: string): string {
  return String(str || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeText(str: string): string {
  return normalizeComparableText(str).replace(/\s+/g, '');
}

export function isTranslationPartOfSpeech(pos: string): boolean {
  const value = String(pos || '').toLowerCase();
  return value.includes('translation') || value.includes('phrase /');
}

export function canonicalPartOfSpeech(pos: string): string {
  const raw = String(pos || 'general')
    .toLowerCase()
    .replace(/[._/]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!raw) return 'general';
  if (isTranslationPartOfSpeech(raw)) return 'translation';
  if (POS_ALIASES[raw]) return POS_ALIASES[raw];
  if (raw.startsWith('noun')) return 'noun';
  if (raw.startsWith('verb')) return 'verb';
  if (raw.startsWith('adj')) return 'adjective';
  if (raw.startsWith('adv')) return 'adverb';
  if (raw.startsWith('pron')) return 'pronoun';
  if (raw.startsWith('prep')) return 'preposition';
  if (raw.startsWith('conj')) return 'conjunction';
  if (raw.startsWith('interj')) return 'interjection';
  return raw;
}

export function displayPartOfSpeech(pos: string): string {
  const canonical = canonicalPartOfSpeech(pos);
  if (canonical === 'translation') return 'translation';
  return canonical;
}

export function joinSourceLabels(...labels: Array<string | undefined>): string | undefined {
  const parts: string[] = [];
  for (const label of labels) {
    for (const piece of String(label || '').split(/\s*[+|•]\s*/)) {
      const value = piece.trim();
      if (!value) continue;
      if (!parts.some((existing) => existing.toLowerCase() === value.toLowerCase())) {
        parts.push(value);
      }
    }
  }
  return parts.length ? parts.join(' + ') : undefined;
}

function mergeAttributed(existing: AttributedItem[] = [], incoming: AttributedItem[] = []): AttributedItem[] {
  const merged = [...existing];
  for (const item of incoming) {
    const text = String(item?.text || '').trim();
    if (!text) continue;
    if (merged.some((row) => normalizeText(row.text) === normalizeText(text))) continue;
    if (merged.length >= MAX_ITEMS_PER_SECTION) break;
    merged.push({ text, source: item.source });
  }
  return merged;
}

function cloneMeaning(meaning: Meaning): Meaning {
  return {
    partOfSpeech: displayPartOfSpeech(meaning.partOfSpeech),
    definitions: [...(meaning.definitions || [])],
    synonyms: meaning.synonyms ? [...meaning.synonyms] : undefined,
    antonyms: meaning.antonyms ? [...meaning.antonyms] : undefined,
    source: meaning.source,
  };
}

function mergeStringList(existing: string[] | undefined, incoming: string[] | undefined, limit = 12): string[] | undefined {
  if (!existing?.length && !incoming?.length) return existing;
  const merged = [...(existing || [])];
  for (const item of incoming || []) {
    const value = String(item || '').trim();
    if (!value) continue;
    if (merged.some((row) => normalizeText(row) === normalizeText(value))) continue;
    if (merged.length >= limit) break;
    merged.push(value);
  }
  return merged;
}

export function mergeMeanings(existing: Meaning[], incoming: Meaning[]): Meaning[] {
  const merged: Meaning[] = [];

  const appendMeaning = (incMeaning: Meaning) => {
    if (isTranslationPartOfSpeech(incMeaning.partOfSpeech)) return;

    const pos = canonicalPartOfSpeech(incMeaning.partOfSpeech);
    let target = merged.find((meaning) => canonicalPartOfSpeech(meaning.partOfSpeech) === pos);

    if (!target) {
      if (merged.length >= MAX_MEANINGS) {
        target = merged[0];
      } else {
        target = {
          partOfSpeech: displayPartOfSpeech(incMeaning.partOfSpeech || pos),
          definitions: [],
          synonyms: [],
          antonyms: [],
          source: incMeaning.source,
        };
        merged.push(target);
      }
    }

    if (!target) return;

    target.partOfSpeech = displayPartOfSpeech(target.partOfSpeech || pos);
    target.source = joinSourceLabels(target.source, incMeaning.source);

    for (const incDef of incMeaning.definitions || []) {
      const defText = (incDef.definition || '').trim();
      if (!defText) continue;
      const matchIndex = target.definitions.findIndex((definition) => (
        normalizeComparableText(definition.definition) === normalizeComparableText(defText)
      ));
      if (matchIndex >= 0) {
        const match = target.definitions[matchIndex];
        const incomingExample = String(incDef.example || '').trim();
        if (!String(match.example || '').trim() && incomingExample) {
          target.definitions[matchIndex] = { ...match, example: incomingExample };
        }
        continue;
      }
      if (target.definitions.length < MAX_DEFINITIONS_PER_POS) {
        target.definitions.push({
          ...incDef,
          definition: defText,
          source: incDef.source || incMeaning.source,
        });
      }
    }

    target.synonyms = mergeStringList(target.synonyms, incMeaning.synonyms);
    target.antonyms = mergeStringList(target.antonyms, incMeaning.antonyms);
  };

  for (const meaning of existing || []) appendMeaning(cloneMeaning(meaning));
  for (const meaning of incoming || []) appendMeaning(meaning);

  return merged;
}

export function mergePhonetics(existing: Phonetic[] = [], incoming: Phonetic[] = []): Phonetic[] {
  const merged = existing.map((item) => ({ ...item }));

  // Find any known phonetic text across both sets to backfill textless audio items
  const bestPhoneticText = [...existing, ...incoming]
    .map((item) => cleanPhoneticString(item.phonetic || item.text))
    .find((text) => text.length > 0) || '';

  for (const item of incoming || []) {
    const phonetic = cleanPhoneticString(item.phonetic || item.text);
    const audioUrl = String(item.audioUrl || item.audio || '').trim();
    const language = String(item.language || '').trim();
    const region = item.region;
    if (!phonetic && !audioUrl) continue;

    const matchIndex = merged.findIndex((entry) => {
      if (region && entry.region && region === entry.region) return true;
      const entryLanguage = String(entry.language || '').trim();
      if (language && entryLanguage) return entryLanguage.toLowerCase() === language.toLowerCase();
      if (phonetic && (entry.phonetic || entry.text)) {
        return normalizeText(String(entry.phonetic || entry.text || '')) === normalizeText(phonetic);
      }
      return false;
    });

    if (matchIndex >= 0) {
      const current = merged[matchIndex];
      if (phonetic && !String(current.phonetic || current.text || '').trim()) {
        current.phonetic = phonetic;
        current.text = phonetic;
      }
      if (audioUrl && !String(current.audioUrl || current.audio || '').trim()) {
        current.audioUrl = audioUrl;
        current.audio = audioUrl;
        current.fallbackOnly = false;
      }
      if (language && !current.language) current.language = language;
      if (region && !current.region) current.region = region;
      continue;
    }

    if (merged.length >= MAX_PHONETICS) break;
    merged.push({
      ...item,
      phonetic,
      text: phonetic || item.text,
      audioUrl,
      audio: audioUrl || item.audio,
      language,
      region,
    });
  }

  // Ensure items with audio but missing text inherit any available IPA transcription
  if (bestPhoneticText) {
    for (const item of merged) {
      if (!String(item.phonetic || item.text || '').trim()) {
        item.phonetic = bestPhoneticText;
        item.text = bestPhoneticText;
      }
    }
  }

  return merged;
}

export function mergeSourceBadges(existing: SourceBadge[] = [], incoming: SourceBadge[] = []): SourceBadge[] {
  const merged = [...existing];
  for (const badge of incoming) {
    if (!badge?.label) continue;
    if (!merged.some((item) => item.label === badge.label && item.kind === badge.kind)) {
      merged.push(badge);
    }
  }
  return merged;
}

function mergeTranslations(
  base?: TranslationResult,
  incoming?: TranslationResult,
): TranslationResult | undefined {
  if (!base?.translatedText) return incoming;
  if (!incoming?.translatedText) return base;
  if (normalizeComparableText(base.translatedText) === normalizeComparableText(incoming.translatedText)) {
    return {
      ...base,
      sourceBadges: mergeSourceBadges(base.sourceBadges, incoming.sourceBadges),
    };
  }
  return base;
}

function extractTranslationFromMeanings(meanings: Meaning[]): TranslationResult | undefined {
  for (const meaning of meanings || []) {
    if (!isTranslationPartOfSpeech(meaning.partOfSpeech)) continue;
    const translatedText = String(meaning.definitions?.[0]?.definition || '').trim();
    if (!translatedText) continue;
    return {
      translatedText,
      sourceBadges: meaning.source
        ? [{ label: meaning.source, kind: 'translation' }]
        : undefined,
    };
  }
  return undefined;
}

export function mergeDictionaryEntries(base: DictionaryEntry, incoming: DictionaryEntry): DictionaryEntry {
  const translation = mergeTranslations(
    base.translation,
    incoming.translation,
  ) || extractTranslationFromMeanings([...(base.meanings || []), ...(incoming.meanings || [])]);

  return {
    ...base,
    phonetic: base.phonetic || incoming.phonetic,
    phonetics: mergePhonetics(base.phonetics || base.pronunciations, incoming.phonetics || incoming.pronunciations),
    pronunciations: mergePhonetics(base.pronunciations || base.phonetics, incoming.pronunciations || incoming.phonetics),
    meanings: mergeMeanings(base.meanings || [], incoming.meanings || []),
    examples: mergeAttributed(base.examples, incoming.examples),
    synonyms: mergeAttributed(base.synonyms, incoming.synonyms),
    antonyms: mergeAttributed(base.antonyms, incoming.antonyms),
    lexicalProfile: mergeLexicalProfiles(base.lexicalProfile, incoming.lexicalProfile),
    sourceBadges: mergeSourceBadges(base.sourceBadges, incoming.sourceBadges),
    subtitle: base.subtitle || incoming.subtitle,
    translation,
    phraseExplanation: base.phraseExplanation?.length ? base.phraseExplanation : incoming.phraseExplanation,
    syllables: base.syllables || incoming.syllables,
    enriched: true,
  };
}

export function hasUsableDefinitions(entry?: DictionaryEntry | null): boolean {
  return Boolean(entry?.meanings?.some((meaning) => meaning.definitions?.some((item) => item.definition?.trim())));
}

export function hasPhoneticText(entry?: DictionaryEntry | null): boolean {
  const word = String(entry?.word || '').trim().toLowerCase();
  const phonetics = [...(entry?.pronunciations || []), ...(entry?.phonetics || [])];
  const top = cleanPhoneticString(entry?.phonetic);
  if (top && top.toLowerCase() !== word) return true;
  return phonetics.some((item) => {
    const phonetic = cleanPhoneticString(item?.phonetic || item?.text);
    return Boolean(phonetic && phonetic.toLowerCase() !== word);
  });
}

function hasExampleSentences(entry?: DictionaryEntry | null): boolean {
  if (entry?.examples?.some((item) => item.text?.trim())) return true;
  return Boolean(entry?.meanings?.some((meaning) => meaning.definitions?.some((item) => item.example?.trim())));
}

export function isThinDictionaryEntry(entry?: DictionaryEntry | null): boolean {
  if (!entry) return true;
  return !hasUsableDefinitions(entry) || !hasPhoneticText(entry) || !hasExampleSentences(entry);
}

export function cloneDictionaryEntry(entry: DictionaryEntry): DictionaryEntry {
  return {
    ...entry,
    meanings: mergeMeanings(entry.meanings || [], []),
    phonetics: entry.phonetics ? entry.phonetics.map((item) => ({ ...item })) : undefined,
    pronunciations: entry.pronunciations ? entry.pronunciations.map((item) => ({ ...item })) : undefined,
    examples: entry.examples ? entry.examples.map((item) => ({ ...item })) : undefined,
    synonyms: entry.synonyms ? entry.synonyms.map((item) => ({ ...item })) : undefined,
    antonyms: entry.antonyms ? entry.antonyms.map((item) => ({ ...item })) : undefined,
    sourceBadges: entry.sourceBadges ? [...entry.sourceBadges] : undefined,
    phraseExplanation: entry.phraseExplanation ? entry.phraseExplanation.map((item) => ({ ...item })) : undefined,
    translation: entry.translation ? { ...entry.translation } : undefined,
  };
}
