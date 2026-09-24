import React, { useEffect, useRef, useState } from 'react';
import { useSettings } from '@/composables/composable.storage';
import { useDictionaryAudio } from '@/composables/composable.dictionary';
import { cx } from '@/ui/cx';
import { IconCheck, IconCopy, IconSparkles, IconSpeaker } from '@/components/icons';
import { showToast } from '@/composables/composable.toast';
import { cancelAiLookup, requestAiLookup } from '@/shared/runtime-client';
import { createRequestId } from '@/shared/messages';
import { AiResult } from '@/types';
import { parseRewriteMarkdown } from './rewrite-markdown';
import RewriterMarkdownView from './RewriterMarkdownView';

interface ContextualRewriterProps {
  initialText?: string;
  contextSentence?: string;
  targetLang?: string;
}

const REWRITE_STYLES = [
  { id: 'formal', label: 'Polished & Formal', desc: 'Refined, professional tone' },
  { id: 'natural', label: 'Clear & Natural', desc: 'Idiomatic and fluent native phrasing' },
  { id: 'concise', label: 'Concise & Direct', desc: 'Eliminates fluff and wordiness' },
  { id: 'casual', label: 'Casual & Friendly', desc: 'Relaxed conversational tone' },
];

function seedRewriterText(selected: string, surrounding: string): string {
  const text = selected.trim();
  const context = surrounding.trim();
  if (!text) return context;
  if (!context) return text;
  if (context.toLowerCase() === text.toLowerCase()) return text;
  if (context.toLowerCase().includes(text.toLowerCase()) && context.split(/\s+/).length > text.split(/\s+/).length) {
    return context;
  }
  return text;
}

export const ContextualRewriter: React.FC<ContextualRewriterProps> = ({
  initialText = '',
  contextSentence = '',
  targetLang,
}) => {
  const settings = useSettings();
  const { playPronunciation } = useDictionaryAudio();
  const [inputText, setInputText] = useState(() => seedRewriterText(initialText, contextSentence));
  const [activeStyle, setActiveStyle] = useState('natural');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Independent rewrite state — never shares or displays the dictionary AI assistant state
  const [rewriteResult, setRewriteResult] = useState<AiResult | null>(null);
  const [isRewriting, setIsRewriting] = useState(false);
  const [rewriteError, setRewriteError] = useState<string | null>(null);

  const activeReqRef = useRef<string | null>(null);

  async function handleRewrite(style = activeStyle) {
    const textToRun = inputText.trim();
    if (!textToRun) return;

    if (!settings.enableAI) {
      setRewriteError('AI is disabled in Settings. Please enable it to use Rewriter.');
      return;
    }

    setActiveStyle(style);
    setIsRewriting(true);
    setRewriteError(null);

    const styleObj = REWRITE_STYLES.find((s) => s.id === style);
    const styleHint = styleObj ? `Style: ${styleObj.label} (${styleObj.desc})` : '';
    const reqId = createRequestId('rewrite');
    activeReqRef.current = reqId;

    try {
      const result = await requestAiLookup({
        text: textToRun,
        intent: 'rewrite',
        context: styleHint,
        targetLang: targetLang || settings.translateTargetLanguage || 'Vietnamese',
        requestId: reqId,
      });

      if (activeReqRef.current === reqId) {
        setRewriteResult(result);
      }
    } catch (err: unknown) {
      if (activeReqRef.current === reqId) {
        const message = err instanceof Error ? err.message : 'Rewriting failed. Please try again.';
        setRewriteError(
          /Extension context invalidated|runtime is unavailable/i.test(message)
            ? 'Extension was reloaded. Refresh this page and try again.'
            : message,
        );
      }
    } finally {
      if (activeReqRef.current === reqId) {
        setIsRewriting(false);
      }
    }
  }

  function handleSpeak(text: string, id: string) {
    if (!text) return;
    playPronunciation({ text, language: 'en-US', key: id });
  }

  function handleCopy(text: string, id: string) {
    void navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      showToast('Copied rewritten text to clipboard');
      setTimeout(() => setCopiedId(null), 1800);
    });
  }

  useEffect(() => {
    const seeded = seedRewriterText(initialText, contextSentence);
    if (seeded) setInputText(seeded);
  }, [initialText, contextSentence]);

  useEffect(() => () => {
    const requestId = activeReqRef.current;
    activeReqRef.current = null;
    if (requestId) cancelAiLookup('rewrite', requestId);
  }, []);

  return (
    <div className="rewrite-workspace p-4 font-sans">
      <div className="feature-intro rewrite-intro flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-accent-subtle border border-accent/25 flex items-center justify-center shrink-0">
          <IconSparkles className="w-4 h-4 text-accent" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-content tracking-tight">Rewrite studio</h2>
          <p className="text-[12px] text-content-muted">Shape your words for the moment</p>
        </div>
      </div>
      <div className="rewrite-composer space-y-4">
      {/* Input Composer */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-[12px] font-bold uppercase tracking-wider text-content-muted">
            Text to polish
          </label>
          {inputText ? (
            <button
              type="button"
              onClick={() => {
                setInputText('');
                setRewriteResult(null);
                setRewriteError(null);
              }}
              className="text-[12px] text-content-muted hover:text-content cursor-pointer"
            >
              Clear
            </button>
          ) : null}
        </div>
        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Paste a sentence, email draft, or short paragraph. Selecting one word on a page seeds the full sentence when available."
          className="ui-control w-full rounded-2xl p-3.5 text-[15px] placeholder:text-content-muted resize-y min-h-[112px] shadow-inner-light"
          rows={5}
        />
      </div>

      {/* Preset Style Buttons */}
      <div className="space-y-1.5">
        <span className="text-[11px] uppercase font-bold tracking-wider text-content-muted block">
          Select Desired Tone & Style:
        </span>
        <div className="grid grid-cols-2 gap-2">
          {REWRITE_STYLES.map((st) => {
            const isSelected = activeStyle === st.id;
            return (
              <button
                key={st.id}
                type="button"
                onClick={() => setActiveStyle(st.id)}
                className={cx(
                  'p-3 rounded-2xl border text-left cursor-pointer transition-colors shadow-xs focus-visible:ring-2 focus-visible:ring-accent',
                  isSelected
                    ? 'chip-active ring-1 ring-accent/30 font-bold'
                    : 'bg-surface hover:bg-elevated text-content-secondary border-border',
                )}
              >
                <div className="text-xs text-content font-semibold">{st.label}</div>
                <div className="text-[11.5px] text-content-muted">{st.desc}</div>
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={() => handleRewrite(activeStyle)}
          disabled={!inputText.trim() || isRewriting}
          className="ui-button-primary w-full h-10 mt-1 text-[14px] font-bold disabled:pointer-events-none cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
        >
          {isRewriting ? (
            <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : (
            <IconSparkles className="w-3.5 h-3.5" />
          )}
          <span>{isRewriting ? 'Rewriting…' : 'Rewrite'}</span>
        </button>
      </div>

      </div>
      {/* Results Deck */}
      <div className="rewrite-results space-y-3">
        {isRewriting ? (
          <div className="p-4 rounded-2xl border border-border/80 bg-surface/90 shadow-xs space-y-3.5">
            <div className="flex items-center justify-between pb-1.5 border-b border-border/60">
              <div className="h-3.5 skeleton-shimmer rounded w-1/3"></div>
              <div className="h-3 skeleton-shimmer rounded w-16"></div>
            </div>
            <div className="space-y-2">
              <div className="h-3.5 skeleton-shimmer rounded w-full"></div>
              <div className="h-3.5 skeleton-shimmer rounded w-4/5"></div>
            </div>
          </div>
        ) : rewriteError ? (
          <div role="alert" className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/25 text-[13.5px] text-rose-600 dark:text-rose-400 shadow-xs">
            {rewriteError}
          </div>
        ) : !rewriteResult ? (
          <div className="p-4 rounded-2xl border border-dashed border-border/80 bg-muted/20 text-[13.5px] text-content-muted leading-relaxed text-center">
            Choose a tone, then click Rewrite. Nothing is sent until you ask.
          </div>
        ) : (
          <div className="space-y-3">
            <span className="text-[12px] font-bold uppercase tracking-wider text-accent font-mono block">
              Rewritten Suggestions
            </span>

            {rewriteResult.summary ? (
              <RewriteResultDeck
                markdown={rewriteResult.summary}
                copiedId={copiedId}
                onCopy={handleCopy}
                onSpeak={handleSpeak}
              />
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
};

function RewriteResultDeck({
  markdown,
  copiedId,
  onCopy,
  onSpeak,
}: {
  markdown: string;
  copiedId: string | null;
  onCopy: (text: string, id: string) => void;
  onSpeak: (text: string, id: string) => void;
}) {
  const parsed = parseRewriteMarkdown(markdown);
  const polished = parsed.polished;

  return (
    <div className="space-y-3">
      {polished ? (
        <div className="p-4 rounded-2xl border border-accent/30 bg-accent-subtle/40 shadow-xs space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11.5px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-accent-subtle text-accent border border-accent/20 font-mono">
              Polished rewrite
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => onSpeak(polished, 'speak-polished')}
                title="Read aloud"
                className="h-7 w-7 rounded-lg border border-border/80 bg-surface hover:bg-elevated text-content-muted hover:text-accent flex items-center justify-center cursor-pointer transition-colors shadow-2xs active:scale-95"
              >
                <IconSpeaker className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onCopy(polished, 'polished')}
                className="h-7 px-2.5 rounded-lg border border-border/80 bg-surface hover:bg-elevated text-[11.5px] font-semibold flex items-center gap-1 text-content-secondary hover:text-content cursor-pointer transition-colors shadow-2xs active:scale-95"
              >
                {copiedId === 'polished' ? (
                  <IconCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <IconCopy className="w-3 h-3 text-content-muted" />
                )}
                <span>{copiedId === 'polished' ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>
          <p className="font-serif text-reading text-content whitespace-pre-wrap">
            {polished}
          </p>
        </div>
      ) : null}

      {parsed.sections.length ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11.5px] uppercase font-bold tracking-wider text-content-muted">
              Coaching notes
            </span>
            <button
              type="button"
              onClick={() => onCopy(markdown, 'summary')}
              className="h-6 px-2 rounded border border-border bg-surface hover:bg-elevated text-[11.5px] font-semibold flex items-center gap-1 cursor-pointer"
            >
              {copiedId === 'summary' ? (
                <IconCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <IconCopy className="w-3 h-3" />
              )}
              <span>{copiedId === 'summary' ? 'Copied' : 'Copy all'}</span>
            </button>
          </div>
          <RewriterMarkdownView content={markdown} />
        </div>
      ) : null}
    </div>
  );
}

export default ContextualRewriter;
