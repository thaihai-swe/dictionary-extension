import React from 'react';
import { AiResult } from '../types';
import MarkdownRenderer from './component.markdown-renderer';
import AiLexicalExtras from './card.ai-lexical-extras';

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
        <div className="pt-2 border-t border-border/50 space-y-3">
          <MarkdownRenderer content={result.summary} targetLang={targetLang} />
        </div>
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
