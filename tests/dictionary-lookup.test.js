import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getDictionaryLookupAttempts } from "../src/providers/dictionary.js";

describe("getDictionaryLookupAttempts", () => {
    it("tries primary lemma before any secondary provider", () => {
        const attempts = getDictionaryLookupAttempts("running", "free_dictionary");
        const firstSecondaryIndex = attempts.findIndex((attempt) => attempt.providerId !== "free_dictionary");
        const primaryRootIndex = attempts.findIndex((attempt) => (
            attempt.providerId === "free_dictionary" && attempt.kind === "root"
        ));

        assert.ok(primaryRootIndex >= 0);
        assert.ok(firstSecondaryIndex > primaryRootIndex);
        assert.deepEqual(attempts[0], {
            providerId: "free_dictionary",
            query: "running",
            kind: "exact"
        });
        assert.equal(attempts[primaryRootIndex].query, "run");
    });

    it("tries primary phrase canonicalization before secondary providers", () => {
        const attempts = getDictionaryLookupAttempts("looked up", "wiktionary");
        const firstSecondaryIndex = attempts.findIndex((attempt) => attempt.providerId !== "wiktionary");
        const primaryLookUpIndex = attempts.findIndex((attempt) => (
            attempt.providerId === "wiktionary"
            && attempt.kind === "phrase"
            && attempt.query === "look up"
        ));

        assert.ok(primaryLookUpIndex >= 0);
        assert.ok(firstSecondaryIndex > primaryLookUpIndex);
        assert.ok(attempts.slice(0, firstSecondaryIndex).every((attempt) => attempt.providerId === "wiktionary"));
    });

    it("does not repeat the same provider and query", () => {
        const attempts = getDictionaryLookupAttempts("go", "free_dictionary");
        const keys = attempts.map((attempt) => `${attempt.providerId}:${attempt.query}`);
        assert.equal(keys.length, new Set(keys).size);
    });
});
