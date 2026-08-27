/**
 * Lexical profile renderer (Word family, collocations, word formation, mistakes).
 */
(function (global) {
    "use strict";

    const base = () => global.DictionaryHelperRendererBase;

    const RendererLexical = {
        renderLexicalProfile(profile, prefix, sectionTitleTag = "h4") {
            if (!profile) return "";
            const { wordFamily, usageWarnings, confusablePairs, learnerMistakes, wordFormation, collocations } = profile;
            const escapeHtml = base().escapeHtml;
            const formatInlineMarkdown = base().formatInlineMarkdown;
            const renderExampleListenButton = base().renderExampleListenButton;
            const renderSimpleMarkdown = base().renderSimpleMarkdown;

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
                            .map((item) => `<button type="button" class="${prefix}-family-chip" data-lookup-query="${escapeHtml(item)}">${escapeHtml(item)}</button>`)
                            .join(" ");
                        return `<div class="${prefix}-word-family-row"><span class="${prefix}-word-family-label">${escapeHtml(cat.label)}</span> <div class="${prefix}-word-family-chips">${chips}</div></div>`;
                    })
                    .join("");
                if (rows) {
                    familyHtml = `<div class="${prefix}-word-family-grid"><${sectionTitleTag} class="${prefix}-section-title">🌳 Word Family</${sectionTitleTag}>${rows}</div>`;
                }
            }

            let warningsHtml = "";
            const hasWarnings = Array.isArray(usageWarnings) && usageWarnings.length;
            const hasConfusables = Array.isArray(confusablePairs) && confusablePairs.length;

            if (hasWarnings || hasConfusables) {
                const warningItems = (usageWarnings || [])
                    .map((w) => `<li class="${prefix}-warning-item">${escapeHtml(w)}</li>`)
                    .join("");
                const confusableItems = (confusablePairs || [])
                    .map((pair) => `<li class="${prefix}-confusable-item"><strong>Confused with <em>${escapeHtml(pair.word)}</em>:</strong> ${formatInlineMarkdown(pair.distinction)}</li>`)
                    .join("");
                warningsHtml = `
                    <div class="${prefix}-warning-callout">
                        <${sectionTitleTag} class="${prefix}-section-title">⚠️ Usage &amp; Register Notes</${sectionTitleTag}>
                        <ul>${warningItems}${confusableItems}</ul>
                    </div>
                `;
            }

            let formationHtml = "";
            if (wordFormation) {
                const prefixes = Array.isArray(wordFormation.prefixes) ? wordFormation.prefixes : [];
                const suffixes = Array.isArray(wordFormation.suffixes) ? wordFormation.suffixes : [];
                const explanation = String(wordFormation.explanation || "").trim();
                const tagItems = (list, cls) => (list || []).map((item) => `<span class="${prefix}-formation-tag ${cls}">${escapeHtml(item)}</span>`).join("");
                const tagsHtml = `<div class="${prefix}-formation-tags">${tagItems(prefixes, `${prefix}-formation-prefix`)}${tagItems(suffixes, `${prefix}-formation-suffix`)}</div>`;
                const explanationHtml = explanation ? `<p class="${prefix}-formation-explanation">${renderSimpleMarkdown(explanation, prefix)}</p>` : "";
                if (prefixes.length || suffixes.length || explanation) {
                    formationHtml = `<div class="${prefix}-word-formation"><${sectionTitleTag} class="${prefix}-section-title">🧬 Word Formation</${sectionTitleTag}>${tagsHtml}${explanationHtml}</div>`;
                }
            }

            let mistakesHtml = "";
            if (Array.isArray(learnerMistakes) && learnerMistakes.length) {
                const mistakeItems = learnerMistakes.map((item) => {
                    const mistakeListen = item.example ? renderExampleListenButton(item.example, prefix) : "";
                    const example = item.example
                        ? `<blockquote class="${prefix}-mistake-example"><p class="${prefix}-quote-row"><span class="${prefix}-quote-text">${formatInlineMarkdown(item.example)}</span>${mistakeListen}</p></blockquote>`
                        : "";
                    return `<div class="${prefix}-mistake-item"><div class="${prefix}-mistake-original"><strong>Mistake:</strong> ${formatInlineMarkdown(item.mistake)}</div><div class="${prefix}-mistake-correction"><strong>Correction:</strong> ${formatInlineMarkdown(item.correction)}</div>${example}</div>`;
                }).join("");
                mistakesHtml = `<div class="${prefix}-learner-mistakes"><${sectionTitleTag} class="${prefix}-section-title">⚠️ Common Learner Mistakes</${sectionTitleTag}>${mistakeItems}</div>`;
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
                    const chips = collocations[group.key].map((item) => `<span class="${prefix}-collocation-chip">${escapeHtml(item)}</span>`).join("");
                    return `<div class="${prefix}-collocation-group"><span class="${prefix}-collocation-label">${escapeHtml(group.label)}</span><div class="${prefix}-collocation-tags">${chips}</div></div>`;
                }).join("");
                if (groupRows) {
                    collocationsHtml = `<div class="${prefix}-collocations-block"><${sectionTitleTag} class="${prefix}-section-title">🔗 Collocations</${sectionTitleTag}>${groupRows}</div>`;
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
        }
    };

    global.DictionaryHelperRendererLexical = RendererLexical;
})(typeof window !== "undefined" ? window : globalThis);
