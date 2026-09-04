import React, { useMemo } from 'react';
import { cx } from '../ui/cx';

interface TokenizedContextProps {
  text: string;
  query?: string;
  onSelectToken?: (word: string) => void;
}

interface Token {
  text: string;
  isWord: boolean;
  isQuery: boolean;
}

export const TokenizedContext: React.FC<TokenizedContextProps> = ({ text, query, onSelectToken }) => {
  const tokens = useMemo<Token[]>(() => {
    if (!text) return [];
    const rawTokens = text.split(/(\s+|[.,!?;:"'()\[\]{}]+)/);
    const cleanQuery = (query || '').toLowerCase().trim();

    return rawTokens.filter(Boolean).map((token) => {
      const isWord = /^[a-zA-Z0-9'-]+$/.test(token);
      const isQuery = isWord && cleanQuery.length > 0 && token.toLowerCase() === cleanQuery;
      return { text: token, isWord, isQuery };
    });
  }, [text, query]);

  return (
    <div className="p-3 rounded-lg border border-border bg-muted/60 text-[13px] leading-relaxed font-sans text-content">
      {tokens.map((token, idx) =>
        token.isWord ? (
          <span
            key={idx}
            onClick={() => onSelectToken?.(token.text)}
            className={cx(
              'inline-block cursor-pointer rounded px-0.5 transition-colors',
              token.isQuery
                ? 'bg-teal-500/25 text-teal-600 dark:text-teal-300 font-bold border-b-2 border-teal-500'
                : 'hover:bg-teal-500/20 hover:text-teal-600 dark:hover:text-teal-300 text-content',
            )}
            title={`Click to lookup '${token.text}'`}
          >
            {token.text}
          </span>
        ) : (
          <span key={idx} className="text-content-secondary">
            {token.text}
          </span>
        ),
      )}
    </div>
  );
};

export default TokenizedContext;
