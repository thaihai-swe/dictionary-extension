<script setup lang="ts">
import { computed } from 'vue';
import { useDictionary } from '../composables/composable.dictionary';

interface MistakeItem {
  mistake: string;
  correction: string;
  example?: string;
  exampleIncorrect?: string;
  exampleCorrect?: string;
}

const props = defineProps<{
  word?: string;
  mistakes?: MistakeItem[];
}>();

const { playPronunciation, playingKey } = useDictionary();

const calculatedMistakes = computed<MistakeItem[]>(() => props.mistakes || []);

function listenText(item: MistakeItem): string {
  return item.example || item.exampleCorrect || item.correction;
}
</script>

<template>
  <div v-if="calculatedMistakes.length > 0" class="pt-3 border-t border-dark-border/50 space-y-2.5">
    <div class="flex items-center gap-1.5 text-[11px] font-extrabold text-amber-400 uppercase tracking-wider">
      <span>⚠️</span>
      <span>COMMON LEARNER MISTAKES</span>
    </div>

    <div class="space-y-2">
      <div
        v-for="(item, idx) in calculatedMistakes"
        :key="idx"
        class="pl-3.5 py-2.5 pr-3 rounded-r-lg border-l-2 border-amber-500/70 bg-amber-500/5 text-xs space-y-1.5"
      >
        <div class="text-rose-400 font-semibold leading-relaxed">
          <span class="font-extrabold">Mistake:</span> {{ item.mistake }}
        </div>

        <div class="text-emerald-400 font-semibold leading-relaxed">
          <span class="font-extrabold">Correction:</span> {{ item.correction }}
        </div>

        <blockquote
          v-if="item.example"
          class="text-slate-300 italic text-[11px] leading-relaxed pt-1 flex items-center justify-between flex-wrap gap-2"
        >
          <span>{{ item.example }}</span>
          <button
            @click="playPronunciation({ text: listenText(item), language: 'en-US', key: `mistake-${idx}` })"
            title="Listen example"
            :class="[
              'px-2 py-0.5 rounded border text-[10px] font-semibold transition-all flex items-center gap-1 ml-auto cursor-pointer not-italic',
              playingKey === `mistake-${idx}`
                ? 'bg-teal-500/25 text-teal-200 border-teal-500/50'
                : 'bg-dark-muted hover:bg-dark-border text-slate-300 hover:text-white border-dark-border'
            ]"
            :aria-pressed="playingKey === `mistake-${idx}`"
          >
            <span>🔊 Listen</span>
          </button>
        </blockquote>

        <div v-else-if="item.exampleIncorrect || item.exampleCorrect" class="text-slate-300 italic text-[11px] leading-relaxed pt-1 flex items-center justify-between flex-wrap gap-2">
          <div>
            <span v-if="item.exampleIncorrect" class="mr-3"><span class="not-italic font-bold text-slate-300">Incorrect:</span> {{ item.exampleIncorrect }}</span>
            <span v-if="item.exampleCorrect"><span class="not-italic font-bold text-slate-300">Correct:</span> {{ item.exampleCorrect }}</span>
          </div>

          <button
            @click="playPronunciation({ text: listenText(item), language: 'en-US', key: `mistake-${idx}` })"
            title="Listen correct pronunciation"
            :class="[
              'px-2 py-0.5 rounded border text-[10px] font-semibold transition-all flex items-center gap-1 ml-auto cursor-pointer not-italic',
              playingKey === `mistake-${idx}`
                ? 'bg-teal-500/25 text-teal-200 border-teal-500/50'
                : 'bg-dark-muted hover:bg-dark-border text-slate-300 hover:text-white border-dark-border'
            ]"
            :aria-pressed="playingKey === `mistake-${idx}`"
          >
            <span>🔊 Listen</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
