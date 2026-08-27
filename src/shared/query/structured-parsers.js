/**
 * structured-parsers.js — Parsing and normalization of Sentence Breakdowns, Senses, Comparisons, and Lexical Profiles.
 */
import { extractJsonObject } from "./ai-markdown-parser.js";

const MAX_LEXICAL_ITEMS = 8;

export function normalizePhraseType(value) {
    const raw = String(value || "").trim().toLowerCase();
    if (!raw) return "idiom";
    if (raw.includes("phrasal") || raw.includes("verb")) return "phrasal_verb";
    if (raw.includes("collocat")) return "collocation";
    if (raw.includes("preposition")) return "prepositional_phrase";
    if (raw.includes("compound")) return "compound";
    if (raw.includes("idiom")) return "idiom";
    return "idiom";
}

export function compactSentenceField(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
}

export function sentenceIncludes(sentence, fragment) {
    if (!sentence || !fragment) return false;
    return sentence.toLowerCase().includes(fragment.toLowerCase());
}

export function normalizeSentenceBreakdown(data = {}, options = {}) {
    const rawSentence = compactSentenceField(data.sentence || options.context || options.text || "");
    const rawQuery = compactSentenceField(options.text || data.query || "");

    const parts = (Array.isArray(data.parts) ? data.parts : []).map((part) => ({
        text: compactSentenceField(part?.text),
        role: compactSentenceField(part?.role || "Part"),
        explanation: compactSentenceField(part?.explanation)
    })).filter((p) => Boolean(p.text));

    const phrases = (Array.isArray(data.phrases) ? data.phrases : []).map((phrase) => ({
        text: compactSentenceField(phrase?.text),
        type: normalizePhraseType(phrase?.type),
        meaning: compactSentenceField(phrase?.meaning),
        role: compactSentenceField(phrase?.role),
        example: compactSentenceField(phrase?.example)
    })).filter((p) => Boolean(p.text && p.meaning));

    return {
        sentence: rawSentence,
        query: rawQuery,
        translation: compactSentenceField(data.translation),
        parts,
        phrases
    };
}

export function buildSentenceBreakdownSections(breakdown, options = {}) {
    if (!breakdown || !breakdown.sentence) {
        return [];
    }

    const sections = [];

    sections.push({
        title: "Sentence Overview",
        kind: "sentence-overview",
        data: {
            sentence: breakdown.sentence,
            query: breakdown.query,
            phrases: breakdown.phrases
        }
    });

    if (breakdown.translation) {
        sections.push({
            title: "Translation",
            kind: "translation",
            text: breakdown.translation
        });
    }

    if (breakdown.parts && breakdown.parts.length) {
        sections.push({
            title: "Sentence Structure",
            kind: "sentence-structure",
            data: {
                parts: breakdown.parts
            }
        });
    }

    if (breakdown.phrases && breakdown.phrases.length) {
        sections.push({
            title: "Idioms & Phrasal Verbs",
            kind: "phrase-parsing",
            data: {
                phrases: breakdown.phrases
            }
        });
    }

    return sections;
}

export function normalizeSenseEntry(item, fallbackNumber) {
    if (!item || typeof item !== "object") return null;
    return {
        number: item.number || fallbackNumber,
        pos: compactSentenceField(item.pos || item.partOfSpeech),
        definition: compactSentenceField(item.definition || item.meaning),
        gloss: compactSentenceField(item.gloss || item.translation || item.vietnamese),
        inContext: Boolean(item.inContext || item.usedInContext)
    };
}

export function parseSenseMatrix(content, options = {}) {
    const json = typeof content === "object" && content ? content : extractJsonObject(content);
    if (!json) return null;

    const rawSenses = Array.isArray(json.senses) ? json.senses : (Array.isArray(json) ? json : []);
    if (!rawSenses.length) return null;

    const senses = rawSenses
        .map((item, idx) => normalizeSenseEntry(item, idx + 1))
        .filter((s) => s && Boolean(s.definition));

    if (!senses.length) return null;

    return {
        word: compactSentenceField(json.word || options.text),
        senses
    };
}

export function parseComparisonTerms(value) {
    if (Array.isArray(value) && value.length >= 2) {
        return [compactSentenceField(value[0]), compactSentenceField(value[1])];
    }
    if (typeof value === "string") {
        const parts = value.split(/\s+(?:vs\.?|and|or|\/)\s+/i);
        if (parts.length >= 2) {
            return [compactSentenceField(parts[0]), compactSentenceField(parts[1])];
        }
    }
    return ["Term A", "Term B"];
}

export function normalizeComparisonData(content, options = {}) {
    const json = typeof content === "object" && content ? content : extractJsonObject(content);
    if (!json) return null;

    const terms = parseComparisonTerms(json.terms || options.text);
    const distinction = compactSentenceField(json.distinction || json.summary || json.ruleOfThumb);
    const rows = (Array.isArray(json.rows || json.comparison) ? (json.rows || json.comparison) : []).map((row) => ({
        feature: compactSentenceField(row?.feature || row?.criterion),
        termA: compactSentenceField(row?.termA || row?.[terms[0]]),
        termB: compactSentenceField(row?.termB || row?.[terms[1]])
    })).filter((r) => r.feature && (r.termA || r.termB));

    const pairs = (Array.isArray(json.pairs || json.minimalPairs) ? (json.pairs || json.minimalPairs) : []).map((pair) => ({
        sentenceA: compactSentenceField(pair?.sentenceA || pair?.[terms[0]]),
        sentenceB: compactSentenceField(pair?.sentenceB || pair?.[terms[1]]),
        explanation: compactSentenceField(pair?.explanation || pair?.note)
    })).filter((p) => p.sentenceA || p.sentenceB);

    return {
        terms,
        distinction,
        rows,
        pairs
    };
}

export function buildComparisonSections(compareData, options = {}) {
    if (!compareData) return [];
    const sections = [];

    if (compareData.distinction) {
        sections.push({
            title: "Key Distinction",
            kind: "compare-distinction",
            text: compareData.distinction
        });
    }

    if (compareData.rows && compareData.rows.length) {
        sections.push({
            title: "Comparison Matrix",
            kind: "compare-matrix",
            data: {
                terms: compareData.terms,
                rows: compareData.rows
            }
        });
    }

    if (compareData.pairs && compareData.pairs.length) {
        sections.push({
            title: "Minimal Pair Examples",
            kind: "examples",
            data: {
                pairs: compareData.pairs
            }
        });
    }

    return sections;
}

export function normalizeLexicalItems(value, limit = MAX_LEXICAL_ITEMS) {
    if (!Array.isArray(value)) return [];
    return value
        .map((item) => compactSentenceField(item))
        .filter(Boolean)
        .slice(0, limit);
}

export function normalizeLearnerMistakes(source) {
    if (!Array.isArray(source)) return [];
    return source.map((item) => {
        if (!item || typeof item !== "object") return null;
        const mistake = compactSentenceField(item.mistake || item.error || item.incorrect);
        const correction = compactSentenceField(item.correction || item.correct);
        const example = compactSentenceField(item.example || item.sentence);
        if (!mistake || !correction) return null;
        return { mistake, correction, example };
    }).filter(Boolean);
}

export function normalizeWordFormation(source) {
    if (!source || typeof source !== "object") return null;
    const prefixes = normalizeLexicalItems(source.prefixes);
    const suffixes = normalizeLexicalItems(source.suffixes);
    const explanation = compactSentenceField(source.explanation);
    if (!prefixes.length && !suffixes.length && !explanation) return null;
    return { prefixes, suffixes, explanation };
}

export function normalizeCollocations(source) {
    if (!source || typeof source !== "object") return null;
    const verbs = normalizeLexicalItems(source.verbs);
    const nouns = normalizeLexicalItems(source.nouns);
    const adjectives = normalizeLexicalItems(source.adjectives);
    const prepositions = normalizeLexicalItems(source.prepositions);
    const patterns = normalizeLexicalItems(source.patterns);
    if (!verbs.length && !nouns.length && !adjectives.length && !prepositions.length && !patterns.length) return null;
    return { verbs, nouns, adjectives, prepositions, patterns };
}

export function parseLexicalProfile(value) {
    if (!value || typeof value !== "object") return null;

    const wordFamily = value.wordFamily && typeof value.wordFamily === "object" ? {
        noun: normalizeLexicalItems(value.wordFamily.noun),
        verb: normalizeLexicalItems(value.wordFamily.verb),
        adjective: normalizeLexicalItems(value.wordFamily.adjective),
        adverb: normalizeLexicalItems(value.wordFamily.adverb),
        inflections: normalizeLexicalItems(value.wordFamily.inflections),
        derivatives: normalizeLexicalItems(value.wordFamily.derivatives)
    } : null;

    const usageWarnings = normalizeLexicalItems(value.usageWarnings);
    const confusablePairs = Array.isArray(value.confusablePairs) ? value.confusablePairs.map((p) => ({
        word: compactSentenceField(p?.word),
        distinction: compactSentenceField(p?.distinction)
    })).filter((p) => Boolean(p.word && p.distinction)) : [];

    const learnerMistakes = normalizeLearnerMistakes(value.learnerMistakes);
    const wordFormation = normalizeWordFormation(value.wordFormation);
    const collocations = normalizeCollocations(value.collocations);

    return {
        wordFamily,
        usageWarnings,
        confusablePairs,
        learnerMistakes,
        wordFormation,
        collocations
    };
}

export function extractLexicalProfileFromMarkdown(markdown) {
    const json = extractJsonObject(markdown);
    if (json?.lexicalProfile) {
        return parseLexicalProfile(json.lexicalProfile);
    }
    return null;
}

export function mergeLexicalProfiles(baseProfile, nextProfile) {
    if (!baseProfile) return nextProfile || null;
    if (!nextProfile) return baseProfile;

    const mergeList = (a, b) => [...new Set([...(a || []), ...(b || [])])].slice(0, MAX_LEXICAL_ITEMS);

    const mergedWordFamily = (baseProfile.wordFamily || nextProfile.wordFamily) ? {
        noun: mergeList(baseProfile.wordFamily?.noun, nextProfile.wordFamily?.noun),
        verb: mergeList(baseProfile.wordFamily?.verb, nextProfile.wordFamily?.verb),
        adjective: mergeList(baseProfile.wordFamily?.adjective, nextProfile.wordFamily?.adjective),
        adverb: mergeList(baseProfile.wordFamily?.adverb, nextProfile.wordFamily?.adverb),
        inflections: mergeList(baseProfile.wordFamily?.inflections, nextProfile.wordFamily?.inflections),
        derivatives: mergeList(baseProfile.wordFamily?.derivatives, nextProfile.wordFamily?.derivatives)
    } : null;

    return {
        wordFamily: mergedWordFamily,
        usageWarnings: mergeList(baseProfile.usageWarnings, nextProfile.usageWarnings),
        confusablePairs: [...(baseProfile.confusablePairs || []), ...(nextProfile.confusablePairs || [])],
        learnerMistakes: [...(baseProfile.learnerMistakes || []), ...(nextProfile.learnerMistakes || [])],
        wordFormation: nextProfile.wordFormation || baseProfile.wordFormation,
        collocations: nextProfile.collocations || baseProfile.collocations
    };
}
