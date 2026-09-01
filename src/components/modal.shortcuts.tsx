import React from 'react';

interface ShortcutsModalProps {
  show: boolean;
  onClose?: () => void;
}

const shortcuts = [
  { key: 'Shift + Q', label: 'Quick Lookup Selected Text', sub: 'Lookup highlighted word or phrase instantly' },
  { key: 'Esc', label: 'Close Popup & Stop Voice', sub: 'Close window and stop active audio playback' },
  { key: 'Button ⏹️ / 🔇', label: 'Global Stop Voice', sub: 'Immediately stop TTS speech synthesis audio' },
  { key: 'Alt + 1', label: 'Switch to Dictionary Tab', sub: 'Jump directly to pure dictionary view' },
  { key: 'Alt + 2', label: 'Switch to AI Assistant Tab', sub: 'Jump directly to AI assistant workbench' },
  { key: 'Button ⤢', label: 'Maximize / Restore Popup', sub: 'Toggle full-sized workbench view' },
  { key: 'Button 🌙/☀️', label: 'Toggle Dark / Light Theme', sub: 'Switch interface color scheme' },
];

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ show, onClose }) => {
  if (!show) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div className="w-full max-w-sm rounded-xl border border-dark-border bg-dark-surface p-4 space-y-3.5 shadow-2xl select-none">
        <div className="flex items-center justify-between border-b border-dark-border pb-2.5">
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <span>⌨️</span> Shortcuts &amp; Guide
            </h3>
            <p className="text-[10px] text-slate-400">Keyboard Shortcuts &amp; User Tips</p>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white text-base cursor-pointer">
            ✕
          </button>
        </div>

        <div className="space-y-1.5 text-xs max-h-[320px] overflow-y-auto pr-1">
          {shortcuts.map((item, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-2 rounded-lg bg-dark-muted border border-dark-border gap-2"
            >
              <div>
                <span className="text-slate-200 font-semibold block text-[11px]">{item.label}</span>
                <span className="text-slate-400 text-[10px] block">{item.sub}</span>
              </div>
              <kbd className="px-2 py-0.5 rounded bg-dark-border text-teal-300 font-mono font-bold border border-slate-700 text-[10px] flex-shrink-0">
                {item.key}
              </kbd>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full py-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition-colors cursor-pointer"
        >
          Got it!
        </button>
      </div>
    </div>
  );
};

export default ShortcutsModal;
