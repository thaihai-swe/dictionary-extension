# Dictionary Documentation

Welcome to the comprehensive documentation for **Dictionary**, a lightweight, zero-dependency Chrome Manifest V3 extension engineered for deep reading comprehension, multi-source dictionary lookup, neural translation, pronunciation practice, and contextual AI language learning.

---

## Documentation Index

### 1. User & Product Guides
- [**User Guide**](user-guide.md) — Complete user manual covering installation, toolbar workflows, in-page selection triggers, pronunciation practice, Lexical Profile exploration, and all 5 contextual AI actions.
- [**Sales & Product Guide**](sales.md) — Product narrative, key differentiators, learner benefits, competitive feature matrix, and privacy-first architecture.
- [**Settings Reference**](settings.md) — Exhaustive configuration manual detailing appearance tokens, trigger modes, dictionary providers, translation services, AI prompt customization, and import/export schemas.
- [**Troubleshooting Guide**](troubleshooting.md) — Actionable diagnostic guide for extension reload cycles, provider connectivity, microphone/audio practice permissions, PDF text layer quirks, and host access rules.

### 2. Architecture & Technical Specifications
- [**Architecture Overview**](architecture.md) — Core architectural blueprints, decoupled execution layers, progressive lazy enrichment lifecycle, tab-scoped cancellation, and storage security boundaries.
- [**Providers Specification**](providers.md) — Normalized provider contracts, API integration models, fallback sequences, and schema definitions for Dictionary (5 providers), Translation (2 providers), AI generation (Gemini native & OpenAI-compatible), and Pronunciation.
- [**Context & Sentence Extraction**](context-extraction.md) — Deep dive into dual-mode context retrieval: Mode 1 exact DOM Range offset slicing vs. Mode 2 multi-factor ranked page candidate scanning.

### 3. Engineering & Contribution
- [**Development Guide**](development.md) — Local unpacked installation, design tokens, coding conventions, adding providers, and a 50+ step manual quality verification matrix.
- [**Project Roadmap**](roadmap.md) — Track shipped milestones, short-term enhancements, mid-term feature targets (AnkiConnect, spaced repetition), and long-term research directions.

---

## Quick Reference: Core System Architecture

```text
┌────────────────────────────────────────────────────────────────────────┐
│                              User Action                               │
│        (In-page selection, hotkey, context menu, or toolbar query)     │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   Background Service Worker Router                     │
│               (Tab-scoped AbortController & Request IDs)               │
└───────────────────┬────────────────────────────────┬───────────────────┘
                    │                                │
        [Dictionary & Translation]                   │ [AI Generation]
                    │                                │
                    ▼                                ▼
┌────────────────────────────────────────┐ ┌─────────────────────────────┐
│      Phase 1: Fast Primary Lookup      │ │    AI Multi-Intent Engine   │
│  - Free Dictionary / MW / Wiktionary   │ │  - Gemini native / OpenAI-cb │
│  - Parallel Neural Translation         │ │  - Context / Grammar / Cards │
│  - Smart Lemmatization & Phrasal Stem  │ │  - Structured Lexical Block │
│  - Immediate UI render (sub-second)    │ └──────────────┬──────────────┘
└───────────────────┬────────────────────┘                │
                    │                                     │
                    ▼                                     │
┌────────────────────────────────────────┐                │
│    Phase 2: Lazy Enrichment Worker     │                │
│  - Concurrency batching (N=2)          │                │
│  - Secondary dictionary backends       │                │
│  - Merges syns/ants, examples, IPA     │                │
│  - L1 (Memory) + L2 (Session) Cache    │                │
│  - Incremental UI update (revision: 1) │                │
└───────────────────┬────────────────────┘                │
                    │                                     │
                    └──────────────────┬──────────────────┘
                                       │
                                       ▼
┌────────────────────────────────────────────────────────────────────────┐
│                     Shared Calm Learning Studio UI                     │
│  • Editorial / Learner typography (Atkinson Hyperlegible)              │
│  • Source attribution badges (multi-provider transparency)             │
│  • Pronunciation player & Speech Practice evaluator (Levenshtein)      │
│  • Interactive Lexical Profile (Word family chips & Collocation cards) │
└────────────────────────────────────────────────────────────────────────┘
```

---

## Key Feature Matrix

| Feature Domain | Capabilities & Specifications | Documentation Guide |
|---|---|---|
| **Multi-Source Dictionary** | 5 integrated backends (`free_dictionary`, `wiktionary`, `merriam_webster`, `wordnik`, `words_api`) with progressive fallback. Lookups use the selected text as-is. | [Providers](providers.md), [User Guide](user-guide.md) |
| **Lazy Enrichment** | Non-blocking secondary query batches (`concurrency: 2`), cumulative definition merging, IPA phonetic backfilling, and 2-level caching (Memory + Session storage). | [Architecture](architecture.md), [Providers](providers.md) |
| **Neural Translation** | Parallel translation with Google Translate or self-hosted LibreTranslate; dynamic dropdown with custom language definitions. | [Settings](settings.md), [Providers](providers.md) |
| **Pronunciation & Practice** | High-quality dictionary MP3s + Web Speech fallback, adjustable speed (0.5x–1.5x), animated visual equalizer, and microphone Speech Practice Evaluator with Levenshtein scoring. | [User Guide](user-guide.md), [Providers](providers.md) |
| **Context Extraction** | Dual-mode retrieval: Exact DOM Range character offset measurement (Mode 1) and ranked page candidate search (Mode 2) with soft-hyphen healing. | [Context Extraction](context-extraction.md) |
| **Contextual AI Actions** | 5 specialized intents: Main AI, Context Explain, Grammar & Nuance, Phrase & Collocations, and Sentence Breakdown (JSON structure). | [User Guide](user-guide.md), [Settings](settings.md) |
| **Structured Lexical Profile** | Interactive Word Family chips, Word Formation tags, Usage/Register warnings, Confusable pairs, Common Learner Mistakes, and categorized Collocations. | [User Guide](user-guide.md), [Architecture](architecture.md) |
| **Zero-Leak Security** | Isolated secret storage (`chrome.storage.local`), public sync preferences (`chrome.storage.sync`), sanitized settings import/export, and granular origin permissions. | [Settings](settings.md), [Architecture](architecture.md) |
