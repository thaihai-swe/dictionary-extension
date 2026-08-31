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

export function normalizeDictionaryTerm(text: string): string {
  const trimmed = String(text || '').trim();
  return trimmed.replace(/^[^a-zA-Z]+|[^a-zA-Z' -]+$/g, '') || trimmed;
}

export function classifyQuery(text: string): 'empty' | 'word' | 'phrase' | 'sentence' {
  const str = String(text || '').trim();
  if (!str) return 'empty';

  const hasPunctuation = /[.!?]/.test(str);
  const words = str.split(/\s+/).filter(Boolean);

  if (words.length === 1) return 'word';
  if (hasPunctuation || words.length >= 7) return 'sentence';
  return 'phrase';
}

const LEMMA_STOPWORDS = new Set([
  'is', 'was', 'has', 'his', 'its', 'this', 'thus', 'yes', 'news', 'series', 'species', 'corpus', 'chaos', 'bias', 'alias', 'lens', 'bus',
]);

const IRREGULAR_LEMMA_MAP: Record<string, string> = {
  am: 'be', are: 'be', been: 'be', being: 'be', was: 'be', were: 'be',
  went: 'go', gone: 'go', going: 'go',
  did: 'do', done: 'do', doing: 'do',
  had: 'have', having: 'have',
  got: 'get', gotten: 'get', getting: 'get',
  made: 'make', making: 'make',
  ran: 'run', running: 'run',
  came: 'come', coming: 'come',
  became: 'become', becoming: 'become',
  begun: 'begin', began: 'begin', beginning: 'begin',
  bought: 'buy', brought: 'bring', built: 'build', caught: 'catch',
  chose: 'choose', chosen: 'choose',
  drank: 'drink', drunk: 'drink',
  drove: 'drive', driven: 'drive',
  ate: 'eat', eaten: 'eat',
  fell: 'fall', fallen: 'fall',
  felt: 'feel', fought: 'fight', found: 'find',
  flew: 'fly', flown: 'fly',
  forgot: 'forget', forgotten: 'forget',
  forgave: 'forgive', forgiven: 'forgive',
  froze: 'freeze', frozen: 'freeze',
  gave: 'give', given: 'give',
  grew: 'grow', grown: 'grow',
  knew: 'know', known: 'know',
  left: 'leave', lost: 'lose',
  lay: 'lie', lain: 'lie',
  led: 'lead', lent: 'lend', meant: 'mean', met: 'meet', paid: 'pay',
  rode: 'ride', ridden: 'ride',
  rang: 'ring', rung: 'ring',
  rose: 'rise', risen: 'rise',
  saw: 'see', seen: 'see',
  sold: 'sell', sent: 'send',
  shook: 'shake', shaken: 'shake',
  shot: 'shoot', showed: 'show', shown: 'show',
  sang: 'sing', sung: 'sing',
  sank: 'sink', sunk: 'sink',
  sat: 'sit', slept: 'sleep',
  spoke: 'speak', spoken: 'speak',
  spent: 'spend', stood: 'stand',
  stole: 'steal', stolen: 'steal',
  stuck: 'stick',
  swimming: 'swim', swam: 'swim', swum: 'swim',
  winning: 'win',
  taking: 'take', took: 'take', taken: 'take',
  taught: 'teach', tore: 'tear', torn: 'tear', told: 'tell',
  thought: 'think', threw: 'throw', thrown: 'throw',
  understood: 'understand',
  woke: 'wake', woken: 'wake',
  wore: 'wear', worn: 'wear',
  won: 'win',
  wrote: 'write', written: 'write',
  children: 'child', feet: 'foot', geese: 'goose', mice: 'mouse',
  men: 'man', women: 'woman', teeth: 'tooth',
  better: 'good', best: 'good', worse: 'bad', worst: 'bad',
  farther: 'far', farthest: 'far', further: 'far', furthest: 'far',
  criteria: 'criterion', phenomena: 'phenomenon',
  analyses: 'analysis', hypotheses: 'hypothesis',
};

const PHRASE_AUXILIARIES = new Set([
  'am', 'are', 'be', 'been', 'being', 'did', 'do', 'does', 'had', 'has',
  'have', 'is', 'may', 'might', 'must', 'shall', 'should', 'was', 'were',
  'will', 'would', 'can', 'could',
]);

const PHRASE_OBJECT_PRONOUNS = new Set([
  'him', 'her', 'it', 'me', 'them', 'us', 'you',
]);

export function getEnglishLemmaCandidates(text: string): string[] {
  const raw = normalizeDictionaryTerm(String(text || '')).trim().toLowerCase();
  if (!raw || raw.length < 3 || /\s/.test(raw) || !/^[a-z]+(-[a-z]+)?$/i.test(raw)) {
    return [];
  }

  if (LEMMA_STOPWORDS.has(raw)) return [];

  const irregularLemma = IRREGULAR_LEMMA_MAP[raw];
  if (irregularLemma && irregularLemma !== raw) {
    return [irregularLemma];
  }

  const candidates: string[] = [];
  const len = raw.length;

  if (raw.endsWith('ies') && len > 4) {
    candidates.push(raw.slice(0, -3) + 'y');
  } else if (raw.endsWith('es') && len > 4) {
    if (/(ses|xes|zes|ches|shes)$/.test(raw)) {
      candidates.push(raw.slice(0, -2));
    } else {
      candidates.push(raw.slice(0, -1));
      candidates.push(raw.slice(0, -2));
    }
  } else if (raw.endsWith('s') && !raw.endsWith('ss') && len > 3) {
    candidates.push(raw.slice(0, -1));
  }

  if (raw.endsWith('ing') && len > 5) {
    const stem = raw.slice(0, -3);
    if (/(bb|dd|gg|mm|nn|pp|rr|tt)$/.test(stem)) {
      candidates.push(stem.slice(0, -1));
    } else {
      candidates.push(stem + 'e');
      if (stem.length > 3) candidates.push(stem);
    }
  }

  if (raw.endsWith('ied') && len > 4) {
    candidates.push(raw.slice(0, -3) + 'y');
  } else if (raw.endsWith('ed') && len > 4) {
    const stem = raw.slice(0, -2);
    if (/(bb|dd|gg|mm|nn|pp|rr|tt)$/.test(stem)) {
      candidates.push(stem.slice(0, -1));
    } else {
      candidates.push(stem + 'e');
      if (stem.length > 3) candidates.push(stem);
    }
  }

  if (raw.endsWith('ier') && len > 4) {
    candidates.push(raw.slice(0, -3) + 'y');
  } else if (raw.endsWith('iest') && len > 5) {
    candidates.push(raw.slice(0, -4) + 'y');
  } else if (raw.endsWith('er') && len > 4) {
    const stem = raw.slice(0, -2);
    if (/(bb|dd|gg|mm|nn|pp|rr|tt)$/.test(stem)) {
      candidates.push(stem.slice(0, -1));
    } else {
      candidates.push(raw.slice(0, -1));
      candidates.push(stem);
    }
  } else if (raw.endsWith('est') && len > 5) {
    const stem = raw.slice(0, -3);
    if (/(bb|dd|gg|mm|nn|pp|rr|tt)$/.test(stem)) {
      candidates.push(stem.slice(0, -1));
    } else {
      candidates.push(raw.slice(0, -2));
      candidates.push(stem);
    }
  }

  return [...new Set(candidates.filter((candidate) => candidate && candidate !== raw && candidate.length >= 2))];
}

function uniquePreserveOrder(items: string[]): string[] {
  const seen = new Set<string>();
  const output: string[] = [];
  for (const item of items) {
    const cleaned = String(item || '').trim().toLowerCase();
    if (!cleaned || seen.has(cleaned)) continue;
    seen.add(cleaned);
    output.push(cleaned);
  }
  return output;
}

function shouldDoubleFinalConsonant(lemma: string): boolean {
  return lemma.length >= 3
    && lemma.length <= 6
    && /[^aeiou][aeiou][^aeiouwxy]$/.test(lemma);
}

function regularInflections(lemma: string): string[] {
  const forms = [lemma];
  if (lemma.endsWith('y') && lemma.length > 2 && !/[aeiou]y$/.test(lemma)) {
    forms.push(`${lemma.slice(0, -1)}ies`);
  } else if (/(?:s|x|z|ch|sh)$/.test(lemma)) {
    forms.push(`${lemma}es`);
  } else if (!lemma.endsWith('s')) {
    forms.push(`${lemma}s`);
  }

  if (lemma.endsWith('e') && lemma.length > 2) {
    forms.push(`${lemma}d`, `${lemma.slice(0, -1)}ing`);
  } else if (lemma.endsWith('y') && lemma.length > 2 && !/[aeiou]y$/.test(lemma)) {
    forms.push(`${lemma.slice(0, -1)}ied`, `${lemma}ing`);
  } else if (shouldDoubleFinalConsonant(lemma)) {
    const doubled = `${lemma}${lemma.slice(-1)}`;
    forms.push(`${doubled}ed`, `${doubled}ing`);
  } else {
    forms.push(`${lemma}ed`, `${lemma}ing`);
  }

  return forms;
}

export function getEnglishLemma(text: string): string {
  const raw = normalizeDictionaryTerm(String(text || '')).trim().toLowerCase();
  if (!raw) return '';
  const irregularLemma = IRREGULAR_LEMMA_MAP[raw];
  if (irregularLemma) return irregularLemma;

  const candidates = uniquePreserveOrder([raw, ...getEnglishLemmaCandidates(raw)]);
  const matching = candidates.filter((candidate) => regularInflections(candidate).includes(raw));
  if (matching.length) {
    return matching.reduce((best, item) => (item.length < best.length ? item : best));
  }
  return getEnglishLemmaCandidates(raw)[0] || raw;
}

export function prefersLemmaHeadword(text: string): boolean {
  const raw = normalizeDictionaryTerm(String(text || '')).trim().toLowerCase();
  if (!raw || /\s/.test(raw)) return false;
  const lemma = getEnglishLemma(raw);
  return Boolean(lemma && lemma !== raw);
}

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
  'merriam_webster',
  'wordnik',
  'words_api',
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
  const lemma = getEnglishLemma(normalizedText);
  const preferLemma = prefersLemmaHeadword(normalizedText);
  const lemmaCandidates = uniquePreserveOrder(
    preferLemma
      ? [lemma, ...getEnglishLemmaCandidates(normalizedText)]
      : getEnglishLemmaCandidates(normalizedText),
  );
  const phraseCandidates = getEnglishPhraseCandidates(normalizedText);
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

  if (preferLemma) {
    for (const candidate of lemmaCandidates) {
      pushAttempt(normalizedPrimary, candidate, 'root');
    }
    pushAttempt(normalizedPrimary, normalizedText, 'exact');
  } else {
    pushAttempt(normalizedPrimary, normalizedText, 'exact');
    for (const candidate of lemmaCandidates) {
      pushAttempt(normalizedPrimary, candidate, 'root');
    }
  }
  for (const candidate of phraseCandidates) {
    pushAttempt(normalizedPrimary, candidate, 'phrase');
  }

  for (const providerId of fallbackChain) {
    if (providerId === normalizedPrimary) continue;
    if (preferLemma) {
      for (const candidate of lemmaCandidates) {
        pushAttempt(providerId, candidate, 'root');
      }
      pushAttempt(providerId, normalizedText, 'exact');
    } else {
      pushAttempt(providerId, normalizedText, 'exact');
      for (const candidate of lemmaCandidates) {
        pushAttempt(providerId, candidate, 'root');
      }
    }
  }
  for (const candidate of phraseCandidates) {
    for (const providerId of fallbackChain) {
      if (providerId === normalizedPrimary) continue;
      pushAttempt(providerId, candidate, 'phrase');
    }
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

  const frequencyPill = String(row.frequencyPill || row.frequency || '').trim() || undefined;
  const cefr = String(row.cefr || '').trim() as LexicalProfile['cefr'];

  if (!hasData && !frequencyPill && !cefr) return null;

  return {
    wordFamily: Object.keys(wordFamily).length ? wordFamily : undefined,
    usageWarnings: usageWarnings.length ? usageWarnings : undefined,
    usageNotes: usageWarnings.join(' ') || undefined,
    confusablePairs: confusablePairs.length ? confusablePairs : undefined,
    learnerMistakes: learnerMistakes.length ? learnerMistakes : undefined,
    wordFormation: wordFormation || undefined,
    collocations: collocations || undefined,
    frequencyPill,
    cefr: cefr || undefined,
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
    frequencyPill: base.frequencyPill || next.frequencyPill,
    cefr: base.cefr || next.cefr,
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
