<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  word?: string;
  notes?: string;
}>();

const calculatedNotes = computed<string | null>(() => {
  if (props.notes?.trim()) return props.notes.trim();

  const w = (props.word || '').toLowerCase().trim();
  if (!w) return null;

  if (w.includes('15s') || w.includes('sec')) {
    return "The abbreviation '15s' is informal and common in UI design/social media; in formal writing, use '15 seconds'.";
  } else if (w.includes('stuff')) {
    return "'Stuff' is uncountable and informal; avoid in formal or academic contexts and use 'items', 'materials', or 'equipment'.";
  } else if (w.includes('gonna') || w.includes('wanna') || w.includes('gotta')) {
    return "This is a casual spoken reduction. Avoid using in written academic or business communication.";
  }

  // Return null if no specific note exists so card cleanly hides
  return null;
});
</script>

<template>
  <div v-if="calculatedNotes" class="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 space-y-2">
    <div class="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
      <span>⚠️</span>
      <span>USAGE &amp; REGISTER NOTES</span>
    </div>

    <p class="text-xs text-slate-200 leading-relaxed">
      {{ calculatedNotes }}
    </p>
  </div>
</template>
