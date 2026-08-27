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
      v-for="tab in tabs"
      :key="tab.id"
      @click="selectTab(tab.id)"
      :class="[
        'flex items-center gap-2 px-3.5 py-2 text-xs font-bold border-b-2 transition-all duration-200 outline-none cursor-pointer',
        currentActive === tab.id
          ? 'border-brand-500 text-brand-400 bg-brand-500/10'
          : 'border-transparent text-slate-400 hover:text-slate-100 hover:bg-dark-muted'
      ]"
    >
      <span>{{ tab.icon }}</span>
      <span>{{ tab.label }}</span>
    </button>
  </nav>
</template>
