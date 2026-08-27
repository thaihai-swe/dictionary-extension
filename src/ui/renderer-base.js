/**
 * Base rendering utilities: HTML escaping, Markdown parsing, and Common DOM builders.
 */
(function (global) {
    "use strict";

    const RendererBase = {
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
            return tab === "ai" ? "✨ AI Assistant" : "📖 Dictionary";
        },

        formatSectionTitle(title, kind) {
            const raw = String(title || "").trim();
            if (!raw) return "";
            if (/^\p{Extended_Pictographic}/u.test(raw)) {
                return raw;
            }
            const lower = raw.toLowerCase();
            if (lower.startsWith("definition") || kind === "definitions" || kind === "senses") return `📖 ${raw}`;
            if (lower.startsWith("translation") || kind === "translation") return `🌐 ${raw}`;
            if (lower.startsWith("example") || kind === "examples") return `💬 ${raw}`;
            if (lower.startsWith("grammar") || lower.startsWith("syntax") || kind === "grammar" || kind === "sentence-structure") return `📐 ${raw}`;
            if (lower.startsWith("phrase") || lower.startsWith("idiom") || kind === "phrase-parsing") return `💡 ${raw}`;
            if (lower.startsWith("collocation") || kind === "collocations") return `🔗 ${raw}`;
            if (lower.startsWith("synonym") || lower.startsWith("antonym")) return `🔄 ${raw}`;
            if (lower.startsWith("etymology") || lower.startsWith("origin") || kind === "etymology") return `📜 ${raw}`;
            if (lower.startsWith("context") || kind === "context") return `🎯 ${raw}`;
            if (lower.startsWith("sentence") || kind === "sentence-overview") return `🧩 ${raw}`;
            if (lower.startsWith("compare") || kind === "compare-matrix" || kind === "compare-distinction") return `⚖️ ${raw}`;
            if (lower.startsWith("rephrase") || (kind && kind.startsWith("rephrase"))) return `✨ ${raw}`;
            if (lower.startsWith("usage") || lower.startsWith("nuance") || kind === "usage" || kind === "nuance") return `💡 ${raw}`;
            if (lower.startsWith("word family")) return `🌳 ${raw}`;
            if (lower.startsWith("common learner mistake") || lower.startsWith("warning")) return `⚠️ ${raw}`;
            if (lower.startsWith("word formation")) return `🧬 ${raw}`;
            return raw;
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
                    return RendererBase.escapeHtml(token);
                }
                const cleaned = token.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
                if (!cleaned) {
                    return RendererBase.escapeHtml(token);
                }
                const isQuery = term && cleaned.toLowerCase() === term;
                const cls = isQuery ? `${prefix}-token is-query` : `${prefix}-token`;
                return `<button type="button" class="${cls}" data-lookup-query="${RendererBase.escapeHtml(cleaned)}">${RendererBase.escapeHtml(token)}</button>`;
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
            if (section?.markdown) {
                return "";
            }
            const exampleText = RendererBase.extractFirstExample(section);
            if (!exampleText) {
                return "";
            }
            return `<div class="${prefix}-section-actions"><button type="button" class="${prefix}-section-action ${prefix}-pronounce" data-pronounce-text="${RendererBase.escapeHtml(exampleText)}" data-pronounce-language="en-US" aria-label="Play example sentence" title="Play example">🔊 Listen</button></div>`;
        },

        renderExampleListenButton(speechText, prefix = "dictionary-helper") {
            const cleaned = RendererBase.extractEnglishSpeechText(speechText);
            if (!cleaned) {
                return "";
            }
            return `<button type="button" class="${prefix}-example-listen ${prefix}-pronounce" data-pronounce-text="${RendererBase.escapeHtml(cleaned)}" data-pronounce-language="en-US" aria-label="Play example sentence" title="Play example">🔊 Listen</button>`;
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
            if (RendererBase.isInlineBilingualExample(text)) {
                return true;
            }
            return pairIndex % 2 === 0;
        },

        renderExampleItem(item, prefix = "dictionary-helper") {
            const listenBtn = RendererBase.renderExampleListenButton(item, prefix);
            return `<li class="${prefix}-section-list-item ${prefix}-example-item"><div class="${prefix}-example-row"><span class="${prefix}-example-text">${RendererBase.formatInlineMarkdown(item)}</span>${listenBtn}</div></li>`;
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
            let text = RendererBase.cleanSpeechText(value);
            if (!text) {
                return "";
            }
            text = text.replace(/^\d+[.)]\s+/, "").replace(/^[-*+]\s+/, "");

            const stripOuterQuotes = (val) => String(val || "").replace(/^["'“]+/, "").replace(/["'”]+$/, "").trim();

            const quotedThenGloss = text.match(/^["'“](.+?)["'”]\s*(?:—|–|--|:|\()\s*.+$/);
            if (quotedThenGloss && RendererBase.looksLikeEnglish(quotedThenGloss[1])) {
                return stripOuterQuotes(quotedThenGloss[1]);
            }

            const dashParts = text.split(/\s+(?:—|–|--)\s+/);
            if (dashParts.length >= 2 && RendererBase.looksLikeEnglish(dashParts[0]) && !RendererBase.looksLikeEnglish(dashParts.slice(1).join(" "))) {
                return stripOuterQuotes(dashParts[0]);
            }

            const paren = text.match(/^(.+?)\s+\(([^)]+)\)\s*$/);
            if (paren && RendererBase.looksLikeEnglish(paren[1]) && !RendererBase.looksLikeEnglish(paren[2])) {
                return stripOuterQuotes(paren[1]);
            }

            const cleaned = stripOuterQuotes(text);
            return RendererBase.looksLikeEnglish(cleaned) ? cleaned : "";
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
                    const cleaned = RendererBase.cleanSpeechText(item);
                    if (cleaned) {
                        return cleaned;
                    }
                }
            }
            const pair = Array.isArray(section?.data?.pairs) ? section.data.pairs[0] : null;
            if (pair) {
                const fromPair = RendererBase.cleanSpeechText(pair.sentenceA || pair.sentenceB || pair.text || "");
                if (fromPair) {
                    return fromPair;
                }
            }
            const text = String(section?.text || "");
            const quoted = text.match(/^>\s?(.+)$/m);
            if (quoted) {
                return RendererBase.cleanSpeechText(quoted[1]);
            }
            const firstLine = text.split("\n").map((line) => line.trim()).find(Boolean);
            return firstLine ? RendererBase.cleanSpeechText(firstLine) : "";
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
                    html += `<h${level}>${RendererBase.formatInlineMarkdown(heading[2])}</h${level}>`;
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
                    const listenOnThisItem = listenOnListItems && RendererBase.shouldListenOnPairedLine(itemText, listPairIndex);
                    const listenBtn = listenOnThisItem ? RendererBase.renderExampleListenButton(itemText, prefix) : "";
                    if (listenOnListItems) {
                        listPairIndex = RendererBase.isInlineBilingualExample(itemText) ? 0 : listPairIndex + 1;
                    }
                    html += listenBtn
                        ? `<li class="${prefix}-example-item"><div class="${prefix}-example-row"><span class="${prefix}-example-text">${RendererBase.formatInlineMarkdown(itemText)}</span>${listenBtn}</div></li>`
                        : `<li>${RendererBase.formatInlineMarkdown(itemText)}</li>`;
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
                    const listenOnThisQuote = listenOnQuotes && RendererBase.shouldListenOnPairedLine(quoteText, quotePairIndex);
                    const listenBtn = listenOnThisQuote ? RendererBase.renderExampleListenButton(quoteText, prefix) : "";
                    if (listenOnQuotes) {
                        quotePairIndex = RendererBase.isInlineBilingualExample(quoteText) ? 0 : quotePairIndex + 1;
                    }
                    html += listenBtn
                        ? `<p class="${prefix}-quote-row"><span class="${prefix}-quote-text">${RendererBase.formatInlineMarkdown(quoteText)}</span>${listenBtn}</p>`
                        : `<p>${RendererBase.formatInlineMarkdown(quoteText)}</p>`;
                    continue;
                }

                closeOpenBlocks();
                html += `<p>${RendererBase.formatInlineMarkdown(trimmed)}</p>`;
            }

            if (inBlockquote) {
                html += "</blockquote>";
            }
            closeList();

            return html;
        },

        formatInlineMarkdown(text) {
            return RendererBase.escapeHtml(text)
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
                ? `<span class="${prefix}-phonetic">${RendererBase.escapeHtml(phoneticLabel)}</span>`
                : "";
            const audioUrl = pronunciation.audioUrl ? RendererBase.escapeHtml(pronunciation.audioUrl) : "";
            const language = pronunciation.language ? RendererBase.escapeHtml(pronunciation.language) : "";
            const rate = pronunciation.rate || 0.95;
            const voiceURI = pronunciation.voiceURI ? RendererBase.escapeHtml(pronunciation.voiceURI) : "";
            const baseLabel = pronunciation.label || (pronunciation.audioUrl ? "Listen" : "Speak");
            const rawLabel = accent && !/\((?:US|UK)\)/i.test(baseLabel)
                ? `${baseLabel} (${accent})`
                : baseLabel;
            const label = /^\p{Extended_Pictographic}/u.test(rawLabel) ? rawLabel : `🔊 ${rawLabel}`;
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
                  data-pronounce-text="${RendererBase.escapeHtml(pronunciation.text)}"
                  data-pronounce-audio="${audioUrl}"
                  data-pronounce-language="${language}"
                  data-pronounce-rate="${RendererBase.escapeHtml(rate)}"
                  data-pronounce-voice="${voiceURI}"
                  aria-label="${RendererBase.escapeHtml(ariaLabel)}"
                  aria-pressed="false"
                >
                  <span class="${prefix}-soundwave" aria-hidden="true">
                    <span class="${prefix}-soundwave-bar"></span>
                    <span class="${prefix}-soundwave-bar"></span>
                    <span class="${prefix}-soundwave-bar"></span>
                  </span>
                  <span class="${prefix}-pronounce-label">${RendererBase.escapeHtml(label)}</span>
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

            const language = RendererBase.escapeHtml(primary?.language || "en-US");
            const speechText = RendererBase.escapeHtml(text);
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
                <span class="${prefix}-speech-icon" aria-hidden="true">🎙️</span>
                <span data-eval-label>Practice</span>
              </button>
              <span class="${prefix}-speech-eval-result" data-speech-eval-result hidden aria-live="polite"></span>
            `;
        }
    };

    global.DictionaryHelperRendererBase = RendererBase;
})(typeof window !== "undefined" ? window : globalThis);
