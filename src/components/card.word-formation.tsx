import React from 'react';
import MarkdownRenderer from './component.markdown-renderer';

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
    <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-3.5 space-y-2">
      <div className="flex items-center gap-2 text-xs font-bold text-slate-100 uppercase tracking-wider">
        <span>🧬</span>
        <span>WORD FORMATION</span>
      </div>
      {(prefixes?.length || suffixes?.length) ? (
        <div className="flex flex-wrap gap-1.5">
          {prefixes?.map((item) => (
            <span key={`p-${item}`} className="px-2 py-0.5 rounded bg-dark-muted text-slate-100 text-[11px] font-semibold">
              {item}
            </span>
          ))}
          {suffixes?.map((item) => (
            <span key={`s-${item}`} className="px-2 py-0.5 rounded bg-dark-muted text-slate-100 text-[11px] font-semibold">
              {item}
            </span>
          ))}
        </div>
      ) : null}
      {formation?.trim() ? <MarkdownRenderer content={formation} /> : null}
    </div>
  );
};

export default WordFormationCard;
