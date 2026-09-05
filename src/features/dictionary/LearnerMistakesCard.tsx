import React from 'react';
import { useDictionaryAudio } from '@/composables/composable.dictionary';
import { cx } from '@/ui/cx';
import { IconAlertTriangle, IconSpeaker } from '@/components/icons';

interface MistakeItem {
  mistake: string;
  correction: string;
  example?: string;
  exampleIncorrect?: string;
  exampleCorrect?: string;
}

interface LearnerMistakesCardProps {
  word?: string;
  mistakes?: MistakeItem[];
}

export const LearnerMistakesCard: React.FC<LearnerMistakesCardProps> = ({ mistakes }) => {
  const { playPronunciation, playingKey } = useDictionaryAudio();
  const calculatedMistakes = mistakes || [];
  if (!calculatedMistakes.length) return null;

  function listenText(item: MistakeItem): string {
    return item.example || item.exampleCorrect || item.correction;
  }

  function listenButton(idx: number, item: MistakeItem, title: string) {
    const key = `mistake-${idx}`;
    const isPlaying = playingKey === key;
    return (
      <button
        type="button"
        onClick={() => playPronunciation({ text: listenText(item), language: 'en-US', key })}
        title={title}
        className={cx(
          'h-[24px] px-2 rounded border text-[11px] font-medium transition-colors flex items-center gap-1 ml-auto cursor-pointer not-italic',
          isPlaying
            ? 'bg-teal-500/20 text-teal-700 dark:bg-gold-300/15 dark:text-gold-200 border-teal-500/40 dark:border-gold-300/40 audio-playing-indicator'
            : 'bg-surface hover:bg-elevated text-content-secondary hover:text-content border-border',
        )}
        aria-pressed={isPlaying}
      >
        <IconSpeaker className="w-3 h-3 text-teal-600 dark:text-gold-300" />
        <span>Listen</span>
      </button>
    );
  }

  return (
    <div className="p-3.5 rounded-lg border border-border bg-surface space-y-2.5 shadow-card font-sans">
      <div className="flex items-center gap-1.5 text-[11px] font-bold text-content-muted uppercase tracking-wider">
        <IconAlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
        <span>Common Learner Mistakes</span>
      </div>

      <div className="space-y-1.5">
        {calculatedMistakes.map((item, idx) => (
          <div
            key={idx}
            className="pl-3 py-2 pr-2.5 rounded-r-md border-l-2 border-amber-500/60 bg-amber-500/6 text-[12.5px] space-y-1"
          >
            <div className="text-rose-700 dark:text-rose-300 font-medium leading-relaxed flex items-baseline gap-2">
              <span className="font-bold uppercase text-[10px] px-1 py-0.2 rounded bg-rose-500/15 border border-rose-500/25 flex-shrink-0">
                Avoid
              </span>
              <span className="line-through opacity-85">{item.mistake}</span>
            </div>
            <div className="text-emerald-700 dark:text-emerald-300 font-medium leading-relaxed flex items-baseline gap-2">
              <span className="font-bold uppercase text-[10px] px-1 py-0.2 rounded bg-emerald-500/15 border border-emerald-500/25 flex-shrink-0">
                Prefer
              </span>
              <span className="font-semibold">{item.correction}</span>
            </div>

            {item.example ? (
              <blockquote className="text-content-secondary text-[13px] leading-relaxed pt-0.5 flex items-center justify-between flex-wrap gap-2">
                <span>"{item.example}"</span>
                {listenButton(idx, item, 'Listen example')}
              </blockquote>
            ) : item.exampleIncorrect || item.exampleCorrect ? (
              <div className="text-content-secondary text-[13px] leading-relaxed pt-0.5 flex items-center justify-between flex-wrap gap-2">
                <div>
                  {item.exampleIncorrect ? (
                    <span className="mr-3">
                      <span className="not-italic font-medium text-rose-700 dark:text-rose-400">Incorrect:</span> {item.exampleIncorrect}
                    </span>
                  ) : null}
                  {item.exampleCorrect ? (
                    <span>
                      <span className="not-italic font-medium text-emerald-700 dark:text-emerald-400">Correct:</span> {item.exampleCorrect}
                    </span>
                  ) : null}
                </div>
                {listenButton(idx, item, 'Listen correct pronunciation')}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
};

export default LearnerMistakesCard;
