<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { useStorage } from '@/composables/composable.storage';
import { abortActiveAiRequest } from '@/composables/composable.ai-assistant';
import { abortActiveDictRequest, stopAllAudio } from '@/composables/composable.dictionary';
import AppHeader from '@/components/component.app-header.vue';
import TabNavigation from '@/components/component.tab-navigation.vue';
import WordLookupView from '@/components/view.word-lookup.vue';
import AiAssistantView from '@/components/view.ai-assistant.vue';
import ShortcutsModal from '@/components/modal.shortcuts.vue';
import SettingsModal from '@/components/modal.settings.vue';
import { TabId } from '@/types';

const props = defineProps<{
  selectedText?: string;
  contextSentence?: string;
  targetLang?: string;
  isMaximized?: boolean;
  isDragging?: boolean;
  isResizing?: boolean;
  width?: number;
  height?: number;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'toggle-maximize'): void;
  (e: 'start-drag', event: MouseEvent): void;
  (e: 'start-resize', event: MouseEvent): void;
}>();

const { activeTab, settings, saveSettings } = useStorage();
const showShortcuts = ref<boolean>(false);
const showSettings = ref<boolean>(false);
const isDarkMode = ref<boolean>(settings.value.theme !== 'light');
const currentProvider = ref<string>(settings.value.dictionaryProvider || 'free_dictionary');
const currentText = ref<string>(props.selectedText || '');
const currentContext = ref<string>(props.contextSentence || props.selectedText || '');
const currentLang = ref<string>(props.targetLang || settings.value.translateTargetLanguage || 'vi');

watch(() => settings.value.dictionaryProvider, (newProv) => {
  if (newProv) currentProvider.value = newProv;
}, { immediate: true });

watch(() => settings.value.translateTargetLanguage, (newLang) => {
  if (newLang && !props.targetLang) currentLang.value = newLang;
}, { immediate: true });

watch(() => settings.value.theme, (newTheme) => {
  isDarkMode.value = newTheme !== 'light';
});

function toggleTheme() {
  isDarkMode.value = !isDarkMode.value;
  saveSettings({ theme: isDarkMode.value ? 'dark' : 'light' });
}

function syncTextFromSelection(text?: string, context?: string) {
  if (!text?.trim()) return;
  const trimmed = text.trim();
  currentText.value = trimmed;
  currentContext.value = context?.trim() || trimmed;

  if (settings.value.defaultTab) {
    activeTab.value = settings.value.defaultTab;
  }
}

function handleTabChange(newTab: TabId) {
  stopAllAudio();
  activeTab.value = newTab;
  saveSettings({ defaultTab: newTab });
}

function handleClose() {
  stopAllAudio();
  abortActiveAiRequest();
  abortActiveDictRequest();
  emit('close');
}

function handleHeaderMouseDown(e: MouseEvent) {
  const target = e.target as HTMLElement;
  if (target.closest('button, input, select, textarea, a, label')) return;
  emit('start-drag', e);
}

onMounted(() => {
  syncTextFromSelection(props.selectedText, props.contextSentence);

  const shadowRoot = document.getElementById('dictionary-extension-root')?.shadowRoot;
  if (shadowRoot) {
    shadowRoot.addEventListener('dict-update-text', (e: Event) => {
      const text = (e as CustomEvent<string>).detail;
      syncTextFromSelection(text);
    });

    shadowRoot.addEventListener('dict-switch-tab', (e: Event) => {
      const tab = (e as CustomEvent<TabId>).detail;
      handleTabChange(tab);
    });
  }
});

onUnmounted(() => {
  stopAllAudio();
  abortActiveAiRequest();
  abortActiveDictRequest();
});

watch(() => props.selectedText, (newText) => {
  syncTextFromSelection(newText, props.contextSentence);
});

watch(() => props.contextSentence, (newContext) => {
  if (newContext?.trim()) {
    currentContext.value = newContext.trim();
  }
});

watch(() => props.targetLang, (newLang) => {
  if (newLang) currentLang.value = newLang;
});

watch(activeTab, (newTab) => {
  saveSettings({ defaultTab: newTab });
});
</script>

<template>
  <div
    :class="[
      'bg-dark-paper border border-slate-700/80 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.6)] overflow-hidden flex flex-col select-none text-slate-100 text-sm ring-1 ring-white/10 relative inpage-popup-card',
      (props.isDragging || props.isResizing) ? 'transition-none' : 'transition-all duration-200 ease-out',
      !isDarkMode ? 'light-theme' : '',
      settings.fontFamily === 'editorial' ? 'font-serif' : 'font-sans',
      isMaximized ? 'w-full max-w-5xl h-full max-h-[90vh]' : ''
    ]"
    :style="isMaximized ? {} : {
      width: `${props.width || settings.popupWidth || 480}px`,
      height: `${props.height || settings.popupHeight || 580}px`,
      maxWidth: '96vw',
      maxHeight: '92vh'
    }"
    @click.stop
  >
    <!-- Draggable Header Handle Container with Close Button -->
    <div
      class="relative cursor-grab active:cursor-grabbing select-none"
      @mousedown="handleHeaderMouseDown"
    >
      <AppHeader
        :showShortcuts="showShortcuts"
        :isMaximized="isMaximized"
        :isDarkMode="isDarkMode"
        @toggle-shortcuts="showShortcuts = !showShortcuts"
        @toggle-maximize="emit('toggle-maximize')"
        @toggle-theme="toggleTheme()"
        @open-settings="showSettings = true"
        @update:provider="(v: string) => currentProvider = v"
        @update:targetLang="(v: string) => currentLang = v"
      />
      <button
        @click="handleClose"
        title="Close (Esc)"
        class="absolute right-2 top-2 w-5 h-5 rounded-full bg-dark-muted hover:bg-red-500/20 hover:text-red-400 text-slate-400 flex items-center justify-center text-xs transition-colors z-10 cursor-pointer"
      >
        ✕
      </button>
    </div>

    <!-- Navigation Bar -->
    <TabNavigation
      v-model:activeTab="activeTab"
      @change-tab="handleTabChange"
    />

    <!-- Main Content -->
    <main class="flex-1 overflow-y-auto">
      <WordLookupView
        v-if="activeTab === 'dictionary'"
        :initialQuery="currentText"
        :targetLang="currentLang"
        :provider="currentProvider"
      />
      <AiAssistantView
        v-else-if="activeTab === 'ai_assistant'"
        :initialContext="currentContext"
        :targetLang="currentLang"
        @switch-tab="handleTabChange"
      />
    </main>

    <!-- Bottom-Right Resize Handle -->
    <div
      v-if="!isMaximized"
      @mousedown.stop.prevent="emit('start-resize', $event)"
      class="absolute right-1 bottom-1 w-4 h-4 cursor-nwse-resize text-slate-500 hover:text-slate-200 select-none flex items-center justify-center text-[10px] opacity-70 hover:opacity-100 transition-opacity z-30"
      title="Drag to resize popup window"
    >
      ◢
    </div>

    <!-- Keyboard Shortcuts Modal -->
    <ShortcutsModal
      :show="showShortcuts"
      @close="showShortcuts = false"
    />

    <!-- Settings & API Key Modal -->
    <SettingsModal
      :show="showSettings"
      @close="showSettings = false"
    />
  </div>
</template>

<style scoped>
.inpage-popup-card {
  animation: inpage-popup-enter 220ms cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes inpage-popup-enter {
  0% {
    opacity: 0;
    transform: scale(0.95);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}
</style>
