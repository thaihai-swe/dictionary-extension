import React, { useMemo } from 'react';
import { Meaning } from '../types';
import { useDictionary } from '../composables/composable.dictionary';
import { mergeMeanings } from '../shared/enrichment';
import { cx } from '../ui/cx';

interface SenseMatrixCardProps {
  meanings: Meaning[];
  onSelectWord?: (word: string) => void;
}

function getPosClass(pos: string): string {
  const p = pos.toLowerCase();
  if (p.includes('noun')) return 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30';
  if (p.includes('verb')) return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
  if (p.includes('adj')) return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
  if (p.includes('adv')) return 'bg-rose-500/15 text-rose-400 border-rose-500/30';
  return 'bg-brand-500/15 text-brand-400 border-brand-500/30';
}

export const SenseMatrixCard: React.FC<SenseMatrixCardProps> = ({ meanings, onSelectWord }) => {
  const groupedMeanings = useMemo(() => mergeMeanings(meanings || [], []), [meanings]);
  const { playPronunciation, playingKey } = useDictionary();

  return (
    <div className="space-y-6 pt-1">
      {groupedMeanings.map((meaning, mIdx) => (
        <div
          key={meaning.partOfSpeech || mIdx}
          className="space-y-3.5 border-b border-dark-border/50 pb-5 last:border-b-0 last:pb-0"
        >
          <div className="flex items-center justify-between pb-1">
            <div className="flex items-center gap-2">
              <span
                className={cx(
                  'inline-flex items-center px-3 py-0.5 rounded-full font-extrabold text-xs uppercase tracking-wider',
                  getPosClass(meaning.partOfSpeech),
                )}
              >
                {meaning.partOfSpeech}
              </span>
            </div>
            {meaning.source ? (
              <span className="px-2.5 py-0.5 rounded-full bg-dark-muted text-slate-300 font-bold border border-dark-border text-[10px]">
                {meaning.source}
              </span>
            ) : null}
          </div>

          <ol className="space-y-4 text-slate-100">
            {meaning.definitions.map((def, dIdx) => {
              const listenKey = `sense-${mIdx}-${dIdx}`;
              const isPlaying = playingKey === listenKey;
              return (
                <li key={dIdx} className="space-y-2.5">
                  <div className="flex items-start gap-2.5">
                    <span className="font-bold text-teal-400 text-sm mt-0.5 flex-shrink-0 font-mono">
                      {dIdx + 1}.
                    </span>
                    <span className="font-serif text-base text-slate-100 leading-relaxed font-normal">
                      {def.definition}
                    </span>
                  </div>

                  {def.example ? (
                    <div className="mt-2.5 pl-3.5 py-2 pr-3 border-l-2 border-teal-500/70 bg-teal-500/5 rounded-r-lg text-slate-200 italic text-sm leading-relaxed flex items-center justify-between gap-3">
                      <span>"{def.example}"</span>
                      <button
                        type="button"
                        onClick={() =>
                          playPronunciation({
                            text: def.example,
                            language: 'en-US',
                            key: listenKey,
                          })
                        }
                        title="Listen example sentence"
                        className={cx(
                          'px-2.5 py-1 rounded border text-xs not-italic flex-shrink-0 transition-colors flex items-center gap-1 cursor-pointer font-semibold',
                          isPlaying
                            ? 'bg-teal-500/25 text-teal-200 border-teal-500/50'
                            : 'bg-dark-muted hover:bg-dark-border text-slate-200 hover:text-white border-dark-border',
                        )}
                        aria-pressed={isPlaying}
                      >
                        <span>🔊 Listen</span>
                      </button>
                    </div>
                  ) : null}

                  {def.synonyms && def.synonyms.length > 0 ? (
                    <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                      <span className="text-xs text-slate-400 font-bold uppercase tracking-wider mr-1">
                        Synonyms:
                      </span>
                      {def.synonyms.slice(0, 5).map((syn) => (
                        <button
                          key={syn}
                          type="button"
                          onClick={() => onSelectWord?.(syn)}
                          className="px-3 py-1 rounded-full bg-dark-muted hover:bg-teal-500/20 hover:text-teal-300 text-slate-200 text-xs font-semibold transition-all cursor-pointer"
                        >
                          {syn}
                        </button>
                      ))}
                    </div>
                  ) : null}

                  {def.antonyms && def.antonyms.length > 0 ? (
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <span className="text-xs text-rose-400/80 font-bold uppercase tracking-wider mr-1">
                        Antonyms:
                      </span>
                      {def.antonyms.slice(0, 5).map((ant) => (
                        <button
                          key={ant}
                          type="button"
                          onClick={() => onSelectWord?.(ant)}
                          className="px-3 py-1 rounded-full bg-dark-muted hover:bg-rose-500/20 hover:text-rose-400 text-slate-200 text-xs font-semibold transition-all cursor-pointer"
                        >
                          {ant}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ol>
        </div>
      ))}
    </div>
  );
};

export default SenseMatrixCard;
