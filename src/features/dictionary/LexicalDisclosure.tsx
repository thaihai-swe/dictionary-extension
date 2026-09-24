import React from 'react';
import {
  IconAlertTriangle,
  IconBook,
  IconChevronDown,
  IconDna,
  IconLink,
  IconPuzzle,
  IconSparkles,
  IconTree,
} from '@/components/icons';

interface LexicalDisclosureProps {
  label: string;
  count?: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

function getDisclosureIcon(label: string): React.FC<{ className?: string }> {
  const l = label.toLowerCase();
  if (l.includes('example')) return IconBook;
  if (l.includes('synonym') || l.includes('antonym')) return IconLink;
  if (l.includes('family')) return IconTree;
  if (l.includes('collocation')) return IconPuzzle;
  if (l.includes('formation')) return IconDna;
  if (l.includes('mistake')) return IconAlertTriangle;
  return IconSparkles;
}

function LexicalDisclosure({ label, count, defaultOpen, children }: LexicalDisclosureProps) {
  const Icon = getDisclosureIcon(label);

  return (
    <details
      open={defaultOpen}
      className="lexical-disclosure rounded-2xl border border-border/80 bg-surface shadow-xs overflow-hidden group transition-all"
    >
      <summary className="px-4 py-3 text-[14px] font-bold text-content-secondary uppercase tracking-wider flex items-center justify-between gap-2 cursor-pointer select-none hover:bg-muted/40 transition-colors">
        <span className="flex items-center gap-2 min-w-0">
          <Icon className="w-4 h-4 text-accent shrink-0" />
          <span className="truncate">{label}</span>
          {typeof count === 'number' ? (
            <span className="text-[11px] font-mono text-content-muted normal-case px-1.5 py-0.5 rounded-full bg-muted border border-border-subtle">
              {count}
            </span>
          ) : null}
        </span>
        <IconChevronDown className="w-4 h-4 text-content-muted group-hover:text-content transition-transform duration-200 shrink-0" />
      </summary>
      <div className="dictionary-detail-content px-4 pb-4 space-y-3.5 border-t border-border/60 pt-3.5">
        {children}
      </div>
    </details>
  );
}

export default React.memo(LexicalDisclosure);
