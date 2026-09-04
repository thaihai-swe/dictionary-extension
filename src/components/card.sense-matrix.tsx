import React, { useMemo } from 'react';
import { Meaning } from '../types';
import { useDictionaryAudio } from '../composables/composable.dictionary';
import { mergeMeanings } from '../shared/enrichment';
import { cx } from '../ui/cx';
import { IconSpeaker } from './icons';
import RelatedWords from './component.related-words';

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

  return (
    <div className="space-y-5 pt-0.5">
      {groupedMeanings.map((meaning, mIdx) => (
        <div
          key={meaning.partOfSpeech || mIdx}
          className="space-y-3 border-b border-border/70 pb-4 last:border-b-0 last:pb-0"
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
            {meaning.source ? (
              <span className="text-[10.5px] text-content-muted font-mono">
                {meaning.source}
              </span>
            ) : null}
          </div>

          <ol className="space-y-3 text-content">
            {meaning.definitions.map((def, dIdx) => {
              const listenKey = `sense-${mIdx}-${dIdx}`;
              const isPlaying = playingKey === listenKey;
              return (
                <li key={dIdx} className="space-y-1.5">
                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-teal-700 dark:text-teal-400 text-[13px] mt-0.5 flex-shrink-0 font-mono select-none">
                      {dIdx + 1}.
                    </span>
                    <span className="text-[14.5px] text-content leading-relaxed">
                      {def.definition}
                    </span>
                  </div>

                  {def.example ? (
                    <div className="ml-5 pl-3 py-1.5 pr-2 border-l-2 border-teal-500/50 bg-muted/40 rounded-r-md text-content-secondary text-[13.5px] leading-relaxed flex items-center justify-between gap-2">
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
                            ? 'bg-teal-500/20 text-teal-700 dark:text-teal-300 border-teal-500/40'
                            : 'bg-surface text-content-secondary hover:text-content border-border',
                        )}
                        aria-pressed={isPlaying}
                      >
                        <IconSpeaker className="w-3 h-3 text-teal-600 dark:text-teal-400" />
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
        </div>
      ))}
    </div>
  );
};

export default SenseMatrixCard;
