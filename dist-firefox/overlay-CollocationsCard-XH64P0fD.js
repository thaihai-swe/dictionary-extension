import { r as c, j as e } from "./overlay-react-core-BJZCkGtm.js";
import { R as i } from "./overlay-overlay-app-BmJscKyW.js";
const o = [
  { key: "verbs", label: "Verbs" },
  { key: "adjectives", label: "Adjectives" },
  { key: "nouns", label: "Nouns" },
  { key: "prepositions", label: "Prepositions" },
  { key: "patterns", label: "Patterns" }
], d = ({
  word: l,
  collocations: a,
  onSelectWord: r
}) => {
  const n = c.useMemo(() => o.map((s) => ({
    ...s,
    items: ((a == null ? void 0 : a[s.key]) || []).filter(Boolean)
  })).filter((s) => s.items.length), [a]);
  return n.length ? /* @__PURE__ */ e.jsxs("section", { className: "p-3.5 rounded-lg border border-border bg-surface space-y-2.5 font-sans", children: [
    /* @__PURE__ */ e.jsxs("div", { className: "flex items-center gap-1.5 text-[12px] font-bold text-content-muted uppercase tracking-wider", children: [
      /* @__PURE__ */ e.jsx(i, { className: "w-3.5 h-3.5 text-accent" }),
      /* @__PURE__ */ e.jsx("span", { children: "Collocations" })
    ] }),
    /* @__PURE__ */ e.jsx("div", { className: "space-y-2", children: n.map((s) => /* @__PURE__ */ e.jsxs("div", { className: "grid grid-cols-[118px_minmax(0,1fr)] gap-2 items-start", children: [
      /* @__PURE__ */ e.jsxs("span", { className: "text-[12.5px] font-bold text-content-secondary pt-0.5", children: [
        s.label,
        ":"
      ] }),
      /* @__PURE__ */ e.jsx("div", { className: "flex flex-wrap gap-1", children: s.items.map((t) => /* @__PURE__ */ e.jsx(
        "button",
        {
          type: "button",
          onClick: () => r == null ? void 0 : r(t),
          title: l ? `Look up “${t}”` : `Look up ${t}`,
          className: "h-[22px] px-2 rounded-full bg-accent-subtle hover:bg-accent/20 border border-accent/25 text-accent text-[12.5px] font-semibold whitespace-nowrap cursor-pointer transition-colors",
          children: t
        },
        t
      )) })
    ] }, s.key)) })
  ] }) : null;
};
export {
  d as CollocationsCard,
  d as default
};
