/**
 * settings-bridge.js — Settings load, normalize, and apply.
 *
 * Bridges between chrome.storage and the content-script runtime state.
 * Exposes `window.DictionaryHelperContent.settings`.
 *
 * API keys are intentionally excluded from this bridge. They remain in
 * chrome.storage.local and are consumed only by the background service worker.
 */
(function (global) {
    "use strict";

    const ns = global.DictionaryHelperContent = global.DictionaryHelperContent || {};
    const popupHelpers = global.DictionaryHelperPopupHelpers || {};
    const ALLOWED_SYNC_KEYS = Object.freeze([
        "theme",
        "fontFamily",
        "selectionTriggerMode",
        "postSelectionModifier",
        "enableContextMenuTrigger",
        "defaultTab",
        "translateTargetLanguage",
        "customLanguages",
        "translateProvider",
        "libreTranslateBaseUrl",
        "dictionaryProvider",
        "popupWidth",
        "popupHeight",
        "enableTranslate",
        "enableDictionary",
        "enableLexicalProfile",
        "enableAI",
        "enableAiPreload",
        "enablePhraseFallback",
        "disablePageContextExtraction",
        "pausedHostnames",
        "pronunciationRate",
        "pronunciationVoiceURI",
        "aiBaseUrl",
        "aiModel"
    ]);
    const SYNC_KEY_SET = new Set(ALLOWED_SYNC_KEYS);

    function normalizePausedHostnames(value) {
        const raw = Array.isArray(value) ? value : String(value || "").split(/[\n,]/);
        const seen = new Set();
        const result = [];
        for (const item of raw) {
            let host = String(item || "").trim().toLowerCase();
            host = host.replace(/^[a-z]+:\/\//, "").replace(/\/.*$/, "").replace(/:\d+$/, "");
            if (!host || seen.has(host)) {
                continue;
            }
            seen.add(host);
            result.push(host);
            if (result.length >= 100) {
                break;
            }
        }
        return result;
    }

    function isHostnamePaused(hostname, pausedHostnames) {
        const host = String(hostname || "").trim().toLowerCase();
        if (!host) {
            return false;
        }
        return normalizePausedHostnames(pausedHostnames).includes(host);
    }

    function applyThemeToNode(node, theme, fontFamily) {
        if (!node) return;
        if (!theme || theme === "system") {
            node.removeAttribute("data-theme");
        } else {
            node.setAttribute("data-theme", theme);
        }

        if (!fontFamily || fontFamily === "editorial") {
            node.removeAttribute("data-font");
        } else {
            node.setAttribute("data-font", fontFamily);
        }
    }

    function normalizeSettings(merged, storedRaw) {
        const next = { ...merged };
        const source = storedRaw || merged || {};

        if (!["system", "light", "dark"].includes(next.theme)) {
            next.theme = "system";
        }
        if (!["editorial", "learner"].includes(next.fontFamily)) {
            next.fontFamily = "editorial";
        }

        next.popupWidth = Math.min(1000, Math.max(320, Math.round(Number(next.popupWidth) || 620)));
        next.popupHeight = Math.min(1000, Math.max(360, Math.round(Number(next.popupHeight) || 720)));
        next.pronunciationRate = Math.min(1.5, Math.max(0.5, Math.round((Number(next.pronunciationRate) || 0.95) * 100) / 100));

        const hasExplicitMode = typeof source.selectionTriggerMode === "string"
            && ["off", "icon", "direct"].includes(String(source.selectionTriggerMode).trim().toLowerCase());

        if (hasExplicitMode) {
            next.selectionTriggerMode = String(source.selectionTriggerMode).trim().toLowerCase();
        }

        const mod = String(next.postSelectionModifier || "").toLowerCase();
        next.postSelectionModifier = ["shift", "alt", "ctrl"].includes(mod)
            ? mod
            : "shift";

        next.enableContextMenuTrigger = Boolean(next.enableContextMenuTrigger);
        next.enableTranslate = Boolean(next.enableTranslate);
        next.enableDictionary = Boolean(next.enableDictionary);
        next.enableLexicalProfile = Boolean(next.enableLexicalProfile);
        next.enableAI = Boolean(next.enableAI);
        next.enableAiPreload = Boolean(next.enableAiPreload);
        next.enablePhraseFallback = next.enablePhraseFallback !== false;
        next.disablePageContextExtraction = Boolean(next.disablePageContextExtraction);
        next.pausedHostnames = normalizePausedHostnames(next.pausedHostnames);

        return next;
    }

    /**
     * Loads only non-sensitive UI preferences from sync storage.
     * Secret keys are not queried and will never enter the content runtime.
     * @returns {Promise<object>} normalized settings
     */
    async function loadSettings() {
        const syncDefaults = Object.fromEntries(
            ALLOWED_SYNC_KEYS.map((key) => [key, ns.DEFAULT_UI_SETTINGS[key]])
        );
        const syncData = await chrome.storage.sync.get(syncDefaults) || {};
        return normalizeSettings({
            ...ns.DEFAULT_UI_SETTINGS,
            ...syncData
        }, syncData);
    }

    /**
     * Apply a chrome.storage change delta to the current settings object.
     * @param {object} settings
     * @param {object} changes
     * @param {string} areaName
     * @returns {object} updated settings
     */
    function applyStorageChanges(settings, changes, areaName) {
        if (areaName !== "sync" || !changes) {
            return settings;
        }

        let mutated = false;
        const next = { ...settings };
        for (const [key, change] of Object.entries(changes)) {
            if (SYNC_KEY_SET.has(key)) {
                next[key] = change.newValue;
                mutated = true;
            }
        }

        return mutated ? normalizeSettings(next, next) : settings;
    }

    const OUTPUT_AFFECTING_KEYS = popupHelpers.OUTPUT_AFFECTING_SETTING_KEYS
        || new Set(Object.keys(ns.DEFAULT_UI_SETTINGS));

    function affectsOutput(changes) {
        if (!changes) return false;
        return Object.keys(changes).some((key) => OUTPUT_AFFECTING_KEYS.has(key));
    }

    ns.settings = {
        ALLOWED_SYNC_KEYS,
        loadSettings,
        applyStorageChanges,
        normalizeSettings,
        applyThemeToNode,
        affectsOutput,
        normalizePausedHostnames,
        isHostnamePaused
    };
})(typeof window !== "undefined" ? window : globalThis);
