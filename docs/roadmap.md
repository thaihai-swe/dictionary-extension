# Roadmap

## Recently Completed

- Removed the paid-only Oxford provider because no suitable free tier was available
- Additional dictionary backends: Wordnik, WordsAPI (free-tier BYO key)
- Multi-backend dictionary switching and fallback (`free_dictionary`, `wiktionary`, `merriam_webster`, `wordnik`, `words_api`)
- Lazy dictionary enrichment: initial primary result renders first, then secondary providers enrich it in the background with bounded concurrency
- Incremental `LOOKUP_UPDATE` messaging with request IDs, revision numbers, and stale-response guards
- Multi-source title badges (`sourceBadges`) for dictionary, translation, AI, and every successful enrichment provider
- Source-label deduplication: provider names are not repeated in the subtitle meta line when already visible as badges
- Section merging and duplicate suppression across provider definitions, examples, synonyms, and antonyms
- Pronunciation merging across providers with language/accent matching, IPA/audio backfilling, and phonetic-first ordering
- Pronunciation speech evaluator with Practice score badges
- Sentence Breakdown & Phrase Parsing AI action
- Grammar Nuance AI action
- Smart multi-word phrase and idiom fallback in Dictionary mode
- Editorial Learning redesign with light/dark/system themes
- Shared design tokens, quieter controls, and definition-first typography
- Deep dictionary sections (definitions, examples, synonyms, antonyms, variants)
- Translation provider abstraction
- Contextual explanations using bounded page context
- Editable AI Context fields in toolbar and in-page popups
- Sentence-level context prefilling with manual-entry fallback
- Visible Context used confirmation in contextual AI results
- Lightweight Markdown rendering for AI headings and lists
- Pronunciation rate and preferred voice controls
- Audio metadata and blob caching removal
- Resizable in-page popup with persisted dimensions
- Unified popup states, interaction feedback, and reduced-motion support
- Smart irregular and phrasal verb lemmatization with candidate fallback in the dictionary chain
- Idiom & Collocation Explorer: dedicated Phrase & Collocations AI action and configurable prompt template
- Expanded lexical profile: word family derivatives, word formation (prefixes/suffixes), confusable pairs, common learner mistakes, and structured collocations
- Zero-leak secret management: API keys isolated to the background worker, never read into content scripts or the toolbar popup
- Granular origin permission requests for custom AI endpoints and self-hosted LibreTranslate instances
- Teardown request cancellation on in-page and toolbar popup dismissal
- AI result structure: parse-time section kinds, non-duplicate intent outlines, and intent-aware primary/deep-dive collapse (Schema v6)
## Planned Short Term

- Per-site blacklist and whitelist
- Configurable keyboard shortcut
- Option to disable automatic phrasal/idiom fallback in Dictionary mode
- Regenerate or edit an AI section in place
- Capture selected sentence, page title, URL, and PDF page metadata with saved vocabulary

## Planned Mid Term

- Built-in flashcard review and spaced repetition scheduling
- AnkiConnect integration and configurable card fields
- Better popup positioning on constrained or rapidly changing viewports
- Improved provider validation reporting
- Document-level vocabulary lists and reading progress

## Planned Long Term

- YouTube subtitle lookup, sentence capture, timestamp replay, and vocabulary mining
- Optional user-controlled immersion mode
- Audio/screenshot sentence cards for media learning
- Advanced FSRS review scheduling and pronunciation recall exercises
- Optional local-first sync or self-hosted vocabulary storage

## Ideas and Considerations

- Multiple configuration profiles
- Theme customization
- Import/export settings
- Learner decks and vocabulary mastery states (`new`, `learning`, `familiar`, `mastered`, `ignored`)

## Quality follow-up

- Keep stale-response UI protection; true provider abort remains deferred because `chrome.runtime.sendMessage` cannot transport `AbortSignal`.
- Add telemetry-free manual performance checks for cache hits, duplicate requests, lazy enrichment latency, and partial provider failures.
- Verify provider attribution remains accurate when a source returns duplicate content but successfully responds.
- Continue checking pronunciation behavior for words with audio but no IPA in the primary provider.

## Recently completed quality upgrades

- AI heading split into expanded semantic sections
- Shared query/context utilities for provider and popup surfaces
- Collapsible deep-dive sections retained for long AI responses while primary learning sections stay expanded
- Context textarea autosize and stronger validation/ARIA relationships
- Pronunciation interrupt safety for rapid repeated clicks
- Shared query/context helpers across popup surfaces
- Editable context parity in the webpage popup
- Context source messaging and accessibility relationships
- AI response cleanup and semantic section-kind inference
- Stale UI request cancellation hooks and tab/result coordination
