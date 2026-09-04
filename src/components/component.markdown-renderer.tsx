import React, { useMemo } from 'react';
import { useDictionaryAudio } from '../composables/composable.dictionary';
import {
  ExampleRenderItem,
  groupMarkdownLines,
  isExampleSectionTitle,
  languageBadge,
} from '../shared/ai-example-blocks';
import { IconSpeaker } from './icons';

interface MarkdownRendererProps {
  content?: string;
  targetLang?: string;
}

interface SectionBlock {
  title?: string;
  exampleSection: boolean;
  items: ExampleRenderItem[];
}

const IN_CONTEXT_BADGE =
  '<span class="inline-flex items-center px-2 py-0.5 ml-1.5 rounded-full text-[10.5px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 uppercase tracking-wide font-mono select-none">Used in context</span>';

function formatInlineMarkdown(text: string): string {
  if (!text) return '';
  return text
    .replace(/\*\*(?:used in this context|in context)\*\*/gi, IN_CONTEXT_BADGE)
    .replace(/\[(?:used in this context|in context)\]/gi, IN_CONTEXT_BADGE)
    .replace(/\*\*(.*?)\*\*/g, '<strong class="text-content font-bold">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em class="text-teal-600 dark:text-teal-300 italic">$1</em>')
    .replace(/`(.*?)`/g, '<code class="px-1.5 py-0.5 rounded bg-muted border border-border text-teal-600 dark:text-teal-300 font-mono text-[12px]">$1</code>');
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, targetLang }) => {
  const { playPronunciation, playingKey } = useDictionaryAudio();

  const parsedBlocks = useMemo<SectionBlock[]>(() => {
    if (!content) return [];
    const text = content.trim();
    const rawLines = text.split('\n');

    const blocks: Array<{ title?: string; lines: string[] }> = [];
    let currentTitle = '';
    let currentLines: string[] = [];

    for (const line of rawLines) {
      const trimmedLine = line.trim();
      if (trimmedLine.startsWith('### ') || trimmedLine.startsWith('## ')) {
        if (currentLines.length > 0 || currentTitle) {
          blocks.push({ title: currentTitle, lines: currentLines });
        }
        currentTitle = trimmedLine.replace(/^#+\s*/, '');
        currentLines = [];
      } else {
        currentLines.push(line);
      }
    }

    if (currentLines.length > 0 || currentTitle) {
      blocks.push({ title: currentTitle, lines: currentLines });
    }

    return blocks.map((block) => {
      const exampleSection = isExampleSectionTitle(block.title);
      return {
        title: block.title,
        exampleSection,
        items: groupMarkdownLines(block.lines, {
          exampleSection,
          targetLang,
        }),
      };
    });
  }, [content, targetLang]);

  function listenKey(blockIndex: number, itemIndex: number): string {
    return `ai-example-${blockIndex}-${itemIndex}`;
  }

  function listenExample(text: string, blockIndex: number, itemIndex: number) {
    playPronunciation({
      text,
      language: 'en-US',
      key: listenKey(blockIndex, itemIndex),
    });
  }

  return (
    <div className="space-y-4 text-[14px]">
      {parsedBlocks.map((block, bIdx) => (
        <div
          key={bIdx}
          className="space-y-2.5 pb-3.5 border-b border-border/40 last:border-b-0 last:pb-0"
        >
          {block.title && (
            <h4 className="font-extrabold text-[12px] flex items-center gap-1.5 text-teal-600 dark:text-teal-400 uppercase tracking-wider pb-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
              <span>{block.title}</span>
            </h4>
          )}

          <div className="space-y-2 text-content leading-relaxed text-[14px]">
            {block.items.map((item, lIdx) => {
              if (item.kind === 'example') {
                const key = listenKey(bIdx, lIdx);
                const isPlaying = playingKey === key;
                return (
                  <div
                    key={lIdx}
                    className="rounded-xl border border-border overflow-hidden bg-surface my-2 shadow-xs"
                  >
                    <div className="flex items-start gap-3 px-3.5 py-2.5 bg-teal-500/5 border-l-2 border-teal-500">
                      <span className="mt-0.5 px-1.5 py-0.5 rounded text-[11px] font-extrabold tracking-wider bg-teal-500/15 text-teal-600 dark:text-teal-400 border border-teal-500/30 flex-shrink-0">
                        EN
                      </span>
                      <p className="flex-1 text-[14px] leading-relaxed text-content font-medium">
                        "{item.english}"
                      </p>
                      <button
                        type="button"
                        onClick={() => listenExample(item.english, bIdx, lIdx)}
                        title="Listen to English example"
                        className={`h-[28px] px-2.5 rounded-lg border text-[12px] font-semibold flex-shrink-0 cursor-pointer transition-colors flex items-center gap-1.5 not-italic shadow-xs ${
                          isPlaying
                            ? 'bg-teal-500/25 text-teal-600 dark:text-teal-200 border-teal-500/50'
                            : 'bg-surface hover:bg-elevated text-content-secondary hover:text-content border-border'
                        }`}
                        aria-pressed={isPlaying}
                      >
                        <IconSpeaker className="w-3.5 h-3.5 text-teal-500 dark:text-teal-400" />
                        <span>Listen</span>
                      </button>
                    </div>
                    {item.translation && (
                      <div className="flex items-start gap-3 px-3.5 py-2 bg-muted/30 border-t border-border/50 border-l-2 border-border">
                        <span className="mt-0.5 px-1.5 py-0.5 rounded text-[11px] font-extrabold tracking-wider bg-muted text-content-secondary border border-border flex-shrink-0">
                          {languageBadge(targetLang)}
                        </span>
                        <p className="flex-1 text-[13px] leading-relaxed text-content-secondary font-normal">
                          {item.translation}
                        </p>
                      </div>
                    )}
                  </div>
                );
              }

              if (item.kind === 'quote') {
                return (
                  <blockquote
                    key={lIdx}
                    className="pl-3.5 py-1.5 border-l-2 border-teal-500/60 text-content-secondary text-[14px] my-1 bg-teal-500/5 rounded-r-lg"
                    dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(item.text) }}
                  />
                );
              }

              if (item.kind === 'bullet') {
                return (
                  <div key={lIdx} className="flex items-start gap-2 text-[14px] text-content">
                    <span className="text-teal-600 dark:text-teal-400 font-bold mt-0.5">•</span>
                    <span dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(item.text) }} />
                  </div>
                );
              }

              return (
                <p
                  key={lIdx}
                  className="text-[14px] text-content-secondary leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(item.text) }}
                />
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

export default MarkdownRenderer;
