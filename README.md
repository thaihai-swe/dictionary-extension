# Dictionary

A modern Chrome extension (Manifest V3) for translation, multi-source dictionary lookup, pronunciation, and AI explanations built with **Vite 5**, **React 18**, **TypeScript 5**, and **Tailwind CSS**.

Features include interactive dictionary cards, Lexical Profile, global Stop Voice audio controls, editable contextual explanations, Grammar Nuance analysis, and phrase/idiom fallback.

## Product Page

The public product page is static HTML, CSS, and JavaScript in `product-page/`.
After GitHub Pages is enabled for this repository, it will be at:

[https://thaihai-swe.github.io/dictionary-extension/](https://thaihai-swe.github.io/dictionary-extension/)

Preview locally:

```bash
cd product-page
python3 -m http.server 4173
```

Then open `http://127.0.0.1:4173`.

## Quick Start & Development

```bash
# Install dependencies
npm install

# Run dev server
npm run dev

# Run TypeScript typecheck
npm run typecheck

# Run unit tests
npm test

# Build production distribution (/dist)
npm run build
```

## Load Locally in Chrome

1. Open `chrome://extensions`.
2. Enable **Developer mode** (top-right).
3. Click **Load unpacked** and select the built `dist/` directory.
4. Reload the extension after build changes.
5. Refresh open webpage tabs after reload so content scripts update.

## Project Structure

- `src/entrypoints/` — Chrome Extension entry points:
  - `background/` — Background Service Worker (`service-worker.ts`)
  - `content-script/` — In-page selection listener & floating overlay UI (`bootstrap.ts`, `overlay-app.tsx`, `overlay.in-page.tsx`)
  - `toolbar-popup/` — Extension action toolbar popup (`app.toolbar-popup.tsx`, `main.tsx`)
  - `options/` — Extension full options tab entry point (`main.tsx`)
- `src/features/` — Domain-driven feature slices:
  - `dictionary/` — Word lookup UI views, SenseMatrix, WordFamily, Collocations, UsageNotes
  - `ai-assistant/` — AI assistant view, 7 contextual intent cards & sentence breakdown
  - `settings/` — SettingsModal, ShortcutsModal, and settings tabs
- `src/components/` — Shared primitive UI components (Header, TabNavigation, Markdown, Chips, Icons)
- `src/composables/` — Custom hooks and reactive external stores (dictionary, AI, storage & audio/voice management)
- `src/providers/` — Pluggable multi-source dictionary, translation, and Gemini AI providers with `ProviderRegistry`
- `src/types/` — Segregated TypeScript interfaces (`models.ts`, `settings.ts`, `providers.ts`)
- `docs/` — Canonical project documentation

## Documentation

- [Documentation index](docs/README.md)
- [User Guide](docs/user-guide.md)
- [Architecture Overview](docs/architecture.md)
- [Settings Reference](docs/settings.md)
- [Providers Specification](docs/providers.md)
- [Development Guide](docs/development.md)
- [Troubleshooting Guide](docs/troubleshooting.md)
- [Roadmap](docs/roadmap.md)
