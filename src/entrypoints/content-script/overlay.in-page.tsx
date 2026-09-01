import React, { lazy, Suspense, useEffect, useState } from 'react';
import { useStorage } from '@/composables/composable.storage';
import { abortActiveDictRequest, stopAllAudio } from '@/composables/composable.dictionary';
import AppHeader from '@/components/component.app-header';
import TabNavigation from '@/components/component.tab-navigation';
import WordLookupView from '@/components/view.word-lookup';
import { TabId } from '@/types';
import { isDistinctContext } from '@/shared/page-context';
import { cx } from '@/ui/cx';

const AiAssistantView = lazy(() => import('@/components/view.ai-assistant'));
const ShortcutsModal = lazy(() => import('@/components/modal.shortcuts'));

interface InPageOverlayProps {
  selectedText?: string;
  contextSentence?: string;
  lookupRequestId?: string;
  targetLang?: string;
  isMaximized?: boolean;
  isDragging?: boolean;
  isResizing?: boolean;
  width?: number;
  height?: number;
  onClose?: () => void;
  onToggleMaximize?: () => void;
  onStartDrag?: (event: MouseEvent) => void;
  onStartResize?: (event: MouseEvent) => void;
}

function distinctContext(text: string, context?: string): string {
  const trimmedContext = String(context || '').replace(/\s+/g, ' ').trim();
  return isDistinctContext(text, trimmedContext) ? trimmedContext : '';
}

export const InPageOverlay: React.FC<InPageOverlayProps> = ({
  selectedText,
  contextSentence,
  lookupRequestId,
  targetLang,
  isMaximized,
  isDragging,
  isResizing,
  width,
  height,
  onClose,
  onToggleMaximize,
  onStartDrag,
  onStartResize,
}) => {
  const { activeTab, settings, saveSettings, setActiveTab } = useStorage();
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [aiVisited, setAiVisited] = useState(activeTab === 'ai_assistant');
  const [isDarkMode, setIsDarkMode] = useState(settings.theme !== 'light');
  const [currentProvider, setCurrentProvider] = useState(settings.dictionaryProvider || 'free_dictionary');
  const [currentText, setCurrentText] = useState(selectedText || '');
  const [currentContext, setCurrentContext] = useState(
    isDistinctContext(selectedText || '', contextSentence) ? String(contextSentence || '').trim() : '',
  );
  const [currentLang, setCurrentLang] = useState(
    targetLang || settings.translateTargetLanguage || 'Vietnamese',
  );

  useEffect(() => {
    if (settings.dictionaryProvider) setCurrentProvider(settings.dictionaryProvider);
  }, [settings.dictionaryProvider]);

  useEffect(() => {
    if (settings.translateTargetLanguage && !targetLang) {
      setCurrentLang(settings.translateTargetLanguage);
    }
  }, [settings.translateTargetLanguage, targetLang]);

  useEffect(() => {
    setIsDarkMode(settings.theme !== 'light');
  }, [settings.theme]);

  useEffect(() => {
    if (activeTab === 'ai_assistant') setAiVisited(true);
  }, [activeTab]);

  function toggleTheme() {
    const next = !isDarkMode;
    setIsDarkMode(next);
    void saveSettings({ theme: next ? 'dark' : 'light' });
  }

  function syncTextFromSelection(text?: string, context?: string) {
    if (!text?.trim()) return;
    const trimmed = text.trim();
    setCurrentText(trimmed);
    setCurrentContext(distinctContext(trimmed, context));
    if (settings.defaultTab) {
      setActiveTab(settings.defaultTab);
    }
  }

  function handleTabChange(newTab: TabId) {
    stopAllAudio();
    if (newTab === 'ai_assistant' && settings.enableAI === false) {
      setActiveTab('dictionary');
      return;
    }
    setActiveTab(newTab);
    void saveSettings({ defaultTab: newTab });
  }

  function handleClose() {
    stopAllAudio();
    abortActiveDictRequest();
    void import('@/composables/composable.ai-assistant').then(({ abortActiveAiRequest, cancelAiPreload }) => {
      abortActiveAiRequest();
      cancelAiPreload();
    });
    onClose?.();
  }

  function handleHeaderMouseDown(e: React.MouseEvent) {
    const target = e.target as HTMLElement;
    if (target.closest('button, input, select, textarea, a, label')) return;
    onStartDrag?.(e.nativeEvent);
  }

  useEffect(() => {
    const shadowRoot = document.getElementById('dictionary-extension-root')?.shadowRoot;
    function onUpdateText(e: Event) {
      const detail = (e as CustomEvent<string | { text?: string; context?: string }>).detail;
      if (typeof detail === 'string') {
        syncTextFromSelection(detail, currentContext);
        return;
      }
      syncTextFromSelection(detail?.text, detail?.context || currentContext);
    }
    function onSwitchTab(e: Event) {
      const tab = (e as CustomEvent<TabId>).detail;
      handleTabChange(tab);
    }
    if (shadowRoot) {
      shadowRoot.addEventListener('dict-update-text', onUpdateText);
      shadowRoot.addEventListener('dict-switch-tab', onSwitchTab);
    }
    return () => {
      if (shadowRoot) {
        shadowRoot.removeEventListener('dict-update-text', onUpdateText);
        shadowRoot.removeEventListener('dict-switch-tab', onSwitchTab);
      }
      stopAllAudio();
      abortActiveDictRequest();
      void import('@/composables/composable.ai-assistant').then(({ abortActiveAiRequest, cancelAiPreload }) => {
        abortActiveAiRequest();
        cancelAiPreload();
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    syncTextFromSelection(selectedText, contextSentence);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedText]);

  useEffect(() => {
    setCurrentContext(distinctContext(currentText, contextSentence));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contextSentence]);

  useEffect(() => {
    if (targetLang) setCurrentLang(targetLang);
  }, [targetLang]);

  return (
    <div
      className={cx(
        'bg-dark-paper border border-slate-700/80 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.6)] overflow-hidden flex flex-col select-none text-slate-100 text-sm ring-1 ring-white/10 relative inpage-popup-card',
        isDragging || isResizing ? 'transition-none' : 'transition-all duration-200 ease-out',
        !isDarkMode ? 'light-theme' : '',
        settings.fontFamily === 'editorial' ? 'font-serif' : 'font-sans',
        isMaximized ? 'w-full max-w-5xl h-full max-h-[90vh]' : '',
      )}
      style={
        isMaximized
          ? undefined
          : {
              width: `${width || settings.popupWidth || 480}px`,
              height: `${height || settings.popupHeight || 580}px`,
              maxWidth: '96vw',
              maxHeight: '92vh',
            }
      }
      onClick={(e) => e.stopPropagation()}
    >
      {/* Draggable Header Handle Container with Close Button */}
      <div
        className="relative cursor-grab active:cursor-grabbing select-none"
        onMouseDown={handleHeaderMouseDown}
      >
        <AppHeader
          showShortcuts={showShortcuts}
          isMaximized={isMaximized}
          isDarkMode={isDarkMode}
          onToggleShortcuts={() => setShowShortcuts((v) => !v)}
          onToggleMaximize={onToggleMaximize}
          onToggleTheme={toggleTheme}
          onUpdateProvider={(v) => setCurrentProvider(v as typeof currentProvider)}
          onUpdateTargetLang={(v) => setCurrentLang(v)}
        />
        <button
          type="button"
          onClick={handleClose}
          title="Close (Esc)"
          className="absolute right-2 top-2 w-5 h-5 rounded-full bg-dark-muted hover:bg-red-500/20 hover:text-red-400 text-slate-400 flex items-center justify-center text-xs transition-colors z-10 cursor-pointer"
        >
          ✕
        </button>
      </div>

      {/* Navigation Bar */}
      <TabNavigation activeTab={activeTab} onChangeTab={handleTabChange} />

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div style={{ display: activeTab === 'dictionary' ? undefined : 'none' }}>
          <WordLookupView
            initialQuery={currentText}
            initialContext={currentContext}
            lookupRequestId={lookupRequestId}
            targetLang={currentLang}
            provider={currentProvider}
          />
        </div>
        {aiVisited ? (
          <div style={{ display: activeTab === 'ai_assistant' ? undefined : 'none' }}>
            <Suspense fallback={<div className="p-4 text-xs text-slate-400">Loading AI assistant…</div>}>
              <AiAssistantView
                initialQuery={currentText}
                initialContext={currentContext}
                targetLang={currentLang}
                onSwitchTab={handleTabChange}
              />
            </Suspense>
          </div>
        ) : null}
      </main>

      {/* Bottom-Right Resize Handle */}
      {!isMaximized ? (
        <div
          onMouseDown={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onStartResize?.(e.nativeEvent);
          }}
          className="absolute right-1 bottom-1 w-4 h-4 cursor-nwse-resize text-slate-500 hover:text-slate-200 select-none flex items-center justify-center text-[10px] opacity-70 hover:opacity-100 transition-opacity z-30"
          title="Drag to resize popup window"
        >
          ◢
        </div>
      ) : null}

      {/* Keyboard Shortcuts Modal */}
      <Suspense fallback={null}>
        <ShortcutsModal show={showShortcuts} onClose={() => setShowShortcuts(false)} />
      </Suspense>
    </div>
  );
};

export default InPageOverlay;
