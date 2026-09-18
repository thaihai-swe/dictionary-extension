import React from 'react';
import { IconSpeaker } from './icons';
import { cx } from '@/ui/cx';
import { languageBadge } from '@/shared/ai-example-blocks';

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
        <span className="mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-extrabold tracking-wider bg-accent/15 text-accent border border-accent/25 flex-shrink-0 font-mono">
          EN
        </span>
        <p className="flex-1 text-[13.5px] leading-relaxed text-content font-medium min-w-0">
          “{english}”
        </p>
        <button
          type="button"
          onClick={onListen}
          title="Listen to English pronunciation"
          aria-label="Listen to English pronunciation"
          className={cx(
            'h-7 px-2.5 rounded-lg border text-[11.5px] font-semibold flex-shrink-0 cursor-pointer transition-all flex items-center gap-1.5 shadow-2xs active:scale-95',
            isPlaying
              ? 'bg-accent text-white dark:text-[#090d16] border-accent font-bold audio-playing-indicator'
              : 'bg-surface hover:bg-elevated text-content-secondary hover:text-content border-border hover:border-accent/40',
          )}
          aria-pressed={isPlaying}
        >
          {isPlaying ? (
            <span className="soundwave-bars text-white dark:text-[#090d16]">
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
          <span className="mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-extrabold tracking-wider bg-muted text-content-secondary border border-border/60 flex-shrink-0 font-mono">
            {languageBadge(targetLang)}
          </span>
          <p className="flex-1 text-[13px] leading-relaxed text-content-secondary font-normal">
            {translation}
          </p>
        </div>
      ) : null}
    </div>
  );
};

export default ExampleSentence;
