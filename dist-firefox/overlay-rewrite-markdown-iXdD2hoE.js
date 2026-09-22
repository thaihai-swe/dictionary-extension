function W(t) {
  const n = g(String(t || "").replace(/\r\n/g, `
`)).trim();
  if (!n) return { sections: [] };
  const e = x(n.split(`
`)).map((r, s) => {
    const o = L(r.title);
    return {
      id: I(o || `section-${s + 1}`),
      title: o,
      blocks: b(r.lines)
    };
  }).filter((r) => r.title || r.blocks.length);
  return v(e);
}
function m(t) {
  return String(t || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function H(t) {
  return m(t).replace(/\*\*(.+?)\*\*/g, '<strong class="text-content font-semibold">$1</strong>').replace(/(^|[^*])\*(?!\s)(.+?)\*(?!\*)/g, '$1<em class="italic">$2</em>').replace(/`(.+?)`/g, '<code class="px-1 py-0.5 rounded bg-muted border border-border font-mono text-[12px]">$1</code>');
}
function j(t) {
  return d(t.title) || S(t.title);
}
function g(t) {
  const n = t.trim().match(/^```(?:markdown|md)?\s*\n([\s\S]*?)\n```$/i);
  return n ? n[1] : t;
}
function x(t) {
  const n = [];
  let e = "", r = [];
  const s = () => {
    (e || r.some((o) => o.trim())) && n.push({ title: e, lines: r }), r = [];
  };
  for (const o of t) {
    const c = p(o);
    if (c && c.level <= 3) {
      s(), e = c.text;
      continue;
    }
    r.push(o);
  }
  return s(), n;
}
function b(t) {
  const n = [];
  let e = 0;
  for (; e < t.length; ) {
    const r = t[e], s = r.trim();
    if (!s) {
      e += 1;
      continue;
    }
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(s)) {
      n.push({ type: "hr" }), e += 1;
      continue;
    }
    const o = p(s);
    if (o) {
      n.push({ type: "heading", level: o.level, text: o.text }), e += 1;
      continue;
    }
    if (s.startsWith("|") && s.endsWith("|")) {
      const i = k(t, e);
      if (i.headers.length) {
        n.push(i.block), e = i.nextIndex;
        continue;
      }
    }
    if (a(s)) {
      const i = [];
      for (; e < t.length && a(t[e].trim()); )
        i.push(t[e].trim().replace(/^>\s?/, "")), e += 1;
      const l = i.filter((f) => f.trim());
      l.length && n.push({ type: "quote", lines: l });
      continue;
    }
    if (u(r)) {
      const i = y(t, e);
      n.push(i.block), e = i.nextIndex;
      continue;
    }
    const c = [s];
    for (e += 1; e < t.length; ) {
      const i = t[e], l = i.trim();
      if (!l || p(l) || u(i) || a(l) || l.startsWith("|") || /^(-{3,}|\*{3,}|_{3,})$/.test(l))
        break;
      c.push(l), e += 1;
    }
    n.push({ type: "paragraph", text: c.join(" ") });
  }
  return n;
}
function k(t, n) {
  const e = [];
  let r = n;
  for (; r < t.length; ) {
    const i = t[r].trim();
    if (!i.startsWith("|") || !i.endsWith("|")) break;
    e.push(w(i)), r += 1;
  }
  const s = e[0] || [], c = e[1] && e[1].every((i) => /^:?-{3,}:?$/.test(i.replace(/\s/g, ""))) ? e.slice(2) : e.slice(1);
  return {
    headers: s,
    nextIndex: r,
    block: { type: "table", headers: s, rows: c }
  };
}
function w(t) {
  return t.slice(1, -1).split("|").map((n) => n.trim());
}
function y(t, n) {
  var s;
  const e = [];
  let r = n;
  for (; r < t.length; ) {
    const o = t[r];
    if (!o.trim()) {
      const i = T(t, r + 1);
      if (i >= 0 && u(t[i])) {
        r += 1;
        continue;
      }
      break;
    }
    const c = h(o);
    if (!c) break;
    e.push(c), r += 1;
  }
  return {
    nextIndex: r,
    block: {
      type: "list",
      ordered: ((s = e[0]) == null ? void 0 : s.ordered) ?? !1,
      items: $(e)
    }
  };
}
function $(t) {
  const n = [], e = [];
  for (const r of t) {
    const s = { text: r.text };
    for (; e.length && r.indent <= e[e.length - 1].indent; ) e.pop();
    if (!e.length)
      n.push(s);
    else {
      const o = e[e.length - 1].item;
      o.children = o.children || [], o.children.push(s);
    }
    e.push({ indent: r.indent, item: s });
  }
  return n;
}
function h(t) {
  const n = t.match(/^(\s*)(?:([-*•])|(\d+[.)]))\s+(.*)$/);
  return n ? {
    indent: n[1].replace(/\t/g, "  ").length,
    ordered: !!n[3],
    text: n[4].trim()
  } : null;
}
function u(t) {
  return h(t) != null;
}
function a(t) {
  return t.startsWith(">");
}
function p(t) {
  const n = t.match(/^(#{1,6})\s+(.+)$/);
  return n ? { level: n[1].length, text: n[2].trim() } : null;
}
function v(t) {
  const n = t.findIndex((i) => d(i.title));
  if (n < 0) return { sections: t };
  const e = t[n], r = [], s = [];
  for (const i of e.blocks)
    i.type === "paragraph" ? r.push(i.text) : i.type === "quote" ? r.push(i.lines.join(`
`)) : s.push(i);
  const o = r.join(`

`).trim(), c = [...t];
  return s.length ? c[n] = { ...e, blocks: s } : c.splice(n, 1), { polished: o || void 0, sections: c };
}
function d(t) {
  return /revised text/i.test(t);
}
function S(t) {
  return /alternative rewrite/i.test(t);
}
function L(t) {
  return String(t || "").replace(/\bPHASE\s*\d+[a-z]?\s*[:.\-–—]\s*/i, "").replace(/\s+/g, " ").trim();
}
function I(t) {
  return t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "section";
}
function T(t, n) {
  for (let e = n; e < t.length; e += 1)
    if (t[e].trim()) return e;
  return -1;
}
export {
  m as e,
  H as f,
  W as p,
  j as s
};
