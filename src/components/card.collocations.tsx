import React, { useMemo } from 'react';
import { Collocations } from '../types';
import { IconLink } from './icons';

interface CollocationsCardProps {
  word?: string;
  collocations?: Collocations;
  onSelectWord?: (word: string) => void;
}

const standardChipClass =
  'h-[24px] px-2 rounded bg-surface hover:bg-elevated text-content text-[11.5px] transition-colors cursor-pointer font-medium border border-border flex items-center justify-center';

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

  return (
    <div className="pt-3 border-t border-border space-y-2.5">
      <div className="flex items-center gap-1.5 text-[11px] font-bold text-content-muted uppercase tracking-wider">
        <IconLink className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
        <span>Collocations</span>
      </div>

      <div className="space-y-2.5 text-[12px]">
        {calculatedCollocations.patterns?.length ? (
          <div className="space-y-1.5 p-2.5 rounded-lg border border-border bg-muted/40">
            <span className="text-[10.5px] font-bold text-content-muted uppercase tracking-wider">
              Patterns
            </span>
            <div className="flex flex-wrap gap-1">
              {calculatedCollocations.patterns.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => onSelectWord?.(item)}
                  className="h-[24px] px-2 rounded bg-surface hover:bg-elevated text-content text-[11.5px] font-medium cursor-pointer border border-border"
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {calculatedCollocations.verbs?.length ? (
          <div className="space-y-1">
            <span className="text-content-muted font-semibold text-[10.5px] uppercase tracking-wider block">
              Verbs
            </span>
            <div className="flex flex-wrap gap-1">
              {calculatedCollocations.verbs.map((item) => (
                <button key={item} type="button" onClick={() => onSelectWord?.(item)} className={standardChipClass}>
                  {item}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {calculatedCollocations.nouns?.length ? (
          <div className="space-y-1">
            <span className="text-content-muted font-semibold text-[10.5px] uppercase tracking-wider block">
              Nouns
            </span>
            <div className="flex flex-wrap gap-1">
              {calculatedCollocations.nouns.map((item) => (
                <button key={item} type="button" onClick={() => onSelectWord?.(item)} className={standardChipClass}>
                  {item}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {calculatedCollocations.adjectives?.length ? (
          <div className="space-y-1">
            <span className="text-content-muted font-semibold text-[10.5px] uppercase tracking-wider block">
              Adjectives
            </span>
            <div className="flex flex-wrap gap-1">
              {calculatedCollocations.adjectives.map((item) => (
                <button key={item} type="button" onClick={() => onSelectWord?.(item)} className={standardChipClass}>
                  {item}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {calculatedCollocations.prepositions?.length ? (
          <div className="space-y-1">
            <span className="text-content-muted font-semibold text-[10.5px] uppercase tracking-wider block">
              Prepositions
            </span>
            <div className="flex flex-wrap gap-1">
              {calculatedCollocations.prepositions.map((item) => (
                <button key={item} type="button" onClick={() => onSelectWord?.(item)} className={standardChipClass}>
                  {item}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default CollocationsCard;
