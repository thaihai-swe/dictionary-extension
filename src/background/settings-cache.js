import { getSettings } from "../shared/storage.js";
import { validateDictionaryProvider } from "../providers/dictionary.js";
import { validateTranslationProvider } from "../providers/translate.js";
import { validateAiProvider } from "../providers/ai-provider.js";

let cachedSettings = null;
let cachedSettingsPromise = null;

export function invalidateCachedSettings() {
    cachedSettings = null;
    cachedSettingsPromise = null;
}

export async function getCachedSettings() {
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

export async function handleValidateProvider(payload = {}) {
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
