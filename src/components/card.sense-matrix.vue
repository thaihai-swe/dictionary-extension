<script setup lang="ts">
import { Meaning } from '../types';
import { useDictionary } from '../composables/composable.dictionary';

defineProps<{
  meanings: Meaning[];
}>();

const emit = defineEmits<{
  (e: 'select-word', word: string): void;
}>();

const { speakTTS } = useDictionary();

function getPosClass(pos: string): string {
  const p = pos.toLowerCase();
  if (p.includes('noun')) return 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30';
  if (p.includes('verb')) return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
  if (p.includes('adj')) return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
  if (p.includes('adv')) return 'bg-rose-500/15 text-rose-400 border-rose-500/30';
  return 'bg-brand-500/15 text-brand-400 border-brand-500/30';
}
</script>

<template>
  <div class="space-y-3">
    <div
      v-for="(meaning, mIdx) in meanings"
      :key="mIdx"
      class="p-3.5 rounded-xl border border-dark-border bg-dark-surface space-y-3 text-xs shadow-sm hover:border-dark-border/80 transition-colors"
    >
      <!-- Part of Speech Pill Badge -->
      <div class="flex items-center justify-between border-b border-dark-border/60 pb-2">
        <div class="flex items-center gap-2">
          <span
            :class="[
              'inline-flex items-center px-2.5 py-0.5 rounded-full font-bold text-[11px] border capitalize tracking-wide',
              getPosClass(meaning.partOfSpeech)
            ]"
          >
            {{ meaning.partOfSpeech }}
          </span>
        </div>
        <span v-if="mIdx === 0" class="px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-400 font-semibold border border-brand-500/20 text-[10px]">
          Primary Meaning
        </span>
      </div>

      <!-- Definitions List -->
      <ol class="space-y-3 text-slate-200">
        <li
          v-for="(def, dIdx) in meaning.definitions"
          :key="dIdx"
          class="space-y-1.5 border-b border-dark-border/40 pb-2.5 last:border-b-0 last:pb-0"
        >
          <div class="flex items-start gap-2">
            <span class="font-bold text-brand-400 text-[11px] mt-0.5 flex-shrink-0">{{ dIdx + 1 }}.</span>
            <span class="font-medium text-slate-100 leading-relaxed">{{ def.definition }}</span>
          </div>
          
          <!-- Example Sentence Box with Listen TTS Button -->
          <div v-if="def.example" class="mt-2 pl-3 py-1.5 pr-2 border-l-2 border-brand-500/60 bg-brand-500/5 rounded-r-lg text-slate-300 italic text-[11px] leading-relaxed flex items-center justify-between gap-2">
            <span>"{{ def.example }}"</span>
            <button
              @click="speakTTS(def.example)"
              title="Listen example sentence"
              class="px-1.5 py-0.5 rounded bg-dark-muted hover:bg-dark-border text-slate-300 hover:text-white border border-dark-border text-[10px] not-italic flex-shrink-0 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <span>🔊 Listen</span>
            </button>
          </div>

          <!-- Synonyms Chips -->
          <div v-if="def.synonyms && def.synonyms.length > 0" class="mt-2 flex flex-wrap items-center gap-1">
            <span class="text-[10px] text-slate-400 font-bold uppercase tracking-wider mr-1">Synonyms:</span>
            <button
              v-for="syn in def.synonyms.slice(0, 5)"
              :key="syn"
              @click="emit('select-word', syn)"
              class="px-2 py-0.5 rounded-md bg-dark-muted hover:bg-brand-500/20 hover:text-brand-400 hover:border-brand-500/40 text-slate-300 border border-dark-border text-[10px] font-medium transition-all cursor-pointer"
            >
              {{ syn }}
            </button>
          </div>

          <!-- Antonyms Chips -->
          <div v-if="def.antonyms && def.antonyms.length > 0" class="mt-1.5 flex flex-wrap items-center gap-1">
            <span class="text-[10px] text-rose-400/80 font-bold uppercase tracking-wider mr-1">Antonyms:</span>
            <button
              v-for="ant in def.antonyms.slice(0, 5)"
              :key="ant"
              @click="emit('select-word', ant)"
              class="px-2 py-0.5 rounded-md bg-dark-muted hover:bg-rose-500/20 hover:text-rose-400 hover:border-rose-500/40 text-slate-300 border border-dark-border text-[10px] font-medium transition-all cursor-pointer"
            >
              {{ ant }}
            </button>
          </div>
        </li>
      </ol>
    </div>
  </div>
</template>
