export const TRIGGER_CSS = `
.dictionary-trigger-icon-btn {
  position: fixed;
  z-index: 2147483646;
  width: 42px;
  height: 42px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 16px 34px rgba(31, 22, 57, 0.28), 0 1px 0 rgba(255, 255, 255, 0.48) inset;
  -webkit-backdrop-filter: blur(18px) saturate(155%);
  backdrop-filter: blur(18px) saturate(155%);
  transition: transform 180ms cubic-bezier(0.16, 1, 0.3, 1), box-shadow 180ms ease;
  outline: none;
  animation: dictionary-trigger-enter 220ms cubic-bezier(0.34, 1.56, 0.64, 1);
}
.dictionary-trigger-icon-btn:hover { transform: scale(1.08); }
.dictionary-trigger-icon-btn:active { transform: scale(0.95); }
.dictionary-trigger-icon-btn:focus-visible { outline: 3px solid rgba(167, 139, 250, 0.8); outline-offset: 3px; }
.dictionary-trigger-icon-btn.dark {
  background: linear-gradient(145deg, rgba(167, 139, 250, 0.92), rgba(255, 154, 118, 0.7));
  color: #21193f;
  border: 1px solid rgba(255, 255, 255, 0.22);
  box-shadow: 0 16px 34px rgba(3, 5, 16, 0.58), 0 1px 0 rgba(255, 255, 255, 0.2) inset;
}
.dictionary-trigger-icon-btn.light {
  background: linear-gradient(145deg, rgba(124, 92, 255, 0.92), rgba(255, 154, 118, 0.72));
  color: #ffffff;
  border: 1px solid rgba(255, 255, 255, 0.72);
  box-shadow: 0 16px 34px rgba(31, 22, 57, 0.32), 0 1px 0 rgba(255, 255, 255, 0.45) inset;
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
  background: rgba(21, 18, 34, 0.34);
  -webkit-backdrop-filter: blur(2px);
  backdrop-filter: blur(2px);
}
@media (prefers-reduced-transparency: reduce), (forced-colors: active) {
  .dictionary-trigger-icon-btn {
    -webkit-backdrop-filter: none;
    backdrop-filter: none;
  }
  .dictionary-backdrop {
    -webkit-backdrop-filter: none;
    backdrop-filter: none;
    background: rgba(21, 18, 34, 0.58);
  }
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
