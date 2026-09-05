import React from 'react';
import { AppSettings } from '@/types';
import { cx } from '@/ui/cx';
import { IconBook, IconSearch, IconSparkles } from '@/components/icons';

interface TabGeneralProps {
  localSettings: AppSettings;
  pausedSitesInput: string;
  onChange: (patch: Partial<AppSettings>) => void;
  onPausedSitesChange: (val: string) => void;
}

export const TabGeneral: React.FC<TabGeneralProps> = ({
  localSettings,
  pausedSitesInput,
  onChange,
  onPausedSitesChange,
}) => {
  return (
    <div className="space-y-6 font-sans text-xs">
      {/* Selection Trigger Mode */}
      <section className="bg-surface border border-border rounded-xl p-5 space-y-3 shadow-xs">
        <div>
          <h3 className="text-sm font-bold text-content font-heading">
            Text Selection Trigger
          </h3>
          <p className="text-[11.5px] text-content-muted">
            Choose what happens when you highlight text on any web page.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <label
            className={cx(
              'p-3.5 rounded-xl border cursor-pointer transition-all flex items-start gap-3 shadow-2xs',
              localSettings.selectionTriggerMode === 'icon'
                ? 'bg-accent-subtle border-accent/60 text-accent font-bold ring-1 ring-accent/30'
                : 'bg-muted/40 border-border text-content-secondary hover:border-accent/40 hover:bg-muted/70',
            )}
          >
            <input
              type="radio"
              name="selectionTriggerMode"
              value="icon"
              checked={localSettings.selectionTriggerMode === 'icon'}
              onChange={() => onChange({ selectionTriggerMode: 'icon' })}
              className="hidden"
            />
            <div className="w-8 h-8 rounded-lg bg-surface border border-border flex items-center justify-center text-accent shrink-0 mt-0.5 shadow-2xs">
              <IconSearch className="w-4 h-4" />
            </div>
            <div className="space-y-0.5">
              <div className="font-semibold text-xs text-content">Floating Action Icon</div>
              <div className="text-[11.5px] text-content-muted font-normal leading-relaxed">
                Displays a discreet lookup button near your selection. Clicking it opens the card.
              </div>
            </div>
          </label>

          <label
            className={cx(
              'p-3.5 rounded-xl border cursor-pointer transition-all flex items-start gap-3 shadow-2xs',
              localSettings.selectionTriggerMode === 'direct'
                ? 'bg-accent-subtle border-accent/60 text-accent font-bold ring-1 ring-accent/30'
                : 'bg-muted/40 border-border text-content-secondary hover:border-accent/40 hover:bg-muted/70',
            )}
          >
            <input
              type="radio"
              name="selectionTriggerMode"
              value="direct"
              checked={localSettings.selectionTriggerMode === 'direct'}
              onChange={() => onChange({ selectionTriggerMode: 'direct' })}
              className="hidden"
            />
            <div className="w-8 h-8 rounded-lg bg-surface border border-border flex items-center justify-center text-accent shrink-0 mt-0.5 shadow-2xs">
              <IconSparkles className="w-4 h-4" />
            </div>
            <div className="space-y-0.5">
              <div className="font-semibold text-xs text-content">Instant Floating Card</div>
              <div className="text-[11.5px] text-content-muted font-normal leading-relaxed">
                Immediately pops up definitions as soon as you finish selecting text.
              </div>
            </div>
          </label>
        </div>
      </section>

      {/* Shortcuts & Start Tab */}
      <section className="bg-surface border border-border rounded-xl p-5 space-y-4 shadow-xs">
        <div>
          <h3 className="text-sm font-bold text-content font-heading">
            Shortcuts & Default View
          </h3>
          <p className="text-[11.5px] text-content-muted">
            Configure key combos and the initial tab displayed on new lookups.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          <div className="space-y-1.5">
            <label className="font-bold text-content-secondary block text-[11px] uppercase tracking-wider">
              Quick Selection Modifier
            </label>
            <select
              value={localSettings.postSelectionModifier || 'shift'}
              onChange={(e) =>
                onChange({
                  postSelectionModifier: e.target.value as AppSettings['postSelectionModifier'],
                })
              }
              className="w-full bg-muted border border-border text-content text-xs font-medium rounded-xl px-3 py-2.5 outline-none focus:border-accent cursor-pointer shadow-xs"
            >
              <option value="shift">Hold Shift + Press Q (Shift+Q)</option>
              <option value="alt">Hold Alt + Press Q (Alt+Q)</option>
              <option value="ctrl">Hold Ctrl + Press Q (Ctrl+Q)</option>
            </select>
            <p className="text-[11px] text-content-muted">Triggers immediate lookup for any highlighted text.</p>
          </div>

          <div className="space-y-1.5">
            <label className="font-bold text-content-secondary block text-[11px] uppercase tracking-wider">
              Default Start Tab
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label
                className={cx(
                  'p-2 rounded-xl border cursor-pointer transition-all text-center font-bold flex items-center justify-center gap-1.5 shadow-2xs text-xs',
                  localSettings.defaultTab === 'dictionary'
                    ? 'chip-active font-extrabold'
                    : 'bg-muted/40 border-border text-content-secondary hover:border-accent/40',
                )}
              >
                <input
                  type="radio"
                  name="defaultTab"
                  value="dictionary"
                  checked={localSettings.defaultTab === 'dictionary'}
                  onChange={() => onChange({ defaultTab: 'dictionary' })}
                  className="hidden"
                />
                <IconBook className="w-3.5 h-3.5" />
                <span>Dictionary</span>
              </label>

              <label
                className={cx(
                  'p-2 rounded-xl border cursor-pointer transition-all text-center font-bold flex items-center justify-center gap-1.5 shadow-2xs text-xs',
                  localSettings.defaultTab === 'ai_assistant'
                    ? 'chip-active font-extrabold'
                    : 'bg-muted/40 border-border text-content-secondary hover:border-accent/40',
                )}
              >
                <input
                  type="radio"
                  name="defaultTab"
                  value="ai_assistant"
                  checked={localSettings.defaultTab === 'ai_assistant'}
                  onChange={() => onChange({ defaultTab: 'ai_assistant' })}
                  className="hidden"
                />
                <IconSparkles className="w-3.5 h-3.5" />
                <span>AI Assistant</span>
              </label>
            </div>
            <p className="text-[11px] text-content-muted">Which tab opens first when popup appears.</p>
          </div>
        </div>
      </section>

      {/* Browser Integration */}
      <section className="bg-surface border border-border rounded-xl p-5 space-y-3 shadow-xs">
        <div>
          <h3 className="text-sm font-bold text-content font-heading">
            Browser & Context Integration
          </h3>
          <p className="text-[11.5px] text-content-muted">
            Fine-tune how the extension interacts with page menus and neighboring sentences.
          </p>
        </div>

        <div className="space-y-2 divide-y divide-border/40">
          <label className="flex items-center justify-between cursor-pointer py-2.5 hover:bg-muted/30 px-1 rounded-lg transition-colors">
            <div className="pr-4">
              <span className="font-semibold text-content text-xs block">
                Right-Click Context Menu Entry
              </span>
              <span className="text-[11px] text-content-muted block">
                Adds "Lookup in Dictionary" to Chrome’s native context menu
              </span>
            </div>
            <input
              type="checkbox"
              checked={Boolean(localSettings.enableContextMenuTrigger)}
              onChange={(e) => onChange({ enableContextMenuTrigger: e.target.checked })}
              className="w-4 h-4 cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer py-2.5 hover:bg-muted/30 px-1 rounded-lg transition-colors">
            <div className="pr-4">
              <span className="font-semibold text-content text-xs block">
                Disable Surrounding Sentence Extraction
              </span>
              <span className="text-[11px] text-content-muted block">
                Only look up the exact selected word without capturing neighboring context
              </span>
            </div>
            <input
              type="checkbox"
              checked={Boolean(localSettings.disablePageContextExtraction)}
              onChange={(e) => onChange({ disablePageContextExtraction: e.target.checked })}
              className="w-4 h-4 cursor-pointer"
            />
          </label>
        </div>
      </section>

      {/* Excluded Domains */}
      <section className="bg-surface border border-border rounded-xl p-5 space-y-3 shadow-xs">
        <div>
          <h3 className="text-sm font-bold text-content font-heading">
            Paused Web Hostnames
          </h3>
          <p className="text-[11.5px] text-content-muted">
            The floating lookup trigger will not appear on these websites (one hostname per line).
          </p>
        </div>

        <textarea
          value={pausedSitesInput}
          onChange={(e) => onPausedSitesChange(e.target.value)}
          rows={3}
          placeholder={'example.com\ndocs.google.com\nmail.google.com'}
          className="w-full bg-muted border border-border rounded-xl p-3 text-xs text-content placeholder:text-content-muted outline-none focus:border-accent font-mono shadow-xs resize-y"
        />
      </section>
    </div>
  );
};

export default TabGeneral;
