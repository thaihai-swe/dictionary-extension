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
        'rounded-xl border border-border overflow-hidden bg-surface shadow-xs',
        className,
      )}
    >
      <div className="flex items-start gap-3 px-3.5 py-2.5 bg-accent-subtle border-l-2 border-accent">
        <span className="mt-0.5 px-1.5 py-0.5 rounded text-[11px] font-extrabold tracking-wider bg-accent-subtle text-accent border border-accent/30 flex-shrink-0">
          EN
        </span>
        <p className="flex-1 text-[14px] leading-relaxed text-content font-medium min-w-0">
          "{english}"
        </p>
        <button
          type="button"
          onClick={onListen}
          title="Listen to English example"
          className={cx(
            'h-[28px] px-2.5 rounded-lg border text-[12px] font-semibold flex-shrink-0 cursor-pointer transition-colors flex items-center gap-1.5 not-italic shadow-xs',
            isPlaying
              ? 'bg-accent-subtle text-accent border-accent/40 audio-playing-indicator'
              : 'bg-surface hover:bg-elevated text-content-secondary hover:text-content border-border',
          )}
          aria-pressed={isPlaying}
        >
          <IconSpeaker className="w-3.5 h-3.5 text-accent" />
          <span>{isPlaying ? 'Playing…' : 'Listen'}</span>
        </button>
      </div>
      {translation ? (
        <div className="flex items-start gap-3 px-3.5 py-2 bg-muted/30 border-t border-border/50 border-l-2 border-border">
          <span className="mt-0.5 px-1.5 py-0.5 rounded text-[11px] font-extrabold tracking-wider bg-muted text-content-secondary border border-border flex-shrink-0">
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
