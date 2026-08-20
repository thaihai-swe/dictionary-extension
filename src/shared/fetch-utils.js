/**
 * Shared fetch helpers: timeout, retries, offline checks.
 * ES module used by providers and background.
 */

const DEFAULT_TIMEOUT_MS = 15000;
const DEFAULT_RETRIES = 2;

function assertOnline() {
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
        throw new Error("You appear to be offline. Check your connection and try again.");
    }
}

export function isRequestCancelled(error) {
    return error?.name === "AbortError" || error?.name === "CanceledError" || error?.message?.includes("aborted");
}

export async function fetchWithTimeout(url, options = {}, timeoutMs = DEFAULT_TIMEOUT_MS) {
    assertOnline();

    const timeoutController = new AbortController();
    const externalSignal = options.signal;
    let timedOut = false;
    const timeoutId = setTimeout(() => {
        timedOut = true;
        timeoutController.abort();
    }, timeoutMs);

    let signal;
    if (typeof AbortSignal !== "undefined" && typeof AbortSignal.any === "function" && externalSignal) {
        signal = AbortSignal.any([externalSignal, timeoutController.signal]);
    } else if (externalSignal) {
        if (externalSignal.aborted) {
            clearTimeout(timeoutId);
            const abortErr = new Error("Request aborted");
            abortErr.name = "AbortError";
            throw abortErr;
        }
        const combinedController = new AbortController();
        const onExternalAbort = () => combinedController.abort();
        const onTimeoutAbort = () => combinedController.abort();
        externalSignal.addEventListener("abort", onExternalAbort, { once: true });
        timeoutController.signal.addEventListener("abort", onTimeoutAbort, { once: true });
        signal = combinedController.signal;
    } else {
        signal = timeoutController.signal;
    }

    try {
        const response = await fetch(url, {
            ...options,
            signal
        });
        return response;
    } catch (error) {
        if (isRequestCancelled(error)) {
            if (timedOut) {
                throw new Error("Request timed out. Please try again.");
            }
            throw error;
        }
        if (typeof navigator !== "undefined" && navigator.onLine === false) {
            throw new Error("You appear to be offline. Check your connection and try again.");
        }
        throw error;
    } finally {
        clearTimeout(timeoutId);
    }
}

export async function fetchWithRetry(url, options = {}, config = {}) {
    const retries = Number.isFinite(config.retries) ? config.retries : DEFAULT_RETRIES;
    const timeoutMs = config.timeoutMs || DEFAULT_TIMEOUT_MS;
    const retryStatuses = config.retryStatuses || [429, 500, 502, 503, 504];
    let lastError = null;

    for (let attempt = 0; attempt <= retries; attempt += 1) {
        try {
            const response = await fetchWithTimeout(url, options, timeoutMs);
            if (!response.ok && retryStatuses.includes(response.status) && attempt < retries) {
                await sleep(getRetryDelay(response, attempt), options.signal);
                continue;
            }
            return response;
        } catch (error) {
            lastError = error;
            const message = String(error?.message || "");
            const retriable =
                !isRequestCancelled(error)
                && (message.includes("timed out")
                    || message.includes("Failed to fetch")
                    || message.includes("NetworkError")
                    || message.includes("network"));

            if (!retriable || attempt >= retries) {
                throw error;
            }
            await sleep(400 * (attempt + 1), options.signal);
        }
    }

    throw lastError || new Error("Request failed.");
}

function getRetryDelay(response, attempt) {
    const retryAfter = Number(response?.headers?.get("Retry-After"));
    if (Number.isFinite(retryAfter) && retryAfter > 0) {
        return Math.min(retryAfter * 1000, 10000);
    }
    return Math.min(400 * (2 ** attempt), 4000);
}

function sleep(ms, signal) {
    if (signal?.aborted) {
        const error = new Error("Request aborted");
        error.name = "AbortError";
        return Promise.reject(error);
    }

    return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(resolve, ms);
        if (!signal) return;
        const abort = () => {
            clearTimeout(timeoutId);
            signal.removeEventListener("abort", abort);
            const error = new Error("Request aborted");
            error.name = "AbortError";
            reject(error);
        };
        signal.addEventListener("abort", abort, { once: true });
    });
}
