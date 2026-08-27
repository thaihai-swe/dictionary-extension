import { fetchWithRetry } from "../shared/fetch-utils.js";
import { normalizeDictionaryTerm } from "../shared/query-utils.js";
import { NotFoundError } from "./errors.js";

const MAX_DEFINITIONS = 4;
const MAX_EXAMPLES = 6;

export async function lookupMerriamWebster(text, settings, options = {}) {
    const term = normalizeDictionaryTerm(text);
    if (!term) {
        throw new Error("No text provided for Merriam-Webster lookup.");
    }

    const apiKey = String(settings?.dictionaryApiKey || "").trim();
    if (!apiKey) {
        throw new Error("Merriam-Webster API key is required. Add it in Settings → Dictionary Provider.");
    }

    const url = `https://www.dictionaryapi.com/api/v3/references/collegiate/json/${encodeURIComponent(term)}?key=${encodeURIComponent(apiKey)}`;

    const response = await fetchWithRetry(url, { signal: options.signal }, {
        retries: 1,
        timeoutMs: 6000,
        retryStatuses: [429, 500, 502, 503, 504]
    });

    if (response.status === 404) {
        throw new NotFoundError(`No Merriam-Webster entry found for "${term}".`);
    }

    if (!response.ok) {
        throw new Error(`Merriam-Webster lookup failed (HTTP ${response.status}).`);
    }

    const data = await response.json();

    if (!Array.isArray(data) || !data.length) {
        throw new NotFoundError(`No Merriam-Webster entry found for "${term}".`);
    }

    // Suggestions response (no exact match): array of strings.
    if (typeof data[0] === "string") {
        const suggestions = data.slice(0, 5).join(", ");
        throw new NotFoundError(`No exact match for "${term}". Did you mean: ${suggestions}?`);
    }

    const entries = data.filter((entry) => entry && typeof entry === "object").slice(0, 3);
    const sections = [];
    const examples = [];
    let audioUrl = "";
    let phonetic = "";
    let headword = term;
    let functionalLabel = "";

    for (const entry of entries) {
        const pos = String(entry.fl || "").trim() || "Definition";
        if (!functionalLabel) {
            functionalLabel = pos;
        }
        if (!headword && entry.hwi?.hw) {
            headword = String(entry.hwi.hw).replace(/\*/g, "");
        }
        if (entry.hwi?.hw) {
            headword = String(entry.hwi.hw).replace(/\*/g, "");
        }

        const shortDefs = Array.isArray(entry.shortdef)
            ? entry.shortdef.map((item) => String(item || "").trim()).filter(Boolean).slice(0, MAX_DEFINITIONS)
            : [];

        if (shortDefs.length) {
            sections.push({
                title: pos,
                kind: "definitions",
                items: shortDefs
            });
        }

        collectExamples(entry, examples, MAX_EXAMPLES);

        if (!audioUrl || !phonetic) {
            const prs = Array.isArray(entry.hwi?.prs) ? entry.hwi.prs : Array.isArray(entry.prs) ? entry.prs : [];
            for (const item of prs) {
                if (!phonetic && item?.mw) {
                    phonetic = normalizeMwPhonetic(item.mw);
                }
                if (!audioUrl && item?.sound?.audio) {
                    audioUrl = buildMwAudioUrl(item.sound.audio);
                }
                if (phonetic && audioUrl) {
                    break;
                }
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

    if (!sections.length) {
        sections.push({
            title: "Definitions",
            kind: "definitions",
            text: `No definitions available for "${term}".`
        });
    }

    const pronunciationObj = {
        text: headword || term,
        phonetic,
        audioUrl,
        language: "en-US",
        label: audioUrl ? "Listen (US)" : "Speak",
        fallbackOnly: !audioUrl
    };

    return {
        title: headword || term,
        subtitle: functionalLabel ? `Merriam-Webster · ${functionalLabel}` : "Merriam-Webster",
        sourceBadges: [{ label: "Merriam-Webster", kind: "dictionary" }],
        pronunciation: pronunciationObj,
        pronunciations: [pronunciationObj],
        sections
    };
}

function collectExamples(entry, examples, limit) {
    if (!Array.isArray(entry?.def) || examples.length >= limit) {
        return;
    }

    const walk = (node) => {
        if (examples.length >= limit || node == null) {
            return;
        }

        if (Array.isArray(node)) {
            if (node[0] === "vis" && Array.isArray(node[1])) {
                for (const item of node[1]) {
                    const text = stripMwMarkup(item?.t || "");
                    if (text && examples.length < limit) {
                        examples.push(text);
                    }
                }
                return;
            }

            for (const child of node) {
                walk(child);
            }
            return;
        }

        if (typeof node === "object") {
            for (const value of Object.values(node)) {
                walk(value);
            }
        }
    };

    walk(entry.def);
}

function stripMwMarkup(value) {
    return String(value || "")
        .replace(/\{sx\|([^}|]+)\|?[^}]*\}/g, "$1")
        .replace(/\{a_link\|([^}|]+)\|?[^}]*\}/g, "$1")
        .replace(/\{d_link\|([^}|]+)\|?[^}]*\}/g, "$1")
        .replace(/\{dx_def\}|\{dx_ety\}|\{\/?dx\}/g, "")
        .replace(/\{bc\}/g, "")
        .replace(/\{ldquo\}/g, "“")
        .replace(/\{rdquo\}/g, "”")
        .replace(/\{[^}]+\}/g, "")
        .replace(/\s+/g, " ")
        .trim();
}

function normalizeMwPhonetic(mw) {
    return String(mw || "")
        .replace(/\*/g, "")
        .replace(/\s+/g, " ")
        .trim();
}

function buildMwAudioUrl(audioFilename) {
    const name = String(audioFilename || "").trim();
    if (!name) {
        return "";
    }

    let subdirectory = name.charAt(0);
    if (name.startsWith("bix")) {
        subdirectory = "bix";
    } else if (name.startsWith("gg")) {
        subdirectory = "gg";
    } else if (/^[^a-zA-Z]/.test(name)) {
        subdirectory = "number";
    }

    return `https://media.merriam-webster.com/audio/prons/en/us/mp3/${subdirectory}/${name}.mp3`;
}
