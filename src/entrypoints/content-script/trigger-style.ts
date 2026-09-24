export const TRIGGER_CSS = `
.dictionary-trigger-icon-btn {
  position: fixed;
  z-index: 2147483646;
  width: 44px;
  height: 44px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  -webkit-backdrop-filter: blur(20px) saturate(160%);
  backdrop-filter: blur(20px) saturate(160%);
  transition: transform 180ms cubic-bezier(0.16, 1, 0.3, 1), box-shadow 180ms ease;
  outline: none;
  animation: dictionary-trigger-enter 240ms cubic-bezier(0.34, 1.56, 0.64, 1);
}
.dictionary-trigger-icon-btn:hover {
  transform: scale(1.08) translateY(-1px);
}
.dictionary-trigger-icon-btn:active {
  transform: scale(0.95);
}
.dictionary-trigger-icon-btn:focus-visible {
  outline: 3px solid rgba(99, 102, 241, 0.85);
  outline-offset: 3px;
}
.dictionary-trigger-icon-btn.dark {
  background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
  color: #ffffff;
  border: 1px solid rgba(255, 255, 255, 0.25);
  box-shadow: 0 12px 28px -4px rgba(79, 70, 229, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.15) inset;
}
.dictionary-trigger-icon-btn.light {
  background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%);
  color: #ffffff;
  border: 1px solid rgba(255, 255, 255, 0.5);
  box-shadow: 0 12px 28px -4px rgba(79, 70, 229, 0.38), 0 1px 0 rgba(255, 255, 255, 0.4) inset;
}
.dictionary-trigger-icon-btn svg {
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.2));
  transition: transform 180ms ease;
}
.dictionary-trigger-icon-btn:hover svg {
  transform: scale(1.06);
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
