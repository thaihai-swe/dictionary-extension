import React from 'react';
import { DEMO_PRESETS, DemoPreset } from '../shared/presets';
import { IconSparkles } from './icons';

interface PresetChipsProps {
  onSelect: (preset: DemoPreset) => void;
}

export const PresetChips: React.FC<PresetChipsProps> = ({ onSelect }) => {
  return (
    <div className="rounded-2xl border border-border/80 bg-surface/90 backdrop-blur-sm p-4 space-y-3 shadow-xs">
      <div className="flex items-center gap-2 text-content-muted">
        <IconSparkles className="w-4 h-4 text-accent" />
        <span className="text-[11px] font-bold uppercase tracking-wider">
          Explore Examples &amp; Nuances
        </span>
      </div>

      <div className="flex flex-wrap gap-2 min-w-0">
        {DEMO_PRESETS.map((preset) => (
          <button
            key={preset.query}
            type="button"
            onClick={() => onSelect(preset)}
            className="group inline-flex items-center gap-2 min-w-0 max-w-full min-h-8 px-2.5 sm:px-3 py-1.5 rounded-xl border border-border/80 bg-muted/40 hover:bg-accent-subtle hover:border-accent/40 text-content-secondary hover:text-content transition-all duration-150 cursor-pointer text-left shadow-2xs hover:scale-[1.02] active:scale-[0.98]"
          >
            <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold font-mono uppercase tracking-wider text-accent bg-accent-subtle border border-accent/20 group-hover:bg-accent group-hover:text-accent-foreground transition-colors">
              {preset.tag}
            </span>
            <span className="text-[12.5px] font-semibold text-content group-hover:text-accent transition-colors truncate">
              {preset.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default PresetChips;
