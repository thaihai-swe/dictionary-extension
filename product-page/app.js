(() => {
    "use strict";

    const demoData = {
        resilience: {
            query: "resilience",
            tab: "dictionary",
            context: "Their resilience under pressure allowed the engineering team to ship on time.",
            dictionary: {
                phonetic: "/rɪˈzɪliəns/",
                translation: "khả năng phục hồi; sự kiên cường",
                definition: "The ability to recover quickly from difficulty, change, or stress.",
                example: "The team showed resilience after an unexpected production issue.",
                partOfSpeech: "Noun",
                detected: "Detected: en → vi",
                meanings: [
                    "The ability to return to a healthy, strong, or successful state after a problem or setback.",
                    "The capacity of a person, team, community, or system to cope with pressure and keep functioning."
                ],
                examples: [
                    "The team showed resilience after an unexpected production issue.",
                    "Building resilience helps people respond calmly to change.",
                    "The service was designed with resilience in mind."
                ],
                wordFamily: {
                    noun: ["resilience"],
                    adjective: ["resilient"],
                    adverb: ["resiliently"]
                },
                usageWarnings: [
                    "Usually uncountable: say “show resilience” or “build resilience,” not “a resilience.”",
                    "Common in professional, academic, and personal-development writing."
                ],
                confusablePairs: [
                    ["resistance", "Resistance means opposing something; resilience emphasizes recovering or adapting after difficulty."]
                ],
                sources: [
                    ["Free Dictionary API", false],
                    ["Google Translate", false],
                    ["Wiktionary · enriched", true]
                ]
            },
            ai: {
                explain_in_context: {
                    title: "What “resilience” means here",
                    intro: "Here, resilience describes the team’s ability to stay effective and recover when pressure or setbacks appear.",
                    points: [
                        "It is positive and often used for people, teams, systems, and communities.",
                        "“Under pressure” makes the meaning more specific: calm recovery in a difficult situation.",
                        "Natural alternative: “The team bounced back quickly.”"
                    ]
                },
                grammar: {
                    title: "Grammar & nuance",
                    intro: "“Resilience” is an uncountable noun used as the subject of the sentence.",
                    points: [
                        "Pattern: resilience + under + pressure / stress / adversity.",
                        "It is more formal than “strength” and emphasizes recovery after difficulty.",
                        "Common learner note: say “show resilience,” not usually “do resilience.”"
                    ]
                },
                phrase_explorer: {
                    title: "Useful word partnerships",
                    intro: "“Resilience” commonly appears in professional, academic, and personal-growth writing.",
                    phraseCards: [
                        ["build resilience", "develop the ability to recover from challenges"],
                        ["emotional resilience", "the ability to cope with difficult feelings"],
                        ["resilience under pressure", "staying effective in demanding conditions"]
                    ]
                },
                sentence_breakdown: {
                    title: "Sentence breakdown",
                    intro: "A concise sentence about how one quality enabled a successful outcome.",
                    rows: [
                        ["Their resilience under pressure", "Subject noun phrase"],
                        ["allowed", "Main verb in the past tense"],
                        ["the engineering team", "Object: who benefited"],
                        ["to ship on time", "Infinitive phrase: the resulting action"]
                    ]
                }
            }
        },
        "spill the beans": {
            query: "spill the beans",
            tab: "ai",
            intent: "phrase_explorer",
            context: "He finally spilled the beans about the surprise launch.",
            dictionary: {
                phonetic: "",
                translation: "tiết lộ bí mật",
                definition: "An informal idiom meaning to reveal information that was meant to stay secret.",
                example: "Please do not spill the beans before the announcement.",
                partOfSpeech: "Idiom · verb phrase",
                detected: "Detected: en → vi",
                meanings: [
                    "To reveal a secret or private information, often before the right time."
                ],
                examples: [
                    "He finally spilled the beans about the surprise launch.",
                    "Don't spill the beans until everyone has arrived.",
                    "Who spilled the beans about the promotion?"
                ],
                wordFamily: {
                    verb: ["spill the beans", "spilled the beans", "spilling the beans"]
                },
                usageWarnings: [
                    "Informal and conversational; use “reveal confidential information” in formal writing.",
                    "This is a fixed idiom: keep “the beans” unchanged."
                ],
                confusablePairs: [
                    ["let the cat out of the bag", "A close informal alternative; both mean to reveal a secret, usually by accident or too early."]
                ],
                sources: [
                    ["Google Translate", false],
                    ["AI · phrase fallback", true]
                ]
            },
            ai: {
                explain_in_context: {
                    title: "What “spill the beans” means here",
                    intro: "The speaker revealed the secret launch before it was supposed to be announced.",
                    points: [
                        "The phrase is informal and conversational.",
                        "It normally refers to a secret, surprise, or private plan.",
                        "Natural alternative: “He let the secret out.”"
                    ]
                },
                grammar: {
                    title: "Grammar & nuance",
                    intro: "“Spill the beans” is a fixed idiom used like an ordinary verb phrase.",
                    points: [
                        "Common forms: spill the beans, spilled the beans, has spilled the beans.",
                        "Use it when someone reveals information; it is not appropriate for very formal writing.",
                        "Do not change “the beans” to a different noun—the phrase is fixed."
                    ]
                },
                phrase_explorer: {
                    title: "Phrase & collocations",
                    intro: "An informal idiom for revealing a secret, often earlier than intended.",
                    phraseCards: [
                        ["spill the beans about + noun", "reveal a particular secret or surprise"],
                        ["let the cat out of the bag", "a close informal alternative"],
                        ["keep something under wraps", "keep information secret"]
                    ]
                },
                sentence_breakdown: {
                    title: "Sentence breakdown",
                    intro: "The sentence uses an idiom as the main action and names the secret afterward.",
                    rows: [
                        ["He", "Subject"],
                        ["finally spilled the beans", "Verb phrase with an idiom"],
                        ["about the surprise launch", "Prepositional phrase naming the secret"]
                    ]
                }
            }
        },
        "The algorithm adapts dynamically to high traffic.": {
            query: "The algorithm adapts dynamically to high traffic.",
            tab: "ai",
            intent: "sentence_breakdown",
            context: "The algorithm adapts dynamically to high traffic.",
            dictionary: {
                phonetic: "",
                translation: "Thuật toán thích ứng linh hoạt với lưu lượng truy cập cao.",
                definition: "A complete sentence describing a system that changes its behavior in response to demand.",
                example: "The service adapts dynamically when usage increases.",
                partOfSpeech: "Technical sentence",
                detected: "Detected: en → vi",
                meanings: [
                    "The algorithm automatically changes its behavior as the number of users or requests increases."
                ],
                examples: [
                    "The service adapts dynamically when usage increases.",
                    "The platform scales dynamically during peak traffic."
                ],
                wordFamily: {
                    verb: ["adapt", "adapts", "adapted", "adapting"],
                    adjective: ["adaptive", "adaptable"],
                    adverb: ["dynamically"]
                },
                usageWarnings: [
                    "“High traffic” is a common technical expression for a large volume of users, requests, or data.",
                    "Use the pattern “adapt to + condition” when describing what a system responds to."
                ],
                confusablePairs: [
                    ["adopt", "Adopt means begin to use something; adapt means change to suit a new condition."]
                ],
                sources: [
                    ["Google Translate", false],
                    ["AI · sentence breakdown", true]
                ]
            },
            ai: {
                explain_in_context: {
                    title: "Meaning in context",
                    intro: "The sentence says that the algorithm changes its behavior automatically when many users or requests arrive.",
                    points: [
                        "“Dynamically” means in response to changing conditions rather than by a fixed plan.",
                        "“High traffic” is common in software and web infrastructure.",
                        "The tone is technical and neutral."
                    ]
                },
                grammar: {
                    title: "Grammar & nuance",
                    intro: "This is a present-simple sentence describing a general capability.",
                    points: [
                        "Subject: “The algorithm.”",
                        "Verb: “adapts”; the adverb “dynamically” explains how it adapts.",
                        "Pattern: adapt + to + noun."
                    ]
                },
                phrase_explorer: {
                    title: "Useful technical expressions",
                    intro: "The sentence contains common technical writing patterns rather than an idiom.",
                    phraseCards: [
                        ["adapt to demand", "change behavior as requirements change"],
                        ["dynamically adjust", "automatically change while a system is running"],
                        ["high traffic", "a large volume of users, requests, or data"]
                    ]
                },
                sentence_breakdown: {
                    title: "Sentence breakdown",
                    intro: "A present-simple technical statement: a system responds to an operating condition.",
                    rows: [
                        ["The algorithm", "Subject noun phrase"],
                        ["adapts", "Present-simple main verb"],
                        ["dynamically", "Adverb describing how it adapts"],
                        ["to high traffic", "Prepositional phrase: the condition it responds to"]
                    ]
                }
            }
        }
    };

    const state = {
        query: "resilience",
        tab: "dictionary",
        intent: "explain_in_context"
    };

    const $ = (selector, root = document) => root.querySelector(selector);
    const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

    const escapeHtml = (value) => String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

    function getCurrentEntry() {
        return demoData[state.query] || demoData.resilience;
    }

    function renderSources(sources, className = "source-chip") {
        return sources.map(([label, enriched]) =>
            `<span class="${className}${enriched ? " enriched" : ""}">${escapeHtml(label)}</span>`
        ).join("");
    }

    function renderDictionary(entry) {
        const result = entry.dictionary;
        const audio = result.phonetic
            ? `<button type="button" class="demo-audio" aria-label="Play pronunciation for ${escapeHtml(entry.query)}" title="Preview pronunciation">Listen (US)</button>`
            : "";
        const phonetic = result.phonetic
            ? `<span class="demo-phonetic">${escapeHtml(result.phonetic)} <span>(US)</span></span>`
            : "";
        const sources = renderSources(result.sources);
        const meanings = (result.meanings || [result.definition])
            .map((meaning) => `<li>${escapeHtml(meaning)}</li>`)
            .join("");
        const examples = (result.examples || [result.example])
            .map((example) => `<li>${escapeHtml(example)}</li>`)
            .join("");

        return `
            <div class="demo-result-header">
                <div class="demo-result-title">
                    <div>
                        <h3 class="demo-word">${escapeHtml(entry.query)}</h3>
                        <div class="demo-source-row" aria-label="Demo response sources">${sources}</div>
                    </div>
                    <div class="demo-result-actions">
                        ${phonetic}
                        ${audio}
                        <button type="button" class="demo-practice" aria-label="Preview speech practice">🎙 Practice</button>
                    </div>
                </div>
                <p class="demo-detected">${escapeHtml(result.detected || "Detected: en → vi")}</p>
            </div>
            <section class="demo-definition-card">
                <div class="demo-card-heading">
                    <p class="demo-section-label">${escapeHtml(result.partOfSpeech || "Meaning")}</p>
                    <span class="demo-card-source">${escapeHtml(result.sources[0][0])}</span>
                </div>
                <ol class="demo-meaning-list">${meanings}</ol>
            </section>
            <section class="demo-definition-card">
                <div class="demo-card-heading">
                    <p class="demo-section-label">Examples</p>
                    <span class="demo-card-source">${escapeHtml(result.sources[0][0])}</span>
                </div>
                <ul class="demo-example-list">${examples}</ul>
            </section>
            <section class="demo-definition-card demo-translation-card">
                <div class="demo-card-heading">
                    <p class="demo-section-label">Vietnamese translation</p>
                    <span class="demo-card-source">Google Translate</span>
                </div>
                <p class="demo-translation">${escapeHtml(result.translation)}</p>
            </section>
        `;
    }

    function renderPhraseCards(cards) {
        return `<div class="demo-list">${
            cards.map(([title, copy]) => `
                <article class="phrase-card">
                    <h4>${escapeHtml(title)}</h4>
                    <p>${escapeHtml(copy)}</p>
                </article>
            `).join("")
        }</div>`;
    }

    function renderBreakdownRows(rows) {
        return `<div class="breakdown-grid">${
            rows.map(([term, description]) => `
                <div class="breakdown-row">
                    <strong>${escapeHtml(term)}</strong>
                    <span>${escapeHtml(description)}</span>
                </div>
            `).join("")
        }</div>`;
    }

    function renderWordFamily(profile) {
        if (!profile) return "";
        const labels = [
            ["noun", "Noun"],
            ["verb", "Verb"],
            ["adjective", "Adjective"],
            ["adverb", "Adverb"],
            ["inflections", "Inflections"]
        ];
        const rows = labels
            .filter(([key]) => Array.isArray(profile[key]) && profile[key].length)
            .map(([key, label]) => `
                <div class="demo-family-row">
                    <span>${label}</span>
                    <div>${profile[key].map((word) => `<button type="button" class="demo-family-chip" data-demo-lookup="${escapeHtml(word)}">${escapeHtml(word)}</button>`).join("")}</div>
                </div>
            `).join("");
        return rows ? `
            <section class="demo-ai-block demo-word-family">
                <h4>Word Family</h4>
                ${rows}
            </section>
        ` : "";
    }

    function renderUsageNotes(result) {
        const warningItems = (result.usageWarnings || [])
            .map((warning) => `<li>${escapeHtml(warning)}</li>`)
            .join("");
        const confusableItems = (result.confusablePairs || [])
            .map(([word, distinction]) => `<li><strong>Confused with <em>${escapeHtml(word)}</em>:</strong> ${escapeHtml(distinction)}</li>`)
            .join("");
        if (!warningItems && !confusableItems) return "";
        return `
            <aside class="demo-usage-callout">
                <h4>Usage &amp; Register Notes</h4>
                <ul>${warningItems}${confusableItems}</ul>
            </aside>
        `;
    }

    function renderStudyDetails(entry) {
        const result = entry.dictionary;
        const examples = (result.examples || [result.example])
            .map((example) => `<li>${escapeHtml(example)}</li>`)
            .join("");
        const related = entry.ai.phrase_explorer?.phraseCards || [];
        const relatedItems = related
            .map(([phrase, explanation]) => `<li><strong>${escapeHtml(phrase)}</strong> — ${escapeHtml(explanation)}</li>`)
            .join("");
        return `
            <details class="demo-study-detail">
                <summary>Usage note <span>▾</span></summary>
                <div><p>${escapeHtml((result.usageWarnings || ["Use this item in a complete sentence to understand its natural register."])[0])}</p></div>
            </details>
            <details class="demo-study-detail" open>
                <summary>Example sentences <span>▾</span></summary>
                <div><ul class="demo-example-list">${examples}</ul></div>
            </details>
            <details class="demo-study-detail">
                <summary>Common synonyms, phrases &amp; collocations <span>▾</span></summary>
                <div><ul class="demo-study-list">${relatedItems || "<li>Explore the phrase action to see useful related expressions.</li>"}</ul></div>
            </details>
            <details class="demo-study-detail">
                <summary>Common learner errors or confusables <span>▾</span></summary>
                <div>${renderUsageNotes({ usageWarnings: [], confusablePairs: result.confusablePairs })}</div>
            </details>
        `;
    }

    function renderAi(entry) {
        const content = entry.ai[state.intent] || entry.ai.explain_in_context;
        const context = $("#demo-context-input")?.value.trim() || entry.context;
        const result = entry.dictionary;
        const detail = content.phraseCards
            ? renderPhraseCards(content.phraseCards)
            : content.rows
                ? renderBreakdownRows(content.rows)
                : `<ul class="demo-list">${content.points.map((point) => `<li>${escapeHtml(point)}</li>`).join("")}</ul>`;

        return `
            <p class="demo-ai-kicker">Word explanation</p>
            ${renderWordFamily(result.wordFamily)}
            ${renderUsageNotes(result)}
            <section class="demo-reference-entry">
                <div class="demo-card-heading">
                    <strong>${escapeHtml(entry.query)}</strong>
                    <span>${escapeHtml(result.partOfSpeech || "Dictionary entry")}</span>
                </div>
                <p>${escapeHtml(result.definition)}</p>
                <p><strong>Vietnamese translation:</strong> ${escapeHtml(result.translation)}</p>
            </section>
            <section class="demo-ai-analysis">
                <h3 class="demo-ai-heading">${escapeHtml(content.title)}</h3>
                <p class="demo-context-used"><strong>Context used:</strong> “${escapeHtml(context)}”</p>
                <p class="demo-ai-copy">${escapeHtml(content.intro)}</p>
                ${detail}
            </section>
            ${renderStudyDetails(entry)}
            <p class="demo-preview-note">Static portfolio preview — the extension sends contextual AI requests only after an explicit user action.</p>
        `;
    }

    function renderDemo() {
        const panel = $("#demo-tab-panel");
        const contextBar = $("#demo-context-bar");
        const entry = getCurrentEntry();
        if (!panel || !contextBar) return;

        panel.setAttribute("aria-labelledby", state.tab === "dictionary" ? "tab-btn-dict" : "tab-btn-ai");
        panel.innerHTML = state.tab === "dictionary" ? renderDictionary(entry) : renderAi(entry);
        contextBar.hidden = state.tab !== "ai";

        $$("#demo-tab-panel .demo-audio").forEach((button) => {
            button.addEventListener("click", () => {
                button.classList.add("is-playing");
                button.textContent = "Playing…";
                window.setTimeout(() => {
                    button.classList.remove("is-playing");
                    button.textContent = "Listen (US)";
                }, 680);
            });
        });

        $$("#demo-tab-panel [data-demo-lookup]").forEach((button) => {
            button.addEventListener("click", () => {
                const matchingPreset = $$(".preset-btn").find((preset) => preset.dataset.query === button.dataset.demoLookup);
                if (matchingPreset) {
                    matchingPreset.click();
                }
            });
        });
    }

    function setTab(tab) {
        state.tab = tab === "ai" ? "ai" : "dictionary";
        const isAi = state.tab === "ai";
        $("#tab-btn-dict")?.classList.toggle("is-active", !isAi);
        $("#tab-btn-ai")?.classList.toggle("is-active", isAi);
        $("#tab-btn-dict")?.setAttribute("aria-selected", String(!isAi));
        $("#tab-btn-ai")?.setAttribute("aria-selected", String(isAi));
        renderDemo();
    }

    function setIntent(intent) {
        state.intent = intent;
        $$(".context-action-btn").forEach((button) => {
            button.classList.toggle("active", button.dataset.intent === intent);
        });
        if (state.tab === "ai") renderDemo();
    }

    function setQuery(query, tab, intent) {
        const entry = demoData[query];
        if (!entry) return;
        state.query = query;
        $("#demo-search-input").value = entry.query;
        $("#demo-context-input").value = entry.context;
        $$(".preset-btn").forEach((button) => {
            button.classList.toggle("active", button.dataset.query === query);
        });
        setIntent(intent || entry.intent || "explain_in_context");
        setTab(tab || entry.tab || "dictionary");
    }

    function setupDemo() {
        const input = $("#demo-search-input");
        if (!input) return;

        $$(".preset-btn").forEach((button) => {
            button.addEventListener("click", () => {
                setQuery(button.dataset.query, button.dataset.tab, button.dataset.intent);
            });
        });

        $("#tab-btn-dict")?.addEventListener("click", () => setTab("dictionary"));
        $("#tab-btn-ai")?.addEventListener("click", () => setTab("ai"));

        $$(".context-action-btn").forEach((button) => {
            button.addEventListener("click", () => {
                setIntent(button.dataset.intent);
                setTab("ai");
            });
        });

        $("#demo-context-input")?.addEventListener("input", () => {
            if (state.tab === "ai") renderDemo();
        });

        $("#demo-search-btn")?.addEventListener("click", () => {
            const message = $("#demo-search-feedback");
            if (!message) return;
            message.hidden = false;
            message.textContent = "This portfolio preview uses curated examples. Choose a scenario above to explore the product workflow.";
            window.setTimeout(() => {
                message.hidden = true;
            }, 4200);
        });

        renderDemo();
    }

    function setupNavigation() {
        const nav = $("#site-nav");
        const toggle = $("#nav-toggle");
        const closeNavigation = () => {
            nav?.classList.remove("is-open");
            document.body.classList.remove("nav-open");
            toggle?.setAttribute("aria-expanded", "false");
        };

        toggle?.addEventListener("click", () => {
            const open = toggle.getAttribute("aria-expanded") !== "true";
            toggle.setAttribute("aria-expanded", String(open));
            nav?.classList.toggle("is-open", open);
            document.body.classList.toggle("nav-open", open);
        });

        $$(".nav-link").forEach((link) => link.addEventListener("click", closeNavigation));
        window.addEventListener("resize", () => {
            if (window.innerWidth > 860) closeNavigation();
        });
        document.addEventListener("keydown", (event) => {
            if (event.key === "Escape") closeNavigation();
        });

        const header = $("#site-header");
        const updateHeader = () => header?.classList.toggle("is-scrolled", window.scrollY > 10);
        updateHeader();
        window.addEventListener("scroll", updateHeader, { passive: true });
    }

    function setupObservers() {
        const navLinks = $$(".nav-link");
        const sections = navLinks
            .map((link) => $(link.getAttribute("href")))
            .filter(Boolean);

        if ("IntersectionObserver" in window) {
            const navObserver = new IntersectionObserver((entries) => {
                const visible = entries
                    .filter((entry) => entry.isIntersecting)
                    .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
                if (!visible) return;
                navLinks.forEach((link) => {
                    link.classList.toggle("is-active", link.getAttribute("href") === `#${visible.target.id}`);
                });
            }, { rootMargin: "-24% 0px -62% 0px", threshold: [0.08, 0.25, 0.55] });
            sections.forEach((section) => navObserver.observe(section));

            if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
                $$(".section-header, .card, .interactive-stage, .arch-diagram-card, .table-card, .code-showcase, .doc-link-card, .cta-card, .user-journey-step, .install-step, .benefit-card").forEach((element) => {
                    element.classList.add("reveal");
                });
                const revealObserver = new IntersectionObserver((entries, observer) => {
                    entries.forEach((entry) => {
                        if (!entry.isIntersecting) return;
                        entry.target.classList.add("is-visible");
                        observer.unobserve(entry.target);
                    });
                }, { threshold: 0.08 });
                $$(".reveal").forEach((element) => revealObserver.observe(element));
            }
        }
    }

    function setupYear() {
        const year = $("#year");
        if (year) year.textContent = String(new Date().getFullYear());
    }

    document.addEventListener("DOMContentLoaded", () => {
        setupNavigation();
        setupDemo();
        setupObservers();
        setupYear();
    });
})();
