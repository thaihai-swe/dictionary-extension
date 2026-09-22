import { r as i, j as e } from "./overlay-react-core-BJZCkGtm.js";
import { SentenceBreakdownIntent as Z, ConfusablesIntent as H, RephraseIntent as J, AiMarkdownIntent as X } from "./overlay-async-views-U00ADfLM.js";
import { c as k, u as Y, b as ee, s as v, d as te, a as ne, e as se, f as re, P as oe, g as ae } from "./overlay-overlay-app-BmJscKyW.js";
import { useAiAssistant as ce, AI_INTENTS as ie } from "./overlay-composable.ai-assistant-BpTx9YBJ.js";
const le = ({ text: l, query: c, onSelectToken: n, className: x }) => {
  const f = i.useMemo(() => {
    if (!l) return [];
    const d = l.split(/(\s+|[.,!?;:"'()\[\]{}]+)/), s = (c || "").toLowerCase().trim();
    return d.filter(Boolean).map((a) => {
      const m = /^[a-zA-Z0-9'-]+$/.test(a), w = m && s.length > 0 && a.toLowerCase() === s;
      return { text: a, isWord: m, isQuery: w };
    });
  }, [l, c]);
  return /* @__PURE__ */ e.jsx("div", { className: k("text-[14px] leading-relaxed font-sans text-content", x || "p-3 rounded-lg border border-border bg-muted/60"), children: f.map(
    (d, s) => d.isWord ? /* @__PURE__ */ e.jsx(
      "span",
      {
        onClick: () => n == null ? void 0 : n(d.text),
        className: k(
          "inline-block cursor-pointer rounded px-0.5 transition-colors",
          d.isQuery ? "bg-accent-subtle text-accent font-bold border-b-2 border-accent" : "hover:bg-accent-subtle hover:text-accent text-content"
        ),
        title: `Click to lookup '${d.text}'`,
        children: d.text
      },
      s
    ) : /* @__PURE__ */ e.jsx("span", { className: "text-content-secondary", children: d.text }, s)
  ) });
}, de = {
  default: "Main AI Explanation",
  explain_in_context: "Context Explanation",
  grammar: "Grammar & Nuance",
  collocations: "Phrase & Collocations",
  sentence_breakdown: "Sentence Breakdown",
  confusables: "Compare Confusables",
  rephrase: "Rephrase",
  rewrite: "Rewriter",
  phrase_fallback: "Phrase Explanation"
};
function b(l, c) {
  const n = String(l || "").trim();
  return n || String(c || "").trim();
}
function M(l, c) {
  const n = String(l || "").trim(), x = String(c || "").replace(/\s+/g, " ").trim();
  return !x || n && x.toLowerCase() === n.toLowerCase() ? "" : x;
}
const he = ({
  initialQuery: l,
  initialContext: c,
  targetLang: n,
  isVisible: x = !0,
  onSwitchTab: f
}) => {
  const {
    activeContext: d,
    activeIntent: s,
    aiResult: a,
    isAiLoading: m,
    aiError: w,
    intentStatusEpoch: T,
    runIntent: g,
    preloadSpecificIntent: W,
    preloadFollowUpIntentsOnTabVisit: B,
    getAiIntentStatus: E,
    isAiIntentDisabled: S,
    abortActiveAiRequest: $
  } = ce(), F = Y(), G = ee("translateTargetLanguage"), [u, j] = i.useState(""), [r, N] = i.useState(""), [_, q] = i.useState(!1), [P, h] = i.useState(""), [Q, A] = i.useState(!1), C = n || G, p = b(u, r), K = i.useMemo(
    () => ie.map((t) => ({
      ...t,
      isActive: s === t.id,
      isDisabled: !p || S(t.id, p, r, n),
      status: p ? E(t.id, p, r, n) : "unrequested"
    })),
    [s, r, T, S, E, p, n]
  );
  function z(t = s) {
    const o = b(u, r);
    if (!o) return;
    const y = r.trim();
    if (t === "explain_in_context" && !y) {
      h("Please enter or paste the sentence containing this word.");
      return;
    }
    h(""), g(t, o, n, y);
  }
  i.useEffect(() => {
    const o = b(l || F, c), y = M(o, c || d);
    if (j(o), N(y), o) {
      const V = o, R = y;
      s === "explain_in_context" && !R ? h("Please enter or paste the sentence containing this word.") : (h(""), g(s, V, n, R));
    }
    return () => {
      v(), $();
    };
  }, []), i.useEffect(() => {
    const t = b(l, c);
    if (!t) return;
    const o = M(t, c);
    j(t), N(o), s === "explain_in_context" && !o ? h("Please enter or paste the sentence containing this word.") : (h(""), g(s, t, n, o));
  }, [l, c]), i.useEffect(() => {
    if (!x) return;
    const t = b(u, r);
    if (!t) return;
    const o = r.trim();
    B(t, o, n);
  }, [x, u, r, n]), i.useEffect(() => {
    n && b(u, r) && z();
  }, [n]);
  function I(t) {
    v(), z(t);
  }
  function L(t) {
    v(), j(t.query), t.context && N(t.context), g(t.intent || s, t.query, n, t.context);
  }
  function D(t) {
    v(), ae(t), f == null || f("dictionary");
  }
  function O(t) {
    t && navigator.clipboard.writeText(t).then(() => {
      q(!0), setTimeout(() => {
        q(!1);
      }, 1800);
    });
  }
  function U(t, o) {
    return /* @__PURE__ */ e.jsx(
      "span",
      {
        className: k(
          "w-1.5 h-1.5 rounded-full flex-shrink-0 transition-colors",
          o || t === "ready" ? "bg-accent" : t === "loading" ? "bg-amber-500 animate-pulse" : "bg-content-muted/40"
        ),
        "aria-hidden": "true"
      }
    );
  }
  return /* @__PURE__ */ e.jsxs("div", { className: "p-4 space-y-4 font-sans", children: [
    /* @__PURE__ */ e.jsxs("div", { className: "relative flex items-center", children: [
      /* @__PURE__ */ e.jsx("span", { className: "absolute left-3 text-content-muted pointer-events-none", children: /* @__PURE__ */ e.jsx(te, { className: "w-3.5 h-3.5" }) }),
      /* @__PURE__ */ e.jsx(
        "input",
        {
          value: u,
          onChange: (t) => j(t.target.value),
          onKeyDown: (t) => {
            t.key === "Enter" && I(s);
          },
          type: "text",
          placeholder: "Analyze a word or sentence…",
          "aria-label": "Analyze a word or sentence",
          className: "ui-control w-full h-11 pl-10 pr-24 text-[14.5px] placeholder:text-content-muted font-sans shadow-inner-light"
        }
      ),
      u ? /* @__PURE__ */ e.jsx(
        "button",
        {
          type: "button",
          onClick: () => {
            j(""), v();
          },
          title: "Clear search text",
          "aria-label": "Clear search text",
          className: "absolute right-[4.75rem] text-content-muted hover:text-content p-1 cursor-pointer flex items-center justify-center",
          children: /* @__PURE__ */ e.jsx(ne, { className: "w-3.5 h-3.5" })
        }
      ) : null,
      /* @__PURE__ */ e.jsx(
        "button",
        {
          type: "button",
          onClick: () => I(s),
          disabled: !u || m,
          className: "ui-button-primary absolute right-1.5 !min-h-7 h-7 px-3 rounded-md text-[13px] font-semibold cursor-pointer",
          children: /* @__PURE__ */ e.jsx("span", { children: m ? "Analyzing…" : "Analyze" })
        }
      )
    ] }),
    !Q && !r.trim() ? /* @__PURE__ */ e.jsx("div", { className: "flex items-center justify-end px-0.5", children: /* @__PURE__ */ e.jsx(
      "button",
      {
        type: "button",
        onClick: () => A(!0),
        className: "text-[12px] text-accent hover:underline font-medium cursor-pointer",
        children: "+ Add context"
      }
    ) }) : Q ? /* @__PURE__ */ e.jsxs("div", { className: "rounded-2xl border border-border/80 bg-surface/90 p-3 space-y-2.5 shadow-xs", children: [
      /* @__PURE__ */ e.jsxs("div", { className: "flex items-center justify-between gap-2", children: [
        /* @__PURE__ */ e.jsx("span", { className: "text-[12px] font-bold uppercase tracking-wider text-content-muted", children: "Context Sentence" }),
        /* @__PURE__ */ e.jsx(
          "button",
          {
            type: "button",
            onClick: () => A(!1),
            className: "text-[12px] font-medium text-content-secondary hover:text-content cursor-pointer",
            children: "Done"
          }
        )
      ] }),
      /* @__PURE__ */ e.jsx(
        "textarea",
        {
          value: r,
          onChange: (t) => N(t.target.value),
          rows: 2,
          placeholder: "Paste the sentence that contains this word...",
          className: "ui-control w-full px-2.5 py-1.5 text-[13.5px] placeholder:text-content-muted resize-y min-h-[44px]"
        }
      ),
      r.trim() ? /* @__PURE__ */ e.jsx(
        le,
        {
          text: r,
          query: u,
          onSelectToken: D
        }
      ) : null,
      P ? /* @__PURE__ */ e.jsx("p", { className: "text-[12px] text-rose-600 dark:text-rose-400", children: P }) : null
    ] }) : /* @__PURE__ */ e.jsx(
      "button",
      {
        type: "button",
        onClick: () => A(!0),
        className: "max-w-full inline-flex items-center gap-1.5 min-h-[28px] px-2.5 rounded-full border border-accent/25 bg-accent-subtle text-accent text-[12px] font-medium cursor-pointer whitespace-nowrap",
        title: "Edit context sentence",
        children: /* @__PURE__ */ e.jsx("span", { className: "truncate max-w-[22rem]", children: r.trim() })
      }
    ),
    /* @__PURE__ */ e.jsx("div", { className: "flex flex-wrap gap-1.5 pt-0.5", children: K.map((t) => /* @__PURE__ */ e.jsxs(
      "button",
      {
        type: "button",
        disabled: t.isDisabled,
        onClick: () => I(t.id),
        onMouseEnter: () => {
          t.id !== s && p && W(t.id, p, r, n);
        },
        "aria-pressed": t.isActive,
        className: k(
          "inline-flex items-center gap-1.5 min-h-[30px] px-3 rounded-xl border text-[12px] font-medium transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap focus-visible:ring-2 focus-visible:ring-accent",
          t.isActive ? "chip-active font-semibold" : "bg-surface hover:bg-elevated text-content-secondary hover:text-content border-border"
        ),
        children: [
          U(t.status, t.isActive),
          /* @__PURE__ */ e.jsx("span", { children: t.label })
        ]
      },
      t.id
    )) }),
    /* @__PURE__ */ e.jsx("div", { className: "space-y-3 pt-1 [&_.reading-prose]:max-w-none", children: m ? /* @__PURE__ */ e.jsxs("div", { className: "p-4 rounded-2xl border border-border/80 bg-surface/90 shadow-xs space-y-3.5", "aria-busy": "true", "aria-live": "polite", children: [
      /* @__PURE__ */ e.jsxs("div", { className: "flex items-center justify-between pb-1.5 border-b border-border/60", children: [
        /* @__PURE__ */ e.jsx("div", { className: "h-3.5 skeleton-shimmer rounded w-1/3" }),
        /* @__PURE__ */ e.jsx("div", { className: "h-3 skeleton-shimmer rounded w-16" })
      ] }),
      /* @__PURE__ */ e.jsxs("div", { className: "space-y-2", children: [
        /* @__PURE__ */ e.jsx("div", { className: "h-3.5 skeleton-shimmer rounded w-11/12" }),
        /* @__PURE__ */ e.jsx("div", { className: "h-3.5 skeleton-shimmer rounded w-full" }),
        /* @__PURE__ */ e.jsx("div", { className: "h-3.5 skeleton-shimmer rounded w-4/5" })
      ] }),
      /* @__PURE__ */ e.jsx("div", { className: "h-16 skeleton-shimmer rounded-lg mt-2" })
    ] }) : w ? /* @__PURE__ */ e.jsx("div", { role: "alert", className: "p-4 rounded-2xl bg-rose-500/8 border border-rose-500/25 text-[13.5px] text-rose-700 dark:text-rose-400 shadow-xs", children: w }) : a ? /* @__PURE__ */ e.jsxs("div", { className: "space-y-3", children: [
      /* @__PURE__ */ e.jsxs("div", { className: "flex items-center justify-between pb-1 border-b border-border", children: [
        /* @__PURE__ */ e.jsx("h3", { className: "text-[13px] font-semibold text-content uppercase tracking-wider font-mono", children: de[a.type] || "AI Explanation" }),
        /* @__PURE__ */ e.jsxs(
          "button",
          {
            type: "button",
            onClick: () => O(a.summary),
            title: "Copy response",
            className: "h-7 px-2 rounded bg-surface hover:bg-elevated text-content-secondary hover:text-content border border-border text-[12px] font-medium transition-colors cursor-pointer inline-flex items-center gap-1",
            children: [
              _ ? /* @__PURE__ */ e.jsx(se, { className: "w-3 h-3 text-emerald-600 dark:text-emerald-400" }) : /* @__PURE__ */ e.jsx(re, { className: "w-3 h-3" }),
              /* @__PURE__ */ e.jsx("span", { children: _ ? "Copied" : "Copy" })
            ]
          }
        )
      ] }),
      /* @__PURE__ */ e.jsx(i.Suspense, { fallback: /* @__PURE__ */ e.jsx("div", { className: "p-3 text-[13.5px] text-content-muted", children: "Loading analysis…" }), children: a.type === "sentence_breakdown" ? /* @__PURE__ */ e.jsx(Z, { result: a, targetLang: C }) : a.type === "confusables" ? /* @__PURE__ */ e.jsx(H, { result: a, targetLang: C }) : a.type === "rephrase" ? /* @__PURE__ */ e.jsx(J, { result: a, targetLang: C }) : /* @__PURE__ */ e.jsx(
        X,
        {
          result: a,
          targetLang: C,
          onSelectWord: D
        }
      ) })
    ] }) : !u.trim() && !p ? /* @__PURE__ */ e.jsx(oe, { onSelect: L }) : null })
  ] });
};
export {
  he as AiAssistantView,
  he as default
};
