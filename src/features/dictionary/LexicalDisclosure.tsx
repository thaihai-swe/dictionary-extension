import React from 'react';
import { IconChevronDown, IconSparkles } from '@/components/icons';

interface LexicalDisclosureProps {
  label: string;
  count?: number;
  children: React.ReactNode;
}

function LexicalDisclosure({ label, count, children }: LexicalDisclosureProps) {
  return (
    <details className="rounded-2xl border border-border/80 bg-surface shadow-xs overflow-hidden group">
      <summary className="px-4 py-3 text-[11.5px] font-bold text-content-secondary uppercase tracking-wider flex items-center justify-between gap-2 cursor-pointer select-none hover:bg-muted/40 transition-colors">
        <span className="flex items-center gap-2 min-w-0">
          <IconSparkles className="w-3.5 h-3.5 text-accent shrink-0" />
          <span className="truncate">{label}</span>
          {typeof count === 'number' ? (
            <span className="text-[10px] font-mono text-content-muted normal-case">({count})</span>
          ) : null}
        </span>
        <IconChevronDown className="w-4 h-4 text-content-muted group-hover:text-content transition-transform shrink-0" />
      </summary>
      <div className="dictionary-detail-content px-4 pb-4 space-y-3.5 border-t border-border/60 pt-3.5">
        {children}
      </div>
    </details>
  );
}

export default React.memo(LexicalDisclosure);
