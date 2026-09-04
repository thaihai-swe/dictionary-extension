import React from 'react';
import MarkdownRenderer from './component.markdown-renderer';
import { IconDna } from './icons';

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
    <div className="rounded-lg border border-border bg-surface p-3 space-y-2">
      <div className="flex items-center gap-1.5 text-[11px] font-bold text-content-muted uppercase tracking-wider">
        <IconDna className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
        <span>Word Formation</span>
      </div>
      {(prefixes?.length || suffixes?.length) ? (
        <div className="flex flex-wrap gap-1">
          {prefixes?.map((item) => (
            <span key={`p-${item}`} className="h-[24px] px-2 rounded bg-muted border border-border text-content text-[11.5px] font-mono inline-flex items-center">
              prefix: {item}
            </span>
          ))}
          {suffixes?.map((item) => (
            <span key={`s-${item}`} className="h-[24px] px-2 rounded bg-muted border border-border text-content text-[11.5px] font-mono inline-flex items-center">
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
