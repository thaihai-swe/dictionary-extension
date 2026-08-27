<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from 'vue';
import { useAiAssistant } from '../composables/composable.ai-assistant';
import { useDictionary, stopAllAudio } from '../composables/composable.dictionary';
import { useStorage } from '../composables/composable.storage';
import { AiIntentId, TabId } from '../types';
import AiIntentToolbar from './component.ai-intent-toolbar.vue';
import SentenceBreakdownCard from './card.sentence-breakdown.vue';
import WordFormationCard from './card.word-formation.vue';
import LearnerMistakesCard from './card.learner-mistakes.vue';
import TokenizedContext from './component.tokenized-context.vue';
import MarkdownRenderer from './component.markdown-renderer.vue';
import SettingsModal from './modal.settings.vue';

const props = defineProps<{
  initialContext?: string;
  targetLang?: string;
}>();

const emit = defineEmits<{
  (e: 'switch-tab', tab: TabId): void;
}>();

const { activeContext, activeIntent, aiResult, isAiLoading, aiError, runIntent } = useAiAssistant();
const { searchWord } = useDictionary();
const { settings } = useStorage();
const contextInput = ref<string>('');
const copied = ref<boolean>(false);
const showSettings = ref<boolean>(false);

const hasApiKey = computed(() => Boolean(settings.value.aiApiKey?.trim()));

const intentTitleMap: Record<AiIntentId, string> = {
  explain_in_context: 'EXPLAIN IN CONTEXT',
  grammar: 'GRAMMAR & NUANCE',
  collocations: 'PHRASE & COLLOCATIONS',
  sentence_breakdown: 'SENTENCE BREAKDOWN',
  confusables: 'COMPARE CONFUSABLES',
  rephrase: 'REPHRASE & STYLES',
};

onMounted(() => {
  const target = props.initialContext?.trim() || activeContext.value || '';
  contextInput.value = target;
  activeContext.value = target;
  if (target) {
    runIntent(activeIntent.value, target, props.targetLang);
  }
});

onUnmounted(() => {
  stopAllAudio();
});

watch(() => props.initialContext, (newContext) => {
  if (newContext?.trim()) {
    const clean = newContext.trim();
    contextInput.value = clean;
    activeContext.value = clean;
    runIntent(activeIntent.value, clean, props.targetLang);
  }
});

watch(() => props.targetLang, (newLang) => {
  if (newLang && contextInput.value.trim()) {
    runIntent(activeIntent.value, contextInput.value.trim(), newLang);
  }
});

function handleIntentSelect(intentId: AiIntentId) {
  stopAllAudio();
  const text = contextInput.value.trim();
  if (text) {
    runIntent(intentId, text, props.targetLang);
  }
}

function handleTokenSelect(word: string) {
  stopAllAudio();
  searchWord(word);
  emit('switch-tab', 'dictionary');
}

function speakText(text?: string) {
  if (!text || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  stopAllAudio();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-US';
  utterance.rate = 0.9;
  window.speechSynthesis.speak(utterance);
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
    <!-- Transparent Status Banner (Explicitly states AI connection mode) -->
    <div
      :class="[
        'px-3 py-2 rounded-xl border text-xs flex items-center justify-between transition-all shadow-sm',
        hasApiKey
          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
          : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
      ]"
    >
      <div class="flex items-center gap-2">
        <span class="text-sm">{{ hasApiKey ? '⚡' : '⚙️' }}</span>
        <div>
          <div class="font-bold text-[11px] leading-tight">
            {{ hasApiKey ? `GEMINI AI CONNECTED (${settings.aiModel || 'gemini-2.5-flash'})` : 'CHẾ ĐỘ PHÂN TÍCH NGOẠI TUYẾN' }}
          </div>
          <div class="text-[10px] opacity-80">
            {{ hasApiKey ? 'Dữ liệu phân tích trực tiếp từ mô hình Gemini AI thời gian thực.' : 'Dữ liệu trích xuất từ bộ phân tích ngữ pháp & mẫu học thuật nội bộ.' }}
          </div>
        </div>
      </div>

      <button
        @click="showSettings = true"
        class="px-2.5 py-1 rounded-lg bg-dark-surface hover:bg-dark-border text-slate-200 border border-dark-border text-[10px] font-bold transition-all flex items-center gap-1 shadow-sm flex-shrink-0 cursor-pointer ml-2"
      >
        <span>🔑</span>
        <span>{{ hasApiKey ? 'Đổi Key' : 'Nhập Gemini Key' }}</span>
      </button>
    </div>

    <!-- AI 6 Intent Buttons Toolbar (Top Navigation) -->
    <AiIntentToolbar
      :activeIntent="activeIntent"
      :disabled="isAiLoading"
      @select-intent="handleIntentSelect"
    />

    <!-- Single-line Lookup Search Bar (Exact design from user screenshot) -->
    <div class="space-y-2">
      <div class="relative flex items-center">
        <span class="absolute left-3.5 text-xs text-slate-400">🔍</span>
        <input
          v-model="contextInput"
          @keyup.enter="handleIntentSelect(activeIntent)"
          type="text"
          placeholder="Type or paste any word or sentence here to analyze..."
          class="w-full bg-dark-muted border border-dark-border rounded-xl pl-9 pr-28 py-2.5 text-xs text-slate-100 placeholder-slate-400 outline-none focus:border-teal-500 transition-all shadow-sm font-sans"
        />

        <button
          v-if="contextInput"
          @click="contextInput = ''; activeContext = ''; stopAllAudio();"
          title="Clear search text"
          class="absolute right-20 text-slate-400 hover:text-slate-200 text-xs px-1 cursor-pointer"
        >
          ✕
        </button>

        <button
          @click="handleIntentSelect(activeIntent)"
          :disabled="!contextInput || isAiLoading"
          class="absolute right-1.5 px-3.5 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition-all disabled:opacity-50 shadow-sm cursor-pointer flex items-center gap-1"
        >
          <span>{{ isAiLoading ? 'Analyzing…' : 'Lookup' }}</span>
        </button>
      </div>

      <!-- Listen & Interactive Tokenized Context Sentence below search bar -->
      <div v-if="contextInput.trim()" class="flex items-center justify-between px-1">
        <span class="text-[10px] text-slate-400 font-medium">Click any word below → lookup in Dictionary:</span>
        <button
          @click="speakText(contextInput)"
          title="Read context aloud"
          class="text-[11px] px-2 py-0.5 rounded-lg bg-dark-surface hover:bg-dark-border text-slate-300 hover:text-white border border-dark-border transition-colors flex items-center gap-1 cursor-pointer"
        >
          <span>🔊 Listen</span>
        </button>
      </div>

      <TokenizedContext
        v-if="contextInput.trim()"
        :text="contextInput"
        @select-token="handleTokenSelect"
      />
    </div>

    <!-- AI Header Row with Listen & Copy Buttons -->
    <div v-if="aiResult" class="flex items-center justify-between pt-1">
      <div class="flex items-center gap-2">
        <span class="text-teal-400 text-sm">✨</span>
        <h2 class="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
          <span>{{ intentTitleMap[aiResult.type] || 'AI ANALYSIS' }}</span>
          <span :class="['text-[9px] px-1.5 py-0.2 rounded font-bold border', hasApiKey ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20']">
            {{ hasApiKey ? '⚡ REALTIME GEMINI' : '⚙️ OFFLINE ENGINE' }}
          </span>
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

    <!-- AI Result View (Matching clean cohesive dark design) -->
    <div v-else-if="aiResult" class="space-y-3">
      <!-- Sentence Breakdown Component -->
      <SentenceBreakdownCard
        v-if="aiResult.type === 'sentence_breakdown'"
        :structure="aiResult.structure"
        :translation="aiResult.translation"
      />

      <!-- Grammar & Nuance Card -->
      <template v-else-if="aiResult.type === 'grammar'">
        <div class="p-3.5 rounded-xl border border-dark-border bg-[#0a161d] space-y-2 text-xs shadow-sm">
          <MarkdownRenderer :content="aiResult.summary" />
        </div>
        <LearnerMistakesCard :word="aiResult.query" />
      </template>

      <!-- Word Morphology & Collocations Card -->
      <template v-else-if="aiResult.type === 'collocations'">
        <WordFormationCard :word="aiResult.query" />
        <div class="p-3.5 rounded-xl border border-dark-border bg-[#0a161d] space-y-2 text-xs shadow-sm">
          <MarkdownRenderer :content="aiResult.summary" />
        </div>
      </template>

      <!-- Generic / Explain in Context Markdown View -->
      <div v-else class="space-y-3">
        <MarkdownRenderer :content="aiResult.summary" />
      </div>
    </div>

    <!-- Settings Modal -->
    <SettingsModal
      :show="showSettings"
      @close="showSettings = false"
    />
  </div>
</template>
