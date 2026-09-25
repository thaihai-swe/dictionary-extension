import React from 'react';
import { isAudioPlayingRef, stopAllAudio } from '../composables/composable.dictionary';
import { openExtensionSettings } from '../shared/runtime-client';
import { useSignal } from '../ui/signal';
import { IconBook, IconClose, IconKeyboard, IconMaximize, IconMinimize, IconMoon, IconSettings, IconSun } from './icons';

interface AppHeaderProps {
  showShortcuts: boolean;
  isMaximized?: boolean;
  isDarkMode?: boolean;
  onToggleShortcuts?: () => void;
  onToggleMaximize?: () => void;
  onToggleTheme?: () => void;
  onClose?: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  showShortcuts, isMaximized, isDarkMode, onToggleShortcuts,
  onToggleMaximize, onToggleTheme, onClose,
}) => {
  const isAudioPlaying = useSignal(isAudioPlayingRef);
  const expandLabel = isMaximized ? 'Restore Default Window' : 'Expand to Full Tab';

  return (
    <header className="workbench-header select-none">
      {/* Brand */}
      <div className="workbench-brand flex items-center gap-2">
        <div className="workbench-brand-mark w-7 h-7 rounded-lg flex items-center justify-center shadow-xs" aria-hidden="true">
          <IconBook className="w-3.5 h-3.5" style={{ color: 'var(--color-on-primary)' }} />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="workbench-brand-name font-heading font-extrabold text-[15px] tracking-tight">
            Dictionary
          </span>
          <span className="px-1.5 py-0.5 rounded-md text-[10px] font-mono font-extrabold tracking-wider uppercase bg-accent-subtle text-accent border border-accent/25 leading-none">
            AI
          </span>
        </div>
      </div>

      {/* Window Actions */}
      <div className="workbench-window-actions flex items-center gap-1">
        {/* Audio stop pill */}
        {isAudioPlaying ? (
          <button
            type="button"
            onClick={() => stopAllAudio()}
            className="audio-stop mr-1"
            title="Cancel voice playback (Esc)"
            aria-label="Cancel voice playback"
            aria-pressed="true"
          >
            <span className="soundwave-bars" aria-hidden="true">
              <span className="soundwave-bar" />
              <span className="soundwave-bar" />
              <span className="soundwave-bar" />
              <span className="soundwave-bar" />
            </span>
            <span>Stop</span>
          </button>
        ) : null}

        {/* Keyboard shortcuts toggle */}
        <button
          type="button"
          onClick={onToggleShortcuts}
          className={`btn-control-icon${showShortcuts ? ' !bg-accent-subtle !text-accent !border-accent/40 shadow-glow-subtle' : ''}`}
          title="Keyboard Shortcuts (? or Shift+Q)"
          aria-label="Keyboard Shortcuts"
          aria-pressed={showShortcuts}
        >
          <IconKeyboard className="w-3.5 h-3.5" />
        </button>

        {/* Theme toggle */}
        <button
          type="button"
          onClick={onToggleTheme}
          className="btn-control-icon"
          title={isDarkMode ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
          aria-label={isDarkMode ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
        >
          {isDarkMode
            ? <IconMoon className="w-3.5 h-3.5 text-amber-300" />
            : <IconSun className="w-3.5 h-3.5 text-amber-500" />}
        </button>

        {/* Settings */}
        <button
          type="button"
          onClick={() => openExtensionSettings()}
          className="btn-control-icon"
          title="Preferences & Settings"
          aria-label="Preferences & Settings"
        >
          <IconSettings className="w-3.5 h-3.5" />
        </button>

        {/* Maximize / Restore */}
        {onToggleMaximize ? (
          <button
            type="button"
            onClick={onToggleMaximize}
            className="btn-control-icon"
            title={expandLabel}
            aria-label={expandLabel}
          >
            {isMaximized
              ? <IconMinimize className="w-3.5 h-3.5" />
              : <IconMaximize className="w-3.5 h-3.5" />}
          </button>
        ) : null}

        {/* Close */}
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="btn-control-icon hover:!bg-rose-500/15 hover:!text-rose-500 hover:!border-rose-500/30"
            title="Close window (Esc)"
            aria-label="Close window"
          >
            <IconClose className="w-3.5 h-3.5" />
          </button>
        ) : null}
      </div>
    </header>
  );
};

export default AppHeader;
