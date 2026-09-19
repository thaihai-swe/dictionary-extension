import React from 'react';
import { IconChevronDown } from '@/components/icons';
import type { DictionarySourceSummary } from '@/types';

interface SourcesDisclosureProps {
  sources: DictionarySourceSummary[];
}

function SourcesDisclosure({ sources }: SourcesDisclosureProps) {
  if (!sources.length) return null;

  const contributedCount = sources.filter((source) => source.status === 'contributed').length;
  const noUsableResultCount = sources.filter((source) => source.status === 'not_found').length;

  return (
    <details className="ui-disclosure group rounded-xl border border-border/70 bg-muted/25 px-3 py-2">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-[13px] font-semibold text-content-secondary outline-none focus-visible:ring-2 focus-visible:ring-accent/40 rounded-lg">
        <span className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
          <span>Sources</span>
          <span className="font-mono text-[12px] text-content-muted" aria-live="polite">
            {contributedCount} contributed
            {noUsableResultCount ? ` · ${noUsableResultCount} no usable result` : ''}
          </span>
        </span>
        <IconChevronDown className="h-3.5 w-3.5 text-content-muted transition-transform group-open:rotate-180" aria-hidden="true" />
      </summary>
      <div className="mt-2 flex flex-wrap gap-1.5" aria-label="Dictionary provider sources">
        {sources.map((source) => (
          <span
            key={source.providerId}
            className={[
              'rounded-full border px-2 py-1 text-[12px] font-medium capitalize',
              source.status === 'contributed'
                ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                : source.status === 'cancelled'
                  ? 'border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300'
                  : source.status === 'failed'
                    ? 'border-rose-500/25 bg-rose-500/10 text-rose-700 dark:text-rose-300'
                    : 'border-border bg-surface text-content-muted',
            ].join(' ')}
            title={`${source.label}: ${source.status === 'not_found' ? 'no usable result' : source.status}`}
            aria-label={`${source.label}: ${source.status === 'not_found' ? 'no usable result' : source.status}`}
          >
            {source.label}
          </span>
        ))}
      </div>
    </details>
  );
}

export default React.memo(SourcesDisclosure);
