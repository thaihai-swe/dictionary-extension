import React, { useRef, useState, useEffect } from 'react';
import { AI_INTENTS, AiIntentStatus } from '../composables/composable.ai-assistant';
import { AiIntentId } from '../types';
import { cx } from '../ui/cx';
import {
  IconChevronLeft,
  IconChevronRight,
  IconDna,
  IconEdit,
  IconLightbulb,
  IconLink,
  IconPuzzle,
  IconScale,
  IconSearch,
  IconSparkles,
} from './icons';

const INTENT_STATUS_META: Record<AiIntentStatus, { className: string; label: string }> = {
  ready: { className: 'bg-emerald-500', label: 'Ready' },
  loading: { className: 'bg-amber-400 animate-pulse', label: 'Loading' },
  unrequested: { className: 'bg-content-muted/40', label: 'Not requested' },
};

const INTENT_GROUPS: Array<{ label: string; ids: AiIntentId[] }> = [
  { label: 'Meaning', ids: ['default', 'explain_in_context'] },
  { label: 'Structure', ids: ['grammar', 'sentence_breakdown'] },
  { label: 'Vocabulary', ids: ['collocations', 'confusables', 'rephrase'] },
];

interface AiIntentToolbarProps {
  activeIntent: AiIntentId;
  isIntentDisabled?: (intentId: AiIntentId) => boolean;
  getIntentStatus?: (intentId: AiIntentId) => AiIntentStatus;
  onSelectIntent?: (intentId: AiIntentId) => void;
  onPrefetchIntent?: (intentId: AiIntentId) => void;
}

function renderIntentIcon(id: AiIntentId) {
  switch (id) {
    case 'default':
      return <IconSparkles className="w-3.5 h-3.5" />;
    case 'explain_in_context':
      return <IconSearch className="w-3.5 h-3.5" />;
    case 'grammar':
      return <IconDna className="w-3.5 h-3.5" />;
    case 'collocations':
      return <IconLink className="w-3.5 h-3.5" />;
    case 'sentence_breakdown':
      return <IconPuzzle className="w-3.5 h-3.5" />;
    case 'confusables':
      return <IconScale className="w-3.5 h-3.5" />;
    case 'rephrase':
      return <IconEdit className="w-3.5 h-3.5" />;
    default:
      return <IconLightbulb className="w-3.5 h-3.5" />;
  }
}

export const AiIntentToolbar: React.FC<AiIntentToolbarProps> = ({
  activeIntent,
  isIntentDisabled,
  getIntentStatus,
  onSelectIntent,
  onPrefetchIntent,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  function checkScroll() {
    const el = scrollContainerRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  }

  function scrollNext(direction: 'left' | 'right') {
    const el = scrollContainerRef.current;
    if (!el) return;
    el.scrollBy({ left: direction === 'left' ? -160 : 160, behavior: 'smooth' });
  }

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => {
      window.removeEventListener('resize', checkScroll);
    };
  }, []);

  const intentById = new Map(AI_INTENTS.map((intent) => [intent.id, intent]));

  return (
    <div className="sticky top-0 z-20 bg-paper/92 backdrop-blur-md py-1.5 border-b border-border/50 -mx-1 px-1 relative">
      {canScrollLeft && (
        <div className="absolute left-0 top-0 bottom-0 w-8 scroll-mask-left z-10 flex items-center justify-start pl-0.5 pointer-events-none">
          <button
            type="button"
            onClick={() => scrollNext('left')}
            className="pointer-events-auto w-6 h-6 rounded-full bg-surface border border-border text-content-secondary hover:text-content flex items-center justify-center cursor-pointer"
            title="Scroll left"
            aria-label="Scroll intents left"
          >
            <IconChevronLeft className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <div
        ref={scrollContainerRef}
        onScroll={checkScroll}
        className="flex items-center gap-3 overflow-x-auto no-scrollbar flex-nowrap py-0.5 px-0.5 scroll-smooth"
      >
        {INTENT_GROUPS.map((group, groupIndex) => (
          <div key={group.label} className="flex items-center gap-1.5 flex-shrink-0">
            {groupIndex > 0 ? (
              <div className="w-px h-5 bg-border mx-0.5 flex-shrink-0" aria-hidden="true" />
            ) : null}
            {group.ids.map((id) => {
              const intent = intentById.get(id);
              if (!intent) return null;
              const isActive = activeIntent === intent.id;
              const isDisabled = Boolean(isIntentDisabled?.(intent.id));
              const status = getIntentStatus?.(intent.id) ?? 'unrequested';
              const statusMeta = INTENT_STATUS_META[status];
              return (
                <button
                  key={intent.id}
                  type="button"
                  disabled={isDisabled}
                  title={`${intent.label} — ${statusMeta.label}`}
                  onClick={() => onSelectIntent?.(intent.id)}
                  onMouseEnter={() => {
                    if (intent.id !== activeIntent) onPrefetchIntent?.(intent.id);
                  }}
                  onFocus={() => {
                    if (intent.id !== activeIntent) onPrefetchIntent?.(intent.id);
                  }}
                  className={cx(
                    'relative flex items-center gap-1.5 h-[30px] px-2.5 rounded-md text-[12px] transition-all duration-150 border outline-none cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0 whitespace-nowrap',
                    isActive
                      ? 'bg-teal-500/12 border-teal-500/35 text-teal-700 dark:bg-gold-300/12 dark:border-gold-300/40 dark:text-gold-100 font-semibold'
                      : 'bg-surface border-border text-content-secondary hover:text-content hover:bg-elevated font-medium',
                  )}
                >
                  <span
                    className={cx('absolute top-1 right-1 h-1.5 w-1.5 rounded-full', statusMeta.className)}
                    aria-hidden="true"
                  />
                  {renderIntentIcon(intent.id)}
                  <span>{intent.label}</span>
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {canScrollRight && (
        <div className="absolute right-0 top-0 bottom-0 w-8 scroll-mask-right z-10 flex items-center justify-end pr-0.5 pointer-events-none">
          <button
            type="button"
            onClick={() => scrollNext('right')}
            className="pointer-events-auto w-6 h-6 rounded-full bg-surface border border-border text-content-secondary hover:text-content flex items-center justify-center cursor-pointer"
            title="Scroll right"
            aria-label="Scroll intents right"
          >
            <IconChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};

export default AiIntentToolbar;
