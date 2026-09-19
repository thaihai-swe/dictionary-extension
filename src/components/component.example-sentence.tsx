import { languageBadge } from '@/shared/ai-example-blocks';
import { cx } from '@/ui/cx';
import React from 'react';
import { IconSpeaker } from './icons';

interface ExampleSentenceProps {
  english: string;
  translation?: string;
  targetLang?: string;
  isPlaying?: boolean;
  onListen: () => void;
  className?: string;
}

export const ExampleSentence: React.FC<ExampleSentenceProps> = ({
  english,
  translation,
  targetLang,
  isPlaying = false,
  onListen,
  className,
}) => {
  return (
    <div
      className={cx(
        'rounded-xl border border-border/80 overflow-hidden bg-surface shadow-xs transition-all hover:border-accent/30',
        className,
      )}
    >
      <div className="flex items-start gap-2.5 px-3.5 py-2.5 bg-accent-subtle/60 border-l-3 border-accent">
        <span className="mt-0.5 px-1.5 py-0.5 rounded text-[11px] font-extrabold tracking-wider bg-accent/15 text-accent border border-accent/25 flex-shrink-0 font-mono">
          EN
        </span>
        <p className="flex-1 font-serif text-reading text-content min-w-0 tracking-[0.002em]">
          {english}
        </p>
        <button
          type="button"
          onClick={onListen}
          title="Listen to English pronunciation"
          aria-label="Listen to English pronunciation"
          className={cx(
            'h-7 px-2.5 rounded-lg border text-[12.5px] font-semibold flex-shrink-0 cursor-pointer transition-all flex items-center gap-1.5 shadow-2xs active:scale-95',
            isPlaying
              ? 'bg-accent text-accent-foreground border-accent font-bold audio-playing-indicator'
              : 'bg-surface hover:bg-elevated text-content-secondary hover:text-content border-border hover:border-accent/40',
          )}
          aria-pressed={isPlaying}
        >
          {isPlaying ? (
            <span className="soundwave-bars text-accent-foreground">
              <span className="soundwave-bar" />
              <span className="soundwave-bar" />
              <span className="soundwave-bar" />
            </span>
          ) : (
            <IconSpeaker className="w-3.5 h-3.5 text-accent" />
          )}
          <span>{isPlaying ? 'Playing' : 'Listen'}</span>
        </button>
      </div>

      {translation ? (
        <div className="flex items-start gap-2.5 px-3.5 py-2 bg-muted/20 border-t border-border/60 border-l-3 border-border/60">
          <span className="mt-0.5 px-1.5 py-0.5 rounded text-[11px] font-extrabold tracking-wider bg-muted text-content-secondary border border-border/60 flex-shrink-0 font-mono">
            {languageBadge(targetLang)}
          </span>
          <p className="flex-1 font-serif text-reading-compact text-content-secondary font-normal">
            {translation}
          </p>
        </div>
      ) : null}
    </div>
  );
};

export default ExampleSentence;
