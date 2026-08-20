# Context & Sentence Extraction Flow

## Overview

Contextual AI features (**Context Explain**, **Grammar & Nuance**, and **Sentence Breakdown**) require or benefit from knowing the surrounding sentence of a target word or phrase.

The extension uses a dual-mode context retrieval architecture:

1. **Selection Mode (Exact):** Uses DOM Range position to extract the exact sentence at the user's cursor selection.

In all cases, automatic pre-filling is a non-blocking convenience. The Context field is editable, user edits are authoritative, and no context is sent remote until an AI contextual action is clicked.

---

## Dual-Mode Retrieval Architecture

```text
                           +--------------------------+
                           | User initiates AI action |
                           +------------+-------------+
                                        |
                   +--------------------+--------------------+
                   |                                         |
         [Text selection on page]                   [Typed query in toolbar]
                   |                                         |
                   v                                         v
     Exact DOM Range Extraction                Candidate Ranking & Page Search
  (DOM Block + Range Character Offset)       (Visible > Main Content > Viewport Dist)
                   |                                         |
                   v                                         v
       Confidence: "exact"                      Confidence: "suggested"
       Help: "Context detected                   Help: "Suggested sentence
              from selection"                           from this page"
                   |                                         |
                   +--------------------+--------------------+
                                        |
                                        v
                           +--------------------------+
                           | Editable Context Field   |
                           | (Session-only, transient)|
                           +--------------------------+
```

---

## Mode 1: Exact Selection-Based Extraction

Used when the popup is opened from highlighted text on a webpage.

### Sequence

1. Read `window.getSelection().getRangeAt(0)`.
2. Find the nearest enclosing block container (`p`, `li`, `td`, `blockquote`, `figcaption`, `dd`, `dt`, `h1`-`h6`, `pre`, `article`, `section`, `main`, `div`).
3. Clone the range to calculate the exact selection offset within that block element:
   ```js
   const preRange = range.cloneRange();
   preRange.selectNodeContents(block);
   preRange.setEnd(range.startContainer, range.startOffset);
   const offset = preRange.toString().length;
   ```
4. Scan backward from `offset` for sentence start boundaries (`.`, `!`, `?`, `。`, `！`, `？`).
5. Scan forward for sentence end boundaries and trailing quotes/brackets.
6. Slice and normalize that exact sentence block.
7. Set `source: "selection"` and `confidence: "exact"`.

### Why This Solves Multi-Occurrence Conflicts

If a word appears 3 times in one paragraph or across different paragraphs:
- The old approach searched from the top of a big block and returned the **first** matching sentence.
- The Range offset pinpoints the **exact occurrence highlighted by the user**, guaranteeing the correct sentence is extracted.

---



### Ranking Strategy


1. Builds a word-boundary pattern (`\bquery\b` Unicode aware) to avoid partial matches (e.g. `art` inside `article`).
2. Collects text nodes from readable semantic elements (`p`, `li`, `blockquote`, `td`, `figcaption`, `article`, `section`, `h1`-`h6`).
3. Splits each element into sentences and filters those matching the word pattern.
4. Ranks candidates by priority:
   - **Visibility:** Element is currently in the active viewport (`visible: true`).
   - **Semantics:** Element lives inside main content (`<main>`, `<article>`, `[role="main"]`).
   - **Proximity:** Distance from the top of the viewport (`viewportDistance`).
   - **Document Order:** Document index as a final deterministic fallback.
5. Returns top candidate with `source: "page"` and `confidence: "suggested"`.
6. If no page match exists, returns `{ context: "", source: "", confidence: "none" }`.

---

## Message Contract (`GET_PAGE_CONTEXT`)

The content script responds with structured confidence metadata:

```json
{
  "context": "Scientists are currently discovering evidence of ancient life on the planet.",
  "source": "selection",
  "confidence": "exact"
}
```

Possible `confidence` states:

- `"exact"`: Sliced via DOM Range offset around selection. Help text: `Context detected from your selection. You can edit it.`
- `"suggested"`: Selected via page search candidate ranking. Help text: `Suggested sentence from this page. You can edit or replace it.`
- `"manual"`: Edited or pasted by user. Help text: `Used only for this explanation. Not saved.`
- `"none"`: No match found. Context remains blank.

---

## PDFs, Frames, and Reader Pages

The content script is registered for file URLs, runs in supported frames, and can match about:blank child frames. Extraction prefers the selected DOM Range and then the nearest readable block, including PDF text-layer containers and article/reader containers. It does not scrape an entire PDF or article when a sentence can be isolated.


## Privacy & Bounded Use

- **Transient:** Context is kept only in active popup state memory. It is never saved to extension sync or local storage.
- **Opt-In:** Page context is prefilled for convenience, but never sent to remote AI APIs until the user clicks an AI contextual action button.
- **Truncated:** Context text is capped to `MAX_CONTEXT_CHARS` (800 chars) to prevent giant prompt payloads.
- **Non-Blocking:** If page context extraction fails (restricted browser tab, iframe, no matching text), the user can paste any sentence directly into the Context field.
