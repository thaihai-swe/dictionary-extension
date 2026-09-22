# Firefox AMO Listing Details

Use this document when submitting **Dictionary & AI Learning Assistant** to the
[Firefox Add-ons Developer Hub](https://addons.mozilla.org/developers/).

The upload package is `dictionary-assistant.xpi`, generated with:

```bash
npm run build:xpi
```

## 1. Name

**Dictionary & AI Learning Assistant**

## 2. Summary

> Look up words and phrases while browsing with definitions, translations, pronunciation, and contextual AI learning tools.

## 3. Description

> Dictionary & AI Learning Assistant is a page-native language-learning companion for readers, students, and professionals.
>
> Select text, double-click a word, use the context menu or keyboard shortcut, or type a query in the toolbar popup. Get definitions from multiple dictionary sources, translations, pronunciation audio, and structured vocabulary information without leaving the page.
>
> The Dictionary tab progressively combines definitions, examples, synonyms, antonyms, phonetics, word families, collocations, usage notes, and learner mistakes. The AI Assistant provides focused tools for meaning in context, grammar and nuance, phrase patterns, sentence breakdowns, confusable words, and rephrasing. AI is optional and can use Gemini or a user-configured OpenAI-compatible endpoint.
>
> The extension uses exact selected text and, for contextual AI actions, only the surrounding sentence rather than the whole page. The context is capped at 800 characters. API keys are stored in extension-managed local storage and are not exposed to webpage content scripts. Lookup results and settings can be kept locally, with cache persistence and clearing controls in Settings.
>
> Pronunciation playback works in Firefox through provider audio and browser speech synthesis. Microphone-based Speech Practice currently requires a browser Speech Recognition API and is unavailable in Firefox.

## 4. Categories

- **Primary category:** Language Support
- **Secondary category:** Search Tools

## 5. License

- **Current repository status:** `[UNKNOWN]` — no `LICENSE` file is present.
- **AMO selection:** Select **All Rights Reserved** only if that reflects the copyright holder's intent. If the project is intended to be open source, add the matching license file before submitting and select that license instead.

Do not select MIT, GPL, Apache, or another open-source license without adding and applying that license to the repository.

## 6. Support contact

- **Support website:** https://github.com/thaihai-swe/dictionary-extension
- **Support email:** `[UNKNOWN]` — add a monitored email address before submission if AMO requires one.

Recommended reviewer and user issue location:

https://github.com/thaihai-swe/dictionary-extension/issues

## 7. Privacy policy

### AMO field

**Privacy policy URL:** Publish this document, or the privacy-policy section below as a standalone public page, before submitting. The final public URL is currently `[UNKNOWN]`.

### Privacy policy draft

#### What this extension does

Dictionary & AI Learning Assistant provides in-page dictionary lookup, translation,
pronunciation, and optional AI language-learning tools.

#### Information sent to external services

When a user performs a lookup, the extension sends the typed or selected query to
the configured dictionary or translation provider. The request may include the
selected word, phrase, or sentence because that text is required to return the
requested result.

When a user enables or invokes a contextual AI feature, the extension may send the
selected text and its surrounding sentence to the configured AI provider. The
surrounding context is limited to 800 characters. The rest of the webpage is not
sent as part of a contextual lookup.

The selected provider's own privacy policy governs how that provider handles
requests after receiving them. Users can choose among supported providers,
configure a compatible endpoint, disable translation or AI features, and clear
locally cached results.

#### Information stored locally

The extension stores settings and, when enabled, lookup results in Firefox's
extension-managed storage. User-provided API keys are stored in local extension
storage and are not included in synchronized public settings or exposed to
webpage content scripts. Users can disable persistent lookup caching and clear
stored results from Settings.

#### Tracking and user accounts

The extension does not require a developer-owned account and does not record
reading history or track visited URLs. It does not operate a developer-owned
analytics service. External provider requests are made only as needed for the
features selected by the user or enabled in Settings.

#### Contact

For support or privacy questions, use the project repository:

https://github.com/thaihai-swe/dictionary-extension/issues

#### Changes

This policy may be updated when the extension's data handling changes. The
effective date should be added before publication: `[UNKNOWN]`.

## Submission checklist

- [ ] Confirm the copyright holder and license selection.
- [ ] Add a monitored support email address.
- [ ] Publish the privacy policy at a stable public URL and paste that URL into AMO.
- [ ] Upload `dictionary-assistant.xpi`.
- [ ] Submit the source package and build instructions because the extension uses Vite, React, TypeScript, bundling, and minification.
- [ ] Add reviewer notes describing how to test dictionary lookup, translation, and optional AI features.
