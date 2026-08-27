import { fetchWithRetry } from "../shared/fetch-utils.js";
import { normalizeDictionaryTerm } from "../shared/query-utils.js";
import { NotFoundError } from "./errors.js";

const MAX_DEFINITIONS_PER_POS = 4;
const MAX_POS_GROUPS = 4;
const MAX_EXAMPLES = 6;
const MAX_RELATED = 8;
const WORDNIK_BASE = "https://api.wordnik.com/v4";

export async function lookupWordnik(text, settings, options = {}) {
    const term = normalizeDictionaryTerm(text);
    if (!term) {
        throw new Error("No text provided for Wordnik lookup.");
    }

    const apiKey = String(settings?.wordnikApiKey || "").trim();
    if (!apiKey) {
        throw new Error("Wordnik API key is required. Add it in Settings → Dictionary provider (free key from developer.wordnik.com).");
    }

    const encoded = encodeURIComponent(term);
    const keyParam = `api_key=${encodeURIComponent(apiKey)}`;

    const [definitionsResult, examplesResult, pronunciationsResult, audioResult, relatedResult] = await Promise.all([
        fetchWordnikJson(`${WORDNIK_BASE}/word.json/${encoded}/definitions?limit=12&includeRelated=false&useCanonical=true&includeTags=false&${keyParam}`, { signal: options.signal }),
        fetchWordnikJson(`${WORDNIK_BASE}/word.json/${encoded}/examples?limit=5&useCanonical=true&${keyParam}`, { allowEmpty: true, signal: options.signal }),
        fetchWordnikJson(`${WORDNIK_BASE}/word.json/${encoded}/pronunciations?limit=5&useCanonical=true&${keyParam}`, { allowEmpty: true, signal: options.signal }),
        fetchWordnikJson(`${WORDNIK_BASE}/word.json/${encoded}/audio?limit=2&useCanonical=true&${keyParam}`, { allowEmpty: true, signal: options.signal }),
        fetchWordnikJson(`${WORDNIK_BASE}/word.json/${encoded}/relatedWords?relationshipTypes=synonym,antonym&limitPerRelationshipType=${MAX_RELATED}&useCanonical=true&${keyParam}`, { allowEmpty: true, signal: options.signal })
    ]);

    const definitions = Array.isArray(definitionsResult) ? definitionsResult : [];
    if (!definitions.length) {
        throw new NotFoundError(`No Wordnik entry found for "${term}".`);
    }

    const sections = [];
    const byPos = new Map();

    for (const item of definitions) {
        const textValue = String(item?.text || "").replace(/<[^>]+>/g, "").trim();
        if (!textValue) {
            continue;
        }
        const pos = String(item?.partOfSpeech || "Definition").trim() || "Definition";
        if (!byPos.has(pos)) {
            byPos.set(pos, []);
        }
        const bucket = byPos.get(pos);
        if (bucket.length < MAX_DEFINITIONS_PER_POS) {
            bucket.push(textValue);
        }
    }

    let groupCount = 0;
    for (const [pos, items] of byPos) {
        if (groupCount >= MAX_POS_GROUPS || !items.length) {
            continue;
        }
        sections.push({
            title: pos,
            kind: "definitions",
            items
        });
        groupCount += 1;
    }

    const examplePayload = examplesResult?.examples || examplesResult;
    const examples = [];
    if (Array.isArray(examplePayload)) {
        for (const item of examplePayload) {
            const exampleText = String(item?.text || item || "").replace(/<[^>]+>/g, "").trim();
            if (exampleText && examples.length < MAX_EXAMPLES) {
                examples.push(exampleText);
            }
        }
    }
    if (examples.length) {
        sections.push({
            title: "Examples",
            kind: "examples",
            items: examples
        });
    }

    const synonyms = [];
    const antonyms = [];
    if (Array.isArray(relatedResult)) {
        for (const group of relatedResult) {
            const type = String(group?.relationshipType || "").toLowerCase();
            const words = Array.isArray(group?.words) ? group.words : [];
            const target = type === "antonym" ? antonyms : type === "synonym" ? synonyms : null;
            if (!target) {
                continue;
            }
            for (const word of words) {
                const value = String(word || "").trim();
                if (value && target.length < MAX_RELATED && !target.includes(value)) {
                    target.push(value);
                }
            }
        }
    }
    if (synonyms.length) {
        sections.push({ title: "Synonyms", kind: "synonyms", items: synonyms });
    }
    if (antonyms.length) {
        sections.push({ title: "Antonyms", kind: "antonyms", items: antonyms });
    }

    if (!sections.length) {
        sections.push({
            title: "Definitions",
            kind: "definitions",
            text: `No definitions available for "${term}".`
        });
    }

    const phonetic = pickPhonetic(pronunciationsResult);
    const audioUrl = pickAudioUrl(audioResult);
    const firstPos = byPos.keys().next().value || "";

    const pronunciationObj = {
        text: term,
        phonetic,
        audioUrl,
        language: "en-US",
        label: audioUrl ? "Listen (US)" : "Speak",
        fallbackOnly: !audioUrl
    };

    return {
        title: term,
        subtitle: firstPos ? `Wordnik · ${firstPos}` : "Wordnik",
        sourceBadges: [{ label: "Wordnik", kind: "dictionary" }],
        pronunciation: pronunciationObj,
        pronunciations: [pronunciationObj],
        sections
    };
}
async function fetchWordnikJson(url, { allowEmpty = false, signal } = {}) {
    const response = await fetchWithRetry(url, { signal }, {
        retries: 1,
        timeoutMs: 6000,
        retryStatuses: [429, 500, 502, 503, 504]
    });

    if (response.status === 404) {
        if (allowEmpty) {
            return null;
        }
        throw new NotFoundError("No Wordnik entry found.");
    }

    if (response.status === 401 || response.status === 403) {
        throw new Error("Wordnik API key is invalid or unauthorized. Check Settings → Wordnik API Key.");
    }

    if (response.status === 429) {
        throw new Error("Wordnik rate limit reached. Try again later.");
    }

    if (!response.ok) {
        throw new Error(`Wordnik lookup failed (HTTP ${response.status}).`);
    }

    return response.json();
}

function pickPhonetic(pronunciations) {
    if (!Array.isArray(pronunciations)) {
        return "";
    }
    for (const item of pronunciations) {
        const raw = String(item?.raw || item?.rawType === "IPA" && item?.raw || "").trim();
        if (raw) {
            return raw;
        }
    }
    for (const item of pronunciations) {
        const value = String(item?.raw || "").trim();
        if (value) {
            return value;
        }
    }
    return "";
}

function pickAudioUrl(audioItems) {
    if (!Array.isArray(audioItems)) {
        return "";
    }
    for (const item of audioItems) {
        const url = String(item?.fileUrl || item?.audioUrl || "").trim();
        if (url) {
            return url;
        }
    }
    return "";
}
