# Providers Specification

This document provides the complete technical specification for all external and browser-backed service integrations across **Dictionary**. It defines normalized data models, error-handling semantics, fallback pipelines, lazy enrichment coordination, and protocol routing in the React 18 + TypeScript runtime.

---

## 1. Common Normalized Result Contracts

All dictionary, translation, and AI providers produce or normalize into canonical TypeScript models (`src/types/index.ts`):

```typescript
export interface DictionaryEntry {
  word: string;
  phonetic?: string;
  phonetics?: Phonetic[];
  pronunciations?: Phonetic[];
  meanings: Meaning[];
  examples?: AttributedItem[];
  synonyms?: AttributedItem[];
  antonyms?: AttributedItem[];
  sourceUrl?: string;
  lexicalProfile?: LexicalProfile;
  subtitle?: string;
  sourceBadges?: SourceBadge[];
  providerId?: string;
  translation?: TranslationResult;
  originalText?: string;
  phraseExplanation?: PhraseExplanationSection[];
  syllables?: string;
  enriched?: boolean;
  revision?: number;
}

export interface Phonetic {
  text?: string;
  audio?: string;
  audioUrl?: string;
  phonetic?: string;
  language?: string;
  label?: string;
  region?: 'uk' | 'us' | 'all';
  fallbackOnly?: boolean;
}

export interface Meaning {
  partOfSpeech: string;
  definitions: Definition[];
  synonyms?: string[];
  antonyms?: string[];
  source?: string;
}

export interface Definition {
  definition: string;
  example?: string;
  synonyms?: string[];
  antonyms?: string[];
  source?: string;
}

export interface TranslationResult {
  translatedText: string;
  detectedLanguage?: string;
  targetLanguage?: string;
  sourceBadges?: SourceBadge[];
}

export interface AiResult {
  type: string;
  query: string;
  summary?: string;
  translation?: string;
  structure?: SentenceStructureItem[];
  lexicalProfile?: LexicalProfile;
  phrases?: AiPhraseItem[];
  comparison?: {
    coreDistinction?: string;
    rows?: AiComparisonRow[];
    leftTerm?: string;
    rightTerm?: string;
  };
}
```

---

## 2. Dictionary & Translation Providers

The dictionary provider facade (`src/providers/provider.index.ts`) routes requests across definition, lexical-enrichment, and translation adapters. All dictionary backends are keyless. Remaining sources always run in Phase B enrichment after the primary result paints.

| Provider ID | Provider Module | Authentication | Description |
|---|---|---|---|
| `free_dictionary` | `provider.free-dictionary.ts` | None (`api.dictionaryapi.dev`) | Definitions, examples, synonyms/antonyms, US/UK audio MP3s, and phonetic transcriptions. Default primary provider. |
| `wiktionary` | `provider.wiktionary.ts` | None (`en.wiktionary.org`) | Multi-sense English definitions, examples, and etymological glosses. |
| `datamuse` | `provider.datamuse.ts` | None (`api.datamuse.com`) | WordNet-style definitions, synonyms, antonyms, and collocations. |
| `rhymebrain` | `provider.rhymebrain.ts` | None (`rhymebrain.com`) | IPA transcription and pronunciation. Enrichment-only. |
| `wikipedia` | `provider.wikipedia.ts` | None (`en.wikipedia.org`) | Encyclopedic summary for terms, names, and concepts. |
| `urban_dictionary` | `provider.urban-dictionary.ts` | None (`api.urbandictionary.com`) | Ranked slang/idiom definitions (top thumbs-up). |
| `google_translate` | `provider.google-translate.ts` | None (`translate.googleapis.com`) | Instant Google Translate neural translation & multi-language definitions. |
| `mymemory` | `provider.mymemory.ts` | None (`api.mymemory.translated.net`) | Keyless translation provider and automatic fallback if Google/Libre fail. |
| `libre_translate` | `provider.libre-translate.ts` | `libreTranslateApiKey` (`libretranslate.com` or self-hosted) | Privacy-focused translation service with custom base URL. |

> **Note on Removed Providers:** Legacy commercial dictionary APIs (`merriam_webster`, `wordnik`, `words_api`, `conceptnet`) have been removed from the extension to eliminate unnecessary third-party API keys and ensure all dictionary lookups work immediately out of the box.

---

## 3. Generative AI Provider & Offline Engine (`src/providers/provider.gemini-ai.ts`)

The AI subsystem operates in dual modes:

1. **Google Gemini AI API Mode (`generativelanguage.googleapis.com`):**
   - Activated when an API key is saved (`aiApiKey`).
   - Uses `gemini-3.5-flash-lite` (the single curated, high-performance Gemini model across the application) or OpenAI-compatible custom models.
   - Encloses user text in structured prompts for the 7 AI intents.
2. **Offline Rule-Based Grammar Analysis Engine:**
   - Activated automatically when no API key is configured (`hasAiApiKey` is `false`).
   - Analyzes clauses, part-of-speech structure, and grammar patterns locally on your device without sending any network requests.

### The 7 User-Facing AI Intents & 1 Background Intent (`src/types/index.ts`)

| Intent ID | Toolbar Label | Icon | Description | Output Format |
|---|---|---|---|---|
| `default` | **Main AI** | 📖 | Oxford Learner-style definition, numbered **Senses & Meanings**, sense-aware translation glosses, usage notes, bilingual examples, and collapsible etymology. | Structured Markdown |
| `explain_in_context` | **Context Explain** | 🔍 | Pinpoints exact in-sentence meaning, direct grammatical substitutions, and nuance-lost notes. | Structured Markdown |
| `grammar` | **Grammar & Nuance** | 📐 | Analyzes syntactic slots, grammatical dependencies, formality register, and surfaces a Common Learner Mistakes card. | Markdown + Learner Mistakes Card |
| `collocations` | **Phrase & Collocations** | 💡 | Core idiom meaning, preposition patterns, and categorized collocations. | Markdown + Collocations Card |
| `sentence_breakdown` | **Sentence Breakdown** | 🧩 | Clause-by-clause structural decomposition into clauses, roles, and clickable phrase chips. | Structured JSON (`structure` + `phrases`) |
| `confusables` | **Compare Confusables** | ⚖️ | Side-by-side distinction, comparison matrix, collocation divergence, and minimal-pair sentences. | Structured Markdown |
| `rephrase` | **Rephrase** | ✨ | Three stylistic rewrites (Simplified, Academic & Formal, Native Idiomatic) with explanations. | Structured Markdown |
| `phrase_fallback` | *(Automatic)* | — | Multi-word phrase explanation invoked automatically when no dictionary backend has definitions. | Concise Markdown |

---

## 4. Audio & Voice Control Subsystem (`src/composables/composable.dictionary.ts`)

### Reactive Audio Management
- **State:** Reactive `isAudioPlayingRef` (`signal<boolean>`) and `playingKeyRef` (`signal<string | null>`).
- **Global Control:** `stopAllAudio()` instantly cancels `window.speechSynthesis` and pauses/destroys any active `HTMLAudioElement`.
- **Playback Pipeline (`playAudio`):**
  1. High-quality dictionary MP3 recordings (`audioUrl`).
  2. Free Google Translate audio synthesis fallback (`getFreeTtsUrl`).
  3. Browser Web Speech Synthesis (`speakTTS`).
- **Speech Practice Engine (`startSpeechPractice`):**
  - Captures microphone speech with `webkitSpeechRecognition`.
  - Normalizes and compares input using Levenshtein distance metrics.
  - Emits real-time grade badges (`excellent`, `good`, `almost`, `retry`).
- **Global UI Button:** Prominent red button (`⏹️ STOP VOICE` / `🔇`) in `AppHeader` for 1-click speech cancellation.
- **Keyboard Shortcut:** `Esc` key cancels active speech playback immediately.

---

## 5. Fallback, Timeouts, and Protocol Routing

### Dictionary fallback
Primary lookup uses the configured `dictionaryProvider` (`free_dictionary` by default). Remaining keyless backends run after first paint in concurrent batches of 2:

```text
free_dictionary ➔ wiktionary ➔ datamuse ➔ rhymebrain ➔ wikipedia ➔ urban_dictionary
```

`NotFoundError` and transient network/5xx/429/timeout continue to the next provider. Dictionary HTTP timeout is 6s.

### Translation fallback
`lookupTranslationResult()` tries the configured `translateProvider` first (`google`, `libretranslate`, or `mymemory`). If the primary is Google or LibreTranslate and it fails, MyMemory is attempted automatically. Translation HTTP timeout is 8s.

### AI protocol routing
- **Native Gemini REST:** When `aiBaseUrl` includes `generativelanguage.googleapis.com` (or is empty), `fetchAiAnalysis` calls `models/{model}:generateContent` with `gemini-3.5-flash-lite`.
- **OpenAI-compatible:** Any other base URL is treated as `/chat/completions` with `Bearer` authentication (Ollama, OpenRouter, Groq, OpenAI, LocalAI).
- Transient Gemini 429/500/503 errors retry once with backoff before failing.
- When no API key is configured, the offline rule-based grammar engine returns a local `AiResult` instead of calling the network.
