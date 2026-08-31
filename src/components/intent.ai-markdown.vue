<script setup lang="ts">
import { AiResult } from '../types';
import MarkdownRenderer from './component.markdown-renderer.vue';
import AiLexicalExtras from './card.ai-lexical-extras.vue';

defineProps<{
  result: AiResult;
  targetLang?: string;
}>();

const emit = defineEmits<{
  (e: 'select-word', word: string): void;
}>();
</script>

<template>
  <div class="space-y-4">
    <div v-if="result.summary" class="pt-2 border-t border-dark-border/50 space-y-3">
      <MarkdownRenderer :content="result.summary" :target-lang="targetLang" />
    </div>
    <AiLexicalExtras
      :query="result.query"
      :profile="result.lexicalProfile"
      :intent="result.type"
      @select-word="emit('select-word', $event)"
    />
  </div>
</template>
