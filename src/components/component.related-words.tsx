import React from 'react';
import { cx } from '../ui/cx';

interface RelatedWordsProps {
  label?: string;
  words?: string[];
  onSelectWord?: (word: string) => void;
  className?: string;
  limit?: number;
  tone?: 'synonym' | 'antonym' | 'neutral';
}

export const RelatedWords: React.FC<RelatedWordsProps> = ({
  label,
  words,
  onSelectWord,
  className,
  limit = 8,
  tone = 'neutral',
}) => {
  const items = (words || []).map((word) => String(word || '').trim()).filter(Boolean).slice(0, limit);
  if (!items.length) return null;

  const badgeClass =
    tone === 'synonym'
      ? 'badge-pos-verb'
      : tone === 'antonym'
        ? 'badge-pos-adv'
        : 'badge-pos-other';

  return (
    <div className={cx('flex flex-wrap items-baseline gap-x-1.5 gap-y-1 text-[13.5px] leading-relaxed', className)}>
      {label ? (
        <span className={cx('inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider shrink-0', badgeClass)}>
          {label}
        </span>
      ) : null}
      {items.map((word, index) => (
        <React.Fragment key={`${word}-${index}`}>
          {index > 0 ? (
            <span className="text-content-muted/50 select-none" aria-hidden="true">
              ·
            </span>
          ) : null}
          <button
            type="button"
            onClick={() => onSelectWord?.(word)}
            title={`Look up ${word}`}
            className="related-word-link"
          >
            {word}
          </button>
        </React.Fragment>
      ))}
    </div>
  );
};

export default RelatedWords;
