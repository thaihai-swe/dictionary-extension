import { r as u, j as e } from "./overlay-react-core-BJZCkGtm.js";
import { M as m } from "./overlay-component.markdown-renderer-CiP8MY0h.js";
import { j as b, V as h, c as f, n as j, e as g, f as y } from "./overlay-overlay-app-BmJscKyW.js";
function N(s) {
  switch (s) {
    case "simplified":
      return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30";
    case "formal":
      return "bg-muted text-content border-border";
    case "idiomatic":
      return "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30";
    default:
      return "bg-accent-subtle text-accent border-accent/30";
  }
}
const C = ({ result: s, targetLang: c }) => {
  const { playPronunciation: o } = b(), [d, a] = u.useState(null), n = s.rephraseStyles;
  function l(t, r) {
    t && o({ text: t, language: "en-US", key: r });
  }
  function i(t, r) {
    t && navigator.clipboard.writeText(t).then(() => {
      a(r), setTimeout(() => a(null), 1800);
    });
  }
  return /* @__PURE__ */ e.jsxs("div", { className: "space-y-4", children: [
    n != null && n.length ? /* @__PURE__ */ e.jsxs("div", { className: "space-y-3", children: [
      /* @__PURE__ */ e.jsxs("div", { className: "flex items-center justify-between pb-1 border-b border-border/40", children: [
        /* @__PURE__ */ e.jsxs("span", { className: "flex items-center gap-1.5 text-[13px] font-extrabold uppercase tracking-wider text-accent", children: [
          /* @__PURE__ */ e.jsx(h, { className: "w-3.5 h-3.5 text-accent" }),
          /* @__PURE__ */ e.jsx("span", { children: "Three Rewrite Styles" })
        ] }),
        /* @__PURE__ */ e.jsx("span", { className: "text-[12px] text-content-muted font-mono", children: "1 Click · 3 Tones" })
      ] }),
      /* @__PURE__ */ e.jsx("div", { className: "space-y-2.5", children: n.map((t, r) => {
        const x = `rephrase-${r}`, p = d === r;
        return /* @__PURE__ */ e.jsxs(
          "article",
          {
            className: "rounded-lg border border-border bg-surface p-3.5 space-y-2 text-[14.5px]",
            children: [
              /* @__PURE__ */ e.jsxs("div", { className: "flex items-center justify-between gap-2", children: [
                /* @__PURE__ */ e.jsx(
                  "span",
                  {
                    className: f(
                      "px-2 py-0.5 rounded-full text-[12px] font-bold tracking-wider uppercase border font-mono",
                      N(t.style)
                    ),
                    children: t.label
                  }
                ),
                /* @__PURE__ */ e.jsxs("div", { className: "flex items-center gap-1", children: [
                  /* @__PURE__ */ e.jsx(
                    "button",
                    {
                      type: "button",
                      onClick: () => l(t.text, x),
                      title: "Read aloud",
                      className: "h-6 w-6 text-content-muted hover:text-accent cursor-pointer flex items-center justify-center rounded hover:bg-muted",
                      children: /* @__PURE__ */ e.jsx(j, { className: "w-3.5 h-3.5" })
                    }
                  ),
                  /* @__PURE__ */ e.jsx(
                    "button",
                    {
                      type: "button",
                      onClick: () => i(t.text, r),
                      title: "Copy rewritten sentence",
                      className: "h-6 w-6 text-content-muted hover:text-content cursor-pointer flex items-center justify-center rounded hover:bg-muted",
                      children: p ? /* @__PURE__ */ e.jsx(g, { className: "w-3.5 h-3.5 text-emerald-500" }) : /* @__PURE__ */ e.jsx(y, { className: "w-3.5 h-3.5" })
                    }
                  )
                ] })
              ] }),
              /* @__PURE__ */ e.jsxs("p", { className: "text-content font-medium leading-relaxed pl-2.5 border-l-2 border-accent/60 bg-muted/25 py-1 rounded-r", children: [
                '"',
                t.text,
                '"'
              ] }),
              t.note ? /* @__PURE__ */ e.jsx("p", { className: "text-[13px] text-content-secondary leading-normal pt-0.5", children: t.note }) : null
            ]
          },
          `${t.style}-${r}`
        );
      }) })
    ] }) : null,
    s.summary && !(n != null && n.length) ? /* @__PURE__ */ e.jsx("section", { className: "p-3.5 rounded-lg border border-border bg-surface space-y-3", children: /* @__PURE__ */ e.jsx(m, { content: s.summary, targetLang: c }) }) : null
  ] });
};
export {
  C as RephraseIntent,
  C as default
};
