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
      const exists = target.definitions.some((definition) => (
        normalizeComparableText(definition.definition) === normalizeComparableText(defText)
      ));
      if (!exists && target.definitions.length < MAX_DEFINITIONS_PER_POS) {
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
  for (const item of incoming || []) {
    const phonetic = String(item.phonetic || item.text || '').trim();
    const audioUrl = String(item.audioUrl || item.audio || '').trim();
    const language = String(item.language || '').trim();
    if (!phonetic && !audioUrl) continue;

    const matchIndex = merged.findIndex((entry) => {
      const entryLanguage = String(entry.language || '').trim();
      if (language && entryLanguage) return entryLanguage === language;
      return normalizeText(String(entry.phonetic || entry.text || '')) === normalizeText(phonetic);
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
    });
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

function hasPhoneticText(entry?: DictionaryEntry | null): boolean {
  const word = String(entry?.word || '').trim().toLowerCase();
  const phonetics = [...(entry?.pronunciations || []), ...(entry?.phonetics || [])];
  if (String(entry?.phonetic || '').trim() && String(entry?.phonetic || '').trim().toLowerCase() !== word) {
    return true;
  }
  return phonetics.some((item) => {
    const phonetic = String(item?.phonetic || item?.text || '').trim();
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
