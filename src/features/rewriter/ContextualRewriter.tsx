import React, { useEffect, useRef, useState } from 'react';
import { useStorage } from '@/composables/composable.storage';
import { useDictionaryAudio } from '@/composables/composable.dictionary';
import { cx } from '@/ui/cx';
import { IconCheck, IconCopy, IconSparkles, IconSpeaker } from '@/components/icons';
import { showToast } from '@/composables/composable.toast';
import { requestAiLookup } from '@/shared/runtime-client';
import { createRequestId } from '@/shared/messages';
import { AiResult } from '@/types';
import MarkdownRenderer from '@/components/component.markdown-renderer';

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

export const ContextualRewriter: React.FC<ContextualRewriterProps> = ({
  initialText = '',
  contextSentence = '',
  targetLang,
}) => {
  const { settings } = useStorage();
  const { playPronunciation } = useDictionaryAudio();
  const [inputText, setInputText] = useState(initialText || contextSentence || '');
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
        intent: 'rephrase',
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
    if (initialText || contextSentence) {
      const init = (initialText || contextSentence).trim();
      setInputText(init);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialText, contextSentence]);

  return (
    <div className="p-4 space-y-4 font-sans">
      {/* Input Composer */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-bold uppercase tracking-wider text-content-muted">
            Original Text to Polish
          </label>
          {inputText ? (
            <button
              type="button"
              onClick={() => {
                setInputText('');
                setRewriteResult(null);
                setRewriteError(null);
              }}
              className="text-[11px] text-content-muted hover:text-content cursor-pointer"
            >
              Clear
            </button>
          ) : null}
        </div>
        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          rows={3}
          placeholder="Paste or type a sentence, email draft, or paragraph to rephrase and correct…"
          className="w-full bg-muted/40 hover:bg-muted/60 focus:bg-surface border border-border focus:border-accent rounded-xl p-3 text-xs text-content placeholder:text-content-muted outline-none transition-all resize-y min-h-[70px]"
        />
      </div>

      {/* Preset Style Buttons */}
      <div className="space-y-1.5">
        <span className="text-[10px] uppercase font-bold tracking-wider text-content-muted block">
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
                  'p-2.5 rounded-xl border text-left cursor-pointer transition-all shadow-2xs',
                  isSelected
                    ? 'chip-active ring-1 ring-accent/30 font-bold'
                    : 'bg-surface hover:bg-elevated text-content-secondary border-border',
                )}
              >
                <div className="text-xs text-content font-semibold">{st.label}</div>
                <div className="text-[10.5px] text-content-muted">{st.desc}</div>
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={() => handleRewrite(activeStyle)}
          disabled={!inputText.trim() || isRewriting}
          className="w-full h-9 mt-1 rounded-xl bg-accent hover:opacity-90 text-white dark:text-neutral-950 text-[13px] font-bold transition-all disabled:opacity-40 disabled:pointer-events-none cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
        >
          {isRewriting ? (
            <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : (
            <IconSparkles className="w-3.5 h-3.5" />
          )}
          <span>{isRewriting ? 'Rewriting…' : 'Rewrite'}</span>
        </button>
      </div>

      {/* Results Deck */}
      <div className="pt-2 space-y-3">
        {isRewriting ? (
          <div className="p-4 rounded-xl border border-border bg-surface shadow-xs space-y-3">
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
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-600 dark:text-rose-400">
            {rewriteError}
          </div>
        ) : !rewriteResult ? (
          <div className="p-3.5 rounded-xl border border-dashed border-border bg-muted/20 text-[12.5px] text-content-muted leading-relaxed">
            Choose a tone, then click Rewrite. Nothing is sent until you ask.
          </div>
        ) : (
          <div className="space-y-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-accent font-mono block">
              Rewritten Suggestions
            </span>

            {rewriteResult.rephraseStyles?.length ? (
              <div className="space-y-2.5">
                {rewriteResult.rephraseStyles.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl border border-border bg-surface shadow-2xs space-y-2 hover:border-accent/30 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10.5px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-accent-subtle text-accent border border-accent/20 font-mono">
                        {item.label || item.style}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleSpeak(item.text, `speak-${idx}`)}
                          title="Read aloud"
                          className="h-6 w-6 rounded border border-border bg-surface hover:bg-elevated text-content-muted hover:text-accent flex items-center justify-center cursor-pointer transition-colors shadow-2xs"
                        >
                          <IconSpeaker className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCopy(item.text, `style-${idx}`)}
                          className="h-6 px-2 rounded border border-border bg-surface hover:bg-elevated text-[10.5px] font-semibold flex items-center gap-1 text-content-secondary hover:text-content cursor-pointer transition-colors shadow-2xs"
                        >
                          {copiedId === `style-${idx}` ? (
                            <IconCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                          ) : (
                            <IconCopy className="w-3 h-3 text-content-muted" />
                          )}
                          <span>{copiedId === `style-${idx}` ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-content leading-relaxed font-medium">
                      “{item.text}”
                    </p>

                    {item.note ? (
                      <p className="text-[11px] text-content-muted italic">
                        Note: {item.note}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : rewriteResult.summary ? (
              <div className="p-3.5 rounded-xl border border-border bg-surface shadow-2xs space-y-2">
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => handleCopy(rewriteResult.summary || '', 'summary')}
                    className="h-6 px-2 rounded border border-border bg-surface hover:bg-elevated text-[10.5px] font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    {copiedId === 'summary' ? (
                      <IconCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <IconCopy className="w-3 h-3" />
                    )}
                    <span>Copy</span>
                  </button>
                </div>
                <div className="text-xs text-content leading-relaxed">
                  <MarkdownRenderer
                    content={rewriteResult.summary}
                    targetLang={targetLang || settings.translateTargetLanguage}
                  />
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
};

export default ContextualRewriter;
