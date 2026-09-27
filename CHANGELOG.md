# Changelog

All notable changes to the Dictionary & AI Learning Assistant extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.1] - 2025-02-23

### Added
- **Full-Size High-Resolution App Icons**:
  - Full-bleed squircle app icons across all sizes (`16x16`, `32x32`, `48x48`, `128x128`) featuring an open dictionary book with radiant AI spark.
  - Native AppKit CoreGraphics rasterization script (`scripts/generate-icons.py`) providing zero-padding, pixel-aligned crisp rendering for browser toolbars and store listings.
  - Automated verification of icon dimensions in `scripts/verify-build.mjs`.
- **Modern Slate & Emerald Design System**:
  - Three-layer design token architecture (`src/assets/tokens.css`, `src/assets/main.css`) covering primitives, semantic tokens, and component-level variables.
  - Adaptive dark (`#070d14` paper, `#0b1420` surface) and light backgrounds with teal/emerald accents (`#2DD4BF`, `#0D9488`).
  - Unified `IconBookSpark` branding in header, settings, and in-page selection triggers.

### Changed
- **Compact & High-Density UI Ergonomics**:
  - Streamlined search bar to 38px height with compact clear and submit actions.
  - Reduced in-page selection trigger button to 36×36px with tactile feedback.
  - Compacted AI intent chips (`h-7 px-2.5`) with active state highlight rings.
  - Refined rewriter composer and lookup preference selector with chevron indicators.

## [0.3.0] - 2025-02-23

### Fixed
- **Settings Persistence & Cross-Context Sync**:
  - Resolved theme and workbench settings reset bug where closing the popup reverted changes.
  - Added real-time synchronization between toolbar popup, in-page overlay, options page, and background worker via `chrome.storage.onChanged`.
  - Added synchronous theme hydration on startup to eliminate light/dark flicker.
- **Storage Isolation**:
  - Scoped direct `localStorage` access to extension pages only (`isExtensionPage()`), preventing storage pollution on third-party host websites.

### Added
- **Default Start Tab Preference**:
  - Added `defaultTab` configuration (`dictionary`, `ai`, `rewriter`) configurable from General Settings.
  - Automatic normalization of provider, language, and tab settings on storage boot.
