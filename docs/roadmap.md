# Project Roadmap

This document outlines completed milestones and future enhancements for **Dictionary**.

---

## 1. Shipped Milestones

### Phase 1: Modern MV3 & React 18 Migration
- [x] Migrated runtime to React 18, TypeScript 5, and Vite 5 with encapsulated Shadow DOM styling.
- [x] Implemented unified state management via `useSyncExternalStore` and UI signals (`src/ui/signal.ts`).
- [x] Restructured entrypoints under `src/entrypoints/` (`background/`, `content-script/`, `toolbar-popup/`).

### Phase 2: Dual-Phase Lookup & Progressive Lazy Enrichment
- [x] Phase 1 fast primary lookup returning within sub-second thresholds.
- [x] Phase 2 lazy enrichment executing secondary keyless providers (`wiktionary`, `datamuse`, `wikipedia`, `urban_dictionary`, `rhymebrain`) in concurrent batches of 2.
- [x] Phonetic IPA backfilling, definition merging, and example expansion.
- [x] Two-level caching: L1 in-memory LRU + L2 session storage (`enrich_*`).
- [x] Exact selection lookup handling for inflected terms and multi-word phrases.

### Phase 3: Contextual AI Suite (7 Intents) & Gemini 3.5
- [x] Standardized on `gemini-3.5-flash-lite` for Google Gemini endpoints.
- [x] Built 7 user-facing contextual AI actions:
  - `default`: Main AI with sense matrices and bilingual examples.
  - `explain_in_context`: In-sentence meaning with direct substitutions.
  - `grammar`: Syntactic slots, pattern rules, and learner mistake cards.
  - `collocations`: Idiomatic prepositions and categorized collocations.
  - `sentence_breakdown`: Structural JSON decomposition with clickable phrase chips.
  - `confusables`: Comparison matrix and minimal-pair sentences.
  - `rephrase`: Three stylistic rewrites (Simplified, Academic, Native Idiom).
- [x] Implemented background `phrase_fallback` for idioms missing from dictionary backends.
- [x] Dual-mode sentence extraction (Mode 1 Range offset measurement vs. Mode 2 ranked page scan).
- [x] Structured Lexical Profile JSON block extraction (`<lexical-profile>`).
- [x] Speculative preloading and cache status dots (Emerald, Amber, Rose).

### Phase 4: Audio Engine & Practice Evaluator
- [x] High-fidelity dictionary MP3 playback with US/UK variants.
- [x] Google Translate TTS and Web Speech synthesis fallbacks.
- [x] Prominent red **Stop Voice** button in `AppHeader` and `Esc` key cancellation.
- [x] Speech Practice Evaluator using Web Speech Recognition and Levenshtein similarity scoring.

### Phase 5: Security, Settings & Schema v12
- [x] Storage partitioning: Public settings in `chrome.storage.sync`, isolated secrets in `chrome.storage.local`.
- [x] Schema v12 migration: `hasAiApiKey` boolean exposed without leaking API keys.
- [x] Sanitized JSON export/import omitting secret credentials.
- [x] Granular dynamic origin permissions for custom AI base URLs.
- [x] Paused hostnames support (`pausedHostnames`).

---

## 2. Near-Term Priorities (Next Minor Release)

- [ ] **Saved Vocabulary / History List:**
  - Local vocabulary notebook with tags, lookup counts, and context sentences.
  - Stored purely in `chrome.storage.local` with export to CSV/JSON.
- [ ] **AnkiConnect Integration:**
  - One-click export of headword, phonetic IPA, sentence context, definition, and audio to local Anki desktop via `AnkiConnect` (port 8765).
- [ ] **Offline Stored Dictionary Fallback:**
  - Bundle a lightweight indexed database (e.g. mini StarDict or indexed SQLite/Wasm) for basic definitions when offline.
- [ ] **Custom AI System Instructions:**
  - Allow advanced users to customize global persona or target CEFR level in Settings.

---

## 3. Medium-Term Horizons

- [ ] **Spaced Repetition Review Mode:**
  - In-popup lightweight flashcard review queue (SM-2 or FSRS algorithm) for saved vocabulary.
- [ ] **PDF Reader Experience Enhancement:**
  - Native integration with popular PDF viewers to improve boundary selection in multi-column research papers.
- [ ] **Multi-Language Audio Practice:**
  - Extend pronunciation practice evaluation to non-English targets (Spanish, French, German, Japanese, Vietnamese).

---

## 4. Long-Term Explorations

- [ ] **On-Device LLM Integration (Chrome Built-in AI / Gemini Nano):**
  - Integrate with Chrome's experimental `window.ai` / Prompt API to offer zero-latency, private, keyless local AI explanations when supported by hardware.
- [ ] **Cross-Browser Packaging:**
  - Verify and package Firefox (Manifest V2/V3) and Safari Web Extension distributions.
