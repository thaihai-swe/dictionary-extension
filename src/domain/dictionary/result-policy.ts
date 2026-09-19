import type { DictionaryEntry } from '../../types';

/** A provider may contribute useful metadata even when it has no definitions. */
export function hasUsableDefinitions(entry?: DictionaryEntry | null): boolean {
  return Boolean(entry?.meanings?.some((meaning) => meaning.definitions?.some((item) => item.definition?.trim())));
}

export function hasEnrichmentPayload(entry?: DictionaryEntry | null): boolean {
  if (!entry) return false;
  return Boolean(
    hasUsableDefinitions(entry)
    || entry.phonetics?.some((item) => item.text || item.audio)
    || entry.synonyms?.length
    || entry.antonyms?.length
    || entry.examples?.length
    || entry.lexicalProfile,
  );
}
