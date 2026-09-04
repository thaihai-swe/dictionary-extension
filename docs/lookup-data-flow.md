# Lookup Data Flow: Dictionary vs AI Assistant

When the user selects a word or inputs a search term, **Dictionary** and **AI Assistant** execute independently through a decoupled concurrency pipeline. They share only the selected text and surrounding sentence context.

- Dictionary lookup does **not** wait for AI.
- AI analysis does **not** wait for dictionary definitions or Lexical Profile.
- Dictionary fires immediately on selection.
- If AI preload is enabled, **only `Main AI` (`default`)** preloads in parallel after a 600ms debounce. The remaining 6 AI intents are deferred until the user opens the AI tab.
- If the user later opens the AI tab, the `Main AI` intent is already in cache (0ms render), and the remaining intents are automatically queued in the background.

Related: [Architecture](architecture.md), [Context Extraction](context-extraction.md), [Providers](providers.md), [Settings](settings.md).

---

## 1. Step-by-Step Flow Architecture

```text
User selects word in browser (or types in toolbar popup)
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
    ├── Unified useLookupSession() coordinates term, context, aborts, audio & tabs
    ├── Active tab = dictionary → mounts <WordLookupView />
    └── AI tab stays unmounted until first visit (lazy chunk)
           │
           ├─────────────────────────────────────────────────────────────┐
           │ Immediate                                                   │ 600ms debounce
           ▼                                                             ▼
[3] DICTIONARY PIPELINE                                       [4] AI PRELOAD PIPELINE (DICTIONARY TAB)
    composable.dictionary.ts → searchWord()                   composable.dictionary.ts → maybePreloadAi()
           │                                                             │
           ├─ Persistent LRU cache (dict, 200 / 48h)                     ├─ Persistent LRU cache (AI, 100 / 24h)
           │   HIT → paint in the same tick (0ms)                        │   HIT → ready with no network
           │                                                             │
           ├─ MISS → chrome.runtime.sendMessage                          ├─ MISS → chrome.runtime.sendMessage
           │         type: LOOKUP_TEXT                                   │         type: AI_LOOKUP
           │         timeout: 30,000ms                                   │         intent: default (Main AI) ONLY
           │                                                             │         timeout: 30,000ms
           ▼                                                             ▼
[5] service-worker.ts                                         [6] service-worker.ts
    handleDictionaryLookup()                                  handleAiLookup()
           │                                                             │
           ├─ fetchCombinedDictionaryResult()                            ├─ fetchAiAnalysis()
           │   FreeDict / Wiktionary / Datamuse / RhymeBrain /           │   gemini-3.5-flash-lite / OpenAI-compatible
           │   Wikipedia / Urban Dictionary                              │
           │                                                             │
           ├─ Phase A: Primary definitions + phonetics                   ├─ Stores Main AI intent in aiCache
           │   Resolves LOOKUP_TEXT → Dictionary tab paints              │   Ready if the user switches tabs
           │   (Editorial serif headword + UK/US pronunciation)          │
           │                                                             │
           └─ Phase B: Lexical Profile & secondary enrichment            └─ Other 6 intents: NOT REQUESTED
               LOOKUP_UPDATE messages (revision++)                           No background API calls while on
               Word family, collocations, mistakes, additional senses        the Dictionary tab. Zero token waste.
```

---

## 2. Opening the AI Tab (`isVisible === true`)

When the user switches to the **AI Assistant** tab:

```text
User clicks "AI Assistant" Tab
           │
           ▼
[1] <AiAssistantView /> mounts / becomes visible (isVisible = true)
           │
           ├─ Main AI (default) renders INSTANTLY from aiCache
           │
           ▼
[2] preloadFollowUpIntentsOnTabVisit() triggers sequentially
    src/composables/composable.ai-assistant.ts
           │
           ├── Queues remaining 6 intents via requestIdleCallback (250ms spacing):
           │     1. explain_in_context (if sentence context exists)
           │     2. grammar
           │     3. collocations
           │     4. sentence_breakdown
           │     5. confusables
           │     6. rephrase
           │
           ▼
[3] AiIntentToolbar Status Dots Transition Automatically:
    • Unrequested (gray dot) ➔ Loading (amber pulsing dot) ➔ Ready (emerald dot)
    • Hovering over any intent immediately warms it (preloadSpecificIntent)
    • Clicking any ready intent switches views instantly (0ms)
```

---

## 3. Parallel vs. Dependent Concurrency Model

```text
selection
    │
    ├──► Dictionary LOOKUP_TEXT ──────────────────────────► UI (definitions)
    │         │
    │         └──► LOOKUP_UPDATE (enrichment, non-blocking) ► extra cards
    │
    └──► 600ms timer ─► AI_LOOKUP (default intent only) ──► aiCache
                              │
                              └── independent AbortController / requestId
                                  dictionary abort does not cancel AI
                                  AI abort does not cancel dictionary
```

- **Independent inputs:** selected word, optional sentence context, target language, provider settings.
- **No data handoff:** AI does not wait for dictionary JSON. Dictionary does not wait for AI Markdown.
- **Shared cancellation only at the UX layer:** calling `useLookupSession().abortAllLookups()` or making a new selection cancels both in-flight dictionary and AI requests and halts active audio immediately without race conditions.

---

## 4. Phase Details

### 1. Selection and Context Extraction
1. `mouseup`, modifier hotkey (`Shift`, `Alt`, or `Ctrl`), toolbar query, or `OPEN_LOOKUP_POPUP` context-menu action.
2. `extractSurroundingContext()` in `src/shared/page-context.ts` slices the containing sentence so homonyms and ambiguous terms have authentic context.
3. Overlay mounts in the content-script shadow root (`#dictionary-extension-root`).

### 2. Dictionary Pipeline (Immediate)
1. `<WordLookupView />` calls `searchWord(text, provider, lang, context)` via `useLookupSession()`.
2. **Cache:** in-memory LRU synced to `chrome.storage.local` (200 entries, 48h TTL, `dict_lookup_cache_v2`). Hit paints definitions and phonetics immediately with 0ms network latency.
3. **Miss:** `LOOKUP_TEXT` message sent to `src/entrypoints/background/service-worker.ts` → `fetchCombinedDictionaryResult()`.
4. **Phase A (Fast Primary Lookup):** Primary provider (default: Free Dictionary API) and neural translation run in parallel. First paint renders the serif headword, UK/US phonetic chips, audio playback buttons, and core definitions.
5. **Phase B (Progressive Lazy Enrichment):** Background worker queries secondary keyless providers (`Datamuse`, `Wiktionary`, `Wikipedia`, `Urban Dictionary`, `RhymeBrain`) in concurrent batches of 2 (`ENRICHMENT_CONCURRENCY = 2`). `LOOKUP_UPDATE` messages are pushed with incrementing `revision` numbers. Extra cards (`CollocationsCard`, `WordFamilyCard`, `LearnerMistakesCard`, `WordFormationCard`) mount on subsequent animation frames without layout jump.
6. **Timeouts:** All dictionary, translation, and proxy fetch calls enforce a uniform **30,000ms (30s)** timeout limit (`DICTIONARY_FETCH_TIMEOUT_MS = 30000`, `TRANSLATION_FETCH_TIMEOUT_MS = 30000`).

> **Inspecting Network Requests:** Because dictionary and translation requests run in the background service worker to bypass webpage CORS boundaries, their HTTP requests appear in the **Background Service Worker's DevTools Network tab** (`chrome://extensions` → "service worker"), not the in-page DevTools.

### 3. AI Pipeline (Speculative & Sequenced)
1. The same `searchWord()` call schedules `maybePreloadAi()` with a **600ms debounce**. Rapid re-selection or text adjustment clears the timer (`cancelAiPreload()`), preventing wasted API tokens.
2. After 600ms: `preloadIntents()` requests **only** the `default` (Main AI) intent via `AI_LOOKUP` and prefetches its code chunk.
3. **The other 6 intents do not make network calls** while the user remains on the Dictionary tab.
4. When the user switches to the AI tab (`isVisible: true`), `preloadFollowUpIntentsOnTabVisit()` warms the remaining intents sequentially in the background via `requestIdleCallback` (with 250ms spacing). Duplicate in-flight calls share `aiPendingMap`.
5. Hovering or focusing any intent button in `AiIntentToolbar` immediately warms that specific intent via `preloadSpecificIntent()`.
6. Status indicators on each intent button reflect real-time readiness:
   - **Emerald:** Cached and ready.
   - **Amber Pulse:** Currently fetching.
   - **Gray (Unrequested):** Not requested yet.
7. **Cache:** Persistent LRU, 100 entries, 24h TTL (`ai_lookup_cache_v2` in `chrome.storage.local`).
8. AI HTTP runs in the background service worker (`handleAiLookup` → `fetchAiAnalysis`) using `gemini-3.5-flash-lite` or custom endpoints with a **30,000ms (30s)** timeout.

Preload is skipped when AI is disabled, preload is off, or no API key is configured (`shouldPreloadAi()`).

---

## 5. Opening the AI Tab: Behavior Matrix

The AI view is loaded lazily on first visit (`aiVisited`), then stays mounted with `display: none`, so tab switches do not remount or refetch.

| When the user opens AI | What they see | Why | Follow-up intent behavior |
|---|---|---|---|
| After ~1s on Dictionary | Instant (0ms) | Default intent already in `aiCache` | Remaining 6 intents begin sequential background preload via `requestIdleCallback` |
| Immediately (<600ms) | Skeleton loader | In-flight `AI_LOOKUP` is reused via `aiPendingMap`; no second request | Remaining 6 intents begin background preload once active query is established |
| Dictionary → AI → Dictionary → AI | Instant (0ms) | View stayed mounted; state is warm in memory | Already cached; 0 network calls |

---

## 6. Message and Cache Map

| | Dictionary tab | AI Assistant tab |
|---|---|---|
| **Trigger** | Selection / `searchWord()` | 600ms debounce from `searchWord()` (Main AI only), then tab visit sequence |
| **Runtime message** | `LOOKUP_TEXT`, then `LOOKUP_UPDATE` | `AI_LOOKUP` |
| **Timeout limit** | **30,000ms (30s)** | **30,000ms (30s)** |
| **Background handler** | `handleDictionaryLookup` | `handleAiLookup` |
| **Abort scope** | Dictionary `AbortController` | Per-intent AI `AbortController` |
| **Cache** | LRU 200 entries, 48h, `chrome.storage.local` (`dict_lookup_cache_v2`) | LRU 100 entries, 24h, `chrome.storage.local` (`ai_lookup_cache_v2`) |
| **UI lifecycle** | Always mounted while overlay is open | Lazy until first visit, then keep-alive |
| **Data dependency** | None (purely decoupled) | None (purely decoupled) |
