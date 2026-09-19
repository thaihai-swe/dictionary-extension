import type { DictionaryEntry } from '../types';
import type { LookupPatchPayload } from './messages';

const ENTRY_FIELDS: Array<keyof DictionaryEntry> = [
  'word',
  'phonetics',
  'meanings',
  'examples',
  'synonyms',
  'antonyms',
  'lexicalProfile',
  'translation',
  'sources',
  'originalText',
  'phraseExplanation',
  'enriched',
];

function sameValue(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true;
  if (left === undefined || right === undefined) return false;
  try {
    return JSON.stringify(left) === JSON.stringify(right);
  } catch {
    return false;
  }
}

export function createDictionaryEntryPatch(
  previous: DictionaryEntry,
  next: DictionaryEntry,
): { changed: Partial<DictionaryEntry>; removed: Array<keyof DictionaryEntry> } {
  const changed: Partial<DictionaryEntry> = {};
  const removed: Array<keyof DictionaryEntry> = [];
  for (const field of ENTRY_FIELDS) {
    const before = previous[field];
    const after = next[field];
    if (sameValue(before, after)) continue;
    if (after === undefined) removed.push(field);
    else changed[field] = after as never;
  }
  return { changed, removed };
}

export function applyDictionaryEntryPatch(
  current: DictionaryEntry | null,
  payload: LookupPatchPayload,
): DictionaryEntry | null {
  if (!current) return null;
  if (current.revision !== payload.baseRevision) return null;
  if (current.revision >= payload.revision) return current;

  const next: DictionaryEntry = {
    ...current,
    ...payload.patch.changed,
    revision: payload.revision,
  };
  for (const field of payload.patch.removed || []) {
    delete (next as Partial<DictionaryEntry>)[field];
  }
  return next;
}
