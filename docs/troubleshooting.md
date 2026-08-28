# Troubleshooting Guide

This guide provides actionable solutions for common issues across extension reloads, network providers, pronunciation practice, context extraction, and browser security boundaries.

---

## 1. Extension Reload & Context Invalidation

### Symptom: `Extension context invalidated` or clicking triggers does nothing after updating code.
- **Cause:** When you reload an unpacked extension in `chrome://extensions`, the background service worker is replaced, but existing webpage tabs still hold references to the old, disconnected content script instance.
- **Solution:**
  1. Refresh all open webpage tabs where you want to test the extension.
  2. The content script automatically catches disconnection errors and displays an inline top banner: **"Extension reloaded — Refresh this tab."**
  3. Reloading the webpage re-injects the current content script.

---

## 2. In-Page Popups & Selection Triggers

### Symptom: Highlighting text or double-clicking does not open the lookup card or show the floating icon.
- **Check 1 — Editable Form Fields:** Selection triggers are intentionally disabled inside `<input>`, `<textarea>`, and elements with `contenteditable="true"` to avoid disrupting typing. Use the right-click context menu or toolbar popup instead.
- **Check 2 — Trigger Mode Setting:** Open Settings (click the ⚙️ Settings button in the header) and verify **Text selection & double-click lookup behavior** is set to `Floating lookup icon` or `Open popup immediately on selection` (not `Off`).
- **Check 3 — Post-Selection Modifier Key:** If using the hotkey trigger, confirm you tap the configured key (`Shift`, `Alt`, or `Ctrl`) once immediately *after* highlighting the text.
- **Check 4 — Viewport Positioning & Screen Edges:** If text is at the extreme edge of the screen, the positioning engine flips the card. Ensure browser zoom or high-DPI scaling is not hiding the card off-screen.
- **Check 5 — Paused site:** The toolbar **Pause site** button or Settings → paused hostnames turns off in-page icons on that host. Toolbar search, Alt+L, and the context menu still work.
- **Check 6 — Iframes:** Content scripts load in the top frame. A same-origin iframe injects on first selection. Cross-origin iframes cannot be read; use the toolbar or context menu.
- **Check 7 — Keyboard command:** Highlight text and press Alt+L (rebind in `chrome://extensions/shortcuts`).

---

## 3. AI Requests & Context Errors

### Symptom: AI generation fails with error toasts or missing field alerts.
- **Check 1 — Required Settings:** Verify in Settings that **Enable AI provider** is checked (fresh installs default this off), and all three core fields are populated:
  - **AI API base URL:** e.g. `https://generativelanguage.googleapis.com/v1beta/openai/` or your custom endpoint.
  - **AI API key:** `sk-...` or Google Gemini API key.
  - **AI model name:** e.g. `gemini-3.5-flash-lite`, `gpt-4o-mini`, `deepseek-chat`, or `llama3`.
- **Check 2 — Test Connection Action:** In Settings, click **Test AI connection** to run a non-destructive latency and authentication check.
- **Check 3 — Gemini Native vs. OpenAI-Compatible:**
  - If using Google Gemini via `generativelanguage.googleapis.com`, the extension automatically uses the native Gemini REST protocol with query key authentication.
  - If using OpenAI, Groq, Ollama, or OpenRouter, the extension calls `/chat/completions` with `Bearer <key>` headers.
- **Check 4 — Host Permission Prompts:** If using custom self-hosted base URLs (e.g. `http://localhost:11434` or custom domain proxies), ensure you accepted the browser's dynamic origin permission prompt when saving settings.

### Symptom: Inline alert: `"Please enter or paste the sentence containing this word."`
- **Cause:** **Context Explain** and **Grammar & Nuance** strictly require sentence context to provide meaningful analysis.
- **Fix:** If automatic sentence extraction was disabled or found no sentence on the active page, paste the sentence directly into the editable Context textarea before clicking the action.
- *Note: Sentence Breakdown accepts a full-sentence query without needing extra text in the Context box.*

---

## 4. Multi-Source Dictionary & Enrichment

### Symptom: No definitions found for an inflected word (e.g. `went`, `taking care of`).
- **Resolution:** The extension runs automatic English lemmatization and phrasal canonicalization fallback. If all exact lookups return `NotFoundError`, it retries root stems (`went` → `go`, `taking care of` → `take care of`) and displays a subtitle notice: `Showing definitions for root: <stem>`.
- If an obscure idiom has no dictionary definitions across all 5 providers, Dictionary mode invokes **AI Phrase Fallback** when both AI and **Use AI when a phrase has no dictionary definition** are enabled.
- A primary provider with no API key is skipped. Transient 5xx/timeout from a free provider continues to the next free provider. An invalid key still fails that lookup.

### Symptom: Key-backed providers (Merriam-Webster, Wordnik, WordsAPI) don't enrich results.
- **Check 1 — API Key Configuration:**
  - **Merriam-Webster:** Requires a free Collegiate API key from [dictionaryapi.com](https://dictionaryapi.com/register).
  - **Wordnik:** Requires a free developer key from [developer.wordnik.com](https://developer.wordnik.com/).
  - **WordsAPI:** Requires a RapidAPI key from [wordsapi.com](https://www.wordsapi.com/).
- **Check 2 — Enrichment Diagnostics:** In Settings, click **Test Merriam-Webster**, **Test Wordnik**, or **Test WordsAPI** to verify credentials and check quota status.
- **Check 3 — Graceful Degradation:** When API keys are missing or rate limits occur, enrichment silently skips those providers without breaking the displayed Free Dictionary or Wiktionary results.

### Symptom: A source badge appears, but no new definitions were added.
- **Explanation:** `sourceBadges` tracks every provider that returned valid data. If provider definitions duplicate existing entries, the duplicate text is suppressed to keep the card scannable, while the badge accurately credits the provider for verifying the word.

---

## 5. Neural Translation & LibreTranslate

### Symptom: Translation card shows an error or fails to load.
- **Google Translate:** Operates out of the box without keys. Check network connectivity if requests fail.
- **LibreTranslate:**
  - If using the public server (`https://libretranslate.com`), requests may hit rate limits during peak hours.
  - If using a self-hosted instance, verify your **LibreTranslate base URL** (e.g. `https://translate.example.com`) and ensure any required API key is entered.
  - In Settings, click **Test LibreTranslate** to inspect connection latency and HTTP response status.

---

## 6. Pronunciation & Speech Practice

### Symptom: Audio button plays browser speech instead of real human voice.
- **Explanation:** Pronunciation uses this keyless chain: `api.dictionaryapi.dev` MP3 first (when the lookup provided one) → Google Translate TTS (`translate.googleapis.com`, no API key) → browser `window.speechSynthesis`. A 502 from the dictionary CDN does not block the later fallbacks.
- **Speech Voice Selection:** Open Settings → **Preferred speech voice** to choose your favorite installed operating system voice.
- **Speed Adjustment:** Set **Pronunciation speed** (clamped between `0.5x` and `1.5x`).

### Symptom: Practice button (`🎙️ Practice`) is missing or fails with an error.
- **Check 1 — Browser Support:** The Speech Practice Evaluator requires the Web Speech Recognition API (`webkitSpeechRecognition`), natively available in Chrome. Other Chromium derivatives without speech binaries will display an explanatory note.
- **Check 2 — Microphone Permissions:** Ensure microphone permissions are granted for the active tab (check the camera/mic icon in Chrome's address bar).
- **Check 3 — Ambient Noise:** If the recording times out without hearing speech, click **Practice** again and speak clearly when the animated pulse ring displays `Listening…`.

---

## 7. PDFs, Web Readers, and Local Files

### Symptom: Selection triggers do not appear on PDF files or local documents.
- **Local `file://` Documents:** Open `chrome://extensions`, locate **Dictionary**, click **Details**, and toggle on **Allow access to file URLs**. Reload the file tab.
- **Online HTML5 PDFs:** Ensure the PDF reader exposes a selectable DOM text layer (e.g. PDF.js viewer). If selectable, exact sentence Range extraction operates automatically.
- **Chrome Built-in PDF Viewer Frame:** Chrome strictly isolates its proprietary internal PDF viewer frame from extension content scripts. Right-click the highlighted word and select **Look up in Dictionary** from the context menu, or type the word in the toolbar popup.
- **Browser-Owned Pages:** Pages starting with `chrome://`, `chrome-extension://`, or the Chrome Web Store cannot be injected with content scripts by browser security policy. Use the toolbar popup for vocabulary queries while on these pages.

---

## 8. Settings Import, Export, and Prompt Reset

### Symptom: Custom AI prompts are producing unexpected output.
- **Reset Individual Prompt:** In Settings, click **Restore default** below any prompt textarea to restore that single template to factory specifications, then click **Save settings**.
- **Reset All Prompts:** Click **Reset AI prompts** in the bottom action bar to restore all 5 templates (Main AI, Context, Grammar, Phrase Explorer, Sentence Breakdown), then click **Save settings**.
- **Export / Import:**
  - **Export settings:** Downloads a clean JSON file containing all public appearance and prompt preferences. API keys are strictly excluded.
  - **Import settings:** Uploads a settings JSON file. API keys in storage remain untouched.
