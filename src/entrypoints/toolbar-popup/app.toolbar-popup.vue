<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { useStorage } from '@/composables/composable.storage';
import AppHeader from '@/components/component.app-header.vue';
import TabNavigation from '@/components/component.tab-navigation.vue';
import WordLookupView from '@/components/view.word-lookup.vue';
import AiAssistantView from '@/components/view.ai-assistant.vue';
import ShortcutsModal from '@/components/modal.shortcuts.vue';
import SettingsModal from '@/components/modal.settings.vue';
import { TabId } from '@/types';

const { activeTab, settings, saveSettings } = useStorage();
const showShortcuts = ref<boolean>(false);
const showSettings = ref<boolean>(false);
const targetLang = ref<string>(settings.value.translateTargetLanguage || 'vi');
const currentProvider = ref<string>(settings.value.dictionaryProvider || 'free_dictionary');
const isDarkMode = ref<boolean>(settings.value.theme !== 'light');
const isFullTab = ref<boolean>(false);

watch(() => settings.value.dictionaryProvider, (newProv) => {
  if (newProv) currentProvider.value = newProv;
}, { immediate: true });

watch(() => settings.value.translateTargetLanguage, (newLang) => {
  if (newLang) targetLang.value = newLang;
}, { immediate: true });

watch(() => settings.value.theme, (newTheme) => {
  isDarkMode.value = newTheme !== 'light';
});

function updateResponsiveMode() {
  if (typeof window !== 'undefined') {
    isFullTab.value = window.innerWidth > 760;
  }
}

onMounted(() => {
  updateResponsiveMode();
  if (typeof window !== 'undefined') {
    window.addEventListener('resize', updateResponsiveMode);
  }
});

onUnmounted(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('resize', updateResponsiveMode);
  }
});

watch(() => settings.value.theme, (newTheme) => {
  isDarkMode.value = newTheme !== 'light';
});

function toggleTheme() {
  isDarkMode.value = !isDarkMode.value;
  saveSettings({ theme: isDarkMode.value ? 'dark' : 'light' });
}

function handleTabChange(newTab: TabId) {
  activeTab.value = newTab;
  saveSettings({ defaultTab: newTab });
}

function openFullTab() {
  if (typeof chrome !== 'undefined' && chrome.tabs?.create) {
    chrome.tabs.create({ url: chrome.runtime.getURL('index.html') });
  } else {
    window.open(window.location.href, '_blank');
  }
}

function handleKeydown(event: KeyboardEvent) {
  if (event.altKey && event.key === '1') {
    handleTabChange('dictionary');
    event.preventDefault();
  } else if (event.altKey && event.key === '2') {
    handleTabChange('ai_assistant');
    event.preventDefault();
  } else if (event.shiftKey && (event.key === 'Q' || event.key === 'q')) {
    showShortcuts.value = !showShortcuts.value;
  }
}
</script>

<template>
  <div
    :class="[
      'bg-dark-paper text-slate-100 flex flex-col select-none overflow-hidden transition-all duration-200',
      isFullTab ? 'w-full max-w-6xl min-h-[calc(100vh-2rem)] mx-auto my-4 rounded-2xl border border-dark-border shadow-2xl' : 'w-[720px] h-[530px]',
      !isDarkMode ? 'light-theme' : '',
      settings.fontFamily === 'editorial' ? 'font-serif' : 'font-sans'
    ]"
    @keydown="handleKeydown"
    tabindex="-1"
  >
    <!-- Extension Header -->
    <AppHeader
      :showShortcuts="showShortcuts"
      :isDarkMode="isDarkMode"
      :isMaximized="isFullTab"
      @toggle-shortcuts="showShortcuts = !showShortcuts"
      @toggle-maximize="openFullTab"
      @toggle-theme="toggleTheme()"
      @open-settings="showSettings = true"
      @update:provider="(v: string) => currentProvider = v"
      @update:targetLang="(v: string) => targetLang = v"
    />

    <!-- Navigation Bar -->
    <TabNavigation
      v-model:activeTab="activeTab"
      @change-tab="handleTabChange"
    />

    <!-- Toolbar Popup Main Search & Workbench View -->
    <main class="flex-1 overflow-y-auto">
      <WordLookupView
        v-if="activeTab === 'dictionary'"
        :autoFocus="true"
        :targetLang="targetLang"
        :provider="currentProvider"
      />
      <AiAssistantView
        v-else-if="activeTab === 'ai_assistant'"
        :targetLang="targetLang"
        @switch-tab="handleTabChange"
      />
    </main>

    <!-- Keyboard Shortcuts Guide Modal -->
    <ShortcutsModal
      :show="showShortcuts"
      @close="showShortcuts = false"
    />

    <!-- Extension Settings Modal -->
    <SettingsModal
      :show="showSettings"
      @close="showSettings = false"
    />
  </div>
</template>
