import {
    buildSourceBadges,
    cloneLookupResult,
    mergeDictionaryEnrichment,
    normalizeSectionKind,
    sourceBadgeLabel
} from "../shared/enrichment.js";
import { mergeLexicalProfiles } from "../shared/query-utils.js";
import { lookupAiProvider } from "../providers/ai-provider.js";
import { lookupDictionaryEnrichment } from "../providers/dictionary.js";
import { unregisterController } from "./request-controller.js";
import {
    ENRICHMENT_UPDATE_REVISION,
    TRANSLATION_UPDATE_REVISION,
    buildEnrichmentCacheKey,
    deleteEnrichmentInFlight,
    getCachedEnrichmentAsync,
    getEnrichmentInFlight,
    publishLookupUpdate,
    setCachedEnrichment,
    setEnrichmentInFlight
} from "./enrichment-cache.js";

export function delayWithSignal(ms, signal) {
    if (signal?.aborted) {
        const error = new Error("Request aborted");
        error.name = "AbortError";
        return Promise.reject(error);
    }
    return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(resolve, ms);
        if (!signal) {
            return;
        }
        const onAbort = () => {
            clearTimeout(timeoutId);
            const error = new Error("Request aborted");
            error.name = "AbortError";
            reject(error);
        };
        signal.addEventListener("abort", onAbort, { once: true });
    });
}

export function scheduleDeferredDictionaryWork({
    needsPhraseFallback,
    text,
    settings,
    requestId,
    sender,
    initialResult,
    primaryProviderId,
    signal,
    pendingTranslation = false,
    translationPromise = null
}) {
    const continueAfterTranslation = (currentResult) => {
        if (signal?.aborted) {
            unregisterController(sender?.tab?.id, "dictionary", requestId);
            return;
        }
        if (needsPhraseFallback) {
            scheduleAiPhraseFallback({
                text,
                settings,
                requestId,
                sender,
                initialResult: currentResult,
                thenEnrich: settings.enableDictionary,
                primaryProviderId,
                signal
            });
            return;
        }
        if (settings.enableDictionary) {
            scheduleDictionaryEnrichment({
                text,
                settings,
                requestId,
                sender,
                initialResult: currentResult,
                primaryProviderId,
                signal
            });
            return;
        }
        unregisterController(sender?.tab?.id, "dictionary", requestId);
    };

    const start = async () => {
        if (signal?.aborted) {
            unregisterController(sender?.tab?.id, "dictionary", requestId);
            return;
        }

        let currentResult = initialResult;
        if (pendingTranslation && translationPromise) {
            try {
                const translation = await translationPromise;
                if (signal?.aborted) {
                    unregisterController(sender?.tab?.id, "dictionary", requestId);
                    return;
                }
                if (translation) {
                    currentResult = mergeTranslationIntoResult(currentResult, translation, text);
                    await publishLookupUpdate({
                        requestId,
                        text,
                        sender,
                        result: {
                            ...currentResult,
                            requestId,
                            enriched: false
                        },
                        revision: TRANSLATION_UPDATE_REVISION
                    });
                }
            } catch (error) {
                if (error?.name !== "AbortError") {
                    console.warn("[dictionary-translation]", error?.message || error);
                }
            }
        }

        continueAfterTranslation(currentResult);
    };

    delayWithSignal(pendingTranslation ? 0 : 300, signal).then(start).catch((error) => {
        if (error?.name !== "AbortError") {
            console.warn("[dictionary-defer]", error?.message || error);
        }
        unregisterController(sender?.tab?.id, "dictionary", requestId);
    });
}

export function mergeTranslationIntoResult(result, translation, originalText) {
    if (!translation) {
        return result;
    }

    const next = cloneLookupResult(result);
    const hasTranslation = (next.sections || []).some((section) => normalizeSectionKind(section) === "translation");
    if (!hasTranslation) {
        if (!(next.sections || []).some((section) => String(section?.title || "").trim().toLowerCase() === "original")
            && !(next.sections || []).some((section) => normalizeSectionKind(section) === "definitions")) {
            next.sections.push({
                title: "Original",
                text: originalText
            });
        }
        next.sections.push({
            title: "Translation",
            kind: "translation",
            text: translation.translatedText || translation.title,
            meta: sourceBadgeLabel(translation.sourceBadges)
        });
    }

    const badges = Array.isArray(next.sourceBadges) ? [...next.sourceBadges] : [];
    badges.push({
        label: sourceBadgeLabel(translation.sourceBadges) || "Google Translate",
        kind: "translation",
        providerId: translation.providerId || "google"
    });
    next.sourceBadges = buildSourceBadges(badges);

    const sourceNames = new Set(
        next.sourceBadges
            .map((badge) => String(badge.label || "").trim().toLowerCase())
            .filter(Boolean)
    );
    const subtitleParts = [
        next.subtitle,
        translation.subtitle
    ]
        .map((part) => String(part || "").trim())
        .filter(Boolean)
        .filter((part) => !sourceNames.has(part.toLowerCase()));
    next.subtitle = [...new Set(subtitleParts)].join(" • ");
    return next;
}

export function scheduleAiPhraseFallback({
    text,
    settings,
    requestId,
    sender,
    initialResult,
    thenEnrich = false,
    primaryProviderId = "",
    signal
}) {
    lookupAiProvider(text, settings, { intent: "phrase_fallback", signal })
        .then(async (phraseExplanation) => {
            let current = cloneLookupResult(initialResult);

            if (phraseExplanation?.sections?.length) {
                current = mergePhraseExplanation(current, phraseExplanation, text);
                await publishLookupUpdate({
                    requestId,
                    text,
                    sender,
                    result: {
                        ...current,
                        requestId,
                        enriched: true
                    },
                    revision: ENRICHMENT_UPDATE_REVISION
                });
            }

            if (thenEnrich) {
                scheduleDictionaryEnrichment({
                    text,
                    settings,
                    requestId,
                    sender,
                    initialResult: current,
                    primaryProviderId,
                    signal
                });
            }
        })
        .catch((error) => {
            if (error?.name !== "AbortError") {
                console.warn("[ai-phrase-fallback]", error?.message || error);
            }
            if (thenEnrich) {
                scheduleDictionaryEnrichment({
                    text,
                    settings,
                    requestId,
                    sender,
                    initialResult,
                    primaryProviderId,
                    signal
                });
            }
        });
}

export function mergePhraseExplanation(result, phraseExplanation, originalText) {
    const next = cloneLookupResult(result);
    const phraseSections = (phraseExplanation.sections || []).filter((section) => {
        const hasText = Boolean(String(section?.text || "").trim());
        const hasItems = Array.isArray(section?.items) && section.items.length > 0;
        return hasText || hasItems || Boolean(String(section?.title || "").trim());
    });

    if (!phraseSections.length) {
        return next;
    }

    const mergedSections = [];

    if (phraseSections.length === 1 && !String(phraseSections[0].title || "").trim()) {
        mergedSections.push({
            title: "Phrase explanation",
            kind: phraseSections[0].kind || "phrase",
            text: phraseSections[0].text || "",
            markdown: Boolean(phraseSections[0].markdown),
            meta: sourceBadgeLabel(phraseExplanation.sourceBadges) || "AI · Phrase explanation"
        });
    } else {
        phraseSections.forEach((section, index) => {
            mergedSections.push({
                title: section.title || (index === 0 ? "Phrase explanation" : ""),
                kind: section.kind || "phrase",
                text: section.text || "",
                markdown: Boolean(section.markdown),
                items: section.items,
                meta: index === 0
                    ? (sourceBadgeLabel(phraseExplanation.sourceBadges) || "AI · Phrase explanation")
                    : section.meta
            });
        });
    }

    // Keep dictionary sections first, then phrase explanation, then translation.
    const dictionarySections = [];
    const trailingSections = [];
    for (const section of next.sections || []) {
        const kind = normalizeSectionKind(section);
        if (kind === "translation" || String(section?.title || "").trim().toLowerCase() === "original") {
            trailingSections.push(section);
        } else {
            dictionarySections.push(section);
        }
    }
    next.sections = [...dictionarySections, ...mergedSections, ...trailingSections];

    const badges = Array.isArray(next.sourceBadges) ? [...next.sourceBadges] : [];
    badges.push({
        label: sourceBadgeLabel(phraseExplanation.sourceBadges) || "AI",
        kind: "ai",
        providerId: phraseExplanation.providerId || "ai"
    });
    next.sourceBadges = buildSourceBadges(badges);

    const sourceNames = new Set(
        next.sourceBadges
            .map((badge) => String(badge.label || "").trim().toLowerCase())
            .filter(Boolean)
    );
    const subtitleParts = [
        next.subtitle,
        phraseExplanation.subtitle
    ]
        .map((part) => String(part || "").trim())
        .filter(Boolean)
        .filter((part) => !sourceNames.has(part.toLowerCase()));
    next.subtitle = [...new Set(subtitleParts)].join(" • ");

    if (!next.title) {
        next.title = originalText;
    }

    if (phraseExplanation?.lexicalProfile) {
        next.lexicalProfile = mergeLexicalProfiles(next.lexicalProfile, phraseExplanation.lexicalProfile);
    }
    next.enriched = true;
    return next;
}

export async function scheduleDictionaryEnrichment({ text, settings, requestId, sender, initialResult, primaryProviderId, signal }) {
    const lemma = initialResult?.lemmaFallback?.lemma || "";
    const cacheKey = buildEnrichmentCacheKey(text, settings, primaryProviderId, lemma);
    const cached = await getCachedEnrichmentAsync(cacheKey);
    if (cached) {
        const mergedFromCached = mergeDictionaryEnrichment(initialResult, cached);
        if (mergedFromCached && !signal?.aborted) {
            void publishLookupUpdate({
                requestId,
                text,
                sender,
                result: {
                    ...mergedFromCached,
                    requestId,
                    enriched: true
                },
                revision: ENRICHMENT_UPDATE_REVISION
            });
        }
        unregisterController(sender?.tab?.id, "dictionary", requestId);
        return;
    }

    const existing = getEnrichmentInFlight(cacheKey);
    if (existing) {
        existing
            .then((enrichmentResults) => {
                if (!enrichmentResults || signal?.aborted) {
                    return;
                }
                const merged = mergeDictionaryEnrichment(initialResult, enrichmentResults);
                if (!merged) return;
                return publishLookupUpdate({
                    requestId,
                    text,
                    sender,
                    result: {
                        ...merged,
                        requestId,
                        enriched: true
                    },
                    revision: ENRICHMENT_UPDATE_REVISION
                });
            })
            .catch(() => { })
            .finally(() => {
                unregisterController(sender?.tab?.id, "dictionary", requestId);
            });
        return;
    }

    const work = runDictionaryEnrichment({
        text,
        settings,
        initialResult,
        primaryProviderId,
        signal
    })
        .then((enrichmentResults) => {
            if (enrichmentResults) {
                setCachedEnrichment(cacheKey, enrichmentResults);
            }
            return enrichmentResults;
        })
        .finally(() => {
            deleteEnrichmentInFlight(cacheKey);
            unregisterController(sender?.tab?.id, "dictionary", requestId);
        });

    setEnrichmentInFlight(cacheKey, work);

    work
        .then((enrichmentResults) => {
            if (!enrichmentResults || signal?.aborted) {
                return;
            }
            const merged = mergeDictionaryEnrichment(initialResult, enrichmentResults);
            if (!merged) return;
            return publishLookupUpdate({
                requestId,
                text,
                sender,
                result: {
                    ...merged,
                    requestId,
                    enriched: true
                },
                revision: ENRICHMENT_UPDATE_REVISION
            });
        })
        .catch((error) => {
            if (error?.name !== "AbortError") {
                console.warn("[dictionary-enrichment]", error?.message || error);
            }
        });
}

export async function runDictionaryEnrichment({ text, settings, initialResult, primaryProviderId, signal }) {
    const excludeIds = [primaryProviderId].filter(Boolean);
    const lemma = initialResult?.lemmaFallback?.lemma;
    let enrichmentResults = [];

    try {
        enrichmentResults = await lookupDictionaryEnrichment(text, settings, {
            primaryId: primaryProviderId,
            excludeIds,
            lemma,
            signal
        });
    } catch (error) {
        if (error?.name !== "AbortError") {
            console.warn("[dictionary-enrichment]", error?.message || error);
        }
        return null;
    }

    if (!Array.isArray(enrichmentResults) || !enrichmentResults.length) {
        return null;
    }

    return enrichmentResults;
}
