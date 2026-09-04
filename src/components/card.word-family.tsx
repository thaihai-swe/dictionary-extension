import React, { useMemo } from 'react';
import { WordFamily } from '../types';
import { IconTree } from './icons';

interface WordFamilyCardProps {
  word?: string;
  family?: WordFamily;
  onSelectWord?: (word: string) => void;
}

const chipClass =
  'h-[24px] px-2 rounded bg-surface hover:bg-elevated text-content text-[11.5px] font-medium transition-colors cursor-pointer border border-border flex items-center justify-center';

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
      <div className="flex items-start gap-2">
        <span className="w-[78px] text-content-muted font-semibold text-[10.5px] flex-shrink-0 uppercase tracking-wider pt-1">
          {label}
        </span>
        <div className="flex flex-wrap gap-1">
          {items.map((item) => (
            <button key={item} type="button" onClick={() => onSelectWord?.(item)} className={chipClass}>
              {item}
            </button>
          ))}
        </div>
      </div>
    ) : null;

  return (
    <div className="pt-3 border-t border-border space-y-2">
      <div className="flex items-center gap-1.5 text-[11px] font-bold text-content-muted uppercase tracking-wider">
        <IconTree className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
        <span>Word Family</span>
      </div>

      <div className="space-y-1.5 text-[12px]">
        {renderRow('Nouns', calculatedFamily.nouns)}
        {renderRow('Verbs', calculatedFamily.verbs)}
        {renderRow('Adjectives', calculatedFamily.adjectives)}
        {renderRow('Adverbs', calculatedFamily.adverbs)}
        {renderRow('Inflections', calculatedFamily.inflections)}
        {renderRow('Derivatives', calculatedFamily.derivatives)}
      </div>
    </div>
  );
};

export default WordFamilyCard;
