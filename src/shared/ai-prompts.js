/**
 * Built-in AI prompt templates and legacy-default matching.
 * Shared by settings defaults and the AI provider so stored and fallback
 * prompts cannot drift apart.
 */

export const AI_INTENTS = Object.freeze([
    "default",
    "explain_in_context",
    "grammar",
    "phrase_fallback",
    "sentence_breakdown",
    "phrase_explorer"
]);

/** Intents whose Markdown output is supplemented by lexical-profile cards. */
export const LEXICAL_PROFILE_INTENTS = Object.freeze([
    "default",
    "grammar",
    "phrase_explorer"
]);

export const PROFILE_SECTION_TITLES = Object.freeze({
    wordFamily: new Set(["word family", "related forms", "derived forms"]),
    usageWarnings: new Set(["usage note", "usage notes", "usage warnings", "usage & register notes", "register notes", "usage and register", "register and nuance"]),
    confusablePairs: new Set(["confusables", "common learner errors or confusables", "confusable words"]),
    wordFormation: new Set(["word formation"]),
    learnerMistakes: new Set(["common learner mistakes", "learner mistakes", "common learner errors", "common learner errors or confusables"]),
    collocations: new Set(["collocations", "natural collocations", "common structures", "related idioms or phrases", "related idioms", "related expressions"])
});

export function shouldRequestLexicalProfile(intent, enabled) {
    return enabled !== false && LEXICAL_PROFILE_INTENTS.includes(intent);
}

function outlineEntry(title, kind, aliases = []) {
    return Object.freeze({ title, kind, aliases: Object.freeze(aliases) });
}

/**
 * Built-in Markdown outlines. Provider-assigned kinds come from exact titles
 * first, then aliases, then a heading heuristic. Unknown custom headings keep
 * model order because they do not receive a known rank.
 */
export const AI_SECTION_OUTLINES = Object.freeze({
    default: Object.freeze([
        outlineEntry("", "intro"),
        outlineEntry("Translation & Meaning", "translation"),
        outlineEntry("Usage Note", "usage"),
        outlineEntry("Example Sentences", "examples"),
        outlineEntry("Deep Understanding", "etymology")
    ]),
    explain_in_context: Object.freeze([
        outlineEntry("Meaning in Context", "definitions"),
        outlineEntry("Natural Paraphrases", "examples")
    ]),
    grammar: Object.freeze([
        outlineEntry("Grammatical Role & Structure", "grammar", ["Grammatical Role", "Sentence Structure"]),
        outlineEntry("Meaning & Register", "usage", ["Meaning and Register"]),
        outlineEntry("Short Examples", "examples")
    ]),
    phrase_explorer: Object.freeze([
        outlineEntry("Core Meaning", "definitions"),
        outlineEntry("Grammar & Patterns", "grammar"),
        outlineEntry("Register and Nuance", "usage", ["Register & Nuance"]),
        outlineEntry("Natural Examples", "examples")
    ]),
    phrase_fallback: Object.freeze([
        outlineEntry("Meaning", "definitions", ["Literal Meaning", "Idiomatic Meaning"]),
        outlineEntry("Usage and Register", "usage"),
        outlineEntry("Example", "examples"),
        outlineEntry("Related Expressions", "phrase")
    ]),
    sentence_breakdown: Object.freeze([])
});

const KIND_BY_INTENT_TITLE = (() => {
    const byIntent = {};
    for (const [intent, entries] of Object.entries(AI_SECTION_OUTLINES)) {
        const titles = {};
        for (const entry of entries) {
            const title = String(entry.title || "").trim().toLowerCase();
            if (!title) {
                continue;
            }
            titles[title] = entry.kind;
            for (const alias of entry.aliases || []) {
                const aliasTitle = String(alias || "").trim().toLowerCase();
                if (aliasTitle) {
                    titles[aliasTitle] = entry.kind;
                }
            }
        }
        byIntent[intent] = titles;
    }
    return Object.freeze(byIntent);
})();

/**
 * Map a Markdown heading to a stable AI section kind.
 * Exact built-in titles win; unknown titles return "" so the splitter can
 * fall back to the heading heuristic without inventing a rank.
 */
export function kindForAiSection(intent, title) {
    const normalizedIntent = AI_INTENTS.includes(intent) ? intent : "default";
    const normalizedTitle = String(title || "").trim().toLowerCase();
    if (!normalizedTitle) {
        return "";
    }
    if (normalizedTitle === "context used") {
        return "context";
    }
    return KIND_BY_INTENT_TITLE[normalizedIntent]?.[normalizedTitle] || "";
}

export const DEFAULT_AI_PROMPT_TEMPLATE = [
    "Act as an expert lexicographer and language educator. Provide a focused, educational breakdown of \"{{str}}\".",
    "",
    "Use simple, high-frequency vocabulary in the Oxford Learner's Dictionaries style.",
    "Use only Markdown headings at level 3 (###), short paragraphs, bullets, and blockquotes. Do not use HTML or code fences. Do not repeat headings.",
    "Do not include a synonyms list, antonyms list, or memory aids; those are covered elsewhere.",
    "",
    "Start with a short untitled intro: **{{str}}** [IPA pronunciation] *part of speech*, then a concise Oxford-style definition with no introductory phrases.",
    "",
    "### Translation & Meaning",
    "Provide accurate, natural translation(s) of \"{{str}}\" into {{targetLang}}. If the word has distinct primary senses or parts of speech, list each with its corresponding translation and a brief explanation in {{targetLang}}. Put the translation only in this section.",
    "",
    "### Usage Note",
    "Explain nuance, connotation, or register in 1-3 sentences. Do not list word-family forms, collocations, confusable words, or learner mistakes here.",
    "",
    "### Example Sentences",
    "Give 2 realistic examples as blockquotes showing this specific sense, with brief translations into {{targetLang}}.",
    "",
    "### Deep Understanding",
    "Give the etymology or origin and subtle pragmatic notes for this sense in 1-2 short paragraphs.",
    "Do not list related forms, derivatives, collocations, confusable words, or learner mistakes."
].join("\n");

export const DEFAULT_AI_CONTEXT_PROMPT_TEMPLATE = [
    "Explain the selected text in its surrounding context for a language learner.",
    "Selected text: \"{{str}}\"",
    "Target language: {{targetLang}}",
    "Surrounding context:",
    "\"\"\"",
    "{{context}}",
    "\"\"\"",
    "",
    "Keep the answer compact and scannable. Do not add a separate translation section or repeat the plain summary.",
    "Use only Markdown headings at level 3 (###), bullets, and short paragraphs. Do not use HTML or code fences. Do not repeat headings.",
    "### Meaning in Context",
    "Explain what \"{{str}}\" means specifically in this surrounding sentence, including its contextual translation into {{targetLang}}.",
    "",
    "### Natural Paraphrases",
    "Provide 2-3 natural ways to rephrase the context sentence with brief glosses in {{targetLang}}."
].join("\n");

export const DEFAULT_AI_GRAMMAR_PROMPT_TEMPLATE = [
    "Analyze the grammatical structure, register, tone, and syntax of the selected text for a language learner.",
    "Selected text: \"{{str}}\"",
    "Target language: {{targetLang}}",
    "Optional context:",
    "\"\"\"",
    "{{context}}",
    "\"\"\"",
    "",
    "Formatting instructions:",
    "- Use clear markdown subheadings at level 3 (###) for each distinct section.",
    "- Do not use HTML, code fences, or duplicate section headings.",
    "- Do not include a separate Translation or Summary section.",
    "",
    "Include these sections:",
    "### Grammatical Role & Structure",
    "State the part of speech, syntax role, and word order / clause pattern.",
    "",
    "### Meaning & Register",
    "Explain nuance, formality, and tone in 1-3 sentences. Do not list learner mistakes or confusable words here.",
    "",
    "### Short Examples",
    "Provide 2 short example sentences illustrating this pattern, with brief translations into {{targetLang}}."
].join("\n");

export const DEFAULT_AI_SENTENCE_PROMPT_TEMPLATE = [
    "Analyze the supplied sentence for an English language learner.",
    "Selected query: {{str}}",
    "Sentence to analyze:",
    "\"\"\"",
    "{{sentence}}",
    "\"\"\"",
    "Target language: {{targetLang}}",
    "",
    "Return only one valid JSON object. Do not wrap it in Markdown or add commentary.",
    "Use this exact shape:",
    "{",
    "  \"sentence\": \"the sentence being analyzed\",",
    "  \"translation\": \"translation into the target language\",",
    "  \"parts\": [{\"text\": \"exact text\", \"role\": \"subject|verb phrase|object|modifier|clause|other\", \"explanation\": \"short explanation\"}],",
    "  \"phrases\": [{\"text\": \"exact phrase from the sentence\", \"type\": \"phrasal_verb|idiom|collocation|fixed_expression\", \"meaning\": \"learner-friendly meaning\", \"role\": \"grammatical function\", \"example\": \"short example\"}],",
    "  \"learnerNotes\": [\"short useful note\"]",
    "}",
    "",
    "Rules:",
    "- Analyze only the supplied sentence; never invent surrounding text.",
    "- Identify the selected query when it appears in the sentence.",
    "- Include only phrases that appear exactly or nearly exactly in the supplied sentence.",
    "- Return an empty phrases array when no phrasal verb, idiom, collocation, or fixed expression is present.",
    "- Keep each explanation concise and suitable for a language learner."
].join("\n");

export const DEFAULT_AI_PHRASE_EXPLORER_PROMPT_TEMPLATE = [
    "Explore the phrase, idiom, phrasal verb, collocation, or expression \"{{str}}\" for a language learner.",
    "Target language: {{targetLang}}",
    "Optional context:",
    "\"\"\"",
    "{{context}}",
    "\"\"\"",
    "",
    "Keep the answer concise, accurate, and practical. Use level-3 Markdown headings (###) and bullet lists. Do not use code fences or HTML.",
    "Do not invent context. If the expression is not idiomatic, explain its preposition patterns and literal usage.",
    "Do not add Word Family, Related Forms, Derived Forms, Word Formation, Usage Warnings, Confusables, Common Learner Mistakes, Collocations, or Natural Collocations headings; reliable data for those categories belongs in the structured lexical profile.",
    "",
    "### Core Meaning",
    "Give the natural meaning and translation into {{targetLang}} first, then explain any literal meaning, image, or word partnerships.",
    "",
    "### Grammar & Patterns",
    "Show the grammatical pattern, separability for phrasal verbs, required preposition combinations (e.g. depend + on, fond + of), and common variations.",
    "",
    "### Register and Nuance",
    "Explain tone, formality, connotation, and when a learner should or should not use it.",
    "",
    "### Natural Examples",
    "Give 2-3 realistic example sentences in context with brief translations into {{targetLang}}."
].join("\n");

export const DEFAULT_AI_PHRASE_FALLBACK_PROMPT_TEMPLATE = [
    "Explain the multi-word phrase or idiom \"{{str}}\" for a language learner.",
    "Target language: {{targetLang}}",
    "",
    "Format using clear markdown subheadings (###) and bullet points.",
    "### Meaning",
    "Provide the natural translation into {{targetLang}} and explain the real-world idiomatic meaning, noting literal meaning only if it differs significantly.",
    "",
    "### Usage and Register",
    "Note formality (conversational, formal, idiom).",
    "",
    "### Example",
    "Give a realistic sentence.",
    "",
    "### Related Expressions",
    "List 2-3 related idioms or phrases."
].join("\n");

export const DEFAULT_AI_PROMPTS = Object.freeze({
    aiPromptTemplate: DEFAULT_AI_PROMPT_TEMPLATE,
    aiContextPromptTemplate: DEFAULT_AI_CONTEXT_PROMPT_TEMPLATE,
    aiGrammarPromptTemplate: DEFAULT_AI_GRAMMAR_PROMPT_TEMPLATE,
    aiSentencePromptTemplate: DEFAULT_AI_SENTENCE_PROMPT_TEMPLATE,
    aiPhraseExplorerPromptTemplate: DEFAULT_AI_PHRASE_EXPLORER_PROMPT_TEMPLATE
});

/**
 * Previous built-in defaults. Schema migration replaces a saved template
 * only when it still matches one of these exact strings.
 */
export const LEGACY_DEFAULT_AI_PROMPT_TEMPLATES = Object.freeze({
    aiPromptTemplate: [
        "Act as an expert lexicographer and language educator. Your goal is to provide a comprehensive, scannable, and educational breakdown of the target term \"{{str}}\".\n\nPresent information in a clean, flowing format similar to standard online dictionaries, strictly emulating the Oxford Learner's Dictionaries style (using simple, high-frequency vocabulary for definitions).\n\nInclude these essential elements:\n- IPA phonetic pronunciation for the specific part of speech\n- Part of speech\n- Clear and concise definition (Oxford style) without introductory phrases\n- Translation & Meaning: MUST include a Markdown heading exactly `### Translation & Meaning`, followed by the translation into {{targetLang}}. Put the translation only in this section; do not include any translation line in the introductory definition\n- Usage Note (nuance, connotation, or register)\n- Example sentences\n- Common synonyms & antonyms\n- Collocations (words that often go with it)\n- Common Structures (e.g., ~ + that clause, ~ + to do sth)\n- Related idioms or phrases\n- Common Learner Errors or Confusables (usage pitfalls or similar-sounding words)\n- Memory Aids (mnemonics or creative ways to remember the term)\n- Deep Understanding (etymology & extended usage): provide the word's etymology or origin story to make the meaning more memorable; expand on related forms and derived words (e.g., if learning 'analyse' also note 'analysis', 'analytical'); highlight typical collocations and phrase patterns; and explain subtle connotations, register differences, or pragmatic notes beyond the basic definition.\n\nFormat your response with traditional dictionary styling:\n- Bold word followed by [IPA pronunciation] and *part of speech* in italics.\n- Definition presented in a natural paragraph form.\n- Related terms, examples, and context in distinct Bold Sections divided by horizontal rules (---).\n- Do not use Markdown headings (no # or ##).\n- Use blockquotes (>) for example sentences.",
        [
            "Act as an expert lexicographer and language educator. Provide a comprehensive, scannable, educational breakdown of \"{{str}}\".",
            "",
            "Use simple, high-frequency vocabulary in the Oxford Learner's Dictionaries style.",
            "Use only Markdown headings at level 3 (###), short paragraphs, bullets, and blockquotes. Do not use HTML or code fences. Do not repeat headings.",
            "",
            "Start with a short untitled intro: **{{str}}** [IPA pronunciation] *part of speech*, then a concise Oxford-style definition with no introductory phrases.",
            "",
            "### Translation & Meaning",
            "Translate \"{{str}}\" into {{targetLang}}. Put the translation only in this section.",
            "",
            "### Usage Note",
            "Explain nuance, connotation, or register in 1-3 sentences. Do not list word-family forms, collocations, confusable words, or learner mistakes here.",
            "",
            "### Example Sentences",
            "Give 2-3 realistic examples as blockquotes.",
            "",
            "### Synonyms & Antonyms",
            "List common synonyms and antonyms for this sense.",
            "",
            "### Common Structures",
            "Show typical patterns such as ~ + that clause or ~ + to do sth.",
            "",
            "### Related Idioms or Phrases",
            "List a few related idioms or phrases. Do not list derived word forms.",
            "",
            "### Memory Aids",
            "Give a mnemonic or memorable hook.",
            "",
            "### Deep Understanding",
            "Give the etymology or origin and subtle pragmatic notes for this sense.",
            "Do not list related forms, derivatives, collocations, confusable words, or learner mistakes."
        ].join("\n"),
        [
            "Act as an expert lexicographer and language educator. Provide a focused, educational breakdown of \"{{str}}\".",
            "",
            "Use simple, high-frequency vocabulary in the Oxford Learner's Dictionaries style.",
            "Use only Markdown headings at level 3 (###), short paragraphs, bullets, and blockquotes. Do not use HTML or code fences. Do not repeat headings.",
            "Do not include a synonyms list, antonyms list, or memory aids; those are covered elsewhere.",
            "",
            "Start with a short untitled intro: **{{str}}** [IPA pronunciation] *part of speech*, then a concise Oxford-style definition with no introductory phrases.",
            "",
            "### Translation & Meaning",
            "Translate \"{{str}}\" into {{targetLang}}. Put the translation only in this section.",
            "",
            "### Usage Note",
            "Explain nuance, connotation, or register in 1-3 sentences. Do not list word-family forms, collocations, confusable words, or learner mistakes here.",
            "",
            "### Example Sentences",
            "Give 2 realistic examples as blockquotes showing this specific sense.",
            "",
            "### Deep Understanding",
            "Give the etymology or origin and subtle pragmatic notes for this sense in 1-2 short paragraphs.",
            "Do not list related forms, derivatives, collocations, confusable words, or learner mistakes."
        ].join("\n"),
        [
            "Act as an expert lexicographer and language educator. Provide a focused, educational breakdown of \"{{str}}\".",
            "",
            "Use simple, high-frequency vocabulary in the Oxford Learner's Dictionaries style.",
            "Use only Markdown headings at level 3 (###), short paragraphs, bullets, and blockquotes. Do not use HTML or code fences. Do not repeat headings.",
            "Do not include a synonyms list, antonyms list, or memory aids; those are covered elsewhere.",
            "",
            "Start with a short untitled intro: **{{str}}** [IPA pronunciation] *part of speech*, then a concise Oxford-style definition with no introductory phrases.",
            "",
            "### Translation & Meaning",
            "Provide accurate, natural translation(s) of \"{{str}}\" into {{targetLang}}. If the word has distinct primary senses or parts of speech, list each with its corresponding translation and a brief explanation in {{targetLang}}. Put the translation only in this section.",
            "",
            "### Usage Note",
            "Explain nuance, connotation, or register in 1-3 sentences. Do not list word-family forms, collocations, confusable words, or learner mistakes here.",
            "",
            "### Example Sentences",
            "Give 2 realistic examples as blockquotes showing this specific sense.",
            "",
            "### Deep Understanding",
            "Give the etymology or origin and subtle pragmatic notes for this sense in 1-2 short paragraphs.",
            "Do not list related forms, derivatives, collocations, confusable words, or learner mistakes."
        ].join("\n")
    ],
    aiContextPromptTemplate: [
        "Explain the selected text in its surrounding context for a language learner.\nSelected text: \"{{str}}\"\nTarget language: {{targetLang}}\nSurrounding context:\n\"\"\"\n{{context}}\n\"\"\"\n\nKeep the answer compact and scannable.\nInclude:\n- Meaning in this context\n- Simple explanation\n- One or two natural example paraphrases\n- Translation into {{targetLang}}\nDo not invent context that is not present.",
        [
            "Explain the selected text in its surrounding context for a language learner.",
            "Selected text: \"{{str}}\"",
            "Target language: {{targetLang}}",
            "Surrounding context:",
            "\"\"\"",
            "{{context}}",
            "\"\"\"",
            "",
            "Keep the answer compact and scannable.",
            "Use only Markdown headings at level 3 (###), bullets, and short paragraphs. Do not use HTML or code fences. Do not repeat headings.",
            "### Meaning in Context",
            "Explain what \"{{str}}\" means specifically in this surrounding sentence.",
            "",
            "### Simple Explanation",
            "Provide a plain-language summary for learners.",
            "",
            "### Natural Paraphrases",
            "Provide 2-3 natural ways to rephrase the context sentence.",
            "",
            "### Translation",
            "Translate the meaning of \"{{str}}\" in this sentence into {{targetLang}}."
        ].join("\n"),
        [
            "Explain the selected text in its surrounding context for a language learner.",
            "Selected text: \"{{str}}\"",
            "Target language: {{targetLang}}",
            "Surrounding context:",
            "\"\"\"",
            "{{context}}",
            "\"\"\"",
            "",
            "Keep the answer compact and scannable. Do not add a separate translation section or repeat the plain summary.",
            "Use only Markdown headings at level 3 (###), bullets, and short paragraphs. Do not use HTML or code fences. Do not repeat headings.",
            "### Meaning in Context",
            "Explain what \"{{str}}\" means specifically in this surrounding sentence.",
            "",
            "### Natural Paraphrases",
            "Provide 2-3 natural ways to rephrase the context sentence with brief glosses in {{targetLang}}."
        ].join("\n")
    ],
    aiGrammarPromptTemplate: [
        "Analyze the term or phrase \"{{str}}\" for a language learner. Explain its grammatical role, sentence structure, meaning, tone, register, common learner mistakes, short examples, and translation into {{targetLang}}. If context is provided, explain how it functions in that sentence. Context: \"{{context}}\"",
        [
            "Analyze the grammatical structure, register, tone, and usage of the selected text for a language learner.",
            "Selected text: \"{{str}}\"",
            "Target language: {{targetLang}}",
            "Optional context:",
            "\"\"\"",
            "{{context}}",
            "\"\"\"",
            "",
            "Formatting instructions:",
            "- Use clear markdown subheadings at level 3 (###) for each distinct section.",
            "- Do not use HTML, code fences, or duplicate section headings.",
            "",
            "Include these sections:",
            "### Grammatical Role",
            "State part of speech and syntax role.",
            "",
            "### Sentence Structure",
            "Explain word order or clause pattern.",
            "",
            "### Meaning & Register",
            "Explain nuance, formality, and tone.",
            "",
            "### Common Learner Mistakes",
            "List 1-2 frequent errors or confusables.",
            "",
            "### Contextual Analysis",
            "Break down how the phrase functions in the provided context if present.",
            "",
            "### Short Examples",
            "Provide 2-3 short example sentences.",
            "",
            "### Translation",
            "Translate the term into {{targetLang}}.",
            "",
            "### Summary for Learner",
            "Provide 1-2 takeaway sentences."
        ].join("\n"),
        [
            "Analyze the grammatical structure, register, tone, and usage of the selected text for a language learner.",
            "Selected text: \"{{str}}\"",
            "Target language: {{targetLang}}",
            "Optional context:",
            "\"\"\"",
            "{{context}}",
            "\"\"\"",
            "",
            "Formatting instructions:",
            "- Use clear markdown subheadings at level 3 (###) for each distinct section.",
            "- Do not use HTML, code fences, or duplicate section headings.",
            "",
            "Include these sections:",
            "### Grammatical Role",
            "State part of speech and syntax role.",
            "",
            "### Sentence Structure",
            "Explain word order or clause pattern.",
            "",
            "### Meaning & Register",
            "Explain nuance, formality, and tone. Do not list learner mistakes or confusable words here.",
            "",
            "### Contextual Analysis",
            "Break down how the phrase functions in the provided context if present.",
            "",
            "### Short Examples",
            "Provide 2-3 short example sentences.",
            "",
            "### Translation",
            "Translate the term into {{targetLang}}.",
            "",
            "### Summary for Learner",
            "Provide 1-2 takeaway sentences."
        ].join("\n")
    ],
    aiPhraseExplorerPromptTemplate: [
        "Explore the phrase, idiom, phrasal verb, collocation, or expression \"{{str}}\" for a language learner.\nTarget language: {{targetLang}}\nOptional context:\n\"\"\"\n{{context}}\n\"\"\"\n\nKeep the answer concise, accurate, and practical. Use level-3 Markdown headings (###) and bullet lists. Do not use code fences or HTML.\nDo not invent context. If the expression is not idiomatic, explain its natural collocations, preposition patterns, and literal usage.\n\n### Core Meaning\nGive the natural meaning first, then explain any literal meaning, image, or word partnerships.\n\n### Grammar & Patterns\nShow the grammatical pattern, separability for phrasal verbs, required preposition combinations (e.g. depend + on, fond + of), and common variations.\n\n### Natural Collocations\nList 3-5 frequent word partnerships (verb+noun, adjective+noun, noun+noun) or related expressions with brief definitions or translations.\n\n### Register and Nuance\nExplain tone, formality, connotation, and when a learner should or should not use it.\n\n### Natural Examples\nGive 2-3 realistic example sentences in context with brief translations into {{targetLang}}.\n\n### Common Learner Mistakes\nList up to 3 likely errors involving word order, prepositions, false friends, or register.",
        [
            "Explore the phrase, idiom, phrasal verb, collocation, or expression \"{{str}}\" for a language learner.",
            "Target language: {{targetLang}}",
            "Optional context:",
            "\"\"\"",
            "{{context}}",
            "\"\"\"",
            "",
            "Keep the answer concise, accurate, and practical. Use level-3 Markdown headings (###) and bullet lists. Do not use code fences or HTML.",
            "Do not invent context. If the expression is not idiomatic, explain its preposition patterns and literal usage.",
            "Do not add Word Family, Collocations, Natural Collocations, or Common Learner Mistakes headings; those belong in the structured lexical profile when available.",
            "",
            "### Core Meaning",
            "Give the natural meaning first, then explain any literal meaning, image, or word partnerships.",
            "",
            "### Grammar & Patterns",
            "Show the grammatical pattern, separability for phrasal verbs, required preposition combinations (e.g. depend + on, fond + of), and common variations.",
            "",
            "### Register and Nuance",
            "Explain tone, formality, connotation, and when a learner should or should not use it.",
            "",
            "### Natural Examples",
            "Give 2-3 realistic example sentences in context with brief translations into {{targetLang}}."
        ].join("\n"),
        [
            "Explore the phrase, idiom, phrasal verb, collocation, or expression \"{{str}}\" for a language learner.",
            "Target language: {{targetLang}}",
            "Optional context:",
            "\"\"\"",
            "{{context}}",
            "\"\"\"",
            "",
            "Keep the answer concise, accurate, and practical. Use level-3 Markdown headings (###) and bullet lists. Do not use code fences or HTML.",
            "Do not invent context. If the expression is not idiomatic, explain its preposition patterns and literal usage.",
            "Do not add Word Family, Related Forms, Derived Forms, Word Formation, Usage Warnings, Confusables, Common Learner Mistakes, Collocations, or Natural Collocations headings; reliable data for those categories belongs in the structured lexical profile.",
            "",
            "### Core Meaning",
            "Give the natural meaning first, then explain any literal meaning, image, or word partnerships.",
            "",
            "### Grammar & Patterns",
            "Show the grammatical pattern, separability for phrasal verbs, required preposition combinations (e.g. depend + on, fond + of), and common variations.",
            "",
            "### Register and Nuance",
            "Explain tone, formality, connotation, and when a learner should or should not use it.",
            "",
            "### Natural Examples",
            "Give 2-3 realistic example sentences in context with brief translations into {{targetLang}}."
        ].join("\n"),
        [
            "Explore the phrase, idiom, phrasal verb, collocation, or expression \"{{str}}\" for a language learner.",
            "Target language: {{targetLang}}",
            "Optional context:",
            "\"\"\"",
            "{{context}}",
            "\"\"\"",
            "",
            "Keep the answer concise, accurate, and practical. Use level-3 Markdown headings (###) and bullet lists. Do not use code fences or HTML.",
            "Do not invent context. If the expression is not idiomatic, explain its preposition patterns and literal usage.",
            "Do not add Word Family, Related Forms, Derived Forms, Word Formation, Usage Warnings, Confusables, Common Learner Mistakes, Collocations, or Natural Collocations headings; reliable data for those categories belongs in the structured lexical profile.",
            "",
            "### Core Meaning",
            "Give the natural meaning first, then explain any literal meaning, image, or word partnerships.",
            "",
            "### Grammar & Patterns",
            "Show the grammatical pattern, separability for phrasal verbs, required preposition combinations (e.g. depend + on, fond + of), and common variations.",
            "",
            "### Register and Nuance",
            "Explain tone, formality, connotation, and when a learner should or should not use it.",
            "",
            "### Natural Examples",
            "Give 2-3 realistic example sentences in context with brief translations into {{targetLang}}."
        ].join("\n")
    ]
});

export function getLegacyDefaultPromptUpdates(savedPrompts = {}) {
    const updates = {};
    for (const [key, legacyList] of Object.entries(LEGACY_DEFAULT_AI_PROMPT_TEMPLATES)) {
        const saved = String(savedPrompts?.[key] || "").trim();
        if (!saved) {
            continue;
        }
        if (legacyList.some((legacy) => String(legacy).trim() === saved)) {
            updates[key] = DEFAULT_AI_PROMPTS[key];
        }
    }
    return updates;
}
