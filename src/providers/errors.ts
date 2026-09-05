export class NotFoundError extends Error {
  status?: number;

  constructor(message: string, status = 404) {
    super(message);
    this.name = 'NotFoundError';
    this.status = status;
  }
}

export function errorWithStatus(message: string, status?: number): Error {
  const error = new Error(message) as Error & { status?: number };
  error.status = status;
  return error;
}

/**
 * Fatal dictionary errors abort the primary fallback chain.
 * Auth / missing-key failures should not be papered over by another provider.
 * Transient network, timeout, 429, and 5xx errors are not fatal.
 */
export function isFatalDictionaryError(error: unknown): boolean {
  if (!error || error instanceof NotFoundError) return false;

  const status = Number((error as { status?: number }).status);
  if (status === 401 || status === 403) return true;

  const message = String((error as { message?: string }).message || '').toLowerCase();
  if (!message) return false;

  return (
    message.includes('api key is required')
    || message.includes('api key is missing')
    || message.includes('api key is not configured')
    || message.includes('api key is invalid')
    || message.includes('unauthorized')
    || message.includes('invalid or unauthorized')
  );
}

export function throwForHttpStatus(status: number, notFoundMessage: string, fallbackMessage: string): never {
  if (status === 404) throw new NotFoundError(notFoundMessage, 404);
  if (status === 401 || status === 403) {
    throw errorWithStatus(fallbackMessage || `Unauthorized (HTTP ${status})`, status);
  }
  throw errorWithStatus(fallbackMessage || `Lookup failed (HTTP ${status})`, status);
}
