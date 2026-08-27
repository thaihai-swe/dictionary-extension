let nextRequestId = 1;

export async function safeFetch(url: string, options?: RequestInit): Promise<Response> {
  if (options?.signal?.aborted) {
    throw new DOMException('The user aborted a request.', 'AbortError');
  }

  // If running inside extension content-script context, proxy through background service worker to bypass page CORS
  if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
    const requestId = `req_${Date.now()}_${nextRequestId++}`;

    try {
      const response = await new Promise<any>((resolve, reject) => {
        const onAbort = () => {
          try {
            chrome.runtime.sendMessage({ type: 'ABORT_FETCH_PROXY', requestId });
          } catch (e) {
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
        return new Response(bodyText, {
          status: response.status || (response.ok ? 200 : 400),
          statusText: response.error || (response.ok ? 'OK' : 'Error'),
          headers: { 'Content-Type': 'application/json' },
        });
      }
    } catch (e: any) {
      if (e?.name === 'AbortError') throw e;
      console.warn('Proxy fetch fallback to direct fetch:', e);
    }
  }

  return fetch(url, options);
}
