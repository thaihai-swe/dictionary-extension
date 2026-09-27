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
      className="lexical-disclosure rounded-xl border border-border/70 bg-surface shadow-2xs overflow-hidden group transition-all"
    >
      <summary className="px-3.5 py-2 text-[12.5px] font-bold text-content-secondary uppercase tracking-wider flex items-center justify-between gap-2 cursor-pointer select-none hover:bg-muted/40 transition-colors">
        <span className="flex items-center gap-2 min-w-0">
          <Icon className="w-3.5 h-3.5 text-accent shrink-0" />
          <span className="truncate">{label}</span>
          {typeof count === 'number' ? (
            <span className="text-[10px] font-mono text-content-muted normal-case px-1.5 py-0.5 rounded-full bg-muted border border-border-subtle">
              {count}
            </span>
          ) : null}
        </span>
        <IconChevronDown className="w-3.5 h-3.5 text-content-muted group-hover:text-content transition-transform duration-200 shrink-0" />
      </summary>
      <div className="dictionary-detail-content px-3.5 pb-3 space-y-2.5 border-t border-border/60 pt-2.5">
        {children}
      </div>
    </details>
  );
}

export default React.memo(LexicalDisclosure);
