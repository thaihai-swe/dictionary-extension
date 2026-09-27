import React from 'react';
import { cx } from '@/ui/cx';

export interface ResultSkeletonProps {
  variant?: 'dictionary' | 'ai' | 'compact';
  className?: string;
}

export const ResultSkeleton: React.FC<ResultSkeletonProps> = ({
  variant = 'dictionary',
  className,
}) => {
  if (variant === 'compact') {
    return (
      <div
        className={cx(
          'p-4 space-y-3 rounded-2xl border border-border/80 bg-surface shadow-xs',
          className,
        )}
        aria-busy="true"
        aria-live="polite"
      >
        <div className="h-6 skeleton-shimmer rounded-lg w-1/3" />
        <div className="h-4 skeleton-shimmer rounded-md w-3/5" />
        <div className="h-16 skeleton-shimmer rounded-xl mt-1" />
      </div>
    );
  }

  if (variant === 'ai') {
    return (
      <div
        className={cx(
          'p-4 rounded-2xl border border-border/80 bg-surface/90 shadow-xs space-y-3.5',
          className,
        )}
        aria-busy="true"
        aria-live="polite"
      >
        <div className="flex items-center justify-between pb-1.5 border-b border-border/60">
          <div className="h-3.5 skeleton-shimmer rounded w-1/3" />
          <div className="h-3 skeleton-shimmer rounded w-16" />
        </div>
        <div className="space-y-2">
          <div className="h-3.5 skeleton-shimmer rounded w-11/12" />
          <div className="h-3.5 skeleton-shimmer rounded w-full" />
          <div className="h-3.5 skeleton-shimmer rounded w-4/5" />
        </div>
        <div className="h-16 skeleton-shimmer rounded-lg mt-2" />
      </div>
    );
  }

  // Default dictionary skeleton
  return (
    <div
      className={cx(
        'p-4 sm:p-5 space-y-3.5 rounded-2xl border border-border bg-surface shadow-2xs',
        className,
      )}
      aria-busy="true"
      aria-live="polite"
    >
      <div className="flex items-center justify-between pb-2 border-b border-border/60">
        <div className="h-7 sm:h-8 skeleton-shimmer rounded-lg w-2/5" />
        <div className="h-5 skeleton-shimmer rounded-full w-20" />
      </div>
      <div className="flex gap-2">
        <div className="h-6.5 skeleton-shimmer rounded-md w-24" />
        <div className="h-6.5 skeleton-shimmer rounded-md w-28" />
      </div>
      <div className="space-y-2 pt-1">
        <div className="h-4 skeleton-shimmer rounded w-11/12" />
        <div className="h-4 skeleton-shimmer rounded w-4/5" />
        <div className="h-4 skeleton-shimmer rounded w-3/5" />
      </div>
      <div className="h-20 skeleton-shimmer rounded-xl mt-2" />
    </div>
  );
};

export default ResultSkeleton;
