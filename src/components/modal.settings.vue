<script setup lang="ts">
import { computed, defineAsyncComponent, ref, watch, onMounted } from 'vue';
import { canAccessSecretSettings, parsePublicSettingsImport, serializePublicSettings, useStorage, whenSettingsReady } from '../composables/composable.storage';
import { SECRET_SETTING_KEYS } from '../shared/settings-export';
import { requestProviderValidation } from '../shared/runtime-client';
import { DEFAULT_AI_PROMPTS } from '../shared/ai-prompts';
import { KNOWN_LANGUAGE_MAPPINGS } from '../shared/languages';
import { AppSettings } from '../types';

const TabAppearance = defineAsyncComponent(() => import('./settings/tab.appearance.vue'));
const TabSources = defineAsyncComponent(() => import('./settings/tab.sources.vue'));
const TabAi = defineAsyncComponent(() => import('./settings/tab.ai.vue'));

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
    <div class="w-full max-w-5xl bg-dark-surface border border-dark-border rounded-2xl p-8 shadow-2xl space-y-5 text-sm flex flex-col my-4">
      <div class="flex items-center justify-between border-b border-dark-border pb-3 flex-shrink-0">
        <h3 class="font-bold text-xl text-slate-100 flex items-center gap-2">
          <span>⚙️</span>
          <span>Dictionary Settings</span>
        </h3>
      </div>

      <!-- 4-Tab Navigation Bar -->
      <div class="flex items-center gap-1 bg-dark-muted p-1 rounded-xl border border-dark-border flex-shrink-0">
        <button
          @click="activeTab = 'general'"
          :class="[
            'flex-1 py-2.5 rounded-lg text-sm font-bold transition-all cursor-pointer',
            activeTab === 'general' ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30' : 'text-slate-400 hover:text-slate-200'
          ]"
        >
          ⚡ General
        </button>

        <button
          @click="activeTab = 'appearance'"
          :class="[
            'flex-1 py-2.5 rounded-lg text-sm font-bold transition-all cursor-pointer',
            activeTab === 'appearance' ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30' : 'text-slate-400 hover:text-slate-200'
          ]"
        >
          🎨 Appearance
        </button>

        <button
          @click="activeTab = 'sources'"
          :class="[
            'flex-1 py-2.5 rounded-lg text-sm font-bold transition-all cursor-pointer',
            activeTab === 'sources' ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30' : 'text-slate-400 hover:text-slate-200'
          ]"
        >
          📚 Dictionaries
        </button>

        <button
          @click="activeTab = 'ai'"
          :class="[
            'flex-1 py-2.5 rounded-lg text-sm font-bold transition-all cursor-pointer',
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
              class="w-full bg-dark-muted border border-dark-border text-slate-200 text-sm font-medium rounded-xl px-3 py-2 outline-none focus:border-teal-500 cursor-pointer"
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
              class="w-full bg-dark-muted border border-dark-border rounded-xl p-2.5 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-teal-500 font-mono"
            ></textarea>
            <p class="text-xs text-slate-400">The floating lookup icon will be suppressed on these domain names.</p>
          </div>
        </div>

        <TabAppearance
          v-else-if="activeTab === 'appearance'"
          :local-settings="localSettings"
        />

        <TabSources
          v-else-if="activeTab === 'sources'"
          :local-settings="localSettings"
          :language-options="languageOptions"
          :connection-status="connectionStatus"
          :connection-busy="connectionBusy"
          :available-voices="availableVoices"
          @test-translation="testTranslationConnection"
          @test-dictionary="testDictionaryConnection"
        />

        <TabAi
          v-else-if="activeTab === 'ai'"
          :local-settings="localSettings"
          :is-manual-model-input="isManualModelInput"
          :connection-status="connectionStatus"
          :connection-busy="connectionBusy"
          :prompt-editors="promptEditors"
          @toggle-manual-model="toggleManualModelMode"
          @test-ai="testAiConnection"
          @restore-prompt="restorePrompt"
          @restore-all-prompts="restoreAllPrompts"
        />
      </div>

      <!-- Footer Buttons & Actions -->
      <div class="flex items-center justify-between border-t border-dark-border pt-3 flex-shrink-0">
        <div class="flex items-center gap-1.5">
          <button
            @click="exportSettings"
            title="Download settings JSON backup"
            class="px-2.5 py-1.5 rounded-xl bg-dark-muted hover:bg-dark-border text-slate-300 text-sm font-medium border border-dark-border transition-colors cursor-pointer"
          >
            📥 Export JSON
          </button>
          <button
            @click="triggerImportFile"
            title="Restore settings from JSON file"
            class="px-2.5 py-1.5 rounded-xl bg-dark-muted hover:bg-dark-border text-slate-300 text-sm font-medium border border-dark-border transition-colors cursor-pointer"
          >
            📤 Import JSON
          </button>
          <input id="settings-import-input" type="file" accept=".json" class="hidden" @change="handleImportFile" />
        </div>

        <div class="flex items-center gap-2">
          <button
            type="button"
            @click="resetForm"
            class="px-4 py-2 rounded-xl bg-dark-muted hover:bg-dark-border text-slate-300 text-sm font-bold transition-colors cursor-pointer"
          >
            Reset
          </button>

          <button
            @click="handleSave"
            class="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-sm font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
          >
            <span>{{ isSavedNotice ? '✓ Saved!' : 'Save Settings' }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
