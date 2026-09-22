import { r as c, j as e } from "./overlay-react-core-BJZCkGtm.js";
import { O as m } from "./overlay-overlay-app-BmJscKyW.js";
const o = ({ notes: a, warnings: r, pairs: s }) => {
  const l = c.useMemo(() => r != null && r.length ? r.filter((t) => t.trim()) : a != null && a.trim() ? [a.trim()] : [], [a, r]);
  return !(l.length || s != null && s.length) ? null : /* @__PURE__ */ e.jsxs("div", { className: "rounded-lg border border-amber-500/25 bg-amber-500/6 p-3 space-y-1.5", children: [
    /* @__PURE__ */ e.jsxs("div", { className: "flex items-center gap-1.5 text-[12px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider", children: [
      /* @__PURE__ */ e.jsx(m, { className: "w-3.5 h-3.5" }),
      /* @__PURE__ */ e.jsx("span", { children: "Usage & Register" })
    ] }),
    /* @__PURE__ */ e.jsxs("ul", { className: "space-y-1 text-[14px] leading-relaxed text-content-secondary", children: [
      l.map((t) => /* @__PURE__ */ e.jsxs("li", { className: "flex items-start gap-2", children: [
        /* @__PURE__ */ e.jsx("span", { className: "text-amber-600 dark:text-amber-400 mt-0.5", children: "•" }),
        /* @__PURE__ */ e.jsx("span", { children: t })
      ] }, t)),
      s == null ? void 0 : s.map((t) => /* @__PURE__ */ e.jsxs("li", { className: "flex items-start gap-2", children: [
        /* @__PURE__ */ e.jsx("span", { className: "text-amber-600 dark:text-amber-400 mt-0.5", children: "•" }),
        /* @__PURE__ */ e.jsxs("span", { children: [
          /* @__PURE__ */ e.jsxs("strong", { children: [
            "Confused with ",
            /* @__PURE__ */ e.jsx("em", { className: "text-accent not-italic font-semibold", children: t.word }),
            ":"
          ] }),
          " ",
          t.distinction
        ] })
      ] }, t.word))
    ] })
  ] });
};
export {
  o as UsageNotesCard,
  o as default
};
