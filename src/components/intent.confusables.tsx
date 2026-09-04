import React from 'react';
import { AiResult } from '../types';
import MarkdownRenderer from './component.markdown-renderer';
import { useDictionaryAudio } from '../composables/composable.dictionary';
import { IconScale, IconSpeaker } from './icons';

interface ConfusablesIntentProps {
  result: AiResult;
  targetLang?: string;
}

export const ConfusablesIntent: React.FC<ConfusablesIntentProps> = ({ result, targetLang }) => {
  const { playPronunciation } = useDictionaryAudio();
  const comparison = result.comparison;

  function speak(text: string, key: string) {
    if (!text) return;
    playPronunciation({ text, language: 'en-US', key });
  }

  return (
    <div className="space-y-4">
      {comparison?.coreDistinction ? (
        <div className="rounded-xl border border-teal-500/30 bg-teal-500/8 p-3.5 space-y-1.5 shadow-xs">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-teal-700 dark:text-teal-300 uppercase tracking-wider">
            <IconScale className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
            <span>Core Distinction</span>
          </div>
          <p className="text-[13.5px] leading-relaxed text-content font-medium">
            {comparison.coreDistinction}
          </p>
        </div>
      ) : null}

      {comparison?.rows?.length ? (
        <div className="space-y-1.5">
          <div className="text-[11px] font-bold text-content-muted uppercase tracking-wider">
            Comparison Matrix
          </div>
          <div className="overflow-x-auto rounded-xl border border-border shadow-xs">
            <table className="w-full text-[13px] text-left">
              <thead className="bg-muted text-content font-bold">
                <tr>
                  <th className="px-3 py-2.5 font-bold">Feature</th>
                  <th className="px-3 py-2.5 font-bold text-teal-700 dark:text-teal-300">
                    {comparison.leftTerm || 'Term A'}
                  </th>
                  <th className="px-3 py-2.5 font-bold text-teal-700 dark:text-teal-300">
                    {comparison.rightTerm || 'Term B'}
                  </th>
                </tr>
              </thead>
              <tbody>
                {comparison.rows.map((row) => (
                  <tr key={row.dimension} className="border-t border-border hover:bg-muted/40 transition-colors">
                    <td className="px-3 py-2 text-content-muted font-semibold">{row.dimension}</td>
                    <td className="px-3 py-2 text-content">{row.left}</td>
                    <td className="px-3 py-2 text-content">{row.right}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {comparison?.minimalPairs?.length ? (
        <div className="space-y-2">
          <div className="text-[11px] font-bold text-content-muted uppercase tracking-wider">
            Minimal-Pair Contrast
          </div>
          <div className="space-y-2.5">
            {comparison.minimalPairs.map((pair, idx) => {
              const keyA = `pair-${idx}-a`;
              const keyB = `pair-${idx}-b`;
              return (
                <div
                  key={idx}
                  className="rounded-xl border border-border bg-surface p-3 space-y-2 text-[13px] shadow-xs"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-start justify-between gap-2 pl-2.5 py-1 border-l-2 border-teal-500 bg-teal-500/5 rounded-r">
                      <p className="flex-1 text-content font-medium">"{pair.sentenceA}"</p>
                      <button
                        type="button"
                        onClick={() => speak(pair.sentenceA, keyA)}
                        title="Listen to first sentence"
                        className="h-6 w-6 text-content-muted hover:text-teal-600 dark:hover:text-teal-300 cursor-pointer flex items-center justify-center rounded hover:bg-muted"
                      >
                        <IconSpeaker className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="flex items-start justify-between gap-2 pl-2.5 py-1 border-l-2 border-indigo-500 bg-indigo-500/5 rounded-r">
                      <p className="flex-1 text-content font-medium">"{pair.sentenceB}"</p>
                      <button
                        type="button"
                        onClick={() => speak(pair.sentenceB, keyB)}
                        title="Listen to second sentence"
                        className="h-6 w-6 text-content-muted hover:text-indigo-600 dark:hover:text-indigo-300 cursor-pointer flex items-center justify-center rounded hover:bg-muted"
                      >
                        <IconSpeaker className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  {pair.explanation ? (
                    <p className="text-[12px] text-content-secondary italic pt-0.5">
                      {pair.explanation}
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {result.summary && !comparison?.coreDistinction && !comparison?.rows?.length && !comparison?.minimalPairs?.length ? (
        <div className="pt-2 border-t border-border/50 space-y-3">
          <MarkdownRenderer content={result.summary} targetLang={targetLang} />
        </div>
      ) : null}
    </div>
  );
};

export default ConfusablesIntent;
