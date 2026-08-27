import { fetchWithRetry } from "../shared/fetch-utils.js";
import { resolveLanguageCode } from "../shared/languages.js";

export async function lookupGoogleTranslate(text, settings, options = {}) {
    const target = resolveLanguageCode(settings.translateTargetLanguage || "en");
    const url = new URL("https://translate.googleapis.com/translate_a/single");

    url.searchParams.set("client", "gtx");
    url.searchParams.set("sl", "auto");
    url.searchParams.set("tl", target);
    url.searchParams.set("dt", "t");
    url.searchParams.set("q", text);

    const response = await fetchWithRetry(url.toString(), { signal: options.signal }, {
        retries: 1,
        timeoutMs: 8000,
        retryStatuses: [429, 500, 502, 503, 504]
    });
    if (!response.ok) {
        throw new Error("Google Translate request failed.");
    }

    const data = await response.json();
    const translatedText = Array.isArray(data?.[0])
        ? data[0].map((item) => item[0]).join("")
        : "";
    const detectedLanguage = data?.[2] || "auto";

    return {
        title: translatedText || "No translation found",
        subtitle: `Detected: ${detectedLanguage} → ${target}`,
        sourceBadges: [{ label: "Google Translate", kind: "translation" }],
        translatedText,
        detectedLanguage,
        targetLanguage: target,
        sections: [
            {
                title: "Original",
                text
            }
        ]
    };
}

export async function validateGoogleTranslate(settings) {
    const startTime = Date.now();
    try {
        const result = await lookupGoogleTranslate("hello", {
            ...settings,
            translateTargetLanguage: "es"
        });

        const latencyMs = Date.now() - startTime;
        if (result.translatedText && result.translatedText.trim()) {
            return {
                ok: true,
                latencyMs,
                message: `Google Translate is connected (${latencyMs}ms).`
            };
        }
        return {
            ok: false,
            latencyMs,
            error: "No translation received from Google Translate."
        };
    } catch (error) {
        const latencyMs = Date.now() - startTime;
        return {
            ok: false,
            latencyMs,
            error: error?.message || "Google Translate connection failed."
        };
    }
}
