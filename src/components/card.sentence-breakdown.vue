<script setup lang="ts">
import { ref } from 'vue';
import { SentenceStructureItem } from '../types';
import { useDictionary } from '../composables/composable.dictionary';

defineProps<{
  structure?: SentenceStructureItem[];
  translation?: string;
}>();

const { speakTTS } = useDictionary();
const copied = ref(false);

function speakText(text: string) {
  if (!text) return;
  speakTTS(text);
}

function copyTranslation(text: string) {
  navigator.clipboard.writeText(text).then(() => {
    copied.value = true;
    setTimeout(() => { copied.value = false; }, 2000);
  });
}
</script>

<template>
  <div class="rounded-xl border border-dark-border bg-dark-surface p-3 space-y-3">
    <div class="flex items-center justify-between text-xs font-bold text-slate-200">
      <div class="flex items-center gap-2">
        <span class="text-brand-500">🧩</span>
        <span>SENTENCE STRUCTURE BREAKDOWN</span>
      </div>
      <span class="text-[10px] text-slate-400 font-mono">Clause Analysis</span>
    </div>

    <!-- Sentence Structure Items -->
    <div class="space-y-2">
      <div
        v-for="(item, index) in structure"
        :key="index"
        class="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1.5 p-2.5 rounded-lg border border-dark-border bg-dark-muted/60 text-xs group hover:border-brand-500/30 transition-colors"
      >
        <div class="flex-1 min-w-[180px] text-slate-100 font-medium leading-relaxed flex items-center justify-between gap-2">
          <span>{{ item.text }}</span>
          <button
            @click="speakText(item.text)"
            title="Read clause aloud"
            class="opacity-0 group-hover:opacity-100 p-1 text-[10px] text-slate-400 hover:text-brand-400 transition-opacity"
          >
            🔊
          </button>
        </div>
        <span class="ml-auto flex-shrink-0 px-2 py-0.5 rounded-full text-[11px] font-bold text-brand-400 bg-brand-500/10 border border-brand-500/20 capitalize">
          {{ item.role }}
        </span>
      </div>
    </div>

    <!-- Context Translation with Copy & TTS Button -->
    <div v-if="translation" class="p-2.5 rounded-lg bg-brand-500/5 border border-brand-500/20 text-xs leading-relaxed text-slate-200 space-y-1">
      <div class="flex items-center justify-between">
        <span class="font-bold text-brand-400 text-[11px] uppercase tracking-wider">Context Translation:</span>
        <div class="flex items-center gap-1.5">
          <button
            @click="speakText(translation)"
            title="Read translation aloud"
            class="px-1.5 py-0.5 rounded bg-dark-muted hover:bg-dark-border text-slate-300 hover:text-white text-[10px]"
          >
            🔊 Read
          </button>
          <button
            @click="copyTranslation(translation)"
            title="Copy translation"
            class="px-1.5 py-0.5 rounded bg-dark-muted hover:bg-dark-border text-slate-300 hover:text-white text-[10px]"
          >
            {{ copied ? '✓ Copied' : '📋 Copy' }}
          </button>
        </div>
      </div>
      <p class="text-slate-200 leading-relaxed">{{ translation }}</p>
    </div>
  </div>
</template>
