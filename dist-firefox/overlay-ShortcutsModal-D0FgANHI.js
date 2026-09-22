import { r as c, j as e } from "./overlay-react-core-BJZCkGtm.js";
import { I as d, a as i } from "./overlay-overlay-app-BmJscKyW.js";
const u = [
  { label: "Look up Selected Text", sub: "In-page text selection trigger", keys: ["Alt", "L"] },
  { label: "Switch to Dictionary", sub: "Direct view switch (when not typing)", keys: ["1", "or", "Alt+1"] },
  { label: "Switch to AI Assistant", sub: "Direct view switch (when not typing)", keys: ["2", "or", "Alt+2"] },
  { label: "Copy Markdown Flashcard", sub: "Export formatted definition to clipboard", keys: ["Copy MD"] },
  { label: "Show Shortcuts Modal", sub: "Toggle this keyboard shortcut helper", keys: ["?"] },
  { label: "Stop Audio / Close Modal", sub: "Stops speech playback or dismisses modal", keys: ["Esc"] },
  { label: "Perform Search / Action", sub: "Submits lookup query or runs AI analysis", keys: ["Enter"] }
], h = ({ show: o, onClose: t }) => {
  const n = c.useRef(null);
  return c.useEffect(() => {
    var r;
    function s(a) {
      a.key === "Escape" && (a.stopPropagation(), t == null || t());
    }
    if (o)
      return window.addEventListener("keydown", s), (r = n.current) == null || r.focus(), () => window.removeEventListener("keydown", s);
  }, [o, t]), o ? /* @__PURE__ */ e.jsx(
    "div",
    {
      className: "fixed inset-0 z-50 bg-slate-950/65 backdrop-blur-md flex items-center justify-center p-4 font-sans",
      onClick: (s) => {
        s.target === s.currentTarget && (t == null || t());
      },
      children: /* @__PURE__ */ e.jsxs(
        "div",
        {
          ref: n,
          role: "dialog",
          "aria-modal": "true",
          "aria-labelledby": "shortcuts-title",
          tabIndex: -1,
          className: "w-full max-w-sm rounded-3xl border border-border/80 bg-surface p-5 space-y-4 shadow-card-elevated select-none outline-none",
          children: [
            /* @__PURE__ */ e.jsxs("div", { className: "flex items-center justify-between border-b border-border/60 pb-3", children: [
              /* @__PURE__ */ e.jsxs("div", { className: "flex items-center gap-2.5", children: [
                /* @__PURE__ */ e.jsx("div", { className: "w-8 h-8 rounded-xl bg-accent-subtle border border-accent/30 flex items-center justify-center text-accent", children: /* @__PURE__ */ e.jsx(d, { className: "w-4 h-4 text-accent" }) }),
                /* @__PURE__ */ e.jsxs("div", { children: [
                  /* @__PURE__ */ e.jsx("h3", { id: "shortcuts-title", className: "text-sm font-bold text-content font-heading", children: "Keyboard Shortcuts" }),
                  /* @__PURE__ */ e.jsx("p", { className: "text-[13px] text-content-muted", children: "Quick keys to navigate the workbench" })
                ] })
              ] }),
              /* @__PURE__ */ e.jsx(
                "button",
                {
                  type: "button",
                  onClick: t,
                  "aria-label": "Close shortcuts dialog",
                  className: "p-1 rounded-lg text-content-muted hover:text-content hover:bg-muted transition-colors cursor-pointer",
                  children: /* @__PURE__ */ e.jsx(i, { className: "w-4 h-4" })
                }
              )
            ] }),
            /* @__PURE__ */ e.jsx("div", { className: "space-y-2 text-xs max-h-[340px] overflow-y-auto pr-1", children: u.map((s, r) => /* @__PURE__ */ e.jsxs(
              "div",
              {
                className: "flex items-center justify-between p-2.5 rounded-xl bg-muted/60 border border-border gap-3 shadow-xs",
                children: [
                  /* @__PURE__ */ e.jsxs("div", { children: [
                    /* @__PURE__ */ e.jsx("span", { className: "text-content font-semibold block text-xs", children: s.label }),
                    /* @__PURE__ */ e.jsx("span", { className: "text-content-muted text-[12px] block mt-0.5", children: s.sub })
                  ] }),
                  /* @__PURE__ */ e.jsx("div", { className: "flex items-center gap-1 flex-shrink-0", children: s.keys.map((a, l) => /* @__PURE__ */ e.jsx(
                    "kbd",
                    {
                      className: "px-2 py-1 rounded-md bg-surface text-accent font-mono font-bold border border-border text-[13px] shadow-xs",
                      children: a
                    },
                    l
                  )) })
                ]
              },
              r
            )) }),
            /* @__PURE__ */ e.jsx(
              "button",
              {
                type: "button",
                onClick: t,
                className: "ui-button-primary w-full py-2.5 text-xs font-bold cursor-pointer shadow-xs",
                children: "Got it"
              }
            )
          ]
        }
      )
    }
  ) : null;
};
export {
  h as ShortcutsModal,
  h as default
};
