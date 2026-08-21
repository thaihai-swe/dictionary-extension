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
            ? `<button id="open-settings-btn" class="${prefix}-settings-btn" type="button" aria-label="Open settings" title="Open settings"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Zm0-6 1 .2.5 2.1c.5.2 1 .4 1.5.7l1.8-1.1.8.6 1.4 1.4.6.8-1.1 1.8c.3.5.5 1 .7 1.5l2.1.5.2 1v2l-2.1.5c-.2.5-.4 1-.7 1.5l1.1 1.8-.6.8-1.4 1.4-.8.6-1.8-1.1c-.5.3-1 .5-1.5.7l-.5 2.1-1 .2h-2l-1-.2-.5-2.1c-.5-.2-1-.4-1.5-.7l-1.8 1.1-.8-.6-1.4-1.4-.6-.8 1.1-1.8c-.3-.5-.5-1-.7-1.5L2.2 14l-.2-1v-2l.2-1 2.1-.5c.2-.5.4-1 .7-1.5L3.9 6.2l.6-.8 1.4-1.4.8-.6 1.8 1.1c.5-.3 1-.5 1.5-.7l.5-2.1 1-.2h2Z"/></svg></button>`
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
                        <button id="explain-context-btn" type="button" class="${prefix}-context-btn" data-ai-intent="explain_in_context" title="Explain what this word means in the sentence above"><span class="${prefix}-context-btn-label">Context Explain</span></button>
                        <button id="explain-grammar-btn" type="button" class="${prefix}-context-btn" data-ai-intent="grammar" title="Analyze syntax role, word order, and tone"><span class="${prefix}-context-btn-label">Grammar &amp; Nuance</span></button>
                        <button id="explain-phrase-explorer-btn" type="button" class="${prefix}-context-btn" data-ai-intent="phrase_explorer" title="Explore idioms, phrasal verbs, and collocations"><span class="${prefix}-context-btn-label">Phrase &amp; Collocations</span></button>
                        <button id="explain-sentence-btn" type="button" class="${prefix}-context-btn" data-ai-intent="sentence_breakdown" title="Break down sentence structure and parse components"><span class="${prefix}-context-btn-label">Sentence Breakdown</span></button>
                        <button id="explain-compare-btn" type="button" class="${prefix}-context-btn" data-ai-intent="compare_confusables" title="Compare similar or confusable words"><span class="${prefix}-context-btn-label">Compare Confusables</span></button>
                        <button id="explain-rephrase-btn" type="button" class="${prefix}-context-btn" data-ai-intent="rephrase" title="Rephrase in simpler, formal, and idiomatic styles"><span class="${prefix}-context-btn-label">Rephrase</span></button>
                    </div>
                </div>
            `
            : `<div class="${prefix}-context-host"></div>`;
        const content = `
            <header class="${prefix}-header">
                <div class="${prefix}-header-content">
                    <div class="${prefix}-header-row">
                        <div class="${prefix}-identity"><span class="${prefix}-brand-mark" aria-hidden="true">D</span><p class="${prefix}-${toolbar ? "eyebrow" : "title"}">${toolbar ? "Look up" : "Dictionary"}</p></div>
                        <select id="${providerId}" class="${prefix}-header-select" aria-label="Dictionary provider">${providerOptions}</select>
                        <select id="${languageId}" class="${prefix}-header-lang" aria-label="Target language"></select>
                        ${headerAction}
                    </div>
                </div>
            </header>
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
