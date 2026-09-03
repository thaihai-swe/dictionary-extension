# Providers Specification

This document provides the complete technical specification for all external and browser-backed service integrations across **Dictionary**. It defines normalized data models, error-handling semantics, fallback pipelines, lazy enrichment coordination, and protocol routing.

---

## 1. Common Normalized Result Contract

All dictionary, translation, and AI providers must produce or normalize into the canonical result model consumed by the shared Calm Learning Studio renderer (`src/ui/renderer.js`):

```typescript
interface NormalizedLookupResult {
  title: string;
  subtitle?: string;
  providerId?: string;
  sourceBadges?: Array<{
    label: string;
    kind: "dictionary" | "translation" | "ai" | string;
    providerId?: string;
  }>;
  lexicalProfile?: LexicalProfile;
  sections: Array<{
    title?: string;
    kind?: SectionKind;
    text?: string;
    items?: string[];
    meta?: string;
    markdown?: boolean;
    data?: any;
  }>;
  presentation?: {
    surface: "ai" | "dictionary";
    intent: "default" | "explain_in_context" | "grammar" | "phrase_fallback" | "phrase_explorer" | "sentence_breakdown";
  };
  pronunciation?: Pronunciation;
  pronunciations?: Pronunciation[];
}

interface Pronunciation {
  text?: string;
  phonetic?: string;
  audioUrl?: string;
  language?: string;
  label?: string;
  fallbackOnly?: boolean;
}

type SectionKind =
  | "definitions"
  | "examples"
  | "synonyms"
  | "antonyms"
  | "translation"
  | "context"
  | "intro"
  | "usage"
  | "grammar"
  | "phrase"
  | "sentence-overview"
  | "sentence-structure"
  | "phrase-parsing"
  | "etymology"
  | "lexical"
  | "ai";
```

---

# Providers Specification

This document provides the technical specification for all external service integrations across **Dictionary** in React 18 and TypeScript.

---

## 1. Dictionary & Translation Providers

The dictionary provider facade (`src/providers/provider.index.ts`) routes requests across definition, lexical-enrichment, and translation adapters. All dictionary backends are keyless. Remaining sources always run in Phase B enrichment after the primary result paints.

| Provider ID | Provider Module | Authentication | Description |
|---|---|---|---|
| `free_dictionary` | `provider.free-dictionary.ts` | None (`api.dictionaryapi.dev`) | Definitions, examples, synonyms/antonyms, US/UK audio MP3s, and phonetic transcriptions. |
| `wiktionary` | `provider.wiktionary.ts` | None (`en.wiktionary.org`) | Multi-sense English definitions, examples, and etymological glosses. |
| `datamuse` | `provider.datamuse.ts` | None (`api.datamuse.com`) | WordNet-style definitions, synonyms, antonyms, and collocations. |
| `rhymebrain` | `provider.rhymebrain.ts` | None (`rhymebrain.com`) | IPA transcription and pronunciation. Enrichment-only. |
| `wikipedia` | `provider.wikipedia.ts` | None (`en.wikipedia.org`) | Encyclopedic summary for terms, names, and concepts. |
| `urban_dictionary` | `provider.urban-dictionary.ts` | None (`api.urbandictionary.com`) | Ranked slang/idiom definitions (top thumbs-up). |
| `google_translate` | `provider.google-translate.ts` | None (`translate.googleapis.com`) | Instant Google Translate fallback & multi-language definitions. |
| `mymemory` | `provider.mymemory.ts` | None (`api.mymemory.translated.net`) | Keyless translation provider and automatic fallback if Google/Libre fail. |
| `libre_translate` | `provider.libre-translate.ts` | `libreTranslateApiKey` (`libretranslate.com`) | Privacy-focused translation service with custom base URL. |

---

## 2. Generative AI Provider & Offline Engine (`src/providers/provider.gemini-ai.ts`)

The AI subsystem operates in dual modes:

1. **Google Gemini AI API Mode (`generativelanguage.googleapis.com`):**
   - Activated when an API key is saved (`aiApiKey`).
   - Uses models such as `gemini-3.5-flash-lite` or custom models.
   - Encloses user text in structured prompts for the 6 AI intents.

2. **Offline Rule-Based Grammar Analysis Engine:**
   - Activated automatically when no API key is set (`hasApiKey` is `false`).
   - Analyzes clauses, part-of-speech structure, and grammar patterns locally.

### The 6 AI Intents (`src/types/index.ts`)

| Intent ID | Label | Description | Output Format |
|---|---|---|---|
| `explain_in_context` | **Explain in Context** | In-sentence meaning, substitutions, and nuance lost if replaced | Structured Markdown |
| `grammar` | **Grammar & Nuance** | Syntactic analysis, pattern rules, and common learner mistakes | Markdown + Learner Mistakes Card |
| `collocations` | **Phrase & Collocations** | Idiom meaning, preposition patterns, and natural word pairings | Markdown + Collocations Card |
| `sentence_breakdown` | **Sentence Breakdown** | Clause-by-clause structural breakdown | Clause Structure Card + Translation |
| `confusables` | **Compare Confusables** | Comparison with easily confused words | Structured Markdown |
| `rephrase` | **Rephrase & Styles** | Alternate phrasing in different registers | Structured Markdown |

---

## 3. Audio & Voice Control Subsystem (`src/composables/composable.dictionary.ts`)

### Reactive Audio Management
- **State:** Reactive `isAudioPlaying` (`ref<boolean>`).
- **Global Control:** `stopAllAudio()` cancels `window.speechSynthesis` and pauses any active `HTMLAudioElement`.
- **Playback Handlers:**
  - `playAudio(audioUrl, fallbackWord, accent)`: Plays dictionary MP3 recordings with Web Speech fallback.
  - `speakTTS(text, accent)`: SpeechSynthesisUtterance engine with custom rate (`pronunciationRate`), voice (`pronunciationVoiceURI`), and language (`en-US` / `en-GB`).
  - Automatic event listeners (`onstart`, `onended`, `onerror`, `onpause`) keep `isAudioPlaying` synchronized.
- **Global UI Button:** Prominent red pulsing button (`⏹️ STOP VOICE` / `🔇`) rendered in `AppHeader` for 1-click audio cancellation.
- **Keyboard Shortcut:** `Esc` key cancels active speech playback immediately.
