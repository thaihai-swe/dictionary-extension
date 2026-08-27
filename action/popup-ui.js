import { isHostnamePaused, saveSettings } from "../src/shared/storage.js";
import {
    DEFAULT_BODY_MESSAGE,
    TAB_ORDER,
    audio,
    contextActionContainer,
    contextError,
    contextInput,
    explainCompareButton,
    explainContextButton,
    explainGrammarButton,
    explainPhraseExplorerButton,
    explainRephraseButton,
    explainSentenceButton,
    pauseSiteButton,
    popupHelpers,
    popupRoot,
    popupShell,
    renderer,
    resultRoot,
    state,
    tabsRoot
} from "./popup-state.js";

export function applyDimensions() {
    const dimensions = popupShell?.clampDimensions(state.settings?.popupWidth, state.settings?.popupHeight)
        || { width: 620, height: 720 };
    const { width, height } = dimensions;
    const toolbarHeight = Math.min(height, 580);

    document.documentElement.style.width = `${width}px`;
    document.documentElement.style.height = `${toolbarHeight}px`;
    document.documentElement.style.minWidth = "280px";
    document.documentElement.style.maxWidth = "100%";
    document.documentElement.style.maxHeight = `${toolbarHeight}px`;
    document.documentElement.style.overflow = "hidden";

    document.body.style.width = "100%";
    document.body.style.height = "100%";
    document.body.style.minWidth = "280px";
    document.body.style.overflow = "hidden";

    if (popupRoot) {
        popupRoot.style.width = "100%";
        popupRoot.style.height = "100%";
        popupRoot.style.maxWidth = "100%";
        popupRoot.style.maxHeight = "100%";
        popupRoot.style.overflowY = "auto";
        popupRoot.style.overflowX = "hidden";
    }

    if (resultRoot) {
        resultRoot.style.maxHeight = "none";
        resultRoot.style.flex = "none";
        resultRoot.style.overflow = "visible";
    }
}

export async function getActiveTabHostname() {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        const url = String(tab?.url || "");
        if (!url) {
            return "";
        }
        return new URL(url).hostname.toLowerCase();
    } catch (_error) {
        return "";
    }
}

export function renderPauseSiteButton(hostname, paused) {
    if (!pauseSiteButton) {
        return;
    }
    if (!hostname) {
        pauseSiteButton.hidden = true;
        return;
    }
    pauseSiteButton.hidden = false;
    pauseSiteButton.setAttribute("aria-pressed", String(paused));
    pauseSiteButton.textContent = paused ? "Resume site" : "Pause site";
    pauseSiteButton.title = paused
        ? `Resume in-page triggers on ${hostname}`
        : `Pause in-page triggers on ${hostname}`;
}

export async function updatePauseSiteButton() {
    const hostname = await getActiveTabHostname();
    const paused = isHostnamePaused(hostname, state.settings?.pausedHostnames);
    renderPauseSiteButton(hostname, paused);
}

export async function handlePauseSite() {
    const hostname = await getActiveTabHostname();
    if (!hostname) {
        return;
    }
    const paused = new Set(Array.isArray(state.settings?.pausedHostnames) ? state.settings.pausedHostnames : []);
    if (paused.has(hostname)) {
        paused.delete(hostname);
    } else {
        paused.add(hostname);
    }
    const pausedHostnames = [...paused];
    state.settings.pausedHostnames = pausedHostnames;
    await saveSettings({ pausedHostnames });
    renderPauseSiteButton(hostname, paused.has(hostname));
}

export function getAvailableTabs() {
    return TAB_ORDER.filter((tab) => {
        if (tab === "dictionary") {
            return state.settings?.enableTranslate || state.settings?.enableDictionary;
        }

        if (tab === "ai") {
            return state.settings?.enableAI;
        }

        return false;
    });
}

export async function getInitialTab() {
    const availableTabs = getAvailableTabs();
    const lastTab = await popupHelpers.readLastTab();
    if (availableTabs.includes(lastTab)) {
        return lastTab;
    }
    if (availableTabs.includes(state.settings?.defaultTab)) {
        return state.settings.defaultTab;
    }

    return availableTabs[0] || "dictionary";
}

export function renderTabs() {
    const availableTabs = getAvailableTabs();
    tabsRoot.setAttribute("role", "tablist");
    tabsRoot.innerHTML = availableTabs
        .map((tab) => {
            const activeClass = tab === state.activeTab ? " is-active" : "";
            return `<button class="toolbar-popup-tab${activeClass}" data-tab="${tab}" type="button" role="tab" aria-selected="${tab === state.activeTab}" aria-controls="result" id="tab-${tab}">${renderer.labelForTab(tab)}</button>`;
        })
        .join("");
    if (resultRoot) {
        resultRoot.setAttribute("role", "tabpanel");
        resultRoot.setAttribute("aria-labelledby", `tab-${state.activeTab}`);
    }
}

export function renderIdleState() {
    audio.stopPronunciation();
    renderState(DEFAULT_BODY_MESSAGE);
}

export function renderState(message, isError = false, isLoading = false) {
    if (!resultRoot) return;
    if (isLoading) {
        resultRoot.innerHTML = renderer.renderSkeleton("toolbar-popup");
        return;
    }

    const errorClass = isError ? " is-error" : "";
    const title = isError ? "Something went wrong" : "Ready";
    const showTitle = isError || message === DEFAULT_BODY_MESSAGE;
    const titleHtml = showTitle ? `<strong>${renderer.escapeHtml(isError ? title : "Look up a word")}</strong>` : "";
    resultRoot.innerHTML = `<div class="toolbar-popup-state${errorClass}">${titleHtml}<span>${renderer.escapeHtml(message)}</span></div>`;
}

export function updateContextActionVisibility() {
    if (!contextActionContainer) {
        return;
    }

    const shouldShow = Boolean(state.settings?.enableAI) && state.activeTab === "ai" && Boolean(state.activeQuery.trim());
    contextActionContainer.hidden = !shouldShow;

    if (contextInput) {
        contextInput.disabled = !shouldShow;
    }

    const queryTrimmed = Boolean(state.activeQuery.trim());
    if (explainContextButton) explainContextButton.disabled = !shouldShow || !queryTrimmed;
    if (explainGrammarButton) explainGrammarButton.disabled = !shouldShow || !queryTrimmed;
    if (explainSentenceButton) explainSentenceButton.disabled = !shouldShow || !queryTrimmed;
    if (explainPhraseExplorerButton) explainPhraseExplorerButton.disabled = !shouldShow || !queryTrimmed;
    if (explainCompareButton) explainCompareButton.disabled = !shouldShow || !queryTrimmed;
    if (explainRephraseButton) explainRephraseButton.disabled = !shouldShow || !queryTrimmed;

    syncAiActionButtonStatus();
}

export function syncAiActionButtonStatus() {
    popupHelpers.syncAiActionButtonStatus(
        [explainContextButton, explainGrammarButton, explainPhraseExplorerButton, explainSentenceButton, explainCompareButton, explainRephraseButton].filter(Boolean),
        state.activeFollowUps,
        state.activeAiIntent,
        "toolbar-popup"
    );
}

export function updateContextHelp() {
    const help = document.querySelector("#context-help");
    if (!help) return;
    if (state.contextConfidence === "exact") {
        help.textContent = "Context detected from your selection. You can edit it.";
    } else if (state.contextConfidence === "suggested") {
        help.textContent = "Suggested sentence from this page. You can edit or replace it.";
    } else {
        help.textContent = "Used only for this explanation. Not saved.";
    }
}

export function updateContextHelpForRestriction(reason) {
    const help = document.querySelector("#context-help");
    if (!help) {
        return;
    }

    if (reason === "pdf_viewer") {
        help.textContent = "PDF viewer pages cannot auto-extract context. Paste the sentence here.";
        return;
    }

    if (reason === "file_url") {
        help.textContent = "Local files need Allow access to file URLs, or paste the sentence here.";
        return;
    }

    if (reason === "restricted_page") {
        help.textContent = "This page cannot provide context automatically. Paste the sentence here.";
        return;
    }

    help.textContent = "Page context unavailable. Paste the sentence here.";
}

export function showContextError(message = "Paste or type the sentence that contains this word.") {
    if (contextError) {
        contextError.textContent = message;
        contextError.hidden = false;
    }
    if (contextInput) {
        contextInput.setAttribute("aria-invalid", "true");
    }
}

export function clearContextError() {
    if (contextError) {
        contextError.hidden = true;
    }
    if (contextInput) {
        contextInput.removeAttribute("aria-invalid");
    }
}

export function setContextActionButtonsDisabled(disabled) {
    [explainContextButton, explainGrammarButton, explainPhraseExplorerButton, explainSentenceButton, explainCompareButton, explainRephraseButton].forEach((button) => {
        if (button) {
            button.disabled = disabled;
        }
    });
}

export function isSentenceLikeQuery(value) {
    const text = String(value || "").trim();
    return /[.!?]/.test(text) || text.split(/\s+/).filter(Boolean).length >= 7;
}
