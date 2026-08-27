import { getSettings, migrateLegacySecretSettings, migrateSettingsSchema } from "./shared/storage.js";
import { classifyQuery, mergeLexicalProfiles } from "./shared/query-utils.js";
import {
    annotateSectionSource,
    buildSourceBadges,
    cloneLookupResult,
    mergeDictionaryEnrichment,
    normalizeSectionKind,
    sourceBadgeLabel
} from "./shared/enrichment.js";
import {
    LOOKUP_TEXT,
    LOOKUP_UPDATE,
    OPEN_LOOKUP_POPUP,
    VALIDATE_PROVIDER,
    CANCEL_LOOKUP,
    INJECT_FRAME
} from "./shared/messages.js";
import { lookupTranslation, validateTranslationProvider } from "./providers/translate.js";
import { lookupDictionary, lookupDictionaryEnrichment, validateDictionaryProvider } from "./providers/dictionary.js";
import { lookupAiProvider, validateAiProvider } from "./providers/ai-provider.js";
import { createSpeechPronunciation } from "./providers/pronunciation.js";
import { canInjectIntoUrl } from "./shared/page-utils.js";
import { CONTENT_SCRIPT_CSS, CONTENT_SCRIPT_JS } from "./shared/content-scripts.js";

const CONTEXT_MENU_ID = "dictionary-helper-lookup";
const MANUAL_LOOKUP_EMPTY_MESSAGE = "Enter a word or phrase to look up.";
const ENRICHED_CACHE_TTL_MS = 10 * 60 * 1000;
const ENRICHED_CACHE_MAX = 20;
const ENRICHMENT_CACHE_SCHEMA_VERSION = 2;
const ENRICHMENT_CACHE_SCHEMA_KEY = "dictionaryHelperEnrichmentCacheSchemaVersion";
const TRANSLATION_UPDATE_REVISION = 1;
const ENRICHMENT_UPDATE_REVISION = 2;

const enrichedCache = new Map();
const enrichmentInFlight = new Map();
const activeControllers = new Map();
let cachedSettings = null;
let cachedSettingsPromise = null;

function getRequestKey(tabId, scope, requestId) {
    return `${tabId || "global"}:${scope || "default"}:${requestId}`;
}

function registerController(tabId, scope, requestId) {
    const controller = new AbortController();
    const key = getRequestKey(tabId, scope, requestId);
    // Only cancel older in-flight requests in the SAME scope on this tab
    // so background AI preloads do not cancel the primary dictionary lookup.
    cancelRequestsForScope(tabId, scope);
    activeControllers.set(key, controller);
    return controller;
}

function getController(tabId, scope, requestId) {
    return activeControllers.get(getRequestKey(tabId, scope, requestId)) || null;
}

function unregisterController(tabId, scope, requestId) {
    const key = getRequestKey(tabId, scope, requestId);
    activeControllers.delete(key);
}

function cancelRequestsForScope(tabId, scope) {
    const prefix = `${tabId || "global"}:${scope || "default"}:`;
    for (const [key, ctrl] of activeControllers.entries()) {
        if (key.startsWith(prefix)) {
            ctrl.abort();
            activeControllers.delete(key);
        }
    }
}

function cancelRequestsForTab(tabId) {
    const prefix = `${tabId || "global"}:`;
    for (const [key, ctrl] of activeControllers.entries()) {
        if (key.startsWith(prefix)) {
            ctrl.abort();
            activeControllers.delete(key);
        }
    }
}

Promise.all([
    migrateLegacySecretSettings(),
    migrateSettingsSchema(),
    migrateEnrichmentCacheSchema(),
    initializeContextMenu()
]).catch(() => { });

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message?.type === VALIDATE_PROVIDER) {
        handleValidateProvider(message.payload)
            .then((result) => sendResponse({ ok: true, result }))
            .catch((error) => {
                sendResponse({
                    ok: false,
                    error: error instanceof Error ? error.message : "Validation failed."
                });
            });
        return true;
    }

    if (message?.type === CANCEL_LOOKUP) {
        cancelRequestsForTab(sender?.tab?.id);
        sendResponse({ ok: true });
        return false;
    }

    if (message?.type === INJECT_FRAME) {
        const tabId = sender?.tab?.id;
        if (!Number.isInteger(tabId)) {
            sendResponse({ ok: false, error: "Missing tab." });
            return false;
        }
        const frameId = Number(message.payload?.frameId);
        const allFrames = Boolean(message.payload?.allFrames);
        injectContentScript(tabId, allFrames ? null : (Number.isInteger(frameId) ? frameId : 0))
            .then(() => sendResponse({ ok: true }))
            .catch((error) => sendResponse({
                ok: false,
                error: error instanceof Error ? error.message : "Unable to inject into this frame."
            }));
        return true;
    }

    if (message?.type !== LOOKUP_TEXT) {
        return false;
    }

    handleLookup(message.payload, sender)
        .then((result) => sendResponse({ ok: true, result }))
        .catch((error) => {
            sendResponse({
                ok: false,
                error: error instanceof Error ? error.message : "Lookup failed."
            });
        });

    return true;
});

async function handleValidateProvider(payload = {}) {
    const { kind, providerId, settings: providedSettings } = payload;

    // Prefer the just-saved form values when provided, otherwise load from storage.
    const settings = providedSettings || (await getCachedSettings());

    if (kind === "dictionary") {
        return validateDictionaryProvider(providerId, settings);
    }

    if (kind === "translation") {
        return validateTranslationProvider(providerId, settings);
    }

    if (kind === "ai") {
        return validateAiProvider(settings);
    }

    return { ok: false, error: `Unknown validation kind: ${kind}` };
}

chrome.runtime.onInstalled.addListener(() => {
    Promise.all([
        migrateLegacySecretSettings(),
        migrateSettingsSchema(),
        migrateEnrichmentCacheSchema(),
        initializeContextMenu()
    ]).catch(() => { });
});

chrome.runtime.onStartup?.addListener(() => {
    Promise.all([
        migrateLegacySecretSettings(),
        migrateSettingsSchema(),
        initializeContextMenu()
    ]).catch(() => { });
});

const ENRICHMENT_CACHE_INVALIDATION_KEYS = new Set([
    "dictionaryProvider",
    "enableDictionary",
    "enableTranslate",
    "translateProvider",
    "translateTargetLanguage",
    "libreTranslateBaseUrl",
    "libreTranslateApiKey",
    "dictionaryApiKey",
    "wordnikApiKey",
    "wordsApiKey",
    "enableLexicalProfile"
]);

chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === "sync" || areaName === "local") {
        cachedSettings = null;
        cachedSettingsPromise = null;
    }

    if (areaName === "sync" && changes.enableContextMenuTrigger) {
        initializeContextMenu().catch(() => { });
    }

    if (areaName !== "sync" && areaName !== "local") {
        return;
    }

    const shouldInvalidate = Object.keys(changes || {}).some((key) => ENRICHMENT_CACHE_INVALIDATION_KEYS.has(key));
    if (shouldInvalidate) {
        enrichedCache.clear();
        enrichmentInFlight.clear();
        clearEnrichmentSessionCache().catch(() => {});
    }
});

if (chrome.contextMenus?.onClicked) {
    chrome.contextMenus.onClicked.addListener(async (info, tab) => {
        if (info.menuItemId !== CONTEXT_MENU_ID || !tab?.id) {
            return;
        }

        try {
            const settings = await getCachedSettings();
            if (!settings.enableContextMenuTrigger) {
                return;
            }

            const selectedText = String(info.selectionText || "").trim();
            if (!selectedText) {
                return;
            }

            const opened = await tryOpenInPagePopup(tab, selectedText, info.frameId);
            if (!opened && tab?.id) {
                await notifyPageRestricted(tab.id, selectedText);
            }
        } catch (_error) {
            if (tab?.id && info?.selectionText) {
                await notifyPageRestricted(tab.id, String(info.selectionText).trim());
            }
        }
    });
}

async function getCachedSettings() {
    if (cachedSettings) {
        return cachedSettings;
    }
    if (!cachedSettingsPromise) {
        cachedSettingsPromise = getSettings()
            .then((settings) => {
                cachedSettings = settings;
                return settings;
            })
            .finally(() => {
                cachedSettingsPromise = null;
            });
    }
    return cachedSettingsPromise;
}

async function handleLookup(payload, sender = {}) {
    const settings = await getCachedSettings();
    const requestId = createRequestId();
    const { source, text, trigger, context, intent } = payload || {};

    if (!text || !text.trim()) {
        throw new Error(trigger === "manual" ? MANUAL_LOOKUP_EMPTY_MESSAGE : "No text selected.");
    }

    if (source === "dictionary") {
        const controller = registerController(sender?.tab?.id, "dictionary", requestId);
        const result = await lookupCombinedDictionary(text, settings, requestId, sender, controller.signal);
        return { ...result, requestId };
    }

    if (source === "ai") {
        if (!settings.enableAI) {
            throw new Error("AI provider is disabled in settings.");
        }
        const scope = `ai:${intent || "default"}`;
        registerController(sender?.tab?.id, scope, requestId);
        return runAiLookup(text, settings, {
            context,
            intent
        }, sender, scope, requestId);
    }

    throw new Error("Unknown source.");
}

async function runAiLookup(text, settings, options, sender, scope, requestId) {
    const tabId = sender?.tab?.id;
    const controller = getController(tabId, scope, requestId);
    try {
        return await lookupAiProvider(text, settings, {
            ...options,
            signal: controller?.signal
        });
    } finally {
        unregisterController(tabId, scope, requestId);
    }
}

async function lookupCombinedDictionary(text, settings, requestId, sender = {}, signal) {
    if (!settings.enableTranslate && !settings.enableDictionary) {
        throw new Error("Enable translation or dictionary lookup in settings.");
    }

    const dictionaryPromise = settings.enableDictionary
        ? lookupDictionary(text, settings, { signal })
        : Promise.resolve(null);
    const translationPromise = settings.enableTranslate
        ? lookupTranslation(text, settings, { signal })
        : null;

    let dictionary = null;
    let translation = null;
    let dictionaryError = null;
    let translationError = null;
    let translationOutcome = translationPromise ? null : { ok: true, value: null };

    if (translationPromise) {
        translationPromise.then(
            (value) => {
                translationOutcome = { ok: true, value };
            },
            (error) => {
                translationOutcome = { ok: false, error };
            }
        );
    }

    try {
        dictionary = await dictionaryPromise;
    } catch (error) {
        dictionaryError = error;
    }

    let settledTranslation = translationOutcome;
    if (!settledTranslation && !dictionary && translationPromise) {
        try {
            translation = await translationPromise;
            settledTranslation = { ok: true, value: translation };
        } catch (error) {
            translationError = error;
            settledTranslation = { ok: false, error };
        }
    } else if (settledTranslation) {
        if (settledTranslation.ok) {
            translation = settledTranslation.value;
        } else {
            translationError = settledTranslation.error;
        }
    }

    if (!dictionary && !translation) {
        throw dictionaryError || translationError || new Error("Lookup failed.");
    }

    const result = buildCombinedDictionaryResult(text, dictionary, translation);
    const phraseLike = classifyQuery(text) === "phrase" && isPhraseLike(text);
    const hasDefinitions = hasUsableDictionaryDefinitions(dictionary);
    // AI phrase fallback is scheduled non-blocking after the initial result so
    // multi-word lookups are not delayed by the AI round-trip.
    const needsPhraseFallback = phraseLike && !hasDefinitions && settings.enableAI && settings.enablePhraseFallback !== false;
    const primaryProviderId = dictionary?.providerId || settings.dictionaryProvider;
    const pendingTranslation = Boolean(translationPromise && !settledTranslation);

    scheduleDeferredDictionaryWork({
        needsPhraseFallback,
        text,
        settings,
        requestId,
        sender,
        initialResult: result,
        primaryProviderId,
        signal,
        pendingTranslation,
        translationPromise: pendingTranslation ? translationPromise : null
    });

    return result;
}

function buildCombinedDictionaryResult(text, dictionary, translation) {
    const sections = [];

    if (dictionary?.sections?.length) {
        sections.push(...dictionary.sections.map((section) => annotateSectionSource(section, dictionary.sourceBadges)));
    }

    if (!dictionary && translation) {
        sections.push({
            title: "Original",
            text
        });
    }

    if (translation) {
        sections.push({
            title: "Translation",
            kind: "translation",
            text: translation.translatedText || translation.title,
            meta: sourceBadgeLabel(translation.sourceBadges)
        });
    }

    if (!sections.length) {
        throw new Error("Lookup failed.");
    }

    const pronunciations = Array.isArray(dictionary?.pronunciations) && dictionary.pronunciations.length
        ? dictionary.pronunciations
        : dictionary?.pronunciation
            ? [dictionary.pronunciation]
            : [createSpeechPronunciation(text, { language: "" })];

    const sourceBadges = buildSourceBadges([
        dictionary
            ? {
                label: sourceBadgeLabel(dictionary.sourceBadges),
                kind: "dictionary",
                providerId: dictionary.providerId || ""
            }
            : null,
        translation
            ? {
                label: sourceBadgeLabel(translation.sourceBadges) || "Google Translate",
                kind: "translation",
                providerId: translation.providerId || "google"
            }
            : null
    ]);

    const sourceNames = new Set(
        sourceBadges
            .map((badge) => String(badge.label || "").trim().toLowerCase())
            .filter(Boolean)
    );
    const subtitle = [
        dictionary?.subtitle,
        translation?.subtitle
    ]
        .map((part) => String(part || "").trim())
        .filter(Boolean)
        // Avoid repeating source names already shown as title badges
        // (e.g. "Free Dictionary API" under badges that already list it).
        .filter((part) => !sourceNames.has(part.toLowerCase()))
        .join(" • ");

    return {
        title: text,
        subtitle,
        sourceBadges,
        pronunciation: pronunciations[0],
        pronunciations,
        sections,
        dictionaryProviderId: dictionary?.providerId || "",
        lemmaFallback: dictionary?.lemmaFallback || null,
        lexicalProfile: dictionary?.lexicalProfile || undefined,
        enriched: false
    };
}

function delayWithSignal(ms, signal) {
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

function scheduleDeferredDictionaryWork({
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

function mergeTranslationIntoResult(result, translation, originalText) {
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

function scheduleAiPhraseFallback({
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

function mergePhraseExplanation(result, phraseExplanation, originalText) {
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

    // If translation-only results previously inserted an "Original" placeholder
    // while waiting for AI, keep it; phrase sections are the primary content.
    if (!dictionarySections.length && trailingSections.some((section) => normalizeSectionKind(section) === "translation")) {
        // no-op — Original/Translation already in trailingSections
    }

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

async function scheduleDictionaryEnrichment({ text, settings, requestId, sender, initialResult, primaryProviderId, signal }) {
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

    const existing = enrichmentInFlight.get(cacheKey);
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
            enrichmentInFlight.delete(cacheKey);
            unregisterController(sender?.tab?.id, "dictionary", requestId);
        });

    enrichmentInFlight.set(cacheKey, work);

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

async function runDictionaryEnrichment({ text, settings, initialResult, primaryProviderId, signal }) {
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

function createRequestId() {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        return crypto.randomUUID();
    }
    return `req_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function buildEnrichmentCacheKey(text, settings, primaryProviderId, lemma) {
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

async function clearEnrichmentSessionCache() {
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

async function migrateEnrichmentCacheSchema() {
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

function getCachedEnrichment(cacheKey) {
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

async function getCachedEnrichmentAsync(cacheKey) {
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

function setCachedEnrichment(cacheKey, results) {
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

function cloneEnrichmentResults(results) {
    if (!Array.isArray(results)) {
        return null;
    }

    return results.map((result) => (result ? cloneLookupResult(result) : result));
}

async function publishLookupUpdate({ requestId, text, sender, result, revision }) {
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

function isPhraseLike(text) {
    const normalized = String(text || "").replace(/\s+/g, " ").trim();
    if (!normalized) {
        return false;
    }

    if (normalized.split(" ").length > 1) {
        return true;
    }

    return /[-']/.test(normalized) && normalized.length > 2;
}

function hasUsableDictionaryDefinitions(dictionary) {
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

let contextMenuInitPromise = null;

async function initializeContextMenu() {
    if (!chrome.contextMenus) {
        return;
    }

    if (contextMenuInitPromise) {
        return contextMenuInitPromise;
    }

    contextMenuInitPromise = (async () => {
        try {
            const settings = await getCachedSettings();

            await new Promise((resolve) => {
                chrome.contextMenus.removeAll(() => {
                    if (chrome.runtime.lastError) {
                        // Suppress removeAll error
                    }
                    resolve();
                });
            });

            if (!settings.enableContextMenuTrigger) {
                return;
            }

            await new Promise((resolve) => {
                chrome.contextMenus.create({
                    id: CONTEXT_MENU_ID,
                    title: 'Look up "%s"',
                    contexts: ["selection"]
                }, () => {
                    if (chrome.runtime.lastError) {
                        // Suppress duplicate ID warning if racing
                    }
                    resolve();
                });
            });
        } catch (_err) {
            // Best-effort
        } finally {
            contextMenuInitPromise = null;
        }
    })();

    return contextMenuInitPromise;
}

async function notifyPageRestricted(tabId, text) {
    try {
        if (chrome.action?.setBadgeText) {
            await chrome.action.setBadgeText({ text: "!", tabId });
            await chrome.action.setBadgeBackgroundColor({ color: "#8C2B2B", tabId });
            await chrome.action.setTitle({
                title: `Dictionary unavailable on this browser page for "${text.slice(0, 30)}"`,
                tabId
            });
        }
    } catch (_badgeError) {
        // Best-effort badge update.
    }
}

async function tryOpenInPagePopup(tab, text, frameId = 0) {
    if (!tab?.id || !canInjectIntoUrl(tab.url)) {
        return false;
    }

    const payload = { text: String(text || "").trim() };
    if (!payload.text) {
        return false;
    }

    const selectionFrameId = Number.isInteger(frameId) ? frameId : 0;
    if (selectionFrameId > 0) {
        try {
            const extracted = await sendMessageToTabWithRetry(tab.id, {
                type: "GET_PAGE_CONTEXT",
                payload: { text: payload.text }
            }, selectionFrameId);
            const context = String(extracted?.context || "").trim();
            if (context) {
                payload.context = context;
                payload.contextSource = "selection";
                payload.contextConfidence = "exact";
            }
        } catch (_contextError) {
            // Context is optional; still attempt to open the lookup surface.
        }
    }

    const frameCandidates = selectionFrameId > 0 ? [0, selectionFrameId] : [0];
    for (const candidate of frameCandidates) {
        try {
            await sendMessageToTabWithRetry(tab.id, {
                type: OPEN_LOOKUP_POPUP,
                payload
            }, candidate);
            return true;
        } catch (_error) {
            // Try the next visible or selection frame.
        }
    }

    return false;
}

async function sendMessageToTabWithRetry(tabId, message, frameId = 0) {
    const options = Number.isInteger(frameId) ? { frameId } : undefined;
    try {
        return await chrome.tabs.sendMessage(tabId, message, options);
    } catch (error) {
        if (!isMissingReceiverError(error)) {
            throw error;
        }

        await injectContentScript(tabId, frameId);
        return chrome.tabs.sendMessage(tabId, message, options);
    }
}

async function injectContentScript(tabId, frameId = 0) {
    const targets = [];

    if (frameId === null) {
        targets.push({ tabId, allFrames: true });
    } else if (Number.isInteger(frameId) && frameId > 0) {
        targets.push({ tabId, frameIds: [frameId] });
        targets.push({ tabId, allFrames: true });
    } else {
        targets.push({ tabId, frameIds: [0] });
    }

    let lastError = null;
    for (const target of targets) {
        try {
            await chrome.scripting.insertCSS({
                target,
                files: CONTENT_SCRIPT_CSS
            });
            await chrome.scripting.executeScript({
                target,
                files: CONTENT_SCRIPT_JS
            });
            return;
        } catch (error) {
            lastError = error;
        }
    }

    if (lastError) {
        throw lastError;
    }
}

function isMissingReceiverError(error) {
    const message = error?.message || String(error || "");
    return message.includes("Could not establish connection") || message.includes("Receiving end does not exist");
}

if (chrome.commands?.onCommand) {
    chrome.commands.onCommand.addListener(async (command) => {
        if (command !== "lookup-selection") {
            return;
        }

        const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
        if (!tab?.id || !canInjectIntoUrl(tab.url)) {
            return;
        }

        try {
            await sendMessageToTabWithRetry(tab.id, { type: OPEN_LOOKUP_POPUP, payload: { fromSelection: true } }, 0);
        } catch (_error) {
            // Restricted pages already surface via the toolbar badge path when possible.
        }
    });
}
