<script setup lang="ts">
import { AiResult } from '../types';
import SentenceBreakdownCard from './card.sentence-breakdown.vue';
import MarkdownRenderer from './component.markdown-renderer.vue';

defineProps<{
  result: AiResult;
  targetLang?: string;
}>();
</script>

<template>
  <div class="space-y-4">
    <SentenceBreakdownCard
      v-if="result.structure?.length"
      :structure="result.structure"
      :translation="result.translation"
    />

    <div v-if="result.phrases?.length" class="rounded-xl border border-indigo-500/30 bg-indigo-500/10 p-3 space-y-2">
      <div class="text-[11px] font-extrabold text-indigo-300 uppercase tracking-wider">Phrase parsing</div>
      <div v-for="(phrase, index) in result.phrases" :key="`${phrase.text}-${index}`" class="text-xs text-slate-200">
        <span class="font-bold text-teal-300">{{ phrase.text }}</span>
        <span v-if="phrase.type" class="text-slate-400"> · {{ phrase.type }}</span>
        <span v-if="phrase.meaning"> — {{ phrase.meaning }}</span>
      </div>
    </div>

    <div v-if="result.summary && !result.structure?.length" class="pt-2 border-t border-dark-border/50 space-y-3">
      <MarkdownRenderer :content="result.summary" :target-lang="targetLang" />
    </div>
  </div>
</template>
