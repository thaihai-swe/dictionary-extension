/**
 * ai-markdown-parser.js — Markdown cleanup, section splitting, and JSON extraction from AI responses.
 */
import { kindForAiSection } from "../ai-prompts.js";

const MAX_AI_RESPONSE_CHARS = 16000;

export function normalizeAiMarkdown(value) {
    let text = String(value || "").replace(/\r\n/g, "\n");
    if (text.length > MAX_AI_RESPONSE_CHARS) {
        text = text.slice(0, MAX_AI_RESPONSE_CHARS);
    }
    return text.replace(/\n{3,}/g, "\n\n").trim();
}

export function inferSectionKind(title = "", fallback = "general") {
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

    if (normalized.includes("formal") || normalized.includes("professional")) {
        return "rephrase-formal";
    }

    if (normalized.includes("idiomatic") || normalized.includes("native")) {
        return "rephrase-idiomatic";
    }

    if (normalized.includes("detected phrase") || normalized.includes("phrase parsing")) {
        return "phrase-parsing";
    }

    if (normalized.includes("sentence structure") || normalized.includes("sentence breakdown")) {
        return "sentence-structure";
    }

    if (normalized.includes("translation")) {
        return "translation";
    }

    if (normalized.includes("definition") || normalized.includes("meaning") || normalized.includes("core sense")) {
        return "definitions";
    }

    if (normalized.includes("example") || normalized.includes("sample")) {
        return "examples";
    }

    if (normalized.includes("grammar") || normalized.includes("part of speech")) {
        return "grammar";
    }

    if (normalized.includes("collocation") || normalized.includes("common phrase")) {
        return "collocations";
    }

    if (normalized.includes("synonym") || normalized.includes("antonym")) {
        return "lexical";
    }

    if (normalized.includes("etymology") || normalized.includes("origin")) {
        return "etymology";
    }

    return fallback;
}

export function kindForSplitSection(title, options, isLeadingUntitled) {
    if (isLeadingUntitled) {
        return options.intent === "rephrase" ? "rephrase-simple" : "intro";
    }
    const explicitKind = kindForAiSection(title);
    if (explicitKind) {
        return explicitKind;
    }
    return inferSectionKind(title, "general");
}

export function splitMarkdownIntoSections(content, options = {}) {
    const markdown = normalizeAiMarkdown(content);
    if (!markdown) {
        return [];
    }

    const sections = [];
    const lines = markdown.split("\n");
    let currentTitle = "";
    let currentLines = [];
    let isLeading = true;

    const commitSection = () => {
        const text = currentLines.join("\n").trim();
        if (text || currentTitle) {
            sections.push({
                title: currentTitle,
                text,
                markdown: true,
                kind: kindForSplitSection(currentTitle, options, isLeading && !currentTitle)
            });
            isLeading = false;
        }
        currentLines = [];
    };

    for (const line of lines) {
        const headingMatch = line.match(/^#{1,4}\s+(.+)$/);
        if (headingMatch) {
            commitSection();
            currentTitle = headingMatch[1].trim();
        } else {
            currentLines.push(line);
        }
    }

    commitSection();
    return sections;
}

export function extractJsonObject(value) {
    if (!value || typeof value !== "string") {
        return null;
    }

    const trimmed = value.trim();
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
        try {
            return JSON.parse(trimmed);
        } catch (_err) {
            // Fall through
        }
    }

    const codeBlockMatch = value.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (codeBlockMatch && codeBlockMatch[1]) {
        try {
            return JSON.parse(codeBlockMatch[1].trim());
        } catch (_err) {
            // Fall through
        }
    }

    const firstBrace = value.indexOf("{");
    const lastBrace = value.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        try {
            return JSON.parse(value.slice(firstBrace, lastBrace + 1));
        } catch (_err) {
            // Fall through
        }
    }

    return null;
}

export function extractBlockquoteText(markdown) {
    const raw = String(markdown || "");
    const matches = raw.match(/^>\s*(.+)$/gm);
    if (!matches) {
        return "";
    }
    return matches.map((line) => line.replace(/^>\s*/, "").trim()).join(" ");
}
