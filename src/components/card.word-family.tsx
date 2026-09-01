import React, { useMemo } from 'react';
import { WordFamily } from '../types';

interface WordFamilyCardProps {
  word?: string;
  family?: WordFamily;
  onSelectWord?: (word: string) => void;
}

const chipClass =
  'px-3 py-1 rounded-full bg-dark-muted hover:bg-emerald-500/20 hover:text-emerald-300 text-slate-200 text-xs font-semibold transition-all cursor-pointer';

export const WordFamilyCard: React.FC<WordFamilyCardProps> = ({ family, onSelectWord }) => {
  const calculatedFamily = useMemo<WordFamily>(() => {
    if (
      family &&
      (family.nouns?.length ||
        family.verbs?.length ||
        family.adjectives?.length ||
        family.adverbs?.length ||
        family.inflections?.length ||
        family.derivatives?.length)
    ) {
      return family;
    }
    return {};
  }, [family]);

  const hasAnyData = Boolean(
    calculatedFamily.nouns?.length ||
      calculatedFamily.verbs?.length ||
      calculatedFamily.adjectives?.length ||
      calculatedFamily.adverbs?.length ||
      calculatedFamily.inflections?.length ||
      calculatedFamily.derivatives?.length,
  );

  if (!hasAnyData) return null;

  const renderRow = (label: string, items?: string[]) =>
    items?.length ? (
      <div className="flex items-center gap-3">
        <span className="w-20 text-slate-400 font-bold text-xs flex-shrink-0">{label}</span>
        <div className="flex flex-wrap gap-1.5">
          {items.map((item) => (
            <button key={item} type="button" onClick={() => onSelectWord?.(item)} className={chipClass}>
              {item}
            </button>
          ))}
        </div>
      </div>
    ) : null;

  return (
    <div className="pt-3.5 border-t border-dark-border/50 space-y-3">
      <div className="flex items-center gap-1.5 text-xs font-extrabold text-emerald-400 uppercase tracking-wider">
        <span>🌲</span>
        <span>WORD FAMILY</span>
      </div>
      <div className="space-y-2.5 text-xs">
        {renderRow('Noun', calculatedFamily.nouns)}
        {renderRow('Verb', calculatedFamily.verbs)}
        {renderRow('Adjective', calculatedFamily.adjectives)}
        {renderRow('Adverb', calculatedFamily.adverbs)}
        {renderRow('Derivatives', calculatedFamily.derivatives)}
        {renderRow('Inflections', calculatedFamily.inflections)}
      </div>
    </div>
  );
};

export default WordFamilyCard;
