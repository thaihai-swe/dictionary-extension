/**
 * lookup-bridge.js — Content-side lookup request helpers.
 *
 * Owns cache-key construction and chrome.runtime.sendMessage LOOKUP_TEXT
* fan-out. Classic script loaded before content.js.
* Exposes `window.DictionaryHelperContent.lookup`.
 *
 * API keys are never present in the content-script settings object (see
 * settings-bridge.js), so cache keys cannot encode key material. Key
 * availability is resolved by the background service worker at request time.
 */
(function (global) {
    "use strict";

   const ns = global.DictionaryHelperContent = global.DictionaryHelperContent || {};
    // Contextual AI intents (explain_in_context, grammar, phrase_explorer, sentence_breakdown) are bound to page context and must
    // not be served from the short-lived lookup cache. Only automatic,
    // context-independent lookups are cached.
    const CACHEABLE_INTENTS = new Set(["default", "phrase_fallback"]);

    function buildRequestCacheKey(tab, text, settings = {}, requestOptions = {}) {
        return JSON.stringify({
            tab,
            text: String(text || "").trim().toLowerCase(),
            intent: requestOptions.intent || "default",
            context: String(requestOptions.context || "").trim().toLowerCase(),
            translateTargetLanguage: settings.translateTargetLanguage || "",
            translateProvider: settings.translateProvider || "",
            libreTranslateBaseUrl: settings.libreTranslateBaseUrl || "",
            dictionaryProvider: settings.dictionaryProvider || "",
            enableTranslate: Boolean(settings.enableTranslate),
            enableDictionary: Boolean(settings.enableDictionary),
            enableAI: Boolean(settings.enableAI),
            enableAiPreload: Boolean(settings.enableAiPreload),
            aiBaseUrl: settings.aiBaseUrl || "",
            aiModel: settings.aiModel || ""
        });
    }

    /**
     * @param {object} options
     * @param {string} options.tab
     * @param {string} options.text
     * @param {object} options.settings
     * @param {object} [options.requestOptions]
     * @param {{get:Function,set:Function,getPending:Function,setPending:Function,deletePending:Function}} options.cache
     */
    async function getLookupResponse({
        tab,
        text,
        settings,
        requestOptions = {},
        cache
    } = {}) {
        if (!cache) {
            throw new Error("Lookup cache is required.");
        }

        const cacheKey = buildRequestCacheKey(tab, text, settings, requestOptions);
        const cached = cache.get(cacheKey);
        if (cached) {
            return { ok: true, result: cached };
        }

        const pending = cache.getPending?.(cacheKey);
        if (pending) {
            return pending;
        }

        const request = chrome.runtime
            .sendMessage({
                type: "LOOKUP_TEXT",
                payload: { source: tab, text, ...requestOptions }
            })
             .then((response) => {
                 const intent = requestOptions.intent || "default";
                 if (
                     response?.ok
                     && CACHEABLE_INTENTS.has(intent)
                 ) {
                     cache.set(cacheKey, response.result);
                 }
                 return response;
             })
            .finally(() => {
                cache.deletePending?.(cacheKey);
            });

        cache.setPending?.(cacheKey, request);
        return request;
    }

    function isExtensionContextInvalidated(error) {
        const message = error?.message || String(error || "");
        return message.includes("Extension context invalidated")
            || message.includes("Could not establish connection")
            || message.includes("Receiving end does not exist");
    }

    const lookupApi = {
        buildRequestCacheKey,
        getLookupResponse,
        isExtensionContextInvalidated
    };

    global.DictionaryHelperLookup = lookupApi;
    ns.lookup = lookupApi;
})(typeof window !== "undefined" ? window : globalThis);
