# Dictionary

A lightweight Chrome extension for translation, dictionary lookup, pronunciation, and AI explanations from selected text or manually entered queries in the toolbar popup. AI mode includes editable contextual explanations, Grammar Nuance analysis, and phrase/idiom fallback.

## Product page

The public product page is static HTML, CSS, and JavaScript in `product-page/`.
After GitHub Pages is enabled for this repository, it will be at:

[https://thaihai-swe.github.io/dictionary-extension/](https://thaihai-swe.github.io/dictionary-extension/)

Preview locally:

```bash
cd product-page
python3 -m http.server 4173
```

Then open `http://127.0.0.1:4173`.

## Start Here

- [Documentation index](docs/README.md)
- [User Guide](docs/user-guide.md)
- [Architecture](docs/architecture.md)
- [Design Principles](docs/design.md)
- [Settings](docs/settings.md)
- [Providers](docs/providers.md)
- [Development Guide](docs/development.md)
- [Troubleshooting](docs/troubleshooting.md)
- [Roadmap](docs/roadmap.md)

## Load Locally

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Click **Load unpacked** and select this project directory.
4. Reload the extension after changes.
5. Refresh already-open webpage tabs after reload so content scripts update.
6. For local files or PDFs, enable **Allow access to file URLs** in the extension details when needed. The popup appears over scriptable webpage and PDF pages.

## Project Shape

- `action/` — toolbar popup
- `src/` — runtime, providers, shared services, and in-page UI
- `options/` — settings page
- `assets/` — extension icons
- `docs/` — canonical project documentation
- `product-page/` — GitHub Pages product page
