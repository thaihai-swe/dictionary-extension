import React, { Suspense, lazy, useEffect, useState } from 'react';
import { useActiveTab } from '../../composables/composable.storage';
import { useLookupSession } from '../../composables/composable.lookup-session';
import { useDictionaryQuery } from '../../composables/composable.dictionary';
import { TabId } from '../../types';
import { cx } from '../../ui/cx';
import AppHeader from '../../components/component.app-header';
import WorkbenchContent from '@/components/component.workbench-content';
import { useWorkbenchPreferences } from '@/components/use-workbench-preferences';
import ToastContainer from '@/components/component.toast';

const ShortcutsModal = lazy(() => import('@/features/settings/ShortcutsModal'));

export const ToolbarPopupApp: React.FC = () => {
  const activeTab = useActiveTab();
  const session = useLookupSession();
  const query = useDictionaryQuery();
  const {
    isDarkMode,
    provider: currentProvider,
    setProvider: setCurrentProvider,
    targetLang,
    setTargetLang,
    toggleTheme,
    textSizeStyle,
  } = useWorkbenchPreferences({ syncDocumentTheme: true });
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [isFullTab, setIsFullTab] = useState(false);

  function updateResponsiveMode() {
    if (typeof chrome !== 'undefined' && chrome.windows?.getCurrent) {
      void chrome.windows
        .getCurrent()
        .then((win) => {
          setIsFullTab(win.type === 'normal');
        })
        .catch(() => {
          setIsFullTab(window.innerWidth > 1100);
        });
      return;
    }
    setIsFullTab(typeof window !== 'undefined' && window.innerWidth > 1100);
  }

  useEffect(() => {
    let resizeFrame = 0;
    const handleResize = () => {
      if (resizeFrame) return;
      resizeFrame = requestAnimationFrame(() => {
        resizeFrame = 0;
        updateResponsiveMode();
      });
    };
    updateResponsiveMode();
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', handleResize, { passive: true });
    }
    return () => {
      if (resizeFrame) cancelAnimationFrame(resizeFrame);
      if (typeof window !== 'undefined') {
        window.removeEventListener('resize', handleResize);
      }
    };
  }, []);

  function handleTabChange(newTab: TabId) {
    session.switchTab(newTab);
  }

  function openFullTab() {
    if (typeof chrome !== 'undefined' && chrome.tabs?.create) {
      chrome.tabs.create({ url: chrome.runtime.getURL('index.html') });
    } else {
      window.open(window.location.href, '_blank');
    }
  }

  function handleKeydown(event: React.KeyboardEvent) {
    const target = event.target as HTMLElement | null;
    const isTyping = target?.matches('input, textarea, select, [contenteditable="true"]');

    if (!isTyping) {
      if (event.key === '1' || (event.altKey && event.key === '1')) {
        handleTabChange('dictionary');
        event.preventDefault();
        return;
      }
      if (event.key === '2' || (event.altKey && event.key === '2')) {
        handleTabChange('ai_assistant');
        event.preventDefault();
        return;
      }
      if (event.key === '?' || (event.shiftKey && (event.key === 'Q' || event.key === 'q'))) {
        setShowShortcuts((v) => !v);
        return;
      }
    }

    if (event.altKey && event.key === '1') {
      handleTabChange('dictionary');
      event.preventDefault();
    } else if (event.altKey && event.key === '2') {
      handleTabChange('ai_assistant');
      event.preventDefault();
    } else if (event.shiftKey && (event.key === 'Q' || event.key === 'q')) {
      setShowShortcuts((v) => !v);
    }
  }

  return (
    <div
      className={cx(
        'app-shell glass-shell bg-paper text-content font-sans flex flex-col select-none overflow-hidden transition-colors duration-fast',
        isFullTab
          ? 'w-full max-w-5xl min-h-[calc(100vh-2rem)] mx-auto my-4 rounded-xl border border-border shadow-card-elevated'
          : 'w-full h-full',
        isDarkMode ? 'dark' : 'light-theme light',
      )}
      data-theme={isDarkMode ? 'dark' : 'light'}
      style={textSizeStyle}
      onKeyDown={handleKeydown}
      tabIndex={-1}
    >
      {/* Editorial Ink App Header */}
      <AppHeader
        showShortcuts={showShortcuts}
        isDarkMode={isDarkMode}
        isMaximized={isFullTab}
        provider={currentProvider}
        targetLanguage={targetLang}
        onToggleShortcuts={() => setShowShortcuts((v) => !v)}
        onToggleMaximize={openFullTab}
        onToggleTheme={toggleTheme}
        onUpdateProvider={(v) => setCurrentProvider(v as typeof currentProvider)}
        onUpdateTargetLang={(v) => setTargetLang(v)}
      />

      <WorkbenchContent
        activeTab={activeTab}
        query={query}
        targetLang={targetLang}
        provider={currentProvider}
        autoFocusDictionary
        loadingSize="compact"
        onChangeTab={handleTabChange}
      />

      {/* Keyboard Shortcuts Guide */}
      <Suspense fallback={null}>
        <ShortcutsModal show={showShortcuts} onClose={() => setShowShortcuts(false)} />
      </Suspense>

      {/* Floating Micro-Toast Feedback */}
      <ToastContainer />
    </div>
  );
};

export default ToolbarPopupApp;
