import { createRequestId } from '../../shared/messages';
import { getOriginPermissionPattern } from '../../shared/permissions';

const activeRequests = new Map<string, AbortController>();

async function hasPermission(rawUrl: string): Promise<boolean> {
  const pattern = getOriginPermissionPattern(rawUrl);
  if (!pattern) return false;
  if (typeof chrome.permissions?.contains !== 'function') return true;
  try {
    return await chrome.permissions.contains({ origins: [pattern] });
  } catch {
    return false;
  }
}

export function abortFetchProxy(requestId: string) {
  activeRequests.get(requestId)?.abort();
  activeRequests.delete(requestId);
}

export function abortAllFetchProxies() {
  for (const controller of activeRequests.values()) controller.abort();
  activeRequests.clear();
}

export async function handleFetchProxy(
  message: { url: unknown; requestId?: unknown; timeoutMs?: unknown; options?: RequestInit },
  sendResponse: (response: unknown) => void,
) {
  const url = String(message.url || '');
  if (!(await hasPermission(url))) {
    sendResponse({ ok: false, status: 403, error: 'Endpoint permission is not granted.' });
    return;
  }

  const requestId = String(message.requestId || createRequestId('proxy'));
  const controller = new AbortController();
  activeRequests.set(requestId, controller);
  const timeoutMs = Math.max(1000, Math.min(Number(message.timeoutMs) || 60000, 60000));
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...(message.options || {}), signal: controller.signal });
    const text = await response.text();
    let data: unknown = text;
    try { data = JSON.parse(text); } catch { /* text response */ }
    sendResponse({ ok: response.ok, status: response.status, data });
  } catch (error) {
    sendResponse({ ok: false, status: 0, error: error instanceof Error ? error.message : 'Fetch failed.' });
  } finally {
    clearTimeout(timeoutId);
    activeRequests.delete(requestId);
  }
}
