<script setup lang="ts">
import { computed } from 'vue';
import { AppSettings } from '../../types';

const props = defineProps<{
  localSettings: AppSettings;
}>();

const emit = defineEmits<{
  (e: 'update:localSettings', value: AppSettings): void;
}>();

const localSettings = computed({
  get: () => props.localSettings,
  set: (val) => emit('update:localSettings', val),
});
</script>

<template>
  <div class="space-y-3.5">
    <div class="space-y-2">
      <label class="font-bold text-slate-200 block">🎨 Theme Mode:</label>
      <div class="grid grid-cols-3 gap-2">
        <label
          :class="[
            'p-2.5 rounded-xl border text-center cursor-pointer transition-all font-bold',
            localSettings.theme === 'dark' ? 'bg-teal-500/10 border-teal-500/50 text-teal-300' : 'bg-dark-muted border-dark-border text-slate-300'
          ]"
        >
          <input type="radio" value="dark" v-model="localSettings.theme" class="hidden" />
          <span>🌙 Dark</span>
        </label>

        <label
          :class="[
            'p-2.5 rounded-xl border text-center cursor-pointer transition-all font-bold',
            localSettings.theme === 'light' ? 'bg-teal-500/10 border-teal-500/50 text-teal-300' : 'bg-dark-muted border-dark-border text-slate-300'
          ]"
        >
          <input type="radio" value="light" v-model="localSettings.theme" class="hidden" />
          <span>☀️ Light</span>
        </label>

        <label
          :class="[
            'p-2.5 rounded-xl border text-center cursor-pointer transition-all font-bold',
            localSettings.theme === 'system' ? 'bg-teal-500/10 border-teal-500/50 text-teal-300' : 'bg-dark-muted border-dark-border text-slate-300'
          ]"
        >
          <input type="radio" value="system" v-model="localSettings.theme" class="hidden" />
          <span>💻 System</span>
        </label>
      </div>
    </div>

    <div class="space-y-2 pt-2 border-t border-dark-border/60">
      <label class="font-bold text-slate-200 block">🔤 Display Font Family:</label>
      <select
        v-model="localSettings.fontFamily"
        class="w-full bg-dark-muted border border-dark-border text-slate-200 text-sm font-medium rounded-xl px-3 py-2 outline-none focus:border-teal-500 cursor-pointer"
      >
        <option value="learner">Modern Academic Font (Plus Jakarta Sans / Sans-Serif)</option>
        <option value="editorial">Classic Editorial Font (Newsreader / Serif)</option>
      </select>
    </div>

    <div class="space-y-2 pt-2 border-t border-dark-border/60">
      <label class="flex items-center justify-between cursor-pointer">
        <span class="font-bold text-slate-200">📊 Enable Structured Lexical Profile Cards (CEFR, Collocations):</span>
        <input type="checkbox" v-model="localSettings.enableLexicalProfile" class="accent-teal-500 w-4 h-4 cursor-pointer" />
      </label>
    </div>

    <div class="grid grid-cols-2 gap-3 pt-2 border-t border-dark-border/60">
      <div class="space-y-1">
        <label class="font-bold text-slate-200 block">📐 Popup Width (px):</label>
        <input
          type="number"
          v-model.number="localSettings.popupWidth"
          min="360"
          max="1000"
          class="w-full bg-dark-muted border border-dark-border rounded-xl px-3 py-2 text-sm text-slate-100 outline-none focus:border-teal-500 font-mono"
        />
      </div>

      <div class="space-y-1">
        <label class="font-bold text-slate-200 block">📐 Popup Height (px):</label>
        <input
          type="number"
          v-model.number="localSettings.popupHeight"
          min="380"
          max="900"
          class="w-full bg-dark-muted border border-dark-border rounded-xl px-3 py-2 text-sm text-slate-100 outline-none focus:border-teal-500 font-mono"
        />
      </div>
    </div>
  </div>
</template>
