import React, { useMemo } from 'react';
import { Collocations } from '../types';

interface CollocationsCardProps {
  word?: string;
  collocations?: Collocations;
  onSelectWord?: (word: string) => void;
}

const chipClass =
  'px-2.5 py-0.5 rounded-full bg-dark-muted hover:bg-teal-500/20 hover:text-teal-300 text-teal-300 text-[11px] transition-all cursor-pointer font-medium';

export const CollocationsCard: React.FC<CollocationsCardProps> = ({
  collocations,
  onSelectWord,
}) => {
  const calculatedCollocations = useMemo<Collocations>(() => {
    if (
      collocations &&
      (collocations.verbs?.length ||
        collocations.nouns?.length ||
        collocations.adjectives?.length ||
        collocations.prepositions?.length ||
        collocations.patterns?.length)
    ) {
      return collocations;
    }
    return {};
  }, [collocations]);

  const hasAnyData = Boolean(
    calculatedCollocations.verbs?.length ||
      calculatedCollocations.nouns?.length ||
      calculatedCollocations.adjectives?.length ||
      calculatedCollocations.prepositions?.length ||
      calculatedCollocations.patterns?.length,
  );

  if (!hasAnyData) return null;

  const renderChips = (items?: string[]) =>
    items?.map((item) => (
      <button key={item} type="button" onClick={() => onSelectWord?.(item)} className={chipClass}>
        {item}
      </button>
    ));

  return (
    <div className="pt-3 border-t border-dark-border/50 space-y-2.5">
      <div className="flex items-center gap-1.5 text-[11px] font-extrabold text-teal-400 uppercase tracking-wider">
        <span>🔗</span>
        <span>COLLOCATIONS</span>
      </div>

      <div className="space-y-2 text-xs">
        {calculatedCollocations.verbs?.length ? (
          <div className="space-y-1">
            <span className="text-slate-400 font-semibold text-[11px] block">Common Verbs</span>
            <div className="flex flex-wrap gap-1.5">{renderChips(calculatedCollocations.verbs)}</div>
          </div>
        ) : null}

        {calculatedCollocations.nouns?.length ? (
          <div className="space-y-1">
            <span className="text-slate-400 font-semibold text-[11px] block">Common Nouns</span>
            <div className="flex flex-wrap gap-1.5">{renderChips(calculatedCollocations.nouns)}</div>
          </div>
        ) : null}

        {calculatedCollocations.patterns?.length ? (
          <div className="space-y-1">
            <span className="text-slate-400 font-semibold text-[11px] block">Patterns</span>
            <div className="flex flex-wrap gap-1.5">{renderChips(calculatedCollocations.patterns)}</div>
          </div>
        ) : null}

        {calculatedCollocations.prepositions?.length ? (
          <div className="space-y-1">
            <span className="text-slate-400 font-semibold text-[11px] block">Prepositions</span>
            <div className="flex flex-wrap gap-1.5">{renderChips(calculatedCollocations.prepositions)}</div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default CollocationsCard;
