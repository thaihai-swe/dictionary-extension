import React, { Suspense, lazy, useEffect, useState } from 'react';
import { useStorage } from '../../composables/composable.storage';
import { useLookupSession } from '../../composables/composable.lookup-session';
import { useDictionaryQuery } from '../../composables/composable.dictionary';
import { TabId } from '../../types';
import { cx } from '../../ui/cx';
import { useAppTheme } from '../../ui/theme';
import AppHeader from '../../components/component.app-header';
import TabNavigation from '../../components/component.tab-navigation';
import WordLookupView from '../../components/view.word-lookup';

const AiAssistantView = lazy(() => import('../../components/view.ai-assistant'));
const ShortcutsModal = lazy(() => import('../../components/modal.shortcuts'));

export const ToolbarPopupApp: React.FC = () => {
  const { activeTab, settings, saveSettings } = useStorage();
  const session = useLookupSession();
  const query = useDictionaryQuery();
  const { isDarkMode, toggleTheme } = useAppTheme(settings.theme, {
    syncDocument: true,
    saveSettings,
  });
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [aiVisited, setAiVisited] = useState(activeTab === 'ai_assistant');
  const [targetLang, setTargetLang] = useState(settings.translateTargetLanguage || 'Vietnamese');
  const [currentProvider, setCurrentProvider] = useState(settings.dictionaryProvider || 'wiktionary');
  const [isFullTab, setIsFullTab] = useState(false);

  useEffect(() => {
    if (settings.dictionaryProvider) setCurrentProvider(settings.dictionaryProvider);
  }, [settings.dictionaryProvider]);

  useEffect(() => {
    if (settings.translateTargetLanguage) setTargetLang(settings.translateTargetLanguage);
  }, [settings.translateTargetLanguage]);

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
                initialQuery={query}
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
