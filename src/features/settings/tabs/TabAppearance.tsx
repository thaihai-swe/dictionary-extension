import React from 'react';
import { AppSettings } from '@/types';
import { cx } from '@/ui/cx';
import { IconMoon, IconSun } from '@/components/icons';

interface TabAppearanceProps {
  localSettings: AppSettings;
  onChange: (patch: Partial<AppSettings>) => void;
}

export const TabAppearance: React.FC<TabAppearanceProps> = ({ localSettings, onChange }) => {
  return (
    <div className="space-y-4 font-sans text-xs">
      {/* Theme selection */}
      <div className="space-y-2">
        <label className="font-bold text-content-secondary block uppercase tracking-wider text-[11px]">
          Interface Theme
        </label>
        <div className="grid grid-cols-3 gap-2.5">
          {(['dark', 'light', 'system'] as const).map((mode) => {
            const isSelected = localSettings.theme === mode;
            return (
              <label
                key={mode}
                className={cx(
                  'p-3 rounded-xl border text-center cursor-pointer transition-all font-semibold flex items-center justify-center gap-2 shadow-xs',
                  isSelected
                    ? 'bg-teal-500/15 border-teal-500/50 text-teal-600 dark:text-gold-200 dark:bg-gold-300/15 dark:border-gold-300/50 font-bold'
                    : 'bg-muted border-border text-content-secondary hover:border-teal-500/40 dark:hover:border-gold-300/40',
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
                {mode === 'dark' ? (
                  <IconMoon className="w-4 h-4 text-amber-400" />
                ) : mode === 'light' ? (
                  <IconSun className="w-4 h-4 text-amber-500" />
                ) : (
                  <span className="text-sm">💻</span>
                )}
                <span className="capitalize">{mode}</span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Font selection */}
      <div className="space-y-2 pt-3 border-t border-border/60">
        <label className="font-bold text-content-secondary block uppercase tracking-wider text-[11px]">
          Display Typography Style
        </label>
        <select
          value={localSettings.fontFamily || 'learner'}
          onChange={(e) => onChange({ fontFamily: e.target.value as AppSettings['fontFamily'] })}
          className="w-full bg-muted border border-border text-content text-xs font-medium rounded-xl px-3 py-2.5 outline-none focus:border-teal-500 dark:focus:border-gold-300 cursor-pointer shadow-xs"
        >
          <option value="learner" className="bg-surface text-content">Modern Academic Font (Plus Jakarta Sans / Clean Sans-Serif)</option>
          <option value="editorial" className="bg-surface text-content">Classic Editorial Font (Newsreader / Elegant Serif)</option>
        </select>
      </div>

      {/* Lexical Profile Cards */}
      <div className="space-y-2 pt-3 border-t border-border/60">
        <label className="flex items-center justify-between cursor-pointer p-2 rounded-xl hover:bg-muted transition-colors">
          <div>
            <span className="font-bold text-content block text-xs">
              Structured Lexical Profile Cards (CEFR, Collocations, Mistakes)
            </span>
            <span className="text-[11px] text-content-muted block">
              Enriches dictionary results with vocabulary levels, grammar quirks, and morphology breakdown
            </span>
          </div>
          <input
            type="checkbox"
            checked={localSettings.enableLexicalProfile !== false}
            onChange={(e) => onChange({ enableLexicalProfile: e.target.checked })}
            className="accent-teal-500 dark:accent-gold-400 w-4 h-4 cursor-pointer"
          />
        </label>
      </div>

      {/* Popup Dimensions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-border/60">
        <div className="space-y-1.5">
          <label className="font-bold text-content-secondary block text-[11px] uppercase tracking-wider">
            Default Popup Width (px)
          </label>
          <input
            type="number"
            value={localSettings.popupWidth ?? 480}
            min={360}
            max={1000}
            onChange={(e) => onChange({ popupWidth: Number(e.target.value) || 480 })}
            className="w-full bg-muted border border-border rounded-xl px-3 py-2 text-xs text-content outline-none focus:border-teal-500 dark:focus:border-gold-300 font-mono shadow-xs"
          />
        </div>

        <div className="space-y-1.5">
          <label className="font-bold text-content-secondary block text-[11px] uppercase tracking-wider">
            Default Popup Height (px)
          </label>
          <input
            type="number"
            value={localSettings.popupHeight ?? 580}
            min={380}
            max={900}
            onChange={(e) => onChange({ popupHeight: Number(e.target.value) || 580 })}
            className="w-full bg-muted border border-border rounded-xl px-3 py-2 text-xs text-content outline-none focus:border-teal-500 dark:focus:border-gold-300 font-mono shadow-xs"
          />
        </div>
      </div>
    </div>
  );
};

export default TabAppearance;
