import React from 'react';
import { useDictionary } from '../composables/composable.dictionary';
import { cx } from '../ui/cx';

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
  const { playPronunciation, playingKey } = useDictionary();
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
          'px-2 py-0.5 rounded border text-[10px] font-semibold transition-all flex items-center gap-1 ml-auto cursor-pointer not-italic',
          isPlaying
            ? 'bg-teal-500/25 text-teal-200 border-teal-500/50'
            : 'bg-dark-muted hover:bg-dark-border text-slate-300 hover:text-white border-dark-border',
        )}
        aria-pressed={isPlaying}
      >
        <span>🔊 Listen</span>
      </button>
    );
  }

  return (
    <div className="pt-3 border-t border-dark-border/50 space-y-2.5">
      <div className="flex items-center gap-1.5 text-[11px] font-extrabold text-amber-400 uppercase tracking-wider">
        <span>⚠️</span>
        <span>COMMON LEARNER MISTAKES</span>
      </div>

      <div className="space-y-2">
        {calculatedMistakes.map((item, idx) => (
          <div
            key={idx}
            className="pl-3.5 py-2.5 pr-3 rounded-r-lg border-l-2 border-amber-500/70 bg-amber-500/5 text-xs space-y-1.5"
          >
            <div className="text-rose-400 font-semibold leading-relaxed">
              <span className="font-extrabold">Mistake:</span> {item.mistake}
            </div>
            <div className="text-emerald-400 font-semibold leading-relaxed">
              <span className="font-extrabold">Correction:</span> {item.correction}
            </div>

            {item.example ? (
              <blockquote className="text-slate-300 italic text-[11px] leading-relaxed pt-1 flex items-center justify-between flex-wrap gap-2">
                <span>{item.example}</span>
                {listenButton(idx, item, 'Listen example')}
              </blockquote>
            ) : item.exampleIncorrect || item.exampleCorrect ? (
              <div className="text-slate-300 italic text-[11px] leading-relaxed pt-1 flex items-center justify-between flex-wrap gap-2">
                <div>
                  {item.exampleIncorrect ? (
                    <span className="mr-3">
                      <span className="not-italic font-bold text-slate-300">Incorrect:</span> {item.exampleIncorrect}
                    </span>
                  ) : null}
                  {item.exampleCorrect ? (
                    <span>
                      <span className="not-italic font-bold text-slate-300">Correct:</span> {item.exampleCorrect}
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
