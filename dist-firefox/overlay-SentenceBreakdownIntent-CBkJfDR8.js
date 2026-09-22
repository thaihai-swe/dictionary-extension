import { r as i, j as e } from "./overlay-react-core-BJZCkGtm.js";
import { j as p, T as m, n as d, e as u, f as b } from "./overlay-overlay-app-BmJscKyW.js";
import { M as h } from "./overlay-component.markdown-renderer-CiP8MY0h.js";
const j = ({
  structure: t,
  translation: a
}) => {
  const { playPronunciation: c } = p(), [o, r] = i.useState(!1);
  function s(n) {
    n && c({ text: n, language: "en-US", key: `clause-${n.slice(0, 10)}` });
  }
  function l(n) {
    n && navigator.clipboard.writeText(n).then(() => {
      r(!0), setTimeout(() => r(!1), 2e3);
    });
  }
  return !(t != null && t.length) && !a ? null : /* @__PURE__ */ e.jsxs("div", { className: "space-y-4 pt-1", children: [
    /* @__PURE__ */ e.jsxs("div", { className: "flex items-center justify-between pb-1 border-b border-border/40", children: [
      /* @__PURE__ */ e.jsxs("span", { className: "flex items-center gap-1.5 text-[13px] font-extrabold uppercase tracking-wider text-accent", children: [
        /* @__PURE__ */ e.jsx(m, { className: "w-4 h-4 text-accent" }),
        /* @__PURE__ */ e.jsx("span", { children: "Sentence Breakdown" })
      ] }),
      /* @__PURE__ */ e.jsx("span", { className: "text-[12px] text-content-muted font-mono font-medium", children: "Clause Analysis" })
    ] }),
    /* @__PURE__ */ e.jsx("div", { className: "space-y-2", children: t == null ? void 0 : t.map((n, x) => /* @__PURE__ */ e.jsxs(
      "div",
      {
        className: "flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1.5 pl-3.5 py-2.5 pr-3 rounded-lg border border-border bg-surface text-sm group",
        children: [
          /* @__PURE__ */ e.jsxs("div", { className: "flex-1 min-w-[200px] space-y-0.5", children: [
            /* @__PURE__ */ e.jsxs("div", { className: "text-content text-[15px] leading-relaxed flex items-center justify-between gap-2", children: [
              /* @__PURE__ */ e.jsx("span", { className: "font-medium text-content", children: n.text }),
              /* @__PURE__ */ e.jsx(
                "button",
                {
                  type: "button",
                  onClick: () => s(n.text),
                  title: "Read clause aloud",
                  className: "opacity-0 group-hover:opacity-100 h-7 w-7 text-content-muted hover:text-accent transition-opacity cursor-pointer rounded-md hover:bg-muted flex items-center justify-center",
                  children: /* @__PURE__ */ e.jsx(d, { className: "w-3.5 h-3.5" })
                }
              )
            ] }),
            n.explanation ? /* @__PURE__ */ e.jsx("p", { className: "text-[13px] text-content-secondary leading-normal", children: n.explanation }) : null
          ] }),
          /* @__PURE__ */ e.jsx("span", { className: "ml-auto flex-shrink-0 px-2.5 py-0.5 rounded-full text-[12px] font-semibold text-accent bg-accent-subtle border border-accent/25 capitalize font-mono", children: n.role })
        ]
      },
      x
    )) }),
    a && /* @__PURE__ */ e.jsxs("div", { className: "px-3 py-2.5 rounded-lg border border-border bg-muted text-[15px] leading-relaxed text-content-secondary space-y-1.5", children: [
      /* @__PURE__ */ e.jsxs("div", { className: "flex items-center justify-between", children: [
        /* @__PURE__ */ e.jsx("span", { className: "font-extrabold text-emerald-600 dark:text-emerald-400 text-[12px] uppercase tracking-wider", children: "Context Translation:" }),
        /* @__PURE__ */ e.jsxs("div", { className: "flex items-center gap-1.5", children: [
          /* @__PURE__ */ e.jsxs(
            "button",
            {
              type: "button",
              onClick: () => s(a),
              title: "Read translation aloud",
              className: "h-[28px] px-2.5 rounded-lg bg-muted hover:bg-elevated text-content-secondary hover:text-content text-[13px] cursor-pointer font-medium flex items-center gap-1.5 border border-border",
              children: [
                /* @__PURE__ */ e.jsx(d, { className: "w-3.5 h-3.5 text-accent" }),
                /* @__PURE__ */ e.jsx("span", { children: "Read" })
              ]
            }
          ),
          /* @__PURE__ */ e.jsx(
            "button",
            {
              type: "button",
              onClick: () => l(a),
              title: "Copy translation",
              className: "h-[28px] px-2.5 rounded-lg bg-muted hover:bg-elevated text-content-secondary hover:text-content text-[13px] cursor-pointer font-medium flex items-center gap-1.5 border border-border",
              children: o ? /* @__PURE__ */ e.jsxs(e.Fragment, { children: [
                /* @__PURE__ */ e.jsx(u, { className: "w-3.5 h-3.5 text-emerald-500" }),
                /* @__PURE__ */ e.jsx("span", { children: "Copied" })
              ] }) : /* @__PURE__ */ e.jsxs(e.Fragment, { children: [
                /* @__PURE__ */ e.jsx(b, { className: "w-3.5 h-3.5 text-content-secondary" }),
                /* @__PURE__ */ e.jsx("span", { children: "Copy" })
              ] })
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ e.jsx("p", { className: "font-medium text-[16px] text-content leading-relaxed", children: a })
    ] })
  ] });
}, N = ({
  result: t,
  targetLang: a
}) => {
  var c, o, r;
  return /* @__PURE__ */ e.jsxs("div", { className: "space-y-4", children: [
    (c = t.structure) != null && c.length ? /* @__PURE__ */ e.jsx(j, { structure: t.structure, translation: t.translation }) : null,
    (o = t.phrases) != null && o.length ? /* @__PURE__ */ e.jsxs("div", { className: "rounded-lg border border-border bg-muted p-3.5 space-y-2", children: [
      /* @__PURE__ */ e.jsx("div", { className: "text-[13px] font-extrabold text-content uppercase tracking-wider", children: "Phrase parsing" }),
      t.phrases.map((s, l) => /* @__PURE__ */ e.jsxs("div", { className: "text-[14px] text-content", children: [
        /* @__PURE__ */ e.jsx("span", { className: "font-bold text-accent", children: s.text }),
        s.type ? /* @__PURE__ */ e.jsxs("span", { className: "text-content-muted", children: [
          " · ",
          s.type
        ] }) : null,
        s.meaning ? /* @__PURE__ */ e.jsxs("span", { className: "text-content-secondary", children: [
          " — ",
          s.meaning
        ] }) : null
      ] }, `${s.text}-${l}`))
    ] }) : null,
    t.summary && !((r = t.structure) != null && r.length) ? /* @__PURE__ */ e.jsx("section", { className: "p-3.5 rounded-lg border border-border bg-surface space-y-3", children: /* @__PURE__ */ e.jsx(h, { content: t.summary, targetLang: a }) }) : null
  ] });
};
export {
  N as SentenceBreakdownIntent,
  N as default
};
