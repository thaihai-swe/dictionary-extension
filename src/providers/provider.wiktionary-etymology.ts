import { DICTIONARY_FETCH_TIMEOUT_MS, safeFetch } from './provider.http.ts';
import type { ProviderLookupDto } from '../types/index.ts';
import { normalizeDictionaryTerm } from '../shared/query-utils.ts';
import { NotFoundError, throwForHttpStatus } from './errors.ts';

const MAX_ETYMOLOGY_CHARS = 420;
const LANG_CODE_RE = /^[a-z]{2,3}(?:-[a-z0-9]+)?$/i;
const NESTED_TEMPLATE_RE = /\{\{([^{}]+)\}\}/g;
const LINK_RE = /\[\[(?:[^|\]]*\|)?([^\]]+)\]\]/g;
const REF_RE = /<ref\b[^>]*>[\s\S]*?<\/ref>|<ref\b[^>]*\/>/gi;
const BOLD_ITALIC_RE = /'{2,}/g;
const HTML_TAG_RE = /<[^>]+>/g;

interface WiktionaryParseResponse {
  error?: { code?: string; info?: string };
  parse?: { wikitext?: { '*'?: string } };
}

function unnamedParams(parts: string[]): string[] {
  return parts.slice(1).filter((part) => !part.includes('='));
}

function expandTemplate(inner: string): string {
  const parts = inner.split('|').map((part) => part.trim()).filter(Boolean);
  if (!parts.length) return '';
  const name = parts[0].toLowerCase();
  const unnamed = unnamedParams(parts);
  if (name === 'w' || name === 'wikipedia') return unnamed[0] || '';
  if (name === 'etydate' || name === 'circa') return unnamed[0] ? `(${unnamed[0]})` : '';
  if (name === 'gloss' || name === 'g') return unnamed[0] ? `“${unnamed[0]}”` : '';
  const content = unnamed.filter((part) => !LANG_CODE_RE.test(part));
  const word = content[content.length - 1] || unnamed[unnamed.length - 1] || '';
  const glossPart = parts.find((part) => /^t=/.test(part) || /^gloss=/.test(part));
  const gloss = glossPart ? glossPart.slice(glossPart.indexOf('=') + 1).trim() : '';
  if (!word) return gloss;
  return gloss ? `${word} (“${gloss}”)` : word;
}

export function extractEtymologyFromWikitext(wikitext: string): string {
  const source = String(wikitext || '');
  const english = source.match(/(?:^|\n)==English==\n([\s\S]*?)(?=\n==[^=\n]+==\n|$)/);
  const section = english?.[1] || source;
  const etymology = section.match(/(?:^|\n)===Etymology(?: \d+)?===\n([\s\S]*?)(?=\n===|\n==|$)/);
  if (!etymology?.[1]) return '';

  let text = etymology[1].replace(REF_RE, '');
  for (let i = 0; i < 8; i += 1) {
    const next = text.replace(NESTED_TEMPLATE_RE, (_, inner: string) => expandTemplate(inner));
    if (next === text) break;
    text = next;
  }
  text = text
    .replace(LINK_RE, '$1')
    .replace(HTML_TAG_RE, ' ')
    .replace(BOLD_ITALIC_RE, '')
    .replace(/[*=#]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (text.length > MAX_ETYMOLOGY_CHARS) {
    text = `${text.slice(0, MAX_ETYMOLOGY_CHARS).replace(/\s+\S*$/, '')}…`;
  }
  return text;
}

export async function fetchWiktionaryEtymology(
  word: string,
  _targetLang = 'vi',
  signal?: AbortSignal,
): Promise<ProviderLookupDto> {
  const clean = normalizeDictionaryTerm(word);
  if (!clean) throw new NotFoundError('Wiktionary etymology: empty query');

  const url = `https://en.wiktionary.org/w/api.php?action=parse&page=${encodeURIComponent(clean)}&prop=wikitext&redirects=1&format=json`;
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
      `Wiktionary etymology: No entry found for '${clean}'`,
      `Wiktionary etymology lookup failed (HTTP ${res.status}).`,
    );
  }

  const data = await res.json() as WiktionaryParseResponse;
  if (data.error) {
    throw new NotFoundError(`Wiktionary etymology: No entry found for '${clean}'`);
  }
  const wikitext = String(data.parse?.wikitext?.['*'] || '');
  const etymology = extractEtymologyFromWikitext(wikitext);
  if (etymology.length < 12) {
    throw new NotFoundError(`Wiktionary etymology: No usable etymology for '${clean}'`);
  }

  return {
    word: clean,
    meanings: [{
      partOfSpeech: 'etymology',
      definitions: [{ definition: etymology }],
    }],
    lexicalProfile: { usageNotes: etymology },
    providerId: 'wiktionary_etymology',
  };
}
