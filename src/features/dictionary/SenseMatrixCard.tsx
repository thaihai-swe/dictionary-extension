import React, { useMemo, useState } from 'react';
import { Meaning } from '@/types';
import { useDictionaryAudio } from '@/composables/composable.dictionary';
import { useStorage } from '@/composables/composable.storage';
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
  return 'badge-pos-other';
}

export const SenseMatrixCard: React.FC<SenseMatrixCardProps> = ({ meanings }) => {
  const groupedMeanings = meanings || [];
  const { playPronunciation, playingKey } = useDictionaryAudio();
  const { settings } = useStorage();
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
        <div className="sticky top-0 z-10 -mx-1 px-1 py-1.5 bg-surface border-b border-border flex items-center gap-1.5 overflow-x-auto select-none">
          <button
            type="button"
            onClick={() => setSelectedPos('all')}
            className={cx(
              'h-6 px-2.5 rounded-full text-[11px] font-semibold transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1',
              selectedPos === 'all'
                ? 'bg-accent text-accent-foreground shadow-2xs font-bold'
                : 'bg-muted hover:bg-elevated text-content-secondary hover:text-content border border-border',
            )}
          >
            <span>All</span>
            <span className="font-mono text-[10px] opacity-75 font-normal">({totalDefinitions})</span>
          </button>
          {distinctPosList.map((item) => {
            const isActive = selectedPos.toLowerCase() === item.pos.toLowerCase();
            return (
              <button
                key={item.pos}
                type="button"
                onClick={() => setSelectedPos(item.pos)}
                className={cx(
                  'h-6 px-2.5 rounded-full text-[11px] font-semibold uppercase tracking-wider transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1',
                  isActive
                    ? 'bg-accent text-accent-foreground shadow-2xs font-bold'
                    : 'bg-muted hover:bg-elevated text-content-secondary hover:text-content border border-border',
                )}
              >
                <span>{item.pos}</span>
                <span className="font-mono text-[10px] opacity-75 font-normal">({item.count})</span>
              </button>
            );
          })}
        </div>
      ) : null}

      {filteredMeanings.map((meaning, mIdx) => (
        <div
          key={meaning.partOfSpeech || mIdx}
          className="space-y-3 rounded-lg border border-border bg-surface p-3.5"
        >
          <div className="flex items-center justify-between">
            <span
              className={cx(
                'inline-flex items-center px-2 py-0.5 rounded-md font-semibold text-[10.5px] uppercase tracking-wider',
                getPosBadgeClass(meaning.partOfSpeech),
              )}
            >
              {meaning.partOfSpeech}
            </span>
          </div>

          <ol className="space-y-3 text-content">
            {meaning.definitions.map((def, dIdx) => {
              const listenKey = `sense-${mIdx}-${dIdx}`;
              const isPlaying = playingKey === listenKey;
              return (
                <li key={dIdx} className="space-y-1.5">
                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-accent text-[13px] mt-0.5 flex-shrink-0 font-mono select-none">
                      {dIdx + 1}.
                    </span>
                    <span className="font-serif text-[15px] text-content leading-7 tracking-[0.002em]">
                      {def.definition}
                    </span>
                  </div>

                  {def.example ? (
                    <ExampleSentence
                      className="ml-5"
                      english={def.example}
                      translation={def.exampleTranslation}
                      targetLang={settings.translateTargetLanguage}
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
