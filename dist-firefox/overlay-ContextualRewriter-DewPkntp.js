import { R as E, j as e, r as i } from "./overlay-react-core-BJZCkGtm.js";
import { h as $, i as O, j as z, k as F, l as C, c as V, m as B, r as U, n as W, e as S, f as I, o as Y } from "./overlay-overlay-app-BmJscKyW.js";
import { p as _, s as G, f as h } from "./overlay-rewrite-markdown-iXdD2hoE.js";
const J = ({ content: t }) => {
  const s = E.useMemo(() => _(t), [t]);
  return !s.sections.length && !s.polished ? /* @__PURE__ */ e.jsx("div", { className: "p-4 text-xs text-content-muted rounded-xl border border-dashed border-border", children: "No structured rewrite content found." }) : /* @__PURE__ */ e.jsx("div", { className: "space-y-4", children: s.sections.map((r) => /* @__PURE__ */ e.jsx(K, { section: r }, r.id)) });
}, K = ({ section: t }) => {
  const [s, r] = E.useState(() => G(t)), a = i.useId();
  return /* @__PURE__ */ e.jsxs("div", { className: "rounded-xl border border-border bg-surface overflow-hidden shadow-2xs transition-all", children: [
    /* @__PURE__ */ e.jsxs(
      "button",
      {
        type: "button",
        onClick: () => r((l) => !l),
        "aria-expanded": s,
        "aria-controls": a,
        className: "w-full px-3.5 py-2.5 flex items-center justify-between gap-3 text-left hover:bg-muted/40 transition-colors cursor-pointer",
        children: [
          /* @__PURE__ */ e.jsx("span", { className: "text-[13.5px] font-semibold text-content", children: t.title }),
          /* @__PURE__ */ e.jsx(
            "span",
            {
              className: `text-content-muted transition-transform duration-150 ${s ? "rotate-180" : ""}`,
              "aria-hidden": "true",
              children: /* @__PURE__ */ e.jsx($, { className: "w-3.5 h-3.5" })
            }
          )
        ]
      }
    ),
    s ? /* @__PURE__ */ e.jsx("div", { id: a, className: "px-3.5 pb-3.5 pt-1 border-t border-border/40 space-y-2.5", children: t.blocks.map((l, o) => /* @__PURE__ */ e.jsx(Q, { block: l }, o)) }) : null
  ] });
}, Q = ({ block: t }) => {
  switch (t.type) {
    case "heading": {
      const s = t.level <= 2 ? "text-sm font-bold text-content pt-2" : t.level === 3 ? "text-xs font-bold text-accent uppercase tracking-wider pt-1.5" : "text-xs font-semibold text-content-secondary pt-1";
      return /* @__PURE__ */ e.jsx("div", { className: s, children: t.text });
    }
    case "hr":
      return /* @__PURE__ */ e.jsx("hr", { className: "border-border/60 my-2" });
    case "quote":
      return /* @__PURE__ */ e.jsx("blockquote", { className: "my-1.5 pl-3 py-1.5 border-l-2 border-accent/70 bg-accent-subtle/30 text-content text-xs rounded-r leading-relaxed whitespace-pre-wrap", children: t.lines.map((s, r) => /* @__PURE__ */ e.jsx(
        "p",
        {
          dangerouslySetInnerHTML: { __html: h(s) }
        },
        r
      )) });
    case "table":
      return /* @__PURE__ */ e.jsx("div", { className: "overflow-x-auto my-2 rounded-lg border border-border", children: /* @__PURE__ */ e.jsxs("table", { className: "w-full text-left text-xs border-collapse", children: [
        t.headers.length ? /* @__PURE__ */ e.jsx("thead", { className: "bg-muted/60 text-content-secondary border-b border-border", children: /* @__PURE__ */ e.jsx("tr", { children: t.headers.map((s, r) => /* @__PURE__ */ e.jsx("th", { className: "px-2.5 py-1.5 font-semibold text-[12px]", children: s }, r)) }) }) : null,
        /* @__PURE__ */ e.jsx("tbody", { className: "divide-y divide-border/40 bg-surface", children: t.rows.map((s, r) => /* @__PURE__ */ e.jsx("tr", { className: "hover:bg-muted/30", children: s.map((a, l) => /* @__PURE__ */ e.jsx(
          "td",
          {
            className: "px-2.5 py-1.5 text-content text-[12.5px] leading-snug align-top",
            dangerouslySetInnerHTML: { __html: h(a) }
          },
          l
        )) }, r)) })
      ] }) });
    case "list":
      return /* @__PURE__ */ e.jsx(
        "ul",
        {
          className: `space-y-1 text-xs text-content leading-relaxed my-1 ${t.ordered ? "list-decimal list-inside" : "list-disc list-inside"}`,
          children: t.items.map((s, r) => /* @__PURE__ */ e.jsx(q, { item: s, ordered: t.ordered }, r))
        }
      );
    case "paragraph":
      return /* @__PURE__ */ e.jsx(
        "p",
        {
          className: "font-serif text-reading-compact text-content-secondary",
          dangerouslySetInnerHTML: { __html: h(t.text) }
        }
      );
    default:
      return null;
  }
}, q = ({ item: t, ordered: s }) => {
  var r;
  return /* @__PURE__ */ e.jsxs("li", { children: [
    /* @__PURE__ */ e.jsx("span", { dangerouslySetInnerHTML: { __html: h(t.text) } }),
    (r = t.children) != null && r.length ? /* @__PURE__ */ e.jsx("ul", { className: `pl-4 mt-1 space-y-1 ${s ? "list-decimal" : "list-disc"}`, children: t.children.map((a, l) => /* @__PURE__ */ e.jsx(q, { item: a, ordered: s }, l)) }) : null
  ] });
}, L = [
  { id: "formal", label: "Polished & Formal", desc: "Refined, professional tone" },
  { id: "natural", label: "Clear & Natural", desc: "Idiomatic and fluent native phrasing" },
  { id: "concise", label: "Concise & Direct", desc: "Eliminates fluff and wordiness" },
  { id: "casual", label: "Casual & Friendly", desc: "Relaxed conversational tone" }
];
function T(t, s) {
  const r = t.trim(), a = s.trim();
  return r ? !a || a.toLowerCase() === r.toLowerCase() ? r : a.toLowerCase().includes(r.toLowerCase()) && a.split(/\s+/).length > r.split(/\s+/).length ? a : r : a;
}
const se = ({
  initialText: t = "",
  contextSentence: s = "",
  targetLang: r
}) => {
  const a = O(), { playPronunciation: l } = z(), [o, b] = i.useState(() => T(t, s)), [f, w] = i.useState("natural"), [M, y] = i.useState(null), [g, N] = i.useState(null), [p, v] = i.useState(!1), [R, m] = i.useState(null), c = i.useRef(null);
  async function A(n = f) {
    const d = o.trim();
    if (!d) return;
    if (!a.enableAI) {
      m("AI is disabled in Settings. Please enable it to use Rewriter.");
      return;
    }
    w(n), v(!0), m(null);
    const j = L.find((x) => x.id === n), H = j ? `Style: ${j.label} (${j.desc})` : "", u = B("rewrite");
    c.current = u;
    try {
      const x = await U({
        text: d,
        intent: "rewrite",
        context: H,
        targetLang: r || a.translateTargetLanguage || "Vietnamese",
        requestId: u
      });
      c.current === u && N(x);
    } catch (x) {
      if (c.current === u) {
        const k = x instanceof Error ? x.message : "Rewriting failed. Please try again.";
        m(
          /Extension context invalidated|runtime is unavailable/i.test(k) ? "Extension was reloaded. Refresh this page and try again." : k
        );
      }
    } finally {
      c.current === u && v(!1);
    }
  }
  function P(n, d) {
    n && l({ text: n, language: "en-US", key: d });
  }
  function D(n, d) {
    navigator.clipboard.writeText(n).then(() => {
      y(d), Y("Copied rewritten text to clipboard"), setTimeout(() => y(null), 1800);
    });
  }
  return i.useEffect(() => {
    const n = T(t, s);
    n && b(n);
  }, [t, s]), i.useEffect(() => () => {
    const n = c.current;
    c.current = null, n && F("rewrite", n);
  }, []), /* @__PURE__ */ e.jsxs("div", { className: "p-4 space-y-4 font-sans", children: [
    /* @__PURE__ */ e.jsxs("div", { className: "flex items-center gap-2", children: [
      /* @__PURE__ */ e.jsx("div", { className: "w-8 h-8 rounded-xl bg-accent-subtle border border-accent/25 flex items-center justify-center shrink-0", children: /* @__PURE__ */ e.jsx(C, { className: "w-4 h-4 text-accent" }) }),
      /* @__PURE__ */ e.jsxs("div", { children: [
        /* @__PURE__ */ e.jsx("h2", { className: "text-sm font-bold text-content tracking-tight", children: "Rewrite studio" }),
        /* @__PURE__ */ e.jsx("p", { className: "text-[12px] text-content-muted", children: "Shape your words for the moment" })
      ] })
    ] }),
    /* @__PURE__ */ e.jsxs("div", { className: "space-y-2", children: [
      /* @__PURE__ */ e.jsxs("div", { className: "flex items-center justify-between", children: [
        /* @__PURE__ */ e.jsx("label", { className: "text-[12px] font-bold uppercase tracking-wider text-content-muted", children: "Text to polish" }),
        o ? /* @__PURE__ */ e.jsx(
          "button",
          {
            type: "button",
            onClick: () => {
              b(""), N(null), m(null);
            },
            className: "text-[12px] text-content-muted hover:text-content cursor-pointer",
            children: "Clear"
          }
        ) : null
      ] }),
      /* @__PURE__ */ e.jsx(
        "textarea",
        {
          value: o,
          onChange: (n) => b(n.target.value),
          placeholder: "Paste a sentence, email draft, or short paragraph. Selecting one word on a page seeds the full sentence when available.",
          className: "ui-control w-full rounded-2xl p-3.5 text-[15px] placeholder:text-content-muted resize-y min-h-[112px] shadow-inner-light",
          rows: 5
        }
      )
    ] }),
    /* @__PURE__ */ e.jsxs("div", { className: "space-y-1.5", children: [
      /* @__PURE__ */ e.jsx("span", { className: "text-[11px] uppercase font-bold tracking-wider text-content-muted block", children: "Select Desired Tone & Style:" }),
      /* @__PURE__ */ e.jsx("div", { className: "grid grid-cols-2 gap-2", children: L.map((n) => {
        const d = f === n.id;
        return /* @__PURE__ */ e.jsxs(
          "button",
          {
            type: "button",
            onClick: () => w(n.id),
            className: V(
              "p-3 rounded-2xl border text-left cursor-pointer transition-colors shadow-xs focus-visible:ring-2 focus-visible:ring-accent",
              d ? "chip-active ring-1 ring-accent/30 font-bold" : "bg-surface hover:bg-elevated text-content-secondary border-border"
            ),
            children: [
              /* @__PURE__ */ e.jsx("div", { className: "text-xs text-content font-semibold", children: n.label }),
              /* @__PURE__ */ e.jsx("div", { className: "text-[11.5px] text-content-muted", children: n.desc })
            ]
          },
          n.id
        );
      }) }),
      /* @__PURE__ */ e.jsxs(
        "button",
        {
          type: "button",
          onClick: () => A(f),
          disabled: !o.trim() || p,
          className: "ui-button-primary w-full h-10 mt-1 text-[14px] font-bold disabled:pointer-events-none cursor-pointer shadow-xs flex items-center justify-center gap-1.5",
          children: [
            p ? /* @__PURE__ */ e.jsx("span", { className: "w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" }) : /* @__PURE__ */ e.jsx(C, { className: "w-3.5 h-3.5" }),
            /* @__PURE__ */ e.jsx("span", { children: p ? "Rewriting…" : "Rewrite" })
          ]
        }
      )
    ] }),
    /* @__PURE__ */ e.jsx("div", { className: "pt-2 space-y-3", children: p ? /* @__PURE__ */ e.jsxs("div", { className: "p-4 rounded-2xl border border-border/80 bg-surface/90 shadow-xs space-y-3.5", children: [
      /* @__PURE__ */ e.jsxs("div", { className: "flex items-center justify-between pb-1.5 border-b border-border/60", children: [
        /* @__PURE__ */ e.jsx("div", { className: "h-3.5 skeleton-shimmer rounded w-1/3" }),
        /* @__PURE__ */ e.jsx("div", { className: "h-3 skeleton-shimmer rounded w-16" })
      ] }),
      /* @__PURE__ */ e.jsxs("div", { className: "space-y-2", children: [
        /* @__PURE__ */ e.jsx("div", { className: "h-3.5 skeleton-shimmer rounded w-full" }),
        /* @__PURE__ */ e.jsx("div", { className: "h-3.5 skeleton-shimmer rounded w-4/5" })
      ] })
    ] }) : R ? /* @__PURE__ */ e.jsx("div", { role: "alert", className: "p-4 rounded-2xl bg-rose-500/10 border border-rose-500/25 text-[13.5px] text-rose-600 dark:text-rose-400 shadow-xs", children: R }) : g ? /* @__PURE__ */ e.jsxs("div", { className: "space-y-3", children: [
      /* @__PURE__ */ e.jsx("span", { className: "text-[12px] font-bold uppercase tracking-wider text-accent font-mono block", children: "Rewritten Suggestions" }),
      g.summary ? /* @__PURE__ */ e.jsx(
        X,
        {
          markdown: g.summary,
          copiedId: M,
          onCopy: D,
          onSpeak: P
        }
      ) : null
    ] }) : /* @__PURE__ */ e.jsx("div", { className: "p-4 rounded-2xl border border-dashed border-border/80 bg-muted/20 text-[13.5px] text-content-muted leading-relaxed text-center", children: "Choose a tone, then click Rewrite. Nothing is sent until you ask." }) })
  ] });
};
function X({
  markdown: t,
  copiedId: s,
  onCopy: r,
  onSpeak: a
}) {
  const l = _(t), o = l.polished;
  return /* @__PURE__ */ e.jsxs("div", { className: "space-y-3", children: [
    o ? /* @__PURE__ */ e.jsxs("div", { className: "p-4 rounded-2xl border border-accent/30 bg-accent-subtle/40 shadow-xs space-y-2.5", children: [
      /* @__PURE__ */ e.jsxs("div", { className: "flex items-center justify-between gap-2", children: [
        /* @__PURE__ */ e.jsx("span", { className: "text-[11.5px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-accent-subtle text-accent border border-accent/20 font-mono", children: "Polished rewrite" }),
        /* @__PURE__ */ e.jsxs("div", { className: "flex items-center gap-1.5", children: [
          /* @__PURE__ */ e.jsx(
            "button",
            {
              type: "button",
              onClick: () => a(o, "speak-polished"),
              title: "Read aloud",
              className: "h-7 w-7 rounded-lg border border-border/80 bg-surface hover:bg-elevated text-content-muted hover:text-accent flex items-center justify-center cursor-pointer transition-colors shadow-2xs active:scale-95",
              children: /* @__PURE__ */ e.jsx(W, { className: "w-3.5 h-3.5" })
            }
          ),
          /* @__PURE__ */ e.jsxs(
            "button",
            {
              type: "button",
              onClick: () => r(o, "polished"),
              className: "h-7 px-2.5 rounded-lg border border-border/80 bg-surface hover:bg-elevated text-[11.5px] font-semibold flex items-center gap-1 text-content-secondary hover:text-content cursor-pointer transition-colors shadow-2xs active:scale-95",
              children: [
                s === "polished" ? /* @__PURE__ */ e.jsx(S, { className: "w-3 h-3 text-emerald-600 dark:text-emerald-400" }) : /* @__PURE__ */ e.jsx(I, { className: "w-3 h-3 text-content-muted" }),
                /* @__PURE__ */ e.jsx("span", { children: s === "polished" ? "Copied" : "Copy" })
              ]
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ e.jsx("p", { className: "font-serif text-reading text-content whitespace-pre-wrap", children: o })
    ] }) : null,
    l.sections.length ? /* @__PURE__ */ e.jsxs("div", { className: "space-y-2", children: [
      /* @__PURE__ */ e.jsxs("div", { className: "flex items-center justify-between", children: [
        /* @__PURE__ */ e.jsx("span", { className: "text-[11.5px] uppercase font-bold tracking-wider text-content-muted", children: "Coaching notes" }),
        /* @__PURE__ */ e.jsxs(
          "button",
          {
            type: "button",
            onClick: () => r(t, "summary"),
            className: "h-6 px-2 rounded border border-border bg-surface hover:bg-elevated text-[11.5px] font-semibold flex items-center gap-1 cursor-pointer",
            children: [
              s === "summary" ? /* @__PURE__ */ e.jsx(S, { className: "w-3 h-3 text-emerald-600 dark:text-emerald-400" }) : /* @__PURE__ */ e.jsx(I, { className: "w-3 h-3" }),
              /* @__PURE__ */ e.jsx("span", { children: s === "summary" ? "Copied" : "Copy all" })
            ]
          }
        )
      ] }),
      /* @__PURE__ */ e.jsx(J, { content: t })
    ] }) : null
  ] });
}
export {
  se as ContextualRewriter,
  se as default
};
