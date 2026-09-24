import React from 'react';
import MarkdownRenderer from '@/components/component.markdown-renderer';
import { IconDna } from '@/components/icons';

interface WordFormationCardProps {
  formation?: string;
  prefixes?: string[];
  suffixes?: string[];
}

export const WordFormationCard: React.FC<WordFormationCardProps> = ({
  formation,
  prefixes,
  suffixes,
}) => {
  const hasData = Boolean(formation?.trim() || prefixes?.length || suffixes?.length);
  if (!hasData) return null;

  return (
    <div className="rounded-2xl border border-border/80 bg-surface p-4 space-y-2.5 shadow-xs">
      <div className="flex items-center gap-2 text-[12px] font-bold text-content-muted uppercase tracking-wider font-mono">
        <IconDna className="w-3.5 h-3.5 text-accent" />
        <span>Word Formation</span>
      </div>
      {(prefixes?.length || suffixes?.length) ? (
        <div className="flex flex-wrap gap-1.5">
          {prefixes?.map((item) => (
            <span key={`p-${item}`} className="h-6 px-2.5 rounded-lg bg-muted/70 border border-border/60 text-content text-[12px] font-mono inline-flex items-center">
              prefix: {item}
            </span>
          ))}
          {suffixes?.map((item) => (
            <span key={`s-${item}`} className="h-6 px-2.5 rounded-lg bg-muted/70 border border-border/60 text-content text-[12px] font-mono inline-flex items-center">
              suffix: {item}
            </span>
          ))}
        </div>
      ) : null}
      {formation?.trim() ? <MarkdownRenderer content={formation} /> : null}
    </div>
  );
};

export default WordFormationCard;
