<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  content?: string;
}>();

interface SectionBlock {
  title?: string;
  icon: string;
  lines: string[];
}

function getSectionIcon(title?: string): string {
  if (!title) return '📌';
  const t = title.toLowerCase();

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

  const blocks: SectionBlock[] = [];
  let currentTitle = '';
  let currentLines: string[] = [];

  for (const line of rawLines) {
    const trimmedLine = line.trim();
    if (trimmedLine.startsWith('### ') || trimmedLine.startsWith('## ')) {
      if (currentLines.length > 0 || currentTitle) {
        blocks.push({
          title: currentTitle,
          icon: getSectionIcon(currentTitle),
          lines: currentLines,
        });
      }
      currentTitle = trimmedLine.replace(/^#+\s*/, '');
      currentLines = [];
    } else {
      currentLines.push(line);
    }
  }

  if (currentLines.length > 0 || currentTitle) {
    blocks.push({
      title: currentTitle,
      icon: getSectionIcon(currentTitle),
      lines: currentLines,
    });
  }

  return blocks;
});

function formatInlineMarkdown(text: string): string {
  if (!text) return '';
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong class="text-slate-100 font-bold">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em class="text-teal-300 italic">$1</em>')
    .replace(/`(.*?)`/g, '<code class="px-1.5 py-0.5 rounded bg-dark-muted border border-dark-border text-teal-300 font-mono text-[11px]">$1</code>');
}
</script>

<template>
  <div class="space-y-3 text-xs">
    <div
      v-for="(block, bIdx) in parsedBlocks"
      :key="bIdx"
      class="p-3.5 rounded-xl border border-dark-border bg-[#0a161d] space-y-2.5 shadow-sm transition-all hover:border-slate-700/80"
    >
      <!-- Subheading with Distinct Visual Icon -->
      <h4 v-if="block.title" class="font-bold text-xs flex items-center gap-2 text-teal-400 uppercase tracking-wide border-b border-dark-border/60 pb-2">
        <span class="text-sm leading-none">{{ block.icon }}</span>
        <span>{{ block.title }}</span>
      </h4>

      <!-- Lines -->
      <div class="space-y-2 text-slate-200 leading-relaxed text-xs">
        <template v-for="(line, lIdx) in block.lines" :key="lIdx">
          <!-- Blockquote -->
          <blockquote
            v-if="line.trim().startsWith('>')"
            class="my-1.5 pl-3 border-l-2 border-teal-500/80 italic text-slate-200 bg-teal-500/10 py-1.5 px-3 rounded-r-lg"
            v-html="formatInlineMarkdown(line.trim().replace(/^>\s*/, ''))"
          ></blockquote>

          <!-- Bullet point -->
          <div
            v-else-if="line.trim().startsWith('•') || line.trim().startsWith('* ') || line.trim().startsWith('- ')"
            class="flex items-start gap-2 pl-0.5"
          >
            <span class="font-bold text-teal-400 text-sm leading-none pt-0.5">•</span>
            <span class="flex-1" v-html="formatInlineMarkdown(line.trim().replace(/^([•*-]\s*)/, ''))"></span>
          </div>

          <!-- Paragraph -->
          <p
            v-else-if="line.trim()"
            v-html="formatInlineMarkdown(line)"
          ></p>
        </template>
      </div>
    </div>
  </div>
</template>
