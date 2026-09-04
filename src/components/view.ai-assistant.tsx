import React, { Suspense, useEffect, useMemo, useState } from 'react';
import { useAiAssistant, AI_INTENTS, AiIntentStatus } from '../composables/composable.ai-assistant';
import { searchWord, stopAllAudio, useDictionaryQuery } from '../composables/composable.dictionary';
import { useStorage } from '../composables/composable.storage';
import { AiIntentId, TabId } from '../types';
import { IconClose, IconSearch } from './icons';
import TokenizedContext from './component.tokenized-context';
import PresetChips from './component.preset-chips';
import type { DemoPreset } from '../shared/presets';
import {
  AiMarkdownIntent,
  ConfusablesIntent,
  RephraseIntent,
  SentenceBreakdownIntent,
} from './async-views';
import { cx } from '../ui/cx';

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
  phrase_fallback: 'Phrase Explanation',
};

function resolveQuery(query?: string, context?: string): string {
  const selected = String(query || '').trim();
  if (selected) return selected;
  return String(context || '').trim();
}

function resolveContext(query?: string, context?: string): string {
  const selected = String(query || '').trim();
  const surrounding = String(context || '').replace(/\s+/g, ' ').trim();
  if (!surrounding) return '';
  if (selected && surrounding.toLowerCase() === selected.toLowerCase()) return '';
  return surrounding;
}

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
  } = useAiAssistant();
  const dictionaryQuery = useDictionaryQuery();
  const { settings } = useStorage();

  const [queryInput, setQueryInput] = useState('');
  const [contextInput, setContextInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [contextError, setContextError] = useState('');
  const [isEditingContext, setIsEditingContext] = useState(false);

  const resultTargetLang = targetLang || settings.translateTargetLanguage;
  const resolvedQuery = resolveQuery(queryInput, contextInput);
  const intentChips = useMemo(
    () => AI_INTENTS.map((item) => ({
      ...item,
      isActive: activeIntent === item.id,
      isDisabled: !resolvedQuery || isAiIntentDisabled(item.id, resolvedQuery, contextInput, targetLang),
      status: resolvedQuery
        ? getAiIntentStatus(item.id, resolvedQuery, contextInput, targetLang)
        : 'unrequested' as const,
    })),
    [activeIntent, contextInput, intentStatusEpoch, isAiIntentDisabled, getAiIntentStatus, resolvedQuery, targetLang],
  );

  function runCurrentIntent(intentId = activeIntent) {
    const q = resolveQuery(queryInput, contextInput);
    if (!q) return;
    const c = contextInput.trim();
    if (intentId === 'explain_in_context' && !c) {
      setContextError('Please enter or paste the sentence containing this word.');
      return;
    }
    setContextError('');
    runIntent(intentId, q, targetLang, c);
  }

  useEffect(() => {
    const fallbackQuery = initialQuery || dictionaryQuery;
    const q = resolveQuery(fallbackQuery, initialContext);
    const c = resolveContext(q, initialContext || activeContext);
    setQueryInput(q);
    setContextInput(c);
    if (q) {
      const currentQ = q;
      const currentC = c;
      if (activeIntent === 'explain_in_context' && !currentC) {
        setContextError('Please enter or paste the sentence containing this word.');
      } else {
        setContextError('');
        runIntent(activeIntent, currentQ, targetLang, currentC);
      }
    }
    return () => {
      stopAllAudio();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const q = resolveQuery(initialQuery, initialContext);
    if (!q) return;
    const c = resolveContext(q, initialContext);
    setQueryInput(q);
    setContextInput(c);
    if (activeIntent === 'explain_in_context' && !c) {
      setContextError('Please enter or paste the sentence containing this word.');
    } else {
      setContextError('');
      runIntent(activeIntent, q, targetLang, c);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuery, initialContext]);

  useEffect(() => {
    if (!isVisible) return;
    const q = resolveQuery(queryInput, contextInput);
    if (!q) return;
    const c = contextInput.trim();
    void preloadFollowUpIntentsOnTabVisit(q, c, targetLang);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisible, queryInput, contextInput, targetLang]);

  useEffect(() => {
    if (targetLang && resolveQuery(queryInput, contextInput)) {
      runCurrentIntent();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetLang]);

  function handleIntentSelect(intentId: AiIntentId) {
    stopAllAudio();
    runCurrentIntent(intentId);
  }

  function handlePresetSelect(preset: DemoPreset) {
    stopAllAudio();
    setQueryInput(preset.query);
    if (preset.context) setContextInput(preset.context);
    runIntent(preset.intent || activeIntent, preset.query, targetLang, preset.context);
  }

  function handleTokenSelect(word: string) {
    stopAllAudio();
    searchWord(word);
    onSwitchTab?.('dictionary');
  }

  function copyResult(text?: string) {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
      }, 1800);
    });
  }

  function renderStatusDot(status: AiIntentStatus, isActive: boolean) {
    return (
      <span
        className={cx(
          'w-1.5 h-1.5 rounded-full flex-shrink-0 transition-colors',
          isActive
            ? 'bg-teal-700 dark:bg-gold-300'
            : status === 'ready'
              ? 'bg-teal-600 dark:bg-gold-400'
              : status === 'loading'
                ? 'bg-amber-500 animate-pulse'
                : 'bg-content-muted/40',
        )}
        aria-hidden="true"
      />
    );
  }

  return (
    <div className="p-4 space-y-3 font-sans">
      {/* Search Input */}
      <div className="relative flex items-center">
        <span className="absolute left-3 text-content-muted pointer-events-none">
          <IconSearch className="w-3.5 h-3.5" />
        </span>
        <input
          value={queryInput}
          onChange={(e) => setQueryInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleIntentSelect(activeIntent);
          }}
          type="text"
          placeholder="Analyze word or complete sentence…"
          className="w-full h-[38px] bg-surface border border-border rounded-lg pl-9 pr-24 text-[13px] text-content placeholder:text-content-muted outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/15 transition-all font-sans"
        />

        {queryInput ? (
          <button
            type="button"
            onClick={() => {
              setQueryInput('');
              stopAllAudio();
            }}
            title="Clear search text"
            className="absolute right-[4.75rem] text-content-muted hover:text-content p-1 cursor-pointer flex items-center justify-center"
          >
            <IconClose className="w-3.5 h-3.5" />
          </button>
        ) : null}

        <button
          type="button"
          onClick={() => handleIntentSelect(activeIntent)}
          disabled={!queryInput || isAiLoading}
          className="absolute right-1.5 h-7 px-3 rounded-md bg-teal-700 hover:bg-teal-600 dark:bg-gold-400 dark:hover:bg-gold-300 dark:text-neutral-950 active:scale-95 text-white text-[12px] font-semibold transition-all disabled:opacity-50 cursor-pointer"
        >
          <span>{isAiLoading ? 'Analyzing…' : 'Analyze'}</span>
        </button>
      </div>

      {/* Context Strip */}
      {!isEditingContext && !contextInput.trim() ? (
        <div className="flex items-center justify-end px-0.5">
          <button
            type="button"
            onClick={() => setIsEditingContext(true)}
            className="text-[11.5px] text-teal-700 dark:text-teal-400 hover:underline font-medium cursor-pointer"
          >
            + Add context sentence
          </button>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-surface p-2.5 space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10.5px] font-bold uppercase tracking-wider text-content-muted">
              Context Sentence
            </span>
            <button
              type="button"
              onClick={() => setIsEditingContext(!isEditingContext)}
              className="text-[11px] font-medium text-content-secondary hover:text-content cursor-pointer"
            >
              {isEditingContext || !contextInput.trim() ? 'Done' : 'Edit'}
            </button>
          </div>

          {isEditingContext || !contextInput.trim() ? (
            <textarea
              value={contextInput}
              onChange={(e) => setContextInput(e.target.value)}
              onBlur={() => setIsEditingContext(!contextInput.trim())}
              rows={2}
              placeholder="Paste the sentence that contains this word..."
              className="w-full bg-muted/50 border border-border rounded-md px-2.5 py-1.5 text-[12.5px] text-content placeholder:text-content-muted outline-none focus:border-teal-500 resize-y min-h-[44px]"
            />
          ) : (
            <TokenizedContext
              text={contextInput}
              query={queryInput}
              onSelectToken={handleTokenSelect}
            />
          )}

          {contextError ? <p className="text-[11.5px] text-rose-600 dark:text-rose-400">{contextError}</p> : null}
        </div>
      )}

      {/* Intent Action Chips with Status Indicators */}
      <div className="flex flex-wrap gap-1.5 pt-0.5">
        {intentChips.map((item) => (
          <button
            key={item.id}
            type="button"
            disabled={item.isDisabled}
            onClick={() => handleIntentSelect(item.id)}
            onMouseEnter={() => {
              if (item.id !== activeIntent && resolvedQuery) {
                void preloadSpecificIntent(item.id, resolvedQuery, contextInput, targetLang);
              }
            }}
            className={cx(
              'inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full border text-[11.5px] font-medium transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed',
              item.isActive
                ? 'bg-teal-500/15 border-teal-500/40 text-teal-800 dark:text-gold-200 dark:bg-gold-300/15 dark:border-gold-300/40 font-semibold'
                : 'bg-surface hover:bg-elevated text-content-secondary hover:text-content border-border',
            )}
          >
            {renderStatusDot(item.status, item.isActive)}
            <span>{item.label}</span>
          </button>
        ))}
      </div>

      {/* Results */}
      <div className="space-y-3 pt-1">
        {isAiLoading ? (
          <div className="p-4 rounded-xl border border-border bg-surface animate-pulse space-y-2.5">
            <div className="h-3 bg-muted rounded w-1/4"></div>
            <div className="h-12 bg-muted rounded w-full"></div>
            <div className="h-12 bg-muted rounded w-full"></div>
          </div>
        ) : aiError ? (
          <div className="p-3 rounded-lg bg-rose-500/8 border border-rose-500/25 text-[12.5px] text-rose-700 dark:text-rose-400">
            {aiError}
          </div>
        ) : aiResult ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-1 border-b border-border">
              <h3 className="text-[12px] font-semibold text-content uppercase tracking-wider font-mono">
                {intentTitleMap[aiResult.type as AiIntentId] || 'AI Explanation'}
              </h3>

              <button
                type="button"
                onClick={() => copyResult(aiResult.summary)}
                title="Copy response"
                className="h-6 px-2 rounded bg-surface hover:bg-elevated text-content-secondary hover:text-content border border-border text-[11px] font-medium transition-colors cursor-pointer"
              >
                {copied ? '✓ Copied' : 'Copy'}
              </button>
            </div>

            <Suspense fallback={<div className="p-3 text-[12.5px] text-content-muted">Loading analysis…</div>}>
              {aiResult.type === 'sentence_breakdown' ? (
                <SentenceBreakdownIntent result={aiResult} targetLang={resultTargetLang} />
              ) : aiResult.type === 'confusables' ? (
                <ConfusablesIntent result={aiResult} targetLang={resultTargetLang} />
              ) : aiResult.type === 'rephrase' ? (
                <RephraseIntent result={aiResult} targetLang={resultTargetLang} />
              ) : (
                <AiMarkdownIntent
                  result={aiResult}
                  targetLang={resultTargetLang}
                  onSelectWord={handleTokenSelect}
                />
              )}
            </Suspense>
          </div>
        ) : !queryInput.trim() && !resolvedQuery ? (
          <PresetChips onSelect={handlePresetSelect} />
        ) : null}
      </div>
    </div>
  );
};

export default AiAssistantView;
