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
  lemmaFallback?: {
    originalText: string;
    lemma: string;
  };
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

## 2. Multi-Source Dictionary Provider Subsystem

The dictionary facade (`src/providers/dictionary.js`) routes requests across 5 registered adapters:

| Provider ID | Service Name | Authentication | Features & Supported Data |
|---|---|---|---|
| `free_dictionary` | **Free Dictionary API (Default)** | None (`dictionaryapi.dev`) | Definitions, examples, synonyms/antonyms, US/UK audio MP3s, and phonetic transcriptions. |
| `wiktionary` | **Wiktionary REST API** | None (`en.wiktionary.org`) | Multi-sense English definitions, examples, and etymological glosses. |
| `merriam_webster` | **Merriam-Webster Collegiate API** | `dictionaryApiKey` (`dictionaryapi.com`) | Official collegiate definitions, short examples, and high-fidelity audio recordings. |
| `wordnik` | **Wordnik API** | `wordnikApiKey` (`api.wordnik.com`) | Multi-source definitions (American Heritage, Century, WordNet), corpus examples, audio, and related words. |
| `words_api` | **WordsAPI (RapidAPI)** | `wordsApiKey` (`wordsapiv1.p.rapidapi.com`) | Deep definitions, frequency scores, syllable structures, derivations, and synonyms. |

---

### Phase 1: Fast Primary Lookup & Fallback Sequence

```text
User Query: "taking care of"
       │
       ▼
1. Primary Provider: free_dictionary (exact query)
   └─ NotFoundError ──► Try Wiktionary ──► Try Merriam-Webster ──► Try Wordnik ──► Try WordsAPI
                             │
                             ▼ (All exact lookups return NotFoundError)
2. Smart English Lemmatization (getEnglishLemmaCandidates)
   - Evaluates stems: irregular verbs, plurals, comparative adjectives, suffixes (-ing, -ed, -es, -ly)
   └─ NotFoundError across all providers
                             │
                             ▼
3. Smart Phrasal Canonicalization (getEnglishPhraseCandidates)
   - Canonicalizes "taking care of" ➔ "take care of"
   - Retries fallback chain: free_dictionary("take care of") ➔ SUCCESS!
                             │
                             ▼
4. Attach metadata:
   - lemmaFallback: { originalText: "taking care of", lemma: "take care of" }
   - subtitle: "Showing definitions for phrase: take care of"
   - Immediate Phase 1 render to UI (revision: 0, enriched: false)
```

#### Operational Error Boundary
If an adapter encounters an operational failure (invalid API credentials, network timeout, rate limit 429, or server 500 error), the fallback chain aborts immediately and surfaces an actionable diagnostic error to the user rather than silently masking the failure.

---

### Phase 2: Asynchronous Lazy Dictionary Enrichment

Immediately after Phase 1 delivers the initial result, the background service worker initiates non-blocking secondary enrichment:

1. **AI Phrase Fallback (Multi-word Lookups):** If the query is classified as a phrase/idiom, lacks dictionary definitions, and `enableAI` is active, `lookupAiProvider(..., { intent: "phrase_fallback" })` is scheduled first.
2. **Provider Key Filtering:** Unconfigured key-backed providers are skipped without network overhead.
3. **Concurrency Batching (`ENRICHMENT_CONCURRENCY = 2`):** Remaining providers are queried in batches of 2.
4. **Cumulative Section Merging:**
   - Definitions and examples are matched by normalized kind/part-of-speech and deduplicated.
   - Enforces strict popup readability bounds:
     - `MAX_DEFINITIONS_SECTIONS = 2`
     - `MAX_EXAMPLES_SECTIONS = 2`
     - `MAX_SYNONYM_SECTIONS = 1`
     - `MAX_ANTONYM_SECTIONS = 1`
     - `MAX_ITEMS_PER_SECTION = 8`
5. **Phonetic IPA Backfill:** If the primary result had audio but lacked IPA, secondary providers backfill phonetic transcriptions onto matching language/accent slots (`en-US`, `en-GB`). Phonetic entries are sorted first (`preferPhoneticPronunciations`, clamped to `MAX_PRONUNCIATIONS = 4`).
6. **Transparent Source Badges:** Contributing providers are added to `sourceBadges` for complete attribution.
7. **Broadcast:** Dispatches `LOOKUP_UPDATE` (`revision: 1`, `enriched: true`) to the originating tab.

---

### Two-Level Caching Engine

```text
LOOKUP Request
      │
      ▼
Check L1 In-Memory Map (Max 20 entries, TTL: 10 minutes)
  ├─ Hit  ──► Hydrate and return cached enrichment immediately
  └─ Miss ──► Check L2 Storage Cache
                │
                ▼
Check L2 Session Storage (chrome.storage.session with "enrich_" prefix)
  ├─ Hit  ──► Hydrate L1 Map and return cached result
  └─ Miss ──► Check in-flight Promise Map (enrichmentInFlight)
                ├─ In-flight ──► Attach to active Promise
                └─ Fresh ────► Execute runDictionaryEnrichment()
                                 │
                                 ▼
                     Write to L1 Map & L2 Session Storage
```

- **Cache Invalidation:** Any preference changes in Settings trigger `clearEnrichmentSessionCache()`.
- **Cache Schema Migration:** `migrateEnrichmentCacheSchema()` tracks `ENRICHMENT_CACHE_SCHEMA_VERSION = 2` to purge obsolete cache shapes on extension updates.

---

## 3. Translation Provider Subsystem

The translation facade (`src/providers/translate.js`) runs in parallel with dictionary lookups:

| Provider ID | Backend Service | Configuration Requirements | Validation Support |
|---|---|---|---|
| `google` | **Google Translate** | None (public endpoint `translate.googleapis.com`) | Built-in non-destructive ping |
| `libretranslate` | **LibreTranslate** | `libreTranslateBaseUrl`, optional `libreTranslateApiKey` | Non-destructive translation test |

### Normalized Translation Contract
```typescript
interface NormalizedTranslationResult {
  title: string;
  subtitle: string; // e.g. "Detected: Vietnamese → English"
  translatedText: string;
  detectedLanguage: string;
  targetLanguage: string;
  sourceBadges: Array<{ label: string; kind: "translation" }>;
  sections: Array<{ title: "Original"; text: string }>;
  providerId: string;
}
```

---

## 4. Generative AI Provider Subsystem

The AI subsystem (`src/providers/ai-provider.js`) interfaces with generative endpoints through a dual-protocol architecture:

### Protocol Routing

1. **Google Gemini Native REST Endpoint:**
   - Activated when `aiBaseUrl` matches `generativelanguage.googleapis.com`.
   - Directly invokes `/v1beta/models/<model>:generateContent?key=<aiApiKey>`.
2. **OpenAI-Compatible Chat Endpoint:**
   - Activated for all other URLs (OpenAI, Groq, Ollama, OpenRouter, LocalAI).
   - Invokes `<aiBaseUrl>/chat/completions` with `Authorization: Bearer <aiApiKey>` headers.

---

### The 6 AI Intents

| Intent | UI Action | Output Model | Lexical Profile Extraction |
|---|---|---|---|
| `default` | **Main AI Explanation** | Structured Markdown (`###` sections) | **Yes** |
| `explain_in_context` | **Context Explain** | Focused In-Context Markdown | No |
| `grammar` | **Grammar & Nuance** | Syntactic & Tone Analysis Markdown | **Yes** |
| `phrase_explorer` | **Phrase & Collocations** | Idiom & Preposition Markdown | **Yes** |
| `sentence_breakdown` | **Sentence Breakdown** | Pure Structural JSON | No |
| `phrase_fallback` | **Dictionary Phrase Fallback** | Concise Meaning Markdown | No |

---

### Parse-Time AI Section Normalization & Sandboxing

1. **Prompt Sandboxing:** Outbound prompts enclose user text in `<target>`, `<context>`, and `<target-language>` XML tags.
2. **Markdown Normalization:** Strips stray code fences, converts bold labels to `###` headings, and splits text into titled `sections[]`.
3. **Intent Outline Alignment (`kindForAiSection`):** Maps headings to canonical semantic `kind` tokens (`intro`, `translation`, `usage`, `examples`, `grammar`, `etymology`, `phrase`).
4. **Structured Sentence Breakdown Normalization:**
   - Extracts and validates JSON using `extractJsonObject` and `normalizeSentenceBreakdown`.
   - Emits structured clauses (`structureComponents`) and phrase chips (`phraseParsing`).
5. **Lexical Profile Extraction:**
   - Extracts `<lexical-profile>` JSON blocks via `parseLexicalProfileFromResponse`.
   - Strips the raw JSON block from visible Markdown.
   - Enforces strict bounds:
     - `MAX_LEXICAL_ITEMS = 12`
     - `MAX_DERIVATIVES = 12`
     - `MAX_LEXICAL_WARNINGS = 8`
     - `MAX_CONFUSABLE_PAIRS = 6`
     - `MAX_LEARNER_MISTAKES = 6`
     - `MAX_FORMATION_ITEMS = 6`
     - `MAX_COLLOCATION_ITEMS_PER_GROUP = 10`

---

## 5. Pronunciation & Speech Practice Subsystem

### Audio Playback Hierarchy (`src/ui/audio.js`)

1. **Remote Audio:** Plays provider-returned MP3/WAV URLs.
2. **Web Speech Synthesis Fallback:** If remote audio is missing or fails, calls `window.speechSynthesis.speak()`.
3. **Playback Parameters:** Applies user-configured `pronunciationRate` (`0.5`–`1.5`) and `pronunciationVoiceURI`.
4. **Equalizer Animation:** Visual 3-bar equalizer wave animates strictly while audio is actively playing.
5. **Zero Memory Caching:** Audio blobs and binary metadata are never cached to prevent memory bloat.

### Speech Practice Evaluator

1. Listens via Chrome's `SpeechRecognition` / `webkitSpeechRecognition`.
2. Normalizes spoken transcript and target query.
3. Calculates similarity using Levenshtein distance string matching:
   $$\text{Score} = \left(1 - \frac{\text{LevenshteinDistance}(\text{target}, \text{spoken})}{\max(\text{len}(\text{target}), \text{len}(\text{spoken}))}\right) \times 100$$
4. Assigns standardized grade badges:
   - `90%–100%`: **Excellent** (emerald)
   - `70%–89%`: **Good** (teal)
   - `50%–69%`: **Almost there** (amber)
   - `<50%`: **Try again** (rose)
5. Active practice scores survive Phase 2 lazy enrichment re-renders via `audio.restorePracticeResult()`.
