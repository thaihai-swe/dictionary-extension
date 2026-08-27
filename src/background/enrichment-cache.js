import { cloneLookupResult } from "../shared/enrichment.js";
import { LOOKUP_UPDATE } from "../shared/messages.js";

const ENRICHED_CACHE_TTL_MS = 10 * 60 * 1000;
const ENRICHED_CACHE_MAX = 20;
const ENRICHMENT_CACHE_SCHEMA_VERSION = 2;
const ENRICHMENT_CACHE_SCHEMA_KEY = "dictionaryHelperEnrichmentCacheSchemaVersion";

export const TRANSLATION_UPDATE_REVISION = 1;
export const ENRICHMENT_UPDATE_REVISION = 2;

const enrichedCache = new Map();
const enrichmentInFlight = new Map();

export function clearEnrichmentMemoryCache() {
    enrichedCache.clear();
    enrichmentInFlight.clear();
}

export function getEnrichmentInFlight(cacheKey) {
    return enrichmentInFlight.get(cacheKey);
}

export function setEnrichmentInFlight(cacheKey, promise) {
    enrichmentInFlight.set(cacheKey, promise);
}

export function deleteEnrichmentInFlight(cacheKey) {
    enrichmentInFlight.delete(cacheKey);
}

export function createRequestId() {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        return crypto.randomUUID();
    }
    return `req_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function buildEnrichmentCacheKey(text, settings, primaryProviderId, lemma) {
    return JSON.stringify({
        text: String(text || "").trim().toLowerCase(),
        lemma: String(lemma || "").trim().toLowerCase(),
        primaryProviderId: primaryProviderId || settings?.dictionaryProvider || "",
        translateTargetLanguage: settings?.translateTargetLanguage || "",
        translateProvider: settings?.translateProvider || "",
        enableTranslate: Boolean(settings?.enableTranslate),
        enableDictionary: Boolean(settings?.enableDictionary),
        enableLexicalProfile: Boolean(settings?.enableLexicalProfile),
        hasDictionaryApiKey: Boolean(String(settings?.dictionaryApiKey || "").trim()),
        hasWordnikApiKey: Boolean(String(settings?.wordnikApiKey || "").trim()),
        hasWordsApiKey: Boolean(String(settings?.wordsApiKey || "").trim())
    });
}

export async function clearEnrichmentSessionCache() {
    if (!chrome.storage?.session) {
        return;
    }

    try {
        const sessionData = await chrome.storage.session.get(null);
        const cacheKeys = Object.keys(sessionData).filter((key) => key.startsWith("enrich_"));
        if (cacheKeys.length) {
            await chrome.storage.session.remove(cacheKeys);
        }
    } catch (_error) {
        // Session storage is best-effort; the in-memory cache was already cleared.
    }
}

export async function migrateEnrichmentCacheSchema() {
    if (!chrome.storage?.session) {
        return;
    }

    try {
        const stored = await chrome.storage.session.get(ENRICHMENT_CACHE_SCHEMA_KEY);
        if (stored?.[ENRICHMENT_CACHE_SCHEMA_KEY] !== ENRICHMENT_CACHE_SCHEMA_VERSION) {
            enrichedCache.clear();
            await clearEnrichmentSessionCache();
            await chrome.storage.session.set({
                [ENRICHMENT_CACHE_SCHEMA_KEY]: ENRICHMENT_CACHE_SCHEMA_VERSION
            });
        }
    } catch (_error) {
        // The cache is an optimization; lookups continue without session persistence.
    }
}

export function getCachedEnrichment(cacheKey) {
    const entry = enrichedCache.get(cacheKey);
    if (entry) {
        if (Date.now() - entry.createdAt > ENRICHED_CACHE_TTL_MS) {
            enrichedCache.delete(cacheKey);
            if (chrome.storage?.session) {
                chrome.storage.session.remove(`enrich_${cacheKey}`).catch(() => {});
            }
            return null;
        }
        const results = cloneEnrichmentResults(entry.result);
        if (!results) {
            enrichedCache.delete(cacheKey);
            if (chrome.storage?.session) {
                chrome.storage.session.remove(`enrich_${cacheKey}`).catch(() => {});
            }
        }
        return results;
    }
    return null;
}

export async function getCachedEnrichmentAsync(cacheKey) {
    const memoryHit = getCachedEnrichment(cacheKey);
    if (memoryHit) {
        return memoryHit;
    }
    if (!chrome.storage?.session) {
        return null;
    }
    try {
        const storageKey = `enrich_${cacheKey}`;
        const data = await chrome.storage.session.get(storageKey);
        const entry = data[storageKey];
        if (!entry || typeof entry !== "object" || !Array.isArray(entry.result)) {
            if (entry && !Array.isArray(entry.result)) {
                await chrome.storage.session.remove(storageKey);
            }
            return null;
        }
        if (Date.now() - entry.createdAt > ENRICHED_CACHE_TTL_MS) {
            await chrome.storage.session.remove(storageKey);
            return null;
        }
        enrichedCache.set(cacheKey, entry);
        return cloneEnrichmentResults(entry.result);
    } catch (_error) {
        return null;
    }
}

export function setCachedEnrichment(cacheKey, results) {
    const clonedResults = cloneEnrichmentResults(results);
    if (!clonedResults) {
        return;
    }

    const entry = {
        createdAt: Date.now(),
        result: clonedResults
    };
    enrichedCache.set(cacheKey, entry);

    while (enrichedCache.size > ENRICHED_CACHE_MAX) {
        const oldestKey = enrichedCache.keys().next().value;
        enrichedCache.delete(oldestKey);
    }

    if (chrome.storage?.session) {
        const storageKey = `enrich_${cacheKey}`;
        chrome.storage.session.set({ [storageKey]: entry }).catch(() => {});
    }
}

export function cloneEnrichmentResults(results) {
    if (!Array.isArray(results)) {
        return null;
    }

    return results.map((result) => (result ? cloneLookupResult(result) : result));
}

export async function publishLookupUpdate({ requestId, text, sender, result, revision }) {
    const message = {
        type: LOOKUP_UPDATE,
        payload: {
            requestId,
            text: String(text || "").trim(),
            source: "dictionary",
            revision: Number.isFinite(revision)
                ? revision
                : (result?.enriched ? ENRICHMENT_UPDATE_REVISION : TRANSLATION_UPDATE_REVISION),
            result
        }
    };

    const tabId = sender?.tab?.id;
    if (Number.isInteger(tabId)) {
        const options = Number.isInteger(sender.frameId) ? { frameId: sender.frameId } : undefined;
        try {
            await chrome.tabs.sendMessage(tabId, message, options);
            return;
        } catch (_error) {
            // Fall through to runtime broadcast for toolbar/other listeners.
        }
    }

    try {
        await chrome.runtime.sendMessage(message);
    } catch (_error) {
        // No active popup listener is fine; enrichment still warms the cache.
    }
}

export function isPhraseLike(text) {
    const normalized = String(text || "").replace(/\s+/g, " ").trim();
    if (!normalized) {
        return false;
    }

    if (normalized.split(" ").length > 1) {
        return true;
    }

    return /[-']/.test(normalized) && normalized.length > 2;
}

export function hasUsableDictionaryDefinitions(dictionary) {
    if (!dictionary?.sections?.length) {
        return false;
    }

    return dictionary.sections.some((section) => {
        if (section?.kind !== "definitions") {
            return false;
        }

        if (Array.isArray(section.items) && section.items.some((item) => String(item || "").trim())) {
            return true;
        }

        const text = String(section.text || "").trim();
        return Boolean(text) && text.toLowerCase() !== "no definitions available for this word.";
    });
}
