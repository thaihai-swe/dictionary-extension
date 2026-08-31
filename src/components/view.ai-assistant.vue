<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from 'vue';
import { PRELOAD_ALL_INTENTS, useAiAssistant } from '../composables/composable.ai-assistant';
import { useDictionary, stopAllAudio } from '../composables/composable.dictionary';
import { useStorage } from '../composables/composable.storage';
import { AiIntentId, TabId } from '../types';
import AiIntentToolbar from './component.ai-intent-toolbar.vue';
import TokenizedContext from './component.tokenized-context.vue';
import {
  AiMarkdownIntent,
  ConfusablesIntent,
  SentenceBreakdownIntent,
  preloadAiIntentChunks,
} from './async-views';

const props = defineProps<{
  initialQuery?: string;
  initialContext?: string;
  targetLang?: string;
}>();

const emit = defineEmits<{
  (e: 'switch-tab', tab: TabId): void;
}>();

const { activeContext, activeIntent, aiResult, isAiLoading, aiError, runIntent } = useAiAssistant();
const { query: dictionaryQuery, searchWord, speakTTS } = useDictionary();
const { settings } = useStorage();
const queryInput = ref<string>('');
const contextInput = ref<string>('');
const copied = ref<boolean>(false);
const contextError = ref<string>('');
const isEditingContext = ref<boolean>(false);

const hasDistinctContext = computed(() => {
  const query = queryInput.value.trim().toLowerCase();
  const context = contextInput.value.trim().toLowerCase();
  return Boolean(context) && context !== query;
});
const showContextEditor = computed(() => isEditingContext.value || !contextInput.value.trim());
const showContextCard = computed(() => (
  showContextEditor.value || hasDistinctContext.value || Boolean(contextError.value)
));
const resultTargetLang = computed(() => props.targetLang || settings.value.translateTargetLanguage);

const intentTitleMap: Record<AiIntentId, string> = {
  default: 'MAIN AI EXPLANATION',
  explain_in_context: 'EXPLAIN IN CONTEXT',
  grammar: 'GRAMMAR & NUANCE',
  collocations: 'PHRASE & COLLOCATIONS',
  sentence_breakdown: 'SENTENCE BREAKDOWN',
  confusables: 'COMPARE CONFUSABLES',
  rephrase: 'REPHRASE & STYLES',
  phrase_fallback: 'PHRASE EXPLANATION',
};

function resolveQuery(query?: string, context?: string): string {
  const selected = String(query || '').trim();
  if (selected) return selected;
  return String(context || '').trim();
}

function resolveContext(query?: string, context?: string): string {
  const selected = String(query || '').trim();
  const surrounding = String(context || '').replace(/\s+/g, ' ').trim();
  if (!surrounding) return '';
  if (selected && surrounding.toLowerCase() === selected.toLowerCase()) return '';
  return surrounding;
}

function runCurrentIntent(intentId = activeIntent.value) {
  const query = resolveQuery(queryInput.value, contextInput.value);
  if (!query) return;
  const context = contextInput.value.trim();
  if (intentId === 'explain_in_context' && !context) {
    contextError.value = 'Please enter or paste the sentence containing this word.';
    return;
  }
  contextError.value = '';
  runIntent(intentId, query, props.targetLang, context);
}

onMounted(() => {
  if (settings.value.enableAiPreload) {
    void preloadAiIntentChunks(PRELOAD_ALL_INTENTS);
  }
  const fallbackQuery = props.initialQuery || dictionaryQuery.value;
  const query = resolveQuery(fallbackQuery, props.initialContext);
  const context = resolveContext(query, props.initialContext || activeContext.value);
  queryInput.value = query;
  contextInput.value = context;
  activeContext.value = context;
  isEditingContext.value = !context;
  if (query) {
    runCurrentIntent();
  }
});

onUnmounted(() => {
  stopAllAudio();
});

watch(
  () => [props.initialQuery, props.initialContext] as const,
  ([newQuery, newContext]) => {
    const query = resolveQuery(newQuery, newContext);
    if (!query) return;
    const context = resolveContext(query, newContext);
    queryInput.value = query;
    contextInput.value = context;
    activeContext.value = context;
    isEditingContext.value = !context;
    runCurrentIntent();
  }
);

watch(() => props.targetLang, (newLang) => {
  if (newLang && resolveQuery(queryInput.value, contextInput.value)) {
    runCurrentIntent();
  }
});

function handleIntentSelect(intentId: AiIntentId) {
  stopAllAudio();
  runCurrentIntent(intentId);
}

function handleTokenSelect(word: string) {
  stopAllAudio();
  searchWord(word);
  emit('switch-tab', 'dictionary');
}

function speakText(text?: string) {
  if (!text) return;
  speakTTS(text);
}

function copyResult(text?: string) {
  if (!text) return;
  navigator.clipboard.writeText(text).then(() => {
    copied.value = true;
    setTimeout(() => { copied.value = false; }, 2000);
  });
}
</script>

<template>
  <div class="p-3.5 space-y-3.5 font-sans">
    <!-- AI Intent Buttons Toolbar (Main AI + specialized follow-ups) -->
    <AiIntentToolbar
      :activeIntent="activeIntent"
      :disabled="isAiLoading"
      @select-intent="handleIntentSelect"
    />

    <!-- Single-line Lookup Search Bar -->
    <div class="space-y-2">
      <div class="relative flex items-center">
        <span class="absolute left-3 text-slate-400 pointer-events-none">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
        </span>
        <input
          v-model="queryInput"
          @keyup.enter="handleIntentSelect(activeIntent)"
          type="text"
          placeholder="Type or paste any word or sentence here to analyze..."
          class="w-full bg-dark-muted border border-dark-border rounded-xl pl-9 pr-28 py-2.5 text-xs text-slate-100 placeholder-slate-400 outline-none focus:border-teal-500 transition-all shadow-sm font-sans"
        />

        <button
          v-if="queryInput"
          @click="queryInput = ''; stopAllAudio();"
          title="Clear search text"
          class="absolute right-20 text-slate-400 hover:text-slate-200 p-1 cursor-pointer flex items-center justify-center"
        >
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>

        <button
          @click="handleIntentSelect(activeIntent)"
          :disabled="!queryInput || isAiLoading"
          class="absolute right-1.5 px-3.5 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 active:scale-95 text-white text-xs font-bold transition-all disabled:opacity-50 shadow-sm cursor-pointer flex items-center gap-1"
        >
          <span>{{ isAiLoading ? 'Analyzing…' : 'Lookup' }}</span>
        </button>
      </div>

      <!-- One context surface: hidden when it would duplicate the query -->
      <div v-if="!showContextCard" class="flex items-center justify-end px-1">
        <button
          type="button"
          @click="isEditingContext = true"
          class="text-[11px] text-teal-400 hover:text-teal-300 font-semibold cursor-pointer"
        >
          + Add context
        </button>
      </div>

      <div v-else class="rounded-xl border border-dark-border bg-dark-muted/40 p-2.5 space-y-2">
        <div class="flex items-center justify-between gap-2">
          <div>
            <div class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Context</div>
            <p class="text-[10px] text-slate-500">
              {{ showContextEditor ? 'Paste the sentence that contains this word. Used only for this explanation.' : 'Click any word → lookup in Dictionary' }}
            </p>
          </div>
          <div class="flex items-center gap-1.5 flex-shrink-0">
            <button
              v-if="contextInput.trim()"
              type="button"
              @click="speakText(contextInput)"
              title="Read context aloud"
              class="text-xs px-2.5 py-1 rounded-lg bg-dark-surface hover:bg-dark-border text-slate-300 hover:text-white border border-dark-border transition-colors flex items-center gap-1.5 cursor-pointer font-semibold"
            >
              <span>🔊 Listen</span>
            </button>
            <button
              type="button"
              @click="isEditingContext = !showContextEditor"
              class="text-xs px-2.5 py-1 rounded-lg bg-dark-surface hover:bg-dark-border text-slate-300 hover:text-white border border-dark-border transition-colors cursor-pointer font-semibold"
            >
              {{ showContextEditor ? 'Done' : 'Edit' }}
            </button>
          </div>
        </div>

        <textarea
          v-if="showContextEditor"
          v-model="contextInput"
          rows="2"
          placeholder="Paste the sentence or context here..."
          class="w-full bg-dark-muted border border-dark-border rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-400 outline-none focus:border-teal-500 resize-y min-h-[52px]"
          @blur="isEditingContext = !contextInput.trim()"
        ></textarea>

        <TokenizedContext
          v-else
          :text="contextInput"
          :query="queryInput"
          @select-token="handleTokenSelect"
        />

        <p v-if="contextError" class="text-[11px] text-rose-400">{{ contextError }}</p>
      </div>
    </div>

    <!-- AI Header Row with Listen & Copy Buttons -->
    <div v-if="aiResult" class="flex items-center justify-between pt-1">
      <div class="flex items-center gap-2">
        <span class="text-teal-400 text-sm">✨</span>
        <h2 class="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
          <span>{{ intentTitleMap[aiResult.type as AiIntentId] || 'AI ANALYSIS' }}</span>
        </h2>
      </div>

      <div class="flex items-center gap-1.5">
        <button
          @click="speakText(aiResult.summary)"
          title="Read aloud"
          class="px-2.5 py-1 rounded-lg bg-dark-surface hover:bg-dark-border text-slate-300 hover:text-white border border-dark-border text-[11px] font-semibold transition-colors flex items-center gap-1 shadow-sm cursor-pointer"
        >
          <span>🔊 Listen</span>
        </button>

        <button
          @click="copyResult(aiResult.summary)"
          title="Copy response"
          class="px-2.5 py-1 rounded-lg bg-dark-surface hover:bg-dark-border text-slate-300 hover:text-white border border-dark-border text-[11px] font-semibold transition-colors flex items-center gap-1 shadow-sm cursor-pointer"
        >
          <span>{{ copied ? '✓ Copied' : '📋 Copy' }}</span>
        </button>
      </div>
    </div>

    <!-- AI Loading State -->
    <div v-if="isAiLoading" class="p-4 rounded-xl border border-dark-border bg-[#0a161d] animate-pulse space-y-3">
      <div class="h-3 bg-dark-border rounded w-1/3"></div>
      <div class="h-16 bg-dark-border rounded w-full"></div>
      <div class="h-16 bg-dark-border rounded w-full"></div>
    </div>

    <!-- AI Error Callout -->
    <div v-else-if="aiError" class="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400">
      ⚠️ {{ aiError }}
    </div>

    <!-- AI Result View: one lazy-loaded panel per intent -->
    <component
      v-else-if="aiResult"
      :is="aiResult.type === 'sentence_breakdown'
        ? SentenceBreakdownIntent
        : aiResult.type === 'confusables'
          ? ConfusablesIntent
          : AiMarkdownIntent"
      :result="aiResult"
      :target-lang="resultTargetLang"
      @select-word="handleTokenSelect"
    />

  </div>
</template>
