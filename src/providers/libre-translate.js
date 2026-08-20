import { fetchWithRetry } from "../shared/fetch-utils.js";
import { resolveLanguageCode } from "../shared/languages.js";

export async function lookupLibreTranslate(text, settings, options = {}) {
    const target = resolveLanguageCode(settings.translateTargetLanguage || "en");
    const rawBaseUrl = String(settings.libreTranslateBaseUrl || "https://libretranslate.com").trim();

    let parsedUrl;
    try {
        parsedUrl = new URL(rawBaseUrl);
    } catch (_error) {
        throw new Error(`Invalid LibreTranslate base URL: "${rawBaseUrl}".`);
    }

    let urlString = parsedUrl.toString().replace(/\/+$/, "");
    if (!urlString.endsWith("/translate")) {
        urlString += "/translate";
    }

    const apiKey = settings.libreTranslateApiKey || "";

    const payload = {
        q: text,
        source: "auto",
        target: target,
        format: "text",
        api_key: apiKey || undefined
    };

    const requestOptions = {
        method: "POST",
        signal: options.signal,
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
    };

    const response = await fetchWithRetry(urlString, requestOptions, { retries: 1, retryStatuses: [429, 500, 502, 503, 504] });
    if (!response.ok) {
        throw new Error(`LibreTranslate request failed: ${response.status}`);
    }

    const data = await response.json();
    const translatedText = data.translatedText || data[0]?.translatedText || "";
    const detectedLanguage = data.detectedLanguage || "auto";

    return {
        title: translatedText || "No translation found",
        subtitle: `Detected: ${detectedLanguage} → ${target}`,
        sourceBadges: [{ label: "LibreTranslate", kind: "translation" }],
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

export async function validateLibreTranslate(settings) {
    const startTime = Date.now();
    try {
        const result = await lookupLibreTranslate("hello", {
            ...settings,
            translateTargetLanguage: "es"
        });
        const latencyMs = Date.now() - startTime;
        if (result.translatedText && result.translatedText.trim()) {
            return { ok: true, latencyMs, message: `LibreTranslate is connected (${latencyMs}ms).` };
        }
        return { ok: false, latencyMs, error: "No translation received from LibreTranslate." };
    } catch (error) {
        const latencyMs = Date.now() - startTime;
        const message = error?.message || "LibreTranslate connection failed.";
        return {
            ok: false,
            latencyMs,
            error: message.includes("401") ? "401: Invalid API key" : message.includes("429") ? "429: Rate limit exceeded" : message
        };
    }
}
