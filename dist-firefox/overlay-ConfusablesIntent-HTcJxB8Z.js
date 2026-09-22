import { j as e } from "./overlay-react-core-BJZCkGtm.js";
import { M as h } from "./overlay-component.markdown-renderer-CiP8MY0h.js";
import { j as b, U as j, n as o } from "./overlay-overlay-app-BmJscKyW.js";
const g = ({ result: r, targetLang: x }) => {
  var a, l, d, i;
  const { playPronunciation: m } = b(), t = r.comparison;
  function c(s, n) {
    s && m({ text: s, language: "en-US", key: n });
  }
  return /* @__PURE__ */ e.jsxs("div", { className: "space-y-4", children: [
    t != null && t.coreDistinction ? /* @__PURE__ */ e.jsxs("div", { className: "rounded-lg border border-border bg-surface p-3.5 space-y-1.5", children: [
      /* @__PURE__ */ e.jsxs("div", { className: "flex items-center gap-1.5 text-[12px] font-bold text-accent uppercase tracking-wider", children: [
        /* @__PURE__ */ e.jsx(j, { className: "w-3.5 h-3.5 text-accent" }),
        /* @__PURE__ */ e.jsx("span", { children: "Core Distinction" })
      ] }),
      /* @__PURE__ */ e.jsx("p", { className: "text-[14.5px] leading-relaxed text-content font-medium", children: t.coreDistinction })
    ] }) : null,
    (a = t == null ? void 0 : t.rows) != null && a.length ? /* @__PURE__ */ e.jsxs("div", { className: "space-y-1.5", children: [
      /* @__PURE__ */ e.jsx("div", { className: "text-[12px] font-bold text-content-muted uppercase tracking-wider", children: "Comparison Matrix" }),
      /* @__PURE__ */ e.jsx("div", { className: "overflow-x-auto rounded-lg border border-border", children: /* @__PURE__ */ e.jsxs("table", { className: "w-full text-[14px] text-left", children: [
        /* @__PURE__ */ e.jsx("thead", { className: "bg-muted text-content font-bold", children: /* @__PURE__ */ e.jsxs("tr", { children: [
          /* @__PURE__ */ e.jsx("th", { className: "px-3 py-2.5 font-bold", children: "Feature" }),
          /* @__PURE__ */ e.jsx("th", { className: "px-3 py-2.5 font-bold text-accent", children: t.leftTerm || "Term A" }),
          /* @__PURE__ */ e.jsx("th", { className: "px-3 py-2.5 font-bold text-accent", children: t.rightTerm || "Term B" })
        ] }) }),
        /* @__PURE__ */ e.jsx("tbody", { children: t.rows.map((s) => /* @__PURE__ */ e.jsxs("tr", { className: "border-t border-border hover:bg-muted/40 transition-colors", children: [
          /* @__PURE__ */ e.jsx("td", { className: "px-3 py-2 text-content-muted font-semibold", children: s.dimension }),
          /* @__PURE__ */ e.jsx("td", { className: "px-3 py-2 text-content", children: s.left }),
          /* @__PURE__ */ e.jsx("td", { className: "px-3 py-2 text-content", children: s.right })
        ] }, s.dimension)) })
      ] }) })
    ] }) : null,
    (l = t == null ? void 0 : t.minimalPairs) != null && l.length ? /* @__PURE__ */ e.jsxs("div", { className: "space-y-2", children: [
      /* @__PURE__ */ e.jsx("div", { className: "text-[12px] font-bold text-content-muted uppercase tracking-wider", children: "Minimal-Pair Contrast" }),
      /* @__PURE__ */ e.jsx("div", { className: "space-y-2.5", children: t.minimalPairs.map((s, n) => {
        const u = `pair-${n}-a`, p = `pair-${n}-b`;
        return /* @__PURE__ */ e.jsxs(
          "div",
          {
            className: "rounded-lg border border-border bg-surface p-3.5 space-y-2 text-[14px]",
            children: [
              /* @__PURE__ */ e.jsxs("div", { className: "space-y-1.5", children: [
                /* @__PURE__ */ e.jsxs("div", { className: "flex items-start justify-between gap-2 pl-2.5 py-1 border-l-2 border-accent bg-accent-subtle rounded-r", children: [
                  /* @__PURE__ */ e.jsxs("p", { className: "flex-1 text-content font-medium", children: [
                    '"',
                    s.sentenceA,
                    '"'
                  ] }),
                  /* @__PURE__ */ e.jsx(
                    "button",
                    {
                      type: "button",
                      onClick: () => c(s.sentenceA, u),
                      title: "Listen to first sentence",
                      className: "h-6 w-6 text-content-muted hover:text-accent cursor-pointer flex items-center justify-center rounded hover:bg-muted",
                      children: /* @__PURE__ */ e.jsx(o, { className: "w-3.5 h-3.5" })
                    }
                  )
                ] }),
                /* @__PURE__ */ e.jsxs("div", { className: "flex items-start justify-between gap-2 pl-2.5 py-1 border-l-2 border-border bg-muted rounded-r", children: [
                  /* @__PURE__ */ e.jsxs("p", { className: "flex-1 text-content font-medium", children: [
                    '"',
                    s.sentenceB,
                    '"'
                  ] }),
                  /* @__PURE__ */ e.jsx(
                    "button",
                    {
                      type: "button",
                      onClick: () => c(s.sentenceB, p),
                      title: "Listen to second sentence",
                      className: "h-6 w-6 text-content-muted hover:text-accent cursor-pointer flex items-center justify-center rounded hover:bg-muted",
                      children: /* @__PURE__ */ e.jsx(o, { className: "w-3.5 h-3.5" })
                    }
                  )
                ] })
              ] }),
              s.explanation ? /* @__PURE__ */ e.jsx("p", { className: "text-[13px] text-content-secondary italic pt-0.5", children: s.explanation }) : null
            ]
          },
          n
        );
      }) })
    ] }) : null,
    r.summary && !(t != null && t.coreDistinction) && !((d = t == null ? void 0 : t.rows) != null && d.length) && !((i = t == null ? void 0 : t.minimalPairs) != null && i.length) ? /* @__PURE__ */ e.jsx("section", { className: "p-3.5 rounded-lg border border-border bg-surface space-y-3", children: /* @__PURE__ */ e.jsx(h, { content: r.summary, targetLang: x }) }) : null
  ] });
};
export {
  g as ConfusablesIntent,
  g as default
};
