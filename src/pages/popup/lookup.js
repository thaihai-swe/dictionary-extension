import { CANCEL_LOOKUP } from "../../shared/messages.js";
import { canInjectIntoUrl, classifyPageRestriction } from "../../shared/page-utils.js";
import {
    audio,
    contextInput,
    getRenderOptions,
    input,
    lookupCache,
    lookupClient,
    popupHelpers,
    renderer,
    resultRoot,
    state
} from "./state.js";
import {
    getAvailableTabs,
    renderIdleState,
    renderState,
    renderTabs,
    syncAiActionButtonStatus,
    updateContextActionVisibility,
    updateContextHelp,
    updateContextHelpForRestriction
} from "./view.js";

export function syncFollowUpState(text = state.activeQuery, context = state.contextText) {
    if (!state.settings?.enableAiPreload || !state.settings?.enableAI) {
        state.activeFollowUps = [];
        return;
    }

    const eligible = popupHelpers.getEligibleFollowUpIntents({ text, context });
    state.activeFollowUps = eligible.map((item) => {
        const cacheKey = lookupClient.buildRequestCacheKey("ai", text, state.settings, {
            context,
            intent: item.intent
        });
        const cached = lookupCache.get(cacheKey);
        return {
            ...item,
            result: cached || null,
            loading: !cached,
            error: ""
        };
    });
}

export function patchActiveFollowUps() {
    if (state.activeTab !== "ai" || !resultRoot) {
        return;
    }
    syncAiActionButtonStatus();
}

export async function preloadFollowUpIntents(text = state.activeQuery, context = state.contextText, token = state.requestToken) {
    if (!state.settings?.enableAiPreload || !state.settings?.enableAI) {
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
            const response = await lookupClient.getLookupResponse({
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

export function maybePreloadAi(query = state.activeQuery, currentTab = state.activeTab) {
    const normalizedQuery = String(query || "").trim();
    const preloadKey = lookupClient.buildRequestCacheKey("ai", normalizedQuery, state.settings, {});

    if (
        !state.settings.enableAiPreload ||
        !state.settings.enableAI ||
        !normalizedQuery ||
        currentTab === "ai" ||
        state.lastPreloadKey === preloadKey
    ) {
        return;
    }

    state.lastPreloadKey = preloadKey;
    void lookupClient.getLookupResponse({
        tab: "ai",
        text: normalizedQuery,
        settings: state.settings,
        requestOptions: { trigger: "manual" },
        cache: lookupCache
    })
        .then(() => preloadFollowUpIntents(normalizedQuery, state.contextText, state.requestToken))
        .catch(() => {
            // Keep preload failures silent until the user opens the AI tab.
        });
}

export async function loadTab(tab) {
    const availableTabs = getAvailableTabs();
    if (!availableTabs.includes(tab)) {
        renderState("Enable this source in the extension settings.", true);
        return;
    }

    const query = state.activeQuery.trim();
    if (!query) {
        renderIdleState();
        return;
    }

    state.requestToken += 1;
    const token = state.requestToken;
    state.activeRequestId = "";
    state.lastLookupRevision = -1;
    audio.stopPronunciation();
    if (tab !== "ai") {
        state.activeFollowUps = [];
        state.activeAiIntent = "";
    } else {
        state.activeAiIntent = "default";
    }
    syncAiActionButtonStatus();

    const cacheKey = lookupClient.buildRequestCacheKey(tab, query, state.settings, {});
    const cached = lookupCache.get(cacheKey);
    if (cached) {
        if (cached.requestId) {
            state.activeRequestId = cached.requestId;
        }
        state.lastLookupRevision = Number.isFinite(cached.revision) ? cached.revision : (cached.enriched ? 2 : 0);
        if (tab === "ai") {
            syncFollowUpState(query, state.contextText);
        }
        resultRoot.setAttribute("aria-busy", "false");
        popupHelpers.paintLookupResult(resultRoot, renderer.renderResult(cached, getRenderOptions()));
        audio.restorePracticeResult(resultRoot, query, cached.pronunciation?.language);
        syncAiActionButtonStatus();
        if (tab === "ai") {
            void preloadFollowUpIntents(query, state.contextText, token);
        } else {
            maybePreloadAi(query, tab);
        }
        return;
    }
    resultRoot.setAttribute("aria-busy", "true");
    renderState(`Loading ${renderer.labelForTab(tab).toLowerCase()}...`, false, true);

    try {
        const response = await lookupClient.getLookupResponse({
            tab,
            text: query,
            settings: state.settings,
            requestOptions: { trigger: "manual" },
            cache: lookupCache
        });

        if (token !== state.requestToken) {
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
            syncFollowUpState(query, state.contextText);
        }
        popupHelpers.paintLookupResult(resultRoot, renderer.renderResult(response.result, getRenderOptions()));
        audio.restorePracticeResult(resultRoot, query, response.result?.pronunciation?.language);
        syncAiActionButtonStatus();
        if (tab === "ai") {
            void preloadFollowUpIntents(query, state.contextText, token);
        } else {
            maybePreloadAi(query, tab);
        }
    } catch (error) {
        if (token !== state.requestToken || error?.name === "AbortError" || String(error?.message || "").includes("aborted")) {
            return;
        }

        renderState(error.message || "Unable to load results.", true);
    } finally {
        if (token === state.requestToken) {
            resultRoot.setAttribute("aria-busy", "false");
        }
    }
}

export async function prefillPageContext() {
    if (state.contextText || !state.activeQuery.trim()) {
        return;
    }

    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab?.id) {
            return;
        }

        if (!canInjectIntoUrl(tab.url)) {
            updateContextHelpForRestriction(classifyPageRestriction(tab.url));
            return;
        }

        const response = await chrome.tabs.sendMessage(tab.id, {
            type: "GET_PAGE_CONTEXT",
            payload: { text: state.activeQuery }
        });
        const pageContext = String(response?.context || "").trim();
        if (!pageContext || state.contextText || !contextInput) {
            return;
        }
        state.contextText = pageContext;
        state.contextSource = response?.source || "page";
        state.contextConfidence = response?.confidence || (state.contextSource === "selection" ? "exact" : "suggested");
        contextInput.value = pageContext;
        updateContextHelp();
        popupHelpers.autosizeTextarea(contextInput, { minRows: 2, maxRows: 4 });
    } catch (_error) {
        updateContextHelpForRestriction("content_script_unavailable");
    }
}

export function cancelPendingLookup() {
    if (!state.activeQuery && !state.activeRequestId && state.requestToken === 0) {
        return;
    }

    state.requestToken += 1;
    state.activeRequestId = "";
    void chrome.runtime.sendMessage({ type: CANCEL_LOOKUP }).catch(() => {});
}

export async function consumeStashedFallbackLookup() {
    const params = new URLSearchParams(window.location.search);
    const queryFallback = String(params.get("lookup") || "").trim();
    if (queryFallback) {
        applyFallbackQuery(queryFallback);
        return;
    }

    if (!chrome.storage?.session) {
        return;
    }

    const key = "dictionaryHelperToolbarFallbackLookup";
    try {
        const data = await chrome.storage.session.get(key);
        const item = data?.[key];
        if (!item?.text) {
            return;
        }

        await chrome.storage.session.remove(key);

        const ageMs = Date.now() - (Number(item.createdAt) || 0);
        if (ageMs > 60000) {
            return;
        }

        applyFallbackQuery(item.text);
    } catch (_error) {
        // Fallback consumption is best-effort.
    }
}

export function applyFallbackQuery(value) {
    const query = String(value || "").trim();
    if (!query) {
        return;
    }

    if (input) {
        input.value = query;
    }
    state.activeQuery = query;
    updateContextActionVisibility();
    void loadTab(state.activeTab);

    if (state.activeTab === "ai" && !state.contextText) {
        void prefillPageContext();
    }
}
