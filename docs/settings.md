# Settings Reference

This document serves as the complete configuration reference for **Dictionary**. It details all customizable preferences, storage partitioning architecture, default values, validation rules, AI prompt variables, and schema migration contracts up to schema version 12.

---

## 1. Storage Partitioning & Security Architecture

To guarantee that private credentials can never leak across browser sync channels or into untrusted webpage content scripts, the extension enforces a strict storage partition:

```text
┌────────────────────────────────────────────────────────────────────────┐
│                   chrome.storage.sync (Public Preferences)             │
├────────────────────────────────────────────────────────────────────────┤
│ • theme, fontFamily, defaultTab, popupWidth, popupHeight               │
│ • selectionTriggerMode, postSelectionModifier, enableContextMenuTrigger│
│ • translateTargetLanguage, customLanguages, translateProvider          │
│ • dictionaryProvider, libreTranslateBaseUrl                            │
│ • enableTranslate, enableDictionary, enableLexicalProfile, enableAI    │
│ • enableAiPreload, enablePhraseFallback, disablePageContextExtraction  │
│ • pausedHostnames                                                      │
│ • pronunciationRate, pronunciationVoiceURI                             │
│ • aiBaseUrl, aiModel (gemini-3.5-flash-lite), and all AI Prompts       │
│ • hasAiApiKey (Public boolean flag indicating presence of an API key)  │
│ ➔ Synced across your signed-in Chrome devices.                        │
│ ➔ Accessible by Background, Options, Toolbar Popup, and Content Script.│
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
┌──────────────────────────────────┴─────────────────────────────────────┐
│                   chrome.storage.local (Isolated Secrets)              │
├────────────────────────────────────────────────────────────────────────┤
│ • aiApiKey (Gemini / OpenAI API Key)                                   │
│ • libreTranslateApiKey (LibreTranslate Private Key)                    │
│ • hasAiApiKey (Mirrored local boolean flag)                            │
│ ➔ NEVER synced to the cloud. Stored strictly on this physical device.  │
│ ➔ ISOLATED TO BACKGROUND SERVICE WORKER AND SECURE OPTIONS MODAL.      │
│ ➔ loadPublicSettings() physically excludes these keys from UI memory.  │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
┌──────────────────────────────────┴─────────────────────────────────────┐
│                  chrome.storage.session (Transient Runtime State)      │
├────────────────────────────────────────────────────────────────────────┤
│ • dictionaryHelperLastTab (Active tab memory per browsing session)     │
│ • enrich_* (Phase 2 Lazy Enrichment cache, TTL: 10 minutes)            │
│ ➔ Automatically cleared when the browser closes.                       │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Configuration Options by Section

### Section 01 · Lookup Triggers

| Setting Key | Type | Allowed Values / Range | Default | Description |
|---|---|---|---|---|
| `selectionTriggerMode` | `string` | `"icon"`, `"direct"`, `"off"` | `"icon"` | Defines what happens when text is highlighted or double-clicked on a webpage. `"icon"` renders a floating button; `"direct"` opens the card immediately; `"off"` restricts lookups to hotkeys and context menus. |
| `postSelectionModifier` | `string` | `"shift"`, `"alt"`, `"ctrl"` | `"shift"` | Modifier key tapped once after text selection to immediately trigger the in-page lookup card. |
| `enableContextMenuTrigger` | `boolean` | `true`, `false` | `true` | When enabled, registers the **"Look up in Dictionary"** action in Chrome's right-click context menu. |
| `pausedHostnames` | `string[]` | Array of hostnames, max 100 | `[]` | In-page selection, double-click, icon, and post-selection key stay off on these hosts. Toolbar search, keyboard command, and context menu still work. |

---

### Section 02 · Appearance & Display Layout

| Setting Key | Type | Allowed Values / Range | Default | Description |
|---|---|---|---|---|
| `theme` | `string` | `"system"`, `"light"`, `"dark"` | `"dark"` | Visual surface theme. `"system"` automatically mirrors your operating system light/dark preference. |
| `fontFamily` | `string` | `"editorial"`, `"learner"` | `"learner"` | Reading typography. `"editorial"` applies classic serif styling; `"learner"` switches definitions, examples, and controls to bundled Atkinson Hyperlegible for enhanced letter disambiguation. |
| `defaultTab` | `string` | `"dictionary"`, `"ai_assistant"` | `"dictionary"` | Initial tab selected when opening a new lookup popup session. |
| `popupWidth` | `number` | `360` to `1000` (pixels) | `620` | Preferred width of in-page cards. Automatically updated when resizing via the bottom-right drag handle. |
| `popupHeight` | `number` | `380` to `900` (pixels) | `720` | Preferred height of in-page cards. Automatically updated when resizing via the bottom-right drag handle. |

---

### Section 03 · Sources, Translation & Pronunciation

| Setting Key | Type | Storage | Default | Description |
|---|---|---|---|---|
| `enableDictionary` | `boolean` | `sync` | `true` | Displays structured dictionary definitions in the Dictionary tab. |
| `dictionaryProvider` | `string` | `sync` | `"free_dictionary"` | Primary dictionary backend: `"free_dictionary"`, `"wiktionary"`, `"datamuse"`, `"wikipedia"`, `"urban_dictionary"`, or `"google_translate"`. |
| `enableTranslate` | `boolean` | `sync` | `true` | Shows translation card alongside dictionary definitions in the Dictionary tab. |
| `translateProvider` | `string` | `sync` | `"google"` | Translation service: `"google"` (Google Translate), `"libretranslate"`, or `"mymemory"`. |
| `translateTargetLanguage`| `string`| `sync` | `"Vietnamese"` | Target language display name (e.g. `Vietnamese`, `English`, `Japanese`, `Chinese`, `Korean`, `French`, `German`, `Spanish`). |
| `customLanguages` | `string` | `sync` | `"Vietnamese, English, Chinese, Japanese, Korean, French, German, Spanish"` | Comma-separated list of target language display names to populate in dropdowns. |
| `libreTranslateBaseUrl` | `string` | `sync` | `"https://libretranslate.com"` | Server endpoint for LibreTranslate queries. |
| `libreTranslateApiKey` | `string` | `local` | `""` | Optional API key for authenticated LibreTranslate servers. |
| `enableLexicalProfile` | `boolean` | `sync` | `true` | Enriches lookups with Word Family chips, Word Formation tags, Usage warnings, Common Learner mistakes, and Collocations. |
| `pronunciationRate` | `number` | `sync` | `0.95` | Playback speed for dictionary audio MP3s and speech synthesis fallback (`0.5` to `1.5`). |
| `pronunciationVoiceURI` | `string` | `sync` | `""` | Preferred operating system voice for browser speech synthesis fallback. |

---

### Section 04 · AI Explanations & Prompt Templates

| Setting Key | Type | Storage | Default | Description |
|---|---|---|---|---|
| `enableAI` | `boolean` | `sync` | `true` | Enables the AI Assistant tab and AI phrase fallback capabilities. |
| `enablePhraseFallback` | `boolean` | `sync` | `true` | When AI is on, Dictionary mode calls AI phrase fallback to explain multi-word queries that no dictionary backend defined. |
| `aiProvider` | `string` | `sync` | `"gemini"` | AI engine: `"gemini"` (Google Gemini, default) or `"openai"` (OpenAI Standard: Ollama, ChatGPT, local proxy). |
| `aiBaseUrl` | `string` | `sync` | Gemini: `"https://generativelanguage.googleapis.com/v1beta/openai"` · OpenAI: `"http://localhost:20128/v1"` | Endpoint URL. Gemini uses native REST; OpenAI Standard POSTs to `{aiBaseUrl}/chat/completions`. |
| `aiApiKey` | `string` | `local` | `""` | Private API key. Required for Gemini. Optional for local OpenAI Standard (Ollama / proxy). |
| `hasAiApiKey` | `boolean` | `sync & local`| `false` | Boolean indicator reflecting key presence without leaking the key string. |
| `aiModel` | `string` | `sync` | Gemini: `"gemini-3.5-flash-lite"` · OpenAI: `""` | Model identifier. Gemini defaults to `gemini-3.5-flash-lite`. OpenAI Standard has no preset — the user types the model name their server expects. |
| `enableAiPreload` | `boolean` | `sync` | `true` | Speculatively preloads Main AI in background after 600ms on Dictionary tab, then warms follow-up intents sequentially when visiting the AI tab. |
| `disablePageContextExtraction`| `boolean`| `sync`| `false` | When `true`, suppresses automatic extraction of surrounding webpage sentences. Manual context entry remains available. |
| `aiPromptTemplate` | `string` | `sync` | *(Built-in)* | Prompt template for **Main AI** (`default`). |
| `aiContextPromptTemplate` | `string` | `sync` | *(Built-in)* | Prompt template for **Context Explain** (`explain_in_context`). |
| `aiGrammarPromptTemplate` | `string` | `sync` | *(Built-in)* | Prompt template for **Grammar & Nuance** (`grammar`). |
| `aiPhraseExplorerPromptTemplate`| `string`| `sync`| *(Built-in)* | Prompt template for **Phrase & Collocations** (`collocations`). |
| `aiSentencePromptTemplate` | `string` | `sync` | *(Built-in)* | Prompt template for **Sentence Breakdown** (`sentence_breakdown`). |
| `aiComparePromptTemplate` | `string` | `sync` | *(Built-in)* | Prompt template for **Compare Confusables** (`confusables`). |
| `aiRephrasePromptTemplate` | `string` | `sync` | *(Built-in)* | Prompt template for **Rephrase** (`rephrase`). |

---

## 3. AI Prompt Variables & Sandboxing

Custom prompt templates support the following interpolation variables:

| Variable | Replacement Content | Example Value |
|---|---|---|
| `{{str}}` | Selected word or search query. | `"evaluate"` |
| `{{text}}` | Full selection text. | `"evaluating the evidence"` |
| `{{sentence}}` | Extracted context sentence when present; otherwise the query text. | `"Scientists are evaluating ancient rocks."` |
| `{{context}}` | The extracted surrounding sentence or user-provided manual context. | `"Scientists are evaluating ancient rocks."` |
| `{{targetLang}}` | Configured translation target language name. | `"Vietnamese"` |
| `{{word_count}}` | Number of words in the query. | `1` |

### Prompt Sandboxing & Injection Protection
To prevent webpage text from injecting prompt-override instructions, the background worker appends a sandboxed XML input contract block to every outbound prompt:
```xml
<target>{{str}}</target>
<context>{{context}}</context>
<target-language>{{targetLang}}</target-language>
```
The same contract also restates the shared language policy: instructional explanations, definitions, grammar analyses, usage notes, and etymologies are written in English; `{{targetLang}}` is used only for translations, bilingual glosses, or when a section explicitly requests notes in that language (for example Rephrase).
When `enableLexicalProfile` is active, prompts for Grammar and Collocations append instructions requesting a `<lexical-profile>` JSON block, which the runtime extracts, validates, and strips before rendering Markdown.

---

## 4. Settings Export, Import, and Reset

### Exporting Settings
Click **Export settings** in the Settings modal to download a sanitized `dictionary-settings-<timestamp>.json` file:
```json
{
  "version": 12,
  "exportedAt": "2025-02-23T12:00:00.000Z",
  "settings": {
    "theme": "dark",
    "fontFamily": "learner",
    "selectionTriggerMode": "icon",
    "popupWidth": 620,
    "popupHeight": 720,
    "translateTargetLanguage": "Vietnamese",
    "dictionaryProvider": "free_dictionary",
    "aiModel": "gemini-3.5-flash-lite"
  }
}
```
*Note: API keys (`SECRET_KEYS`) are strictly omitted from exported files.*

### Importing Settings
Click **Import settings** and select a previously exported JSON file. The importer validates schema structure, restores public preferences, and ignores any secret keys if present.

### Resetting Prompts
- In Settings → Prompts tab, click **Restore default** below any prompt textarea to restore that template.
- Click **Save** to persist your changes.

---

## 5. Schema Migration History

The extension manages automatic schema migrations via `SETTINGS_SCHEMA_VERSION = 12`:

- **Schema v1 → v2:** Upgraded Sentence Breakdown template to structural JSON without CEFR noise.
- **Schema v3:** Purged legacy collocations templates and obsolete local vocabulary keys.
- **Schema v4 → v5:** Separated structured Lexical Profile tags from Markdown heading duplication.
- **Schema v6:** Aligned built-in Main, Context, and Grammar prompts to lean, non-duplicating intent outlines.
- **Schema v7:** Added sense-aware target language glosses to Translation & Meaning.
- **Schema v8:** Enriched bilingual example translations and phrase core meaning target-language equivalents.
- **Schema v9:** Upgraded Main AI for structured sense matrices with contextual relevance flags, Context Explain for direct substitutions/nuance loss, and Grammar for syntactic slots; added Compare Confusables and Rephrase prompt templates.
- **Schema v10:** Added `pausedHostnames` and `enablePhraseFallback`. Fresh installs default `enableAI` to `false`. Existing installs (schema ≥ 1) that never stored `enableAI` keep it enabled.
- **Schema v11:** Internal increment with no new user-facing setting keys. Legacy commercial dictionary keys (`dictionaryApiKey`, `wordnikApiKey`, `wordsApiKey`) are stripped from local storage on load.
- **Schema v12:** Introduces `hasAiApiKey` as a public/local boolean so UI layers know whether an API key exists without reading the secret. Default Gemini model is `gemini-3.5-flash-lite`.

*(Custom prompt modifications are detected and strictly preserved during all schema upgrades).*
