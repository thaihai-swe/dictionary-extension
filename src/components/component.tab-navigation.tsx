import React, { useEffect } from 'react';
import { TabId } from '../types';
import { useStorage } from '../composables/composable.storage';
import { cx } from '../ui/cx';
import {
  IconBook,
  IconEdit,
  IconSparkles,
} from './icons';

interface TabNavigationProps {
  activeTab?: TabId;
  onChangeTab?: (tab: TabId) => void;
}

export const TabNavigation: React.FC<TabNavigationProps> = ({ activeTab, onChangeTab }) => {
  const { settings } = useStorage();
  const currentActive = activeTab || 'dictionary';
  const showAiTab = settings.enableAI !== false;

  function selectTab(id: TabId) {
    onChangeTab?.(id);
  }

  useEffect(() => {
    if (!showAiTab && currentActive === 'ai_assistant') {
      selectTab('dictionary');
    }
  }, [showAiTab, currentActive]);

  return (
    <nav
      className="px-3 py-2 bg-paper/95 border-b border-border transition-colors select-none"
      role="tablist"
      aria-label="Lookup mode"
    >
      <div
        className={cx(
          'grid gap-1 p-1 rounded-xl bg-muted/70 border border-border text-xs font-medium',
          showAiTab ? 'grid-cols-3' : 'grid-cols-1',
        )}
      >
        <button
          type="button"
          role="tab"
          aria-selected={currentActive === 'dictionary'}
          onClick={() => selectTab('dictionary')}
          className={cx(
            'py-1.5 px-2.5 rounded-lg flex items-center justify-center gap-1.5 text-xs transition-all duration-150 outline-none cursor-pointer whitespace-nowrap select-none',
            currentActive === 'dictionary'
              ? 'bg-surface text-accent font-bold shadow-2xs border border-border/80 dark:border-accent/40'
              : 'text-content-secondary hover:text-content hover:bg-surface/50 border border-transparent font-medium',
          )}
        >
          <IconBook className="w-3.5 h-3.5 shrink-0" />
          <span>Dictionary</span>
        </button>

        {showAiTab ? (
          <button
            type="button"
            role="tab"
            aria-selected={currentActive === 'ai_assistant'}
            onClick={() => selectTab('ai_assistant')}
            className={cx(
              'py-1.5 px-2.5 rounded-lg flex items-center justify-center gap-1.5 text-xs transition-all duration-150 outline-none cursor-pointer whitespace-nowrap select-none',
              currentActive === 'ai_assistant'
                ? 'bg-surface text-accent font-bold shadow-2xs border border-border/80 dark:border-accent/40'
                : 'text-content-secondary hover:text-content hover:bg-surface/50 border border-transparent font-medium',
            )}
          >
            <IconSparkles className="w-3.5 h-3.5 shrink-0" />
            <span>AI Assistant</span>
          </button>
        ) : null}

        {showAiTab ? (
          <button
            type="button"
            role="tab"
            aria-selected={currentActive === 'rewriter'}
            onClick={() => selectTab('rewriter')}
            className={cx(
              'py-1.5 px-2.5 rounded-lg flex items-center justify-center gap-1.5 text-xs transition-all duration-150 outline-none cursor-pointer whitespace-nowrap select-none',
              currentActive === 'rewriter'
                ? 'bg-surface text-accent font-bold shadow-2xs border border-border/80 dark:border-accent/40'
                : 'text-content-secondary hover:text-content hover:bg-surface/50 border border-transparent font-medium',
            )}
          >
            <IconEdit className="w-3.5 h-3.5 shrink-0" />
            <span>Rewriter</span>
          </button>
        ) : null}
      </div>
    </nav>
  );
};

export default TabNavigation;
