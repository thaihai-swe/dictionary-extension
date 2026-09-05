# Architecture

## Overview

**Dictionary** is a modern Chrome Manifest V3 extension engineered with **Vite 5**, **React 18**, **TypeScript 5**, and **Tailwind CSS**.

The runtime architecture is organized into clean, decoupled layers following modern Chrome Extension entrypoint standards:

1. **Toolbar Popup Entrypoint** (`src/entrypoints/toolbar-popup/`) — Standalone browser action UI (`app.toolbar-popup.tsx`, `main.tsx`) for manual search, mode switching, editable context, 7 contextual AI intents, global audio controls, and settings.
2. **Content Script & In-Page Overlay** (`src/entrypoints/content-script/`) — Injected Shadow DOM overlay system (`bootstrap.ts`, `overlay-app.tsx`, `overlay.in-page.tsx`) handling text selection, floating trigger icon, exact context extraction, collision-safe viewport positioning, dragging & resizing, and result rendering.
3. **Background Service Worker Entrypoint** (`src/entrypoints/background/service-worker.ts`) — Central background service worker handling context menu actions, CORS-bypassing fetch proxies (`FETCH_PROXY`), dictionary and AI lookup dispatch, network cancellation, and keyboard shortcut commands.
4. **React Stores & Hooks** (`src/composables/`) — External-store state engines subscribed via `useSyncExternalStore` using lightweight reactive signals (`src/ui/signal.ts`):
   - `composable.lookup-session.ts`: Session facade for tab switching and `abortAllLookups()` (stops audio and in-flight dictionary/AI requests). Overlay close/unmount calls `abortAllLookups()`.
   - `composable.dictionary.ts`: Handles caching, dictionary lookups, audio playback & reactive `isAudioPlayingRef` state with global `stopAllAudio()`.
   - `composable.ai-assistant.ts`: Handles Gemini AI prompts, 7 intent pipelines, Dictionary-tab Main AI preload, AI-tab visit sequencing, and hover prefetching.
   - `composable.storage.ts`: Reactive `chrome.storage` settings synchronization.
5. **Provider Adapters** (`src/providers/`) — Keyless vendor adapters for dictionary providers (`free_dictionary`, `wiktionary`, `datamuse`, `wikipedia`, `urban_dictionary`, `rhymebrain`), translation (`google_translate`, `mymemory`, `libre_translate`), and Gemini AI (`gemini-3.5-flash-lite`).
6. **UI Component System** (`src/components/`) — Modular React 18 components in the **Editorial Ink** system (warm paper light / obsidian velvet + champagne gold dark): `AppHeader` (quiet Stop Voice control), `RelatedWords` (inline synonym/antonym links), `SenseMatrixCard`, `WordFamilyCard`, `UsageNotesCard`, `WordFormationCard`, `LearnerMistakesCard`, `CollocationsCard`, `SentenceBreakdownCard`, `MarkdownRenderer`, `TokenizedContext`, and Settings Modals.

---

## Runtime Flow & Lifecycle

The extension uses a two-phase progressive response lifecycle for dictionary lookups, and an asynchronous abortable pipeline for AI requests. Dictionary and AI run in parallel with no data dependency; see [Lookup Data Flow](lookup-data-flow.md) for the selection-to-tab sequence.

```text
User selects text on webpage OR types query in toolbar popup
                        │
                        ▼
           Trigger Activation & Surface Prep
  - In-Page: Floating icon, post-selection key, direct selection, or context menu
  - Toolbar: Manual query entry or active tab selection lookup
  - Automatic Context: Range-only sentence extract after popup open (page scan is not on mouseup)
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
│  - Dictionary lookup first   │ │  - Format prompt & variables │
│  - Translation in parallel;  │ │  - Sandbox input boundaries  │
│    attach if already ready   │ │  - Route: Gemini / OpenAI-cb │
│  - Exact selected query      │ │  - Parse JSON / Markdown     │
│    before secondary backends │ │  - Extract lexical profile   │
│  - Return dictionary result  │ │  - Return result to popup    │
│    immediately (blocking)    │ │                              │
└──────────────┬───────────────┘ └──────────────────────────────┘
               │
               ▼
┌──────────────────────────────┐
│   Popup Initial Rendering    │
│  - Render headword + UK/US   │
│  - Render definitions & IPA  │
│  - Render translation card   │
│  - Expose audio & practice   │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────────────────────────────────────┐
│              Phase 2: Lazy Enrichment (Non-Blocking)          │
│                                                              │
│  1. Attach late translation via LOOKUP_UPDATE (revision: 1)  │
│  2. If phrase-like & no defs: run AI Phrase Fallback         │
│  3. Always-enrich remaining keyless providers (batch N=2)    │
│     Wiktionary, Datamuse, RhymeBrain, Wikipedia, Urban Dict  │
│  4. Merge definitions, examples, syns/ants, IPA, & profile   │
│  5. Update SW combined-result memory cache                   │
│  6. UI coalesces LOOKUP_UPDATE onto requestAnimationFrame    │
└──────────────┬───────────────────────────────────────────────┘
               │
               ▼
┌──────────────────────────────┐
│   Popup Progressive Render   │
│  - Check requestId + revision│
│  - Re-render without jump    │
│  - Backfill phonetic IPA     │
│  - Preserve practice score   │
└──────────────────────────────┘
```

---

## Dictionary Lookup & Fallback Pipeline

### Phase 1: Initial Fast Lookup

1. **Facade Dispatch:** The background worker calls `fetchCombinedDictionaryResult(text, settings)` via `src/providers/provider.index.ts`.
2. **Primary Provider Selection:** The configured `dictionaryProvider` (`wiktionary` by default) is attempted first.
3. **Provider Fallback Chain:** All remaining dictionary backends are keyless. `NotFoundError` and transient network/5xx/429/timeout continue to the next provider. The fallback chain evaluates in order:
   ```text
   wiktionary ➔ free_dictionary ➔ datamuse ➔ rhymebrain ➔ wikipedia ➔ urban_dictionary
   ```
   *(The primary provider is prioritized at the front of this sequence.)*
4. **Primary Exact Query:** The primary provider looks up the selected text as-is. Inflections and phrases are not rewritten to a root lemma.
5. **Secondary Exact Query:** If the primary still has no hit, remaining keyless providers try the same exact query. `NotFoundError` and transient network/5xx/429/timeout continue to the next provider.
6. **Operational Failure Gate:** Transient network, timeout, 429, and 5xx errors continue to the next provider. Dictionary, translation, AI, and fetch-proxy HTTP timeouts are uniformly **60s**.
7. **Non-Blocking Translation:** When `enableTranslate` is active, translation starts in parallel. If it finishes before the dictionary result, it is included in the first paint. Otherwise the dictionary result is returned immediately and translation is merged later via `LOOKUP_UPDATE` (`revision: 1`).
8. **Initial Delivery:** The dictionary result is returned immediately to the UI with `enriched: false` and `revision: 0` for first paint. Settings are cached in the service worker until `chrome.storage` changes.

### Phase 2: Asynchronous Lazy Enrichment

After the initial result is dispatched to the popup, the background service worker executes non-blocking background enrichment:

1. **Late Translation Merge:** If translation was still in flight at first paint, it is merged via `LOOKUP_UPDATE` (`revision: 1`) before phrase fallback or dictionary enrichment.
2. **AI Phrase Fallback (Multi-word Lookups):** After a ~300ms delay when translation was already included (so a dismissed card can cancel), if the query is phrase-like, lacks usable definitions, and both `enableAI` and `enablePhraseFallback` are on, `lookupAiProvider(text, settings, { intent: "phrase_fallback" })` runs first. Upon completion, the phrase explanation is merged and broadcast via `LOOKUP_UPDATE` before secondary dictionary enrichment.
3. **Always-enrich:** Secondary keyless providers always run after Phase 1, even when the primary entry already has definitions. There is no thin-entry gate.
4. **Secondary Provider Filtering:** Remaining keyless providers (Datamuse, Wiktionary, Wikipedia, Urban Dictionary, RhymeBrain) participate in progressive enrichment without requiring API keys.
5. **Bounded Concurrency:** Remaining unqueried providers are fetched in concurrent batches of 2 (`ENRICHMENT_CONCURRENCY = 2`).
6. **Resilient Failure Handling:** Secondary `NotFoundError` results and operational errors are caught and logged silently without disrupting the displayed primary result.
7. **Cumulative Merge Engine (`mergeDictionaryEntries`):**
   - **Meanings & Definitions:** Meanings are grouped by canonical POS (`canonicalPartOfSpeech`). Definitions are deduplicated with token-overlap / near-duplicate matching (`areDefinitionsEquivalent`); a later provider can backfill a missing example onto an existing definition. Extra POS groups are skipped once `MAX_MEANINGS` is reached. Clamped to:
     - `MAX_MEANINGS = 6`
     - `MAX_DEFINITIONS_PER_POS = 8`
   - **Attributed Lists:** Synonyms, antonyms, and examples are deduplicated and clamped to `MAX_ITEMS_PER_SECTION = 16`.
   - **Phonetics:** IPA is stored only on `phonetics[]` (`text` = IPA, `audio` = URL). Entries match IPA first, then region. Distinct IPAs are preserved without collisions. Clamped to `MAX_PHONETICS = 8`.
   - **Lexical Profiles:** Normalized word family forms, word formation, warnings, learner mistakes, and collocations merge via `mergeLexicalProfiles`.
   - **Specialized POS:** Urban Dictionary slang and Wikipedia encyclopedia stay as separate POS groups, not mixed into general lexical categories.
   - **Lifecycle:** Intermediate merges keep `enriched: false`. The final service-worker task sets `enriched: true`. Dictionary `sourceBadges`, top-level `phonetic`, `pronunciations`, and `syllables` are removed from the model.
8. **Incremental Broadcast:** The enriched payload is sent to the originating tab/frame via `LOOKUP_UPDATE`. The UI coalesces revisions onto `requestAnimationFrame` and ignores equal-or-older revisions.

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

- **Cache Key Serialization:** Formed from normalized query text, primary provider ID, translation parameters, and provider API key availability flags.
- **In-flight Deduplication:** `enrichmentInFlight` tracks active enrichment promises by cache key, ensuring duplicate rapid queries share the same network execution.
- **Cache Invalidation:** Any change in `chrome.storage.sync` or `chrome.storage.local` to provider selection, enabled features, target language, or API keys triggers `clearEnrichmentSessionCache()`, clearing both L1 and L2 session storage.
- **Schema Migrations:** `migrateEnrichmentCacheSchema()` tracks `ENRICHMENT_CACHE_SCHEMA_VERSION = 2` to purge incompatible serialized cache shapes across extension updates.

---

## AI Multi-Intent Pipeline & Structured Output

The AI subsystem (`src/composables/composable.ai-assistant.ts` and `src/providers/provider.gemini-ai.ts`) provides generative explanations, grammatical analysis, sentence decomposition, and comparative nuance through 7 user-facing intents + 1 background phrase fallback:

| Intent | Action / Role | Prompt Template Setting | Output Format | Lexical Profile Requested |
|---|---|---|---|---|
| `default` | Main AI tab explanation | `aiPromptTemplate` | Semantic Markdown | No |
| `explain_in_context` | Context Explain | `aiContextPromptTemplate` | Meaning in context & substitutions | No |
| `grammar` | Grammar & Nuance | `aiGrammarPromptTemplate` | Syntax rules, nuance, and examples | Learner mistakes only |
| `collocations` | Phrase & Collocations | `aiPhraseExplorerPromptTemplate` | Core meaning, grammar patterns, examples | Collocations only |
| `sentence_breakdown` | Sentence Breakdown | `aiSentencePromptTemplate` | Structured JSON (`data` object) | No |
| `confusables` | Compare Confusables | `aiComparePromptTemplate` | Distinction, comparison matrix, minimal pairs | No |
| `rephrase` | Rephrase action | `aiRephrasePromptTemplate` | Three stylistic rewrites | No |
| `phrase_fallback` | Automatic phrase fallback | Built-in fallback template | Concise Markdown explanation | No |

### AI Concurrency & Preload Architecture

1. **Dictionary-tab Main AI preload (600ms debounce):**
   - When text is selected, `maybePreloadAi()` waits 600ms, then `preloadIntents()` fetches **only** the `default` (Main AI) intent.
   - Follow-up intents do **not** make network calls while the user stays on the Dictionary tab.
   - Rapid selection changes or overlay dismissal clear the timer (`cancelAiPreload()`), so no LLM tokens are spent on discarded words.
2. **AI-tab visit sequencing (`preloadFollowUpIntentsOnTabVisit`):**
   - When `<AiAssistantView />` becomes visible (`isVisible === true`), remaining intents (`explain_in_context`, `grammar`, `collocations`, `sentence_breakdown`, `confusables`, `rephrase`) queue sequentially via `requestIdleCallback` or 250ms timeouts.
   - Cached or already-pending intents are skipped.
3. **Intent Hover/Focus Prefetching & Live Status Indicators:**
   - In the AI assistant view, hovering over or focusing any secondary intent button triggers `preloadSpecificIntent()`.
   - Each intent button features a live status indicator dot:
     - **Emerald (Ready):** Response is cached and displays instantly on click.
     - **Amber Pulse (Loading):** Request is actively in-flight.
     - **Gray (Not requested):** Intent has not yet been fetched.
4. **In-Flight Request Deduplication (`aiPendingMap`):**
   - If a background preload is already in flight when the user switches to the AI tab or clicks an intent, the UI attaches to the running promise (`aiPendingMap.get(cacheKey)`), preventing duplicate API calls.
5. **Persistent 24-Hour LRU Cache (`chrome.storage.local`):**
   - Up to 100 AI responses are cached locally with a **24-hour TTL** (`ai_lookup_cache_v2`).
   - Keys are hashed compound representations of `intent`, `text`, `targetLang`, `context`, `model`, `baseUrl`, and `enableLexicalProfile`.
6. **Keep-Alive UI Mounting & Lazy Code Splitting:**
   - The `<AiAssistantView />` chunk is loaded lazily on first tab visit (`aiVisited` state).
   - Once mounted, switching between Dictionary and AI tabs keeps the component mounted with `display: none`, preserving scroll positions, active intents, and rendered syntax trees. Follow-up API preload only runs while `isVisible` is true.
7. **Tab-Scoped Abort & Context Invalidation:**
   - Each AI lookup creates a unique `requestId` and registers an `AbortController`.
   - Selecting a new word or closing the overlay aborts in-flight AI requests via `abortAllAiRequests()` / `useLookupSession().abortAllLookups()`.

### AI Request Pipeline

1. **Protocol Routing:**
   - **Google Gemini Native:** Used when `aiProvider` is `gemini`. Calls REST `generateContent` with `gemini-3.5-flash-lite` and API key query authentication.
   - **OpenAI Standard Chat API:** Used when `aiProvider` is `openai`. POSTs to `{aiBaseUrl}/chat/completions` with `stream: false`. Default base URL is `http://localhost:20128/v1`. Model is user-entered. `Bearer` is sent only when a key is present. Response parser accepts a JSON completion or SSE `chat.completion.chunk` if a local server streams anyway.
2. **Prompt Construction & Sandboxing:**
   - Evaluates template variables: `{{str}}` (query), `{{text}}` (full selection), `{{sentence}}` (context sentence or query), `{{word_count}}`, `{{targetLang}}`, and `{{context}}`.
   - Appends a strict sandboxed input contract block (`<target>`, `<context>`, `<target-language>`) ensuring user selections cannot inject prompt override instructions.
3. **Structured Sentence Breakdown:**
   - For `sentence_breakdown`, requests a pure JSON response containing `overview`, `structureComponents` (clauses/functions), and `phraseParsing` (idioms, verb phrases, prepositions).
   - Parsed via `extractJsonObject` and validated with `normalizeSentenceBreakdown`. Emits interactive phrase chips that allow direct nested lookups.
4. **Parse-Time AI Section Normalization:**
   - Markdown output is cleaned of accidental code fences and normalized to `###` headings.
   - `splitMarkdownIntoSections()` assigns authoritative semantic section `kind` values (`context`, `definitions`, `grammar`, `examples`, `structures`, `summary`, `lexical`, etc.) derived from built-in outlines in `src/shared/ai-prompts.ts`.
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

1. **Provider-First Extraction:** Parts of speech, derivations, inflections, and usage notes returned by primary and secondary dictionary adapters (e.g. Datamuse, Wiktionary) are automatically extracted during normalization.
2. **AI Structured Block Extraction:** Prompts for `grammar` and `collocations` request a subset `<lexical-profile>` JSON block (learner mistakes and collocations respectively). Main AI does not request extras. The AI provider extracts and strips this block from visible Markdown using `parseLexicalProfileFromResponse()` and parses it with `parseLexicalProfile()`.
3. **Deep Profile Merging:** `mergeLexicalProfiles` combines provider-extracted data with AI-generated profiles, enforcing strict deduplication and category bounds:
   - `MAX_LEXICAL_ITEMS = 12`
   - `MAX_DERIVATIVES = 12`
   - `MAX_LEXICAL_WARNINGS = 8`
   - `MAX_CONFUSABLE_PAIRS = 6`
   - `MAX_LEARNER_MISTAKES = 6`
   - `MAX_FORMATION_ITEMS = 6`
   - `MAX_COLLOCATION_ITEMS_PER_GROUP = 10`
4. **UI Presentation:** The shared React components emit interactive Word Family chips that trigger immediate sub-lookups on click, warning callout cards, dedicated Word Formation tags, Common Learner Mistakes cards, and categorized Collocation blocks.

---

## Pronunciation & Speech Practice Engine

Pronunciation handling (`src/composables/composable.dictionary.ts`) coordinates multi-source playback and speech evaluation:

1. **Playback Hierarchy (`playAudio`):**
   - **Remote Dictionary Audio:** Prefers high-quality dictionary MP3/WAV URLs returned by providers.
   - **Google TTS Fallback:** If remote audio is missing or fails, attempts Google Translate audio synthesis (`getFreeTtsUrl`).
   - **Speech Synthesis Fallback (`speakTTS`):** If network audio fails or user is offline, falls back to browser `window.speechSynthesis`.
   - **Rate & Voice Control:** Applies user-configured `pronunciationRate` (clamped `0.5`–`1.5`) and optional `pronunciationVoiceURI`.
   - **Zero Caching Policy:** Audio blobs and audio metadata are never cached to prevent memory bloat.
2. **Global Voice Control & Cancellation:**
   - **Reactive State:** `isAudioPlayingRef` signal tracks active audio playback.
   - **Immediate Cancellation:** `stopAllAudio()` instantly halts `window.speechSynthesis` and pauses/destroys any playing `HTMLAudioElement`.
   - **Header Stop Voice Button:** Quiet pulsing Stop Voice control in `AppHeader` renders whenever audio or speech synthesis is active.
   - **Keyboard Dismissal:** Pressing `Esc` halts all active speech immediately.
3. **Speech Practice Evaluator (`startSpeechPractice`):**
   - Uses browser `SpeechRecognition` / `webkitSpeechRecognition` to capture learner attempts.
   - Normalizes spoken text against the target query and calculates Levenshtein distance similarity.
   - Surfaces standardized grade badges:
     - `90–100`: **Excellent** (emerald badge)
     - `70–89`: **Good** (teal badge)
     - `50–69`: **Almost there** (amber badge)
     - `<50`: **Try again** (rose badge)
   - Emits an animated glowing pulse ring during microphone recording.
   - Preserves active practice score across Phase 2 lazy enrichment re-renders via internal `practiceResults` cache map.

---

## Content Script & In-Page Overlay Architecture

The in-page subsystem (`src/entrypoints/content-script/`) is organized into specialized React and TypeScript modules:

```text
src/entrypoints/content-script/
├── bootstrap.ts        # Entrypoint script; listens for selection & sets up Shadow DOM
├── overlay-app.tsx     # Shadow DOM host wrapper & root CSS injection
├── overlay.in-page.tsx # In-page popup container, positioning, drag/resize handlers
└── ...
```

Content scripts inject in the top frame (`all_frames: false`). Same-origin iframes are injected on selection via `INJECT_FRAME`. Cross-origin iframes cannot be read due to browser security restrictions. `pausedHostnames` disables in-page selection triggers only; toolbar popup, context menu, and the `lookup-selection` keyboard shortcut still work.

---

### Context Extraction Subsystem

Contextual AI actions rely on dual-mode sentence extraction (`src/shared/page-context.ts`):

1. **Mode 1 — Exact Selection-Based Extraction (Confidence: `exact`):**
   - Obtains `window.getSelection().getRangeAt(0)`.
   - Climbs to enclosing block element (`p`, `li`, `blockquote`, `article`, etc.).
   - Clones the range and measures character offset from block start.
   - Scans backward and forward from offset for sentence delimiters (`.`, `!`, `?`, `。`, `！`, `？`), correctly handling abbreviations, decimals, and URLs.
   - Pinpoints the exact occurrence highlighted by the user, eliminating ambiguity in paragraphs with repeated words.
2. **Mode 2 — Candidate Ranking & Page Search (Confidence: `suggested`):**
   - For typed queries in the toolbar or lookup without selection, searches active page DOM for matching word boundaries.
   - Ranks sentence candidates by viewport visibility (`visible: true`), semantic parent (`<main>`, `<article>`), viewport distance, and document order.
   - Prefills the Context field as an editable, session-only suggestion.

### Positioning & Viewport Adaptation

The positioning engine in `src/entrypoints/content-script/overlay.in-page.tsx` dynamically adapts to complex web layouts:

- **VisualViewport Awareness:** Accounts for browser zoom, mobile/pinch zoom, page scroll, and viewport dimensions (`window.visualViewport`).
- **Collision Boundary Flipping:** Automatically flips the popup above, below, left, or right of the selection to prevent viewport clipping.
- **Fixed vs Absolute Coordination:** Coordinates positioning relative to document scrolling context and window boundaries.
- **Dynamic Resizing & Persistence:** Users can drag the bottom-right corner to resize cards between 360px–1000px width and 380px–900px height. Preferences are persisted automatically into settings (`popupWidth`, `popupHeight`).

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
│ aiApiKey, libreTranslateApiKey, hasAiApiKey (boolean flag).           │
│ -> ISOLATED STRICTLY TO SERVICE WORKER AND SECURE OPTIONS MODAL.       │
│ -> Content scripts and public exports NEVER see raw API keys.          │
└────────────────────────────────────────────────────────────────────────┘
                                    │
┌────────────────────────────────────────────────────────────────────────┐
│                  chrome.storage.session (Transient Data)               │
├────────────────────────────────────────────────────────────────────────┤
│ Active tab memory per browser session, enrich_* (Phase 2 cache).       │
│ -> Cleared on browser restart or settings changes.                     │
└────────────────────────────────────────────────────────────────────────┘
```

### Security Safeguards

- **Zero-Leak UI Settings Loader (`loadPublicSettings`):** Toolbar popup and content scripts query public settings exclusively. API keys are physically excluded from unprivileged memory spaces.
- **Local Secret Storage (`chrome.storage.local`):** Secret keys (`aiApiKey`, `libreTranslateApiKey`) are saved to local device storage, never synced to Google cloud accounts. A public boolean flag (`hasAiApiKey`) in sync storage indicates key presence without exposing the token.
- **Schema Migrations (`migrateSettingsSchema` — Schema v12):** Automatically synchronizes `hasAiApiKey` flags and ensures prompt templates remain up-to-date while preserving user customizations.
- **Granular Host Permissions:** Custom AI base URLs and self-hosted LibreTranslate instances trigger dynamic `chrome.permissions.request({ origins: [...] })` prompts from Settings.
- **Sanitized Import/Export (`src/shared/settings-export.ts`):** Settings export generates a public JSON document omitting all secret keys (`SECRET_KEYS`). Settings import strictly ignores secret keys if present.

---

## Messaging Model & Cancellation Architecture

### Message Catalog

| Message Type | Sender ➔ Receiver | Payload | Purpose |
|---|---|---|---|
| `LOOKUP_TEXT` | Popup / Content ➔ Background | `LookupTextPayload` | Initiates primary dictionary or AI lookup. Returns initial result. |
| `AI_LOOKUP` | Popup / Content ➔ Background | `AiLookupPayload` | Initiates dedicated AI intent lookup (`default`, `grammar`, etc.). |
| `LOOKUP_UPDATE` | Background ➔ Popup / Content | `LookupUpdatePayload` | Delivers Phase 2 lazy enrichment or asynchronous AI phrase fallback. |
| `CANCEL_LOOKUP` | Popup / Content ➔ Background | `CancelLookupPayload` | Cancels in-flight network requests for the sender scope/tab. |
| `OPEN_LOOKUP_POPUP` | Background ➔ Content | `OpenLookupPopupPayload` | Directs content script to mount and display popup for context-menu queries. |
| `VALIDATE_PROVIDER` | Settings ➔ Background | `ValidateProviderPayload` | Performs non-destructive provider connectivity and latency test. |
| `FETCH_PROXY` | Popup / Content ➔ Background | `FetchProxyPayload` | Bypasses CORS restrictions for keyless dictionary and translation endpoints. |
| `ABORT_FETCH_PROXY` | Popup / Content ➔ Background | `{ requestId }` | Halts in-flight fetch proxy request. |

### Tab-Scoped Cancellation Architecture

1. **Unique Request Registration:** Every lookup operation creates a unique request ID via `createRequestId()` and registers a corresponding `AbortController` in the background worker.
2. **Context Invalidation:** When a user selects a new word, switches queries, or closes the popup, `cancelDictionaryLookup()` or `cancelAiLookup()` immediately signals the registered `AbortController`.
3. **Network Abort:** The active `fetch` operation is aborted immediately at the browser networking layer, preventing obsolete HTTP responses from consuming bandwidth or overwriting current UI state.
