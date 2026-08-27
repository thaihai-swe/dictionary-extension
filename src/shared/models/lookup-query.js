/**
 * lookup-query.js — OOP Domain Entity representing a user query with context.
 */
export const MAX_CONTEXT_CHARS = 800;

export class LookupQuery {
    constructor(text = "", context = "", intent = "") {
        this.rawText = String(text || "").trim();
        this.rawContext = String(context || "").trim();
        this.intent = intent;
    }

    get text() {
        return this.rawText;
    }

    get context() {
        const normalized = this.rawContext.replace(/\s+/g, " ").trim();
        if (!normalized) return "";
        if (normalized.length <= MAX_CONTEXT_CHARS) return normalized;
        return `${normalized.slice(0, MAX_CONTEXT_CHARS).trim()}…`;
    }

    get words() {
        return this.rawText.split(/\s+/).filter(Boolean);
    }

    get wordCount() {
        return this.words.length;
    }

    get isEmpty() {
        return !this.rawText;
    }

    get isWord() {
        return this.wordCount === 1;
    }

    get isSentence() {
        return /[.!?]/.test(this.rawText) || this.wordCount >= 7;
    }

    get isPhrase() {
        return !this.isEmpty && !this.isWord && !this.isSentence;
    }

    get category() {
        if (this.isEmpty) return "empty";
        if (this.isWord) return "word";
        if (this.isSentence) return "sentence";
        return "phrase";
    }

    get normalizedTerm() {
        return this.rawText.replace(/^[^a-zA-Z]+|[^a-zA-Z' -]+$/g, "") || this.rawText;
    }

    hasContext() {
        return Boolean(this.context);
    }

    validateContext() {
        if (!this.hasContext()) {
            return {
                ok: false,
                error: "Please enter or paste the sentence containing this word."
            };
        }
        return {
            ok: true,
            context: this.context
        };
    }

    getEligibleFollowUpIntents() {
        const intents = [];
        if (this.isWord || this.isPhrase) {
            if (this.hasContext()) {
                intents.push({
                    intent: "explain_in_context",
                    title: "Contextual Explanation",
                    label: "Explain in Context",
                    errorMessage: "Unable to explain this word in context."
                });
            }
            intents.push({
                intent: "grammar",
                title: "Grammar & Nuance",
                label: "Grammar & Nuance",
                errorMessage: "Unable to analyze grammar."
            });
            intents.push({
                intent: "phrase_explorer",
                title: "Phrase Explorer",
                label: "Phrases & Collocations",
                errorMessage: "Unable to explore phrases."
            });
            intents.push({
                intent: "compare_confusables",
                title: "Confusable Words",
                label: "Compare Confusables",
                errorMessage: "Unable to compare words."
            });
        }

        if (this.isSentence || this.hasContext()) {
            intents.push({
                intent: "sentence_breakdown",
                title: "Sentence Breakdown",
                label: "Sentence Breakdown",
                errorMessage: "Unable to break down sentence."
            });
            intents.push({
                intent: "rephrase",
                title: "Rephrase Options",
                label: "Rephrase",
                errorMessage: "Unable to rephrase sentence."
            });
        }

        return intents;
    }
}
