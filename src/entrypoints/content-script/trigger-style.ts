export const TRIGGER_CSS = `
.dictionary-trigger-icon-btn {
  position: fixed;
  z-index: 2147483646;
  width: 42px;
  height: 42px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  -webkit-backdrop-filter: blur(20px) saturate(160%);
  backdrop-filter: blur(20px) saturate(160%);
  transition: transform 180ms cubic-bezier(0.16, 1, 0.3, 1), box-shadow 180ms ease, filter 180ms ease;
  outline: none;
  animation: dictionary-trigger-enter 240ms cubic-bezier(0.34, 1.56, 0.64, 1);
}
.dictionary-trigger-icon-btn:hover {
  transform: scale(1.08) translateY(-1px);
  filter: brightness(1.05);
}
.dictionary-trigger-icon-btn:active {
  transform: scale(0.94);
}
.dictionary-trigger-icon-btn:focus-visible {
  outline: 3px solid rgba(45, 212, 191, 0.85);
  outline-offset: 3px;
}
.dictionary-trigger-icon-btn.dark {
  background: linear-gradient(135deg, #0d9488 0%, #14b8a6 100%);
  color: #ffffff;
  border: 1px solid rgba(255, 255, 255, 0.28);
  box-shadow: 0 10px 25px -4px rgba(20, 184, 166, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.15) inset;
}
.dictionary-trigger-icon-btn.light {
  background: linear-gradient(135deg, #0f766e 0%, #0d9488 100%);
  color: #ffffff;
  border: 1px solid rgba(255, 255, 255, 0.45);
  box-shadow: 0 10px 25px -4px rgba(13, 148, 136, 0.35), 0 1px 0 rgba(255, 255, 255, 0.4) inset;
}
.dictionary-trigger-icon-btn svg {
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.25));
  transition: transform 180ms ease;
}
.dictionary-trigger-icon-btn:hover svg {
  transform: scale(1.08);
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
  background: rgba(15, 23, 42, 0.45);
  -webkit-backdrop-filter: blur(4px);
  backdrop-filter: blur(4px);
  animation: dictionary-backdrop-fade 180ms ease-out;
}
@media (prefers-reduced-transparency: reduce), (forced-colors: active) {
  .dictionary-trigger-icon-btn {
    -webkit-backdrop-filter: none;
    backdrop-filter: none;
  }
  .dictionary-backdrop {
    -webkit-backdrop-filter: none;
    backdrop-filter: none;
    background: rgba(15, 23, 42, 0.7);
  }
}
@keyframes dictionary-trigger-enter {
  0% { opacity: 0; transform: scale(0.65) translateY(4px); }
  70% { transform: scale(1.08) translateY(-1px); }
  100% { opacity: 1; transform: scale(1) translateY(0); }
}
@keyframes dictionary-backdrop-fade {
  from { opacity: 0; }
  to { opacity: 1; }
}
@media (prefers-reduced-motion: reduce) {
  .dictionary-trigger-icon-btn { animation: none; transition: none; }
  .dictionary-trigger-icon-btn:hover,
  .dictionary-trigger-icon-btn:active { transform: none; }
  .dictionary-backdrop { animation: none; }
}
`;
