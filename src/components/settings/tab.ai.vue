<script setup lang="ts">
import { computed } from 'vue';
import { AppSettings } from '../../types';

const props = defineProps<{
  localSettings: AppSettings;
  isManualModelInput: boolean;
  connectionStatus: Record<string, string>;
  connectionBusy: Record<string, boolean>;
  promptEditors: Array<{ key: keyof AppSettings; label: string }>;
}>();

const emit = defineEmits<{
  (e: 'update:localSettings', value: AppSettings): void;
  (e: 'toggle-manual-model'): void;
  (e: 'test-ai'): void;
  (e: 'restore-prompt', key: keyof AppSettings): void;
  (e: 'restore-all-prompts'): void;
}>();

const localSettings = computed({
  get: () => props.localSettings,
  set: (val) => emit('update:localSettings', val),
});
</script>

<template>
  <div class="space-y-3.5">
    <div class="space-y-2">
      <label class="flex items-center justify-between cursor-pointer">
        <span class="font-bold text-slate-200">✨ Enable AI Assistant Features:</span>
        <input type="checkbox" v-model="localSettings.enableAI" class="accent-teal-500 w-4 h-4 cursor-pointer" />
      </label>
    </div>

    <div class="space-y-2 pt-2 border-t border-dark-border/60">
      <label class="flex items-center justify-between cursor-pointer">
        <div>
          <span class="font-bold text-slate-200 block">⚡ Enable AI Preload (Background Pre-fetch):</span>
          <span class="text-xs text-slate-400 block">After Dictionary lookup finishes, load Main AI first, then Context, Grammar, and the other intents in the background.</span>
        </div>
        <input type="checkbox" v-model="localSettings.enableAiPreload" class="accent-teal-500 w-4 h-4 cursor-pointer flex-shrink-0 ml-2" />
      </label>
    </div>

    <div class="space-y-2 pt-2 border-t border-dark-border/60">
      <label class="flex items-center justify-between cursor-pointer">
        <div>
          <span class="font-bold text-slate-200 block">💬 Use AI when a phrase has no dictionary definition:</span>
          <span class="text-xs text-slate-400 block">Only runs when AI is enabled. Explains idioms dictionary backends miss.</span>
        </div>
        <input type="checkbox" v-model="localSettings.enablePhraseFallback" class="accent-teal-500 w-4 h-4 cursor-pointer flex-shrink-0 ml-2" />
      </label>
    </div>

    <!-- Gemini API Key Section -->
    <div class="space-y-2 pt-2 border-t border-dark-border/60">
      <label class="font-bold text-slate-200 block flex items-center justify-between">
        <span>🔑 Google Gemini API Key:</span>
        <a
          href="https://aistudio.google.com/app/apikey"
          target="_blank"
          class="text-xs text-teal-400 hover:underline flex items-center gap-1"
        >
          <span>Get Free API Key ↗</span>
        </a>
      </label>

      <input
        v-model="localSettings.aiApiKey"
        type="password"
        placeholder="Paste API Key (AIzaSy...)"
        class="w-full bg-dark-muted border border-dark-border rounded-xl px-3 py-2 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-teal-500 transition-all font-mono"
      />
      <p class="text-xs text-slate-400 leading-normal">
        Stored only on this device in `chrome.storage.local`. It is not synced and is never exported. Leave blank to keep the current key.
      </p>
    </div>

    <!-- AI Model Dual Mode Selection -->
    <div class="space-y-2 pt-2 border-t border-dark-border/60">
      <div class="flex items-center justify-between">
        <label class="font-bold text-slate-200">🤖 AI Model (Gemini Model):</label>

        <button
          type="button"
          @click="emit('toggle-manual-model')"
          class="text-xs px-2 py-0.5 rounded bg-dark-muted hover:bg-dark-border text-teal-400 font-bold border border-dark-border transition-colors cursor-pointer"
        >
          {{ isManualModelInput ? '📋 Preset List' : '✏️ Custom Model ID' }}
        </button>
      </div>

      <!-- Preset Dropdown Mode -->
      <select
        v-if="!isManualModelInput"
        v-model="localSettings.aiModel"
        class="w-full bg-dark-muted border border-dark-border text-slate-200 text-sm font-medium rounded-xl px-3 py-2 outline-none focus:border-teal-500 cursor-pointer"
      >
        <option value="gemini-2.5-flash">⚡ gemini-2.5-flash (Recommended - Fast &amp; Smart)</option>
        <option value="gemini-3.5-flash-lite">🚀 gemini-3.5-flash-lite (Maximum Speed)</option>
        <option value="gemini-1.5-flash">✨ gemini-1.5-flash (Standard Baseline)</option>
        <option value="gemini-1.5-pro">🧠 gemini-1.5-pro (Deep Analysis)</option>
      </select>

      <!-- Manual Write-in Mode -->
      <input
        v-else
        v-model="localSettings.aiModel"
        type="text"
        placeholder="Enter custom Gemini model ID (e.g. gemini-2.5-pro)..."
        class="w-full bg-dark-muted border border-dark-border rounded-xl px-3 py-2 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-teal-500 transition-all font-mono"
      />
    </div>

    <div class="space-y-2 pt-2 border-t border-dark-border/60">
      <label class="font-bold text-slate-200 block">🔗 Custom AI Base URL (Optional Endpoint):</label>
      <input
        v-model="localSettings.aiBaseUrl"
        type="text"
        placeholder="https://generativelanguage.googleapis.com"
        class="w-full bg-dark-muted border border-dark-border rounded-xl px-3 py-2 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-teal-500 transition-all font-mono"
      />
      <p class="text-xs text-slate-400">Gemini URLs use generateContent. Any other URL is treated as OpenAI-compatible /chat/completions.</p>
      <div class="flex items-center gap-2">
        <button
          type="button"
          class="px-2.5 py-1.5 rounded-lg bg-dark-muted border border-dark-border text-sm font-bold text-slate-200 hover:border-teal-500 cursor-pointer"
          :disabled="connectionBusy.ai"
          @click="emit('test-ai')"
        >
          Test AI connection
        </button>
        <span class="text-xs text-slate-400">{{ connectionStatus.ai }}</span>
      </div>
    </div>

    <div class="space-y-3 pt-2 border-t border-dark-border/60">
      <div class="flex items-center justify-between">
        <label class="font-bold text-slate-200">📝 Prompt templates</label>
        <button
          type="button"
          class="text-xs px-2 py-0.5 rounded bg-dark-muted hover:bg-dark-border text-teal-400 font-bold border border-dark-border cursor-pointer"
          @click="emit('restore-all-prompts')"
        >
          Restore all defaults
        </button>
      </div>
      <p class="text-xs text-slate-400">Variables: <code v-pre>{{str}}</code>, <code v-pre>{{text}}</code>, <code v-pre>{{sentence}}</code>, <code v-pre>{{context}}</code>, <code v-pre>{{targetLang}}</code>, <code v-pre>{{word_count}}</code></p>
      <div v-for="editor in promptEditors" :key="editor.key" class="space-y-1.5">
        <div class="flex items-center justify-between">
          <span class="text-sm font-bold text-slate-300">{{ editor.label }}</span>
          <button
            type="button"
            class="text-xs text-teal-400 font-bold cursor-pointer"
            @click="emit('restore-prompt', editor.key)"
          >
            Restore default
          </button>
        </div>
        <textarea
          v-model="(localSettings as any)[editor.key]"
          rows="5"
          class="w-full bg-dark-muted border border-dark-border rounded-xl px-3 py-2 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-teal-500 font-mono"
        ></textarea>
      </div>
    </div>
  </div>
</template>
