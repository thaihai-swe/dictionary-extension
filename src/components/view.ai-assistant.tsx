import React, { Suspense, useEffect, useMemo, useState } from 'react';
import { useAiAssistant } from '../composables/composable.ai-assistant';
import { searchWord, speakTTS, stopAllAudio, useDictionaryQuery } from '../composables/composable.dictionary';
import { useStorage } from '../composables/composable.storage';
import { AiIntentId, TabId } from '../types';
import AiIntentToolbar from './component.ai-intent-toolbar';
import TokenizedContext from './component.tokenized-context';
import {
  AiMarkdownIntent,
  ConfusablesIntent,
  SentenceBreakdownIntent,
} from './async-views';

interface AiAssistantViewProps {
  initialQuery?: string;
  initialContext?: string;
  targetLang?: string;
  onSwitchTab?: (tab: TabId) => void;
}

const intentTitleMap: Record<AiIntentId, string> = {
  default: 'MAIN AI EXPLANATION',
  explain_in_context: 'EXPLAIN IN CONTEXT',
  grammar: 'GRAMMAR & NUANCE',
  collocations: 'PHRASE & COLLOCATIONS',
  sentence_breakdown: 'SENTENCE BREAKDOWN',
  confusables: 'COMPARE CONFUSABLES',
  rephrase: 'REPHRASE & STYLES',
  phrase_fallback: 'PHRASE EXPLANATION',
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

  const hasDistinctContext = useMemo(() => {
    const q = queryInput.trim().toLowerCase();
    const c = contextInput.trim().toLowerCase();
    return Boolean(c) && c !== q;
  }, [queryInput, contextInput]);

  const showContextEditor = isEditingContext || !contextInput.trim();
  const showContextCard = showContextEditor || hasDistinctContext || Boolean(contextError);
  const resultTargetLang = targetLang || settings.translateTargetLanguage;

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
    setIsEditingContext(!c);
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
    setIsEditingContext(!c);
    if (activeIntent === 'explain_in_context' && !c) {
      setContextError('Please enter or paste the sentence containing this word.');
    } else {
      setContextError('');
      runIntent(activeIntent, q, targetLang, c);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuery, initialContext]);

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

  function handleTokenSelect(word: string) {
    stopAllAudio();
    searchWord(word);
    onSwitchTab?.('dictionary');
  }

  function speakText(text?: string) {
    if (!text) return;
    speakTTS(text);
  }

  function copyResult(text?: string) {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    });
  }

  return (
    <div className="p-3.5 space-y-3.5 font-sans">
      {/* AI Intent Buttons Toolbar */}
      <AiIntentToolbar
        activeIntent={activeIntent}
        isIntentDisabled={(intentId) => {
          void intentStatusEpoch;
          const q = resolveQuery(queryInput, contextInput);
          if (!q) return true;
          return isAiIntentDisabled(intentId, q, contextInput, targetLang);
        }}
        getIntentStatus={(intentId) => {
          void intentStatusEpoch;
          const q = resolveQuery(queryInput, contextInput);
          if (!q) return 'unrequested';
          return getAiIntentStatus(intentId, q, contextInput, targetLang);
        }}
        onSelectIntent={handleIntentSelect}
        onPrefetchIntent={(intentId) => {
          const q = resolveQuery(queryInput, contextInput);
          if (!q) return;
          void preloadSpecificIntent(intentId, q, contextInput, targetLang);
        }}
      />

      {/* Single-line Lookup Search Bar */}
      <div className="space-y-2">
        <div className="relative flex items-center">
          <span className="absolute left-3 text-slate-400 pointer-events-none">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </span>
          <input
            value={queryInput}
            onChange={(e) => setQueryInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleIntentSelect(activeIntent);
            }}
            type="text"
            placeholder="Type or paste any word or sentence here to analyze..."
            className="w-full bg-dark-muted border border-dark-border rounded-xl pl-9 pr-28 py-2.5 text-xs text-slate-100 placeholder-slate-400 outline-none focus:border-teal-500 transition-all shadow-sm font-sans"
          />

          {queryInput ? (
            <button
              type="button"
              onClick={() => {
                setQueryInput('');
                stopAllAudio();
              }}
              title="Clear search text"
              className="absolute right-20 text-slate-400 hover:text-slate-200 p-1 cursor-pointer flex items-center justify-center"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          ) : null}

          <button
            type="button"
            onClick={() => handleIntentSelect(activeIntent)}
            disabled={!queryInput || isAiLoading}
            className="absolute right-1.5 px-3.5 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 active:scale-95 text-white text-xs font-bold transition-all disabled:opacity-50 shadow-sm cursor-pointer flex items-center gap-1"
          >
            <span>{isAiLoading ? 'Analyzing…' : 'Lookup'}</span>
          </button>
        </div>

        {/* One context surface: hidden when it would duplicate the query */}
        {!showContextCard ? (
          <div className="flex items-center justify-end px-1">
            <button
              type="button"
              onClick={() => setIsEditingContext(true)}
              className="text-[11px] text-teal-400 hover:text-teal-300 font-semibold cursor-pointer"
            >
              + Add context
            </button>
          </div>
        ) : (
          <div className="rounded-xl border border-dark-border bg-dark-muted/40 p-2.5 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Context</div>
                <p className="text-[10px] text-slate-500">
                  {showContextEditor
                    ? 'Paste the sentence that contains this word. Used only for this explanation.'
                    : 'Click any word → lookup in Dictionary'}
                </p>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {contextInput.trim() ? (
                  <button
                    type="button"
                    onClick={() => speakText(contextInput)}
                    title="Read context aloud"
                    className="text-xs px-2.5 py-1 rounded-lg bg-dark-surface hover:bg-dark-border text-slate-300 hover:text-white border border-dark-border transition-colors flex items-center gap-1.5 cursor-pointer font-semibold"
                  >
                    <span>🔊 Listen</span>
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => setIsEditingContext(!showContextEditor)}
                  className="text-xs px-2.5 py-1 rounded-lg bg-dark-surface hover:bg-dark-border text-slate-300 hover:text-white border border-dark-border transition-colors cursor-pointer font-semibold"
                >
                  {showContextEditor ? 'Done' : 'Edit'}
                </button>
              </div>
            </div>

            {showContextEditor ? (
              <textarea
                value={contextInput}
                onChange={(e) => setContextInput(e.target.value)}
                onBlur={() => setIsEditingContext(!contextInput.trim())}
                rows={2}
                placeholder="Paste the sentence or context here..."
                className="w-full bg-dark-muted border border-dark-border rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-400 outline-none focus:border-teal-500 resize-y min-h-[52px]"
              />
            ) : (
              <TokenizedContext
                text={contextInput}
                query={queryInput}
                onSelectToken={handleTokenSelect}
              />
            )}

            {contextError ? <p className="text-[11px] text-rose-400">{contextError}</p> : null}
          </div>
        )}
      </div>

      {/* AI Header Row with Listen & Copy Buttons */}
      {aiResult ? (
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2">
            <span className="text-teal-400 text-sm">✨</span>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
              <span>{intentTitleMap[aiResult.type as AiIntentId] || 'AI ANALYSIS'}</span>
            </h2>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => speakText(aiResult.summary)}
              title="Read aloud"
              className="px-2.5 py-1 rounded-lg bg-dark-surface hover:bg-dark-border text-slate-300 hover:text-white border border-dark-border text-[11px] font-semibold transition-colors flex items-center gap-1 shadow-sm cursor-pointer"
            >
              <span>🔊 Listen</span>
            </button>

            <button
              type="button"
              onClick={() => copyResult(aiResult.summary)}
              title="Copy response"
              className="px-2.5 py-1 rounded-lg bg-dark-surface hover:bg-dark-border text-slate-300 hover:text-white border border-dark-border text-[11px] font-semibold transition-colors flex items-center gap-1 shadow-sm cursor-pointer"
            >
              <span>{copied ? '✓ Copied' : '📋 Copy'}</span>
            </button>
          </div>
        </div>
      ) : null}

      {/* AI Loading State */}
      {isAiLoading ? (
        <div className="p-4 rounded-xl border border-dark-border bg-[#0a161d] animate-pulse space-y-3">
          <div className="h-3 bg-dark-border rounded w-1/3"></div>
          <div className="h-16 bg-dark-border rounded w-full"></div>
          <div className="h-16 bg-dark-border rounded w-full"></div>
        </div>
      ) : aiError ? (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400">
          ⚠️ {aiError}
        </div>
      ) : aiResult ? (
        <Suspense fallback={<div className="p-3 text-xs text-slate-400">Loading analysis…</div>}>
          {aiResult.type === 'sentence_breakdown' ? (
            <SentenceBreakdownIntent result={aiResult} targetLang={resultTargetLang} />
          ) : aiResult.type === 'confusables' ? (
            <ConfusablesIntent result={aiResult} targetLang={resultTargetLang} />
          ) : (
            <AiMarkdownIntent
              result={aiResult}
              targetLang={resultTargetLang}
              onSelectWord={handleTokenSelect}
            />
          )}
        </Suspense>
      ) : null}
    </div>
  );
};

export default AiAssistantView;
