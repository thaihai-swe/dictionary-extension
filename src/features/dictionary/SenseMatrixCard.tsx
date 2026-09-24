import React, { useMemo, useState } from 'react';
import { Meaning } from '@/types';
import { useDictionaryAudio } from '@/composables/composable.dictionary';
import { useSetting } from '@/composables/composable.storage';
import { cx } from '@/ui/cx';
import ExampleSentence from '@/components/component.example-sentence';

interface SenseMatrixCardProps {
  meanings: Meaning[];
}

function getPosBadgeClass(pos: string): string {
  const p = (pos || '').toLowerCase();
  if (p.includes('noun')) return 'badge-pos-noun';
  if (p.includes('verb')) return 'badge-pos-verb';
  if (p.includes('adj')) return 'badge-pos-adj';
  if (p.includes('adv')) return 'badge-pos-adv';
  if (p.includes('slang')) return 'badge-pos-slang';
  if (p.includes('phrase') || p.includes('idiom')) return 'badge-pos-phrase';
  return 'badge-pos-other';
}

export const SenseMatrixCard: React.FC<SenseMatrixCardProps> = ({ meanings }) => {
  const groupedMeanings = meanings || [];
  const { playPronunciation, playingKey } = useDictionaryAudio();
  const targetLang = useSetting('translateTargetLanguage');
  const [selectedPos, setSelectedPos] = useState<string>('all');

  const distinctPosList = useMemo(() => {
    const list: Array<{ pos: string; count: number }> = [];
    groupedMeanings.forEach((m) => {
      const pos = m.partOfSpeech || 'other';
      const existing = list.find((item) => item.pos.toLowerCase() === pos.toLowerCase());
      if (existing) {
        existing.count += m.definitions?.length || 0;
      } else {
        list.push({ pos, count: m.definitions?.length || 0 });
      }
    });
    return list;
  }, [groupedMeanings]);

  const totalDefinitions = useMemo(
    () => groupedMeanings.reduce((acc, m) => acc + (m.definitions?.length || 0), 0),
    [groupedMeanings],
  );

  const filteredMeanings = useMemo(() => {
    if (selectedPos === 'all') return groupedMeanings;
    return groupedMeanings.filter(
      (m) => (m.partOfSpeech || 'other').toLowerCase() === selectedPos.toLowerCase(),
    );
  }, [groupedMeanings, selectedPos]);

  return (
    <div className="space-y-4 pt-0.5">
      {distinctPosList.length > 1 ? (
        <div className="-mx-1 px-1 py-1.5 bg-surface/80 rounded-xl border border-border-subtle flex items-center gap-1.5 overflow-x-auto select-none">
          <button
            type="button"
            onClick={() => setSelectedPos('all')}
            className={cx(
              'h-7 px-3 rounded-lg text-[12px] font-semibold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5',
              selectedPos === 'all'
                ? 'bg-accent text-accent-foreground shadow-xs font-bold'
                : 'bg-muted/60 hover:bg-elevated text-content-secondary hover:text-content border border-border/60',
            )}
          >
            <span>All</span>
            <span className="font-mono text-[11px] opacity-80 font-normal">({totalDefinitions})</span>
          </button>
          {distinctPosList.map((item) => {
            const isActive = selectedPos.toLowerCase() === item.pos.toLowerCase();
            return (
              <button
                key={item.pos}
                type="button"
                onClick={() => setSelectedPos(item.pos)}
                className={cx(
                  'h-7 px-3 rounded-lg text-[12px] font-semibold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5',
                  isActive
                    ? 'bg-accent text-accent-foreground shadow-xs font-bold'
                    : 'bg-muted/60 hover:bg-elevated text-content-secondary hover:text-content border border-border/60',
                )}
              >
                <span>{item.pos}</span>
                <span className="font-mono text-[11px] opacity-80 font-normal">({item.count})</span>
              </button>
            );
          })}
        </div>
      ) : null}

      {filteredMeanings.map((meaning, mIdx) => (
        <div
          key={meaning.partOfSpeech || mIdx}
          className="meaning-card space-y-3 rounded-2xl border border-border/80 bg-surface p-4 shadow-xs"
        >
          <div className="flex items-center justify-between">
            <span
              className={cx(
                'inline-flex items-center px-2.5 py-0.5 rounded-md font-bold text-[11px] uppercase tracking-wider font-mono',
                getPosBadgeClass(meaning.partOfSpeech),
              )}
            >
              {meaning.partOfSpeech}
            </span>
          </div>

          <ol className="space-y-3.5 text-content">
            {meaning.definitions.map((def, dIdx) => {
              const listenKey = `sense-${mIdx}-${dIdx}`;
              const isPlaying = playingKey === listenKey;
              return (
                <li key={dIdx} className="space-y-2">
                  <div className="flex items-start gap-2.5">
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-muted/80 text-accent text-[11px] font-bold font-mono shrink-0 select-none mt-0.5 border border-border-subtle">
                      {dIdx + 1}
                    </span>
                    <span className="font-serif text-reading text-content tracking-[0.002em] leading-relaxed">
                      {def.definition}
                    </span>
                  </div>

                  {def.example ? (
                    <ExampleSentence
                      className="ml-7"
                      english={def.example}
                      translation={def.exampleTranslation}
                      targetLang={targetLang}
                      isPlaying={isPlaying}
                      onListen={() =>
                        playPronunciation({
                          text: def.example!,
                          language: 'en-US',
                          key: listenKey,
                        })
                      }
                    />
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

export default React.memo(SenseMatrixCard);
