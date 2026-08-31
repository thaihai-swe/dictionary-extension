<script setup lang="ts">
import { computed } from 'vue';
import MarkdownRenderer from './component.markdown-renderer.vue';

const props = defineProps<{
  formation?: string;
  prefixes?: string[];
  suffixes?: string[];
}>();

const hasData = computed(() => Boolean(props.formation?.trim() || props.prefixes?.length || props.suffixes?.length));
</script>

<template>
  <div v-if="hasData" class="rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-3.5 space-y-2">
    <div class="flex items-center gap-2 text-xs font-bold text-cyan-400 uppercase tracking-wider">
      <span>🧬</span>
      <span>WORD FORMATION</span>
    </div>
    <div v-if="prefixes?.length || suffixes?.length" class="flex flex-wrap gap-1.5">
      <span v-for="item in prefixes" :key="`p-${item}`" class="px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-200 text-[11px] font-semibold">{{ item }}</span>
      <span v-for="item in suffixes" :key="`s-${item}`" class="px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-200 text-[11px] font-semibold">{{ item }}</span>
    </div>
    <MarkdownRenderer v-if="formation?.trim()" :content="formation" />
  </div>
</template>
