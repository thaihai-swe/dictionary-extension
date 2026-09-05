import type {
  AttributedItem,
  DictionaryEntry,
  Meaning,
  Phonetic,
  ProviderLookupDto,
  SourceBadge,
  TranslationResult,
} from '../types';
import { mergeLexicalProfiles } from './query-utils.ts';

export const MAX_DEFINITIONS_PER_POS = 8;
export const MAX_MEANINGS = 6;
export const MAX_PHONETICS = 8;
export const MAX_ITEMS_PER_SECTION = 16;

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

function areDefinitionsEquivalent(a: string, b: string): boolean {
  const normA = normalizeComparableText(a);
  const normB = normalizeComparableText(b);
  if (!normA || !normB) return false;
  if (normA === normB) return true;
  if (normA.length <= 20 || normB.length <= 20) return false;
  if (normA.startsWith(normB) || normB.startsWith(normA)) return true;
  if (normA.endsWith(normB) || normB.endsWith(normA)) return true;
  const tokensA = normA.split(' ');
  const tokensB = normB.split(' ');
  const [shorter, longer] = tokensA.length <= tokensB.length ? [tokensA, tokensB] : [tokensB, tokensA];
  if (shorter.length / longer.length < 0.6) return false;
  const longerSet = new Set(longer);
  return shorter.every((token) => longerSet.has(token));
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

function displayPartOfSpeech(pos: string): string {
  return canonicalPartOfSpeech(pos);
}

function mergeAttributed(existing: AttributedItem[] = [], incoming: AttributedItem[] = []): AttributedItem[] {
  const merged = [...existing];
  for (const item of incoming) {
    const text = String(item?.text || '').trim();
    if (!text) continue;
    if (merged.some((row) => normalizeText(row.text) === normalizeText(text))) continue;
    if (merged.length >= MAX_ITEMS_PER_SECTION) break;
    merged.push({ text });
  }
  return merged;
}

function cloneMeaning(meaning: Meaning): Meaning {
  return {
    partOfSpeech: displayPartOfSpeech(meaning.partOfSpeech),
    definitions: [...(meaning.definitions || [])],
    synonyms: meaning.synonyms ? [...meaning.synonyms] : undefined,
    antonyms: meaning.antonyms ? [...meaning.antonyms] : undefined,
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
      if (merged.length >= MAX_MEANINGS) return;
      target = {
        partOfSpeech: displayPartOfSpeech(incMeaning.partOfSpeech || pos),
        definitions: [],
        synonyms: [],
        antonyms: [],
      };
      merged.push(target);
    }

    if (!target) return;

    target.partOfSpeech = displayPartOfSpeech(target.partOfSpeech || pos);

    for (const incDef of incMeaning.definitions || []) {
      const defText = (incDef.definition || '').trim();
      if (!defText) continue;
      const existingDef = target.definitions.find((definition) => (
        areDefinitionsEquivalent(definition.definition, defText)
      ));
      if (existingDef) {
        if (!existingDef.example && incDef.example) {
          existingDef.example = incDef.example;
        }
        continue;
      }
      if (target.definitions.length < MAX_DEFINITIONS_PER_POS) {
        target.definitions.push({
          ...incDef,
          definition: defText,
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

function phoneticRegion(item: Phonetic): Phonetic['region'] | undefined {
  if (item.region && item.region !== 'all') return item.region;
  const language = String(item.language || '').toLowerCase();
  if (language.includes('gb')) return 'uk';
  if (language.includes('us')) return 'us';
  return undefined;
}

export function mergePhonetics(existing: Phonetic[] = [], incoming: Phonetic[] = []): Phonetic[] {
  const merged = existing.map((item) => ({ ...item }));
  for (const item of incoming || []) {
    const text = String(item.text || '').trim();
    const audio = String(item.audio || '').trim();
    const language = String(item.language || '').trim();
    if (!text && !audio) continue;

    const incomingRegion = phoneticRegion(item);
    const incomingIpa = normalizeText(text);
    const matchIndex = merged.findIndex((entry) => {
      const entryIpa = normalizeText(String(entry.text || ''));
      if (incomingIpa && entryIpa) return incomingIpa === entryIpa;
      const entryRegion = phoneticRegion(entry);
      if (incomingRegion && entryRegion) return incomingRegion === entryRegion;
      if (!incomingIpa && incomingRegion && entryRegion === incomingRegion) return true;
      if (!entryIpa && incomingIpa && incomingRegion && entryRegion === incomingRegion) return true;
      return false;
    });

    if (matchIndex >= 0) {
      const current = merged[matchIndex];
      if (text && !String(current.text || '').trim()) current.text = text;
      if (audio && !String(current.audio || '').trim()) {
        current.audio = audio;
      }
      if (language && !current.language) current.language = language;
      if (incomingRegion && (!current.region || current.region === 'all')) {
        current.region = incomingRegion;
        current.language = incomingRegion === 'uk' ? 'en-GB' : incomingRegion === 'us' ? 'en-US' : current.language;
        current.label = incomingRegion === 'uk' ? 'Listen (UK)' : incomingRegion === 'us' ? 'Listen (US)' : current.label;
      }
      continue;
    }

    if (merged.length >= MAX_PHONETICS) break;
    merged.push({
      ...item,
      text,
      audio,
      language: language || (incomingRegion === 'uk' ? 'en-GB' : incomingRegion === 'us' ? 'en-US' : language),
      region: incomingRegion || item.region,
    });
  }
  return merged;
}

function mergeSourceBadges(existing: SourceBadge[] = [], incoming: SourceBadge[] = []): SourceBadge[] {
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
    };
  }
  return undefined;
}

/** Canonical provider payload used by mergeDictionaryEntries. */
export function toDictionaryEntry(dto: ProviderLookupDto | DictionaryEntry): DictionaryEntry {
  const extra = dto as Partial<DictionaryEntry> & Partial<ProviderLookupDto>;
  const phonetics = mergePhonetics(dto.phonetics);
  const meanings = dto.meanings || [];
  return {
    word: String(dto.word || '').trim(),
    phonetics,
    meanings,
    examples: dto.examples,
    synonyms: dto.synonyms,
    antonyms: dto.antonyms,
    lexicalProfile: dto.lexicalProfile,
    translation: dto.translation || extractTranslationFromMeanings(meanings),
    originalText: extra.originalText,
    phraseExplanation: dto.phraseExplanation,
    enriched: extra.enriched,
    revision: extra.revision,
  };
}

export function mergeDictionaryEntries(
  base: ProviderLookupDto | DictionaryEntry,
  incoming: ProviderLookupDto | DictionaryEntry,
): DictionaryEntry {
  const left = toDictionaryEntry(base);
  const right = toDictionaryEntry(incoming);
  const translation = mergeTranslations(
    left.translation,
    right.translation,
  ) || extractTranslationFromMeanings([...(left.meanings || []), ...(right.meanings || [])]);

  return {
    ...left,
    phonetics: mergePhonetics(left.phonetics, right.phonetics),
    meanings: mergeMeanings(left.meanings || [], right.meanings || []),
    examples: mergeAttributed(left.examples, right.examples),
    synonyms: mergeAttributed(left.synonyms, right.synonyms),
    antonyms: mergeAttributed(left.antonyms, right.antonyms),
    lexicalProfile: mergeLexicalProfiles(left.lexicalProfile, right.lexicalProfile),
    translation,
    phraseExplanation: left.phraseExplanation?.length ? left.phraseExplanation : right.phraseExplanation,
    originalText: left.originalText || right.originalText,
    enriched: left.enriched,
  };
}

export function cloneDictionaryEntry(entry: DictionaryEntry): DictionaryEntry {
  return {
    ...entry,
    meanings: mergeMeanings(entry.meanings || [], []),
    phonetics: entry.phonetics ? entry.phonetics.map((item) => ({ ...item })) : undefined,
    examples: entry.examples ? entry.examples.map((item) => ({ ...item })) : undefined,
    synonyms: entry.synonyms ? entry.synonyms.map((item) => ({ ...item })) : undefined,
    antonyms: entry.antonyms ? entry.antonyms.map((item) => ({ ...item })) : undefined,
    phraseExplanation: entry.phraseExplanation ? entry.phraseExplanation.map((item) => ({ ...item })) : undefined,
    translation: entry.translation ? { ...entry.translation } : undefined,
  };
}
