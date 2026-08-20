# Providers

Providers are the remote or browser-backed services used for lookup results. The background service worker routes requests to them and expects a stable result shape for the shared renderer.

## Common Result Shape

```js
{
  title: string,
  subtitle?: string,
  sourceBadges?: Array<{
    label: string,
    kind: "dictionary" | "translation" | "ai" | string,
    providerId?: string
  }>,
  providerId?: string,
  sections: Array<{
    title?: string,
    kind?: string,
    text?: string,
    items?: string[],
    meta?: string,
    markdown?: boolean
  }>,
  presentation?: {
    surface: "ai",
    intent: "default" | "explain_in_context" | "grammar" | "phrase_fallback" | "phrase_explorer" | "sentence_breakdown"
  },
  pronunciation?: Pronunciation,
  pronunciations?: Pronunciation[]
}
```

`sourceBadges` is the canonical source-attribution field. The renderer deduplicates badge labels case-insensitively. `presentation` is optional renderer-facing metadata emitted by the AI provider; it identifies an AI intent for stable section ordering and profile placement. Other providers do not need it, and results without it retain the standard renderer order.

AI Markdown sections receive a provider-assigned `kind` at parse time from the built-in intent outline (`kindForAiSection`). Exact titles win, then aliases, then a heading heuristic. Known kinds include `context`, `intro`, `definitions`, `translation`, `usage`, `examples`, `grammar`, `contextual-analysis`, `summary`, `lexical`, `structures`, `phrase`, `memory`, and `etymology`. Untitled leading prose is `intro`. Leftover overlapping sections (e.g. Translation on Main AI / Grammar, duplicate Simple Explanation on Context) are dropped or merged into a single focused card. Sentence Breakdown uses structured kinds (`sentence-overview`, `sentence-structure`, `phrase-parsing`) instead of Markdown split. When `kind` is present, the renderer trusts it and does not re-guess from the title. Reorder runs only when every non-context section has a known rank for that intent; otherwise model order is kept, with Context used first.

Pronunciation objects commonly include `text`, `phonetic`, `audioUrl`, `language`, `label`, and `fallbackOnly`.

## Dictionary Provider Abstraction

A dictionary facade selects the configured provider and normalizes its response. The background worker should call the facade rather than a vendor-specific adapter.

Registered providers:

| ID | Label | Notes |
|---|---|---|
| `free_dictionary` | Free Dictionary API (Default) | `dictionaryapi.dev`; no API key; definitions, examples, synonyms/antonyms, and US/UK audio when available |
| `wiktionary` | Wiktionary REST API | Free English Wiktionary definitions and examples |
| `merriam_webster` | Merriam-Webster Collegiate API | Requires `dictionaryApiKey`; short definitions, examples, and US audio when available |
| `wordnik` | Wordnik | Requires `wordnikApiKey`; multi-source definitions (American Heritage, Century, WordNet, etc.), examples, audio, and related words |
| `words_api` | WordsAPI | Requires `wordsApiKey` via RapidAPI; definitions, examples, frequency, syllables, synonyms/antonyms. No audio; speech-synthesis fallback is used. |

The former `google-dictionary` adapter was renamed to `free-dictionary` because it uses the public Free Dictionary API (`dictionaryapi.dev`), not an official Google Dictionary service. The paid-only Oxford provider was removed because no usable free tier was available.

Common dictionary fields:

```js
{
  title,
  subtitle,
  sourceBadges,
  providerId,
  lemmaFallback?: { originalText: string, lemma: string },
  lexicalProfile?: {
    wordFamily?: {
      noun?: string[],
      verb?: string[],
      adjective?: string[],
      adverb?: string[],
      inflections?: string[],
      derivatives?: string[]
    },
    usageWarnings?: string[],
    confusablePairs?: Array<{ word: string, distinction: string }>,
    learnerMistakes?: Array<{ mistake: string, correction: string, example?: string }>,
    wordFormation?: {
      prefixes?: string[],
      suffixes?: string[],
      explanation?: string
    },
    collocations?: {
      verbs?: string[],
      nouns?: string[],
      prepositions?: string[],
      adjectives?: string[],
      patterns?: string[]
    }
  },
  sections,
  pronunciation,
  pronunciations
}
```

Section kinds are `definitions`, `examples`, `synonyms`, and `antonyms`. AI and translation sections may use semantic kinds such as `translation`, `context`, `grammar`, `sentence-structure`, `phrase-parsing`, and `ai`. Result sizes are capped to keep the popup scannable.

### Lexical Profile Sourcing & Fallback

When `enableLexicalProfile` is enabled in settings (default `true`), dictionary results and AI lookups include a normalized `lexicalProfile`:

- **Provider-First Extraction**: Definitions, parts of speech, derivative sections, and usage notes returned by primary and secondary dictionary providers are normalized into structured `wordFamily` categories (`noun`, `verb`, `adjective`, `adverb`, `inflections`, `derivatives`), `usageWarnings` (e.g. register tags such as `[formal]` or `[slang]`), and `confusablePairs` (e.g. *affect* vs. *effect*). WordsAPI derivation data is classified into inflections versus true derivatives by comparing against the word-family part-of-speech terms before populating the profile.
- **AI Structured Output**: default, grammar, and phrase-explorer prompts include an optional `<lexical-profile>` JSON block specification covering word family (including derivatives), word formation (prefixes, suffixes, explanation), learner mistakes, collocations (verbs, nouns, prepositions, adjectives, patterns), usage warnings, and confusable pairs. Context Explain, Sentence Breakdown, and phrase fallback do not request that block. When present in AI responses, the block is safely extracted via `parseLexicalProfile` and stripped from the rendered Markdown. The structured profile is canonical for each populated category; matching Markdown sections for Word Family, Usage & Register Notes, Confusables, Word Formation, Common Learner Mistakes, and Collocations are defensively omitted.
- **Deep Merging**: `mergeLexicalProfiles` combines lexical metadata across primary, enrichment, and AI results with case-insensitive deduplication and strict bounds (`MAX_LEXICAL_ITEMS = 12`, `MAX_DERIVATIVES = 12`, `MAX_LEXICAL_WARNINGS = 8`, `MAX_CONFUSABLE_PAIRS = 6`, `MAX_LEARNER_MISTAKES = 6`, `MAX_FORMATION_ITEMS = 6`, `MAX_COLLOCATION_ITEMS_PER_GROUP = 10`). The word-formation explanation prefers the provider value over AI value and is never concatenated.
- **Interactive UI**: Word Family (including Derivatives) items are rendered as clickable family chips carrying `data-lookup-query` attributes for quick re-lookup; warnings and confusable pairs render in a distinct warning callout; Word Formation, Learner Mistakes, and Collocations render as dedicated readable blocks with escaped content and token-consistent styling on both popup surfaces.

## Initial Fallback Lookup

`lookupDictionary(text, settings)` resolves the configured primary provider and attempts the fallback chain:

```text
free_dictionary → wiktionary → merriam_webster → wordnik → words_api
```

The selected provider is tried first even when it is not the first item in this list. A `NotFoundError` means that provider has no result, so the next provider is attempted. Operational failures such as missing credentials, network errors, or rate limits are rethrown and stop the initial chain so the user receives an actionable error instead of an unexplained provider switch.

When exact lookups fail with `NotFoundError` across all providers, the fallback router generates candidate root lemmas using `getEnglishLemmaCandidates()` (e.g. `running` → `run`, `cities` → `city`, `evaluated` → `evaluate`) and retries the chain for root forms. When a stem succeeds, `lemmaFallback` metadata is attached and a subtitle notice (`Showing definitions for root: ${lemma}`) is rendered.

Successful fallback results are normalized with the selected provider badge.

## Lazy Dictionary Enrichment

`lookupDictionaryEnrichment(text, settings, options)` queries non-primary providers after the initial result has already been rendered.

- The primary provider is excluded by default; callers may pass `options.primaryId` or `options.excludeIds`.
- Key-backed providers (`merriam_webster`, `wordnik`, `words_api`) are skipped before any network call when their required API key is absent.
- Providers are processed in batches of **2 concurrent requests** (`ENRICHMENT_CONCURRENCY = 2`).
- Successful results are normalized and returned in provider order.
- `NotFoundError` results are skipped.
- Missing API keys, rate limits, network failures, and other operational errors are logged and skipped so enrichment cannot break the primary lookup.

The background merges each fulfilled result into the current payload:

- **Sections** are matched by normalized kind/title and item text is deduplicated case-insensitively. Definitions, examples, synonyms, and antonyms are capped to keep the card readable.
- **Attribution** is preserved in section metadata where available, and every provider that successfully returns data is added to `sourceBadges` even when its content duplicates existing sections.
- **Pronunciations** are merged by language/accent. If the primary result has an entry with audio but no IPA, an enrichment entry with the same accent can fill `phonetic`; the same applies to a missing audio URL. Entries with phonetic text are sorted before speech-only entries.

## Translation Provider Abstraction

A translation facade selects the configured provider and normalizes its response. The background worker should call the facade rather than a vendor-specific adapter.

Normalized translation fields:

```js
{
  title,
  subtitle,
  sections,
  translatedText,
  detectedLanguage,
  targetLanguage,
  providerId
}
```

Dictionary and translation adapters are normalized before rendering. Dictionary results always receive a provider badge and provider ID; translation results always expose `translatedText`, `detectedLanguage`, and `targetLanguage`, with one `Original` section for the source text. Missing results use `NotFoundError` for fallback, while operational failures stop the primary dictionary chain.

The registered providers are `google` (Google Translate) and `libretranslate` (LibreTranslate). Unsupported IDs fail clearly. Adding another provider requires an adapter, provider registration, and an options-page choice.

## AI Provider

The AI provider supports normal explanations, contextual explanations, grammar breakdowns, sentence breakdowns, phrase exploration, and phrase fallbacks:

- `intent: "default"` — main explanation template
- `intent: "explain_in_context"` — contextual prompt template requiring non-empty context
- `intent: "grammar"` — grammar/nuance template using optional context
- `intent: "phrase_explorer"` — idiom, phrasal verb, preposition patterns, and collocation explorer covering meaning, grammar patterns, word partnerships, register, examples, and learner mistakes
- `intent: "sentence_breakdown"` — structured sentence breakdown and phrase parsing prompt template
- `intent: "phrase_fallback"` — idiom and phrase fallback prompt template

Supported template variables are `{{str}}`, `{{text}}`, `{{sentence}}`, `{{word_count}}`, `{{targetLang}}`, and `{{context}}`. Simple variable replacement is applied, and the rendered prompt is automatically combined with an input contract append block (`<target>`, `<context>`, `<target-language>`) so model instructions treat user selections as data rather than executable prompt instructions.

When `enableLexicalProfile` is enabled, an additional input-contract instruction requests an optional `<lexical-profile>` JSON block (word family by part of speech, usage warnings, and confusable pairs). The AI provider extracts this block separately via `parseLexicalProfileFromResponse`, strips it from the Markdown shown to the user, and validates it through `parseLexicalProfile` so malformed or omitted blocks degrade gracefully.

Options saving validates custom prompt templates for missing variables (for example, warning if `{{context}}` is absent from context explanations or `{{sentence}}` is missing from sentence breakdown).

Context is optional at the provider boundary, but `explain_in_context` requires a non-empty value. `sentence_breakdown` uses the supplied Context sentence when present, or the query itself when the query is already sentence-like. Automatic page extraction is performed by the UI as an optional prefill; the provider receives context only after the user activates a contextual action. Contextual, grammar, and sentence-breakdown results include a visible `Context used` section when context was supplied.

### Renderer Markdown

Sections with `markdown: true` use the shared lightweight renderer. It supports headings (`#` through `######`), unordered and ordered lists, bold, italics, inline code, blockquotes, and horizontal rules. It is intentionally not a full Markdown or HTML renderer.

If the configured base URL is Google Gemini, the native Gemini path is used. Other HTTPS endpoints use the OpenAI-compatible chat path. AI output is returned as a Markdown-enabled section for lightweight rendering.

## Pronunciation Playback

Playback order is:

1. Prefer remote dictionary audio.
2. Apply configured playback rate.
3. Fall back to browser speech synthesis when audio is unavailable or fails.
4. Apply configured rate and optional preferred voice to speech synthesis.

Audio blobs and metadata must not be cached.

### Pronunciation merging and IPA backfilling

Some providers return audio without IPA, while others return IPA without audio. During enrichment, matching entries are identified by language/accent (`en-US`, `en-GB`, or a provider language value). Missing `phonetic`, `audioUrl`, and language fields are filled from the successful enrichment entry rather than creating unnecessary duplicate buttons. If a real audio URL is added to a speech-only fallback, its `fallbackOnly` marker is cleared. Pronunciations with IPA are ordered before empty-phonetic entries so the title row exposes IPA when any successful provider supplies it.

### Speech practice evaluator

Dictionary results expose a **Practice** control next to pronunciation buttons. It uses the browser Speech Recognition API (`SpeechRecognition` / `webkitSpeechRecognition`) to capture one spoken attempt, score it against the target word with normalized Levenshtein similarity, and render a grade badge:

- `90–100` Excellent
- `70–89` Good
- `50–69` Almost there
- `<50` Try again

Recognition is opt-in per click, stops any active playback first, and surfaces clear errors for missing microphone permission, unsupported browsers, or no speech detected.

## Result presentation guidance

Providers should return meaningful `kind` values for sections when available, such as `definitions`, `translation`, `examples`, `context`, `sentence-overview`, `sentence-structure`, `phrase-parsing`, or `ai`. The shared renderer uses these values to apply semantic styling; missing kinds are inferred from section titles. Section `meta` values are displayed as compact badges when a section has a title. Structured `sentence_breakdown` responses may include a `data` object for sentence parts and phrase cards.

AI templates should request concise Markdown with stable headings and learner-friendly bullets. The UI remains tolerant of provider responses that omit headings or return plain text.

## AI output normalization

AI Markdown is normalized before rendering: accidental code fences, inconsistent heading levels, duplicate adjacent headings, and excessive blank lines are cleaned up. Unknown content is preserved. The provider still returns the existing normalized result shape, with semantic `kind` values used by the shared renderer.

### AI section normalization

After the model returns Markdown, the AI provider:

1. Strips accidental code fences.
2. Normalizes headings to `###`.
3. Converts bold-only section labels into headings when needed.
4. Splits the cleaned Markdown into titled `sections[]`.
5. Infers section `kind` values such as `context`, `definitions`, `examples`, `grammar`, `lexical`, `usage`, `translation`, `phrase`, `sentence-structure`, `phrase-parsing`, and `general`.
6. For `sentence_breakdown`, attempts structured JSON parsing first and falls back to Markdown section splitting when JSON is unavailable.

No lookup payload contract changes are required. Context remains optional and is only included for contextual intents.
