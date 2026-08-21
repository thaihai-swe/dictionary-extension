/**
 * Shared pure helpers for query classification, context normalization,
 * AI markdown cleanup, and semantic section splitting.
 * ES module used by background/provider code.
 */

import { kindForAiSection } from "./ai-prompts.js";

export const MAX_CONTEXT_CHARS = 800;
const MAX_AI_RESPONSE_CHARS = 16000;

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

function inferSectionKind(title = "", fallback = "general") {
    const normalized = String(title || "").trim().toLowerCase();
    if (!normalized) {
        return fallback;
    }

    if (normalized === "context used") {
        return "context";
    }

    if (normalized.includes("contextual analysis")) {
        return "contextual-analysis";
    }

    if (normalized.includes("distinct") || normalized.includes("rule of thumb")) {
        return "compare-distinction";
    }

    if (normalized.includes("comparison") || normalized.includes("matrix")) {
        return "compare-matrix";
    }

    if (normalized.includes("substitution")) {
        return "substitutions";
    }

    if (normalized.includes("nuance") || normalized.includes("connotation")) {
        return "nuance";
    }

    if (normalized.includes("syntactic") || normalized.includes("syntax")) {
        return "syntax";
    }

    if (normalized.includes("simplified") || normalized.includes("simple version")) {
        return "rephrase-simple";
    }

    if (normalized.includes("academic") || normalized.includes("formal")) {
        return "rephrase-formal";
    }

    if (normalized.includes("native") || normalized.includes("idiomatic")) {
        return "rephrase-idiomatic";
    }

    if (normalized.includes("sense")) {
        return "senses";
    }

    if (normalized.includes("summary for learner") || normalized.includes("learner takeaway")) {
        return "summary";
    }

    if (
        normalized.includes("sentence breakdown")
        || normalized.includes("sentence overview")
    ) {
        return "sentence-structure";
    }

    if (
        normalized.includes("grammatical role")
        || normalized.includes("sentence structure")
        || normalized.includes("grammar")
        || normalized.includes("nuance")
    ) {
        return "grammar";
    }

    if (normalized.includes("translation")) {
        return "translation";
    }

    if (
        normalized.includes("definition")
        || normalized.includes("meaning")
        || normalized.includes("simple explanation")
    ) {
        return "definitions";
    }

    if (
        normalized.includes("example")
        || normalized.includes("paraphrase")
    ) {
        return "examples";
    }

    if (normalized.includes("common structure")) {
        return "structures";
    }

    if (normalized.includes("memory aid")) {
        return "memory";
    }

    if (normalized.includes("etymology") || normalized.includes("deep understanding")) {
        return "etymology";
    }

    if (normalized.includes("related idiom") || normalized.includes("related expression")) {
        return "phrase";
    }

    if (
        normalized.includes("synonym")
        || normalized.includes("antonym")
        || normalized.includes("word family")
        || normalized.includes("collocation")
        || normalized.includes("related")
    ) {
        return "lexical";
    }

    if (
        normalized.includes("mistake")
        || normalized.includes("confusable")
        || normalized.includes("usage")
        || normalized.includes("register")
        || normalized.includes("tone")
        || normalized.includes("learner")
        || normalized.includes("pragmatic")
    ) {
        return "usage";
    }

    if (
        normalized.includes("phrase parsing")
        || normalized.includes("detected phrase")
    ) {
       return "phrase-parsing";
   }

    if (
        normalized.includes("learner note")
        || normalized.includes("learner notes")
    ) {
        return "usage";
    }

    if (
        normalized.includes("phrase")
        || normalized.includes("idiom")
    ) {
        return "phrase";
    }

    return fallback;
}

export function normalizeAiMarkdown(value) {
    let content = String(value || "").replace(/\r\n/g, "\n").trim();
    if (!content) {
        return "";
    }

    // Strip accidental fenced code wrappers.
    content = content.replace(/^```(?:markdown|md)?\s*/i, "").replace(/\s*```$/i, "").trim();

    // Normalize all markdown headings to level-3 for stable section splitting.
    content = content.replace(/^#{1,6}\s+(.+)$/gm, (_, heading) => `### ${heading.trim()}`);

    // Convert bold-only section labels into headings when models use that style.
    content = content.replace(/^\*\*([^*]+)\*\*\s*$/gm, (_, heading) => `### ${heading.trim()}`);

    // Drop immediately repeated headings.
    content = content.replace(/^(### .+)\n+\1$/gm, "$1");

    // Collapse excessive blank lines.
    content = content.replace(/\n{3,}/g, "\n\n").trim();

    if (content.length > MAX_AI_RESPONSE_CHARS) {
        content = `${content.slice(0, MAX_AI_RESPONSE_CHARS).trim()}…`;
    }

    return content;
}

function kindForSplitSection(title, options, isLeadingUntitled) {
    const fallbackKind = options.fallbackKind || "general";
    const intent = options.intent;
    if (isLeadingUntitled && !String(title || "").trim()) {
        return "intro";
    }
    const mapped = kindForAiSection(intent, title);
    if (mapped) {
        return mapped;
    }
    return inferSectionKind(title, fallbackKind);
}

/**
 * Split markdown with ### headings into titled sections.
 * Leading prose before the first heading becomes an untitled intro section.
 */
export function splitMarkdownIntoSections(content, options = {}) {
    const markdown = String(content || "").trim();

    if (!markdown) {
        return [{
            title: "",
            kind: "intro",
            text: "No AI response returned.",
            markdown: true
        }];
    }

    const lines = markdown.split("\n");
    const sections = [];
    let currentTitle = "";
    let currentLines = [];
    let isLeadingUntitled = true;

    const pushCurrent = () => {
        const text = currentLines.join("\n").trim();
        if (!text && !currentTitle) {
            return;
        }

        sections.push({
            title: currentTitle,
            kind: kindForSplitSection(currentTitle, options, isLeadingUntitled && !currentTitle),
            text: text || " ",
            markdown: true
        });
    };

    for (const line of lines) {
        const headingMatch = line.match(/^###\s+(.+)\s*$/);
        if (headingMatch) {
            pushCurrent();
            isLeadingUntitled = false;
            currentTitle = headingMatch[1].trim();
            currentLines = [];
            continue;
        }

        currentLines.push(line);
    }

    pushCurrent();

    if (sections.length === 0) {
        return [{
            title: "",
            kind: "intro",
            text: markdown,
            markdown: true
        }];
    }

    return sections;
}

const MAX_SENTENCE_PARTS = 20;
const MAX_SENTENCE_PHRASES = 8;
const MAX_LEARNER_NOTES = 8;
const MAX_SENTENCE_FIELD_CHARS = 500;
const PHRASE_TYPES = [
    "phrasal_verb",
    "idiom",
    "collocation",
    "fixed_expression",
    "none"
];

export function extractJsonObject(value) {
    const source = String(value || "").trim();
    if (!source) {
        return null;
    }

    const fenced = source.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const candidate = (fenced ? fenced[1] : source).trim();

    const tryParse = (raw) => {
        try {
            return JSON.parse(raw);
        } catch (_error) {
            return null;
        }
    };

    const direct = tryParse(candidate);
    if (direct && typeof direct === "object") {
        return direct;
    }

    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) {
        return null;
    }

    return tryParse(candidate.slice(start, end + 1));
}

function normalizePhraseType(value) {
    const normalized = String(value || "")
        .trim()
        .toLowerCase()
        .replace(/[\s-]+/g, "_");

    if (PHRASE_TYPES.includes(normalized)) {
        return normalized;
    }

    if (normalized.includes("phrasal")) {
        return "phrasal_verb";
    }

    if (normalized.includes("idiom")) {
        return "idiom";
    }

    if (normalized.includes("collocation")) {
        return "collocation";
    }

    if (normalized.includes("fixed") || normalized.includes("expression")) {
        return "fixed_expression";
    }

    return "none";
}

export function normalizeSentenceBreakdown(data = {}, options = {}) {
    const fallbackSentence = String(options.sentence || options.context || options.text || "").trim();
    const source = data && typeof data === "object" ? data : {};

    const sentence = compactSentenceField(source.sentence || fallbackSentence);
    const translation = compactSentenceField(source.translation);

    const parts = Array.isArray(source.parts)
        ? source.parts
            .map((part) => ({
                text: compactSentenceField(part?.text),
                role: compactSentenceField(part?.role),
                explanation: compactSentenceField(part?.explanation)
            }))
            .filter((part) => part.text && sentenceIncludes(sentence, part.text))
            .slice(0, MAX_SENTENCE_PARTS)
        : [];

    const phrases = Array.isArray(source.phrases)
        ? source.phrases
            .map((phrase) => ({
                text: compactSentenceField(phrase?.text),
                type: normalizePhraseType(phrase?.type),
                meaning: compactSentenceField(phrase?.meaning),
                role: compactSentenceField(phrase?.role),
                example: compactSentenceField(phrase?.example)
            }))
            .filter((phrase) => phrase.text && phrase.type !== "none" && sentenceIncludes(sentence, phrase.text))
            .slice(0, MAX_SENTENCE_PHRASES)
        : [];

    const learnerNotes = Array.isArray(source.learnerNotes)
        ? source.learnerNotes
            .map((note) => compactSentenceField(note))
            .filter(Boolean)
            .slice(0, MAX_LEARNER_NOTES)
        : [];

    return {
        sentence,
        translation,
        parts,
        phrases,
        learnerNotes
    };
}

function compactSentenceField(value) {
    const normalized = String(value || "").replace(/\s+/g, " ").trim();
    return normalized.slice(0, MAX_SENTENCE_FIELD_CHARS).trim();
}

function sentenceIncludes(sentence, fragment) {
    if (!sentence) {
        return true;
    }
    return sentence.toLocaleLowerCase().includes(String(fragment || "").toLocaleLowerCase());
}

export function buildSentenceBreakdownSections(breakdown, options = {}) {
    const context = String(options.context || "").trim();
    const sections = [];

    if (context) {
        sections.push({
            title: "Context used",
            kind: "context",
            text: `> ${context}`,
            markdown: true
        });
    }

    if (breakdown.sentence) {
        sections.push({
            title: "Sentence",
            kind: "sentence-overview",
            text: breakdown.sentence,
            data: {
                sentence: breakdown.sentence,
                query: String(options.text || "").trim(),
                phrases: breakdown.phrases
            }
        });
    }

    if (breakdown.translation) {
        sections.push({
            title: "Translation",
            kind: "translation",
            text: breakdown.translation
        });
    }

    if (breakdown.parts.length) {
        sections.push({
            title: "Sentence Structure",
            kind: "sentence-structure",
            text: "",
            data: {
                parts: breakdown.parts
            }
        });
    }

    if (breakdown.phrases.length) {
        sections.push({
            title: "Phrase Parsing",
            kind: "phrase-parsing",
            text: "",
            data: {
                phrases: breakdown.phrases
            }
        });
    }

    if (breakdown.learnerNotes.length) {
        sections.push({
            title: "Learner Notes",
            kind: "usage",
            text: "",
            items: breakdown.learnerNotes
        });
    }

    if (sections.length === 0 || (sections.length === 1 && sections[0].kind === "context")) {
        sections.push({
            title: "Sentence Breakdown",
            kind: "sentence-structure",
            text: "No structured sentence breakdown was returned.",
            markdown: true
        });
    }

    return sections;
}

const MAX_SENSES = 6;
const MAX_COMPARE_ROWS = 6;
const MAX_MINIMAL_PAIRS = 4;
const SENSE_LINE_RE = /^\s*(?:\d+[.)]|[-*•])\s*(?:\*\(([^)]+)\)\*|[\*(]([^)]+)[\*)])?\s*(.+)$/;

export function parseSenseMatrix(content, options = {}) {
    const text = String(content || "").trim();
    if (!text) {
        return [];
    }

    const json = extractJsonObject(text);
    if (Array.isArray(json?.senses) && json.senses.length) {
        return json.senses
            .map((item, index) => normalizeSenseEntry(item, index + 1))
            .filter(Boolean)
            .slice(0, MAX_SENSES);
    }

    const senses = [];
    for (const rawLine of text.split("\n")) {
        const line = rawLine.trim();
        if (!line) {
            continue;
        }
        const match = line.match(SENSE_LINE_RE);
        if (!match) {
            continue;
        }
        const pos = String(match[1] || match[2] || "").trim();
        const rest = String(match[3] || "").trim();
        if (!rest) {
            continue;
        }
        const inContext = /\*\*in context\*\*|\bin context\b/i.test(rest);
        const cleaned = rest.replace(/\s*\*?\*?in context\*?\*?\s*$/i, "").trim();
        const split = cleaned.split(/\s+[—–-]\s+/);
        const definition = String(split[0] || "").replace(/^\*\([^*]+\)\*\s*/, "").trim();
        const gloss = String(split.slice(1).join(" — ") || "").trim();
        if (!definition) {
            continue;
        }
        senses.push({
            number: senses.length + 1,
            pos,
            definition,
            gloss,
            inContext
        });
        if (senses.length >= MAX_SENSES) {
            break;
        }
    }

    if (senses.length && options.preferContext && !senses.some((item) => item.inContext)) {
        senses[0].inContext = true;
    }

    return senses;
}

function normalizeSenseEntry(item, fallbackNumber) {
    const definition = compactSentenceField(item?.definition || item?.meaning || item?.glossEn || "");
    if (!definition) {
        return null;
    }
    return {
        number: Number(item?.number) || fallbackNumber,
        pos: compactSentenceField(item?.pos || item?.partOfSpeech || ""),
        definition,
        gloss: compactSentenceField(item?.gloss || item?.translation || ""),
        inContext: Boolean(item?.inContext)
    };
}

export function normalizeComparisonData(content, options = {}) {
    const text = String(content || "").trim();
    const json = extractJsonObject(text);
    if (json && typeof json === "object" && (json.terms || json.coreDistinction || json.table)) {
        return {
            terms: Array.isArray(json.terms)
                ? json.terms.map((term) => compactSentenceField(term)).filter(Boolean).slice(0, 4)
                : parseComparisonTerms(options.text),
            coreDistinction: compactSentenceField(json.coreDistinction || json.distinction || ""),
            table: Array.isArray(json.table)
                ? json.table
                    .map((row) => ({
                        feature: compactSentenceField(row?.feature || row?.dimension || ""),
                        termA: compactSentenceField(row?.termA || row?.left || ""),
                        termB: compactSentenceField(row?.termB || row?.right || "")
                    }))
                    .filter((row) => row.feature && (row.termA || row.termB))
                    .slice(0, MAX_COMPARE_ROWS)
                : [],
            collocations: Array.isArray(json.collocations)
                ? json.collocations.map((item) => compactSentenceField(item)).filter(Boolean).slice(0, 8)
                : [],
            minimalPairs: Array.isArray(json.minimalPairs)
                ? json.minimalPairs
                    .map((pair) => ({
                        sentenceA: compactSentenceField(pair?.sentenceA || pair?.left || ""),
                        sentenceB: compactSentenceField(pair?.sentenceB || pair?.right || ""),
                        explanation: compactSentenceField(pair?.explanation || "")
                    }))
                    .filter((pair) => pair.sentenceA || pair.sentenceB)
                    .slice(0, MAX_MINIMAL_PAIRS)
                : []
        };
    }

    return {
        terms: parseComparisonTerms(options.text),
        coreDistinction: "",
        table: [],
        collocations: [],
        minimalPairs: []
    };
}

function parseComparisonTerms(value) {
    const text = String(value || "").trim();
    if (!text) {
        return [];
    }
    return text
        .split(/\s+(?:vs\.?|versus|or|and)\s+/i)
        .map((part) => part.replace(/[?!.]+$/g, "").trim())
        .filter(Boolean)
        .slice(0, 4);
}

export function buildComparisonSections(compareData, options = {}) {
    const sections = [];
    const context = String(options.context || "").trim();
    if (context) {
        sections.push({
            title: "Context used",
            kind: "context",
            text: `> ${context}`,
            markdown: true
        });
    }

    if (compareData.coreDistinction) {
        sections.push({
            title: "Core Distinction",
            kind: "compare-distinction",
            text: compareData.coreDistinction
        });
    }

    if (compareData.table.length) {
        sections.push({
            title: "Comparison Matrix",
            kind: "compare-matrix",
            text: "",
            data: {
                terms: compareData.terms,
                rows: compareData.table
            }
        });
    }

    if (compareData.collocations.length) {
        sections.push({
            title: "Collocation Divergence",
            kind: "collocations",
            items: compareData.collocations
        });
    }

    if (compareData.minimalPairs.length) {
        sections.push({
            title: "Minimal Pairs & Examples",
            kind: "examples",
            text: "",
            data: {
                pairs: compareData.minimalPairs
            }
        });
    }

    return sections;
}

export function extractBlockquoteText(markdown) {
    const match = String(markdown || "").match(/^>\s?(.+)$/m);
    return match ? match[1].trim() : "";
}

const LEMMA_STOPWORDS = new Set([
    "is", "was", "has", "his", "its", "this", "thus", "yes", "news", "series", "species", "corpus", "chaos", "bias", "alias", "lens", "bus"
]);

// Small, high-confidence irregular-form table used before suffix heuristics.
// This is intentionally bounded and English-focused; providers remain the
// authority for the final dictionary entry.
const IRREGULAR_LEMMA_MAP = Object.freeze({
    am: "be",
    are: "be",
    been: "be",
    being: "be",
    was: "be",
    were: "be",
    went: "go",
    gone: "go",
    going: "go",
    did: "do",
    done: "do",
    doing: "do",
    had: "have",
    having: "have",
    got: "get",
    gotten: "get",
    getting: "get",
   made: "make",
   making: "make",
   ran: "run",
   running: "run",
   came: "come",
   coming: "come",
   became: "become",
   becoming: "become",
    begun: "begin",
    began: "begin",
    beginning: "begin",
    bought: "buy",
    brought: "bring",
    built: "build",
    caught: "catch",
    chose: "choose",
    chosen: "choose",
    drank: "drink",
    drunk: "drink",
    drove: "drive",
    driven: "drive",
    ate: "eat",
    eaten: "eat",
    fell: "fall",
    fallen: "fall",
    felt: "feel",
    fought: "fight",
    found: "find",
    flew: "fly",
    flown: "fly",
    forgot: "forget",
    forgotten: "forget",
    forgave: "forgive",
    forgiven: "forgive",
    froze: "freeze",
    frozen: "freeze",
    gave: "give",
    given: "give",
    grew: "grow",
    grown: "grow",
    knew: "know",
    known: "know",
    left: "leave",
    lost: "lose",
    lay: "lie",
    lain: "lie",
    led: "lead",
   lent: "lend",
   meant: "mean",
    met: "meet",
   paid: "pay",
   rode: "ride",
    ridden: "ride",
    rang: "ring",
    rung: "ring",
    rose: "rise",
    risen: "rise",
    saw: "see",
    seen: "see",
    sold: "sell",
    sent: "send",
    shook: "shake",
    shaken: "shake",
    shot: "shoot",
    showed: "show",
    shown: "show",
    sang: "sing",
    sung: "sing",
    sank: "sink",
    sunk: "sink",
    sat: "sit",
    slept: "sleep",
    spoke: "speak",
    spoken: "speak",
    spent: "spend",
    stood: "stand",
    stole: "steal",
    stolen: "steal",
    stuck: "stick",
    swimming: "swim",
    swam: "swim",
    swum: "swim",
    winning: "win",
    taking: "take",
    took: "take",
    taken: "take",
    taught: "teach",
    tore: "tear",
    torn: "tear",
    told: "tell",
    thought: "think",
    threw: "throw",
    thrown: "throw",
    understood: "understand",
    woke: "wake",
    woken: "wake",
    wore: "wear",
    worn: "wear",
    won: "win",
    wrote: "write",
    written: "write",
    children: "child",
    feet: "foot",
    geese: "goose",
    mice: "mouse",
    men: "man",
    women: "woman",
    teeth: "tooth",
    better: "good",
    best: "good",
    worse: "bad",
    worst: "bad",
    farther: "far",
    farthest: "far",
    further: "far",
    furthest: "far",
    criteria: "criterion",
    phenomena: "phenomenon",
    analyses: "analysis",
    hypotheses: "hypothesis"
});

const PHRASE_AUXILIARIES = new Set([
    "am", "are", "be", "been", "being", "did", "do", "does", "had", "has",
    "have", "is", "may", "might", "must", "shall", "should", "was", "were",
    "will", "would", "can", "could"
]);

const PHRASE_OBJECT_PRONOUNS = new Set([
    "him", "her", "it", "me", "them", "us", "you"
]);

export function getEnglishLemmaCandidates(text) {
    const raw = String(text || "").trim().toLowerCase();
    if (!raw || raw.length < 3 || /\s/.test(raw) || !/^[a-z]+(-[a-z]+)?$/i.test(raw)) {
        return [];
    }

    if (LEMMA_STOPWORDS.has(raw)) {
        return [];
    }

    const irregularLemma = IRREGULAR_LEMMA_MAP[raw];
    if (irregularLemma && irregularLemma !== raw) {
        return [irregularLemma];
    }

    const candidates = [];
    const len = raw.length;

    if (raw.endsWith("ies") && len > 4) {
        candidates.push(raw.slice(0, -3) + "y");
    } else if (raw.endsWith("es") && len > 4) {
        if (/(ses|xes|zes|ches|shes)$/.test(raw)) {
            candidates.push(raw.slice(0, -2));
        } else {
            candidates.push(raw.slice(0, -1));
            candidates.push(raw.slice(0, -2));
        }
    } else if (raw.endsWith("s") && !raw.endsWith("ss") && len > 3) {
        candidates.push(raw.slice(0, -1));
    }

    if (raw.endsWith("ing") && len > 5) {
        const stem = raw.slice(0, -3);
        if (/(bb|dd|gg|mm|nn|pp|rr|tt)$/.test(stem)) {
            candidates.push(stem.slice(0, -1));
        } else if (stem.length <= 3) {
            // Short stems commonly restore a dropped final "e":
            // taking -> take, making -> make, hoping -> hope.
            candidates.push(stem + "e");
        } else {
            candidates.push(stem + "e");
            candidates.push(stem);
        }
    }

    if (raw.endsWith("ied") && len > 4) {
        candidates.push(raw.slice(0, -3) + "y");
    } else if (raw.endsWith("ed") && len > 4) {
        const stem = raw.slice(0, -2);
        if (/(bb|dd|gg|mm|nn|pp|rr|tt)$/.test(stem)) {
            candidates.push(stem.slice(0, -1));
        } else if (stem.length <= 3) {
            candidates.push(stem + "e");
        } else {
            candidates.push(stem + "e");
            candidates.push(stem);
        }
    }

    if (raw.endsWith("ier") && len > 4) {
        candidates.push(raw.slice(0, -3) + "y");
    } else if (raw.endsWith("iest") && len > 5) {
        candidates.push(raw.slice(0, -4) + "y");
    } else if (raw.endsWith("er") && len > 4) {
        const stem = raw.slice(0, -2);
        if (/(bb|dd|gg|mm|nn|pp|rr|tt)$/.test(stem)) {
            candidates.push(stem.slice(0, -1));
        } else {
            candidates.push(raw.slice(0, -1));
            candidates.push(stem);
        }
    } else if (raw.endsWith("est") && len > 5) {
        const stem = raw.slice(0, -3);
        if (/(bb|dd|gg|mm|nn|pp|rr|tt)$/.test(stem)) {
            candidates.push(stem.slice(0, -1));
        } else {
            candidates.push(raw.slice(0, -2));
            candidates.push(stem);
        }
    }

    return [...new Set(candidates.filter((candidate) => candidate && candidate !== raw && candidate.length >= 2))];
}

/**
 * Generate conservative canonical candidates for inflected multi-word
 * expressions. Exact phrase lookup remains first; these candidates are only
 * tried after exact lookup and single-word lemma candidates fail.
 *
 * Examples:
 *   looked up       -> look up
 *   taking care of  -> take care of
 *   ran out of      -> run out of
 *   turn it off     -> turn off
 *   has taken off   -> take off
 */
export function getEnglishPhraseCandidates(text) {
    const normalized = String(text || "").replace(/\s+/g, " ").trim().toLowerCase();
    if (!normalized || !/\s/.test(normalized) || !/^[a-z]+(?:[ '-][a-z]+)*$/i.test(normalized)) {
        return [];
    }

    const tokens = normalized.split(" ");
    const candidates = [];
    const pushCandidate = (value) => {
        const candidate = value.join(" ").trim();
        if (candidate && candidate !== normalized && !candidates.includes(candidate)) {
            candidates.push(candidate);
        }
    };

    // Drop leading auxiliaries before canonicalizing the lexical verb.
    let headIndex = 0;
    while (headIndex < tokens.length - 1 && PHRASE_AUXILIARIES.has(tokens[headIndex])) {
        headIndex += 1;
    }

    const head = tokens[headIndex];
    const headCandidates = [
        head,
        ...getEnglishLemmaCandidates(head)
    ];

    for (const lemma of [...new Set(headCandidates)]) {
        const canonical = tokens.slice(headIndex);
        canonical[0] = lemma;
        pushCandidate(canonical);

        // Support separated phrasal verbs such as "turn it off" and
        // "looked it up". Keep this conservative to avoid deleting a real
        // noun/object from ordinary idioms.
        if (
            canonical.length >= 3
            && PHRASE_OBJECT_PRONOUNS.has(canonical[1])
            && canonical.length <= 4
        ) {
            pushCandidate([canonical[0], ...canonical.slice(2)]);
        }
    }

    return candidates;
}
const LEXICAL_FAMILY_KEYS = ["noun", "verb", "adjective", "adverb", "inflections", "derivatives"];
const MAX_LEXICAL_ITEMS = 12;
const MAX_LEXICAL_WARNINGS = 8;
const MAX_CONFUSABLE_PAIRS = 6;
const MAX_DERIVATIVES = 12;
const MAX_FORMATION_ITEMS = 6;
const MAX_LEARNER_MISTAKES = 6;
const MAX_COLLOCATION_ITEMS_PER_GROUP = 10;
const MAX_FORMATION_EXPLANATION_LENGTH = 500;

const COLLOCATION_GROUP_KEYS = ["verbs", "nouns", "prepositions", "adjectives", "patterns"];

function normalizeLexicalItems(value, limit = MAX_LEXICAL_ITEMS) {
    const source = Array.isArray(value)
        ? value
        : typeof value === "string"
            ? value.split(/[,;\n|]+/)
            : [];
    const seen = new Set();
    const items = [];
    for (const item of source) {
        const cleaned = String(item || "").replace(/^[\s`*_\"']+|[\s`*_\"']+$/g, "").trim();
        const key = cleaned.toLocaleLowerCase();
        if (cleaned && !seen.has(key)) {
            seen.add(key);
            items.push(cleaned);
        }
        if (items.length >= limit) break;
    }
    return items;
}

export function parseLexicalProfile(value) {
    const source = typeof value === "string" ? extractJsonObject(value) : value;
    if (!source || typeof source !== "object" || Array.isArray(source)) {
        return null;
    }

    const profileSource = source.lexicalProfile || source.lexical_profile || source;
    const familySource = profileSource.wordFamily || profileSource.word_family || {};
    const wordFamily = {};
    let hasData = false;
    for (const key of LEXICAL_FAMILY_KEYS) {
        const aliases = key === "inflections"
            ? ["inflections", "stems", "forms"]
            : key === "derivatives"
                ? ["derivatives", "derived_terms", "derivations"]
                : [key, key + "s"];
        const values = aliases.flatMap((alias) => normalizeLexicalItems(familySource[alias]));
        wordFamily[key] = normalizeLexicalItems(values, key === "derivatives" ? MAX_DERIVATIVES : MAX_LEXICAL_ITEMS);
        if (wordFamily[key].length) hasData = true;
    }

    const usageWarnings = normalizeLexicalItems(
        profileSource.usageWarnings || profileSource.usage_warnings || profileSource.warnings,
        MAX_LEXICAL_WARNINGS
    );
    if (usageWarnings.length) hasData = true;

    const pairSource = Array.isArray(profileSource.confusablePairs || profileSource.confusable_pairs)
        ? profileSource.confusablePairs || profileSource.confusable_pairs
        : [];
    const seenPairs = new Set();
    const confusablePairs = [];
    for (const pair of pairSource) {
        const word = String(pair?.word || pair?.term || "").trim();
        const distinction = String(pair?.distinction || pair?.explanation || pair?.note || "").trim();
        const pairKey = word.toLocaleLowerCase();
        if (word && distinction && !seenPairs.has(pairKey)) {
            seenPairs.add(pairKey);
            confusablePairs.push({ word, distinction });
        }
        if (confusablePairs.length >= MAX_CONFUSABLE_PAIRS) break;
    }
    if (confusablePairs.length) hasData = true;

    const learnerMistakes = normalizeLearnerMistakes(
        profileSource.learnerMistakes || profileSource.learner_mistakes || profileSource.learnerMistakesList
    );
    if (learnerMistakes.length) hasData = true;

    const wordFormation = normalizeWordFormation(
        profileSource.wordFormation || profileSource.word_formation
    );
    if (wordFormation) hasData = true;

    const collocations = normalizeCollocations(
        profileSource.collocations || profileSource.collocations_list
    );
    if (collocations) hasData = true;

    return hasData
        ? { wordFamily, usageWarnings, confusablePairs, learnerMistakes, wordFormation, collocations }
        : null;
}

function normalizeLearnerMistakes(source) {
    const list = Array.isArray(source) ? source
        : typeof source === "string" ? extractJsonObject(source)
        : null;
    if (!Array.isArray(list)) {
        return [];
    }

    const seen = new Set();
    const mistakes = [];
    for (const item of list) {
        if (mistakes.length >= MAX_LEARNER_MISTAKES) break;
        if (!item || typeof item !== "object") continue;
        const mistake = String(item.mistake || item.original || item.error || "").trim();
        const correction = String(item.correction || item.fixed || item.correct || "").trim();
        const example = String(item.example || item.example_sentence || "").trim();
        const key = `${mistake}|${correction}`.toLowerCase();
        if (mistake && correction && !seen.has(key)) {
            seen.add(key);
            mistakes.push({ mistake, correction, ...(example ? { example } : {}) });
        }
    }
    return mistakes;
}

function normalizeWordFormation(source) {
    if (!source || typeof source !== "object" || Array.isArray(source)) {
        return null;
    }

    const prefixes = normalizeLexicalItems(
        source.prefixes || source.prefix
    );
    const suffixes = normalizeLexicalItems(
        source.suffixes || source.suffix
    );
    const explanation = String(
        source.explanation || source.note || source.description || ""
    ).trim().slice(0, MAX_FORMATION_EXPLANATION_LENGTH);

    if (!prefixes.length && !suffixes.length && !explanation) {
        return null;
    }

    return {
        prefixes: prefixes.slice(0, MAX_FORMATION_ITEMS),
        suffixes: suffixes.slice(0, MAX_FORMATION_ITEMS),
        explanation
    };
}

function normalizeCollocations(source) {
    if (!source || typeof source !== "object" || Array.isArray(source)) {
        return null;
    }

    const collocations = {};
    // De-duplicate across groups so a phrase that legitimately appears in
    // multiple groups (e.g. as both a noun pairing and a pattern) is only
    // shown once, preserving the first occurrence in COLLOCATION_GROUP_KEYS
    // order.
    const seen = new Set();
    let hasData = false;
    for (const key of COLLOCATION_GROUP_KEYS) {
        const rawValue = source[key];
        const values = (Array.isArray(rawValue) ? rawValue
            : typeof rawValue === "string" ? rawValue.split(/[,;\n|]+/)
                : []).map((item) => String(item || "").replace(/^[\s`*_\"']+|[\s`*_\"']+$/g, "").trim())
            .filter((cleaned) => {
                const lowercase = cleaned.toLocaleLowerCase();
                if (!cleaned || seen.has(lowercase)) {
                    return false;
                }
                seen.add(lowercase);
                return true;
            });
        collocations[key] = values.slice(0, MAX_COLLOCATION_ITEMS_PER_GROUP);
        if (collocations[key].length) hasData = true;
    }

    return hasData ? collocations : null;
}

export function extractLexicalProfileFromMarkdown(markdown) {
    const text = String(markdown || "");
    if (!text) return null;

    const xml = text.match(/<lexical-profile>\s*([\s\S]*?)\s*<\/lexical-profile>/i);
    if (xml) {
        const parsed = parseLexicalProfile(xml[1]);
        if (parsed) return parsed;
    }

    const usageWarnings = [];
    const registerTags = text.match(/\[(formal|informal|slang|archaic|technical|academic|literary|colloquial)\]/gi) || [];
    for (const tag of registerTags) {
        const label = tag.slice(1, -1).toLowerCase();
        const warning = label.charAt(0).toUpperCase() + label.slice(1) + " register";
        if (!usageWarnings.includes(warning)) usageWarnings.push(warning);
    }

    const match = text.match(/(?:often\s+)?confused\s+with\s+[`*_\"']?([a-z][a-z-]*)[`*_\"']?(?:\s*[:—-]\s*([^\n.]+))?/i);
    const confusablePairs = match
        ? [{ word: match[1], distinction: String(match[2] || "").trim() || ("Often confused with " + match[1] + ".") }]
        : [];
    return parseLexicalProfile({ usageWarnings, confusablePairs });
}

export function mergeLexicalProfiles(baseProfile, nextProfile) {
    const base = parseLexicalProfile(baseProfile);
    const next = parseLexicalProfile(nextProfile);
    if (!base) return next;
    if (!next) return base;

    const wordFamily = {};
    for (const key of LEXICAL_FAMILY_KEYS) {
        wordFamily[key] = normalizeLexicalItems([
            ...(base.wordFamily[key] || []),
            ...(next.wordFamily[key] || [])
        ]);
    }
    const usageWarnings = normalizeLexicalItems([
        ...(base.usageWarnings || []),
        ...(next.usageWarnings || [])
    ], MAX_LEXICAL_WARNINGS);
    const pairs = new Map();
    for (const pair of [...(base.confusablePairs || []), ...(next.confusablePairs || [])]) {
        const pairKey = pair.word.toLocaleLowerCase();
        if (!pairs.has(pairKey)) pairs.set(pairKey, pair);
    }
    const learnerMistakes = normalizeLearnerMistakes([
        ...(base.learnerMistakes || []),
        ...(next.learnerMistakes || [])
    ]);
    const wordFormation = base.wordFormation || next.wordFormation || null;
    const collocations = normalizeCollocations({
        ...base.collocations,
        ...next.collocations
    });
    return {
        wordFamily,
        usageWarnings,
        confusablePairs: [...pairs.values()].slice(0, MAX_CONFUSABLE_PAIRS),
        learnerMistakes,
        wordFormation,
        collocations
    };
}
