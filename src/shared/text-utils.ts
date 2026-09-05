import { normalizeDictionaryTerm } from './lemma.ts';

export { normalizeDictionaryTerm };

export type LookupAttemptKind = 'exact';

export interface DictionaryLookupAttempt {
  providerId: string;
  query: string;
  kind: LookupAttemptKind;
}

export const DICTIONARY_FALLBACK_ORDER = [
  'wiktionary',
  'free_dictionary',
  'datamuse',
  'rhymebrain',
  'wikipedia',
  'urban_dictionary',
];

export function isPhraseLike(text: string): boolean {
  const normalized = String(text || '').replace(/\s+/g, ' ').trim();
  if (!normalized) return false;
  if (normalized.split(' ').length > 1) return true;
  return /[-']/.test(normalized) && normalized.length > 2;
}

export function getPrimaryDictionaryLookupAttempts(text: string, primaryId: string): DictionaryLookupAttempt[] {
  const normalizedPrimary = DICTIONARY_FALLBACK_ORDER.includes(primaryId) ? primaryId : 'wiktionary';
  const query = normalizeDictionaryTerm(text) || String(text || '').trim();
  if (!query) return [];
  return [{ providerId: normalizedPrimary, query, kind: 'exact' }];
}

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
