import React, { useMemo } from 'react';
import { WordFamily } from '@/types';
import { IconTree } from '@/components/icons';

interface WordFamilyCardProps {
  word?: string;
  family?: WordFamily;
  onSelectWord?: (word: string) => void;
}

const chipClass =
  'h-6 px-2.5 rounded-lg bg-muted/60 hover:bg-elevated text-content text-[12.5px] font-medium transition-all hover:scale-[1.02] active:scale-95 cursor-pointer border border-border/70 inline-flex items-center justify-center';

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
      <div className="grid grid-cols-[90px_minmax(0,1fr)] gap-2.5 items-center">
        <span className="text-[12px] font-bold uppercase tracking-wider text-content-secondary font-mono">{label}</span>
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
    <section className="p-4 rounded-2xl border border-border/80 bg-surface space-y-3 font-sans shadow-xs">
      <div className="flex items-center gap-2 text-[12px] font-bold text-content-muted uppercase tracking-wider font-mono">
        <IconTree className="w-3.5 h-3.5 text-accent" />
        <span>Word Family</span>
      </div>

      <div className="space-y-2">
        {renderRow('Nouns', calculatedFamily.nouns)}
        {renderRow('Verbs', calculatedFamily.verbs)}
        {renderRow('Adjectives', calculatedFamily.adjectives)}
        {renderRow('Adverbs', calculatedFamily.adverbs)}
        {renderRow('Inflections', calculatedFamily.inflections)}
        {renderRow('Derivatives', calculatedFamily.derivatives)}
      </div>
    </section>
  );
};

export default WordFamilyCard;
