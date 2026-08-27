import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { CONTENT_SCRIPT_CSS, CONTENT_SCRIPT_JS } from "../src/shared/content-scripts.js";

describe("content script file list", () => {
    it("matches manifest.json", () => {
        const manifest = JSON.parse(readFileSync(new URL("../manifest.json", import.meta.url), "utf8"));
        const entry = manifest.content_scripts[0];
        assert.deepEqual(entry.js, CONTENT_SCRIPT_JS);
        assert.deepEqual(entry.css, CONTENT_SCRIPT_CSS);
    });
});
