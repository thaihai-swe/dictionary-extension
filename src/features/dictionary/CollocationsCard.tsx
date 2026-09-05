import React, { useMemo } from 'react';
import { Collocations } from '@/types';
import { IconLink } from '@/components/icons';

interface CollocationsCardProps {
  word?: string;
  collocations?: Collocations;
  onSelectWord?: (word: string) => void;
}

const GROUPS: Array<{ key: keyof Collocations; label: string }> = [
  { key: 'verbs', label: 'Verbs' },
  { key: 'adjectives', label: 'Adjectives' },
  { key: 'nouns', label: 'Nouns' },
  { key: 'prepositions', label: 'Prepositions' },
  { key: 'patterns', label: 'Patterns' },
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
    <section className="p-3.5 rounded-lg border border-border bg-teal-50/40 dark:bg-gold-300/5 space-y-2.5 font-sans">
      <div className="flex items-center gap-1.5 text-[11px] font-bold text-content-muted uppercase tracking-wider">
        <IconLink className="w-3.5 h-3.5 text-teal-600 dark:text-gold-200" />
        <span>Collocations</span>
      </div>

      <div className="space-y-2">
        {groups.map((group) => (
          <div key={group.key} className="grid grid-cols-[118px_minmax(0,1fr)] gap-2 items-start">
            <span className="text-[11.5px] font-bold text-content-secondary pt-0.5">
              {group.label}:
            </span>
            <div className="flex flex-wrap gap-1">
              {group.items.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => onSelectWord?.(item)}
                  title={word ? `Look up “${item}”` : `Look up ${item}`}
                  className="h-[22px] px-2 rounded-full bg-teal-500/10 hover:bg-teal-500/18 border border-teal-500/25 text-teal-800 dark:text-gold-100 dark:bg-gold-300/10 dark:border-gold-300/25 dark:hover:bg-gold-300/18 text-[11.5px] font-semibold whitespace-nowrap cursor-pointer transition-colors"
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default CollocationsCard;
