import { safeFetch } from './provider.http';
import { ProviderLookupDto } from '../types';
import { normalizeDictionaryTerm } from '../shared/query-utils';
import { NotFoundError, throwForHttpStatus } from './errors';
import { stripHtml } from './parser-helpers';

const MAX_MEANINGS = 6;
const MAX_DEFINITIONS = 8;
const MAX_EXAMPLES = 8;

export async function fetchWiktionary(word: string, _targetLang = 'vi', signal?: AbortSignal): Promise<ProviderLookupDto> {
  const clean = normalizeDictionaryTerm(word);
  const url = `https://en.wiktionary.org/api/rest_v1/page/definition/${encodeURIComponent(clean)}`;

  try {
    const res = await safeFetch(url, { signal });
    if (!res.ok) {
      throwForHttpStatus(res.status, `Wiktionary: No entry found for '${clean}'`, `Wiktionary lookup failed (HTTP ${res.status}).`);
    }
    const data = await res.json();
    const enSections = data.en || Object.values(data || {})[0];
    if (!enSections || !Array.isArray(enSections) || enSections.length === 0) {
      throw new NotFoundError(`Wiktionary: No entry found for '${clean}'`);
    }

    const examples: NonNullable<ProviderLookupDto['examples']> = [];
    const meanings = enSections.slice(0, MAX_MEANINGS).map((sec: {
      partOfSpeech?: string;
      definitions?: Array<{ definition?: string; parsedExamples?: Array<{ example?: string }> }>;
    }) => ({
      partOfSpeech: sec.partOfSpeech || 'general',
      definitions: (sec.definitions || []).slice(0, MAX_DEFINITIONS).map((d) => {
        let definitionExample: string | undefined;
        if (Array.isArray(d.parsedExamples)) {
          for (const exObj of d.parsedExamples) {
            const exText = stripHtml(exObj.example || '');
            if (exText && !definitionExample) {
              definitionExample = exText;
            }
            if (exText && examples.length < MAX_EXAMPLES && !examples.some((item) => item.text === exText)) {
              examples.push({ text: exText });
            }
          }
        }
        return {
          definition: stripHtml(d.definition || ''),
          example: definitionExample,
        };
      }).filter((d: { definition: string }) => d.definition.length > 0),
    })).filter((m: { definitions: Array<{ definition: string }> }) => m.definitions.length > 0);

    if (!meanings.length) {
      throw new NotFoundError(`Wiktionary: No entry found for '${clean}'`);
    }

    return {
      word: clean,
      phonetics: [],
      meanings,
      examples,
      providerId: 'wiktionary',
    };
  } catch (e: unknown) {
    if (e instanceof Error && e.name === 'AbortError') throw e;
    if (e instanceof NotFoundError) throw e;
    throw e instanceof Error ? e : new Error(`Wiktionary lookup failed for '${clean}'`);
  }
}
