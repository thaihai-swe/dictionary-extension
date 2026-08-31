<script setup lang="ts">
import { computed } from 'vue';
import { WordFamily } from '../types';

const props = defineProps<{
  word?: string;
  family?: WordFamily;
}>();

const emit = defineEmits<{
  (e: 'select-word', word: string): void;
}>();

const calculatedFamily = computed<WordFamily>(() => {
  if (props.family && (
    props.family.nouns?.length ||
    props.family.verbs?.length ||
    props.family.adjectives?.length ||
    props.family.adverbs?.length ||
    props.family.inflections?.length ||
    props.family.derivatives?.length
  )) {
    return props.family;
  }

  // Return empty WordFamily so card cleanly hides if no authentic API data exists
  return {};
});

const hasAnyData = computed(() => {
  const f = calculatedFamily.value;
  return Boolean(
    f.nouns?.length ||
    f.verbs?.length ||
    f.adjectives?.length ||
    f.adverbs?.length ||
    f.inflections?.length ||
    f.derivatives?.length
  );
});
</script>

<template>
  <div v-if="hasAnyData" class="pt-3.5 border-t border-dark-border/50 space-y-3">
    <div class="flex items-center gap-1.5 text-xs font-extrabold text-emerald-400 uppercase tracking-wider">
      <span>🌲</span>
      <span>WORD FAMILY</span>
    </div>

    <div class="space-y-2.5 text-xs">
      <div v-if="calculatedFamily.nouns?.length" class="flex items-center gap-3">
        <span class="w-20 text-slate-400 font-bold text-xs flex-shrink-0">Noun</span>
        <div class="flex flex-wrap gap-1.5">
          <button
            v-for="item in calculatedFamily.nouns"
            :key="item"
            @click="emit('select-word', item)"
            class="px-3 py-1 rounded-full bg-dark-muted hover:bg-emerald-500/20 hover:text-emerald-300 text-slate-200 text-xs font-semibold transition-all cursor-pointer"
          >
            {{ item }}
          </button>
        </div>
      </div>

      <div v-if="calculatedFamily.verbs?.length" class="flex items-center gap-3">
        <span class="w-20 text-slate-400 font-bold text-xs flex-shrink-0">Verb</span>
        <div class="flex flex-wrap gap-1.5">
          <button
            v-for="item in calculatedFamily.verbs"
            :key="item"
            @click="emit('select-word', item)"
            class="px-3 py-1 rounded-full bg-dark-muted hover:bg-emerald-500/20 hover:text-emerald-300 text-slate-200 text-xs font-semibold transition-all cursor-pointer"
          >
            {{ item }}
          </button>
        </div>
      </div>

      <div v-if="calculatedFamily.adjectives?.length" class="flex items-center gap-3">
        <span class="w-20 text-slate-400 font-bold text-xs flex-shrink-0">Adjective</span>
        <div class="flex flex-wrap gap-1.5">
          <button
            v-for="item in calculatedFamily.adjectives"
            :key="item"
            @click="emit('select-word', item)"
            class="px-3 py-1 rounded-full bg-dark-muted hover:bg-emerald-500/20 hover:text-emerald-300 text-slate-200 text-xs font-semibold transition-all cursor-pointer"
          >
            {{ item }}
          </button>
        </div>
      </div>

      <div v-if="calculatedFamily.adverbs?.length" class="flex items-center gap-3">
        <span class="w-20 text-slate-400 font-bold text-xs flex-shrink-0">Adverb</span>
        <div class="flex flex-wrap gap-1.5">
          <button
            v-for="item in calculatedFamily.adverbs"
            :key="item"
            @click="emit('select-word', item)"
            class="px-3 py-1 rounded-full bg-dark-muted hover:bg-emerald-500/20 hover:text-emerald-300 text-slate-200 text-xs font-semibold transition-all cursor-pointer"
          >
            {{ item }}
          </button>
        </div>
      </div>

      <div v-if="calculatedFamily.derivatives?.length" class="flex items-center gap-3">
        <span class="w-20 text-slate-400 font-bold text-xs flex-shrink-0">Derivatives</span>
        <div class="flex flex-wrap gap-1.5">
          <button
            v-for="item in calculatedFamily.derivatives"
            :key="item"
            @click="emit('select-word', item)"
            class="px-3 py-1 rounded-full bg-dark-muted hover:bg-emerald-500/20 hover:text-emerald-300 text-slate-200 text-xs font-semibold transition-all cursor-pointer"
          >
            {{ item }}
          </button>
        </div>
      </div>

      <div v-if="calculatedFamily.inflections?.length" class="flex items-center gap-3">
        <span class="w-20 text-slate-400 font-bold text-xs flex-shrink-0">Inflections</span>
        <div class="flex flex-wrap gap-1.5">
          <button
            v-for="item in calculatedFamily.inflections"
            :key="item"
            @click="emit('select-word', item)"
            class="px-3 py-1 rounded-full bg-dark-muted hover:bg-emerald-500/20 hover:text-emerald-300 text-slate-200 text-xs font-semibold transition-all cursor-pointer"
          >
            {{ item }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
