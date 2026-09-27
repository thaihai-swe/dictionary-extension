import { languageBadge } from '@/shared/ai-example-blocks';
import { cx } from '@/ui/cx';
import React from 'react';
import AudioButton from './component.audio-button';

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
        'rounded-lg border border-border/70 overflow-hidden bg-surface shadow-2xs transition-all hover:border-accent/30',
        className,
      )}
    >
      <div className="flex items-start gap-2 px-3 py-1.5 bg-accent-subtle/40 border-l-2 border-accent">
        <span className="mt-0.5 px-1 py-0.5 rounded text-[9.5px] font-extrabold tracking-wider bg-accent/15 text-accent border border-accent/25 flex-shrink-0 font-mono leading-none">
          EN
        </span>
        <p className="flex-1 text-[13px] sm:text-[13.5px] text-content min-w-0 tracking-[0.002em] leading-relaxed">
          {english}
        </p>
        <AudioButton
          text={english}
          variant="button"
          isPlaying={isPlaying}
          onClick={onListen}
          title="Listen to English pronunciation"
        />
      </div>

      {translation ? (
        <div className="flex items-start gap-2 px-3 py-1.5 bg-muted/20 border-t border-border/50 border-l-2 border-border/50">
          <span className="mt-0.5 px-1 py-0.5 rounded text-[9.5px] font-extrabold tracking-wider bg-muted text-content-secondary border border-border/60 flex-shrink-0 font-mono leading-none">
            {languageBadge(targetLang)}
          </span>
          <p className="flex-1 text-[12.5px] sm:text-[13px] text-content-secondary font-normal leading-relaxed">
            {translation}
          </p>
        </div>
      ) : null}
    </div>
  );
};

export default ExampleSentence;
