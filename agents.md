# AGENTS.md

## 0. Priority Rules

These override everything else in this file.

- **Direct:** Start with the answer, action, decision, or blocker. No flattery or filler.
- **Correct false premises** before continuing.
- **Never fabricate** file paths, commands, APIs, or repository behavior. Inspect the repo or mark it `[UNKNOWN]`.
- **Ask only when needed:** Ask when ambiguity changes the result. Otherwise inspect the repository.
- **Touch only the request.** No drive-by refactors, formatting churn, or unrelated cleanup.
- **Preserve behavior** unless the user explicitly asks to change it.
- **Fail loud.** Do not mark work complete if verification was skipped, failed, or partial.
- **Smallest reversible change.** Match the existing architecture. No new layers without a demonstrated need.

## 1. This Repository

Chrome Manifest V3 extension: Node `>= 22`, React 18, TypeScript 5, Vite 5, Tailwind CSS.

| Area | Location |
|---|---|
| Service worker | `src/entrypoints/background/service-worker.ts` |
| In-page overlay | `src/entrypoints/content-script/` (Shadow DOM `#dictionary-extension-root`) |
| Toolbar popup | `src/entrypoints/toolbar-popup/` |
| Options | `src/entrypoints/options/` |
| State | `src/ui/signal.ts` + `useSyncExternalStore` — no Redux |
| Theme | `src/ui/theme.ts` (`useAppTheme`) — Editorial Ink |
| Docs | `docs/` (architecture, lookup flow, providers, development) |

**Storage (do not mix):**

- `chrome.storage.sync` — public preferences only
- `chrome.storage.local` — secrets (`aiApiKey`, `libreTranslateApiKey`) and LRU caches (`dict_lookup_cache_v2`, `ai_lookup_cache_v2`)
- `chrome.storage.session` — transient SW caches (`enrich_*`, `comb_*`)

API keys must never appear in sync storage, settings export JSON, or content-script memory.

**Tests:** Node's native runner (`node --experimental-strip-types --test tests/*.test.ts`). Relative imports in code that tests load must use explicit `.ts` extensions (`allowImportingTsExtensions: true`).

## 2. Commands

Do not invent scripts. Real ones:

```bash
npm test          # unit tests
npm run typecheck # tsc --noEmit
npm run build     # Vite production bundle → dist/
npm run dev       # Vite HMR
```

Load unpacked from `dist/` at `chrome://extensions`. Reload the extension and refresh host tabs after a rebuild.

## 3. How to Work

1. Read the task and the code it touches. Trace the real flow.
2. Climb this ladder before writing code:
   1. Does this need to exist? (YAGNI)
   2. Does it already exist here? Reuse it.
   3. Does the platform / stdlib / an installed dependency already do it?
   4. Can it be one line?
   5. Only then: minimum code that works.
3. Match local style (indentation, naming, imports, file layout). Clean up only artifacts you introduced.
4. Fix the shared function once. Do not patch every caller.
5. Do not delete pre-existing dead code unless asked; mention it.
6. Do not add dependencies, abstractions, or features that were not requested.
7. If you cut a real corner, mark it: `// ponytail: <ceiling> -> <upgrade path>`.
8. Non-trivial logic leaves one runnable check (`tests/*.test.ts`). Trivial one-liners need none.
9. Two failed attempts at the same issue: stop, report evidence, ask.

**Not optional:** input validation at trust boundaries, no data-loss error swallowing, secret isolation, accessibility of UI you touch.

## 4. Verify

Define success before editing. Then run the strongest *relevant* checks and read their output:

- Logic / parsers / settings / enrichment → `npm test`
- Types or public interfaces → `npm run typecheck`
- Bundle, lazy imports, entrypoints → `npm run build`
- UI → visual check in the popup or overlay when practical
- Performance → a measurable before/after (bundle size or runtime)

Docs-only edits need no test/build. Skipped checks must be named.

## 5. Safety

Get explicit approval in this conversation before:

- Large-scale deletion
- Printing, committing, or transmitting secrets / API keys
- Irreversible migrations without a rollback plan
- Auth, billing, permissions, or public API contract changes when intent is unclear

Local reversible work may proceed. Do not hide destructive actions inside scripts.

## 6. Report

Changed files, what was verified, what was skipped or failed, known gaps. Next step only when useful.
