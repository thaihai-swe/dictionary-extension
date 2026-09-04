# Troubleshooting Guide

This guide provides actionable solutions for common issues across extension reloads, network providers, pronunciation practice, context extraction, audio cancellation, and browser security boundaries.

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
- **Check 5 — Paused site:** The toolbar **Pause site** button or Settings → paused hostnames turns off in-page icons on that host. Toolbar search and the context menu still work.
- **Check 6 — Iframes:** Content scripts load in the top frame. A same-origin iframe injects on first selection. Cross-origin iframes cannot be read; use the toolbar or context menu.
- **Check 7 — Keyboard command:** Highlight text and press your configured shortcut (`chrome://extensions/shortcuts`).

---

## 3. AI Requests, Models & Context Errors

### Symptom: AI generation fails with error toasts or missing field alerts.
- **Check 1 — Required Settings:** Verify in Settings that **Enable AI provider** is checked, and all three core fields are populated:
  - **AI API base URL:** e.g. `https://generativelanguage.googleapis.com/v1beta/openai/` or your custom endpoint.
  - **AI API key:** Your Google Gemini API key.
  - **AI model name:** Default and recommended is `gemini-3.5-flash-lite`.
- **Check 2 — Test Connection Action:** In Settings, click **Test AI connection** to run a non-destructive latency and authentication check.
- **Check 3 — Older Gemini Models in Local Cache:**
  - If you previously tested older models (e.g. `gemini-2.5-flash` or `gemini-1.5-pro`) and the UI still references them, open Settings → AI tab, select `gemini-3.5-flash-lite` from the dropdown, and click **Save settings**.
- **Check 4 — Host Permission Prompts:** If using custom self-hosted base URLs (e.g. `http://localhost:11434` or custom domain proxies), ensure you accepted the browser's dynamic origin permission prompt when saving settings.

### Symptom: Context Explain or Grammar & Nuance buttons are disabled.
- **Cause:** **Context Explain** and **Grammar & Nuance** strictly require sentence context.
- **Fix:** Highlight the text in a sentence or paste the sentence directly into the editable Context textarea in the AI tab.
- *Note: Sentence Breakdown accepts a full-sentence query without needing extra text in the Context box.*

---

## 4. Multi-Source Dictionary & Enrichment

### Symptom: No definitions found for an inflected word (e.g. `went`, `taking care of`).
- **Cause:** Lookups use the selected text exactly. Inflected or phrasal forms are not rewritten to a root (`went` is not retried as `go`).
- If an obscure idiom has no dictionary definitions across all keyless providers, Dictionary mode invokes **AI Phrase Fallback** when both AI and **Use AI when a phrase has no dictionary definition** are enabled.
- Transient 5xx/timeout from a free provider continues to the next free provider. Dictionary HTTP runs in the background service worker (inspect that worker's Network tab, not the page).

### Symptom: Secondary providers don't enrich results.
- **Check 1 — Network Connectivity:** All dictionary providers (`free_dictionary`, `wiktionary`, `datamuse`, `rhymebrain`, `wikipedia`, `urban_dictionary`) are keyless and require open network access.
- **Check 2 — Enrichment Diagnostics:** In Settings, click the test buttons under **Test dictionary connection** to verify reachability and latency.
- **Check 3 — Graceful Degradation:** When an upstream endpoint is temporarily unavailable or returns 5xx/timeout, enrichment silently skips that provider without breaking the displayed Free Dictionary or Wiktionary results.

---

## 5. Neural Translation & Providers

### Symptom: Translation card shows an error or fails to load.
- **Google Translate:** Operates out of the box without keys. Check network connectivity if requests fail.
- **LibreTranslate:**
  - If using the public server (`https://libretranslate.com`), requests may hit rate limits during peak hours.
  - If using a self-hosted instance, verify your **LibreTranslate base URL** (e.g. `https://translate.example.com`) and ensure any required API key is entered.
- **MyMemory Fallback:** When Google or LibreTranslate fails, MyMemory activates automatically as a keyless secondary fallback.

---

## 6. Pronunciation, Speech Practice & Audio Cancellation

### Symptom: Audio keeps playing or won't stop.
- **Fix 1 — Global Stop Voice Button:** Click the red **Stop Voice** button (`⏹️ STOP VOICE` / `🔇`) in `AppHeader`. It pulses while any audio element or speech synthesis utterance is active.
- **Fix 2 — Escape Key:** Press `Esc` anywhere in the popup to cancel speech synthesis immediately.

### Symptom: Audio button plays browser speech instead of real human voice.
- **Explanation:** Pronunciation uses this keyless chain: `api.dictionaryapi.dev` MP3 first (when the lookup provided one) → Google Translate TTS (`translate.googleapis.com`, no API key) → browser `window.speechSynthesis`. A 502 from the dictionary CDN does not block the later fallbacks.
- **Speech Voice Selection:** Open Settings → **Preferred speech voice** to choose your favorite installed operating system voice.
- **Speed Adjustment:** Set **Pronunciation speed** (clamped between `0.5x` and `1.5x`).

### Symptom: Practice button (`🎙️ Practice`) fails with an error.
- **Check 1 — Browser Support:** The Speech Practice Evaluator requires the Web Speech Recognition API (`webkitSpeechRecognition`), natively available in Chrome.
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
- **Reset Individual Prompt:** In Settings → Prompts tab, click **Restore default** below any prompt textarea to restore that single template, then click **Save**.
- **Export / Import:**
  - **Export settings:** Downloads a clean JSON file containing all public appearance and prompt preferences (`version: 12`). API keys are strictly excluded.
  - **Import settings:** Uploads a settings JSON file. API keys in storage remain untouched.
