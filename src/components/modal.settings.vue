<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import { useStorage } from '../composables/composable.storage';

const props = defineProps<{
  show: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

type SettingsTab = 'general' | 'appearance' | 'sources' | 'ai';

const activeTab = ref<SettingsTab>('general');
const { settings, saveSettings } = useStorage();

const localSettings = ref({ ...settings.value });
const isSavedNotice = ref(false);
const availableVoices = ref<SpeechSynthesisVoice[]>([]);
const pausedSitesInput = ref<string>('');
const isManualModelInput = ref(false);

const presetModels = [
  'gemini-2.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-1.5-flash',
  'gemini-1.5-pro',
];

function loadVoices() {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    const voices = window.speechSynthesis.getVoices();
    availableVoices.value = voices.filter(v => v.lang.startsWith('en') || v.lang.startsWith('vi'));
  }
}

onMounted(() => {
  loadVoices();
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }
});

watch(() => props.show, (newVal) => {
  if (newVal) {
    localSettings.value = { ...settings.value };
    pausedSitesInput.value = Array.isArray(localSettings.value.pausedHostnames)
      ? localSettings.value.pausedHostnames.join('\n')
      : '';
    isManualModelInput.value = Boolean(
      localSettings.value.aiModel && !presetModels.includes(localSettings.value.aiModel)
    );
  }
});

function toggleManualModelMode() {
  isManualModelInput.value = !isManualModelInput.value;
  if (!isManualModelInput.value && !presetModels.includes(localSettings.value.aiModel)) {
    localSettings.value.aiModel = 'gemini-2.5-flash';
  }
}

function handleSave() {
  const parsedHostnames = pausedSitesInput.value
    .split('\n')
    .map(s => s.trim().toLowerCase())
    .filter(Boolean);

  localSettings.value.pausedHostnames = parsedHostnames;

  if (!localSettings.value.aiModel || !localSettings.value.aiModel.trim()) {
    localSettings.value.aiModel = 'gemini-2.5-flash';
  }

  saveSettings(localSettings.value);
  isSavedNotice.value = true;
  setTimeout(() => {
    isSavedNotice.value = false;
    emit('close');
  }, 700);
}

function exportSettings() {
  const jsonStr = JSON.stringify(settings.value, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `dictionary-settings-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function triggerImportFile() {
  const fileInput = document.getElementById('settings-import-input') as HTMLInputElement;
  if (fileInput) fileInput.click();
}

function handleImportFile(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const imported = JSON.parse(event.target?.result as string);
      saveSettings(imported);
      localSettings.value = { ...settings.value };
      alert('Settings backup restored successfully!');
    } catch {
      alert('Invalid JSON settings file.');
    }
  };
  reader.readAsText(file);
}
</script>

<template>
  <div
    v-if="show"
    class="fixed inset-0 z-[2147483647] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 pointer-events-auto select-none"
    @click.self="emit('close')"
  >
    <div class="w-full max-w-lg bg-dark-surface border border-dark-border rounded-2xl p-5 shadow-2xl space-y-4 text-slate-100 text-xs flex flex-col max-h-[90vh]">
      <!-- Header with Title & Close Button -->
      <div class="flex items-center justify-between border-b border-dark-border pb-3 flex-shrink-0">
        <h3 class="font-bold text-sm text-slate-100 flex items-center gap-2">
          <span>⚙️</span>
          <span>Extension Settings</span>
        </h3>
        <button
          @click="emit('close')"
          class="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-dark-muted transition-colors cursor-pointer"
        >
          ✕
        </button>
      </div>

      <!-- 4-Tab Navigation Bar -->
      <div class="flex items-center gap-1 bg-dark-muted p-1 rounded-xl border border-dark-border flex-shrink-0">
        <button
          @click="activeTab = 'general'"
          :class="[
            'flex-1 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer',
            activeTab === 'general' ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30' : 'text-slate-400 hover:text-slate-200'
          ]"
        >
          ⚡ General
        </button>

        <button
          @click="activeTab = 'appearance'"
          :class="[
            'flex-1 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer',
            activeTab === 'appearance' ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30' : 'text-slate-400 hover:text-slate-200'
          ]"
        >
          🎨 Appearance
        </button>

        <button
          @click="activeTab = 'sources'"
          :class="[
            'flex-1 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer',
            activeTab === 'sources' ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30' : 'text-slate-400 hover:text-slate-200'
          ]"
        >
          📚 Dictionaries
        </button>

        <button
          @click="activeTab = 'ai'"
          :class="[
            'flex-1 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer',
            activeTab === 'ai' ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30' : 'text-slate-400 hover:text-slate-200'
          ]"
        >
          🤖 Gemini AI
        </button>
      </div>

      <!-- Scrollable Tab Content Container -->
      <div class="flex-1 overflow-y-auto space-y-4 pr-1">
        <!-- TAB 1: GENERAL & TRIGGER SETTINGS -->
        <div v-if="activeTab === 'general'" class="space-y-3.5">
          <div class="space-y-2">
            <label class="font-bold text-slate-200 block">⚡ Text Selection Trigger Mode:</label>
            <div class="grid grid-cols-2 gap-2">
              <label
                :class="[
                  'p-2.5 rounded-xl border cursor-pointer transition-all flex items-center gap-2',
                  localSettings.selectionTriggerMode === 'icon'
                    ? 'bg-teal-500/10 border-teal-500/50 text-teal-300 font-bold'
                    : 'bg-dark-muted border-dark-border text-slate-300 hover:border-slate-500'
                ]"
              >
                <input type="radio" value="icon" v-model="localSettings.selectionTriggerMode" class="hidden" />
                <span>🔍 Floating Action Icon</span>
              </label>

              <label
                :class="[
                  'p-2.5 rounded-xl border cursor-pointer transition-all flex items-center gap-2',
                  localSettings.selectionTriggerMode === 'direct'
                    ? 'bg-teal-500/10 border-teal-500/50 text-teal-300 font-bold'
                    : 'bg-dark-muted border-dark-border text-slate-300 hover:border-slate-500'
                ]"
              >
                <input type="radio" value="direct" v-model="localSettings.selectionTriggerMode" class="hidden" />
                <span>⚡ Auto-open Popup</span>
              </label>
            </div>
          </div>

          <div class="space-y-2 pt-2 border-t border-dark-border/60">
            <label class="font-bold text-slate-200 block">⌨️ Quick Post-Selection Shortcut:</label>
            <select
              v-model="localSettings.postSelectionModifier"
              class="w-full bg-dark-muted border border-dark-border text-slate-200 text-xs font-medium rounded-xl px-3 py-2 outline-none focus:border-teal-500 cursor-pointer"
            >
              <option value="shift">Hold Shift + Press Q (Shift+Q)</option>
              <option value="alt">Hold Alt + Press Q (Alt+Q)</option>
              <option value="ctrl">Hold Ctrl + Press Q (Ctrl+Q)</option>
            </select>
          </div>

          <div class="space-y-2 pt-2 border-t border-dark-border/60">
            <label class="font-bold text-slate-200 block">📌 Default Active Start Tab:</label>
            <div class="grid grid-cols-2 gap-2">
              <label
                :class="[
                  'p-2 rounded-xl border cursor-pointer transition-all text-center font-bold',
                  localSettings.defaultTab === 'dictionary'
                    ? 'bg-teal-500/10 border-teal-500/50 text-teal-300'
                    : 'bg-dark-muted border-dark-border text-slate-300'
                ]"
              >
                <input type="radio" value="dictionary" v-model="localSettings.defaultTab" class="hidden" />
                <span>📖 Dictionary</span>
              </label>

              <label
                :class="[
                  'p-2 rounded-xl border cursor-pointer transition-all text-center font-bold',
                  localSettings.defaultTab === 'ai_assistant'
                    ? 'bg-teal-500/10 border-teal-500/50 text-teal-300'
                    : 'bg-dark-muted border-dark-border text-slate-300'
                ]"
              >
                <input type="radio" value="ai_assistant" v-model="localSettings.defaultTab" class="hidden" />
                <span>✨ AI Assistant</span>
              </label>
            </div>
          </div>

          <div class="space-y-2 pt-2 border-t border-dark-border/60">
            <label class="flex items-center justify-between cursor-pointer">
              <span class="font-bold text-slate-200">🖱️ Enable Right-Click Context Menu ("Lookup in Dictionary"):</span>
              <input type="checkbox" v-model="localSettings.enableContextMenuTrigger" class="accent-teal-500 w-4 h-4 cursor-pointer" />
            </label>
          </div>

          <div class="space-y-2 pt-2 border-t border-dark-border/60">
            <label class="flex items-center justify-between cursor-pointer">
              <span class="font-bold text-slate-200">📖 Disable Surrounding Page Context Extraction:</span>
              <input type="checkbox" v-model="localSettings.disablePageContextExtraction" class="accent-teal-500 w-4 h-4 cursor-pointer" />
            </label>
          </div>

          <div class="space-y-2 pt-2 border-t border-dark-border/60">
            <label class="font-bold text-slate-200 block">🚫 Paused Web Hostnames (1 hostname per line):</label>
            <textarea
              v-model="pausedSitesInput"
              rows="3"
              placeholder="example.com&#10;docs.google.com"
              class="w-full bg-dark-muted border border-dark-border rounded-xl p-2.5 text-xs text-slate-100 placeholder-slate-500 outline-none focus:border-teal-500 font-mono"
            ></textarea>
            <p class="text-[10px] text-slate-400">The floating lookup icon will be suppressed on these domain names.</p>
          </div>
        </div>

        <!-- TAB 2: APPEARANCE SETTINGS -->
        <div v-else-if="activeTab === 'appearance'" class="space-y-3.5">
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
              class="w-full bg-dark-muted border border-dark-border text-slate-200 text-xs font-medium rounded-xl px-3 py-2 outline-none focus:border-teal-500 cursor-pointer"
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
                class="w-full bg-dark-muted border border-dark-border rounded-xl px-3 py-2 text-xs text-slate-100 outline-none focus:border-teal-500 font-mono"
              />
            </div>

            <div class="space-y-1">
              <label class="font-bold text-slate-200 block">📐 Popup Height (px):</label>
              <input
                type="number"
                v-model.number="localSettings.popupHeight"
                min="380"
                max="900"
                class="w-full bg-dark-muted border border-dark-border rounded-xl px-3 py-2 text-xs text-slate-100 outline-none focus:border-teal-500 font-mono"
              />
            </div>
          </div>
        </div>

        <!-- TAB 3: SOURCES & PRONUNCIATION SETTINGS -->
        <div v-else-if="activeTab === 'sources'" class="space-y-3.5">
          <div class="space-y-2">
            <label class="font-bold text-slate-200 block">🌐 Default Target Translation Language:</label>
            <select
              v-model="localSettings.translateTargetLanguage"
              class="w-full bg-dark-muted border border-dark-border text-slate-200 text-xs font-medium rounded-xl px-3 py-2 outline-none focus:border-teal-500 cursor-pointer"
            >
              <option value="vi">Vietnamese (vi)</option>
              <option value="en">English (en)</option>
              <option value="ja">Japanese (ja)</option>
              <option value="zh">Chinese (zh)</option>
              <option value="ko">Korean (ko)</option>
              <option value="fr">French (fr)</option>
              <option value="es">Spanish (es)</option>
            </select>
          </div>

          <div class="space-y-2 pt-2 border-t border-dark-border/60">
            <label class="font-bold text-slate-200 block">📚 Default Dictionary Provider:</label>
            <select
              v-model="localSettings.dictionaryProvider"
              class="w-full bg-dark-muted border border-dark-border text-slate-200 text-xs font-medium rounded-xl px-3 py-2 outline-none focus:border-teal-500 cursor-pointer"
            >
              <option value="free_dictionary">🌐 Free Dictionary API (Google Baseline)</option>
              <option value="google_translate">🌐 Google Translate API</option>
              <option value="wiktionary">📖 Wiktionary Open API</option>
              <option value="merriam_webster">🏛️ Merriam-Webster Learner API</option>
              <option value="wordnik">📚 Wordnik Dictionary API</option>
            </select>
          </div>

          <!-- API Keys for Sources -->
          <div class="space-y-2 pt-2 border-t border-dark-border/60">
            <label class="font-bold text-slate-200 block">🔑 Wordnik API Key (Optional):</label>
            <input
              v-model="localSettings.wordnikApiKey"
              type="password"
              placeholder="Wordnik API Key..."
              class="w-full bg-dark-muted border border-dark-border rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 outline-none focus:border-teal-500 font-mono"
            />
          </div>

          <div class="space-y-2 pt-2 border-t border-dark-border/60">
            <label class="font-bold text-slate-200 block">🔑 WordsAPI Key (Optional):</label>
            <input
              v-model="localSettings.wordsApiKey"
              type="password"
              placeholder="WordsAPI Key..."
              class="w-full bg-dark-muted border border-dark-border rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 outline-none focus:border-teal-500 font-mono"
            />
          </div>

          <!-- Pronunciation Speech Settings -->
          <div class="space-y-2 pt-2 border-t border-dark-border/60">
            <label class="font-bold text-slate-200 block">🔊 Speech Synthesis Voice (TTS Voice):</label>
            <select
              v-model="localSettings.pronunciationVoiceURI"
              class="w-full bg-dark-muted border border-dark-border text-slate-200 text-xs font-medium rounded-xl px-3 py-2 outline-none focus:border-teal-500 cursor-pointer"
            >
              <option value="">Auto-select system default voice</option>
              <option v-for="voice in availableVoices" :key="voice.voiceURI" :value="voice.voiceURI">
                {{ voice.name }} ({{ voice.lang }})
              </option>
            </select>

            <div class="flex items-center gap-3 pt-1">
              <span class="text-slate-300 font-bold">Speech Rate:</span>
              <input
                type="range"
                v-model.number="localSettings.pronunciationRate"
                min="0.5"
                max="1.5"
                step="0.05"
                class="flex-1 accent-teal-500 cursor-pointer"
              />
              <span class="font-mono text-teal-400 font-bold w-10 text-right">{{ localSettings.pronunciationRate }}x</span>
            </div>
          </div>
        </div>

        <!-- TAB 4: GEMINI AI SETTINGS -->
        <div v-else-if="activeTab === 'ai'" class="space-y-3.5">
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
                <span class="text-[10px] text-slate-400 block">Pre-fetch AI analysis in background on text selection for instant tab switching</span>
              </div>
              <input type="checkbox" v-model="localSettings.enableAiPreload" class="accent-teal-500 w-4 h-4 cursor-pointer flex-shrink-0 ml-2" />
            </label>
          </div>

          <!-- Gemini API Key Section -->
          <div class="space-y-2 pt-2 border-t border-dark-border/60">
            <label class="font-bold text-slate-200 block flex items-center justify-between">
              <span>🔑 Google Gemini API Key:</span>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                class="text-[10px] text-teal-400 hover:underline flex items-center gap-1"
              >
                <span>Get Free API Key ↗</span>
              </a>
            </label>

            <input
              v-model="localSettings.aiApiKey"
              type="password"
              placeholder="Paste API Key (AIzaSy...)"
              class="w-full bg-dark-muted border border-dark-border rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 outline-none focus:border-teal-500 transition-all font-mono"
            />
            <p class="text-[10px] text-slate-400 leading-normal">
              Your API Key is encrypted and stored locally in browser `chrome.storage.sync`.
            </p>
          </div>

          <!-- AI Model Dual Mode Selection -->
          <div class="space-y-2 pt-2 border-t border-dark-border/60">
            <div class="flex items-center justify-between">
              <label class="font-bold text-slate-200">🤖 AI Model (Gemini Model):</label>

              <button
                type="button"
                @click="toggleManualModelMode"
                class="text-[10px] px-2 py-0.5 rounded bg-dark-muted hover:bg-dark-border text-teal-400 font-bold border border-dark-border transition-colors cursor-pointer"
              >
                {{ isManualModelInput ? '📋 Preset List' : '✏️ Custom Model ID' }}
              </button>
            </div>

            <!-- Preset Dropdown Mode -->
            <select
              v-if="!isManualModelInput"
              v-model="localSettings.aiModel"
              class="w-full bg-dark-muted border border-dark-border text-slate-200 text-xs font-medium rounded-xl px-3 py-2 outline-none focus:border-teal-500 cursor-pointer"
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
              class="w-full bg-dark-muted border border-dark-border rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 outline-none focus:border-teal-500 transition-all font-mono"
            />
          </div>

          <div class="space-y-2 pt-2 border-t border-dark-border/60">
            <label class="font-bold text-slate-200 block">🔗 Custom AI Base URL (Optional Endpoint):</label>
            <input
              v-model="localSettings.aiBaseUrl"
              type="text"
              placeholder="https://generativelanguage.googleapis.com"
              class="w-full bg-dark-muted border border-dark-border rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 outline-none focus:border-teal-500 transition-all font-mono"
            />
          </div>
        </div>
      </div>

      <!-- Footer Buttons & Actions -->
      <div class="flex items-center justify-between border-t border-dark-border pt-3 flex-shrink-0">
        <div class="flex items-center gap-1.5">
          <button
            @click="exportSettings"
            title="Download settings JSON backup"
            class="px-2.5 py-1.5 rounded-xl bg-dark-muted hover:bg-dark-border text-slate-300 text-[11px] font-medium border border-dark-border transition-colors cursor-pointer"
          >
            📥 Export JSON
          </button>
          <button
            @click="triggerImportFile"
            title="Restore settings from JSON file"
            class="px-2.5 py-1.5 rounded-xl bg-dark-muted hover:bg-dark-border text-slate-300 text-[11px] font-medium border border-dark-border transition-colors cursor-pointer"
          >
            📤 Import JSON
          </button>
          <input id="settings-import-input" type="file" accept=".json" class="hidden" @change="handleImportFile" />
        </div>

        <div class="flex items-center gap-2">
          <button
            @click="emit('close')"
            class="px-4 py-2 rounded-xl bg-dark-muted hover:bg-dark-border text-slate-300 text-xs font-bold transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            @click="handleSave"
            class="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
          >
            <span>{{ isSavedNotice ? '✓ Saved!' : 'Save Settings' }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
