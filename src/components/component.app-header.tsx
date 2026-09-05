import React from 'react';
import { useStorage } from '../composables/composable.storage';
import { isAudioPlayingRef, stopAllAudio } from '../composables/composable.dictionary';
import { useSignal } from '../ui/signal';
import { openExtensionSettings } from '../shared/runtime-client';
import { AppSettings } from '../types';
import { cx } from '../ui/cx';
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
  onClose,
  onUpdateProvider,
  onUpdateTargetLang,
}) => {
  const { settings, saveSettings } = useStorage();
  const isAudioPlaying = useSignal(isAudioPlayingRef);

  function handleProviderChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value;
    void saveSettings({ dictionaryProvider: val as AppSettings['dictionaryProvider'] });
    onUpdateProvider?.(val);
  }

  function handleTargetLangChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value;
    void saveSettings({ translateTargetLanguage: val as AppSettings['translateTargetLanguage'] });
    onUpdateTargetLang?.(val);
  }

  const providerSelect = (
    <div className="relative flex items-center min-w-0 w-full">
      <select
        value={settings.dictionaryProvider || 'wiktionary'}
        onChange={handleProviderChange}
        aria-label="Select Dictionary Provider"
        className="select-muted w-full"
        title="Select Dictionary Provider"
      >
        <option value="wiktionary" className="bg-surface text-content">Wiktionary</option>
        <option value="free_dictionary" className="bg-surface text-content">FreeDict</option>
        <option value="datamuse" className="bg-surface text-content">Datamuse</option>
        <option value="wikipedia" className="bg-surface text-content">Wikipedia</option>
        <option value="urban_dictionary" className="bg-surface text-content">UrbanDict</option>
        <option value="wiktionary_etymology" className="bg-surface text-content">Etymology</option>
        <option value="wiktionary_bilingual" className="bg-surface text-content">Bilingual</option>
        <option value="tatoeba" className="bg-surface text-content">Tatoeba</option>
        <option value="google_translate" className="bg-surface text-content">Translate</option>
      </select>
      <IconChevronDown className="w-3 h-3 text-content-muted pointer-events-none absolute right-1.5" />
    </div>
  );

  const langSelect = (
    <div className="relative flex items-center min-w-0 w-full">
      <select
        value={settings.translateTargetLanguage || 'Vietnamese'}
        onChange={handleTargetLangChange}
        aria-label="Select Translation Target Language"
        className="select-muted w-full"
        title="Select Translation Target Language"
      >
        <option value="Vietnamese" className="bg-surface text-content">Vietnamese</option>
        <option value="English" className="bg-surface text-content">English</option>
        <option value="Japanese" className="bg-surface text-content">Japanese</option>
        <option value="Chinese" className="bg-surface text-content">Chinese</option>
        <option value="Korean" className="bg-surface text-content">Korean</option>
        <option value="French" className="bg-surface text-content">French</option>
        <option value="Spanish" className="bg-surface text-content">Spanish</option>
      </select>
      <IconChevronDown className="w-3 h-3 text-content-muted pointer-events-none absolute right-1.5" />
    </div>
  );

  return (
    <header className="flex items-center justify-between gap-2 px-2.5 py-1.5 bg-surface border-b border-border select-none relative z-30 transition-colors min-w-0">
      <div className="flex items-center gap-1.5 min-w-0 shrink-0">
        <div className="w-6 h-6 rounded-md bg-accent-subtle border border-accent/20 flex items-center justify-center text-accent flex-shrink-0">
          <IconBook className="w-3.5 h-3.5 text-accent" />
        </div>
        <span className="text-[13px] font-semibold text-content tracking-tight font-serif hidden min-[420px]:inline whitespace-nowrap">
          Dictionary
        </span>
      </div>

      <div className="flex items-center gap-1 justify-end min-w-0 flex-1">
        <div className="hidden min-[480px]:flex items-center gap-1 min-w-0 max-w-[15.5rem]">
          <div className="min-w-0 flex-1 max-w-[7.5rem]">{providerSelect}</div>
          <div className="min-w-0 flex-1 max-w-[7.25rem]">{langSelect}</div>
        </div>

        {isAudioPlaying ? (
          <button
            type="button"
            onClick={() => stopAllAudio()}
            className="h-[30px] px-2 rounded-md border text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/40 whitespace-nowrap"
            title="Cancel voice playback (Esc)"
            aria-label="Cancel voice playback"
            aria-pressed="true"
          >
            <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse" />
            <span>Stop Voice</span>
          </button>
        ) : null}

        <div className="w-px h-3.5 bg-border mx-0.5 shrink-0" />

        <div className="flex items-center gap-1 shrink-0">
          <details className="header-overflow min-[480px]:hidden">
            <summary className="btn-control-icon" title="Provider and language" aria-label="Provider and language">
              <IconMore className="w-3.5 h-3.5 text-content-secondary" />
            </summary>
            <div className="header-overflow-panel">
              {providerSelect}
              {langSelect}
              <div className="flex items-center gap-1 pt-0.5">
                <button
                  type="button"
                  onClick={onToggleShortcuts}
                  className={cx('btn-control-icon', showShortcuts ? 'chip-active' : '')}
                  title="Keyboard Shortcuts (Shift+Q)"
                  aria-label="Keyboard Shortcuts"
                  aria-pressed={showShortcuts}
                >
                  <IconKeyboard className="w-3.5 h-3.5 text-content-secondary" />
                </button>
                {onToggleMaximize ? (
                  <button
                    type="button"
                    onClick={onToggleMaximize}
                    className="btn-control-icon"
                    title={isMaximized ? 'Restore View' : 'Maximize Workbench View'}
                    aria-label={isMaximized ? 'Restore View' : 'Maximize Workbench View'}
                  >
                    {isMaximized ? (
                      <IconMinimize className="w-3.5 h-3.5 text-content-secondary" />
                    ) : (
                      <IconMaximize className="w-3.5 h-3.5 text-content-secondary" />
                    )}
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => openExtensionSettings()}
                  className="btn-control-icon"
                  title="Extension Settings"
                  aria-label="Extension Settings"
                >
                  <IconSettings className="w-3.5 h-3.5 text-content-secondary" />
                </button>
              </div>
            </div>
          </details>

          <button
            type="button"
            onClick={onToggleShortcuts}
            className={cx(
              'btn-control-icon hidden min-[480px]:flex',
              showShortcuts ? 'chip-active' : '',
            )}
            title="Keyboard Shortcuts (Shift+Q)"
            aria-label="Keyboard Shortcuts"
            aria-pressed={showShortcuts}
          >
            <IconKeyboard className="w-3.5 h-3.5 text-content-secondary" />
          </button>

          <button
            type="button"
            onClick={onToggleTheme}
            className="btn-control-icon"
            title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {isDarkMode ? (
              <IconMoon className="w-3.5 h-3.5 text-amber-300" />
            ) : (
              <IconSun className="w-3.5 h-3.5 text-amber-500" />
            )}
          </button>

          {onToggleMaximize ? (
            <button
              type="button"
              onClick={onToggleMaximize}
              className="btn-control-icon hidden min-[480px]:flex"
              title={isMaximized ? 'Restore View' : 'Maximize Workbench View'}
              aria-label={isMaximized ? 'Restore View' : 'Maximize Workbench View'}
            >
              {isMaximized ? (
                <IconMinimize className="w-3.5 h-3.5 text-content-secondary" />
              ) : (
                <IconMaximize className="w-3.5 h-3.5 text-content-secondary" />
              )}
            </button>
          ) : null}

          <button
            type="button"
            onClick={() => openExtensionSettings()}
            className="btn-control-icon hidden min-[480px]:flex"
            title="Extension Settings"
            aria-label="Extension Settings"
          >
            <IconSettings className="w-3.5 h-3.5 text-content-secondary" />
          </button>

          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              className="btn-control-icon hover:!text-rose-600 dark:hover:!text-rose-300 hover:!border-rose-300/50"
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
