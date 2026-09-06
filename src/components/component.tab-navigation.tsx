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
      className="flex items-center gap-1.5 border-b border-border bg-surface px-2.5 py-1.5 transition-colors select-none overflow-x-auto"
      role="tablist"
      aria-label="Lookup mode"
    >
      <button
        type="button"
        role="tab"
        aria-selected={currentActive === 'dictionary'}
        onClick={() => selectTab('dictionary')}
        className={cx(
          'relative min-h-[28px] px-2.5 rounded-lg flex items-center gap-1.5 text-xs font-semibold transition-all duration-150 outline-none cursor-pointer whitespace-nowrap shadow-2xs',
          currentActive === 'dictionary'
            ? 'chip-active ring-1 ring-accent/30'
            : 'text-content-secondary hover:text-content hover:bg-muted border border-transparent',
        )}
      >
        <IconBook className="w-3.5 h-3.5" />
        <span>Dictionary</span>
      </button>

      {showAiTab ? (
        <button
          type="button"
          role="tab"
          aria-selected={currentActive === 'ai_assistant'}
          onClick={() => selectTab('ai_assistant')}
          className={cx(
            'relative min-h-[28px] px-2.5 rounded-lg flex items-center gap-1.5 text-xs font-semibold transition-all duration-150 outline-none cursor-pointer whitespace-nowrap shadow-2xs',
            currentActive === 'ai_assistant'
              ? 'chip-active ring-1 ring-accent/30'
              : 'text-content-secondary hover:text-content hover:bg-muted border border-transparent',
          )}
        >
          <IconSparkles className="w-3.5 h-3.5" />
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
            'relative min-h-[28px] px-2.5 rounded-lg flex items-center gap-1.5 text-xs font-semibold transition-all duration-150 outline-none cursor-pointer whitespace-nowrap shadow-2xs',
            currentActive === 'rewriter'
              ? 'chip-active ring-1 ring-accent/30'
              : 'text-content-secondary hover:text-content hover:bg-muted border border-transparent',
          )}
        >
          <IconEdit className="w-3.5 h-3.5" />
          <span>Rewriter</span>
        </button>
      ) : null}
    </nav>
  );
};

export default TabNavigation;
