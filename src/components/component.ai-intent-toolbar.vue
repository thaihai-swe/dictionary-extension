<script setup lang="ts">
import { AI_INTENTS } from '../composables/composable.ai-assistant';
import { AiIntentId } from '../types';

defineProps<{
  activeIntent: AiIntentId;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  (e: 'select-intent', intentId: AiIntentId): void;
}>();
</script>

<template>
  <div class="flex flex-wrap gap-1.5">
    <button
      v-for="intent in AI_INTENTS"
      :key="intent.id"
      :disabled="disabled"
      @click="emit('select-intent', intent.id)"
      :class="[
        'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 border outline-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-xs active:scale-95 hover:scale-[1.02]',
        activeIntent === intent.id
          ? 'bg-teal-500/15 border-teal-500/45 text-teal-300 font-bold ring-1 ring-teal-500/30 shadow-teal-500/10'
          : 'bg-dark-surface border-dark-border text-slate-300 hover:text-white hover:bg-dark-muted hover:border-slate-600'
      ]"
    >
      <span>{{ intent.icon }}</span>
      <span>{{ intent.label }}</span>
    </button>
  </div>
</template>
