import { DICTIONARY_FETCH_TIMEOUT_MS, safeFetch } from './provider.http.ts';
import type { AttributedItem, Definition, Meaning, Phonetic, ProviderLookupDto } from '../types/index.ts';
import { normalizeDictionaryTerm } from '../shared/query-utils.ts';
import { resolveLanguageCode, resolveLanguageName } from '../shared/languages.ts';
import { NotFoundError, throwForHttpStatus } from './errors.ts';

const MAX_EXTRACT_CHARS = 420;
const WIKTIONARY_HOST_ALIASES: Record<string, string> = {
  'zh-cn': 'zh',
  'zh-tw': 'zh',
  zh: 'zh',
};

interface WiktionaryQueryResponse {
  query?: {
    pages?: Record<string, {
      missing?: string | boolean;
      extract?: string;
      title?: string;
    }>;
  };
}

interface WiktionaryRevisionResponse {
  query?: {
    pages?: Array<{
      title?: string;
      missing?: boolean;
      revisions?: Array<{
        slots?: { main?: { content?: string } };
      }>;
    }>;
  };
}

const POS_LABELS: Record<string, string> = {
  adj: 'adjective',
  adjective: 'adjective',
  adv: 'adverb',
  adverb: 'adverb',
  n: 'noun',
  noun: 'noun',
  v: 'verb',
  verb: 'verb',
  prep: 'preposition',
  preposition: 'preposition',
  pron: 'pronoun',
  pronoun: 'pronoun',
  num: 'numeral',
  numeral: 'numeral',
};

function stripWikitext(value: string): string {
  return String(value || '')
    .replace(/\{\{(?:term|l|link)\|([^|}]+)(?:\|[^}]*)?\}\}/gi, '$1')
    .replace(/\{\{[^{}]*\}\}/g, '')
    .replace(/\[\[([^|\]]+)\|([^\]]+)\]\]/g, '$2')
    .replace(/\[\[([^\]]+)\]\]/g, '$1')
    .replace(/'{2,}/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseBilingualExample(value: string): Pick<Definition, 'example' | 'exampleTranslation'> {
  const text = stripWikitext(value);
  const separator = text.match(/\s+[—–-]\s+/);
  if (!separator || separator.index === undefined) return { example: text || undefined };
  return {
    example: text.slice(0, separator.index).trim() || undefined,
    exampleTranslation: text.slice(separator.index + separator[0].length).trim() || undefined,
  };
}

export function parseBilingualWikitext(wikitext: string): {
  meanings: Meaning[];
  examples: Array<{ text: string; translation?: string }>;
  synonyms?: AttributedItem[];
  antonyms?: AttributedItem[];
  phonetics?: Phonetic[];
} | null {
  const source = String(wikitext || '');
  if (!source.trim()) return null;
  const languageStart = source.search(/(?:^|\n)\{\{-eng-\}\}/i);
  const languageSection = languageStart >= 0 ? source.slice(languageStart) : source;
  const meanings: Meaning[] = [];
  const examples: Array<{ text: string; translation?: string }> = [];
  const synonyms: AttributedItem[] = [];
  const antonyms: AttributedItem[] = [];
  let currentMeaning: Meaning | null = null;
  let lastDefinition: Definition | null = null;
  let section = '';

  for (const rawLine of languageSection.split(/\r?\n/)) {
    const line = rawLine.trim();
    const sectionMatch = line.match(/^\{\{-([^{}]+)-\}\}$/);
    if (sectionMatch) {
      section = sectionMatch[1].toLowerCase();
      const partOfSpeech = POS_LABELS[section];
      currentMeaning = partOfSpeech ? { partOfSpeech, definitions: [] } : null;
      if (currentMeaning) meanings.push(currentMeaning);
      lastDefinition = null;
      continue;
    }

    if (section === 'ant' && /^\*/.test(line)) {
      const text = stripWikitext(line.replace(/^\*+\s*/, ''));
      if (text) antonyms.push({ text });
      continue;
    }
    if (section === 'syn' && /^\*/.test(line)) {
      const text = stripWikitext(line.replace(/^\*+\s*/, ''));
      if (text) synonyms.push({ text });
      continue;
    }

    const definitionMatch = line.match(/^#\s*(?![#*:])(.+)$/);
    if (definitionMatch) {
      const definition = stripWikitext(definitionMatch[1]);
      if (!definition) continue;
      if (!currentMeaning) {
        currentMeaning = { partOfSpeech: 'general', definitions: [] };
        meanings.push(currentMeaning);
      }
      lastDefinition = { definition };
      currentMeaning.definitions.push(lastDefinition);
      continue;
    }

    const exampleMatch = line.match(/^#:\s*(.+)$/);
    if (exampleMatch && lastDefinition) {
      const parsed = parseBilingualExample(exampleMatch[1]);
      Object.assign(lastDefinition, parsed);
      if (parsed.example) examples.push({ text: parsed.example, translation: parsed.exampleTranslation });
    }
  }

  const usableMeanings = meanings.filter((meaning) => meaning.definitions.length > 0);
  if (!usableMeanings.length) return null;
  const ipa = source.match(/\{\{(?:IPA-old|IPA)\|([^}|]+)/i)?.[1]?.trim();
  return {
    meanings: usableMeanings,
    examples,
    synonyms: synonyms.length ? synonyms : undefined,
    antonyms: antonyms.length ? antonyms : undefined,
    phonetics: ipa ? [{ text: ipa, language: 'en', label: 'IPA' }] : undefined,
  };
}

export function wiktionaryLangHost(targetLang: string): string | null {
  const code = resolveLanguageCode(targetLang).toLowerCase();
  const host = WIKTIONARY_HOST_ALIASES[code] || (code.includes('-') ? code.split('-')[0] : code);
  if (!host || host === 'en') return null;
  if (!/^[a-z]{2,3}$/.test(host)) return null;
  return host;
}

export async function fetchWiktionaryBilingual(
  word: string,
  targetLang = 'vi',
  signal?: AbortSignal,
): Promise<ProviderLookupDto> {
  const clean = normalizeDictionaryTerm(word) || String(word || '').trim();
  const host = wiktionaryLangHost(targetLang);
  if (!clean) throw new NotFoundError('Wiktionary bilingual: empty query');
  if (!host) throw new NotFoundError('Wiktionary bilingual: English target skips bilingual lookup');

  const url = `https://${host}.wiktionary.org/w/api.php?action=query&titles=${encodeURIComponent(clean)}&prop=extracts&exintro=1&explaintext=1&redirects=1&format=json`;
  const res = await safeFetch(url, {
    signal,
    timeoutMs: DICTIONARY_FETCH_TIMEOUT_MS,
    headers: {
      Accept: 'application/json',
      'Api-User-Agent': 'DictionaryExtension/2.0 (language-learning)',
    },
  });
  if (!res.ok) {
    throwForHttpStatus(
      res.status,
      `Wiktionary bilingual: No entry found for '${clean}'`,
      `Wiktionary bilingual lookup failed (HTTP ${res.status}).`,
    );
  }

  const data = await res.json() as WiktionaryQueryResponse;
  const page = Object.values(data.query?.pages || {})[0];
  const extract = String(page?.extract || '').trim();
  if (!page || page.missing !== undefined) {
    throw new NotFoundError(`Wiktionary bilingual: No entry found for '${clean}'`);
  }

  const languageName = resolveLanguageName(targetLang);

  if (extract) {
    const clipped = extract.length > MAX_EXTRACT_CHARS
      ? `${extract.slice(0, MAX_EXTRACT_CHARS).replace(/\s+\S*$/, '')}…`
      : extract;
    return {
      word: String(page.title || clean).trim() || clean,
      meanings: [{
        partOfSpeech: languageName,
        definitions: [{ definition: clipped }],
      }],
      providerId: 'wiktionary_bilingual',
    };
  }

  const revisionUrl = `https://${host}.wiktionary.org/w/api.php?action=query&titles=${encodeURIComponent(clean)}&prop=revisions&rvprop=content&rvslots=main&formatversion=2&redirects=1&format=json`;
  const revisionRes = await safeFetch(revisionUrl, {
    signal,
    timeoutMs: DICTIONARY_FETCH_TIMEOUT_MS,
    headers: {
      Accept: 'application/json',
      'Api-User-Agent': 'DictionaryExtension/2.0 (language-learning)',
    },
  });
  if (!revisionRes.ok) {
    throwForHttpStatus(
      revisionRes.status,
      `Wiktionary bilingual: No entry found for '${clean}'`,
      `Wiktionary bilingual lookup failed (HTTP ${revisionRes.status}).`,
    );
  }
  const revisionData = await revisionRes.json() as WiktionaryRevisionResponse;
  const revisionPage = revisionData.query?.pages?.[0];
  const wikitext = revisionPage?.revisions?.[0]?.slots?.main?.content || '';
  const parsed = parseBilingualWikitext(wikitext);
  if (!parsed) throw new NotFoundError(`Wiktionary bilingual: No usable entry for '${clean}'`);

  return {
    word: String(revisionPage?.title || page.title || clean).trim() || clean,
    ...parsed,
    providerId: 'wiktionary_bilingual',
  };
}
