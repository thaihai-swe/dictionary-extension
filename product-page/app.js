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
            senses: [
                { number: "1", pos: "noun", definition: "The ability to recover after difficulty or stress.", gloss: "khả năng phục hồi", inContext: true },
                { number: "2", pos: "noun", definition: "The capacity of a system to keep working under pressure.", gloss: "độ bền / khả năng chịu tải", inContext: false }
            ],
            ai: {
                default: {
                    title: "Main AI Explanation",
                    intro: "**resilience** /rɪˈzɪliəns/ *noun* — the ability to recover quickly from difficulty, change, or stress."
                },
                explain_in_context: {
                    title: "What “resilience” means here",
                    intro: "Here, resilience describes the team’s ability to stay effective and recover when pressure or setbacks appear.",
                    role: "Uncountable noun used as the subject of the sentence.",
                    quickTest: "If you can replace it with “the ability to recover,” you want resilience.",
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
                        "It is more formal than “strength” and emphasizes recovery after difficulty."
                    ],
                    learnerMistakes: [
                        { avoid: "do resilience", prefer: "show resilience", example: "The team showed resilience after the outage." }
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
                },
                compare_confusables: {
                    title: "Resilience vs resistance",
                    intro: "Both involve difficulty, but they point in opposite directions: recovering versus opposing.",
                    distinction: "Use resilience when someone or something recovers after stress. Use resistance when someone or something pushes back against change or force.",
                    terms: ["resilience", "resistance"],
                    rows: [
                        ["Core meaning", "Recover or adapt after difficulty", "Oppose a force, change, or idea"],
                        ["Typical subject", "People, teams, systems, communities", "People, materials, political movements"],
                        ["Register", "Professional and academic, often positive", "Neutral to technical; can be positive or negative"]
                    ],
                    pairs: [
                        {
                            sentenceA: "The team showed resilience after the outage.",
                            sentenceB: "The team showed resistance to the new process.",
                            explanation: "The first praises recovery. The second describes opposition."
                        }
                    ]
                },
                rephrase: {
                    title: "Rephrase · three styles",
                    intro: "One Rephrase action returns three rewrite styles of the context sentence.",
                    styles: [
                        {
                            label: "Simplified",
                            text: "The team stayed strong under pressure, so they finished on time.",
                            note: "Shorter words, same meaning — useful when the original sentence feels dense."
                        },
                        {
                            label: "Academic & Formal",
                            text: "The team’s capacity to recover under pressure enabled timely delivery.",
                            note: "More abstract nouns; appropriate for reports, papers, and professional writing."
                        },
                        {
                            label: "Native Idiom",
                            text: "They bounced back under pressure and still shipped on time.",
                            note: "Natural spoken English: “bounced back” carries the resilience meaning."
                        }
                    ]
                }
            }
        },
        "spill the beans": {
            query: "spill the beans",
            tab: "ai",
            intent: "collocations",
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
                default: {
                    title: "Main AI Explanation",
                    intro: "**spill the beans** *idiom* — to reveal a secret, often earlier than intended."
                },
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
                        "Use it when someone reveals information; it is not appropriate for very formal writing."
                    ],
                    learnerMistakes: [
                        { avoid: "spill the secret beans", prefer: "spill the beans", example: "Don't spill the beans until everyone has arrived." }
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
                },
                compare_confusables: {
                    title: "Spill the beans vs let the cat out of the bag",
                    intro: "Both mean to reveal a secret, usually too early.",
                    distinction: "They are near synonyms in informal speech. “Spill the beans” can sound slightly more deliberate; “let the cat out of the bag” often implies an accident.",
                    terms: ["spill the beans", "let the cat out of the bag"],
                    rows: [
                        ["Meaning", "Reveal a secret", "Reveal a secret, often by accident"],
                        ["Register", "Informal spoken English", "Informal spoken English"],
                        ["Fixed parts", "Keep “the beans”", "Keep “the cat” and “the bag”"]
                    ],
                    pairs: [
                        {
                            sentenceA: "He spilled the beans about the launch.",
                            sentenceB: "He let the cat out of the bag about the launch.",
                            explanation: "Both work. The second often sounds less intentional."
                        }
                    ]
                },
                rephrase: {
                    title: "Rephrase · three styles",
                    intro: "One Rephrase action returns three rewrite styles of the context sentence.",
                    styles: [
                        {
                            label: "Simplified",
                            text: "He finally told the secret about the surprise launch.",
                            note: "Direct and clear; avoids the idiom if the reader is still learning it."
                        },
                        {
                            label: "Academic & Formal",
                            text: "He ultimately disclosed the confidential details of the surprise launch.",
                            note: "Formal verbs such as “disclosed” fit reports and workplace writing."
                        },
                        {
                            label: "Native Idiom",
                            text: "He let the cat out of the bag about the launch.",
                            note: "A close informal equivalent that native speakers use in the same situation."
                        }
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
            senses: [
                { number: "1", pos: "verb", definition: "Change behavior to fit a new condition.", gloss: "thích ứng", inContext: true },
                { number: "2", pos: "verb", definition: "Adjust a plan or method after new information.", gloss: "điều chỉnh", inContext: false }
            ],
            ai: {
                default: {
                    title: "Main AI Explanation",
                    intro: "A complete technical sentence: the system automatically changes its behavior as demand increases."
                },
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
                    ],
                    learnerMistakes: [
                        { avoid: "adapt with high traffic", prefer: "adapt to high traffic", example: "The algorithm adapts to high traffic." }
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
                },
                compare_confusables: {
                    title: "Adapt vs adopt",
                    intro: "These look similar, but they describe different actions.",
                    distinction: "Adapt means change to fit a new condition. Adopt means start using something that already exists.",
                    terms: ["adapt", "adopt"],
                    rows: [
                        ["Meaning", "Change to suit a condition", "Begin to use a method, tool, or idea"],
                        ["Pattern", "adapt to + noun", "adopt + noun"],
                        ["This sentence", "The algorithm changes under load", "Would mean the team started using an algorithm"]
                    ],
                    pairs: [
                        {
                            sentenceA: "The algorithm adapts to high traffic.",
                            sentenceB: "The team adopted a new algorithm.",
                            explanation: "The first is about changing behavior. The second is about choosing a tool."
                        }
                    ]
                },
                rephrase: {
                    title: "Rephrase · three styles",
                    intro: "One Rephrase action returns three rewrite styles of the context sentence.",
                    styles: [
                        {
                            label: "Simplified",
                            text: "The algorithm changes when many people use it.",
                            note: "Removes technical adverbs so the core idea is easy to follow."
                        },
                        {
                            label: "Academic & Formal",
                            text: "The algorithm modifies its behavior in response to elevated traffic volume.",
                            note: "Nominal style typical of technical documentation and papers."
                        },
                        {
                            label: "Native Idiom",
                            text: "The algorithm scales up when traffic spikes.",
                            note: "“Scales up” and “spikes” are the natural collocations engineers use."
                        }
                    ]
                }
            }
        },
        "affect vs effect": {
            query: "affect vs effect",
            tab: "ai",
            intent: "confusables",
            context: "The policy will affect housing costs, but the long-term effect is still unclear.",
            dictionary: {
                phonetic: "/əˈfekt/ · /ɪˈfekt/",
                translation: "ảnh hưởng (động từ) · tác động / kết quả (danh từ)",
                definition: "Affect is usually a verb meaning to influence. Effect is usually a noun meaning a result.",
                example: "The weather affected the harvest. The effect was a smaller crop.",
                partOfSpeech: "Confusable pair",
                detected: "Detected: en → vi",
                meanings: [
                    "Affect (verb): to influence or change something.",
                    "Effect (noun): a result or consequence of a change."
                ],
                examples: [
                    "The delay affected the launch date.",
                    "The new rule had an immediate effect on prices.",
                    "Stress can affect sleep, and poor sleep has a knock-on effect on focus."
                ],
                wordFamily: {
                    verb: ["affect", "affected", "affecting"],
                    noun: ["effect", "effects"]
                },
                usageWarnings: [
                    "In everyday English, affect is almost always a verb and effect is almost always a noun.",
                    "“Effect” as a verb (“to effect change”) is formal and much less common."
                ],
                confusablePairs: [
                    ["impact", "Impact can be a noun or verb and is often used in business writing; affect/effect remain more precise in careful prose."]
                ],
                sources: [
                    ["Free Dictionary API", false],
                    ["AI · Compare Confusables", true]
                ]
            },
            ai: {
                default: {
                    title: "Main AI Explanation",
                    intro: "Affect is usually a verb meaning to influence. Effect is usually a noun meaning a result."
                },
                explain_in_context: {
                    title: "What each word does in this sentence",
                    intro: "The policy is the cause (affect, verb). The later result is still unknown (effect, noun).",
                    points: [
                        "“Will affect housing costs” = will change or influence those costs.",
                        "“The long-term effect” = the result that appears later.",
                        "A useful check: if you can replace the word with “influence,” you probably want affect."
                    ]
                },
                grammar: {
                    title: "Grammar & nuance",
                    intro: "The pair is mostly a part-of-speech contrast, not a meaning overlap.",
                    points: [
                        "Affect: verb. Pattern: affect + object.",
                        "Effect: noun. Pattern: the effect of X on Y / have an effect on."
                    ],
                    learnerMistakes: [
                        { avoid: "the policy will effect housing costs", prefer: "the policy will affect housing costs", example: "The policy will affect housing costs." }
                    ]
                },
                phrase_explorer: {
                    title: "Useful word partnerships",
                    intro: "Each word keeps its own collocations.",
                    phraseCards: [
                        ["affect + noun", "influence an outcome, cost, or person"],
                        ["have an effect on", "produce a result"],
                        ["side effect / long-term effect", "a result that is secondary or delayed"]
                    ]
                },
                sentence_breakdown: {
                    title: "Sentence breakdown",
                    intro: "Two clauses: a predicted influence, then an unknown result.",
                    rows: [
                        ["The policy", "Subject of the first clause"],
                        ["will affect housing costs", "Verb phrase: influence as a future action"],
                        ["but", "Contrast coordinator"],
                        ["the long-term effect is still unclear", "Second clause: the result remains unknown"]
                    ]
                },
                compare_confusables: {
                    title: "Affect vs effect",
                    intro: "Same topic, different jobs in the sentence: one is the action, the other is the result.",
                    distinction: "Use affect when something influences something else. Use effect when you name the result of that influence.",
                    terms: ["affect", "effect"],
                    rows: [
                        ["Usual part of speech", "Verb", "Noun"],
                        ["Core meaning", "To influence or change", "A result or consequence"],
                        ["Test", "Can you replace it with “influence”?", "Can you replace it with “result”?"],
                        ["Typical pattern", "X affects Y", "the effect of X / have an effect on Y"]
                    ],
                    pairs: [
                        {
                            sentenceA: "The policy will affect housing costs.",
                            sentenceB: "The long-term effect is still unclear.",
                            explanation: "First is the action of influencing. Second is the resulting outcome."
                        },
                        {
                            sentenceA: "Lack of sleep affected her focus.",
                            sentenceB: "The effect was a slower review cycle.",
                            explanation: "The verb names the influence; the noun names what followed."
                        }
                    ]
                },
                rephrase: {
                    title: "Rephrase · three styles",
                    intro: "One Rephrase action returns three rewrite styles of the context sentence.",
                    styles: [
                        {
                            label: "Simplified",
                            text: "The policy will change housing costs, but we still do not know the later result.",
                            note: "Keeps affect/effect as “change” and “result” so the contrast stays obvious."
                        },
                        {
                            label: "Academic & Formal",
                            text: "The policy is expected to affect housing costs, although the long-term effect remains uncertain.",
                            note: "Preserves the verb/noun pair in careful academic wording."
                        },
                        {
                            label: "Native Idiom",
                            text: "The policy will hit housing costs, but we still don’t know the knock-on effect yet.",
                            note: "“Hit” and “knock-on effect” are natural spoken alternatives."
                        }
                    ]
                }
            }
        }
    };

    const state = {
        query: "resilience",
        tab: "dictionary",
        intent: "default",
        practiceLabel: ""
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

    function renderSenseMatrix(senses) {
        if (!Array.isArray(senses) || !senses.length) return "";
        const cards = senses.map((sense) => `
            <article class="demo-sense-card${sense.inContext ? " is-context" : ""}">
                <div class="demo-sense-header">
                    <span class="demo-sense-number">${escapeHtml(String(sense.number || ""))}</span>
                    ${sense.pos ? `<span class="demo-sense-pos">${escapeHtml(sense.pos)}</span>` : ""}
                    ${sense.inContext ? `<span class="demo-sense-badge">Used in this context</span>` : ""}
                </div>
                <p class="demo-sense-definition">${escapeHtml(sense.definition || "")}</p>
                ${sense.gloss ? `<span class="demo-sense-gloss">${escapeHtml(sense.gloss)}</span>` : ""}
            </article>
        `).join("");
        return `<div class="demo-sense-matrix">${cards}</div>`;
    }

    function renderComparisonTable(data) {
        if (!data || !Array.isArray(data.rows) || !data.rows.length) return "";
        const headerA = escapeHtml(data.terms?.[0] || "Term A");
        const headerB = escapeHtml(data.terms?.[1] || "Term B");
        const body = data.rows.map((row) => `
            <tr>
                <th scope="row">${escapeHtml(row[0] || "")}</th>
                <td>${escapeHtml(row[1] || "")}</td>
                <td>${escapeHtml(row[2] || "")}</td>
            </tr>
        `).join("");
        return `
            <div class="demo-compare-table-wrap">
                <table class="demo-compare-table">
                    <thead><tr><th>Feature</th><th>${headerA}</th><th>${headerB}</th></tr></thead>
                    <tbody>${body}</tbody>
                </table>
            </div>
        `;
    }

    function renderMinimalPairs(pairs) {
        if (!Array.isArray(pairs) || !pairs.length) return "";
        return `<div class="demo-minimal-pairs">${pairs.map((pair) => `
            <article class="demo-minimal-pair">
                <p class="demo-minimal-a">${escapeHtml(pair.sentenceA || "")}</p>
                <p class="demo-minimal-b">${escapeHtml(pair.sentenceB || "")}</p>
                ${pair.explanation ? `<small>${escapeHtml(pair.explanation)}</small>` : ""}
            </article>
        `).join("")}</div>`;
    }

    function tokenizeContext(context, query) {
        const text = String(context || "");
        const queryWords = String(query || "")
            .toLowerCase()
            .split(/[^a-z0-9']+/i)
            .filter((word) => word.length > 2);
        return text.replace(/[A-Za-z][A-Za-z'-]*/g, (word) => {
            const normalized = word.toLowerCase();
            const isQuery = queryWords.includes(normalized);
            const known = Object.keys(demoData).some((key) => key.toLowerCase() === normalized);
            if (!isQuery && !known) return escapeHtml(word);
            return `<button type="button" class="demo-token${isQuery ? " is-query" : ""}" data-demo-lookup="${escapeHtml(normalized)}">${escapeHtml(word)}</button>`;
        });
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
            .map((example) => `<li class="demo-example-item"><div class="demo-example-row"><span class="demo-example-text">${escapeHtml(example)}</span><button type="button" class="demo-section-action demo-example-listen" data-demo-listen aria-label="Play example sentence">Listen</button></div></li>`)
            .join("");
        const practice = state.practiceLabel
            ? `<span class="demo-practice-badge">${escapeHtml(state.practiceLabel)}</span>`
            : `<button type="button" class="demo-practice" data-demo-practice aria-label="Preview speech practice">Practice</button>`;

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
                        ${practice}
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
            .map((example) => `<li class="demo-example-item"><div class="demo-example-row"><span class="demo-example-text">${escapeHtml(example)}</span><button type="button" class="demo-section-action demo-example-listen" data-demo-listen aria-label="Play example sentence">Listen</button></div></li>`)
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

    function renderRephraseCards(styles) {
        if (!Array.isArray(styles) || !styles.length) return "";
        return `<div class="demo-rephrase-grid">${
            styles.map((style) => `
                <article class="demo-rephrase-card">
                    <div class="demo-rephrase-header">
                        <span class="demo-rephrase-style-tag">${escapeHtml(style.label || "Style")}</span>
                    </div>
                    <p class="demo-rephrase-text">${escapeHtml(style.text || "")}</p>
                    ${style.note ? `<p class="demo-rephrase-note">${escapeHtml(style.note)}</p>` : ""}
                </article>
            `).join("")
        }</div>`;
    }

    function renderLearnerMistakes(mistakes) {
        if (!Array.isArray(mistakes) || !mistakes.length) return "";
        return `
            <div class="demo-mistakes-block">
                <h4 class="demo-mistakes-heading">Common Learner Mistakes</h4>
                ${mistakes.map((m) => `
                    <div class="demo-mistake-item">
                        <p class="demo-mistake-avoid"><span class="demo-tag-avoid">Avoid</span> <s>${escapeHtml(m.avoid)}</s></p>
                        <p class="demo-mistake-prefer"><span class="demo-tag-prefer">Prefer</span> <strong>${escapeHtml(m.prefer)}</strong></p>
                        ${m.example ? `<p class="demo-mistake-example">“${escapeHtml(m.example)}”</p>` : ""}
                    </div>
                `).join("")}
            </div>
        `;
    }

    function renderIntentBody(content) {
        if (content.styles) return renderRephraseCards(content.styles);
        if (content.phraseCards) return renderPhraseCards(content.phraseCards);
        if (content.rows && content.terms) {
            return `
                ${content.distinction ? `<div class="demo-core-distinction"><p><strong>Core distinction:</strong> ${escapeHtml(content.distinction)}</p></div>` : ""}
                ${renderComparisonTable(content)}
                ${renderMinimalPairs(content.pairs)}
            `;
        }
        if (content.rows) return renderBreakdownRows(content.rows);
        return `
            ${content.role ? `<div class="demo-role-box"><p><strong>Role:</strong> ${escapeHtml(content.role)}</p>${content.quickTest ? `<p><strong>Quick test:</strong> ${escapeHtml(content.quickTest)}</p>` : ""}</div>` : ""}
            <ul class="demo-list">${(content.points || []).map((point) => `<li>${escapeHtml(point)}</li>`).join("")}</ul>
            ${renderLearnerMistakes(content.learnerMistakes)}
        `;
    }

    function renderAi(entry) {
        const intentKey = state.intent === "collocations" ? "collocations"
            : state.intent === "confusables" ? "confusables"
            : state.intent;
        const aiEntry = entry.ai[intentKey]
            || (intentKey === "collocations" ? entry.ai.phrase_explorer : null)
            || (intentKey === "confusables" ? entry.ai.compare_confusables : null)
            || entry.ai.default
            || entry.ai.explain_in_context;
        const context = $("#demo-context-input")?.value.trim() || entry.context;
        const result = entry.dictionary;

        if (state.intent === "default") {
            const examples = (result.examples || [result.example]).slice(0, 2);
            return `
                <div class="demo-ai-shell">
                    <div class="demo-card-heading">
                        <h3 class="demo-ai-heading">Main AI Explanation</h3>
                    </div>
                    <p class="demo-ai-copy">${escapeHtml(result.definition)}</p>
                    <div class="demo-translation-card">
                        <strong>Target language gloss:</strong> ${escapeHtml(result.translation)}
                    </div>
                    ${entry.senses ? `
                        <section class="demo-ai-analysis">
                            <h4 class="demo-subheading">Senses in Context</h4>
                            ${renderSenseMatrix(entry.senses)}
                        </section>
                    ` : ""}
                    ${examples.length ? `
                        <section class="demo-ai-analysis">
                            <h4 class="demo-subheading">Bilingual Examples</h4>
                            <ul class="demo-example-list">
                                ${examples.map((ex) => `
                                    <li class="demo-example-item">
                                        <div class="demo-example-row">
                                            <span class="demo-example-text">“${escapeHtml(ex)}”</span>
                                            <button type="button" class="demo-section-action demo-example-listen" data-demo-listen aria-label="Play example">Listen</button>
                                        </div>
                                    </li>
                                `).join("")}
                            </ul>
                        </section>
                    ` : ""}
                    ${renderWordFamily(result.wordFamily)}
                </div>
            `;
        }

        const isContextual = state.intent === "explain_in_context" || state.intent === "grammar";

        return `
            <div class="demo-ai-shell">
                <div class="demo-card-heading">
                    <h3 class="demo-ai-heading">${escapeHtml(aiEntry.title || "AI Explanation")}</h3>
                </div>
                ${isContextual && context ? `
                    <p class="demo-context-used demo-tokenized-context">
                        <strong>Context used:</strong> ${tokenizeContext(context, entry.query)}
                    </p>
                ` : ""}
                <p class="demo-ai-copy">${escapeHtml(aiEntry.intro || "")}</p>
                ${renderIntentBody(aiEntry)}
            </div>
        `;
    }

    function bindDemoPanelEvents() {
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

        $$("#demo-tab-panel [data-demo-listen]").forEach((button) => {
            button.addEventListener("click", () => {
                button.textContent = "Playing…";
                window.setTimeout(() => {
                    button.textContent = "Listen";
                }, 680);
            });
        });

        $$("#demo-tab-panel [data-demo-practice]").forEach((button) => {
            button.addEventListener("click", () => {
                button.disabled = true;
                button.textContent = "Listening…";
                window.setTimeout(() => {
                    state.practiceLabel = "Excellent · 95%";
                    renderDemo();
                }, 1100);
            });
        });

        $$("#demo-tab-panel [data-demo-lookup]").forEach((button) => {
            button.addEventListener("click", () => {
                const lookup = button.dataset.demoLookup;
                const matchingPreset = $$(".preset-btn").find((preset) => {
                    const query = (preset.dataset.query || "").toLowerCase();
                    return query === lookup || query.split(/\s+/).includes(lookup);
                });
                if (matchingPreset) matchingPreset.click();
            });
        });
    }

    function renderDemo() {
        const panel = $("#demo-tab-panel");
        const contextBar = $("#demo-context-bar");
        const entry = getCurrentEntry();
        if (!panel || !contextBar) return;

        panel.setAttribute("aria-labelledby", state.tab === "dictionary" ? "tab-btn-dict" : "tab-btn-ai");
        panel.innerHTML = state.tab === "dictionary" ? renderDictionary(entry) : renderAi(entry);
        contextBar.hidden = state.tab !== "ai";
        bindDemoPanelEvents();
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
            const isActive = button.dataset.intent === intent;
            button.classList.toggle("active", isActive);
            button.setAttribute("aria-pressed", String(isActive));
            const dotEl = button.querySelector(".demo-progress-dot");
            if (dotEl) {
                dotEl.className = `demo-progress-dot ${isActive ? "is-active" : "is-ready"}`;
                dotEl.textContent = "";
            }
        });
        if (state.tab === "ai") renderDemo();
    }

    function setQuery(query, tab, intent) {
        const entry = demoData[query];
        if (!entry) return;
        state.query = query;
        state.practiceLabel = "";
        $("#demo-search-input").value = entry.query;
        $("#demo-context-input").value = entry.context;
        $$(".preset-btn").forEach((button) => {
            const sameQuery = button.dataset.query === query;
            const sameTab = (button.dataset.tab || "dictionary") === (tab || entry.tab || "dictionary");
            const sameIntent = (button.dataset.intent || "") === (intent || entry.intent || "");
            button.classList.toggle("active", sameQuery && sameTab && sameIntent);
        });
        setIntent(intent || entry.intent || "default");
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
                $$(".section-header, .card, .interactive-stage, .arch-diagram-card, .table-card, .code-showcase, .doc-link-card, .cta-card, .user-journey-step, .install-step, .benefit-card, .ai-action-card, .faq-item").forEach((element) => {
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
