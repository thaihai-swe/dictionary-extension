import { isExtensionPage } from '../shared/ext.ts';

let nextRequestId = 1;

export const DICTIONARY_FETCH_TIMEOUT_MS = 60000;
export const TRANSLATION_FETCH_TIMEOUT_MS = 60000;
export const AI_FETCH_TIMEOUT_MS = 60000;

interface HttpCacheEntry {
  status: number;
  statusText: string;
  bodyText: string;
  timestamp: number;
}

export type SafeFetchOptions = RequestInit & {
  timeoutMs?: number;
  retries?: number;
  retryStatuses?: number[];
};

const DEFAULT_RETRY_STATUSES = [429, 500, 502, 503, 504];

export function isRequestCancelled(error: unknown): boolean {
  const name = error instanceof Error ? error.name : '';
  const message = error instanceof Error ? error.message : String(error || '');
  return name === 'AbortError' || name === 'CanceledError' || message.toLowerCase().includes('aborted');
}

export function isOffline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine === false;
}

export function assertOnline() {
  if (isOffline()) {
    throw new Error('You appear to be offline. Check your connection and try again.');
  }
}

export function getRetryDelay(response: Response | null, attempt: number): number {
  const retryAfter = Number(response?.headers?.get('Retry-After'));
  if (Number.isFinite(retryAfter) && retryAfter > 0) {
    return Math.min(retryAfter * 1000, 10000);
  }
  return Math.min(400 * (2 ** attempt), 4000);
}

export function shouldRetryFetch(error: unknown, response: Response | null, retryStatuses: number[]): boolean {
  if (response) return retryStatuses.includes(response.status);
  if (isRequestCancelled(error)) return false;
  const message = error instanceof Error ? error.message : String(error || '');
  return /timed out|Failed to fetch|NetworkError|network|offline/i.test(message);
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  if (signal?.aborted) {
    return Promise.reject(new DOMException('The user aborted a request.', 'AbortError'));
  }
  return new Promise((resolve, reject) => {
    const abort = () => {
      clearTimeout(timeoutId);
      reject(new DOMException('The user aborted a request.', 'AbortError'));
    };
    const timeoutId = setTimeout(() => {
      signal?.removeEventListener('abort', abort);
      resolve();
    }, ms);
    if (!signal) return;
    signal.addEventListener('abort', abort, { once: true });
  });
}

const HTTP_CACHE_TTL_MS = 10 * 60 * 1000;
const MAX_HTTP_CACHE_SIZE = 80;
const MAX_HTTP_CACHE_BODY = 256 * 1024;
const MAX_HTTP_CACHE_CHARS = 4 * 1024 * 1024;
const httpCacheMap = new Map<string, HttpCacheEntry>();
const inflightHttpMap = new Map<string, Promise<Response>>();
let httpCacheChars = 0;
let httpCacheGeneration = 0;

function deleteHttpCacheEntry(key: string): boolean {
  const entry = httpCacheMap.get(key);
  if (!entry) return false;
  httpCacheMap.delete(key);
  httpCacheChars = Math.max(0, httpCacheChars - entry.bodyText.length);
  return true;
}

export function clearHttpCache() {
  httpCacheGeneration += 1;
  httpCacheMap.clear();
  inflightHttpMap.clear();
  httpCacheChars = 0;
}

function getHttpMethod(options?: RequestInit): string {
  return (options?.method || 'GET').toUpperCase();
}

function isCacheableMethod(method: string): boolean {
  return method === 'GET' || method === 'HEAD';
}

function getHttpCacheKey(url: string, options?: RequestInit): string {
  const method = getHttpMethod(options);
  if (isCacheableMethod(method)) return `${method}:${url}`;
  const body = options?.body ? String(options.body) : '';
  return `${method}:${url}:${body}`;
}

function pruneHttpCache() {
  const now = Date.now();
  for (const [key, entry] of httpCacheMap.entries()) {
    if (now - entry.timestamp >= HTTP_CACHE_TTL_MS) deleteHttpCacheEntry(key);
  }
}

function evictHttpCache(requiredChars = 0) {
  pruneHttpCache();
  while (
    httpCacheMap.size >= MAX_HTTP_CACHE_SIZE
    || httpCacheChars + requiredChars > MAX_HTTP_CACHE_CHARS
  ) {
    const oldestKey = httpCacheMap.keys().next().value;
    if (!oldestKey) break;
    deleteHttpCacheEntry(oldestKey);
  }
}

export function shouldProxyThroughServiceWorker(): boolean {
  if (typeof chrome === 'undefined' || typeof chrome.runtime?.sendMessage !== 'function') return false;
  try {
    if (!chrome.runtime?.id) return false;
    if (typeof window === 'undefined') return false;
    if (isExtensionPage()) return false;
  } catch {
    return false;
  }
  return true;
}

function isCacheableStatus(status: number): boolean {
  return (status >= 200 && status < 300) || status === 404;
}

function timeoutError(timeoutMs: number): Error {
  const error = new Error(`Lookup timed out after ${timeoutMs}ms.`) as Error & { status?: number };
  error.status = 408;
  return error;
}

function rememberResponse(
  cacheKey: string,
  status: number,
  statusText: string,
  bodyText: string,
  generation = httpCacheGeneration,
) {
  if (generation !== httpCacheGeneration) return;
  if (!isCacheableStatus(status)) return;
  if (!cacheKey.startsWith('GET:') && !cacheKey.startsWith('HEAD:')) return;
  if (bodyText.length > MAX_HTTP_CACHE_BODY) return;
  deleteHttpCacheEntry(cacheKey);
  evictHttpCache(bodyText.length);
  httpCacheMap.set(cacheKey, {
    status,
    statusText,
    bodyText,
    timestamp: Date.now(),
  });
  httpCacheChars += bodyText.length;
}

function cachedResponse(entry: HttpCacheEntry): Response {
  return new Response(entry.bodyText, {
    status: entry.status,
    statusText: entry.statusText,
    headers: { 'Content-Type': 'application/json', 'X-Cache': 'HIT' },
  });
}

async function safeFetchOnce(url: string, options?: SafeFetchOptions): Promise<Response> {
  const userSignal = options?.signal;
  if (userSignal?.aborted) {
    throw new DOMException('The user aborted a request.', 'AbortError');
  }
  assertOnline();

  const timeoutMs = options?.timeoutMs ?? DICTIONARY_FETCH_TIMEOUT_MS;
  const cacheKey = getHttpCacheKey(url, options);
  const cacheGeneration = httpCacheGeneration;

  const cached = httpCacheMap.get(cacheKey);
  if (cached) {
    if (Date.now() - cached.timestamp < HTTP_CACHE_TTL_MS) {
      httpCacheMap.delete(cacheKey);
      httpCacheMap.set(cacheKey, cached);
      return cachedResponse(cached);
    }
    deleteHttpCacheEntry(cacheKey);
  }

  const inflight = inflightHttpMap.get(cacheKey);
  if (inflight) {
    try {
      const shared = await inflight;
      if (userSignal?.aborted) {
        throw new DOMException('The user aborted a request.', 'AbortError');
      }
      const warmed = httpCacheMap.get(cacheKey);
      if (warmed && Date.now() - warmed.timestamp < HTTP_CACHE_TTL_MS) return cachedResponse(warmed);
      return shared.clone();
    } catch (error) {
      if (userSignal?.aborted || !isRequestCancelled(error)) throw error;
      // Previous inflight was cancelled by a different lookup; fall through and retry.
    }
  }

  const timeoutController = new AbortController();
  let timedOut = false;
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  if (timeoutMs > 0) {
    timeoutId = setTimeout(() => {
      timedOut = true;
      timeoutController.abort();
    }, timeoutMs);
  }

  const onUserAbort = () => timeoutController.abort();
  if (userSignal) {
    userSignal.addEventListener('abort', onUserAbort, { once: true });
  }

  const { timeoutMs: _timeoutMs, signal: _signal, retries: _retries, retryStatuses: _retryStatuses, ...rest } = options || {};
  const fetchOptions: RequestInit = { ...rest, signal: timeoutController.signal };

  const cleanup = () => {
    if (timeoutId) clearTimeout(timeoutId);
    userSignal?.removeEventListener('abort', onUserAbort);
  };

  const throwIfAborted = (): never | void => {
    if (userSignal?.aborted) {
      throw new DOMException('The user aborted a request.', 'AbortError');
    }
    if (timedOut) throw timeoutError(timeoutMs);
  };

  try {
    if (shouldProxyThroughServiceWorker()) {
      const requestId = `req_${Date.now()}_${nextRequestId++}`;

      try {
        const response = await new Promise<{ ok?: boolean; status?: number; data?: unknown; error?: string } | null>((resolve, reject) => {
          const onAbort = () => {
            try {
              chrome.runtime.sendMessage({ type: 'ABORT_FETCH_PROXY', requestId });
            } catch {
              // Ignore channel closed error
            }
            reject(new Error('aborted'));
          };

          if (timeoutController.signal.aborted) {
            onAbort();
            return;
          }
          timeoutController.signal.addEventListener('abort', onAbort, { once: true });

          chrome.runtime.sendMessage({ type: 'FETCH_PROXY', requestId, url, options: rest, timeoutMs }, (res) => {
            timeoutController.signal.removeEventListener('abort', onAbort);
            if (userSignal?.aborted || timedOut) {
              reject(new Error('aborted'));
              return;
            }
            const lastError = chrome.runtime.lastError?.message || '';
            if (/Extension context invalidated/i.test(lastError) || lastError || !res) {
              resolve(null);
            } else {
              resolve(res);
            }
          });
        });

        throwIfAborted();

        if (response) {
          const bodyText = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
          const status = response.status || (response.ok ? 200 : 400);
          const statusText = response.error || (response.ok ? 'OK' : 'Error');
          rememberResponse(cacheKey, status, statusText, bodyText, cacheGeneration);
          return new Response(bodyText, {
            status,
            statusText,
            headers: { 'Content-Type': 'application/json', 'X-Cache': 'MISS' },
          });
        }
      } catch (error: unknown) {
        throwIfAborted();
        if (error instanceof Error && error.name === 'AbortError') throw error;
        console.warn('Proxy fetch fallback to direct fetch:', error);
      }
    }

    const directRes = await fetch(url, fetchOptions);
    const bodyText = await directRes.text();
    rememberResponse(cacheKey, directRes.status, directRes.statusText, bodyText, cacheGeneration);
    return new Response(bodyText, {
      status: directRes.status,
      statusText: directRes.statusText,
      headers: directRes.headers,
    });
  } catch (error: unknown) {
    throwIfAborted();
    throw error;
  } finally {
    cleanup();
  }
}

export async function safeFetch(url: string, options?: SafeFetchOptions): Promise<Response> {
  const timeoutMs = options?.timeoutMs ?? DICTIONARY_FETCH_TIMEOUT_MS;
  const isAiRequest = timeoutMs >= AI_FETCH_TIMEOUT_MS;
  const isTranslationRequest = timeoutMs >= TRANSLATION_FETCH_TIMEOUT_MS && !isAiRequest;
  const defaultRetries = isAiRequest || !isTranslationRequest ? 0 : 1;
  const retries = Number.isFinite(options?.retries) ? Number(options?.retries) : defaultRetries;
  const retryStatuses = options?.retryStatuses || DEFAULT_RETRY_STATUSES;
  const maxAttempts = Math.max(1, retries + 1);
  const cacheKey = getHttpCacheKey(url, options);
  const existing = inflightHttpMap.get(cacheKey);
  if (existing) {
    try {
      const shared = await existing;
      if (options?.signal?.aborted) {
        throw new DOMException('The user aborted a request.', 'AbortError');
      }
      const warmed = httpCacheMap.get(cacheKey);
      if (warmed && Date.now() - warmed.timestamp < HTTP_CACHE_TTL_MS) return cachedResponse(warmed);
      return shared.clone();
    } catch (error) {
      if (options?.signal?.aborted || !isRequestCancelled(error)) throw error;
    }
  }

  const request = (async () => {
    let lastError: unknown = null;
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      try {
        const response = await safeFetchOnce(url, options);
        if (!response.ok && shouldRetryFetch(null, response, retryStatuses) && attempt < maxAttempts - 1) {
          await sleep(getRetryDelay(response, attempt), options?.signal || undefined);
          continue;
        }
        return response;
      } catch (error) {
        lastError = error;
        if (!shouldRetryFetch(error, null, retryStatuses) || attempt >= maxAttempts - 1) {
          if (isOffline()) throw new Error('You appear to be offline. Check your connection and try again.');
          throw error;
        }
        await sleep(400 * (attempt + 1), options?.signal || undefined);
      }
    }
    throw lastError || new Error('Request failed.');
  })();

  inflightHttpMap.set(cacheKey, request);
  try {
    return await request;
  } finally {
    if (inflightHttpMap.get(cacheKey) === request) inflightHttpMap.delete(cacheKey);
  }
}
