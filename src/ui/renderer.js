/**
 * Shared rendering utilities for the in-page lookup popup.
 * Injected globally in src/content.js context.
 */
(function (global) {
    const Renderer = {
        escapeHtml(value) {
            if (value == null) return "";
            return String(value)
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#39;");
        },

        labelForTab(tab) {
            return tab === "ai" ? "AI" : "Dictionary";
        },

        highlightContextQuery(sourceText, query) {
            const raw = String(sourceText || "");
            const term = String(query || "").trim();
            if (!raw || !term) {
                return raw;
            }
            const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            const pattern = new RegExp(`(^|[^\\p{L}\\p{N}_])(${escapedTerm})(?=$|[^\\p{L}\\p{N}_])`, "giu");
            return raw.replace(pattern, "$1**$2**");
        },

        renderTokenizedContext(sourceText, query, prefix) {
            const raw = String(sourceText || "").replace(/^>\s?/, "").trim();
            if (!raw) {
                return "";
            }
            const term = String(query || "").trim().toLowerCase();
            const tokens = raw.split(/(\s+)/);
            const html = tokens.map((token) => {
                if (/^\s+$/.test(token) || !token) {
                    return Renderer.escapeHtml(token);
                }
                const cleaned = token.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
                if (!cleaned) {
                    return Renderer.escapeHtml(token);
                }
                const isQuery = term && cleaned.toLowerCase() === term;
                const cls = isQuery ? `${prefix}-token is-query` : `${prefix}-token`;
                return `<button type="button" class="${cls}" data-lookup-query="${Renderer.escapeHtml(cleaned)}">${Renderer.escapeHtml(token)}</button>`;
            }).join("");
            return `<blockquote class="${prefix}-sentence-box ${prefix}-tokenized-context"><p>${html}</p></blockquote>`;
        },

        renderSectionActions(section, kind, prefix) {
            if (kind !== "examples") {
                return "";
            }
            if ((Array.isArray(section?.items) && section.items.length > 0) || (Array.isArray(section?.data?.pairs) && section.data.pairs.length > 0)) {
                return "";
            }
            if (section?.markdown && /^>\s?/m.test(String(section.text || ""))) {
                return "";
            }
            const exampleText = Renderer.extractFirstExample(section);
            if (!exampleText) {
                return "";
            }
            return `<div class="${prefix}-section-actions"><button type="button" class="${prefix}-section-action ${prefix}-pronounce" data-pronounce-text="${Renderer.escapeHtml(exampleText)}" data-pronounce-language="en-US" aria-label="Play example sentence" title="Play example">Listen</button></div>`;
        },

        renderExampleListenButton(speechText, prefix = "dictionary-helper") {
            const cleaned = Renderer.extractEnglishSpeechText(speechText);
            if (!cleaned) {
                return "";
            }
            return `<button type="button" class="${prefix}-example-listen ${prefix}-pronounce" data-pronounce-text="${Renderer.escapeHtml(cleaned)}" data-pronounce-language="en-US" aria-label="Play example sentence" title="Play example">Listen</button>`;
        },

        isInlineBilingualExample(value) {
            const text = String(value || "").trim();
            if (!text) {
                return false;
            }
            return /^["'“].+?["'”]\s*(?:—|–|--|:|\()\s*.+$/.test(text)
                || /\s+(?:—|–|--)\s+/.test(text)
                || /^.+?\s+\(([^)]+)\)\s*$/.test(text);
        },

        shouldListenOnPairedLine(text, pairIndex) {
            if (Renderer.isInlineBilingualExample(text)) {
                return true;
            }
            return pairIndex % 2 === 0;
        },

        renderExampleItem(item, prefix = "dictionary-helper") {
            const listenBtn = Renderer.renderExampleListenButton(item, prefix);
            return `<li class="${prefix}-section-list-item ${prefix}-example-item"><div class="${prefix}-example-row"><span class="${prefix}-example-text">${Renderer.formatInlineMarkdown(item)}</span>${listenBtn}</div></li>`;
        },

        looksLikeEnglish(value) {
            const letters = String(value || "").match(/\p{L}/gu) || [];
            if (letters.length < 3) {
                return false;
            }
            const latin = letters.filter((ch) => /[A-Za-z]/.test(ch)).length;
            return latin / letters.length >= 0.85;
        },

        extractEnglishSpeechText(value) {
            let text = Renderer.cleanSpeechText(value);
            if (!text) {
                return "";
            }
            text = text.replace(/^\d+[.)]\s+/, "").replace(/^[-*+]\s+/, "");

            const stripOuterQuotes = (value) => String(value || "").replace(/^["'“]+/, "").replace(/["'”]+$/, "").trim();

            const quotedThenGloss = text.match(/^["'“](.+?)["'”]\s*(?:—|–|--|:|\()\s*.+$/);
            if (quotedThenGloss && Renderer.looksLikeEnglish(quotedThenGloss[1])) {
                return stripOuterQuotes(quotedThenGloss[1]);
            }

            const dashParts = text.split(/\s+(?:—|–|--)\s+/);
            if (dashParts.length >= 2 && Renderer.looksLikeEnglish(dashParts[0]) && !Renderer.looksLikeEnglish(dashParts.slice(1).join(" "))) {
                return stripOuterQuotes(dashParts[0]);
            }

            const paren = text.match(/^(.+?)\s+\(([^)]+)\)\s*$/);
            if (paren && Renderer.looksLikeEnglish(paren[1]) && !Renderer.looksLikeEnglish(paren[2])) {
                return stripOuterQuotes(paren[1]);
            }

            const cleaned = stripOuterQuotes(text);
            return Renderer.looksLikeEnglish(cleaned) ? cleaned : "";
        },

        cleanSpeechText(value) {
            let text = String(value || "")
                .replace(/^>\s*/, "")
                .replace(/[*_`#]/g, "")
                .trim();
            if (/^["'“].+?["'”]\s*(?:—|–|--)\s*.+$/.test(text)) {
                const m = text.match(/^["'“](.+?)["'”]/);
                if (m && m[1]) {
                    text = m[1];
                }
            }
            text = text.replace(/^["'“](.+)["'”]$/, "$1");
            return text.replace(/\s+/g, " ").trim();
        },

        extractFirstExample(section) {
            if (Array.isArray(section?.items)) {
                for (const item of section.items) {
                    const cleaned = Renderer.cleanSpeechText(item);
                    if (cleaned) {
                        return cleaned;
                    }
                }
            }
            const pair = Array.isArray(section?.data?.pairs) ? section.data.pairs[0] : null;
            if (pair) {
                const fromPair = Renderer.cleanSpeechText(pair.sentenceA || pair.sentenceB || pair.text || "");
                if (fromPair) {
                    return fromPair;
                }
            }
            const text = String(section?.text || "");
            const quoted = text.match(/^>\s?(.+)$/m);
            if (quoted) {
                return Renderer.cleanSpeechText(quoted[1]);
            }
            const firstLine = text.split("\n").map((line) => line.trim()).find(Boolean);
            return firstLine ? Renderer.cleanSpeechText(firstLine) : "";
        },

        renderSenseMatrix(senses, prefix) {
            const items = Array.isArray(senses) ? senses : [];
            if (!items.length) {
                return "";
            }
            const cards = items.map((sense) => {
                const pos = sense.pos
                    ? `<span class="${prefix}-sense-pos">${Renderer.escapeHtml(sense.pos)}</span>`
                    : "";
                const gloss = sense.gloss
                    ? `<span class="${prefix}-sense-gloss">${Renderer.escapeHtml(sense.gloss)}</span>`
                    : "";
                const badge = sense.inContext
                    ? `<span class="${prefix}-sense-badge">Used in this context</span>`
                    : "";
                return `
                  <article class="${prefix}-sense-card${sense.inContext ? " is-context" : ""}">
                    <div class="${prefix}-sense-header">
                      <span class="${prefix}-sense-number">${Renderer.escapeHtml(String(sense.number || ""))}</span>
                      ${pos}
                      ${badge}
                    </div>
                    <p class="${prefix}-sense-definition">${Renderer.escapeHtml(sense.definition || "")}</p>
                    ${gloss}
                  </article>`;
            }).join("");
            return `<div class="${prefix}-sense-matrix">${cards}</div>`;
        },

        renderComparisonTable(data, prefix) {
            const rows = Array.isArray(data?.rows) ? data.rows : [];
            const terms = Array.isArray(data?.terms) ? data.terms : [];
            if (!rows.length) {
                return "";
            }
            const headerA = Renderer.escapeHtml(terms[0] || "Term A");
            const headerB = Renderer.escapeHtml(terms[1] || "Term B");
            const body = rows.map((row) => `
                <tr>
                  <th scope="row">${Renderer.escapeHtml(row.feature || "")}</th>
                  <td>${Renderer.escapeHtml(row.termA || "")}</td>
                  <td>${Renderer.escapeHtml(row.termB || "")}</td>
                </tr>`).join("");
            return `
              <div class="${prefix}-compare-table-wrap">
                <table class="${prefix}-compare-table">
                  <thead><tr><th>Feature</th><th>${headerA}</th><th>${headerB}</th></tr></thead>
                  <tbody>${body}</tbody>
                </table>
              </div>`;
        },

        renderMinimalPairs(pairs, prefix) {
            const items = Array.isArray(pairs) ? pairs : [];
            if (!items.length) {
                return "";
            }
            return `<div class="${prefix}-minimal-pairs">${items.map((pair) => {
                const listenA = Renderer.renderExampleListenButton(pair.sentenceA || "", prefix);
                const listenB = Renderer.renderExampleListenButton(pair.sentenceB || "", prefix);
                return `
                <article class="${prefix}-minimal-pair">
                  <div class="${prefix}-minimal-row">
                    <p class="${prefix}-minimal-a"><span class="${prefix}-minimal-text">${Renderer.escapeHtml(pair.sentenceA || "")}</span></p>
                    ${listenA}
                  </div>
                  <div class="${prefix}-minimal-row">
                    <p class="${prefix}-minimal-b"><span class="${prefix}-minimal-text">${Renderer.escapeHtml(pair.sentenceB || "")}</span></p>
                    ${listenB}
                  </div>
                  ${pair.explanation ? `<small class="${prefix}-inline-meta">${Renderer.escapeHtml(pair.explanation)}</small>` : ""}
                </article>`;
            }).join("")}</div>`;
        },

        renderRephraseBar(prefix, options = {}) {
            if (options.showRephrase === false) {
                return "";
            }
            return `
              <div class="${prefix}-rephrase-bar">
                <span class="${prefix}-rephrase-label">Rephrase</span>
                <button type="button" class="${prefix}-rephrase-btn" data-rephrase-mode="simplify">Simplify</button>
                <button type="button" class="${prefix}-rephrase-btn" data-rephrase-mode="formal">Make Formal</button>
                <button type="button" class="${prefix}-rephrase-btn" data-rephrase-mode="idiomatic">Native Idiom</button>
              </div>`;
        },

        renderSimpleMarkdown(source, prefix = "dictionary-helper", options = {}) {
            const lines = String(source || "").split("\n");
            const listenOnQuotes = options.listenOnQuotes === true;
            const listenOnListItems = options.listenOnListItems === true;
            let html = "";
            let inBlockquote = false;
            let listType = "";
            let quotePairIndex = 0;
            let listPairIndex = 0;

            const closeList = () => {
                if (listType) {
                    html += `</${listType}>`;
                    listType = "";
                }
                listPairIndex = 0;
            };

            const closeOpenBlocks = () => {
                if (inBlockquote) {
                    html += "</blockquote>";
                    inBlockquote = false;
                }
                quotePairIndex = 0;
                closeList();
            };

            for (const rawLine of lines) {
                const line = rawLine.trimEnd();
                const trimmed = line.trim();

                if (!trimmed) {
                    if (inBlockquote) {
                        html += "</blockquote>";
                        inBlockquote = false;
                    }
                    quotePairIndex = 0;
                    closeList();
                    continue;
                }

                if (/^(?:---|\*\*\*|___)\s*$/.test(trimmed)) {
                    closeOpenBlocks();
                    html += "<hr>";
                    continue;
                }

                const heading = trimmed.match(/^(#{1,6})\s+(.+)$/);
                if (heading) {
                    closeOpenBlocks();
                    const level = Math.min(6, heading[1].length);
                    html += `<h${level}>${Renderer.formatInlineMarkdown(heading[2])}</h${level}>`;
                    continue;
                }

                const unorderedItem = trimmed.match(/^(?:[*+-])\s+(.+)$/);
                const orderedItem = trimmed.match(/^\d+[.)]\s+(.+)$/);
                if (unorderedItem || orderedItem) {
                    if (inBlockquote) {
                        html += "</blockquote>";
                        inBlockquote = false;
                    }
                    const nextListType = unorderedItem ? "ul" : "ol";
                    if (listType !== nextListType) {
                        closeList();
                        html += `<${nextListType}>`;
                        listType = nextListType;
                    }
                    const itemText = (unorderedItem || orderedItem)[1];
                    const listenOnThisItem = listenOnListItems && Renderer.shouldListenOnPairedLine(itemText, listPairIndex);
                    const listenBtn = listenOnThisItem ? Renderer.renderExampleListenButton(itemText, prefix) : "";
                    if (listenOnListItems) {
                        listPairIndex = Renderer.isInlineBilingualExample(itemText) ? 0 : listPairIndex + 1;
                    }
                    html += listenBtn
                        ? `<li class="${prefix}-example-item"><div class="${prefix}-example-row"><span class="${prefix}-example-text">${Renderer.formatInlineMarkdown(itemText)}</span>${listenBtn}</div></li>`
                        : `<li>${Renderer.formatInlineMarkdown(itemText)}</li>`;
                    continue;
                }

                if (trimmed.startsWith(">")) {
                    closeList();
                    if (!inBlockquote) {
                        html += `<blockquote class="${prefix}-markdown-quote">`;
                        inBlockquote = true;
                        quotePairIndex = 0;
                    }
                    const quoteText = trimmed.replace(/^>\s?/, "");
                    const listenOnThisQuote = listenOnQuotes && Renderer.shouldListenOnPairedLine(quoteText, quotePairIndex);
                    const listenBtn = listenOnThisQuote ? Renderer.renderExampleListenButton(quoteText, prefix) : "";
                    if (listenOnQuotes) {
                        quotePairIndex = Renderer.isInlineBilingualExample(quoteText) ? 0 : quotePairIndex + 1;
                    }
                    html += listenBtn
                        ? `<p class="${prefix}-quote-row"><span class="${prefix}-quote-text">${Renderer.formatInlineMarkdown(quoteText)}</span>${listenBtn}</p>`
                        : `<p>${Renderer.formatInlineMarkdown(quoteText)}</p>`;
                    continue;
                }

                closeOpenBlocks();
                html += `<p>${Renderer.formatInlineMarkdown(trimmed)}</p>`;
            }

            if (inBlockquote) {
                html += "</blockquote>";
            }
            closeList();

            return html;
        },

        formatInlineMarkdown(text) {
            return Renderer.escapeHtml(text)
                .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
                .replace(/\*(.+?)\*/g, "<em>$1</em>")
                .replace(/`(.+?)`/g, "<code>$1</code>");
        },

        normalizeSectionKind(section) {
            const explicitKind = String(section?.kind || "").trim().toLowerCase();
            if (explicitKind) return explicitKind.replace(/[^a-z0-9_-]/g, "-");
            const title = String(section?.title || "").trim().toLowerCase();
            if (title === "context used") return "context";
            if (title.includes("contextual analysis")) return "contextual-analysis";
            if (title.includes("summary for learner") || title.includes("learner takeaway")) return "summary";
            if (title.includes("sentence breakdown") || title.includes("sentence overview")) return "sentence-structure";
            if (title.includes("grammar") || title.includes("grammatical role") || title.includes("sentence structure") || title.includes("nuance")) return "grammar";
            if (title.includes("phrase parsing") || title.includes("detected phrase")) return "phrase-parsing";
            if (title.includes("translation")) return "translation";
            if (title.includes("definition") || title.includes("meaning") || title.includes("explanation")) return "definitions";
            if (title.includes("example") || title.includes("paraphrase")) return "examples";
            if (title.includes("common structure")) return "structures";
            if (title.includes("memory aid")) return "memory";
            if (title.includes("etymology") || title.includes("deep understanding")) return "etymology";
            if (title.includes("related idiom") || title.includes("related expression")) return "phrase";
            if (/synonym|antonym|word family|collocation|related/.test(title)) return "lexical";
            if (/mistake|confusable|usage|register|tone|learner|pragmatic|compound|idiom/.test(title)) return "usage";
            if (title.includes("phrase")) return "phrase";
            return "general";
        },

        renderSection(section, options = {}) {
            const prefix = options.prefix || "dictionary-helper";
            const sectionTitleTag = options.sectionTitleTag || "h4";

            const kind = Renderer.normalizeSectionKind(section);
            const isExamples = kind === "examples";
            const items = (section.items || [])
                .map((item) => isExamples
                    ? Renderer.renderExampleItem(item, prefix)
                    : `<li class="${prefix}-section-list-item">${Renderer.formatInlineMarkdown(item)}</li>`)
                .join("");
            const hasTitle = Boolean(String(section.title || "").trim());
            const metaBadge = section.meta
                ? `<span class="${prefix}-section-meta">${Renderer.escapeHtml(section.meta)}</span>`
                : "";
            let sectionBody = "";
            if (section.data && kind === "sentence-overview") {
                sectionBody = Renderer.renderSentenceOverview(section.data, prefix);
            } else if (section.data && kind === "sentence-structure") {
                sectionBody = Renderer.renderSentenceStructure(section.data, prefix);
            } else if (section.data && kind === "phrase-parsing") {
                sectionBody = Renderer.renderPhraseParsing(section.data, prefix);
            } else if (section.data && kind === "senses") {
                sectionBody = Renderer.renderSenseMatrix(section.data.senses, prefix);
            } else if (section.data && kind === "compare-matrix") {
                sectionBody = Renderer.renderComparisonTable(section.data, prefix);
            } else if (section.data && Array.isArray(section.data.pairs)) {
                sectionBody = Renderer.renderMinimalPairs(section.data.pairs, prefix);
            } else if (kind === "context") {
                sectionBody = Renderer.renderTokenizedContext(section.text || "", options.title || options.query || "", prefix);
            } else if (section.markdown) {
                let mdText = section.text || "";
                if (kind === "context" && options.title) {
                    mdText = Renderer.highlightContextQuery(mdText, options.title);
                }
                sectionBody = `<div class="${prefix}-markdown">${Renderer.renderSimpleMarkdown(mdText, prefix, { listenOnQuotes: isExamples, listenOnListItems: isExamples })}</div>`;
            } else if (section.text) {
                const inlineMeta = (!hasTitle && section.meta)
                    ? ` <small class="${prefix}-inline-meta">${Renderer.escapeHtml(section.meta)}</small>`
                    : "";
                sectionBody = `<p class="${prefix}-section-paragraph">${Renderer.escapeHtml(section.text)}${inlineMeta}</p>`;
            } else if (section.meta && !hasTitle) {
                sectionBody = `<p class="${prefix}-section-paragraph"><small class="${prefix}-inline-meta">${Renderer.escapeHtml(section.meta)}</small></p>`;
            }

            const contentHtml = `${sectionBody}${items ? `<ul class="${prefix}-section-list">${items}</ul>` : ""}`;
            const actionsHtml = Renderer.renderSectionActions(section, kind, prefix);

            const collapsible = section.collapseByDefault === true || (typeof section.collapseByDefault === "undefined" && items.length === 0 && hasTitle);
            const sectionClasses = `${prefix}-section ${prefix}-section--${kind}${collapsible ? ` ${prefix}-section--collapsible` : ""}`;
            const sectionIndex = Number(options.index) || 0;

            return `
              <section class="${sectionClasses}" data-section-kind="${Renderer.escapeHtml(kind)}" data-section-index="${sectionIndex}" style="--section-index: ${sectionIndex};">
                ${hasTitle
                    ? `<header class="${prefix}-section-heading"><span class="${prefix}-section-title">${Renderer.escapeHtml(section.title)}</span>${metaBadge}${actionsHtml}</header>`
                    : ""}
                ${contentHtml}
              </section>`;
        },

        getAiSectionRank(intent, section, kind) {
            if (kind === "context") return 0;

            const ranks = {
                default: {
                    intro: 1, senses: 2, translation: 3, usage: 4, examples: 5, etymology: 6
                },
                explain_in_context: {
                    intro: 1, definitions: 2, substitutions: 3, nuance: 4, examples: 5
                },
                grammar: {
                    intro: 1, syntax: 2, grammar: 3, usage: 4, examples: 5
                },
                phrase_explorer: {
                    intro: 1, definitions: 2, grammar: 3, usage: 4, examples: 5
                },
                compare_confusables: {
                    intro: 1, "compare-distinction": 2, "compare-matrix": 3, collocations: 4, examples: 5
                },
                rephrase: {
                    "rephrase-simple": 1, "rephrase-formal": 2, "rephrase-idiomatic": 3
                },
                phrase_fallback: {
                    intro: 1, definitions: 2, usage: 3, examples: 4, phrase: 5
                }
            };

            const ranked = ranks[intent];
            if (!ranked || ranked[kind] == null) {
                return 100;
            }
            return ranked[kind];
        },

        pinContextFirst(sections) {
            const source = Array.isArray(sections) ? sections : [];
            const context = [];
            const rest = [];
            for (const section of source) {
                if (Renderer.normalizeSectionKind(section) === "context") {
                    context.push(section);
                } else {
                    rest.push(section);
                }
            }
            return context.concat(rest);
        },

        orderSectionsForPresentation(sections, presentation) {
            const source = Array.isArray(sections) ? sections : [];
            if (presentation?.surface !== "ai") {
                return source;
            }
            if (presentation.intent === "sentence_breakdown") {
                return Renderer.pinContextFirst(source);
            }

            const intent = String(presentation.intent || "default");
            const ranked = source.map((section, index) => ({
                section,
                index,
                kind: Renderer.normalizeSectionKind(section),
                rank: Renderer.getAiSectionRank(intent, section, Renderer.normalizeSectionKind(section))
            }));

            const hasUnknownRank = ranked.some((item) => item.kind !== "context" && item.rank === 100);
            if (hasUnknownRank) {
                const context = ranked.filter((item) => item.kind === "context").map((item) => item.section);
                const rest = ranked.filter((item) => item.kind !== "context").map((item) => item.section);
                return context.concat(rest);
            }

            return ranked
                .sort((left, right) => left.rank - right.rank || left.index - right.index)
                .map(({ section }) => section);
        },

        getAiPrimaryKinds(intent) {
            const kinds = {
                default: ["intro", "senses", "translation", "usage", "examples"],
                explain_in_context: ["intro", "definitions", "substitutions", "nuance", "examples"],
                grammar: ["syntax", "grammar", "usage", "examples"],
                phrase_explorer: ["definitions", "grammar", "usage", "examples"],
                phrase_fallback: ["definitions", "usage", "examples", "phrase"],
                sentence_breakdown: ["sentence-overview", "translation", "sentence-structure", "phrase-parsing", "usage"],
                compare_confusables: ["compare-distinction", "compare-matrix", "collocations", "examples"],
                rephrase: ["rephrase-simple", "rephrase-formal", "rephrase-idiomatic"]
            };
            return kinds[intent] || kinds.default;
        },

        getAiDeepDiveKinds(intent) {
            const kinds = {
                default: ["etymology"],
                explain_in_context: [],
                grammar: [],
                phrase_explorer: [],
                phrase_fallback: [],
                sentence_breakdown: [],
                compare_confusables: [],
                rephrase: []
            };
            return kinds[intent] || [];
        },

        isAlwaysOpenAiKind(kind) {
            return ["context", "intro", "senses", "sentence-overview", "sentence-structure", "phrase-parsing", "compare-distinction", "compare-matrix", "rephrase-simple", "rephrase-formal", "rephrase-idiomatic"].includes(kind);
        },

        isPrimaryExpandedSection(kind, title, index, intent) {
            if (Renderer.isAlwaysOpenAiKind(kind)) {
                return true;
            }
            if (index === 0) {
                return true;
            }
            if (!String(title || "").trim()) {
                return true;
            }
            if (intent) {
                return Renderer.getAiPrimaryKinds(intent).includes(kind);
            }
            return ["definitions", "translation", "examples", "grammar", "collocations", "sentence-structure", "phrase-parsing"].includes(kind);
        },

        isDeepDiveSection(kind, title, intent) {
            if (Renderer.isAlwaysOpenAiKind(kind)) {
                return false;
            }
            if (intent) {
                return Renderer.getAiDeepDiveKinds(intent).includes(kind);
            }
            const normalizedTitle = String(title || "").trim().toLowerCase();
            if (!normalizedTitle) {
                return false;
            }
            if (["lexical", "structures", "memory", "etymology"].includes(kind)) {
                return true;
            }
            return /word family|collocation|common structure|learner error|confusable|etymology|deep understanding|pragmatic|memory aid|compound|idiom analysis|synonym|antonym/.test(normalizedTitle);
        },

        shouldCollapseSection(section, kind, index, totalSections, intent) {
            const title = String(section?.title || "").trim();
            if (!title || Renderer.isAlwaysOpenAiKind(kind)) {
                return false;
            }

            if (totalSections < 4) {
                return false;
            }

            if (Renderer.isPrimaryExpandedSection(kind, title, index, intent)) {
                return false;
            }

            if (Renderer.isDeepDiveSection(kind, title, intent)) {
                return true;
            }

            return index >= 3 && !Renderer.getAiPrimaryKinds(intent).includes(kind);
        },

        renderPronunciation(pronunciation, prefix) {
            if (!pronunciation?.text) {
                return "";
            }

            const phoneticText = String(pronunciation.phonetic || "").trim();
            const accent = pronunciation.language === "en-GB"
                ? "UK"
                : pronunciation.language === "en-US"
                    ? "US"
                    : "";
            const phoneticLabel = phoneticText
                ? (accent ? `${phoneticText} (${accent})` : phoneticText)
                : "";
            const phonetic = phoneticLabel
                ? `<span class="${prefix}-phonetic">${Renderer.escapeHtml(phoneticLabel)}</span>`
                : "";
            const audioUrl = pronunciation.audioUrl ? Renderer.escapeHtml(pronunciation.audioUrl) : "";
            const language = pronunciation.language ? Renderer.escapeHtml(pronunciation.language) : "";
            const rate = pronunciation.rate || 0.95;
            const voiceURI = pronunciation.voiceURI ? Renderer.escapeHtml(pronunciation.voiceURI) : "";
            const baseLabel = pronunciation.label || (pronunciation.audioUrl ? "Listen" : "Speak");
            const label = accent && !/\((?:US|UK)\)/i.test(baseLabel)
                ? `${baseLabel} (${accent})`
                : baseLabel;
            const ariaLabel = phoneticLabel
                ? `Play pronunciation ${phoneticLabel}`
                : accent
                    ? `Play ${accent} pronunciation`
                    : "Play pronunciation";

            return `
              <div class="${prefix}-pronunciation">
                ${phonetic}
                <button
                  class="${prefix}-pronounce"
                  type="button"
                  data-pronounce-text="${Renderer.escapeHtml(pronunciation.text)}"
                  data-pronounce-audio="${audioUrl}"
                  data-pronounce-language="${language}"
                  data-pronounce-rate="${Renderer.escapeHtml(rate)}"
                  data-pronounce-voice="${voiceURI}"
                  aria-label="${Renderer.escapeHtml(ariaLabel)}"
                  aria-pressed="false"
                >
                  <span class="${prefix}-soundwave" aria-hidden="true">
                    <span class="${prefix}-soundwave-bar"></span>
                    <span class="${prefix}-soundwave-bar"></span>
                    <span class="${prefix}-soundwave-bar"></span>
                  </span>
                  <span class="${prefix}-pronounce-label">${Renderer.escapeHtml(label)}</span>
                </button>
              </div>
            `;
        },

        renderSkeleton(prefix = "dictionary-helper") {
            return `
              <div class="${prefix}-skeleton-wrap" aria-hidden="true">
                <div class="${prefix}-skeleton-header">
                  <div class="${prefix}-skeleton-line ${prefix}-skeleton-title"></div>
                  <div class="${prefix}-skeleton-badges">
                    <div class="${prefix}-skeleton-pill"></div>
                    <div class="${prefix}-skeleton-pill"></div>
                  </div>
                </div>
                <div class="${prefix}-skeleton-card">
                  <div class="${prefix}-skeleton-line ${prefix}-skeleton-kicker"></div>
                  <div class="${prefix}-skeleton-line ${prefix}-skeleton-text"></div>
                  <div class="${prefix}-skeleton-line ${prefix}-skeleton-text ${prefix}-skeleton-short"></div>
                </div>
                <div class="${prefix}-skeleton-card">
                  <div class="${prefix}-skeleton-line ${prefix}-skeleton-kicker"></div>
                  <div class="${prefix}-skeleton-line ${prefix}-skeleton-text"></div>
                  <div class="${prefix}-skeleton-line ${prefix}-skeleton-text ${prefix}-skeleton-medium"></div>
                </div>
              </div>
            `;
        },

        renderSpeechPractice(result, prefix) {
            const primary = result?.pronunciation || (Array.isArray(result?.pronunciations) ? result.pronunciations[0] : null);
            const text = String(primary?.text || result?.title || "").trim();
            if (!text) {
                return "";
            }

            const language = Renderer.escapeHtml(primary?.language || "en-US");
            const speechText = Renderer.escapeHtml(text);
            const supportsPractice = typeof window !== "undefined"
                && Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
            if (!supportsPractice) {
                return `<span class="${prefix}-speech-eval-unavailable">Practice needs Chrome speech recognition.</span>`;
            }

            return `
              <button
                class="${prefix}-speech-eval"
                type="button"
                data-eval-speech-text="${speechText}"
                data-eval-speech-lang="${language}"
                aria-label="Practice saying ${speechText}"
                aria-pressed="false"
              >
                <span class="${prefix}-speech-icon" aria-hidden="true">◉</span>
                <span data-eval-label>Practice</span>
              </button>
              <span class="${prefix}-speech-eval-result" data-speech-eval-result hidden aria-live="polite"></span>
            `;
        },

        renderResult(result, options = {}) {
            const prefix = options.prefix || "dictionary-helper";
            const titleTag = options.titleTag || "h3";
            const sectionTitleTag = options.sectionTitleTag || "h4";
            const isToolbar = false;

            const pronunciation = Renderer.renderPronunciation({
                ...result.pronunciation,
                rate: options.pronunciationRate,
                voiceURI: options.pronunciationVoiceURI
            }, prefix);
            const pronunciationVariants = (result.pronunciations || []).slice(1).map((item) => Renderer.renderPronunciation({
                ...item,
                rate: options.pronunciationRate,
                voiceURI: options.pronunciationVoiceURI
            }, prefix)).join("");
            const speechPractice = Renderer.renderSpeechPractice(result, prefix);
            const isAiResult = result.presentation?.surface === "ai";
            const aiIntent = isAiResult ? String(result.presentation?.intent || "default") : "";
            const rawSections = Renderer.orderSectionsForPresentation(result.sections, result.presentation);
            const totalSections = rawSections.length;
            const sections = rawSections.map((section, index) => {
                const kind = Renderer.normalizeSectionKind(section);
                const isExamples = kind === "examples";
                const items = (section.items || [])
                    .map((item) => isExamples
                        ? Renderer.renderExampleItem(item, prefix)
                        : `<li class="${prefix}-section-list-item">${Renderer.formatInlineMarkdown(item)}</li>`)
                    .join("");
                const hasTitle = Boolean(String(section.title || "").trim());
                const metaBadge = section.meta
                    ? `<span class="${prefix}-section-meta">${Renderer.escapeHtml(section.meta)}</span>`
                    : "";
                let sectionBody = "";
                if (section.data && kind === "sentence-overview") {
                    sectionBody = Renderer.renderSentenceOverview(section.data, prefix);
                } else if (section.data && kind === "sentence-structure") {
                    sectionBody = Renderer.renderSentenceStructure(section.data, prefix);
                } else if (section.data && kind === "phrase-parsing") {
                    sectionBody = Renderer.renderPhraseParsing(section.data, prefix);
                } else if (section.data && kind === "senses") {
                    sectionBody = Renderer.renderSenseMatrix(section.data.senses, prefix);
                } else if (section.data && kind === "compare-matrix") {
                    sectionBody = Renderer.renderComparisonTable(section.data, prefix);
                } else if (section.data && Array.isArray(section.data.pairs)) {
                    sectionBody = Renderer.renderMinimalPairs(section.data.pairs, prefix);
                } else if (kind === "context") {
                    sectionBody = Renderer.renderTokenizedContext(section.text || "", result?.title || options.query || "", prefix);
                } else if (section.markdown) {
                    let mdText = section.text || "";
                    if (kind === "context" && result?.title) {
                        mdText = Renderer.highlightContextQuery(mdText, result.title);
                    }
                    sectionBody = `<div class="${prefix}-markdown">${Renderer.renderSimpleMarkdown(mdText, prefix, { listenOnQuotes: isExamples, listenOnListItems: isExamples })}</div>`;
                } else if (section.text) {
                    const inlineMeta = (!hasTitle && section.meta)
                        ? ` <small class="${prefix}-inline-meta">${Renderer.escapeHtml(section.meta)}</small>`
                        : "";
                    sectionBody = `<p class="${prefix}-section-paragraph">${Renderer.escapeHtml(section.text)}${inlineMeta}</p>`;
                } else if (section.meta && !hasTitle) {
                    sectionBody = `<p class="${prefix}-section-paragraph"><small class="${prefix}-inline-meta">${Renderer.escapeHtml(section.meta)}</small></p>`;
                }

                const contentHtml = `${sectionBody}${items ? `<ul class="${prefix}-section-list">${items}</ul>` : ""}`;
                const actionsHtml = Renderer.renderSectionActions(section, kind, prefix);
                const collapsible = Renderer.shouldCollapseSection(section, kind, index, totalSections, aiIntent);
                const sectionClasses = `${prefix}-section ${prefix}-section--${kind}${collapsible ? ` ${prefix}-section--collapsible` : ""}`;

                if (collapsible) {
                    const sectionLabel = `<${sectionTitleTag} class="${prefix}-section-title">${Renderer.escapeHtml(section.title)}</${sectionTitleTag}>${metaBadge}${actionsHtml}`;
                    return `
              <details class="${sectionClasses}" data-section-kind="${Renderer.escapeHtml(kind)}" data-section-index="${index}" style="--section-index: ${index};">
                <summary class="${prefix}-section-summary">${sectionLabel}</summary>
                <div class="${prefix}-section-body">
                  ${contentHtml}
                </div>
              </details>`;
                }

                const sectionLabel = hasTitle
                    ? `<div class="${prefix}-section-heading"><${sectionTitleTag} class="${prefix}-section-title">${Renderer.escapeHtml(section.title)}</${sectionTitleTag}>${metaBadge}${actionsHtml}</div>`
                    : "";

                return `
              <section class="${sectionClasses}" data-section-kind="${Renderer.escapeHtml(kind)}" data-section-index="${index}" style="--section-index: ${index};">
                ${sectionLabel}
                ${contentHtml}
              </section>`;
            }).join("");

            const meta = result.subtitle ? `<div class="${prefix}-meta">${Renderer.escapeHtml(result.subtitle)}</div>` : "";
            const stateEl = isToolbar ? "p" : "div";
            const rootEl = isToolbar ? "article" : "div";
            const lexicalProfileHtml = Renderer.renderLexicalProfile(result.lexicalProfile, prefix, sectionTitleTag);
            const titleRow = result.title
                ? `<div class="${prefix}-title-row"><div class="${prefix}-title-cell"><${titleTag} class="${prefix}-term">${Renderer.escapeHtml(result.title)}</${titleTag}><div class="${prefix}-pronunciation-group">${pronunciation}${pronunciationVariants}${speechPractice}</div></div>${meta}</div>`
                : "";
            const emptyState = `<${stateEl} class="${prefix}-state"><strong>No result</strong><span>Try another word or switch sources.</span></${stateEl}>`;
            const rephraseBarHtml = isAiResult && (aiIntent === "default" || aiIntent === "explain_in_context" || aiIntent === "rephrase")
                ? Renderer.renderRephraseBar(prefix, options)
                : "";
            const resultBody = isAiResult
                ? `${rephraseBarHtml}${sections || emptyState}${lexicalProfileHtml}`
                : `${lexicalProfileHtml}${sections || emptyState}`;

            return `
            <${rootEl} class="${prefix}-result">
              ${titleRow}
              ${resultBody}
            </${rootEl}>
          `;
        },

        
        renderLexicalProfile(profile, prefix, sectionTitleTag = "h4") {
            if (!profile) return "";
            const { wordFamily, usageWarnings, confusablePairs, learnerMistakes, wordFormation, collocations } = profile;

            let familyHtml = "";
            if (wordFamily) {
                const categories = [
                    { label: "Noun", items: wordFamily.noun },
                    { label: "Verb", items: wordFamily.verb },
                    { label: "Adjective", items: wordFamily.adjective },
                    { label: "Adverb", items: wordFamily.adverb },
                    { label: "Inflections", items: wordFamily.inflections },
                    { label: "Derivatives", items: wordFamily.derivatives }
                ];
                const rows = categories
                    .filter((cat) => Array.isArray(cat.items) && cat.items.length)
                    .map((cat) => {
                        const chips = cat.items
                            .map((item) => `<button type="button" class="${prefix}-family-chip" data-lookup-query="${Renderer.escapeHtml(item)}">${Renderer.escapeHtml(item)}</button>`)
                            .join(" ");
                        return `<div class="${prefix}-word-family-row"><span class="${prefix}-word-family-label">${Renderer.escapeHtml(cat.label)}</span> <div class="${prefix}-word-family-chips">${chips}</div></div>`;
                    })
                    .join("");
                if (rows) {
                    familyHtml = `<div class="${prefix}-word-family-grid"><${sectionTitleTag} class="${prefix}-section-title">Word Family</${sectionTitleTag}>${rows}</div>`;
                }
            }

            let warningsHtml = "";
            const hasWarnings = Array.isArray(usageWarnings) && usageWarnings.length;
            const hasConfusables = Array.isArray(confusablePairs) && confusablePairs.length;

            if (hasWarnings || hasConfusables) {
                const warningItems = (usageWarnings || [])
                    .map((w) => `<li class="${prefix}-warning-item">${Renderer.escapeHtml(w)}</li>`)
                    .join("");
                const confusableItems = (confusablePairs || [])
                    .map((pair) => `<li class="${prefix}-confusable-item"><strong>Confused with <em>${Renderer.escapeHtml(pair.word)}</em>:</strong> ${Renderer.formatInlineMarkdown(pair.distinction)}</li>`)
                    .join("");
                warningsHtml = `
                    <div class="${prefix}-warning-callout">
                        <${sectionTitleTag} class="${prefix}-section-title">Usage &amp; Register Notes</${sectionTitleTag}>
                        <ul>${warningItems}${confusableItems}</ul>
                    </div>
                `;
            }

            let formationHtml = "";
            if (wordFormation) {
                const prefixes = Array.isArray(wordFormation.prefixes) ? wordFormation.prefixes : [];
                const suffixes = Array.isArray(wordFormation.suffixes) ? wordFormation.suffixes : [];
                const explanation = String(wordFormation.explanation || "").trim();
                const tagItems = (list, cls) => (list || []).map((item) => `<span class="${prefix}-formation-tag ${cls}">${Renderer.escapeHtml(item)}</span>`).join("");
                const tagsHtml = `<div class="${prefix}-formation-tags">${tagItems(prefixes, `${prefix}-formation-prefix`)}${tagItems(suffixes, `${prefix}-formation-suffix`)}</div>`;
                const explanationHtml = explanation ? `<p class="${prefix}-formation-explanation">${Renderer.renderSimpleMarkdown(explanation, prefix)}</p>` : "";
                if (prefixes.length || suffixes.length || explanation) {
                    formationHtml = `<div class="${prefix}-word-formation"><${sectionTitleTag} class="${prefix}-section-title">Word Formation</${sectionTitleTag}>${tagsHtml}${explanationHtml}</div>`;
                }
            }

            let mistakesHtml = "";
            if (Array.isArray(learnerMistakes) && learnerMistakes.length) {
                const mistakeItems = learnerMistakes.map((item) => {
                    const mistakeListen = item.example ? Renderer.renderExampleListenButton(item.example, prefix) : "";
                    const example = item.example
                        ? `<blockquote class="${prefix}-mistake-example"><p class="${prefix}-quote-row"><span class="${prefix}-quote-text">${Renderer.formatInlineMarkdown(item.example)}</span>${mistakeListen}</p></blockquote>`
                        : "";
                    return `<div class="${prefix}-mistake-item"><div class="${prefix}-mistake-original"><strong>Mistake:</strong> ${Renderer.formatInlineMarkdown(item.mistake)}</div><div class="${prefix}-mistake-correction"><strong>Correction:</strong> ${Renderer.formatInlineMarkdown(item.correction)}</div>${example}</div>`;
                }).join("");
                mistakesHtml = `<div class="${prefix}-learner-mistakes"><${sectionTitleTag} class="${prefix}-section-title">Common Learner Mistakes</${sectionTitleTag}>${mistakeItems}</div>`;
            }

            let collocationsHtml = "";
            if (collocations) {
                const groups = [
                    { label: "Common Verbs", key: "verbs" },
                    { label: "Common Nouns", key: "nouns" },
                    { label: "Prepositions", key: "prepositions" },
                    { label: "Typical Adjectives", key: "adjectives" },
                    { label: "Natural Patterns", key: "patterns" }
                ];
                const groupRows = groups.filter((group) => Array.isArray(collocations[group.key]) && collocations[group.key].length).map((group) => {
                    const chips = collocations[group.key].map((item) => `<span class="${prefix}-collocation-chip">${Renderer.escapeHtml(item)}</span>`).join("");
                    return `<div class="${prefix}-collocation-group"><span class="${prefix}-collocation-label">${Renderer.escapeHtml(group.label)}</span><div class="${prefix}-collocation-tags">${chips}</div></div>`;
                }).join("");
                if (groupRows) {
                    collocationsHtml = `<div class="${prefix}-collocations-block"><${sectionTitleTag} class="${prefix}-section-title">Collocations</${sectionTitleTag}>${groupRows}</div>`;
                }
            }

            if (!familyHtml && !warningsHtml && !formationHtml && !mistakesHtml && !collocationsHtml) return "";

            return `
                <div class="${prefix}-lexical-profile">
                    ${familyHtml}
                    ${warningsHtml}
                    ${formationHtml}
                    ${mistakesHtml}
                    ${collocationsHtml}
                </div>
            `;
        },

        renderSentenceOverview(data, prefix) {
            const rawSentence = String(data.sentence || "");
            const query = String(data.query || "").trim();
            const phrases = Array.isArray(data.phrases) ? data.phrases : [];
            const lowerSentence = rawSentence.toLowerCase();

            const ranges = [];
            const pushRange = (start, end, type, phraseType = "") => {
                if (start < 0 || end <= start) {
                    return;
                }
                ranges.push({ start, end, type, phraseType });
            };

            if (query) {
                const lowerQuery = query.toLowerCase();
                let from = 0;
                while (from < lowerSentence.length) {
                    const index = lowerSentence.indexOf(lowerQuery, from);
                    if (index === -1) {
                        break;
                    }
                    pushRange(index, index + query.length, "query");
                    from = index + query.length;
                }
            }

            phrases.forEach((phrase) => {
                const text = String(phrase?.text || "").trim();
                if (!text || text.toLowerCase() === query.toLowerCase()) {
                    return;
                }
                const lowerPhrase = text.toLowerCase();
                let from = 0;
                while (from < lowerSentence.length) {
                    const index = lowerSentence.indexOf(lowerPhrase, from);
                    if (index === -1) {
                        break;
                    }
                    pushRange(index, index + text.length, "phrase", phrase.type || "");
                    from = index + text.length;
                }
            });

            ranges.sort((a, b) => a.start - b.start || b.end - a.end);
            const selected = [];
            let cursor = 0;
            for (const range of ranges) {
                if (range.start < cursor) {
                    continue;
                }
                selected.push(range);
                cursor = range.end;
            }

            let html = "";
            let index = 0;
            for (const range of selected) {
                html += Renderer.escapeHtml(rawSentence.slice(index, range.start));
                const chunk = Renderer.escapeHtml(rawSentence.slice(range.start, range.end));
                if (range.type === "query") {
                    html += `<mark class="${prefix}-sentence-query">${chunk}</mark>`;
                } else {
                    html += `<span class="${prefix}-sentence-phrase" data-phrase-type="${Renderer.escapeHtml(range.phraseType)}">${chunk}</span>`;
                }
                index = range.end;
            }
            html += Renderer.escapeHtml(rawSentence.slice(index));

            return `<blockquote class="${prefix}-sentence-box"><p>${html}</p></blockquote>`;
        },

        renderSentenceStructure(data, prefix) {
            const parts = Array.isArray(data?.parts) ? data.parts : [];
            if (!parts.length) {
                return `<p><small>No structural breakdown available.</small></p>`;
            }

            const rows = parts.map((part) => {
                const role = String(part.role || "part").toLowerCase().replace(/\s+/g, "-");
                return `
                  <div class="${prefix}-structure-row">
                    <span class="${prefix}-structure-text">${Renderer.escapeHtml(part.text)}</span>
                    <span class="${prefix}-structure-role ${prefix}-role--${Renderer.escapeHtml(role)}">${Renderer.escapeHtml(part.role)}</span>
                    <span class="${prefix}-structure-explanation">${Renderer.escapeHtml(part.explanation)}</span>
                  </div>
                `;
            }).join("");

            return `<div class="${prefix}-structure-grid">${rows}</div>`;
        },

        renderPhraseParsing(data, prefix) {
            const phrases = Array.isArray(data?.phrases) ? data.phrases : [];
            if (!phrases.length) {
                return `<p><small>No idioms, phrasal verbs, or collocations detected in this sentence.</small></p>`;
            }

            const cards = phrases.map((phrase) => {
                const typeLabel = String(phrase.type || "phrase").replace(/_/g, " ");

                const phraseListen = phrase.example ? Renderer.renderExampleListenButton(phrase.example, prefix) : "";
                const exampleHtml = phrase.example
                    ? `<blockquote class="${prefix}-phrase-example"><p class="${prefix}-quote-row"><span class="${prefix}-quote-text">${Renderer.escapeHtml(phrase.example)}</span>${phraseListen}</p></blockquote>`
                    : "";

                return `
                  <article class="${prefix}-phrase-card" data-phrase-type="${Renderer.escapeHtml(phrase.type)}">
                    <div class="${prefix}-phrase-header">
                      <strong class="${prefix}-phrase-title">${Renderer.escapeHtml(phrase.text)}</strong>
                      <div class="${prefix}-phrase-badges">
                        <span class="${prefix}-phrase-type-badge">${Renderer.escapeHtml(typeLabel)}</span>
                      </div>
                    </div>
                    <p class="${prefix}-phrase-meaning">${Renderer.escapeHtml(phrase.meaning)}</p>
                    ${phrase.role ? `<div class="${prefix}-phrase-role"><small>Role:</small> ${Renderer.escapeHtml(phrase.role)}</div>` : ""}
                    ${exampleHtml}
                    <div class="${prefix}-phrase-actions">
                      <button type="button" class="${prefix}-phrase-lookup-btn" data-lookup-query="${Renderer.escapeHtml(phrase.text)}" aria-label="Look up phrase ${Renderer.escapeHtml(phrase.text)}">Look up phrase</button>
                    </div>
                  </article>
                `;
            }).join("");

            return `<div class="${prefix}-phrase-cards">${cards}</div>`;
        },


    };

    global.DictionaryHelperRenderer = Renderer;
})(typeof window !== "undefined" ? window : globalThis);
