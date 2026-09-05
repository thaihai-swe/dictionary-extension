import React from 'react';
import { AppSettings } from '@/types';
import { cx } from '@/ui/cx';
import { IconMonitor, IconMoon, IconSun } from '@/components/icons';

interface TabAppearanceProps {
  localSettings: AppSettings;
  onChange: (patch: Partial<AppSettings>) => void;
}

export const TabAppearance: React.FC<TabAppearanceProps> = ({ localSettings, onChange }) => {
  return (
    <div className="space-y-6 font-sans text-xs">
      <section className="bg-surface border border-border rounded-xl p-5 space-y-3 shadow-xs">
        <div>
          <h3 className="text-sm font-bold text-content font-heading">Interface Theme</h3>
          <p className="text-[11.5px] text-content-muted">
            Light, dark, or follow the operating system. Preview applies immediately.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2.5 pt-1">
          {(['dark', 'light', 'system'] as const).map((mode) => {
            const isSelected = localSettings.theme === mode;
            return (
              <label
                key={mode}
                className={cx(
                  'p-3 rounded-xl border text-center cursor-pointer transition-all font-semibold flex items-center justify-center gap-2 shadow-2xs',
                  isSelected
                    ? 'chip-active font-bold ring-1 ring-accent/30'
                    : 'bg-muted/40 border-border text-content-secondary hover:border-accent/40',
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
                  <IconMonitor className="w-4 h-4 text-content-secondary" />
                )}
                <span className="capitalize">{mode}</span>
              </label>
            );
          })}
        </div>
      </section>

      <section className="bg-surface border border-border rounded-xl p-5 space-y-3 shadow-xs">
        <div>
          <h3 className="text-sm font-bold text-content font-heading">Typography</h3>
          <p className="text-[11.5px] text-content-muted">
            Font used for definitions, examples, and AI responses in the popup.
          </p>
        </div>
        <select
          value={localSettings.fontFamily || 'learner'}
          onChange={(e) => onChange({ fontFamily: e.target.value as AppSettings['fontFamily'] })}
          className="w-full bg-muted border border-border text-content text-xs font-medium rounded-xl px-3 py-2.5 outline-none focus:border-accent cursor-pointer shadow-xs"
        >
          <option value="learner" className="bg-surface text-content">
            Modern Academic (Plus Jakarta Sans)
          </option>
          <option value="editorial" className="bg-surface text-content">
            Classic Editorial (Newsreader)
          </option>
        </select>
      </section>

      <section className="bg-surface border border-border rounded-xl p-5 space-y-3 shadow-xs">
        <div>
          <h3 className="text-sm font-bold text-content font-heading">Lookup Card Content</h3>
          <p className="text-[11.5px] text-content-muted">
            Extra lexical cards sit behind “More lexical detail” on word results.
          </p>
        </div>
        <label className="flex items-center justify-between cursor-pointer py-1.5 hover:bg-muted/30 px-1 rounded-lg transition-colors">
          <div className="pr-4">
            <span className="font-semibold text-content text-xs block">
              Structured Lexical Profile
            </span>
            <span className="text-[11px] text-content-muted block">
              Word family, collocations, usage notes, formation, and learner mistakes
            </span>
          </div>
          <input
            type="checkbox"
            checked={localSettings.enableLexicalProfile !== false}
            onChange={(e) => onChange({ enableLexicalProfile: e.target.checked })}
            className="w-4 h-4 cursor-pointer"
          />
        </label>
      </section>

      <section className="bg-surface border border-border rounded-xl p-5 space-y-3 shadow-xs">
        <div>
          <h3 className="text-sm font-bold text-content font-heading">Default Popup Size</h3>
          <p className="text-[11.5px] text-content-muted">
            Starting dimensions for the in-page overlay. You can still resize it on the page.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="font-bold text-content-secondary block text-[11px] uppercase tracking-wider">
              Width (px)
            </label>
            <input
              type="number"
              value={localSettings.popupWidth ?? 480}
              min={360}
              max={1000}
              onChange={(e) => onChange({ popupWidth: Number(e.target.value) || 480 })}
              className="w-full bg-muted border border-border rounded-xl px-3 py-2 text-xs text-content outline-none focus:border-accent font-mono shadow-xs"
            />
          </div>
          <div className="space-y-1.5">
            <label className="font-bold text-content-secondary block text-[11px] uppercase tracking-wider">
              Height (px)
            </label>
            <input
              type="number"
              value={localSettings.popupHeight ?? 580}
              min={380}
              max={900}
              onChange={(e) => onChange({ popupHeight: Number(e.target.value) || 580 })}
              className="w-full bg-muted border border-border rounded-xl px-3 py-2 text-xs text-content outline-none focus:border-accent font-mono shadow-xs"
            />
          </div>
        </div>
      </section>
    </div>
  );
};

export default TabAppearance;
