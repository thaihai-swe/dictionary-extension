import type {
  AiComparisonRow,
  AiPhraseItem,
  Collocations,
  ConfusablePair,
  LearnerMistake,
  LexicalProfile,
  PhraseExplanationSection,
  SentenceStructureItem,
  WordFamily,
  WordFormation,
} from '../types';
import {
  getEnglishLemma,
  getEnglishLemmaCandidates,
  normalizeDictionaryTerm,
  prefersLemmaHeadword,
} from './lemma.ts';

export {
  getEnglishLemma,
  getEnglishLemmaCandidates,
  normalizeDictionaryTerm,
  prefersLemmaHeadword,
};

export function classifyQuery(text: string): 'empty' | 'word' | 'phrase' | 'sentence' {
  const str = String(text || '').trim();
  if (!str) return 'empty';

  const hasPunctuation = /[.!?]/.test(str);
  const words = str.split(/\s+/).filter(Boolean);

  if (words.length === 1) return 'word';
  if (hasPunctuation || words.length >= 7) return 'sentence';
  return 'phrase';
}

const PHRASE_AUXILIARIES = new Set([
  'am', 'are', 'be', 'been', 'being', 'did', 'do', 'does', 'had', 'has',
  'have', 'is', 'may', 'might', 'must', 'shall', 'should', 'was', 'were',
  'will', 'would', 'can', 'could',
]);

const PHRASE_OBJECT_PRONOUNS = new Set([
  'him', 'her', 'it', 'me', 'them', 'us', 'you',
]);

export function getEnglishPhraseCandidates(text: string): string[] {
  const normalized = String(text || '').replace(/\s+/g, ' ').trim().toLowerCase();
  if (!normalized || !/\s/.test(normalized) || !/^[a-z]+(?:[ '-][a-z]+)*$/i.test(normalized)) {
    return [];
  }

  const tokens = normalized.split(' ');
  const candidates: string[] = [];
  const pushCandidate = (value: string[]) => {
    const candidate = value.join(' ').trim();
    if (candidate && candidate !== normalized && !candidates.includes(candidate)) {
      candidates.push(candidate);
    }
  };

  let headIndex = 0;
  while (headIndex < tokens.length - 1 && PHRASE_AUXILIARIES.has(tokens[headIndex])) {
    headIndex += 1;
  }

  const head = tokens[headIndex];
  const headCandidates = [head, ...getEnglishLemmaCandidates(head)];

  for (const lemma of [...new Set(headCandidates)]) {
    const canonical = tokens.slice(headIndex);
    canonical[0] = lemma;
    pushCandidate(canonical);

    if (
      canonical.length >= 3
      && PHRASE_OBJECT_PRONOUNS.has(canonical[1])
      && canonical.length <= 4
    ) {
      pushCandidate([canonical[0], ...canonical.slice(2)]);
    }
  }

  return candidates;
}

export type LookupAttemptKind = 'exact' | 'root' | 'phrase';

export interface DictionaryLookupAttempt {
  providerId: string;
  query: string;
  kind: LookupAttemptKind;
}

const FALLBACK_ORDER = [
  'free_dictionary',
  'wiktionary',
  'datamuse',
  'rhymebrain',
  'wikipedia',
  'urban_dictionary',
];

export const DICTIONARY_FALLBACK_ORDER = FALLBACK_ORDER;
export const MAX_PRIMARY_DICTIONARY_ATTEMPTS = 2;

export function isPhraseLike(text: string): boolean {
  const normalized = String(text || '').replace(/\s+/g, ' ').trim();
  if (!normalized) return false;
  if (normalized.split(' ').length > 1) return true;
  return /[-']/.test(normalized) && normalized.length > 2;
}

function inferPhraseSectionKind(title: string): string {
  const normalized = String(title || '').trim().toLowerCase();
  if (!normalized) return 'phrase';
  if (normalized.includes('usage') || normalized.includes('register')) return 'usage';
  if (normalized.includes('example')) return 'examples';
  if (normalized.includes('related')) return 'phrase';
  if (normalized.includes('meaning')) return 'definitions';
  return 'phrase';
}

export function splitPhraseExplanation(markdown: string, source = 'AI · Phrase explanation'): PhraseExplanationSection[] {
  const text = String(markdown || '').trim();
  if (!text) return [];

  const blocks: PhraseExplanationSection[] = [];
  let currentTitle = '';
  let currentLines: string[] = [];

  const flush = () => {
    const body = currentLines.join('\n').trim();
    if (!currentTitle && !body) return;
    blocks.push({
      title: currentTitle || (blocks.length === 0 ? 'Phrase explanation' : ''),
      kind: inferPhraseSectionKind(currentTitle),
      text: body,
      markdown: true,
      source: blocks.length === 0 ? source : undefined,
    });
    currentTitle = '';
    currentLines = [];
  };

  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('### ') || trimmed.startsWith('## ')) {
      flush();
      currentTitle = trimmed.replace(/^#+\s*/, '');
      continue;
    }
    currentLines.push(line);
  }
  flush();

  if (blocks.length === 1 && !String(blocks[0].title || '').trim()) {
    blocks[0].title = 'Phrase explanation';
  }
  return blocks.filter((section) => Boolean(section.text?.trim() || section.title?.trim()));
}

export function getDictionaryLookupAttempts(text: string, primaryId: string): DictionaryLookupAttempt[] {
  const normalizedPrimary = FALLBACK_ORDER.includes(primaryId) ? primaryId : 'free_dictionary';
  const fallbackChain = [
    normalizedPrimary,
    ...FALLBACK_ORDER.filter((id) => id !== normalizedPrimary),
  ];
  const normalizedText = normalizeDictionaryTerm(text) || String(text || '').trim();
  const attempts: DictionaryLookupAttempt[] = [];
  const seen = new Set<string>();

  function pushAttempt(providerId: string, query: string, kind: LookupAttemptKind) {
    const normalizedQuery = String(query || '').trim();
    if (!providerId || !normalizedQuery) return;
    const key = `${providerId}\0${normalizedQuery.toLowerCase()}`;
    if (seen.has(key)) return;
    seen.add(key);
    attempts.push({ providerId, query: normalizedQuery, kind });
  }

  for (const providerId of fallbackChain) {
    pushAttempt(providerId, normalizedText, 'exact');
  }

  return attempts;
}

export function getPrimaryDictionaryLookupAttempts(text: string, primaryId: string): DictionaryLookupAttempt[] {
  const normalizedPrimary = FALLBACK_ORDER.includes(primaryId) ? primaryId : 'free_dictionary';
  return getDictionaryLookupAttempts(text, primaryId)
    .filter((attempt) => attempt.providerId === normalizedPrimary)
    .slice(0, MAX_PRIMARY_DICTIONARY_ATTEMPTS);
}

const MAX_LEXICAL_ITEMS = 8;
const MAX_LEXICAL_WARNINGS = 6;
const MAX_CONFUSABLE_PAIRS = 4;
const MAX_DERIVATIVES = 12;
const MAX_FORMATION_ITEMS = 6;
const MAX_LEARNER_MISTAKES = 6;
const MAX_COLLOCATION_ITEMS_PER_GROUP = 10;
const MAX_FORMATION_EXPLANATION_LENGTH = 500;
const LEXICAL_FAMILY_KEYS = ['noun', 'verb', 'adjective', 'adverb', 'inflections', 'derivatives'] as const;
const COLLOCATION_GROUP_KEYS = ['verbs', 'nouns', 'prepositions', 'adjectives', 'patterns'] as const;

export function extractJsonObject(value: string): unknown {
  const text = String(value || '').trim();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

function normalizeLexicalItems(value: unknown, limit = MAX_LEXICAL_ITEMS): string[] {
  const source = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split(/[,;\n|]+/)
      : [];
  const seen = new Set<string>();
  const items: string[] = [];
  for (const item of source) {
    const cleaned = String(item || '').replace(/^[\s`*_"']+|[\s`*_"']+$/g, '').trim();
    const key = cleaned.toLocaleLowerCase();
    if (cleaned && !seen.has(key)) {
      seen.add(key);
      items.push(cleaned);
    }
    if (items.length >= limit) break;
  }
  return items;
}

function familyKeyToWordFamily(key: string): keyof WordFamily | null {
  if (key === 'noun' || key === 'nouns') return 'nouns';
  if (key === 'verb' || key === 'verbs') return 'verbs';
  if (key === 'adjective' || key === 'adjectives') return 'adjectives';
  if (key === 'adverb' || key === 'adverbs') return 'adverbs';
  if (key === 'inflections') return 'inflections';
  if (key === 'derivatives') return 'derivatives';
  return null;
}

function normalizeLearnerMistakes(source: unknown): LearnerMistake[] {
  const list = Array.isArray(source)
    ? source
    : typeof source === 'string'
      ? extractJsonObject(source)
      : null;
  if (!Array.isArray(list)) return [];

  const seen = new Set<string>();
  const mistakes: LearnerMistake[] = [];
  for (const item of list) {
    if (mistakes.length >= MAX_LEARNER_MISTAKES) break;
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    const mistake = String(row.mistake || row.original || row.error || '').trim();
    const correction = String(row.correction || row.fixed || row.correct || '').trim();
    const example = String(row.example || row.example_sentence || '').trim();
    const key = `${mistake}|${correction}`.toLowerCase();
    if (mistake && correction && !seen.has(key)) {
      seen.add(key);
      mistakes.push({ mistake, correction, ...(example ? { example } : {}) });
    }
  }
  return mistakes;
}

function normalizeWordFormation(source: unknown): WordFormation | null {
  if (!source) return null;
  if (typeof source === 'string') {
    const explanation = source.trim().slice(0, MAX_FORMATION_EXPLANATION_LENGTH);
    return explanation ? { explanation } : null;
  }
  if (typeof source !== 'object' || Array.isArray(source)) return null;
  const row = source as Record<string, unknown>;
  const prefixes = normalizeLexicalItems(row.prefixes || row.prefix);
  const suffixes = normalizeLexicalItems(row.suffixes || row.suffix);
  const explanation = String(row.explanation || row.note || row.description || '')
    .trim()
    .slice(0, MAX_FORMATION_EXPLANATION_LENGTH);
  if (!prefixes.length && !suffixes.length && !explanation) return null;
  return {
    prefixes: prefixes.slice(0, MAX_FORMATION_ITEMS),
    suffixes: suffixes.slice(0, MAX_FORMATION_ITEMS),
    explanation,
  };
}

function normalizeCollocations(source: unknown): Collocations | null {
  if (!source || typeof source !== 'object' || Array.isArray(source)) return null;
  const row = source as Record<string, unknown>;
  const collocations: Collocations = {};
  const seen = new Set<string>();
  let hasData = false;
  for (const key of COLLOCATION_GROUP_KEYS) {
    const rawValue = row[key];
    const values = (Array.isArray(rawValue)
      ? rawValue
      : typeof rawValue === 'string'
        ? rawValue.split(/[,;\n|]+/)
        : [])
      .map((item) => String(item || '').replace(/^[\s`*_"']+|[\s`*_"']+$/g, '').trim())
      .filter((cleaned) => {
        const lowercase = cleaned.toLocaleLowerCase();
        if (!cleaned || seen.has(lowercase)) return false;
        seen.add(lowercase);
        return true;
      });
    const sliced = values.slice(0, MAX_COLLOCATION_ITEMS_PER_GROUP);
    if (sliced.length) {
      collocations[key] = sliced;
      hasData = true;
    }
  }
  return hasData ? collocations : null;
}

export function parseLexicalProfile(value: unknown): LexicalProfile | null {
  const source = typeof value === 'string' ? extractJsonObject(value) : value;
  if (!source || typeof source !== 'object' || Array.isArray(source)) return null;

  const profileSource = (source as Record<string, unknown>).lexicalProfile
    || (source as Record<string, unknown>).lexical_profile
    || source;
  if (!profileSource || typeof profileSource !== 'object' || Array.isArray(profileSource)) return null;
  const row = profileSource as Record<string, unknown>;
  const familySource = (row.wordFamily || row.word_family || {}) as Record<string, unknown>;
  const wordFamily: WordFamily = {};
  let hasData = false;

  for (const key of LEXICAL_FAMILY_KEYS) {
    const aliases = key === 'inflections'
      ? ['inflections', 'stems', 'forms']
      : key === 'derivatives'
        ? ['derivatives', 'derived_terms', 'derivations']
        : [key, `${key}s`];
    const values = aliases.flatMap((alias) => normalizeLexicalItems(familySource[alias]));
    const mapped = familyKeyToWordFamily(key);
    if (!mapped) continue;
    const items = normalizeLexicalItems(values, key === 'derivatives' ? MAX_DERIVATIVES : MAX_LEXICAL_ITEMS);
    if (items.length) {
      wordFamily[mapped] = items;
      hasData = true;
    }
  }

  const usageWarnings = normalizeLexicalItems(
    row.usageWarnings || row.usage_warnings || row.warnings || row.usageNotes,
    MAX_LEXICAL_WARNINGS,
  );
  if (usageWarnings.length) hasData = true;

  const pairSource = Array.isArray(row.confusablePairs || row.confusable_pairs)
    ? (row.confusablePairs || row.confusable_pairs) as Array<Record<string, unknown>>
    : [];
  const seenPairs = new Set<string>();
  const confusablePairs: ConfusablePair[] = [];
  for (const pair of pairSource) {
    const word = String(pair?.word || pair?.term || '').trim();
    const distinction = String(pair?.distinction || pair?.explanation || pair?.note || '').trim();
    const pairKey = word.toLocaleLowerCase();
    if (word && distinction && !seenPairs.has(pairKey)) {
      seenPairs.add(pairKey);
      confusablePairs.push({ word, distinction });
    }
    if (confusablePairs.length >= MAX_CONFUSABLE_PAIRS) break;
  }
  if (confusablePairs.length) hasData = true;

  const learnerMistakes = normalizeLearnerMistakes(row.learnerMistakes || row.learner_mistakes);
  if (learnerMistakes.length) hasData = true;

  const wordFormation = normalizeWordFormation(row.wordFormation || row.word_formation);
  if (wordFormation) hasData = true;

  const collocations = normalizeCollocations(row.collocations || row.collocations_list);
  if (collocations) hasData = true;

  if (!hasData) return null;

  return {
    wordFamily: Object.keys(wordFamily).length ? wordFamily : undefined,
    usageWarnings: usageWarnings.length ? usageWarnings : undefined,
    usageNotes: usageWarnings.join(' ') || undefined,
    confusablePairs: confusablePairs.length ? confusablePairs : undefined,
    learnerMistakes: learnerMistakes.length ? learnerMistakes : undefined,
    wordFormation: wordFormation || undefined,
    collocations: collocations || undefined,
  };
}

export function extractLexicalProfileFromMarkdown(markdown: string): LexicalProfile | null {
  const text = String(markdown || '');
  if (!text) return null;

  const xml = text.match(/<lexical-profile>\s*([\s\S]*?)\s*<\/lexical-profile>/i);
  if (xml) {
    const parsed = parseLexicalProfile(xml[1]);
    if (parsed) return parsed;
  }

  const usageWarnings: string[] = [];
  const registerTags = text.match(/\[(formal|informal|slang|archaic|technical|academic|literary|colloquial)\]/gi) || [];
  for (const tag of registerTags) {
    const label = tag.slice(1, -1).toLowerCase();
    const warning = `${label.charAt(0).toUpperCase()}${label.slice(1)} register`;
    if (!usageWarnings.includes(warning)) usageWarnings.push(warning);
  }

  const match = text.match(/(?:often\s+)?confused\s+with\s+[`*_"']?([a-z][a-z-]*)[`*_"']?(?:\s*[:—-]\s*([^\n.]+))?/i);
  const confusablePairs = match
    ? [{ word: match[1], distinction: String(match[2] || '').trim() || `Often confused with ${match[1]}.` }]
    : [];
  return parseLexicalProfile({ usageWarnings, confusablePairs });
}

export function mergeLexicalProfiles(baseProfile?: unknown, nextProfile?: unknown): LexicalProfile | undefined {
  const base = parseLexicalProfile(baseProfile);
  const next = parseLexicalProfile(nextProfile);
  if (!base) return next || undefined;
  if (!next) return base;

  const wordFamily: WordFamily = {};
  for (const key of ['nouns', 'verbs', 'adjectives', 'adverbs', 'inflections', 'derivatives'] as const) {
    const items = normalizeLexicalItems([...(base.wordFamily?.[key] || []), ...(next.wordFamily?.[key] || [])]);
    if (items.length) wordFamily[key] = items;
  }

  const usageWarnings = normalizeLexicalItems(
    [...(base.usageWarnings || []), ...(next.usageWarnings || [])],
    MAX_LEXICAL_WARNINGS,
  );
  const pairs = new Map<string, ConfusablePair>();
  for (const pair of [...(base.confusablePairs || []), ...(next.confusablePairs || [])]) {
    const pairKey = pair.word.toLocaleLowerCase();
    if (!pairs.has(pairKey)) pairs.set(pairKey, pair);
  }

  const baseFormation = typeof base.wordFormation === 'string'
    ? { explanation: base.wordFormation }
    : base.wordFormation;
  const nextFormation = typeof next.wordFormation === 'string'
    ? { explanation: next.wordFormation }
    : next.wordFormation;

  return {
    wordFamily: Object.keys(wordFamily).length ? wordFamily : undefined,
    usageWarnings: usageWarnings.length ? usageWarnings : undefined,
    usageNotes: usageWarnings.join(' ') || base.usageNotes || next.usageNotes,
    confusablePairs: [...pairs.values()].slice(0, MAX_CONFUSABLE_PAIRS),
    learnerMistakes: normalizeLearnerMistakes([...(base.learnerMistakes || []), ...(next.learnerMistakes || [])]),
    wordFormation: baseFormation || nextFormation || undefined,
    collocations: normalizeCollocations({
      ...(base.collocations || {}),
      ...(next.collocations || {}),
    }) || undefined,
  };
}

function compactField(value: unknown): string {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function sentenceIncludes(sentence: string, fragment: string): boolean {
  const haystack = sentence.toLowerCase();
  const needle = fragment.toLowerCase().trim();
  return Boolean(needle) && haystack.includes(needle);
}

export function normalizeSentenceBreakdown(
  data: unknown,
  options: { text?: string; context?: string; sentence?: string } = {},
): { translation?: string; structure: SentenceStructureItem[]; phrases: AiPhraseItem[] } | null {
  if (!data || typeof data !== 'object') return null;
  const source = data as Record<string, unknown>;
  const sentence = compactField(options.sentence || options.context || options.text || source.sentence);
  const parts = Array.isArray(source.parts) ? source.parts : [];
  const structure: SentenceStructureItem[] = parts
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const row = item as Record<string, unknown>;
      const text = compactField(row.text);
      const role = compactField(row.role || row.label);
      if (!text || !role) return null;
      return { text, role };
    })
    .filter((item): item is SentenceStructureItem => Boolean(item));

  const phrases: AiPhraseItem[] = [];
  for (const item of Array.isArray(source.phrases) ? source.phrases : []) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    const text = compactField(row.text);
    if (!text || (sentence && !sentenceIncludes(sentence, text))) continue;
    phrases.push({
      text,
      type: compactField(row.type),
      meaning: compactField(row.meaning),
      role: compactField(row.role),
      example: compactField(row.example),
    });
  }

  if (!structure.length && !phrases.length && !compactField(source.translation)) return null;
  return {
    translation: compactField(source.translation) || undefined,
    structure,
    phrases,
  };
}

export function normalizeComparisonData(
  content: string,
  options: { text?: string } = {},
): { coreDistinction?: string; rows: AiComparisonRow[]; leftTerm?: string; rightTerm?: string } | null {
  const json = extractJsonObject(content);
  if (json && typeof json === 'object') {
    const source = json as Record<string, unknown>;
    const rows = Array.isArray(source.table || source.rows)
      ? ((source.table || source.rows) as unknown[])
        .map((item) => {
          if (!item || typeof item !== 'object') return null;
          const row = item as Record<string, unknown>;
          const dimension = compactField(row.dimension || row.feature || row.label);
          const left = compactField(row.left || row.a || row.termA);
          const right = compactField(row.right || row.b || row.termB);
          if (!dimension || (!left && !right)) return null;
          return { dimension, left, right };
        })
        .filter((item): item is AiComparisonRow => Boolean(item))
      : [];
    const coreDistinction = compactField(source.coreDistinction || source.distinction);
    if (rows.length || coreDistinction) {
      return {
        coreDistinction: coreDistinction || undefined,
        rows,
        leftTerm: compactField(source.leftTerm || source.termA) || undefined,
        rightTerm: compactField(source.rightTerm || source.termB) || undefined,
      };
    }
  }

  const text = String(content || '');
  const distinctionMatch = text.match(/###\s*(?:Core Distinction|Distinction|Rule of Thumb)[^\n]*\n+([\s\S]*?)(?=\n###|\s*$)/i);
  const coreDistinction = compactField(distinctionMatch?.[1] || '');
  if (!coreDistinction && !options.text) return null;
  return coreDistinction ? { coreDistinction, rows: [] } : null;
}

const LEXICAL_PROFILE_RE = /<lexical-profile>[\s\S]*?<\/lexical-profile>/gi;

export function stripLexicalProfileBlock(text: string): string {
  return String(text || '').replace(LEXICAL_PROFILE_RE, '').trim();
}

export function parseLexicalProfileFromResponse(text: string): LexicalProfile | null {
  const match = String(text || '').match(/<lexical-profile>[\s\S]*?<\/lexical-profile>/i);
  if (!match) return null;
  const inner = match[0].replace(/^<lexical-profile>|<\/lexical-profile>$/i, '').trim();
  return parseLexicalProfile(extractJsonObject(inner) || inner);
}
