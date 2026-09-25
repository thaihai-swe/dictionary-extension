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
    { id: 'dictionary', label: 'Dictionary', icon: IconBook, shortcut: '1' },
    ...(showAiTab
      ? [
          { id: 'ai_assistant' as TabId, label: 'AI', icon: IconSparkles, shortcut: '2' },
          { id: 'rewriter' as TabId, label: 'Rewrite', icon: IconEdit, shortcut: '3' },
        ]
      : []),
  ];

  function selectTab(id: TabId) { onChangeTab?.(id); }

  function handleKeyDown(e: React.KeyboardEvent) {
    const currentIndex = tabs.findIndex((t) => t.id === currentActive);
    if (currentIndex === -1) return;
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      selectTab(tabs[(currentIndex + 1) % tabs.length].id);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      selectTab(tabs[(currentIndex - 1 + tabs.length) % tabs.length].id);
    }
  }

  useEffect(() => {
    if (!showAiTab && currentActive === 'ai_assistant') selectTab('dictionary');
  }, [showAiTab, currentActive]);

  return (
    <nav
      className="workbench-navigation"
      role="tablist"
      aria-label="Navigation modes"
      onKeyDown={handleKeyDown}
    >
      <div
        className={cx(
          'workbench-tab-list text-[12px] p-1 bg-surface-muted/80 rounded-xl border border-border-subtle/80 backdrop-blur-md grid gap-1 shadow-xs',
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
                'workbench-tab flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg cursor-pointer whitespace-nowrap select-none transition-all duration-150',
                isActive
                  ? 'is-active bg-surface text-content font-semibold shadow-xs border border-border/40'
                  : 'text-content-muted hover:text-content hover:bg-surface/50 font-medium',
              )}
            >
              <Icon
                aria-hidden="true"
                className={cx(
                  'w-3.5 h-3.5 shrink-0 transition-transform duration-150',
                  isActive ? 'scale-105 text-accent' : 'opacity-70',
                )}
              />
              <span className="tracking-tight truncate">{tab.label}</span>
              <kbd
                className={cx(
                  'hidden sm:inline-flex items-center justify-center',
                  'text-[9.5px] font-mono px-1 py-0.5 rounded border leading-none',
                  isActive
                    ? 'border-accent/25 bg-accent-subtle text-accent font-semibold'
                    : 'border-border-subtle bg-surface/60 text-content-muted/70',
                )}
              >
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
