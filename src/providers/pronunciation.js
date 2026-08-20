export function createSpeechPronunciation(text, options = {}) {
    const audioUrl = String(options.audioUrl || "").trim();
    const language = String(options.language ?? "en-US").trim();
    const accent = language === "en-GB" ? "UK" : language === "en-US" ? "US" : "";
    const action = audioUrl ? "Listen" : "Speak";

    return {
        text: String(text || "").trim(),
        phonetic: String(options.phonetic || "").trim(),
        audioUrl,
        language,
        label: options.label || (accent ? `${action} (${accent})` : action),
        fallbackOnly: options.fallbackOnly ?? !audioUrl
    };
}
