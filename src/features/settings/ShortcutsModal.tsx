import React, { useEffect, useRef } from 'react';
import { IconClose, IconKeyboard } from '@/components/icons';

interface ShortcutsModalProps {
  show?: boolean;
  onClose?: () => void;
}

const shortcuts = [
  { label: 'Look up Selected Text', sub: 'Content Script In-Page Trigger', keys: ['Alt', 'L'] },
  { label: 'Dictionary Tab', sub: 'Switch directly to Dictionary view', keys: ['Alt', '1'] },
  { label: 'AI Assistant Tab', sub: 'Switch directly to AI learning assistant', keys: ['Alt', '2'] },
  { label: 'Show Shortcuts Modal', sub: 'Toggle this keyboard shortcut helper', keys: ['Shift', 'Q'] },
  { label: 'Stop Audio / Close Modal', sub: 'Immediately stops voice synthesis or closes dialogs', keys: ['Esc'] },
  { label: 'Perform Search / Action', sub: 'Submits lookup query or runs AI analysis', keys: ['Enter'] },
];

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ show, onClose }) => {
  const dialogRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose?.();
      }
    }
    if (!show) return;
    window.addEventListener('keydown', handleKeyDown);
    dialogRef.current?.focus();
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [show, onClose]);

  if (!show) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 font-sans"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcuts-title"
        tabIndex={-1}
        className="w-full max-w-sm rounded-2xl border border-border bg-surface p-5 space-y-4 shadow-card-elevated select-none outline-none"
      >
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-teal-500/15 border border-teal-500/30 flex items-center justify-center text-teal-600 dark:text-teal-400">
              <IconKeyboard className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            </div>
            <div>
              <h3 id="shortcuts-title" className="text-sm font-bold text-content font-heading">
                Keyboard Shortcuts
              </h3>
              <p className="text-[11px] text-content-muted">Quick keys to navigate the workbench</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close shortcuts dialog"
            className="p-1 rounded-lg text-content-muted hover:text-content hover:bg-muted transition-colors cursor-pointer"
          >
            <IconClose className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2 text-xs max-h-[340px] overflow-y-auto pr-1">
          {shortcuts.map((item, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-2.5 rounded-xl bg-muted/60 border border-border gap-3 shadow-xs"
            >
              <div>
                <span className="text-content font-semibold block text-xs">{item.label}</span>
                <span className="text-content-muted text-[10px] block mt-0.5">{item.sub}</span>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                {item.keys.map((k, kIdx) => (
                  <kbd
                    key={kIdx}
                    className="px-2 py-1 rounded-md bg-surface text-teal-600 dark:text-teal-300 font-mono font-bold border border-border text-[11px] shadow-xs"
                  >
                    {k}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95"
        >
          Got it
        </button>
      </div>
    </div>
  );
};

export default ShortcutsModal;
