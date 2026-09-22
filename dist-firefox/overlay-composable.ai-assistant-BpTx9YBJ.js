import { p as ce, q as m, t as le, v as C, G as Z, w as M, x as j, y as ue, z as b, s as fe, k as Y, A as de, m as ge, r as Ce, B as Ae, C as pe, D as x, E as he, F as ve } from "./overlay-overlay-app-BmJscKyW.js";
const me = "ai_lookup_cache", xe = 50, we = 24 * 60 * 60 * 1e3, S = ce({
  maxSize: xe,
  maxBytes: 8 * 1024 * 1024,
  ttlMs: we,
  storageKey: me,
  persistDelayMs: 1500,
  isPersistenceEnabled: () => m.value.persistLookupCache !== !1
});
function $(e, t, o, r, n) {
  return le(`${C(e)}|${String(t || "").toLowerCase().trim()}|${String(o || "").toLowerCase()}|${String(r || "").toLowerCase().trim()}|${n.aiModel || ""}|${n.aiBaseUrl || ""}|${n.enableLexicalProfile !== !1}`);
}
function G(e, t, o) {
  const r = m.value, n = String(e || "").trim(), a = String(t || "").replace(/\s+/g, " ").trim(), i = a && a.toLowerCase() !== n.toLowerCase() ? a : "", s = o || r.translateTargetLanguage || "Vietnamese";
  return { cleanText: n, cleanContext: i, lang: s, settings: r };
}
function J(e, t, o, r) {
  const { cleanText: n, cleanContext: a, lang: i, settings: s } = G(t, o, r);
  return $(C(e), n, i, a, s);
}
const ye = [
  { id: "default", label: "Main AI", icon: "book" },
  { id: "explain_in_context", label: "Context Explain", icon: "search" },
  { id: "grammar", label: "Grammar & Nuance", icon: "dna" },
  { id: "collocations", label: "Phrase & Collocations", icon: "link" },
  { id: "sentence_breakdown", label: "Sentence Breakdown", icon: "puzzle" },
  { id: "confusables", label: "Compare Confusables", icon: "scale" },
  { id: "rephrase", label: "Rephrase", icon: "edit" }
], v = b(""), I = b("default"), p = b(null), y = b(!1), E = b(null), N = b(0), R = /* @__PURE__ */ new Map(), L = new Z();
let P = "", k = "";
const w = new Z(), h = /* @__PURE__ */ new Map();
let F = 0;
function K() {
  if (F) return;
  F = (typeof requestAnimationFrame == "function" ? requestAnimationFrame : (t) => setTimeout(t, 16))(() => {
    F = 0, N.value += 1;
  });
}
function V(e, t, o, r) {
  return !!S.read(J(e, t, o, r));
}
function z(e, t, o, r) {
  return h.has(J(e, t, o, r));
}
function ee(e, t, o, r) {
  const n = C(e), { cleanText: a, cleanContext: i } = G(t, o, r);
  return n === "explain_in_context" && !i || !a ? "unrequested" : V(n, a, i, r) ? "ready" : z(n, a, i, r) ? "loading" : "unrequested";
}
function te(e, t, o, r) {
  const n = C(e), { cleanText: a, cleanContext: i } = G(t, o, r);
  return n === "explain_in_context" && !i || !a;
}
function U() {
  H(), S.clear(), h.clear(), K();
}
he(U);
function H() {
  fe(), w.invalidate();
  for (const [e, t] of R.entries())
    Y(e, t);
  R.clear(), Y(), h.clear(), K();
}
function Q() {
  H(), k = "", y.value = !1;
}
function W() {
  L.invalidate(), P = "";
}
ve(() => {
  Q(), W();
});
function X(e, t, o) {
  return `${e.toLowerCase()}\0${t.toLowerCase()}\0${o.toLowerCase()}`;
}
function ne(e) {
  var t;
  return Ae(e) ? !!((t = e.aiModel) != null && t.trim()) : pe(e);
}
function ae(e) {
  var t;
  return !!(e.enableAI && ne(e) && ((t = e.preloadedAiIntents) != null && t.length));
}
function B(e, t) {
  return !!(e.enableAI && ne(e) && de(e, t));
}
async function O(e, t, o, r) {
  await M();
  const n = m.value, a = C(e), i = $(a, t, o, r, n), s = S.read(i);
  if (s) return s;
  const c = h.get(i);
  if (c) return c;
  const l = ge("ai"), g = Ce({
    text: t,
    context: r,
    intent: a,
    targetLang: o,
    requestId: l
  }).then((u) => (S.write(i, u), u)).finally(() => {
    R.get(a) === l && R.delete(a), h.delete(i), K();
  });
  return R.set(a, l), h.set(i, g), K(), g;
}
async function re(e, t, o, r) {
  var _, T;
  if (!t || !t.trim()) return;
  const n = m.value;
  if (!n.enableAI) {
    E.value = "AI is disabled in Settings.";
    return;
  }
  const a = t.trim(), i = String(r || "").replace(/\s+/g, " ").trim(), s = i && i.toLowerCase() !== a.toLowerCase() ? i : "", c = C(e), l = o || n.translateTargetLanguage || "Vietnamese", g = $(c, a, l, s, n), u = S.read(g), f = X(a, s, l);
  if (k !== f && (H(), k = f), v.value = s, I.value = c, E.value = null, u) {
    p.value = u, y.value = !1;
    return;
  }
  const A = w.current();
  ((T = (_ = p.value) == null ? void 0 : _.query) == null ? void 0 : T.trim().toLowerCase()) !== a.toLowerCase() && (p.value = null), y.value = !0;
  try {
    const d = await O(c, a, l, s);
    if (!w.isCurrent(A) || I.value !== c) return;
    p.value = d;
  } catch (d) {
    if (d instanceof Error && (/abort/i.test(d.message) || d.name === "AbortError") || !w.isCurrent(A) || I.value !== c) return;
    const q = d instanceof Error ? d.message : "Dịch vụ AI phản hồi không hợp lệ.";
    E.value = /Extension context invalidated|runtime is unavailable/i.test(q) ? "Extension was reloaded. Refresh this page and try again." : q, p.value = null;
  } finally {
    w.isCurrent(A) && I.value === c && (y.value = !1);
  }
  if (ae(n) && w.isCurrent(A)) {
    const d = j.filter((q) => B(n, q));
    d.length && D(d);
  }
}
async function D(e = ue) {
  try {
    const { preloadAiIntentChunks: t } = await import("./overlay-async-views-U00ADfLM.js");
    await t(e);
  } catch {
  }
}
async function ie(e, t, o) {
  await M();
  const r = m.value;
  if (!ae(r)) return;
  const n = String(e || "").trim();
  if (!n) return;
  const a = o || r.translateTargetLanguage || "Vietnamese", i = String(t || v.value || "").replace(/\s+/g, " ").trim(), s = i && i.toLowerCase() !== n.toLowerCase() ? i : "", c = L.current(), l = X(n, s, a), g = j.filter(
    (f) => B(r, f) && !(f === "explain_in_context" && !s)
  );
  if (g.length && D(g), !g.length) return;
  const u = (f) => {
    if (!L.isCurrent(c) || k && k !== l && P !== l) return;
    const A = g[f];
    if (!A) return;
    const _ = $(C(A), n, a, s, r);
    if (S.read(_) || h.has(_)) {
      u(f + 1);
      return;
    }
    O(A, n, a, s).catch(() => {
    }).finally(() => {
      if (!L.isCurrent(c)) return;
      const T = globalThis.requestIdleCallback;
      if (typeof T == "function") {
        T(() => u(f + 1), { timeout: 600 });
        return;
      }
      setTimeout(() => u(f + 1), 250);
    });
  };
  u(0);
}
async function oe(e, t, o, r) {
  await M();
  const n = m.value;
  if (!B(n, C(e))) return;
  const a = String(t || "").trim();
  if (!a) return;
  const i = r || n.translateTargetLanguage || "Vietnamese", s = String(o || v.value || "").replace(/\s+/g, " ").trim(), c = s && s.toLowerCase() !== a.toLowerCase() ? s : "", l = C(e);
  if (!(l === "explain_in_context" && !c)) {
    D([l]);
    try {
      await O(l, a, i, c);
    } catch {
    }
  }
}
async function se(e, t, o) {
  await M();
  const r = m.value;
  if (!B(r, "default")) return;
  const n = String(e || "").trim();
  if (!n) return;
  const a = o || r.translateTargetLanguage || "Vietnamese", i = String(t || v.value || "").replace(/\s+/g, " ").trim(), s = i && i.toLowerCase() !== n.toLowerCase() ? i : "";
  v.value = s;
  const c = X(n, s, a);
  if (P === c) return;
  const l = L.next();
  P = c, D(["default"]);
  try {
    await O("default", n, a, s);
  } catch {
  }
  L.isCurrent(l);
}
function Le() {
  return {
    activeContext: v,
    activeIntent: I,
    aiResult: p,
    isAiLoading: y,
    aiError: E,
    intentStatusEpoch: N,
    runIntent: re,
    preloadIntents: se,
    preloadSpecificIntent: oe,
    preloadFollowUpIntentsOnTabVisit: ie,
    isAiIntentReady: V,
    isAiIntentPending: z,
    getAiIntentStatus: ee,
    isAiIntentDisabled: te,
    abortActiveAiRequest: Q,
    cancelAiPreload: W,
    clearAiCache: U
  };
}
function Se() {
  return {
    activeContext: x(v),
    activeIntent: x(I),
    aiResult: x(p),
    isAiLoading: x(y),
    aiError: x(E),
    intentStatusEpoch: x(N),
    runIntent: re,
    preloadIntents: se,
    preloadSpecificIntent: oe,
    preloadFollowUpIntentsOnTabVisit: ie,
    isAiIntentReady: V,
    isAiIntentPending: z,
    getAiIntentStatus: ee,
    isAiIntentDisabled: te,
    abortActiveAiRequest: Q,
    cancelAiPreload: W,
    clearAiCache: U
  };
}
export {
  ye as AI_INTENTS,
  ue as PRELOAD_ALL_INTENTS,
  j as PRELOAD_FOLLOW_UPS,
  Q as abortActiveAiRequest,
  W as cancelAiPreload,
  U as clearAiCache,
  Le as getAiAssistantStore,
  ee as getAiIntentStatus,
  te as isAiIntentDisabled,
  z as isAiIntentPending,
  V as isAiIntentReady,
  ie as preloadFollowUpIntentsOnTabVisit,
  oe as preloadSpecificIntent,
  Se as useAiAssistant
};
