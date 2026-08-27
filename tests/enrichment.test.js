import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
    MAX_ITEMS_PER_SECTION,
    mergeDictionaryEnrichment,
    mergePronunciations
} from "../src/shared/enrichment.js";

describe("mergeDictionaryEnrichment", () => {
    it("suppresses duplicate definitions and still adds the source badge", () => {
        const merged = mergeDictionaryEnrichment(
            {
                title: "run",
                sourceBadges: [{ label: "Free Dictionary API (Default)", kind: "dictionary", providerId: "free_dictionary" }],
                pronunciations: [{ language: "en-US", phonetic: "", audioUrl: "" }],
                sections: [{ title: "verb", kind: "definitions", items: ["to move quickly"] }]
            },
            [{
                providerId: "wiktionary",
                sourceBadges: [{ label: "Wiktionary REST API", kind: "dictionary", providerId: "wiktionary" }],
                sections: [{ title: "verb", kind: "definitions", items: ["to move quickly"] }]
            }]
        );

        assert.ok(merged);
        assert.equal(merged.sections[0].items.length, 1);
        assert.deepEqual(
            merged.sourceBadges.map((badge) => badge.label),
            ["Free Dictionary API (Default)", "Wiktionary REST API"]
        );
        assert.equal(merged.enriched, true);
    });

    it("backfills IPA onto an empty accent slot", () => {
        const merged = mergeDictionaryEnrichment(
            {
                title: "hello",
                sourceBadges: [{ label: "Free Dictionary", kind: "dictionary" }],
                pronunciations: [{ language: "en-US", phonetic: "", audioUrl: "https://example.com/hello.mp3", label: "Speak" }],
                sections: [{ title: "noun", kind: "definitions", items: ["a greeting"] }]
            },
            [{
                providerId: "wiktionary",
                sourceBadges: [{ label: "Wiktionary", kind: "dictionary" }],
                pronunciations: [{ language: "en-US", phonetic: "/həˈloʊ/", audioUrl: "" }]
            }]
        );

        assert.equal(merged.pronunciations[0].phonetic, "/həˈloʊ/");
        assert.equal(merged.pronunciations[0].audioUrl, "https://example.com/hello.mp3");
        assert.equal(merged.pronunciations.length, 1);
    });

    it("honors per-section item caps", () => {
        const existing = Array.from({ length: MAX_ITEMS_PER_SECTION }, (_, index) => `item ${index}`);
        const merged = mergeDictionaryEnrichment(
            {
                title: "word",
                sourceBadges: [{ label: "Primary", kind: "dictionary" }],
                sections: [{ title: "noun", kind: "definitions", items: existing }]
            },
            [{
                providerId: "wiktionary",
                sourceBadges: [{ label: "Wiktionary", kind: "dictionary" }],
                sections: [{ title: "noun", kind: "definitions", items: ["extra definition"] }]
            }]
        );

        assert.equal(merged.sections[0].items.length, MAX_ITEMS_PER_SECTION);
        assert.ok(!merged.sections[0].items.includes("extra definition"));
    });
});

describe("mergePronunciations", () => {
    it("prefers phonetic entries first", () => {
        const merged = mergePronunciations(
            [{ language: "", phonetic: "", audioUrl: "", label: "Speak" }],
            [{ language: "en-GB", phonetic: "/ˈæpl/", audioUrl: "" }]
        );
        assert.equal(merged[0].phonetic, "/ˈæpl/");
    });
});
