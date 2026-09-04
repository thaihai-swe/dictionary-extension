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
    <nav className="flex items-end gap-0 border-b border-border bg-paper px-3 transition-colors dark:bg-paper" role="tablist">
      <button
        type="button"
        role="tab"
        aria-selected={currentActive === 'dictionary'}
        onClick={() => selectTab('dictionary')}
        className={cx(
          'relative h-9 flex items-center gap-1.5 px-3 text-[13px] font-medium transition-all duration-150 outline-none cursor-pointer border-b-2 -mb-px',
          currentActive === 'dictionary'
            ? 'text-teal-700 dark:text-gold-200 font-semibold border-teal-600 dark:border-gold-300'
            : 'text-content-muted hover:text-content border-transparent',
        )}
      >
        <IconBook className="w-3.5 h-3.5" />
        <span>Dictionary</span>
        <span className="hidden sm:inline-block text-[10px] opacity-50 font-mono ml-0.5">Alt+1</span>
      </button>

      {showAiTab ? (
        <button
          type="button"
          role="tab"
          aria-selected={currentActive === 'ai_assistant'}
          onClick={() => selectTab('ai_assistant')}
          className={cx(
            'relative h-9 flex items-center gap-1.5 px-3 text-[13px] font-medium transition-all duration-150 outline-none cursor-pointer border-b-2 -mb-px',
            currentActive === 'ai_assistant'
              ? 'text-teal-700 dark:text-gold-200 font-semibold border-teal-600 dark:border-gold-300'
              : 'text-content-muted hover:text-content border-transparent',
          )}
        >
          <IconSparkles className="w-3.5 h-3.5" />
          <span>AI Assistant</span>
          <span className="hidden sm:inline-block text-[10px] opacity-50 font-mono ml-0.5">Alt+2</span>
        </button>
      ) : null}
    </nav>
  );
};

export default TabNavigation;
