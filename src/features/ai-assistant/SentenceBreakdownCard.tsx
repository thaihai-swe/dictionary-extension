import React from 'react';
import { SentenceStructureItem } from '@/types';
import AudioButton from '@/components/component.audio-button';
import CopyButton from '@/components/component.copy-button';
import { IconPuzzle } from '@/components/icons';

interface SentenceBreakdownCardProps {
  structure?: SentenceStructureItem[];
  translation?: string;
}

export const SentenceBreakdownCard: React.FC<SentenceBreakdownCardProps> = ({
  structure,
  translation,
}) => {
  if (!structure?.length && !translation) return null;

  return (
    <div className="space-y-4 pt-1">
      <div className="flex items-center justify-between pb-1 border-b border-border/40">
        <span className="flex items-center gap-1.5 text-[13px] font-extrabold uppercase tracking-wider text-accent">
          <IconPuzzle className="w-4 h-4 text-accent" />
          <span>Sentence Breakdown</span>
        </span>
        <span className="text-[12px] text-content-muted font-mono font-medium">Clause Analysis</span>
      </div>

      <div className="space-y-2">
        {structure?.map((item, index) => (
          <div
            key={index}
            className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1.5 pl-3.5 py-2.5 pr-3 rounded-lg border border-border bg-surface text-sm group"
          >
            <div className="flex-1 min-w-[200px] space-y-0.5">
              <div className="text-content text-[15px] leading-relaxed flex items-center justify-between gap-2">
                <span className="font-medium text-content">{item.text}</span>
                <AudioButton
                  variant="icon"
                  text={item.text}
                  audioKey={`clause-${item.text.slice(0, 10)}`}
                  title="Read clause aloud"
                  className="opacity-0 group-hover:opacity-100 h-7 w-7"
                />
              </div>
              {item.explanation ? (
                <p className="text-[13px] text-content-secondary leading-normal">
                  {item.explanation}
                </p>
              ) : null}
            </div>
            <span className="ml-auto flex-shrink-0 px-2.5 py-0.5 rounded-full text-[12px] font-semibold text-accent bg-accent-subtle border border-accent/25 capitalize font-mono">
              {item.role}
            </span>
          </div>
        ))}
      </div>

      {translation && (
        <div className="px-3 py-2.5 rounded-lg border border-border bg-muted text-[15px] leading-relaxed text-content-secondary space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="font-extrabold text-emerald-600 dark:text-emerald-400 text-[12px] uppercase tracking-wider">
              Context Translation:
            </span>
            <div className="flex items-center gap-1.5">
              <AudioButton
                variant="button"
                text={translation}
                audioKey={`trans-${translation.slice(0, 10)}`}
                label="Read"
                playingLabel="Playing"
                title="Read translation aloud"
                className="h-[28px] text-[13px]"
              />
              <CopyButton
                text={translation}
                label="Copy"
                copiedLabel="Copied"
                title="Copy translation"
                className="h-[28px] text-[13px]"
              />
            </div>
          </div>
          <p className="font-medium text-[16px] text-content leading-relaxed">{translation}</p>
        </div>
      )}
    </div>
  );
};

export default SentenceBreakdownCard;
