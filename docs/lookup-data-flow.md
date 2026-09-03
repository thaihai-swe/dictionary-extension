# Lookup Data Flow: Dictionary vs AI Assistant

When the user selects a word, **Dictionary** and **AI Assistant** fetch independently. They share only the selected text and surrounding sentence. Neither pipeline waits for the other.

- Dictionary lookup does **not** wait for AI.
- AI analysis does **not** wait for dictionary definitions or Lexical Profile.
- Dictionary fires immediately. AI preloads in parallel after a 300ms debounce (so rapid re-selection does not spam the LLM).
- If the user later opens the AI tab, the default intent is often already in cache.

Related: [Architecture](architecture.md), [Context Extraction](context-extraction.md), [Providers](providers.md), [Settings](settings.md).

---

## Step-by-step flow

```text
User selects word in browser
           │
           ▼
[1] window.mouseup / hotkey / context menu
    src/entrypoints/content-script/bootstrap.ts
    ├── Clean selected text (e.g. "ephemeral")
    └── Surrounding sentence via extractSurroundingContext()
           │
           ▼
[2] openPopup() mounts the in-page overlay
    src/entrypoints/content-script/overlay.in-page.tsx
    ├── Default tab = dictionary → mounts <WordLookupView />
    └── AI tab stays unmounted until first visit (lazy chunk)
           │
           ├─────────────────────────────────────────────────────────────┐
           │ Immediate                                                   │ 300ms debounce
           ▼                                                             ▼
[3] DICTIONARY PIPELINE                                       [4] AI PRELOAD PIPELINE
    composable.dictionary.ts → searchWord()                   composable.dictionary.ts → maybePreloadAi()
           │                                                             │
           ├─ Persistent LRU cache (dict, 200 / 48h)                     ├─ Persistent LRU cache (AI, 100 / 24h)
           │   HIT → paint in the same tick                              │   HIT → ready with no network
           │                                                             │
           ├─ MISS → chrome.runtime.sendMessage                          ├─ MISS → chrome.runtime.sendMessage
           │         type: LOOKUP_TEXT                                   │         type: AI_LOOKUP
           │                                                             │         intent: default only
           ▼                                                             ▼
[5] service-worker.ts                                         [6] service-worker.ts
    handleDictionaryLookup()                                  handleAiLookup()
           │                                                             │
           ├─ fetchCombinedDictionaryResult()                            ├─ fetchAiAnalysis()
           │   FreeDict / Wiktionary / Datamuse / RhymeBrain /           │   gemini-3.5-flash-lite / OpenAI-compatible
           │   Wikipedia / Urban Dictionary                              │
           │                                                             │
           ├─ Phase A: base definitions + phonetics                      ├─ Stores default intent in aiCache
           │   Resolves LOOKUP_TEXT → Dictionary tab paints              │   Ready if the user switches tabs
           │   (Clean header: headword + UK/US pronunciation)            │
           │                                                             │
           └─ Phase B: Lexical Profile & secondary enrichment            └─ After default settles: preloadFollowUpIntents()
               LOOKUP_UPDATE messages (revision++)                           Hover/focus also calls preloadSpecificIntent()
               Word family, collocations, mistakes, additional senses        Follow-ups: explain_in_context, grammar,
                                                                             collocations, sentence_breakdown,
                                                                             confusables, rephrase
```

---

## Parallel vs dependent

```text
selection
    │
    ├──► Dictionary LOOKUP_TEXT ──────────────────────────► UI (definitions)
    │         │
    │         └──► LOOKUP_UPDATE (enrichment, non-blocking) ► extra cards
    │
    └──► 300ms timer ─► AI_LOOKUP (default intent) ───────► aiCache
                              │
                              └── independent AbortController / requestId
                                  dictionary abort does not cancel AI
                                  AI abort does not cancel dictionary
```

**Independent inputs:** selected word, optional sentence context, target language, provider settings.

**No data handoff:** AI does not consume dictionary JSON. Dictionary does not consume AI markdown.

**Shared cancellation only at the UX layer:** a new `searchWord()` bumps `dictPreloadGeneration`, clears the 300ms timer, and calls `cancelAiPreload()` so a *new* selection replaces the previous AI preload. That is generation/token invalidation, not a result dependency.

---

## Phase details

### 1. Selection and context

1. `mouseup`, modifier hotkey (`Shift`, `Alt`, or `Ctrl`), toolbar query, or `OPEN_LOOKUP_POPUP` context-menu action.
2. `extractSurroundingContext()` in `src/shared/page-context.ts` slices the containing sentence so homonyms have context.
3. Overlay mounts in the content-script shadow root (`#dictionary-extension-root`).

### 2. Dictionary (immediate)

1. `<WordLookupView />` calls `searchWord(text, provider, lang, context)`.
2. Cache: in-memory LRU synced to `chrome.storage.local` (200 entries, 48h TTL, `dict_lookup_cache_v2`). Hit paints definitions and phonetics immediately with 0ms network latency.
3. Miss: `LOOKUP_TEXT` → `handleDictionaryLookup()` in `src/entrypoints/background/service-worker.ts` → `fetchCombinedDictionaryResult()`.
4. Phase A returns base entry; the Dictionary tab renders with a clean header (headword + UK/US audio buttons).
5. Phase B runs concurrent keyless enrichment in batches of 2 (`ENRICHMENT_CONCURRENCY = 2`) across Datamuse, Wiktionary, Wikipedia, Urban Dictionary, and RhymeBrain. `LOOKUP_UPDATE` is pushed with an incremental `revision`. Extra cards (`WordFamilyCard`, `CollocationsCard`, `LearnerMistakesCard`, …) mount on subsequent animation frames so they do not block first paint.

> **Inspecting Network Requests:** Because dictionary and translation requests run in the background service worker to bypass webpage CORS boundaries, their HTTP requests appear in the **Background Service Worker's DevTools Network tab** (`chrome://extensions` → "service worker"), not the in-page DevTools.

### 3. AI (speculative, parallel)

1. The same `searchWord()` call schedules `maybePreloadAi()` (300ms debounce). Rapid re-selection clears the timer (`cancelAiPreload()`), so no LLM tokens are spent.
2. After the timer: `preloadIntents()` requests **only** the `default` intent (`AI_LOOKUP`) first, and prefetches the default view chunk.
3. When the default request settles, `preloadFollowUpIntents()` warms the follow-up intents (`explain_in_context`, `grammar`, `collocations`, `sentence_breakdown`, `confusables`, `rephrase`) sequentially in the background via `requestIdleCallback` or 250ms spacing. Duplicate in-flight calls share `aiPendingMap`.
4. Other intents also fetch immediately on intent-button hover or focus in `AiIntentToolbar` through `preloadSpecificIntent()`.
5. Status indicators on each intent button reflect real-time readiness:
   - **Emerald:** Cached and ready.
   - **Amber Pulse:** Currently fetching.
   - **Rose:** Not requested yet.
6. Cache: persistent LRU, 100 entries, 24h TTL (`ai_lookup_cache_v2` in `chrome.storage.local`).
7. AI HTTP runs in the background service worker (`handleAiLookup` → `fetchAiAnalysis`) using `gemini-3.5-flash-lite` or custom endpoints. Inspect that worker's Network tab, not the page.

Preload is skipped when AI is disabled, preload is off, or no API key is configured (`shouldPreloadAi()`).

---

## Opening the AI tab

The AI view is not mounted until the first visit. After that it stays mounted with `display: none`, so tab switches do not remount or refetch.

| When the user opens AI | What they see | Why |
|---|---|---|
| After ~1s on Dictionary | Instant | Default intent already in `aiCache` |
| Immediately (<300ms) | Short loading state | In-flight `AI_LOOKUP` is reused via `aiPendingMap`; no second request |
| Dictionary → AI → Dictionary → AI | Instant | View stayed mounted; state is warm |

`<AiAssistantView />` also calls `runIntent()` on mount or query change. If preload already filled the cache, that call is a cache read.

---

## Message and cache map

| | Dictionary tab | AI Assistant tab |
|---|---|---|
| Trigger | Overlay mount / `searchWord()` | 300ms debounce from the same `searchWord()`, plus hover prefetch |
| Runtime message | `LOOKUP_TEXT`, then `LOOKUP_UPDATE` | `AI_LOOKUP` |
| Background handler | `handleDictionaryLookup` | `handleAiLookup` |
| Abort scope | Dictionary `AbortController` | Per-intent AI `AbortController` |
| Cache | LRU 200 entries, 48h, `chrome.storage.local` (`dict_lookup_cache_v2`) | LRU 100 entries, 24h, `chrome.storage.local` (`ai_lookup_cache_v2`) |
| UI gate | Always mounted while overlay is open | Lazy until first visit, then keep-alive |
| Depends on the other tab? | No | No |
