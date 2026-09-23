import React from 'react';
import { AppSettings } from '@/types';
import { cx } from '@/ui/cx';
import { IconMonitor, IconMoon, IconSun } from '@/components/icons';

interface TabAppearanceProps {
  localSettings: AppSettings;
  onChange: (patch: Partial<AppSettings>) => void;
  onClearCache?: () => void;
}

export const TabAppearance: React.FC<TabAppearanceProps> = ({ localSettings, onChange, onClearCache }) => {
  return (
    <div className="space-y-6 font-sans text-xs">
      <section className="bg-surface border border-border rounded-xl p-5 space-y-3 shadow-xs">
        <div>
          <h3 className="text-sm font-bold text-content font-heading">Interface Theme</h3>
          <p className="text-[13.5px] text-content-muted">
            Light, dark, or follow the operating system. Preview applies immediately.
          </p>
        </div>
        <div className="grid grid-cols-1 min-[420px]:grid-cols-3 gap-2.5 pt-1">
          {(['dark', 'light', 'system'] as const).map((mode) => {
            const isSelected = localSettings.theme === mode;
            return (
              <label
                key={mode}
                data-selected={isSelected}
                className="theme-choice shadow-2xs"
              >
                <input
                  type="radio"
                  name="theme"
                  value={mode}
                  checked={isSelected}
                  onChange={() => onChange({ theme: mode })}
                  className="sr-only"
                />
                <span aria-hidden="true" className={cx('theme-preview', `theme-preview-${mode}`)} />
                <span className="flex items-center justify-center gap-1.5">
                  {mode === 'dark' ? (
                    <IconMoon aria-hidden="true" className="w-4 h-4" />
                  ) : mode === 'light' ? (
                    <IconSun aria-hidden="true" className="w-4 h-4" />
                  ) : (
                    <IconMonitor aria-hidden="true" className="w-4 h-4" />
                  )}
                  <span className="capitalize font-semibold">{mode}</span>
                </span>
              </label>
            );
          })}
        </div>
      </section>

      <section className="bg-surface border border-border rounded-xl p-5 space-y-3 shadow-xs">
        <div>
          <h3 className="text-sm font-bold text-content font-heading">Text size</h3>
          <p className="text-[13.5px] text-content-muted">
            Adjusts readable content in the popup, dictionary definitions, AI responses, and this settings page.
          </p>
        </div>
        <label className="space-y-1.5 block">
          <span className="font-bold text-content-secondary block text-[13px] uppercase tracking-wider">
            Reading scale
          </span>
          <select
            value={localSettings.textSize}
            onChange={(event) => onChange({ textSize: event.target.value as AppSettings['textSize'] })}
            className="w-full bg-muted border border-border text-content text-sm font-medium rounded-xl px-3 py-2.5 outline-none focus:border-accent cursor-pointer shadow-xs"
          >
            <option value="small">Small — 16px UI / 17px reading</option>
            <option value="comfortable">Comfortable — 17px UI / 18px reading</option>
            <option value="large">Large — 18px UI / 20px reading</option>
          </select>
        </label>
      </section>

      <section className="bg-surface border border-border rounded-xl p-5 space-y-3 shadow-xs">
        <div>
          <h3 className="text-sm font-bold text-content font-heading">Privacy &amp; Local Cache</h3>
          <p className="text-[13.5px] text-content-muted">
            Cached dictionary and AI results stay on this device for faster repeat lookups.
          </p>
        </div>
        <label className="flex items-center justify-between cursor-pointer py-1.5 hover:bg-muted/30 px-1 rounded-lg transition-colors">
          <div className="pr-4">
            <span className="font-semibold text-content text-xs block">Persist lookup cache</span>
            <span className="text-[13px] text-content-muted block">
              Disable for memory-only mode; use Data &amp; Backup to clear existing cached results.
            </span>
          </div>
          <input
            type="checkbox"
            checked={localSettings.persistLookupCache !== false}
            onChange={(e) => onChange({ persistLookupCache: e.target.checked })}
            className="w-4 h-4 cursor-pointer"
          />
        </label>
        {onClearCache ? (
          <button
            type="button"
            onClick={onClearCache}
            className="w-full sm:w-auto px-3 py-2 rounded-lg border border-border bg-muted/50 text-content-secondary hover:text-content hover:bg-elevated text-[13px] font-semibold transition-colors cursor-pointer"
          >
            Clear cached lookup results
          </button>
        ) : null}
      </section>

      <section className="bg-surface border border-border rounded-xl p-5 space-y-3 shadow-xs">
        <div>
          <h3 className="text-sm font-bold text-content font-heading">Lookup Card Content</h3>
          <p className="text-[13.5px] text-content-muted">
            Extra lexical cards sit behind “More lexical detail” on word results.
          </p>
        </div>
        <label className="flex items-center justify-between cursor-pointer py-1.5 hover:bg-muted/30 px-1 rounded-lg transition-colors">
          <div className="pr-4">
            <span className="font-semibold text-content text-xs block">
              Structured Lexical Profile
            </span>
            <span className="text-[13px] text-content-muted block">
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
          <p className="text-[13.5px] text-content-muted">
            Starting dimensions for the in-page overlay. You can still resize it on the page.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="font-bold text-content-secondary block text-[13px] uppercase tracking-wider">
              Width (px)
            </label>
            <input
              type="number"
              value={localSettings.popupWidth ?? 1000}
              min={360}
              max={1000}
              onChange={(e) => onChange({ popupWidth: Number(e.target.value) || 1000 })}
              className="w-full bg-muted border border-border rounded-xl px-3 py-2 text-xs text-content outline-none focus:border-accent font-mono shadow-xs"
            />
          </div>
          <div className="space-y-1.5">
            <label className="font-bold text-content-secondary block text-[13px] uppercase tracking-wider">
              Height (px)
            </label>
            <input
              type="number"
              value={localSettings.popupHeight ?? 900}
              min={380}
              max={900}
              onChange={(e) => onChange({ popupHeight: Number(e.target.value) || 900 })}
              className="w-full bg-muted border border-border rounded-xl px-3 py-2 text-xs text-content outline-none focus:border-accent font-mono shadow-xs"
            />
          </div>
        </div>
      </section>
    </div>
  );
};

export default TabAppearance;
