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

  return (
    <header className="flex items-center justify-between gap-2 px-2.5 py-1.5 bg-surface border-b border-border select-none relative z-30 transition-colors min-w-0">
      {/* Brand & Wordmark */}
      <div className="flex items-center gap-1.5 min-w-0 shrink-0">
        <div className="w-6 h-6 rounded-md bg-teal-500/10 border border-teal-500/20 dark:bg-gold-300/10 dark:border-gold-300/25 flex items-center justify-center text-teal-600 dark:text-gold-200 flex-shrink-0">
          <IconBook className="w-3.5 h-3.5 text-teal-600 dark:text-gold-200" />
        </div>
        <span className="text-[13px] font-semibold text-content tracking-tight font-serif dark:text-[#f8f4ea] hidden min-[420px]:inline whitespace-nowrap">
          Dictionary
        </span>
      </div>

      {/* Control Actions & Selectors */}
      <div className="flex items-center gap-1 justify-end min-w-0 flex-1">
        {/* Dictionary Provider Selector — Styled like demo .popup-provider-badge */}
        <div className="relative flex items-center min-w-0 max-w-[7.5rem]">
          <select
            value={settings.dictionaryProvider || 'wiktionary'}
            onChange={handleProviderChange}
            aria-label="Select Dictionary Provider"
            className="h-[27px] max-w-full bg-teal-500/10 hover:bg-teal-500/15 border border-teal-500/25 text-teal-800 dark:text-gold-200 dark:bg-gold-300/10 dark:border-gold-300/25 text-[11px] font-bold rounded-md pl-2 pr-5 outline-none cursor-pointer appearance-none transition-all whitespace-nowrap"
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
            <option value="gemini_ai" className="bg-surface text-content">AI Assistant</option>
          </select>
          <IconChevronDown className="w-3 h-3 text-teal-700 dark:text-gold-200 pointer-events-none absolute right-1.5" />
        </div>

        {/* Translation Target Language Selector — Styled like demo .popup-lang-badge */}
        <div className="relative flex items-center min-w-0 max-w-[7.25rem]">
          <select
            value={settings.translateTargetLanguage || 'Vietnamese'}
            onChange={handleTargetLangChange}
            aria-label="Select Translation Target Language"
            className="h-[27px] max-w-full bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-800 dark:text-indigo-200 dark:bg-indigo-950/60 dark:border-indigo-800/40 text-[11px] font-bold rounded-md pl-2 pr-5 outline-none cursor-pointer appearance-none transition-all whitespace-nowrap"
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
          <IconChevronDown className="w-3 h-3 text-indigo-700 dark:text-indigo-200 pointer-events-none absolute right-1.5" />
        </div>

        {/* Global Stop Voice Button — Matching demo .demo-stop-voice-btn */}
        {isAudioPlaying ? (
          <button
            type="button"
            onClick={() => stopAllAudio()}
            className="h-[27px] px-2 rounded-md border text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/40"
            title="Cancel voice playback (Esc)"
            aria-label="Cancel voice playback"
            aria-pressed="true"
          >
            <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse" />
            <span>Stop (Esc)</span>
          </button>
        ) : null}

        <div className="w-px h-3.5 bg-border mx-0.5 shrink-0" />

        <div className="flex items-center gap-1 shrink-0">
          {/* Shortcuts Modal Trigger */}
          <button
            type="button"
            onClick={onToggleShortcuts}
            className={cx(
              'btn-control-icon !w-[27px] !h-[27px] !p-1',
              showShortcuts ? 'bg-teal-500/15 text-teal-600 dark:text-teal-300 border-teal-500/30' : '',
            )}
            title="Keyboard Shortcuts (Shift+Q)"
            aria-label="Keyboard Shortcuts"
            aria-pressed={showShortcuts}
          >
            <IconKeyboard className="w-3.5 h-3.5 text-content-secondary" />
          </button>

          {/* Theme Switcher */}
          <button
            type="button"
            onClick={onToggleTheme}
            className="btn-control-icon !w-[27px] !h-[27px] !p-1"
            title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {isDarkMode ? (
              <IconMoon className="w-3.5 h-3.5 text-amber-300" />
            ) : (
              <IconSun className="w-3.5 h-3.5 text-amber-500" />
            )}
          </button>

          {/* Maximize / Restore */}
          {onToggleMaximize ? (
            <button
              type="button"
              onClick={onToggleMaximize}
              className="btn-control-icon !w-[27px] !h-[27px] !p-1"
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

          {/* Settings */}
          <button
            type="button"
            onClick={() => openExtensionSettings()}
            className="btn-control-icon !w-[27px] !h-[27px] !p-1"
            title="Extension Settings"
            aria-label="Extension Settings"
          >
            <IconSettings className="w-3.5 h-3.5 text-content-secondary" />
          </button>

          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              className="btn-control-icon !w-[27px] !h-[27px] !p-1 hover:!text-rose-600 dark:hover:!text-rose-300 hover:!border-rose-300/50"
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
