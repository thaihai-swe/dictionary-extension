import React from 'react';
import { cx } from '@/ui/cx';

export interface ErrorBannerProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}

export const ErrorBanner: React.FC<ErrorBannerProps> = ({
  title,
  message,
  onRetry,
  retryLabel = 'Try Again',
  className,
}) => {
  return (
    <div
      role="alert"
      className={cx(
        'p-3.5 sm:p-4 rounded-xl bg-rose-500/8 border border-rose-500/25 text-[14px] text-rose-700 dark:text-rose-400 space-y-2 shadow-2xs',
        className,
      )}
    >
      <div className="flex items-center gap-2 font-semibold">
        <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" aria-hidden="true" />
        <span>{title || 'Request failed'}</span>
      </div>

      <p className="text-[13.5px] text-content-secondary leading-relaxed pl-4 break-words">
        {message}
      </p>

      {onRetry ? (
        <div className="pl-4 pt-0.5">
          <button
            type="button"
            onClick={onRetry}
            className="btn-accent h-7 px-3 text-[12.5px] font-bold cursor-pointer rounded-lg active:scale-95 transition-all shadow-2xs"
          >
            {retryLabel}
          </button>
        </div>
      ) : null}
    </div>
  );
};

export default ErrorBanner;
