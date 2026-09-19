const REQUESTABLE_PROTOCOLS = new Set(['http:', 'https:']);

export function getRequestableOrigin(value: string | undefined | null): string | null {
  try {
    const url = new URL(String(value || '').trim());
    if (!REQUESTABLE_PROTOCOLS.has(url.protocol) || !url.hostname || url.username || url.password) {
      return null;
    }
    return url.origin;
  } catch {
    return null;
  }
}

export function getOriginPermissionPattern(value: string | undefined | null): string | null {
  const origin = getRequestableOrigin(value);
  return origin ? `${origin}/*` : null;
}

export async function requestOriginPermission(
  value: string | undefined | null,
  knownOrigins: readonly string[] = [],
): Promise<boolean> {
  const origin = getRequestableOrigin(value);
  if (!origin) {
    throw new Error('Custom endpoints must use an http(s) URL without credentials.');
  }
  if (knownOrigins.includes(origin)) return true;

  // Browser preview/tests do not expose extension permissions; the normal fetch path
  // still validates the URL and the service worker enforces permissions in extensions.
  if (typeof chrome === 'undefined' || typeof chrome.permissions?.request !== 'function') return true;
  return chrome.permissions.request({ origins: [`${origin}/*`] });
}
