import { r as o } from "./overlay-react-core-BJZCkGtm.js";
const p = o.lazy(() => import("./overlay-ShortcutsModal-D0FgANHI.js")), m = o.lazy(() => import("./overlay-WordFamilyCard-B0Q9l977.js")), d = o.lazy(() => import("./overlay-UsageNotesCard-DvHPmKm9.js")), y = o.lazy(() => import("./overlay-WordFormationCard-C-xV-mjl.js")), z = o.lazy(() => import("./overlay-LearnerMistakesCard-77ea4HZs.js")), C = o.lazy(() => import("./overlay-CollocationsCard-XH64P0fD.js")), t = () => import("./overlay-AiMarkdownIntent-DfJGV4R_.js"), r = () => import("./overlay-SentenceBreakdownIntent-CBkJfDR8.js"), l = () => import("./overlay-ConfusablesIntent-HTcJxB8Z.js"), s = () => import("./overlay-RephraseIntent-CLa0C8UG.js"), u = o.lazy(t), f = o.lazy(r), h = o.lazy(l), k = o.lazy(s), e = {
  default: t,
  explain_in_context: t,
  grammar: t,
  collocations: t,
  rephrase: s,
  rewrite: t,
  phrase_fallback: t,
  sentence_breakdown: r,
  confusables: l
};
function w(a) {
  const c = a != null && a.length ? a.map((n) => e[n]).filter(Boolean) : Object.values(e);
  return Promise.all([...new Set(c)].map((n) => n().catch(() => {
  })));
}
export {
  u as AiMarkdownIntent,
  C as CollocationsCard,
  h as ConfusablesIntent,
  z as LearnerMistakesCard,
  k as RephraseIntent,
  f as SentenceBreakdownIntent,
  p as ShortcutsModal,
  d as UsageNotesCard,
  m as WordFamilyCard,
  y as WordFormationCard,
  w as preloadAiIntentChunks
};
