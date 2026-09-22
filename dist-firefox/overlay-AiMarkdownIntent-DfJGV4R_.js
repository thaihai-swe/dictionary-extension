import { r as o, j as a } from "./overlay-react-core-BJZCkGtm.js";
import { M as c } from "./overlay-component.markdown-renderer-CiP8MY0h.js";
import { S as m } from "./overlay-overlay-app-BmJscKyW.js";
import { WordFamilyCard as d, UsageNotesCard as i, WordFormationCard as j, LearnerMistakesCard as l, CollocationsCard as y } from "./overlay-async-views-U00ADfLM.js";
const w = ({
  query: n,
  profile: s,
  intent: r,
  onSelectWord: u
}) => {
  const e = o.useMemo(() => new Set(m(r)), [r]), x = o.useMemo(() => {
    const t = s == null ? void 0 : s.wordFormation;
    return t ? typeof t == "string" ? { text: t, prefixes: [], suffixes: [] } : {
      text: t.explanation || "",
      prefixes: t.prefixes || [],
      suffixes: t.suffixes || []
    } : { text: "", prefixes: [], suffixes: [] };
  }, [s]);
  return /* @__PURE__ */ a.jsxs(o.Suspense, { fallback: null, children: [
    e.has("wordFamily") ? /* @__PURE__ */ a.jsx(d, { word: n, family: s == null ? void 0 : s.wordFamily, onSelectWord: u }) : null,
    e.has("usageNotes") ? /* @__PURE__ */ a.jsx(i, { warnings: s == null ? void 0 : s.usageWarnings, pairs: s == null ? void 0 : s.confusablePairs }) : null,
    e.has("wordFormation") ? /* @__PURE__ */ a.jsx(
      j,
      {
        formation: x.text,
        prefixes: x.prefixes,
        suffixes: x.suffixes
      }
    ) : null,
    e.has("learnerMistakes") ? /* @__PURE__ */ a.jsx(l, { mistakes: s == null ? void 0 : s.learnerMistakes }) : null,
    e.has("collocations") ? /* @__PURE__ */ a.jsx(
      y,
      {
        word: n,
        collocations: s == null ? void 0 : s.collocations,
        onSelectWord: u
      }
    ) : null
  ] });
}, F = ({
  result: n,
  targetLang: s,
  onSelectWord: r
}) => /* @__PURE__ */ a.jsxs("div", { className: "space-y-4", children: [
  n.summary ? /* @__PURE__ */ a.jsx("section", { className: "p-3.5 rounded-lg border border-border bg-surface space-y-3", children: /* @__PURE__ */ a.jsx(c, { content: n.summary, targetLang: s }) }) : null,
  /* @__PURE__ */ a.jsx(
    w,
    {
      query: n.query,
      profile: n.lexicalProfile,
      intent: n.type,
      onSelectWord: r
    }
  )
] });
export {
  F as AiMarkdownIntent,
  F as default
};
