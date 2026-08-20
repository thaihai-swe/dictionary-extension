import { lookupGoogleTranslate, validateGoogleTranslate } from "./google-translate.js";
import { lookupLibreTranslate, validateLibreTranslate } from "./libre-translate.js";

const TRANSLATION_PROVIDERS = {
    google: {
        id: "google",
        label: "Google Translate",
        lookup: lookupGoogleTranslate,
        validate: validateGoogleTranslate
    },
    libretranslate: {
        id: "libretranslate",
        label: "LibreTranslate",
        lookup: lookupLibreTranslate,
        validate: validateLibreTranslate
    }
};

export const DEFAULT_TRANSLATION_PROVIDER = "google";

export async function lookupTranslation(text, settings, options = {}) {
    const providerId = normalizeTranslationProviderId(settings?.translateProvider);
    const provider = TRANSLATION_PROVIDERS[providerId];

    if (!provider) {
        throw new Error(`Unsupported translation provider: "${providerId}".`);
    }

    const result = await provider.lookup(text, settings, options);
    return normalizeTranslationResult(result, provider, settings);
}

export function normalizeTranslationProviderId(value) {
    const normalized = String(value || DEFAULT_TRANSLATION_PROVIDER).trim().toLowerCase();
    if (TRANSLATION_PROVIDERS[normalized]) {
        return normalized;
    }
    return DEFAULT_TRANSLATION_PROVIDER;
}

/**
 * Validate a translation provider connection.
 * @param {string} providerId
 * @param {object} settings
 * @returns {Promise<{ok: boolean, error?: string}>}
 */
export async function validateTranslationProvider(providerId, settings) {
    const id = normalizeTranslationProviderId(providerId);
    const provider = TRANSLATION_PROVIDERS[id];

    if (!provider) {
        return { ok: false, error: `Unknown provider: ${providerId}` };
    }

    if (typeof provider.validate === "function") {
        return provider.validate(settings);
    }

    return { ok: false, error: `Provider ${providerId} does not support validation.` };
}

function normalizeTranslationResult(result, provider, settings) {
    const translatedText = String(
        result?.translatedText ||
        result?.title ||
        ""
    ).trim();
    const detectedLanguage = String(result?.detectedLanguage || "auto").trim() || "auto";
    const targetLanguage = String(
        result?.targetLanguage ||
        settings?.translateTargetLanguage ||
        "en"
    ).trim() || "en";
    const sourceBadges = Array.isArray(result?.sourceBadges) && result.sourceBadges.length
        ? result.sourceBadges
        : [{ label: provider.label, kind: "translation" }];
    const subtitle = result?.subtitle || `Detected: ${detectedLanguage} → ${targetLanguage}`;
    const sections = Array.isArray(result?.sections) ? result.sections : [];
    const hasOriginal = sections.some((section) => String(section?.title || "").trim().toLowerCase() === "original");

    return {
        title: translatedText || "No translation found",
        subtitle,
        sourceBadges,
        translatedText,
        detectedLanguage,
        targetLanguage,
        providerId: provider.id,
        sections: hasOriginal ? sections : [{ title: "Original", text: String(result?.originalText || "") }, ...sections]
    };
}
