/**
 * classifier.js — Query classification, context validation, and English lemma/phrase extraction.
 */
export const MAX_CONTEXT_CHARS = 800;

export function normalizeDictionaryTerm(text) {
    const trimmed = String(text || "").trim();
    return trimmed.replace(/^[^a-zA-Z]+|[^a-zA-Z' -]+$/g, "") || trimmed;
}

export function classifyQuery(text) {
    const str = String(text || "").trim();
    if (!str) {
        return "empty";
    }

    const hasPunctuation = /[.!?]/.test(str);
    const words = str.split(/\s+/).filter(Boolean);

    if (words.length === 1) {
        return "word";
    }

    if (hasPunctuation || words.length >= 7) {
        return "sentence";
    }

    return "phrase";
}

export function normalizeContext(value) {
    const normalized = String(value || "").replace(/\s+/g, " ").trim();
    if (!normalized) {
        return "";
    }

    if (normalized.length <= MAX_CONTEXT_CHARS) {
        return normalized;
    }

    return `${normalized.slice(0, MAX_CONTEXT_CHARS).trim()}…`;
}

export function validateContext(contextText) {
    const text = normalizeContext(contextText);
    if (!text) {
        return {
            ok: false,
            error: "Please enter or paste the sentence containing this word."
        };
    }

    return {
        ok: true,
        context: text
    };
}

export function getEnglishLemmaCandidates(text) {
    const raw = String(text || "").trim();
    if (!raw) {
        return [];
    }

    const cleaned = raw.replace(/^[^a-zA-Z]+|[^a-zA-Z'-]+$/g, "").toLowerCase();
    if (!cleaned || cleaned.length < 3) {
        return [];
    }

    const candidates = new Set();

    const add = (candidate) => {
        if (candidate && candidate !== cleaned && candidate.length >= 2) {
            candidates.add(candidate);
        }
    };

    // Plural / Verb endings
    if (cleaned.endsWith("ies") && cleaned.length > 3) {
        add(`${cleaned.slice(0, -3)}y`);
    } else if (cleaned.endsWith("es") && cleaned.length > 3) {
        add(cleaned.slice(0, -2));
        add(cleaned.slice(0, -1));
    } else if (cleaned.endsWith("s") && !cleaned.endsWith("ss") && cleaned.length > 3) {
        add(cleaned.slice(0, -1));
    }

    // Past tense / Participle
    if (cleaned.endsWith("ied") && cleaned.length > 3) {
        add(`${cleaned.slice(0, -3)}y`);
    } else if (cleaned.endsWith("ed") && cleaned.length > 3) {
        add(cleaned.slice(0, -2));
        add(cleaned.slice(0, -1));
        // Double consonant (e.g. stopped -> stop)
        if (cleaned.length > 4 && cleaned[cleaned.length - 3] === cleaned[cleaned.length - 4]) {
            add(cleaned.slice(0, -3));
        }
    }

    // Gerund / Progressive
    if (cleaned.endsWith("ing") && cleaned.length > 4) {
        add(cleaned.slice(0, -3));
        add(`${cleaned.slice(0, -3)}e`);
        if (cleaned.length > 5 && cleaned[cleaned.length - 4] === cleaned[cleaned.length - 5]) {
            add(cleaned.slice(0, -4));
        }
    }

    // Comparative / Superlative
    if (cleaned.endsWith("ier") && cleaned.length > 3) {
        add(`${cleaned.slice(0, -3)}y`);
    } else if (cleaned.endsWith("er") && cleaned.length > 3) {
        add(cleaned.slice(0, -2));
        add(cleaned.slice(0, -1));
    }

    if (cleaned.endsWith("iest") && cleaned.length > 4) {
        add(`${cleaned.slice(0, -4)}y`);
    } else if (cleaned.endsWith("est") && cleaned.length > 4) {
        add(cleaned.slice(0, -3));
        add(cleaned.slice(0, -2));
    }

    // Adverb to adjective
    if (cleaned.endsWith("ily") && cleaned.length > 3) {
        add(`${cleaned.slice(0, -3)}y`);
    } else if (cleaned.endsWith("ly") && cleaned.length > 3) {
        add(cleaned.slice(0, -2));
    }

    return Array.from(candidates);
}

export function getEnglishPhraseCandidates(text) {
    const raw = String(text || "").trim();
    if (!raw) {
        return [];
    }

    const words = raw.split(/\s+/).map((word) => word.replace(/^[^a-zA-Z]+|[^a-zA-Z'-]+$/g, "").toLowerCase()).filter(Boolean);
    if (words.length <= 1) {
        return [];
    }

    const candidates = new Set();
    // Sub-phrase variations
    for (let i = 0; i < words.length; i++) {
        for (let j = i + 2; j <= words.length; j++) {
            const sub = words.slice(i, j).join(" ");
            if (sub !== raw.toLowerCase()) {
                candidates.add(sub);
            }
        }
    }

    return Array.from(candidates);
}
