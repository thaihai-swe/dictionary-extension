import React from 'react';
import { useDictionaryAudio } from '@/composables/composable.dictionary';
import { IconSpeaker } from './icons';
import { cx } from '@/ui/cx';

export interface AudioButtonProps {
  text: string;
  audioUrl?: string;
  language?: string;
  audioKey?: string;
  variant?: 'chip' | 'icon' | 'button';
  label?: string;
  playingLabel?: string;
  badge?: string;
  ipa?: string;
  className?: string;
  title?: string;
  isPlaying?: boolean;
  onClick?: (e: React.MouseEvent) => void;
}

export const AudioButton: React.FC<AudioButtonProps> = ({
  text,
  audioUrl,
  language = 'en-US',
  audioKey,
  variant = 'icon',
  label = 'Listen',
  playingLabel = 'Playing',
  badge,
  ipa,
  className,
  title,
  isPlaying: isPlayingProp,
  onClick,
}) => {
  const { playPronunciation, playingKey } = useDictionaryAudio();
  const key = audioKey || `audio-${text.slice(0, 15)}-${language}`;
  const isPlaying = isPlayingProp !== undefined ? isPlayingProp : playingKey === key;

  function handleClick(e: React.MouseEvent) {
    e.stopPropagation();
    if (onClick) {
      onClick(e);
      return;
    }
    if (!text) return;
    playPronunciation({
      text,
      audioUrl,
      language,
      key,
    });
  }

  const defaultTitle = isPlaying ? 'Playing audio…' : title || `Listen to pronunciation`;

  if (variant === 'chip') {
    return (
      <button
        type="button"
        onClick={handleClick}
        className={cx(
          'h-6.5 pl-1.5 pr-2 py-0.5 rounded-md border font-medium transition-all duration-150 flex items-center gap-1.5 cursor-pointer shadow-2xs group active:scale-95 select-none',
          isPlaying
            ? 'bg-accent text-accent-foreground border-accent font-bold audio-playing-indicator'
            : 'bg-muted hover:bg-accent/10 hover:border-accent/40 text-content-secondary hover:text-accent border-border',
          className,
        )}
        aria-pressed={isPlaying}
        title={defaultTitle}
      >
        {badge ? (
          <span
            className={cx(
              'text-[9px] font-extrabold uppercase px-1 py-0.5 rounded font-mono transition-colors leading-none',
              isPlaying
                ? 'bg-paper/20 text-accent-foreground'
                : 'bg-surface text-content-muted border border-border/60 group-hover:text-accent',
            )}
          >
            {badge}
          </span>
        ) : null}

        {isPlaying ? (
          <span className="soundwave-bars text-accent-foreground">
            <span className="soundwave-bar" />
            <span className="soundwave-bar" />
            <span className="soundwave-bar" />
            <span className="soundwave-bar" />
          </span>
        ) : (
          <IconSpeaker className="w-3 h-3 text-accent shrink-0 group-hover:scale-110 transition-transform" />
        )}

        <span
          className={cx(
            'font-mono text-[12px] leading-none tracking-wide font-medium',
            isPlaying ? 'text-accent-foreground' : 'text-content',
          )}
        >
          {ipa ? `/${ipa.replace(/^\/+|\/+$/g, '')}/` : label}
        </span>
      </button>
    );
  }

  if (variant === 'button') {
    return (
      <button
        type="button"
        onClick={handleClick}
        title={defaultTitle}
        aria-label={defaultTitle}
        aria-pressed={isPlaying}
        className={cx(
          'h-6 px-2 rounded-md border text-[11px] font-semibold flex-shrink-0 cursor-pointer transition-all flex items-center gap-1 shadow-2xs active:scale-95 select-none',
          isPlaying
            ? 'bg-accent text-accent-foreground border-accent font-bold audio-playing-indicator'
            : 'bg-surface hover:bg-elevated text-content-secondary hover:text-content border-border hover:border-accent/40',
          className,
        )}
      >
        {isPlaying ? (
          <span className="soundwave-bars text-accent-foreground">
            <span className="soundwave-bar" />
            <span className="soundwave-bar" />
            <span className="soundwave-bar" />
            <span className="soundwave-bar" />
          </span>
        ) : (
          <IconSpeaker className="w-3 h-3 text-accent shrink-0" />
        )}
        <span>{isPlaying ? playingLabel : label}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      title={defaultTitle}
      aria-label={defaultTitle}
      aria-pressed={isPlaying}
      className={cx(
        'h-6 w-6 text-content-muted hover:text-accent cursor-pointer flex items-center justify-center rounded hover:bg-muted transition-colors select-none',
        isPlaying && 'text-accent font-bold',
        className,
      )}
    >
      {isPlaying ? (
        <span className="soundwave-bars text-accent">
          <span className="soundwave-bar" />
          <span className="soundwave-bar" />
          <span className="soundwave-bar" />
          <span className="soundwave-bar" />
        </span>
      ) : (
        <IconSpeaker className="w-3.5 h-3.5 shrink-0" />
      )}
    </button>
  );
};

export default AudioButton;
