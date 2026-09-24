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
  const expandLabel = isMaximized ? 'Restore Default Window' : 'Maximize Window';
  return (
    <header className="workbench-header">
      <div className="workbench-brand">
        <div className="workbench-brand-mark" aria-hidden="true"><IconBook className="w-5 h-5" /></div>
        <div>
          <span className="workbench-brand-name">Dictionary</span>
        </div>
      </div>
      <div className="workbench-window-actions">
        {isAudioPlaying ? (
          <button type="button" onClick={() => stopAllAudio()} className="audio-stop" title="Cancel voice playback (Esc)" aria-label="Cancel voice playback" aria-pressed="true">
            <span className="soundwave-bars" aria-hidden="true"><span className="soundwave-bar" /><span className="soundwave-bar" /><span className="soundwave-bar" /></span>
            <span>Stop Audio</span>
          </button>
        ) : null}
        <button type="button" onClick={onToggleShortcuts} className="btn-control-icon" title="Keyboard Shortcuts (? or Shift+Q)" aria-label="Keyboard Shortcuts" aria-pressed={showShortcuts}>
          <IconKeyboard className="w-4 h-4" />
        </button>
        <button type="button" onClick={onToggleTheme} className="btn-control-icon" title={isDarkMode ? 'Switch to Light Theme' : 'Switch to Dark Theme'} aria-label={isDarkMode ? 'Switch to Light Theme' : 'Switch to Dark Theme'}>
          {isDarkMode ? <IconMoon className="w-4 h-4" /> : <IconSun className="w-4 h-4" />}
        </button>
        <button type="button" onClick={() => openExtensionSettings()} className="btn-control-icon" title="Preferences & Options" aria-label="Preferences & Options"><IconSettings className="w-4 h-4" /></button>
        {onToggleMaximize ? (
          <button type="button" onClick={onToggleMaximize} className="btn-control-icon" title={expandLabel} aria-label={expandLabel}>
            {isMaximized ? <IconMinimize className="w-4 h-4" /> : <IconMaximize className="w-4 h-4" />}
          </button>
        ) : null}
        {onClose ? <button type="button" onClick={onClose} className="btn-control-icon" title="Close window (Esc)" aria-label="Close window"><IconClose className="w-4 h-4" /></button> : null}
      </div>
    </header>
  );
};

export default AppHeader;
