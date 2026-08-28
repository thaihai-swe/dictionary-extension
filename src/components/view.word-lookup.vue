<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { useDictionary } from '../composables/composable.dictionary';
import { useStorage } from '../composables/composable.storage';
import SenseMatrixCard from './card.sense-matrix.vue';
import WordFamilyCard from './card.word-family.vue';
import UsageNotesCard from './card.usage-notes.vue';
import WordFormationCard from './card.word-formation.vue';
import LearnerMistakesCard from './card.learner-mistakes.vue';
import CollocationsCard from './card.collocations.vue';

const props = defineProps<{
  initialQuery?: string;
  autoFocus?: boolean;
  provider?: string;
  targetLang?: string;
}>();

const { query, result, isLoading, error, searchWord, playAudio } = useDictionary();
const { recentQueries, addRecentQuery } = useStorage();
const searchInput = ref<string>('');
const searchInputElement = ref<HTMLInputElement | null>(null);
const copiedNotice = ref<boolean>(false);

function handleSearch(wordToSearch?: string) {
  const target = wordToSearch || searchInput.value;
  if (target?.trim()) {
    const cleanTarget = target.trim();
    searchInput.value = cleanTarget;
    searchWord(cleanTarget, props.provider || 'free_dictionary', props.targetLang || 'vi');
    addRecentQuery(cleanTarget);
  }
}

function clearSearch() {
  searchInput.value = '';
  if (searchInputElement.value) searchInputElement.value.focus();
}

function copyWordDefinition() {
  if (!result.value) return;
  const def = result.value.meanings?.[0]?.definitions?.[0]?.definition || '';
  const text = `${result.value.word} (${result.value.phonetic || ''}): ${def}`;
  navigator.clipboard.writeText(text).then(() => {
    copiedNotice.value = true;
    setTimeout(() => { copiedNotice.value = false; }, 2000);
  });
}

onMounted(() => {
  const target = props.initialQuery?.trim() || query.value || '';
  if (target) {
    searchInput.value = target;
    searchWord(target, props.provider || 'free_dictionary', props.targetLang || 'vi');
  }

  if (props.autoFocus && searchInputElement.value) {
    searchInputElement.value.focus();
    if (searchInput.value) searchInputElement.value.select();
  }
});

watch(() => props.initialQuery, (newQuery) => {
  if (newQuery?.trim()) {
    const cleanQuery = newQuery.trim();
    searchInput.value = cleanQuery;
    searchWord(cleanQuery, props.provider || 'free_dictionary', props.targetLang || 'vi');
    addRecentQuery(cleanQuery);
  }
});

watch([() => props.provider, () => props.targetLang], ([newProv, newLang]) => {
  if (searchInput.value.trim()) {
    searchWord(searchInput.value.trim(), newProv || 'free_dictionary', newLang || 'vi');
  }
});
</script>

<template>
  <div class="p-4 space-y-4 font-sans">
    <!-- Search Bar -->
    <div class="space-y-2">
      <div class="relative flex items-center">
        <span class="absolute left-3.5 text-xs text-slate-400">🔍</span>
        <input
          ref="searchInputElement"
          v-model="searchInput"
          @keyup.enter="handleSearch()"
          type="text"
          placeholder="Lookup word or sentence..."
          class="w-full bg-dark-muted border border-dark-border rounded-xl pl-9 pr-28 py-2.5 text-xs text-slate-100 placeholder-slate-400 outline-none focus:border-brand-500 transition-all shadow-sm"
        />
        
        <button
          v-if="searchInput"
          @click="clearSearch()"
          title="Clear search text"
          class="absolute right-20 text-slate-400 hover:text-slate-200 text-xs px-1 cursor-pointer"
        >
          ✕
        </button>

        <button
          @click="handleSearch()"
          :disabled="!searchInput || isLoading"
          class="absolute right-1.5 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold transition-all disabled:opacity-50 shadow-sm cursor-pointer"
        >
          Lookup
        </button>
      </div>

      <!-- Recent Queries History Pills -->
      <div v-if="recentQueries && recentQueries.length > 0" class="flex items-center gap-1.5 overflow-x-auto text-[11px] py-0.5 no-scrollbar">
        <span class="text-slate-400 text-[10px] font-bold uppercase tracking-wider flex-shrink-0">History:</span>
        <button
          v-for="recent in recentQueries"
          :key="recent"
          @click="handleSearch(recent)"
          class="px-2.5 py-0.5 rounded-full bg-dark-surface hover:bg-brand-500/20 hover:text-brand-400 hover:border-brand-500/40 text-slate-300 border border-dark-border flex-shrink-0 transition-all capitalize text-[11px] cursor-pointer"
        >
          {{ recent }}
        </button>
      </div>
    </div>

    <!-- Loading Skeleton Shimmer -->
    <div v-if="isLoading" class="p-4 space-y-3 rounded-xl border border-dark-border bg-dark-surface animate-pulse">
      <div class="flex items-center justify-between">
        <div class="h-6 bg-dark-border rounded w-1/3"></div>
        <div class="h-5 bg-dark-border rounded-full w-16"></div>
      </div>
      <div class="h-4 bg-dark-border rounded w-2/3"></div>
      <div class="h-3 bg-dark-border rounded w-1/2"></div>
      <div class="h-16 bg-dark-border rounded-xl"></div>
    </div>

    <!-- Error Banner -->
    <div v-else-if="error" class="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-400 flex items-center gap-2">
      <span class="text-base">⚠️</span>
      <span>{{ error }}</span>
    </div>

    <!-- Main Dictionary Result Card -->
    <div v-else-if="result" class="space-y-4">
      <!-- Headword Header Block (Frameless Editorial) -->
      <div class="pb-3.5 border-b border-dark-border/60 space-y-2.5">
        <div class="flex items-start justify-between gap-3">
          <div class="space-y-1">
            <div class="flex items-center gap-2.5 flex-wrap">
              <h2 class="text-2xl font-extrabold text-slate-100 tracking-tight font-heading">{{ result.word }}</h2>
              
              <!-- CEFR Level Pill -->
              <span
                v-if="result.lexicalProfile?.cefr"
                class="px-2.5 py-0.5 rounded-full bg-teal-500/15 text-teal-300 font-extrabold border border-teal-500/30 text-[10px] uppercase tracking-wider font-mono"
              >
                {{ result.lexicalProfile.cefr }}
              </span>

              <!-- Frequency Pill -->
              <span
                v-if="result.lexicalProfile?.frequencyPill"
                class="px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 font-bold border border-amber-500/30 text-[10px]"
              >
                {{ result.lexicalProfile.frequencyPill }}
              </span>
            </div>

            <!-- Phonetics -->
            <p v-if="result.phonetic || result.phonetics?.[0]?.text" class="text-xs font-mono font-bold text-teal-400">
              {{ result.phonetic || result.phonetics?.[0]?.text }}
            </p>
          </div>

          <!-- Pronunciation & Audio Buttons -->
          <div class="flex items-center gap-1.5 flex-shrink-0">
            <button
              @click="playAudio(result.phonetics?.[0]?.audio, result.word, 'uk')"
              class="px-2.5 py-1 rounded-lg bg-dark-muted hover:bg-teal-500/20 hover:text-teal-300 text-slate-200 border border-dark-border text-[11px] font-bold transition-all flex items-center gap-1 shadow-xs cursor-pointer active:scale-95 font-mono"
              title="Listen UK Pronunciation"
            >
              <span>🇬🇧 UK</span>
            </button>

            <button
              @click="playAudio(result.phonetics?.[1]?.audio || result.phonetics?.[0]?.audio, result.word, 'us')"
              class="px-2.5 py-1 rounded-lg bg-dark-muted hover:bg-teal-500/20 hover:text-teal-300 text-slate-200 border border-dark-border text-[11px] font-bold transition-all flex items-center gap-1 shadow-xs cursor-pointer active:scale-95 font-mono"
              title="Listen US Pronunciation"
            >
              <span>🇺🇸 US</span>
            </button>

            <button
              @click="copyWordDefinition()"
              title="Copy definition"
              class="p-1.5 rounded-lg bg-dark-muted hover:bg-dark-border text-slate-300 hover:text-white border border-dark-border text-xs transition-colors cursor-pointer active:scale-95"
            >
              {{ copiedNotice ? '✓' : '📋' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Sense Matrix & Meanings -->
      <SenseMatrixCard
        :meanings="result.meanings"
        @select-word="handleSearch"
      />

      <!-- Structured Lexical Profile Cards from Main -->
      <WordFamilyCard
        :word="result.word"
        :family="result.lexicalProfile?.wordFamily"
        @select-word="handleSearch"
      />

      <UsageNotesCard
        :word="result.word"
        :notes="result.lexicalProfile?.usageNotes"
      />

      <WordFormationCard
        :word="result.word"
        :formation="result.lexicalProfile?.wordFormation"
      />

      <LearnerMistakesCard
        :word="result.word"
        :mistakes="result.lexicalProfile?.learnerMistakes"
      />

      <CollocationsCard
        :word="result.word"
        :collocations="result.lexicalProfile?.collocations"
        @select-word="handleSearch"
      />
    </div>
  </div>
</template>
