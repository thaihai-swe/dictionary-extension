import React from 'react';
import { useStorage } from '../composables/composable.storage';
import { isAudioPlayingRef, stopAllAudio } from '../composables/composable.dictionary';
import { useSignal } from '../ui/signal';
import { openExtensionSettings } from '../shared/runtime-client';
import { ExtensionSettings } from '../types';
import { cx } from '../ui/cx';
import {
  IconBook,
  IconChevronDown,
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
  onUpdateProvider,
  onUpdateTargetLang,
}) => {
  const { settings, saveSettings } = useStorage();
  const isAudioPlaying = useSignal(isAudioPlayingRef);

  function handleProviderChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value;
    void saveSettings({ dictionaryProvider: val as ExtensionSettings['dictionaryProvider'] });
    onUpdateProvider?.(val);
  }

  function handleTargetLangChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value;
    void saveSettings({ translateTargetLanguage: val as ExtensionSettings['translateTargetLanguage'] });
    onUpdateTargetLang?.(val);
  }

  return (
    <header className="flex items-center justify-between px-3 py-1.5 bg-surface border-b border-border select-none relative z-30 transition-colors">
      {/* Brand & Wordmark */}
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-md bg-teal-500/10 border border-teal-500/20 dark:bg-gold-300/10 dark:border-gold-300/25 flex items-center justify-center text-teal-600 dark:text-gold-200 flex-shrink-0">
          <IconBook className="w-3.5 h-3.5 text-teal-600 dark:text-gold-200" />
        </div>
        <span className="text-[13px] font-semibold text-content tracking-tight font-serif dark:text-[#f8f4ea]">
          Dictionary
        </span>
      </div>

      {/* Control Actions & Selectors */}
      <div className="flex items-center gap-1.5 flex-wrap justify-end">
        {/* Dictionary Provider Selector — Styled like demo .popup-provider-badge */}
        <div className="relative flex items-center">
          <select
            value={settings.dictionaryProvider || 'free_dictionary'}
            onChange={handleProviderChange}
            aria-label="Select Dictionary Provider"
            className="h-[27px] bg-teal-500/10 hover:bg-teal-500/15 border border-teal-500/25 text-teal-800 dark:text-gold-200 dark:bg-gold-300/10 dark:border-gold-300/25 text-[11px] font-bold rounded-md pl-2 pr-5 outline-none cursor-pointer appearance-none transition-all"
            title="Select Dictionary Provider"
          >
            <option value="free_dictionary" className="bg-surface text-content">FreeDict</option>
            <option value="wiktionary" className="bg-surface text-content">Wiktionary</option>
            <option value="datamuse" className="bg-surface text-content">Datamuse</option>
            <option value="wikipedia" className="bg-surface text-content">Wikipedia</option>
            <option value="urban_dictionary" className="bg-surface text-content">UrbanDict</option>
            <option value="google_translate" className="bg-surface text-content">Translate</option>
            <option value="gemini_ai" className="bg-surface text-content">Gemini AI</option>
          </select>
          <IconChevronDown className="w-3 h-3 text-teal-700 dark:text-gold-200 pointer-events-none absolute right-1.5" />
        </div>

        {/* Translation Target Language Selector — Styled like demo .popup-lang-badge */}
        <div className="relative flex items-center">
          <select
            value={settings.translateTargetLanguage || 'Vietnamese'}
            onChange={handleTargetLangChange}
            aria-label="Select Translation Target Language"
            className="h-[27px] bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-800 dark:text-indigo-200 dark:bg-indigo-950/60 dark:border-indigo-800/40 text-[11px] font-bold rounded-md pl-2 pr-5 outline-none cursor-pointer appearance-none transition-all"
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
        <button
          type="button"
          onClick={() => stopAllAudio()}
          className={cx(
            'h-[27px] px-2.5 rounded-md border text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs',
            isAudioPlaying
              ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/40 shadow-xs'
              : 'bg-surface hover:bg-rose-50 hover:text-rose-800 hover:border-rose-200 text-content-secondary border-border',
          )}
          title={isAudioPlaying ? 'Cancel voice playback (Esc)' : 'Global Stop Voice audio control'}
          aria-label={isAudioPlaying ? 'Cancel voice playback' : 'Global Stop Voice audio control'}
          aria-pressed={isAudioPlaying}
        >
          <span
            className={cx(
              'w-2 h-2 rounded-full',
              isAudioPlaying ? 'bg-rose-600 animate-pulse' : 'bg-content-muted/50',
            )}
          />
          <span>{isAudioPlaying ? 'Stop (Esc)' : 'Stop Voice'}</span>
        </button>

        <div className="w-[1px] h-3.5 bg-border mx-0.5" />

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
      </div>
    </header>
  );
};

export default AppHeader;
