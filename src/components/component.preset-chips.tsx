import React from 'react';
import { DEMO_PRESETS, DemoPreset } from '../shared/presets';
import { IconSparkles } from './icons';

interface PresetChipsProps {
  onSelect: (preset: DemoPreset) => void;
}

export const PresetChips: React.FC<PresetChipsProps> = ({ onSelect }) => {
  return (
    <div className="discovery-card">
      {/* Section label */}
      <div className="flex items-center gap-2">
        <span
          className="flex items-center justify-center w-6 h-6 rounded-lg shrink-0"
          style={{
            background: 'var(--color-primary-light)',
            border: '1px solid var(--hairline-accent)',
          }}
          aria-hidden="true"
        >
          <IconSparkles className="w-3.5 h-3.5 text-accent" />
        </span>
        <span className="text-[11.5px] font-bold uppercase tracking-widest text-content-muted">
          Explore Examples &amp; Nuances
        </span>
      </div>

      {/* Preset grid */}
      <div className="discovery-examples">
        {DEMO_PRESETS.map((preset) => (
          <button
            key={preset.query}
            type="button"
            onClick={() => onSelect(preset)}
            className="discovery-example group"
          >
            {/* Tag badge */}
            <span
              className="shrink-0 px-1.5 py-px rounded text-[9px] font-extrabold font-mono uppercase tracking-wider transition-colors"
              style={{
                background: 'var(--color-primary-light)',
                border: '1px solid var(--hairline-accent)',
                color: 'var(--color-primary)',
              }}
            >
              {preset.tag}
            </span>

            {/* Label */}
            <span className="text-[13.5px] font-semibold text-content group-hover:text-accent transition-colors truncate">
              {preset.label}
            </span>

            {/* Arrow hint */}
            <span
              className="ml-auto shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-accent text-[12px]"
              aria-hidden="true"
            >
              →
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default PresetChips;
