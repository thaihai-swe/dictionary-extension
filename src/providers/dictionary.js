import { NotFoundError } from "./errors.js";
import { lookupFreeDictionary } from "./free-dictionary.js";
import { lookupMerriamWebster } from "./merriam-webster-dictionary.js";
import { lookupWiktionary } from "./wiktionary-dictionary.js";
import { lookupWordnik } from "./wordnik-dictionary.js";
import { lookupWordsApi } from "./words-api-dictionary.js";
import { getEnglishLemmaCandidates, getEnglishPhraseCandidates, parseLexicalProfile, extractLexicalProfileFromMarkdown, mergeLexicalProfiles } from "../shared/query-utils.js";

const DICTIONARY_PROVIDERS = {
    free_dictionary: {
        id: "free_dictionary",
        label: "Free Dictionary API (Default)",
        lookup: lookupFreeDictionary,
        isConfigured: () => true
    },
    wiktionary: {
        id: "wiktionary",
        label: "Wiktionary REST API",
        lookup: lookupWiktionary,
        isConfigured: () => true
    },
    merriam_webster: {
        id: "merriam_webster",
        label: "Merriam-Webster Collegiate API",
        lookup: lookupMerriamWebster,
        isConfigured: (settings) => Boolean(String(settings?.dictionaryApiKey || "").trim())
    },
    wordnik: {
        id: "wordnik",
        label: "Wordnik",
        lookup: lookupWordnik,
        isConfigured: (settings) => Boolean(String(settings?.wordnikApiKey || "").trim())
    },
    words_api: {
        id: "words_api",
        label: "WordsAPI",
        lookup: lookupWordsApi,
        isConfigured: (settings) => Boolean(String(settings?.wordsApiKey || "").trim())
    }
};

export const DEFAULT_DICTIONARY_PROVIDER = "free_dictionary";

const FALLBACK_ORDER = Object.keys(DICTIONARY_PROVIDERS);

export function normalizeDictionaryProviderId(value) {
    if (value && DICTIONARY_PROVIDERS[value]) {
        return value;
    }
    const normalized = String(value || "").trim().toLowerCase();
    if (DICTIONARY_PROVIDERS[normalized]) {
        return normalized;
    }
    return DEFAULT_DICTIONARY_PROVIDER;
}

const ENRICHMENT_CONCURRENCY = 2;

export async function lookupDictionary(text, settings, options = {}) {
    const primaryId = normalizeDictionaryProviderId(settings?.dictionaryProvider);
    const fallbackChain = [
        primaryId,
        ...FALLBACK_ORDER.filter((id) => id !== primaryId)
    ];

    let lastNotFoundError = null;

    for (const providerId of fallbackChain) {
        const provider = DICTIONARY_PROVIDERS[providerId];
        if (!provider) {
            continue;
        }

        try {
            const result = await provider.lookup(text, settings, options);
            return normalizeDictionaryResult(result, provider, settings);
        } catch (error) {
            if (error instanceof NotFoundError) {
                lastNotFoundError = error;
                continue;
            }
            // Real operational errors (auth missing/invalid, network failure, rate limit) stop the chain
            throw error;
        }
    }

    const lemmaCandidates = getEnglishLemmaCandidates(text);
    for (const candidateStem of lemmaCandidates) {
        for (const providerId of fallbackChain) {
            const provider = DICTIONARY_PROVIDERS[providerId];
            if (!provider) {
                continue;
            }

            try {
                const result = await provider.lookup(candidateStem, settings, options);
                const normalized = normalizeDictionaryResult(result, provider, settings);
                normalized.lemmaFallback = {
                    originalText: text,
                    lemma: candidateStem
                };
                const rootNotice = `Showing definitions for root: ${candidateStem}`;
                normalized.subtitle = normalized.subtitle
                    ? `${normalized.subtitle} • ${rootNotice}`
                    : rootNotice;
                return normalized;
            } catch (error) {
                if (error instanceof NotFoundError) {
                    continue;
                }
                throw error;
            }
        }
    }

    const phraseCandidates = getEnglishPhraseCandidates(text);
    for (const candidatePhrase of phraseCandidates) {
        for (const providerId of fallbackChain) {
            const provider = DICTIONARY_PROVIDERS[providerId];
            if (!provider) {
                continue;
            }

            try {
                const result = await provider.lookup(candidatePhrase, settings, options);
                const normalized = normalizeDictionaryResult(result, provider, settings);
                normalized.lemmaFallback = {
                    originalText: text,
                    lemma: candidatePhrase
                };
                const phraseNotice = `Showing definitions for phrase: ${candidatePhrase}`;
                normalized.subtitle = normalized.subtitle
                    ? `${normalized.subtitle} • ${phraseNotice}`
                    : phraseNotice;
                return normalized;
            } catch (error) {
                if (error instanceof NotFoundError) {
                    continue;
                }
                throw error;
            }
        }
    }

    throw lastNotFoundError || new Error(`No dictionary definition found for "${text}".`);
}

/**
 * Query non-primary dictionary providers for enrichment.
 * Failures (not found, missing keys, network, rate limits) are skipped silently.
 */
export async function lookupDictionaryEnrichment(text, settings, options = {}) {
    const primaryId = normalizeDictionaryProviderId(
        options.primaryId || settings?.dictionaryProvider
    );
    const excludeIds = new Set(
        Array.isArray(options.excludeIds) && options.excludeIds.length
            ? options.excludeIds.map((id) => normalizeDictionaryProviderId(id))
            : [primaryId]
    );

    const providerIds = FALLBACK_ORDER.filter((id) => {
        const provider = DICTIONARY_PROVIDERS[id];
        return (
            provider
            && !excludeIds.has(id)
            && (typeof provider.isConfigured !== "function" || provider.isConfigured(settings))
        );
    });
    if (!providerIds.length) {
        return [];
    }

    const results = [];
    for (let index = 0; index < providerIds.length; index += ENRICHMENT_CONCURRENCY) {
        const batch = providerIds.slice(index, index + ENRICHMENT_CONCURRENCY);
        const queryTerm = options.lemma || text;
        const settled = await Promise.allSettled(
            batch.map(async (providerId) => {
                const provider = DICTIONARY_PROVIDERS[providerId];
                const result = await provider.lookup(queryTerm, settings, options);
                return normalizeDictionaryResult(result, provider, settings);
            })
        );

        for (const item of settled) {
            if (item.status === "fulfilled" && item.value) {
                results.push(item.value);
                continue;
            }

            const reason = item.reason;
            if (reason instanceof NotFoundError) {
                continue;
            }
            if (reason) {
                console.warn("[dictionary-enrichment]", reason?.message || reason);
            }
        }
    }

    return results;
}

function normalizeDictionaryResult(result, provider, settings) {
    const title = String(result?.title || "").trim();
    const sourceBadges = Array.isArray(result?.sourceBadges) && result.sourceBadges.length
        ? result.sourceBadges.map((badge) => ({
            ...badge,
            providerId: badge?.providerId || provider.id,
            kind: badge?.kind || "dictionary"
        }))
        : [{ label: provider.label, kind: "dictionary", providerId: provider.id }];

    let lexicalProfile = null;
    const enableLexicalProfile = settings?.enableLexicalProfile !== false;

    if (enableLexicalProfile) {
        if (result?.lexicalProfile) {
            lexicalProfile = parseLexicalProfile(result.lexicalProfile) || null;
        }
        if (Array.isArray(result?.sections)) {
            for (const sec of result.sections) {
                const sectionText = [sec.title, sec.text, ...(sec.items || [])]
                    .filter(Boolean)
                    .join(" ");
                const extracted = extractLexicalProfileFromMarkdown(sectionText);
                if (extracted) {
                    lexicalProfile = mergeLexicalProfiles(lexicalProfile, extracted);
                }
            }
        }
    }

    return {
        ...result,
        title: title || "Lookup result",
        sourceBadges,
        providerId: provider.id,
        subtitle: result?.subtitle || "",
        lexicalProfile: enableLexicalProfile ? (lexicalProfile || undefined) : undefined
    };
}

/**
 * Validate a single dictionary provider connection.
 * Uses a known English word. NotFoundError still counts as "connected".
 * @returns {Promise<{ok: boolean, error?: string, message?: string}>}
 */
export async function validateDictionaryProvider(providerId, settings) {
    const id = normalizeDictionaryProviderId(providerId);
    const provider = DICTIONARY_PROVIDERS[id];

    if (!provider) {
        return { ok: false, error: `Unknown dictionary provider: ${providerId}` };
    }

    // Pre-check keys for providers that require them
    if (id === "merriam_webster" && !String(settings?.dictionaryApiKey || "").trim()) {
        return { ok: false, error: "Merriam-Webster API key is missing." };
    }
    if (id === "wordnik" && !String(settings?.wordnikApiKey || "").trim()) {
        return { ok: false, error: "Wordnik API key is missing." };
    }
    if (id === "words_api" && !String(settings?.wordsApiKey || "").trim()) {
        return { ok: false, error: "WordsAPI key is missing." };
    }

    const startTime = Date.now();
    try {
        await provider.lookup("hello", settings);
        const latencyMs = Date.now() - startTime;
        return { ok: true, providerId: id, latencyMs, message: `${provider.label} is connected (${latencyMs}ms).` };
    } catch (error) {
        const latencyMs = Date.now() - startTime;
        if (error instanceof NotFoundError) {
            return { ok: true, providerId: id, latencyMs, message: `${provider.label} is reachable (${latencyMs}ms).` };
        }
        return {
            ok: false,
            providerId: id,
            latencyMs,
            httpStatus: Number.isFinite(error?.status) ? error.status : undefined,
            error: error?.message || `${provider.label} connection failed.`
        };
    }
}
