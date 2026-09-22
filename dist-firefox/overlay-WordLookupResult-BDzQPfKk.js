import { j as e, R as S, r as g } from "./overlay-react-core-BJZCkGtm.js";
import { WordFamilyCard as oe, CollocationsCard as re, WordFormationCard as le, UsageNotesCard as ie, LearnerMistakesCard as ce } from "./overlay-async-views-U00ADfLM.js";
import { E as ee, M as de } from "./overlay-component.markdown-renderer-CiP8MY0h.js";
import { c as j, j as te, b as D, l as xe, h as ne, H as pe, u as ue, J as me, e as fe, f as be, n as ge, K as X, L as he, M as je, o as ye } from "./overlay-overlay-app-BmJscKyW.js";
const Y = ({
  label: a,
  words: l,
  onSelectWord: n,
  className: c,
  limit: y = 8,
  tone: m = "neutral"
}) => {
  const d = (l || []).map((u) => String(u || "").trim()).filter(Boolean).slice(0, y);
  if (!d.length) return null;
  const w = m === "synonym" ? "badge-pos-verb" : m === "antonym" ? "badge-pos-adv" : "badge-pos-other";
  return /* @__PURE__ */ e.jsxs("div", { className: j("flex flex-wrap items-baseline gap-x-1.5 gap-y-1 text-[14.5px] leading-relaxed", c), children: [
    a ? /* @__PURE__ */ e.jsx("span", { className: j("inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-semibold uppercase tracking-wider shrink-0", w), children: a }) : null,
    d.map((u, o) => /* @__PURE__ */ e.jsxs(S.Fragment, { children: [
      o > 0 ? /* @__PURE__ */ e.jsx("span", { className: "text-content-muted/50 select-none", "aria-hidden": "true", children: "·" }) : null,
      /* @__PURE__ */ e.jsx(
        "button",
        {
          type: "button",
          onClick: () => n == null ? void 0 : n(u),
          title: `Look up ${u}`,
          className: "related-word-link",
          children: u
        }
      )
    ] }, `${u}-${o}`))
  ] });
};
function we(a) {
  const l = (a || "").toLowerCase();
  return l.includes("noun") ? "badge-pos-noun" : l.includes("verb") ? "badge-pos-verb" : l.includes("adj") ? "badge-pos-adj" : l.includes("adv") ? "badge-pos-adv" : "badge-pos-other";
}
const Ne = ({ meanings: a }) => {
  const l = a || [], { playPronunciation: n, playingKey: c } = te(), y = D("translateTargetLanguage"), [m, d] = g.useState("all"), w = g.useMemo(() => {
    const s = [];
    return l.forEach((x) => {
      var N, v;
      const p = x.partOfSpeech || "other", h = s.find((L) => L.pos.toLowerCase() === p.toLowerCase());
      h ? h.count += ((N = x.definitions) == null ? void 0 : N.length) || 0 : s.push({ pos: p, count: ((v = x.definitions) == null ? void 0 : v.length) || 0 });
    }), s;
  }, [l]), u = g.useMemo(
    () => l.reduce((s, x) => {
      var p;
      return s + (((p = x.definitions) == null ? void 0 : p.length) || 0);
    }, 0),
    [l]
  ), o = g.useMemo(() => m === "all" ? l : l.filter(
    (s) => (s.partOfSpeech || "other").toLowerCase() === m.toLowerCase()
  ), [l, m]);
  return /* @__PURE__ */ e.jsxs("div", { className: "space-y-4 pt-0.5", children: [
    w.length > 1 ? /* @__PURE__ */ e.jsxs("div", { className: "sticky top-0 z-10 -mx-1 px-1 py-1.5 bg-surface border-b border-border flex items-center gap-1.5 overflow-x-auto select-none", children: [
      /* @__PURE__ */ e.jsxs(
        "button",
        {
          type: "button",
          onClick: () => d("all"),
          className: j(
            "h-6 px-2.5 rounded-full text-[12px] font-semibold transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1",
            m === "all" ? "bg-accent text-accent-foreground shadow-2xs font-bold" : "bg-muted hover:bg-elevated text-content-secondary hover:text-content border border-border"
          ),
          children: [
            /* @__PURE__ */ e.jsx("span", { children: "All" }),
            /* @__PURE__ */ e.jsxs("span", { className: "font-mono text-[11px] opacity-75 font-normal", children: [
              "(",
              u,
              ")"
            ] })
          ]
        }
      ),
      w.map((s) => {
        const x = m.toLowerCase() === s.pos.toLowerCase();
        return /* @__PURE__ */ e.jsxs(
          "button",
          {
            type: "button",
            onClick: () => d(s.pos),
            className: j(
              "h-6 px-2.5 rounded-full text-[12px] font-semibold uppercase tracking-wider transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1",
              x ? "bg-accent text-accent-foreground shadow-2xs font-bold" : "bg-muted hover:bg-elevated text-content-secondary hover:text-content border border-border"
            ),
            children: [
              /* @__PURE__ */ e.jsx("span", { children: s.pos }),
              /* @__PURE__ */ e.jsxs("span", { className: "font-mono text-[11px] opacity-75 font-normal", children: [
                "(",
                s.count,
                ")"
              ] })
            ]
          },
          s.pos
        );
      })
    ] }) : null,
    o.map((s, x) => /* @__PURE__ */ e.jsxs(
      "div",
      {
        className: "space-y-3 rounded-lg border border-border bg-surface p-3.5",
        children: [
          /* @__PURE__ */ e.jsx("div", { className: "flex items-center justify-between", children: /* @__PURE__ */ e.jsx(
            "span",
            {
              className: j(
                "inline-flex items-center px-2 py-0.5 rounded-md font-semibold text-[11.5px] uppercase tracking-wider",
                we(s.partOfSpeech)
              ),
              children: s.partOfSpeech
            }
          ) }),
          /* @__PURE__ */ e.jsx("ol", { className: "space-y-3 text-content", children: s.definitions.map((p, h) => {
            const N = `sense-${x}-${h}`, v = c === N;
            return /* @__PURE__ */ e.jsxs("li", { className: "space-y-1.5", children: [
              /* @__PURE__ */ e.jsxs("div", { className: "flex items-start gap-2", children: [
                /* @__PURE__ */ e.jsxs("span", { className: "font-semibold text-accent text-[14px] mt-0.5 flex-shrink-0 font-mono select-none", children: [
                  h + 1,
                  "."
                ] }),
                /* @__PURE__ */ e.jsx("span", { className: "font-serif text-reading text-content tracking-[0.002em]", children: p.definition })
              ] }),
              p.example ? /* @__PURE__ */ e.jsx(
                ee,
                {
                  className: "ml-5",
                  english: p.example,
                  translation: p.exampleTranslation,
                  targetLang: y,
                  isPlaying: v,
                  onListen: () => n({
                    text: p.example,
                    language: "en-US",
                    key: N
                  })
                }
              ) : null
            ] }, h);
          }) })
        ]
      },
      s.partOfSpeech || x
    ))
  ] });
}, ke = S.memo(Ne);
function Z(a) {
  return String(a || "").toLowerCase().replace(/["“”'‘’.,/#!$%^&*;:{}=\-_`~()]/g, "").replace(/\s+/g, " ").trim();
}
function ve(a) {
  return String(a || "").toLowerCase().trim();
}
function Se(a) {
  const l = [], n = [], c = [], y = /* @__PURE__ */ new Set(), m = /* @__PURE__ */ new Set(), d = /* @__PURE__ */ new Set(), w = (o) => {
    const s = Z(o == null ? void 0 : o.text);
    !s || y.has(s) || (y.add(s), l.push({ text: String((o == null ? void 0 : o.text) || ""), translation: o == null ? void 0 : o.translation }));
  }, u = (o, s, x) => {
    const p = ve(x);
    !p || s.has(p) || (s.add(p), o.push({ text: String(x || "") }));
  };
  for (const o of (a == null ? void 0 : a.meanings) || []) {
    for (const s of o.definitions || []) {
      s.example && y.add(Z(s.example));
      for (const x of s.synonyms || []) u(n, m, x);
      for (const x of s.antonyms || []) u(c, d, x);
    }
    for (const s of o.synonyms || []) u(n, m, s);
    for (const s of o.antonyms || []) u(c, d, s);
  }
  for (const o of (a == null ? void 0 : a.examples) || []) w(o);
  for (const o of (a == null ? void 0 : a.synonyms) || []) u(n, m, o.text);
  for (const o of (a == null ? void 0 : a.antonyms) || []) u(c, d, o.text);
  return { examples: l, synonyms: n, antonyms: c };
}
function Ce({ label: a, count: l, children: n }) {
  return /* @__PURE__ */ e.jsxs("details", { className: "rounded-2xl border border-border/80 bg-surface shadow-xs overflow-hidden group", children: [
    /* @__PURE__ */ e.jsxs("summary", { className: "px-4 py-3 text-[12.5px] font-bold text-content-secondary uppercase tracking-wider flex items-center justify-between gap-2 cursor-pointer select-none hover:bg-muted/40 transition-colors", children: [
      /* @__PURE__ */ e.jsxs("span", { className: "flex items-center gap-2 min-w-0", children: [
        /* @__PURE__ */ e.jsx(xe, { className: "w-3.5 h-3.5 text-accent shrink-0" }),
        /* @__PURE__ */ e.jsx("span", { className: "truncate", children: a }),
        typeof l == "number" ? /* @__PURE__ */ e.jsxs("span", { className: "text-[11px] font-mono text-content-muted normal-case", children: [
          "(",
          l,
          ")"
        ] }) : null
      ] }),
      /* @__PURE__ */ e.jsx(ne, { className: "w-4 h-4 text-content-muted group-hover:text-content transition-transform shrink-0" })
    ] }),
    /* @__PURE__ */ e.jsx("div", { className: "dictionary-detail-content px-4 pb-4 space-y-3.5 border-t border-border/60 pt-3.5", children: n })
  ] });
}
const k = S.memo(Ce);
function Le({ sources: a }) {
  if (!a.length) return null;
  const l = a.filter((c) => c.status === "contributed").length, n = a.filter((c) => c.status === "not_found").length;
  return /* @__PURE__ */ e.jsxs("details", { className: "ui-disclosure group rounded-xl border border-border/70 bg-muted/25 px-3 py-2", children: [
    /* @__PURE__ */ e.jsxs("summary", { className: "flex cursor-pointer list-none items-center justify-between gap-2 text-[13px] font-semibold text-content-secondary outline-none focus-visible:ring-2 focus-visible:ring-accent/40 rounded-lg", children: [
      /* @__PURE__ */ e.jsxs("span", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ e.jsx("span", { className: "h-1.5 w-1.5 rounded-full bg-emerald-500", "aria-hidden": "true" }),
        /* @__PURE__ */ e.jsx("span", { children: "Sources" }),
        /* @__PURE__ */ e.jsxs("span", { className: "font-mono text-[12px] text-content-muted", "aria-live": "polite", children: [
          l,
          " contributed",
          n ? ` · ${n} no usable result` : ""
        ] })
      ] }),
      /* @__PURE__ */ e.jsx(ne, { className: "h-3.5 w-3.5 text-content-muted transition-transform group-open:rotate-180", "aria-hidden": "true" })
    ] }),
    /* @__PURE__ */ e.jsx("div", { className: "mt-2 flex flex-wrap gap-1.5", "aria-label": "Dictionary provider sources", children: a.map((c) => /* @__PURE__ */ e.jsx(
      "span",
      {
        className: [
          "rounded-full border px-2 py-1 text-[12px] font-medium capitalize",
          c.status === "contributed" ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : c.status === "cancelled" ? "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300" : c.status === "failed" ? "border-rose-500/25 bg-rose-500/10 text-rose-700 dark:text-rose-300" : "border-border bg-surface text-content-muted"
        ].join(" "),
        title: `${c.label}: ${c.status === "not_found" ? "no usable result" : c.status}`,
        "aria-label": `${c.label}: ${c.status === "not_found" ? "no usable result" : c.status}`,
        children: c.label
      },
      c.providerId
    )) })
  ] });
}
const Pe = S.memo(Le), $e = S.memo(({ translation: a }) => {
  var l;
  return /* @__PURE__ */ e.jsxs("section", { className: "p-3.5 rounded-2xl border border-border/80 bg-gradient-to-r from-accent-subtle/50 to-transparent flex items-baseline justify-between gap-3 shadow-xs", children: [
    /* @__PURE__ */ e.jsxs("div", { className: "space-y-1 min-w-0 flex-1", children: [
      /* @__PURE__ */ e.jsx("span", { className: "text-[11px] font-bold text-accent uppercase tracking-wider font-mono", children: "Translation" }),
      /* @__PURE__ */ e.jsx("p", { className: "font-serif text-reading text-content font-semibold break-words", children: a.translatedText })
    ] }),
    /* @__PURE__ */ e.jsx("span", { className: "text-[11px] text-content-muted flex-shrink-0 font-mono px-2 py-0.5 rounded-md bg-surface border border-border/60 shadow-2xs", children: ((l = a.sourceBadges) == null ? void 0 : l.map((n) => n.label).join(" · ")) || "Google" })
  ] });
}), Me = ({ onSelectWord: a, contextSentence: l }) => {
  var B, K, O, z, W, _, H, I, G, q, J, Q;
  const { result: n, isEnriching: c } = pe(), y = ue(), { playingKey: m } = te(), { practiceResult: d, isPracticing: w, supportsSpeechPractice: u } = me(), o = D("translateTargetLanguage"), s = D("enableLexicalProfile"), [x, p] = S.useState(!1), h = g.useMemo(() => {
    const t = n;
    return String((t == null ? void 0 : t.originalText) || y || (t == null ? void 0 : t.word) || "").trim();
  }, [n, y]), N = g.useMemo(() => {
    const t = (n == null ? void 0 : n.phonetics) || [], r = /* @__PURE__ */ new Set();
    return t.filter((i) => {
      const f = String(i.text || "").trim(), C = String(i.audio || "").trim(), b = `${f}|${C}|${i.region || ""}|${i.language || ""}`;
      return r.has(b) ? !1 : (r.add(b), !!(f || C));
    });
  }, [n]);
  function v(t) {
    const r = String((n == null ? void 0 : n.word) || "").trim().toLowerCase(), i = String((t == null ? void 0 : t.text) || "").trim();
    return i && i.toLowerCase() !== r ? i : "";
  }
  function L(t) {
    var r, i, f;
    return t.label ? t.label : t.region === "uk" || (r = t.language) != null && r.toLowerCase().includes("gb") ? "UK" : t.region === "us" || (i = t.language) != null && i.toLowerCase().includes("us") ? "US" : ((f = t.region) == null ? void 0 : f.toUpperCase()) || "Audio";
  }
  const R = ((B = n == null ? void 0 : n.lexicalProfile) == null ? void 0 : B.usageWarnings) || [], U = g.useMemo(() => {
    var r;
    const t = (r = n == null ? void 0 : n.lexicalProfile) == null ? void 0 : r.wordFormation;
    return t ? typeof t == "string" ? t : t.explanation || "" : "";
  }, [n]), A = g.useMemo(() => {
    var r;
    const t = (r = n == null ? void 0 : n.lexicalProfile) == null ? void 0 : r.wordFormation;
    return typeof t == "object" ? (t == null ? void 0 : t.prefixes) || [] : [];
  }, [n]), F = g.useMemo(() => {
    var r;
    const t = (r = n == null ? void 0 : n.lexicalProfile) == null ? void 0 : r.wordFormation;
    return typeof t == "object" ? (t == null ? void 0 : t.suffixes) || [] : [];
  }, [n]);
  function P(t) {
    a == null || a(t);
  }
  function se() {
    if (!n) return;
    const t = N[0] ? v(N[0]) : "", r = t ? ` \`/${t.replace(/^\/+|\/+$/g, "")}/\`` : "";
    let i = `### ${h}${r}

`;
    n.meanings && n.meanings.length > 0 && n.meanings.slice(0, 3).forEach((f) => {
      var V;
      const C = f.partOfSpeech ? `*(${f.partOfSpeech})* ` : "", b = (V = f.definitions) == null ? void 0 : V[0];
      b != null && b.definition && (i += `> ${C}${b.definition}
`, b.example && (i += `- *Example:* "${b.example}"
`), i += `
`);
    }), n.translation && (i += `*Translation:* ${n.translation.translatedText || n.translation}
`), navigator.clipboard.writeText(i.trim()).then(() => {
      p(!0), setTimeout(() => p(!1), 1800), ye("Copied definition to clipboard");
    });
  }
  const { examples: $, synonyms: M, antonyms: E } = g.useMemo(
    () => Se(n),
    [n]
  );
  if (!n) return null;
  const T = String(l || "").replace(/\s+/g, " ").trim(), ae = !!(T && T.toLowerCase() !== h.toLowerCase());
  return /* @__PURE__ */ e.jsxs("div", { className: "space-y-3.5", children: [
    /* @__PURE__ */ e.jsxs("div", { className: "p-4 rounded-2xl border border-border/80 bg-surface shadow-xs space-y-3", children: [
      /* @__PURE__ */ e.jsxs("div", { className: "flex items-start justify-between gap-3", children: [
        /* @__PURE__ */ e.jsxs("div", { className: "space-y-1 min-w-0", children: [
          /* @__PURE__ */ e.jsx("h2", { className: "text-2xl sm:text-3xl font-bold text-content font-heading tracking-tight leading-tight min-w-0 break-words", children: h }),
          c ? /* @__PURE__ */ e.jsxs(
            "span",
            {
              className: "inline-flex items-center gap-1.5 text-[12px] font-bold font-mono uppercase tracking-wider text-accent bg-accent-subtle px-2 py-0.5 rounded-full border border-accent/25",
              "aria-live": "polite",
              children: [
                /* @__PURE__ */ e.jsx("span", { className: "w-1.5 h-1.5 rounded-full bg-accent animate-pulse", "aria-hidden": "true" }),
                "Enriching Lexical Data…"
              ]
            }
          ) : null
        ] }),
        /* @__PURE__ */ e.jsx("div", { className: "flex items-center gap-1.5 shrink-0", children: /* @__PURE__ */ e.jsx(
          "button",
          {
            type: "button",
            onClick: se,
            title: "Copy definition as Markdown flashcard",
            "aria-label": "Copy definition as Markdown flashcard",
            className: j(
              "h-8 px-2.5 rounded-xl border text-[13.5px] font-semibold transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs active:scale-95 select-none",
              x ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-700 dark:text-emerald-300 font-bold" : "bg-muted/60 hover:bg-elevated border-border/80 text-content-secondary hover:text-content"
            ),
            children: x ? /* @__PURE__ */ e.jsxs(e.Fragment, { children: [
              /* @__PURE__ */ e.jsx(fe, { className: "w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" }),
              /* @__PURE__ */ e.jsx("span", { children: "Copied" })
            ] }) : /* @__PURE__ */ e.jsxs(e.Fragment, { children: [
              /* @__PURE__ */ e.jsx(be, { className: "w-3.5 h-3.5 text-content-muted" }),
              /* @__PURE__ */ e.jsx("span", { className: "hidden sm:inline", children: "Copy MD" })
            ] })
          }
        ) })
      ] }),
      /* @__PURE__ */ e.jsxs("div", { className: "flex flex-wrap items-center gap-2 pt-1 border-t border-border/60", children: [
        N.map((t, r) => {
          const i = `phonetic-${r}-${t.region || t.language || "audio"}`, f = v(t), C = t.language || (t.region === "uk" ? "en-GB" : "en-US"), b = m === i;
          return /* @__PURE__ */ e.jsxs(
            "button",
            {
              type: "button",
              onClick: () => X({
                text: h,
                audioUrl: t.audio,
                language: C,
                key: i
              }),
              className: j(
                "h-8 pl-2 pr-3 py-1 rounded-xl border font-medium transition-colors flex items-center gap-2 cursor-pointer shadow-2xs group active:scale-95",
                b ? "bg-accent text-accent-foreground border-accent font-bold audio-playing-indicator" : "bg-muted/40 hover:bg-accent-subtle hover:border-accent/40 text-content-secondary hover:text-content border-border/80"
              ),
              "aria-pressed": b,
              title: `Listen pronunciation (${L(t)})`,
              children: [
                /* @__PURE__ */ e.jsx("span", { className: j(
                  "text-[10.5px] font-extrabold uppercase px-1.5 py-0.5 rounded-md font-mono transition-colors",
                  b ? "bg-paper/20 text-accent-foreground" : "bg-surface text-content-muted border border-border/60 group-hover:text-accent"
                ), children: L(t) }),
                b ? /* @__PURE__ */ e.jsxs("span", { className: "soundwave-bars text-accent-foreground", children: [
                  /* @__PURE__ */ e.jsx("span", { className: "soundwave-bar" }),
                  /* @__PURE__ */ e.jsx("span", { className: "soundwave-bar" }),
                  /* @__PURE__ */ e.jsx("span", { className: "soundwave-bar" })
                ] }) : /* @__PURE__ */ e.jsx(ge, { className: "w-3.5 h-3.5 text-accent shrink-0 group-hover:scale-110 transition-transform" }),
                /* @__PURE__ */ e.jsx("span", { className: j(
                  "font-mono text-[14.5px] leading-none tracking-wide font-medium",
                  b ? "text-accent-foreground" : "text-content"
                ), children: f ? `/${f.replace(/^\/+|\/+$/g, "")}/` : "Audio" })
              ]
            },
            i
          );
        }),
        u ? /* @__PURE__ */ e.jsxs(
          "button",
          {
            type: "button",
            onClick: () => je(h, "en-US"),
            className: j(
              "h-8 px-3 rounded-xl border text-[12.5px] font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95",
              w ? "bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40 animate-pulse font-bold" : "bg-muted/40 hover:bg-elevated text-content-secondary hover:text-content border-border/80 hover:border-amber-500/40"
            ),
            "aria-pressed": w,
            title: "Practice speaking and get a speech similarity score",
            children: [
              /* @__PURE__ */ e.jsx(he, { className: "w-3.5 h-3.5 text-amber-600 dark:text-amber-400" }),
              /* @__PURE__ */ e.jsx("span", { children: w ? "Listening…" : "Practice Pronunciation" })
            ]
          }
        ) : null
      ] })
    ] }),
    ae ? /* @__PURE__ */ e.jsxs("section", { className: "p-3.5 rounded-2xl border border-border/80 bg-surface/80 shadow-xs space-y-1", children: [
      /* @__PURE__ */ e.jsx("span", { className: "text-[11px] font-bold uppercase tracking-wider font-mono text-content-muted", children: "Selection Context" }),
      /* @__PURE__ */ e.jsx("p", { className: "font-serif text-reading text-content", children: T })
    ] }) : null,
    (K = n.translation) != null && K.translatedText ? /* @__PURE__ */ e.jsx($e, { translation: n.translation }) : null,
    d ? /* @__PURE__ */ e.jsxs(
      "div",
      {
        className: j(
          "rounded-2xl border p-3.5 text-[13.5px] space-y-2 shadow-xs",
          d.grade === "excellent" ? "border-emerald-500/30 bg-emerald-500/8 text-emerald-800 dark:text-emerald-200" : d.grade === "good" ? "border-accent/30 bg-accent-subtle text-accent" : d.grade === "almost" ? "border-amber-500/30 bg-amber-500/8 text-amber-800 dark:text-amber-200" : "border-rose-500/30 bg-rose-500/8 text-rose-800 dark:text-rose-200"
        ),
        children: [
          /* @__PURE__ */ e.jsxs("div", { className: "flex items-center justify-between font-bold text-sm", children: [
            /* @__PURE__ */ e.jsxs("span", { children: [
              "Score: ",
              d.score,
              "% · ",
              d.gradeLabel
            ] }),
            d.spoken ? /* @__PURE__ */ e.jsxs("span", { className: "text-xs font-normal opacity-85 font-mono", children: [
              "Heard: “",
              d.spoken,
              "”"
            ] }) : null
          ] }),
          d.details && d.details.length > 1 ? /* @__PURE__ */ e.jsx("div", { className: "flex flex-wrap gap-1.5 pt-1", children: d.details.map((t, r) => /* @__PURE__ */ e.jsx(
            "span",
            {
              className: j(
                "px-2 py-0.5 rounded-lg text-[12px] font-mono font-medium border shadow-2xs",
                t.matched ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-700 dark:text-emerald-300 font-bold" : t.closeMatch ? "bg-amber-500/15 border-amber-500/30 text-amber-700 dark:text-amber-300" : "bg-rose-500/15 border-rose-500/30 text-rose-700 dark:text-rose-300"
              ),
              children: t.word
            },
            `${t.word}-${r}`
          )) }) : null
        ]
      }
    ) : null,
    (O = n.meanings) != null && O.length ? /* @__PURE__ */ e.jsx(ke, { meanings: n.meanings }) : null,
    (z = n.phraseExplanation) != null && z.length ? /* @__PURE__ */ e.jsxs("section", { className: "p-4 rounded-2xl border border-border/80 bg-surface shadow-xs space-y-2.5", children: [
      /* @__PURE__ */ e.jsx("p", { className: "text-[12px] font-bold uppercase tracking-wider font-mono text-accent", children: "Phrase Explanation" }),
      n.phraseExplanation.map((t, r) => {
        var i;
        return /* @__PURE__ */ e.jsxs("div", { className: "space-y-1.5", children: [
          t.title && r > 0 ? /* @__PURE__ */ e.jsx("div", { className: "font-bold text-[14px] text-content", children: t.title }) : null,
          t.markdown || t.text ? /* @__PURE__ */ e.jsx(de, { content: t.text || "" }) : null,
          (i = t.items) != null && i.length ? /* @__PURE__ */ e.jsx("ul", { className: "space-y-1 text-reading-compact text-content list-disc pl-4", children: t.items.map((f) => /* @__PURE__ */ e.jsx("li", { children: f }, f)) }) : null
        ] }, r);
      })
    ] }) : null,
    $.length ? /* @__PURE__ */ e.jsx(k, { label: "Examples", count: $.length, children: $.map((t, r) => {
      const i = `example-${r}`;
      return /* @__PURE__ */ e.jsx(
        ee,
        {
          english: t.text,
          translation: t.translation,
          targetLang: o,
          isPlaying: m === i,
          onListen: () => X({
            text: t.text,
            language: "en-US",
            key: i
          })
        },
        `${t.text}-${r}`
      );
    }) }) : null,
    M.length ? /* @__PURE__ */ e.jsx(k, { label: "Synonyms", count: M.length, children: /* @__PURE__ */ e.jsx(
      Y,
      {
        label: "Synonyms",
        tone: "synonym",
        words: M.map((t) => t.text),
        onSelectWord: P
      }
    ) }) : null,
    E.length ? /* @__PURE__ */ e.jsx(k, { label: "Antonyms", count: E.length, children: /* @__PURE__ */ e.jsx(
      Y,
      {
        label: "Antonyms",
        tone: "antonym",
        words: E.map((t) => t.text),
        onSelectWord: P
      }
    ) }) : null,
    s !== !1 && ((W = n.lexicalProfile) != null && W.wordFamily) ? /* @__PURE__ */ e.jsx(k, { label: "Word family", children: /* @__PURE__ */ e.jsx(g.Suspense, { fallback: null, children: /* @__PURE__ */ e.jsx(
      oe,
      {
        word: h,
        family: n.lexicalProfile.wordFamily,
        onSelectWord: P
      }
    ) }) }) : null,
    s !== !1 && ((_ = n.lexicalProfile) != null && _.collocations) ? /* @__PURE__ */ e.jsx(k, { label: "Collocations", children: /* @__PURE__ */ e.jsx(g.Suspense, { fallback: null, children: /* @__PURE__ */ e.jsx(
      re,
      {
        word: h,
        collocations: n.lexicalProfile.collocations,
        onSelectWord: P
      }
    ) }) }) : null,
    s !== !1 && (U || A.length || F.length) ? /* @__PURE__ */ e.jsx(k, { label: "Word formation", children: /* @__PURE__ */ e.jsx(g.Suspense, { fallback: null, children: /* @__PURE__ */ e.jsx(
      le,
      {
        formation: U,
        prefixes: A,
        suffixes: F
      }
    ) }) }) : null,
    s !== !1 && ((H = n.lexicalProfile) != null && H.usageNotes || R.length || (I = n.lexicalProfile) != null && I.confusablePairs) ? /* @__PURE__ */ e.jsx(k, { label: "Usage and nuance", children: /* @__PURE__ */ e.jsx(g.Suspense, { fallback: null, children: /* @__PURE__ */ e.jsx(
      ie,
      {
        notes: (G = n.lexicalProfile) == null ? void 0 : G.usageNotes,
        warnings: R,
        pairs: (q = n.lexicalProfile) == null ? void 0 : q.confusablePairs
      }
    ) }) }) : null,
    s !== !1 && ((Q = (J = n.lexicalProfile) == null ? void 0 : J.learnerMistakes) != null && Q.length) ? /* @__PURE__ */ e.jsx(k, { label: "Learner mistakes", count: n.lexicalProfile.learnerMistakes.length, children: /* @__PURE__ */ e.jsx(g.Suspense, { fallback: null, children: /* @__PURE__ */ e.jsx(ce, { mistakes: n.lexicalProfile.learnerMistakes }) }) }) : null,
    /* @__PURE__ */ e.jsx(Pe, { sources: n.sources || [] })
  ] });
}, Ue = S.memo(Me);
export {
  Me as WordLookupResult,
  Ue as default
};
