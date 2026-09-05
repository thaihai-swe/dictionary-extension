import React, { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { useStorage } from '@/composables/composable.storage';
import { useLookupSession } from '@/composables/composable.lookup-session';
import AppHeader from '@/components/component.app-header';
import TabNavigation from '@/components/component.tab-navigation';
import WordLookupView from '@/features/dictionary/WordLookupView';
import { TabId } from '@/types';
import { isDistinctContext } from '@/shared/page-context';
import { cx } from '@/ui/cx';
import { useAppTheme } from '@/ui/theme';
import ToastContainer from '@/components/component.toast';

const AiAssistantView = lazy(() => import('@/features/ai-assistant/AiAssistantView'));
const ContextualRewriter = lazy(() => import('@/features/rewriter/ContextualRewriter'));
const ShortcutsModal = lazy(() => import('@/features/settings/ShortcutsModal'));

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
  const [rewriterVisited, setRewriterVisited] = useState(activeTab === 'rewriter');
  const [currentProvider, setCurrentProvider] = useState(settings.dictionaryProvider || 'wiktionary');
  const [currentText, setCurrentText] = useState(selectedText || '');
  const [currentContext, setCurrentContext] = useState(
    isDistinctContext(selectedText || '', contextSentence) ? String(contextSentence || '').trim() : '',
  );
  const [currentLang, setCurrentLang] = useState(
    targetLang || settings.translateTargetLanguage || 'Vietnamese',
  );
  const overlayRef = useRef<HTMLDivElement | null>(null);

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
    if (activeTab === 'rewriter') setRewriterVisited(true);
  }, [activeTab]);

  useEffect(() => {
    if (!overlayRef.current) return;
    const layer = overlayRef.current.closest('.dictionary-popup-layer') as HTMLElement | null;
    if (layer) {
      layer.classList.toggle('dark', isDarkMode);
      layer.classList.toggle('light', !isDarkMode);
      layer.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
    }
    const mount = overlayRef.current.parentElement as HTMLElement | null;
    if (mount) {
      mount.classList.toggle('dark', isDarkMode);
      mount.classList.toggle('light', !isDarkMode);
      mount.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
    }
    const rootNode = overlayRef.current.getRootNode() as ShadowRoot | null;
    const hostEl = rootNode?.host as HTMLElement | null;
    if (hostEl) {
      hostEl.classList.toggle('dark', isDarkMode);
      hostEl.classList.toggle('light', !isDarkMode);
      hostEl.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
    }
  }, [isDarkMode]);

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

  useEffect(() => {
    const root = overlayRef.current;
    if (!root) return;
    const searchField = root.querySelector<HTMLElement>('input[type="text"], textarea');
    searchField?.focus();
  }, [lookupRequestId, selectedText]);

  function handleOverlayKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      event.stopPropagation();
      if (showShortcuts) {
        setShowShortcuts(false);
        return;
      }
      handleClose();
      return;
    }

    const target = event.target as HTMLElement | null;
    const isTyping = target?.matches('input, textarea, select, [contenteditable="true"]');

    if (!isTyping) {
      if (event.key === '1' || (event.altKey && event.key === '1')) {
        event.preventDefault();
        handleTabChange('dictionary');
        return;
      }
      if (event.key === '2' || (event.altKey && event.key === '2')) {
        event.preventDefault();
        handleTabChange('ai_assistant');
        return;
      }
      if (event.key === '?' || (event.shiftKey && event.key === '/')) {
        event.preventDefault();
        setShowShortcuts((prev) => !prev);
        return;
      }
    }

    if (event.key !== 'Tab') return;
    const root = overlayRef.current;
    if (!root) return;
    const nodes = Array.from(
      root.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    ).filter((node) => !node.hasAttribute('disabled') && node.getAttribute('aria-hidden') !== 'true');
    if (!nodes.length) return;
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    const active = root.ownerDocument.activeElement as HTMLElement | null;
    if (event.shiftKey && active === first) {
      last.focus();
      event.preventDefault();
    } else if (!event.shiftKey && active === last) {
      first.focus();
      event.preventDefault();
    }
  }

  return (
    <div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-label="Dictionary lookup"
      tabIndex={-1}
      className={cx(
        'bg-paper/95 dark:bg-paper/90 backdrop-blur-xl border border-border/80 rounded-xl shadow-card-elevated overflow-hidden flex flex-col select-none text-content text-sm relative inpage-popup-card w-full h-full transition-colors outline-none',
        isDarkMode ? 'dark' : 'light-theme light',
        settings.fontFamily === 'editorial' ? 'font-serif' : 'font-sans',
        isMaximized ? 'max-w-5xl max-h-[90vh]' : '',
      )}
      data-theme={isDarkMode ? 'dark' : 'light'}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={handleOverlayKeyDown}
    >
      {/* Draggable Header Handle */}
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
          onClose={handleClose}
          onUpdateProvider={(v) => setCurrentProvider(v as typeof currentProvider)}
          onUpdateTargetLang={(v) => setCurrentLang(v)}
        />
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
        {rewriterVisited ? (
          <div style={{ display: activeTab === 'rewriter' ? undefined : 'none' }}>
            <Suspense fallback={<div className="p-4 text-[13px] text-content-muted">Loading rewriter…</div>}>
              <ContextualRewriter
                initialText={currentText}
                contextSentence={currentContext}
                targetLang={currentLang}
              />
            </Suspense>
          </div>
        ) : null}
      </main>

      {/* Bottom-Right Resize Handle */}
      {!isMaximized ? (
        <div
          role="separator"
          aria-label="Resize overlay window"
          tabIndex={0}
          onMouseDown={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onStartResize?.(e.nativeEvent);
          }}
          className="absolute right-1 bottom-1 w-4 h-4 cursor-nwse-resize text-content-muted hover:text-accent select-none flex items-center justify-center opacity-50 hover:opacity-100 transition-colors z-30 focus-ring"
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

      {/* Floating Micro-Toast Feedback */}
      <ToastContainer />
    </div>
  );
};

export default InPageOverlay;
