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
    <section className="p-4 rounded-2xl border border-border/80 bg-surface space-y-3 font-sans shadow-xs">
      <div className="flex items-center gap-2 text-[12px] font-bold text-content-muted uppercase tracking-wider font-mono">
        <IconLink className="w-3.5 h-3.5 text-accent" />
        <span>Collocations</span>
      </div>

      <div className="space-y-2.5">
        {groups.map((group) => (
          <div key={group.key} className="grid grid-cols-[100px_minmax(0,1fr)] gap-2.5 items-start">
            <span className="text-[12px] font-bold uppercase tracking-wider text-content-secondary pt-0.5 font-mono">
              {group.label}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {group.items.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => onSelectWord?.(item)}
                  title={word ? `Look up “${item}”` : `Look up ${item}`}
                  className="h-6 px-2.5 rounded-lg bg-accent/10 hover:bg-accent/20 border border-accent/25 text-accent text-[12.5px] font-semibold whitespace-nowrap cursor-pointer transition-all hover:scale-[1.02] active:scale-95"
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
