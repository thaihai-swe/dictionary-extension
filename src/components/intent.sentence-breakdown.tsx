import React from 'react';
import { AiResult } from '../types';
import SentenceBreakdownCard from './card.sentence-breakdown';
import MarkdownRenderer from './component.markdown-renderer';

interface SentenceBreakdownIntentProps {
  result: AiResult;
  targetLang?: string;
}

export const SentenceBreakdownIntent: React.FC<SentenceBreakdownIntentProps> = ({
  result,
  targetLang,
}) => {
  return (
    <div className="space-y-4">
      {result.structure?.length ? (
        <SentenceBreakdownCard structure={result.structure} translation={result.translation} />
      ) : null}

      {result.phrases?.length ? (
        <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/10 p-3 space-y-2">
          <div className="text-[11px] font-extrabold text-indigo-300 uppercase tracking-wider">
            Phrase parsing
          </div>
          {result.phrases.map((phrase, index) => (
            <div key={`${phrase.text}-${index}`} className="text-xs text-slate-200">
              <span className="font-bold text-teal-300">{phrase.text}</span>
              {phrase.type ? <span className="text-slate-400"> · {phrase.type}</span> : null}
              {phrase.meaning ? <span> — {phrase.meaning}</span> : null}
            </div>
          ))}
        </div>
      ) : null}

      {result.summary && !result.structure?.length ? (
        <div className="pt-2 border-t border-dark-border/50 space-y-3">
          <MarkdownRenderer content={result.summary} targetLang={targetLang} />
        </div>
      ) : null}
    </div>
  );
};

export default SentenceBreakdownIntent;
