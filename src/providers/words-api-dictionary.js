import { fetchWithRetry } from "../shared/fetch-utils.js";
import { normalizeDictionaryTerm } from "../shared/query-utils.js";
import { NotFoundError } from "./errors.js";

const MAX_DEFINITIONS_PER_POS = 4;
const MAX_POS_GROUPS = 4;
const MAX_EXAMPLES = 6;
const MAX_RELATED = 8;
const WORDS_API_HOST = "wordsapiv1.p.rapidapi.com";
const WORDS_API_BASE = `https://${WORDS_API_HOST}`;

export async function lookupWordsApi(text, settings, options = {}) {
    const term = normalizeDictionaryTerm(text);
    if (!term) {
        throw new Error("No text provided for WordsAPI lookup.");
    }

    const apiKey = String(settings?.wordsApiKey || "").trim();
    if (!apiKey) {
        throw new Error("WordsAPI key is required. Add your RapidAPI key in Settings → Dictionary provider.");
    }

    const url = `${WORDS_API_BASE}/words/${encodeURIComponent(term)}`;
    const response = await fetchWithRetry(url, {
        method: "GET",
        signal: options.signal,
        headers: {
            "X-RapidAPI-Key": apiKey,
            "X-RapidAPI-Host": WORDS_API_HOST
        }
    }, {
        retries: 1,
        timeoutMs: 6000,
        retryStatuses: [429, 500, 502, 503, 504]
    });

    if (response.status === 401 || response.status === 403) {
        throw new Error("WordsAPI key is invalid or unauthorized. Check Settings → WordsAPI (RapidAPI) Key.");
    }

    if (response.status === 404) {
        throw new NotFoundError(`No WordsAPI entry found for "${term}".`);
    }

    if (response.status === 429) {
        throw new Error("WordsAPI rate limit reached. Try again later or upgrade your RapidAPI plan.");
    }

    if (!response.ok) {
        throw new Error(`WordsAPI lookup failed (HTTP ${response.status}).`);
    }

    const data = await response.json();
    const word = String(data?.word || term).trim() || term;
    const results = Array.isArray(data?.results) ? data.results : [];

    if (!results.length && !data?.syllables && data?.frequency == null && !data?.pronunciation) {
        throw new NotFoundError(`No WordsAPI entry found for "${term}".`);
    }

    const sections = [];
    const byPos = new Map();
    const examples = [];
    const synonyms = [];
    const antonyms = [];

    for (const item of results) {
        const definition = String(item?.definition || "").trim();
        const pos = String(item?.partOfSpeech || "Definition").trim() || "Definition";

        if (definition) {
            if (!byPos.has(pos)) {
                byPos.set(pos, []);
            }
            const bucket = byPos.get(pos);
            if (bucket.length < MAX_DEFINITIONS_PER_POS) {
                bucket.push(definition);
            }
        }

        if (Array.isArray(item?.examples)) {
            for (const example of item.examples) {
                const value = String(example || "").trim();
                if (value && examples.length < MAX_EXAMPLES && !examples.includes(value)) {
                    examples.push(value);
                }
            }
        }

        collectUnique(synonyms, item?.synonyms, MAX_RELATED);
        collectUnique(antonyms, item?.antonyms, MAX_RELATED);
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

    if (examples.length) {
        sections.push({ title: "Examples", kind: "examples", items: examples });
    }
    if (synonyms.length) {
        sections.push({ title: "Synonyms", kind: "synonyms", items: synonyms });
    }
    if (antonyms.length) {
        sections.push({ title: "Antonyms", kind: "antonyms", items: antonyms });
    }

    const derivation = extractDerivations(data);
    const family = normalizeWordsApiFamily(byPos, derivation);

    const syllableText = formatSyllables(data?.syllables);
    if (syllableText) {
        sections.push({
            title: "Syllables",
            kind: "syllables",
            items: [syllableText]
        });
    }

    const frequencyText = formatFrequency(data?.frequency);
    if (frequencyText) {
        sections.push({
            title: "Frequency",
            kind: "frequency",
            items: [frequencyText]
        });
    }

    if (!sections.length) {
        sections.push({
            title: "Definitions",
            kind: "definitions",
            text: `No definitions available for "${term}".`
        });
    }

    const phonetic = extractPronunciation(data?.pronunciation);
    const firstPos = byPos.keys().next().value || "";
    const subtitleParts = ["WordsAPI"];
    if (firstPos) {
        subtitleParts.push(firstPos);
    }
    if (frequencyText) {
        subtitleParts.push(frequencyText);
    }

    const pronunciationObj = {
        text: word,
        phonetic,
        audioUrl: "",
        language: "en-US",
        label: "Speak",
        fallbackOnly: true
    };

    return {
        title: word,
        subtitle: subtitleParts.join(" · "),
        sourceBadges: [{ label: "WordsAPI", kind: "dictionary" }],
        pronunciation: pronunciationObj,
        pronunciations: [pronunciationObj],
        sections,
        lexicalProfile: family
    };
}
function collectUnique(target, values, limit) {
    if (!Array.isArray(values)) {
        return;
    }
    for (const value of values) {
        const item = String(value || "").trim();
        if (item && target.length < limit && !target.includes(item)) {
            target.push(item);
        }
    }
}

function extractDerivations(data) {
    const derivation = data?.derivation || data?.results?.derivation;
    if (Array.isArray(derivation)) {
        return derivation.filter((item) => item && String(item).trim());
    }
    return [];
}

function normalizeWordsApiFamily(byPos, derivation) {
    const categorizePos = (pos) => {
        const lower = String(pos || "").toLowerCase();
        if (lower.startsWith("noun")) {
            return "noun";
        }
        if (lower.startsWith("verb")) {
            return "verb";
        }
        if (lower.startsWith("adjective")) {
            return "adjective";
        }
        if (lower.startsWith("adverb")) {
            return "adverb";
        }
        return null;
    };

    const family = { noun: [], verb: [], adjective: [], adverb: [], inflections: [], derivatives: [] };

    for (const [pos, items] of byPos) {
        const category = categorizePos(pos);
        if (category && items.length) {
            family[category].push(...items.map((item) => String(item || "").trim()));
        }
    }

    const partOfSpeechWords = family.noun.concat(family.verb, family.adjective, family.adverb);

    if (derivation.length) {
        for (const item of derivation) {
            const value = String(item || "").trim();
            const lower = value.toLocaleLowerCase();
            const isInflection = partOfSpeechWords.some((part) => {
                const target = part.toLocaleLowerCase();
                return target === lower
                    || target.startsWith(lower)
                    || lower.startsWith(target);
            });
            if (value && !family.inflections.includes(value) && !family.derivatives.includes(value)) {
                if (isInflection && family.inflections.length < MAX_LEXICAL_ITEMS) {
                    family.inflections.push(value);
                } else if (family.derivatives.length < MAX_DERIVATIVES) {
                    family.derivatives.push(value);
                }
            }
        }
    }

    return family;
}

function formatSyllables(syllables) {
    if (!syllables) {
        return "";
    }
    if (Array.isArray(syllables?.list) && syllables.list.length) {
        return syllables.list.map((part) => String(part || "").trim()).filter(Boolean).join("·");
    }
    if (typeof syllables === "string") {
        return syllables.trim();
    }
    if (Number.isFinite(Number(syllables?.count))) {
        return `${Number(syllables.count)} syllable${Number(syllables.count) === 1 ? "" : "s"}`;
    }
    return "";
}

function formatFrequency(frequency) {
    if (frequency == null) {
        return "";
    }
    if (typeof frequency === "number" && Number.isFinite(frequency)) {
        return `Zipf ${roundFrequency(frequency)}`;
    }
    if (typeof frequency === "object") {
        const zipf = frequency.zipf ?? frequency.perMillion ?? frequency.value;
        if (zipf != null && Number.isFinite(Number(zipf))) {
            const label = frequency.zipf != null ? "Zipf" : frequency.perMillion != null ? "per million" : "score";
            return `${label} ${roundFrequency(Number(zipf))}`;
        }
    }
    return "";
}

function roundFrequency(value) {
    return Math.round(value * 100) / 100;
}

function extractPronunciation(pronunciation) {
    if (!pronunciation) {
        return "";
    }
    if (typeof pronunciation === "string") {
        return pronunciation.trim();
    }
    if (typeof pronunciation === "object") {
        return String(pronunciation.all || pronunciation.noun || pronunciation.verb || pronunciation.adjective || "").trim();
    }
    return "";
}
