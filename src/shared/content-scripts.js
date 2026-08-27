/**
 * Ordered content-script files shared by the manifest and dynamic injection.
 * Chrome cannot import this from manifest.json; tests assert they match.
 */
export const CONTENT_SCRIPT_JS = [
    "src/ui/renderer-base.js",
    "src/ui/renderer-lexical.js",
    "src/ui/renderer-ai.js",
    "src/ui/renderer.js",
    "src/ui/audio.js",
    "src/ui/popup-shell.js",
    "src/shared/cache.js",
    "src/shared/popup-helpers.js",
    "src/content/popup-position.js",
    "src/content/state.js",
    "src/content/context.js",
    "src/content/icons.js",
    "src/content/event-utils.js",
    "src/content/selection.js",
    "src/content/lookup-bridge.js",
    "src/content/trigger.js",
    "src/content/settings-bridge.js",
    "src/content/selection-triggers.js",
    "src/content/keyboard-handlers.js",
    "src/content/popup-dom.js",
    "src/content/tab-loader.js",
    "src/content/message-router.js",
    "src/content.js"
];

export const CONTENT_SCRIPT_CSS = [
    "src/ui/popup.css"
];
