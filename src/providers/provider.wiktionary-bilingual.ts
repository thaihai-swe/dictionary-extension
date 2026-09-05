import { DICTIONARY_FETCH_TIMEOUT_MS, safeFetch } from './provider.http.ts';
import type { ProviderLookupDto } from '../types/index.ts';
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
  if (!page || page.missing !== undefined || !extract) {
    throw new NotFoundError(`Wiktionary bilingual: No entry found for '${clean}'`);
  }

  const clipped = extract.length > MAX_EXTRACT_CHARS
    ? `${extract.slice(0, MAX_EXTRACT_CHARS).replace(/\s+\S*$/, '')}…`
    : extract;
  const languageName = resolveLanguageName(targetLang);

  return {
    word: String(page.title || clean).trim() || clean,
    meanings: [{
      partOfSpeech: languageName,
      definitions: [{ definition: clipped }],
    }],
    providerId: 'wiktionary_bilingual',
  };
}
