# A Smarter Way to Understand English While You Read

## Dictionary, Translation, Pronunciation, and AI Language Learning in One Chrome Extension

Most dictionary tools answer only one basic question: **"What does this word mean in the abstract?"**

In real-world reading, language is far more complex. A single word changes its meaning based on syntax, tone, idioms, cultural register, and the specific sentence in which it appears. When learners, researchers, or professionals encounter confusing text, traditional tools force them into a disjointed loop: copy the word, open a separate tab, search a dictionary website, switch to an AI chatbot, draft a prompt, and lose their place in the original article.

**Dictionary** solves this problem permanently. It brings fast multi-source definitions, neural translation, pronunciation practice, and sentence-aware AI intelligence directly to the text you are reading—keeping you immersed in your reading flow.

---

## Why Readers and Learners Choose Dictionary

### 1. Zero Context Switching: Read, Click, and Understand
Look up unfamiliar words, idioms, or sentences wherever you encounter them across the web:
- **Floating Selection Icon:** Highlight text or double-click a word to reveal an elegant, non-intrusive lookup trigger.
- **Post-Selection Hotkey:** Tap `Shift` (or `Alt` / `Ctrl`) immediately after selecting text to summon the card at high speed.
- **Direct Selection:** Open the lookup card instantly upon text highlighting for intensive study sessions.
- **Right-Click Context Menu:** Instant fallback on scriptable PDFs, reader-mode pages, and nested iframes.

The in-page card positions itself intelligently near your selection, flips boundaries to prevent screen clipping, and never pulls you away from the author's train of thought.

---

### 2. Two Synchronized Modes: Fast Answers First, Deep Learning on Demand

The product is built around two complementary learning surfaces:

- **Dictionary Mode:** Delivers sub-second primary definitions, parallel neural translations, US/UK pronunciation audio, and structured lexical relationships. As you read, non-blocking background workers lazily enrich the card with secondary dictionary data.
- **AI Mode:** Unlocks 5 specialized contextual actions (Main AI, Context Explain, Grammar & Nuance, Phrase & Collocations, and Sentence Breakdown) powered by Google Gemini or your own self-hosted/OpenAI-compatible LLMs.

Users get immediate clarity in under a second, with the power to explore grammatical nuance and sentence mechanics whenever a word is difficult, technical, or idiomatic.

---

## Complete Feature Showcase

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

### Pillar 1: Progressive Multi-Source Dictionary & Neural Translation
Rather than relying on a single fallible API, Dictionary orchestrates up to 5 authoritative dictionary backends:
1. **Primary Provider First:** Free Dictionary API (default), Wiktionary REST API, Merriam-Webster Collegiate, Wordnik, or WordsAPI (RapidAPI).
2. **Smart Lemmatization & Phrasal Fallback:** Automatically stems inflected verbs (`went` → `go`), irregular plurals (`children` → `child`), comparative adjectives (`better` → `good`), and multi-word phrasal expressions (`taking care of` → `take care of`).
3. **Phase 2 Lazy Enrichment:** Secondary providers query in background batches (`concurrency: 2`), backfilling missing phonetic IPA, extra example sentences, and synonyms without slowing down initial display.
4. **Parallel Neural Translation:** Delivers instant translations via Google Translate or self-hosted LibreTranslate in parallel with dictionary results.

---

### Pillar 2: Pronunciation Engine & Speech Practice Evaluator
Speaking and listening practice built directly into every lookup:
- **Studio-Quality Audio:** Plays authentic human dictionary audio (US and UK accents) with visual 3-bar equalizer animation.
- **Web Speech Synthesis Fallback:** Seamlessly falls back to local operating system voices when remote MP3s are unavailable.
- **Customizable Speed:** Adjust playback rate from `0.5x` (slow study) to `1.5x` (natural speed).
- **Interactive Speech Evaluator:** Click **Practice** (`🎙️ Practice`), speak the word into your microphone, and receive real-time Levenshtein distance grading badges:
  - `90%–100%`: **Excellent** (Emerald badge)
  - `70%–89%`: **Good** (Teal badge)
  - `50%–69%`: **Almost there** (Amber badge)
  - `<50%`: **Try again** (Rose badge)

---

### Pillar 3: Structured Lexical Profile
Transform passive lookups into comprehensive vocabulary mastery:
- **Interactive Word Family Chips:** Nouns, verbs, adjectives, adverbs, and derivatives appear as clickable chips (`[evaluation]`, `[evaluative]`). Clicking any chip triggers an instant re-lookup.
- **Word Formation:** Surfaces root prefixes, suffixes, and morphological explanations.
- **Usage & Register Warnings:** Highlights formality notes (`[formal]`, `[slang]`, `[archaic]`, `[offensive]`) in high-contrast warning callouts.
- **Confusable Word Pairs:** Clarifies easily confused terms (e.g. *affect* vs. *effect*, *principal* vs. *principle*).
- **Common Learner Mistakes:** Alerts learners to typical prepositional errors and false friends.
- **Categorized Collocations:** Groups natural pairings into verbs, nouns, prepositions, adjectives, and natural sentence patterns.

---

### Pillar 4: Sentence-Aware Contextual AI Intelligence
Meaning depends entirely on context. Dictionary's AI tab provides 5 dedicated capabilities:

| AI Action | Learner Value | Specialized Output |
|---|---|---|
| **Main AI** | Deep vocabulary comprehension | Oxford Learner-style definitions, sense-specific translations, register notes, bilingual examples, and collapsible etymology. |
| **Context Explain** | Pinpoint in-sentence meaning | Slices the exact surrounding sentence at your cursor and explains how the word behaves in that specific context. |
| **Grammar & Nuance** | Structural and stylistic clarity | Analyzes clause roles, syntactic dependencies, formality level, and tone. |
| **Phrase & Collocations** | Natural idiomatic fluency | Deconstructs phrasal verbs, idioms, and preposition patterns with usage guidelines. |
| **Sentence Breakdown** | Deep structural sentence parsing | Pure JSON decomposition of clauses, grammatical functions, and phrase chips that can be clicked for sub-lookups. |

---

## Competitive Breakdown

| Feature / Capability | Basic Dictionary Plugins | Generic AI Chat Tabs | **Dictionary (This Extension)** |
|---|:---:|:---:|:---:|
| **Zero-Tab In-Page Reading** | ✅ | ❌ (requires new tab) | ✅ **Full In-Page & Toolbar** |
| **Multi-Provider Fallback** | ❌ (single source) | ❌ | ✅ **5 Providers + Lazy Enrichment** |
| **Smart English Lemmatization** | ❌ | ⚠️ (slow prompt) | ✅ **Instant Root & Phrasal Fallback** |
| **Parallel Neural Translation** | ⚠️ (extra click) | ⚠️ (manual prompt) | ✅ **Simultaneous Sub-Second Translation** |
| **Authentic Audio + Speech Fallback** | ⚠️ (audio only) | ❌ | ✅ **Dual Audio + Custom Speed** |
| **Microphone Speech Practice** | ❌ | ❌ | ✅ **Levenshtein Accuracy Scoring** |
| **Exact Selection-Range Context** | ❌ | ❌ (manual copy-paste) | ✅ **Exact DOM Range Offset Slicing** |
| **Interactive Word Family Chips** | ❌ | ❌ | ✅ **Clickable Instant Sub-Lookups** |
| **Structured Sentence Breakdown** | ❌ | ⚠️ (unstructured text) | ✅ **Interactive JSON Clause Decomposition** |
| **BYO AI Endpoint & Custom Prompts** | ❌ (locked proprietary) | ⚠️ (paid subscription) | ✅ **Gemini Native + OpenAI-Compatible** |
| **Zero-Leak Secret Storage** | ⚠️ | ⚠️ | ✅ **Local Storage Isolation (No Sync Leak)** |
| **No Build Step / Zero Runtime Deps** | ❌ | ❌ | ✅ **100% Plain JS/HTML/CSS (MV3)** |

---

## Privacy, Control, and Security by Design

Dictionary is engineered with a strict local-first privacy boundary:

1. **Isolated Secret Vault:** API keys (Gemini, OpenAI, Merriam-Webster, Wordnik, WordsAPI, LibreTranslate) are stored strictly inside `chrome.storage.local`. They are never synced to Google accounts and never exposed to webpage content scripts.
2. **Explicit Context Transmission:** Surrounding webpage sentences are extracted only as a transient local suggestion. Context is never transmitted to remote AI servers during standard lookups—only when you explicitly click a contextual action button.
3. **No Telemetry or Tracking:** Zero analytics tracking, zero telemetry beacons, and zero third-party tracking scripts.
4. **Transient Cache:** Lookup enrichment caching is strictly bounded (TTL: 10 minutes, max 20 entries) in session memory and cleared upon browser restart.
5. **No Audio Blobs Cached:** Audio streams play dynamically without leaving persistent cached recordings on your disk.

---

## Value Across Learning & Professional Roles

### For English Learners (ESL / EFL)
Master subtle word choices, overcome preposition confusion, hear authentic pronunciation variants, score your spoken pronunciation, and explore root word families.

### For Students and Academic Researchers
Read dense scholarly papers, complex literature, and foreign research without losing your place. Use Sentence Breakdown to parse intricate nested clauses.

### For Bilingual Professionals & Developers
Clarify technical terminology, verify formal business register, review idiomatic expressions, and draft precise international communications.

### For Educators and Tutors
Demonstrate pronunciation, morphological word formation, grammatical register, and sentence parsing using a single clean, distraction-free reading studio.

---

## The Product Promise

Dictionary bridges the gap between quick definitions and deep language comprehension:

> **Look up the word. Hear it. Translate it. Practice speaking it. Understand its context. Learn its grammar and nuance. Keep reading.**

Install Dictionary today, connect your preferred dictionary and AI services, and experience a smarter, frictionless way to master the English language.
