/**
 * icons.js — Small SVG icon strings used by the selection trigger.
 *
 * Loaded before content.js via the manifest content_scripts array.
 * Exposes `window.DictionaryHelperContent.icons`.
 */
(function (global) {
    "use strict";

    const ns = global.DictionaryHelperContent = global.DictionaryHelperContent || {};

    const searchIcon = `<svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
        <path d="M9 3.5a5.5 5.5 0 1 0 3.5 9.7l3.15 3.15a1 1 0 0 0 1.4-1.4l-3.15-3.15A5.5 5.5 0 0 0 9 3.5Zm-3.5 5.5a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0Z"></path>
    </svg>`;

    ns.icons = {
        search: searchIcon
    };
})(typeof window !== "undefined" ? window : globalThis);
