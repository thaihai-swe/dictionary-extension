import { DICTIONARY_FETCH_TIMEOUT_MS, safeFetch } from './provider.http.ts';
import type { AttributedItem, ProviderLookupDto } from '../types/index.ts';
import { normalizeDictionaryTerm } from '../shared/query-utils.ts';
import { resolveLanguageCode } from '../shared/languages.ts';
import { NotFoundError, throwForHttpStatus } from './errors.ts';

const MAX_EXAMPLES = 8;
const TATOEBA_LANG: Record<string, string> = {
  en: 'eng',
  vi: 'vie',
  es: 'spa',
  fr: 'fra',
  de: 'deu',
  ja: 'jpn',
  ko: 'kor',
  'zh-cn': 'cmn',
  'zh-tw': 'cmn',
  zh: 'cmn',
  it: 'ita',
  pt: 'por',
  ru: 'rus',
  th: 'tha',
  id: 'ind',
  hi: 'hin',
  ar: 'ara',
};

interface TatoebaTranslation {
  lang?: string;
  text?: string;
}

interface TatoebaSentence {
  text?: string;
  lang?: string;
  translations?: Array<TatoebaTranslation[] | TatoebaTranslation>;
}

interface TatoebaSearchResponse {
  results?: TatoebaSentence[];
}

export function tatoebaLangCode(targetLang: string): string {
  const code = resolveLanguageCode(targetLang).toLowerCase();
  return TATOEBA_LANG[code] || TATOEBA_LANG[code.split('-')[0]] || 'eng';
}

function flattenTranslations(groups: TatoebaSentence['translations']): TatoebaTranslation[] {
  const flat: TatoebaTranslation[] = [];
  for (const group of groups || []) {
    if (Array.isArray(group)) flat.push(...group);
    else if (group && typeof group === 'object') flat.push(group);
  }
  return flat;
}

export function examplesFromTatoebaPayload(payload: TatoebaSearchResponse, targetIso3: string): AttributedItem[] {
  const examples: AttributedItem[] = [];
  const seen = new Set<string>();
  for (const item of payload.results || []) {
    const source = String(item.text || '').trim();
    if (!source) continue;
    const match = flattenTranslations(item.translations).find((row) => (
      String(row.lang || '') === targetIso3 && String(row.text || '').trim()
    ));
    const translated = String(match?.text || '').trim();
    const text = translated && targetIso3 !== 'eng' ? `${source} — ${translated}` : source;
    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    examples.push({ text });
    if (examples.length >= MAX_EXAMPLES) break;
  }
  return examples;
}

export async function fetchTatoeba(
  word: string,
  targetLang = 'vi',
  signal?: AbortSignal,
): Promise<ProviderLookupDto> {
  const clean = normalizeDictionaryTerm(word) || String(word || '').trim();
  if (!clean) throw new NotFoundError('Tatoeba: empty query');

  const iso3 = tatoebaLangCode(targetLang);
  const params = new URLSearchParams({
    from: 'eng',
    query: clean,
    orphans: 'no',
    unapproved: 'no',
    sort: 'relevance',
  });
  if (iso3 !== 'eng') {
    params.set('trans_to', iso3);
    params.set('trans_filter', 'limit');
  }

  const url = `https://tatoeba.org/en/api_v0/search?${params.toString()}`;
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
      `Tatoeba: No sentences found for '${clean}'`,
      `Tatoeba lookup failed (HTTP ${res.status}).`,
    );
  }

  const data = await res.json() as TatoebaSearchResponse;
  const examples = examplesFromTatoebaPayload(data, iso3);
  if (!examples.length) {
    throw new NotFoundError(`Tatoeba: No sentences found for '${clean}'`);
  }

  return {
    word: clean,
    meanings: [],
    examples,
    providerId: 'tatoeba',
  };
}
