# Sales & Product Guide

**Dictionary** is a Chrome Manifest V3 reading companion for learners, students, and professionals who need definitions, translations, pronunciation, and contextual AI without leaving the page they are reading.

This document is a product narrative. Runtime contracts live in [Architecture](architecture.md), [Providers](providers.md), and [Settings](settings.md).

---

## Who It Is For

- **Language learners** who need exact-form lookups, collocations, and bilingual examples while reading authentic material.
- **Students and researchers** who highlight academic or technical text and want context-aware explanations, grammar analysis, and sentence breakdowns.
- **Professionals** who need a quiet, fast lookup card that stays on the page and does not send API keys through webpage scripts.

---

## Product Promise

Look up a word or phrase in place. Hear it. Practice saying it. Translate it. Ask AI what it means *in this sentence*. Keep credentials off the webpage.

The UI is the **Calm Learning Studio**: editorial or Atkinson Hyperlegible typography, system/light/dark themes, a resizable in-page card, and a global **Stop Voice** control when audio is playing.

---

## Key Differentiators

### 1. Dual-phase dictionary lookup
Phase 1 returns the primary dictionary result and (when ready) translation in under a second. Phase 2 then enriches remaining keyless backends in concurrent batches of 2, merging extra senses, examples, IPA, and lexical cards without blocking first paint.

### 2. Exact selected text
Lookups use the highlighted or typed query as-is. Inflected forms (`went`, `running`) are not rewritten to a root lemma. Multi-word queries that no dictionary backend defined can still receive a concise **AI Phrase Fallback** when AI is enabled.

### 3. Seven specialized AI intents
The AI tab is not a single chat box. It exposes seven actions:

| Action | Intent | What the learner gets |
|---|---|---|
| Main AI | `default` | Learner-style definition, sense cards, bilingual examples |
| Context Explain | `explain_in_context` | Meaning in *this* sentence, substitutions, nuance lost |
| Grammar & Nuance | `grammar` | Syntactic slot, pattern rules, learner mistakes |
| Phrase & Collocations | `collocations` | Idiom meaning, preposition patterns, collocation cards |
| Sentence Breakdown | `sentence_breakdown` | Clause/role JSON with clickable phrase chips |
| Compare Confusables | `confusables` | Side-by-side distinction matrix |
| Rephrase | `rephrase` | Simplified, academic, and native-idiom rewrites |

Default model: **`gemini-3.5-flash-lite`**. Any OpenAI-compatible endpoint (Ollama, Groq, OpenRouter, OpenAI, LocalAI) works via `aiBaseUrl`.

### 4. Dual-mode sentence context
Mode 1 measures the selection Range offset inside the containing block so the extracted sentence is the one the user highlighted—even when the word appears multiple times. Mode 2 ranks page candidates by visibility, semantic container, and viewport proximity. Context is capped at 800 characters and is never sent during ordinary dictionary lookups.

### 5. Pronunciation you can stop
Dictionary MP3 → Google Translate TTS → Web Speech. A red **Stop Voice** button in the header and the `Esc` key cancel playback. **Practice** grades spoken attempts with Levenshtein similarity.

### 6. Zero-leak credentials
API keys live in `chrome.storage.local`. The content script and public sync payload never receive `aiApiKey`. Schema v12 exposes only `hasAiApiKey` as a boolean.

---

## Feature Snapshot

| Area | What ships today |
|---|---|
| Dictionary | Keyless: Free Dictionary, Wiktionary, Datamuse, Wikipedia, Urban Dictionary, RhymeBrain enrichment |
| Translation | Google Translate (default), LibreTranslate, MyMemory fallback |
| AI | `gemini-3.5-flash-lite` or custom OpenAI-compatible URL; 7 UI intents + phrase fallback |
| Audio | MP3 / Google TTS / SpeechSynthesis; Stop Voice; speech practice |
| Triggers | Floating icon, direct popup, post-selection modifier, context menu, toolbar, paused hostnames |
| Appearance | Dark default, system/light/dark, editorial or learner font, 360–1000 × 380–900 resizable card |
| Privacy | Local secrets, 800-char context cap, opt-out page extraction, sanitized settings export (schema v12) |

---

## Competitive Position (Honest)

Dictionary is not a full spaced-repetition SRS, not an Anki replacement, and not a cloud vocabulary account. It is a **page-native lookup studio**: fast dictionary + translation + pronunciation + contextual AI, with credentials isolated from the webpage.

Where it is strongest:
- In-page reading flow (icon, hotkey, context menu, resizable card).
- Context that is the *selected sentence*, not a page dump.
- Keyless dictionary/translation so a learner can start without API keys.
- AI that is intent-structured rather than a generic chatbot.

Where it is not (yet):
- Cloud sync of saved words, AnkiConnect, or a built-in SRS deck (see [Roadmap](roadmap.md)).

---

## Privacy Talking Points

1. Dictionary and translation lookups do not require an AI key.
2. AI keys never leave `chrome.storage.local` into content-script memory.
3. Surrounding sentences are extracted only for AI actions, clamped to 800 characters, and can be disabled entirely.
4. Settings export omits `SECRET_KEYS`.
5. Restricted Chrome pages (`chrome://`, Web Store) are not injected; the toolbar popup still works for typed queries.

---

## Related Documents

- [User Guide](user-guide.md) — how to use every surface.
- [Architecture](architecture.md) — how the runtime is structured.
- [Settings](settings.md) — every preference and schema v12.
- [Roadmap](roadmap.md) — shipped vs planned.
