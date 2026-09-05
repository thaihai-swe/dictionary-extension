import React from 'react';
import { DEMO_PRESETS, DemoPreset } from '../shared/presets';

interface PresetChipsProps {
  onSelect: (preset: DemoPreset) => void;
}

export const PresetChips: React.FC<PresetChipsProps> = ({ onSelect }) => {
  return (
    <div className="rounded-xl border border-border bg-surface p-3 space-y-2">
      <p className="text-[11px] font-bold uppercase tracking-wider text-content-muted">
        Try an example
      </p>
      <div className="flex flex-wrap gap-1.5">
        {DEMO_PRESETS.map((preset) => (
          <button
            key={preset.query}
            type="button"
            onClick={() => onSelect(preset)}
            className="inline-flex items-center gap-1.5 min-h-8 px-2.5 rounded-full border border-border bg-muted/40 hover:bg-teal-500/10 hover:border-teal-500/40 dark:hover:bg-gold-300/10 dark:hover:border-gold-300/40 text-content-secondary hover:text-content transition-colors cursor-pointer"
          >
            <span className="px-1.5 py-px rounded text-[9.5px] font-bold uppercase tracking-wider text-content-muted border border-border bg-surface">
              {preset.tag}
            </span>
            <strong className="text-[12px] font-semibold font-mono">{preset.label}</strong>
          </button>
        ))}
      </div>
    </div>
  );
};

export default PresetChips;
