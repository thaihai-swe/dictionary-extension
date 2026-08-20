# A Smarter Way to Understand Words While You Read

## Dictionary, Translation, Pronunciation, and AI Learning in One Chrome Extension

Most dictionary tools answer one question: **“What does this word mean?”**

Dictionary goes further. It helps users understand **what a word means, how it sounds, how it behaves in a sentence, how its tone changes with context, and how phrases and idioms are actually used**—without forcing them to leave the page they are reading.

It combines fast dictionary lookup, translation, pronunciation, and configurable AI explanations in one focused workflow.

## Why Users Choose It

### Understand language without breaking your reading flow

Look up a word directly where it appears:

- Select text on a webpage.
- Double-click a word.
- Use the post-selection trigger key after highlighting text.
- Use the right-click context menu.

The in-page popup keeps the explanation close to the original sentence.
### Start simple, go deeper only when needed

The product is organized around two clear modes:

- **Dictionary mode** provides fast translation and structured dictionary information.
- **AI mode** provides deeper explanations, contextual meaning, grammar analysis, and nuance.

Users can get a quick answer in seconds, then switch to a deeper learning workflow when a word is confusing, technical, idiomatic, or used in an unfamiliar way.

## Complete Feature Set

### Rich multi-source dictionary lookup

Dictionary results are organized for learning rather than just displaying a raw API response. The extension orchestrates multiple dictionary providers intelligently:

1. **Primary provider** — your configured default (Free Dictionary API, Wiktionary, Merriam-Webster, Wordnik, or WordsAPI) is queried first. If it has no data, fallback providers are tried automatically.
2. **Initial result** — the first successful provider's result plus translation is returned immediately.
3. **Background enrichment** — after the initial result renders, secondary dictionary providers are queried lazily and their results are merged in.

Every provider that successfully returns data contributes to the result's source metadata. Results can include:

- Definitions grouped by part of speech.
- Example sentences.
- Synonyms and antonyms.
- Pronunciation information.
- Multiple pronunciation variants when available.
- IPA phonetic transcription, backfilled across providers when the primary source lacks it.
- Original text and translation when only translation succeeds.

The extension handles partial provider failures gracefully. If translation succeeds while dictionary data fails—or the reverse—the successful result can still be shown. Enrichment failures (missing API keys, network errors, empty results) are silently skipped and never break the initial result.

### Translation built into the same lookup

Users can configure a target language and receive translation alongside dictionary information. Translation is treated as a first-class part of the lookup rather than requiring a second extension or website.

The provider layer is separated from the UI, allowing the extension to normalize translation results and report unsupported provider settings clearly.

### Natural pronunciation practice

Pronunciation is built into the result instead of being an afterthought:

1. The extension prefers available dictionary audio.
2. If audio is missing or cannot play, it falls back to browser speech synthesis.
3. Users can configure speech speed.
4. Users can select a preferred browser speech voice for fallback playback.
5. Playback buttons show an active state and cleanly reset when playback ends.

This makes the extension useful not only for reading comprehension, but also for speaking and listening practice.

### Context Explain

Meaning often depends on the sentence. **Context Explain** is designed for that exact problem.

The workflow separates:

- **Query:** the word or phrase the user wants to understand.
- **Context:** the surrounding sentence or paragraph that gives the query its meaning.

For a selected word, the extension can automatically prefill the Context field with the sentence containing that word. The extraction is sentence-level and bounded so it avoids sending an unnecessarily large page passage.

For a manually typed query, users can paste their own sentence—even when the word does not appear anywhere on the current webpage.

The Context field is editable. Users remain in control of the final text sent to AI. Context is not submitted during an ordinary lookup; it is sent only after the user activates a contextual AI action.

After the response arrives, the result shows **Context used**, allowing users to verify the exact sentence or phrase that informed the explanation.

### Grammar & Nuance

Grammar Nuance turns a vocabulary lookup into a language lesson. It can analyze:

- Grammatical role and sentence structure.
- Meaning and function in the sentence.
- Tone, formality, and register.
- Common learner mistakes.
- More natural alternatives when useful.
- Short examples.
- Translation into the configured target language.
- Optional user-provided context.

This is especially valuable for words that look simple but carry different meanings, levels of formality, or grammatical behavior depending on how they are used.

### Provider attribution and transparency

Source attribution is part of the result contract: contributing providers are tracked in the normalized `sourceBadges` metadata and surfaced in section metadata. The title row stays focused on the queried word and pronunciation.

### Phrase and idiom fallback

Multi-word expressions frequently do not receive useful structured dictionary data. The extension detects phrase-like queries and can request an AI phrase explanation when structured definitions are unavailable and AI is enabled.

The fallback can explain:

- Literal meaning.
- Idiomatic meaning.
- Translation.
- Usage and register.
- A natural example sentence.
- Related expressions.

Instead of leaving the user with “no definition found,” the extension provides a useful next step.

### Configurable AI, not a locked-in black box

Advanced users can configure:

- AI provider base URL.
- AI API key.
- AI model name.
- Main explanation prompt.
- Context explanation prompt.
- Grammar Nuance prompt.
- Optional AI preloading.

The AI provider supports the configured Google Gemini-compatible path and OpenAI-compatible chat endpoints. Prompt templates support the implemented variables for query text, word count, target language, and context.

AI is optional. The Dictionary and Translation workflows remain independently configurable.

### A polished reading experience

The extension is designed to feel like a learning tool, not a developer panel:

- System, light, and dark themes.
- Editorial typography focused on readable definitions and explanations.
- Resizable in-page popup with persisted dimensions.
- Loading skeletons instead of confusing blank states.
- Clear empty and provider-error messages.
- Reduced-motion behavior for users who prefer less animation.
- Keyboard-friendly controls and accessible labels.
- Rich result rendering in the webpage popup.
- Lightweight Markdown rendering for AI headings, lists, bold, italics, code, quotes, and separators.

## Two Ways to Use the Product

### 1. Learn from a webpage

1. Select or double-click a word.
2. Open the in-page popup.
3. Review translation, dictionary definitions, and pronunciation.
4. Switch to AI for a deeper explanation.
5. Review or edit the automatically detected sentence context.
6. Use **Context Explain** or **Grammar & Nuance**.

This is ideal for reading articles, documentation, books, research papers, and online courses.

### 2. Search vocabulary manually

1. Click the extension icon.
2. Type a word, phrase, or idiom.
3. Use Dictionary mode for a fast structured lookup.
4. Switch to AI mode for deeper explanation.
5. Paste a sentence into Context when the query came from another source.
6. Ask for a contextual explanation without needing the word to exist on the current webpage.

This makes the product useful as a standalone vocabulary tool, not only as a page-selection helper.

## Why It Can Outperform Narrower Tools

The strongest competitive advantage is not one isolated feature. It is the complete workflow.

### Compared with basic dictionary extensions

Basic dictionary tools are excellent for quick definitions, but often stop there. Dictionary adds:

- Translation in the same result.
- Pronunciation fallback when audio is unavailable.
- AI explanations for difficult vocabulary.
- Grammar and nuance analysis.
- Context-aware meaning.
- Phrase and idiom recovery when structured dictionary data is incomplete.

### Compared with selection-only lookup tools

Selection-only tools are convenient when the word is visible on the page.
### Compared with generic AI chat tools

Generic chat tools are powerful but require users to design the workflow themselves. This extension gives language learners a purpose-built interface:

- Query and context are separate fields.
- Context is optional until a contextual action is selected.
- Grammar Nuance has its own dedicated intent.
- Phrase fallback is automatic for unsupported multi-word dictionary queries.
- The exact Context used is shown in the result.
- Results are presented inside the reading workflow.

### Compared with tools that hide configuration

Many focused extensions provide one fixed provider or one fixed explanation style. This product allows users to configure their AI endpoint, model, and prompt templates while keeping the default experience simple for non-technical users.

## Value for Different Users

### Language learners

Understand more than a translation. Learn pronunciation, grammatical function, tone, examples, and real contextual meaning in one place.

### Students and researchers

Read technical or academic material faster without repeatedly opening new tabs or losing the original sentence.

### Professionals

Clarify unfamiliar terminology, formal wording, idioms, and nuanced expressions while working inside documentation, reports, or business content.

### Teachers and tutors

Use the same word to demonstrate definition, translation, pronunciation, grammar, register, and contextual usage.

### Teams and education programs

Use configurable AI endpoints and prompts to adapt the explanation style to a team, course, or learning program. Organizations should review their own provider, privacy, and deployment requirements before adoption.

## Privacy and Control

The product is designed around explicit user action:

- Automatic page context is only a convenience prefill.
- Context is not sent during normal Dictionary or normal AI lookup.
- Context is submitted only when the user activates a contextual action.
- AI API keys are stored in local browser storage rather than synchronized settings.
- Context remains temporary for the active popup session rather than becoming a permanent history database.
- Lookup caching is short-lived and bounded.
- Audio blobs and audio metadata are not cached.

Users can disable AI, translation, dictionary lookup, triggers, and other features independently through Settings.

## Transparent Requirements

- Chrome or a compatible Manifest V3 environment.
- Network access for remote dictionary, translation, or AI providers.
- An AI API key and configured endpoint/model for AI features.
- Provider response quality depends on the selected dictionary, translation, and AI services.
- AI provider usage may incur charges from the user’s chosen provider.

## The Product Promise

Dictionary is built for people who want more than a quick definition, but less friction than a collection of disconnected tools.

**Look up the word. Hear it. Translate it. Understand it in context. Learn its grammar and nuance. Keep reading.**

If your current dictionary extension only returns a definition—or your AI tool makes you leave the page and rebuild the prompt every time—this product offers a faster, richer, and more controlled language-learning workflow.

## Call to Action

Install Dictionary, configure your language and optional AI settings, then test it on a real article or document:

1. Look up one unfamiliar word.
2. Try pronunciation.
3. Switch to AI.
4. Edit the context sentence.
5. Run Grammar Nuance or Context Explain.
6. Try a multi-word phrase or idiom.

The fastest way to see the difference is to use the complete workflow on the next word you do not understand.
