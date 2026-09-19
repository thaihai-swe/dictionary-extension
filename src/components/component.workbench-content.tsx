import React, { lazy, Suspense } from 'react';
import type { TabId } from '@/types';
import TabNavigation from './component.tab-navigation';
import WordLookupView from '@/features/dictionary/WordLookupView';

const AiAssistantView = lazy(() => import('@/features/ai-assistant/AiAssistantView'));
const ContextualRewriter = lazy(() => import('@/features/rewriter/ContextualRewriter'));

interface WorkbenchContentProps {
  activeTab: TabId;
  query?: string;
  context?: string;
  lookupRequestId?: string;
  targetLang?: string;
  provider?: string;
  autoFocusDictionary?: boolean;
  loadingSize?: 'compact' | 'regular';
  onChangeTab: (tab: TabId) => void;
}

export const WorkbenchContent: React.FC<WorkbenchContentProps> = ({
  activeTab,
  query,
  context,
  lookupRequestId,
  targetLang,
  provider,
  autoFocusDictionary,
  loadingSize = 'compact',
  onChangeTab,
}) => {
  const loadingTextClass = loadingSize === 'regular' ? 'text-[14px]' : 'text-[13.5px]';
  return (
    <>
      <TabNavigation activeTab={activeTab} onChangeTab={onChangeTab} />
      <main className="flex-1 overflow-y-auto">
        {activeTab === 'dictionary' ? (
          <WordLookupView
            initialQuery={query}
            initialContext={context}
            lookupRequestId={lookupRequestId}
            autoFocus={autoFocusDictionary}
            targetLang={targetLang}
            provider={provider}
          />
        ) : null}
        {activeTab === 'ai_assistant' ? (
          <Suspense fallback={<div className={`p-4 ${loadingTextClass} text-content-muted`}>Loading AI assistant…</div>}>
            <AiAssistantView
              initialQuery={query}
              initialContext={context}
              targetLang={targetLang}
              isVisible
              onSwitchTab={onChangeTab}
            />
          </Suspense>
        ) : null}
        {activeTab === 'rewriter' ? (
          <Suspense fallback={<div className={`p-4 ${loadingTextClass} text-content-muted`}>Loading rewriter…</div>}>
            <ContextualRewriter initialText={query} contextSentence={context} targetLang={targetLang} />
          </Suspense>
        ) : null}
      </main>
    </>
  );
};

export default WorkbenchContent;
