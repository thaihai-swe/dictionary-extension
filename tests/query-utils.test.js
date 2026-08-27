import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
    classifyQuery,
    getEnglishLemmaCandidates,
    getEnglishPhraseCandidates
} from "../src/shared/query-utils.js";

describe("classifyQuery", () => {
    it("classifies empty, word, phrase, and sentence", () => {
        assert.equal(classifyQuery(""), "empty");
        assert.equal(classifyQuery("  apple  "), "word");
        assert.equal(classifyQuery("take care of"), "phrase");
        assert.equal(classifyQuery("This is a long enough sentence."), "sentence");
        assert.equal(classifyQuery("one two three four five six seven"), "sentence");
    });
});

describe("getEnglishLemmaCandidates", () => {
    it("maps irregular verbs and inflections", () => {
        assert.deepEqual(getEnglishLemmaCandidates("went"), ["go"]);
        assert.deepEqual(getEnglishLemmaCandidates("children"), ["child"]);
        assert.ok(getEnglishLemmaCandidates("running").includes("run"));
        assert.ok(getEnglishLemmaCandidates("taking").includes("take"));
        assert.deepEqual(getEnglishLemmaCandidates("better"), ["good"]);
    });

    it("returns no candidates for short or multi-word text", () => {
        assert.deepEqual(getEnglishLemmaCandidates("go"), []);
        assert.deepEqual(getEnglishLemmaCandidates("take care"), []);
    });
});

describe("getEnglishPhraseCandidates", () => {
    it("canonicalizes inflected multi-word expressions", () => {
        assert.ok(getEnglishPhraseCandidates("taking care of").includes("take care of"));
        assert.ok(getEnglishPhraseCandidates("looked up").includes("look up"));
        assert.ok(getEnglishPhraseCandidates("ran out of").includes("run out of"));
        assert.ok(getEnglishPhraseCandidates("has taken off").includes("take off"));
    });
});
