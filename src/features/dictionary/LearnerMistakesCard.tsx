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
          'h-6 px-2.5 rounded-lg border text-[12px] font-semibold transition-all flex items-center gap-1.5 ml-auto cursor-pointer not-italic active:scale-95',
          isPlaying
            ? 'bg-accent text-accent-foreground border-accent audio-playing-indicator'
            : 'bg-surface hover:bg-elevated text-content-secondary hover:text-content border-border/70 hover:border-accent/40',
        )}
        aria-pressed={isPlaying}
      >
        {isPlaying ? (
          <span className="soundwave-bars text-accent-foreground">
            <span className="soundwave-bar" />
            <span className="soundwave-bar" />
            <span className="soundwave-bar" />
            <span className="soundwave-bar" />
          </span>
        ) : (
          <IconSpeaker className="w-3 h-3 text-accent" />
        )}
        <span>Listen</span>
      </button>
    );
  }

  return (
    <div className="p-4 rounded-2xl border border-border/80 bg-surface space-y-3 font-sans shadow-xs">
      <div className="flex items-center gap-2 text-[12px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider font-mono">
        <IconAlertTriangle className="w-3.5 h-3.5" />
        <span>Common Learner Mistakes</span>
      </div>

      <div className="space-y-2">
        {calculatedMistakes.map((item, idx) => (
          <div
            key={idx}
            className="p-3 rounded-xl border border-amber-500/25 bg-amber-500/6 text-[13.5px] space-y-1.5"
          >
            <div className="text-rose-700 dark:text-rose-300 font-medium leading-relaxed flex items-baseline gap-2">
              <span className="font-bold uppercase text-[10px] px-1.5 py-0.5 rounded font-mono bg-rose-500/15 border border-rose-500/25 flex-shrink-0">
                Avoid
              </span>
              <span className="line-through opacity-85">{item.mistake}</span>
            </div>
            <div className="text-emerald-700 dark:text-emerald-300 font-medium leading-relaxed flex items-baseline gap-2">
              <span className="font-bold uppercase text-[10px] px-1.5 py-0.5 rounded font-mono bg-emerald-500/15 border border-emerald-500/25 flex-shrink-0">
                Prefer
              </span>
              <span className="font-semibold">{item.correction}</span>
            </div>

            {item.example ? (
              <blockquote className="text-content-secondary text-[14px] leading-relaxed pt-1 flex items-center justify-between flex-wrap gap-2 border-t border-border/40">
                <span className="italic">"{item.example}"</span>
                {listenButton(idx, item, 'Listen example')}
              </blockquote>
            ) : item.exampleIncorrect || item.exampleCorrect ? (
              <div className="text-content-secondary text-[14px] leading-relaxed pt-1 flex items-center justify-between flex-wrap gap-2 border-t border-border/40">
                <div className="space-y-0.5">
                  {item.exampleIncorrect ? (
                    <div className="mr-3">
                      <span className="not-italic font-semibold text-rose-700 dark:text-rose-400">Incorrect:</span> {item.exampleIncorrect}
                    </div>
                  ) : null}
                  {item.exampleCorrect ? (
                    <div>
                      <span className="not-italic font-semibold text-emerald-700 dark:text-emerald-400">Correct:</span> {item.exampleCorrect}
                    </div>
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
