# User Guide

## Overview

Dictionary provides fast lookups for words, phrases, or full sentences. It combines translation, rich dictionary definitions from multiple sources, and AI-driven explanations.

The interface uses an editorial learning design with warm light and dark themes, quieter controls, and definition-first typography.

Source providers are shown as compact badges in the result header, so you always know which services contributed to each lookup.

## Workflows

### Manual Lookup

Click the extension icon in the Chrome toolbar to open the popup. Type any word or phrase into the search text box and press Enter or click Search.

Use the gear icon in the toolbar header to open full extension settings without navigating away. The last Dictionary or AI tab used in this browser session is remembered until the browser restarts; a new session still opens on your default tab.


### In-page Triggers

You can trigger a lookup directly on any webpage without typing:

- **Floating Icon (Default):** Highlight text or double-click a word on a page to display a small lookup icon near the selection. Click the icon to open the card.
- **Post-Selection Hotkey:** Highlight text or double-click a word, then tap your configured key (`Shift` by default, or `Alt` / `Ctrl`) to open the lookup card immediately.
- **Direct Popup:** Set selection behavior to `Direct popup` to open the lookup card instantly on drag selection or double-click.
- **Off:** Disable text selection and double-click triggers while keeping context menu lookups available.
- **Context Menu:** Right-click selected text and choose the extension's lookup action.

Text selection triggers are automatically suppressed inside editable fields (`input`, `textarea`, and `contenteditable`) so typing remains uninterrupted.

## Dictionary Tab

The primary lookup surface combines two sources:

- **Translation:** A quick summary of the detected language and the translation into your target language.
- **Dictionary:** Deep English dictionary definitions grouped by part of speech, along with example sentences, synonyms, and antonyms.

### Multi-Source Lookup and Enrichment

The extension orchestrates multiple dictionary providers intelligently:

1. **Primary provider** — your configured default (e.g., Free Dictionary API) is queried first. If it has no data for the word, the fallback chain tries the next provider automatically.
2. **Initial result** — the primary provider's result (plus translation) is displayed immediately.
3. **Background enrichment** — after the initial result renders, secondary dictionary providers (Wiktionary, Merriam-Webster, Wordnik, WordsAPI) are queried lazily without slowing down the initial display.
4. **Incremental updates** — as each enrichment result arrives, the popup updates with additional definitions, examples, synonyms, and pronunciations from the secondary source.

Provider attribution remains available in the relevant result-section metadata, while the Dictionary title row stays focused on the queried word and pronunciation.

### Popup Layout

The lookup card uses a calm editorial surface with warm light and dark themes, definition-first typography, and a quiet header that keeps the current query and source/language controls visible. Drag the bottom-right corner to make the in-page card wider or taller for long definitions; the size is remembered automatically. Loading, empty, and error states provide a clear next action without hiding the rest of the popup.

You can switch between System, Light, and Dark themes in Settings. System follows your operating system appearance, and the Learner-friendly font option uses Atkinson Hyperlegible for clearer letter distinction.

### Pronunciation

When looking up a single word, you will see pronunciation buttons (e.g., `Listen (US)` or `Listen (UK)`).

1. The extension prefers playing real dictionary audio.
2. If audio is missing or fails, it falls back to your browser's built-in speech synthesis.
3. When enrichment providers return IPA or audio that the primary provider lacks, the pronunciation is updated with the filled data.
4. You can control the playback speed and preferred fallback voice in the settings.
5. Use **Practice** to speak the word into your microphone. The extension scores the attempt and shows a match badge such as `95% · Excellent`. The score stays on the current card if enrichment updates arrive. Practice requires Chrome speech recognition; other browsers show an explanation instead of the button.

### Dictionary providers

In Settings, choose which dictionary backend powers structured definitions:

- **Free Dictionary API** (default): `dictionaryapi.dev`; no API key needed. Provides definitions, examples, synonyms/antonyms, and US/UK audio when available.
- **Wiktionary REST API**: Free English Wiktionary definitions and examples.
- **Merriam-Webster Collegiate API**: Requires a free API key from dictionaryapi.com.
- **Wordnik**: Multi-source definitions (American Heritage, Century, WordNet, etc.), examples, audio, and related words. Free API key from developer.wordnik.com.
- **WordsAPI**: Definitions, examples, frequency, syllables, and related words via RapidAPI.

The active source appears as a small badge next to the looked-up word. Secondary providers that contribute to enrichment also appear as badges.

## AI Tab

Switch to the AI tab for a complementary explanation of the text. The default Main AI lookup adds extra learner meaning, translation, usage, and examples, without repeating Dictionary synonym lists or word-family cards.

### AI Actions (In Context, Grammar, Phrase & Collocations, & Sentence Breakdown)

The **AI** tab owns five complementary actions:

- **Main AI:** Extra learner meaning, **Translation & Meaning**, usage, examples, and optional etymology. It does not repeat Dictionary synonym lists.
- **Context Explain:** Explains the query using a surrounding sentence or paragraph you supply in Context.
- **Grammar & Nuance:** Analyzes syntax, grammatical function, formality, and tone for the query and optional Context.
- **Phrase & Collocations:** Analyzes idioms, phrasal verbs, and multi-word expressions, showing core meaning, grammar/preposition patterns, register, and natural examples. Collocations and learner mistakes use the structured lexical profile.
- **Sentence Breakdown:** Breaks down the sentence structure, analyzes grammatical components, and parses idioms/collocations/phrasal verbs.

These actions are available only in the **AI** tab and are hidden in Dictionary mode.

#### Query vs Context

- **Query** is the word or phrase being explained.
- **Context** is the surrounding sentence or paragraph that gives that query meaning.
- Context is editable in AI mode in the webpage popup.
- For selected text, Context uses the exact sentence at the selection.
- Context is retained for the current popup session and is not sent until you activate a contextual action.

#### Webpage popup flow

1. Select text, double-click a word, use the post-selection key, or open the context menu lookup.
2. Switch to the **AI** tab.
3. Context is prefilled with the exact sentence around your selection when available.
4. Edit or replace the Context text if needed.
5. Click **Context Explain**, **Grammar & Nuance**, or **Sentence Breakdown**.
6. Review the **Context used** quotation above the AI response to confirm what was submitted.

#### Toolbar popup flow

1. Click the extension icon and type a word or phrase.
2. Switch to the **AI** tab.
3. If the active page has matching sentences, Context may prefill with the best suggested sentence.
4. If not, paste the relevant sentence into Context yourself.
5. Click **Context Explain**, **Grammar & Nuance**, or **Sentence Breakdown**.
6. Empty Context shows an inline validation message and focuses the field instead of sending a request, unless the query itself is already a full sentence for Sentence Breakdown.

Automatic page extraction is only a convenience prefill. It is sentence-level, bounded, and optional. Manual entry always works when the page has no matching text or the content script is unavailable.

### PDFs and Web Reader pages

- On normal web pages, embedded PDFs, and reader-style article pages that expose a scriptable DOM, selection lookup uses the exact selected occurrence and extracts only its containing sentence.
- PDF text layers may contain visual line-break artifacts; the extractor joins split words before sentence detection and keeps the existing context length bound.
- Chrome's built-in PDF viewer and browser-owned pages may not accept extension content scripts. Use the context menu on selected PDF text when available. The extension displays the in-page card over scriptable PDF pages.
- Local `file://` documents require Chrome's **Allow access to file URLs** permission for the extension. Enable the permission and reload the document.
- Reader Mode compatibility applies to reader pages with accessible article markup. Browser-owned `chrome://` reading surfaces remain fallback-only because they are not scriptable extension content pages.

### Sentence Breakdown

Use **Sentence Breakdown** when you want a structural reading of a sentence rather than a single-word definition.

1. Enter or select a word, phrase, or full sentence.
2. Switch to the **AI** tab.
3. If the query is not already a complete sentence, paste or keep the surrounding sentence in Context.
4. Click **Sentence Breakdown**.
5. Review:
   - the analyzed sentence
   - grammatical parts
   - detected phrasal verbs, idioms, collocations, or fixed expressions
   - learner notes

Detected phrases can be looked up with **Look up phrase**, which starts a normal Dictionary lookup for that expression.

### Multi-word Phrases & Idioms

When looking up multi-word expressions or idioms in Dictionary mode (e.g. "kick the bucket" or "break a leg"):

1. The extension first fetches available translation and structured dictionary definitions.
2. If structured dictionary data is missing or incomplete for the phrase, it automatically falls back to an AI phrase breakdown.
3. The AI phrase breakdown appears under **AI · Phrase explanation** in the Dictionary tab so you always get a clear meaning.

## Settings shortcuts

- Open Settings from the extension toolbar icon or Options page.
- Use **Reset AI prompts** to restore the built-in prompt templates, then click Save Settings.

## Context controls

The webpage popup provides the AI-only Context workflow. The field may be prefilled with the sentence containing the query, but it can always be replaced or edited. Context is sent only when Context Explain, Grammar & Nuance, or Sentence Breakdown is activated. A blank field is rejected inline and focused for correction, except when Sentence Breakdown is run on a full-sentence query.

### Reading multi-section AI results

Long AI answers are broken into titled sections such as Meaning, Examples, Grammar, and Sentence Structure. The untitled opening definition is treated as **Intro**. Primary learning sections stay visible, while secondary deep-dive sections such as Deep Understanding are collapsed by default when there are four or more sections. Select a section heading to expand or collapse it. Contextual explanations, Grammar & Nuance, and Sentence Breakdown still show **Context used** above the analysis when you supply a sentence.

## Word Family and Related Terms

When the **Lexical Profile** setting is enabled (default), each lookup enriches results with structured word-relationship data that appears beneath the definitions:

- **Word Family** — noun, verb, adjective, adverb, inflection, and derivative forms of the word, shown as clickable chips. Tap a chip to look up that form directly. A form already looked up in this popup session opens immediately from cache.
- **Word Formation** — prefixes, suffixes, and a concise explanation of how the word is built.
- **Usage & Register Notes** — usage warnings (for example formal, slang, or archaic register) and confusable-word pairs (for example *affect* vs. *effect*) displayed in a warning callout.
- **Common Learner Mistakes** — frequent errors and their corrections, with example sentences.
- **Collocations** — common verb, noun, preposition, and adjective pairings plus natural example patterns, grouped by type.

Provider data is used first (for example WordsAPI derivation data and Wordnik related words). When provider data is incomplete, the AI fallback supplies the same structured profile so these sections still render.
