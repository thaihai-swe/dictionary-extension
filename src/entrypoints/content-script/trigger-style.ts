export const TRIGGER_CSS = `
.dictionary-trigger-icon-btn {
  position: fixed;
  z-index: 2147483646;
  width: 40px;
  height: 40px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 12px 28px rgba(13, 148, 136, 0.32), 0 0 0 1px rgba(255, 255, 255, 0.16) inset;
  transition: transform 180ms cubic-bezier(0.16, 1, 0.3, 1), box-shadow 180ms ease;
  outline: none;
  animation: dictionary-trigger-enter 220ms cubic-bezier(0.34, 1.56, 0.64, 1);
}
.dictionary-trigger-icon-btn:hover { transform: scale(1.08); }
.dictionary-trigger-icon-btn:active { transform: scale(0.95); }
.dictionary-trigger-icon-btn:focus-visible { outline: 3px solid rgba(42, 161, 152, 0.55); outline-offset: 3px; }
.dictionary-trigger-icon-btn.dark {
  background: #2aa198;
  color: #002b36;
  border: 2px solid #073642;
  box-shadow: 0 12px 28px rgba(42, 161, 152, 0.42);
}
.dictionary-trigger-icon-btn.light {
  background: #0d9488;
  color: #ffffff;
  border: 2px solid #ffffff;
  box-shadow: 0 12px 28px rgba(13, 148, 136, 0.32);
}
.dictionary-popup-layer {
  position: fixed;
  z-index: 2147483647;
  pointer-events: auto;
}
.dictionary-popup-layer > div {
  width: 100%;
  height: 100%;
}
.dictionary-popup-layer.maximized {
  inset: 1.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
}
.dictionary-backdrop {
  position: fixed;
  inset: 0;
  z-index: 2147483646;
  background: rgba(0, 0, 0, 0.6);
}
@keyframes dictionary-trigger-enter {
  0% { opacity: 0; transform: scale(0.65); }
  70% { transform: scale(1.08); }
  100% { opacity: 1; transform: scale(1); }
}
@media (prefers-reduced-motion: reduce) {
  .dictionary-trigger-icon-btn { animation: none; transition: none; }
  .dictionary-trigger-icon-btn:hover,
  .dictionary-trigger-icon-btn:active { transform: none; }
}
`;
