/**
 * AI-specific presentation utilities and component renderers.
 */
(function (global) {
    "use strict";

    const base = () => global.DictionaryHelperRendererBase;

    const RendererAi = {
        renderSenseMatrix(senses, prefix) {
            const items = Array.isArray(senses) ? senses : [];
            if (!items.length) {
                return "";
            }
            const escapeHtml = base().escapeHtml;
            const cards = items.map((sense) => {
                const pos = sense.pos
                    ? `<span class="${prefix}-sense-pos">${escapeHtml(sense.pos)}</span>`
                    : "";
                const gloss = sense.gloss
                    ? `<span class="${prefix}-sense-gloss">${escapeHtml(sense.gloss)}</span>`
                    : "";
                const badge = sense.inContext
                    ? `<span class="${prefix}-sense-badge">Used in this context</span>`
                    : "";
                return `
                  <article class="${prefix}-sense-card${sense.inContext ? " is-context" : ""}">
                    <div class="${prefix}-sense-header">
                      <span class="${prefix}-sense-number">${escapeHtml(String(sense.number || ""))}</span>
                      ${pos}
                      ${badge}
                    </div>
                    <p class="${prefix}-sense-definition">${escapeHtml(sense.definition || "")}</p>
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
            const escapeHtml = base().escapeHtml;
            const headerA = escapeHtml(terms[0] || "Term A");
            const headerB = escapeHtml(terms[1] || "Term B");
            const body = rows.map((row) => `
                <tr>
                  <th scope="row">${escapeHtml(row.feature || "")}</th>
                  <td>${escapeHtml(row.termA || "")}</td>
                  <td>${escapeHtml(row.termB || "")}</td>
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
            const escapeHtml = base().escapeHtml;
            const renderExampleListenButton = base().renderExampleListenButton;
            return `<div class="${prefix}-minimal-pairs">${items.map((pair) => {
                const listenA = renderExampleListenButton(pair.sentenceA || "", prefix);
                const listenB = renderExampleListenButton(pair.sentenceB || "", prefix);
                return `
                <article class="${prefix}-minimal-pair">
                  <div class="${prefix}-minimal-row">
                    <p class="${prefix}-minimal-a"><span class="${prefix}-minimal-text">${escapeHtml(pair.sentenceA || "")}</span></p>
                    ${listenA}
                  </div>
                  <div class="${prefix}-minimal-row">
                    <p class="${prefix}-minimal-b"><span class="${prefix}-minimal-text">${escapeHtml(pair.sentenceB || "")}</span></p>
                    ${listenB}
                  </div>
                  ${pair.explanation ? `<small class="${prefix}-inline-meta">${escapeHtml(pair.explanation)}</small>` : ""}
                </article>`;
            }).join("")}</div>`;
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
                if (base().normalizeSectionKind(section) === "context") {
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
                return RendererAi.pinContextFirst(source);
            }

            const intent = String(presentation.intent || "default");
            const ranked = source.map((section, index) => ({
                section,
                index,
                kind: base().normalizeSectionKind(section),
                rank: RendererAi.getAiSectionRank(intent, section, base().normalizeSectionKind(section))
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
            if (RendererAi.isAlwaysOpenAiKind(kind)) {
                return true;
            }
            if (index === 0) {
                return true;
            }
            if (!String(title || "").trim()) {
                return true;
            }
            if (intent) {
                return RendererAi.getAiPrimaryKinds(intent).includes(kind);
            }
            return ["definitions", "translation", "examples", "grammar", "collocations", "sentence-structure", "phrase-parsing"].includes(kind);
        },

        isDeepDiveSection(kind, title, intent) {
            if (RendererAi.isAlwaysOpenAiKind(kind)) {
                return false;
            }
            if (intent) {
                return RendererAi.getAiDeepDiveKinds(intent).includes(kind);
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
            if (!title || RendererAi.isAlwaysOpenAiKind(kind)) {
                return false;
            }

            if (totalSections < 4) {
                return false;
            }

            if (RendererAi.isPrimaryExpandedSection(kind, title, index, intent)) {
                return false;
            }

            if (RendererAi.isDeepDiveSection(kind, title, intent)) {
                return true;
            }

            return index >= 3 && !RendererAi.getAiPrimaryKinds(intent).includes(kind);
        },

        renderSentenceOverview(data, prefix) {
            const rawSentence = String(data.sentence || "");
            const query = String(data.query || "").trim();
            const phrases = Array.isArray(data.phrases) ? data.phrases : [];
            const lowerSentence = rawSentence.toLowerCase();
            const escapeHtml = base().escapeHtml;

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
                html += escapeHtml(rawSentence.slice(index, range.start));
                const chunk = escapeHtml(rawSentence.slice(range.start, range.end));
                if (range.type === "query") {
                    html += `<mark class="${prefix}-sentence-query">${chunk}</mark>`;
                } else {
                    html += `<span class="${prefix}-sentence-phrase" data-phrase-type="${escapeHtml(range.phraseType)}">${chunk}</span>`;
                }
                index = range.end;
            }
            html += escapeHtml(rawSentence.slice(index));

            return `<blockquote class="${prefix}-sentence-box"><p>${html}</p></blockquote>`;
        },

        renderSentenceStructure(data, prefix) {
            const parts = Array.isArray(data?.parts) ? data.parts : [];
            if (!parts.length) {
                return `<p><small>No structural breakdown available.</small></p>`;
            }
            const escapeHtml = base().escapeHtml;

            const rows = parts.map((part) => {
                const role = String(part.role || "part").toLowerCase().replace(/\s+/g, "-");
                return `
                  <div class="${prefix}-structure-row">
                    <span class="${prefix}-structure-text">${escapeHtml(part.text)}</span>
                    <span class="${prefix}-structure-role ${prefix}-role--${escapeHtml(role)}">${escapeHtml(part.role)}</span>
                    <span class="${prefix}-structure-explanation">${escapeHtml(part.explanation)}</span>
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
            const escapeHtml = base().escapeHtml;
            const renderExampleListenButton = base().renderExampleListenButton;

            const cards = phrases.map((phrase) => {
                const typeLabel = String(phrase.type || "phrase").replace(/_/g, " ");

                const phraseListen = phrase.example ? renderExampleListenButton(phrase.example, prefix) : "";
                const exampleHtml = phrase.example
                    ? `<blockquote class="${prefix}-phrase-example"><p class="${prefix}-quote-row"><span class="${prefix}-quote-text">${escapeHtml(phrase.example)}</span>${phraseListen}</p></blockquote>`
                    : "";

                return `
                  <article class="${prefix}-phrase-card" data-phrase-type="${escapeHtml(phrase.type)}">
                    <div class="${prefix}-phrase-header">
                      <strong class="${prefix}-phrase-title">${escapeHtml(phrase.text)}</strong>
                      <div class="${prefix}-phrase-badges">
                        <span class="${prefix}-phrase-type-badge">${escapeHtml(typeLabel)}</span>
                      </div>
                    </div>
                    <p class="${prefix}-phrase-meaning">${escapeHtml(phrase.meaning)}</p>
                    ${phrase.role ? `<div class="${prefix}-phrase-role"><small>Role:</small> ${escapeHtml(phrase.role)}</div>` : ""}
                    ${exampleHtml}
                    <div class="${prefix}-phrase-actions">
                      <button type="button" class="${prefix}-phrase-lookup-btn" data-lookup-query="${escapeHtml(phrase.text)}" aria-label="Look up phrase ${escapeHtml(phrase.text)}">Look up phrase</button>
                    </div>
                  </article>
                `;
            }).join("");

            return `<div class="${prefix}-phrase-cards">${cards}</div>`;
        }
    };

    global.DictionaryHelperRendererAi = RendererAi;
})(typeof window !== "undefined" ? window : globalThis);
