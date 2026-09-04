import React, { Suspense, lazy, useEffect, useState } from 'react';
import { useStorage } from '../../composables/composable.storage';
import { useLookupSession } from '../../composables/composable.lookup-session';
import { useDictionaryQuery } from '../../composables/composable.dictionary';
import { TabId, AppTheme } from '../../types';
import { cx } from '../../ui/cx';
import AppHeader from '../../components/component.app-header';
import TabNavigation from '../../components/component.tab-navigation';
import WordLookupView from '../../components/view.word-lookup';

const AiAssistantView = lazy(() => import('../../components/view.ai-assistant'));
const ShortcutsModal = lazy(() => import('../../components/modal.shortcuts'));

function resolveIsDark(theme: AppTheme): boolean {
  if (theme === 'dark') return true;
  if (theme === 'light') return false;
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  return true;
}

export const ToolbarPopupApp: React.FC = () => {
  const { activeTab, settings, saveSettings } = useStorage();
  const session = useLookupSession();
  const query = useDictionaryQuery();
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [aiVisited, setAiVisited] = useState(activeTab === 'ai_assistant');
  const [targetLang, setTargetLang] = useState(settings.translateTargetLanguage || 'Vietnamese');
  const [currentProvider, setCurrentProvider] = useState(settings.dictionaryProvider || 'free_dictionary');
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => resolveIsDark(settings.theme));
  const [isFullTab, setIsFullTab] = useState(false);

  useEffect(() => {
    if (settings.dictionaryProvider) setCurrentProvider(settings.dictionaryProvider);
  }, [settings.dictionaryProvider]);

  useEffect(() => {
    if (settings.translateTargetLanguage) setTargetLang(settings.translateTargetLanguage);
  }, [settings.translateTargetLanguage]);

  // Sync theme changes with DOM and system preference
  useEffect(() => {
    const isDark = resolveIsDark(settings.theme);
    setIsDarkMode(isDark);

    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('dark', isDark);
      document.documentElement.classList.toggle('light', !isDark);
      document.documentElement.classList.toggle('light-theme', !isDark);
      document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
      if (document.body) {
        document.body.classList.toggle('dark', isDark);
        document.body.classList.toggle('light', !isDark);
        document.body.classList.toggle('light-theme', !isDark);
        document.body.setAttribute('data-theme', isDark ? 'dark' : 'light');
      }
    }

    if (settings.theme === 'system' && typeof window !== 'undefined' && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const listener = (e: MediaQueryListEvent) => {
        setIsDarkMode(e.matches);
        document.documentElement.classList.toggle('dark', e.matches);
        document.documentElement.classList.toggle('light', !e.matches);
        document.documentElement.classList.toggle('light-theme', !e.matches);
        document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light');
      };
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    }
  }, [settings.theme]);

  useEffect(() => {
    if (activeTab === 'ai_assistant') setAiVisited(true);
  }, [activeTab]);

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
    updateResponsiveMode();
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', updateResponsiveMode);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('resize', updateResponsiveMode);
      }
    };
  }, []);

  function toggleTheme() {
    const next = !isDarkMode;
    setIsDarkMode(next);
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('dark', next);
      document.documentElement.classList.toggle('light', !next);
      document.documentElement.classList.toggle('light-theme', !next);
      document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light');
    }
    void saveSettings({ theme: next ? 'dark' : 'light' });
  }

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
        'bg-paper text-content flex flex-col select-none overflow-hidden transition-colors duration-150',
        isFullTab
          ? 'w-full max-w-5xl min-h-[calc(100vh-2rem)] mx-auto my-4 rounded-xl border border-border shadow-card-elevated'
          : 'w-full h-full',
        isDarkMode ? 'dark' : 'light-theme light',
        settings.fontFamily === 'editorial' ? 'font-serif' : 'font-sans',
      )}
      data-theme={isDarkMode ? 'dark' : 'light'}
      onKeyDown={handleKeydown}
      tabIndex={-1}
    >
      {/* Editorial Ink App Header */}
      <AppHeader
        showShortcuts={showShortcuts}
        isDarkMode={isDarkMode}
        isMaximized={isFullTab}
        onToggleShortcuts={() => setShowShortcuts((v) => !v)}
        onToggleMaximize={openFullTab}
        onToggleTheme={toggleTheme}
        onUpdateProvider={(v) => setCurrentProvider(v as typeof currentProvider)}
        onUpdateTargetLang={(v) => setTargetLang(v)}
      />

      {/* Editorial 2-Tab Navigation */}
      <TabNavigation activeTab={activeTab} onChangeTab={handleTabChange} />

      {/* Main Content Surfaces */}
      <main className="flex-1 overflow-y-auto">
        <div style={{ display: activeTab === 'dictionary' ? undefined : 'none' }}>
          <WordLookupView
            autoFocus={activeTab === 'dictionary'}
            targetLang={targetLang}
            provider={currentProvider}
          />
        </div>
        {aiVisited ? (
          <div style={{ display: activeTab === 'ai_assistant' ? undefined : 'none' }}>
            <Suspense fallback={<div className="p-4 text-[12.5px] text-content-muted">Loading AI assistant…</div>}>
              <AiAssistantView
                initialQuery={query || session.term}
                targetLang={targetLang}
                isVisible={activeTab === 'ai_assistant'}
                onSwitchTab={handleTabChange}
              />
            </Suspense>
          </div>
        ) : null}
      </main>

      {/* Keyboard Shortcuts Guide */}
      <Suspense fallback={null}>
        <ShortcutsModal show={showShortcuts} onClose={() => setShowShortcuts(false)} />
      </Suspense>
    </div>
  );
};

export default ToolbarPopupApp;
