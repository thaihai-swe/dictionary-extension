<script setup lang="ts">
import { computed } from 'vue';
import { Collocations } from '../types';

const props = defineProps<{
  word?: string;
  collocations?: Collocations;
}>();

const emit = defineEmits<{
  (e: 'select-word', word: string): void;
}>();

const calculatedCollocations = computed<Collocations>(() => {
  if (props.collocations && (
    props.collocations.verbs?.length ||
    props.collocations.nouns?.length ||
    props.collocations.adjectives?.length ||
    props.collocations.prepositions?.length
  )) {
    return props.collocations;
  }

  // Return empty collocations if no real API data exists so card cleanly hides
  return {};
});

const hasAnyData = computed(() => {
  const c = calculatedCollocations.value;
  return Boolean(
    c.verbs?.length ||
    c.nouns?.length ||
    c.adjectives?.length ||
    c.prepositions?.length
  );
});
</script>

<template>
  <div v-if="hasAnyData" class="rounded-xl border border-teal-500/25 bg-teal-500/10 p-3.5 space-y-3">
    <div class="flex items-center gap-2 text-xs font-bold text-teal-400 uppercase tracking-wider">
      <span>🔗</span>
      <span>COLLOCATIONS</span>
    </div>

    <div class="space-y-2 text-xs">
      <div v-if="calculatedCollocations.verbs?.length" class="space-y-1">
        <span class="text-slate-400 font-semibold text-[11px] block">Common Verbs</span>
        <div class="flex flex-wrap gap-1.5">
          <button
            v-for="item in calculatedCollocations.verbs"
            :key="item"
            @click="emit('select-word', item)"
            class="px-2.5 py-0.5 rounded-full bg-teal-500/15 hover:bg-teal-500/30 text-teal-300 border border-teal-500/35 text-[11px] transition-all cursor-pointer"
          >
            {{ item }}
          </button>
        </div>
      </div>

      <div v-if="calculatedCollocations.nouns?.length" class="space-y-1">
        <span class="text-slate-400 font-semibold text-[11px] block">Common Nouns</span>
        <div class="flex flex-wrap gap-1.5">
          <button
            v-for="item in calculatedCollocations.nouns"
            :key="item"
            @click="emit('select-word', item)"
            class="px-2.5 py-0.5 rounded-full bg-teal-500/15 hover:bg-teal-500/30 text-teal-300 border border-teal-500/35 text-[11px] transition-all cursor-pointer"
          >
            {{ item }}
          </button>
        </div>
      </div>

      <div v-if="calculatedCollocations.prepositions?.length" class="space-y-1">
        <span class="text-slate-400 font-semibold text-[11px] block">Prepositions</span>
        <div class="flex flex-wrap gap-1.5">
          <button
            v-for="item in calculatedCollocations.prepositions"
            :key="item"
            @click="emit('select-word', item)"
            class="px-2.5 py-0.5 rounded-full bg-teal-500/15 hover:bg-teal-500/30 text-teal-300 border border-teal-500/35 text-[11px] transition-all cursor-pointer"
          >
            {{ item }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
