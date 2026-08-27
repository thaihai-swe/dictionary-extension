/**
 * popup-controller.js — Unified Controller for Dictionary Popups
 * Shares event handling, tab switching, AI intent execution, and context input state
 * between In-Page Selection Popup (Shadow DOM) and Toolbar Extension Popup.
 */
(function (global) {
    "use strict";

    const PopupController = {
        /**
         * Attaches common UI event listeners to a container root (Document or ShadowRoot).
         * @param {Object} params
         * @param {Element|ShadowRoot} params.container - Root container element.
         * @param {Object} params.state - Reactive popup state object.
         * @param {Function} params.loadTab - Async tab loading callback.
         * @param {Function} params.runAiAction - Async AI action execution callback.
         * @param {Function} [params.updateContextHelp] - Callback to update context help message.
         * @param {Function} [params.clearContextError] - Callback to clear context error message.
         * @param {Object} [params.audio] - Audio practice player reference.
         * @param {Object} [params.popupHelpers] - Popup helpers reference.
         */
        attachCommonListeners(params) {
            const {
                container,
                state,
                loadTab,
                runAiAction,
                updateContextHelp = () => {},
                clearContextError = () => {},
                audio = null,
                popupHelpers = global.popupHelpers
            } = params;

            if (!container) return;

            // 1. Tab Switching
            container.addEventListener("click", (event) => {
                const tabBtn = event.target.closest("[data-tab-target], [data-tab]");
                if (tabBtn) {
                    const targetTab = tabBtn.dataset.tabTarget || tabBtn.dataset.tab;
                    if (targetTab && targetTab !== state.activeTab) {
                        state.activeTab = targetTab;
                        if (popupHelpers?.writeLastTab) {
                            void popupHelpers.writeLastTab(targetTab);
                        }
                        if (typeof loadTab === "function") {
                            void loadTab(targetTab);
                        }
                    }
                }
            });

            // 2. AI Intent Buttons
            container.addEventListener("click", (event) => {
                const aiBtn = event.target.closest("[data-ai-intent]");
                if (aiBtn) {
                    const intent = aiBtn.dataset.aiIntent;
                    if (intent) {
                        state.activeAiIntent = intent;
                        if (popupHelpers?.writeLastIntent) {
                            void popupHelpers.writeLastIntent(intent);
                        }
                        if (typeof runAiAction === "function") {
                            void runAiAction(intent);
                        }
                    }
                }
            });

            // 3. Phrase / Collocation Inline Quick-Lookups
            container.addEventListener("click", (event) => {
                const phraseBtn = event.target.closest("[data-lookup-query]");
                if (phraseBtn) {
                    const query = String(phraseBtn.dataset.lookupQuery || "").trim();
                    if (query && query.toLowerCase() !== String(state.activeQuery || "").trim().toLowerCase()) {
                        if (audio?.clearPracticeResults) {
                            audio.clearPracticeResults();
                        }
                        state.activeQuery = query;
                        state.activeTab = "dictionary";
                        state.activeAiIntent = "";
                        if (popupHelpers?.writeLastTab) {
                            void popupHelpers.writeLastTab("dictionary");
                        }
                        if (typeof loadTab === "function") {
                            void loadTab("dictionary");
                        }
                    }
                }
            });

            // 4. Context Input Binding
            const contextInput = container.querySelector("#dictionary-helper-context-input, #toolbar-popup-context-input, .dictionary-helper-context-input, .toolbar-popup-context-input");
            if (contextInput) {
                contextInput.addEventListener("input", () => {
                    if (popupHelpers?.normalizeContext) {
                        state.contextText = popupHelpers.normalizeContext(contextInput.value);
                    } else {
                        state.contextText = contextInput.value.trim();
                    }
                    state.contextSource = state.contextText ? "manual" : "";
                    state.contextConfidence = state.contextText ? "manual" : "none";
                    clearContextError();
                    updateContextHelp();
                    if (popupHelpers?.autosizeTextarea) {
                        popupHelpers.autosizeTextarea(contextInput, { minRows: 2, maxRows: 4 });
                    }
                });
            }
        }
    };

    global.PopupController = PopupController;
})(typeof globalThis !== "undefined" ? globalThis : typeof self !== "undefined" ? self : window);
