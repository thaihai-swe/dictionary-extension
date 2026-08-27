/* Shared popup shell markup and dimension helpers for toolbar and in-page hosts. */
(function (global) {
    const MIN_WIDTH = 320;
    const MAX_WIDTH = 1000;
    const MIN_HEIGHT = 360;
    const MAX_HEIGHT = 1000;

    function clampDimensions(width, height, defaults = { width: 620, height: 720 }) {
        return {
            width: Math.max(MIN_WIDTH, Math.min(Number(width) || defaults.width, MAX_WIDTH)),
            height: Math.max(MIN_HEIGHT, Math.min(Number(height) || defaults.height, MAX_HEIGHT))
        };
    }

    function createMarkup({ prefix = "dictionary-helper", host = "inpage" } = {}) {
        const toolbar = host === "toolbar";
        const providerId = toolbar ? "provider-select" : `${prefix}-provider-select`;
        const languageId = toolbar ? "lang-select" : `${prefix}-lang-select`;
        const resultId = toolbar ? "result" : `${prefix}-result`;
        const tabsId = toolbar ? "tabs" : `${prefix}-tabs`;
        const searchId = toolbar ? "lookup-input" : `${prefix}-search`;
        const providerOptions = `
            <option value="free_dictionary">Free Dictionary</option>
            <option value="wiktionary">Wiktionary</option>
            <option value="merriam_webster">Merriam-Webster</option>
            <option value="wordnik">Wordnik</option>
            <option value="words_api">WordsAPI</option>
        `;
        const headerAction = toolbar
            ? `<button id="pause-site-btn" class="${prefix}-pause-btn" type="button" aria-pressed="false" title="Pause in-page triggers on this site">Pause site</button><button id="open-settings-btn" class="${prefix}-settings-btn" type="button" aria-label="Open settings" title="Open settings"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Zm0-6 1 .2.5 2.1c.5.2 1 .4 1.5.7l1.8-1.1.8.6 1.4 1.4.6.8-1.1 1.8c.3.5.5 1 .7 1.5l2.1.5.2 1v2l-2.1.5c-.2.5-.4 1-.7 1.5l1.1 1.8-.6.8-1.4 1.4-.8.6-1.8-1.1c-.5.3-1 .5-1.5.7l-.5 2.1-1 .2h-2l-1-.2-.5-2.1c-.5-.2-1-.4-1.5-.7l-1.8 1.1-.8-.6-1.4-1.4-.6-.8 1.1-1.8c-.3-.5-.5-1-.7-1.5L2.2 14l-.2-1v-2l.2-1 2.1-.5c.2-.5.4-1 .7-1.5L3.9 6.2l.6-.8 1.4-1.4.8-.6 1.8 1.1c.5-.3 1-.5 1.5-.7l.5-2.1 1-.2h2Z"/></svg></button>`
            : `<button class="${prefix}-close" type="button" aria-label="Close"><span aria-hidden="true">&times;</span></button>`;
        const search = toolbar
            ? `
                <form class="${prefix}-search" id="lookup-form">
                    <label class="sr-only" for="${searchId}">Word or phrase</label>
                    <input id="${searchId}" name="query" type="text" placeholder="Type a word or phrase" autocomplete="off" spellcheck="false">
                    <button type="submit">Search</button>
                </form>
            `
            : "";
        const context = toolbar
            ? `
                <div id="context-action-container" class="${prefix}-context-action" hidden>
                    <label class="${prefix}-context-label" for="context-input">Context</label>
                    <textarea id="context-input" class="${prefix}-context-input" rows="2" placeholder="Paste the sentence or context here..." spellcheck="true" aria-describedby="context-help context-error"></textarea>
                    <p id="context-help" class="${prefix}-context-help">Used only for this explanation. Not saved.</p>
                    <p id="context-error" class="${prefix}-context-error" role="alert" hidden>Paste or type the sentence that contains this word.</p>
                    <div class="${prefix}-context-buttons">
                        <button id="explain-context-btn" type="button" class="${prefix}-context-btn" data-ai-intent="explain_in_context" title="Explain what this word means in the sentence above"><span class="${prefix}-context-btn-label">🔍 Context Explain</span></button>
                        <button id="explain-grammar-btn" type="button" class="${prefix}-context-btn" data-ai-intent="grammar" title="Analyze syntax role, word order, and tone"><span class="${prefix}-context-btn-label">📐 Grammar &amp; Nuance</span></button>
                        <button id="explain-phrase-explorer-btn" type="button" class="${prefix}-context-btn" data-ai-intent="phrase_explorer" title="Explore idioms, phrasal verbs, and collocations"><span class="${prefix}-context-btn-label">💡 Phrase &amp; Collocations</span></button>
                        <button id="explain-sentence-btn" type="button" class="${prefix}-context-btn" data-ai-intent="sentence_breakdown" title="Break down sentence structure and parse components"><span class="${prefix}-context-btn-label">🧩 Sentence Breakdown</span></button>
                        <button id="explain-compare-btn" type="button" class="${prefix}-context-btn" data-ai-intent="compare_confusables" title="Compare similar or confusable words"><span class="${prefix}-context-btn-label">⚖️ Compare Confusables</span></button>
                        <button id="explain-rephrase-btn" type="button" class="${prefix}-context-btn" data-ai-intent="rephrase" title="Rephrase in simpler, formal, and idiomatic styles"><span class="${prefix}-context-btn-label">✨ Rephrase</span></button>
                    </div>
                </div>
            `
            : `<div class="${prefix}-context-host"></div>`;
        const shortcutsBtn = `
            <button class="${prefix}-shortcuts-btn" type="button" aria-label="Keyboard shortcuts" title="Shortcuts &amp; Tips · Phím tắt &amp; Tiện ích">
                <svg class="${prefix}-shortcuts-icon" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="2" y="4" width="20" height="16" rx="2" ry="2"/>
                    <line x1="6" y1="8" x2="6" y2="8"/>
                    <line x1="10" y1="8" x2="10" y2="8"/>
                    <line x1="14" y1="8" x2="14" y2="8"/>
                    <line x1="18" y1="8" x2="18" y2="8"/>
                    <line x1="6" y1="12" x2="6" y2="12"/>
                    <line x1="10" y1="12" x2="10" y2="12"/>
                    <line x1="14" y1="12" x2="14" y2="12"/>
                    <line x1="18" y1="12" x2="18" y2="12"/>
                    <line x1="7" y1="16" x2="17" y2="16"/>
                </svg>
            </button>
        `;
        const themeToggle = `
            <button class="${prefix}-theme-toggle" type="button" aria-label="Toggle theme" title="Toggle theme · Đổi giao diện Sáng / Tối">
                <svg class="${prefix}-theme-icon ${prefix}-theme-icon--sun" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
                <svg class="${prefix}-theme-icon ${prefix}-theme-icon--moon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
            </button>
        `;
        const expandBtn = toolbar ? "" : `
            <button class="${prefix}-expand-btn" type="button" aria-label="Expand / Restore" title="Maximize / Restore · Phóng to / Thu nhỏ">
                <svg class="${prefix}-expand-icon ${prefix}-expand-icon--expand" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>
                <svg class="${prefix}-expand-icon ${prefix}-expand-icon--restore" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="14" y1="10" x2="21" y2="3"/><line x1="10" y1="14" x2="3" y2="21"/></svg>
            </button>
        `;
        const shortcutsModal = `
            <div class="${prefix}-shortcuts-modal" hidden aria-label="Keyboard Shortcuts">
                <div class="${prefix}-shortcuts-header">
                    <div class="${prefix}-shortcuts-title-wrap">
                        <span class="${prefix}-shortcuts-title">⌨️ Shortcuts &amp; Tips</span>
                        <small class="${prefix}-shortcuts-subtitle">Phím tắt &amp; Tiện ích tra cứu</small>
                    </div>
                    <button class="${prefix}-shortcuts-close" type="button" aria-label="Close shortcuts">&times;</button>
                </div>
                <div class="${prefix}-shortcuts-list">
                    <div class="${prefix}-shortcut-item">
                        <div class="${prefix}-shortcut-desc-wrap">
                            <span class="${prefix}-shortcut-desc">Quick lookup selected text</span>
                            <small class="${prefix}-shortcut-sub">Tra cứu nhanh từ/câu đang bôi đen</small>
                        </div>
                        <div class="${prefix}-shortcut-keys"><kbd>Shift</kbd> + <kbd>Q</kbd></div>
                    </div>
                    <div class="${prefix}-shortcut-item">
                        <div class="${prefix}-shortcut-desc-wrap">
                            <span class="${prefix}-shortcut-desc">Close lookup popup</span>
                            <small class="${prefix}-shortcut-sub">Đóng cửa sổ tra cứu</small>
                        </div>
                        <div class="${prefix}-shortcut-keys"><kbd>Esc</kbd></div>
                    </div>
                    <div class="${prefix}-shortcut-item">
                        <div class="${prefix}-shortcut-desc-wrap">
                            <span class="${prefix}-shortcut-desc">Maximize / Restore viewport</span>
                            <small class="${prefix}-shortcut-sub">Phóng to toàn màn hình / Thu nhỏ</small>
                        </div>
                        <div class="${prefix}-shortcut-keys"><kbd>Nút ⤢</kbd></div>
                    </div>
                    <div class="${prefix}-shortcut-item">
                        <div class="${prefix}-shortcut-desc-wrap">
                            <span class="${prefix}-shortcut-desc">Drag popup freely</span>
                            <small class="${prefix}-shortcut-sub">Kéo di chuyển trên màn hình</small>
                        </div>
                        <div class="${prefix}-shortcut-keys"><kbd>Kéo Header</kbd></div>
                    </div>
                    <div class="${prefix}-shortcut-item">
                        <div class="${prefix}-shortcut-desc-wrap">
                            <span class="${prefix}-shortcut-desc">Resize width &amp; height</span>
                            <small class="${prefix}-shortcut-sub">Thay đổi kích cỡ cửa sổ</small>
                        </div>
                        <div class="${prefix}-shortcut-keys"><kbd>Góc phải ◺</kbd></div>
                    </div>
                    <div class="${prefix}-shortcut-item">
                        <div class="${prefix}-shortcut-desc-wrap">
                            <span class="${prefix}-shortcut-desc">Toggle Dark / Light theme</span>
                            <small class="${prefix}-shortcut-sub">Đổi giao diện Sáng / Tối</small>
                        </div>
                        <div class="${prefix}-shortcut-keys"><kbd>Nút ☀️/🌙</kbd></div>
                    </div>
                    <div class="${prefix}-shortcut-item">
                        <div class="${prefix}-shortcut-desc-wrap">
                            <span class="${prefix}-shortcut-desc">Navigate buttons &amp; tabs</span>
                            <small class="${prefix}-shortcut-sub">Chuyển tab và điều hướng phím</small>
                        </div>
                        <div class="${prefix}-shortcut-keys"><kbd>Tab</kbd> / <kbd>Enter</kbd></div>
                    </div>
                </div>
            </div>
        `;
        const content = `
            <header class="${prefix}-header">
                <div class="${prefix}-header-content">
                    <div class="${prefix}-header-row">
                        <div class="${prefix}-identity"><span class="${prefix}-brand-mark" aria-hidden="true">📖</span><p class="${prefix}-${toolbar ? "eyebrow" : "title"}">${toolbar ? "Look up" : "Dictionary"}</p></div>
                        <div class="${prefix}-header-controls">
                            <select id="${providerId}" class="${prefix}-header-select" aria-label="Dictionary provider">${providerOptions}</select>
                            <select id="${languageId}" class="${prefix}-header-lang" aria-label="Target language"></select>
                            ${shortcutsBtn}
                            ${themeToggle}
                            ${expandBtn}
                            ${headerAction}
                        </div>
                    </div>
                </div>
            </header>
            ${shortcutsModal}
            ${search}
            <nav class="${prefix}-tabs" id="${tabsId}" role="tablist" aria-label="Lookup mode"></nav>
            ${context}
            <section class="${prefix}-body" id="${resultId}" role="tabpanel" aria-live="polite" aria-atomic="false" aria-busy="false" tabindex="-1"></section>
            <div class="${prefix}-announcements" role="alert" aria-live="assertive" aria-atomic="true"></div>
            ${toolbar ? "" : `<div class="${prefix}-resizer" id="${prefix}-resizer" aria-hidden="true"></div>`}
        `;

        return toolbar ? content : `<div class="${prefix}-card">${content}</div>`;
    }

    global.DictionaryHelperPopupShell = {
        MIN_WIDTH,
        MAX_WIDTH,
        MIN_HEIGHT,
        MAX_HEIGHT,
        clampDimensions,
        createMarkup
    };
})(typeof globalThis !== "undefined" ? globalThis : window);
