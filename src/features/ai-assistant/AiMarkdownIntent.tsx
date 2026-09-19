import React from 'react';
import { AiResult } from '@/types';
import MarkdownRenderer from '@/components/component.markdown-renderer';
import AiLexicalExtras from './AiLexicalExtrasCard';

interface AiMarkdownIntentProps {
  result: AiResult;
  targetLang?: string;
  onSelectWord?: (word: string) => void;
}

export const AiMarkdownIntent: React.FC<AiMarkdownIntentProps> = ({
  result,
  targetLang,
  onSelectWord,
}) => {
  return (
    <div className="space-y-4">
      {result.summary ? (
        <section className="p-3.5 rounded-lg border border-border bg-surface space-y-3">
          <MarkdownRenderer content={result.summary} targetLang={targetLang} />
        </section>
      ) : null}
      <AiLexicalExtras
        query={result.query}
        profile={result.lexicalProfile}
        intent={result.type}
        onSelectWord={onSelectWord}
      />
    </div>
  );
};

export default AiMarkdownIntent;
