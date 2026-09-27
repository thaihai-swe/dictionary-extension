import React from 'react';
import { AiIntentId } from '@/types';
import { AiIntentStatus } from '@/composables/composable.ai-assistant';
import { cx } from '@/ui/cx';

export interface IntentChipItem {
  id: AiIntentId;
  label: string;
  isActive: boolean;
  isDisabled: boolean;
  status: AiIntentStatus;
}

export interface AiIntentChipsProps {
  chips: IntentChipItem[];
  onSelectIntent: (id: AiIntentId) => void;
  onHoverIntent?: (id: AiIntentId) => void;
  className?: string;
}

function renderStatusDot(status: AiIntentStatus, isActive: boolean) {
  return (
    <span
      className={cx(
        'w-1.5 h-1.5 rounded-full flex-shrink-0 transition-colors',
        isActive
          ? 'bg-accent'
          : status === 'ready'
            ? 'bg-accent'
            : status === 'loading'
              ? 'bg-amber-500 animate-pulse'
              : 'bg-content-muted/40',
      )}
      aria-hidden="true"
    />
  );
}

export const AiIntentChips: React.FC<AiIntentChipsProps> = ({
  chips,
  onSelectIntent,
  onHoverIntent,
  className,
}) => {
  return (
    <div className={cx('intent-groups flex flex-wrap gap-1.5', className)}>
      {chips.map((item) => (
        <button
          key={item.id}
          type="button"
          disabled={item.isDisabled}
          onClick={() => onSelectIntent(item.id)}
          onMouseEnter={() => onHoverIntent?.(item.id)}
          aria-pressed={item.isActive}
          className={cx(
            'inline-flex items-center gap-1.5 h-8 px-3 rounded-xl border text-[12.5px] font-medium transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap focus-visible:ring-2 focus-visible:ring-accent active:scale-95',
            item.isActive
              ? 'chip-active font-semibold shadow-xs'
              : 'bg-surface hover:bg-elevated text-content-secondary hover:text-content border-border/80',
          )}
        >
          {renderStatusDot(item.status, item.isActive)}
          <span>{item.label}</span>
        </button>
      ))}
    </div>
  );
};

export default React.memo(AiIntentChips);
