import React from 'react';
import { isAudioPlayingRef, stopAllAudio } from '../composables/composable.dictionary';
import { openExtensionSettings } from '../shared/runtime-client';
import { AppSettings } from '../types';
import { cx } from '../ui/cx';
import { useSignal } from '../ui/signal';
import {
  IconBook,
  IconChevronDown,
  IconClose,
  IconKeyboard,
  IconMaximize,
  IconMinimize,
  IconMoon,
  IconMore,
  IconSettings,
  IconSun,
} from './icons';

interface AppHeaderProps {
  showShortcuts: boolean;
  isMaximized?: boolean;
  isDarkMode?: boolean;
  onToggleShortcuts?: () => void;
  onToggleMaximize?: () => void;
  onToggleTheme?: () => void;
  provider?: AppSettings['dictionaryProvider'];
  targetLanguage?: string;
  hasUnsavedSettings?: boolean;
  onClose?: () => void;
  onUpdateProvider?: (value: string) => void;
  onUpdateTargetLang?: (value: string) => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  showShortcuts,
  isMaximized,
  isDarkMode,
  onToggleShortcuts,
  onToggleMaximize,
  onToggleTheme,
  provider,
  targetLanguage,
  hasUnsavedSettings = false,
  onClose,
  onUpdateProvider,
  onUpdateTargetLang,
}) => {
  const isAudioPlaying = useSignal(isAudioPlayingRef);

  function handleProviderChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value;
    onUpdateProvider?.(val);
  }

  function handleTargetLangChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value;
    onUpdateTargetLang?.(val);
  }

  const providerSelect = (
    <div className="relative flex items-center min-w-0 w-full">
      <select
        value={provider || 'wiktionary'}
        onChange={handleProviderChange}
        aria-label="Select primary dictionary source"
        className="select-muted w-full text-[11.5px] font-medium"
        title="Select primary dictionary source"
      >
        <option value="wiktionary">Wiktionary</option>
        <option value="free_dictionary">FreeDict</option>
        <option value="datamuse">Datamuse</option>
        <option value="wikipedia">Wikipedia</option>
        <option value="urban_dictionary">UrbanDict</option>
        <option value="wiktionary_etymology">Etymology</option>
        <option value="wiktionary_bilingual">Bilingual</option>
        <option value="tatoeba">Tatoeba</option>
        <option value="google_translate">Translate</option>
      </select>
      <IconChevronDown className="w-3 h-3 text-content-muted pointer-events-none absolute right-2" />
    </div>
  );

  const langSelect = (
    <div className="relative flex items-center min-w-0 w-full">
      <select
        value={targetLanguage || 'Vietnamese'}
        onChange={handleTargetLangChange}
        aria-label="Select Translation Target Language"
        className="select-muted w-full text-[11.5px] font-medium"
        title="Select Translation Target Language"
      >
        <option value="Vietnamese">Vietnamese</option>
        <option value="English">English</option>
        <option value="Japanese">Japanese</option>
        <option value="Chinese">Chinese</option>
        <option value="Korean">Korean</option>
        <option value="French">French</option>
        <option value="Spanish">Spanish</option>
      </select>
      <IconChevronDown className="w-3 h-3 text-content-muted pointer-events-none absolute right-2" />
    </div>
  );

  return (
    <header className="flex items-center justify-between gap-2 px-3 py-2 bg-surface/95 backdrop-blur-md border-b border-border select-none relative z-30 transition-colors min-w-0">
      {/* Brand Identity */}
      <div className="flex items-center gap-2 min-w-0 shrink-0">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-accent/20 to-accent/5 border border-accent/30 flex items-center justify-center text-accent shadow-xs flex-shrink-0">
          <IconBook className="w-4 h-4 text-accent" />
        </div>
        <div className="flex items-baseline gap-1.5 hidden min-[400px]:flex">
          <span className="text-[13px] font-bold text-content tracking-tight font-heading">
            AI Dictionary Assistant
          </span>
          <span className="text-[10px] font-medium font-mono text-content-muted/80 uppercase px-1 py-0.2 rounded bg-muted/60 border border-border/50">
            NTH
          </span>
        </div>
      </div>

      {/* Header Actions & Controls */}
      <div className="flex items-center gap-1.5 justify-end min-w-0 flex-1">
        {hasUnsavedSettings ? (
          <button
            type="button"
            onClick={() => openExtensionSettings()}
            className="hidden min-[400px]:inline-flex items-center h-7 px-2 rounded-lg border border-amber-500/30 bg-amber-500/10 text-[10px] font-semibold text-amber-700 dark:text-amber-300 whitespace-nowrap cursor-pointer hover:bg-amber-500/20"
            title="These quick controls are not saved. Open Settings to save defaults."
          >
            <span className="hidden min-[520px]:inline">Not saved · </span>Settings
          </button>
        ) : null}

        {/* Desktop Quick Selectors */}
        <div className="hidden min-[520px]:flex items-center gap-1.5 min-w-0 max-w-[17rem]">
          <div className="min-w-0 flex-1 max-w-[8.5rem]">{providerSelect}</div>
          <div className="min-w-0 flex-1 max-w-[8rem]">{langSelect}</div>
        </div>

        {/* Real-time Audio Playing Pill with Equalizer Bars */}
        {isAudioPlaying ? (
          <button
            type="button"
            onClick={() => stopAllAudio()}
            className="h-7 px-2.5 rounded-full border text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/30 whitespace-nowrap shadow-xs active:scale-95"
            title="Cancel voice playback (Esc)"
            aria-label="Cancel voice playback"
            aria-pressed="true"
          >
            <span className="soundwave-bars text-rose-500">
              <span className="soundwave-bar" />
              <span className="soundwave-bar" />
              <span className="soundwave-bar" />
            </span>
            <span>Stop Audio</span>
          </button>
        ) : null}

        <div className="w-px h-4 bg-border/80 mx-0.5 shrink-0 hidden min-[360px]:block" />

        <div className="flex items-center gap-1 shrink-0">
          {/* Mobile Overflow Menu */}
          <details className="header-overflow min-[520px]:hidden">
            <summary className="btn-control-icon" title="Provider & Language settings" aria-label="Provider and language">
              <IconMore className="w-3.5 h-3.5 text-content-secondary" />
            </summary>
            <div className="header-overflow-panel">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-content-muted">Primary Source</label>
                {providerSelect}
              </div>
              {hasUnsavedSettings ? (
                <p role="status" className="text-[10px] text-amber-700 dark:text-amber-300">
                  Not saved. Open Extension Settings to save these defaults.
                </p>
              ) : null}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-content-muted">Target Language</label>
                {langSelect}
              </div>
              <div className="flex items-center gap-1.5 pt-1.5 border-t border-border">
                <button
                  type="button"
                  onClick={onToggleShortcuts}
                  className={cx('btn-control-icon flex-1', showShortcuts ? 'chip-active' : '')}
                  title="Keyboard Shortcuts (Shift+Q)"
                  aria-label="Keyboard Shortcuts"
                  aria-pressed={showShortcuts}
                >
                  <IconKeyboard className="w-3.5 h-3.5" />
                </button>
                {onToggleMaximize ? (
                  <button
                    type="button"
                    onClick={onToggleMaximize}
                    className="btn-control-icon flex-1"
                    title={isMaximized ? 'Restore View' : 'Maximize Window'}
                    aria-label={isMaximized ? 'Restore View' : 'Maximize Window'}
                  >
                    {isMaximized ? (
                      <IconMinimize className="w-3.5 h-3.5" />
                    ) : (
                      <IconMaximize className="w-3.5 h-3.5" />
                    )}
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => openExtensionSettings()}
                  className="btn-control-icon flex-1"
                  title="Extension Settings"
                  aria-label="Extension Settings"
                >
                  <IconSettings className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </details>

          {/* Keyboard Shortcuts Trigger Button */}
          <button
            type="button"
            onClick={onToggleShortcuts}
            className={cx(
              'btn-control-icon hidden min-[480px]:flex',
              showShortcuts ? 'chip-active text-accent' : '',
            )}
            title="Keyboard Shortcuts (? or Shift+Q)"
            aria-label="Keyboard Shortcuts"
            aria-pressed={showShortcuts}
          >
            <IconKeyboard className="w-3.5 h-3.5" />
          </button>

          {/* Theme Switcher Toggle */}
          <button
            type="button"
            onClick={onToggleTheme}
            className="btn-control-icon hover:text-accent"
            title={isDarkMode ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
            aria-label={isDarkMode ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
          >
            {isDarkMode ? (
              <IconMoon className="w-3.5 h-3.5 text-accent" />
            ) : (
              <IconSun className="w-3.5 h-3.5 text-accent" />
            )}
          </button>

          {/* Maximize Window Toggle */}
          {onToggleMaximize ? (
            <button
              type="button"
              onClick={onToggleMaximize}
              className="btn-control-icon hidden min-[480px]:flex"
              title={isMaximized ? 'Restore Default Window' : 'Maximize Window'}
              aria-label={isMaximized ? 'Restore Default Window' : 'Maximize Window'}
            >
              {isMaximized ? (
                <IconMinimize className="w-3.5 h-3.5" />
              ) : (
                <IconMaximize className="w-3.5 h-3.5" />
              )}
            </button>
          ) : null}

          {/* Preferences Settings Gear */}
          <button
            type="button"
            onClick={() => openExtensionSettings()}
            className="btn-control-icon hidden min-[480px]:flex hover:text-accent"
            title="Preferences & Options"
            aria-label="Preferences & Options"
          >
            <IconSettings className="w-3.5 h-3.5" />
          </button>

          {/* Close Window Button (In-Page Overlay) */}
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              className="btn-control-icon hover:!bg-rose-500/10 hover:!text-rose-600 dark:hover:!text-rose-400 hover:!border-rose-500/30"
              title="Close window (Esc)"
              aria-label="Close window"
            >
              <IconClose className="w-3.5 h-3.5" />
            </button>
          ) : null}
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
