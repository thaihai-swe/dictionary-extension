import React, { useMemo } from 'react';
import { Collocations } from '../types';
import { IconLink } from './icons';

interface CollocationsCardProps {
  word?: string;
  collocations?: Collocations;
  onSelectWord?: (word: string) => void;
}

const GROUPS: Array<{ key: keyof Collocations; label: string }> = [
  { key: 'patterns', label: 'Patterns' },
  { key: 'verbs', label: 'Verbs' },
  { key: 'adjectives', label: 'Adjectives' },
  { key: 'nouns', label: 'Nouns' },
  { key: 'prepositions', label: 'Prepositions' },
];

export const CollocationsCard: React.FC<CollocationsCardProps> = ({
  word,
  collocations,
  onSelectWord,
}) => {
  const groups = useMemo(() => {
    return GROUPS.map((group) => ({
      ...group,
      items: (collocations?.[group.key] || []).filter(Boolean),
    })).filter((group) => group.items.length);
  }, [collocations]);

  if (!groups.length) return null;

  return (
    <section className="pt-3 border-t border-border space-y-2.5 font-sans">
      <div className="flex items-center gap-1.5 text-[11px] font-bold text-content-muted uppercase tracking-wider">
        <IconLink className="w-3.5 h-3.5 text-teal-600 dark:text-gold-200" />
        <span>Collocations</span>
      </div>

      <div className="space-y-2">
        {groups.map((group) => (
          <div key={group.key} className="flex items-baseline gap-x-3 gap-y-1">
            <span className="w-[92px] shrink-0 text-[11px] font-semibold text-content-muted">
              {group.label}
            </span>
            <p className="min-w-0 flex-1 text-[13.5px] leading-relaxed text-content">
              {group.items.map((item, index) => (
                <React.Fragment key={item}>
                  {index > 0 ? <span className="text-content-muted/50"> · </span> : null}
                  <button
                    type="button"
                    onClick={() => onSelectWord?.(item)}
                    title={word ? `Look up “${item}”` : `Look up ${item}`}
                    className="related-word-link"
                  >
                    {item}
                  </button>
                </React.Fragment>
              ))}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
};

export default CollocationsCard;
