import { classifyQuery } from "../shared/query-utils.js";
import {
    annotateSectionSource,
    buildSourceBadges,
    sourceBadgeLabel
} from "../shared/enrichment.js";
import { lookupTranslation } from "../providers/translate.js";
import { lookupDictionary } from "../providers/dictionary.js";
import { lookupAiProvider } from "../providers/ai-provider.js";
import { createSpeechPronunciation } from "../providers/pronunciation.js";
import { getController, registerController, unregisterController } from "./request-controller.js";
import { getCachedSettings } from "./settings-cache.js";
import { scheduleDeferredDictionaryWork } from "./deferred-work.js";
import {
    createRequestId,
    hasUsableDictionaryDefinitions,
    isPhraseLike
} from "./enrichment-cache.js";

const MANUAL_LOOKUP_EMPTY_MESSAGE = "Enter a word or phrase to look up.";

export async function handleLookup(payload, sender = {}) {
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

export async function runAiLookup(text, settings, options, sender, scope, requestId) {
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

export async function lookupCombinedDictionary(text, settings, requestId, sender = {}, signal) {
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

export function buildCombinedDictionaryResult(text, dictionary, translation) {
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
