import React, { lazy, Suspense, useEffect, useState } from 'react';
import { useStorage } from '@/composables/composable.storage';
import { useLookupSession } from '@/composables/composable.lookup-session';
import AppHeader from '@/components/component.app-header';
import TabNavigation from '@/components/component.tab-navigation';
import WordLookupView from '@/components/view.word-lookup';
import { TabId } from '@/types';
import { isDistinctContext } from '@/shared/page-context';
import { cx } from '@/ui/cx';
import { useAppTheme } from '@/ui/theme';
import { IconClose } from '@/components/icons';

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
  onClose,
  onToggleMaximize,
  onStartDrag,
  onStartResize,
}) => {
  const { activeTab, settings, saveSettings, setActiveTab } = useStorage();
  const session = useLookupSession();
  const { isDarkMode, toggleTheme } = useAppTheme(settings.theme, { saveSettings });
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [aiVisited, setAiVisited] = useState(activeTab === 'ai_assistant');
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
    if (activeTab === 'ai_assistant') setAiVisited(true);
  }, [activeTab]);

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
    session.switchTab(newTab);
  }

  function handleClose() {
    session.abortAllLookups();
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
      session.abortAllLookups();
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
        'bg-paper border border-border rounded-xl shadow-card-elevated overflow-hidden flex flex-col select-none text-content text-sm relative inpage-popup-card w-full h-full transition-colors dark:border-gold-300/20',
        isDarkMode ? 'dark' : 'light-theme light',
        settings.fontFamily === 'editorial' ? 'font-serif' : 'font-sans',
        isMaximized ? 'max-w-5xl max-h-[90vh]' : '',
      )}
      data-theme={isDarkMode ? 'dark' : 'light'}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Draggable Header Handle Container with Close Button */}
      <div
        className="relative cursor-grab active:cursor-grabbing select-none"
        onMouseDown={handleHeaderMouseDown}
      >
        <div className="flex items-center">
          <div className="flex-1">
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
          </div>
          <div className="pr-2 bg-surface border-b border-border py-2 flex items-center">
            <button
              type="button"
              onClick={handleClose}
              title="Close window (Esc)"
              aria-label="Close window"
              className="w-7 h-7 rounded-md bg-surface hover:bg-rose-500/15 text-content-muted hover:text-rose-600 dark:hover:text-rose-300 border border-border flex items-center justify-center transition-colors cursor-pointer"
            >
              <IconClose className="w-4 h-4" />
            </button>
          </div>
        </div>
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
            <Suspense fallback={<div className="p-4 text-[13px] text-content-muted">Loading AI assistant…</div>}>
              <AiAssistantView
                initialQuery={currentText}
                initialContext={currentContext}
                targetLang={currentLang}
                isVisible={activeTab === 'ai_assistant'}
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
          className="absolute right-1 bottom-1 w-4 h-4 cursor-nwse-resize text-content-muted hover:text-teal-600 dark:hover:text-teal-400 select-none flex items-center justify-center opacity-50 hover:opacity-100 transition-colors z-30"
          title="Drag to resize popup window"
        >
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
            <path d="M22 22H20V20H22V22ZM22 18H18V20H22V18ZM18 22H16V20H18V22ZM22 14H14V16H22V14Z" />
          </svg>
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
