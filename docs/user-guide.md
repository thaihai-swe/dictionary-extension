# User Guide

## Overview

**Dictionary** is a modern Chrome extension built for readers, students, and language learners. It brings instant definitions, neural translations, natural pronunciation, speech practice, and deep contextual AI explanations directly to the text you are reading—without breaking your reading flow or requiring external tabs.

The user interface is powered by the **Calm Learning Studio** design system:
- **Editorial Typography:** Clear, distraction-free serif typography for definitions and explanations, or bundled **Atkinson Hyperlegible** in **Learner Font** mode to improve character disambiguation for ESL learners.
- **Adaptive Appearance:** Native support for System, Light, and Dark themes with WCAG 2.1 AA compliant contrast ratios.
- **Transparent Attribution:** Multi-provider source badges clearly indicate which dictionary, translation, or AI services contributed to your result.
- **Persistent Geometry:** In-page popup dimensions can be resized from the bottom-right corner and are automatically saved.

---

## 1. Quick Start & Lookup Workflows

### Manual Lookup (Toolbar Popup)

1. Click the **Dictionary** icon in the Chrome toolbar (or pin it for one-click access).
2. Type any word, idiom, phrasal verb, or complete sentence into the search input.
3. Press `Enter` or click **Search**.
4. Use the **Dictionary** tab for structured definitions and translations, or switch to the **AI** tab for contextual explanations and grammatical analysis.
5. Click the **Gear icon** in the top-right header to access extension settings at any time.

*Tip: The toolbar popup remembers whether you were on the Dictionary or AI tab for your active browsing session.*

---

### In-Page Reading Triggers

Look up words directly on any webpage without copying or typing:

| Trigger Mode | Action / Behavior | Best Used For |
|---|---|---|
| **Floating Icon (Default)** | Highlight text or double-click a word to reveal a discreet floating lookup icon near the selection. Click it to open the card. | Non-intrusive everyday reading without accidental popup popovers. |
| **Post-Selection Hotkey** | Highlight text or double-click a word, then tap your configured modifier key once (`Shift` by default, or `Alt` / `Ctrl`). | High-speed keyboard-driven reading comprehension. |
| **Direct Popup** | Drag-select text or double-click a word to open the lookup card immediately on mouse release. | Intensive study or rapid vocabulary lookup sessions. |
| **Right-Click Context Menu** | Right-click any selected text and choose **Look up in Dictionary**. | Reading PDFs, iframes, or pages where mouse selection triggers are suppressed. |
| **Off** | Disables automatic selection icons and direct popups while keeping hotkey and context menu lookups active. | Clean browsing where lookups are only invoked intentionally. |

*Note: Selection triggers are automatically suppressed inside editable inputs (`<input>`, `<textarea>`, and `contenteditable` containers) to prevent interfering with typing.*

---

## 2. The Dictionary Tab

The **Dictionary** tab delivers a comprehensive, multi-source learning view combining real-time translation, progressive dictionary lookups, pronunciation, and structured lexical relationships.

```text
┌────────────────────────────────────────────────────────────────────────┐
│  D  evaluate                             [Free Dictionary] [Wiktionary]│
│     /ɪˈvæl.ju.eɪt/  (US) 🔊 Listen (US)  🔊 Listen (UK)  🎙️ Practice    │
├────────────────────────────────────────────────────────────────────────┤
│  ▼ Translation · Vietnamese                                            │
│    đánh giá, định giá                                                  │
├────────────────────────────────────────────────────────────────────────┤
│  ▼ Definitions · Verb (Free Dictionary)                                │
│    1. To determine or fix the value of.                                │
│    2. To examine and judge carefully; appraise.                        │
│       "We need to evaluate the experimental results."                  │
├────────────────────────────────────────────────────────────────────────┤
│  ▼ Word Family                                                         │
│    [evaluation]  [evaluative]  [evaluator]  [evaluated]  [evaluating]   │
├────────────────────────────────────────────────────────────────────────┤
│  ▼ Collocations                                                        │
│    • Verbs: carefully evaluate, objectively evaluate                   │
│    • Patterns: evaluate the effectiveness of, evaluate whether...      │
└────────────────────────────────────────────────────────────────────────┘
```

### Multi-Source Fallback & Progressive Lazy Enrichment

Dictionary lookups execute in two synchronized phases:

1. **Phase 1 — Fast Primary Lookup (Sub-second):**
   - The primary dictionary provider (default: **Free Dictionary API**) and configured translation engine execute in parallel.
   - Initial definitions, examples, and phonetic audio appear immediately.
2. **Phase 2 — Asynchronous Lazy Enrichment (Non-blocking):**
   - Secondary configured providers (**Wiktionary**, **Merriam-Webster**, **Wordnik**, **WordsAPI**) are queried lazily in concurrent batches of 2.
   - New definitions, additional example sentences, missing synonyms/antonyms, and phonetic transcriptions are merged dynamically.
   - Contributing provider badges appear in the title row and section metadata.

### Smart Lemmatization & Phrasal Fallback

If an exact query is not found in dictionary databases (for example, inflected verbs like `went`, irregular plurals like `children`, or comparative adjectives like `better`):
1. The extension automatically generates English root lemma candidates (e.g. `went` → `go`).
2. If single-word lemmatization fails on multi-word expressions (e.g. `taking care of` or `looked up`), it canonicalizes phrasal verbs to their base dictionary forms (e.g. `take care of`, `look up`).
3. When a fallback succeeds, the popup displays a helpful root notice: `Showing definitions for root: <stem>`.

### Translation Services

Translation runs alongside dictionary lookups:
- **Google Translate (Default):** Built-in neural translation supporting dozens of target languages without API keys.
- **LibreTranslate:** Connect to the public LibreTranslate service or your self-hosted private instance for privacy-focused translation.
- **Custom Target Languages:** Add any language display names in Settings (e.g. `Spanish`, `French`, `German`, `Japanese`, `Vietnamese`) to populate the quick-select dropdown.

---

## 3. Pronunciation & Speech Practice

Pronunciation tools are integrated directly into the result header:

### Audio Playback
1. **Remote Audio:** Prefers high-fidelity MP3/WAV recordings from native dictionary databases (US and UK variants).
2. **Web Speech Synthesis Fallback:** If dictionary audio is unavailable, falls back to the browser's built-in speech synthesis engine.
3. **Speed Control:** Customize speech rate in Settings (clamped from `0.5x` to `1.5x`).
4. **Voice Selection:** Choose your preferred operating system voice in Settings for speech synthesis fallback.
5. **Equalizer Wave:** An animated 3-bar equalizer visually confirms active playback.

### Speech Practice Evaluator
Click the **Practice** button (`🎙️ Practice`) next to pronunciation controls to test and refine your spoken English:
1. Speak the target word into your microphone when the glowing recording ring activates (`Listening…`).
2. The extension captures your speech via Chrome's Speech Recognition API, normalizes the input, and calculates pronunciation similarity using Levenshtein distance metrics.
3. You receive an instant color-coded grade badge:
   - `90%–100%`: **Excellent** (Emerald badge)
   - `70%–89%`: **Good** (Teal badge)
   - `50%–69%`: **Almost there** (Amber badge)
   - `<50%`: **Try again** (Rose badge)
4. Your active practice score is preserved across background lazy enrichment updates.

---

## 4. Structured Lexical Profile

When **Lexical Profile** is enabled in Settings (default), lookups assemble an organized lexical learning matrix:

- **Word Family Chips:** Displays related parts of speech (nouns, verbs, adjectives, adverbs, inflections, derivatives) as interactive clickable chips. Clicking any chip immediately triggers a sub-lookup for that term.
- **Word Formation:** Surfaces prefixes, suffixes, and morphological root explanations.
- **Usage & Register Notes:** Highlights formality warnings (e.g. `[formal]`, `[informal]`, `[slang]`, `[archaic]`) in a dedicated warning callout.
- **Confusable Pairs:** Clarifies subtle distinctions between commonly confused words (e.g. *affect* vs. *effect*, *complement* vs. *compliment*).
- **Common Learner Mistakes:** Highlights typical grammatical or preposition errors with corrections and contextual examples.
- **Categorized Collocations:** Displays natural word partnerships grouped by category (verbs, nouns, prepositions, adjectives, and sentence patterns).

---

## 5. The AI Tab & Specialized Actions

Switch to the **AI** tab for deep generative explanations powered by Google Gemini (native REST API) or any OpenAI-compatible endpoint (Ollama, Groq, OpenRouter, OpenAI, LocalAI).

```text
┌────────────────────────────────────────────────────────────────────────┐
│  D  AI Explanation                                      [AI · Default] │
├────────────────────────────────────────────────────────────────────────┤
│  [Context: Bounded Sentence]                                           │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ Scientists are currently evaluating evidence of ancient life.    │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│  [Context Explain] [Grammar & Nuance] [Phrase & Colloc] [Sentence]    │
├────────────────────────────────────────────────────────────────────────┤
│  ▼ evaluate [ɪˈvæl.ju.eɪt] verb                                        │
│    To form an opinion of the amount, value, or quality of something.   │
│                                                                        │
│  ▼ Translation & Meaning                                               │
│    đánh giá (xem xét và đưa ra nhận định về giá trị hoặc chất lượng).  │
│                                                                        │
│  ▼ Usage Note                                                          │
│    Frequently used in academic, scientific, and professional contexts. │
│                                                                        │
│  ▼ Example Sentences                                                   │
│    > "The committee will evaluate all proposals next week."            │
│      (Hội đồng sẽ đánh giá tất cả các đề xuất vào tuần tới.)           │
│                                                                        │
│  ▶ Deep Understanding (Click to expand)                                │
└────────────────────────────────────────────────────────────────────────┘
```

### The 5 Specialized AI Actions

| Action | Intent | Purpose & Output Structure | Context Requirement |
|---|---|---|---|
| **Main AI Explanation** | `default` | Oxford Learner-style definition, sense-aware translation glosses, concise usage notes, bilingual example sentences, and collapsible etymology/deep-dive sections. | Optional |
| **Context Explain** | `explain_in_context` | Focuses strictly on how the word functions within your specific sentence, providing precise in-context meaning and natural paraphrases. | **Required** |
| **Grammar & Nuance** | `grammar` | Analyzes syntactic function, clause structure, register, tone, and common grammatical learner pitfalls. | **Required** |
| **Phrase & Collocations** | `phrase_explorer` | Deconstructs idioms, phrasal verbs, prepositional dependencies, and collocation patterns with natural example sentences. | Optional |
| **Sentence Breakdown** | `sentence_breakdown` | Structural JSON analysis decomposing clauses, grammatical roles, and phrase idioms with one-click interactive lookup chips. | Full sentence query or context sentence |

---

## 6. Context Extraction & Privacy Controls

Contextual AI actions rely on exact sentence extraction rather than sending broad, privacy-invasive page dumps.

### How Context Works
1. **Selection Mode (Confidence: `exact`):** When you highlight text on a webpage, the extension climbs the DOM tree, measures the exact character offset of your selection, and extracts only the containing sentence. Soft-hyphens and line-break artifacts are healed automatically.
2. **Page Search Mode (Confidence: `suggested`):** When you type a query in the toolbar popup, the extension searches the active tab's visible DOM, scoring and ranking matching sentences by visibility, semantic tags (`<main>`, `<article>`), and viewport proximity.
3. **Manual Context:** You can paste or type any sentence directly into the editable Context textarea.

### Privacy Safeguards
- **Zero Background Transmission:** Context is never sent to any AI endpoint during standard dictionary lookups.
- **Explicit Activation:** Context is transmitted only when you click a contextual action button (**Context Explain**, **Grammar & Nuance**, or **Sentence Breakdown**).
- **Session-Only Memory:** Context is held transiently in browser session memory and is never saved to disk or synchronized across devices.
- **Opt-Out Setting:** Enable **Exclude page context for AI lookups** in Settings to disable automatic page sentence scanning completely.
- **Context Used Verification:** Whenever an AI response uses context, a blockquoted **Context used** header confirms the exact text submitted.

---

## 7. PDFs, Web Readers, and Restricted Pages

- **Scriptable HTML5 PDFs:** Online and local PDFs rendered with HTML5 text layers (e.g. PDF.js, Chrome PDF text layer) support exact sentence extraction and floating selection triggers.
- **Local Files (`file://`):** To enable lookups on local HTML or PDF files, open `chrome://extensions`, open Dictionary details, and enable **Allow access to file URLs**.
- **Reader Mode & Iframes:** Full multi-frame coordination (`all_frames: true`) ensures lookups inside reader containers or nested iframes extract sentences accurately without duplicate popups.
- **Browser-Restricted Pages:** Chrome security policy strictly blocks extension injection on `chrome://` URLs, the Chrome Web Store, and internal browser PDF reader chrome. On these pages, use the toolbar popup for manual lookups and paste your context sentence directly.

---

## 8. Keyboard Navigation & Accessibility

- **Keyboard Trapping:** In-page and toolbar popups support smooth `Tab` / `Shift+Tab` cycling through interactive elements.
- **Quick Dismissal:** Press `Escape` to close the in-page popup and return focus cleanly to the webpage.
- **ARIA Standards:** Popup shells implement semantic `role="tablist"`, `aria-selected`, `aria-live="polite"`, and `aria-busy="true"` attributes for screen reader compatibility.
- **Reduced Motion:** If your operating system has reduced motion enabled, all entrance, exit, and wave animations are suppressed.
- **Resizable Card:** Drag the resize handle at the bottom right to adjust the width (320px–840px) and height (360px–900px); your preferred dimensions are saved automatically.
