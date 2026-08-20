# Architecture

## Overview

Dictionary is a plain JavaScript Chrome Manifest V3 extension. It is intentionally small: no framework, no bundler, and no build step.

The runtime is split into five layers:

1. Toolbar popup
2. Content script / in-page popup
3. Background service worker
4. Options page
5. Provider modules

Shared UI helpers handle the popup shell, rendering, pronunciation, dimension limits, and short-lived lookup caching for both toolbar and in-page lookup popups.

## Runtime Flow

```text
User selects text or types a query
        │
        ▼
Toolbar popup or in-page popup
  - choose source tab: Dictionary or AI
  - optionally prefill bounded sentence context (unless privacy opt-out is enabled)
  - send lookup request (LOOKUP_TEXT)
        │
        ▼
Background service worker
  - load settings
  - route by source and intent
  - Phase 1 (Blocking): primary dictionary provider + fallback chain,
    translation provider, and optional AI phrase fallback
  - return initial result immediately
        │
        ▼
Popup renderer
  - show sections / markdown
  - expose pronunciation controls
  - show source attribution badges
  - play audio or speech fallback
        │
        ▼
Background service worker (Phase 2)
  - launch lazy enrichment against remaining dictionary providers
  - merge sections, pronunciations, and source badges
  - send LOOKUP_UPDATE with requestId, text, revision
        │
        ▼
Popup/content script
  - validate requestId and active text match
  - re-render with enriched data (definitions, IPA, badges)
```

### Dictionary lookup path (Phase 1 — Initial)

1. Primary dictionary provider is selected from the user settings (`free_dictionary` by default).
2. If the primary provider throws `NotFoundError`, the background falls back through the chain: `free_dictionary` → `wiktionary` → `merriam_webster` → `wordnik` → `words_api`. If exact lookups fail with `NotFoundError` across all providers, `getEnglishLemmaCandidates()` generates candidate root lemmas (including irregular forms such as `went` → `go`, `children` → `child`, `better` → `good`) and retries the fallback chain, attaching `lemmaFallback` metadata and a root notice subtitle when a stem succeeds. If single-word lemma candidates also fail, `getEnglishPhraseCandidates()` canonicalises inflected or auxiliary-led multi-word expressions to their dictionary base form (e.g. `taking care of` → `take care of`, `ran out of` → `run out of`, `has taken off` → `take off`, `looked up` → `look up`) and retries the chain, attaching a phrase notice subtitle on success.
3. Operational errors (missing credentials, network failure, rate limit) stop the fallback chain immediately.
4. Translation and dictionary providers may run in parallel.
5. Successful results are merged into one payload with initial source badges.
6. Dictionary sections appear first.
7. Translation is appended as its own section.
8. Pronunciation variants come from the dictionary result when available.
9. The result is returned immediately to the popup for fast rendering.

### Request cancellation

Each lookup is associated with an `AbortController` held by the background service worker. A new lookup from the same tab, or a `CANCEL_LOOKUP` message when the card closes, aborts dictionary, translation, AI, phrase-fallback, and lazy-enrichment fetches sharing that lookup signal. Provider adapters pass the signal to the shared timeout/retry fetch utility. Abort errors are deliberately silent; request-id checks in the UI remain the final stale-update guard.

### Dictionary enrichment path (Phase 2 — Lazy/Non-blocking)

1. After the initial result is dispatched, the background launches `lookupDictionaryEnrichment()` against non-primary dictionary providers.
2. Unconfigured key-backed providers are skipped before I/O. Remaining providers are queried in batches of 2 concurrent requests.
3. `NotFoundError` and operational errors are skipped silently — they never break the initial result.
4. Each successful enrichment result is merged into the current result model:
   - **Sections**: definitions, examples, synonyms, antonyms are deduplicated by normalized text and capped per kind (max 2 definition sections, max 2 examples, max 1 synonyms, max 1 antonyms, max 20 items per section).
   - **Pronunciations**: IPA text and audio URLs are backfilled onto matching accent/language slots (`en-US`, `en-GB`) when the primary result has empty phonetics. Entries with IPA text are sorted first so the title row shows phonetic transcription when available.
   - **Source badges**: Every provider that successfully returns data is added to the `sourceBadges` array, even when its content is entirely duplicate to previously merged results.
5. The enriched result is sent via `LOOKUP_UPDATE` to the active popup(s).

### AI lookup path

1. The background worker checks that AI is enabled and configured.
2. Normal lookups use the main AI prompt template.
3. Contextual lookups (`intent: "explain_in_context"`) use the context prompt template and the context explicitly submitted by the user.
4. Grammar lookups (`intent: "grammar"`) analyze syntax, register, and tone using `aiGrammarPromptTemplate` and optional user-provided context.
5. Phrase & Collocations lookups (`intent: "phrase_explorer"`) analyze idioms, phrasal verbs, preposition patterns, and collocations using `aiPhraseExplorerPromptTemplate`.
6. Sentence Breakdown lookups (`intent: "sentence_breakdown"`) return structured sentence parts and phrase parsing using the stored `aiSentencePromptTemplate` default (or a custom template).
7. Phrase fallback lookups (`intent: "phrase_fallback"`) provide automatic idiom and phrase definitions when structured dictionary data is missing.
8. Gemini-native requests are used when a Google Gemini base URL is detected; otherwise the OpenAI-compatible chat path is used.

### Lexical Profile (Word Family & Usage Notes)

When `enableLexicalProfile` is enabled (default `true`, controlled in Options), both dictionary and AI results carry a normalized `lexicalProfile`:

- **Provider-First Extraction** (Phase 1 normalization + Phase 2 enrichment): sections, parts of speech, derivation/related-word fields, and register tags such as `[formal]` or `[slang]` are parsed into `wordFamily` (`noun`, `verb`, `adjective`, `adverb`, `inflections`, `derivatives`), `usageWarnings`, `confusablePairs`, `wordFormation`, `learnerMistakes`, and `collocations`. WordsAPI derivation items are classified as inflections or true derivatives against the word-family part-of-speech terms.
- **AI Structured Output**: default, grammar, and phrase-explorer prompts include a `<lexical-profile>` JSON block specification covering word family (including derivatives), word formation, learner mistakes, collocations, usage warnings, and confusable pairs. Context Explain, Sentence Breakdown, and phrase fallback remain compact or structured-JSON outputs and do not request that block. The AI provider extracts and strips the block separately, parsing it via `parseLexicalProfile` so malformed or omitted blocks degrade gracefully. Each populated profile category is canonical: matching Markdown sections for Word Family, Usage Note, Usage & Register Notes, Confusables, Word Formation, Common Learner Mistakes, Common Structures, Related Idioms, and Collocations are dropped while Markdown remains the fallback for omitted profile data. Leftover overlapping headings such as Translation on Main AI/Grammar or Simple Explanation on Context Explain are compacted into the focused intent stack.
- **AI phrase exploration**: `intent: "phrase_explorer"` powers the dedicated Phrase & Collocations action for idioms, phrasal verbs, and word partnerships. It returns meaning, grammar patterns, register, and examples, with collocations and learner mistakes rendered from the structured profile block when present.
- **Deep Merging**: `mergeLexicalProfiles` deduplicates per-category family items case-insensitively and caps arrays at `MAX_LEXICAL_ITEMS` (12), `MAX_DERIVATIVES` (12), `MAX_LEXICAL_WARNINGS` (8), `MAX_CONFUSABLE_PAIRS` (6), `MAX_LEARNER_MISTAKES` (6), `MAX_FORMATION_ITEMS` (6), and `MAX_COLLOCATION_ITEMS_PER_GROUP` (10). Collocations are de-duplicated across groups (verbs, nouns, prepositions, adjectives, patterns), preserving the first occurrence.
- **UI Rendering**: the shared renderer's `renderLexicalProfile` emits a Word Family grid of interactive `data-lookup-query` family chips plus a warning callout for usage notes and confusable pairs, styled for both the in-page card (`dictionary-helper-` prefix) and toolbar popup (`toolbar-popup-` prefix). Word Formation, Common Learner Mistakes, and Collocations render as dedicated escaped, token-consistent blocks. AI results include optional `presentation` metadata so recognized sections can be ordered by intent and the lexical-profile block can render after the explanation. Dictionary and translation results omit that metadata and keep the existing profile-first layout.
- **Parse-time AI kinds**: `splitMarkdownIntoSections` assigns `section.kind` from the intent outline in `ai-prompts.js` before the renderer runs. The renderer IIFE cannot import that module, so kinds are authoritative on the result object. Built-in answers reorder and collapse by those kinds; unknown custom headings keep model order.

## Component Responsibilities

### Toolbar popup

- Manual word or phrase entry
- Source tab switching
- Shared lookup request path
- Optional AI-tab-only **Context Explain**, **Grammar & Nuance**, **Phrase & Collocations**, and **Sentence Breakdown** actions with an editable Context field and optional page-context prefill
- Tracks `activeRequestId` to validate incoming `LOOKUP_UPDATE` messages against the current query

### Content script / in-page popup

- Floating icon, direct selection, post-selection modifier key, double-click, and context-menu triggers
- In-page popup mounting and teardown
- Exact selection-range sentence extraction and ranked typed-query candidate prefilling for optional contextual AI, unless `disablePageContextExtraction` is enabled
- VisualViewport-aware collision-safe positioning, trigger boundary flipping, hybrid mouse/keyboard focus behavior, and focus restoration on dismissal
- PDF text-layer and Web Reader article-container sentence extraction when the page exposes a scriptable DOM
- Live reaction to settings changes
- Tracks `activeRequestId` to validate incoming `LOOKUP_UPDATE` messages against the active lookup

PDF compatibility is layered: online, local, or embedded PDF text layers use the content script when Chrome exposes the document DOM, and the popup is rendered as an overlay in the PDF page. Chrome's built-in viewer can reject injection; when injection is unavailable, an indicator badge notifies the user.

### Background service worker

- Central lookup routing
- Context-menu registration
- Settings loading
- Provider dispatch
- Result normalization for both popup surfaces
- Phase 1: primary dictionary + translation + AI phrase fallback (blocking, delivered via `LOOKUP_TEXT` response)
- Phase 2: lazy enrichment (non-blocking, delivered via `LOOKUP_UPDATE` message)
- Manages a two-level enriched result cache: fast SW memory (L1 `Map`, max 20 entries) and service worker suspension persistence (`chrome.storage.session` L2 with key prefix `enrich_`, 10-minute TTL). Safe prefix-based invalidating (`clearEnrichmentSessionCache()`) strips L2 session cache whenever settings change without altering unrelated session storage.
- Generates unique `requestId` per lookup to guard against stale updates

### Options page

- User-facing configuration
- Validation and save flow for preferences and AI credentials

### Shared UI helpers

- `src/ui/popup-shell.js` provides the common popup markup and dimension constraints for toolbar and in-page hosts.
- Result rendering and structured editorial skeleton placeholders (`Renderer.renderSkeleton(prefix)`)
- Lightweight Markdown formatting for headings, lists, emphasis, code, quotes, and rules
- Multi-variant pronunciation buttons with decorative three-bar animated soundwave indicators
- Audio playback and speech-synthesis fallback
- Short-lived in-memory lookup cache

### Visual structure and shared shell

The toolbar and in-page popups share a common shell produced by `popupShell.createMarkup({ prefix, host })` and a common renderer (`renderer.renderResult`) that emits the shared `dictionary-helper-*` class vocabulary (with a `toolbar-popup-*` compatibility layer for the legacy toolbar surface). Both surfaces import the same semantic token set from `tokens.css` so colors, radii, spacing tiers, and motion defaults stay consistent without duplicating styles.

The visual direction is "Calm Learning Studio": warm editorial surfaces, indigo as the primary action color, teal/green for pronunciation and learning-success states, amber for usage notes, and red only for actionable errors. Themes (`data-theme="light" | "dark" | "system"`, plus `prefers-color-scheme`) map the same token names to warm near-white light surfaces and deep blue-green dark surfaces; learners may also enable Atkinson Hyperlegible via `data-font="learner"`.

Shared shell markup hierarchy:
1. **Identity/header** — compact brand mark `D`, query identity, and a quiet utility action row (settings gear for the toolbar, close for in-page).
2. **Search** — a labeled query field and submit action.
3. **Mode navigation** — a `<nav role="tablist">` of Dictionary/AI tabs with an explicit active state.
4. **AI context panel** — rendered only in AI mode, editable with manual-entry fallback.
5. **Result body** — a `<main>`/panel region with `aria-busy` while loading and `tabindex="-1"`, surfacing the title cell, pronunciation group, and semantic sections. Provider attribution is surfaced in the relevant section metadata rather than in the title row, which stays focused on the queried word and pronunciation.

The renderer preserves request-token guards: an enrichment render only mutates the active surface when both `requestId` and the current query text match. Provider attribution remains available in section metadata without crowding the term header; the term header carries the editorial display font while pronunciation and primary learning sections remain visually primary.

Loading states use `Renderer.renderSkeleton(prefix)` to emit an `aria-hidden` multi-tier placeholder matching the editorial hierarchy (term width line and two definition cards) while the containing body region maintains `aria-busy="true"`. Pronunciation buttons feature an equalizer wave indicator that animates only while actively playing, and speech evaluation uses an animated glowing pulse ring during speech recognition. Explicit in-page dismissal via Escape or close button runs a 120ms exit transition before DOM removal, while replacement by a new selection remains immediate. Motion strictly respects `prefers-reduced-motion: reduce`.

## Messaging Model

- `LOOKUP_TEXT`: Popup to background. Carries text, source, optional context, and optional AI intent.
- `CANCEL_LOOKUP`: Popup/content script to background. Cancels the active abortable AI request for the sender tab; cancellation is silent in the UI.
- `LOOKUP_UPDATE`: Background to popup/content script. Carries enriched result with `{ requestId, text, revision, result }`. Recipients validate `requestId` against the current `activeRequestId` and skip if mismatched (stale guard).
- `OPEN_LOOKUP_POPUP`: Background to content script. Opens the in-page popup for context-menu lookups.
- `GET_PAGE_CONTEXT`: Toolbar popup to content script. Returns a bounded sentence containing the query plus source/confidence metadata for optional AI-context prefilling. See [Context Extraction](context-extraction.md).
- Restricted-page handling: when Chrome blocks injection on restricted pages, an indicator badge notifies the user without leaving the page.

### Stale update protection flow

```text
LOOKUP_UPDATE arrives
        │
        ▼
Check: does message.requestId match popup.activeRequestId?
  ├─ Yes → does message.text match current input?
  │    ├─ Yes → apply enrichment, re-render
  │    └─ No  → discard (user started a new query)
  └─ No  → discard (response belongs to a prior session)

Additionally: background tracks in-flight enrichment per (text, primaryId)
to avoid duplicate lookups for identical queries. AI requests also use an `AbortController` per sender tab, so a newer AI lookup or `CANCEL_LOOKUP` aborts the preceding provider fetch. Dictionary and translation updates retain the request-ID stale guard.
```

## Source Attribution Model

Source badges are the canonical UI for provider attribution. The data model:

```js
sourceBadges: [
  { label: "Free Dictionary API", kind: "dictionary", providerId: "free_dictionary" },
  { label: "Google Translate",   kind: "translation", providerId: "google" },
  { label: "Wiktionary",         kind: "dictionary",  providerId: "wiktionary" }
]
```

- `kind` values: `"dictionary"`, `"translation"`, `"ai"` (for AI phrase explanation).
- Badges are deduplicated by case-insensitive label during runtime result assembly.
- The subtitle row is filtered to avoid repeating source names already represented by provider metadata.

## Storage Model

- Non-secret preferences use `chrome.storage.sync`
- Provider API keys (`aiApiKey`, `dictionaryApiKey`, `wordnikApiKey`, `wordsApiKey`, `libreTranslateApiKey`) use `chrome.storage.local` and are strictly isolated to the background service worker. In-page content scripts and the toolbar popup UI only load non-secret preferences from `chrome.storage.sync` and do not receive or retain API key material.
- Session-scoped enrichment L2 cache uses `chrome.storage.session` with `enrich_` key prefix
- The last used Dictionary or AI tab is stored in `chrome.storage.session` as `dictionaryHelperLastTab` and never written to sync
- Options can export and import a public settings file `{ version, exportedAt, settings }`. Secret keys are omitted on export and ignored on import. Practice scores are UI-only and are not persisted.

Settings normalization covers language aliases, provider IDs, popup dimensions, pronunciation-rate clamping, and prompt defaults.

## Caching and Network Behavior

- Lookup caching is short-lived and UI-side only.
- Enriched results are cached for 10 minutes (max 20 entries) to avoid re-fetching secondary providers on repeat lookups.
- In-flight enrichment requests are deduicated to prevent redundant network calls.
- Audio blobs and audio metadata are never cached.
- Provider requests use timeouts, bounded retries, exponential backoff, and `Retry-After` when a provider sends it.
- Request cancellation is not retried and is not presented as a timeout.
- Offline and timeout failures are surfaced as clear errors.
- Contextual AI results are intentionally not treated like ordinary cached AI lookups.

## Constraints

- Content scripts in already-open tabs become stale after extension reload and require a page refresh.
- Dictionary quality is limited by the public Free Dictionary API and any configured API-key-backed providers.
- The popup renderer supports lightweight Markdown, not full CommonMark. Supported syntax includes headings, unordered/ordered lists, bold, italics, inline code, blockquotes, and horizontal rules.
- Selection-based lookups use exact DOM Range offsets for sentence isolation. Details: [Context Extraction](context-extraction.md).
- `chrome.runtime.sendMessage` does not transport `AbortSignal`, so provider network I/O is not hard-cancelled on rapid query switches. Stale response filtering relies on `requestId`/request token validation at the receiver.

## Popup interaction coordination

Both popup surfaces use the same context model: the query is the word or phrase being analyzed, while Context is an optional sentence supplied manually or prefilled from the page. Context controls are rendered only in AI mode. Contextual actions validate the current textarea value and do not perform a second extraction at click time. AI Markdown with multiple headings is split into titled sections and rendered through the shared section renderer. The shared Markdown renderer remains compatible with providers that return one Markdown section.

### AI Markdown section splitting

AI provider responses are normalized and split on top-level `###` headings before render. Each heading becomes a titled section with an inferred semantic `kind`. Contextual and grammar results still prepend a `Context used` section when context is present. When a result has at least four titled sections, secondary deep-dive kinds are rendered as native `<details>` disclosures; context, definitions, translation, examples, grammar, and the first primary section remain expanded.

Shared pure helpers live in `src/shared/query-utils.js` for background/provider code. Classic-script popup helpers remain in `src/shared/popup-helpers.js` for toolbar and content-script surfaces. Request tokens protect against stale UI updates; `chrome.runtime.sendMessage` does not transport `AbortSignal`, so provider network I/O is not hard-cancelled.
