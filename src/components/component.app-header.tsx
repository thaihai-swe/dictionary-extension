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
  IconSpeaker,
  IconStopCircle,
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
    <header className="flex items-center justify-between px-3 py-1.5 bg-surface border-b border-border select-none relative z-30 transition-colors dark:border-[color:var(--hairline-gold)]">
      {/* Brand & Wordmark */}
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-md bg-teal-500/10 border border-teal-500/20 dark:bg-gold-300/10 dark:border-gold-300/25 flex items-center justify-center text-teal-600 dark:text-gold-200 flex-shrink-0">
          <IconBook className="w-3.5 h-3.5 text-teal-600 dark:text-gold-200" />
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-[13px] font-semibold text-content tracking-tight font-serif dark:text-[#f8f4ea]">
            Dictionary
          </span>
          <span className="text-[10px] text-content-muted font-mono tracking-widest uppercase">Studio</span>
        </div>
      </div>

      {/* Control Actions & Selectors */}
      <div className="flex items-center gap-1">
        {/* Dictionary Provider Selector */}
        <div className="relative flex items-center">
          <select
            value={settings.dictionaryProvider || 'free_dictionary'}
            onChange={handleProviderChange}
            aria-label="Select Dictionary Provider"
            className="h-[28px] bg-muted/70 hover:bg-elevated border border-border/80 text-content text-[11.5px] font-medium rounded-md pl-2 pr-5 outline-none focus:border-teal-500 cursor-pointer appearance-none transition-all shadow-2xs"
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
          <IconChevronDown className="w-3 h-3 text-content-muted pointer-events-none absolute right-1.5" />
        </div>

        {/* Translation Target Language Selector */}
        <div className="relative flex items-center">
          <select
            value={settings.translateTargetLanguage || 'Vietnamese'}
            onChange={handleTargetLangChange}
            aria-label="Select Translation Target Language"
            className="h-[28px] bg-muted/70 hover:bg-elevated border border-border/80 text-content text-[11.5px] font-medium rounded-md pl-2 pr-5 outline-none focus:border-teal-500 cursor-pointer appearance-none transition-all shadow-2xs"
            title="Select Translation Target Language"
          >
            <option value="Vietnamese" className="bg-surface text-content">VI</option>
            <option value="English" className="bg-surface text-content">EN</option>
            <option value="Japanese" className="bg-surface text-content">JA</option>
            <option value="Chinese" className="bg-surface text-content">ZH</option>
            <option value="Korean" className="bg-surface text-content">KO</option>
            <option value="French" className="bg-surface text-content">FR</option>
            <option value="Spanish" className="bg-surface text-content">ES</option>
          </select>
          <IconChevronDown className="w-3 h-3 text-content-muted pointer-events-none absolute right-1.5" />
        </div>

        <div className="w-[1px] h-3.5 bg-border mx-0.5" />

        {/* Global Stop Voice Button */}
        <button
          type="button"
          onClick={() => stopAllAudio()}
          className={cx(
            'h-[28px] px-2 rounded-md border text-[11px] font-semibold flex items-center gap-1 transition-all duration-140 cursor-pointer active:scale-95 shadow-2xs',
            isAudioPlaying
              ? 'bg-rose-500/15 text-rose-600 dark:text-rose-300 border-rose-500/40 shadow-xs'
              : 'bg-surface hover:bg-elevated text-content-secondary hover:text-content border-border',
          )}
          title={isAudioPlaying ? 'Stop voice playback (Esc)' : 'Global stop audio'}
          aria-label={isAudioPlaying ? 'Stop voice playback' : 'Global stop audio'}
        >
          {isAudioPlaying ? (
            <>
              <IconStopCircle className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400 animate-pulse" />
              <span className="text-[10px] font-bold text-rose-600 dark:text-rose-300 uppercase">Stop</span>
            </>
          ) : (
            <IconSpeaker className="w-3.5 h-3.5 text-content-muted" />
          )}
        </button>

        {/* Shortcuts Modal Trigger */}
        <button
          type="button"
          onClick={onToggleShortcuts}
          className={cx(
            'btn-control-icon !w-[28px] !h-[28px] !p-1',
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
          className="btn-control-icon !w-[28px] !h-[28px] !p-1"
          title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          aria-label={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {isDarkMode ? (
            <IconMoon className="w-3.5 h-3.5 text-amber-300" />
          ) : (
            <IconSun className="w-3.5 h-3.5 text-amber-500" />
          )}
        </button>

        {/* Maximize / Pop-out */}
        {onToggleMaximize ? (
          <button
            type="button"
            onClick={onToggleMaximize}
            className="btn-control-icon !w-[28px] !h-[28px] !p-1"
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
          className="btn-control-icon !w-[28px] !h-[28px] !p-1"
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
