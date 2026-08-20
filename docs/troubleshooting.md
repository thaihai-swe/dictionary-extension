# Troubleshooting

## Extension Context Invalidated

This error happens when the background extension reloads while a webpage is actively running the older content script.

- **Fix:** Refresh the webpage you are trying to test.

## Infinite Loading or No Popup

- Check the extension service worker console in `chrome://extensions`.
- A missing `manifest.json` permission or a provider failure often stops execution.

## AI Requests Fail

- Verify your `aiBaseUrl`, `aiApiKey`, and `aiModel` in the extension options.
- The default setup points to the Google Gemini OpenAI-compatible endpoint.
- For context explanation, page extraction is optional. If the active tab has no content script or matching sentence, switch to AI mode and paste the sentence into Context manually.
- If the wrong sentence is prefilled after a selection, reload the extension and refresh the tab so the exact Range-based extractor is active. You can always edit Context before submitting.
- Context, Context Explain, and Grammar Nuance are intentionally hidden in Dictionary mode. They also stay hidden when AI is disabled or the query is empty.
- If a contextual request is rejected, verify Context is not empty. The inline validation should focus the Context field before any request is sent.
- Check the extension service worker console for HTTP errors.

## Grammar Result Formatting

Grammar Nuance responses use lightweight Markdown. Headings, lists, bold text, italics, quotes, code, and horizontal rules are supported. Raw Markdown markers usually indicate an outdated extension reload; reload the extension and refresh the webpage tab.

## Pronunciation Doesn't Match Settings

- `pronunciationRate` applies to both remote audio and browser speech synthesis. Check that it is between `0.5` and `1.5`.
- `pronunciationVoiceURI` *only* applies to browser speech synthesis fallback. If the dictionary returns a real MP3 file, the browser will play that instead of using the selected speech voice.
- Some providers return audio without IPA. Wait for lazy enrichment to complete; if another provider supplies phonetic text, the existing pronunciation entry is backfilled and IPA is moved to the first pronunciation slot.
- If no enabled provider has IPA for a word, a working audio or browser speech fallback is expected even though the phonetic text remains empty.

## Source badges and lazy enrichment

- Results track contributing providers via the normalized `sourceBadges` contract and per-section source metadata (e.g. dictionary provider, Google Translate, AI phrase explanation, and secondary dictionary providers).
- A provider badge may appear even when that provider's definitions were duplicates; the badge means the provider returned valid data, not necessarily that it added a new visible sentence.
- The initial primary result appears before secondary enrichment. If no extra badge appears, the other providers may have returned `NotFoundError`, lack required API keys, or failed operationally.
- If the same source name appears both as a badge and in the subtitle, reload the extension and refresh the page. Current versions filter duplicate source names from the subtitle.
- If an old result overwrites a newer lookup, refresh the page and reload the extension. Current popup/content-script listeners discard `LOOKUP_UPDATE` messages whose `requestId` or text does not match the active query.

## PDFs and Reader Pages

- If selecting text in Chrome's built-in PDF viewer does not open the in-page card, right-click the selection and choose the extension's lookup action. The extension renders the card over scriptable PDF pages; when Chrome blocks script injection, a badge indicator notifies the user.
- Reload the extension after updating, then retry the PDF context-menu action once. The first right-click after reload may still fail if the service worker has not restarted.
- If the context menu is unavailable, click the extension icon and type the selected word or phrase manually. In AI mode, paste the sentence into Context.
- Confirm **Enable context menu trigger** is checked in Options. Without it, right-click lookup is not registered.
- For local PDFs or HTML files, open `chrome://extensions`, open the extension details, enable **Allow access to file URLs**, then reload the file tab.
- Reader Mode pages work when their article content is exposed to content scripts. Browser-owned `chrome://` pages cannot be injected by design.
- If an online PDF has selectable text but no popup, reload the extension, refresh the PDF tab, and retry. An embedded PDF may expose its text layer in a child frame, while the built-in viewer may not.
