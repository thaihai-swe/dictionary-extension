import { fetchWithRetry } from "../shared/fetch-utils.js";
import { normalizeDictionaryTerm } from "../shared/query-utils.js";
import { NotFoundError } from "./errors.js";
import { createSpeechPronunciation } from "./pronunciation.js";

const MAX_MEANINGS = 6;
const MAX_DEFINITIONS = 4;
const MAX_EXAMPLES = 6;

export async function lookupWiktionary(text, _settings, options = {}) {
    const term = normalizeDictionaryTerm(text);
    if (!term) {
        throw new Error("No text provided for Wiktionary lookup.");
    }

    const url = `https://en.wiktionary.org/api/rest_v1/page/definition/${encodeURIComponent(term)}`;
    const response = await fetchWithRetry(url, { signal: options.signal }, {
        retries: 1,
        retryStatuses: [429, 500, 502, 503, 504]
    });

    if (response.status === 404) {
        throw new NotFoundError(`Wiktionary entry not found for "${term}".`);
    }

    if (!response.ok) {
        throw new Error(`Wiktionary lookup failed (HTTP ${response.status}).`);
    }

    const data = await response.json();
    const englishEntries = data?.en || Object.values(data || {})[0];

    if (!Array.isArray(englishEntries) || !englishEntries.length) {
        throw new NotFoundError(`No English Wiktionary definition found for "${term}".`);
    }

    const sections = [];
    const examples = [];

    for (const entry of englishEntries.slice(0, MAX_MEANINGS)) {
        const pos = entry.partOfSpeech || "Meaning";
        const defItems = Array.isArray(entry.definitions) ? entry.definitions.slice(0, MAX_DEFINITIONS) : [];
        const definitionTexts = [];

        for (const defObj of defItems) {
            const rawDef = stripHtml(defObj.definition || "");
            if (rawDef) {
                definitionTexts.push(rawDef);
            }

            if (Array.isArray(defObj.parsedExamples)) {
                for (const exObj of defObj.parsedExamples) {
                    const exText = stripHtml(exObj.example || "");
                    if (exText && examples.length < MAX_EXAMPLES) {
                        examples.push(exText);
                    }
                }
            }
        }

        if (definitionTexts.length) {
            sections.push({
                title: pos,
                kind: "definitions",
                items: definitionTexts
            });
        }
    }

    if (examples.length) {
        sections.push({
            title: "Examples",
            kind: "examples",
            items: examples
        });
    }

    if (!sections.length) {
        sections.push({
            title: "Definitions",
            kind: "definitions",
            text: `No clear definitions available for "${term}".`
        });
    }

    const pronunciation = createSpeechPronunciation(term);

    return {
        title: term,
        subtitle: "Wiktionary",
        sourceBadges: [{ label: "Wiktionary", kind: "dictionary" }],
        pronunciation,
        pronunciations: [pronunciation],
        sections
    };
}

function stripHtml(html) {
    return String(html || "")
        .replace(/<[^>]*>/g, "")
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, '&')
        .replace(/&#39;/g, "'")
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/\s+/g, " ")
        .trim();
}
