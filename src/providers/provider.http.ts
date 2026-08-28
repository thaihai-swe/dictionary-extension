let nextRequestId = 1;

// High-Performance In-Memory LRU HTTP Cache with TTL
interface HttpCacheEntry {
  status: number;
  statusText: string;
  bodyText: string;
  timestamp: number;
}

const HTTP_CACHE_TTL_MS = 10 * 60 * 1000; // 10 Minutes Cache TTL
const MAX_HTTP_CACHE_SIZE = 200;
const httpCacheMap = new Map<string, HttpCacheEntry>();

export function clearHttpCache() {
  httpCacheMap.clear();
}

function getHttpCacheKey(url: string, options?: RequestInit): string {
  const method = (options?.method || 'GET').toUpperCase();
  const body = options?.body ? String(options.body) : '';
  return `${method}:${url}:${body}`;
}

export async function safeFetch(url: string, options?: RequestInit): Promise<Response> {
  if (options?.signal?.aborted) {
    throw new DOMException('The user aborted a request.', 'AbortError');
  }

  const method = (options?.method || 'GET').toUpperCase();
  const cacheKey = getHttpCacheKey(url, options);

  // ⚡ Check HTTP Cache (0ms Instant Hit for repeated calls)
  if (httpCacheMap.has(cacheKey)) {
    const cached = httpCacheMap.get(cacheKey)!;
    if (Date.now() - cached.timestamp < HTTP_CACHE_TTL_MS) {
      return new Response(cached.bodyText, {
        status: cached.status,
        statusText: cached.statusText,
        headers: { 'Content-Type': 'application/json', 'X-Cache': 'HIT' },
      });
    }
    httpCacheMap.delete(cacheKey);
  }

  // Helper to store response in HTTP cache
  const cacheResponse = (status: number, statusText: string, bodyText: string) => {
    if (status >= 200 && status < 300) {
      if (httpCacheMap.size >= MAX_HTTP_CACHE_SIZE) {
        const oldestKey = httpCacheMap.keys().next().value;
        if (oldestKey) httpCacheMap.delete(oldestKey);
      }
      httpCacheMap.set(cacheKey, {
        status,
        statusText,
        bodyText,
        timestamp: Date.now(),
      });
    }
  };

  // If running inside extension content-script context, proxy through background service worker to bypass page CORS
  if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
    const requestId = `req_${Date.now()}_${nextRequestId++}`;

    try {
      const response = await new Promise<any>((resolve, reject) => {
        const onAbort = () => {
          try {
            chrome.runtime.sendMessage({ type: 'ABORT_FETCH_PROXY', requestId });
          } catch {
            // Ignore channel closed error
          }
          reject(new DOMException('The user aborted a request.', 'AbortError'));
        };

        if (options?.signal) {
          if (options.signal.aborted) {
            onAbort();
            return;
          }
          options.signal.addEventListener('abort', onAbort, { once: true });
        }

        // Strip non-serializable DOM AbortSignal before passing across chrome.runtime.sendMessage
        const cleanOptions = options ? { ...options } : undefined;
        if (cleanOptions) {
          delete cleanOptions.signal;
        }

        chrome.runtime.sendMessage({ type: 'FETCH_PROXY', requestId, url, options: cleanOptions }, (res) => {
          if (options?.signal?.aborted) {
            reject(new DOMException('The user aborted a request.', 'AbortError'));
            return;
          }
          if (chrome.runtime.lastError || !res) {
            resolve(null);
          } else {
            resolve(res);
          }
        });
      });

      if (response) {
        const bodyText = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
        const status = response.status || (response.ok ? 200 : 400);
        const statusText = response.error || (response.ok ? 'OK' : 'Error');

        cacheResponse(status, statusText, bodyText);

        return new Response(bodyText, {
          status,
          statusText,
          headers: { 'Content-Type': 'application/json', 'X-Cache': 'MISS' },
        });
      }
    } catch (e: any) {
      if (e?.name === 'AbortError') throw e;
      console.warn('Proxy fetch fallback to direct fetch:', e);
    }
  }

  const directRes = await fetch(url, options);
  const bodyText = await directRes.text();
  cacheResponse(directRes.status, directRes.statusText, bodyText);

  return new Response(bodyText, {
    status: directRes.status,
    statusText: directRes.statusText,
    headers: directRes.headers,
  });
}
