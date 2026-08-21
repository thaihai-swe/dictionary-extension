# Architecture

## Overview

Dictionary is a lightweight Chrome Manifest V3 extension built with plain JavaScript, CSS, and HTML. It has zero external runtime dependencies: no framework, no bundler, and no build step.

The runtime architecture is organized into five decoupled layers:

1. **Toolbar popup** (`action/`) — Standalone browser action UI for manual search, mode switching, editable context, contextual AI actions, and inline settings access.
2. **Content script & in-page popup** (`src/content/`, `src/content.js`) — Modular in-page overlay system handling text selection, floating triggers, exact/suggested context extraction, collision-safe visual viewport positioning, keyboard trapping, and dynamic result rendering.
3. **Background service worker** (`src/background.js`) — Central orchestrator managing request routing, two-phase progressive lookups, multi-backend fallback chains, lazy enrichment, two-level result caching, tab-scoped request cancellation, context menu actions, settings migrations, and dynamic script injection.
4. **Provider modules** (`src/providers/`) — Vendor adapters and facades for multi-source dictionary lookups, neural machine translation, generative AI endpoints (Gemini native + OpenAI-compatible), and pronunciation engines.
5. **Shared services and UI helpers** (`src/shared/`, `src/ui/`) — Reusable subsystems for storage/secrets, messaging contracts, query classification, Markdown parsing, lexical profile manipulation, audio synthesis/playback, network fetch with backoff/timeouts, and the shared "Calm Learning Studio" UI shell and design tokens.

---

## Runtime Flow & Lifecycle

The extension uses a two-phase progressive response lifecycle for dictionary lookups, and an asynchronous abortable pipeline for AI requests.

```text
User selects text on webpage OR types query in toolbar popup
                        │
                        ▼
           Trigger Activation & Surface Prep
  - In-Page: Floating icon, post-selection key, direct selection, dblclick, or context menu
  - Toolbar: Manual query entry or active tab selection lookup
  - Automatic Context: Exact selection sentence or ranked page candidate prefill
                        │
                        ▼
         LOOKUP_TEXT Message to Service Worker
                        │
                        ▼
┌──────────────────────────────────────────────────────────────┐
│                  Background Service Worker                   │
│                                                              │
│  1. Load normalized settings & register tab AbortController  │
│  2. Route by source: "dictionary" vs "ai"                    │
└──────────────┬───────────────────────────────┬───────────────┘
               │                               │
    [source: "dictionary"]             [source: "ai"]
               │                               │
               ▼                               ▼
┌──────────────────────────────┐ ┌──────────────────────────────┐
│  Phase 1: Fast Primary Path  │ │    AI Generation Pipeline    │
│  - Dictionary & Translation  │ │  - Format prompt & variables │
│    run in parallel           │ │  - Sandbox input boundaries  │
│  - Primary provider lookup   │ │  - Route: Gemini / OpenAI-cb │
│    with fallback chain       │ │  - Parse JSON / Markdown     │
│  - Return initial result     │ │  - Extract lexical profile   │
│    immediately (blocking)    │ │  - Return result to popup    │
└──────────────┬───────────────┘ └──────────────────────────────┘
               │
               ▼
┌──────────────────────────────┐
│   Popup Initial Rendering    │
│  - Render definitions & IPA  │
│  - Render translation card   │
│  - Show initial source badge │
│  - Expose audio & practice   │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────────────────────────────────────┐
│              Phase 2: Lazy Enrichment (Non-Blocking)          │
│                                                              │
│  1. If phrase-like & no defs: run AI Phrase Fallback first   │
│  2. Query non-primary dictionary providers (concurrency: 2)  │
│  3. Merge definitions, examples, syns/ants, IPA, & profile   │
│  4. Update L1 (memory) & L2 (chrome.storage.session) cache   │
│  5. Send LOOKUP_UPDATE with requestId and revision: 1        │
└──────────────┬───────────────────────────────────────────────┘
               │
               ▼
┌──────────────────────────────┐
│   Popup Progressive Render   │
│  - Check requestId match     │
│  - Re-render enriched cards  │
│  - Backfill phonetic IPA     │
│  - Append all source badges  │
│  - Preserve practice score   │
└──────────────────────────────┘
```

---

## Dictionary Lookup & Fallback Pipeline

### Phase 1: Initial Fast Lookup

1. **Facade Dispatch:** The background worker calls `lookupDictionary(text, settings)` via `src/providers/dictionary.js`.
2. **Primary Provider Selection:** The configured `dictionaryProvider` (`free_dictionary` by default) is attempted first.
3. **Provider Fallback Chain:** If the primary provider returns `NotFoundError`, the fallback chain evaluates in order:
   ```text
   free_dictionary ➔ wiktionary ➔ merriam_webster ➔ wordnik ➔ words_api
   ```
   *(The primary provider is prioritized at the front of this sequence.)*
4. **Smart Lemmatization Fallback:** If exact matches fail with `NotFoundError` across all providers, `getEnglishLemmaCandidates(text)` generates candidate root stems (e.g. irregular verbs `went` → `go`, plurals `children` → `child`, comparative adjectives `better` → `good`, inflectional suffixes `-ing`, `-ed`, `-es`, `-s`, `-ly`, `-er`, `-est`) and retries the fallback chain. On success, `lemmaFallback` metadata and a subtitle notice (`Showing definitions for root: <stem>`) are attached.
5. **Smart Phrasal Canonicalization Fallback:** If single-word lemma candidates fail, `getEnglishPhraseCandidates(text)` canonicalizes inflected or auxiliary-led multi-word expressions to base dictionary forms (e.g. `taking care of` → `take care of`, `ran out of` → `run out of`, `has taken off` → `take off`, `looked up` → `look up`) and retries the chain, attaching a phrase notice subtitle on success.
6. **Operational Failure Gate:** Operational errors (missing credentials, network drop, rate limit, HTTP 403/429/500) immediately abort the fallback chain and bubble up to the user with actionable diagnostic error messages.
7. **Parallel Translation:** When `enableTranslate` is active, `lookupTranslation(text, settings)` executes concurrently with dictionary lookups via `Promise.allSettled`.
8. **Initial Delivery:** The combined dictionary and translation result is returned immediately to the UI with `enriched: false` and `revision: 0` for sub-second rendering.

### Phase 2: Asynchronous Lazy Enrichment

After the initial result is dispatched to the popup, the background service worker executes non-blocking background enrichment:

1. **AI Phrase Fallback (Multi-word Lookups):** If the query is phrase-like (`classifyQuery(text) === "phrase"`), lack usable dictionary definitions, and `enableAI` is enabled, `lookupAiProvider(text, settings, { intent: "phrase_fallback" })` is scheduled first. Upon completion, the phrase explanation is merged and broadcast via `LOOKUP_UPDATE` before proceeding to secondary dictionary enrichment.
2. **Secondary Provider Filtering:** Key-backed providers (`merriam_webster`, `wordnik`, `words_api`) lacking API keys in `chrome.storage.local` are skipped upfront without network overhead.
3. **Bounded Concurrency:** Remaining unqueried providers are fetched in concurrent batches of 2 (`ENRICHMENT_CONCURRENCY = 2`).
4. **Resilient Failure Handling:** Secondary `NotFoundError` results and operational errors are caught and logged silently without disrupting the displayed primary result.
5. **Cumulative Merge Engine (`mergeDictionaryEnrichment`):**
   - **Sections:** Definitions, examples, synonyms, and antonyms are matched by normalized kind/title, deduplicated by normalized text, and clamped by strict limits:
     - `MAX_DEFINITIONS_SECTIONS = 2`
     - `MAX_EXAMPLES_SECTIONS = 2`
     - `MAX_SYNONYM_SECTIONS = 1`
     - `MAX_ANTONYM_SECTIONS = 1`
     - `MAX_ITEMS_PER_SECTION = 8`
   - **Pronunciations:** Audio URLs and IPA phonetic transcriptions are backfilled onto matching language/accent slots (`en-US`, `en-GB`). Phonetic entries are sorted first (`preferPhoneticPronunciations`) so the header row always surfaces transcription text when any provider supplies it. Clamped to `MAX_PRONUNCIATIONS = 4`.
   - **Lexical Profiles:** Normalized word family forms, word formation, warnings, learner mistakes, and collocations are merged across providers via `mergeLexicalProfiles`.
   - **Source Badges:** Every provider that successfully returned data is added to `sourceBadges`, ensuring full attribution even when content duplicates an existing section.
6. **Incremental Broadcast:** The enriched payload is sent to the originating tab/frame via `LOOKUP_UPDATE` (`revision: 1`, `enriched: true`).

---

## Two-Level Enriched Caching Engine

To avoid redundant secondary network calls on repeated lookups, the service worker coordinates a two-level caching system:

```text
LOOKUP Request
      │
      ▼
Check L1 In-Memory Cache (Fast Map, max 20 entries, 10-min TTL)
  ├─ Hit  ──► Return cached enrichment immediately
  └─ Miss ──► Check L2 Storage Cache
                │
                ▼
Check L2 Session Storage (chrome.storage.session with "enrich_" prefix)
  ├─ Hit  ──► Hydrate L1 Map, return cached enrichment
  └─ Miss ──► Check in-flight deduplication Map (enrichmentInFlight)
                ├─ In-flight ──► Attach to existing Promise
                └─ Fresh ────► Launch runDictionaryEnrichment()
                                 │
                                 ▼
                     Write to L1 Map & L2 Session Storage
```

- **Cache Key Serialization:** Formed from normalized query text, lemma stem, primary provider ID, translation parameters, and provider API key availability flags.
- **In-flight Deduplication:** `enrichmentInFlight` tracks active enrichment promises by cache key, ensuring duplicate rapid queries share the same network execution.
- **Cache Invalidation:** Any change in `chrome.storage.sync` or `chrome.storage.local` to provider selection, enabled features, target language, or API keys triggers `clearEnrichmentSessionCache()`, clearing both L1 and L2 session storage.
- **Schema Migrations:** `migrateEnrichmentCacheSchema()` tracks `ENRICHMENT_CACHE_SCHEMA_VERSION = 2` to purge incompatible serialized cache shapes across extension updates.

---

## AI Multi-Intent Pipeline & Structured Output

The AI subsystem (`src/providers/ai-provider.js`) provides generative explanations, grammatical analysis, and sentence decomposition through specialized intents:

| Intent | Action / Role | Prompt Template Setting | Output Format | Lexical Profile Requested |
|---|---|---|---|---|
| `default` | Main AI tab explanation | `aiPromptTemplate` | Semantic Markdown plus parsed sense cards | Yes |
| `explain_in_context` | Context Explain | `aiContextPromptTemplate` | Meaning, substitutions, nuance Markdown | No |
| `grammar` | Grammar & Nuance | `aiGrammarPromptTemplate` | Syntax, register, and tone Markdown | Yes |
| `phrase_explorer` | Phrase & Collocations | `aiPhraseExplorerPromptTemplate` | Idiom & collocation Markdown | Yes |
| `sentence_breakdown` | Sentence Breakdown | `aiSentencePromptTemplate` | Structured JSON (`data` object) | No |
| `phrase_fallback` | Automatic phrase fallback | Built-in fallback template | Concise Markdown explanation | No |
| `compare_confusables` | Compare Confusables | `aiComparePromptTemplate` | Distinction, matrix, minimal pairs | No |
| `rephrase` | Rephrase toolbar | `aiRephrasePromptTemplate` | Three stylistic rewrites | No |

### AI Request Pipeline

1. **Protocol Routing:**
   - **Google Gemini Native:** Used when `aiBaseUrl` matches Google Gemini endpoints (`generativelanguage.googleapis.com`). Calls the REST `generateContent` endpoint directly with API key query authentication.
   - **OpenAI-Compatible Chat API:** Used for all other custom/self-hosted endpoints (e.g. Ollama, OpenRouter, Groq, OpenAI, LocalAI) calling `/chat/completions` with `Bearer` header authentication.
2. **Prompt Construction & Sandboxing:**
   - Evaluates template variables: `{{str}}` (query), `{{text}}` (full selection), `{{sentence}}` (context sentence or query), `{{word_count}}`, `{{targetLang}}`, and `{{context}}`.
   - Appends a strict sandboxed input contract block (`<target>`, `<context>`, `<target-language>`) ensuring user selections cannot inject prompt override instructions.
3. **Structured Sentence Breakdown:**
   - For `sentence_breakdown`, requests a pure JSON response containing `overview`, `structureComponents` (clauses/functions), and `phraseParsing` (idioms, verb phrases, prepositions).
   - Parsed via `extractJsonObject` and validated with `normalizeSentenceBreakdown`. Emits interactive phrase chips that allow direct nested lookups.
4. **Parse-Time AI Section Normalization:**
   - Markdown output is cleaned of accidental code fences and normalized to `###` headings.
   - `splitMarkdownIntoSections()` assigns authoritative semantic section `kind` values (`context`, `definitions`, `grammar`, `examples`, `structures`, `summary`, `lexical`, etc.) derived from built-in outlines in `src/shared/ai-prompts.js`.
   - Leftover overlapping sections (e.g. redundant translation sections) are pruned or merged.
   - For long results (>= 4 sections), secondary deep-dive sections are wrapped in collapsible native `<details>` disclosures while core explanations stay expanded.

---

## Lexical Profile Subsystem

When `enableLexicalProfile` is enabled (default `true`), dictionary and AI lookups assemble a structured lexical learning profile:

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        Lexical Profile Model                           │
├────────────────────────────────────────────────────────────────────────┤
│ • wordFamily: { noun[], verb[], adjective[], adverb[],                 │
│                 inflections[], derivatives[] }                         │
│ • wordFormation: { prefixes[], suffixes[], explanation }               │
│ • usageWarnings: string[] (e.g. "[formal]", "[slang]", "[offensive]")   │
│ • confusablePairs: Array<{ word, distinction }>                        │
│ • learnerMistakes: Array<{ mistake, correction, example }>             │
│ • collocations: { verbs[], nouns[], prepositions[], adjectives[],      │
│                   patterns[] }                                         │
└────────────────────────────────────────────────────────────────────────┘
```

1. **Provider-First Extraction:** Parts of speech, derivations, inflections, and usage notes returned by primary and secondary dictionary adapters (e.g. WordsAPI, Wordnik, Wiktionary) are automatically extracted during normalization.
2. **AI Structured Block Extraction:** Prompts for `default`, `grammar`, and `phrase_explorer` request an optional `<lexical-profile>` JSON block. The AI provider extracts and strips this block from the visible Markdown using `parseLexicalProfileFromResponse()` and parses it with `parseLexicalProfile()`.
3. **Deep Profile Merging:** `mergeLexicalProfiles` combines provider-extracted data with AI-generated profiles, enforcing strict deduplication and category bounds:
   - `MAX_LEXICAL_ITEMS = 12`
   - `MAX_DERIVATIVES = 12`
   - `MAX_LEXICAL_WARNINGS = 8`
   - `MAX_CONFUSABLE_PAIRS = 6`
   - `MAX_LEARNER_MISTAKES = 6`
   - `MAX_FORMATION_ITEMS = 6`
   - `MAX_COLLOCATION_ITEMS_PER_GROUP = 10`
4. **UI Presentation:** The shared renderer emits interactive Word Family chips (`data-lookup-query`) that trigger immediate sub-lookups on click, warning callout cards, dedicated Word Formation tags, Common Learner Mistakes cards, and categorized Collocation blocks.

---

## Pronunciation & Speech Practice Engine

Pronunciation handling (`src/ui/audio.js`, `src/providers/pronunciation.js`) coordinates multi-source playback and speech evaluation:

1. **Playback Hierarchy:**
   - **Remote Audio:** Prefers high-quality dictionary MP3/WAV URLs returned by providers.
   - **Speech Synthesis Fallback:** If remote audio is missing or fails, falls back to browser `window.speechSynthesis`.
   - **Rate & Voice Control:** Applies user-configured `pronunciationRate` (clamped `0.5`–`1.5`) and optional `pronunciationVoiceURI`.
   - **Visual Wave Animation:** Three-bar animated equalizer wave animates strictly while audio is playing.
   - **Zero Caching Policy:** Audio blobs and audio metadata are never cached to prevent memory bloat.
2. **Speech Practice Evaluator:**
   - Uses browser `SpeechRecognition` / `webkitSpeechRecognition` to capture spoken learner attempts.
   - Normalizes spoken text against the target query and calculates Levenshtein distance similarity.
   - Surfaces standardized grade badges:
     - `90–100`: **Excellent** (emerald badge)
     - `70–89`: **Good** (teal badge)
     - `50–69`: **Almost there** (amber badge)
     - `<50`: **Try again** (rose badge)
   - Emits an animated glowing pulse ring during microphone recording.
   - Preserves active practice score across Phase 2 lazy enrichment re-renders via `audio.restorePracticeResult()`.

---

## Content Script & In-Page Overlay Architecture

The in-page subsystem (`src/content/`) is organized into specialized modules:

```text
src/content/
├── selection.js       # Exact DOM Range calculation & editable target filtering
├── context.js         # Exact selection sentence & ranked page context extraction
├── trigger.js         # Floating search icon lifecycle & edge-aware positioning
├── popup-position.js  # VisualViewport collision detection, clamping & repositioning
├── settings-bridge.js # Non-secret settings cache & chrome.storage.sync listener
├── lookup-bridge.js   # Content lookup cache (TTL 10m) & LOOKUP_TEXT messaging
├── state.js           # Shared state defaults & tab ordering
├── icons.js           # Inline SVG icon assets (search, close, audio, practice)
└── content.js         # Event orchestration, focus trapping, lifecycle & cleanup
```

### Context Extraction Subsystem

Contextual AI actions rely on dual-mode sentence extraction (`src/content/context.js`):

1. **Mode 1 — Exact Selection-Based Extraction (Confidence: `exact`):**
   - Obtains `window.getSelection().getRangeAt(0)`.
   - Climbs to the enclosing block element (`p`, `li`, `blockquote`, `article`, etc.).
   - Clones the range and measures character offset from block start:
     ```js
     const preRange = range.cloneRange();
     preRange.selectNodeContents(block);
     preRange.setEnd(range.startContainer, range.startOffset);
     const offset = preRange.toString().length;
     ```
   - Scans backward and forward from `offset` for sentence delimiters (`.`, `!`, `?`, `。`, `！`, `？`).
   - Pinpoints the exact occurrence highlighted by the user, eliminating ambiguity in paragraphs with repeated words.
2. **Mode 2 — Candidate Ranking & Page Search (Confidence: `suggested`):**
   - For typed queries in the toolbar, searches the active page DOM for matching word boundaries (`\bquery\b`).
   - Ranks sentence candidates by viewport visibility (`visible: true`), semantic parent (`<main>`, `<article>`), viewport distance, and document order.
   - Prefills the Context field as an editable, session-only suggestion.

### Positioning & Viewport Adaptation

The positioning engine (`src/content/popup-position.js`) dynamically adapts to complex web layouts:

- **VisualViewport Awareness:** Accounts for browser zoom, mobile/pinch zoom, page scroll, and iframe offsets (`window.visualViewport`).
- **Collision Boundary Flipping:** Automatically flips the popup above, below, left, or right of the selection to prevent viewport clipping.
- **Fixed vs Absolute Coordination:** Dynamically switches between `fixed` and `absolute` positioning depending on document scrolling context and iframe constraints.
- **Dynamic Max-Height Refinement:** `refinePopupMaxHeight()` recalculates usable vertical space on every render to ensure the card never overflows the viewport.

---

## Storage & Security Architecture

The extension implements strict data boundaries to guarantee that API credentials cannot leak to untrusted execution contexts:

```text
┌────────────────────────────────────────────────────────────────────────┐
│                   chrome.storage.sync (Public Data)                    │
├────────────────────────────────────────────────────────────────────────┤
│ User preferences, theme, font choice, triggers, provider IDs, popup   │
│ dimensions, pronunciation rate, and AI prompt templates.               │
│ -> Accessible by background, options, toolbar popup, and content script.│
└────────────────────────────────────────────────────────────────────────┘
                                    │
┌────────────────────────────────────────────────────────────────────────┐
│                   chrome.storage.local (Private Secrets)               │
├────────────────────────────────────────────────────────────────────────┤
│ aiApiKey, dictionaryApiKey, wordnikApiKey, wordsApiKey,                │
│ libreTranslateApiKey.                                                  │
│ -> ISOLATED STRICTLY TO BACKGROUND SERVICE WORKER.                     │
│ -> Never queried by getUiSettings(). Never sent to content scripts.    │
└────────────────────────────────────────────────────────────────────────┘
                                    │
┌────────────────────────────────────────────────────────────────────────┐
│                  chrome.storage.session (Transient Data)               │
├────────────────────────────────────────────────────────────────────────┤
│ dictionaryHelperLastTab (active tab per browser session),              │
│ enrich_* (Phase 2 enrichment cache, TTL 10 minutes).                   │
│ -> Cleared on browser restart or settings changes.                     │
└────────────────────────────────────────────────────────────────────────┘
```

### Security Safeguards

- **Zero-Leak UI Settings Loader (`getUiSettings`):** Toolbar popup and content scripts only invoke `getUiSettings()`, which queries `chrome.storage.sync` exclusively. API keys are physically excluded from UI memory spaces.
- **Secret Migration (`migrateLegacySecretSettings`):** Automatically migrates legacy secret keys from `sync` to `local` and permanently purges them from `sync` storage.
- **Schema Migrations (`migrateSettingsSchema` — Schema v8):** Upgrades default prompt templates safely while strictly preserving customized user prompts.
- **Granular Host Permissions (`src/shared/permissions.js`):** Custom AI base URLs and self-hosted LibreTranslate instances trigger dynamic `chrome.permissions.request({ origins: [...] })` prompts from the options page.
- **Sanitized Import/Export:** Settings export generates a public JSON document `{ version, exportedAt, settings }` omitting all secret keys. Settings import ignores secret keys if present.

---

## Messaging Model & Cancellation Architecture

### Message Catalog

| Message Type | Sender ➔ Receiver | Payload | Purpose |
|---|---|---|---|
| `LOOKUP_TEXT` | Popup / Content ➔ Background | `{ source, text, trigger, context, intent }` | Initiates primary dictionary or AI lookup. Returns initial result. |
| `LOOKUP_UPDATE` | Background ➔ Popup / Content | `{ requestId, text, source, revision, result }` | Delivers Phase 2 lazy enrichment or asynchronous AI phrase fallback. |
| `CANCEL_LOOKUP` | Popup / Content ➔ Background | *(None / tab-inferred)* | Cancels in-flight network requests for the sender tab upon card dismissal. |
| `OPEN_LOOKUP_POPUP` | Background ➔ Content | `{ text, context, contextSource, contextConfidence }` | Directs content script to mount and display popup for context-menu queries. |
| `VALIDATE_PROVIDER` | Options ➔ Background | `{ kind, providerId, settings }` | Performs non-destructive provider connectivity and latency test. |
| `GET_PAGE_CONTEXT` | Toolbar / BG ➔ Content | `{ text }` | Requests extracted page sentence and confidence metadata for target text. |

### Tab-Scoped Abort & Stale-Update Protection

```text
LOOKUP_TEXT / Card Dismissal
             │
             ▼
Background: cancelRequestsForTab(tabId)
  - Calls AbortController.abort() for active tab fetches
  - Aborts in-flight Phase 1 dictionary/translation requests
  - Aborts in-flight AI provider streams & Phase 2 lazy enrichment
             │
             ▼
Background: registerController(tabId, requestId)
  - Registers fresh AbortController with fetchWithTimeout / fetchWithRetry
             │
             ▼
When LOOKUP_UPDATE arrives at UI:
  1. Does message.requestId match popup.activeRequestId?
     ├─ No  ──► Discard (response belongs to an abandoned query)
     └─ Yes ──► Does message.text match current active input?
                  ├─ No  ──► Discard (user typed a new query)
                  └─ Yes ──► Apply enriched data and re-render
```

- Provider adapters pass the `AbortSignal` down to `fetchWithTimeout()` and `fetchWithRetry()`.
- Network aborts (`AbortError`) settle silently without triggering error toasts.
- `requestToken` counters in the content script and toolbar popup provide client-side synchronization against out-of-order responses.

---

## Visual Design System & Shared UI Shell

Both popup surfaces share a unified visual architecture called **"Calm Learning Studio"**:

- **Design Tokens (`tokens.css`):** Three-tier token architecture (Primitives → Semantics → Surface tokens) controlling light, dark, and system themes.
- **Typography:**
  - **Editorial Display Font:** Warm serif styling for term headers, definitions, and AI explanations.
  - **Learner Font Mode (`data-font="learner"`):** Locally bundled Atkinson Hyperlegible font across all controls, definitions, and examples to eliminate character ambiguity for ESL learners.
  - **Monospace Font:** Clean tokenized code presentation.
- **Shared Popup Shell (`src/ui/popup-shell.js`):** Generates consistent semantic markup across toolbar and in-page popups, enforcing dimension constraints (width: 320–1000px, height: 360–1000px).
- **Interactive States & Skeletons:**
  - `Renderer.renderSkeleton()` emits accessible multi-tier loading placeholders while maintaining `aria-busy="true"`.
  - Exit transitions run a crisp 120ms animation on manual close while replacement by a new selection remains instant.
  - Motion strictly honors `@media (prefers-reduced-motion: reduce)`.

---

## System Constraints & Boundary Handling

1. **Chrome Extension Reloads:** Existing web tabs maintain zombie content script instances until refreshed. Content scripts catch `isExtensionContextInvalidated` errors and display an inline **"Extension reloaded — Refresh this tab"** banner.
2. **Restricted Browser Pages:** Chrome forbids content script injection on `chrome://`, Chrome Web Store, and internal PDF reader frames. The extension identifies these via `canInjectIntoUrl()` and displays an unobtrusive action badge notification (`!`) explaining the restriction.
3. **Scriptable PDFs & Web Readers:** Scriptable PDF embeds and reader view containers with accessible DOM text layers are fully supported with exact sentence extraction.
4. **Lightweight Markdown Boundary:** The renderer supports common Markdown constructs (headings 1–6, bold, italics, lists, blockquotes, code, horizontal rules) with XSS-safe escaping, avoiding heavyweight CommonMark dependencies.
5. **No Build Step:** All modules use native ES module imports in the service worker/options/toolbar and structured global namespaces in classic content script injections. Code remains transparent and auditable directly from source.
