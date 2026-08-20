import { getSettings, migrateLegacySecretSettings, migrateSettingsSchema } from "./shared/storage.js";
import { classifyQuery, mergeLexicalProfiles } from "./shared/query-utils.js";
import {
    LOOKUP_TEXT,
    LOOKUP_UPDATE,
    OPEN_LOOKUP_POPUP,
    VALIDATE_PROVIDER,
    CANCEL_LOOKUP
} from "./shared/messages.js";
import { lookupTranslation, validateTranslationProvider } from "./providers/translate.js";
import { lookupDictionary, lookupDictionaryEnrichment, validateDictionaryProvider } from "./providers/dictionary.js";
import { lookupAiProvider, validateAiProvider } from "./providers/ai-provider.js";
import { createSpeechPronunciation } from "./providers/pronunciation.js";
import { canInjectIntoUrl } from "./shared/page-utils.js";

const CONTENT_SCRIPT_JS = [
    "src/ui/renderer.js",
    "src/ui/audio.js",
    "src/ui/popup-shell.js",
    "src/shared/cache.js",
    "src/shared/popup-helpers.js",
    "src/content/popup-position.js",
    "src/content/state.js",
    "src/content/context.js",
    "src/content/icons.js",
    "src/content/selection.js",
    "src/content/lookup-bridge.js",
    "src/content/trigger.js",
    "src/content/settings-bridge.js",
    "src/content.js"
];
const CONTENT_SCRIPT_CSS = ["src/ui/popup.css"];

const CONTEXT_MENU_ID = "dictionary-helper-lookup";
const MANUAL_LOOKUP_EMPTY_MESSAGE = "Enter a word or phrase to look up.";
const ENRICHED_CACHE_TTL_MS = 10 * 60 * 1000;
const ENRICHED_CACHE_MAX = 20;
const ENRICHMENT_CACHE_SCHEMA_VERSION = 2;
const ENRICHMENT_CACHE_SCHEMA_KEY = "dictionaryHelperEnrichmentCacheSchemaVersion";
const MAX_DEFINITIONS_SECTIONS = 2;
const MAX_EXAMPLES_SECTIONS = 2;
const MAX_SYNONYM_SECTIONS = 1;
const MAX_ANTONYM_SECTIONS = 1;
const MAX_PRONUNCIATIONS = 4;
const MAX_ITEMS_PER_SECTION = 8;

const enrichedCache = new Map();
const enrichmentInFlight = new Map();
const activeControllers = new Map();

function getRequestKey(tabId, requestId) {
    return `${tabId || "global"}:${requestId}`;
}

function registerController(tabId, requestId) {
    const controller = new AbortController();
    const key = getRequestKey(tabId, requestId);
    // A newer lookup supersedes every request for this tab, including phase-one
    // dictionary/translation work and lazy enrichment.
    cancelRequestsForTab(tabId);
    activeControllers.set(key, controller);
    return controller;
}

function getController(tabId, requestId) {
    return activeControllers.get(getRequestKey(tabId, requestId)) || null;
}

function unregisterController(tabId, requestId) {
    const key = getRequestKey(tabId, requestId);
    activeControllers.delete(key);
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
    const settings = providedSettings || (await getSettings());

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
            const settings = await getSettings();
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

async function handleLookup(payload, sender = {}) {
    const settings = await getSettings();
    const requestId = createRequestId();
    const { source, text, trigger, context, intent } = payload || {};

    if (!text || !text.trim()) {
        throw new Error(trigger === "manual" ? MANUAL_LOOKUP_EMPTY_MESSAGE : "No text selected.");
    }

    if (source === "dictionary") {
        const controller = registerController(sender?.tab?.id, requestId);
        const result = await lookupCombinedDictionary(text, settings, requestId, sender, controller.signal);
        return { ...result, requestId };
    }

    if (source === "ai") {
        if (!settings.enableAI) {
            throw new Error("AI provider is disabled in settings.");
        }
        registerController(sender?.tab?.id, requestId);
        return runAiLookup(text, settings, {
            context,
            intent
        }, sender, requestId);
    }

    throw new Error("Unknown source.");
}

async function runAiLookup(text, settings, options, sender, requestId) {
    const tabId = sender?.tab?.id;
    const controller = getController(tabId, requestId);
    try {
        return await lookupAiProvider(text, settings, {
            ...options,
            signal: controller?.signal
        });
    } finally {
        unregisterController(tabId, requestId);
    }
}

async function lookupCombinedDictionary(text, settings, requestId, sender = {}, signal) {
    if (!settings.enableTranslate && !settings.enableDictionary) {
        throw new Error("Enable translation or dictionary lookup in settings.");
    }

    const [translateResult, dictionaryResult] = await Promise.allSettled([
        settings.enableTranslate ? lookupTranslation(text, settings, { signal }) : Promise.resolve(null),
        settings.enableDictionary ? lookupDictionary(text, settings, { signal }) : Promise.resolve(null)
    ]);

    const translation = translateResult.status === "fulfilled" ? translateResult.value : null;
    const dictionary = dictionaryResult.status === "fulfilled" ? dictionaryResult.value : null;

    if (!translation && !dictionary) {
        const messages = [translateResult, dictionaryResult]
            .filter((result) => result.status === "rejected")
            .map((result) => result.reason?.message)
            .filter(Boolean);

        throw new Error(messages[0] || "Lookup failed.");
    }

    const sections = [];
    const phraseLike = classifyQuery(text) === "phrase" && isPhraseLike(text);
    const hasDefinitions = hasUsableDictionaryDefinitions(dictionary);
    // AI phrase fallback is scheduled non-blocking after the initial result so
    // multi-word lookups are not delayed by the AI round-trip.
    const needsPhraseFallback = phraseLike && !hasDefinitions && settings.enableAI;

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

    const result = {
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

    const primaryProviderId = dictionary?.providerId || settings.dictionaryProvider;

    if (needsPhraseFallback) {
        // Phrase AI first, then dictionary enrichment from the phrase-merged
        // result so LOOKUP_UPDATE payloads remain cumulative.
        scheduleAiPhraseFallback({
            text,
            settings,
            requestId,
            sender,
            initialResult: result,
            thenEnrich: settings.enableDictionary,
            primaryProviderId,
            signal
        });
    } else if (settings.enableDictionary) {
        scheduleDictionaryEnrichment({
            text,
            settings,
            requestId,
            sender,
            initialResult: result,
            primaryProviderId,
            signal
        });
    } else {
        unregisterController(sender?.tab?.id, requestId);
    }

    return result;
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
                    }
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
                }
            });
        }
        unregisterController(sender?.tab?.id, requestId);
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
                    }
                });
            })
            .catch(() => { })
            .finally(() => {
                unregisterController(sender?.tab?.id, requestId);
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
            unregisterController(sender?.tab?.id, requestId);
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
                }
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

function mergeDictionaryEnrichment(initialResult, enrichmentResults) {
    if (!Array.isArray(enrichmentResults) || !enrichmentResults.length) {
        return null;
    }

    const base = cloneLookupResult(initialResult);
    const badges = Array.isArray(base.sourceBadges) ? [...base.sourceBadges] : [];
    const sections = Array.isArray(base.sections) ? [...base.sections] : [];
    let pronunciations = Array.isArray(base.pronunciations) && base.pronunciations.length
        ? [...base.pronunciations]
        : base.pronunciation
            ? [base.pronunciation]
            : [];

    let contributed = false;

    for (const providerResult of enrichmentResults) {
        if (!providerResult) {
            continue;
        }

        const providerLabel = sourceBadgeLabel(providerResult.sourceBadges) || providerResult.providerId;
        const beforeCount = sections.length;
        const beforePronunciations = pronunciations.length;

        mergeProviderSections(sections, providerResult.sections || [], providerLabel);

        const nextPronunciations = Array.isArray(providerResult.pronunciations) && providerResult.pronunciations.length
            ? providerResult.pronunciations
            : providerResult.pronunciation
                ? [providerResult.pronunciation]
                : [];
        pronunciations = mergePronunciations(pronunciations, nextPronunciations);

        const addedContent = sections.length > beforeCount || pronunciations.length > beforePronunciations;
        // A successful provider is useful attribution even when its content
        // duplicates data already supplied by an earlier provider.
        contributed = true;
        badges.push({
            label: providerLabel,
            kind: "dictionary",
            providerId: providerResult.providerId || ""
        });

        if (!addedContent) {
            continue;
        }
    }

    if (!contributed) {
        return null;
    }

    let mergedLexicalProfile = base.lexicalProfile || null;
    for (const providerResult of enrichmentResults) {
        if (providerResult?.lexicalProfile) {
            mergedLexicalProfile = mergeLexicalProfiles(mergedLexicalProfile, providerResult.lexicalProfile);
        }
    }

    const sourceBadges = buildSourceBadges(badges);
    return {
        ...base,
        sourceBadges,
        pronunciation: pronunciations[0] || base.pronunciation,
        pronunciations,
        sections,
        lexicalProfile: mergedLexicalProfile || undefined,
        enriched: true
    };
}

function mergeProviderSections(targetSections, incomingSections, providerLabel) {
    for (const section of incomingSections || []) {
        const kind = normalizeSectionKind(section);
        if (kind === "translation") {
            continue;
        }

        const annotated = annotateSectionSource(section, providerLabel);
        const existing = targetSections.find((item) => {
            return normalizeSectionKind(item) === kind
                && normalizeSectionTitle(item) === normalizeSectionTitle(annotated);
        });

        if (existing) {
            if (mergeSectionContent(existing, annotated, providerLabel)) {
                continue;
            }
        }

        if (!canAddSectionOfKind(targetSections, kind)) {
            // Try to merge into any same-kind section when the cap is already hit.
            const sameKind = targetSections.find((item) => normalizeSectionKind(item) === kind);
            if (sameKind && mergeSectionContent(sameKind, annotated, providerLabel)) {
                continue;
            }
            continue;
        }

        targetSections.push(annotated);
    }
}

function mergeSectionContent(target, incoming, providerLabel) {
    let changed = false;

    if (Array.isArray(incoming.items) && incoming.items.length) {
        if (!Array.isArray(target.items)) {
            target.items = [];
        }

        for (const item of incoming.items) {
            const value = String(item || "").trim();
            if (!value) {
                continue;
            }
            if (target.items.some((existing) => normalizeComparableText(existing) === normalizeComparableText(value))) {
                continue;
            }
            if (target.items.length >= MAX_ITEMS_PER_SECTION) {
                break;
            }
            target.items.push(value);
            changed = true;
        }
    }

    const incomingText = String(incoming.text || "").trim();
    if (incomingText) {
        const targetText = String(target.text || "").trim();
        if (!targetText) {
            target.text = incomingText;
            changed = true;
        } else if (normalizeComparableText(targetText) !== normalizeComparableText(incomingText)
            && !targetText.includes(incomingText)
            && String(target.text || "").length < 600) {
            target.text = `${targetText}\n\n${incomingText}`;
            changed = true;
        }
    }

    if (changed) {
        target.meta = joinMetaLabels(target.meta, providerLabel || incoming.meta);
    }

    return changed;
}

function mergePronunciations(existing, incoming) {
    const merged = Array.isArray(existing)
        ? existing.map((entry) => (entry ? { ...entry } : entry))
        : [];

    for (const item of incoming || []) {
        if (!item) {
            continue;
        }

        const phonetic = String(item.phonetic || "").trim();
        const audioUrl = String(item.audioUrl || "").trim();
        const language = String(item.language || "").trim();

        // Prefer filling empty IPA / audio on an existing accent slot over
        // appending another Speak button with no phonetic text.
        if (language || phonetic || audioUrl) {
            const matchIndex = merged.findIndex((entry) => {
                if (!entry) {
                    return false;
                }
                const entryLanguage = String(entry.language || "").trim();
                if (language && entryLanguage) {
                    return entryLanguage === language;
                }
                // Speech-only fallback (empty language / empty phonetic) can
                // accept the first real phonetic we get from enrichment.
                const entryPhonetic = String(entry.phonetic || "").trim();
                const entryAudio = String(entry.audioUrl || "").trim();
                return !entryPhonetic && (!entryAudio || !audioUrl || entryAudio === audioUrl);
            });

            if (matchIndex >= 0) {
                const current = merged[matchIndex];
                const next = { ...current };
                let changed = false;

                if (phonetic && !String(next.phonetic || "").trim()) {
                    next.phonetic = phonetic;
                    changed = true;
                }
                if (audioUrl && !String(next.audioUrl || "").trim()) {
                    next.audioUrl = audioUrl;
                    changed = true;
                }
                if (language && !String(next.language || "").trim()) {
                    next.language = language;
                    changed = true;
                }
                if (changed) {
                    if (next.audioUrl && next.fallbackOnly) {
                        next.fallbackOnly = false;
                    }
                    if (!next.label || next.label === "Speak") {
                        next.label = item.label || next.label || (next.audioUrl ? "Listen" : "Speak");
                    }
                    merged[matchIndex] = next;
                }

                // If this incoming entry only backfilled an existing slot, skip append.
                const sameIdentity =
                    language
                    && String(current.language || "").trim() === language
                    && (
                        !phonetic
                        || normalizeComparableText(current.phonetic) === normalizeComparableText(phonetic)
                        || !String(current.phonetic || "").trim()
                    );
                if (sameIdentity || (!phonetic && !audioUrl)) {
                    continue;
                }
                // If we already have this language with a phonetic, don't add a duplicate accent.
                if (
                    language
                    && merged.some((entry, index) => (
                        index !== matchIndex
                        && String(entry?.language || "").trim() === language
                        && normalizeComparableText(entry?.phonetic) === normalizeComparableText(phonetic)
                    ))
                ) {
                    continue;
                }
            }
        }

        const key = `${language}|${normalizeComparableText(phonetic)}|${audioUrl}`;
        const alreadyPresent = merged.some((entry) => {
            const entryKey = `${String(entry.language || "").trim()}|${normalizeComparableText(entry.phonetic)}|${String(entry.audioUrl || "").trim()}`;
            return entryKey === key;
        });
        if (alreadyPresent) {
            continue;
        }
        // Also skip near-duplicates that only differ by empty fields.
        if (language && phonetic) {
            const accentDuplicate = merged.some((entry) => (
                String(entry?.language || "").trim() === language
                && normalizeComparableText(entry?.phonetic) === normalizeComparableText(phonetic)
            ));
            if (accentDuplicate) {
                continue;
            }
        }
        if (merged.length >= MAX_PRONUNCIATIONS) {
            break;
        }
        merged.push({ ...item, phonetic, audioUrl, language });
    }

    return preferPhoneticPronunciations(merged);
}

function preferPhoneticPronunciations(pronunciations) {
    if (!Array.isArray(pronunciations) || pronunciations.length < 2) {
        return pronunciations;
    }

    // Surface entries that actually have IPA text first so the title row shows
    // phonetic transcription instead of a bare Speak button when available.
    return [...pronunciations].sort((a, b) => {
        const aScore = (String(a?.phonetic || "").trim() ? 2 : 0) + (String(a?.audioUrl || "").trim() ? 1 : 0);
        const bScore = (String(b?.phonetic || "").trim() ? 2 : 0) + (String(b?.audioUrl || "").trim() ? 1 : 0);
        return bScore - aScore;
    });
}

function canAddSectionOfKind(sections, kind) {
    const count = sections.filter((section) => normalizeSectionKind(section) === kind).length;
    if (kind === "definitions") {
        return count < MAX_DEFINITIONS_SECTIONS;
    }
    if (kind === "examples") {
        return count < MAX_EXAMPLES_SECTIONS;
    }
    if (kind === "synonyms") {
        return count < MAX_SYNONYM_SECTIONS;
    }
    if (kind === "antonyms") {
        return count < MAX_ANTONYM_SECTIONS;
    }
    if (kind === "translation") {
        return count < 1;
    }
    return count < 1;
}

function annotateSectionSource(section, sourceBadges) {
    const next = {
        ...section,
        items: Array.isArray(section?.items) ? [...section.items] : section?.items
    };
    const label = sourceBadgeLabel(sourceBadges);
    if (label && !String(next.meta || "").trim()) {
        next.meta = label;
    }
    return next;
}

function sourceBadgeLabel(sourceBadges) {
    return Array.isArray(sourceBadges)
        ? String(sourceBadges[0]?.label || "").trim()
        : "";
}

function joinMetaLabels(...labels) {
    const parts = [];
    for (const label of labels) {
        for (const piece of String(label || "").split(/[+•|,]/)) {
            const value = piece.trim();
            if (!value) {
                continue;
            }
            if (!parts.some((existing) => existing.toLowerCase() === value.toLowerCase())) {
                parts.push(value);
            }
        }
    }
    return parts.join(" + ");
}

function normalizeSectionKind(section) {
    const explicit = String(section?.kind || "").trim().toLowerCase();
    if (explicit) {
        return explicit;
    }
    const title = String(section?.title || "").trim().toLowerCase();
    if (title.includes("translation")) return "translation";
    if (title.includes("example")) return "examples";
    if (title.includes("synonym")) return "synonyms";
    if (title.includes("antonym")) return "antonyms";
    if (title.includes("definition") || title.includes("meaning") || !title) return "definitions";
    return title.replace(/[^a-z0-9]+/g, "-") || "general";
}

function normalizeSectionTitle(section) {
    return String(section?.title || "").trim().toLowerCase();
}

function normalizeComparableText(value) {
    return String(value || "")
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s]/gu, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function buildSourceBadges(badges) {
    const result = [];
    const seen = new Set();

    for (const badge of badges || []) {
        if (!badge) {
            continue;
        }
        const label = String(badge.label || "").trim();
        if (!label) {
            continue;
        }
        const key = label.toLowerCase();
        if (seen.has(key)) {
            continue;
        }
        seen.add(key);
        result.push({
            label,
            kind: String(badge.kind || "default").trim() || "default",
            providerId: String(badge.providerId || "").trim()
        });
    }

    return result;
}

function cloneLookupResult(result) {
    return {
        ...result,
        sourceBadges: Array.isArray(result?.sourceBadges)
            ? result.sourceBadges.map((badge) => ({ ...badge }))
            : [],
        pronunciations: Array.isArray(result?.pronunciations)
            ? result.pronunciations.map((item) => ({ ...item }))
            : [],
        sections: Array.isArray(result?.sections)
            ? result.sections.map((section) => ({
                ...section,
                items: Array.isArray(section?.items) ? [...section.items] : section?.items
            }))
            : []
    };
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

async function publishLookupUpdate({ requestId, text, sender, result }) {
    const message = {
        type: LOOKUP_UPDATE,
        payload: {
            requestId,
            text: String(text || "").trim(),
            source: "dictionary",
            revision: result?.enriched ? 1 : 0,
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

async function initializeContextMenu() {
    if (!chrome.contextMenus) {
        return;
    }

    const settings = await getSettings();

    await chrome.contextMenus.removeAll();
    if (!settings.enableContextMenuTrigger) {
        return;
    }

    chrome.contextMenus.create({
        id: CONTEXT_MENU_ID,
        title: 'Look up "%s"',
        contexts: ["selection"]
    });
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
        targets.push({ tabId, allFrames: true });
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
