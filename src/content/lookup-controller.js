/**
 * tab-loader.js — Lookup orchestration, preloads, follow-ups, and popup opening logic.
 */
(function (global) {
    "use strict";

    const ns = global.DictionaryHelperContent = global.DictionaryHelperContent || {};

    function getAvailableTabs() {
        const state = ns.state;
        return ns.TAB_ORDER.filter((tab) => {
            if (tab === "dictionary") {
                return state.settings.enableTranslate || state.settings.enableDictionary;
            }

            if (tab === "ai") {
                return state.settings.enableAI;
            }

            return false;
        });
    }

    function getLookupResponse(tab, text, requestOptions = {}) {
        const lookupCache = window.DictionaryHelperCache ? window.DictionaryHelperCache.createLookupCache() : null;
        return ns.lookup.getLookupResponse({
            tab,
            text,
            settings: ns.state.settings,
            requestOptions,
            cache: lookupCache
        });
    }

    function getSelectionRectForText(text) {
        return ns.selection?.getSelectionRectForText(text);
    }

    function shouldUseFixedPopup() {
        return ns.positioning?.shouldUseFixedPopup?.() ?? false;
    }

    function getPopupPosition(rect, event) {
        const state = ns.state;
        const popupSize = {
            width: state.settings.popupWidth || 620,
            height: state.settings.popupHeight || 720
        };
        return ns.positioning.computePopupPosition({
            selectionRect: rect,
            popupSize,
            event,
            useFixed: shouldUseFixedPopup(),
            margin: 12
        });
    }

    function setPopupPosition(position) {
        const state = ns.state;
        if (!state.popupCard) {
            return;
        }
        state.currentPosition = position;
        ns.positioning.applyPopupPosition(state.popupCard, {
            ...position,
            useFixed: position.useFixed != null ? position.useFixed : shouldUseFixedPopup()
        }, state.settings);
        if (typeof state.unbindViewportReposition !== "function" && ns.positioning?.bindViewportReposition) {
            state.unbindViewportReposition = ns.positioning.bindViewportReposition(state.popupCard, () => ({
                selectionRect: state.currentSelectionRect,
                popupSize: {
                    width: state.settings.popupWidth || 620,
                    height: state.settings.popupHeight || 720
                },
                useFixed: shouldUseFixedPopup(),
                margin: 12,
                onPosition(next) {
                    state.currentPosition = next;
                }
            }), state.settings);
        }
    }

    function syncFollowUpState(text, context) {
        const state = ns.state;
        const popupHelpers = window.DictionaryHelperPopupHelpers;
        const lookupCache = window.DictionaryHelperCache ? window.DictionaryHelperCache.createLookupCache() : null;

        if (!state.settings.enableAiPreload || !state.settings.enableAI || !popupHelpers) {
            state.activeFollowUps = [];
            return;
        }

        const eligible = popupHelpers.getEligibleFollowUpIntents({ text, context });
        state.activeFollowUps = eligible.map((item) => {
            const cacheKey = ns.lookup?.buildRequestCacheKey("ai", text, state.settings, {
                context,
                intent: item.intent
            });
            const cached = lookupCache ? lookupCache.get(cacheKey) : null;
            return {
                ...item,
                result: cached || null,
                loading: !cached,
                error: ""
            };
        });
    }

    function patchActiveFollowUps() {
        const state = ns.state;
        if (state.activeTab !== "ai" || !state.popupRoot) {
            return;
        }
        ns.popupDom?.syncAiActionButtonStatus();
    }

    async function preloadFollowUpIntents(text, context, token = ns.state.requestToken) {
        const state = ns.state;
        const lookupCache = window.DictionaryHelperCache ? window.DictionaryHelperCache.createLookupCache() : null;

        if (!state.settings.enableAiPreload || !state.settings.enableAI) {
            return;
        }

        const query = String(text || "").trim();
        if (!query) {
            return;
        }

        syncFollowUpState(query, context);
        if (!state.activeFollowUps.length) {
            return;
        }

        if (token === state.requestToken && state.activeTab === "ai") {
            patchActiveFollowUps();
        }

        for (const item of state.activeFollowUps) {
            if (token !== state.requestToken) {
                return;
            }
            if (item.result) {
                continue;
            }

            try {
                const response = await ns.lookup?.getLookupResponse({
                    tab: "ai",
                    text: query,
                    settings: state.settings,
                    requestOptions: {
                        trigger: "manual",
                        context,
                        intent: item.intent
                    },
                    cache: lookupCache
                });

                if (token !== state.requestToken) {
                    return;
                }

                const target = state.activeFollowUps.find((entry) => entry.intent === item.intent);
                if (!target) {
                    continue;
                }

                if (response?.ok && response.result) {
                    target.result = response.result;
                    target.loading = false;
                    target.error = "";
                } else {
                    target.loading = false;
                    target.error = response?.error || item.errorMessage;
                }
            } catch (error) {
                if (token !== state.requestToken) {
                    return;
                }
                const target = state.activeFollowUps.find((entry) => entry.intent === item.intent);
                if (target) {
                    target.loading = false;
                    target.error = error?.message || item.errorMessage;
                }
            }

            if (token === state.requestToken && state.activeTab === "ai") {
                patchActiveFollowUps();
            }
        }
    }

    function maybePreloadAi() {
        const state = ns.state;
        const normalizedQuery = String(state.activeText || "").trim();
        const preloadKey = ns.lookup?.buildRequestCacheKey("ai", normalizedQuery, state.settings, {});

        if (
            !state.settings.enableAiPreload
            || !state.settings.enableAI
            || !normalizedQuery
            || state.activeTab === "ai"
            || state.lastPreloadKey === preloadKey
        ) {
            return;
        }

        state.lastPreloadKey = preloadKey;
        void getLookupResponse("ai", normalizedQuery)
            .then(() => preloadFollowUpIntents(normalizedQuery, state.activeContext, state.requestToken))
            .catch(() => {});
    }

    async function loadTab(tab) {
        const state = ns.state;
        const renderer = window.DictionaryHelperRenderer;
        const audio = window.DictionaryHelperAudio;
        const popupHelpers = window.DictionaryHelperPopupHelpers;
        const lookupCache = window.DictionaryHelperCache ? window.DictionaryHelperCache.createLookupCache() : null;

        const availableTabs = getAvailableTabs();
        if (!availableTabs.includes(tab)) {
            const body = state.popupRoot?.querySelector(".dictionary-helper-body");
            if (body) {
                body.innerHTML = `<div class="dictionary-helper-state"><strong>Turn on this source</strong><span>Enable this tab in settings.</span></div>`;
            }
            return;
        }

        const query = state.activeText.trim();
        if (!query) {
            const body = state.popupRoot?.querySelector(".dictionary-helper-body");
            if (body) {
                body.innerHTML = `<div class="dictionary-helper-state"><strong>No text selected</strong><span>Select text on the page or type a word in the search box.</span></div>`;
            }
            return;
        }
        state.requestToken += 1;
        const token = state.requestToken;
        state.activeRequestId = "";
        state.lastLookupRevision = -1;
        audio?.stopPronunciation();
        if (tab !== "ai") {
            state.activeFollowUps = [];
            state.activeAiIntent = "";
        } else {
            state.activeAiIntent = "default";
        }
        ns.popupDom?.syncAiActionButtonStatus();

        const body = state.popupRoot?.querySelector(".dictionary-helper-body");
        if (!body) {
            return;
        }

        const cacheKey = ns.lookup?.buildRequestCacheKey(tab, query, state.settings, {});
        const cached = lookupCache ? lookupCache.get(cacheKey) : null;
        if (cached) {
            if (cached.requestId) {
                state.activeRequestId = cached.requestId;
            }
            state.lastLookupRevision = Number.isFinite(cached.revision) ? cached.revision : (cached.enriched ? 2 : 0);
            if (tab === "ai") {
                syncFollowUpState(query, state.activeContext);
            }
            body.setAttribute("aria-busy", "false");
            popupHelpers?.paintLookupResult(body, renderer?.renderResult(cached, ns.getRenderOptions()));
            audio?.restorePracticeResult(body, query, cached.pronunciation?.language);
            ns.popupDom?.syncAiActionButtonStatus();
            if (tab === "ai") {
                void preloadFollowUpIntents(query, state.activeContext, token);
            } else {
                maybePreloadAi();
            }
            return;
        }

        body.setAttribute("aria-busy", "true");
        body.innerHTML = renderer?.renderSkeleton("dictionary-helper") || "";

        try {
            const response = await getLookupResponse(tab, query);

            if (token !== state.requestToken || !state.popupRoot) {
                return;
            }

            if (!response?.ok) {
                throw new Error(response?.error || "Request failed.");
            }

            if (response.result?.requestId) {
                state.activeRequestId = response.result.requestId;
            }
            state.lastLookupRevision = Number.isFinite(response.result?.revision)
                ? response.result.revision
                : (response.result?.enriched ? 2 : 0);
            if (tab === "ai") {
                syncFollowUpState(query, state.activeContext);
            }
            popupHelpers?.paintLookupResult(body, renderer?.renderResult(response.result, ns.getRenderOptions()));
            audio?.restorePracticeResult(body, query, response.result?.pronunciation?.language);
            ns.popupDom?.syncAiActionButtonStatus();
            if (tab === "ai") {
                void preloadFollowUpIntents(query, state.activeContext, token);
            } else {
                maybePreloadAi();
            }
        } catch (error) {
            if (token !== state.requestToken || !state.popupRoot || error?.name === "AbortError" || String(error?.message || "").includes("aborted")) {
                return;
            }

            body.innerHTML = `<div class="dictionary-helper-state is-error"><strong>Unable to load results</strong><span>${renderer?.escapeHtml(error.message || "Request failed.")}</span></div>`;
        } finally {
            if (token === state.requestToken && state.popupRoot) {
                body.setAttribute("aria-busy", "false");
            }
        }
    }

    function openPopupForText(text, event, options = {}) {
        const state = ns.state;
        const audio = window.DictionaryHelperAudio;
        const popupHelpers = window.DictionaryHelperPopupHelpers;

        if (!state.extensionContextValid) {
            ns.popupDom?.showRefreshRequiredMessage(event || {});
            return;
        }

        const normalizedText = String(text || "").trim();
        if (!normalizedText) {
            return;
        }

        if (state.isPopupClosing) {
            ns.popupDom?.destroyPopup();
        }
        if (state.activeText !== normalizedText) {
            audio?.clearPracticeResults();
        }
        state.activeText = normalizedText;
        const providedContext = String(options.context || "").trim();
        if (providedContext) {
            state.activeContext = popupHelpers?.normalizeContext(providedContext) || providedContext;
            state.activeContextSource = options.contextSource || "selection";
            state.activeContextConfidence = options.contextConfidence || "exact";
        } else {
            const extracted = state.settings.disablePageContextExtraction
                ? { context: "", source: "", confidence: "none" }
                : ns.eventUtils?.extractSurroundingContext(normalizedText) || { context: "", source: "", confidence: "none" };
            state.activeContext = extracted.context;
            state.activeContextSource = extracted.source;
            state.activeContextConfidence = extracted.confidence;
        }

        state.currentPosition = getPopupPosition(getSelectionRectForText(normalizedText), event || null);
        state.currentSelectionRect = getSelectionRectForText(normalizedText);
        state.lastPreloadKey = "";
        state.activeAiIntent = "";
        const available = getAvailableTabs();
        state.activeTab = available.includes(state.activeTab) ? state.activeTab : state.settings.defaultTab;
        state.activeTab = available.includes(state.activeTab) ? state.activeTab : available[0];

        ns.popupDom?.ensurePopup();
        ns.popupDom?.applyPopupDimensions();
        ns.popupDom?.applyTheme();
        setPopupPosition(state.currentPosition);
        ns.popupDom?.renderShell();
        maybePreloadAi();
        loadTab(state.activeTab);
    }

    function openPopupFromSnapshot(snapshot, event, options = {}) {
        const state = ns.state;
        if (!state.extensionContextValid) {
            ns.popupDom?.showRefreshRequiredMessage(event);
            return;
        }

        if (!snapshot?.text) {
            return;
        }

        if (state.isPopupClosing) {
            ns.popupDom?.destroyPopup();
        }

        const normalizedText = snapshot.text.trim();
        const audio = window.DictionaryHelperAudio;
        if (state.activeText !== normalizedText) {
            audio?.clearPracticeResults();
        }
        state.activeText = normalizedText;
        state.restoreFocusElement = options.keyboard && document.activeElement ? document.activeElement : null;
        state.focusPopupOnOpen = Boolean(options.keyboard);

        const activeSelection = window.getSelection();
        const isCollapsed = !activeSelection || activeSelection.isCollapsed;
        const selectionMatches = activeSelection && activeSelection.toString().trim() === normalizedText;
        const rect = !isCollapsed && selectionMatches
            ? (snapshot.rect || getSelectionRectForText(normalizedText))
            : (snapshot.rect || null);

        state.currentSelectionRect = rect;
        state.currentPosition = getPopupPosition(rect, event);
        state.activeContext = snapshot.context || "";
        state.activeContextSource = snapshot.contextSource || "";
        state.activeContextConfidence = snapshot.contextConfidence || "none";

        if (!state.activeContext && !state.settings?.disablePageContextExtraction) {
            const extracted = ns.eventUtils?.extractSurroundingContext(normalizedText);
            if (extracted?.context) {
                state.activeContext = extracted.context;
                state.activeContextSource = extracted.source;
                state.activeContextConfidence = extracted.confidence;
            }
        }
        state.lastPreloadKey = "";
        state.activeAiIntent = "";
        const available = getAvailableTabs();
        state.activeTab = available.includes(state.activeTab) ? state.activeTab : state.settings.defaultTab;
        state.activeTab = available.includes(state.activeTab) ? state.activeTab : available[0];

        ns.popupDom?.ensurePopup();
        ns.popupDom?.applyPopupDimensions();
        ns.popupDom?.applyTheme();
        setPopupPosition(state.currentPosition);
        ns.popupDom?.renderShell();
        maybePreloadAi();
        loadTab(state.activeTab);
    }

    ns.lookupController = ns.tabLoader = {
        getAvailableTabs,
        getLookupResponse,
        getSelectionRectForText,
        shouldUseFixedPopup,
        getPopupPosition,
        setPopupPosition,
        syncFollowUpState,
        patchActiveFollowUps,
        preloadFollowUpIntents,
        maybePreloadAi,
        loadTab,
        openPopupForText,
        openPopupFromSnapshot
    };
})(typeof window !== "undefined" ? window : globalThis);
