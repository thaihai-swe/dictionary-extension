import React from 'react';
import { useStorage } from '../composables/composable.storage';
import { isAudioPlayingRef, stopAllAudio } from '../composables/composable.dictionary';
import { useSignal } from '../ui/signal';
import { openExtensionSettings } from '../shared/runtime-client';
import { ExtensionSettings } from '../types';
import { cx } from '../ui/cx';

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
    <header className="flex items-center justify-between px-3 py-2 bg-dark-surface border-b border-dark-border select-none shadow-sm relative z-30">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-teal-500/15 border border-teal-500/30 flex items-center justify-center text-teal-400 shadow-sm flex-shrink-0">
          <svg className="w-4 h-4 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        </div>
        <div>
          <h1 className="text-xs font-bold text-slate-100 leading-none tracking-tight flex items-center gap-1.5">
            <span>Dictionary</span>
            <span className="text-[9px] px-1 py-0.2 rounded bg-teal-500/10 text-teal-300 font-bold border border-teal-500/20">
              v2.0
            </span>
          </h1>
          <p className="text-[10px] text-slate-400 leading-tight">Learner Workbench</p>
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        <div className="relative flex items-center">
          <select
            value={settings.dictionaryProvider || 'free_dictionary'}
            onChange={handleProviderChange}
            className="bg-dark-muted border border-dark-border text-slate-200 text-[11px] font-medium rounded-lg px-2 py-1 outline-none focus:border-teal-500 cursor-pointer appearance-none pr-5 transition-colors"
            title="Select Dictionary Provider"
          >
            <option value="free_dictionary">🌐 Free Dictionary</option>
            <option value="wiktionary">📖 Wiktionary</option>
            <option value="datamuse">⚡ Datamuse</option>
            <option value="wikipedia">📰 Wikipedia</option>
            <option value="urban_dictionary">💬 Urban Dictionary</option>
            <option value="google_translate">🌐 Google Translate</option>
            <option value="gemini_ai">✨ Gemini AI ({settings.aiModel || 'gemini-2.5-flash'})</option>
          </select>
          <span className="absolute right-1.5 text-[9px] text-slate-400 pointer-events-none">▼</span>
        </div>

        <div className="relative flex items-center">
          <select
            value={settings.translateTargetLanguage || 'Vietnamese'}
            onChange={handleTargetLangChange}
            className="bg-dark-muted border border-dark-border text-slate-200 text-[11px] font-medium rounded-lg px-2 py-1 outline-none focus:border-teal-500 cursor-pointer appearance-none pr-5 transition-colors"
            title="Select Translation Target Language"
          >
            <option value="Vietnamese">VN VI</option>
            <option value="English">US EN</option>
            <option value="Japanese">JP JA</option>
            <option value="Chinese">CN ZH</option>
            <option value="Korean">KR KO</option>
            <option value="French">FR FR</option>
            <option value="Spanish">ES ES</option>
          </select>
          <span className="absolute right-1.5 text-[9px] text-slate-400 pointer-events-none">▼</span>
        </div>

        <div className="w-[1px] h-4 bg-dark-border mx-0.5"></div>

        <button
          type="button"
          onClick={() => stopAllAudio()}
          className={cx(
            'px-2 py-1.5 rounded-lg border transition-all duration-150 cursor-pointer text-xs flex items-center gap-1.5 font-bold active:scale-95 shadow-sm',
            isAudioPlaying
              ? 'bg-rose-500/25 text-rose-300 border-rose-500/50 shadow-rose-500/20 animate-pulse'
              : 'bg-dark-muted hover:bg-dark-border hover:border-slate-600 text-slate-300 border-dark-border',
          )}
          title={isAudioPlaying ? 'Dừng phát âm thanh/giọng nói đang chạy (Stop Voice)' : 'Dừng tất cả âm thanh/giọng nói (Global Stop Voice)'}
        >
          {isAudioPlaying ? (
            <svg className="w-3.5 h-3.5 fill-rose-300" viewBox="0 0 24 24">
              <rect x="6" y="6" width="12" height="12" rx="2" />
            </svg>
          ) : (
            <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
            </svg>
          )}
          {isAudioPlaying && (
            <span className="text-[10px] uppercase tracking-wider text-rose-300 font-bold">Stop Voice</span>
          )}
        </button>

        <button
          type="button"
          onClick={onToggleShortcuts}
          className={cx(
            'p-1.5 rounded-lg border transition-all duration-150 cursor-pointer hover:scale-105 active:scale-95 shadow-xs flex items-center justify-center',
            showShortcuts
              ? 'bg-teal-500/20 text-teal-300 border-teal-500/40'
              : 'bg-dark-muted hover:bg-dark-border hover:border-slate-600 text-slate-300 border-dark-border',
          )}
          title="Keyboard Shortcuts Guide (Shift+Q)"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
          </svg>
        </button>

        <button
          type="button"
          onClick={onToggleTheme}
          className="p-1.5 rounded-lg bg-dark-muted hover:bg-dark-border hover:border-slate-600 text-slate-300 border border-dark-border transition-all duration-150 hover:scale-105 active:scale-95 cursor-pointer shadow-xs flex items-center justify-center"
          title={isDarkMode ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
        >
          {isDarkMode ? (
            <svg className="w-4 h-4 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          ) : (
            <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          )}
        </button>

        <button
          type="button"
          onClick={onToggleMaximize}
          className="p-1.5 rounded-lg bg-dark-muted hover:bg-dark-border hover:border-slate-600 text-slate-300 border border-dark-border transition-all duration-150 hover:scale-105 active:scale-95 cursor-pointer shadow-xs flex items-center justify-center"
          title={isMaximized ? 'Restore Popup Size' : 'Maximize Workbench View'}
        >
          {isMaximized ? (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 9L4 4m0 0l5 5M4 4v4m0-4h4m11 5l-5-5m0 0l5 5m0-5v4m0-4h-4m-5 11l5 5m0 0l-5-5m5 5v-4m0 4h-4m-11-5l5-5m0 0l-5 5m0 5v-4m0 4h4" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-5h-4m4 0v4m0-4l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
          )}
        </button>

        <button
          type="button"
          onClick={() => openExtensionSettings()}
          className="p-1.5 rounded-lg bg-dark-muted hover:bg-dark-border hover:border-slate-600 text-slate-300 border border-dark-border transition-all duration-150 hover:scale-105 active:scale-95 cursor-pointer shadow-xs flex items-center justify-center"
          title="Open Settings"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </div>
    </header>
  );
};

export default AppHeader;
