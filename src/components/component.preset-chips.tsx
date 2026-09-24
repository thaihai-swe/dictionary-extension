import React from 'react';
import { DEMO_PRESETS, DemoPreset } from '../shared/presets';
import { IconSparkles } from './icons';

interface PresetChipsProps {
  onSelect: (preset: DemoPreset) => void;
}

export const PresetChips: React.FC<PresetChipsProps> = ({ onSelect }) => {
  return (
    <div className="discovery-card">
      <div className="flex items-center gap-2 text-content-muted">
        <IconSparkles className="w-4 h-4 text-accent" />
        <span className="text-[12px] font-bold uppercase tracking-wider">
          Explore Examples &amp; Nuances
        </span>
      </div>

      <div className="discovery-examples">
        {DEMO_PRESETS.map((preset) => (
          <button
            key={preset.query}
            type="button"
            onClick={() => onSelect(preset)}
            className="discovery-example group"
          >
            <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold font-mono uppercase tracking-wider text-accent bg-accent-subtle border border-accent/20 group-hover:bg-accent group-hover:text-accent-foreground transition-colors">
              {preset.tag}
            </span>
            <span className="text-[13.5px] font-semibold text-content group-hover:text-accent transition-colors truncate">
              {preset.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default PresetChips;
