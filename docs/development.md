# Development Guide

## 1. Architectural Philosophy & Environment

**Dictionary** is engineered with a modern, high-performance web extension stack:
- **Runtime Stack:** React 18, TypeScript 5, Vite 5, Tailwind CSS, Chrome Manifest V3.
- **Module Architecture:** Organized under `src/entrypoints/` (`background/`, `content-script/`, `toolbar-popup/`).
- **Isolation:** Content script overlay is mounted inside Shadow DOM (`#dictionary-extension-root`) with encapsulated Tailwind CSS, preventing style leaks into or out of host pages.
- **Type Safety:** Full TypeScript interfaces defined in `src/types/index.ts` checked with `yarn typecheck` (`tsc --noEmit`).

---

## 2. Local Setup & Workflow

```bash
# 1. Install dependencies
yarn install

# 2. Development mode with HMR / fast re-bundling
yarn dev

# 3. Typechecking
yarn typecheck

# 4. Production Build (outputs to /dist)
yarn build
```

1. Open Chrome and navigate to `chrome://extensions`.
2. Toggle on **Developer mode** in the top-right corner.
3. Click **Load unpacked** and select the repository root or the built `dist/` directory.
4. Click the **Reload icon** (↻) on the extension card after rebuilding code changes.
5. **Important:** Refresh open webpage tabs where you are testing so content scripts re-inject.
6. For local HTML/PDF testing, open extension **Details** and enable **Allow access to file URLs**.

---

## 3. Adding or Modifying Settings

When introducing a new configuration option:

1. **Storage Definition (`src/shared/storage.js`):**
   - Add default value to `DEFAULT_SETTINGS`.
   - If the key is a secret credential (API key), add it to `SECRET_SETTING_KEYS` so it is stored strictly in `chrome.storage.local`.
   - If the key is a public preference, add it to `UI_SETTING_KEYS` so `getUiSettings()` can serve it to UI contexts.
   - Update `normalizeSettings(settings)` with type validation and numeric/string clamping.
2. **Options Interface (`options/options.html` & `options/options.js`):**
   - Add the input/select control with a matching `name` attribute in `options/options.html`.
   - Add help text and accessible labels.
3. **Documentation:**
   - Document the new option in `docs/settings.md`.

---

## 4. Adding a Dictionary Provider

1. **Implement Provider Adapter (`src/providers/<name>-dictionary.js`):**
   - Import `NotFoundError` from `./errors.js`.
   - If the requested term has no definitions, throw `new NotFoundError()`.
   - If the provider encounters an auth/network/rate-limit error, allow the error to throw.
   - Return normalized definitions, examples, synonyms, antonyms, pronunciations, and lexical metadata.
2. **Register in Facade (`src/providers/dictionary.js`):**
   - Import lookup function and register in `DICTIONARY_PROVIDERS`.
   - Add provider ID to `FALLBACK_ORDER`.
   - Define `isConfigured(settings)` predicate (e.g. checking if an API key is present).
3. **Update Options Interface (`options/options.html` & `options/options.js`):**
   - Add `<option>` entry to `dictionaryProvider` select.
   - Add non-destructive connection test button with `data-validation-kind="dictionary"`.
4. **Update Documentation:** Add provider details to `docs/providers.md`.

---

## 5. Adding a Translation Provider

1. **Implement Translation Adapter (`src/providers/<name>-translate.js`):**
   - Export `lookup<Name>(text, settings, options)` and `validate<Name>(settings)`.
2. **Register in Translation Facade (`src/providers/translate.js`):**
   - Register in `TRANSLATION_PROVIDERS` with `id`, `label`, `lookup`, and `validate`.
3. **Update Options Interface (`options/options.html`):**
   - Add `<option>` to `translateProvider` select.
   - Add non-destructive connection test button.
4. **Update Documentation:** Add specifications to `docs/providers.md`.

---

## 6. Manual Verification & Quality Matrix

Run this comprehensive verification protocol before submitting code changes:

### A. Core Lookups & Progressive Lazy Enrichment
1. Look up a polysemous word like `run` with translation enabled:
   - Confirm initial definitions render in under a second (`revision: 0`). Translation may be present immediately or arrive as `revision: 1`.
   - Confirm Phase 2 secondary providers lazily enrich additional definitions, examples, and synonyms (`revision: 2`).
   - Confirm contributing provider badges appear in the title row without duplicate subtitle labels.
2. Look up a term whose primary provider lacks IPA:
   - Confirm Phase 2 enrichment backfills phonetic IPA into the pronunciation row when a secondary provider returns it.
3. Rapid query switching:
   - Query `apple`, then immediately type `orange` before `apple` finishes enrichment.
   - Confirm `apple` enrichment updates never overwrite `orange` (stale-response guard via `requestId`).
4. Free keyless provider pipeline:
   - Confirm lookups succeed and enrich across Free Dictionary, Wiktionary, Datamuse, Wikipedia, Urban Dictionary, and RhymeBrain without requiring API keys.
   - A transient 5xx/timeout from an upstream provider falls through gracefully without failing the overall result.

---

### B. Exact Selection & Phrase Fallback
5. Test inflected words: `went`, `children`, `better`, `running`, `evaluated`.
   - Confirm the popup looks up and displays the selected form, not a root lemma, and never shows `Showing definitions for root:`.
6. Test multi-word expressions: `taking care of`, `looked up`, `ran out of`.
   - Confirm the dictionary query is the exact phrase, not a stemmed canonical form.
7. Test obscure idiom fallback:
   - With AI and phrase fallback enabled, look up an idiom missing from all dictionary backends (e.g. `spill the beans`).
   - Confirm automatic AI Phrase Fallback renders concise meaning under `AI · Phrase explanation`.
   - Disable **Use AI when a phrase has no dictionary definition** and confirm the phrase lookup no longer starts that AI request.

---

### C. Contextual AI Actions & Sentence Breakdown
8. In-Page **Context Explain**:
   - Highlight a word in a multi-sentence paragraph.
   - Switch to the AI tab and confirm Context prefills the exact selected sentence (Mode 1 Range offset).
   - Click **Context Explain** and confirm `Context used` appears with the exact sentence blockquoted.
9. **Grammar & Nuance**:
   - Run Grammar & Nuance on a word with context.
   - Confirm analysis of syntactic role, register, formality, tone, and common learner mistakes.
10. **Phrase & Collocations**:
    - Run Phrase & Collocations on `come up with` or `interested in`.
    - Confirm grammar patterns, register notes, and categorized collocation cards render cleanly.
11. **Sentence Breakdown**:
    - Highlight a complex sentence and click **Sentence Breakdown**.
    - Confirm structural JSON decomposition renders clauses, grammatical roles, and clickable phrase chips.
    - Click a phrase chip and confirm a nested lookup opens immediately.
12. Inline Context Validation:
    - Clear the Context textarea in AI mode and click **Context Explain**.
    - Confirm inline alert `"Please enter or paste the sentence containing this word."` appears and textarea focuses without sending a network request.

---

### D. Pronunciation Engine & Speech Practice Evaluator
13. Audio playback:
    - Click `Listen (US)` on a word with remote MP3 audio. Confirm 3-bar visual wave equalizer animates during playback.
    - Test fallback speech synthesis on a term without MP3s; confirm rate and preferred voice settings apply.
14. Speech Practice Evaluator:
    - Click `🎙️ Practice`. Confirm glowing recording ring activates with `Listening…`.
    - Speak the word clearly into the microphone.
    - Confirm Levenshtein distance grading badge renders (e.g. `95% · Excellent`).
    - Confirm active practice score remains visible across Phase 2 lazy enrichment re-renders.

---

### E. Structured Lexical Profile
15. Word Family & Derivatives:
    - Look up `decide`, `affect`, or `compete`.
    - Confirm Word Family displays nouns, verbs, adjectives, adverbs, inflections, and derivatives as clickable chips.
    - Click `decision` and confirm instant sub-lookup opens from session cache.
16. Word Formation, Warnings, Confusables, and Collocations:
    - Confirm Word Formation tags (prefixes/suffixes/explanation) render without duplicate Markdown headers.
    - Confirm register warnings (`[formal]`, `[slang]`) and confusable pairs (*affect* vs. *effect*) appear in high-contrast warning callouts.
    - Confirm Collocations group into verbs, nouns, prepositions, adjectives, and natural sentence patterns.

---

### F. In-Page Triggers, Positioning & Accessibility
17. Selection triggers:
    - Test `Floating lookup icon`, `Post-Selection Hotkey` (`Shift`/`Alt`/`Ctrl`), `Direct popup`, and `Off`.
    - Confirm selection triggers are suppressed inside `<input>`, `<textarea>`, and `contenteditable` elements.
18. Viewport collision & resizing:
    - Open the in-page popup near screen edges; confirm collision flipping prevents card clipping.
    - Drag the bottom-right resize handle; close and reopen to confirm dimensions persist.
19. Accessibility & Theme:
    - Test `System`, `Light`, and `Dark` themes and `Learner` font mode (Atkinson Hyperlegible).
    - Enable operating system reduced motion; confirm entrance, exit, and wave animations are suppressed.
    - Confirm full keyboard `Tab` trapping and `Escape` key dismissal.

---

### G. Security Boundaries & Secret Isolation
20. Storage isolation:
    - Set an AI API key and dictionary API keys in Options.
    - Inspect `chrome.storage.sync.get(null)` in DevTools; confirm secret keys are completely absent from sync storage.
    - Inspect `window.DictionaryHelperContent.settings` in a webpage console; confirm zero API keys exist in content script memory.
21. Settings Import / Export:
    - Click **Export settings**; inspect the downloaded JSON file to verify API keys are omitted.
    - Click **Import settings** and confirm public preferences restore without affecting locally stored keys.
22. Granular Origin Permissions:
    - Enter a custom AI base URL (e.g. `http://localhost:11434` or custom proxy) in Options.
    - Confirm the browser prompts for dynamic origin host permission upon saving.

---

### H. PDFs, Frames & Web Readers
23. HTML5 PDF & Local Files:
    - Open an online PDF (e.g. PDF.js viewer); test exact sentence extraction on text layer selections.
    - Open a local `file://` PDF or HTML document after enabling **Allow access to file URLs**; confirm lookups work seamlessly.
24. Browser-restricted pages:
    - Open `chrome://extensions` or the Chrome Web Store.
    - Confirm the extension badge displays `!` and toolbar popup displays restriction-specific help without throwing unhandled exceptions.
