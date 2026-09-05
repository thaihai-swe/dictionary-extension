# Development Guide

## 1. Architectural Philosophy & Environment

**Dictionary** is engineered with a modern, high-performance web extension stack:
- **Runtime Stack:** React 18, TypeScript 5, Vite 5, Tailwind CSS, Chrome Manifest V3.
- **Module Architecture:** Organized under `src/entrypoints/` (`background/`, `content-script/`, `toolbar-popup/`).
- **Isolation:** Content script overlay is mounted inside Shadow DOM (`#dictionary-extension-root`) with encapsulated Tailwind CSS, preventing style leaks into or out of host pages.
- **Type Safety:** Full TypeScript interfaces defined in `src/types/index.ts` checked with `npm run typecheck` (`tsc --noEmit`).
- **Node Requirement:** Node.js `>= 22` and npm `>= 10` (`package.json` engines).

---

## 2. Local Setup & Workflow

```bash
# 1. Install dependencies
npm install

# 2. Development mode with HMR / fast re-bundling
npm run dev

# 3. Typechecking
npm run typecheck

# 4. Unit tests
npm test

# 5. Production Build (outputs to /dist)
npm run build
```

1. Open Chrome and navigate to `chrome://extensions`.
2. Toggle on **Developer mode** in the top-right corner.
3. Click **Load unpacked** and select the built `dist/` directory.
4. Click the **Reload icon** (↻) on the extension card after rebuilding code changes.
5. **Important:** Refresh open webpage tabs where you are testing so content scripts re-inject.
6. For local HTML/PDF testing, open extension **Details** and enable **Allow access to file URLs**.

---

## 3. Adding or Modifying Settings

When introducing a new configuration option:

1. **Storage Definition (`src/shared/settings.ts` and `src/shared/settings-export.ts`):**
   - Add default value to `DEFAULT_SETTINGS` in `src/shared/settings.ts`.
   - If the key is a secret credential (API key), add it to `SECRET_SETTING_KEYS` in `src/shared/settings-export.ts` so it is stored strictly in `chrome.storage.local`.
   - If the key is a public preference, it is automatically included in `PUBLIC_SETTING_KEYS`.
   - Update `normalizeSettings(settings)` with type validation and numeric/string clamping.
2. **Settings Interface (`src/features/settings/SettingsModal.tsx` and `src/features/settings/tabs/Tab*.tsx`):**
   - Add the input/select control to the appropriate tab (`TabGeneral.tsx`, `TabAppearance.tsx`, `TabSources.tsx`, or `TabAi.tsx`).
   - Add help text and accessible labels.
3. **Documentation:**
   - Document the new option in `docs/settings.md`.

---

## 4. Adding a Dictionary Provider

1. **Implement Provider Adapter (`src/providers/provider.<name>.ts`):**
   - Import `NotFoundError` from `./errors`.
   - If the requested term has no definitions, throw `new NotFoundError()`.
   - If the provider encounters an auth/network/rate-limit error, allow the error to throw.
   - Return a `ProviderLookupDto` (word + providerId + any of: meanings, examples, synonyms, antonyms, phonetics, lexical metadata). The facade converts it with `toDictionaryEntry()` before merge.
2. **Register in Registry (`src/providers/register-adapters.ts`):**
   - Call `providerRegistry.registerDictionary({ id, name, lookup })`. Do not add a `switch` case.
   - Add the provider ID to `DICTIONARY_FALLBACK_ORDER` in `src/shared/text-utils.ts` if it should participate in Phase 2 enrichment.
3. **Update Settings Interface (`src/features/settings/tabs/TabSources.tsx`):**
   - Add an `<option>` entry to the dictionary provider select.
   - Add a non-destructive connection test button using `VALIDATE_PROVIDER`.
4. **Update Documentation:** Add provider details to `docs/providers.md`.

---

## 5. Adding a Translation Provider

1. **Implement Translation Adapter (`src/providers/provider.<name>.ts`):**
   - Export a lookup function returning `TranslationResult`.
2. **Register in Registry (`src/providers/register-adapters.ts`):**
   - Call `providerRegistry.registerTranslation({ id, name, lookup })`.
3. **Update Settings Interface (`src/features/settings/tabs/TabSources.tsx`):**
   - Add an `<option>` to the translation provider select.
   - Add a non-destructive connection test button.
4. **Update Documentation:** Add specifications to `docs/providers.md`.

---

## 6. Manual Verification & Quality Matrix

Run this comprehensive verification protocol before submitting code changes:

### A. Core Lookups & Progressive Lazy Enrichment
1. Look up a polysemous word like `run` with translation enabled:
   - Confirm initial definitions render in under a second (`revision: 0`). Translation may be present immediately or arrive as `revision: 1`.
   - Confirm Phase 2 secondary providers lazily enrich additional definitions, examples, and synonyms (`revision: 2`).
   - Confirm the merged result paints without leftover source/provider labels under the headword.
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
   - Confirm the popup looks up and displays the selected form, not a root lemma.
6. Test multi-word expressions: `taking care of`, `looked up`, `ran out of`.
   - Confirm the dictionary query is the exact phrase.
7. Test obscure idiom fallback:
   - With AI and phrase fallback enabled, look up an idiom missing from all dictionary backends (e.g. `spill the beans`).
   - Confirm automatic AI Phrase Fallback renders a concise meaning.
   - Disable **Use AI when a phrase has no dictionary definition** and confirm the phrase lookup no longer starts that AI request.

---

### C. Contextual AI Actions (7 intents)
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
12. **Compare Confusables** and **Rephrase**:
    - Run Compare Confusables on `affect` / `effect` and confirm a distinction matrix.
    - Run Rephrase on a full sentence and confirm three stylistic rewrites.
13. Inline Context Validation:
    - Clear the Context textarea in AI mode and confirm **Context Explain** is disabled.
14. Live status indicators:
    - Confirm intent buttons show emerald (ready), amber pulse (loading), or rose (unrequested) dots.
    - Hover a follow-up intent and confirm it prefetches.

---

### D. Pronunciation Engine & Speech Practice Evaluator
15. Audio playback:
    - Click `Listen (US)` on a word with remote MP3 audio.
    - Confirm the red **Stop Voice** button in `AppHeader` appears and cancels playback immediately.
    - Press `Esc` and confirm speech synthesis stops.
    - Test fallback speech synthesis on a term without MP3s; confirm rate and preferred voice settings apply.
16. Speech Practice Evaluator:
    - Click `🎙️ Practice`. Confirm glowing recording ring activates with `Listening…`.
    - Speak the word clearly into the microphone.
    - Confirm Levenshtein distance grading badge renders (e.g. `95% · Excellent`).
    - Confirm active practice score remains visible across Phase 2 lazy enrichment re-renders.

---

### E. Structured Lexical Profile
17. Word Family & Derivatives:
    - Look up `decide`, `affect`, or `compete`.
    - Confirm Word Family displays nouns, verbs, adjectives, adverbs, inflections, and derivatives as clickable chips.
    - Click `decision` and confirm instant sub-lookup opens from session cache.
18. Word Formation, Warnings, Confusables, and Collocations:
    - Confirm Word Formation tags (prefixes/suffixes/explanation) render without duplicate Markdown headers.
    - Confirm register warnings (`[formal]`, `[slang]`) and confusable pairs (*affect* vs. *effect*) appear in high-contrast warning callouts.
    - Confirm Collocations group into verbs, nouns, prepositions, adjectives, and natural sentence patterns.

---

### F. In-Page Triggers, Positioning & Accessibility
19. Selection triggers:
    - Test `Floating lookup icon`, `Post-Selection Hotkey` (`Shift`/`Alt`/`Ctrl`), `Direct popup`, and `Off`.
    - Confirm selection triggers are suppressed inside `<input>`, `<textarea>`, and `contenteditable` elements.
20. Viewport collision & resizing:
    - Open the in-page popup near screen edges; confirm collision flipping prevents card clipping.
    - Drag the bottom-right resize handle; close and reopen to confirm dimensions persist (360–1000 × 380–900).
21. Accessibility & Theme:
    - Test `System`, `Light`, and `Dark` themes and `Learner` font mode (Atkinson Hyperlegible).
    - Enable operating system reduced motion; confirm entrance, exit, and wave animations are suppressed.
    - Confirm full keyboard `Tab` trapping and `Escape` key dismissal.

---

### G. Security Boundaries & Secret Isolation
22. Storage isolation:
    - Set an AI API key in Settings.
    - Inspect `chrome.storage.sync.get(null)` in DevTools; confirm secret keys (`aiApiKey`, `libreTranslateApiKey`) are completely absent from sync storage.
    - Confirm `hasAiApiKey` is present as a boolean flag in sync storage.
    - Inspect content-script memory in a webpage console; confirm zero API keys exist.
23. Settings Import / Export:
    - Click **Export settings**; inspect the downloaded JSON file (`version: 12`) to verify API keys are omitted.
    - Click **Import settings** and confirm public preferences restore without affecting locally stored keys.
24. Granular Origin Permissions:
    - Enter a custom AI base URL (e.g. `http://localhost:11434` or custom proxy) in Settings.
    - Confirm the browser prompts for dynamic origin host permission upon saving.

---

### H. PDFs, Frames & Web Readers
25. HTML5 PDF & Local Files:
    - Open an online PDF (e.g. PDF.js viewer); test exact sentence extraction on text layer selections.
    - Open a local `file://` PDF or HTML document after enabling **Allow access to file URLs**; confirm lookups work seamlessly.
26. Browser-restricted pages:
    - Open `chrome://extensions` or the Chrome Web Store.
    - Confirm the toolbar popup displays restriction-specific help without throwing unhandled exceptions.

---

### I. Model & Schema
27. Confirm Settings → AI tab lists only `gemini-3.5-flash-lite` as the Gemini preset.
28. Confirm a reset-to-defaults restore writes `aiModel: "gemini-3.5-flash-lite"` and `SETTINGS_SCHEMA_VERSION = 12`.
