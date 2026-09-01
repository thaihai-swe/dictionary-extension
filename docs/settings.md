# Settings Reference

This document serves as the complete configuration reference for **Dictionary**. It details all customizable preferences, storage partitioning architecture, default values, validation rules, AI prompt variables, and schema migration contracts.

---

## 1. Storage Partitioning & Security Architecture

To guarantee that private credentials can never leak across browser sync channels or into untrusted webpage content scripts, the extension enforces a three-tier storage partition:

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
│ • aiBaseUrl, aiModel, and all 5 AI Prompt Templates                    │
│ ➔ Synced across your signed-in Chrome devices.                        │
│ ➔ Accessible by Background, Options, Toolbar Popup, and Content Script.│
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
┌──────────────────────────────────┴─────────────────────────────────────┐
│                   chrome.storage.local (Isolated Secrets)              │
├────────────────────────────────────────────────────────────────────────┤
│ • aiApiKey (Gemini / OpenAI API Key)                                   │
│ • libreTranslateApiKey (LibreTranslate Private Key)                    │
│ ➔ NEVER synced to the cloud. Stored strictly on this physical machine. │
│ ➔ ISOLATED TO BACKGROUND SERVICE WORKER ONLY.                          │
│ ➔ getUiSettings() physically excludes these keys from UI contexts.     │
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
| `pausedHostnames` | `string[]` | Hostnames, max 100 | `[]` | In-page selection, double-click, icon, and post-selection key stay off on these hosts. Toolbar search, Alt+L (`lookup-selection`), and the context menu still work. |

The keyboard command **Look up the selected text** (`lookup-selection`, suggested `Alt+L`) is registered in `manifest.json`. Rebind it in `chrome://extensions/shortcuts`. It does not replace `postSelectionModifier`.

---

### Section 02 · Appearance & Display Layout

| Setting Key | Type | Allowed Values / Range | Default | Description |
|---|---|---|---|---|
| `theme` | `string` | `"system"`, `"light"`, `"dark"` | `"system"` | Visual surface theme. `"system"` automatically mirrors your operating system light/dark preference. |
| `fontFamily` | `string` | `"editorial"`, `"learner"` | `"editorial"` | Reading typography. `"editorial"` applies classic serif styling; `"learner"` switches definitions, examples, and controls to bundled Atkinson Hyperlegible for enhanced letter disambiguation. |
| `defaultTab` | `string` | `"dictionary"`, `"ai"` | `"dictionary"` | Initial tab selected when opening a new lookup popup session. *(Active tab switches are remembered transiently in session storage).* |
| `popupWidth` | `number` | `320` to `1000` (pixels) | `620` | Preferred width of lookup cards. Automatically updated when resizing in-page cards via the bottom-right drag handle. |
| `popupHeight` | `number` | `360` to `1000` (pixels) | `720` | Preferred height of in-page lookup cards. *(The toolbar popup caps its vertical display at 580px due to Chrome action-popup limits).* |

---

### Section 03 · Sources, Translation & Pronunciation

| Setting Key | Type | Storage | Default | Description |
|---|---|---|---|---|
| `enableDictionary` | `boolean` | `sync` | `true` | Displays structured dictionary definitions in the Dictionary tab. |
| `dictionaryProvider` | `string` | `sync` | `"free_dictionary"` | Primary dictionary backend: `"free_dictionary"`, `"wiktionary"`, `"datamuse"`, `"wikipedia"`, `"urban_dictionary"`, or `"google_translate"`. |
| `enableTranslate` | `boolean` | `sync` | `true` | Shows translation card alongside dictionary definitions in the Dictionary tab. |
| `translateProvider` | `string` | `sync` | `"google"` | Translation service: `"google"` (Google Translate) or `"libretranslate"`. |
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
| `enableAI` | `boolean` | `sync` | `false` | Enables the AI tab. Fresh installs default off until a key is saved. Existing installs that never stored this key keep AI on (schema v10). |
| `enablePhraseFallback` | `boolean` | `sync` | `true` | When AI is on, Dictionary mode may call AI to explain a phrase that no dictionary backend defined. |
| `aiBaseUrl` | `string` | `sync` | `https://generativelanguage...` | Endpoint URL. Points to Google Gemini or any OpenAI-compatible endpoint (`/v1/chat/completions`). |
| `aiApiKey` | `string` | `local` | `""` | Private API key for Google Gemini or your custom AI provider. |
| `aiModel` | `string` | `sync` | `"gemini-3.5-flash-lite"` | Model identifier (e.g. `gemini-3.5-flash-lite`, `gpt-4o-mini`, `deepseek-chat`, `llama3`). |
| `enableAiPreload` | `boolean` | `sync` | `true` | Asynchronously preloads Main AI explanations, then automatically preloads Context Explain, Grammar & Nuance, Phrase & Collocations, and Sentence Breakdown when the main result completes. |
| `disablePageContextExtraction`| `boolean`| `sync`| `false` | When `true`, suppresses automatic extraction of surrounding webpage sentences. Manual context entry remains available. |
| `aiPromptTemplate` | `string` | `sync` | *(Built-in)* | Prompt template for **Main AI Explanation**. |
| `aiContextPromptTemplate` | `string` | `sync` | *(Built-in)* | Prompt template for **Context Explain** (requires `{{context}}`). |
| `aiGrammarPromptTemplate` | `string` | `sync` | *(Built-in)* | Prompt template for **Grammar & Nuance** (requires `{{context}}`). |
| `aiPhraseExplorerPromptTemplate`| `string`| `sync`| *(Built-in)* | Prompt template for **Phrase & Collocations**. |
| `aiSentencePromptTemplate` | `string` | `sync` | *(Built-in)* | Prompt template for **Sentence Breakdown** (structured JSON output; requires `{{sentence}}`). |
| `aiComparePromptTemplate` | `string` | `sync` | *(Built-in)* | Prompt template for **Compare Confusables** (distinction, matrix, minimal pairs). |
| `aiRephrasePromptTemplate` | `string` | `sync` | *(Built-in)* | Prompt template for **Rephrase** (simplified, formal, idiomatic). |

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
When `enableLexicalProfile` is active, prompts for Main AI, Grammar & Nuance, and Phrase Explorer append instructions requesting an optional `<lexical-profile>` JSON block, which the runtime extracts, validates, and strips before rendering Markdown.

---

## 4. Settings Export, Import, and Reset

### Exporting Settings
Click **Export settings** in Options to download a sanitized `dictionary-settings-<timestamp>.json` file.
```json
{
  "version": 8,
  "exportedAt": "2025-02-23T12:00:00.000Z",
  "settings": {
    "theme": "system",
    "fontFamily": "editorial",
    "selectionTriggerMode": "icon",
    "popupWidth": 620,
    "popupHeight": 720,
    "translateTargetLanguage": "English",
    "dictionaryProvider": "free_dictionary",
    "aiModel": "gemini-3.5-flash-lite"
  }
}
```
*Note: API keys are strictly omitted from exported files.*

### Importing Settings
Click **Import settings** and select a previously exported JSON file. The importer validates schema structure, restores public preferences, and ignores any secret keys if present.

### Resetting Prompts
- **Restore Default (Single Prompt):** Click the **Restore default** button directly below any of the 5 prompt textareas.
- **Reset AI Prompts (All Prompts):** Click **Reset AI prompts** in the bottom action bar to restore all 5 prompt templates.
- *Click **Save settings** to persist prompt resets.*

---

## 5. Schema Migration History

The extension manages automatic schema migrations via `SETTINGS_SCHEMA_VERSION = 10`:

- **Schema v1 → v2:** Upgraded Sentence Breakdown template to structural JSON without CEFR noise.
- **Schema v3:** Purged legacy collocations templates and obsolete local vocabulary keys.
- **Schema v4 → v5:** Separated structured Lexical Profile tags from Markdown heading duplication.
- **Schema v6:** Aligned built-in Main, Context, and Grammar prompts to lean, non-duplicating intent outlines.
- **Schema v7:** Added sense-aware target language glosses to Translation & Meaning.
- **Schema v8:** Enriched bilingual example translations and phrase core meaning target-language equivalents.
- **Schema v9:** Upgraded Main AI for structured sense matrices with contextual relevance flags, Context Explain for direct substitutions/nuance loss, and Grammar for syntactic slots; added Compare Confusables and Rephrase prompt templates.
- **Schema v10:** Adds `pausedHostnames` and `enablePhraseFallback`. Fresh installs default `enableAI` to `false`. Existing installs (schema ≥ 1) that never stored `enableAI` keep it enabled.
*(Custom prompt modifications are detected and strictly preserved during all schema upgrades).*
