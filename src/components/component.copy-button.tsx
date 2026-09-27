import React, { useState } from 'react';
import { IconCheck, IconCopy } from './icons';
import { cx } from '@/ui/cx';
import { showToast } from '@/composables/composable.toast';

export interface CopyButtonProps {
  text?: string;
  onCopy?: () => void;
  label?: string;
  copiedLabel?: string;
  variant?: 'button' | 'icon';
  toastMessage?: string;
  className?: string;
  title?: string;
}

export const CopyButton: React.FC<CopyButtonProps> = ({
  text,
  onCopy,
  label,
  copiedLabel = 'Copied',
  variant = 'button',
  toastMessage,
  className,
  title = 'Copy to clipboard',
}) => {
  const [copied, setCopied] = useState(false);

  async function handleCopy(e: React.MouseEvent) {
    e.stopPropagation();
    if (onCopy) {
      onCopy();
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
      if (toastMessage) showToast(toastMessage);
      return;
    }

    if (text) {
      try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
        if (toastMessage) showToast(toastMessage);
      } catch {
        // fallback
      }
    }
  }

  if (variant === 'icon') {
    return (
      <button
        type="button"
        onClick={handleCopy}
        title={copied ? copiedLabel : title}
        aria-label={copied ? copiedLabel : title}
        className={cx(
          'h-6 w-6 text-content-muted hover:text-content cursor-pointer flex items-center justify-center rounded-md hover:bg-muted transition-colors active:scale-95 select-none',
          copied && 'text-emerald-600 dark:text-emerald-400 font-bold',
          className,
        )}
      >
        {copied ? (
          <IconCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
        ) : (
          <IconCopy className="w-3.5 h-3.5" />
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={copied ? copiedLabel : title}
      aria-label={copied ? copiedLabel : title}
      className={cx(
        'h-7 px-2.5 rounded-lg border text-[12px] font-semibold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs active:scale-95 select-none',
        copied
          ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-700 dark:text-emerald-300 font-bold'
          : 'bg-muted/60 hover:bg-elevated border-border/80 text-content-secondary hover:text-content',
        className,
      )}
    >
      {copied ? (
        <>
          <IconCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{copiedLabel}</span>
        </>
      ) : (
        <>
          <IconCopy className="w-3.5 h-3.5 text-content-muted shrink-0" />
          {label ? <span>{label}</span> : null}
        </>
      )}
    </button>
  );
};

export default CopyButton;
