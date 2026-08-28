<script setup lang="ts">
import { computed } from 'vue';
import { TabId } from '../types';

const props = defineProps<{
  activeTab?: TabId;
  modelValue?: TabId;
}>();

const emit = defineEmits<{
  (e: 'update:activeTab', tab: TabId): void;
  (e: 'update:modelValue', tab: TabId): void;
  (e: 'change-tab', tab: TabId): void;
}>();

const currentActive = computed(() => props.modelValue || props.activeTab || 'dictionary');

function selectTab(id: TabId) {
  emit('update:modelValue', id);
  emit('update:activeTab', id);
  emit('change-tab', id);
}

const tabs: { id: TabId; label: string; icon: string }[] = [
  { id: 'dictionary', label: 'Dictionary', icon: '📖' },
  { id: 'ai_assistant', label: 'AI Assistant', icon: '✨' },
];
</script>

<template>
  <nav class="flex border-b border-dark-border bg-dark-surface px-2">
    <button
      @click="selectTab('dictionary')"
      :class="[
        'flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all duration-200 outline-none cursor-pointer',
        currentActive === 'dictionary'
          ? 'border-teal-500 text-teal-300 bg-teal-500/10'
          : 'border-transparent text-slate-400 hover:text-slate-100 hover:bg-dark-muted'
      ]"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>
      <span>Dictionary</span>
    </button>

    <button
      @click="selectTab('ai_assistant')"
      :class="[
        'flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all duration-200 outline-none cursor-pointer',
        currentActive === 'ai_assistant'
          ? 'border-teal-500 text-teal-300 bg-teal-500/10'
          : 'border-transparent text-slate-400 hover:text-slate-100 hover:bg-dark-muted'
      ]"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"/></svg>
      <span>AI Assistant</span>
    </button>
  </nav>
</template>
