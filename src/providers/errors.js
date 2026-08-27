export class NotFoundError extends Error {
    constructor(message) {
        super(message);
        this.name = "NotFoundError";
    }
}

/**
 * Fatal dictionary errors abort the primary fallback chain.
 * Auth / missing-key failures should not be papered over by another provider.
 * Transient network, timeout, 429, and 5xx errors are not fatal.
 */
export function isFatalDictionaryError(error) {
    if (!error || error instanceof NotFoundError) {
        return false;
    }

    const status = Number(error.status);
    if (status === 401 || status === 403) {
        return true;
    }

    const message = String(error.message || "").toLowerCase();
    if (!message) {
        return false;
    }

    return (
        message.includes("api key is required")
        || message.includes("api key is missing")
        || message.includes("api key is invalid")
        || message.includes("unauthorized")
        || message.includes("invalid or unauthorized")
    );
}
