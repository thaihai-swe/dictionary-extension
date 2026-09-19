import { NotFoundError } from '../domain/dictionary/errors';

export { NotFoundError, isFatalDictionaryError } from '../domain/dictionary/errors';

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
export function throwForHttpStatus(status: number, notFoundMessage: string, fallbackMessage: string): never {
  if (status === 404) throw new NotFoundError(notFoundMessage, 404);
  if (status === 401 || status === 403) {
    throw errorWithStatus(fallbackMessage || `Unauthorized (HTTP ${status})`, status);
  }
  throw errorWithStatus(fallbackMessage || `Lookup failed (HTTP ${status})`, status);
}
