import React, { useState } from 'react';
import { SentenceStructureItem } from '@/types';
import { useDictionaryAudio } from '@/composables/composable.dictionary';
import { IconCheck, IconCopy, IconPuzzle, IconSpeaker } from '@/components/icons';

interface SentenceBreakdownCardProps {
  structure?: SentenceStructureItem[];
  translation?: string;
}

export const SentenceBreakdownCard: React.FC<SentenceBreakdownCardProps> = ({
  structure,
  translation,
}) => {
  const { playPronunciation } = useDictionaryAudio();
  const [copied, setCopied] = useState(false);

  function speakText(text: string) {
    if (!text) return;
    playPronunciation({ text, language: 'en-US', key: `clause-${text.slice(0, 10)}` });
  }

  function copyTranslation(text: string) {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  if (!structure?.length && !translation) return null;

  return (
    <div className="space-y-4 pt-1">
      <div className="flex items-center justify-between pb-1 border-b border-border/40">
        <span className="flex items-center gap-1.5 text-[12px] font-extrabold uppercase tracking-wider text-teal-600 dark:text-gold-300">
          <IconPuzzle className="w-4 h-4 text-teal-600 dark:text-gold-300" />
          <span>Sentence Breakdown</span>
        </span>
        <span className="text-[11px] text-content-muted font-mono font-medium">Clause Analysis</span>
      </div>

      <div className="space-y-2">
        {structure?.map((item, index) => (
          <div
            key={index}
            className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1.5 pl-3.5 py-2.5 pr-3 rounded-r-xl border-l-2 border-teal-500/70 dark:border-l-gold-300/70 bg-surface border border-border text-sm group hover:border-teal-500/40 dark:hover:border-gold-300/40 transition-all shadow-xs"
          >
            <div className="flex-1 min-w-[200px] space-y-0.5">
              <div className="text-content text-[14px] leading-relaxed flex items-center justify-between gap-2">
                <span className="font-medium text-content">{item.text}</span>
                <button
                  type="button"
                  onClick={() => speakText(item.text)}
                  title="Read clause aloud"
                  className="opacity-0 group-hover:opacity-100 h-7 w-7 text-content-muted hover:text-teal-600 dark:hover:text-gold-200 transition-opacity cursor-pointer rounded-md hover:bg-muted flex items-center justify-center"
                >
                  <IconSpeaker className="w-3.5 h-3.5" />
                </button>
              </div>
              {item.explanation ? (
                <p className="text-[12px] text-content-secondary leading-normal">
                  {item.explanation}
                </p>
              ) : null}
            </div>
            <span className="ml-auto flex-shrink-0 px-2.5 py-0.5 rounded-full text-[11px] font-semibold text-teal-600 dark:text-gold-200 bg-teal-500/15 dark:bg-gold-300/15 border border-teal-500/25 dark:border-gold-300/25 capitalize font-mono">
              {item.role}
            </span>
          </div>
        ))}
      </div>

      {translation && (
        <div className="pl-4 py-3 pr-3.5 rounded-r-xl border-l-2 border-emerald-500/70 bg-emerald-500/10 text-[14px] leading-relaxed text-content-secondary space-y-1.5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="font-extrabold text-emerald-600 dark:text-emerald-400 text-[11px] uppercase tracking-wider">
              Context Translation:
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => speakText(translation)}
                title="Read translation aloud"
                className="h-[28px] px-2.5 rounded-lg bg-muted hover:bg-elevated text-content-secondary hover:text-content text-[12px] cursor-pointer font-medium flex items-center gap-1.5 border border-border shadow-xs"
              >
                <IconSpeaker className="w-3.5 h-3.5 text-teal-500 dark:text-gold-300" />
                <span>Read</span>
              </button>
              <button
                type="button"
                onClick={() => copyTranslation(translation)}
                title="Copy translation"
                className="h-[28px] px-2.5 rounded-lg bg-muted hover:bg-elevated text-content-secondary hover:text-content text-[12px] cursor-pointer font-medium flex items-center gap-1.5 border border-border shadow-xs"
              >
                {copied ? (
                  <>
                    <IconCheck className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <IconCopy className="w-3.5 h-3.5 text-content-secondary" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
          </div>
          <p className="font-medium text-[15px] text-content leading-relaxed">{translation}</p>
        </div>
      )}
    </div>
  );
};

export default SentenceBreakdownCard;
