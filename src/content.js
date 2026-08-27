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
    const getRenderOptions = (extra = {}) => ({
        prefix: "dictionary-helper",
        titleTag: "h3",
        sectionTitleTag: "h4",
        pronunciationRate: settings?.pronunciationRate ?? 0.95,
        pronunciationVoiceURI: settings?.pronunciationVoiceURI ?? "",
        followUps: extra.followUps || (activeTab === "ai" ? activeFollowUps : [])
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
    let activeFollowUps = [];
    let activeAiIntent = "";
    let activeRequestId = "";
    let isPointerSelecting = false;
    let selectionClearTimer = 0;
    let selectionCaptureToken = 0;
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
        window.addEventListener("mousedown", handleMouseDown, true);
        window.addEventListener("mouseup", handleMouseUpTrigger, true);
        window.addEventListener("dblclick", handleDoubleClickTrigger, true);
        window.addEventListener("keydown", handleKeydown, true);
        document.addEventListener("selectionchange", handleSelectionChange);

        try {
            chrome.storage.onChanged.addListener(handleStorageChanges);
            chrome.runtime.onMessage.addListener(handleRuntimeMessage);
        } catch (error) {
            handleExtensionContextError(error);
        }
    }

    function nodeContains(root, target) {
        if (!root || !target) {
            return false;
        }

        try {
            if (root.contains(target)) {
                return true;
            }
            if (typeof target.composedPath === "function") {
                return false;
            }
            if (typeof target.getRootNode === "function") {
                const rootNode = target.getRootNode();
                const host = rootNode && rootNode.host;
                if (host && root.contains(host)) {
                    return true;
                }
            }
        } catch (_error) {
            return false;
        }

        return false;
    }

    function eventContainsNode(root, event) {
        if (!root || !event) {
            return false;
        }
        if (nodeContains(root, event.target)) {
            return true;
        }
        if (typeof event.composedPath !== "function") {
            return false;
        }
        try {
            return event.composedPath().some((node) => node === root || (node && root.contains(node)));
        } catch (_error) {
            return false;
        }
    }

    function cancelSelectionClear() {
        if (!selectionClearTimer) {
            return;
        }
        window.clearTimeout(selectionClearTimer);
        selectionClearTimer = 0;
    }

    function handleMouseDown(event) {
        if (eventContainsNode(popupRoot, event) || eventContainsNode(triggerIconRoot, event)) {
            handleOutsidePointer(event);
            return;
        }

        isPointerSelecting = true;
        cancelSelectionClear();
        if (event.detail <= 1) {
            currentSelectionSnapshot = null;
            destroyTriggerIcon();
        }
        handleOutsidePointer(event);
    }

    function handleSelectionChange() {
        if (isPointerSelecting || currentSelectionSnapshot) {
            return;
        }

        const selection = window.getSelection();
        if (selection && String(selection.toString() || "").trim()) {
            cancelSelectionClear();
            return;
        }

        cancelSelectionClear();
        selectionClearTimer = window.setTimeout(() => {
            selectionClearTimer = 0;
            if (isPointerSelecting || currentSelectionSnapshot) {
                return;
            }
            const nextSelection = window.getSelection();
            if (nextSelection && String(nextSelection.toString() || "").trim()) {
                return;
            }
            destroyTriggerIcon();
        }, 80);
    }

    function applyCapturedSelection(event) {
        const snapshot = captureSelectionSnapshot(event);
        if (!snapshot) {
            return false;
        }

        cancelSelectionClear();
        currentSelectionSnapshot = snapshot;
        applySelectionTriggerMode(snapshot, event);
        return true;
    }

    function handleMouseUpTrigger(event) {
        isPointerSelecting = false;

        if (typeof event.button === "number" && event.button !== 0) {
            return;
        }

        if (eventContainsNode(popupRoot, event) || eventContainsNode(triggerIconRoot, event)) {
            return;
        }

        if (isEditableTarget(event.target, event)) {
            cancelSelectionClear();
            destroyTriggerIcon();
            currentSelectionSnapshot = null;
            return;
        }

        const token = (selectionCaptureToken += 1);
        const delay = event.detail > 1 ? 30 : 0;

        const finishCapture = () => {
            if (token !== selectionCaptureToken) {
                return;
            }
            if (applyCapturedSelection(event)) {
                return;
            }
            requestAnimationFrame(() => {
                if (token !== selectionCaptureToken) {
                    return;
                }
                if (applyCapturedSelection(event)) {
                    return;
                }
                window.setTimeout(() => {
                    if (token !== selectionCaptureToken || currentSelectionSnapshot) {
                        return;
                    }
                    if (!applyCapturedSelection(event) && !currentSelectionSnapshot) {
                        cancelSelectionClear();
                        destroyTriggerIcon();
                    }
                }, 40);
            });
        };

        if (delay) {
            window.setTimeout(finishCapture, delay);
        } else {
            finishCapture();
        }
    }

    function handleDoubleClickTrigger(event) {
        const mode = getSelectionTriggerMode();
        if (mode === "off") {
            return;
        }

        if (eventContainsNode(popupRoot, event) || eventContainsNode(triggerIconRoot, event)) {
            return;
        }

        if (isEditableTarget(event.target, event)) {
            return;
        }

        const token = (selectionCaptureToken += 1);
        if (applyCapturedSelection(event)) {
            return;
        }

        requestAnimationFrame(() => {
            if (token !== selectionCaptureToken) {
                return;
            }
            applyCapturedSelection(event);
        });
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
        if (!selectionModule.captureSelectionSnapshot) {
            return null;
        }
        try {
            return selectionModule.captureSelectionSnapshot(event);
        } catch (_error) {
            return null;
        }
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
        activeAiIntent = "";
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
        activeAiIntent = "";
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

        if (isEditableTarget(event.target, event)) {
            return;
        }

        if (eventContainsNode(popupRoot, event) || eventContainsNode(triggerIconRoot, event)) {
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
        if (eventContainsNode(triggerIconRoot, event)) {
            return;
        }

        if (popupRoot && !eventContainsNode(popupRoot, event)) {
            const selection = window.getSelection();
            if (!selection || !selection.toString().trim()) {
                destroyPopup();
            }
        }

        if (
            triggerIconRoot
            && (!currentSelectionSnapshot || !currentSelectionSnapshot.text)
            && !eventContainsNode(popupRoot, event)
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

        popupRoot.querySelector(".dictionary-helper-close")?.addEventListener("click", () => destroyPopup({ animate: true }));
        popupRoot.addEventListener("keydown", trapPopupFocus);

        const themeToggle = popupRoot.querySelector(".dictionary-helper-theme-toggle");
        themeToggle?.addEventListener("click", async (event) => {
            event.stopPropagation();
            const currentTheme = settings.theme || "system";
            let isCurrentlyDark = false;
            if (currentTheme === "dark") {
                isCurrentlyDark = true;
            } else if (currentTheme === "light") {
                isCurrentlyDark = false;
            } else {
                isCurrentlyDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
            }
            const nextTheme = isCurrentlyDark ? "light" : "dark";
            settings.theme = nextTheme;
            applyTheme();
            try {
                await chrome.storage.sync.set({ theme: nextTheme });
            } catch (_error) {
                // Best-effort
            }
        });

        const expandBtn = popupRoot.querySelector(".dictionary-helper-expand-btn");
        let savedRectBeforeMaximize = null;
        expandBtn?.addEventListener("click", (event) => {
            event.stopPropagation();
            if (!popupCard) return;

            const isMaximized = popupCard.classList.contains("is-maximized");
            if (isMaximized) {
                popupCard.classList.remove("is-maximized");
                if (savedRectBeforeMaximize) {
                    popupCard.style.top = savedRectBeforeMaximize.top;
                    popupCard.style.left = savedRectBeforeMaximize.left;
                    popupCard.style.width = savedRectBeforeMaximize.width;
                    popupCard.style.height = savedRectBeforeMaximize.height;
                    popupCard.style.maxHeight = savedRectBeforeMaximize.maxHeight;
                    popupCard.style.position = savedRectBeforeMaximize.position;
                } else {
                    applyPopupDimensions();
                    setPopupPosition(currentPosition);
                }
            } else {
                savedRectBeforeMaximize = {
                    top: popupCard.style.top,
                    left: popupCard.style.left,
                    width: popupCard.style.width,
                    height: popupCard.style.height,
                    maxHeight: popupCard.style.maxHeight,
                    position: popupCard.style.position
                };
                popupCard.classList.add("is-maximized");
            }
        });

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
                    activeAiIntent = "";
                    void popupHelpers.writeLastTab(activeTab);
                    renderShell();
                    void loadTab("dictionary");
                }
            }
        });


        // Resize logic
        const resizer = popupRoot.querySelector(".dictionary-helper-resizer");
        let isResizing = false;
        let startX = 0;
        let startY = 0;
        let startWidth = 0;
        let startHeight = 0;

        resizer?.addEventListener("mousedown", (e) => {
            if (e.button !== 0) return;
            isResizing = true;
            startX = e.clientX;
            startY = e.clientY;
            startWidth = popupCard.offsetWidth;
            startHeight = popupCard.offsetHeight;
            popupCard.classList.add("is-resizing");
            document.body.style.userSelect = "none";
            e.preventDefault();
            e.stopPropagation();
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
            popupCard.style.height = `${dimensions.height}px`;
            popupCard.style.maxHeight = `${dimensions.height}px`;
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
            const newHeight = parseInt(popupCard.style.height || popupCard.style.maxHeight, 10);
            if (newWidth && newHeight) {
                settings.popupWidth = newWidth;
                settings.popupHeight = newHeight;
                void chrome.storage.sync.set({ popupWidth: newWidth, popupHeight: newHeight });
            }
        }, true);

        // Drag-to-move logic
        const dragHandle = popupRoot.querySelector(".dictionary-helper-header");
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

            const rect = popupCard.getBoundingClientRect();
            dragOriginLeft = rect.left;
            dragOriginTop = rect.top;

            popupCard.classList.add("is-dragging");
            document.body.style.userSelect = "none";
            e.preventDefault();
        });

        document.addEventListener("mousemove", (e) => {
            if (!isDragging || !popupCard) return;

            const dx = e.clientX - dragStartX;
            const dy = e.clientY - dragStartY;

            const visual = window.visualViewport;
            const vw = visual?.width || window.innerWidth;
            const vh = visual?.height || window.innerHeight;
            const offsetLeft = visual?.offsetLeft || 0;
            const offsetTop = visual?.offsetTop || 0;
            const margin = 8;
            const cardW = popupCard.offsetWidth;
            const cardH = popupCard.offsetHeight;

            const newLeft = Math.max(offsetLeft + margin, Math.min(dragOriginLeft + dx, offsetLeft + vw - cardW - margin));
            const newTop = Math.max(offsetTop + margin, Math.min(dragOriginTop + dy, offsetTop + vh - cardH - margin));

            popupCard.style.position = "fixed";
            popupCard.style.left = `${Math.round(newLeft)}px`;
            popupCard.style.top = `${Math.round(newTop)}px`;
            e.preventDefault();
        }, true);

        document.addEventListener("mouseup", () => {
            if (!isDragging || !popupCard) return;

            isDragging = false;
            popupCard.classList.remove("is-dragging");
            document.body.style.userSelect = "";

            currentPosition = {
                ...currentPosition,
                x: parseFloat(popupCard.style.left) || currentPosition.x,
                y: parseFloat(popupCard.style.top) || currentPosition.y,
                useFixed: true
            };
        }, true);

        const mountNode = document.body || document.documentElement;
        mountNode.appendChild(popupRoot);
        if (focusPopupOnOpen) {
            requestAnimationFrame(() => popupRoot?.querySelector(".dictionary-helper-tab.is-active, .dictionary-helper-close")?.focus());
        }

        // Reposition when content grows (AI result loads, enrichment, etc.)
        if (typeof ResizeObserver === "function" && popupCard) {
            const observer = new ResizeObserver(() => {
                if (!popupCard || isResizing || popupCard.classList.contains("is-resizing")) return;
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
                <button class="dictionary-helper-context-btn" id="dictionary-helper-explain-context" data-ai-intent="explain_in_context" type="button" title="Explain what this word means in the sentence above"><span class="dictionary-helper-context-btn-label">Context Explain</span></button>
                <button class="dictionary-helper-context-btn" id="dictionary-helper-explain-grammar" data-ai-intent="grammar" type="button" title="Analyze syntax role, word order, and tone"><span class="dictionary-helper-context-btn-label">Grammar &amp; Nuance</span></button>
                <button class="dictionary-helper-context-btn" id="dictionary-helper-explain-phrase-explorer" data-ai-intent="phrase_explorer" type="button" title="Explore idioms, phrasal verbs, and collocations"><span class="dictionary-helper-context-btn-label">Phrase &amp; Collocations</span></button>
                <button class="dictionary-helper-context-btn" id="dictionary-helper-explain-sentence" data-ai-intent="sentence_breakdown" type="button" title="Break down sentence structure and parse components"><span class="dictionary-helper-context-btn-label">Sentence Breakdown</span></button>
                <button class="dictionary-helper-context-btn" id="dictionary-helper-explain-compare" data-ai-intent="compare_confusables" type="button" title="Compare similar or confusable words"><span class="dictionary-helper-context-btn-label">Compare Confusables</span></button>
                <button class="dictionary-helper-context-btn" id="dictionary-helper-explain-rephrase" data-ai-intent="rephrase" type="button" title="Rephrase in simpler, formal, and idiomatic styles"><span class="dictionary-helper-context-btn-label">Rephrase</span></button>
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
            popupRoot.querySelector("#dictionary-helper-explain-sentence"),
            popupRoot.querySelector("#dictionary-helper-explain-compare"),
            popupRoot.querySelector("#dictionary-helper-explain-rephrase")
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
            activeAiIntent = intent;
            syncAiActionButtonStatus();
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
                    body.innerHTML = renderer.renderResult(response.result, getRenderOptions({ followUps: [] }));
                    syncAiActionButtonStatus();
                })
                .catch((error) => {
                    if (token !== requestToken || !popupRoot || error?.name === "AbortError") return;
                    body.innerHTML = `<div class="dictionary-helper-state is-error"><strong>Unable to process request</strong><span>${renderer.escapeHtml(error.message || errorMessage)}</span></div>`;
                })
                .finally(() => {
                    if (token !== requestToken || !popupRoot) return;
                    body?.setAttribute("aria-busy", "false");
                    setContextButtonsDisabled(false);
                    syncAiActionButtonStatus();
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

        popupRoot.querySelector("#dictionary-helper-explain-compare")?.addEventListener("click", () => {
            runInPageContextAction({
                intent: "compare_confusables",
                errorMessage: "Unable to compare these words."
            });
        });

        popupRoot.querySelector("#dictionary-helper-explain-rephrase")?.addEventListener("click", () => {
            runInPageContextAction({
                intent: "rephrase",
                errorMessage: "Unable to rephrase this text."
            });
        });

        syncAiActionButtonStatus();
    }

    function syncAiActionButtonStatus() {
        if (!popupRoot) {
            return;
        }
        popupHelpers.syncAiActionButtonStatus(
            popupRoot.querySelectorAll(".dictionary-helper-context-btn[data-ai-intent]"),
            activeFollowUps,
            activeAiIntent,
            "dictionary-helper"
        );
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
            || { width: 620, height: 720 };
        popupCard.style.width = `${dimensions.width}px`;
        popupCard.style.height = `${dimensions.height}px`;
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

        if (tab !== "ai") {
            activeFollowUps = [];
            activeAiIntent = "";
        } else {
            activeAiIntent = "default";
        }
        syncAiActionButtonStatus();

        const cacheKey = lookupModule.buildRequestCacheKey(tab, text, settings, {});
        const cached = lookupCache.get(cacheKey);

        if (cached) {
            if (cached.requestId) {
                activeRequestId = cached.requestId;
            }
            if (tab === "ai") {
                syncFollowUpState(text, activeContext);
            }
            body.innerHTML = renderer.renderResult(cached, getRenderOptions());
            audio.restorePracticeResult(body, activeText, cached.pronunciation?.language);
            syncAiActionButtonStatus();
            if (tab === "ai") {
                void preloadFollowUpIntents(text, activeContext, token);
            }
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
            if (tab === "ai") {
                syncFollowUpState(text, activeContext);
            }
            body.innerHTML = renderer.renderResult(response.result, getRenderOptions());
            audio.restorePracticeResult(body, activeText, response.result?.pronunciation?.language);
            syncAiActionButtonStatus();
            if (tab === "ai") {
                void preloadFollowUpIntents(text, activeContext, token);
            }
        } catch (error) {
            if (isExtensionContextInvalidated(error)) {
                handleExtensionContextError(error);
                if (popupRoot && token === requestToken) {
                    body.innerHTML = `<div class="dictionary-helper-state is-error"><strong>Extension reloaded</strong><span>Refresh this tab to use it again.</span></div>`;
                }
                return;
            }

            if (token !== requestToken || !popupRoot || error?.name === "AbortError" || String(error?.message || "").includes("aborted")) {
                return;
            }

            body.innerHTML = `<div class="dictionary-helper-state is-error">${renderer.escapeHtml(error.message || "Unable to load results.")}</div>`;
        } finally {
            if (token === requestToken && popupRoot) {
                body.setAttribute("aria-busy", "false");
            }
        }
    }

    function syncFollowUpState(text, context) {
        if (!settings.enableAiPreload || !settings.enableAI) {
            activeFollowUps = [];
            return;
        }

        const eligible = popupHelpers.getEligibleFollowUpIntents({ text, context });
        activeFollowUps = eligible.map((item) => {
            const cacheKey = lookupModule.buildRequestCacheKey("ai", text, settings, {
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

    function patchActiveFollowUps() {
        if (!popupRoot || activeTab !== "ai") {
            return;
        }
        syncAiActionButtonStatus();
    }

    async function preloadFollowUpIntents(text, context, token = requestToken) {
        if (!settings.enableAiPreload || !settings.enableAI) {
            return;
        }

        const query = String(text || "").trim();
        if (!query) {
            return;
        }

        syncFollowUpState(query, context);
        if (!activeFollowUps.length) {
            return;
        }

        if (token === requestToken && activeTab === "ai") {
            patchActiveFollowUps();
        }

        for (const item of activeFollowUps) {
            if (token !== requestToken) {
                return;
            }
            if (item.result) {
                continue;
            }

            try {
                const response = await getLookupResponse("ai", query, {
                    context,
                    intent: item.intent
                });
                if (token !== requestToken) {
                    return;
                }
                const target = activeFollowUps.find((entry) => entry.intent === item.intent);
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
                if (token !== requestToken) {
                    return;
                }
                const target = activeFollowUps.find((entry) => entry.intent === item.intent);
                if (target) {
                    target.loading = false;
                    target.error = error?.message || item.errorMessage;
                }
            }

            if (token === requestToken && activeTab === "ai") {
                patchActiveFollowUps();
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
        void getLookupResponse("ai", normalizedQuery)
            .then(() => preloadFollowUpIntents(normalizedQuery, activeContext, requestToken))
            .catch(() => {
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
            width: settings.popupWidth || 620,
            height: settings.popupHeight || 720
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
                    width: settings.popupWidth || 620,
                    height: settings.popupHeight || 720
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
        if (changes.lastActiveTab?.newValue) {
            const nextTab = changes.lastActiveTab.newValue;
            if (availableTabs.includes(nextTab)) {
                activeTab = nextTab;
            }
        } else if (!availableTabs.includes(activeTab)) {
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

    function isEditableTarget(target, event) {
        return selectionModule.isEditableTarget(target, event);
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
