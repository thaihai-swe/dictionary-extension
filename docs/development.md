# Development Guide

## Environment

- **Stack:** Plain JavaScript, Chrome MV3, HTML, CSS.
- **Dependencies:** None. No Node.js, no bundler, no testing framework.

## Local Setup

1. Enable Developer mode in `chrome://extensions`.
2. Load the project root folder as an unpacked extension.
3. Reload the extension to apply changes.
4. Open tabs containing content scripts must be refreshed after an extension reload.

### Design system retrieval

The Calm Learning Studio visual direction lives in `design-system/dictionary/` (`MASTER.md` plus per-surface `pages/` overrides). The design system was generated with the `ui-ux-pro-max` skill and persisted into the repository as static reference material. When iterating on the UI, open the relevant page file first; the shared shell, renderer, `popup-shell.js`, `renderer.js`, and `tokens.css` are the implementation targets for the documented tokens and class vocabulary (`dictionary-helper-*` for in-page, `toolbar-popup-*` aliases for the toolbar surface).

## Modifying Settings

When adding or changing a setting, update:

1. `src/shared/storage.js` (add default, normalize values)
2. `options/options.html`
3. `options/options.js`
4. Runtime usage in the relevant script
5. `docs/settings.md`

## Modifying Providers

### Adding a dictionary provider

1. Write the adapter in `src/providers/`. Use `src/providers/errors.js` — throw `NotFoundError` when the word has no result.
2. Register it in `src/providers/dictionary.js` under `DICTIONARY_PROVIDERS` and add to `FALLBACK_ORDER`.
3. Return the normalized result shape (see `docs/providers.md`). Include `providerId` and `sourceBadges`.
4. Add the option value to `options/options.html`.
5. Do not modify background routing; the facade handles it.

Supported providers: `free_dictionary`, `wiktionary`, `merriam_webster`, `wordnik`, `words_api`.

### Adding a translation provider

1. Write the adapter in `src/providers/`.
2. Register it in `src/providers/translate.js` under `TRANSLATION_PROVIDERS`.
3. Return the normalized translation fields.
4. Add the option value to `options/options.html`.
5. Do not modify background routing; the facade handles it.

All provider results must match the renderer-compatible shape (see `docs/providers.md`).

## Verification

The extension avoids automated tests by design. Run these checks manually after major changes:

1. Look up a polysemous word like `run` to verify definitions, examples, synonyms, and multi-pronunciation variants.
2. Change the pronunciation rate/voice in options, then trigger a dictionary audio and a fallback-speech word.
3. Run **Context Explain** from the in-page popup.
4. Run **Sentence Breakdown** on a full-sentence query and on a single word with pasted Context.
5. Verify selection extraction returns the exact sentence at the selected occurrence, even when the word appears multiple times.
7. Verify extraction failure still permits manual context entry.
8. Clear Context and confirm an inline validation message focuses the field without sending an AI request.
9. Confirm Dictionary mode hides Context, Context Explain, Grammar & Nuance, and Sentence Breakdown controls.
10. Verify Sentence Breakdown structured sections, phrase cards, and Look up phrase action.
11. Verify Grammar Nuance headings, lists, emphasis, quotes, and horizontal rules render without raw Markdown markers.
12. Use an unknown `translateProvider` ID and confirm it fails gracefully with a message.
13. Set an AI API key, confirm it saves, and verify sync settings didn't leak it.
13b. Open Options, click **Reset AI prompts**, confirm all prompt textareas restore defaults, then save and verify Sentence Breakdown and Phrase & Collocations still work.
13c. In a test page's content-script DevTools console, inspect `window.DictionaryHelperContent.settings` and confirm it contains no API key fields. Change a key in Options and confirm the content script only invalidates lookup state; it never receives the key value.
14. Reload the extension, refresh a test tab, and verify selection triggers: Floating Icon shows near text, tapping the post-selection key (Shift/Alt/Ctrl) opens lookup, Direct mode opens on mouseup, and Off disables auto-triggers. Confirm editable inputs are ignored.
15. Drag-resize the in-page popup, close it, and verify the dimensions persist on the next lookup.
16. Switch theme between System, Light, and Dark and confirm the options page and in-page card update.
17. Check keyboard focus, pronunciation playing states, loading skeletons, error states, and reduced-motion behavior.
18. Test an online PDF with selectable text: verify exact sentence extraction when the PDF exposes a text layer, and verify context-menu lookup on scriptable PDF pages.
19. Test a local `file://` PDF or HTML page after enabling **Allow access to file URLs**; confirm selection and sentence extraction work, then disable the permission and confirm selection lookup works with permissions enabled.
20. Test a reader-style article page and a reader page inside an iframe; confirm the popup opens once, context is sentence-level, and no duplicate popup appears from multi-frame injection.
21. Test a browser-owned `chrome://` page and confirm no unhandled error appears; the toolbar remains usable for manual lookup.

### Enrichment and multi-source badge verification

22. Look up a common word (e.g. `across` or `monitoring`) with translation enabled. Confirm:
    - Initial result includes translation metadata in the Translation section.
    - After a moment, enrichment providers appear (e.g. `Wiktionary`, `Wordnik`) in the relevant section metadata.
    - Contributing providers are not duplicated in subtitles; each section attributes its source once.
    - The subtitle line beneath the title does not repeat source names.
23. Look up a word that has audio but no IPA in the Free Dictionary response (e.g. some common words lack phonetics). Verify:
    - After enrichment, the pronunciation entry displays IPA text when another provider supplies it.
    - If IPA is present, it appears in the title row rather than a bare speak button.
24. Rapidly query two different words. Confirm:
    - The first query's result is displayed immediately.
    - Enrichment for the first query does not overwrite the second query's result.
    - The second query's enrichment does not show definitions from the first word.
25. Disable API keys for key-backed providers. Verify:
    - The initial lookup (Free Dictionary API/Wiktionary) still works.
    - Enrichment skips unconfigured key-backed providers without making requests or logging errors.
    - Enrichment silently skips configured providers that fail operationally.
26. Set a key-backed provider (e.g. Merriam-Webster) as primary. Verify:
    - When the primary has data, it is shown immediately.
    - Fallback to `free_dictionary` works when the primary has no data (`NotFoundError`).
    - The fallback badge shows the correct annotation.
27. Clear all API keys. Verify:
    - `free_dictionary` and `wiktionary` still return results without keys.
    - Enrichment skips `merriam_webster`, `wordnik`, and `words_api` gracefully.
    - No console errors appear for the skipped providers.
28. Test smart lemma and phrase fallback with `went`, `children`, `better`, `looked up`, `taking care of`, `ran out of`, `turn it off`, and `has taken off`. Confirm exact lookup is attempted first, then canonical lemma/phrase candidates, and a successful canonical result displays the root/phrase notice.
29. In AI mode, use **Phrase & Collocations** with `spill the beans`, `looked up`, and `come up with`. Confirm the result includes core meaning, grammar/patterns, collocations, register, examples, and learner mistakes, and that optional Context is editable and only sent after the action is clicked.
30. Look up `decide`, `affect`, `interested`, and `make`. Confirm the lexical profile shows available noun/verb/adjective/adverb forms, inflections, derivatives, word-formation tags/explanation, confusable words, learner mistakes, and collocations grouped by verbs, nouns, prepositions, adjectives, and natural patterns. Verify missing fields are hidden rather than shown as empty placeholders.
31. Verify provider-first lexical data and AI fallback: WordsAPI derivations populate derivatives without duplicates; an AI response with a valid `<lexical-profile>` block renders the new fields; malformed blocks are ignored without showing raw JSON.
32. Verify clicking a family or derivative chip starts a lookup for that exact term, while collocation and pattern text remains readable and wraps correctly in narrow toolbar and in-page popups.

### Visual redesign verification (Calm Learning Studio)

33. Reload the extension, then open the toolbar popup and perform a Dictionary lookup. Confirm the header shows the `D` brand mark and a gear icon (SVG, not a character glyph), tabs render inside a `<nav role="tablist">` with a clearly visible active state, and the term uses the editorial display font.
34. Open the in-page popup (select text on a page) and confirm the same `dictionary-helper-*` classes render a matching warm surface, a calmer elevation, and a collapsed-by-default deep-dive section with a visible focus ring.
35. Verify no emoji is used as an interactive or structural icon anywhere (gear icon is an inline SVG, pronunciation controls use labeled text, and the speech-practice indicator uses the `◉` glyph only as a decorative aria-hidden status marker).
36. Switch System/Light/Dark and the Learner font; confirm `tokens.css` drives both the toolbar (`action/popup.css`) and in-page (`src/ui/popup.css`) surfaces without style regressions and text/border/badge contrast meets 4.5:1.
37. Enable reduced motion and confirm no required state depends on animation; focus rings still appear and skeletons/skip-link behavior remains.
38. Rapidly query two words and confirm stale-response protection still holds under the new classes (enrichment updates never overwrite the active query).
39. Open Options and confirm the scrollable section rail works at narrow/mobile, normal, and wide widths; secret fields are labeled local-only and never write to `sync` storage.
40. Open an in-page lookup and confirm the card and selection trigger use only a short opacity/transform entrance. Close with the close button or Escape: the card exits once, focus is restored, and audio/cancellation cleanup happens. Open a new selection while a card is visible: replacement is immediate rather than waiting for an exit animation.
41. Enable reduced motion and repeat the prior check: opening and explicit dismissal are immediate, while the content remains fully usable.
42. Start an in-page Dictionary lookup, an AI context action, and a toolbar lookup. Confirm each uses the structured term/badge/definition-card skeleton from `renderer.renderSkeleton(prefix)` while its result body has `aria-busy="true"`; confirm result/error rendering replaces it and clears busy state.
43. Play pronunciation audio, quickly switch pronunciation variants, and allow playback/fallback speech to end. Exactly one active control should show the animated three-bar wave, and it must clear after playback, failure, cancellation, or popup close.
44. Start and finish or abort pronunciation practice. Confirm the recording ring, animated status marker, and visible `Listening…` label appear only while recognition is active; confirm the state clears for scores, errors, and cancellation.
45. In Options, choose a speech voice from the select, save, and confirm speech fallback uses it while dictionary audio still ignores it. If the saved voice is missing, the select keeps an unavailable option.
46. Practice a word, wait for enrichment, and confirm the score remains. Change the query or close the card and confirm the score is gone. In a browser without speech recognition, confirm Practice is replaced by the Chrome-only note.
47. Click a Word Family chip that was already looked up in this popup session and confirm the result appears immediately without a skeleton. Click a new derivative and confirm a normal lookup still occurs.
48. Open the in-page card near a viewport edge, then zoom or resize. Confirm the card flips or clamps back on screen. Switch to AI, close the toolbar popup, reopen it, and confirm AI is still selected. Restart the browser and confirm `defaultTab` wins.
49. Export settings and confirm the JSON has prompts and no API keys. Import the file and confirm preferences restore while keys stay unchanged. Restore one prompt, then Reset all five; both require Save.
50. Run Main AI on a word. Confirm the result is focused on Intro, Translation & Meaning, Usage Note, Example Sentences, and Deep Understanding, without duplicate Synonyms or Memory Aids headings.
51. Run Grammar & Nuance. Confirm **Grammatical Role & Structure** is a single card and **Meaning & Register** uses the usage style without a redundant Translation block.
52. Run Context Explain with a sentence. Confirm it renders **Context used**, **Meaning in Context**, and **Natural Paraphrases** without an extra Simple Explanation duplicate.
53. Run Sentence Breakdown and confirm structured sentence/parts/phrase cards are unchanged. Trigger phrase fallback on an idiom without dictionary data and confirm it shows a single consolidated **Meaning** card, Usage and Register, Example, and Related Expressions.
54. Temporarily set a custom Main AI template with headings `Foo` and `Bar`. Confirm those sections keep model order without breaking. Restore the default prompt afterward.
