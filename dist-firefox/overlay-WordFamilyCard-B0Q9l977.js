import { r as b, j as n } from "./overlay-react-core-BJZCkGtm.js";
import { N as j } from "./overlay-overlay-app-BmJscKyW.js";
const f = "h-[24px] px-2 rounded-full bg-muted hover:bg-elevated text-content text-[12.5px] font-medium transition-colors cursor-pointer border border-border inline-flex items-center justify-center", A = ({ family: s, onSelectWord: o }) => {
  var l, d, i, x, h, p;
  const e = b.useMemo(() => {
    var c, t, a, u, v, g;
    return s && ((c = s.nouns) != null && c.length || (t = s.verbs) != null && t.length || (a = s.adjectives) != null && a.length || (u = s.adverbs) != null && u.length || (v = s.inflections) != null && v.length || (g = s.derivatives) != null && g.length) ? s : {};
  }, [s]);
  if (!!!((l = e.nouns) != null && l.length || (d = e.verbs) != null && d.length || (i = e.adjectives) != null && i.length || (x = e.adverbs) != null && x.length || (h = e.inflections) != null && h.length || (p = e.derivatives) != null && p.length)) return null;
  const r = (c, t) => t != null && t.length ? /* @__PURE__ */ n.jsxs("div", { className: "grid grid-cols-[88px_minmax(0,1fr)] gap-2 items-center", children: [
    /* @__PURE__ */ n.jsx("span", { className: "text-[12.5px] font-semibold text-content-secondary", children: c }),
    /* @__PURE__ */ n.jsx("div", { className: "flex flex-wrap gap-1", children: t.map((a) => /* @__PURE__ */ n.jsx("button", { type: "button", onClick: () => o == null ? void 0 : o(a), className: f, children: a }, a)) })
  ] }) : null;
  return /* @__PURE__ */ n.jsxs("section", { className: "p-3.5 rounded-lg border border-border bg-surface space-y-2 font-sans", children: [
    /* @__PURE__ */ n.jsxs("div", { className: "flex items-center gap-1.5 text-[12px] font-bold text-content-muted uppercase tracking-wider", children: [
      /* @__PURE__ */ n.jsx(j, { className: "w-3.5 h-3.5 text-accent" }),
      /* @__PURE__ */ n.jsx("span", { children: "Word Family" })
    ] }),
    /* @__PURE__ */ n.jsxs("div", { className: "space-y-1.5", children: [
      r("Nouns", e.nouns),
      r("Verbs", e.verbs),
      r("Adjectives", e.adjectives),
      r("Adverbs", e.adverbs),
      r("Inflections", e.inflections),
      r("Derivatives", e.derivatives)
    ] })
  ] });
};
export {
  A as WordFamilyCard,
  A as default
};
