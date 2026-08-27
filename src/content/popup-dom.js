/**
 * popup-dom.js — In-page popup DOM lifecycle, resize, drag, theme, and shell rendering.
 */
(function (global) {
    "use strict";

    const ns = global.DictionaryHelperContent = global.DictionaryHelperContent || {};

    function applyTheme() {
        const state = ns.state;
        ns.settings?.applyThemeToNode(state.popupRoot, state.settings.theme, state.settings.fontFamily);
        ns.settings?.applyThemeToNode(state.triggerIconRoot, state.settings.theme, state.settings.fontFamily);
    }

    function applyPopupDimensions() {
        const state = ns.state;
        const popupShell = window.DictionaryHelperPopupShell;
        if (!state.popupCard) {
            return;
        }

        const dimensions = popupShell?.clampDimensions(state.settings.popupWidth, state.settings.popupHeight)
            || { width: 620, height: 720 };
        state.popupCard.style.width = `${dimensions.width}px`;
        state.popupCard.style.height = `${dimensions.height}px`;
        state.popupCard.style.maxHeight = `${dimensions.height}px`;
    }

    function populateContentLanguageSelect(select) {
        if (!select) return;
        const state = ns.state;
        const defaults = ["English", "Vietnamese"];
        const names = [...defaults, ...String(state.settings.customLanguages || "")
            .split(",").map((value) => value.trim()).filter(Boolean)]
            .filter((name, index, list) => list.findIndex((item) => item.toLowerCase() === name.toLowerCase()) === index);
        const selected = String(state.settings.translateTargetLanguage || "English").toLowerCase();
        select.replaceChildren();
        for (const name of names) {
            const option = document.createElement("option");
            option.value = name;
            option.textContent = name;
            option.selected = name.toLowerCase() === selected || (name === "English" && selected === "en") || (name === "Vietnamese" && selected === "vi");
            select.appendChild(option);
        }
    }

    function ensurePopup() {
        const state = ns.state;
        const popupShell = window.DictionaryHelperPopupShell;
        const popupHelpers = window.DictionaryHelperPopupHelpers;
        const audio = window.DictionaryHelperAudio;
        const lookupCache = window.DictionaryHelperCache ? window.DictionaryHelperCache.createLookupCache() : null;

        if (state.popupRoot) {
            return;
        }

        state.popupRoot = document.createElement("div");
        state.popupRoot.className = "dictionary-helper-root";
        if (!popupShell) {
            return;
        }
        state.popupRoot.innerHTML = popupShell.createMarkup({ prefix: "dictionary-helper", host: "inpage" });

        state.popupCard = state.popupRoot.querySelector(".dictionary-helper-card");

        state.popupRoot.querySelector(".dictionary-helper-close")?.addEventListener("click", () => destroyPopup({ animate: true }));
        state.popupRoot.addEventListener("keydown", (e) => ns.eventUtils?.trapPopupFocus(e, state.popupRoot));

        const shortcutsBtn = state.popupRoot.querySelector(".dictionary-helper-shortcuts-btn");
        const shortcutsModal = state.popupRoot.querySelector(".dictionary-helper-shortcuts-modal");
        const shortcutsClose = state.popupRoot.querySelector(".dictionary-helper-shortcuts-close");

        shortcutsBtn?.addEventListener("click", (event) => {
            event.stopPropagation();
            if (shortcutsModal) {
                shortcutsModal.hidden = !shortcutsModal.hidden;
            }
        });

        shortcutsClose?.addEventListener("click", (event) => {
            event.stopPropagation();
            if (shortcutsModal) {
                shortcutsModal.hidden = true;
            }
        });

        const themeToggle = state.popupRoot.querySelector(".dictionary-helper-theme-toggle");
        themeToggle?.addEventListener("click", async (event) => {
            event.stopPropagation();
            const currentTheme = state.settings.theme || "system";
            let isCurrentlyDark = false;
            if (currentTheme === "dark") {
                isCurrentlyDark = true;
            } else if (currentTheme === "light") {
                isCurrentlyDark = false;
            } else {
                isCurrentlyDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
            }
            const nextTheme = isCurrentlyDark ? "light" : "dark";
            state.settings.theme = nextTheme;
            applyTheme();
            try {
                await chrome.storage.sync.set({ theme: nextTheme });
            } catch (_error) {
                // Best-effort
            }
        });

        const expandBtn = state.popupRoot.querySelector(".dictionary-helper-expand-btn");
        let savedRectBeforeMaximize = null;
        expandBtn?.addEventListener("click", (event) => {
            event.stopPropagation();
            if (!state.popupCard) return;

            const isMaximized = state.popupCard.classList.contains("is-maximized");
            if (isMaximized) {
                state.popupCard.classList.remove("is-maximized");
                if (savedRectBeforeMaximize) {
                    state.popupCard.style.top = savedRectBeforeMaximize.top;
                    state.popupCard.style.left = savedRectBeforeMaximize.left;
                    state.popupCard.style.width = savedRectBeforeMaximize.width;
                    state.popupCard.style.height = savedRectBeforeMaximize.height;
                    state.popupCard.style.maxHeight = savedRectBeforeMaximize.maxHeight;
                    state.popupCard.style.position = savedRectBeforeMaximize.position;
                } else {
                    applyPopupDimensions();
                    ns.tabLoader?.setPopupPosition(state.currentPosition);
                }
            } else {
                savedRectBeforeMaximize = {
                    top: state.popupCard.style.top,
                    left: state.popupCard.style.left,
                    width: state.popupCard.style.width,
                    height: state.popupCard.style.height,
                    maxHeight: state.popupCard.style.maxHeight,
                    position: state.popupCard.style.position
                };
                state.popupCard.classList.add("is-maximized");
            }
        });

        const providerSelect = state.popupRoot.querySelector(".dictionary-helper-header-select");
        const languageInput = state.popupRoot.querySelector(".dictionary-helper-header-lang");
        populateContentLanguageSelect(languageInput);

        if (providerSelect) {
            providerSelect.value = state.settings.dictionaryProvider || "free_dictionary";
            providerSelect.addEventListener("change", async (event) => {
                const next = event.target.value;
                state.settings.dictionaryProvider = next;
                try {
                    await chrome.storage.sync.set({ dictionaryProvider: next });
                } catch (_error) {
                    // Best-effort
                }
                lookupCache?.clear();
                state.lastPreloadKey = "";
                if (state.activeText) {
                    void ns.tabLoader?.loadTab(state.activeTab);
                }
            });
        }

        if (languageInput) {
            languageInput.addEventListener("change", async (event) => {
                const next = String(event.target.value || "").trim();
                if (!next) {
                    return;
                }
                state.settings.translateTargetLanguage = next;
                try {
                    await chrome.storage.sync.set({ translateTargetLanguage: next });
                } catch (_error) {
                    // Best-effort
                }
                lookupCache?.clear();
                state.lastPreloadKey = "";
                if (state.activeText) {
                    void ns.tabLoader?.loadTab(state.activeTab);
                }
            });
        }

        state.popupRoot.querySelector(".dictionary-helper-tabs")?.addEventListener("click", (event) => {
            const button = event.target.closest("[data-tab]");
            if (!button) {
                return;
            }

            state.activeTab = button.dataset.tab;
            void popupHelpers.writeLastTab(state.activeTab);
            renderShell();
            audio?.stopPronunciation();
            void ns.tabLoader?.loadTab(state.activeTab);
        });

        state.popupRoot.querySelector(".dictionary-helper-context-host")?.addEventListener("input", (event) => {
            if (!event.target.matches("#dictionary-helper-context-input")) {
                return;
            }
            state.activeContext = popupHelpers.normalizeContext(event.target.value);
            state.activeContextSource = state.activeContext ? "manual" : "";
            state.activeContextConfidence = state.activeContext ? "manual" : "none";
            const error = state.popupRoot.querySelector("#dictionary-helper-context-error");
            if (error) {
                error.hidden = true;
            }
            event.target.removeAttribute("aria-invalid");
            updateContextHelp();
            popupHelpers.autosizeTextarea(event.target, { minRows: 2, maxRows: 4 });
        });

        state.popupRoot.querySelector(".dictionary-helper-body")?.addEventListener("click", (event) => {
            audio?.handlePronunciationClick(event);

            const phraseBtn = event.target.closest("[data-lookup-query]");
            if (phraseBtn) {
                const query = String(phraseBtn.dataset.lookupQuery || "").trim();
                if (query && query.toLowerCase() !== String(state.activeText || "").trim().toLowerCase()) {
                    audio?.clearPracticeResults();
                    state.activeText = query;
                    state.activeTab = "dictionary";
                    state.activeAiIntent = "";
                    void popupHelpers.writeLastTab(state.activeTab);
                    renderShell();
                    void ns.tabLoader?.loadTab("dictionary");
                }
            }
        });

        // Resize logic
        const resizer = state.popupRoot.querySelector(".dictionary-helper-resizer");
        let isResizing = false;
        let startX = 0;
        let startY = 0;
        let startWidth = 0;
        let startHeight = 0;

        const handleResizeMove = (e) => {
            if (!isResizing || !state.popupCard) {
                return;
            }

            const dimensions = popupShell.clampDimensions(
                startWidth + e.clientX - startX,
                startHeight + e.clientY - startY
            );
            state.popupCard.style.width = `${dimensions.width}px`;
            state.popupCard.style.height = `${dimensions.height}px`;
            state.popupCard.style.maxHeight = `${dimensions.height}px`;
            e.preventDefault();
        };

        const handleResizeUp = () => {
            if (!isResizing || !state.popupCard) {
                return;
            }

            isResizing = false;
            state.popupCard.classList.remove("is-resizing");
            document.body.style.userSelect = "";
            const newWidth = parseInt(state.popupCard.style.width, 10);
            const newHeight = parseInt(state.popupCard.style.height || state.popupCard.style.maxHeight, 10);
            if (newWidth && newHeight) {
                state.settings.popupWidth = newWidth;
                state.settings.popupHeight = newHeight;
                void chrome.storage.sync.set({ popupWidth: newWidth, popupHeight: newHeight });
            }
        };

        resizer?.addEventListener("mousedown", (e) => {
            if (e.button !== 0) return;
            isResizing = true;
            startX = e.clientX;
            startY = e.clientY;
            startWidth = state.popupCard.offsetWidth;
            startHeight = state.popupCard.offsetHeight;
            state.popupCard.classList.add("is-resizing");
            document.body.style.userSelect = "none";
            e.preventDefault();
            e.stopPropagation();
        });

        document.addEventListener("mousemove", handleResizeMove, true);
        document.addEventListener("mouseup", handleResizeUp, true);
        state.unbindPopupResize = () => {
            document.removeEventListener("mousemove", handleResizeMove, true);
            document.removeEventListener("mouseup", handleResizeUp, true);
            state.unbindPopupResize = null;
        };

        // Drag-to-move logic
        const dragHandle = state.popupRoot.querySelector(".dictionary-helper-header");
        let isDragging = false;
        let dragStartX = 0;
        let dragStartY = 0;
        let dragOriginLeft = 0;
        let dragOriginTop = 0;

        dragHandle?.addEventListener("mousedown", (e) => {
            if (e.button !== 0) return;
            if (e.target.closest("select, button, input, textarea, a")) return;

            isDragging = true;
            dragStartX = e.clientX;
            dragStartY = e.clientY;

            const rect = state.popupCard.getBoundingClientRect();
            dragOriginLeft = rect.left;
            dragOriginTop = rect.top;

            state.popupCard.classList.add("is-dragging");
            document.body.style.userSelect = "none";
            e.preventDefault();
        });

        document.addEventListener("mousemove", (e) => {
            if (!isDragging || !state.popupCard) return;

            const dx = e.clientX - dragStartX;
            const dy = e.clientY - dragStartY;

            const visual = window.visualViewport;
            const vw = visual?.width || window.innerWidth;
            const vh = visual?.height || window.innerHeight;
            const offsetLeft = visual?.offsetLeft || 0;
            const offsetTop = visual?.offsetTop || 0;
            const margin = 8;
            const cardW = state.popupCard.offsetWidth;
            const cardH = state.popupCard.offsetHeight;

            const newLeft = Math.max(offsetLeft + margin, Math.min(dragOriginLeft + dx, offsetLeft + vw - cardW - margin));
            const newTop = Math.max(offsetTop + margin, Math.min(dragOriginTop + dy, offsetTop + vh - cardH - margin));

            state.popupCard.style.position = "fixed";
            state.popupCard.style.left = `${Math.round(newLeft)}px`;
            state.popupCard.style.top = `${Math.round(newTop)}px`;
            e.preventDefault();
        }, true);

        document.addEventListener("mouseup", () => {
            if (!isDragging || !state.popupCard) return;

            isDragging = false;
            state.popupCard.classList.remove("is-dragging");
            document.body.style.userSelect = "";

            state.currentPosition = {
                ...state.currentPosition,
                x: parseFloat(state.popupCard.style.left) || state.currentPosition.x,
                y: parseFloat(state.popupCard.style.top) || state.currentPosition.y,
                useFixed: true
            };
        }, true);

        const mountNode = document.body || document.documentElement;
        mountNode.appendChild(state.popupRoot);
        if (state.focusPopupOnOpen) {
            requestAnimationFrame(() => state.popupRoot?.querySelector(".dictionary-helper-tab.is-active, .dictionary-helper-close")?.focus());
        }

        if (typeof ResizeObserver === "function" && state.popupCard) {
            const observer = new ResizeObserver(() => {
                if (!state.popupCard || isResizing || state.popupCard.classList.contains("is-resizing")) return;
                const pos = ns.positioning;
                if (pos?.refinePopupMaxHeight) {
                    pos.refinePopupMaxHeight(state.popupCard, state.currentPosition);
                }
            });
            observer.observe(state.popupCard);
            state.popupCard.__resizeObserver = observer;
        }
    }

    function removePopup() {
        const state = ns.state;
        if (!state.popupRoot) {
            return;
        }

        if (typeof state.unbindPopupResize === "function") {
            state.unbindPopupResize();
        }
        state.popupRoot.remove();
        state.popupRoot = null;
        state.popupCard = null;
        state.isPopupClosing = false;
        const element = state.restoreFocusElement;
        state.restoreFocusElement = null;
        if (element?.isConnected && typeof element.focus === "function") {
            try { element.focus({ preventScroll: true }); } catch (_error) { element.focus(); }
        }
    }

    function prefersReducedMotion() {
        return typeof window.matchMedia === "function"
            && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    }

    function destroyPopup({ animate = false } = {}) {
        const state = ns.state;
        const audio = window.DictionaryHelperAudio;

        if (!state.popupRoot) {
            return;
        }

        if (state.isPopupClosing) {
            if (!animate) {
                removePopup();
            }
            return;
        }

        state.requestToken += 1;
        state.activeRequestId = "";
        state.lastLookupRevision = -1;
        const cancelType = window.DictionaryHelperMessages?.CANCEL_LOOKUP || "CANCEL_LOOKUP";
        void chrome.runtime.sendMessage({ type: cancelType }).catch(() => {});

        audio?.stopPronunciation();
        audio?.clearPracticeResults();
        if (typeof state.unbindViewportReposition === "function") {
            state.unbindViewportReposition();
            state.unbindViewportReposition = null;
        }

        if (!animate || prefersReducedMotion()) {
            removePopup();
            return;
        }

        state.isPopupClosing = true;
        state.popupCard?.classList.add("is-closing");
        const timer = window.setTimeout(removePopup, 160);
        state.popupCard?.addEventListener("animationend", () => {
            window.clearTimeout(timer);
            removePopup();
        }, { once: true });
    }

    function renderShell() {
        const state = ns.state;
        const renderer = window.DictionaryHelperRenderer;
        const popupHelpers = window.DictionaryHelperPopupHelpers;

        if (!state.popupRoot) {
            return;
        }

        const tabs = state.popupRoot.querySelector(".dictionary-helper-tabs");
        const contextHost = state.popupRoot.querySelector(".dictionary-helper-context-host");
        const availableTabs = ns.tabLoader?.getAvailableTabs() || [];

        if (availableTabs.length === 0) {
            if (tabs) tabs.innerHTML = "";
            if (contextHost) contextHost.innerHTML = "";
            const body = state.popupRoot.querySelector(".dictionary-helper-body");
            if (body) {
                body.innerHTML = `<div class="dictionary-helper-state"><strong>No sources enabled</strong><span>Turn on Dictionary or AI in the extension settings.</span></div>`;
            }
            return;
        }

        const tabButtons = availableTabs.map((tab) => {
            const activeClass = tab === state.activeTab ? " is-active" : "";
            return `<button class="dictionary-helper-tab${activeClass}" data-tab="${tab}" id="dictionary-helper-tab-${tab}" type="button" role="tab" aria-selected="${tab === state.activeTab}" aria-controls="dictionary-helper-result">${renderer?.labelForTab(tab)}</button>`;
        }).join("");

        const contextPill = state.settings.disablePageContextExtraction
            ? `<span class="dictionary-helper-context-pill is-private" title="Automatic page context is disabled">🚫 Context: None</span>`
            : `<span class="dictionary-helper-context-pill" title="Only the bounded surrounding sentence may be sent to the AI provider">🔒 Context: Bounded Sentence</span>`;
        const contextAction = state.activeTab === "ai" && state.activeText.trim()
            ? `<div class="dictionary-helper-context-action" aria-live="polite">
            ${contextPill}
            <label class="dictionary-helper-context-label" for="dictionary-helper-context-input">Context</label>
            <textarea id="dictionary-helper-context-input" class="dictionary-helper-context-input" rows="2" placeholder="Paste the sentence or context here..." aria-describedby="dictionary-helper-context-help dictionary-helper-context-error">${renderer?.escapeHtml(state.activeContext)}</textarea>
            <div class="dictionary-helper-context-help" id="dictionary-helper-context-help">${getContextHelpMessage()}</div>
            <div class="dictionary-helper-context-error" id="dictionary-helper-context-error" role="alert" hidden>Please enter or paste the sentence containing this word.</div>
            <div class="dictionary-helper-context-buttons">
                <button class="dictionary-helper-context-btn" id="dictionary-helper-explain-context" data-ai-intent="explain_in_context" type="button" title="Explain what this word means in the sentence above"><span class="dictionary-helper-context-btn-label">Context Explain</span></button>
                <button class="dictionary-helper-context-btn" id="dictionary-helper-explain-grammar" data-ai-intent="grammar" type="button" title="Analyze syntax role, word order, and tone"><span class="dictionary-helper-context-btn-label">Grammar &amp; Nuance</span></button>
                <button class="dictionary-helper-context-btn" id="dictionary-helper-explain-phrase-explorer" data-ai-intent="phrase_explorer" type="button" title="Explore idioms, phrasal verbs, and collocations"><span class="dictionary-helper-context-btn-label">Phrase &amp; Collocations</span></button>
                <button class="dictionary-helper-context-btn" id="dictionary-helper-explain-sentence" data-ai-intent="sentence_breakdown" type="button" title="Break down sentence structure and parse components"><span class="dictionary-helper-context-btn-label">Sentence Breakdown</span></button>
                <button class="dictionary-helper-context-btn" id="dictionary-helper-explain-compare" data-ai-intent="compare_confusables" type="button" title="Compare similar or confusable words"><span class="dictionary-helper-context-btn-label">Compare Confusables</span></button>
                <button class="dictionary-helper-context-btn" id="dictionary-helper-explain-rephrase" data-ai-intent="rephrase" type="button" title="Rephrase in simpler, formal, and idiomatic styles"><span class="dictionary-helper-context-btn-label">Rephrase</span></button>
            </div>
           </div>`
            : "";

        if (tabs) {
            tabs.innerHTML = `<div class="dictionary-helper-tablist" role="tablist">${tabButtons}</div>`;
            tabs.setAttribute("role", "presentation");
        }
        const bodyPanel = state.popupRoot.querySelector(".dictionary-helper-body");
        const announcement = state.popupRoot.querySelector(".dictionary-helper-announcements");
        if (announcement) announcement.textContent = `${renderer?.labelForTab(state.activeTab)} tab ready.`;
        if (bodyPanel) {
            bodyPanel.setAttribute("role", "tabpanel");
            bodyPanel.setAttribute("aria-labelledby", `dictionary-helper-tab-${state.activeTab}`);
            bodyPanel.setAttribute("id", "dictionary-helper-result");
        }
        if (contextHost) {
            contextHost.innerHTML = contextAction;
            const contextField = contextHost.querySelector('#dictionary-helper-context-input');
            if (contextField) {
                popupHelpers?.autosizeTextarea(contextField, { minRows: 2, maxRows: 4 });
            }
        }

        const contextButtons = [
            state.popupRoot.querySelector("#dictionary-helper-explain-context"),
            state.popupRoot.querySelector("#dictionary-helper-explain-grammar"),
            state.popupRoot.querySelector("#dictionary-helper-explain-phrase-explorer"),
            state.popupRoot.querySelector("#dictionary-helper-explain-sentence"),
            state.popupRoot.querySelector("#dictionary-helper-explain-compare"),
            state.popupRoot.querySelector("#dictionary-helper-explain-rephrase")
        ].filter(Boolean);

        const setContextButtonsDisabled = (disabled) => {
            contextButtons.forEach((btn) => { btn.disabled = disabled; });
        };

        const runInPageContextAction = ({ intent, errorMessage, validate = null, resolveContext = null }) => {
            const contextInput = state.popupRoot?.querySelector("#dictionary-helper-context-input");
            const query = state.activeText.trim();
            const showValidationError = (error) => {
                const errorEl = state.popupRoot?.querySelector("#dictionary-helper-context-error");
                if (errorEl) {
                    errorEl.textContent = error;
                    errorEl.hidden = false;
                }
                contextInput?.setAttribute("aria-invalid", "true");
                contextInput?.focus();
            };

            state.requestToken += 1;
            const token = state.requestToken;
            const body = state.popupRoot?.querySelector(".dictionary-helper-body");

            void popupHelpers.runAiContextAction({
                intent,
                query,
                validate: () => {
                    if (validate) {
                        const error = validate(contextInput, query);
                        if (error) {
                            showValidationError(error);
                            return error;
                        }
                        return null;
                    }
                    const validation = popupHelpers.validateContext(contextInput?.value || state.activeContext);
                    state.activeContext = resolveContext ? resolveContext(validation, query) : (validation.ok ? validation.context : "");
                    return null;
                },
                getContext: () => state.activeContext,
                setBusy: (busy) => {
                    setContextButtonsDisabled(busy);
                    if (!busy) {
                        body?.setAttribute("aria-busy", "false");
                        syncAiActionButtonStatus();
                    }
                },
                renderBusy: () => {
                    const errorEl = state.popupRoot?.querySelector("#dictionary-helper-context-error");
                    if (errorEl) errorEl.hidden = true;
                    contextInput?.removeAttribute("aria-invalid");
                    state.activeAiIntent = intent;
                    syncAiActionButtonStatus();
                    if (body) {
                        body.setAttribute("aria-busy", "true");
                        body.innerHTML = renderer.renderSkeleton("dictionary-helper");
                    }
                },
                renderResult: (result) => {
                    if (body) {
                        body.innerHTML = renderer.renderResult(result, ns.getRenderOptions({ followUps: [] }));
                    }
                    syncAiActionButtonStatus();
                },
                renderError: (error) => {
                    if (body) {
                        body.innerHTML = `<div class="dictionary-helper-state is-error"><strong>Unable to process request</strong><span>${renderer.escapeHtml(error.message || errorMessage)}</span></div>`;
                    }
                },
                getLookup: (text, requestOptions) => ns.tabLoader?.getLookupResponse("ai", text, requestOptions),
                isCurrent: () => token === state.requestToken && Boolean(state.popupRoot)
            });
        };

        state.popupRoot.querySelector("#dictionary-helper-explain-context")?.addEventListener("click", () => {
            runInPageContextAction({
                intent: "explain_in_context",
                errorMessage: "Unable to explain in context.",
                validate: (contextInput) => {
                    const validation = popupHelpers.validateContext(contextInput?.value || state.activeContext);
                    if (!validation.ok) return "Please enter or paste the sentence containing this word.";
                    state.activeContext = validation.context;
                    return null;
                }
            });
        });

        state.popupRoot.querySelector("#dictionary-helper-explain-grammar")?.addEventListener("click", () => {
            runInPageContextAction({
                intent: "grammar",
                errorMessage: "Unable to analyze grammar.",
                validate: (contextInput) => {
                    const validation = popupHelpers.validateContext(contextInput?.value || state.activeContext);
                    if (!validation.ok) return "Please enter or paste the sentence containing this word.";
                    state.activeContext = validation.context;
                    return null;
                }
            });
        });

        state.popupRoot.querySelector("#dictionary-helper-explain-phrase-explorer")?.addEventListener("click", () => {
            runInPageContextAction({
                intent: "phrase_explorer",
                errorMessage: "Unable to explore this phrase and collocations."
            });
        });

        state.popupRoot.querySelector("#dictionary-helper-explain-sentence")?.addEventListener("click", () => {
            runInPageContextAction({
                intent: "sentence_breakdown",
                errorMessage: "Unable to break down the sentence.",
                validate: (contextInput, query) => {
                    const queryIsSentence = /[.!?]/.test(query) || query.split(/\s+/).filter(Boolean).length >= 7;
                    const validation = popupHelpers.validateContext(contextInput?.value || state.activeContext);
                    if (!queryIsSentence && !validation.ok) {
                        return "Enter or paste the sentence to break down.";
                    }
                    state.activeContext = validation.ok ? validation.context : query;
                    return null;
                }
            });
        });

        state.popupRoot.querySelector("#dictionary-helper-explain-compare")?.addEventListener("click", () => {
            runInPageContextAction({
                intent: "compare_confusables",
                errorMessage: "Unable to compare these words."
            });
        });

        state.popupRoot.querySelector("#dictionary-helper-explain-rephrase")?.addEventListener("click", () => {
            runInPageContextAction({
                intent: "rephrase",
                errorMessage: "Unable to rephrase this text."
            });
        });

        syncAiActionButtonStatus();
    }

    function syncAiActionButtonStatus() {
        const state = ns.state;
        const popupHelpers = window.DictionaryHelperPopupHelpers;
        if (!state.popupRoot || !popupHelpers) {
            return;
        }
        popupHelpers.syncAiActionButtonStatus(
            state.popupRoot.querySelectorAll(".dictionary-helper-context-btn[data-ai-intent]"),
            state.activeFollowUps,
            state.activeAiIntent,
            "dictionary-helper"
        );
    }

    function updateContextHelp() {
        const state = ns.state;
        if (!state.popupRoot) return;
        const help = state.popupRoot.querySelector("#dictionary-helper-context-help");
        if (!help) return;
        help.textContent = getContextHelpMessage();
    }

    function getContextHelpMessage() {
        const state = ns.state;
        if (state.activeContextConfidence === "exact") {
            return "Context detected from your selection. You can edit it.";
        }

        if (state.activeContextConfidence === "suggested") {
            return "Suggested sentence from this page. You can edit or replace it.";
        }

        return "Used only for this explanation. Not saved.";
    }

    function showRefreshRequiredMessage(event) {
        ensurePopup();
        ns.tabLoader?.setPopupPosition(ns.tabLoader?.getPopupPosition(null, event));
        renderShell();
        const body = ns.state.popupRoot?.querySelector(".dictionary-helper-body");
        if (body) {
            body.innerHTML = `<div class="dictionary-helper-state is-error"><strong>Extension reloaded</strong><span>Refresh this tab to restore the popup.</span></div>`;
        }
    }

    ns.popupDom = {
        applyTheme,
        applyPopupDimensions,
        populateContentLanguageSelect,
        ensurePopup,
        removePopup,
        destroyPopup,
        renderShell,
        syncAiActionButtonStatus,
        updateContextHelp,
        getContextHelpMessage,
        showRefreshRequiredMessage
    };
})(typeof window !== "undefined" ? window : globalThis);
