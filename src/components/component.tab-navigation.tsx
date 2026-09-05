import React, { useEffect } from 'react';
import { TabId } from '../types';
import { useStorage } from '../composables/composable.storage';
import { cx } from '../ui/cx';
import { IconBook, IconSparkles } from './icons';

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
      className="flex items-center gap-1.5 border-b border-border bg-surface px-3 py-1.5 transition-colors select-none"
      role="tablist"
      aria-label="Lookup mode"
    >
      <button
        type="button"
        role="tab"
        aria-selected={currentActive === 'dictionary'}
        onClick={() => selectTab('dictionary')}
        className={cx(
          'relative min-h-[30px] px-3 rounded-md flex items-center gap-1.5 text-[12.5px] font-semibold transition-all duration-150 outline-none cursor-pointer focus-ring',
          currentActive === 'dictionary'
            ? 'chip-active shadow-2xs'
            : 'text-content-secondary hover:text-content hover:bg-muted border border-transparent',
        )}
      >
        <IconBook className="w-3.5 h-3.5" />
        <span>Dictionary</span>
        <span className="hidden sm:inline-block text-[9.5px] font-mono px-1 py-0.2 rounded bg-surface/80 border border-border/70 text-content-muted">
          Alt+1
        </span>
      </button>

      {showAiTab ? (
        <button
          type="button"
          role="tab"
          aria-selected={currentActive === 'ai_assistant'}
          onClick={() => selectTab('ai_assistant')}
          className={cx(
            'relative min-h-[30px] px-3 rounded-md flex items-center gap-1.5 text-[12.5px] font-semibold transition-all duration-150 outline-none cursor-pointer focus-ring',
            currentActive === 'ai_assistant'
              ? 'chip-active shadow-2xs'
              : 'text-content-secondary hover:text-content hover:bg-muted border border-transparent',
          )}
        >
          <IconSparkles className="w-3.5 h-3.5" />
          <span>AI Assistant</span>
          <span className="hidden sm:inline-block text-[9.5px] font-mono px-1 py-0.2 rounded bg-surface/80 border border-border/70 text-content-muted">
            Alt+2
          </span>
        </button>
      ) : null}
    </nav>
  );
};

export default TabNavigation;
