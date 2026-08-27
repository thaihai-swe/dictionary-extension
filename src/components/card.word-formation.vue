<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  word?: string;
  formation?: string;
}>();

const calculatedFormation = computed<string | null>(() => {
  if (props.formation?.trim()) return props.formation.trim();

  const w = (props.word || '').toLowerCase().trim();
  if (!w) return null;

  if (w.endsWith('tion') || w.endsWith('sion')) {
    return `Formed by suffixing -tion/-sion to the verb stem, creating an abstract noun representing an action or state.`;
  } else if (w.endsWith('ment')) {
    return `Formed by suffixing -ment to the verb root, forming a noun indicating an action, process, or resulting state.`;
  } else if (w.endsWith('ness')) {
    return `Formed by suffixing -ness to an adjective, deriving an abstract noun denoting a state or condition.`;
  } else if (w.endsWith('able') || w.endsWith('ible')) {
    return `Formed by suffixing -able/-ible to a verb root, deriving an adjective meaning 'capable of being acted upon'.`;
  } else if (w.endsWith('less')) {
    return `Formed by suffixing -less to a noun stem, creating an adjective denoting 'without' or 'lacking'.`;
  } else if (w.endsWith('ful')) {
    return `Formed by suffixing -ful to a noun stem, creating an adjective denoting 'full of' or 'characterized by'.`;
  }

  // Return null if no specific formation pattern exists so card cleanly hides
  return null;
});
</script>

<template>
  <div v-if="calculatedFormation" class="rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-3.5 space-y-2">
    <div class="flex items-center gap-2 text-xs font-bold text-cyan-400 uppercase tracking-wider">
      <span>📌</span>
      <span>WORD FORMATION</span>
    </div>

    <p class="text-xs text-slate-200 leading-relaxed">
      {{ calculatedFormation }}
    </p>
  </div>
</template>
