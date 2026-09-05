# Provider Data Comparison & Return Capabilities

This document provides a comprehensive technical reference and comparison matrix of all external data providers integrated into **Dictionary Extension**. It details the exact data fields returned, normalized structures, and behavioral characteristics of each provider.

---

## 1. Provider Capabilities Matrix

The table below summarizes what data each provider yields when invoked directly or during multi-phase enrichment:

| Provider | Category | Primary / Enrichment | Definitions | Per-Sense Example (`def.example`) | Top-Level Examples (`examples[]`) | Synonyms & Antonyms | Phonetic IPA | Native Audio (MP3) | Syllables | Collocations & Lexical Profile | Target Translation | Source URL | Auth Required |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **Free Dictionary API** (`free_dictionary`) | English Dictionary | Primary & Enrichment | ✅ Yes (Multi-sense) | ✅ Yes (when available upstream) | ✅ Yes (extracted, max 8) | ✅ Yes (up to 12) | ✅ Yes (US & UK) | ✅ Yes (Human recordings) | ❌ No | ❌ No | ❌ No | ✅ Yes | None (Free) |
| **Wiktionary** (`wiktionary`) | English Dictionary | Primary & Enrichment | ✅ Yes (Rich senses) | ✅ Yes (first parsed example) | ✅ Yes (up to 6) | ❌ No | ❌ No | ❌ No | ❌ No | ❌ No | ❌ No | ❌ No | None (Free) |
| **Datamuse** (`datamuse`) | WordNet Lexical Engine | Enrichment | ✅ Yes (WordNet glosses) | ❌ No | ❌ No | ✅ Yes (`rel_syn`, `rel_ant`) | ❌ No | ❌ No | ❌ No | ✅ Yes (Adjectives `rel_jjb`, patterns `rel_trg`) | ❌ No | ❌ No | None (Free) |
| **RhymeBrain** (`rhymebrain`) | Phonetics & Prosody | Enrichment | ❌ No | ❌ No | ❌ No | ❌ No | ✅ Yes (Clean IPA) | ❌ No | ✅ Yes (Syllable count) | ❌ No | ❌ No | ❌ No | None (Free) |
| **Wikipedia** (`wikipedia`) | Encyclopedia | Fallback / Enrichment | ✅ Yes (Summary gloss) | ❌ No | ❌ No | ❌ No | ❌ No | ❌ No | ❌ No | ❌ No | ❌ No | ✅ Yes | None (Free) |
| **Urban Dictionary** (`urban_dictionary`) | Slang & Idioms | Fallback / Enrichment | ✅ Yes (Top-voted slang) | ✅ Yes (Top slang example) | ✅ Yes (All ranked examples) | ❌ No | ❌ No | ❌ No | ❌ No | ❌ No | ❌ No | ❌ No | None (Free) |
| **Google Translate** (`google_translate`) | Neural Translation | Primary Translation & Dictionary Fallback | ✅ (Translation gloss) | ❌ No | ❌ No | ❌ No | ❌ No | ❌ (Free TTS fallback) | ❌ No | ❌ No | ✅ Yes (Multi-language) | ❌ No | None (Free) |
| **MyMemory** (`mymemory`) | Translation Memory | Fallback Translation | ❌ No | ❌ No | ❌ No | ❌ No | ❌ No | ❌ No | ❌ No | ❌ No | ✅ Yes (Ranked match pairs) | ❌ No | None (Free) |
| **LibreTranslate** (`libre_translate`) | Self-Hosted Translation | Translation Option | ✅ (Translation gloss) | ❌ No | ❌ No | ❌ No | ❌ No | ❌ No | ❌ No | ❌ No | ✅ Yes | ❌ No | Optional API key |
| **Gemini / OpenAI AI** (`gemini_ai`) | Generative LLM | AI Assistant & Phrase Fallback | ✅ Yes (Contextual / Learner) | ✅ Yes (Bilingual & inline) | ✅ Yes | ✅ Yes (via Lexical Profile) | ✅ Yes (Generated IPA) | ❌ No | ❌ No | ✅ Full Lexical Profile (Word family, collocations, confusable pairs, learner mistakes) | ✅ Yes | ❌ No | User API Key (or local server) |

---

## 2. Field-by-Field Detailed Comparison

### A. Headword & Phonetics
* **Free Dictionary API (`free_dictionary`)**:
  - Parses both generic and accent-specific phonetics (`en-US`, `en-GB`).
  - Provides direct URLs to authentic audio recordings (e.g. `https://api.dictionaryapi.dev/media/pronunciations/en/...-us.mp3`).
* **RhymeBrain (`rhymebrain`)**:
  - Returns raw phonetic notation converted to standardized IPA transcriptions.
* **Wiktionary, Datamuse, Wikipedia, Urban Dictionary**:
  - Do not provide direct audio URLs. If Wiktionary or Datamuse is used as the primary provider, the UI triggers Phase B enrichment to backfill phonetics from Free Dictionary or RhymeBrain.

### B. Meanings & Definitions (`meanings[]`)
* **Wiktionary**:
  - Returns detailed grammatical parts of speech (noun, verb, adjective, adverb, etc.).
  - Extracts up to 4 definitions per part of speech across up to 6 parts of speech.
* **Free Dictionary API**:
  - Returns comprehensive dictionary definitions grouped by part of speech.
* **Datamuse**:
  - Parses WordNet definition glosses formatted as `pos\tdefinition`.
  - Groups definitions into `noun`, `verb`, `adjective`, `adverb`, and `general`.
* **Wikipedia**:
  - Produces a single `encyclopedia` part-of-speech entry containing an introductory sentence plus a summarized excerpt (up to 420 characters).
* **Urban Dictionary**:
  - Produces a `slang` part-of-speech entry containing definitions filtered to items with at least 5 thumbs-up votes, sorted by net score.

### C. Examples: Per-Definition vs. Standalone List
* **Per-Definition (`definition.example`)**:
  - **Free Dictionary API**: Extracts upstream `example` field on the specific sense definition.
  - **Wiktionary**: Attaches the first parsed example from `parsedExamples` to `definition.example`.
  - **Urban Dictionary**: Formats and sets `definition.example` for each ranked slang meaning.
  - **Render Location**: Displays directly under the definition in `SenseMatrixCard` with a quote style and a dedicated **Listen** button.
* **Top-Level Attributed List (`examples[]`)**:
  - **Free Dictionary API**: Aggregates up to 8 unique examples from all definitions.
  - **Wiktionary**: Aggregates up to 6 parsed examples from all definitions.
  - **Urban Dictionary**: Aggregates examples from all qualifying definitions.
  - **Render Location**: Displays in the dedicated **Examples** section at the bottom of the word lookup card. Senses already showing an example under their definition are deduplicated so learners do not see redundant sentences.

### D. Synonyms & Antonyms
* **Datamuse**:
  - Strongest provider for related terms. Queries `rel_syn` (up to 10 synonyms) and `rel_ant` (up to 8 antonyms).
* **Free Dictionary API**:
  - Extracts definition-level and meaning-level synonyms/antonyms up to 12 items.
* **Wiktionary**:
  - Does not parse synonyms or antonyms via the definition REST endpoint.

### E. Lexical Profile & Collocations
* **Datamuse**:
  - Queries `rel_jjb` (adjectives that describe the noun) and `rel_trg` (words statistically associated / patterns).
  - Populates `lexicalProfile.collocations`.
* **Gemini AI / AI Assistant**:
  - Generates deep lexical cards: `wordFamily`, `collocations` (verbs, nouns, prepositions, patterns), `learnerMistakes` (avoid vs prefer pairs), `confusablePairs`, `wordFormation` (prefixes, suffixes), and `usageWarnings`.

### F. Translations (`translation`)
* **Google Translate (`google_translate`)**:
  - Zero-config, single-query neural translation. Auto-detects source language and translates to the target language configured in Settings.
* **MyMemory (`mymemory`)**:
  - Keyless translation memory fallback when Google Translate encounters rate limits.
* **LibreTranslate (`libre_translate`)**:
  - Privacy-preserving alternative; supports self-hosted or managed endpoints with an optional API key.

---

## 3. Data Merging & Enrichment Flow

When a lookup occurs, results from multiple providers are merged via `mergeDictionaryEntries()` and `mergeMeanings()` in `src/shared/enrichment.ts`:

1. **Phase 1 (Primary Paint)**:
   - Primary dictionary lookup (e.g. Wiktionary or Free Dictionary API) resolves and renders immediately.
   - Translation resolves in parallel and mounts the Translation banner.

2. **Phase 2 (Lazy Concurrent Enrichment)**:
   - Secondary keyless providers run concurrently in batches of 2 (`ENRICHMENT_CONCURRENCY = 2`).
   - If phonetic transcription or audio is missing, providers with pronunciation data (`free_dictionary`, `rhymebrain`) are prioritized to the front of the queue.
   - **Definitions**: Additional definitions are merged under matching parts of speech.
   - **Examples Backfilling**: If a primary definition lacked an example, incoming examples from secondary providers are backfilled onto that existing sense.
   - **Related Terms**: Synonyms and antonyms are deduplicated and merged up to maximum section thresholds.
   - **Lexical Cards**: Collocations from Datamuse are appended to the lexical profile.
