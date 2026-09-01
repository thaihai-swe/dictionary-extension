# Project Roadmap

This document tracks shipped capabilities, near-term product work, and longer-term research. Items move from **Ideas** to **Planned** only when they have a clear user problem and a feasible extension-architecture path.

---

## Recently Shipped

### Lookup Engine
- Integrated keyless dictionary backends: `free_dictionary`, `wiktionary`, `datamuse`, `rhymebrain`, `wikipedia`, `urban_dictionary`, `google_translate`
- React 18 + TypeScript architecture with Vite 5 bundler under `src/entrypoints/`
- Parallel neural translation with Google Translate and LibreTranslate
- Offline Rule-Based Grammar Analysis Engine fallback when no Gemini API key is configured

### Pronunciation & Voice Control
- Remote dictionary audio with Web Speech synthesis fallback
- Configurable playback rate (`0.5`–`1.5`) and preferred speech voice
- **Global Stop Voice Button** (`⏹️ Stop Voice` / `🔇`) in AppHeader for 1-click speech cancellation
- Speech Practice Evaluator with Levenshtein scoring and grade badges

### Contextual AI
- Seven complementary AI actions: Main AI, Context Explain, Grammar & Nuance, Phrase & Collocations, Sentence Breakdown, Compare Confusables, Rephrase
- Structured sense disambiguation matrix with context relevance indicators
- Context differential analysis (direct substitutions & nuance loss)
- Syntactic slot parsing with grammatical dependency roles
- Live preload progress indicator dots on action buttons and interactive tokenized context chips
- Dual-mode context extraction: exact DOM Range offset vs ranked page-candidate search
- Editable Context field with session-only memory and visible **Context used** confirmation
- Prompt sandboxing (`<target>`, `<context>`, `<target-language>`) and parse-time section-kind normalization
- Schema v9 built-in prompt upgrades (custom templates are never overwritten)

### Lexical Profile
- Word Family chips (noun, verb, adjective, adverb, inflections, derivatives)
- Word Formation (prefixes, suffixes, explanation)
- Usage/register warnings, confusable pairs, common learner mistakes, and categorized collocations
- Provider-first extraction with AI `<lexical-profile>` JSON fallback

### Privacy, Storage & UX
- Zero-leak secret isolation: API keys live only in `chrome.storage.local` and never enter content scripts or the toolbar popup
- Granular origin permission requests for custom AI endpoints and self-hosted LibreTranslate
- Sanitized settings export/import (secrets omitted on export, ignored on import)
- Tab-scoped request cancellation on popup dismissal
- Calm Learning Studio surfaces: system/light/dark themes, editorial vs learner fonts, resizable cards, reduced-motion support
- Per-site pause for in-page triggers (`pausedHostnames`)
- Keyboard command `lookup-selection` (suggested Alt+L)
- AI off on fresh installs; phrase fallback is its own setting
- Primary dictionary chain skips unconfigured providers and continues on transient errors
- Content scripts inject in the top frame; same-origin iframes inject on selection
- Phase 2 enrichment waits ~300ms so a dismissed card can cancel it

## Planned Short Term

Focused, incremental product controls that fit the current MV3 architecture:

- Capture selected sentence, page title, URL, and PDF page metadata with saved vocabulary

---

## Planned Mid Term

Larger learning-workflow features that require new storage and review models:

- Built-in flashcard review and spaced-repetition scheduling
- AnkiConnect integration with configurable card fields
- Stronger popup positioning on constrained or rapidly changing viewports
- Richer provider validation reporting (quota, latency history, last error)
- Document-level vocabulary lists and reading progress

---

## Planned Long Term

Research-scale capabilities that depend on media APIs, persistent learner data, or optional sync:

- YouTube subtitle lookup, sentence capture, timestamp replay, and vocabulary mining
- Optional user-controlled immersion mode
- Audio/screenshot sentence cards for media learning
- Advanced FSRS review scheduling and pronunciation recall exercises
- Optional local-first sync or self-hosted vocabulary storage

---

## Ideas Under Consideration

Not committed. Evaluate only if a clear learner problem remains after short-term work:

- Multiple configuration profiles (work vs study vs teaching)
- Deeper theme customization beyond system/light/dark and editorial/learner fonts
- Learner decks with mastery states (`new`, `learning`, `familiar`, `mastered`, `ignored`)

---

## Quality Follow-Ups

Keep these checks in the manual verification loop (`docs/development.md`):

- Preserve stale-response UI protection. True provider abort remains limited because `chrome.runtime.sendMessage` cannot transport `AbortSignal`; tab-scoped `AbortController` already cancels in-flight fetches in the service worker.
- Run telemetry-free performance checks for cache hits, duplicate requests, lazy enrichment latency, and partial provider failures.
- Confirm `sourceBadges` stay accurate when a provider returns duplicate content but a successful response.
- Recheck pronunciation behavior for words with audio but no IPA in the primary provider.
- Confirm Schema v8 prompt migrations never overwrite customized templates.
