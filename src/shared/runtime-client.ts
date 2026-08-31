import type { AiIntentId, AiResult, AppSettings, DictionaryEntry } from '../types';
import {
  AI_LOOKUP,
  CANCEL_LOOKUP,
  LOOKUP_TEXT,
  LOOKUP_UPDATE,
  VALIDATE_PROVIDER,
  aiAbortScope,
  createRequestId,
  dictionaryAbortScope,
  isExtensionContextInvalidated,
  runtimeErrorMessage,
  type AiLookupPayload,
  type CancelLookupPayload,
  type LookupTextPayload,
  type LookupUpdatePayload,
  type ProviderValidationKind,
  type ProviderValidationResult,
  type RuntimeResponse,
} from './messages';

export { createRequestId } from './messages';

function runtimeUnavailable(): Error {
  return new Error('Extension runtime is unavailable.');
}

function sendMessage<T>(message: unknown): Promise<RuntimeResponse<T>> {
  if (typeof chrome === 'undefined' || typeof chrome.runtime?.sendMessage !== 'function' || isExtensionContextInvalidated()) {
    return Promise.reject(runtimeUnavailable());
  }
  return new Promise((resolve, reject) => {
    try {
      chrome.runtime.sendMessage(message, (response: RuntimeResponse<T>) => {
        const lastError = runtimeErrorMessage('');
        if (lastError) {
          reject(new Error(lastError));
          return;
        }
        resolve(response || { ok: false, error: 'Empty runtime response.' });
      });
    } catch (error) {
      if (isExtensionContextInvalidated(error)) {
        reject(runtimeUnavailable());
        return;
      }
      reject(error instanceof Error ? error : runtimeUnavailable());
    }
  });
}

function unwrap<T>(response: RuntimeResponse<T>, fallback = 'Request failed.'): T {
  if (!response?.ok) {
    const error = new Error(response?.error || fallback);
    (error as Error & { aborted?: boolean }).aborted = /abort/i.test(String(response?.error || ''));
    throw error;
  }
  return response.result;
}

export async function requestDictionaryLookup(payload: LookupTextPayload): Promise<DictionaryEntry> {
  const requestId = payload.requestId || createRequestId('dict');
  const response = await sendMessage<DictionaryEntry>({
    type: LOOKUP_TEXT,
    payload: { ...payload, requestId },
  });
  return unwrap(response, `No dictionary definition found for "${payload.text}".`);
}

export async function requestAiLookup(payload: AiLookupPayload): Promise<AiResult> {
  const requestId = payload.requestId || createRequestId('ai');
  const response = await sendMessage<AiResult>({
    type: AI_LOOKUP,
    payload: { ...payload, requestId, intent: payload.intent || 'default' },
  });
  return unwrap(response, 'AI lookup failed.');
}

export async function requestProviderValidation(
  kind: ProviderValidationKind,
  providerId?: string,
  settings?: Partial<AppSettings>,
): Promise<ProviderValidationResult> {
  const response = await sendMessage<ProviderValidationResult>({
    type: VALIDATE_PROVIDER,
    payload: { kind, providerId, settings },
  });
  if (!response?.ok) {
    return { ok: false, providerId, error: response?.error || 'Validation failed.' };
  }
  return response.result;
}

export function cancelRuntimeLookup(scope?: CancelLookupPayload['scope'], requestId?: string) {
  if (typeof chrome === 'undefined' || typeof chrome.runtime?.sendMessage !== 'function' || isExtensionContextInvalidated()) return;
  try {
    chrome.runtime.sendMessage({
      type: CANCEL_LOOKUP,
      payload: { scope, requestId },
    }, () => {
      void runtimeErrorMessage('');
    });
  } catch {
    // Ignore closed or invalidated channels.
  }
}

export function cancelDictionaryLookup(requestId?: string) {
  cancelRuntimeLookup(dictionaryAbortScope(), requestId);
}

export function cancelAiLookup(intent?: AiIntentId | string, requestId?: string) {
  cancelRuntimeLookup(aiAbortScope(intent), requestId);
}

export function subscribeLookupUpdates(handler: (payload: LookupUpdatePayload) => void): () => void {
  if (typeof chrome === 'undefined' || !chrome.runtime?.onMessage || isExtensionContextInvalidated()) {
    return () => undefined;
  }

  const listener = (message: { type?: string; payload?: LookupUpdatePayload }) => {
    if (message?.type !== LOOKUP_UPDATE || !message.payload) return;
    handler(message.payload);
  };
  try {
    chrome.runtime.onMessage.addListener(listener);
  } catch {
    return () => undefined;
  }
  return () => {
    try {
      chrome.runtime.onMessage.removeListener(listener);
    } catch {
      // Ignore.
    }
  };
}
