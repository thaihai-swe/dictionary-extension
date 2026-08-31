<script setup lang="ts">
import { computed } from 'vue';
import { useDictionary } from '../composables/composable.dictionary';
import {
  ExampleRenderItem,
  groupMarkdownLines,
  isExampleSectionTitle,
  languageBadge,
} from '../shared/ai-example-blocks';

const props = defineProps<{
  content?: string;
  targetLang?: string;
}>();

const { playPronunciation, playingKey } = useDictionary();

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

const parsedBlocks = computed<SectionBlock[]>(() => {
  if (!props.content) return [];
  const text = props.content.trim();
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
        targetLang: props.targetLang,
      }),
    };
  });
});

function formatInlineMarkdown(text: string): string {
  if (!text) return '';
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong class="text-slate-100 font-bold">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em class="text-teal-300 italic">$1</em>')
    .replace(/`(.*?)`/g, '<code class="px-1.5 py-0.5 rounded bg-dark-muted border border-dark-border text-teal-300 font-mono text-[11px]">$1</code>');
}

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
</script>

<template>
  <div class="space-y-4 text-sm">
    <div
      v-for="(block, bIdx) in parsedBlocks"
      :key="bIdx"
      class="space-y-2.5 pb-4 border-b border-dark-border/40 last:border-b-0 last:pb-0"
    >
      <h4 v-if="block.title" class="font-extrabold text-xs flex items-center gap-1.5 text-teal-400 uppercase tracking-wider pb-0.5">
        <span class="text-sm leading-none">{{ block.icon }}</span>
        <span>{{ block.title }}</span>
      </h4>

      <div class="space-y-2.5 text-slate-100 leading-relaxed text-sm">
        <template v-for="(item, lIdx) in block.items" :key="lIdx">
          <div
            v-if="item.kind === 'example'"
            class="rounded-xl border border-dark-border overflow-hidden bg-dark-surface/90 my-2 shadow-xs"
          >
            <!-- English Sentence Row -->
            <div class="flex items-start gap-3 px-3.5 py-3 bg-dark-muted/20 border-l-2 border-teal-500">
              <span class="mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-extrabold tracking-wider bg-teal-500/15 text-teal-400 border border-teal-500/30 flex-shrink-0">EN</span>
              <p class="flex-1 text-sm leading-relaxed text-slate-100 font-medium italic">"{{ item.english }}"</p>
              <button
                type="button"
                @click="listenExample(item.english, bIdx, lIdx)"
                title="Listen to English example"
                :class="[
                  'px-2.5 py-1 rounded-lg border text-xs font-semibold flex-shrink-0 cursor-pointer transition-colors flex items-center gap-1 not-italic shadow-xs',
                  playingKey === listenKey(bIdx, lIdx)
                    ? 'bg-teal-500/25 text-teal-200 border-teal-500/50'
                    : 'bg-dark-surface hover:bg-dark-border text-slate-200 hover:text-white border-dark-border'
                ]"
                :aria-pressed="playingKey === listenKey(bIdx, lIdx)"
              >
                <span>🔊 Listen</span>
              </button>
            </div>
            <!-- Target Language Translation Row -->
            <div
              v-if="item.translation"
              class="flex items-start gap-3 px-3.5 py-2.5 bg-dark-paper/50 border-t border-dark-border/50 border-l-2 border-slate-600"
            >
              <span class="mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-extrabold tracking-wider bg-slate-700/60 text-slate-300 border border-slate-600/60 flex-shrink-0">
                {{ languageBadge(targetLang) }}
              </span>
              <p class="flex-1 text-xs leading-relaxed text-slate-300 font-normal">{{ item.translation }}</p>
            </div>
          </div>

          <blockquote
            v-else-if="item.kind === 'quote'"
            class="my-2 pl-3.5 border-l-2 border-teal-500/80 italic text-slate-100 bg-teal-500/10 py-2 px-3.5 rounded-r-lg text-sm"
            v-html="formatInlineMarkdown(item.text)"
          ></blockquote>

          <div
            v-else-if="item.kind === 'bullet'"
            class="flex items-start gap-2.5 pl-0.5"
          >
            <span class="font-bold text-teal-400 text-base leading-none pt-0.5">•</span>
            <span class="flex-1 text-sm text-slate-100 leading-relaxed" v-html="formatInlineMarkdown(item.text)"></span>
          </div>

          <p
            v-else-if="item.kind === 'paragraph' && item.text.trim()"
            class="text-sm text-slate-100 leading-relaxed"
            v-html="formatInlineMarkdown(item.text)"
          ></p>
        </template>
      </div>
    </div>
  </div>
</template>
