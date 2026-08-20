# Settings

## Triggers

- `selectionTriggerMode` (`icon`, `direct`, or `off`; default `icon`). Applies to both drag selection and double-clicking words.
- `postSelectionModifier` (`shift`, `alt`, or `ctrl`; default `shift`)
- `enableContextMenuTrigger` (Right-click selection lookup action; default `true`)

## Appearance and Sources

- `theme` (`system`, `light`, or `dark`; default `system`)
- `fontFamily` (`editorial` or `learner`; default `editorial`) — `editorial` preserves the classic serif reading aesthetic; `learner` switches definitions, examples, AI explanations, and controls to bundled Atkinson Hyperlegible to improve character disambiguation for ESL and language learners.
- `popupWidth` (default `500`, clamped `320`–`840`) — width of lookup popups
- `popupHeight` (default `600`, clamped `360`–`900`) — height of in-page lookup popups. The toolbar popup uses the same preference but caps its viewport at 580px because of Chrome’s action-popup limit.
- `defaultTab` (`dictionary` or `ai`). The last tab used during the current browser session is remembered separately in session storage and does not overwrite this setting.
- `enableTranslate`, `enableDictionary`, `enableAI`
- `disablePageContextExtraction` (default `false`) — prevents automatic extraction of surrounding page sentences for AI requests. Manually pasted context remains available for a single request.

The Dictionary tab requires translation and/or dictionary. The AI tab requires AI enabled. The default layout uses `500×600` px for a comfortable, scrolled workspace.

### Lexical Profile

- `enableLexicalProfile` (default `true`) — Enriches lookups with Word Family parts of speech, derivatives, word-formation notes, usage/register warnings, confusable pairs, learner mistakes, and collocations. Provider-first: dictionary sections, parts of speech, derivation/related-word fields, and register tags such as `[formal]`/`[slang]` are normalized automatically. AI-first fallback: AI prompts request a `<lexical-profile>` JSON block that is extracted and parsed safely for words whose dictionary sources lack family data. Disable to hide the Word Family grid, Word Formation, mistakes, collocations, warning callout, and to suppress the extra AI prompt contract.

Theme changes apply immediately to the options page and in-page card. Both lookup surfaces can be resized from their bottom-right handle; the resulting width and height are saved to `popupWidth` and `popupHeight`. Nonessential motion follows the operating system's reduced-motion preference.

The refreshed Calm Learning Studio layout keeps Dictionary and AI as the primary mode navigation, shows AI-only context controls only in AI mode, and uses a shared branded header/result hierarchy across the toolbar and in-page card. Source badges remain canonical attribution and the `data-font="learner"` option continues to select bundled Atkinson Hyperlegible.

## Translation

- `translateTargetLanguage` (Display name of target language selected from dropdown, e.g. `English`, `Vietnamese`. Standard codes like `en`, `vi`, `ja`, `ko`, `zh-CN` normalize to display names.)
- `customLanguages` (Comma-separated list of target language display names to show in the dropdown across options and lookup popups; defaults to `English, Vietnamese`. Add other languages here when needed.)
- `translateProvider` (`google` or `libretranslate`; default `google`)
- `libreTranslateBaseUrl` (LibreTranslate server URL; default `https://libretranslate.com`)
- `libreTranslateApiKey` (Optional LibreTranslate key, stored locally for self-hosted or authenticated servers)

Google Translate uses the public Google Translate endpoint. LibreTranslate can use the public service or a self-hosted server by changing `libreTranslateBaseUrl`. Each configured dictionary, translation, and AI provider has its own non-destructive **Test** action in Options. Tests use the current form values (including unsaved credentials) and report connection state plus measured latency; provider errors retain actionable HTTP/auth/rate-limit information when exposed by the backend.

## Dictionary

- `dictionaryProvider` (`free_dictionary`, `wiktionary`, `merriam_webster`, `wordnik`, or `words_api`; default `free_dictionary`)

The selected provider is used first. When it returns no data (`NotFoundError`), the runtime falls back through the remaining providers. After the initial result appears, non-primary providers are queried lazily to enrich definitions, examples, synonyms, and pronunciation data.

### API keys

Provider API keys are stored in `chrome.storage.local`, not synchronized settings:

- `dictionaryApiKey` — Merriam-Webster Collegiate API key.
- `wordnikApiKey` — Wordnik API key.
- `wordsApiKey` — WordsAPI RapidAPI key.
- `aiApiKey` — configured AI provider key.

The Free Dictionary API and Wiktionary REST API do not require API keys. If a key-backed provider is not configured, it may be skipped during enrichment; it does not prevent the default Free Dictionary lookup from working.

The former `google-dictionary` provider ID is no longer supported; use `free_dictionary`. Oxford is no longer available because it did not provide a suitable free tier for this extension.

## Pronunciation

- `pronunciationRate` (Playback speed, clamped `0.5`–`1.5`, default `0.95`. Applies to remote audio and speech fallback.)
- `pronunciationVoiceURI` (Preferred browser speech voice, chosen from a labeled Options select. Only applies to speech fallback, not remote dictionary audio.)
- Pronunciation results also expose a **Practice** control that uses browser speech recognition to score spoken attempts against the looked-up word. The latest score stays on the current card through enrichment rerenders and is cleared when the query or popup changes. Practice is omitted with an explanation when Chrome speech recognition is unavailable.

When primary dictionary data has audio but no IPA, enrichment can backfill phonetic text from another successful provider. The renderer prioritizes pronunciation entries that contain IPA.

## AI Settings

- `aiBaseUrl`
- `aiApiKey` (Saved in `chrome.storage.local`)
- `aiModel`
- `aiPromptTemplate` (Main AI explanation template. The built-in template uses `###` headings and reserves Word Family, word formation, usage warnings, confusables, learner mistakes, and collocations for the optional structured lexical profile.)
- `aiContextPromptTemplate` (Used only by **Context Explain**; it remains a compact Markdown-only contextual answer.)
- `aiGrammarPromptTemplate` (Used by **Grammar & Nuance**; it can include an optional structured lexical profile.)
- `aiPhraseExplorerPromptTemplate` (Used by **Phrase & Collocations**; collocations and learner mistakes use structured profile cards when reliable data is available.)
- `aiSentencePromptTemplate` (Used by **Sentence Breakdown**. It requests one structured JSON object and does not request a lexical-profile block.)

Only Main AI, Grammar & Nuance, and Phrase & Collocations request lexical-profile data. Context Explain, Sentence Breakdown, and internal phrase fallback responses remain focused on their primary output format. Version 6 updates built-in templates to focused, complementary outlines without duplicated dictionary sections; custom templates are never overwritten.
- `enableAiPreload` (Preload the normal AI lookup before switching tabs; does not submit page context)

### Prompt Variables

- `{{str}}` — selected word or phrase
- `{{text}}` — full selection text
- `{{sentence}}` — supplied context sentence when present; otherwise the selected text
- `{{word_count}}` — selection word count (available for custom templates; not used by the built-in templates)
- `{{targetLang}}` — configured target language
- `{{context}}` — manually supplied context, or the sentence-level page prefill accepted by the user

The Context field is available only in AI mode. It is retained in the current popup session, is editable, and is not stored as a setting. An empty Context value prevents Context Explain and Grammar Nuance from sending a request. Sentence Breakdown allows a full-sentence query without additional Context.

The in-page AI controls show a Context pill: **🔒 Context: Bounded Sentence** when automatic sentence context may be used, or **🚫 Context: None** when automatic extraction is disabled.

The Options page can restore one prompt with **Restore default** or all five with **Reset AI prompts**. Both still require Save Settings to persist. Before saving, the options page warns when a custom template omits variables required by its intent (for example, `{{context}}` for contextual explanation or `{{sentence}}` for Sentence Breakdown).

**Export settings** downloads a JSON file of non-secret preferences and prompt templates. **Import settings** replaces those public values after confirmation. API keys are never exported and are ignored if present in an import file. Import does not run schema prompt migrations; the imported values are saved as provided after normalization.

## Storage Note

AI, Merriam-Webster, Wordnik, WordsAPI, and LibreTranslate API keys stay in `chrome.storage.local`. Non-secret preferences remain eligible for sync storage.
