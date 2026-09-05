import React from 'react';
import { AiResult } from '@/types';
import SentenceBreakdownCard from './SentenceBreakdownCard';
import MarkdownRenderer from '@/components/component.markdown-renderer';

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
        <div className="rounded-xl border border-border bg-muted p-3 space-y-2">
          <div className="text-[12px] font-extrabold text-content uppercase tracking-wider">
            Phrase parsing
          </div>
          {result.phrases.map((phrase, index) => (
            <div key={`${phrase.text}-${index}`} className="text-[13px] text-content">
              <span className="font-bold text-accent">{phrase.text}</span>
              {phrase.type ? <span className="text-content-muted"> · {phrase.type}</span> : null}
              {phrase.meaning ? <span className="text-content-secondary"> — {phrase.meaning}</span> : null}
            </div>
          ))}
        </div>
      ) : null}

      {result.summary && !result.structure?.length ? (
        <div className="pt-2 border-t border-border/50 space-y-3">
          <MarkdownRenderer content={result.summary} targetLang={targetLang} />
        </div>
      ) : null}
    </div>
  );
};

export default SentenceBreakdownIntent;
