<script setup lang="ts">
import { useStorage } from '../composables/composable.storage';
import { isAudioPlaying, stopAllAudio } from '../composables/composable.dictionary';
import { ExtensionSettings } from '../types';

defineProps<{
  showShortcuts: boolean;
  isMaximized?: boolean;
  isDarkMode?: boolean;
}>();

const emit = defineEmits<{
  (e: 'toggle-shortcuts'): void;
  (e: 'toggle-maximize'): void;
  (e: 'toggle-theme'): void;
  (e: 'open-settings'): void;
  (e: 'update:provider', value: string): void;
  (e: 'update:targetLang', value: string): void;
}>();

const { settings, saveSettings } = useStorage();

function handleProviderChange(e: Event) {
  const val = (e.target as HTMLSelectElement).value;
  saveSettings({ dictionaryProvider: val as ExtensionSettings['dictionaryProvider'] });
  emit('update:provider', val);
}

function handleTargetLangChange(e: Event) {
  const val = (e.target as HTMLSelectElement).value;
  saveSettings({ translateTargetLanguage: val as ExtensionSettings['translateTargetLanguage'] });
  emit('update:targetLang', val);
}
</script>

<template>
  <header class="flex items-center justify-between px-3 py-2 bg-dark-surface border-b border-dark-border select-none shadow-sm relative z-30">
    <!-- Extension Branding & Version Badge -->
    <div class="flex items-center gap-2">
      <!-- Modern Heroicons BookOpen Outline Icon -->
      <div class="w-7 h-7 rounded-lg bg-teal-500/15 border border-teal-500/30 flex items-center justify-center text-teal-400 shadow-sm flex-shrink-0">
        <svg class="w-4 h-4 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      </div>
      <div>
        <h1 class="text-xs font-bold text-slate-100 leading-none tracking-tight flex items-center gap-1.5">
          <span>Dictionary</span>
          <span class="text-[9px] px-1 py-0.2 rounded bg-teal-500/10 text-teal-300 font-bold border border-teal-500/20">v2.0</span>
        </h1>
        <p class="text-[10px] text-slate-400 leading-tight">Learner Workbench</p>
      </div>
    </div>

    <!-- Header Actions & Controls Toolbar -->
    <div class="flex items-center gap-1.5">
      <!-- Dictionary Provider Selector -->
      <div class="relative flex items-center">
        <select
          :value="settings.dictionaryProvider || 'free_dictionary'"
          @change="handleProviderChange"
          class="bg-dark-muted border border-dark-border text-slate-200 text-[11px] font-medium rounded-lg px-2 py-1 outline-none focus:border-teal-500 cursor-pointer appearance-none pr-5 transition-colors"
          title="Select Dictionary Provider"
        >
          <option value="free_dictionary">🌐 Google / FreeDict</option>
          <option value="google_translate">🌐 Google Translate</option>
          <option value="wiktionary">📖 Wiktionary</option>
          <option value="merriam_webster">🏛️ Merriam-Webster</option>
          <option value="wordnik">📚 Wordnik</option>
        </select>
        <span class="absolute right-1.5 text-[9px] text-slate-400 pointer-events-none">▼</span>
      </div>

      <!-- Target Translation Language Selector -->
      <div class="relative flex items-center">
        <select
          :value="settings.translateTargetLanguage || 'vi'"
          @change="handleTargetLangChange"
          class="bg-dark-muted border border-dark-border text-slate-200 text-[11px] font-medium rounded-lg px-2 py-1 outline-none focus:border-teal-500 cursor-pointer appearance-none pr-5 transition-colors"
          title="Select Translation Target Language"
        >
          <option value="vi">VN VI</option>
          <option value="en">US EN</option>
          <option value="ja">JP JA</option>
          <option value="zh">CN ZH</option>
          <option value="ko">KR KO</option>
          <option value="fr">FR FR</option>
          <option value="es">ES ES</option>
        </select>
        <span class="absolute right-1.5 text-[9px] text-slate-400 pointer-events-none">▼</span>
      </div>

      <!-- Divider -->
      <div class="w-[1px] h-4 bg-dark-border mx-0.5"></div>

      <!-- Global Stop Voice Audio Button -->
      <button
        @click="stopAllAudio()"
        :class="[
          'px-2 py-1 rounded-lg border transition-all duration-150 cursor-pointer text-xs flex items-center gap-1 font-bold active:scale-95 shadow-sm',
          isAudioPlaying
            ? 'bg-rose-500/25 text-rose-300 border-rose-500/50 shadow-rose-500/20 animate-pulse'
            : 'bg-dark-muted hover:bg-dark-border hover:border-slate-600 text-slate-300 border-dark-border'
        ]"
        :title="isAudioPlaying ? 'Dừng phát âm thanh/giọng nói đang chạy (Stop Voice)' : 'Dừng tất cả âm thanh/giọng nói (Global Stop Voice)'"
      >
        <span>{{ isAudioPlaying ? '⏹️' : '🔇' }}</span>
        <span v-if="isAudioPlaying" class="text-[10px] uppercase tracking-wider text-rose-300 font-bold">Stop Voice</span>
      </button>

      <!-- Shortcuts Modal Toggle Button -->
      <button
        @click="emit('toggle-shortcuts')"
        :class="[
          'p-1.5 rounded-lg border transition-all duration-150 cursor-pointer text-xs hover:scale-105 active:scale-95 shadow-xs',
          showShortcuts
            ? 'bg-teal-500/20 text-teal-300 border-teal-500/40'
            : 'bg-dark-muted hover:bg-dark-border hover:border-slate-600 text-slate-300 border-dark-border'
        ]"
        title="Keyboard Shortcuts Guide (Shift+Q)"
      >
        <span>⌨️</span>
      </button>

      <!-- Dark / Light Theme Toggle Button -->
      <button
        @click="emit('toggle-theme')"
        class="p-1.5 rounded-lg bg-dark-muted hover:bg-dark-border hover:border-slate-600 text-slate-300 border border-dark-border transition-all duration-150 hover:scale-105 active:scale-95 cursor-pointer text-xs shadow-xs"
        :title="isDarkMode ? 'Switch to Light Theme' : 'Switch to Dark Theme'"
      >
        <span>{{ isDarkMode ? '🌙' : '☀️' }}</span>
      </button>

      <!-- Fullscreen / Maximize Workbench Toggle Button -->
      <button
        @click="emit('toggle-maximize')"
        class="p-1.5 rounded-lg bg-dark-muted hover:bg-dark-border hover:border-slate-600 text-slate-300 border border-dark-border transition-all duration-150 hover:scale-105 active:scale-95 cursor-pointer text-xs shadow-xs"
        :title="isMaximized ? 'Restore Popup Size' : 'Maximize Workbench View'"
      >
        <span>{{ isMaximized ? '⤓' : '⤢' }}</span>
      </button>

      <!-- Settings & API Key Modal Toggle Button -->
      <button
        @click="emit('open-settings')"
        class="p-1.5 rounded-lg bg-dark-muted hover:bg-dark-border hover:border-slate-600 text-slate-300 border border-dark-border transition-all duration-150 hover:scale-105 active:scale-95 cursor-pointer text-xs shadow-xs"
        title="Extension Settings & Gemini API Key"
      >
        <span>⚙️</span>
      </button>
    </div>
  </header>
</template>
