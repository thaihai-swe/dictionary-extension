# Context & Sentence Extraction Specification

## Overview

Contextual AI capabilities (**Context Explain**, **Grammar & Nuance**, **Phrase & Collocations**, and **Sentence Breakdown**) require or benefit from knowing the surrounding sentence of a target word or phrase.

To provide accurate contextual awareness without capturing unnecessary or sensitive page content, **Dictionary** implements a dual-mode sentence extraction engine:

1. **Mode 1 — Selection Mode (Exact — Confidence: `exact`):** Calculates the exact character offset of the user's cursor selection within the containing DOM block, slicing only the containing sentence.
2. **Mode 2 — Page Search Mode (Ranked Candidate — Confidence: `suggested`):** Searches the readable page DOM for whole-word matches and ranks candidates using visibility, semantic container placement, viewport proximity, and document order.

---

## Dual-Mode Retrieval Architecture

```text
                           ┌──────────────────────────┐
                           │ User initiates AI lookup │
                           └────────────┬─────────────┘
                                        │
                   ┌────────────────────┴────────────────────┐
                   │                                         │
        [Text selection on page]                   [Typed query in toolbar]
        (or context-menu trigger)                  (or in-page tab switch)
                   │                                         │
                   ▼                                         ▼
┌──────────────────────────────────────┐  ┌──────────────────────────────────────┐
│  Mode 1: Exact Range Extraction      │  │  Mode 2: Ranked Page Search          │
│  - Reads window.getSelection().range │  │  - Builds Unicode word boundary regex│
│  - Climbs to nearest block element   │  │  - Scans semantic containers first   │
│  - Calculates character offset       │  │  - Evaluates up to 120 leaf elements │
│  - Bidirectional delimiter scan      │  │  - Ranks by: Visible > Main > Dist   │
│  - Heals soft hyphens & line breaks  │  │  - Slices up to 8 candidates         │
│  - Verifies query inside slice       │  │  - Fallback to 50k body innerText    │
└──────────────────┬───────────────────┘  └──────────────────┬───────────────────┘
                   │                                         │
                   ▼                                         ▼
         Confidence: "exact"                       Confidence: "suggested"
         Source: "selection"                       Source: "page"
         Help: "Context detected                   Help: "Suggested sentence
                from selection"                           from this page"
                   │                                         │
                   └────────────────────┬────────────────────┘
                                        │
                                        ▼
                           ┌──────────────────────────┐
                           │  Editable Context Field  │
                           │  - Capped to 800 chars   │
                           │  - Autosizing (2-4 rows) │
                           │  - Manual override state │
                           └────────────┬─────────────┘
                                        │
                      [User clicks Contextual AI Action]
                                        │
                                        ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        AI Request Submission                           │
│  • Context Explain: Strictly requires non-empty context                │
│  • Grammar & Nuance: Strictly requires non-empty context               │
│  • Sentence Breakdown: Uses context sentence, or query if sentence-like│
│  • Phrase & Collocations: Optional context supplement                  │
│  • Result displays a visible "Context used" quotation section          │
└────────────────────────────────────────────────────────────────────────┘
```

---

## Mode 1: Exact Selection-Based Extraction (`extractExactSentenceFromRange`)

Mode 1 is triggered when the user highlights text on a webpage or invokes a context-menu lookup on an active selection.

### Execution Sequence

1. **Selection Capture:** Reads `window.getSelection().getRangeAt(0)`.
2. **Block Container Resolution:** Identifies `range.commonAncestorContainer` (or parent element if a text node) and climbs to the nearest matching block element using:
   ```css
   p, li, td, th, blockquote, figcaption, dd, dt,
   h1, h2, h3, h4, h5, h6, pre, article, section, main,
   [role='article'], .reader-content, .textLayer, .pdfViewer, div
   ```
3. **Text Sanitization (`getSanitizedBlockText`):**
   - Slices up to `MAX_CANDIDATE_TEXT_LENGTH = 12000` characters.
   - Strips soft hyphens, zero-width spaces, and zero-width joiners (`/[\u00AD\u200B\u200C\u200D]/g`).
   - Rejoins hyphenated line breaks (`/([A-Za-zÀ-ɏ]+)-\s*\r?\n\s*([A-Za-zÀ-ɏ]+)/g` → `$1$2`).
   - Normalizes consecutive whitespace to single spaces.
4. **Range Character Offset Measurement (`getSelectionOffsetInBlock`):**
   ```javascript
   const preRange = range.cloneRange();
   preRange.selectNodeContents(block);
   preRange.setEnd(range.startContainer, range.startOffset);
   const offset = preRange.toString().length;
   ```
5. **Bidirectional Delimiter Scanning (`extractSentenceAtOffset`):**
   - Scans backward from `offset - 1` for sentence start boundaries: `.`, `!`, `?`, `。`, `！`, `？`.
   - Scans forward from `offset` for sentence end boundaries and extends across trailing quotes and brackets (`["'”’»)]`).
6. **Boundary Verification:** Verifies `findSentenceContaining(exactSentence, needle)` using a Unicode-aware boundary pattern.
7. **Context Normalization:** Caps length at `MAX_CONTEXT_CHARS = 800` via `normalizeContext()` with ellipsis truncation if exceeded.
8. **Result Packaging:** Returns `{ context, source: "selection", confidence: "exact" }`.

### Why Range Offset Solves Multi-Occurrence Ambiguity
Standard DOM search tools typically call `indexOf(needle)` from the start of a container, which always extracts the **first** occurrence of a word in a paragraph. By measuring the character offset of the user's `Range`, Mode 1 pinpoints the exact sentence the user highlighted, even when the same word appears multiple times in the same paragraph.

---

## Mode 2: Candidate Ranking & Page Search (`findBestPageSentenceCandidate`)

Mode 2 is triggered when the user types a query in the toolbar popup or switches to the AI tab with a manual query.

### Execution Sequence

1. **Word-Boundary Pattern Construction (`buildWordBoundaryPattern`):**
   - Escapes special regex characters and transforms spaces into `\s+`.
   - Constructs a Unicode-aware word boundary pattern:
     ```javascript
     new RegExp(`(^|[^\\p{L}\\p{N}_])${escaped}(?=$|[^\\p{L}\\p{N}_])`, "iu")
     ```
   - Prevents partial substring false positives (e.g. `art` matching inside `article` or `smart`).
2. **DOM Scanning Scope:**
   - Targets leaf elements inside semantic containers first:
     ```css
     /* Containers */
     main, article, section, [role='main'], [role='article'], .content, #content, .reader-content, .textLayer
     /* Leaf Elements */
     p, li, blockquote, td, th, figcaption, dd, dt, h1, h2, h3, h4, h5, h6, pre, .reader-content, .textLayer
     ```
   - If empty, scans document-wide leaf elements.
   - If still empty, falls back to top-level `div` elements.
   - Scans up to `MAX_SCAN_ELEMENTS = 120` elements to maintain 60fps performance.
3. **Candidate Collection:**
   - Evaluates elements matching the boundary pattern.
   - Splits block text into sentences via `splitIntoSentences()`:
     ```javascript
     text.match(/[^.!?。！？]+(?:[.!?。！？]+["'”’»)]*|$)/g)
     ```
   - Collects up to 8 matching candidate sentences, measuring bounding rects and visibility for each.
4. **Multi-Factor Candidate Ranking (`rankSentenceCandidates`):**
   Candidates are sorted deterministically using 4 weighted criteria:
   - **1. Viewport Visibility (`visible`):** Elements currently inside the active viewport (`rect.bottom >= 0 && rect.top <= viewportHeight`) rank first.
   - **2. Semantic Container (`inMainContent`):** Elements inside `<main>`, `<article>`, or reader containers take precedence over sidebars.
   - **3. Viewport Proximity (`viewportDistance`):** Elements closest to the top of the viewport (`Math.abs(rect.top)`) rank higher.
   - **4. Document Order (`documentOrder`):** Earlier document index serves as the final tiebreaker.
5. **Full-Page Text Fallback:**
   - If structured leaf scanning yields no match, scans the first `MAX_FALLBACK_TEXT_LENGTH = 50000` characters of `document.body.innerText`.
6. **Result Packaging:** Returns `{ context: candidate, source: "page", confidence: "suggested" }` or `{ context: "", source: "", confidence: "none" }`.

---

## Message Contract (`GET_PAGE_CONTEXT`)

The toolbar popup or background worker queries the active tab's content script via `GET_PAGE_CONTEXT`. If the in-page card already holds `activeContext` and the query matches `activeText`, the content script returns that in-memory value, preserving manual edits.

### Request Payload
```json
{
  "type": "GET_PAGE_CONTEXT",
  "payload": {
    "text": "evaluate"
  }
}
```

### Response Payload
```json
{
  "context": "Scientists are currently evaluating evidence of ancient microbial life on Mars.",
  "source": "selection",
  "confidence": "exact"
}
```

### Confidence & Source Lifecycle Matrix

| `confidence` | `source` | Origin / Trigger | UI Help Text |
|---|---|---|---|
| `"exact"` | `"selection"` | Extracted from exact selection Range offset. | `Context detected from your selection. You can edit it.` |
| `"suggested"` | `"page"` | Extracted from ranked page candidate search. | `Suggested sentence from this page. You can edit or replace it.` |
| `"manual"` | `"manual"` | User typed or pasted directly into textarea. | `Used only for this explanation. Not saved.` |
| `"none"` | `""` | No match found or extraction disabled. | `Used only for this explanation. Not saved.` |

---

## Action-Specific Context Handling & Validation

| Action | Intent | Context Requirement | Query & Context Resolution |
|---|---|---|---|
| **Context Explain** | `explain_in_context` | **Strictly Required** | Validates `validateContext()`. If empty, shows inline alert `Please enter or paste the sentence containing this word.` and focuses textarea. |
| **Grammar & Nuance** | `grammar` | **Strictly Required** | Validates `validateContext()`. If empty, shows inline alert `Please enter or paste the sentence containing this word.` and focuses textarea. |
| **Sentence Breakdown** | `sentence_breakdown` | **Flexible** | If query is already sentence-like (`classifyQuery(text) === "sentence"`), uses query as context. If query is a single word/phrase, requires valid context; otherwise prompts `Enter or paste the sentence to break down.` |
| **Phrase & Collocations** | `phrase_explorer` | **Optional** | Uses context if provided; functions seamlessly without context. |

When context is used, AI results render a dedicated quote section:
```markdown
### Context used
> Scientists are currently evaluating evidence of ancient microbial life on Mars.
```
The query term inside the quote is highlighted with bold markers (`**term**`) via `Renderer.highlightContextQuery()`.

---

## PDFs, Web Readers, and Frame Compatibility

- **Scriptable HTML5 PDF Text Layers:** Online or local PDFs rendered with HTML5 text layers (`.textLayer`, `.pdfViewer`) expose DOM nodes. Range offset and candidate extraction operate seamlessly over text-layer spans.
- **Hyphenation & Pagination Healing:** Line-break hyphens (`trans-\nportation` → `transportation`) and soft hyphens are healed automatically before boundary scanning.
- **Multi-Frame Selection Coordination:** Context-menu lookups transmit `frameId` from the background worker. When `frameId > 0`, the background queries `GET_PAGE_CONTEXT` on that selection frame, copies the returned sentence onto `OPEN_LOOKUP_POPUP`, and opens the popup in the top frame or selection frame.
- **Restricted Chrome Pages:** For pages where content script injection is impossible, the toolbar popup adapts its help text via `classifyPageRestriction`:
  - `pdf_viewer`: `"PDF viewer pages cannot auto-extract context. Paste the sentence here."`
  - `file_url`: `"Local files need Allow access to file URLs, or paste the sentence here."`
  - `restricted_page`: `"This page cannot provide context automatically. Paste the sentence here."`
  - `content_script_unavailable`: `"Page context unavailable. Paste the sentence here."`

---

## Privacy Safeguards & Execution Limits

1. **User Opt-Out (`disablePageContextExtraction`):** Configurable in Options. When enabled, `extractSurroundingContext()` immediately returns `{ context: "", source: "", confidence: "none" }`. The in-page card displays `🚫 Context: None`.
2. **Strict Payload Clamping (`MAX_CONTEXT_CHARS = 800`):** Enforces strict upper bounds to protect LLM context windows and control token costs. Truncated sentences append an ellipsis (`…`).
3. **Execution Bounds:**
   - `MAX_CANDIDATE_TEXT_LENGTH = 12000` chars per block.
   - `MAX_SCAN_ELEMENTS = 120` elements per candidate search.
   - `MAX_FALLBACK_TEXT_LENGTH = 50000` chars for full body fallback.
4. **Sandboxed XML Input Contract:** AI prompts wrap context in `<context>...</context>` tags to prevent malicious webpage text from executing prompt injections.
