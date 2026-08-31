<script setup lang="ts">
import { AiResult } from '../types';
import MarkdownRenderer from './component.markdown-renderer.vue';

defineProps<{
  result: AiResult;
  targetLang?: string;
}>();
</script>

<template>
  <div class="space-y-4">
    <div v-if="result.comparison?.rows?.length" class="overflow-x-auto rounded-xl border border-dark-border">
      <table class="w-full text-xs text-left">
        <thead class="bg-dark-muted text-slate-300">
          <tr>
            <th class="px-3 py-2 font-bold">Dimension</th>
            <th class="px-3 py-2 font-bold">{{ result.comparison.leftTerm || 'Term A' }}</th>
            <th class="px-3 py-2 font-bold">{{ result.comparison.rightTerm || 'Term B' }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in result.comparison.rows" :key="row.dimension" class="border-t border-dark-border">
            <td class="px-3 py-2 text-slate-400 font-semibold">{{ row.dimension }}</td>
            <td class="px-3 py-2 text-slate-100">{{ row.left }}</td>
            <td class="px-3 py-2 text-slate-100">{{ row.right }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="result.summary" class="pt-2 border-t border-dark-border/50 space-y-3">
      <MarkdownRenderer :content="result.summary" :target-lang="targetLang" />
    </div>
  </div>
</template>
