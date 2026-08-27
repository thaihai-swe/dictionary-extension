/**
 * context-extractor.js — Domain service for extracting and bounding sentence context around selections.
 */
export class ContextExtractor {
    static escapeRegExp(value) {
        return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }

    static buildWordBoundaryPattern(value) {
        const normalized = String(value || "").replace(/\s+/g, " ").trim();
        if (!normalized) {
            return null;
        }
        const escaped = this.escapeRegExp(normalized).replace(/ /g, "\\s+");
        return new RegExp(`(^|[^\\p{L}\\p{N}_])${escaped}(?=$|[^\\p{L}\\p{N}_])`, "iu");
    }

    static splitIntoSentences(value) {
        const text = String(value || "").replace(/\s+/g, " ").trim();
        if (!text) {
            return [];
        }
        return (text.match(/[^.!?。！？]+(?:[.!?。！？]+["'”’»)]*|$)/g) || [])
            .map((sentence) => sentence.trim())
            .filter(Boolean);
    }

    static findSentenceContaining(text, needle) {
        const pattern = this.buildWordBoundaryPattern(needle);
        if (!pattern) {
            return "";
        }
        return this.splitIntoSentences(text).find((sentence) => pattern.test(sentence)) || "";
    }

    static rankSentenceCandidates(candidates = []) {
        if (!Array.isArray(candidates) || !candidates.length) {
            return "";
        }
        const valid = candidates
            .map((c) => String(c || "").trim())
            .filter(Boolean);
        return valid[0] || "";
    }
}
