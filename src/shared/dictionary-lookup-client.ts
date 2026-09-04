import type { DictionaryEntry } from '../types';
import type { LookupTextPayload } from './messages';
import {
  cancelDictionaryLookup,
  createRequestId,
  requestDictionaryLookup,
  subscribeLookupUpdates,
} from './runtime-client';

export { cancelDictionaryLookup, createRequestId, subscribeLookupUpdates };

const inflightLookups = new Map<string, Promise<DictionaryEntry>>();

export function startDictionaryLookup(payload: LookupTextPayload): Promise<DictionaryEntry> {
  const requestId = payload.requestId || createRequestId('dict');
  const existing = inflightLookups.get(requestId);
  if (existing) return existing;

  const request = requestDictionaryLookup({ ...payload, requestId }).finally(() => {
    inflightLookups.delete(requestId);
  });
  inflightLookups.set(requestId, request);
  return request;
}
