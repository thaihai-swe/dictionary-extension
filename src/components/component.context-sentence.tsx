import React from 'react';
import { IconQuote } from './icons';
import { cx } from '@/ui/cx';

export interface ContextSentenceProps {
  sentence?: string;
  targetWord?: string;
  query?: string;
  variant?: 'integrated' | 'card';
  onEdit?: () => void;
  className?: string;
}

export function highlightText(sentence: string, targetWord?: string, queryWord?: string): React.ReactNode {
  const term = (targetWord || queryWord || '').trim();
  if (!sentence || !term) return sentence;

  const matchTerm = sentence.toLowerCase().includes(term.toLowerCase())
    ? term
    : (queryWord && sentence.toLowerCase().includes(queryWord.toLowerCase()) ? queryWord.trim() : '');

  if (!matchTerm) return sentence;

  const escaped = matchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  const parts = sentence.split(regex);

  if (parts.length <= 1) return sentence;

  return parts.map((part, index) =>
    part.toLowerCase() === matchTerm.toLowerCase() ? (
      <mark
        key={index}
        className="bg-accent/20 text-accent font-semibold px-1 py-0.5 rounded border border-accent/30 not-italic"
      >
        {part}
      </mark>
    ) : (
      part
    ),
  );
}

export const ContextSentence: React.FC<ContextSentenceProps> = ({
  sentence,
  targetWord,
  query,
  variant = 'card',
  onEdit,
  className,
}) => {
  const cleanSentence = String(sentence || '').replace(/\s+/g, ' ').trim();
  if (!cleanSentence) return null;

  if (variant === 'card') {
    return (
      <div
        className={cx(
          'w-full rounded-xl border border-accent/25 bg-accent/[0.04] p-2.5 px-3 flex items-start justify-between gap-2.5 shadow-2xs',
          className,
        )}
      >
        <div className="space-y-1 min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold font-mono text-[10px] uppercase text-accent tracking-wider">
              Context Sentence
            </span>
          </div>
          <p className="text-[13px] text-content leading-relaxed break-words font-serif">
            {highlightText(cleanSentence, targetWord, query)}
          </p>
        </div>
        {onEdit ? (
          <button
            type="button"
            onClick={onEdit}
            className="text-[11px] font-semibold text-accent hover:underline cursor-pointer shrink-0 mt-0.5 px-1.5 py-0.5 rounded hover:bg-accent/10 transition-colors"
            title="Edit context sentence"
          >
            Edit
          </button>
        ) : null}
      </div>
    );
  }

  // Integrated variant for Dictionary Tab (strictly read-only, no edit controls)
  return (
    <div
      className={cx(
        'px-3.5 py-1.5 border-t border-border/50 bg-muted/20 flex items-start gap-2',
        className,
      )}
    >
      <IconQuote className="w-3.5 h-3.5 text-accent opacity-75 shrink-0 mt-0.5" />
      <p className="font-serif text-[12.5px] sm:text-[13px] text-content-secondary leading-snug flex-1 break-words">
        {highlightText(cleanSentence, targetWord, query)}
      </p>
    </div>
  );
};

export default ContextSentence;
