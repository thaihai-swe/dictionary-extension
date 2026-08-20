import { fetchWithRetry } from "../shared/fetch-utils.js";
import { normalizeDictionaryTerm } from "../shared/query-utils.js";
import { NotFoundError } from "./errors.js";
import { createSpeechPronunciation } from "./pronunciation.js";

const MAX_MEANINGS = 6;
const MAX_DEFINITIONS_PER_MEANING = 4;
const MAX_EXAMPLES = 8;
const MAX_SYNONYMS = 12;
const MAX_ANTONYMS = 12;
const MAX_PHONETICS = 4;

export async function lookupFreeDictionary(text, _settings, options = {}) {
    const term = normalizeDictionaryTerm(text);
    const url = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(term)}`;
    const response = await fetchWithRetry(url.toString(), { signal: options.signal }, {
        retries: 1,
        retryStatuses: [429, 500, 502, 503, 504]
    });

    if (response.status === 404) {
        throw new NotFoundError(`No dictionary entry found for "${term}".`);
    }

    if (!response.ok) {
        throw new Error("Dictionary lookup failed. Try a single English word.");
    }

    const data = await response.json();
    const entry = Array.isArray(data) ? data[0] : null;

    if (!entry) {
        throw new NotFoundError(`No dictionary entry found for "${term}".`);
    }

    const meanings = Array.isArray(entry.meanings) ? entry.meanings.slice(0, MAX_MEANINGS) : [];
    const sections = [];
    const examples = [];
    const synonyms = new Set();
    const antonyms = new Set();

    for (const meaning of meanings) {
        const partOfSpeech = meaning.partOfSpeech || "Meaning";
        const definitions = Array.isArray(meaning.definitions)
            ? meaning.definitions.slice(0, MAX_DEFINITIONS_PER_MEANING)
            : [];

        const definitionItems = definitions
            .map((definition) => String(definition?.definition || "").trim())
            .filter(Boolean);

        if (definitionItems.length) {
            sections.push({
                title: partOfSpeech,
                kind: "definitions",
                items: definitionItems
            });
        }

        for (const definition of definitions) {
            const example = String(definition?.example || "").trim();
            if (example && examples.length < MAX_EXAMPLES) {
                examples.push(example);
            }

            collectTerms(synonyms, definition?.synonyms, MAX_SYNONYMS);
            collectTerms(antonyms, definition?.antonyms, MAX_ANTONYMS);
        }

        collectTerms(synonyms, meaning?.synonyms, MAX_SYNONYMS);
        collectTerms(antonyms, meaning?.antonyms, MAX_ANTONYMS);
    }

    if (examples.length) {
        sections.push({
            title: "Examples",
            kind: "examples",
            items: examples
        });
    }

    if (synonyms.size) {
        sections.push({
            title: "Synonyms",
            kind: "synonyms",
            items: Array.from(synonyms)
        });
    }

    if (antonyms.size) {
        sections.push({
            title: "Antonyms",
            kind: "antonyms",
            items: Array.from(antonyms)
        });
    }

    if (!sections.length) {
        sections.push({
            title: "Definitions",
            kind: "definitions",
            text: "No definitions available for this word."
        });
    }

    const pronunciations = getPronunciations(entry, term);
    const primaryPronunciation = pronunciations[0] || createSpeechPronunciation(term);

    return {
        title: entry.word || term,
        subtitle: "",
        sourceBadges: [{ label: "Free Dictionary API", kind: "dictionary" }],
        pronunciation: primaryPronunciation,
        pronunciations,
        sections
    };
}

function collectTerms(target, values, limit) {
    if (!Array.isArray(values) || target.size >= limit) {
        return;
    }

    for (const value of values) {
        const term = String(value || "").trim();
        if (!term) {
            continue;
        }

        target.add(term);
        if (target.size >= limit) {
            break;
        }
    }
}

function getPronunciations(entry, fallbackText) {
    const phonetics = Array.isArray(entry?.phonetics) ? entry.phonetics : [];
    const accents = {
        "en-US": createEmptyAccentSlot(),
        "en-GB": createEmptyAccentSlot()
    };
    const unassignedTexts = [];
    const unassignedAudios = [];

    for (const item of phonetics.slice(0, MAX_PHONETICS * 2)) {
        const phonetic = normalizePhoneticDisplay(item?.text);
        const audioUrl = String(item?.audio || "").trim();
        if (!phonetic && !audioUrl) {
            continue;
        }

        const language = inferLanguageFromAudio(audioUrl) || inferLanguageFromPhonetic(phonetic);
        if (language && accents[language]) {
            mergeAccentSlot(accents[language], phonetic, audioUrl);
            continue;
        }

        if (phonetic) {
            unassignedTexts.push(phonetic);
        }
        if (audioUrl) {
            unassignedAudios.push(audioUrl);
        }
    }

    for (const phonetic of unassignedTexts) {
        const preferred = !accents["en-US"].phonetic
            ? "en-US"
            : !accents["en-GB"].phonetic
                ? "en-GB"
                : "";
        if (!preferred) {
            break;
        }
        mergeAccentSlot(accents[preferred], phonetic, "");
    }

    for (const audioUrl of unassignedAudios) {
        const preferred = !accents["en-US"].audioUrl
            ? "en-US"
            : !accents["en-GB"].audioUrl
                ? "en-GB"
                : "";
        if (!preferred) {
            break;
        }
        mergeAccentSlot(accents[preferred], "", audioUrl);
    }

    const sharedPhonetic = accents["en-US"].phonetic || accents["en-GB"].phonetic;
    if (sharedPhonetic) {
        if (accents["en-US"].audioUrl && !accents["en-US"].phonetic) {
            accents["en-US"].phonetic = sharedPhonetic;
        }
        if (accents["en-GB"].audioUrl && !accents["en-GB"].phonetic) {
            accents["en-GB"].phonetic = sharedPhonetic;
        }
    }

    const word = entry?.word || fallbackText;
    const pronunciations = ["en-US", "en-GB"]
        .map((language) => {
            const slot = accents[language];
            if (!slot.phonetic && !slot.audioUrl) {
                return null;
            }
            return {
                text: word,
                phonetic: slot.phonetic,
                audioUrl: slot.audioUrl,
                language,
                label: buildPronunciationLabel(language, slot.audioUrl),
                fallbackOnly: !slot.audioUrl
            };
        })
        .filter(Boolean)
        .slice(0, MAX_PHONETICS);

    if (!pronunciations.length) {
        const fallbackPhonetic = normalizePhoneticDisplay(entry?.phonetic);
        pronunciations.push({
            text: word,
            phonetic: fallbackPhonetic,
            audioUrl: "",
            language: "en-US",
            label: buildPronunciationLabel("en-US", ""),
            fallbackOnly: true
        });
    }

    return pronunciations;
}

function createEmptyAccentSlot() {
    return {
        phonetic: "",
        audioUrl: ""
    };
}

function mergeAccentSlot(slot, phonetic, audioUrl) {
    if (phonetic && !slot.phonetic) {
        slot.phonetic = phonetic;
    }
    if (audioUrl && !slot.audioUrl) {
        slot.audioUrl = audioUrl;
    }
}

function normalizePhoneticDisplay(value) {
    return String(value || "").trim().replace(/\s+/g, " ");
}

function buildPronunciationLabel(language, audioUrl) {
    const accent = language === "en-GB" ? "UK" : language === "en-US" ? "US" : "";
    const action = audioUrl ? "Listen" : "Speak";
    return accent ? `${action} (${accent})` : action;
}

function inferLanguageFromPhonetic(phonetic) {
    const value = normalizePhoneticDisplay(phonetic).toLowerCase();
    if (!value) {
        return "";
    }

    if (/[ɚɝ]/.test(value) || value.includes("oʊ") || value.includes("ɑɹ") || value.includes("ɔɹ") || value.includes("ɛɹ")) {
        return "en-US";
    }

    if (/[ɒ]/.test(value) || value.includes("əʊ") || value.includes("ɪə") || value.includes("eə") || value.includes("ʊə") || value.includes("aɪə")) {
        return "en-GB";
    }

    return "";
}

function inferLanguageFromAudio(audioUrl) {
    const value = String(audioUrl || "").toLowerCase();
    if (!value) {
        return "";
    }
    if (value.includes("-uk") || value.includes("_uk") || value.includes("uk.mp3")) {
        return "en-GB";
    }
    if (value.includes("-us") || value.includes("_us") || value.includes("us.mp3")) {
        return "en-US";
    }
    return "";
}
