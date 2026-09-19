export class NotFoundError extends Error {
  status?: number;

  constructor(message: string, status = 404) {
    super(message);
    this.name = 'NotFoundError';
    this.status = status;
  }
}

export function isFatalDictionaryError(error: unknown): boolean {
  if (!error || error instanceof NotFoundError) return false;

  const status = Number((error as { status?: number }).status);
  if (status === 401 || status === 403) return true;

  const message = String((error as { message?: string }).message || '').toLowerCase();
  return Boolean(message) && (
    message.includes('api key is required')
    || message.includes('api key is missing')
    || message.includes('api key is not configured')
    || message.includes('api key is invalid')
    || message.includes('unauthorized')
    || message.includes('invalid or unauthorized')
  );
}
