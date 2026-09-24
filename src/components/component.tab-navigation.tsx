import React, { useEffect } from 'react';
import { TabId } from '../types';
import { useSetting } from '../composables/composable.storage';
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

interface TabItem {
  id: TabId;
  label: string;
  icon: React.FC<{ className?: string }>;
  shortcut: string;
}

export const TabNavigation: React.FC<TabNavigationProps> = ({ activeTab, onChangeTab }) => {
  const enableAI = useSetting('enableAI');
  const currentActive = activeTab || 'dictionary';
  const showAiTab = enableAI !== false;

  const tabs: TabItem[] = [
    {
      id: 'dictionary',
      label: 'Dictionary',
      icon: IconBook,
      shortcut: '1',
    },
    ...(showAiTab
      ? [
          {
            id: 'ai_assistant' as TabId,
            label: 'AI Assistant',
            icon: IconSparkles,
            shortcut: '2',
          },
          {
            id: 'rewriter' as TabId,
            label: 'Rewriter',
            icon: IconEdit,
            shortcut: '3',
          },
        ]
      : []),
  ];

  function selectTab(id: TabId) {
    onChangeTab?.(id);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    const currentIndex = tabs.findIndex((t) => t.id === currentActive);
    if (currentIndex === -1) return;

    if (e.key === 'ArrowRight') {
      e.preventDefault();
      const nextIndex = (currentIndex + 1) % tabs.length;
      selectTab(tabs[nextIndex].id);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const prevIndex = (currentIndex - 1 + tabs.length) % tabs.length;
      selectTab(tabs[prevIndex].id);
    }
  }

  useEffect(() => {
    if (!showAiTab && currentActive === 'ai_assistant') {
      selectTab('dictionary');
    }
  }, [showAiTab, currentActive]);

  return (
    <nav
      className="workbench-navigation px-3 pt-1 pb-2 transition-colors select-none"
      role="tablist"
      aria-label="Navigation modes"
      onKeyDown={handleKeyDown}
    >
      <div
        className={cx(
          'workbench-tab-list grid gap-1 p-1 rounded-xl text-[12.5px]',
          tabs.length === 3 ? 'grid-cols-3' : tabs.length === 2 ? 'grid-cols-2' : 'grid-cols-1',
        )}
      >
        {tabs.map((tab) => {
          const isActive = currentActive === tab.id;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              tabIndex={isActive ? 0 : -1}
              onClick={() => selectTab(tab.id)}
              className={cx(
                'workbench-tab min-w-0 py-1.5 px-2 rounded-lg flex items-center justify-center gap-1.5 text-[12.5px] transition-all duration-150 cursor-pointer whitespace-nowrap select-none relative overflow-hidden focus-visible:ring-2 focus-visible:ring-accent',
                isActive ? 'is-active font-semibold shadow-xs' : 'font-medium opacity-85 hover:opacity-100',
              )}
            >
              <Icon aria-hidden="true" className={cx('w-3.5 h-3.5 shrink-0 transition-transform duration-150', isActive ? 'text-accent scale-110' : 'text-content-muted')} />
              <span className="tracking-tight truncate">{tab.label}</span>
              <kbd className={cx(
                'hidden sm:inline-flex items-center justify-center text-[10px] font-mono px-1 py-0.2 rounded border leading-none',
                isActive
                  ? 'border-accent/30 bg-accent/10 text-accent'
                  : 'border-border-subtle bg-surface text-content-muted opacity-60'
              )}>
                ⌥{tab.shortcut}
              </kbd>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default TabNavigation;
