import { DICTIONARY_FETCH_TIMEOUT_MS, safeFetch } from './provider.http';
import type { AttributedItem, ProviderLookupDto } from '../types';
import { normalizeDictionaryTerm } from '../shared/query-utils';
import { resolveLanguageCode } from '../shared/languages';
import { NotFoundError, throwForHttpStatus } from './errors';

interface TatoebaTranslationItem {
  id?: number;
  text?: string;
  lang?: string;
}

interface TatoebaResultItem {
  id?: number;
  text?: string;
  lang?: string;
  translations?: TatoebaTranslationItem[][];
}

interface TatoebaSearchResponse {
  results?: TatoebaResultItem[];
}

const TATOEBA_LANG_MAP: Record<string, string> = {
  vi: 'vie',
  en: 'eng',
  es: 'spa',
  fr: 'fra',
  de: 'deu',
  ja: 'jpn',
  ko: 'kor',
  'zh-cn': 'cmn',
  'zh-tw': 'cmn',
  zh: 'cmn',
  ru: 'rus',
  it: 'ita',
  pt: 'por',
};

function resolveTatoebaTargetLang(targetLang: string): string {
  const code = resolveLanguageCode(targetLang).toLowerCase();
  return TATOEBA_LANG_MAP[code] || 'vie';
}

export async function fetchTatoeba(
  word: string,
  targetLang = 'vi',
  signal?: AbortSignal,
): Promise<ProviderLookupDto> {
  const clean = normalizeDictionaryTerm(word);
  if (!clean) throw new NotFoundError('Tatoeba: empty query');

  const langCode = resolveTatoebaTargetLang(targetLang);
  const url = `https://tatoeba.org/en/api_v0/search?query=${encodeURIComponent(clean)}&from=eng&to=${encodeURIComponent(langCode)}`;
  const res = await safeFetch(url, {
    signal,
    timeoutMs: DICTIONARY_FETCH_TIMEOUT_MS,
    requestClass: 'dictionary',
    retries: 0,
  });

  if (!res.ok) {
    throwForHttpStatus(
      res.status,
      `Tatoeba: No sentences found for '${clean}'`,
      `Tatoeba lookup failed (HTTP ${res.status}).`,
    );
  }

  const data = (await res.json()) as TatoebaSearchResponse;
  const rawResults = Array.isArray(data?.results) ? data.results : [];

  const examples: AttributedItem[] = [];
  for (const item of rawResults) {
    const text = String(item.text || '').trim();
    if (!text) continue;

    let translation: string | undefined;
    if (Array.isArray(item.translations)) {
      for (const group of item.translations) {
        if (!Array.isArray(group)) continue;
        const match = group.find((t) => t?.text && String(t.text).trim());
        if (match?.text) {
          translation = String(match.text).trim();
          break;
        }
      }
    }

    examples.push(translation ? { text, translation } : { text });
    if (examples.length >= 8) break;
  }

  if (!examples.length) {
    throw new NotFoundError(`Tatoeba: No sentences found for '${clean}'`);
  }

  return {
    word: clean,
    examples,
    providerId: 'tatoeba',
  };
}
