import React, { useState } from 'react';
import { AiResult } from '../types';
import MarkdownRenderer from './component.markdown-renderer';
import { useDictionaryAudio } from '../composables/composable.dictionary';
import { IconCheck, IconCopy, IconEdit, IconSpeaker } from './icons';
import { cx } from '../ui/cx';

interface RephraseIntentProps {
  result: AiResult;
  targetLang?: string;
}

function getStyleBadgeClass(style: string): string {
  switch (style) {
    case 'simplified':
      return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30';
    case 'formal':
      return 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30';
    case 'idiomatic':
      return 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30';
    default:
      return 'bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-500/30';
  }
}

export const RephraseIntent: React.FC<RephraseIntentProps> = ({ result, targetLang }) => {
  const { playPronunciation } = useDictionaryAudio();
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const styles = result.rephraseStyles;

  function speak(text: string, key: string) {
    if (!text) return;
    playPronunciation({ text, language: 'en-US', key });
  }

  function copyText(text: string, index: number) {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 1800);
    });
  }

  return (
    <div className="space-y-4">
      {styles?.length ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between pb-1 border-b border-border/40">
            <span className="flex items-center gap-1.5 text-[12px] font-extrabold uppercase tracking-wider text-teal-600 dark:text-teal-400">
              <IconEdit className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
              <span>Three Rewrite Styles</span>
            </span>
            <span className="text-[11px] text-content-muted font-mono">1 Click · 3 Tones</span>
          </div>

          <div className="space-y-2.5">
            {styles.map((item, idx) => {
              const speakKey = `rephrase-${idx}`;
              const isCopied = copiedIndex === idx;
              return (
                <article
                  key={`${item.style}-${idx}`}
                  className="rounded-xl border border-border bg-surface p-3 space-y-2 text-[13.5px] shadow-xs hover:border-teal-500/35 transition-all"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={cx(
                        'px-2 py-0.5 rounded-full text-[10.5px] font-bold tracking-wider uppercase border font-mono',
                        getStyleBadgeClass(item.style),
                      )}
                    >
                      {item.label}
                    </span>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => speak(item.text, speakKey)}
                        title="Read aloud"
                        className="h-6 w-6 text-content-muted hover:text-teal-600 dark:hover:text-teal-300 cursor-pointer flex items-center justify-center rounded hover:bg-muted"
                      >
                        <IconSpeaker className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => copyText(item.text, idx)}
                        title="Copy rewritten sentence"
                        className="h-6 w-6 text-content-muted hover:text-content cursor-pointer flex items-center justify-center rounded hover:bg-muted"
                      >
                        {isCopied ? (
                          <IconCheck className="w-3.5 h-3.5 text-emerald-500" />
                        ) : (
                          <IconCopy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  <p className="text-content font-medium leading-relaxed pl-2.5 border-l-2 border-teal-500/60 bg-muted/25 py-1 rounded-r">
                    "{item.text}"
                  </p>

                  {item.note ? (
                    <p className="text-[12px] text-content-secondary leading-normal pt-0.5">
                      {item.note}
                    </p>
                  ) : null}
                </article>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* Markdown fallback when no structured styles parsed */}
      {result.summary && !styles?.length ? (
        <div className="pt-2 border-t border-border/50 space-y-3">
          <MarkdownRenderer content={result.summary} targetLang={targetLang} />
        </div>
      ) : null}
    </div>
  );
};

export default RephraseIntent;
