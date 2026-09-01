import React, { useState } from 'react';
import { SentenceStructureItem } from '../types';
import { useDictionary } from '../composables/composable.dictionary';

interface SentenceBreakdownCardProps {
  structure?: SentenceStructureItem[];
  translation?: string;
}

export const SentenceBreakdownCard: React.FC<SentenceBreakdownCardProps> = ({
  structure,
  translation,
}) => {
  const { speakTTS } = useDictionary();
  const [copied, setCopied] = useState(false);

  function speakText(text?: string) {
    if (!text) return;
    speakTTS(text);
  }

  function copyTranslation(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    });
  }

  return (
    <div className="pt-3.5 border-t border-dark-border/50 space-y-3.5">
      <div className="flex items-center justify-between text-xs font-bold text-slate-200">
        <div className="flex items-center gap-2">
          <span className="text-teal-400 text-sm">🧩</span>
          <span className="text-teal-300 font-extrabold uppercase tracking-wider text-xs">
            SENTENCE STRUCTURE BREAKDOWN
          </span>
        </div>
        <span className="text-xs text-slate-400 font-mono font-semibold">Clause Analysis</span>
      </div>

      <div className="space-y-2.5">
        {structure?.map((item, index) => (
          <div
            key={index}
            className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1.5 pl-3.5 py-2.5 pr-3 rounded-r-lg border-l-2 border-teal-500/70 bg-dark-muted/50 text-sm group hover:bg-dark-muted/80 transition-colors"
          >
            <div className="flex-1 min-w-[200px] text-slate-100 font-serif text-base leading-relaxed flex items-center justify-between gap-2">
              <span>{item.text}</span>
              <button
                type="button"
                onClick={() => speakText(item.text)}
                title="Read clause aloud"
                className="opacity-0 group-hover:opacity-100 p-1 text-xs text-slate-400 hover:text-teal-300 transition-opacity cursor-pointer"
              >
                🔊
              </button>
            </div>
            <span className="ml-auto flex-shrink-0 px-3 py-0.5 rounded-full text-xs font-bold text-teal-300 bg-teal-500/15 border border-teal-500/25 capitalize font-mono">
              {item.role}
            </span>
          </div>
        ))}
      </div>

      {translation && (
        <div className="pl-4 py-3 pr-3.5 rounded-r-lg border-l-2 border-emerald-500/70 bg-emerald-500/5 text-sm leading-relaxed text-slate-200 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="font-extrabold text-emerald-400 text-xs uppercase tracking-wider">
              Context Translation:
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => speakText(translation)}
                title="Read translation aloud"
                className="px-2.5 py-1 rounded bg-dark-muted hover:bg-dark-border text-slate-200 hover:text-white text-xs cursor-pointer font-semibold"
              >
                🔊 Read
              </button>
              <button
                type="button"
                onClick={() => copyTranslation(translation)}
                title="Copy translation"
                className="px-2.5 py-1 rounded bg-dark-muted hover:bg-dark-border text-slate-200 hover:text-white text-xs cursor-pointer font-semibold"
              >
                {copied ? '✓ Copied' : '📋 Copy'}
              </button>
            </div>
          </div>
          <p className="text-slate-100 font-serif text-base leading-relaxed">{translation}</p>
        </div>
      )}
    </div>
  );
};

export default SentenceBreakdownCard;
