/**
 * Shared rendering utilities for the in-page lookup popup and toolbar action popup.
 * Orchestrator delegating to RendererBase, RendererAi, and RendererLexical.
 */
(function (global) {
    "use strict";

    const base = () => global.DictionaryHelperRendererBase;
    const ai = () => global.DictionaryHelperRendererAi;
    const lexical = () => global.DictionaryHelperRendererLexical;

    // Strategy Pattern for Section Body Rendering
    const SECTION_BODY_RENDERERS = {
        "sentence-overview": (section, options, prefix) => ai().renderSentenceOverview(section.data, prefix),
        "sentence-structure": (section, options, prefix) => ai().renderSentenceStructure(section.data, prefix),
        "phrase-parsing": (section, options, prefix) => ai().renderPhraseParsing(section.data, prefix),
        "senses": (section, options, prefix) => ai().renderSenseMatrix(section.data.senses, prefix),
        "compare-matrix": (section, options, prefix) => ai().renderComparisonTable(section.data, prefix),
        "context": (section, options, prefix) => base().renderTokenizedContext(section.text || "", options.title || options.query || "", prefix)
    };

    const Renderer = {
        // Delegate base utilities for backwards compatibility
        escapeHtml: (val) => base().escapeHtml(val),
        labelForTab: (tab) => base().labelForTab(tab),
        formatSectionTitle: (title, kind) => base().formatSectionTitle(title, kind),
        highlightContextQuery: (src, q) => base().highlightContextQuery(src, q),
        renderTokenizedContext: (src, q, p) => base().renderTokenizedContext(src, q, p),
        renderSectionActions: (sec, k, p) => base().renderSectionActions(sec, k, p),
        renderExampleListenButton: (txt, p) => base().renderExampleListenButton(txt, p),
        isInlineBilingualExample: (val) => base().isInlineBilingualExample(val),
        shouldListenOnPairedLine: (txt, idx) => base().shouldListenOnPairedLine(txt, idx),
        renderExampleItem: (item, p) => base().renderExampleItem(item, p),
        looksLikeEnglish: (val) => base().looksLikeEnglish(val),
        extractEnglishSpeechText: (val) => base().extractEnglishSpeechText(val),
        cleanSpeechText: (val) => base().cleanSpeechText(val),
        extractFirstExample: (sec) => base().extractFirstExample(sec),
        renderSimpleMarkdown: (src, p, opts) => base().renderSimpleMarkdown(src, p, opts),
        formatInlineMarkdown: (txt) => base().formatInlineMarkdown(txt),
        normalizeSectionKind: (sec) => base().normalizeSectionKind(sec),
        renderPronunciation: (pron, p) => base().renderPronunciation(pron, p),
        renderSkeleton: (p) => base().renderSkeleton(p),
        renderSpeechPractice: (res, p) => base().renderSpeechPractice(res, p),

        // Delegate AI presentation helpers
        renderSenseMatrix: (senses, p) => ai().renderSenseMatrix(senses, p),
        renderComparisonTable: (data, p) => ai().renderComparisonTable(data, p),
        renderMinimalPairs: (pairs, p) => ai().renderMinimalPairs(pairs, p),
        getAiSectionRank: (intent, sec, k) => ai().getAiSectionRank(intent, sec, k),
        pinContextFirst: (secs) => ai().pinContextFirst(secs),
        orderSectionsForPresentation: (secs, pres) => ai().orderSectionsForPresentation(secs, pres),
        getAiPrimaryKinds: (intent) => ai().getAiPrimaryKinds(intent),
        getAiDeepDiveKinds: (intent) => ai().getAiDeepDiveKinds(intent),
        isAlwaysOpenAiKind: (k) => ai().isAlwaysOpenAiKind(k),
        isPrimaryExpandedSection: (k, t, i, intent) => ai().isPrimaryExpandedSection(k, t, i, intent),
        isDeepDiveSection: (k, t, intent) => ai().isDeepDiveSection(k, t, intent),
        shouldCollapseSection: (sec, k, i, tot, intent) => ai().shouldCollapseSection(sec, k, i, tot, intent),
        renderSentenceOverview: (data, p) => ai().renderSentenceOverview(data, p),
        renderSentenceStructure: (data, p) => ai().renderSentenceStructure(data, p),
        renderPhraseParsing: (data, p) => ai().renderPhraseParsing(data, p),

        // Delegate Lexical profile helpers
        renderLexicalProfile: (prof, p, tag) => lexical().renderLexicalProfile(prof, p, tag),

        // Section rendering using Strategy Pattern
        renderSection(section, options = {}) {
            const prefix = options.prefix || "dictionary-helper";
            const sectionTitleTag = options.sectionTitleTag || "h4";

            const kind = base().normalizeSectionKind(section);
            const isExamples = kind === "examples";
            const items = (section.items || [])
                .map((item) => isExamples
                    ? base().renderExampleItem(item, prefix)
                    : `<li class="${prefix}-section-list-item">${base().formatInlineMarkdown(item)}</li>`)
                .join("");
            const hasTitle = Boolean(String(section.title || "").trim());
            const metaBadge = section.meta
                ? `<span class="${prefix}-section-meta">${base().escapeHtml(section.meta)}</span>`
                : "";

            let sectionBody = "";
            const bodyStrategy = SECTION_BODY_RENDERERS[kind];
            if (section.data && bodyStrategy) {
                sectionBody = bodyStrategy(section, options, prefix);
            } else if (section.data && Array.isArray(section.data.pairs)) {
                sectionBody = ai().renderMinimalPairs(section.data.pairs, prefix);
            } else if (kind === "context") {
                sectionBody = base().renderTokenizedContext(section.text || "", options.title || options.query || "", prefix);
            } else if (section.markdown) {
                let mdText = section.text || "";
                if (kind === "context" && options.title) {
                    mdText = base().highlightContextQuery(mdText, options.title);
                }
                sectionBody = `<div class="${prefix}-markdown">${base().renderSimpleMarkdown(mdText, prefix, { listenOnQuotes: isExamples, listenOnListItems: isExamples })}</div>`;
            } else if (section.text) {
                const inlineMeta = (!hasTitle && section.meta)
                    ? ` <small class="${prefix}-inline-meta">${base().escapeHtml(section.meta)}</small>`
                    : "";
                sectionBody = `<p class="${prefix}-section-paragraph">${base().escapeHtml(section.text)}${inlineMeta}</p>`;
            } else if (section.meta && !hasTitle) {
                sectionBody = `<p class="${prefix}-section-paragraph"><small class="${prefix}-inline-meta">${base().escapeHtml(section.meta)}</small></p>`;
            }

            const contentHtml = `${sectionBody}${items ? `<ul class="${prefix}-section-list">${items}</ul>` : ""}`;
            const actionsHtml = base().renderSectionActions(section, kind, prefix);

            const collapsible = section.collapseByDefault === true || (typeof section.collapseByDefault === "undefined" && items.length === 0 && hasTitle);
            const sectionClasses = `${prefix}-section ${prefix}-section--${kind}${collapsible ? ` ${prefix}-section--collapsible` : ""}`;
            const sectionIndex = Number(options.index) || 0;

            return `
              <section class="${sectionClasses}" data-section-kind="${base().escapeHtml(kind)}" data-section-index="${sectionIndex}" style="--section-index: ${sectionIndex};">
                ${hasTitle
                    ? `<header class="${prefix}-section-heading"><span class="${prefix}-section-title">${base().escapeHtml(section.title)}</span>${metaBadge}${actionsHtml}</header>`
                    : ""}
                ${contentHtml}
              </section>`;
        },

        // Full result rendering
        renderResult(result, options = {}) {
            const prefix = options.prefix || "dictionary-helper";
            const titleTag = options.titleTag || "h3";
            const sectionTitleTag = options.sectionTitleTag || "h4";
            const isToolbar = false;

            const pronunciation = base().renderPronunciation({
                ...result.pronunciation,
                rate: options.pronunciationRate,
                voiceURI: options.pronunciationVoiceURI
            }, prefix);
            const pronunciationVariants = (result.pronunciations || []).slice(1).map((item) => base().renderPronunciation({
                ...item,
                rate: options.pronunciationRate,
                voiceURI: options.pronunciationVoiceURI
            }, prefix)).join("");
            const speechPractice = base().renderSpeechPractice(result, prefix);
            const isAiResult = result?.presentation?.surface === "ai";
            const aiIntent = isAiResult ? String(result?.presentation?.intent || "default") : "";
            const rawSections = (ai()?.orderSectionsForPresentation
                ? ai().orderSectionsForPresentation(result?.sections, result?.presentation)
                : (result?.sections || [])) || [];
            const totalSections = Array.isArray(rawSections) ? rawSections.length : 0;
            const sections = rawSections.map((section, index) => {
                if (!section) return "";
                const kind = base()?.normalizeSectionKind ? base().normalizeSectionKind(section) : (section.kind || "general");
                const isExamples = kind === "examples";
                const items = (section.items || [])
                    .map((item) => isExamples
                        ? (base()?.renderExampleItem ? base().renderExampleItem(item, prefix) : `<li>${item}</li>`)
                        : `<li class="${prefix}-section-list-item">${base()?.formatInlineMarkdown ? base().formatInlineMarkdown(item) : item}</li>`)
                    .join("");
                const hasTitle = Boolean(String(section.title || "").trim());
                const metaBadge = section.meta
                    ? `<span class="${prefix}-section-meta">${base()?.escapeHtml ? base().escapeHtml(section.meta) : section.meta}</span>`
                    : "";

                let sectionBody = "";
                const bodyStrategy = SECTION_BODY_RENDERERS[kind];
                if (section.data && bodyStrategy) {
                    sectionBody = bodyStrategy(section, options, prefix);
                } else if (section.data && Array.isArray(section.data.pairs) && ai()?.renderMinimalPairs) {
                    sectionBody = ai().renderMinimalPairs(section.data.pairs, prefix);
                } else if (kind === "context") {
                    sectionBody = base()?.renderTokenizedContext ? base().renderTokenizedContext(section.text || "", result?.title || options.query || "", prefix) : "";
                } else if (section.markdown) {
                    let mdText = section.text || "";
                    if (kind === "context" && result?.title && base()?.highlightContextQuery) {
                        mdText = base().highlightContextQuery(mdText, result.title);
                    }
                    sectionBody = `<div class="${prefix}-markdown">${base()?.renderSimpleMarkdown ? base().renderSimpleMarkdown(mdText, prefix, { listenOnQuotes: isExamples, listenOnListItems: isExamples }) : mdText}</div>`;
                } else if (section.text) {
                    const inlineMeta = (!hasTitle && section.meta)
                        ? ` <small class="${prefix}-inline-meta">${base()?.escapeHtml ? base().escapeHtml(section.meta) : section.meta}</small>`
                        : "";
                    sectionBody = `<p class="${prefix}-section-paragraph">${base()?.escapeHtml ? base().escapeHtml(section.text) : section.text}${inlineMeta}</p>`;
                } else if (section.meta && !hasTitle) {
                    sectionBody = `<p class="${prefix}-section-paragraph"><small class="${prefix}-inline-meta">${base()?.escapeHtml ? base().escapeHtml(section.meta) : section.meta}</small></p>`;
                }

                const contentHtml = `${sectionBody}${items ? `<ul class="${prefix}-section-list">${items}</ul>` : ""}`;
                const actionsHtml = base()?.renderSectionActions ? base().renderSectionActions(section, kind, prefix) : "";
                const collapsible = ai()?.shouldCollapseSection
                    ? ai().shouldCollapseSection(section, kind, index, totalSections, aiIntent)
                    : false;
                const sectionClasses = `${prefix}-section ${prefix}-section--${kind}${collapsible ? ` ${prefix}-section--collapsible` : ""}`;

                const formattedTitle = base()?.formatSectionTitle ? base().formatSectionTitle(section.title, kind) : (section.title || "");
                if (collapsible) {
                    const sectionLabel = `<${sectionTitleTag} class="${prefix}-section-title">${base()?.escapeHtml ? base().escapeHtml(formattedTitle) : formattedTitle}</${sectionTitleTag}>${metaBadge}${actionsHtml}`;
                    return `
              <details class="${sectionClasses}" data-section-kind="${base()?.escapeHtml ? base().escapeHtml(kind) : kind}" data-section-index="${index}" style="--section-index: ${index};">
                <summary class="${prefix}-section-summary">${sectionLabel}</summary>
                <div class="${prefix}-section-body">
                  ${contentHtml}
                </div>
              </details>`;
                }

                const sectionLabel = hasTitle
                    ? `<div class="${prefix}-section-heading"><${sectionTitleTag} class="${prefix}-section-title">${base().escapeHtml(formattedTitle)}</${sectionTitleTag}>${metaBadge}${actionsHtml}</div>`
                    : "";

                return `
              <section class="${sectionClasses}" data-section-kind="${base().escapeHtml(kind)}" data-section-index="${index}" style="--section-index: ${index};">
                ${sectionLabel}
                ${contentHtml}
              </section>`;
            }).join("");

            const meta = result.subtitle ? `<div class="${prefix}-meta"><span class="${prefix}-meta-pill">${base().escapeHtml(result.subtitle)}</span></div>` : "";
            const stateEl = isToolbar ? "p" : "div";
            const rootEl = isToolbar ? "article" : "div";
            const lexicalProfileHtml = lexical().renderLexicalProfile(result.lexicalProfile, prefix, sectionTitleTag);
            const displayTitle = result.title || options.query || "";
            const titleRow = displayTitle
                ? `<div class="${prefix}-title-row"><div class="${prefix}-title-cell"><${titleTag} class="${prefix}-term">${base().escapeHtml(displayTitle)}</${titleTag}><div class="${prefix}-pronunciation-group">${pronunciation}${pronunciationVariants}${speechPractice}</div></div>${meta}</div>`
                : (meta ? `<div class="${prefix}-title-row">${meta}</div>` : "");
            const emptyState = `<${stateEl} class="${prefix}-state"><strong>No result</strong><span>Try another word or switch sources.</span></${stateEl}>`;
            const resultBody = isAiResult
                ? `${sections || emptyState}${lexicalProfileHtml}`
                : `${lexicalProfileHtml}${sections || emptyState}`;

            return `
            <${rootEl} class="${prefix}-result">
              ${titleRow}
              ${resultBody}
            </${rootEl}>
          `;
        }
    };

    global.DictionaryHelperRenderer = Renderer;
})(typeof window !== "undefined" ? window : globalThis);
