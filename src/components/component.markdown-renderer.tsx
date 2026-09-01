import React, { useMemo } from 'react';
import { useDictionary } from '../composables/composable.dictionary';
import {
  ExampleRenderItem,
  groupMarkdownLines,
  isExampleSectionTitle,
  languageBadge,
} from '../shared/ai-example-blocks';

interface MarkdownRendererProps {
  content?: string;
  targetLang?: string;
}

interface SectionBlock {
  title?: string;
  icon: string;
  exampleSection: boolean;
  items: ExampleRenderItem[];
}

function getSectionIcon(title?: string): string {
  if (!title) return '📌';
  const t = title.toLowerCase();

  if (t.includes('senses') || t.includes('meanings')) return '📚';
  if (t.includes('translation')) return '🌐';
  if (t.includes('usage')) return '📌';
  if (t.includes('etymology') || t.includes('deep understanding') || t.includes('origin')) return '🌱';
  if (t.includes('meaning') || t.includes('context')) return '🎯';
  if (t.includes('substitution') || t.includes('synonym') || t.includes('equivalent')) return '🔄';
  if (t.includes('nuance') || t.includes('connotation') || t.includes('tone') || t.includes('formality')) return '🎭';
  if (t.includes('paraphrase') || t.includes('simplified') || t.includes('rephrase')) return '💬';
  if (t.includes('syntactic') || t.includes('breakdown') || t.includes('structure')) return '📐';
  if (t.includes('pattern') || t.includes('rule')) return '📜';
  if (t.includes('collocation') || t.includes('partner')) return '🔗';
  if (t.includes('example') || t.includes('minimal')) return '📝';
  if (t.includes('distinction') || t.includes('compare') || t.includes('matrix')) return '⚖️';
  if (t.includes('academic') || t.includes('formal')) return '🏛️';
  if (t.includes('native') || t.includes('idiom')) return '🗣️';

  return '📌';
}

function formatInlineMarkdown(text: string): string {
  if (!text) return '';
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong class="text-slate-100 font-bold">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em class="text-teal-300 italic">$1</em>')
    .replace(/`(.*?)`/g, '<code class="px-1.5 py-0.5 rounded bg-dark-muted border border-dark-border text-teal-300 font-mono text-[11px]">$1</code>');
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, targetLang }) => {
  const { playPronunciation, playingKey } = useDictionary();

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
        icon: getSectionIcon(block.title),
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
    <div className="space-y-4 text-sm">
      {parsedBlocks.map((block, bIdx) => (
        <div
          key={bIdx}
          className="space-y-2.5 pb-4 border-b border-dark-border/40 last:border-b-0 last:pb-0"
        >
          {block.title && (
            <h4 className="font-extrabold text-xs flex items-center gap-1.5 text-teal-400 uppercase tracking-wider pb-0.5">
              <span className="text-sm leading-none">{block.icon}</span>
              <span>{block.title}</span>
            </h4>
          )}

          <div className="space-y-2.5 text-slate-100 leading-relaxed text-sm">
            {block.items.map((item, lIdx) => {
              if (item.kind === 'example') {
                const key = listenKey(bIdx, lIdx);
                const isPlaying = playingKey === key;
                return (
                  <div
                    key={lIdx}
                    className="rounded-xl border border-dark-border overflow-hidden bg-dark-surface/90 my-2 shadow-xs"
                  >
                    <div className="flex items-start gap-3 px-3.5 py-3 bg-dark-muted/20 border-l-2 border-teal-500">
                      <span className="mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-extrabold tracking-wider bg-teal-500/15 text-teal-400 border border-teal-500/30 flex-shrink-0">
                        EN
                      </span>
                      <p className="flex-1 text-sm leading-relaxed text-slate-100 font-medium italic">
                        "{item.english}"
                      </p>
                      <button
                        type="button"
                        onClick={() => listenExample(item.english, bIdx, lIdx)}
                        title="Listen to English example"
                        className={`px-2.5 py-1 rounded-lg border text-xs font-semibold flex-shrink-0 cursor-pointer transition-colors flex items-center gap-1 not-italic shadow-xs ${
                          isPlaying
                            ? 'bg-teal-500/25 text-teal-200 border-teal-500/50'
                            : 'bg-dark-surface hover:bg-dark-border text-slate-200 hover:text-white border-dark-border'
                        }`}
                        aria-pressed={isPlaying}
                      >
                        <span>🔊 Listen</span>
                      </button>
                    </div>
                    {item.translation && (
                      <div className="flex items-start gap-3 px-3.5 py-2.5 bg-dark-paper/50 border-t border-dark-border/50 border-l-2 border-slate-600">
                        <span className="mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-extrabold tracking-wider bg-slate-700/60 text-slate-300 border border-slate-600/60 flex-shrink-0">
                          {languageBadge(targetLang)}
                        </span>
                        <p className="flex-1 text-xs leading-relaxed text-slate-300 font-normal">
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
                    className="my-2 pl-3.5 border-l-2 border-teal-500/80 italic text-slate-100 bg-teal-500/10 py-2 px-3.5 rounded-r-lg text-sm"
                    dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(item.text) }}
                  />
                );
              }

              if (item.kind === 'bullet') {
                return (
                  <div key={lIdx} className="flex items-start gap-2.5 pl-0.5">
                    <span className="font-bold text-teal-400 text-base leading-none pt-0.5">•</span>
                    <span
                      className="flex-1 text-sm text-slate-100 leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(item.text) }}
                    />
                  </div>
                );
              }

              if (item.kind === 'paragraph' && item.text.trim()) {
                return (
                  <p
                    key={lIdx}
                    className="text-sm text-slate-100 leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(item.text) }}
                  />
                );
              }

              return null;
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

export default MarkdownRenderer;
