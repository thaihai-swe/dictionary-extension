import React from 'react';
import { AppSettings } from '../../types';
import { cx } from '../../ui/cx';

interface TabAppearanceProps {
  localSettings: AppSettings;
  onChange: (patch: Partial<AppSettings>) => void;
}

export const TabAppearance: React.FC<TabAppearanceProps> = ({ localSettings, onChange }) => {
  return (
    <div className="space-y-3.5">
      <div className="space-y-2">
        <label className="font-bold text-slate-200 block">🎨 Theme Mode:</label>
        <div className="grid grid-cols-3 gap-2">
          {(['dark', 'light', 'system'] as const).map((mode) => {
            const isSelected = localSettings.theme === mode;
            const label = mode === 'dark' ? '🌙 Dark' : mode === 'light' ? '☀️ Light' : '💻 System';
            return (
              <label
                key={mode}
                className={cx(
                  'p-2.5 rounded-xl border text-center cursor-pointer transition-all font-bold',
                  isSelected
                    ? 'bg-teal-500/10 border-teal-500/50 text-teal-300'
                    : 'bg-dark-muted border-dark-border text-slate-300',
                )}
              >
                <input
                  type="radio"
                  name="theme"
                  value={mode}
                  checked={isSelected}
                  onChange={() => onChange({ theme: mode })}
                  className="hidden"
                />
                <span>{label}</span>
              </label>
            );
          })}
        </div>
      </div>

      <div className="space-y-2 pt-2 border-t border-dark-border/60">
        <label className="font-bold text-slate-200 block">🔤 Display Font Family:</label>
        <select
          value={localSettings.fontFamily || 'learner'}
          onChange={(e) => onChange({ fontFamily: e.target.value as AppSettings['fontFamily'] })}
          className="w-full bg-dark-muted border border-dark-border text-slate-200 text-sm font-medium rounded-xl px-3 py-2 outline-none focus:border-teal-500 cursor-pointer"
        >
          <option value="learner">Modern Academic Font (Plus Jakarta Sans / Sans-Serif)</option>
          <option value="editorial">Classic Editorial Font (Newsreader / Serif)</option>
        </select>
      </div>

      <div className="space-y-2 pt-2 border-t border-dark-border/60">
        <label className="flex items-center justify-between cursor-pointer">
          <span className="font-bold text-slate-200">
            📊 Enable Structured Lexical Profile Cards (CEFR, Collocations):
          </span>
          <input
            type="checkbox"
            checked={localSettings.enableLexicalProfile !== false}
            onChange={(e) => onChange({ enableLexicalProfile: e.target.checked })}
            className="accent-teal-500 w-4 h-4 cursor-pointer"
          />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-dark-border/60">
        <div className="space-y-1">
          <label className="font-bold text-slate-200 block">📐 Popup Width (px):</label>
          <input
            type="number"
            value={localSettings.popupWidth ?? 480}
            min={360}
            max={1000}
            onChange={(e) => onChange({ popupWidth: Number(e.target.value) || 480 })}
            className="w-full bg-dark-muted border border-dark-border rounded-xl px-3 py-2 text-sm text-slate-100 outline-none focus:border-teal-500 font-mono"
          />
        </div>

        <div className="space-y-1">
          <label className="font-bold text-slate-200 block">📐 Popup Height (px):</label>
          <input
            type="number"
            value={localSettings.popupHeight ?? 580}
            min={380}
            max={900}
            onChange={(e) => onChange({ popupHeight: Number(e.target.value) || 580 })}
            className="w-full bg-dark-muted border border-dark-border rounded-xl px-3 py-2 text-sm text-slate-100 outline-none focus:border-teal-500 font-mono"
          />
        </div>
      </div>
    </div>
  );
};

export default TabAppearance;
