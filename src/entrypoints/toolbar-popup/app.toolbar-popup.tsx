import React, { lazy, Suspense, useEffect, useState } from 'react';
import { useStorage } from '@/composables/composable.storage';
import { useDictionaryQuery } from '@/composables/composable.dictionary';
import AppHeader from '@/components/component.app-header';
import TabNavigation from '@/components/component.tab-navigation';
import WordLookupView from '@/components/view.word-lookup';
import { TabId } from '@/types';
import { cx } from '@/ui/cx';

const AiAssistantView = lazy(() => import('@/components/view.ai-assistant'));
const ShortcutsModal = lazy(() => import('@/components/modal.shortcuts'));

export const ToolbarPopupApp: React.FC = () => {
  const { activeTab, settings, saveSettings, setActiveTab } = useStorage();
  const query = useDictionaryQuery();
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [aiVisited, setAiVisited] = useState(activeTab === 'ai_assistant');
  const [targetLang, setTargetLang] = useState(settings.translateTargetLanguage || 'Vietnamese');
  const [currentProvider, setCurrentProvider] = useState(settings.dictionaryProvider || 'free_dictionary');
  const [isDarkMode, setIsDarkMode] = useState(settings.theme !== 'light');
  const [isFullTab, setIsFullTab] = useState(false);

  useEffect(() => {
    if (settings.dictionaryProvider) setCurrentProvider(settings.dictionaryProvider);
  }, [settings.dictionaryProvider]);

  useEffect(() => {
    if (settings.translateTargetLanguage) setTargetLang(settings.translateTargetLanguage);
  }, [settings.translateTargetLanguage]);

  useEffect(() => {
    setIsDarkMode(settings.theme !== 'light');
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
    void saveSettings({ theme: next ? 'dark' : 'light' });
  }

  function handleTabChange(newTab: TabId) {
    if (newTab === 'ai_assistant' && settings.enableAI === false) {
      setActiveTab('dictionary');
      return;
    }
    setActiveTab(newTab);
    void saveSettings({ defaultTab: newTab });
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
        'bg-dark-paper text-slate-100 flex flex-col select-none overflow-hidden transition-all duration-200',
        isFullTab
          ? 'w-full max-w-6xl min-h-[calc(100vh-2rem)] mx-auto my-4 rounded-2xl border border-dark-border shadow-2xl'
          : 'w-full h-full',
        !isDarkMode ? 'light-theme' : '',
        settings.fontFamily === 'editorial' ? 'font-serif' : 'font-sans',
      )}
      onKeyDown={handleKeydown}
      tabIndex={-1}
    >
      {/* Extension Header */}
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

      {/* Navigation Bar */}
      <TabNavigation activeTab={activeTab} onChangeTab={handleTabChange} />

      {/* Toolbar Popup Main Search & Workbench View */}
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
            <Suspense fallback={<div className="p-4 text-xs text-slate-400">Loading AI assistant…</div>}>
              <AiAssistantView
                initialQuery={query}
                targetLang={targetLang}
                onSwitchTab={handleTabChange}
              />
            </Suspense>
          </div>
        ) : null}
      </main>

      {/* Keyboard Shortcuts Guide Modal */}
      <Suspense fallback={null}>
        <ShortcutsModal show={showShortcuts} onClose={() => setShowShortcuts(false)} />
      </Suspense>
    </div>
  );
};

export default ToolbarPopupApp;
