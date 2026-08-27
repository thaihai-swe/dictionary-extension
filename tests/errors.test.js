import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { NotFoundError, isFatalDictionaryError } from "../src/providers/errors.js";

describe("isFatalDictionaryError", () => {
    it("treats missing and unauthorized keys as fatal", () => {
        assert.equal(isFatalDictionaryError(new Error("Merriam-Webster API key is required.")), true);
        assert.equal(isFatalDictionaryError(new Error("Wordnik API key is invalid or unauthorized.")), true);
        assert.equal(isFatalDictionaryError(Object.assign(new Error("denied"), { status: 401 })), true);
        assert.equal(isFatalDictionaryError(Object.assign(new Error("denied"), { status: 403 })), true);
    });

    it("treats not-found, timeout, rate limit, and 5xx as non-fatal", () => {
        assert.equal(isFatalDictionaryError(new NotFoundError("missing")), false);
        assert.equal(isFatalDictionaryError(new Error("Request timed out. Please try again.")), false);
        assert.equal(isFatalDictionaryError(new Error("Wordnik rate limit reached. Try again later.")), false);
        assert.equal(isFatalDictionaryError(new Error("Wiktionary lookup failed (HTTP 500).")), false);
        assert.equal(isFatalDictionaryError(new Error("Failed to fetch")), false);
        assert.equal(isFatalDictionaryError(null), false);
    });
});
