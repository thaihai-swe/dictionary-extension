<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { AI_INTENTS } from '../composables/composable.ai-assistant';
import { AiIntentId } from '../types';

defineProps<{
  activeIntent: AiIntentId;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  (e: 'select-intent', intentId: AiIntentId): void;
}>();

const scrollContainer = ref<HTMLElement | null>(null);
const canScrollLeft = ref(false);
const canScrollRight = ref(true);

function checkScroll() {
  const el = scrollContainer.value;
  if (!el) return;
  canScrollLeft.value = el.scrollLeft > 4;
  canScrollRight.value = el.scrollLeft < el.scrollWidth - el.clientWidth - 4;
}

function scrollNext(direction: 'left' | 'right') {
  const el = scrollContainer.value;
  if (!el) return;
  const amount = direction === 'left' ? -150 : 150;
  el.scrollBy({ left: amount, behavior: 'smooth' });
}

onMounted(() => {
  checkScroll();
  window.addEventListener('resize', checkScroll);
});

onUnmounted(() => {
  window.removeEventListener('resize', checkScroll);
});
</script>

<template>
  <div class="sticky top-0 z-20 bg-dark-paper/90 backdrop-blur-md py-1.5 border-b border-dark-border/40 -mx-1 px-1 relative group">
    <!-- Left Theme-Responsive Scroll Mask & Glassmorphic SVG Chevron Button -->
    <div
      v-if="canScrollLeft"
      class="absolute left-0 top-0 bottom-0 w-12 scroll-mask-left z-10 flex items-center justify-start pl-1 pointer-events-none"
    >
      <button
        @click="scrollNext('left')"
        class="pointer-events-auto w-6 h-6 rounded-full bg-dark-surface border border-dark-border text-slate-200 hover:text-teal-300 flex items-center justify-center shadow-md hover:bg-teal-500/20 hover:border-teal-500/50 transition-all duration-150 cursor-pointer active:scale-90"
        title="Scroll left"
      >
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg>
      </button>
    </div>

    <!-- Scrollable Intent Buttons Track -->
    <div
      ref="scrollContainer"
      @scroll="checkScroll"
      class="flex items-center gap-2 overflow-x-auto no-scrollbar flex-nowrap py-0.5 px-0.5 scroll-smooth"
    >
      <button
        v-for="intent in AI_INTENTS"
        :key="intent.id"
        :disabled="disabled"
        @click="emit('select-intent', intent.id)"
        :class="[
          'flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs transition-all duration-150 border outline-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-xs active:scale-95 hover:scale-[1.02] flex-shrink-0 whitespace-nowrap',
          activeIntent === intent.id
            ? 'bg-gradient-to-r from-teal-500/15 to-emerald-500/15 border-teal-500/40 text-teal-300 font-bold ring-1 ring-teal-500/30 shadow-sm shadow-teal-500/10'
            : 'bg-dark-surface/90 border-dark-border text-slate-300 hover:text-white hover:bg-dark-muted hover:border-slate-600 font-semibold'
        ]"
      >
        <!-- Dedicated Vector SVG Icons for each AI Intent -->
        <svg v-if="intent.id === 'default'" class="w-3.5 h-3.5 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>
        <svg v-else-if="intent.id === 'explain_in_context'" class="w-3.5 h-3.5 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
        <svg v-else-if="intent.id === 'grammar'" class="w-3.5 h-3.5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
        <svg v-else-if="intent.id === 'collocations'" class="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/></svg>
        <svg v-else-if="intent.id === 'sentence_breakdown'" class="w-3.5 h-3.5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z"/></svg>
        <svg v-else-if="intent.id === 'confusables'" class="w-3.5 h-3.5 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3"/></svg>
        <svg v-else class="w-3.5 h-3.5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"/></svg>

        <span>{{ intent.label }}</span>
      </button>
    </div>

    <!-- Right Theme-Responsive Scroll Mask & Glassmorphic SVG Chevron Button -->
    <div
      v-if="canScrollRight"
      class="absolute right-0 top-0 bottom-0 w-12 scroll-mask-right z-10 flex items-center justify-end pr-1 pointer-events-none"
    >
      <button
        @click="scrollNext('right')"
        class="pointer-events-auto w-6 h-6 rounded-full bg-dark-surface border border-teal-500/50 text-teal-300 flex items-center justify-center shadow-md hover:bg-teal-500/20 hover:border-teal-500 transition-all duration-150 cursor-pointer active:scale-90 animate-pulse"
        title="Scroll right to see more intents"
      >
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/></svg>
      </button>
    </div>
  </div>
</template>
