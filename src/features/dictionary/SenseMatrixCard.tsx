import React, { useMemo, useState } from 'react';
import { Meaning } from '@/types';
import { useDictionaryAudio } from '@/composables/composable.dictionary';
import { mergeMeanings } from '@/shared/enrichment';
import { cx } from '@/ui/cx';
import { IconSpeaker } from '@/components/icons';
import RelatedWords from '@/components/component.related-words';

interface SenseMatrixCardProps {
  meanings: Meaning[];
  onSelectWord?: (word: string) => void;
}

function getPosBadgeClass(pos: string): string {
  const p = (pos || '').toLowerCase();
  if (p.includes('noun')) return 'badge-pos-noun';
  if (p.includes('verb')) return 'badge-pos-verb';
  if (p.includes('adj')) return 'badge-pos-adj';
  if (p.includes('adv')) return 'badge-pos-adv';
  return 'badge-pos-other';
}

export const SenseMatrixCard: React.FC<SenseMatrixCardProps> = ({ meanings, onSelectWord }) => {
  const groupedMeanings = useMemo(() => mergeMeanings(meanings || [], []), [meanings]);
  const { playPronunciation, playingKey } = useDictionaryAudio();
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
        <div className="sticky top-0 z-10 -mx-1 px-1 py-1.5 bg-surface/95 dark:bg-surface/90 backdrop-blur-md border-b border-border flex items-center gap-1.5 overflow-x-auto select-none">
          <button
            type="button"
            onClick={() => setSelectedPos('all')}
            className={cx(
              'h-6 px-2.5 rounded-full text-[11px] font-semibold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1',
              selectedPos === 'all'
                ? 'bg-teal-700 text-white dark:bg-gold-300 dark:text-neutral-950 shadow-2xs'
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
                  'h-6 px-2.5 rounded-full text-[11px] font-semibold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap flex items-center gap-1',
                  isActive
                    ? 'bg-teal-700 text-white dark:bg-gold-300 dark:text-neutral-950 shadow-2xs'
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
          className="space-y-3 border-b border-border pb-4 last:border-b-0 last:pb-0"
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
                    <span className="font-semibold text-teal-700 dark:text-gold-300 text-[13px] mt-0.5 flex-shrink-0 font-mono select-none">
                      {dIdx + 1}.
                    </span>
                    <span className="text-[14.5px] text-content leading-relaxed">
                      {def.definition}
                    </span>
                  </div>

                  {def.example ? (
                    <div className="ml-5 pl-3 py-1.5 pr-2 border-l-2 border-teal-500/50 dark:border-l-gold-300/40 bg-muted/40 rounded-r-md text-content-secondary text-[13.5px] leading-relaxed flex items-center justify-between gap-2">
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
                        title="Listen to example sentence"
                        className={cx(
                          'h-[24px] px-2 rounded border text-[11px] flex-shrink-0 flex items-center gap-1 cursor-pointer',
                          isPlaying
                            ? 'bg-teal-500/20 text-teal-700 dark:bg-gold-300/15 dark:text-gold-200 border-teal-500/40 dark:border-gold-300/40 audio-playing-indicator'
                            : 'bg-surface text-content-secondary hover:text-content border-border',
                        )}
                        aria-pressed={isPlaying}
                      >
                        <IconSpeaker className="w-3 h-3 text-teal-600 dark:text-gold-300" />
                        <span>Listen</span>
                      </button>
                    </div>
                  ) : null}

                  {def.synonyms && def.synonyms.length > 0 ? (
                    <RelatedWords
                      label="Synonyms"
                      tone="synonym"
                      words={def.synonyms}
                      onSelectWord={onSelectWord}
                      className="ml-5"
                    />
                  ) : null}

                  {def.antonyms && def.antonyms.length > 0 ? (
                    <RelatedWords
                      label="Antonyms"
                      tone="antonym"
                      words={def.antonyms}
                      onSelectWord={onSelectWord}
                      className="ml-5"
                    />
                  ) : null}
                </li>
              );
            })}
          </ol>

          {meaning.synonyms && meaning.synonyms.length > 0 ? (
            <RelatedWords
              label="Synonyms"
              tone="synonym"
              words={meaning.synonyms}
              onSelectWord={onSelectWord}
            />
          ) : null}

          {meaning.antonyms && meaning.antonyms.length > 0 ? (
            <RelatedWords
              label="Antonyms"
              tone="antonym"
              words={meaning.antonyms}
              onSelectWord={onSelectWord}
            />
          ) : null}
        </div>
      ))}
    </div>
  );
};

export default SenseMatrixCard;
