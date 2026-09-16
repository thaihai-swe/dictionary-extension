export const RESTRICTED_URL_RE =
  /^(chrome|chrome-extension|moz-extension|edge|about|devtools|https:\/\/chromewebstore\.google\.com|https:\/\/addons\.mozilla\.org)/i;

export function isExtensionProtocol(protocol?: string | null): boolean {
  if (!protocol) return false;
  return protocol === 'chrome-extension:' || protocol === 'moz-extension:';
}

export function isExtensionPage(): boolean {
  if (typeof window === 'undefined') return false;
  return isExtensionProtocol(window.location?.protocol);
}

export function canInjectIntoUrl(url?: string | null): boolean {
  const value = String(url || '').trim();
  if (!value) return false;
  return !RESTRICTED_URL_RE.test(value);
}
