import {
  ContextSentence,
  CopyButton,
  ErrorBanner,
  PresetChips,
  ResultSkeleton,
  SearchBar,
  SectionHeader,
} from '@/components';
import { AI_INTENTS, useAiAssistant } from '@/composables/composable.ai-assistant';
import { searchWord, stopAllAudio, useDictionaryQuery } from '@/composables/composable.dictionary';
import { useSetting } from '@/composables/composable.storage';
import type { DemoPreset } from '@/shared/presets';
import { resolveContext, resolveQuery } from '@/shared/query-resolution';
import { AiIntentId, TabId } from '@/types';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AiIntentChips } from './AiIntentChips';
import { AiIntentRouter } from './AiIntentRouter';
import { ContextSentenceEditor } from './ContextSentenceEditor';

interface AiAssistantViewProps {
  initialQuery?: string;
  initialContext?: string;
  targetLang?: string;
  isVisible?: boolean;
  onSwitchTab?: (tab: TabId) => void;
}

const intentTitleMap: Record<AiIntentId, string> = {
  default: 'Main AI Explanation',
  explain_in_context: 'Context Explanation',
  grammar: 'Grammar & Nuance',
  collocations: 'Phrase & Collocations',
  sentence_breakdown: 'Sentence Breakdown',
  confusables: 'Compare Confusables',
  rephrase: 'Rephrase',
  rewrite: 'Rewriter',
  phrase_fallback: 'Phrase Explanation',
};

export const AiAssistantView: React.FC<AiAssistantViewProps> = ({
  initialQuery,
  initialContext,
  targetLang,
  isVisible = true,
  onSwitchTab,
}) => {
  const {
    activeContext,
    activeIntent,
    aiResult,
    isAiLoading,
    aiError,
    intentStatusEpoch,
    runIntent,
    preloadSpecificIntent,
    preloadFollowUpIntentsOnTabVisit,
    getAiIntentStatus,
    isAiIntentDisabled,
    abortActiveAiRequest,
  } = useAiAssistant();
  const dictionaryQuery = useDictionaryQuery();
  const configuredTargetLang = useSetting('translateTargetLanguage');

  const [queryInput, setQueryInput] = useState('');
  const [contextInput, setContextInput] = useState('');
  const [contextError, setContextError] = useState('');
  const [isEditingContext, setIsEditingContext] = useState(false);

  const resultTargetLang = targetLang || configuredTargetLang;
  const resolvedQuery = resolveQuery(queryInput, contextInput);

  const intentChips = useMemo(
    () =>
      AI_INTENTS.map((item) => ({
        ...item,
        isActive: activeIntent === item.id,
        isDisabled: !resolvedQuery || isAiIntentDisabled(item.id, resolvedQuery, contextInput, targetLang),
        status: resolvedQuery
          ? getAiIntentStatus(item.id, resolvedQuery, contextInput, targetLang)
          : ('unrequested' as const),
      })),
    [activeIntent, contextInput, intentStatusEpoch, isAiIntentDisabled, getAiIntentStatus, resolvedQuery, targetLang],
  );

  const runCurrentIntent = useCallback(
    (intentId = activeIntent) => {
      const resolvedQueryText = resolveQuery(queryInput, contextInput);
      if (!resolvedQueryText) return;
      const resolvedContextText = contextInput.trim();
      if (intentId === 'explain_in_context' && !resolvedContextText) {
        setContextError('Please enter or paste the sentence containing this word.');
        return;
      }
      setContextError('');
      runIntent(intentId, resolvedQueryText, targetLang, resolvedContextText);
    },
    [activeIntent, contextInput, queryInput, runIntent, targetLang],
  );

  useEffect(() => {
    const fallbackQuery = initialQuery || dictionaryQuery;
    const resolvedQueryText = resolveQuery(fallbackQuery, initialContext);
    const resolvedContextText = resolveContext(resolvedQueryText, initialContext || activeContext);
    setQueryInput(resolvedQueryText);
    setContextInput(resolvedContextText);
    if (resolvedQueryText) {
      if (activeIntent === 'explain_in_context' && !resolvedContextText) {
        setContextError('Please enter or paste the sentence containing this word.');
      } else {
        setContextError('');
        runIntent(activeIntent, resolvedQueryText, targetLang, resolvedContextText);
      }
    }
    return () => {
      stopAllAudio();
      abortActiveAiRequest();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const resolvedQueryText = resolveQuery(initialQuery, initialContext);
    if (!resolvedQueryText) return;
    const resolvedContextText = resolveContext(resolvedQueryText, initialContext);
    setQueryInput(resolvedQueryText);
    setContextInput(resolvedContextText);
    if (activeIntent === 'explain_in_context' && !resolvedContextText) {
      setContextError('Please enter or paste the sentence containing this word.');
    } else {
      setContextError('');
      runIntent(activeIntent, resolvedQueryText, targetLang, resolvedContextText);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuery, initialContext]);

  useEffect(() => {
    if (!isVisible) return;
    const resolvedQueryText = resolveQuery(queryInput, contextInput);
    if (!resolvedQueryText) return;
    const resolvedContextText = contextInput.trim();
    void preloadFollowUpIntentsOnTabVisit(resolvedQueryText, resolvedContextText, targetLang);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisible, queryInput, contextInput, targetLang]);

  useEffect(() => {
    if (targetLang && resolveQuery(queryInput, contextInput)) {
      runCurrentIntent();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetLang]);

  const handleIntentSelect = useCallback(
    (intentId: AiIntentId) => {
      stopAllAudio();
      runCurrentIntent(intentId);
    },
    [runCurrentIntent],
  );

  const handlePresetSelect = useCallback(
    (preset: DemoPreset) => {
      stopAllAudio();
      setQueryInput(preset.query);
      if (preset.context) setContextInput(preset.context);
      runIntent(preset.intent || activeIntent, preset.query, targetLang, preset.context);
    },
    [activeIntent, runIntent, targetLang],
  );

  const handleTokenSelect = useCallback(
    (word: string) => {
      stopAllAudio();
      searchWord(word);
      onSwitchTab?.('dictionary');
    },
    [onSwitchTab],
  );

  const handleHoverIntent = useCallback(
    (intentId: AiIntentId) => {
      if (intentId !== activeIntent && resolvedQuery) {
        void preloadSpecificIntent(intentId, resolvedQuery, contextInput, targetLang);
      }
    },
    [activeIntent, contextInput, preloadSpecificIntent, resolvedQuery, targetLang],
  );

  return (
    <div className="font-sans">
      <div className="workbench-search px-3.5 py-2 sticky top-0 z-20">
        <SearchBar
          value={queryInput}
          onChange={setQueryInput}
          onSubmit={() => handleIntentSelect(activeIntent)}
          onClear={() => {
            setQueryInput('');
            stopAllAudio();
          }}
          placeholder="Analyze a word or sentence…"
          ariaLabel="Analyze a word or sentence"
          actionLabel="Analyze"
          loadingLabel="Analyzing…"
          isLoading={isAiLoading}
        />
      </div>

      <div className="workbench-results w-full px-3.5 pt-0 pb-3 space-y-2.5">
        {!isEditingContext && !contextInput.trim() ? (
          <div className="flex items-center justify-end px-0.5">
            <button
              type="button"
              onClick={() => setIsEditingContext(true)}
              className="text-[12px] text-accent hover:text-accent/80 font-semibold cursor-pointer flex items-center gap-1 transition-colors"
            >
              <span>+</span> Add context sentence
            </button>
          </div>
        ) : !isEditingContext ? (
          <ContextSentence
            variant="card"
            sentence={contextInput.trim()}
            targetWord={resolvedQuery}
            query={queryInput}
            onEdit={() => setIsEditingContext(true)}
          />
        ) : (
          <ContextSentenceEditor
            value={contextInput}
            query={queryInput}
            error={contextError}
            onChange={setContextInput}
            onDone={() => setIsEditingContext(false)}
            onSelectToken={handleTokenSelect}
          />
        )}

        {/* Intent Action Chips with Status Indicators */}
        <AiIntentChips
          chips={intentChips}
          onSelectIntent={handleIntentSelect}
          onHoverIntent={handleHoverIntent}
        />

        {/* Results */}
        <div className="space-y-3 pt-0.5 [&_.reading-prose]:max-w-none">
          {isAiLoading ? (
            <ResultSkeleton variant="ai" />
          ) : aiError ? (
            <ErrorBanner message={aiError} onRetry={() => runCurrentIntent()} />
          ) : aiResult ? (
            <div className="space-y-3">
              <SectionHeader
                title={intentTitleMap[aiResult.type as AiIntentId] || 'AI Explanation'}
                action={
                  <CopyButton
                    text={aiResult.summary}
                    className="h-7 text-[12px]"
                    toastMessage="Copied response to clipboard"
                    title="Copy response"
                  />
                }
              />

              <AiIntentRouter
                result={aiResult}
                targetLang={resultTargetLang}
                onSelectWord={handleTokenSelect}
              />
            </div>
          ) : !queryInput.trim() && !resolvedQuery ? (
            <PresetChips onSelect={handlePresetSelect} />
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default AiAssistantView;
