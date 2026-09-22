import { j as d } from "./overlay-react-core-BJZCkGtm.js";
import { M as a } from "./overlay-component.markdown-renderer-CiP8MY0h.js";
import { Q as e } from "./overlay-overlay-app-BmJscKyW.js";
const b = ({
  formation: r,
  prefixes: t,
  suffixes: n
}) => !(r != null && r.trim() || t != null && t.length || n != null && n.length) ? null : /* @__PURE__ */ d.jsxs("div", { className: "rounded-lg border border-border bg-surface p-3.5 space-y-2", children: [
  /* @__PURE__ */ d.jsxs("div", { className: "flex items-center gap-1.5 text-[12px] font-bold text-content-muted uppercase tracking-wider", children: [
    /* @__PURE__ */ d.jsx(e, { className: "w-3.5 h-3.5 text-accent" }),
    /* @__PURE__ */ d.jsx("span", { children: "Word Formation" })
  ] }),
  t != null && t.length || n != null && n.length ? /* @__PURE__ */ d.jsxs("div", { className: "flex flex-wrap gap-1", children: [
    t == null ? void 0 : t.map((l) => /* @__PURE__ */ d.jsxs("span", { className: "h-[24px] px-2 rounded bg-muted border border-border text-content text-[12.5px] font-mono inline-flex items-center", children: [
      "prefix: ",
      l
    ] }, `p-${l}`)),
    n == null ? void 0 : n.map((l) => /* @__PURE__ */ d.jsxs("span", { className: "h-[24px] px-2 rounded bg-muted border border-border text-content text-[12.5px] font-mono inline-flex items-center", children: [
      "suffix: ",
      l
    ] }, `s-${l}`))
  ] }) : null,
  r != null && r.trim() ? /* @__PURE__ */ d.jsx(a, { content: r }) : null
] });
export {
  b as WordFormationCard,
  b as default
};
