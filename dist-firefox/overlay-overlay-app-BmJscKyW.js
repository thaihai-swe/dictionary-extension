var Xt = Object.defineProperty;
var Jt = (e, t, n) => t in e ? Xt(e, t, { enumerable: !0, configurable: !0, writable: !0, value: n }) : e[t] = n;
var Qe = (e, t, n) => Jt(e, typeof t != "symbol" ? t + "" : t, n);
import { r as x, j as r, R as en, c as tn } from "./overlay-react-core-BJZCkGtm.js";
function N(e) {
  let t = e;
  const n = /* @__PURE__ */ new Set();
  return {
    get value() {
      return t;
    },
    set value(a) {
      Object.is(t, a) || (t = a, n.forEach((i) => i()));
    },
    subscribe(a) {
      return n.add(a), () => {
        n.delete(a);
      };
    }
  };
}
function R(e) {
  return x.useSyncExternalStore(e.subscribe, () => e.value, () => e.value);
}
function nn(e, t) {
  return x.useSyncExternalStore(
    e.subscribe,
    () => t(e.value),
    () => t(e.value)
  );
}
const rn = [
  "default",
  "explain_in_context",
  "grammar",
  "phrase_fallback",
  "sentence_breakdown",
  "phrase_explorer",
  "collocations",
  "compare_confusables",
  "confusables",
  "rephrase",
  "rewrite"
], an = {
  default: ["wordFamily"],
  grammar: ["learnerMistakes"],
  collocations: ["collocations"],
  explain_in_context: [],
  sentence_breakdown: [],
  confusables: [],
  rephrase: [],
  rewrite: [],
  phrase_fallback: []
}, on = [
  "explain_in_context",
  "grammar",
  "collocations",
  "sentence_breakdown",
  "confusables",
  "rephrase"
], vt = ["default", ...on], Da = [...vt], sn = new Set(vt);
function bt(e) {
  if (!Array.isArray(e)) return [];
  const t = /* @__PURE__ */ new Set(), n = [];
  for (const a of e) {
    const i = String(a || "").trim();
    !sn.has(i) || t.has(i) || (t.add(i), n.push(i));
  }
  return n;
}
function ln(e) {
  return Array.isArray(e.preloadedAiIntents) ? bt(e.preloadedAiIntents) : e.enableAiPreload ? ["default"] : [];
}
function Oa(e, t) {
  return bt(e == null ? void 0 : e.preloadedAiIntents).includes(wt(t));
}
function wt(e) {
  return e === "phrase_explorer" ? "collocations" : e === "compare_confusables" ? "confusables" : e && rn.includes(e) ? e : "default";
}
function Ba(e) {
  return an[wt(e)];
}
const cn = `Act as an expert lexicographer and language educator. Provide a focused, educational breakdown of "{{str}}".

Use simple, high-frequency vocabulary in the Oxford Learner's Dictionaries style.

Language policy:
{{languagePolicy}}

Formatting:
- {{markdownL3}}
- Do not include a synonyms list, antonyms list, or memory aids; those are covered elsewhere.

Start with a short untitled intro: **{{str}}** [IPA pronunciation] *part of speech*, then a concise Oxford-style definition with no introductory phrases.

### Senses & Meanings
List the primary senses as numbered bullets in this exact format:
1. *(pos)* English definition — {{targetLang}} gloss
Use one bullet per sense. Mark the sense that matches the surrounding context with **in context** after the gloss when context is present. Limit to 4 senses.

### Translation & Meaning
Provide accurate, natural translation(s) of "{{str}}" into {{targetLang}}. If the word has distinct primary senses or parts of speech, list each with its corresponding translation and a brief explanation in {{targetLang}}. Put the translation only in this section.

### Usage Note
Explain nuance, connotation, or register in 1-3 sentences. Do not list word-family forms, collocations, confusable words, or learner mistakes here.

### Example Sentences
Give 2 realistic examples. For each example use exactly this shape:
{{bilingualExampleShape}}
Never put English and the translation on the same visual style or the same line. The first blockquote is English only; the second blockquote is the {{targetLang}} translation only.

### Deep Understanding
Give the etymology or origin and subtle pragmatic notes for this sense in 1-2 short paragraphs.
Do not list related forms, derivatives, collocations, confusable words, or learner mistakes.
`, un = `Explain the selected text in its surrounding context for a language learner.
Selected text: "{{str}}"
Target language: {{targetLang}}
Surrounding context:
"""
{{context}}
"""

Language policy:
{{languagePolicy}}

Formatting:
- Keep the answer compact and scannable. Do not add a separate translation section or repeat the plain summary.
- {{markdownL3}}
- Do not rephrase the entire context sentence; whole-sentence rewrites belong to Rephrase.
- Do not decompose the whole sentence into clauses; that belongs to Sentence Breakdown.
- Do not list word-family forms, collocations, confusable pairs, or learner mistakes.

### Meaning in Context
Explain what "{{str}}" means specifically in this surrounding sentence, including its contextual translation into {{targetLang}}.

### Role & Quick Test
State the exact grammatical job of "{{str}}" in this sentence in one short sentence. Then give a 1-line rule of thumb or substitution test a learner can use to verify the choice (for example: "If you can replace it with 'influence', use affect").

### Direct Substitutions
Provide 2-3 natural synonyms or phrases that could directly replace "{{str}}" in this specific sentence without altering grammatical structure, each with a brief {{targetLang}} gloss.

### Nuance Lost
Explain in 1-2 sentences what tone, emphasis, or subtle nuance is lost if replaced by a plain synonym.
`, dn = `Analyze the grammatical structure and syntactic slots of the selected text for a language learner.
Selected text: "{{str}}"
Target language: {{targetLang}}
Optional context:
"""
{{context}}
"""

Language policy:
{{languagePolicy}}

Formatting:
- {{markdownL3}}
- Do not include a separate Translation, Summary, or Formality & Tone section.
- Do not decompose the whole sentence into a clause table; that belongs to Sentence Breakdown.
- {{lexicalProfileHeadingBan}}

Include these sections:
### Syntactic Breakdown
Identify the part of speech, grammatical slot / syntactic role in the sentence (e.g. subject complement, transitive verb head, modifier), and dependency relations. If formality or register changes the slot, mention it in one clause here. Do not add a separate heading for formality.

### Pattern Rules
List 1-2 governing syntactic rules or clause patterns for this structure. For each rule, give the pattern formula or definition, then immediately 1 example that illustrates that specific rule. Do not add a separate Short Examples heading. Use this shape for every rule:

- **Pattern formula**: one-sentence definition of the rule
{{bilingualExampleShape}}
`, hn = `Compare and contrast the confusable terms or query "{{str}}" for a language learner.
Target language: {{targetLang}}
Optional context:
"""
{{context}}
"""

Language policy:
{{languagePolicy}}

Formatting:
- {{markdownL3}}
- Do not rewrite the sentence in multiple styles; that belongs to Rephrase.
- Do not list word-family forms, learner mistakes, or a full dictionary definition.

### Core Distinction
Give a 2-sentence rule of thumb explaining the fundamental difference in meaning, register, or grammatical class.

### Comparison Matrix
Compare the terms across 2-3 key dimensions (Function/Meaning, Typical Usage/Register, Common Trap).

### Collocation Divergence
Show 2 distinct natural collocations or phrases for each term to illustrate correct usage.

### Minimal Pairs & Examples
Provide 2 minimal-pair sentence comparisons demonstrating when to choose one over the other. For each pair, give two contrasting English sentences as consecutive blockquotes, then a one-line explanation of the contrast:
> English sentence using the first term
> English sentence using the second term
Then one short sentence explaining the difference.
`, fn = `Rephrase the supplied text or sentence for an English language learner across three distinct stylistic targets.
Original text: "{{sentence}}"
Target language for explanations: {{targetLang}}

Language policy:
{{languagePolicy}}

Formatting:
- Use only Markdown headings at level 3 (###) and blockquotes. Do not use HTML or code fences.
- Do not add a dictionary definition, grammar analysis, collocations, confusable comparison, or sentence breakdown. Only the three rewrite styles.

### Simplified Version
> Rewritten sentence using Oxford 3000 / A2-B1 high-frequency vocabulary.
Brief note in {{targetLang}} explaining why this is easier to read.

### Academic & Formal
> Rewritten sentence suitable for formal essays, academic publications, or business correspondence.
Brief note in {{targetLang}} explaining the elevated register and syntactic choices.

### Native & Idiomatic
> Rewritten sentence using natural native collocations or conversational idioms.
Brief note in {{targetLang}} on the idiomatic flavor.
`, pn = `Analyze the supplied sentence for an English language learner.
Selected query: {{str}}
Sentence to analyze:
"""
{{sentence}}
"""
Target language: {{targetLang}}

Language policy:
{{languagePolicy}}

Return only one valid JSON object. Do not wrap it in Markdown or add commentary.
Use this exact shape:
{
  "sentence": "the sentence being analyzed",
  "translation": "translation into the target language",
  "parts": [{"text": "exact text", "role": "subject|verb phrase|object|modifier|clause|other", "explanation": "short English explanation"}],
  "phrases": [{"text": "exact phrase from the sentence", "type": "phrasal_verb|idiom|collocation|fixed_expression", "meaning": "learner-friendly English meaning", "role": "grammatical function", "example": "short example"}]
}

Rules:
- Analyze only the supplied sentence; never invent surrounding text.
- Write grammatical role explanations and phrase meanings in English. Provide the full-sentence translation in {{targetLang}}.
- Identify the selected query when it appears in the sentence.
- Include only phrases that appear exactly or nearly exactly in the supplied sentence.
- Return an empty phrases array when no phrasal verb, idiom, collocation, or fixed expression is present.
- Do not return learner mistakes, usage notes, or extra commentary; Grammar owns those.
- Keep each explanation concise and suitable for a language learner.
`, mn = `Explore the phrase, idiom, phrasal verb, collocation, or expression "{{str}}" for a language learner.
Target language: {{targetLang}}
Optional context:
"""
{{context}}
"""

Language policy:
{{languagePolicy}}

Formatting:
- Keep the answer concise, accurate, and practical. Use level-3 Markdown headings (###) and bullet lists. Do not use code fences or HTML.
- Do not invent context. If the expression is not idiomatic, explain its preposition patterns and literal usage.
- Do not rewrite the whole sentence in multiple styles; that belongs to Rephrase.
- {{lexicalProfileHeadingBan}}

### Core Meaning
Give the natural meaning and translation into {{targetLang}} first, then explain any literal meaning, image, or word partnerships. If register changes whether a learner should use the expression, add one line here. Do not add a separate heading for register.

### Grammar & Patterns
Show the grammatical pattern, separability for phrasal verbs, required preposition combinations (e.g. depend + on, fond + of), and common variations.

### Natural Examples
Give 2-3 realistic example sentences in context. For each example use exactly this shape:
{{bilingualExampleShape}}
`, gn = `Explain the multi-word phrase or idiom "{{str}}" for a language learner.
Target language: {{targetLang}}

Language policy:
{{languagePolicy}}

Formatting:
- Format using clear markdown subheadings (###) and bullet points. Do not use code fences or HTML.

### Meaning
Provide the natural translation into {{targetLang}} and explain the real-world idiomatic meaning, noting literal meaning only if it differs significantly.

### Usage and Register
Note formality (conversational, formal, idiom).

### Example
Give one realistic English sentence as a blockquote, then its {{targetLang}} translation as the next blockquote:
{{bilingualExampleShape}}

### Related Expressions
List 2-3 related idioms or phrases.
`, xn = `# Master English Editor & IELTS Coach

You are a senior British editor and IELTS coach. Transform the source into polished English while keeping meaning, intent, tense, voice, named entities, numbers, and technical terms. Teach as you edit.

## Extension runtime

This prompt runs inside a Chrome extension rewriter. The user may paste a word, phrase, sentence, email draft, or short paragraph.

Source text to refine:
"""
{{sentence}}
"""
Optional surrounding context (do not rewrite this unless the source is only a fragment that needs it):
"""
{{context}}
"""
Target language for learner notes (Vietnamese glosses, vocabulary lab, translations): {{targetLang}}
Word count of source: {{word_count}}

Runtime rules:
- Never ask questions or wait for confirmation. Infer audience, document type, primary goal, and writing level from the source.
- Treat the source as writing to improve, not a dictionary headword. Rewrite the full supplied text.
- Preserve meaning. Do not invent facts or add a greeting/sign-off the source did not have.
- If a line in context starts with "Style:", bias register toward that request (formal, natural, concise, or casual) while still producing the full educational output.
- Default to Deep Dive. Use Quick Polish only for a single short sentence with no errors beyond spelling: revised blockquote + a 3-bullet Correctness / Clarity / Tone note. Skip remaining sections.
- Write learner-facing notes, vocabulary lab, and translations in {{targetLang}} where Vietnamese / target-language glosses are requested. Keep the refined English itself in English.
- Output Markdown only. Do not wrap the whole answer in a code fence.
- Use \`###\` for section headings and \`####\` for subsections. Headings are titles only — never prefix them with PHASE, numbers, or codes like \`3b\`.
- Do not use \`####\` without a space, and do not write heading markers as body text.
- Put the Revised Text in a blockquote (\`>\`). Use GitHub pipe tables for comparison tables. Use \`---\` only as a thematic break between subsections.

## Editor rules (internal — do not print)

- British English (\`organise\`, \`colour\`, \`centre\`, \`towards\`). Oxford comma only if it prevents ambiguity.
- Infer document type: Email, Technical, Academic/Formal, Casual, IELTS Practice, or General Text (default). Never ask.
- Diagnose first, then revise. Quote the source phrase for every issue. Severity: Critical / Moderate / Minor.
- Prefer active voice, cut redundancy, keep the author's voice unless it hurts clarity.
- Do not change technical jargon unless it is misspelled.
- Omit empty subsections. Skip IELTS Level Up unless the source is academic or exam-like. Skip Alternative Rewrite Options unless a sentence is genuinely ambiguous. Skip Pattern Analysis unless an error repeats.

## Output skeleton

Copy these headings verbatim. Fill with real findings from the source — never leave placeholders like \`[Specific Error]\`.

### 📊 Diagnostic - Issues Identified FIRST

**Before corrections, here are the unclear or problematic areas found:**

#### 🔴 Correctness Issues
Group as Critical / Moderate / Minor. For each: quoted phrase, why, error type.

#### 🟡 Clarity Issues
Critical / Moderate. Quoted phrase, why, clarity score.

#### 🟢 Engagement Issues
High / Medium. Weak vocabulary or repetition, with an upgrade path.

#### 🔵 Delivery Issues
Tone or audience mismatch, only if present.

#### 🔷 Technical & Domain-Specific Terms (Preserved)
Only if technical terms appear.

### 📊 Feedback Summary

- Document Type / Audience / Current Tone / Intended Tone
- Counts: Correctness, Clarity, Engagement, Delivery
- Estimated level and overall clarity score (before → after)

### 🔄 Tone Consistency Matrix

| Section | Current Tone | Intended Tone | Alignment | Adjustment |
| :--- | :--- | :--- | :--- | :--- |
| Opening | | | ✅/❌ | |
| Body | | | ✅/❌ | |
| Closing | | | ✅/❌ | |

### 🖋️ Revised Text (Professional Use)

> Fully polished ready-to-use text. Emails may include subject / greeting / closing only if the source already had them or clearly needs them.

### 📊 Before/After Comparison Table

| Aspect | Original | Revised | Why Changed | Impact |
| :--- | :--- | :--- | :--- | :--- |
| Sentence / Vocabulary / Structure / Tone | | | | |

Keep to the 3–6 most important changes.

### 🔄 Alternative Rewrite Options

Only if a sentence is ambiguous. Option A (direct), B (formal), C (engaging). Each option is a blockquote plus one-line why / best-for. End with a recommendation.

### 🚀 IELTS "Level Up"

Only if academic or exam-like.

| Current (Band 6–7) | Band 8.0+ Alternative | Context & Usage | Why This Upgrade |
| :--- | :--- | :--- | :--- |
| | | | |

### 💡 Key Improvements & Education

Logic & flow; British English conversions; then Vocabulary Lab:

| Word/Structure | {{targetLang}} Meaning | Oxford-style definition | Collocations | Reason Changed |
| :--- | :--- | :--- | :--- | :--- |
| | | | | |

### 🎓 Learning Moment, Pattern Analysis & Examiner's Tip

One grammar rule from the biggest error, with a correct example. Recurring patterns only if they exist. One IELTS progression tip if relevant.

### 🎯 Your Actionable Takeaway

Top 3 future fixes (watch-for / how-to-fix / example). One key habit in a blockquote.

## Quality bar

Every claim quotes the source. Explain why, not only what. Preserve original intent. If the source is unclear, give the most likely revision and add a **Clarification Note**.
`, yn = `- Write instructional explanations, definitions, grammar analyses, usage notes, and etymologies in English.
- Use {{targetLang}} only for translations, bilingual glosses, or when a section explicitly requests explanations in that language.
`, vn = `> English sentence
> {{targetLang}} translation
`, bn = `Use only Markdown headings at level 3 (###), short paragraphs, bullets, and blockquotes. Do not use HTML or code fences. Do not repeat headings.
`, wn = `Do not add Word Family, Related Forms, Derived Forms, Word Formation, Usage Warnings, Confusables, Common Learner Mistakes, Collocations, or Natural Collocations headings; reliable data for those categories belongs in the structured lexical profile.
`;
String(yn).trim();
String(vn).trim();
String(bn).trim();
String(wn).trim();
const Xe = String(cn).trim(), Sn = String(un).trim(), kn = String(dn).trim(), An = String(hn).trim(), Tn = String(fn).trim(), Ln = String(pn).trim(), jn = String(mn).trim();
String(gn).trim();
const En = String(xn).trim(), me = {
  aiPromptTemplate: Xe,
  aiDefaultPromptTemplate: Xe,
  aiContextPromptTemplate: Sn,
  aiGrammarPromptTemplate: kn,
  aiSentencePromptTemplate: Ln,
  aiPhraseExplorerPromptTemplate: jn,
  aiComparePromptTemplate: An,
  aiRephrasePromptTemplate: Tn,
  aiRewritePromptTemplate: En
}, St = [
  "aiApiKey",
  "libreTranslateApiKey",
  "aiRewritePromptTemplate"
], ge = [
  "aiApiKey",
  "libreTranslateApiKey"
], kt = new Set(St), De = new Set(ge);
function At(e) {
  const t = { ...e };
  for (const n of ge) delete t[n];
  return t;
}
function Tt(e) {
  const t = e || {};
  return !!t.hasAiApiKey || !!String(t.aiApiKey ?? "").trim();
}
function Pn(e, t) {
  const n = At({ ...e || {} }), a = t || {};
  return Object.prototype.hasOwnProperty.call(a, "hasAiApiKey") ? n.hasAiApiKey = !!a.hasAiApiKey : n.hasAiApiKey = !!n.hasAiApiKey, Object.prototype.hasOwnProperty.call(a, "aiRewritePromptTemplate") && (n.aiRewritePromptTemplate = a.aiRewritePromptTemplate), n;
}
function Cn(e, t) {
  const n = e || {}, a = t || {}, i = { ...n, ...a };
  for (const o of ge) {
    const s = a[o], l = n[o];
    !String(s ?? "").trim() && String(l ?? "").trim() && (i[o] = l);
  }
  return i;
}
const Lt = "https://generativelanguage.googleapis.com/v1beta/openai", In = "http://localhost:20128/v1", jt = "gemini-3.5-flash-lite", Nn = "";
function Ua(e) {
  return (e == null ? void 0 : e.aiProvider) === "openai";
}
function Mn(e) {
  return e === "openai" ? Nn : jt;
}
function _n(e) {
  return e === "openai" ? In : Lt;
}
const Rn = /* @__PURE__ */ new Set([
  "free_dictionary",
  "google_translate",
  "wiktionary",
  "wiktionary_bilingual",
  "datamuse",
  "rhymebrain",
  "urban_dictionary"
]), E = {
  theme: "dark",
  textSize: "comfortable",
  selectionTriggerMode: "icon",
  postSelectionModifier: "shift",
  enableContextMenuTrigger: !0,
  defaultTab: "dictionary",
  translateTargetLanguage: "Vietnamese",
  customLanguages: "Vietnamese, English, Chinese, Japanese, Korean, French, German, Spanish",
  translateProvider: "google",
  libreTranslateBaseUrl: "https://libretranslate.com",
  libreTranslateApiKey: "",
  dictionaryProvider: "wiktionary",
  popupWidth: 620,
  popupHeight: 720,
  enableTranslate: !0,
  enableDictionary: !0,
  enableLexicalProfile: !0,
  enableAI: !0,
  enableAiPreload: !1,
  persistLookupCache: !0,
  preloadedAiIntents: [],
  enablePhraseFallback: !0,
  disablePageContextExtraction: !1,
  pausedHostnames: [],
  pronunciationRate: 0.95,
  pronunciationVoiceURI: "",
  aiProvider: "gemini",
  aiBaseUrl: Lt,
  aiApiKey: "",
  hasAiApiKey: !1,
  aiModel: jt,
  ...me
}, Et = Object.keys(E).filter((e) => !kt.has(e)), Dn = [...Et];
function On(e) {
  const t = Array.isArray(e) ? e : String(e || "").split(/[\n,]/), n = /* @__PURE__ */ new Set(), a = [];
  for (const i of t) {
    let o = String(i || "").trim().toLowerCase();
    if (o = o.replace(/^[a-z]+:\/\//, "").replace(/\/.*$/, "").replace(/:\d+$/, ""), !(!o || n.has(o)) && (n.add(o), a.push(o), a.length >= 100))
      break;
  }
  return a;
}
function Ne(e, t, n, a) {
  const i = Number(e);
  return Number.isFinite(i) ? Math.min(n, Math.max(t, i)) : a;
}
function xe(e) {
  const t = e || {}, n = {
    ...E,
    ...t
  };
  n.pausedHostnames = On(n.pausedHostnames), n.pronunciationRate = Ne(n.pronunciationRate, 0.5, 1.5, 0.95), n.popupWidth = Math.round(Ne(n.popupWidth, 360, 1e3, 620)), n.popupHeight = Math.round(Ne(n.popupHeight, 380, 900, 720)), n.libreTranslateBaseUrl = String(n.libreTranslateBaseUrl || E.libreTranslateBaseUrl).trim().replace(/\/+$/, "") || E.libreTranslateBaseUrl, n.pronunciationVoiceURI = String(n.pronunciationVoiceURI || "").trim();
  const a = String(n.selectionTriggerMode || "").trim().toLowerCase();
  n.selectionTriggerMode = a === "off" || a === "direct" || a === "icon" ? a : E.selectionTriggerMode;
  const i = String(n.textSize || "").trim().toLowerCase();
  n.textSize = i === "small" || i === "large" || i === "comfortable" ? i : E.textSize;
  const o = String(n.postSelectionModifier || "").trim().toLowerCase();
  n.postSelectionModifier = o === "alt" || o === "ctrl" || o === "shift" ? o : E.postSelectionModifier, n.enableContextMenuTrigger = !!n.enableContextMenuTrigger, n.enableTranslate = !!n.enableTranslate, n.enableDictionary = !!n.enableDictionary, n.enableLexicalProfile = n.enableLexicalProfile !== !1, n.enableAI = !!n.enableAI, n.persistLookupCache = n.persistLookupCache !== !1;
  const s = t || {};
  n.preloadedAiIntents = ln(s), n.enableAiPreload = n.preloadedAiIntents.length > 0, n.enablePhraseFallback = n.enablePhraseFallback !== !1, n.disablePageContextExtraction = !!n.disablePageContextExtraction, n.hasAiApiKey = Tt(n);
  const l = String(n.aiProvider || "").trim().toLowerCase();
  n.aiProvider = l === "openai" ? "openai" : "gemini", n.aiBaseUrl = String(s.aiBaseUrl || "").trim().replace(/\/+$/, "") || _n(n.aiProvider), String(s.aiModel || "").trim() || (n.aiModel = Mn(n.aiProvider));
  const c = String(n.dictionaryProvider || "").trim();
  n.dictionaryProvider = Rn.has(c) ? c : E.dictionaryProvider;
  for (const u of Object.keys(me))
    String(n[u] || "").trim() || (n[u] = me[u]);
  return n;
}
function Bn(e) {
  return At({ ...e || {} });
}
async function Un() {
  if (typeof chrome > "u" || !chrome.storage)
    return xe({ ...E, ...me });
  const [e, t] = await Promise.all([
    chrome.storage.sync.get([...Dn, ...ge]),
    chrome.storage.local.get([...St, "hasAiApiKey"])
  ]), n = Cn(e || {}, t || {}), a = {}, i = [];
  for (const c of ge) {
    Object.prototype.hasOwnProperty.call(e || {}, c) && i.push(c);
    const u = n[c];
    String(u ?? "").trim() && !String((t || {})[c] ?? "").trim() && (a[c] = u);
  }
  Object.keys(a).length && await chrome.storage.local.set(a), i.length && await chrome.storage.sync.remove(i);
  const o = ["dictionaryApiKey", "wordnikApiKey", "wordsApiKey"];
  await chrome.storage.local.remove(o).catch(() => {
  });
  const s = await chrome.storage.local.get(["aiApiKey", "hasAiApiKey"]), l = !!String(s.aiApiKey ?? n.aiApiKey ?? "").trim();
  return n.aiApiKey = s.aiApiKey ?? n.aiApiKey, n.hasAiApiKey = l, (!!(e != null && e.hasAiApiKey) !== l || !!(s != null && s.hasAiApiKey) !== l) && await Promise.all([
    chrome.storage.sync.set({ hasAiApiKey: l }),
    chrome.storage.local.set({ hasAiApiKey: l })
  ]), xe({
    ...me,
    ...n
  });
}
async function Kn() {
  if (typeof chrome > "u" || !chrome.storage)
    return xe(Bn(E));
  const [e, t] = await Promise.all([
    chrome.storage.sync.get(Et),
    chrome.storage.local.get(["hasAiApiKey", "aiRewritePromptTemplate"])
  ]);
  return xe(Pn(e || {}, t || {}));
}
async function Fn(e) {
  if (typeof chrome > "u" || !chrome.storage) return;
  const t = {}, n = {};
  for (const [i, o] of Object.entries(e))
    i in E && (kt.has(i) ? n[i] = o : t[i] = o);
  if (Object.prototype.hasOwnProperty.call(n, "aiApiKey")) {
    const i = !!String(n.aiApiKey ?? "").trim();
    t.hasAiApiKey = i, n.hasAiApiKey = i;
  } else
    delete t.hasAiApiKey;
  const a = [];
  Object.keys(t).length && a.push(chrome.storage.sync.set(t)), Object.keys(n).length && a.push(chrome.storage.local.set(n)), a.length && await Promise.all(a);
}
const Wn = {
  load: ({ includeSecrets: e = !1 } = {}) => e ? Un() : Kn(),
  save: Fn
}, zn = /* @__PURE__ */ new Set([
  "dictionaryProvider",
  "enableDictionary",
  "enableTranslate",
  "enablePhraseFallback",
  "enableLexicalProfile",
  "enableAI",
  "persistLookupCache",
  "translateTargetLanguage",
  "translateProvider",
  "libreTranslateBaseUrl",
  "libreTranslateApiKey",
  "aiApiKey",
  "hasAiApiKey",
  "aiModel",
  "aiBaseUrl",
  "aiPromptTemplate",
  "aiDefaultPromptTemplate",
  "aiContextPromptTemplate",
  "aiGrammarPromptTemplate",
  "aiSentencePromptTemplate",
  "aiPhraseExplorerPromptTemplate",
  "aiComparePromptTemplate",
  "aiRephrasePromptTemplate",
  "aiRewritePromptTemplate"
]);
function Hn(e) {
  return e.some((t) => zn.has(t));
}
const Oe = /* @__PURE__ */ new Set();
function qn(e) {
  return Oe.add(e), () => {
    Oe.delete(e);
  };
}
function Je() {
  var e, t;
  for (const n of Oe)
    try {
      n();
    } catch (a) {
      console.warn("Lookup cache invalidation failed:", a);
    }
  typeof chrome < "u" && ((t = (e = chrome.storage) == null ? void 0 : e.local) != null && t.remove) && chrome.storage.local.remove(["dict_lookup_cache", "ai_lookup_cache"]).catch(() => {
  });
}
const Ce = {
  ACTIVE_TAB: "dict_last_tab",
  ACTIVE_INTENT: "dict_last_intent"
};
function Pt(e) {
  try {
    if (typeof sessionStorage < "u") {
      const t = sessionStorage.getItem(e);
      if (t) return t;
    }
    return typeof localStorage < "u" ? localStorage.getItem(e) : null;
  } catch {
    return null;
  }
}
function Ct(e, t) {
  try {
    typeof sessionStorage < "u" && sessionStorage.setItem(e, t), typeof localStorage < "u" && localStorage.setItem(e, t);
  } catch (n) {
    console.warn("Storage write failed:", n);
  }
}
const re = N({ ...E }), It = N(!1), je = N(Pt(Ce.ACTIVE_TAB) || "dictionary"), et = N(Pt(Ce.ACTIVE_INTENT) || "default");
je.subscribe(() => {
  Ct(Ce.ACTIVE_TAB, je.value);
});
et.subscribe(() => {
  Ct(Ce.ACTIVE_INTENT, et.value);
});
let tt = !1, le = null;
const Vn = new Promise((e) => {
  le = e;
});
function Gn() {
  It.value = !0, le == null || le(), le = null;
}
function $n() {
  return It.value ? Promise.resolve() : Vn;
}
function Be(e) {
  return Array.isArray(e.pausedHostnames) || (typeof e.pausedHostnames == "string" && e.pausedHostnames.trim() ? e.pausedHostnames = e.pausedHostnames.split(`
`).map((t) => t.trim().toLowerCase()).filter(Boolean) : e.pausedHostnames = []), e;
}
function Ue(e, t, n) {
  e[t] = n;
}
function Nt() {
  var e;
  try {
    return typeof window > "u" ? !1 : (((e = window.location) == null ? void 0 : e.pathname) || "").includes("options.html");
  } catch {
    return !1;
  }
}
async function Yn() {
  try {
    if (typeof chrome < "u" && chrome.storage) {
      const t = await Wn.load({ includeSecrets: Nt() });
      return Be(t);
    }
  } catch (t) {
    console.warn("Chrome storage read failed:", t);
  }
  const e = { ...E };
  if (typeof localStorage < "u")
    for (const t of Object.keys(E)) {
      if (De.has(t)) continue;
      const n = localStorage.getItem(`dict_setting_${t}`);
      if (n !== null)
        try {
          Ue(e, t, JSON.parse(n));
        } catch {
          Ue(e, t, n);
        }
    }
  return Be(xe(e));
}
function Zn() {
  tt || (tt = !0, Yn().then((e) => {
    re.value = e, e.persistLookupCache === !1 && Je();
  }).catch((e) => {
    console.warn("Settings load failed:", e);
  }).finally(() => {
    Gn();
  }), typeof chrome < "u" && chrome.storage && chrome.storage.onChanged && chrome.storage.onChanged.addListener((e, t) => {
    if (!Object.keys(e).some((o) => o in E || o === "hasAiApiKey" || De.has(o)))
      return;
    const a = Nt(), i = { ...re.value };
    for (const [o, s] of Object.entries(e))
      De.has(o) && (!a || t !== "local") || o in i && Ue(i, o, s.newValue ?? E[o]);
    a ? i.hasAiApiKey = Tt(i) : "hasAiApiKey" in e && (i.hasAiApiKey = !!e.hasAiApiKey.newValue), Be(i), re.value = i, Hn(Object.keys(e)) && Je();
  }));
}
function Ve() {
  x.useEffect(() => {
    Zn();
  }, []);
}
function Qn() {
  return Ve(), R(re);
}
function Y(e) {
  return Ve(), nn(re, (t) => t[e]);
}
function Xn() {
  return Ve(), R(je);
}
function Mt(e) {
  je.value = e;
}
const ye = re, Jn = "LOOKUP_TEXT", er = "AI_LOOKUP", tr = "LOOKUP_UPDATE", nr = "CANCEL_LOOKUP", rr = "OPEN_OPTIONS", ar = "PLAY_AUDIO", ir = "STOP_AUDIO", or = "SPEAK_TTS", sr = "CLEAR_DICTIONARY_CACHE";
function Ie(e = "req") {
  return `${e}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
function lr() {
  return "dictionary";
}
function cr(e) {
  const t = String(e || "").trim();
  return t ? `ai:${t}` : "ai";
}
function ve(e) {
  var n, a;
  const t = e instanceof Error ? e.message : String(e || "");
  if (/Extension context invalidated|Context is invalidated|can't access dead object/i.test(t)) return !0;
  try {
    return typeof chrome < "u" && !((n = chrome.runtime) != null && n.id) && typeof ((a = chrome.runtime) == null ? void 0 : a.sendMessage) == "function";
  } catch {
    return !0;
  }
}
function Ee(e = "Extension runtime is unavailable.") {
  var t, n;
  try {
    return ((n = (t = chrome.runtime) == null ? void 0 : t.lastError) == null ? void 0 : n.message) || e;
  } catch {
    return e;
  }
}
function Me() {
  return new Error("Extension runtime is unavailable.");
}
const Ke = {
  isAvailable() {
    var e;
    try {
      return typeof chrome < "u" && typeof ((e = chrome.runtime) == null ? void 0 : e.sendMessage) == "function" && !ve();
    } catch {
      return !1;
    }
  },
  send(e) {
    return Ke.isAvailable() ? new Promise((t, n) => {
      try {
        chrome.runtime.sendMessage(e, (a) => {
          const i = Ee("");
          if (i) {
            n(new Error(i));
            return;
          }
          t(a || { ok: !1, error: "Empty runtime response." });
        });
      } catch (a) {
        n(ve(a) ? Me() : a instanceof Error ? a : Me());
      }
    }) : Promise.reject(Me());
  },
  sendNoWait(e) {
    if (Ke.isAvailable())
      try {
        chrome.runtime.sendMessage(e, () => {
          Ee("");
        });
      } catch {
      }
  }
};
async function nt() {
  var e, t;
  if (!(typeof chrome > "u" || !chrome.runtime)) {
    if (typeof chrome.runtime.openOptionsPage == "function")
      try {
        await chrome.runtime.openOptionsPage();
        return;
      } catch {
      }
    try {
      await oe({ type: rr });
    } catch {
      const n = (t = (e = chrome.runtime).getURL) == null ? void 0 : t.call(e, "options.html");
      n && typeof window < "u" && window.open(n, "_blank");
    }
  }
}
function oe(e) {
  return Ke.send(e);
}
function _t(e, t = "Request failed.") {
  if (!(e != null && e.ok)) {
    const n = new Error((e == null ? void 0 : e.error) || t);
    throw n.aborted = /abort/i.test(String((e == null ? void 0 : e.error) || "")), n;
  }
  return e.result;
}
async function ur(e) {
  const t = e.requestId || Ie("dict"), n = await oe({
    type: Jn,
    payload: { ...e, requestId: t }
  });
  return _t(n, `No dictionary definition found for "${e.text}".`);
}
async function dr() {
  try {
    await oe({ type: sr });
  } catch {
  }
}
async function Ka(e) {
  const t = e.requestId || Ie("ai"), n = await oe({
    type: er,
    payload: { ...e, requestId: t, intent: e.intent || "default" }
  });
  return _t(n, "AI lookup failed.");
}
function Rt(e, t) {
  var n;
  if (!(typeof chrome > "u" || typeof ((n = chrome.runtime) == null ? void 0 : n.sendMessage) != "function" || ve()))
    try {
      chrome.runtime.sendMessage({
        type: nr,
        payload: { scope: e, requestId: t }
      }, () => {
        Ee("");
      });
    } catch {
    }
}
function Dt(e) {
  Rt(lr(), e);
}
function Fa(e, t) {
  Rt(cr(e), t);
}
function Ge() {
  var e;
  try {
    return typeof chrome < "u" && typeof ((e = chrome.runtime) == null ? void 0 : e.sendMessage) == "function" && !!chrome.runtime.id && !ve();
  } catch {
    return !1;
  }
}
async function hr(e) {
  if (!Ge()) return !1;
  try {
    const t = await oe({ type: ar, payload: e });
    return !!(t != null && t.ok && t.result !== !1);
  } catch {
    return !1;
  }
}
async function fr(e) {
  if (!Ge()) return !1;
  try {
    const t = await oe({ type: or, payload: e });
    return !!(t != null && t.ok && t.result !== !1);
  } catch {
    return !1;
  }
}
function pr() {
  if (Ge())
    try {
      chrome.runtime.sendMessage({ type: ir, payload: {} }, () => {
        Ee("");
      });
    } catch {
    }
}
function mr(e) {
  var n;
  if (typeof chrome > "u" || !((n = chrome.runtime) != null && n.onMessage) || ve())
    return () => {
    };
  const t = (a) => {
    (a == null ? void 0 : a.type) !== tr || !a.payload || e(a.payload);
  };
  try {
    chrome.runtime.onMessage.addListener(t);
  } catch {
    return () => {
    };
  }
  return () => {
    try {
      chrome.runtime.onMessage.removeListener(t);
    } catch {
    }
  };
}
const _e = /* @__PURE__ */ new Map();
function gr(e) {
  const t = e.requestId || Ie("dict"), n = _e.get(t);
  if (n) return n;
  const a = ur({ ...e, requestId: t }).finally(() => {
    _e.delete(t);
  });
  return _e.set(t, a), a;
}
const xr = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i, yr = /[\u0400-\u04FF\u0600-\u06FF\u0900-\u097F\u0E00-\u0E7F\u3040-\u30FF\u3400-\u9FFF\uAC00-\uD7AF]/, vr = /\b(the|a|an|to|of|in|on|for|and|is|are|was|were|this|that|with|from|will|can|should|would|not|it|you|we|they|i)\b/i, rt = {
  vietnamese: "VI",
  english: "EN",
  chinese: "ZH",
  mandarin: "ZH",
  japanese: "JA",
  korean: "KO",
  french: "FR",
  german: "DE",
  spanish: "ES",
  portuguese: "PT",
  italian: "IT",
  russian: "RU",
  thai: "TH",
  arabic: "AR",
  hindi: "HI",
  indonesian: "ID",
  dutch: "NL",
  polish: "PL",
  turkish: "TR"
};
function Wa(e) {
  const t = String(e || "").trim().toLowerCase();
  return t ? rt[t] ? rt[t] : (t.replace(/[^a-z]/g, "").slice(0, 2) || "TR").toUpperCase() : "TR";
}
function br(e) {
  if (!e) return !1;
  const t = e.toLowerCase();
  return t.includes("example") || t.includes("minimal pair");
}
function wr(e) {
  if (!e) return !1;
  const t = e.toLowerCase();
  return t.includes("pattern rule") || t.includes("pattern rules") || t.includes("pattern") && t.includes("rule") || t.includes("grammar & pattern");
}
function Sr(e) {
  let t = String(e || "").trim();
  t = t.replace(/^([•*-]|\d+[\.)])\s*/, "").trim();
  const n = t.match(/^\*\*(.+?)\*\*[:\s—–-]*(.*)$/);
  if (n) {
    const o = n[1].trim(), s = n[2].trim();
    return {
      title: o || void 0,
      description: s || t
    };
  }
  const a = t.indexOf(":");
  if (a > 1 && a < 60) {
    const o = t.slice(0, a).trim().replace(/^\*\*/, "").replace(/\*\*$/, "").trim(), s = t.slice(a + 1).trim();
    if (s.length > 0)
      return {
        title: o,
        description: s
      };
  }
  const i = t.match(/^([A-Za-z0-9\s+/()_-]{3,50})\s+[—–]\s+(.+)$/);
  return i ? {
    title: i[1].trim(),
    description: i[2].trim()
  } : {
    description: t
  };
}
function kr(e, t = {}) {
  const n = [], a = t.targetLang;
  let i = 0;
  for (; i < e.length; ) {
    const o = e[i], s = String(o || "").trim();
    if (!s) {
      i += 1;
      continue;
    }
    if (Pe(s)) {
      const p = We([o], { exampleSection: !0, targetLang: a });
      n.push(...p), i += 1;
      continue;
    }
    const { title: l, description: c } = Sr(s);
    let u;
    const d = [];
    let f = i + 1;
    for (; f < e.length; ) {
      const p = e[f], v = String(p || "").trim();
      if (!v) {
        f += 1;
        continue;
      }
      if (Pe(v))
        d.push(v), f += 1;
      else
        break;
    }
    if (d.length > 0) {
      const v = We(d, { exampleSection: !0, targetLang: a }).find((w) => w.kind === "example");
      v && v.kind === "example" && (u = {
        english: v.english,
        translation: v.translation
      }), i = f;
    } else
      i += 1;
    n.push({
      kind: "pattern_rule",
      title: l,
      description: c,
      example: u
    });
  }
  return n;
}
function Ar(e) {
  const t = [];
  for (const s of e)
    if (s.exampleSection)
      for (const l of s.items)
        l.kind === "example" && t.push({ english: l.english, translation: l.translation });
  let n = 0;
  const a = e.map((s) => {
    if (!s.patternRulesSection) return s;
    const l = s.items.map((c) => {
      if (c.kind !== "pattern_rule" || c.example || n >= t.length) return c;
      const u = t[n];
      return n += 1, { ...c, example: u };
    });
    return { ...s, items: l };
  });
  if (n === 0) return a;
  let i = 0;
  const o = [];
  for (const s of a) {
    if (!s.exampleSection) {
      o.push(s);
      continue;
    }
    const l = [];
    for (const c of s.items) {
      if (c.kind === "example" && i < n) {
        i += 1;
        continue;
      }
      l.push(c);
    }
    l.length && o.push({ ...s, items: l });
  }
  return o;
}
function za(e, t) {
  if (!e) return [];
  const n = e.trim().split(`
`), a = [];
  let i = "", o = [];
  for (const l of n) {
    const c = l.trim();
    c.startsWith("### ") || c.startsWith("## ") ? ((o.length > 0 || i) && a.push({ title: i, lines: o }), i = c.replace(/^#+\s*/, ""), o = []) : o.push(l);
  }
  (o.length > 0 || i) && a.push({ title: i, lines: o });
  const s = a.map((l) => {
    const c = br(l.title), u = wr(l.title);
    return {
      title: l.title,
      exampleSection: c,
      patternRulesSection: u,
      items: u ? kr(l.lines, { targetLang: t }) : We(l.lines, { exampleSection: c, targetLang: t })
    };
  });
  return Ar(s);
}
function Z(e) {
  let t = String(e || "").trim().replace(/^>\s*/, "");
  const n = [
    ['"', '"'],
    ["“", "”"],
    ["‘", "’"],
    ["'", "'"]
  ];
  for (const [a, i] of n)
    if (t.startsWith(a) && t.endsWith(i) && t.length > 1) {
      t = t.slice(a.length, t.length - i.length).trim();
      break;
    }
  if (t.startsWith("(") && t.endsWith(")") || t.startsWith("（") && t.endsWith("）")) {
    const a = t.slice(1, -1).trim();
    a && !a.includes("(") && !a.includes(")") && (t = a);
  }
  return t;
}
function ae(e) {
  const t = Z(e);
  if (!t || ie(t)) return !1;
  const n = t.match(new RegExp("\\p{L}", "gu")) || [];
  return n.length ? n.filter((i) => /[A-Za-z]/.test(i)).length / n.length >= 0.85 && (vr.test(t) || n.length <= 12) : !1;
}
function ie(e, t) {
  const n = String(e || "").trim().replace(/^>\s*/, "");
  if (!n) return !1;
  if (xr.test(n) || yr.test(n) || /^[（(][^）)]{1,24}[）)]/.test(n) || /^(translation|gloss|nghĩa)\s*[:：]/i.test(n)) return !0;
  const a = String(t || "").trim();
  return !!(a && new RegExp(`^\\(?\\s*${Kt(a)}\\s*\\)?\\s*[:：—-]`, "i").test(n));
}
function Fe(e, t) {
  let n = Z(e);
  n = n.replace(/^(translation|gloss|nghĩa)\s*[:：]\s*/i, "");
  const a = String(t || "").trim();
  return a && (n = n.replace(new RegExp(`^\\(?\\s*${Kt(a)}\\s*\\)?\\s*[:：—-]\\s*`, "i"), "")), n = n.replace(/^[（(][A-Za-z][^）)]{0,24}[）)]\s*/, ""), n.trim();
}
function We(e, t = {}) {
  const n = [], a = !!t.exampleSection, i = t.targetLang;
  let o = 0;
  for (; o < e.length; ) {
    const s = e[o], l = String(s || "").trim();
    if (!l) {
      o += 1;
      continue;
    }
    if (Pe(l)) {
      const c = Z(l);
      if (!c) {
        o += 1;
        continue;
      }
      const u = Ot(c, i);
      if (u.translation) {
        n.push({ kind: "example", english: u.english, translation: u.translation }), o += 1;
        continue;
      }
      const d = u.english, f = Lr(e, o + 1);
      if (f >= 0) {
        const p = String(e[f] || "").trim(), v = Z(p.replace(/^([•*-]\s+)/, ""));
        if (Tr(d, p, v, a, i)) {
          n.push({
            kind: "example",
            english: d,
            translation: Fe(v, i) || void 0
          }), o = f + 1;
          continue;
        }
      }
      n.push(a || ae(d) ? { kind: "example", english: d } : { kind: "quote", text: d }), o += 1;
      continue;
    }
    if (Ut(l)) {
      n.push({ kind: "bullet", text: l.replace(/^([•*-]\s*)/, "") }), o += 1;
      continue;
    }
    n.push({ kind: "paragraph", text: s }), o += 1;
  }
  return n;
}
function Ot(e, t) {
  const n = Z(e), a = n.match(/^(.+?)\s+[（(]([^）)]+)[）)]\s*$/);
  if (a && ae(a[1]) && ie(a[2], t))
    return {
      english: Z(a[1]),
      translation: Fe(a[2], t) || void 0
    };
  const i = n.match(/^(.+?)\s+[—–-]\s+(.+)$/);
  return i && ae(i[1]) && i[2].trim() && (ie(i[2], t) || !ae(i[2])) ? {
    english: Z(i[1]),
    translation: Fe(i[2], t) || void 0
  } : { english: n };
}
function Bt(e, t, n) {
  const a = String(t || "").trim();
  return a ? { english: Z(e), translation: a } : Ot(e, n);
}
function Tr(e, t, n, a, i) {
  return !e || !n || ae(n) && !ie(n, i) ? !1 : ie(t, i) || ie(n, i) ? !0 : a ? !!(Pe(t) || Ut(t) || /^[（(]/.test(t) || !ae(n) && n.length <= 180) : !1;
}
function Pe(e) {
  return e.startsWith(">");
}
function Ut(e) {
  return e.startsWith("•") || e.startsWith("* ") || e.startsWith("- ");
}
function Lr(e, t) {
  for (let n = t; n < e.length; n += 1)
    if (String(e[n] || "").trim()) return n;
  return -1;
}
function Kt(e) {
  return e.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
const jr = 8;
function Er(e) {
  return String(e || "").toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();
}
function at(e) {
  return Er(e).replace(/\s+/g, "");
}
function Pr(e) {
  const t = String(e || "").toLowerCase();
  return t.includes("translation") || t.includes("phrase /");
}
function Cr(e) {
  const t = String((e == null ? void 0 : e.text) || "").trim();
  if (!t) return { text: "" };
  const n = Bt(t, e.translation);
  return n.translation ? { text: n.english, translation: n.translation } : { text: n.english };
}
function it(e) {
  if (e.region && e.region !== "all") return e.region;
  const t = String(e.language || "").toLowerCase();
  if (t.includes("gb")) return "uk";
  if (t.includes("us")) return "us";
}
function Ir(e = [], t = []) {
  const n = e.map((a) => ({ ...a }));
  for (const a of t || []) {
    const i = String(a.text || "").trim(), o = String(a.audio || "").trim(), s = String(a.language || "").trim();
    if (!i && !o) continue;
    const l = it(a), c = at(i), u = n.findIndex((d) => {
      const f = at(String(d.text || ""));
      if (c && f) return c === f;
      const p = it(d);
      return l && p ? l === p : !!(!c && l && p === l || !f && c && l && p === l);
    });
    if (u >= 0) {
      const d = n[u];
      i && !String(d.text || "").trim() && (d.text = i), o && !String(d.audio || "").trim() && (d.audio = o), s && !d.language && (d.language = s), l && (!d.region || d.region === "all") && (d.region = l, d.language = l === "uk" ? "en-GB" : l === "us" ? "en-US" : d.language, d.label = l === "uk" ? "Listen (UK)" : l === "us" ? "Listen (US)" : d.label);
      continue;
    }
    if (n.length >= jr) break;
    n.push({
      ...a,
      text: i,
      audio: o,
      language: s || (l === "uk" ? "en-GB" : l === "us" ? "en-US" : s),
      region: l || a.region
    });
  }
  return n;
}
function Nr(e) {
  var t, n;
  for (const a of e || []) {
    if (!Pr(a.partOfSpeech)) continue;
    const i = String(((n = (t = a.definitions) == null ? void 0 : t[0]) == null ? void 0 : n.definition) || "").trim();
    if (i)
      return {
        translatedText: i
      };
  }
}
function Mr(e) {
  const t = e, n = Ir(e.phonetics), a = (e.meanings || []).map((o) => ({
    ...o,
    definitions: (o.definitions || []).map((s) => {
      if (!s.example) return s;
      const l = Bt(s.example, s.exampleTranslation);
      return {
        ...s,
        example: l.english,
        exampleTranslation: l.translation
      };
    })
  })), i = (e.examples || []).map(Cr).filter((o) => !!o.text);
  return {
    word: String(e.word || "").trim(),
    phonetics: n,
    meanings: a,
    examples: i,
    synonyms: e.synonyms,
    antonyms: e.antonyms,
    lexicalProfile: e.lexicalProfile,
    translation: e.translation || Nr(a),
    sources: t.sources,
    originalText: t.originalText,
    phraseExplanation: e.phraseExplanation,
    enriched: t.enriched,
    revision: t.revision
  };
}
class Ft {
  constructor() {
    Qe(this, "value", 0);
  }
  next() {
    return this.value += 1, this.value;
  }
  invalidate() {
    return this.next();
  }
  isCurrent(t) {
    return t === this.value;
  }
  current() {
    return this.value;
  }
}
const de = new Ft(), _r = 600;
let G = null;
function Rr() {
  de.invalidate(), G && (clearTimeout(G), G = null);
}
function Dr(e, t, n, a = de.current()) {
  var o;
  const i = ye.value;
  !i.enableAI || !((o = i.preloadedAiIntents) != null && o.length) || (G && (clearTimeout(G), G = null), G = setTimeout(() => {
    G = null, (async () => {
      var c;
      if (await $n(), !de.isCurrent(a)) return;
      const s = ye.value;
      if (!s.enableAI || !((c = s.preloadedAiIntents) != null && c.length)) return;
      const { getAiAssistantStore: l } = await import("./overlay-composable.ai-assistant-BpTx9YBJ.js");
      de.isCurrent(a) && await l().preloadIntents(e, n, t);
    })();
  }, _r));
}
const J = N(null), ee = N(!1), Or = 20, ce = /* @__PURE__ */ new Map();
let B = null;
function Wt(e, t = "en-US") {
  return `${String(e || "").trim().toLowerCase()}|${t.toLowerCase()}`;
}
function ot(e) {
  return String(e || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9'\s-]/g, " ").replace(/\s+/g, " ").trim();
}
const st = 120;
function lt(e, t) {
  const n = String(e || "").slice(0, st), a = String(t || "").slice(0, st);
  if (n === a) return 0;
  if (!n.length) return a.length;
  if (!a.length) return n.length;
  let i = new Array(a.length + 1), o = new Array(a.length + 1);
  for (let s = 0; s <= a.length; s += 1) i[s] = s;
  for (let s = 1; s <= n.length; s += 1) {
    o[0] = s;
    for (let c = 1; c <= a.length; c += 1) {
      const u = n.charCodeAt(s - 1) === a.charCodeAt(c - 1) ? 0 : 1;
      o[c] = Math.min(i[c] + 1, o[c - 1] + 1, i[c - 1] + u);
    }
    const l = i;
    i = o, o = l;
  }
  return i[a.length];
}
function Br(e, t) {
  const n = ot(e), a = ot(t);
  if (!n || !a)
    return { score: 0, grade: "retry", gradeLabel: "Try again", spoken: "", details: [] };
  const i = n.split(/\s+/).filter(Boolean), o = a.split(/\s+/).filter(Boolean), s = [...o], l = i.map((m) => {
    const g = s.indexOf(m);
    if (g >= 0)
      return s.splice(g, 1), { word: m, matched: !0 };
    const S = o.some(
      (L) => lt(m, L) <= Math.max(1, Math.floor(m.length * 0.3))
    );
    return { word: m, matched: !1, closeMatch: S };
  }), c = l.filter((m) => m.matched).length, u = i.length > 0 ? Math.round(c / i.length * 100) : 0, d = lt(n, a), f = Math.max(n.length, a.length, 1), p = Math.max(0, Math.round((1 - d / f) * 100)), v = Math.max(u, p), w = v >= 90 ? "excellent" : v >= 70 ? "good" : v >= 50 ? "almost" : "retry";
  return { score: v, grade: w, gradeLabel: w === "excellent" ? "Excellent" : w === "good" ? "Good" : w === "almost" ? "Almost there" : "Try again", spoken: a, details: l };
}
function Ur(e) {
  return e === "not-allowed" || e === "service-not-allowed" ? "Microphone permission denied." : e === "no-speech" ? "No speech detected. Try again." : e === "audio-capture" ? "No microphone found." : e === "network" ? "Speech recognition network error." : e === "aborted" ? null : "Speech recognition failed.";
}
function Kr() {
  if (typeof window > "u") return !1;
  const e = window;
  return !!(e.SpeechRecognition || e.webkitSpeechRecognition);
}
function Fr(e, t = "en-US") {
  return ce.get(Wt(e, t)) || null;
}
function Wr(e) {
  var t;
  if (B) {
    try {
      ((t = B.abort) == null ? void 0 : t.call(B)) ?? B.stop();
    } catch {
    }
    B = null;
  }
  ee.value = !1, e.value === "practice" && (e.value = null);
}
function zr(e, t, n) {
  if (typeof window > "u") {
    J.value = { score: 0, grade: "retry", gradeLabel: "Practice needs Chrome speech recognition." };
    return;
  }
  const a = window, i = a.SpeechRecognition || a.webkitSpeechRecognition;
  if (!i) {
    J.value = { score: 0, grade: "retry", gradeLabel: "Practice needs Chrome speech recognition." };
    return;
  }
  const o = new i();
  o.lang = t, o.interimResults = !1, o.maxAlternatives = 1, o.continuous = !1, ee.value = !0, n.value = "practice", o.onresult = (s) => {
    var u, d, f;
    const l = ((f = (d = (u = s.results) == null ? void 0 : u[0]) == null ? void 0 : d[0]) == null ? void 0 : f.transcript) || "", c = Br(e, l);
    for (J.value = c, ce.set(Wt(e, t), c); ce.size > Or; ) {
      const p = ce.keys().next().value;
      if (p === void 0) break;
      ce.delete(p);
    }
    ee.value = !1, n.value = null, B = null;
  }, o.onerror = (s) => {
    const l = Ur(String((s == null ? void 0 : s.error) || ""));
    ee.value = !1, n.value = null, B = null, l && (J.value = { score: 0, grade: "retry", gradeLabel: l });
  }, o.onend = () => {
    ee.value = !1, n.value === "practice" && (n.value = null), B = null;
  }, B = o;
  try {
    o.start();
  } catch {
    ee.value = !1, n.value = null, B = null, J.value = { score: 0, grade: "retry", gradeLabel: "Unable to start speech recognition." };
  }
}
const I = N(!1), k = N(null);
let _ = null, $ = null, ze = 0;
function Hr(e, t = "en-US") {
  const n = String(e || "").trim();
  if (!n) return "";
  const a = String(t || "en-US").toLowerCase().startsWith("en-gb") ? "en-GB" : "en";
  return `https://translate.googleapis.com/translate_tts?client=gtx&ie=UTF-8&tl=${encodeURIComponent(a)}&q=${encodeURIComponent(n)}`;
}
function Q() {
  if (ze += 1, I.value = !1, Wr(k), k.value = null, pr(), $ && (clearTimeout($), $ = null), typeof window < "u" && "speechSynthesis" in window && window.speechSynthesis.cancel(), _) {
    try {
      _.pause(), _.removeAttribute("src"), _.load();
    } catch {
    }
    _ = null;
  }
}
async function ct(e, t = 1) {
  return await hr({ url: e, rate: t }) ? !0 : new Promise((a) => {
    const i = new Audio(e);
    _ = i, i.playbackRate = Number.isFinite(t) && t > 0 ? t : 1;
    let o = !1;
    const s = () => {
      i.removeEventListener("ended", c), i.removeEventListener("error", u), _ === i && (_ = null);
    }, l = (d) => {
      o || (o = !0, s(), a(d));
    }, c = () => l(!0), u = () => l(!1);
    i.addEventListener("ended", c, { once: !0 }), i.addEventListener("error", u, { once: !0 }), i.play().catch(() => l(!1));
  });
}
function zt(e, t = "us", n) {
  const a = n || k.value || (t === "uk" ? "en-GB" : "en-US"), i = ye.value;
  k.value = a, I.value = !0, fr({
    text: e,
    lang: t === "uk" ? "en-GB" : "en-US",
    rate: i.pronunciationRate || 0.95,
    voiceURI: i.pronunciationVoiceURI
  }).then((o) => {
    if (o) {
      k.value === a && (k.value = null, I.value = !1);
      return;
    }
    qr(e, t, a);
  });
}
function qr(e, t = "us", n) {
  if ($ && (clearTimeout($), $ = null), _) {
    try {
      _.pause(), _.currentTime = 0;
    } catch {
    }
    _ = null;
  }
  if (!e || typeof window > "u" || !("speechSynthesis" in window)) {
    I.value = !1, k.value = null;
    return;
  }
  const a = n;
  k.value = a, I.value = !0, typeof window.speechSynthesis.cancel == "function" && window.speechSynthesis.cancel();
  const i = ye.value;
  $ = setTimeout(() => {
    $ = null;
    try {
      window.speechSynthesis.paused && window.speechSynthesis.resume();
      const o = new SpeechSynthesisUtterance(e);
      if (o.lang = t === "uk" ? "en-GB" : "en-US", o.rate = i.pronunciationRate || 0.95, i.pronunciationVoiceURI) {
        const l = window.speechSynthesis.getVoices().find((c) => c.voiceURI === i.pronunciationVoiceURI);
        l && (o.voice = l);
      }
      o.onstart = () => {
        I.value = !0, k.value = a;
      }, o.onend = () => {
        k.value === a && (k.value = null, I.value = !1);
      }, o.onerror = () => {
        k.value === a && (k.value = null, I.value = !1);
      }, window.speechSynthesis.speak(o), window.speechSynthesis.paused && window.speechSynthesis.resume();
    } catch {
      k.value = null, I.value = !1;
    }
  }, 60);
}
async function Vr(e, t, n = "us", a = n === "uk" ? "en-GB" : "en-US", i = a) {
  Q();
  const o = ++ze, s = String(t || "").trim();
  k.value = i, I.value = !0;
  const l = () => o === ze, c = () => {
    l() && k.value === i && (k.value = null, I.value = !1);
  }, u = String(e || "").trim();
  if (u) {
    const f = await ct(u);
    if (!l()) return;
    if (f) {
      c();
      return;
    }
  }
  const d = Hr(s, a);
  if (d && typeof navigator < "u" && navigator.onLine !== !1) {
    const f = await ct(d);
    if (!l()) return;
    if (f) {
      c();
      return;
    }
  }
  l() && zt(s, n, i);
}
function Gr(e, t = "en-US") {
  Q(), zr(e, t, k);
}
function Ht(e) {
  const t = /* @__PURE__ */ new Map(), n = /* @__PURE__ */ new Map(), a = e.estimateSize || (() => 0), i = e.maxBytes ?? Number.POSITIVE_INFINITY;
  let o = 0;
  function s(c) {
    return t.has(c) ? (t.delete(c), o = Math.max(0, o - (n.get(c) || 0)), n.delete(c), !0) : !1;
  }
  function l() {
    for (; t.size > e.maxSize || o > i; ) {
      const c = t.keys().next().value;
      if (c === void 0) break;
      s(c);
    }
  }
  return {
    get size() {
      return t.size;
    },
    get(c) {
      const u = t.get(c);
      if (u !== void 0)
        return t.delete(c), t.set(c, u), u;
    },
    has(c) {
      return t.has(c);
    },
    set(c, u) {
      s(c), t.set(c, u);
      const d = Math.max(0, a(u));
      n.set(c, d), o += d, l();
    },
    delete: s,
    clear() {
      t.clear(), n.clear(), o = 0;
    },
    entries() {
      return t.entries();
    }
  };
}
function $r(e) {
  let t = 2166136261;
  const n = String(e || "");
  for (let a = 0; a < n.length; a += 1)
    t ^= n.charCodeAt(a), t = Math.imul(t, 16777619);
  return `${(t >>> 0).toString(16).padStart(8, "0")}_${n.length.toString(16)}`;
}
function ke() {
  var e, t;
  try {
    return typeof chrome < "u" && typeof ((t = (e = chrome.storage) == null ? void 0 : e.local) == null ? void 0 : t.get) == "function";
  } catch {
    return !1;
  }
}
function Ha(e) {
  const t = e.persistDelayMs ?? 1500, n = e.maxBytes ?? Number.POSITIVE_INFINITY, a = Ht({
    maxSize: e.maxSize,
    maxBytes: n,
    estimateSize: (m) => u(m.value)
  });
  let i = !1, o = null, s = !1, l = !1, c = 0;
  function u(m) {
    try {
      return JSON.stringify(m).length * 2;
    } catch {
      return 0;
    }
  }
  function d() {
    return e.isPersistenceEnabled ? e.isPersistenceEnabled() : !0;
  }
  function f() {
    const m = Date.now();
    for (const [g, S] of a.entries())
      m - S.createdAt > e.ttlMs && a.delete(g);
  }
  function p() {
    if (!ke() || !s) return;
    if (s = !1, !d()) {
      Promise.resolve(chrome.storage.local.remove(e.storageKey)).catch(() => {
      });
      return;
    }
    f();
    const m = {};
    for (const [g, S] of a.entries())
      e.shouldPersist && !e.shouldPersist(S.value) || (m[g] = S);
    Promise.resolve(chrome.storage.local.set({ [e.storageKey]: m })).catch(() => {
    });
  }
  function v() {
    if (ke()) {
      if (!d()) {
        s = !1, o && (clearTimeout(o), o = null), Promise.resolve(chrome.storage.local.remove(e.storageKey)).catch(() => {
        });
        return;
      }
      s = !0, o && clearTimeout(o), o = setTimeout(() => {
        o = null, p();
      }, t);
    }
  }
  function w() {
    if (l || typeof window > "u") return;
    l = !0;
    const m = () => p();
    window.addEventListener("pagehide", m), document.addEventListener("visibilitychange", () => {
      document.visibilityState === "hidden" && m();
    });
  }
  function T() {
    if (i) return;
    i = !0;
    const m = c;
    w(), !(!ke() || !d()) && Promise.resolve(chrome.storage.local.get(e.storageKey)).then((g) => {
      if (m !== c) return;
      const S = g == null ? void 0 : g[e.storageKey];
      if (!S || typeof S != "object") return;
      const L = Date.now();
      for (const [j, y] of Object.entries(S))
        !(y != null && y.value) || L - y.createdAt > e.ttlMs || a.has(j) || a.set(j, y);
      f();
    }).catch(() => {
    });
  }
  return T(), {
    read(m) {
      const g = a.get(m);
      if (g) {
        if (Date.now() - g.createdAt > e.ttlMs) {
          a.delete(m);
          return;
        }
        return g.value;
      }
    },
    write(m, g) {
      a.set(m, { value: g, createdAt: Date.now() }), f(), v();
    },
    flush() {
      o && (clearTimeout(o), o = null), p();
    },
    clear() {
      c += 1, a.clear(), s = !1, o && (clearTimeout(o), o = null), ke() && Promise.resolve(chrome.storage.local.remove(e.storageKey)).catch(() => {
      });
    }
  };
}
const Yr = 16, Zr = 30 * 60 * 1e3, Ae = Ht({
  maxSize: Yr,
  maxBytes: 1024 * 1024,
  estimateSize: (e) => {
    try {
      return JSON.stringify(e).length * 2;
    } catch {
      return 0;
    }
  }
}), Te = /* @__PURE__ */ new Map(), ue = {
  read(e) {
    const t = Te.get(e);
    if (!t || Date.now() - t > Zr) {
      Ae.delete(e), Te.delete(e);
      return;
    }
    return Ae.get(e);
  },
  write(e, t) {
    Ae.set(e, t), Te.set(e, Date.now());
  },
  clear() {
    Ae.clear(), Te.clear();
  }
}, he = /* @__PURE__ */ new Map(), fe = /* @__PURE__ */ new Map();
function Qr(e, t, n, a) {
  return $r(`${e.toLowerCase().trim()}|${n.toLowerCase()}|${a.toLowerCase()}|${t.translateProvider || ""}|${!!t.enableTranslate}|${!!t.enableDictionary}|${!!t.enablePhraseFallback}|${t.enableLexicalProfile !== !1}`);
}
function Xr(e, t) {
  if (!e || e.revision !== t.baseRevision) return null;
  if (e.revision >= t.revision) return e;
  const n = {
    ...e,
    ...t.patch.changed,
    revision: t.revision
  };
  for (const a of t.patch.removed || [])
    delete n[a];
  return n;
}
const be = N(""), C = N(null), pe = N(!1), W = N(!1), He = N(null);
let z = null;
const V = new Ft();
let O = null;
function Jr() {
  $e(), ue.clear(), dr(), he.clear(), fe.clear();
}
qn(Jr);
function $e() {
  Q(), O == null || O(), O = null, V.invalidate(), Rr(), z && (Dt(z), z = null), he.clear(), fe.clear(), pe.value = !1, W.value = !1;
}
function ea(e = be.value, t = "en-US") {
  Gr(e, t);
}
function qt(e, t, n = "us", a = n === "uk" ? "en-GB" : "en-US", i = a) {
  return Vr(e, t || be.value, n, a, i);
}
function ta(e) {
  const t = e.language || "en-US", n = t.toLowerCase().includes("gb") ? "uk" : "us", a = e.key || t;
  qt(e.audioUrl, e.text || be.value, n, t, a);
}
async function na(e, t, n, a, i) {
  var ne;
  if (!e || !e.trim()) return;
  Q();
  const o = de.next();
  import("./overlay-composable.ai-assistant-BpTx9YBJ.js").then(({ cancelAiPreload: b }) => b()).catch(() => {
  });
  const s = e.trim(), l = ye.value, c = t || l.dictionaryProvider || "wiktionary", u = n || l.translateTargetLanguage || "Vietnamese";
  Dr(s, u, a, o);
  const d = {
    ...l
  }, f = Qr(s, d, c, u), p = he.get(f), v = i || (p ? fe.get(f) : void 0);
  !p && !i && z && (Dt(z), z = null), O == null || O(), O = null;
  const w = V.next(), T = v || Ie("dict");
  z = T, be.value = s, He.value = null, J.value = Fr(s) || null;
  const m = ue.read(f), g = m ? Mr(m) : null;
  if (C.value = g, pe.value = !g, W.value = !!g && !(g != null && g.enriched), g != null && g.enriched && !i) {
    W.value = !1;
    return;
  }
  let S = null, L = null, j = 0, y = !1;
  const H = () => {
    var M;
    if (j = 0, !V.isCurrent(w)) {
      L = null;
      return;
    }
    if (!L) return;
    const b = L;
    L = null, !((((M = C.value) == null ? void 0 : M.revision) || 0) > (b.revision || 0)) && (C.value = b, pe.value = !1, W.value = !b.enriched, ue.write(f, b), b.enriched && (W.value = !1, X()));
  }, F = mr((b) => {
    var we;
    if (!V.isCurrent(w) || b.requestId !== T || b.source !== "dictionary") return;
    const M = b.kind === "patch" ? Xr(C.value, b) : b.result;
    M && ((((we = C.value) == null ? void 0 : we.revision) || 0) > (M.revision || 0) || (L = M, typeof requestAnimationFrame == "function" ? j || (j = requestAnimationFrame(H)) : H()));
  }), X = () => {
    y || (y = !0, S && (clearTimeout(S), S = null), j && (cancelAnimationFrame(j), j = 0), L = null, F(), O === X && (O = null));
  };
  O = X;
  const U = p || gr({
    text: s,
    context: a,
    ...i ? {} : { provider: c, targetLang: u },
    requestId: T
  });
  p || (he.set(f, U), fe.set(f, T));
  try {
    const b = await U;
    if (!V.isCurrent(w)) return;
    (((ne = C.value) == null ? void 0 : ne.revision) || 0) < (b.revision || 0) || !C.value ? (C.value = b, ue.write(f, b)) : g || ue.write(f, C.value);
  } catch (b) {
    if (b instanceof Error && (/abort/i.test(b.message) || b.name === "AbortError") || !V.isCurrent(w)) return;
    const M = b instanceof Error ? b.message : "Không tìm thấy dữ liệu từ điển.";
    He.value = /Extension context invalidated|runtime is unavailable/i.test(M) ? "Extension was reloaded. Refresh this page and try again." : M, C.value = null;
  } finally {
    V.isCurrent(w) && (he.delete(f), fe.delete(f), pe.value = !1, !C.value || C.value.enriched ? W.value = !1 : W.value = !0, z === T && (z = null));
  }
  y || (S = setTimeout(() => {
    V.isCurrent(w) && (W.value = !1, X());
  }, 2e4));
}
function ra() {
  const e = R(C), t = R(pe), n = R(W), a = R(He);
  return { result: e, isLoading: t, isEnriching: n, error: a };
}
function qa() {
  const e = R(I), t = R(k);
  return {
    isAudioPlaying: e,
    playingKey: t,
    playAudio: qt,
    playPronunciation: ta,
    speakTTS: zt,
    stopAllAudio: Q
  };
}
function Va() {
  const e = R(J), t = R(ee);
  return {
    practiceResult: e,
    isPracticing: t,
    startSpeechPractice: ea,
    supportsSpeechPractice: Kr()
  };
}
function aa() {
  return R(be);
}
let Le = null;
function Ga(e) {
  Le = e;
}
function ia() {
  Le == null || Le();
}
function oa(e) {
  return {
    abortAllLookups() {
      e.stopAudio(), e.abortDictionary(), e.abortAi();
    },
    switchTab(t) {
      if (e.stopAudio(), t === "ai_assistant" && e.getSettings().enableAI === !1) {
        e.setActiveTab("dictionary");
        return;
      }
      e.setActiveTab(t);
    }
  };
}
function sa() {
  const e = Qn();
  return oa({
    getSettings: () => e,
    setActiveTab: Mt,
    stopAudio: Q,
    abortDictionary: $e,
    abortAi: ia
  });
}
function te(...e) {
  return e.filter(Boolean).join(" ");
}
const Vt = ({ className: e = "w-4 h-4", ...t }) => /* @__PURE__ */ r.jsxs("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", className: e, "aria-hidden": "true", ...t, children: [
  /* @__PURE__ */ r.jsx("path", { d: "M4 19.5A2.5 2.5 0 0 1 6.5 17H20" }),
  /* @__PURE__ */ r.jsx("path", { d: "M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" }),
  /* @__PURE__ */ r.jsx("path", { d: "M6 6h10" }),
  /* @__PURE__ */ r.jsx("path", { d: "M6 10h7" })
] }), Gt = ({ className: e = "w-4 h-4", ...t }) => /* @__PURE__ */ r.jsxs("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", className: e, "aria-hidden": "true", ...t, children: [
  /* @__PURE__ */ r.jsx("path", { d: "m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" }),
  /* @__PURE__ */ r.jsx("path", { d: "M5 3v4" }),
  /* @__PURE__ */ r.jsx("path", { d: "M19 17v4" }),
  /* @__PURE__ */ r.jsx("path", { d: "M3 5h4" }),
  /* @__PURE__ */ r.jsx("path", { d: "M17 19h4" })
] }), $a = ({ className: e = "w-4 h-4", ...t }) => /* @__PURE__ */ r.jsxs("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", className: e, "aria-hidden": "true", ...t, children: [
  /* @__PURE__ */ r.jsx("polygon", { points: "11 5 6 9 2 9 2 15 6 15 11 19 11 5" }),
  /* @__PURE__ */ r.jsx("path", { d: "M15.54 8.46a5 5 0 0 1 0 7.07" }),
  /* @__PURE__ */ r.jsx("path", { d: "M19.07 4.93a10 10 0 0 1 0 14.14" })
] }), la = ({ className: e = "w-4 h-4", ...t }) => /* @__PURE__ */ r.jsxs("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", className: e, "aria-hidden": "true", ...t, children: [
  /* @__PURE__ */ r.jsx("circle", { cx: "11", cy: "11", r: "8" }),
  /* @__PURE__ */ r.jsx("line", { x1: "21", x2: "16.65", y1: "21", y2: "16.65" })
] }), $t = ({ className: e = "w-4 h-4", ...t }) => /* @__PURE__ */ r.jsxs("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", className: e, "aria-hidden": "true", ...t, children: [
  /* @__PURE__ */ r.jsx("line", { x1: "18", x2: "6", y1: "6", y2: "18" }),
  /* @__PURE__ */ r.jsx("line", { x1: "6", x2: "18", y1: "6", y2: "18" })
] }), Ya = ({ className: e = "w-4 h-4", ...t }) => /* @__PURE__ */ r.jsxs("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", className: e, "aria-hidden": "true", ...t, children: [
  /* @__PURE__ */ r.jsx("rect", { width: "14", height: "14", x: "8", y: "8", rx: "2", ry: "2" }),
  /* @__PURE__ */ r.jsx("path", { d: "M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" })
] }), ca = ({ className: e = "w-4 h-4", ...t }) => /* @__PURE__ */ r.jsx("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2.5, strokeLinecap: "round", strokeLinejoin: "round", className: e, "aria-hidden": "true", ...t, children: /* @__PURE__ */ r.jsx("polyline", { points: "20 6 9 17 4 12" }) }), ua = ({ className: e = "w-4 h-4", ...t }) => /* @__PURE__ */ r.jsxs("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", className: e, "aria-hidden": "true", ...t, children: [
  /* @__PURE__ */ r.jsx("circle", { cx: "12", cy: "12", r: "4" }),
  /* @__PURE__ */ r.jsx("path", { d: "M12 2v2" }),
  /* @__PURE__ */ r.jsx("path", { d: "M12 20v2" }),
  /* @__PURE__ */ r.jsx("path", { d: "m4.93 4.93 1.41 1.41" }),
  /* @__PURE__ */ r.jsx("path", { d: "m17.66 17.66 1.41 1.41" }),
  /* @__PURE__ */ r.jsx("path", { d: "M2 12h2" }),
  /* @__PURE__ */ r.jsx("path", { d: "M20 12h2" }),
  /* @__PURE__ */ r.jsx("path", { d: "m6.34 17.66-1.41 1.41" }),
  /* @__PURE__ */ r.jsx("path", { d: "m19.07 4.93-1.41 1.41" })
] }), da = ({ className: e = "w-4 h-4", ...t }) => /* @__PURE__ */ r.jsx("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", className: e, "aria-hidden": "true", ...t, children: /* @__PURE__ */ r.jsx("path", { d: "M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" }) }), ha = ({ className: e = "w-4 h-4", ...t }) => /* @__PURE__ */ r.jsxs("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", className: e, "aria-hidden": "true", ...t, children: [
  /* @__PURE__ */ r.jsx("circle", { cx: "12", cy: "12", r: "1" }),
  /* @__PURE__ */ r.jsx("circle", { cx: "19", cy: "12", r: "1" }),
  /* @__PURE__ */ r.jsx("circle", { cx: "5", cy: "12", r: "1" })
] }), ut = ({ className: e = "w-4 h-4", ...t }) => /* @__PURE__ */ r.jsxs("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", className: e, "aria-hidden": "true", ...t, children: [
  /* @__PURE__ */ r.jsx("path", { d: "M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" }),
  /* @__PURE__ */ r.jsx("circle", { cx: "12", cy: "12", r: "3" })
] }), dt = ({ className: e = "w-4 h-4", ...t }) => /* @__PURE__ */ r.jsxs("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", className: e, "aria-hidden": "true", ...t, children: [
  /* @__PURE__ */ r.jsx("rect", { width: "20", height: "16", x: "2", y: "4", rx: "2" }),
  /* @__PURE__ */ r.jsx("path", { d: "M6 8h.001" }),
  /* @__PURE__ */ r.jsx("path", { d: "M10 8h.001" }),
  /* @__PURE__ */ r.jsx("path", { d: "M14 8h.001" }),
  /* @__PURE__ */ r.jsx("path", { d: "M18 8h.001" }),
  /* @__PURE__ */ r.jsx("path", { d: "M6 12h.001" }),
  /* @__PURE__ */ r.jsx("path", { d: "M18 12h.001" }),
  /* @__PURE__ */ r.jsx("path", { d: "M10 12h4" }),
  /* @__PURE__ */ r.jsx("path", { d: "M8 16h8" })
] }), ht = ({ className: e = "w-4 h-4", ...t }) => /* @__PURE__ */ r.jsxs("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", className: e, "aria-hidden": "true", ...t, children: [
  /* @__PURE__ */ r.jsx("polyline", { points: "15 3 21 3 21 9" }),
  /* @__PURE__ */ r.jsx("polyline", { points: "9 21 3 21 3 15" }),
  /* @__PURE__ */ r.jsx("line", { x1: "21", x2: "14", y1: "3", y2: "10" }),
  /* @__PURE__ */ r.jsx("line", { x1: "3", x2: "10", y1: "21", y2: "14" })
] }), ft = ({ className: e = "w-4 h-4", ...t }) => /* @__PURE__ */ r.jsxs("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", className: e, "aria-hidden": "true", ...t, children: [
  /* @__PURE__ */ r.jsx("polyline", { points: "4 14 10 14 10 20" }),
  /* @__PURE__ */ r.jsx("polyline", { points: "20 10 14 10 14 4" }),
  /* @__PURE__ */ r.jsx("line", { x1: "14", x2: "21", y1: "10", y2: "3" }),
  /* @__PURE__ */ r.jsx("line", { x1: "3", x2: "10", y1: "21", y2: "14" })
] }), pt = ({ className: e = "w-4 h-4", ...t }) => /* @__PURE__ */ r.jsx("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", className: e, "aria-hidden": "true", ...t, children: /* @__PURE__ */ r.jsx("polyline", { points: "6 9 12 15 18 9" }) }), Za = ({ className: e = "w-4 h-4", ...t }) => /* @__PURE__ */ r.jsxs("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", className: e, "aria-hidden": "true", ...t, children: [
  /* @__PURE__ */ r.jsx("path", { d: "M12 22v-7" }),
  /* @__PURE__ */ r.jsx("path", { d: "m8 15 4-4 4 4" }),
  /* @__PURE__ */ r.jsx("path", { d: "m5 11 7-7 7 7" }),
  /* @__PURE__ */ r.jsx("path", { d: "M12 4v4" })
] }), Qa = ({ className: e = "w-4 h-4", ...t }) => /* @__PURE__ */ r.jsxs("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", className: e, "aria-hidden": "true", ...t, children: [
  /* @__PURE__ */ r.jsx("path", { d: "M2 15c6.667-6 13.333 0 20-6" }),
  /* @__PURE__ */ r.jsx("path", { d: "M9 22c1.798-1.998 2.518-3.995 2.807-5.993" }),
  /* @__PURE__ */ r.jsx("path", { d: "M15 2c-1.798 1.998-2.518 3.995-2.807 5.993" }),
  /* @__PURE__ */ r.jsx("path", { d: "m17 6-2.5-2.5" }),
  /* @__PURE__ */ r.jsx("path", { d: "m14 8-1-1" }),
  /* @__PURE__ */ r.jsx("path", { d: "m7 18 2.5 2.5" }),
  /* @__PURE__ */ r.jsx("path", { d: "m3.5 14.5.5.5" }),
  /* @__PURE__ */ r.jsx("path", { d: "m20 9 .5.5" }),
  /* @__PURE__ */ r.jsx("path", { d: "m6.5 12.5 1 1" }),
  /* @__PURE__ */ r.jsx("path", { d: "m16.5 10.5 1 1" }),
  /* @__PURE__ */ r.jsx("path", { d: "M10 16 7.5 13.5" })
] }), Xa = ({ className: e = "w-4 h-4", ...t }) => /* @__PURE__ */ r.jsxs("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", className: e, "aria-hidden": "true", ...t, children: [
  /* @__PURE__ */ r.jsx("path", { d: "M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" }),
  /* @__PURE__ */ r.jsx("path", { d: "M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" })
] }), Ja = ({ className: e = "w-4 h-4", ...t }) => /* @__PURE__ */ r.jsxs("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", className: e, "aria-hidden": "true", ...t, children: [
  /* @__PURE__ */ r.jsx("path", { d: "m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" }),
  /* @__PURE__ */ r.jsx("line", { x1: "12", x2: "12", y1: "9", y2: "13" }),
  /* @__PURE__ */ r.jsx("line", { x1: "12", x2: "12.01", y1: "17", y2: "17" })
] }), ei = ({ className: e = "w-4 h-4", ...t }) => /* @__PURE__ */ r.jsx("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", className: e, "aria-hidden": "true", ...t, children: /* @__PURE__ */ r.jsx("path", { d: "M19.439 7.85c0-1.571-1.285-2.85-2.87-2.85a2.86 2.86 0 0 0-2.85 2.85v.715H9.72V7.85c0-1.571-1.285-2.85-2.87-2.85A2.86 2.86 0 0 0 4 7.85v3.565h.715c1.571 0 2.85 1.285 2.85 2.87a2.86 2.86 0 0 1-2.85 2.85H4v3.565c0 .79.645 1.435 1.435 1.435h3.565v-.715c0-1.571 1.285-2.85 2.87-2.85a2.86 2.86 0 0 1 2.85 2.85v.715h3.565c.79 0 1.435-.645 1.435-1.435V17.15h-.715a2.86 2.86 0 0 1-2.85-2.87 2.86 2.86 0 0 1 2.85-2.85h.715V7.85Z" }) }), fa = ({ className: e = "w-4 h-4 animate-spin", ...t }) => /* @__PURE__ */ r.jsxs("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2.5, className: e, "aria-hidden": "true", ...t, children: [
  /* @__PURE__ */ r.jsx("circle", { cx: "12", cy: "12", r: "10", strokeOpacity: 0.25 }),
  /* @__PURE__ */ r.jsx("path", { d: "M12 2a10 10 0 0 1 10 10", strokeLinecap: "round" })
] }), pa = ({ className: e = "w-4 h-4", ...t }) => /* @__PURE__ */ r.jsxs("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", className: e, "aria-hidden": "true", ...t, children: [
  /* @__PURE__ */ r.jsx("path", { d: "M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" }),
  /* @__PURE__ */ r.jsx("path", { d: "m15 5 4 4" })
] }), ti = ({ className: e = "w-4 h-4", ...t }) => /* @__PURE__ */ r.jsxs("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", className: e, "aria-hidden": "true", ...t, children: [
  /* @__PURE__ */ r.jsx("path", { d: "M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" }),
  /* @__PURE__ */ r.jsx("path", { d: "M19 10v2a7 7 0 0 1-14 0v-2" }),
  /* @__PURE__ */ r.jsx("line", { x1: "12", x2: "12", y1: "19", y2: "22" })
] }), ni = ({ className: e = "w-4 h-4", ...t }) => /* @__PURE__ */ r.jsxs("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", className: e, "aria-hidden": "true", ...t, children: [
  /* @__PURE__ */ r.jsx("path", { d: "m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" }),
  /* @__PURE__ */ r.jsx("path", { d: "m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" }),
  /* @__PURE__ */ r.jsx("path", { d: "M7 21h10" }),
  /* @__PURE__ */ r.jsx("path", { d: "M12 3v18" }),
  /* @__PURE__ */ r.jsx("path", { d: "M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2" })
] }), ma = ({
  showShortcuts: e,
  isMaximized: t,
  isDarkMode: n,
  onToggleShortcuts: a,
  onToggleMaximize: i,
  onToggleTheme: o,
  provider: s,
  targetLanguage: l,
  onClose: c,
  onUpdateProvider: u,
  onUpdateTargetLang: d
}) => {
  const f = R(I);
  function p(m) {
    const g = m.target.value;
    u == null || u(g);
  }
  function v(m) {
    const g = m.target.value;
    d == null || d(g);
  }
  const w = /* @__PURE__ */ r.jsxs("div", { className: "relative flex items-center min-w-0 w-full", children: [
    /* @__PURE__ */ r.jsxs(
      "select",
      {
        value: s || "wiktionary",
        onChange: p,
        "aria-label": "Choose preferred dictionary source",
        className: "select-muted w-full text-[12.5px] font-medium",
        title: "Choose which dictionary source is shown first; all enabled sources are combined",
        children: [
          /* @__PURE__ */ r.jsx("option", { value: "wiktionary", children: "Wiktionary" }),
          /* @__PURE__ */ r.jsx("option", { value: "free_dictionary", children: "FreeDict" }),
          /* @__PURE__ */ r.jsx("option", { value: "datamuse", children: "Datamuse" }),
          /* @__PURE__ */ r.jsx("option", { value: "urban_dictionary", children: "UrbanDict" }),
          /* @__PURE__ */ r.jsx("option", { value: "wiktionary_bilingual", children: "Bilingual" }),
          /* @__PURE__ */ r.jsx("option", { value: "google_translate", children: "Translate" })
        ]
      }
    ),
    /* @__PURE__ */ r.jsx(pt, { className: "w-3 h-3 text-content-muted pointer-events-none absolute right-2" })
  ] }), T = /* @__PURE__ */ r.jsxs("div", { className: "relative flex items-center min-w-0 w-full", children: [
    /* @__PURE__ */ r.jsxs(
      "select",
      {
        value: l || "Vietnamese",
        onChange: v,
        "aria-label": "Select Translation Target Language",
        className: "select-muted w-full text-[12.5px] font-medium",
        title: "Select Translation Target Language",
        children: [
          /* @__PURE__ */ r.jsx("option", { value: "Vietnamese", children: "Vietnamese" }),
          /* @__PURE__ */ r.jsx("option", { value: "English", children: "English" }),
          /* @__PURE__ */ r.jsx("option", { value: "Japanese", children: "Japanese" }),
          /* @__PURE__ */ r.jsx("option", { value: "Chinese", children: "Chinese" }),
          /* @__PURE__ */ r.jsx("option", { value: "Korean", children: "Korean" }),
          /* @__PURE__ */ r.jsx("option", { value: "French", children: "French" }),
          /* @__PURE__ */ r.jsx("option", { value: "Spanish", children: "Spanish" })
        ]
      }
    ),
    /* @__PURE__ */ r.jsx(pt, { className: "w-3 h-3 text-content-muted pointer-events-none absolute right-2" })
  ] });
  return /* @__PURE__ */ r.jsxs("header", { className: "glass-toolbar flex items-center justify-between gap-2 px-3 py-2 select-none relative z-30 transition-colors min-w-0", children: [
    /* @__PURE__ */ r.jsxs("div", { className: "flex items-center gap-2 min-w-0 shrink-0", children: [
      /* @__PURE__ */ r.jsx("div", { className: "w-7 h-7 rounded-lg bg-gradient-to-br from-accent/20 to-accent/5 border border-accent/30 flex items-center justify-center text-accent shadow-xs flex-shrink-0", children: /* @__PURE__ */ r.jsx(Vt, { className: "w-4 h-4 text-accent" }) }),
      /* @__PURE__ */ r.jsxs("div", { className: "flex items-baseline gap-1.5 hidden min-[400px]:flex", children: [
        /* @__PURE__ */ r.jsx("span", { className: "text-[15px] font-bold text-content tracking-tight font-heading", children: "AI Dictionary Assistant" }),
        /* @__PURE__ */ r.jsx("span", { className: "text-[11px] font-medium font-mono text-content-muted/80 uppercase px-1 py-0.2 rounded bg-muted/60 border border-border/50", children: "NTH" })
      ] })
    ] }),
    /* @__PURE__ */ r.jsxs("div", { className: "flex items-center gap-1.5 justify-end min-w-0 flex-1", children: [
      /* @__PURE__ */ r.jsxs("div", { className: "hidden min-[520px]:flex items-center gap-1.5 min-w-0 max-w-[17rem]", children: [
        /* @__PURE__ */ r.jsx("div", { className: "min-w-0 flex-1 max-w-[8.5rem]", children: w }),
        /* @__PURE__ */ r.jsx("div", { className: "min-w-0 flex-1 max-w-[8rem]", children: T })
      ] }),
      f ? /* @__PURE__ */ r.jsxs(
        "button",
        {
          type: "button",
          onClick: () => Q(),
          className: "h-7 px-2.5 rounded-full border text-[13px] font-bold flex items-center gap-1.5 transition-all cursor-pointer bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/30 whitespace-nowrap shadow-xs active:scale-95",
          title: "Cancel voice playback (Esc)",
          "aria-label": "Cancel voice playback",
          "aria-pressed": "true",
          children: [
            /* @__PURE__ */ r.jsxs("span", { className: "soundwave-bars text-rose-500", children: [
              /* @__PURE__ */ r.jsx("span", { className: "soundwave-bar" }),
              /* @__PURE__ */ r.jsx("span", { className: "soundwave-bar" }),
              /* @__PURE__ */ r.jsx("span", { className: "soundwave-bar" })
            ] }),
            /* @__PURE__ */ r.jsx("span", { children: "Stop Audio" })
          ]
        }
      ) : null,
      /* @__PURE__ */ r.jsx("div", { className: "w-px h-4 bg-border/80 mx-0.5 shrink-0 hidden min-[360px]:block" }),
      /* @__PURE__ */ r.jsxs("div", { className: "flex items-center gap-1 shrink-0", children: [
        /* @__PURE__ */ r.jsxs("details", { className: "header-overflow min-[520px]:hidden", children: [
          /* @__PURE__ */ r.jsx("summary", { className: "btn-control-icon", title: "Provider & Language settings", "aria-label": "Provider and language", children: /* @__PURE__ */ r.jsx(ha, { className: "w-3.5 h-3.5 text-content-secondary" }) }),
          /* @__PURE__ */ r.jsxs("div", { className: "header-overflow-panel", children: [
            /* @__PURE__ */ r.jsxs("div", { className: "space-y-1.5", children: [
              /* @__PURE__ */ r.jsx("label", { className: "text-[12px] font-bold uppercase tracking-wider text-content-muted", children: "Preferred Source" }),
              w
            ] }),
            /* @__PURE__ */ r.jsxs("div", { className: "space-y-1.5", children: [
              /* @__PURE__ */ r.jsx("label", { className: "text-[12px] font-bold uppercase tracking-wider text-content-muted", children: "Target Language" }),
              T
            ] }),
            /* @__PURE__ */ r.jsxs("div", { className: "flex items-center gap-1.5 pt-1.5 border-t border-border", children: [
              /* @__PURE__ */ r.jsx(
                "button",
                {
                  type: "button",
                  onClick: a,
                  className: te("btn-control-icon flex-1", e ? "chip-active" : ""),
                  title: "Keyboard Shortcuts (Shift+Q)",
                  "aria-label": "Keyboard Shortcuts",
                  "aria-pressed": e,
                  children: /* @__PURE__ */ r.jsx(dt, { className: "w-3.5 h-3.5" })
                }
              ),
              i ? /* @__PURE__ */ r.jsx(
                "button",
                {
                  type: "button",
                  onClick: i,
                  className: "btn-control-icon flex-1",
                  title: t ? "Restore View" : "Maximize Window",
                  "aria-label": t ? "Restore View" : "Maximize Window",
                  children: t ? /* @__PURE__ */ r.jsx(ft, { className: "w-3.5 h-3.5" }) : /* @__PURE__ */ r.jsx(ht, { className: "w-3.5 h-3.5" })
                }
              ) : null,
              /* @__PURE__ */ r.jsx(
                "button",
                {
                  type: "button",
                  onClick: () => nt(),
                  className: "btn-control-icon flex-1",
                  title: "Extension Settings",
                  "aria-label": "Extension Settings",
                  children: /* @__PURE__ */ r.jsx(ut, { className: "w-3.5 h-3.5" })
                }
              )
            ] })
          ] })
        ] }),
        /* @__PURE__ */ r.jsx(
          "button",
          {
            type: "button",
            onClick: a,
            className: te(
              "btn-control-icon hidden min-[480px]:flex",
              e ? "chip-active text-accent" : ""
            ),
            title: "Keyboard Shortcuts (? or Shift+Q)",
            "aria-label": "Keyboard Shortcuts",
            "aria-pressed": e,
            children: /* @__PURE__ */ r.jsx(dt, { className: "w-3.5 h-3.5" })
          }
        ),
        /* @__PURE__ */ r.jsx(
          "button",
          {
            type: "button",
            onClick: o,
            className: "btn-control-icon hover:text-accent",
            title: n ? "Switch to Light Theme" : "Switch to Dark Theme",
            "aria-label": n ? "Switch to Light Theme" : "Switch to Dark Theme",
            children: n ? /* @__PURE__ */ r.jsx(da, { className: "w-3.5 h-3.5 text-accent" }) : /* @__PURE__ */ r.jsx(ua, { className: "w-3.5 h-3.5 text-accent" })
          }
        ),
        i ? /* @__PURE__ */ r.jsx(
          "button",
          {
            type: "button",
            onClick: i,
            className: "btn-control-icon hidden min-[480px]:flex",
            title: t ? "Restore Default Window" : "Maximize Window",
            "aria-label": t ? "Restore Default Window" : "Maximize Window",
            children: t ? /* @__PURE__ */ r.jsx(ft, { className: "w-3.5 h-3.5" }) : /* @__PURE__ */ r.jsx(ht, { className: "w-3.5 h-3.5" })
          }
        ) : null,
        /* @__PURE__ */ r.jsx(
          "button",
          {
            type: "button",
            onClick: () => nt(),
            className: "btn-control-icon hidden min-[480px]:flex hover:text-accent",
            title: "Preferences & Options",
            "aria-label": "Preferences & Options",
            children: /* @__PURE__ */ r.jsx(ut, { className: "w-3.5 h-3.5" })
          }
        ),
        c ? /* @__PURE__ */ r.jsx(
          "button",
          {
            type: "button",
            onClick: c,
            className: "btn-control-icon hover:!bg-rose-500/10 hover:!text-rose-600 dark:hover:!text-rose-400 hover:!border-rose-500/30",
            title: "Close window (Esc)",
            "aria-label": "Close window",
            children: /* @__PURE__ */ r.jsx($t, { className: "w-3.5 h-3.5" })
          }
        ) : null
      ] })
    ] })
  ] });
}, ga = ({ activeTab: e, onChangeTab: t }) => {
  const n = Y("enableAI"), a = e || "dictionary", i = n !== !1, o = x.useRef(null), s = [
    {
      id: "dictionary",
      label: "Dictionary",
      icon: Vt,
      shortcut: "1"
    },
    ...i ? [
      {
        id: "ai_assistant",
        label: "AI Assistant",
        icon: Gt,
        badge: "AI",
        shortcut: "2"
      },
      {
        id: "rewriter",
        label: "Rewriter",
        icon: pa,
        shortcut: "3"
      }
    ] : []
  ];
  function l(u) {
    t == null || t(u);
  }
  function c(u) {
    const d = s.findIndex((f) => f.id === a);
    if (d !== -1) {
      if (u.key === "ArrowRight") {
        u.preventDefault();
        const f = (d + 1) % s.length;
        l(s[f].id);
      } else if (u.key === "ArrowLeft") {
        u.preventDefault();
        const f = (d - 1 + s.length) % s.length;
        l(s[f].id);
      }
    }
  }
  return x.useEffect(() => {
    !i && a === "ai_assistant" && l("dictionary");
  }, [i, a]), /* @__PURE__ */ r.jsx(
    "nav",
    {
      ref: o,
      className: "glass-toolbar px-3 py-2 transition-colors select-none",
      role: "tablist",
      "aria-label": "Navigation modes",
      onKeyDown: c,
      children: /* @__PURE__ */ r.jsx(
        "div",
        {
          className: te(
            "glass-tabs grid gap-1.5 p-1 rounded-2xl text-[14px] shadow-inner-light",
            s.length === 3 ? "grid-cols-3" : s.length === 2 ? "grid-cols-2" : "grid-cols-1"
          ),
          children: s.map((u) => {
            const d = a === u.id, f = u.icon;
            return /* @__PURE__ */ r.jsxs(
              "button",
              {
                type: "button",
                role: "tab",
                "aria-selected": d,
                tabIndex: d ? 0 : -1,
                onClick: () => l(u.id),
                className: te(
                  "min-w-0 py-1.5 px-1.5 sm:px-3 rounded-lg flex items-center justify-center gap-1 text-[14px] transition-colors duration-fast outline-none cursor-pointer whitespace-nowrap select-none relative group overflow-hidden focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 focus-visible:ring-offset-paper",
                  d ? "bg-surface text-accent font-bold shadow-xs border border-accent/40" : "text-content-secondary hover:text-content hover:bg-surface/60 border border-transparent font-medium"
                ),
                children: [
                  /* @__PURE__ */ r.jsx(f, { "aria-hidden": "true", className: te("w-3.5 h-3.5 shrink-0", d ? "text-accent" : "text-content-muted") }),
                  /* @__PURE__ */ r.jsx("span", { className: "tracking-tight truncate", children: u.label }),
                  u.badge ? /* @__PURE__ */ r.jsx("span", { className: te(
                    "px-1 py-0.2 rounded text-[9px] font-mono font-extrabold uppercase leading-tight tracking-wider",
                    d ? "bg-accent/15 text-accent" : "bg-muted text-content-muted border border-border/50"
                  ), children: u.badge }) : null
                ]
              },
              u.id
            );
          })
        }
      )
    }
  );
}, xa = [
  {
    tag: "Word",
    label: "resilience",
    query: "resilience",
    context: "Their resilience under pressure allowed the engineering team to ship on time.",
    intent: "default"
  },
  {
    tag: "Idiom",
    label: "spill the beans",
    query: "spill the beans",
    context: "He finally spilled the beans about the surprise launch.",
    intent: "collocations"
  },
  {
    tag: "Sentence",
    label: "The algorithm adapts…",
    query: "The algorithm adapts dynamically to high traffic.",
    context: "The algorithm adapts dynamically to high traffic.",
    intent: "sentence_breakdown"
  },
  {
    tag: "Compare",
    label: "affect vs effect",
    query: "affect vs effect",
    context: "The policy will affect housing costs, but the long-term effect is still unclear.",
    intent: "confusables"
  }
], ya = ({ onSelect: e }) => /* @__PURE__ */ r.jsxs("div", { className: "rounded-2xl border border-border/80 bg-surface/90 backdrop-blur-sm p-4 space-y-3 shadow-xs", children: [
  /* @__PURE__ */ r.jsxs("div", { className: "flex items-center gap-2 text-content-muted", children: [
    /* @__PURE__ */ r.jsx(Gt, { className: "w-4 h-4 text-accent" }),
    /* @__PURE__ */ r.jsx("span", { className: "text-[12px] font-bold uppercase tracking-wider", children: "Explore Examples & Nuances" })
  ] }),
  /* @__PURE__ */ r.jsx("div", { className: "flex flex-wrap gap-2 min-w-0", children: xa.map((t) => /* @__PURE__ */ r.jsxs(
    "button",
    {
      type: "button",
      onClick: () => e(t),
      className: "group inline-flex items-center gap-2 min-w-0 max-w-full min-h-8 px-2.5 sm:px-3 py-1.5 rounded-xl border border-border/80 bg-muted/40 hover:bg-accent-subtle hover:border-accent/40 text-content-secondary hover:text-content transition-all duration-150 cursor-pointer text-left shadow-2xs hover:scale-[1.02] active:scale-[0.98]",
      children: [
        /* @__PURE__ */ r.jsx("span", { className: "px-1.5 py-0.5 rounded-md text-[9px] font-bold font-mono uppercase tracking-wider text-accent bg-accent-subtle border border-accent/20 group-hover:bg-accent group-hover:text-accent-foreground transition-colors", children: t.tag }),
        /* @__PURE__ */ r.jsx("span", { className: "text-[13.5px] font-semibold text-content group-hover:text-accent transition-colors truncate", children: t.label })
      ]
    },
    t.query
  )) })
] }), va = x.lazy(() => import("./overlay-WordLookupResult-BDzQPfKk.js")), ba = ({
  initialQuery: e,
  initialContext: t,
  lookupRequestId: n,
  autoFocus: a,
  provider: i,
  targetLang: o
}) => {
  const { result: s, isLoading: l, error: c } = ra(), u = aa(), d = Y("dictionaryProvider"), f = Y("translateTargetLanguage"), [p, v] = x.useState(""), w = x.useRef(null);
  function T() {
    return i || d || "wiktionary";
  }
  function m() {
    return o || f || "Vietnamese";
  }
  function g(y, H) {
    const F = y.trim();
    F && (v(F), na(F, T(), m(), t, H));
  }
  function S(y) {
    g(y || p);
  }
  function L(y) {
    g(y.query);
  }
  function j() {
    var y;
    v(""), (y = w.current) == null || y.focus();
  }
  return x.useEffect(() => {
    function y(H) {
      H.key === "Escape" && Q();
    }
    return window.addEventListener("keydown", y), a && w.current && (w.current.focus(), p && w.current.select()), () => {
      window.removeEventListener("keydown", y);
    };
  }, []), x.useEffect(() => {
    const y = (e || p || u || "").trim();
    y && g(y, n);
  }, [e, n, i, o, d, f]), x.useEffect(() => () => {
    $e();
  }, []), /* @__PURE__ */ r.jsxs("div", { className: "font-sans", children: [
    /* @__PURE__ */ r.jsx("div", { className: "px-3.5 py-3 bg-surface border-b border-border/80 sticky top-0 z-20 shadow-2xs", children: /* @__PURE__ */ r.jsxs("div", { className: "flex items-center gap-2 min-w-0", children: [
      /* @__PURE__ */ r.jsxs("div", { className: "relative flex-1 min-w-0 flex items-center group", children: [
        /* @__PURE__ */ r.jsx(la, { className: "w-4 h-4 text-content-muted absolute left-3.5 pointer-events-none group-focus-within:text-accent transition-colors" }),
        /* @__PURE__ */ r.jsx(
          "input",
          {
            ref: w,
            value: p,
            onChange: (y) => v(y.target.value),
            onKeyDown: (y) => {
              y.key === "Enter" && S();
            },
            type: "text",
            placeholder: "Type a word, phrase, or sentence…",
            "aria-label": "Look up a word, phrase, or sentence",
            className: "ui-control w-full h-10 pl-10 pr-20 text-[16px] placeholder:text-content-muted shadow-inner-light"
          }
        ),
        p ? /* @__PURE__ */ r.jsx(
          "button",
          {
            type: "button",
            onClick: j,
            title: "Clear search text",
            "aria-label": "Clear search text",
            className: "absolute right-3 text-content-muted hover:text-content p-1 cursor-pointer flex items-center justify-center rounded-lg hover:bg-muted transition-colors",
            children: /* @__PURE__ */ r.jsx($t, { className: "w-3.5 h-3.5" })
          }
        ) : /* @__PURE__ */ r.jsx("span", { className: "hidden sm:inline-flex absolute right-3 px-1.5 py-0.5 rounded-md text-[11.5px] font-mono text-content-muted/70 border border-border/70 bg-surface select-none pointer-events-none shadow-2xs", children: "↵ Enter" })
      ] }),
      /* @__PURE__ */ r.jsx(
        "button",
        {
          type: "button",
          onClick: () => S(),
          disabled: !p.trim() || l,
          className: "ui-button-primary h-10 px-2.5 sm:px-4 text-[14.5px] font-bold cursor-pointer shadow-xs flex items-center gap-1.5 shrink-0 disabled:pointer-events-none",
          children: l ? /* @__PURE__ */ r.jsx(fa, { className: "w-4 h-4" }) : /* @__PURE__ */ r.jsx("span", { children: "Lookup" })
        }
      )
    ] }) }),
    /* @__PURE__ */ r.jsx("div", { className: "p-4 space-y-4", children: c ? /* @__PURE__ */ r.jsxs("div", { role: "alert", className: "p-4 rounded-2xl bg-rose-500/8 border border-rose-500/25 text-[15px] text-rose-700 dark:text-rose-400 space-y-2", children: [
      /* @__PURE__ */ r.jsxs("div", { className: "flex items-center gap-2 font-semibold", children: [
        /* @__PURE__ */ r.jsx("span", { className: "w-2 h-2 rounded-full bg-rose-500", "aria-hidden": "true" }),
        /* @__PURE__ */ r.jsx("span", { children: "Lookup failed" })
      ] }),
      /* @__PURE__ */ r.jsx("p", { className: "text-[14.5px] text-content-secondary leading-relaxed pl-4", children: c }),
      /* @__PURE__ */ r.jsx("div", { className: "pl-4 pt-1", children: /* @__PURE__ */ r.jsx(
        "button",
        {
          type: "button",
          onClick: () => S(),
          className: "btn-accent h-7 px-3 text-[13px] font-bold cursor-pointer",
          children: "Try Again"
        }
      ) })
    ] }) : s ? /* @__PURE__ */ r.jsx("div", { "aria-busy": l || void 0, children: /* @__PURE__ */ r.jsx(x.Suspense, { fallback: /* @__PURE__ */ r.jsxs("div", { className: "p-4 space-y-3.5 rounded-2xl border border-border/80 bg-surface shadow-xs", "aria-busy": "true", children: [
      /* @__PURE__ */ r.jsx("div", { className: "h-8 skeleton-shimmer rounded-lg w-2/5" }),
      /* @__PURE__ */ r.jsx("div", { className: "h-5 skeleton-shimmer rounded-md w-3/5" }),
      /* @__PURE__ */ r.jsx("div", { className: "h-20 skeleton-shimmer rounded-xl" })
    ] }), children: /* @__PURE__ */ r.jsx(va, { onSelectWord: S, contextSentence: t }) }) }) : l ? (
      /* Realistic Loading Skeleton */
      /* @__PURE__ */ r.jsxs("div", { className: "p-5 space-y-4 rounded-2xl border border-border/80 bg-surface shadow-xs", "aria-busy": "true", "aria-live": "polite", children: [
        /* @__PURE__ */ r.jsxs("div", { className: "flex items-center justify-between pb-3 border-b border-border/60", children: [
          /* @__PURE__ */ r.jsx("div", { className: "h-8 skeleton-shimmer rounded-lg w-2/5" }),
          /* @__PURE__ */ r.jsx("div", { className: "h-6 skeleton-shimmer rounded-full w-24" })
        ] }),
        /* @__PURE__ */ r.jsxs("div", { className: "flex gap-2.5", children: [
          /* @__PURE__ */ r.jsx("div", { className: "h-8 skeleton-shimmer rounded-lg w-24" }),
          /* @__PURE__ */ r.jsx("div", { className: "h-8 skeleton-shimmer rounded-lg w-28" })
        ] }),
        /* @__PURE__ */ r.jsxs("div", { className: "space-y-2 pt-2", children: [
          /* @__PURE__ */ r.jsx("div", { className: "h-4 skeleton-shimmer rounded w-5/6" }),
          /* @__PURE__ */ r.jsx("div", { className: "h-4 skeleton-shimmer rounded w-4/6" }),
          /* @__PURE__ */ r.jsx("div", { className: "h-4 skeleton-shimmer rounded w-3/6" })
        ] }),
        /* @__PURE__ */ r.jsx("div", { className: "h-24 skeleton-shimmer rounded-xl mt-2" })
      ] })
    ) : !p.trim() && !u.trim() ? /* @__PURE__ */ r.jsx(ya, { onSelect: L }) : null })
  ] });
}, wa = en.memo(ba), Sa = x.lazy(() => import("./overlay-AiAssistantView-CxBmmhNd.js")), ka = x.lazy(() => import("./overlay-ContextualRewriter-DewPkntp.js")), Aa = ({
  activeTab: e,
  query: t,
  context: n,
  lookupRequestId: a,
  targetLang: i,
  provider: o,
  autoFocusDictionary: s,
  loadingSize: l = "compact",
  onChangeTab: c
}) => {
  const u = l === "regular" ? "text-[14px]" : "text-[13.5px]";
  return /* @__PURE__ */ r.jsxs(r.Fragment, { children: [
    /* @__PURE__ */ r.jsx(ga, { activeTab: e, onChangeTab: c }),
    /* @__PURE__ */ r.jsxs("main", { className: "workbench-main flex-1 overflow-y-auto", children: [
      e === "dictionary" ? /* @__PURE__ */ r.jsx(
        wa,
        {
          initialQuery: t,
          initialContext: n,
          lookupRequestId: a,
          autoFocus: s,
          targetLang: i,
          provider: o
        }
      ) : null,
      e === "ai_assistant" ? /* @__PURE__ */ r.jsx(x.Suspense, { fallback: /* @__PURE__ */ r.jsx("div", { className: `p-4 ${u} text-content-muted`, children: "Loading AI assistant…" }), children: /* @__PURE__ */ r.jsx(
        Sa,
        {
          initialQuery: t,
          initialContext: n,
          targetLang: i,
          isVisible: !0,
          onSwitchTab: c
        }
      ) }) : null,
      e === "rewriter" ? /* @__PURE__ */ r.jsx(x.Suspense, { fallback: /* @__PURE__ */ r.jsx("div", { className: `p-4 ${u} text-content-muted`, children: "Loading rewriter…" }), children: /* @__PURE__ */ r.jsx(ka, { initialText: t, contextSentence: n, targetLang: i }) }) : null
    ] })
  ] });
};
function mt(e) {
  return String(e || "").replace(/\s+/g, " ").trim();
}
function Yt(e, t) {
  const n = mt(e), a = mt(String(t || ""));
  return !a || n && a.toLowerCase() === n.toLowerCase() ? !1 : a.length > n.length;
}
let Zt = null, se = null;
const qe = /* @__PURE__ */ new Set();
function gt(e) {
  Zt = e, qe.forEach((t) => t(e));
}
function ri(e, t = 2200) {
  se && (clearTimeout(se), se = null), gt(e), se = setTimeout(() => {
    gt(null), se = null;
  }, t);
}
function Ta() {
  const [e, t] = x.useState(Zt);
  return x.useEffect(() => (qe.add(t), () => {
    qe.delete(t);
  }), []), e;
}
const La = () => {
  const e = Ta();
  return e ? /* @__PURE__ */ r.jsxs(
    "div",
    {
      role: "status",
      "aria-live": "polite",
      className: "glass-toast absolute bottom-5 left-1/2 -translate-x-1/2 z-50 pointer-events-none flex items-center gap-2 px-4 py-2 rounded-2xl text-content text-[13px] font-medium transition-all select-none",
      children: [
        /* @__PURE__ */ r.jsx(ca, { className: "w-3.5 h-3.5 text-accent flex-shrink-0" }),
        /* @__PURE__ */ r.jsx("span", { className: "whitespace-nowrap", children: e })
      ]
    }
  ) : null;
};
function xt(e) {
  return e === "dark" ? !0 : e === "light" ? !1 : typeof window < "u" && window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)").matches : !0;
}
function Re(e) {
  typeof document > "u" || (document.documentElement.classList.toggle("dark", e), document.documentElement.classList.toggle("light", !e), document.documentElement.classList.toggle("light-theme", !e), document.documentElement.setAttribute("data-theme", e ? "dark" : "light"), document.documentElement.style.colorScheme = e ? "dark" : "light", document.body && (document.body.classList.toggle("dark", e), document.body.classList.toggle("light", !e), document.body.classList.toggle("light-theme", !e), document.body.setAttribute("data-theme", e ? "dark" : "light"), document.body.style.colorScheme = e ? "dark" : "light"));
}
function ja(e, t) {
  const n = (t == null ? void 0 : t.syncDocument) === !0, [a, i] = x.useState(() => xt(e));
  x.useEffect(() => {
    const s = xt(e);
    if (i(s), n && Re(s), e === "system" && typeof window < "u" && window.matchMedia) {
      const l = window.matchMedia("(prefers-color-scheme: dark)"), c = (u) => {
        i(u.matches), n && Re(u.matches);
      };
      return l.addEventListener("change", c), () => l.removeEventListener("change", c);
    }
  }, [e, n]);
  function o() {
    var l;
    const s = !a;
    i(s), n && Re(s), (l = t == null ? void 0 : t.onThemeChange) == null || l.call(t, s ? "dark" : "light"), t != null && t.saveSettings && t.saveSettings({ theme: s ? "dark" : "light" });
  }
  return { isDarkMode: a, toggleTheme: o };
}
const Ea = {
  small: { ui: "1rem", reading: "1.0625rem" },
  comfortable: { ui: "1.0625rem", reading: "1.125rem" },
  large: { ui: "1.125rem", reading: "1.25rem" }
};
function Pa(e) {
  const t = Ea[e || "comfortable"];
  return {
    "--font-size-ui": t.ui,
    "--font-size-reading": t.reading
  };
}
function Ca(e) {
  const t = Y("theme"), n = Y("textSize"), a = Y("dictionaryProvider"), i = Y("translateTargetLanguage"), [o, s] = x.useState(t), [l, c] = x.useState(a || "wiktionary"), [u, d] = x.useState(
    (e == null ? void 0 : e.targetLang) || i || "Vietnamese"
  ), { isDarkMode: f, toggleTheme: p } = ja(o, {
    syncDocument: e == null ? void 0 : e.syncDocumentTheme,
    onThemeChange: s
  });
  return x.useEffect(() => {
    a && c(a);
  }, [a]), x.useEffect(() => {
    e != null && e.targetLang ? d(e.targetLang) : i && d(i);
  }, [e == null ? void 0 : e.targetLang, i]), x.useEffect(() => {
    s(t);
  }, [t]), {
    isDarkMode: f,
    provider: l,
    setProvider: c,
    targetLang: u,
    setTargetLang: d,
    toggleTheme: p,
    textSizeStyle: Pa(n)
  };
}
const Ia = x.lazy(() => import("./overlay-ShortcutsModal-D0FgANHI.js"));
function yt(e, t) {
  const n = String(t || "").replace(/\s+/g, " ").trim();
  return Yt(e, n) ? n : "";
}
const Na = ({
  selectedText: e,
  contextSentence: t,
  lookupRequestId: n,
  targetLang: a,
  isMaximized: i,
  onClose: o,
  onToggleMaximize: s,
  onStartDrag: l,
  onStartResize: c
}) => {
  const u = Xn(), d = Y("defaultTab"), f = sa(), {
    isDarkMode: p,
    provider: v,
    setProvider: w,
    targetLang: T,
    setTargetLang: m,
    toggleTheme: g,
    textSizeStyle: S
  } = Ca({ targetLang: a }), [L, j] = x.useState(!1), [y, H] = x.useState(e || ""), [F, X] = x.useState(
    Yt(e || "", t) ? String(t || "").trim() : ""
  ), U = x.useRef(null);
  x.useEffect(() => {
    if (!U.current) return;
    const h = U.current.closest(".dictionary-popup-layer");
    h && (h.classList.toggle("dark", p), h.classList.toggle("light", !p), h.setAttribute("data-theme", p ? "dark" : "light"));
    const A = U.current.parentElement;
    A && (A.classList.toggle("dark", p), A.classList.toggle("light", !p), A.setAttribute("data-theme", p ? "dark" : "light"));
    const K = U.current.getRootNode(), D = K == null ? void 0 : K.host;
    D && (D.classList.toggle("dark", p), D.classList.toggle("light", !p), D.setAttribute("data-theme", p ? "dark" : "light"));
  }, [p]);
  function ne(h, A) {
    if (!(h != null && h.trim())) return;
    const K = h.trim();
    H(K), X(yt(K, A)), d && Mt(d);
  }
  function b(h) {
    f.switchTab(h);
  }
  function M() {
    f.abortAllLookups(), o == null || o();
  }
  function we(h) {
    h.target.closest("button, input, select, textarea, a, label") || l == null || l(h.nativeEvent);
  }
  x.useEffect(() => {
    var D;
    const h = (D = document.getElementById("dictionary-extension-root")) == null ? void 0 : D.shadowRoot;
    function A(q) {
      const P = q.detail;
      if (typeof P == "string") {
        ne(P, F);
        return;
      }
      ne(P == null ? void 0 : P.text, (P == null ? void 0 : P.context) || F);
    }
    function K(q) {
      const P = q.detail;
      b(P);
    }
    return h && (h.addEventListener("dict-update-text", A), h.addEventListener("dict-switch-tab", K)), () => {
      h && (h.removeEventListener("dict-update-text", A), h.removeEventListener("dict-switch-tab", K)), f.abortAllLookups();
    };
  }, []), x.useEffect(() => {
    ne(e, t);
  }, [e]), x.useEffect(() => {
    X(yt(y, t));
  }, [t]), x.useEffect(() => {
    const h = U.current;
    if (!h) return;
    const A = h.querySelector('input[type="text"], textarea');
    A == null || A.focus();
  }, [n, e]);
  function Qt(h) {
    if (h.key === "Escape") {
      if (h.stopPropagation(), L) {
        j(!1);
        return;
      }
      M();
      return;
    }
    const A = h.target;
    if (!(A == null ? void 0 : A.matches('input, textarea, select, [contenteditable="true"]'))) {
      if (h.key === "1" || h.altKey && h.key === "1") {
        h.preventDefault(), b("dictionary");
        return;
      }
      if (h.key === "2" || h.altKey && h.key === "2") {
        h.preventDefault(), b("ai_assistant");
        return;
      }
      if (h.key === "?" || h.shiftKey && h.key === "/") {
        h.preventDefault(), j((Se) => !Se);
        return;
      }
    }
    if (h.key !== "Tab") return;
    const D = U.current;
    if (!D) return;
    const q = Array.from(
      D.querySelectorAll(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    ).filter((Se) => !Se.hasAttribute("disabled") && Se.getAttribute("aria-hidden") !== "true");
    if (!q.length) return;
    const P = q[0], Ye = q[q.length - 1], Ze = D.ownerDocument.activeElement;
    h.shiftKey && Ze === P ? (Ye.focus(), h.preventDefault()) : !h.shiftKey && Ze === Ye && (P.focus(), h.preventDefault());
  }
  return /* @__PURE__ */ r.jsxs(
    "div",
    {
      ref: U,
      role: "dialog",
      "aria-modal": "true",
      "aria-label": "Dictionary lookup",
      tabIndex: -1,
      className: te(
        "app-shell glass-shell border border-border/80 rounded-3xl shadow-card-elevated overflow-hidden flex flex-col select-none text-content text-[16px] font-sans relative inpage-popup-card w-full h-full transition-colors outline-none",
        p ? "dark" : "light-theme light",
        i ? "max-w-5xl max-h-[90vh]" : ""
      ),
      "data-theme": p ? "dark" : "light",
      style: S,
      onClick: (h) => h.stopPropagation(),
      onKeyDown: Qt,
      children: [
        /* @__PURE__ */ r.jsx(
          "div",
          {
            className: "relative cursor-grab active:cursor-grabbing select-none",
            onMouseDown: we,
            children: /* @__PURE__ */ r.jsx(
              ma,
              {
                showShortcuts: L,
                isMaximized: i,
                isDarkMode: p,
                provider: v,
                targetLanguage: T,
                onToggleShortcuts: () => j((h) => !h),
                onToggleMaximize: s,
                onToggleTheme: g,
                onClose: M,
                onUpdateProvider: (h) => w(h),
                onUpdateTargetLang: (h) => m(h)
              }
            )
          }
        ),
        /* @__PURE__ */ r.jsx(
          Aa,
          {
            activeTab: u,
            query: y,
            context: F,
            lookupRequestId: n,
            targetLang: T,
            provider: v,
            loadingSize: "regular",
            onChangeTab: b
          }
        ),
        i ? null : /* @__PURE__ */ r.jsx(
          "div",
          {
            role: "separator",
            "aria-label": "Resize overlay window",
            tabIndex: 0,
            onMouseDown: (h) => {
              h.stopPropagation(), h.preventDefault(), c == null || c(h.nativeEvent);
            },
            className: "absolute right-1 bottom-1 w-4 h-4 cursor-nwse-resize text-content-muted hover:text-accent select-none flex items-center justify-center opacity-50 hover:opacity-100 transition-colors z-30 focus-ring",
            title: "Drag to resize popup window",
            children: /* @__PURE__ */ r.jsx("svg", { className: "w-3 h-3", viewBox: "0 0 24 24", fill: "currentColor", children: /* @__PURE__ */ r.jsx("path", { d: "M22 22H20V20H22V22ZM22 18H18V20H22V18ZM18 22H16V20H18V22ZM22 14H14V16H22V14Z" }) })
          }
        ),
        /* @__PURE__ */ r.jsx(x.Suspense, { fallback: null, children: /* @__PURE__ */ r.jsx(Ia, { show: L, onClose: () => j(!1) }) }),
        /* @__PURE__ */ r.jsx(La, {})
      ]
    }
  );
};
function Ma(e) {
  if (e.querySelector("[data-dict-overlay-css]")) return;
  const t = document.createElement("link");
  t.rel = "stylesheet", t.dataset.dictOverlayCss = "true", t.href = chrome.runtime.getURL("overlay.css"), e.appendChild(t);
}
function ai(e, t, n, a) {
  Ma(e);
  let i = tn(t), o = { ...n };
  function s(l) {
    i && i.render(
      /* @__PURE__ */ r.jsx(
        Na,
        {
          selectedText: l.selectedText,
          contextSentence: l.contextSentence,
          lookupRequestId: l.lookupRequestId,
          isMaximized: l.isMaximized,
          onClose: a.onClose,
          onToggleMaximize: a.onToggleMaximize,
          onStartDrag: a.onStartDrag,
          onStartResize: a.onStartResize
        }
      )
    );
  }
  return s(o), {
    update(l) {
      o = { ...o, ...l }, s(o);
    },
    unmount() {
      i && (i.unmount(), i = null), t.innerHTML = "";
    }
  };
}
export {
  Oa as A,
  Ua as B,
  Tt as C,
  R as D,
  qn as E,
  Ga as F,
  Ft as G,
  ra as H,
  dt as I,
  Va as J,
  ta as K,
  ti as L,
  ea as M,
  Za as N,
  Ja as O,
  ya as P,
  Qa as Q,
  Xa as R,
  Ba as S,
  ei as T,
  ni as U,
  pa as V,
  Wa as W,
  za as X,
  ai as Y,
  $t as a,
  Y as b,
  te as c,
  la as d,
  ca as e,
  Ya as f,
  na as g,
  pt as h,
  Qn as i,
  qa as j,
  Fa as k,
  Gt as l,
  Ie as m,
  $a as n,
  ri as o,
  Ha as p,
  ye as q,
  Ka as r,
  Q as s,
  $r as t,
  aa as u,
  wt as v,
  $n as w,
  on as x,
  Da as y,
  N as z
};
