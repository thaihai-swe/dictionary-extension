import type { AiIntentId, AiResult, AppSettings, DictionaryEntry } from '../types';

export const LOOKUP_TEXT = 'LOOKUP_TEXT';
export const AI_LOOKUP = 'AI_LOOKUP';
export const LOOKUP_UPDATE = 'LOOKUP_UPDATE';
export const VALIDATE_PROVIDER = 'VALIDATE_PROVIDER';
export const CANCEL_LOOKUP = 'CANCEL_LOOKUP';
export const OPEN_LOOKUP_POPUP = 'OPEN_LOOKUP_POPUP';
export const OPEN_OPTIONS = 'OPEN_OPTIONS';
export const FETCH_PROXY = 'FETCH_PROXY';
export const ABORT_FETCH_PROXY = 'ABORT_FETCH_PROXY';

export type LookupSource = 'dictionary' | 'ai';
export type ProviderValidationKind = 'dictionary' | 'translation' | 'ai';
export type CancelLookupScope = 'dictionary' | 'ai' | `ai:${string}`;

export interface LookupTextPayload {
  text: string;
  context?: string;
  provider?: string;
  targetLang?: string;
  requestId?: string;
}

export interface AiLookupPayload {
  text: string;
  context?: string;
  intent?: AiIntentId | string;
  targetLang?: string;
  requestId?: string;
}

export interface LookupUpdatePayload {
  requestId: string;
  source: LookupSource;
  text: string;
  revision: number;
  result: DictionaryEntry | AiResult;
}

export interface ValidateProviderPayload {
  kind: ProviderValidationKind;
  providerId?: string;
  settings?: Partial<AppSettings>;
}

export interface CancelLookupPayload {
  scope?: CancelLookupScope;
  requestId?: string;
}

export interface OpenLookupPopupPayload {
  text?: string;
  context?: string;
  fromSelection?: boolean;
}

export interface FetchProxyPayload {
  requestId?: string;
  url: string;
  options?: Omit<RequestInit, 'signal'>;
  timeoutMs?: number;
}

export interface RuntimeOkResponse<T> {
  ok: true;
  result: T;
  requestId?: string;
}

export interface RuntimeErrorResponse {
  ok: false;
  error: string;
  requestId?: string;
}

export type RuntimeResponse<T> = RuntimeOkResponse<T> | RuntimeErrorResponse;

export interface ProviderValidationResult {
  ok: boolean;
  providerId?: string;
  latencyMs?: number;
  error?: string;
  message?: string;
}

export function createRequestId(prefix = 'req'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function dictionaryAbortScope(): CancelLookupScope {
  return 'dictionary';
}

export function aiAbortScope(intent?: string): CancelLookupScope {
  const value = String(intent || '').trim();
  return value ? `ai:${value}` : 'ai';
}

export function isMissingReceiverError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error || '');
  return message.includes('Could not establish connection') || message.includes('Receiving end does not exist');
}

export function isExtensionContextInvalidated(error?: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error || '');
  if (/Extension context invalidated/i.test(message)) return true;
  try {
    return typeof chrome !== 'undefined' && Boolean(chrome.runtime?.id) === false && typeof chrome.runtime?.sendMessage === 'function';
  } catch {
    return true;
  }
}

export function runtimeErrorMessage(fallback = 'Extension runtime is unavailable.'): string {
  try {
    return chrome.runtime?.lastError?.message || fallback;
  } catch {
    return fallback;
  }
}
