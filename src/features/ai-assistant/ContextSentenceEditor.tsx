import React from 'react';
import TokenizedContext from '@/components/component.tokenized-context';
import { cx } from '@/ui/cx';

export interface ContextSentenceEditorProps {
  value: string;
  query?: string;
  error?: string;
  placeholder?: string;
  onChange: (value: string) => void;
  onDone: () => void;
  onSelectToken?: (word: string) => void;
  className?: string;
}

export const ContextSentenceEditor: React.FC<ContextSentenceEditorProps> = ({
  value,
  query,
  error,
  placeholder = 'Paste the sentence that contains this word...',
  onChange,
  onDone,
  onSelectToken,
  className,
}) => {
  return (
    <div
      className={cx(
        'rounded-2xl border border-border/80 bg-surface/90 p-3.5 space-y-2.5 shadow-xs',
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[12px] font-bold uppercase tracking-wider text-content-muted font-mono">
          Context Sentence
        </span>
        <button
          type="button"
          onClick={onDone}
          className="text-[12px] font-semibold text-accent hover:underline cursor-pointer"
        >
          Done
        </button>
      </div>

      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={2}
        placeholder={placeholder}
        className="ui-control w-full px-3 py-2 text-[13.5px] placeholder:text-content-muted resize-y min-h-[48px] rounded-xl"
      />

      {value.trim() ? (
        <TokenizedContext
          text={value}
          query={query}
          onSelectToken={onSelectToken}
        />
      ) : null}

      {error ? (
        <p className="text-[12px] text-rose-600 dark:text-rose-400 font-medium">
          {error}
        </p>
      ) : null}
    </div>
  );
};

export default React.memo(ContextSentenceEditor);
