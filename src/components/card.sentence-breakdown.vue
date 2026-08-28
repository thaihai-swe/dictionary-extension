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
  <div class="pt-3.5 border-t border-dark-border/50 space-y-3.5">
    <div class="flex items-center justify-between text-xs font-bold text-slate-200">
      <div class="flex items-center gap-2">
        <span class="text-teal-400 text-sm">🧩</span>
        <span class="text-teal-300 font-extrabold uppercase tracking-wider text-xs">SENTENCE STRUCTURE BREAKDOWN</span>
      </div>
      <span class="text-xs text-slate-400 font-mono font-semibold">Clause Analysis</span>
    </div>

    <!-- Sentence Structure Items -->
    <div class="space-y-2.5">
      <div
        v-for="(item, index) in structure"
        :key="index"
        class="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1.5 pl-3.5 py-2.5 pr-3 rounded-r-lg border-l-2 border-teal-500/70 bg-dark-muted/50 text-sm group hover:bg-dark-muted/80 transition-colors"
      >
        <div class="flex-1 min-w-[200px] text-slate-100 font-serif text-base leading-relaxed flex items-center justify-between gap-2">
          <span>{{ item.text }}</span>
          <button
            @click="speakText(item.text)"
            title="Read clause aloud"
            class="opacity-0 group-hover:opacity-100 p-1 text-xs text-slate-400 hover:text-teal-300 transition-opacity cursor-pointer"
          >
            🔊
          </button>
        </div>
        <span class="ml-auto flex-shrink-0 px-3 py-0.5 rounded-full text-xs font-bold text-teal-300 bg-teal-500/15 border border-teal-500/25 capitalize font-mono">
          {{ item.role }}
        </span>
      </div>
    </div>

    <!-- Context Translation with Copy & TTS Button -->
    <div v-if="translation" class="pl-4 py-3 pr-3.5 rounded-r-lg border-l-2 border-emerald-500/70 bg-emerald-500/5 text-sm leading-relaxed text-slate-200 space-y-1.5">
      <div class="flex items-center justify-between">
        <span class="font-extrabold text-emerald-400 text-xs uppercase tracking-wider">Context Translation:</span>
        <div class="flex items-center gap-1.5">
          <button
            @click="speakText(translation)"
            title="Read translation aloud"
            class="px-2.5 py-1 rounded bg-dark-muted hover:bg-dark-border text-slate-200 hover:text-white text-xs cursor-pointer font-semibold"
          >
            🔊 Read
          </button>
          <button
            @click="copyTranslation(translation)"
            title="Copy translation"
            class="px-2.5 py-1 rounded bg-dark-muted hover:bg-dark-border text-slate-200 hover:text-white text-xs cursor-pointer font-semibold"
          >
            {{ copied ? '✓ Copied' : '📋 Copy' }}
          </button>
        </div>
      </div>
      <p class="text-slate-100 font-serif text-base leading-relaxed">{{ translation }}</p>
    </div>
  </div>
</template>
