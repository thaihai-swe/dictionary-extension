# Design Principles

## Editorial Learning Direction

Dictionary uses an editorial learning aesthetic: calm warm surfaces, deep ink text, restrained teal-indigo accents, and typography that favors reading over chrome.

- Serif type is reserved for definitions, examples, and AI explanations.
- Sans-serif type is used for controls, labels, tabs, and metadata.
- Typography uses the shared `--font-display`, `--font-body`, and `--font-mono` tokens across every extension surface. The in-page card carries matching local definitions because content-script styles run independently of extension pages.
- The optional Learner-friendly reading font uses locally bundled Atkinson Hyperlegible across definitions, examples, AI explanations, and controls. It preserves the mono token for code and is never fetched from a third party at runtime.
- Surfaces stay quiet so selected text and definitions remain the focus.
- Motion is short, soft, and purposeful: open, load, reveal, and playback feedback.

## Themes

The extension supports three appearance modes:

- `system` — follow the operating system preference
- `light` — warm paper surfaces and deep ink text
- `dark` — low-glare charcoal surfaces and soft teal accents

Theme preference is stored in settings and applied with `data-theme` on each extension surface. System mode still reacts to the OS color scheme when no explicit theme is forced.

## Lookup Triggers

Webpage lookups can start from:

- Floating icon after text selection or double-click (default)
- Post-selection single-key tap (`Shift` by default, configurable to `Alt` or `Ctrl`)
- Direct popup on selection or double-click
- Context menu

Floating icon and post-selection key are available together. Selecting text alone does not call remote providers; the user must click the icon, press the post-selection key, or use another explicit trigger. Editable fields are ignored so typing is never interrupted.

## Lightweight Interaction

The extension keeps a lightweight interaction model:

- Fast, non-blocking popup responses.
- Simple tab switching between dictionary/translation results and generative AI results.
- Easy dismissal through outside click, Escape, or the close button.
- Subtle motion communicates opening, loading, result arrival, and playback.
- Reduced-motion preferences disable nonessential animation.

## Lookup Surface Behavior

The in-page card uses a structured result hierarchy:

- Compact headers keep the query visible while primary actions stay nearby.
- Segmented source tabs separate Dictionary and AI without visual noise.
- **Context Explain**, **Grammar & Nuance**, and **Sentence Breakdown** are AI-tab-only secondary actions, hidden in Dictionary mode.
- The AI tab exposes an editable Context field only when AI is enabled and a query exists.
- Sentence Breakdown is AI-only and can analyze a full sentence query or a word/phrase with supplied Context.
- Dense but readable sections separate definitions, examples, translations, and AI markdown.
- AI results use provider-assigned section kinds. Built-in outlines keep a short complementary stack: Main AI includes Translation & Meaning, then usage and examples, and does not repeat Dictionary synonym lists; Context Explain, Grammar, and Phrase stay on their own question. Deep Understanding collapses when there are four or more sections. Custom unknown headings keep model order.
- Loading uses a skeleton instead of a blocking text-only state.
- Empty and provider-error states explain the next useful action.
- Pronunciation controls show a temporary playing state and reset when playback ends.
- The last Dictionary or AI tab is remembered for the current browser session only.

The in-page card can be resized from its bottom-right handle. Saved dimensions use `popupWidth` (clamped 320–840px) and `popupHeight` (clamped 360–900px), with runtime viewport bounds applied dynamically per lookup. While the card is open, zoom and viewport changes re-flip and re-clamp it against the current visual viewport.

## Data Privacy and Context

- Selected text is only sent to remote providers when a lookup is explicitly triggered, or via background preload if enabled.
- **Context Explain** is opt-in per lookup and only available while the AI tab is active. The query is the word or phrase being explained; Context is the surrounding sentence or paragraph supplied separately by the user. The in-page popup allows editing or pasting context.
- Automatic extraction is a sentence-level convenience prefill. Selection-based lookups recover the exact sentence at the DOM Range; typed queries may receive a ranked page suggestion. Extraction is bounded, used only for the current contextual action, and never blocks manual entry when it fails. See [Context Extraction](context-extraction.md).
- The result shows a **Context used** quotation so users can verify the exact context submitted to AI.
- AI API keys stay in local storage and are not synced across devices.

## Resilience

- The in-page popup handles rendering, audio, and provider interaction.
- If translation succeeds but dictionary fails, the user still sees the translation.
- Remote dictionary audio is preferred for pronunciation. Speech synthesis is the fallback. Audio metadata and blobs are never cached.
- The extension stays plain JavaScript with no bundler or framework so the UI remains easy to audit and change.
- PDF and reader compatibility uses progressive enhancement: exact DOM extraction where Chrome exposes readable content, and manual/context-menu fallback where browser-owned pages are restricted.

## Multi-source attribution

Provider attribution remains part of the normalized result contract and is shown in relevant result-section metadata. The title row stays focused on the queried word and pronunciation rather than displaying provider badges.

## Result hierarchy

Lookup results use a structured semantic layout. Provider metadata appears as compact badges, contextual evidence is rendered as a distinct `Context used` callout, and AI Markdown is rendered with consistent headings, lists, quotes, code, and spacing. This keeps long learner-oriented results scannable without changing the underlying provider contract.

Result states must remain explicit: loading, partial provider success, empty results, provider failure, and validation errors each provide a clear next action. Contextual AI text is never persisted as reusable lookup cache.

## Context and long AI results

The Context field is editable in the in-page popup. Page extraction is only a convenience prefill; user edits are authoritative, transient, and not saved. Normal Dictionary and normal AI lookups do not submit Context. Long semantic AI sections are split into titled blocks. Context evidence, definitions, translations, examples, grammar, sentence structure, phrase parsing, and the first primary block stay expanded; deep-dive blocks such as Word Family, Collocations, Common Structures, learner errors, etymology, and idiom analysis start collapsed when the result is long.

### Semantic AI sections

AI responses with multiple `###` headings render as separate titled sections. Built-in AI intents use stable semantic ordering: context and core meaning appear before examples and deep-dive material; unknown custom headings remain visible in their returned order. Short answers remain fully expanded. Long answers use accessible native disclosure controls for secondary deep-dive sections (such as Deep Understanding), while primary learning sections remain visible. Structured lexical-profile blocks appear after eligible AI explanation sections but retain the existing Dictionary result placement. **Context used** remains a distinct first section for contextual, grammar, and sentence-breakdown intents when context is supplied. Sentence Breakdown remains a structured JSON result and can also render structured phrase cards and grammar-part rows.
