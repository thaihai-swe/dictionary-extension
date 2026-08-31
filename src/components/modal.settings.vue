<script setup lang="ts">
import { computed, ref, watch, onMounted } from 'vue';
import { canAccessSecretSettings, parsePublicSettingsImport, serializePublicSettings, useStorage, whenSettingsReady } from '../composables/composable.storage';
import { SECRET_SETTING_KEYS } from '../shared/settings-export';
import { requestProviderValidation } from '../shared/runtime-client';
import { DEFAULT_AI_PROMPTS } from '../shared/ai-prompts';
import { KNOWN_LANGUAGE_MAPPINGS } from '../shared/languages';
import { AppSettings } from '../types';

type SettingsTab = 'general' | 'appearance' | 'sources' | 'ai';

const activeTab = ref<SettingsTab>('general');
const { settings, saveSettings } = useStorage();

const localSettings = ref({ ...settings.value });
const formHydrated = ref(false);
const isSavedNotice = ref(false);
const availableVoices = ref<SpeechSynthesisVoice[]>([]);
const pausedSitesInput = ref<string>('');
const isManualModelInput = ref(false);
const connectionStatus = ref<Record<string, string>>({});
const connectionBusy = ref<Record<string, boolean>>({});
const canEditApiKey = canAccessSecretSettings();

const promptEditors: Array<{ key: keyof AppSettings; label: string }> = [
  { key: 'aiPromptTemplate', label: 'Main AI prompt' },
  { key: 'aiContextPromptTemplate', label: 'Context Explain prompt' },
  { key: 'aiGrammarPromptTemplate', label: 'Grammar & Nuance prompt' },
  { key: 'aiPhraseExplorerPromptTemplate', label: 'Phrase & Collocations prompt' },
  { key: 'aiSentencePromptTemplate', label: 'Sentence Breakdown prompt' },
  { key: 'aiComparePromptTemplate', label: 'Compare Confusables prompt' },
  { key: 'aiRephrasePromptTemplate', label: 'Rephrase prompt' },
];

const languageOptions = computed(() => {
  const custom = String(localSettings.value.customLanguages || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  const known = KNOWN_LANGUAGE_MAPPINGS.map((item) => item.name);
  return [...new Set([...custom, ...known, localSettings.value.translateTargetLanguage].filter(Boolean))];
});

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
  void syncLocalFromStore();
});

function applyStoreToLocal() {
  const pendingSecrets: Partial<AppSettings> = {};
  for (const key of SECRET_SETTING_KEYS) {
    if (String(localSettings.value[key] || '').trim()) {
      pendingSecrets[key] = localSettings.value[key];
    }
  }
  localSettings.value = { ...settings.value, ...pendingSecrets };
  pausedSitesInput.value = Array.isArray(localSettings.value.pausedHostnames)
    ? localSettings.value.pausedHostnames.join('\n')
    : '';
  isManualModelInput.value = Boolean(
    localSettings.value.aiModel && !presetModels.includes(localSettings.value.aiModel)
  );
  formHydrated.value = true;
}

async function syncLocalFromStore() {
  await whenSettingsReady();
  applyStoreToLocal();
}

watch(settings, (next) => {
  if (!formHydrated.value) return;
  for (const key of SECRET_SETTING_KEYS) {
    if (!String(localSettings.value[key] || '').trim() && String(next[key] || '').trim()) {
      localSettings.value[key] = next[key];
    }
  }
}, { deep: true });

function toggleManualModelMode() {
  isManualModelInput.value = !isManualModelInput.value;
  if (!isManualModelInput.value && !presetModels.includes(localSettings.value.aiModel)) {
    localSettings.value.aiModel = 'gemini-2.5-flash';
  }
}

function preserveStoredSecrets() {
  if (!canEditApiKey) return;
  for (const key of SECRET_SETTING_KEYS) {
    if (!String(localSettings.value[key] || '').trim() && String(settings.value[key] || '').trim()) {
      localSettings.value[key] = settings.value[key];
    }
  }
}

async function resetForm() {
  formHydrated.value = false;
  await syncLocalFromStore();
}

async function handleSave() {
  await whenSettingsReady();
  if (!formHydrated.value) preserveStoredSecrets();
  const parsedHostnames = pausedSitesInput.value
    .split('\n')
    .map(s => s.trim().toLowerCase())
    .filter(Boolean);

  localSettings.value.pausedHostnames = parsedHostnames;

  if (!localSettings.value.aiModel || !localSettings.value.aiModel.trim()) {
    localSettings.value.aiModel = 'gemini-2.5-flash';
  }

  const payload: Partial<AppSettings> = { ...localSettings.value };
  for (const key of SECRET_SETTING_KEYS) {
    if (!canEditApiKey || !String(payload[key] ?? '').trim()) delete payload[key];
  }
  delete payload.hasAiApiKey;
  await saveSettings(payload);
  isSavedNotice.value = true;
  setTimeout(() => {
    isSavedNotice.value = false;
  }, 1600);
}

function exportSettings() {
  const payload = serializePublicSettings(settings.value);
  const jsonStr = JSON.stringify(payload, null, 2);
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
      const imported = parsePublicSettingsImport(JSON.parse(event.target?.result as string));
      saveSettings(imported);
      localSettings.value = { ...settings.value, ...imported };
      alert('Settings backup restored successfully!');
    } catch {
      alert('Invalid JSON settings file.');
    }
  };
  reader.readAsText(file);
}

async function testDictionaryConnection(providerId: string) {
  connectionBusy.value = { ...connectionBusy.value, [providerId]: true };
  connectionStatus.value = { ...connectionStatus.value, [providerId]: 'Testing…' };
  try {
    const result = await requestProviderValidation('dictionary', providerId, localSettings.value);
    connectionStatus.value = {
      ...connectionStatus.value,
      [providerId]: result.ok ? (result.message || 'Connected') : (result.error || 'Failed'),
    };
  } catch (error) {
    connectionStatus.value = {
      ...connectionStatus.value,
      [providerId]: error instanceof Error ? error.message : 'Connection failed.',
    };
  } finally {
    connectionBusy.value = { ...connectionBusy.value, [providerId]: false };
  }
}

function restorePrompt(key: keyof AppSettings) {
  const fallback = DEFAULT_AI_PROMPTS[key as keyof typeof DEFAULT_AI_PROMPTS];
  if (typeof fallback === 'string') {
    (localSettings.value as Record<string, unknown>)[key] = fallback;
  }
}

function restoreAllPrompts() {
  Object.assign(localSettings.value, DEFAULT_AI_PROMPTS);
}

async function testAiConnection() {
  connectionBusy.value = { ...connectionBusy.value, ai: true };
  connectionStatus.value = { ...connectionStatus.value, ai: 'Testing…' };
  try {
    const result = await requestProviderValidation('ai', undefined, localSettings.value);
    connectionStatus.value = {
      ...connectionStatus.value,
      ai: result.ok ? (result.message || 'Connected') : (result.error || 'Failed'),
    };
  } catch (error) {
    connectionStatus.value = {
      ...connectionStatus.value,
      ai: error instanceof Error ? error.message : 'Connection failed.',
    };
  } finally {
    connectionBusy.value = { ...connectionBusy.value, ai: false };
  }
}

async function testTranslationConnection() {
  const key = `translation:${localSettings.value.translateProvider || 'google'}`;
  connectionBusy.value = { ...connectionBusy.value, [key]: true };
  connectionStatus.value = { ...connectionStatus.value, [key]: 'Testing…' };
  try {
    const result = await requestProviderValidation('translation', undefined, localSettings.value);
    connectionStatus.value = {
      ...connectionStatus.value,
      [key]: result.ok ? (result.message || 'Connected') : (result.error || 'Failed'),
    };
  } catch (error) {
    connectionStatus.value = {
      ...connectionStatus.value,
      [key]: error instanceof Error ? error.message : 'Connection failed.',
    };
  } finally {
    connectionBusy.value = { ...connectionBusy.value, [key]: false };
  }
}
</script>

<template>
  <div class="min-h-screen bg-[#0f172a] text-slate-100 p-4 sm:p-6 flex items-start justify-center">
    <div class="w-full max-w-lg bg-dark-surface border border-dark-border rounded-2xl p-5 shadow-2xl space-y-4 text-xs flex flex-col my-4">
      <div class="flex items-center justify-between border-b border-dark-border pb-3 flex-shrink-0">
        <h3 class="font-bold text-sm text-slate-100 flex items-center gap-2">
          <span>⚙️</span>
          <span>Dictionary Settings</span>
        </h3>
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
            <label class="flex items-center justify-between cursor-pointer">
              <span class="font-bold text-slate-200">🌐 Show translation in Dictionary tab:</span>
              <input type="checkbox" v-model="localSettings.enableTranslate" class="accent-teal-500 w-4 h-4 cursor-pointer" />
            </label>
            <label class="flex items-center justify-between cursor-pointer">
              <span class="font-bold text-slate-200">📖 Show definitions in Dictionary tab:</span>
              <input type="checkbox" v-model="localSettings.enableDictionary" class="accent-teal-500 w-4 h-4 cursor-pointer" />
            </label>
          </div>

          <div class="space-y-2 pt-2 border-t border-dark-border/60">
            <label class="font-bold text-slate-200 block">🌐 Default Target Translation Language:</label>
            <select
              v-model="localSettings.translateTargetLanguage"
              class="w-full bg-dark-muted border border-dark-border text-slate-200 text-xs font-medium rounded-xl px-3 py-2 outline-none focus:border-teal-500 cursor-pointer"
            >
              <option v-for="lang in languageOptions" :key="lang" :value="lang">{{ lang }}</option>
            </select>
          </div>

          <div class="space-y-2 pt-2 border-t border-dark-border/60">
            <label class="font-bold text-slate-200 block">📝 Custom language list:</label>
            <input
              v-model="localSettings.customLanguages"
              type="text"
              placeholder="Vietnamese, English, Japanese"
              class="w-full bg-dark-muted border border-dark-border rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 outline-none focus:border-teal-500"
            />
          </div>

          <div class="space-y-2 pt-2 border-t border-dark-border/60">
            <label class="font-bold text-slate-200 block">🌍 Translation provider:</label>
            <select
              v-model="localSettings.translateProvider"
              class="w-full bg-dark-muted border border-dark-border text-slate-200 text-xs font-medium rounded-xl px-3 py-2 outline-none focus:border-teal-500 cursor-pointer"
            >
              <option value="google">Google Translate</option>
              <option value="libretranslate">LibreTranslate</option>
            </select>
            <div class="flex items-center gap-2">
              <button
                type="button"
                class="px-2.5 py-1.5 rounded-lg bg-dark-muted border border-dark-border text-[11px] font-bold text-slate-200 hover:border-teal-500 cursor-pointer"
                :disabled="connectionBusy[`translation:${localSettings.translateProvider}`]"
                @click="testTranslationConnection"
              >
                Test translation
              </button>
              <span class="text-[10px] text-slate-400">{{ connectionStatus[`translation:${localSettings.translateProvider}`] }}</span>
            </div>
          </div>

          <div v-if="localSettings.translateProvider === 'libretranslate'" class="space-y-2 pt-2 border-t border-dark-border/60">
            <label class="font-bold text-slate-200 block">LibreTranslate base URL:</label>
            <input
              v-model="localSettings.libreTranslateBaseUrl"
              type="url"
              placeholder="https://libretranslate.com"
              class="w-full bg-dark-muted border border-dark-border rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 outline-none focus:border-teal-500 font-mono"
            />
            <label class="font-bold text-slate-200 block">LibreTranslate API key (optional):</label>
            <input
              v-model="localSettings.libreTranslateApiKey"
              type="password"
              placeholder="LibreTranslate API key"
              class="w-full bg-dark-muted border border-dark-border rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 outline-none focus:border-teal-500 font-mono"
            />
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
              <option value="words_api">⚡ WordsAPI (RapidAPI)</option>
            </select>
          </div>

          <div class="space-y-2 pt-2 border-t border-dark-border/60">
            <label class="font-bold text-slate-200 block">🔑 Merriam-Webster API Key (Optional):</label>
            <input
              v-model="localSettings.dictionaryApiKey"
              type="password"
              placeholder="MW Collegiate API key"
              class="w-full bg-dark-muted border border-dark-border rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 outline-none focus:border-teal-500 font-mono"
            />
            <p class="text-[10px] text-slate-400">Free key from dictionaryapi.com. Required only for Merriam-Webster.</p>
          </div>

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

          <div class="space-y-2 pt-2 border-t border-dark-border/60">
            <label class="font-bold text-slate-200 block">🔎 Test dictionary connection:</label>
            <div class="grid grid-cols-2 gap-2">
              <button type="button" class="px-2 py-1.5 rounded-lg bg-dark-muted border border-dark-border text-[11px] font-bold cursor-pointer" :disabled="connectionBusy.free_dictionary" @click="testDictionaryConnection('free_dictionary')">Test Free Dictionary</button>
              <button type="button" class="px-2 py-1.5 rounded-lg bg-dark-muted border border-dark-border text-[11px] font-bold cursor-pointer" :disabled="connectionBusy.wiktionary" @click="testDictionaryConnection('wiktionary')">Test Wiktionary</button>
              <button type="button" class="px-2 py-1.5 rounded-lg bg-dark-muted border border-dark-border text-[11px] font-bold cursor-pointer" :disabled="connectionBusy.merriam_webster" @click="testDictionaryConnection('merriam_webster')">Test Merriam-Webster</button>
              <button type="button" class="px-2 py-1.5 rounded-lg bg-dark-muted border border-dark-border text-[11px] font-bold cursor-pointer" :disabled="connectionBusy.wordnik" @click="testDictionaryConnection('wordnik')">Test Wordnik</button>
              <button type="button" class="px-2 py-1.5 rounded-lg bg-dark-muted border border-dark-border text-[11px] font-bold cursor-pointer" :disabled="connectionBusy.words_api" @click="testDictionaryConnection('words_api')">Test WordsAPI</button>
            </div>
            <p class="text-[10px] text-slate-400">
              {{ connectionStatus[localSettings.dictionaryProvider] || Object.values(connectionStatus).filter((item) => !String(item).startsWith('translation:')).slice(-1)[0] }}
            </p>
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
                <span class="text-[10px] text-slate-400 block">After Dictionary lookup finishes, load Main AI first, then Context, Grammar, and the other intents in the background.</span>
              </div>
              <input type="checkbox" v-model="localSettings.enableAiPreload" class="accent-teal-500 w-4 h-4 cursor-pointer flex-shrink-0 ml-2" />
            </label>
          </div>

          <div class="space-y-2 pt-2 border-t border-dark-border/60">
            <label class="flex items-center justify-between cursor-pointer">
              <div>
                <span class="font-bold text-slate-200 block">💬 Use AI when a phrase has no dictionary definition:</span>
                <span class="text-[10px] text-slate-400 block">Only runs when AI is enabled. Explains idioms dictionary backends miss.</span>
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
              Stored only on this device in `chrome.storage.local`. It is not synced and is never exported. Leave blank to keep the current key.
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
            <p class="text-[10px] text-slate-400">Gemini URLs use generateContent. Any other URL is treated as OpenAI-compatible /chat/completions.</p>
            <div class="flex items-center gap-2">
              <button
                type="button"
                class="px-2.5 py-1.5 rounded-lg bg-dark-muted border border-dark-border text-[11px] font-bold text-slate-200 hover:border-teal-500 cursor-pointer"
                :disabled="connectionBusy.ai"
                @click="testAiConnection"
              >
                Test AI connection
              </button>
              <span class="text-[10px] text-slate-400">{{ connectionStatus.ai }}</span>
            </div>
          </div>

          <div class="space-y-3 pt-2 border-t border-dark-border/60">
            <div class="flex items-center justify-between">
              <label class="font-bold text-slate-200">📝 Prompt templates</label>
              <button
                type="button"
                class="text-[10px] px-2 py-0.5 rounded bg-dark-muted hover:bg-dark-border text-teal-400 font-bold border border-dark-border cursor-pointer"
                @click="restoreAllPrompts"
              >
                Restore all defaults
              </button>
            </div>
            <p class="text-[10px] text-slate-400">Variables: <code v-pre>{{str}}</code>, <code v-pre>{{text}}</code>, <code v-pre>{{sentence}}</code>, <code v-pre>{{context}}</code>, <code v-pre>{{targetLang}}</code>, <code v-pre>{{word_count}}</code></p>
            <div v-for="editor in promptEditors" :key="editor.key" class="space-y-1.5">
              <div class="flex items-center justify-between">
                <span class="text-[11px] font-bold text-slate-300">{{ editor.label }}</span>
                <button
                  type="button"
                  class="text-[10px] text-teal-400 font-bold cursor-pointer"
                  @click="restorePrompt(editor.key)"
                >
                  Restore default
                </button>
              </div>
              <textarea
                v-model="(localSettings as any)[editor.key]"
                rows="5"
                class="w-full bg-dark-muted border border-dark-border rounded-xl px-3 py-2 text-[11px] text-slate-100 placeholder-slate-500 outline-none focus:border-teal-500 font-mono"
              ></textarea>
            </div>
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
            type="button"
            @click="resetForm"
            class="px-4 py-2 rounded-xl bg-dark-muted hover:bg-dark-border text-slate-300 text-xs font-bold transition-colors cursor-pointer"
          >
            Reset
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
