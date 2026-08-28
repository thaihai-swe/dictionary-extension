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
          'px-2 py-1.5 rounded-lg border transition-all duration-150 cursor-pointer text-xs flex items-center gap-1.5 font-bold active:scale-95 shadow-sm',
          isAudioPlaying
            ? 'bg-rose-500/25 text-rose-300 border-rose-500/50 shadow-rose-500/20 animate-pulse'
            : 'bg-dark-muted hover:bg-dark-border hover:border-slate-600 text-slate-300 border-dark-border'
        ]"
        :title="isAudioPlaying ? 'Dừng phát âm thanh/giọng nói đang chạy (Stop Voice)' : 'Dừng tất cả âm thanh/giọng nói (Global Stop Voice)'"
      >
        <svg v-if="isAudioPlaying" class="w-3.5 h-3.5 fill-rose-300" viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>
        <svg v-else class="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"/><path stroke-linecap="round" stroke-linejoin="round" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"/></svg>
        <span v-if="isAudioPlaying" class="text-[10px] uppercase tracking-wider text-rose-300 font-bold">Stop Voice</span>
      </button>

      <!-- Shortcuts Modal Toggle Button -->
      <button
        @click="emit('toggle-shortcuts')"
        :class="[
          'p-1.5 rounded-lg border transition-all duration-150 cursor-pointer hover:scale-105 active:scale-95 shadow-xs flex items-center justify-center',
          showShortcuts
            ? 'bg-teal-500/20 text-teal-300 border-teal-500/40'
            : 'bg-dark-muted hover:bg-dark-border hover:border-slate-600 text-slate-300 border-dark-border'
        ]"
        title="Keyboard Shortcuts Guide (Shift+Q)"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"/></svg>
      </button>

      <!-- Dark / Light Theme Toggle Button -->
      <button
        @click="emit('toggle-theme')"
        class="p-1.5 rounded-lg bg-dark-muted hover:bg-dark-border hover:border-slate-600 text-slate-300 border border-dark-border transition-all duration-150 hover:scale-105 active:scale-95 cursor-pointer shadow-xs flex items-center justify-center"
        :title="isDarkMode ? 'Switch to Light Theme' : 'Switch to Dark Theme'"
      >
        <svg v-if="isDarkMode" class="w-4 h-4 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/></svg>
        <svg v-else class="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
      </button>

      <!-- Fullscreen / Maximize Workbench Toggle Button -->
      <button
        @click="emit('toggle-maximize')"
        class="p-1.5 rounded-lg bg-dark-muted hover:bg-dark-border hover:border-slate-600 text-slate-300 border border-dark-border transition-all duration-150 hover:scale-105 active:scale-95 cursor-pointer shadow-xs flex items-center justify-center"
        :title="isMaximized ? 'Restore Popup Size' : 'Maximize Workbench View'"
      >
        <svg v-if="isMaximized" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 9L4 4m0 0l5 5M4 4v4m0-4h4m11 5l-5-5m0 0l5 5m0-5v4m0-4h-4m-5 11l5 5m0 0l-5-5m5 5v-4m0 4h-4m-11-5l5-5m0 0l-5 5m0 5v-4m0 4h4"/></svg>
        <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-5h-4m4 0v4m0-4l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"/></svg>
      </button>

      <!-- Settings & API Key Modal Toggle Button -->
      <button
        @click="emit('open-settings')"
        class="p-1.5 rounded-lg bg-dark-muted hover:bg-dark-border hover:border-slate-600 text-slate-300 border border-dark-border transition-all duration-150 hover:scale-105 active:scale-95 cursor-pointer shadow-xs flex items-center justify-center"
        title="Extension Settings & Gemini API Key"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
      </button>
    </div>
  </header>
</template>
