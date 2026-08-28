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
  <div class="space-y-6 pt-1">
    <div
      v-for="(meaning, mIdx) in meanings"
      :key="mIdx"
      class="space-y-3.5 border-b border-dark-border/50 pb-5 last:border-b-0 last:pb-0"
    >
      <!-- Part of Speech Pill Badge & Header Row -->
      <div class="flex items-center justify-between pb-1">
        <div class="flex items-center gap-2">
          <span
            :class="[
              'inline-flex items-center px-3 py-0.5 rounded-full font-extrabold text-xs uppercase tracking-wider',
              getPosClass(meaning.partOfSpeech)
            ]"
          >
            {{ meaning.partOfSpeech }}
          </span>
        </div>
        <span v-if="mIdx === 0" class="px-2.5 py-0.5 rounded-full bg-teal-500/10 text-teal-400 font-bold border border-teal-500/20 text-xs">
          Primary Meaning
        </span>
      </div>

      <!-- Definitions List in Crisp Editorial Typography -->
      <ol class="space-y-4 text-slate-100">
        <li
          v-for="(def, dIdx) in meaning.definitions"
          :key="dIdx"
          class="space-y-2.5"
        >
          <div class="flex items-start gap-2.5">
            <span class="font-bold text-teal-400 text-sm mt-0.5 flex-shrink-0 font-mono">{{ dIdx + 1 }}.</span>
            <span class="font-serif text-base text-slate-100 leading-relaxed font-normal">{{ def.definition }}</span>
          </div>
          
          <!-- Example Sentence Box with Left Accent Line -->
          <div v-if="def.example" class="mt-2.5 pl-3.5 py-2 pr-3 border-l-2 border-teal-500/70 bg-teal-500/5 rounded-r-lg text-slate-200 italic text-sm leading-relaxed flex items-center justify-between gap-3">
            <span>"{{ def.example }}"</span>
            <button
              @click="speakTTS(def.example)"
              title="Listen example sentence"
              class="px-2.5 py-1 rounded bg-dark-muted hover:bg-dark-border text-slate-200 hover:text-white border border-dark-border text-xs not-italic flex-shrink-0 transition-colors flex items-center gap-1 cursor-pointer font-semibold"
            >
              <span>🔊 Listen</span>
            </button>
          </div>

          <!-- Synonyms Chips -->
          <div v-if="def.synonyms && def.synonyms.length > 0" class="mt-2.5 flex flex-wrap items-center gap-1.5">
            <span class="text-xs text-slate-400 font-bold uppercase tracking-wider mr-1">Synonyms:</span>
            <button
              v-for="syn in def.synonyms.slice(0, 5)"
              :key="syn"
              @click="emit('select-word', syn)"
              class="px-3 py-1 rounded-full bg-dark-muted hover:bg-teal-500/20 hover:text-teal-300 text-slate-200 text-xs font-semibold transition-all cursor-pointer"
            >
              {{ syn }}
            </button>
          </div>

          <!-- Antonyms Chips -->
          <div v-if="def.antonyms && def.antonyms.length > 0" class="mt-2 flex flex-wrap items-center gap-1.5">
            <span class="text-xs text-rose-400/80 font-bold uppercase tracking-wider mr-1">Antonyms:</span>
            <button
              v-for="ant in def.antonyms.slice(0, 5)"
              :key="ant"
              @click="emit('select-word', ant)"
              class="px-3 py-1 rounded-full bg-dark-muted hover:bg-rose-500/20 hover:text-rose-400 text-slate-200 text-xs font-semibold transition-all cursor-pointer"
            >
              {{ ant }}
            </button>
          </div>
        </li>
      </ol>
    </div>
  </div>
</template>
