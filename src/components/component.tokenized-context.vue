<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  text: string;
  query?: string;
}>();

const emit = defineEmits<{
  (e: 'select-token', word: string): void;
}>();

interface Token {
  text: string;
  isWord: boolean;
  isQuery: boolean;
}

const tokens = computed<Token[]>(() => {
  if (!props.text) return [];
  
  // Split by word boundaries
  const rawTokens = props.text.split(/(\s+|[.,!?;:"'()\[\]{}]+)/);
  const cleanQuery = (props.query || '').toLowerCase().trim();

  return rawTokens.filter(Boolean).map(token => {
    const isWord = /^[a-zA-Z0-9'-]+$/.test(token);
    const isQuery = isWord && cleanQuery.length > 0 && token.toLowerCase() === cleanQuery;
    return {
      text: token,
      isWord,
      isQuery,
    };
  });
});
</script>

<template>
  <div class="p-3 rounded-lg border border-dark-border bg-dark-muted text-xs leading-relaxed font-sans text-slate-200">
    <template v-for="(token, idx) in tokens" :key="idx">
      <!-- Clickable Token Word -->
      <span
        v-if="token.isWord"
        @click="emit('select-token', token.text)"
        :class="[
          'inline-block cursor-pointer rounded px-0.5 transition-colors',
          token.isQuery
            ? 'bg-brand-500/25 text-brand-400 font-bold border-b-2 border-brand-500'
            : 'hover:bg-brand-500/20 hover:text-brand-400 text-slate-200'
        ]"
        :title="`Click to lookup '${token.text}'`"
      >
        {{ token.text }}
      </span>

      <!-- Punctuation or whitespace -->
      <span v-else class="text-slate-300">{{ token.text }}</span>
    </template>
  </div>
</template>
