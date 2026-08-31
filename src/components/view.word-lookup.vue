<script setup lang="ts">
import { defineAsyncComponent, onMounted, onUnmounted, ref, watch } from 'vue';
import { useDictionary } from '../composables/composable.dictionary';
import { useStorage } from '../composables/composable.storage';

const WordLookupResult = defineAsyncComponent(() => import('./view.word-lookup-result.vue'));

const props = defineProps<{
  initialQuery?: string;
  initialContext?: string;
  lookupRequestId?: string;
  autoFocus?: boolean;
  provider?: string;
  targetLang?: string;
}>();

const {
  query,
  result,
  isLoading,
  error,
  searchWord,
  stopAllAudio,
} = useDictionary();
const { settings } = useStorage();

const searchInput = ref<string>('');
const searchInputElement = ref<HTMLInputElement | null>(null);

function getActiveProvider(): string {
  return props.provider || settings.value.dictionaryProvider || 'free_dictionary';
}

function getActiveLang(): string {
  return props.targetLang || settings.value.translateTargetLanguage || 'Vietnamese';
}

function handleEsc(event: KeyboardEvent) {
  if (event.key === 'Escape') stopAllAudio();
}

function runLookup(wordToSearch: string, attachedRequestId?: string) {
  const cleanTarget = wordToSearch.trim();
  if (!cleanTarget) return;
  searchInput.value = cleanTarget;
  searchWord(cleanTarget, getActiveProvider(), getActiveLang(), props.initialContext, attachedRequestId);
}

function handleSearch(wordToSearch?: string) {
  runLookup(wordToSearch || searchInput.value);
}

function clearSearch() {
  searchInput.value = '';
  if (searchInputElement.value) searchInputElement.value.focus();
}

onMounted(() => {
  window.addEventListener('keydown', handleEsc);
  const target = props.initialQuery?.trim() || query.value || '';
  if (target) {
    runLookup(target, props.lookupRequestId);
  }

  if (props.autoFocus && searchInputElement.value) {
    searchInputElement.value.focus();
    if (searchInput.value) searchInputElement.value.select();
  }
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleEsc);
});

watch(() => props.initialQuery, (newQuery) => {
  if (newQuery?.trim()) {
    runLookup(newQuery, props.lookupRequestId);
  }
});

watch(() => props.lookupRequestId, (requestId) => {
  if (requestId && props.initialQuery?.trim()) {
    runLookup(props.initialQuery, requestId);
  }
});

watch([() => props.provider, () => props.targetLang, () => settings.value.dictionaryProvider, () => settings.value.translateTargetLanguage], () => {
  if (searchInput.value.trim()) {
    runLookup(searchInput.value);
  }
});
</script>

<template>
  <div class="p-4 space-y-4 font-sans">
    <!-- Search Bar -->
    <div class="space-y-2">
      <div class="relative flex items-center">
        <span class="absolute left-3 text-slate-400 pointer-events-none">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
        </span>
        <input
          ref="searchInputElement"
          v-model="searchInput"
          @keyup.enter="handleSearch()"
          type="text"
          placeholder="Lookup word or sentence..."
          class="w-full bg-dark-muted border border-dark-border rounded-xl pl-9 pr-28 py-2.5 text-xs text-slate-100 placeholder-slate-400 outline-none focus:border-teal-500 transition-all shadow-sm font-sans"
        />
        
        <button
          v-if="searchInput"
          @click="clearSearch()"
          title="Clear search text"
          class="absolute right-20 text-slate-400 hover:text-slate-200 p-1 cursor-pointer flex items-center justify-center"
        >
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>

        <button
          @click="handleSearch()"
          :disabled="!searchInput || isLoading"
          class="absolute right-1.5 px-3.5 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 active:scale-95 text-white text-xs font-bold transition-all disabled:opacity-50 shadow-sm cursor-pointer"
        >
          Lookup
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

    <WordLookupResult
      v-else-if="result"
      @select-word="handleSearch"
    />
  </div>
</template>
