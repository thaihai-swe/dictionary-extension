if (window.__dictionaryHelperContentInitialized) {
    // no-op
} else {
    window.__dictionaryHelperContentInitialized = true;

    const shared = window.DictionaryHelperContent || {};
    const selectionModule = shared.selection || {};
    const triggerModule = shared.trigger || {};
    const lookupModule = shared.lookup || {};
    const TAB_ORDER = shared.TAB_ORDER;
    const DEFAULT_UI_SETTINGS = shared.DEFAULT_UI_SETTINGS;
    const getRenderOptions = () => ({
        prefix: "dictionary-helper",
        titleTag: "h3",
        sectionTitleTag: "h4",
        pronunciationRate: settings?.pronunciationRate ?? 0.95,
        pronunciationVoiceURI: settings?.pronunciationVoiceURI ?? ""
    });

    let popupRoot = null;
    let popupCard = null;
    let triggerIconRoot = null;
    let activeText = "";
    let activeContext = "";
    let activeContextSource = "";
    let activeContextConfidence = "none";
    let activeTab = "dictionary";
    let currentPosition = { x: 24, y: 24 };
    let currentSelectionRect = null;
    let unbindViewportReposition = null;
    let requestToken = 0;
    let lastPreloadKey = "";
    let activeRequestId = "";
    let isPointerSelecting = false;
    let currentSelectionSnapshot = null;
    let restoreFocusElement = null;
    let focusPopupOnOpen = false;
    let isPopupClosing = false;

    const renderer = window.DictionaryHelperRenderer;
    const audio = window.DictionaryHelperAudio;
    const lookupCache = window.DictionaryHelperCache.createLookupCache();
    const popupHelpers = window.DictionaryHelperPopupHelpers;
    const popupShell = window.DictionaryHelperPopupShell;

    let settings = { ...DEFAULT_UI_SETTINGS };
    let extensionContextValid = true;

    init();

    function init() {
        if (!renderer || !audio || !lookupCache || !popupHelpers) {
            return;
        }

        loadSettings().catch(handleExtensionContextError);
        document.addEventListener("mousedown", handleMouseDown, true);
        document.addEventListener("mouseup", handleMouseUpTrigger, true);
        document.addEventListener("dblclick", handleDoubleClickTrigger);
        document.addEventListener("keydown", handleKeydown, true);
        document.addEventListener("selectionchange", handleSelectionChange);

        try {
            chrome.storage.onChanged.addListener(handleStorageChanges);
            chrome.runtime.onMessage.addListener(handleRuntimeMessage);
        } catch (error) {
            handleExtensionContextError(error);
        }
    }

    function handleMouseDown(event) {
        handleOutsidePointer(event);

        if (popupRoot && popupRoot.contains(event.target)) {
            return;
        }

        if (triggerIconRoot && triggerIconRoot.contains(event.target)) {
            return;
        }

        isPointerSelecting = true;
    }

    function handleSelectionChange() {
        const selection = window.getSelection();
        if (!selection || !selection.toString().trim()) {
            currentSelectionSnapshot = null;
            destroyTriggerIcon();
        }
    }

    function handleMouseUpTrigger(event) {
        isPointerSelecting = false;

        if (event.detail > 1) {
            return;
        }

        if (popupRoot && popupRoot.contains(event.target)) {
            return;
        }

        if (triggerIconRoot && triggerIconRoot.contains(event.target)) {
            return;
        }

        if (isEditableTarget(event.target)) {
            destroyTriggerIcon();
            currentSelectionSnapshot = null;
            return;
        }

        const snapshot = captureSelectionSnapshot(event);
        if (!snapshot) {
            destroyTriggerIcon();
            currentSelectionSnapshot = null;
            return;
        }

        currentSelectionSnapshot = snapshot;

        applySelectionTriggerMode(snapshot, event);
    }

    function handleDoubleClickTrigger(event) {
        const mode = getSelectionTriggerMode();
        if (mode === "off") {
            return;
        }

        if (popupRoot && popupRoot.contains(event.target)) {
            return;
        }

        if (isEditableTarget(event.target)) {
            return;
        }

        const snapshot = captureSelectionSnapshot(event);
        if (!snapshot) {
            return;
        }

        currentSelectionSnapshot = snapshot;
        applySelectionTriggerMode(snapshot, event);
    }

    function applySelectionTriggerMode(snapshot, event) {
        const mode = getSelectionTriggerMode();

        if (mode === "direct") {
            destroyTriggerIcon();
            openPopupFromSnapshot(snapshot, event);
        } else if (mode === "icon") {
            renderTriggerIcon(snapshot, event);
        } else {
            currentSelectionSnapshot = null;
            destroyTriggerIcon();
        }
    }

    function getSelectionTriggerMode() {
        return settings.selectionTriggerMode || "off";
    }

    function captureSelectionSnapshot(event) {
        return selectionModule.captureSelectionSnapshot(event);
    }

    function openPopupFromSnapshot(snapshot, event, options = {}) {
        if (!extensionContextValid) {
            showRefreshRequiredMessage(event || {});
            return;
        }

        if (!snapshot || !snapshot.text) {
            return;
        }

        destroyTriggerIcon();
        if (isPopupClosing) {
            destroyPopup();
        }
        focusPopupOnOpen = Boolean(options.keyboard);
        restoreFocusElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;

        const position = getPopupPosition(snapshot.rect, event || {
            clientX: snapshot.clientX,
            clientY: snapshot.clientY
        });

        if (activeText !== snapshot.text) {
            audio.clearPracticeResults();
        }
        activeText = snapshot.text;
        activeContext = settings.disablePageContextExtraction ? "" : (snapshot.context || "");
        activeContextSource = settings.disablePageContextExtraction ? "" : (snapshot.contextSource || "");
        activeContextConfidence = settings.disablePageContextExtraction ? "none" : (snapshot.contextConfidence || "none");
        currentPosition = position;
        currentSelectionRect = snapshot.rect || null;
        lastPreloadKey = "";
        activeTab = getAvailableTabs().includes(activeTab) ? activeTab : settings.defaultTab;
        activeTab = getAvailableTabs().includes(activeTab) ? activeTab : getAvailableTabs()[0];

        ensurePopup();
        applyPopupDimensions();
        applyTheme();
        setPopupPosition(position);
        renderShell();
        clearSelection();
        maybePreloadAi();
        loadTab(activeTab).then(() => {
            refinePopupAfterRender();
        });
    }

    function renderTriggerIcon(snapshot, event) {
        triggerIconRoot = triggerModule.renderTriggerIcon({
            root: triggerIconRoot,
            snapshot,
            event,
            settings,
            onOpen: (iconEvent) => {
                if (!currentSelectionSnapshot) return;
                openPopupFromSnapshot(currentSelectionSnapshot, iconEvent, { keyboard: false });
            }
        });
    }

    function destroyTriggerIcon() {
        triggerIconRoot = triggerModule.destroyTriggerIcon(triggerIconRoot);
    }

    function applyThemeToNode(node) {
        shared.settings.applyThemeToNode(node, settings.theme, settings.fontFamily);
    }

    function openPopupForText(text, event, options = {}) {
        if (!extensionContextValid) {
            showRefreshRequiredMessage(event || {});
            return;
        }

        const normalizedText = String(text || "").trim();
        if (!normalizedText) {
            return;
        }

        if (isPopupClosing) {
            destroyPopup();
        }
        if (activeText !== normalizedText) {
            audio.clearPracticeResults();
        }
        activeText = normalizedText;
        const providedContext = String(options.context || "").trim();
        if (providedContext) {
            activeContext = popupHelpers.normalizeContext(providedContext);
            activeContextSource = options.contextSource || "selection";
            activeContextConfidence = options.contextConfidence || "exact";
        } else {
            const extracted = settings.disablePageContextExtraction
                ? { context: "", source: "", confidence: "none" }
                : extractSurroundingContext(normalizedText);
            activeContext = extracted.context;
            activeContextSource = extracted.source;
            activeContextConfidence = extracted.confidence;
        }
        currentPosition = getPopupPosition(getSelectionRectForText(normalizedText), event || null);
        currentSelectionRect = getSelectionRectForText(normalizedText);
        lastPreloadKey = "";
        activeTab = getAvailableTabs().includes(activeTab) ? activeTab : settings.defaultTab;
        activeTab = getAvailableTabs().includes(activeTab) ? activeTab : getAvailableTabs()[0];

        ensurePopup();
        applyPopupDimensions();
        applyTheme();
        setPopupPosition(currentPosition);
        renderShell();
        maybePreloadAi();
        loadTab(activeTab);
    }

    function handleKeydown(event) {
        if (event.key === "Escape") {
            destroyTriggerIcon();
            if (popupRoot) {
                destroyPopup({ animate: true });
            }
            return;
        }

        handlePostSelectionModifier(event);
    }

    function handlePostSelectionModifier(event) {
        if (isPointerSelecting || event.repeat) {
            return;
        }

        const mode = getSelectionTriggerMode();
        if (mode === "off") {
            return;
        }

        if (isEditableTarget(event.target)) {
            return;
        }

        if (popupRoot && popupRoot.contains(event.target)) {
            return;
        }

        if (!currentSelectionSnapshot || !currentSelectionSnapshot.text) {
            return;
        }

        const modifier = settings.postSelectionModifier || "shift";
        if (!isConfiguredPostSelectionKey(event, modifier)) {
            return;
        }

        // Ignore chorded shortcuts; only a single configured modifier should open lookup.
        if (modifier === "shift" && (event.altKey || event.ctrlKey || event.metaKey)) {
            return;
        }
        if (modifier === "alt" && (event.shiftKey || event.ctrlKey || event.metaKey)) {
            return;
        }
        if (modifier === "ctrl" && (event.shiftKey || event.altKey)) {
            return;
        }

        if (popupRoot && activeText === currentSelectionSnapshot.text) {
            return;
        }

        event.preventDefault();
        openPopupFromSnapshot(currentSelectionSnapshot, event, { keyboard: true });
    }

    function isConfiguredPostSelectionKey(event, modifier) {
        const key = String(event.key || "").toLowerCase();

        if (modifier === "shift") {
            return event.key === "Shift" || key === "shift";
        }

        if (modifier === "alt") {
            return event.key === "Alt" || key === "alt";
        }

        if (modifier === "ctrl") {
            return event.key === "Control" || event.key === "Meta" || key === "control" || key === "meta";
        }

        return false;
    }

    function handleOutsidePointer(event) {
        if (triggerIconRoot && triggerIconRoot.contains(event.target)) {
            return;
        }

        if (popupRoot && !popupRoot.contains(event.target)) {
            const selection = window.getSelection();
            if (!selection || !selection.toString().trim()) {
                destroyPopup();
            }
        }

        if (
            triggerIconRoot
            && (!currentSelectionSnapshot || !currentSelectionSnapshot.text)
            && !(popupRoot && popupRoot.contains(event.target))
        ) {
            destroyTriggerIcon();
        }
    }

    function populateContentLanguageSelect(select) {
        if (!select) return;
        const defaults = ["English", "Vietnamese"];
        const names = [...defaults, ...String(settings.customLanguages || "")
            .split(",").map((value) => value.trim()).filter(Boolean)]
            .filter((name, index, list) => list.findIndex((item) => item.toLowerCase() === name.toLowerCase()) === index);
        const selected = String(settings.translateTargetLanguage || "English").toLowerCase();
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
        if (popupRoot) {
            return;
        }

        popupRoot = document.createElement("div");
        popupRoot.className = "dictionary-helper-root";
        if (!popupShell) {
            return;
        }
        popupRoot.innerHTML = popupShell.createMarkup({ prefix: "dictionary-helper", host: "inpage" });

        popupCard = popupRoot.querySelector(".dictionary-helper-card");

        popupRoot.querySelector(".dictionary-helper-close").addEventListener("click", () => destroyPopup({ animate: true }));
        popupRoot.addEventListener("keydown", trapPopupFocus);

        const providerSelect = popupRoot.querySelector(".dictionary-helper-header-select");
        const languageInput = popupRoot.querySelector(".dictionary-helper-header-lang");
        populateContentLanguageSelect(languageInput);

        if (providerSelect) {
            providerSelect.value = settings.dictionaryProvider || "free_dictionary";
            providerSelect.addEventListener("change", async (event) => {
                const next = event.target.value;
                settings.dictionaryProvider = next;
                try {
                    await chrome.storage.sync.set({ dictionaryProvider: next });
                } catch (_error) {
                    // Best-effort; settings still update locally.
                }
                lookupCache.clear();
                lastPreloadKey = "";
                if (activeText) {
                    void loadTab(activeTab);
                }
            });
        }

        if (languageInput) {
            languageInput.addEventListener("change", async (event) => {
                const next = String(event.target.value || "").trim();
                if (!next) {
                    return;
                }
                settings.translateTargetLanguage = next;
                try {
                    await chrome.storage.sync.set({ translateTargetLanguage: next });
                } catch (_error) {
                    // Best-effort; settings still update locally.
                }
                lookupCache.clear();
                lastPreloadKey = "";
                if (activeText) {
                    void loadTab(activeTab);
                }
            });
        }

        popupRoot.querySelector(".dictionary-helper-tabs").addEventListener("click", (event) => {
            const button = event.target.closest("[data-tab]");
            if (!button) {
                return;
            }

            activeTab = button.dataset.tab;
            void popupHelpers.writeLastTab(activeTab);
            renderShell();
            audio.stopPronunciation();
            void loadTab(activeTab);
        });

        popupRoot.querySelector(".dictionary-helper-context-host").addEventListener("input", (event) => {
            if (!event.target.matches("#dictionary-helper-context-input")) {
                return;
            }
            activeContext = popupHelpers.normalizeContext(event.target.value);
            activeContextSource = activeContext ? "manual" : "";
            activeContextConfidence = activeContext ? "manual" : "none";
            const error = popupRoot.querySelector("#dictionary-helper-context-error");
            if (error) {
                error.hidden = true;
            }
            event.target.removeAttribute("aria-invalid");
            updateContextHelp();
            popupHelpers.autosizeTextarea(event.target, { minRows: 2, maxRows: 4 });
        });

        popupRoot.querySelector(".dictionary-helper-body").addEventListener("click", (event) => {
            audio.handlePronunciationClick(event);

            const phraseBtn = event.target.closest("[data-lookup-query]");
            if (phraseBtn) {
                const query = String(phraseBtn.dataset.lookupQuery || "").trim();
                if (query && query.toLowerCase() !== String(activeText || "").trim().toLowerCase()) {
                    audio.clearPracticeResults();
                    activeText = query;
                    activeTab = "dictionary";
                    void popupHelpers.writeLastTab(activeTab);
                    renderShell();
                    void loadTab("dictionary");
                }
            }
        });


        // Resize logic
        const resizer = popupRoot.querySelector(".dictionary-helper-resizer");
        let isResizing = false;
        let startX, startY, startWidth, startHeight;

        resizer.addEventListener("mousedown", (e) => {
            isResizing = true;
            startX = e.clientX;
            startY = e.clientY;
            startWidth = parseInt(document.defaultView.getComputedStyle(popupCard).width, 10);
            startHeight = popupCard.getBoundingClientRect().height;
            document.body.style.userSelect = "none";
            e.preventDefault();
        });

        document.addEventListener("mousemove", (e) => {
            if (!isResizing || !popupCard) {
                return;
            }

            const dimensions = popupShell.clampDimensions(
                startWidth + e.clientX - startX,
                startHeight + e.clientY - startY
            );
            popupCard.style.width = `${dimensions.width}px`;
            popupCard.style.maxHeight = `${dimensions.height}px`;
            popupCard.classList.add("is-resizing");
            e.preventDefault();
        }, true);

        document.addEventListener("mouseup", () => {
            if (!isResizing || !popupCard) {
                return;
            }

            isResizing = false;
            popupCard.classList.remove("is-resizing");
            document.body.style.userSelect = "";
            const newWidth = parseInt(popupCard.style.width, 10);
            const newHeight = parseInt(popupCard.style.maxHeight, 10);
            if (newWidth && newHeight) {
                settings.popupWidth = newWidth;
                settings.popupHeight = newHeight;
                void chrome.storage.sync.set({ popupWidth: newWidth, popupHeight: newHeight });
            }
        }, true);

        const mountNode = document.body || document.documentElement;
        mountNode.appendChild(popupRoot);
        if (focusPopupOnOpen) {
            requestAnimationFrame(() => popupRoot?.querySelector(".dictionary-helper-tab.is-active, .dictionary-helper-close")?.focus());
        }

        // Reposition when content grows (AI result loads, enrichment, etc.)
        if (typeof ResizeObserver === "function" && popupCard) {
            const observer = new ResizeObserver(() => {
                if (!popupCard) return;
                const pos = shared.positioning;
                if (pos?.refinePopupMaxHeight) {
                    pos.refinePopupMaxHeight(popupCard, currentPosition);
                }
            });
            observer.observe(popupCard);
            popupCard.__resizeObserver = observer;
        }
    }

    function removePopup() {
        if (!popupRoot) {
            return;
        }

        popupRoot.remove();
        popupRoot = null;
        popupCard = null;
        isPopupClosing = false;
        const element = restoreFocusElement;
        restoreFocusElement = null;
        if (element?.isConnected && typeof element.focus === "function") {
            try { element.focus({ preventScroll: true }); } catch (_error) { element.focus(); }
        }
    }

    function prefersReducedMotion() {
        return typeof window.matchMedia === "function"
            && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    }

    function destroyPopup({ animate = false } = {}) {
        if (!popupRoot) {
            return;
        }

        if (isPopupClosing) {
            if (!animate) {
                removePopup();
            }
            return;
        }

        requestToken += 1;
        activeRequestId = "";
        const cancelType = window.DictionaryHelperMessages?.CANCEL_LOOKUP || "CANCEL_LOOKUP";
        void chrome.runtime.sendMessage({ type: cancelType }).catch(() => {
            // The popup is closing; cancellation is best-effort.
        });
        audio.stopPronunciation();
        audio.clearPracticeResults();
        if (typeof unbindViewportReposition === "function") {
            unbindViewportReposition();
            unbindViewportReposition = null;
        }
        if (popupCard?.__resizeObserver) {
            try {
                popupCard.__resizeObserver.disconnect();
            } catch (_error) {
                // ignore
            }
            popupCard.__resizeObserver = null;
        }

        if (!animate || !popupCard || prefersReducedMotion()) {
            removePopup();
            return;
        }

        isPopupClosing = true;
        popupCard.classList.add("is-closing");
        let finished = false;
        const finish = () => {
            if (finished) return;
            finished = true;
            removePopup();
        };
        popupCard.addEventListener("animationend", (event) => {
            if (event.animationName === "dictionary-popup-exit") {
                finish();
            }
        }, { once: true });
        window.setTimeout(finish, 180);
    }

    function clearSelection() {
        selectionModule.clearSelection();
    }

    function renderShell() {
        if (!popupRoot) {
            return;
        }

        const tabs = popupRoot.querySelector(".dictionary-helper-tabs");
        const contextHost = popupRoot.querySelector(".dictionary-helper-context-host");
        const availableTabs = getAvailableTabs();

        if (availableTabs.length === 0) {
            tabs.innerHTML = "";
            if (contextHost) contextHost.innerHTML = "";
            popupRoot.querySelector(".dictionary-helper-body").innerHTML =
                `<div class="dictionary-helper-state"><strong>No sources enabled</strong><span>Turn on Dictionary or AI in the extension settings.</span></div>`;
            return;
        }

        const tabButtons = availableTabs.map((tab) => {
            const activeClass = tab === activeTab ? " is-active" : "";
            return `<button class="dictionary-helper-tab${activeClass}" data-tab="${tab}" id="dictionary-helper-tab-${tab}" type="button" role="tab" aria-selected="${tab === activeTab}" aria-controls="dictionary-helper-result">${renderer.labelForTab(tab)}</button>`;
        }).join("");

        const contextPill = settings.disablePageContextExtraction
            ? `<span class="dictionary-helper-context-pill is-private" title="Automatic page context is disabled">🚫 Context: None</span>`
            : `<span class="dictionary-helper-context-pill" title="Only the bounded surrounding sentence may be sent to the AI provider">🔒 Context: Bounded Sentence</span>`;
        const contextAction = activeTab === "ai" && activeText.trim()
            ? `<div class="dictionary-helper-context-action" aria-live="polite">
            ${contextPill}
            <label class="dictionary-helper-context-label" for="dictionary-helper-context-input">Context</label>
            <textarea id="dictionary-helper-context-input" class="dictionary-helper-context-input" rows="2" placeholder="Paste the sentence or context here..." aria-describedby="dictionary-helper-context-help dictionary-helper-context-error">${renderer.escapeHtml(activeContext)}</textarea>
            <div class="dictionary-helper-context-help" id="dictionary-helper-context-help">${getContextHelpMessage()}</div>
            <div class="dictionary-helper-context-error" id="dictionary-helper-context-error" role="alert" hidden>Please enter or paste the sentence containing this word.</div>
            <div class="dictionary-helper-context-buttons">
                <button class="dictionary-helper-context-btn" id="dictionary-helper-explain-context" type="button" title="Explain what this word means in the sentence above">Context Explain</button>
                <button class="dictionary-helper-context-btn" id="dictionary-helper-explain-grammar" type="button" title="Analyze syntax role, word order, and tone">Grammar &amp; Nuance</button>
                <button class="dictionary-helper-context-btn" id="dictionary-helper-explain-phrase-explorer" type="button" title="Explore idioms, phrasal verbs, and collocations">Phrase &amp; Collocations</button>
                <button class="dictionary-helper-context-btn" id="dictionary-helper-explain-sentence" type="button" title="Break down sentence structure and parse components">Sentence Breakdown</button>
            </div>
           </div>`
            : "";

        tabs.innerHTML = `<div class="dictionary-helper-tablist" role="tablist">${tabButtons}</div>`;
        tabs.setAttribute("role", "presentation");
        const bodyPanel = popupRoot.querySelector(".dictionary-helper-body");
        const announcement = popupRoot.querySelector(".dictionary-helper-announcements");
        if (announcement) announcement.textContent = `${renderer.labelForTab(activeTab)} tab ready.`;
        if (bodyPanel) {
            bodyPanel.setAttribute("role", "tabpanel");
            bodyPanel.setAttribute("aria-labelledby", `dictionary-helper-tab-${activeTab}`);
            bodyPanel.setAttribute("id", "dictionary-helper-result");
        }
        if (contextHost) {
            contextHost.innerHTML = contextAction;
            const contextField = contextHost.querySelector('#dictionary-helper-context-input');
            if (contextField) {
                popupHelpers.autosizeTextarea(contextField, { minRows: 2, maxRows: 4 });
            }
        }

        const contextButtons = [
            popupRoot.querySelector("#dictionary-helper-explain-context"),
            popupRoot.querySelector("#dictionary-helper-explain-grammar"),
            popupRoot.querySelector("#dictionary-helper-explain-phrase-explorer"),
            popupRoot.querySelector("#dictionary-helper-explain-sentence")
        ].filter(Boolean);

        const setContextButtonsDisabled = (disabled) => {
            contextButtons.forEach((btn) => { btn.disabled = disabled; });
        };

        const runInPageContextAction = ({ intent, errorMessage, validate = null, resolveContext = null }) => {
            const contextInput = popupRoot?.querySelector("#dictionary-helper-context-input");
            const query = activeText.trim();

            if (validate) {
                const error = validate(contextInput, query);
                if (error) {
                    const errorEl = popupRoot?.querySelector("#dictionary-helper-context-error");
                    if (errorEl) {
                        errorEl.textContent = error;
                        errorEl.hidden = false;
                    }
                    contextInput?.setAttribute("aria-invalid", "true");
                    contextInput?.focus();
                    return;
                }
            } else {
                const validation = popupHelpers.validateContext(contextInput?.value || activeContext);
                activeContext = resolveContext ? resolveContext(validation, query) : (validation.ok ? validation.context : "");
            }

            const errorEl = popupRoot?.querySelector("#dictionary-helper-context-error");
            if (errorEl) errorEl.hidden = true;
            contextInput?.removeAttribute("aria-invalid");

            setContextButtonsDisabled(true);
            requestToken += 1;
            const token = requestToken;
            const body = popupRoot?.querySelector(".dictionary-helper-body");
            if (body) {
                body.setAttribute("aria-busy", "true");
                body.innerHTML = renderer.renderSkeleton("dictionary-helper");
            }

            getLookupResponse("ai", query, { context: activeContext, intent })
                .then((response) => {
                    if (token !== requestToken || !popupRoot) return;
                    if (!response?.ok) throw new Error(response?.error || "Request failed.");
                    body.innerHTML = renderer.renderResult(response.result, getRenderOptions());
                })
                .catch((error) => {
                    if (token !== requestToken || !popupRoot || error?.name === "AbortError") return;
                    body.innerHTML = `<div class="dictionary-helper-state is-error"><strong>Unable to process request</strong><span>${renderer.escapeHtml(error.message || errorMessage)}</span></div>`;
                })
                .finally(() => {
                    if (token !== requestToken || !popupRoot) return;
                    body?.setAttribute("aria-busy", "false");
                    setContextButtonsDisabled(false);
                });
        };

        popupRoot.querySelector("#dictionary-helper-explain-context")?.addEventListener("click", () => {
            runInPageContextAction({
                intent: "explain_in_context",
                errorMessage: "Unable to explain in context.",
                validate: (contextInput) => {
                    const validation = popupHelpers.validateContext(contextInput?.value || activeContext);
                    if (!validation.ok) return "Please enter or paste the sentence containing this word.";
                    activeContext = validation.context;
                    return null;
                }
            });
        });

        popupRoot.querySelector("#dictionary-helper-explain-grammar")?.addEventListener("click", () => {
            runInPageContextAction({
                intent: "grammar",
                errorMessage: "Unable to analyze grammar.",
                validate: (contextInput) => {
                    const validation = popupHelpers.validateContext(contextInput?.value || activeContext);
                    if (!validation.ok) return "Please enter or paste the sentence containing this word.";
                    activeContext = validation.context;
                    return null;
                }
            });
        });

        popupRoot.querySelector("#dictionary-helper-explain-phrase-explorer")?.addEventListener("click", () => {
            runInPageContextAction({
                intent: "phrase_explorer",
                errorMessage: "Unable to explore this phrase and collocations."
            });
        });

        popupRoot.querySelector("#dictionary-helper-explain-sentence")?.addEventListener("click", () => {
            runInPageContextAction({
                intent: "sentence_breakdown",
                errorMessage: "Unable to break down the sentence.",
                validate: (contextInput, query) => {
                    const queryIsSentence = /[.!?]/.test(query) || query.split(/\s+/).filter(Boolean).length >= 7;
                    const validation = popupHelpers.validateContext(contextInput?.value || activeContext);
                    if (!queryIsSentence && !validation.ok) {
                        return "Enter or paste the sentence to break down.";
                    }
                    activeContext = validation.ok ? validation.context : query;
                    return null;
                }
            });
        });
    }

    function updateContextHelp() {
        if (!popupRoot) return;
        const help = popupRoot.querySelector("#dictionary-helper-context-help");
        if (!help) return;
        help.textContent = getContextHelpMessage();
    }

    function getContextHelpMessage() {
        if (activeContextConfidence === "exact") {
            return "Context detected from your selection. You can edit it.";
        }

        if (activeContextConfidence === "suggested") {
            return "Suggested sentence from this page. You can edit or replace it.";
        }

        return "Used only for this explanation. Not saved.";
    }

    function applyTheme() {
        applyThemeToNode(popupRoot);
        applyThemeToNode(triggerIconRoot);
    }

    function applyPopupDimensions() {
        if (!popupCard) {
            return;
        }

        const dimensions = popupShell?.clampDimensions(settings.popupWidth, settings.popupHeight)
            || { width: 500, height: 600 };
        popupCard.style.width = `${dimensions.width}px`;
        popupCard.style.maxHeight = `${dimensions.height}px`;
    }

    async function loadTab(tab) {
        if (!popupRoot) {
            return;
        }

        const body = popupRoot.querySelector(".dictionary-helper-body");
        const text = activeText.trim();
        requestToken += 1;
        const token = requestToken;
        activeRequestId = "";
        const availableTabs = getAvailableTabs();

        audio.stopPronunciation();

        if (availableTabs.length === 0) {
            body.innerHTML = `<div class="dictionary-helper-state"><strong>No sources enabled</strong><span>Turn on Dictionary or AI in the extension settings.</span></div>`;
            return;
        }

        if (!availableTabs.includes(tab)) {
            body.innerHTML = `<div class="dictionary-helper-state"><strong>Source disabled</strong><span>Enable this source in the extension settings.</span></div>`;
            return;
        }

        const cacheKey = lookupModule.buildRequestCacheKey(tab, text, settings, {});
        const cached = lookupCache.get(cacheKey);

        if (cached) {
            if (cached.requestId) {
                activeRequestId = cached.requestId;
            }
            body.innerHTML = renderer.renderResult(cached, getRenderOptions());
            audio.restorePracticeResult(body, activeText, cached.pronunciation?.language);
            return;
        }
        body.setAttribute("aria-busy", "true");
        body.innerHTML = renderer.renderSkeleton("dictionary-helper");

        try {
            const response = await getLookupResponse(tab, text);

            if (token !== requestToken || !popupRoot) {
                return;
            }

            if (!response?.ok) {
                throw new Error(response?.error || "Request failed.");
            }

            if (response.result?.requestId) {
                activeRequestId = response.result.requestId;
            }
            body.innerHTML = renderer.renderResult(response.result, getRenderOptions());
            audio.restorePracticeResult(body, activeText, response.result?.pronunciation?.language);
        } catch (error) {
            if (isExtensionContextInvalidated(error)) {
                handleExtensionContextError(error);
                if (popupRoot && token === requestToken) {
                    body.innerHTML = `<div class="dictionary-helper-state is-error"><strong>Extension reloaded</strong><span>Refresh this tab to use it again.</span></div>`;
                }
                return;
            }

            if (token !== requestToken || !popupRoot) {
                return;
            }

            body.innerHTML = `<div class="dictionary-helper-state is-error">${renderer.escapeHtml(error.message || "Unable to load results.")}</div>`;
        } finally {
            if (token === requestToken && popupRoot) {
                body.setAttribute("aria-busy", "false");
            }
        }
    }

    function maybePreloadAi() {
        const normalizedQuery = activeText.trim();
        const preloadKey = lookupModule.buildRequestCacheKey("ai", normalizedQuery, settings, {});

        if (
            !settings.enableAiPreload ||
            !settings.enableAI ||
            !normalizedQuery ||
            activeTab === "ai" ||
            lastPreloadKey === preloadKey
        ) {
            return;
        }

        lastPreloadKey = preloadKey;
        void getLookupResponse("ai", normalizedQuery).catch(() => {
            // Keep preload failures silent until the user opens the AI tab.
        });
    }

    async function getLookupResponse(tab, text, requestOptions = {}) {
        return lookupModule.getLookupResponse({
            tab,
            text,
            settings,
            requestOptions,
            cache: lookupCache
        });
    }

    function getPopupPosition(rect, event) {
        const popupSize = {
            width: settings.popupWidth || 720,
            height: settings.popupHeight || 1080
        };
        return shared.positioning.computePopupPosition({
            selectionRect: rect,
            popupSize,
            event,
            useFixed: shouldUseFixedPopup(),
            margin: 12
        });
    }

    function getSelectionRectForText(text) {
        return selectionModule.getSelectionRectForText(text);
    }

    function setPopupPosition(position) {
        if (!popupCard) {
            return;
        }
        currentPosition = position;
        shared.positioning.applyPopupPosition(popupCard, {
            ...position,
            useFixed: position.useFixed != null ? position.useFixed : shouldUseFixedPopup()
        }, settings);
        if (typeof unbindViewportReposition !== "function" && shared.positioning?.bindViewportReposition) {
            unbindViewportReposition = shared.positioning.bindViewportReposition(popupCard, () => ({
                selectionRect: currentSelectionRect,
                popupSize: {
                    width: settings.popupWidth || 500,
                    height: settings.popupHeight || 600
                },
                useFixed: shouldUseFixedPopup(),
                margin: 12,
                onPosition(next) {
                    currentPosition = next;
                }
            }), settings);
        }
    }

    function shouldUseFixedPopup() {
        return shared.positioning.shouldUseFixedPopup();
    }

    function refinePopupAfterRender() {
        if (!popupCard || !shared.positioning?.refinePopupMaxHeight) {
            return;
        }
        shared.positioning.refinePopupMaxHeight(popupCard, currentPosition);
    }

    function getAvailableTabs() {
        return TAB_ORDER.filter((tab) => {
            if (tab === "dictionary") {
                return settings.enableTranslate || settings.enableDictionary;
            }

            if (tab === "ai") {
                return settings.enableAI;
            }

            return false;
        });
    }

    async function loadSettings() {
        settings = await shared.settings.loadSettings();
        const lastTab = await popupHelpers.readLastTab();
        const availableTabs = getAvailableTabs();
        activeTab = availableTabs.includes(lastTab)
            ? lastTab
            : availableTabs.includes(settings.defaultTab)
                ? settings.defaultTab
                : availableTabs[0] || "dictionary";
    }

    function handleStorageChanges(changes, areaName) {
        if (!extensionContextValid) {
            return;
        }

        if (areaName !== "sync" && areaName !== "local") {
            return;
        }

        settings = shared.settings.applyStorageChanges(settings, changes, areaName);

        if (
            areaName === "sync"
            && (
                changes.theme
                || changes.fontFamily
                || changes.selectionTriggerMode
                || changes.postSelectionModifier
            )
        ) {
            applyTheme();
            if (settings.selectionTriggerMode !== "icon") {
                destroyTriggerIcon();
            }
        }

        if (changes) {
            const outputChanged = shared.settings?.affectsOutput
                ? shared.settings.affectsOutput(changes)
                : false;

            if (outputChanged) {
                lookupCache.clear();
                lastPreloadKey = "";
            }
        }

        const availableTabs = getAvailableTabs();
        if (!availableTabs.includes(activeTab)) {
            activeTab = availableTabs[0] || "dictionary";
        }

        if (popupRoot) {
            applyPopupDimensions();
            setPopupPosition(currentPosition);
            renderShell();
            loadTab(activeTab);
        }
    }

    function handleRuntimeMessage(message, _sender, sendResponse) {
        if (message?.type === "GET_PAGE_CONTEXT") {
            const text = String(message.payload?.text || activeText || "").trim();
            const extracted = activeContext && (!text || text === activeText)
                ? {
                    context: activeContext,
                    source: activeContextSource,
                    confidence: activeContextConfidence
                }
                : extractSurroundingContext(text);
            sendResponse({
                context: extracted.context || "",
                source: extracted.source || "",
                confidence: extracted.confidence || "none"
            });
            return true;
        }

        const updateType = window.DictionaryHelperMessages?.LOOKUP_UPDATE || "LOOKUP_UPDATE";
        if (message?.type === updateType) {
            const payload = message.payload || {};
            const text = String(payload.text || "").trim();
            const requestId = String(payload.requestId || "").trim();
            const result = payload.result;

            if (!result || !popupRoot || activeTab !== "dictionary") {
                return false;
            }

            if (requestId && activeRequestId && requestId !== activeRequestId) {
                return false;
            }

            if (text && text.toLowerCase() !== String(activeText || "").trim().toLowerCase()) {
                return false;
            }

            if (result.requestId) {
                activeRequestId = result.requestId;
            }

            const cacheKey = lookupModule.buildRequestCacheKey("dictionary", activeText.trim(), settings, {});
            lookupCache.set(cacheKey, result);

            const body = popupRoot.querySelector(".dictionary-helper-body");
            if (body) {
                body.innerHTML = renderer.renderResult(result, getRenderOptions());
                audio.restorePracticeResult(body, activeText, result.pronunciation?.language);
            }
            return false;
        }

        if (message?.type !== "OPEN_LOOKUP_POPUP") {
            return false;
        }

        openPopupForText(message.payload?.text || "", null, {
            context: message.payload?.context || "",
            contextSource: message.payload?.contextSource || "",
            contextConfidence: message.payload?.contextConfidence || ""
        });
        sendResponse?.({ ok: true });
        return true;
    }

    function showRefreshRequiredMessage(event) {
        ensurePopup();
        setPopupPosition(getPopupPosition(null, event));
        renderShell();
        popupRoot.querySelector(".dictionary-helper-body").innerHTML =
            `<div class="dictionary-helper-state is-error"><strong>Extension reloaded</strong><span>Refresh this tab to restore the popup.</span></div>`;
    }

    function handleExtensionContextError(error) {
        if (!isExtensionContextInvalidated(error)) {
            return;
        }

        extensionContextValid = false;
    }

    function isExtensionContextInvalidated(error) {
        return lookupModule.isExtensionContextInvalidated(error);
    }

    function isEditableTarget(target) {
        return selectionModule.isEditableTarget(target);
    }

    function trapPopupFocus(event) {
        if (event.key !== "Tab" || !popupRoot) return;
        const focusable = [...popupRoot.querySelectorAll('button:not([disabled]), [href], select:not([disabled]), textarea:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])')]
            .filter((node) => !node.hidden && node.offsetParent !== null);
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
        }
    }

    function extractSurroundingContext(selectedText) {
        if (settings.disablePageContextExtraction) {
            return { context: "", source: "", confidence: "none" };
        }
        return shared.context.extractSurroundingContext(selectedText);
    }


}
