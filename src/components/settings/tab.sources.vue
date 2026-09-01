<script setup lang="ts">
import { computed } from 'vue';
import { AppSettings } from '../../types';

const props = defineProps<{
  localSettings: AppSettings;
  languageOptions: string[];
  connectionStatus: Record<string, string>;
  connectionBusy: Record<string, boolean>;
  availableVoices: SpeechSynthesisVoice[];
}>();

const emit = defineEmits<{
  (e: 'update:localSettings', value: AppSettings): void;
  (e: 'test-translation'): void;
  (e: 'test-dictionary', providerId: string): void;
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
        class="w-full bg-dark-muted border border-dark-border text-slate-200 text-sm font-medium rounded-xl px-3 py-2 outline-none focus:border-teal-500 cursor-pointer"
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
        class="w-full bg-dark-muted border border-dark-border rounded-xl px-3 py-2 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-teal-500"
      />
    </div>

    <div class="space-y-2 pt-2 border-t border-dark-border/60">
      <label class="font-bold text-slate-200 block">🌍 Translation provider:</label>
      <select
        v-model="localSettings.translateProvider"
        class="w-full bg-dark-muted border border-dark-border text-slate-200 text-sm font-medium rounded-xl px-3 py-2 outline-none focus:border-teal-500 cursor-pointer"
      >
        <option value="google">Google Translate</option>
        <option value="libretranslate">LibreTranslate</option>
      </select>
      <div class="flex items-center gap-2">
        <button
          type="button"
          class="px-2.5 py-1.5 rounded-lg bg-dark-muted border border-dark-border text-sm font-bold text-slate-200 hover:border-teal-500 cursor-pointer"
          :disabled="connectionBusy[`translation:${localSettings.translateProvider}`]"
          @click="emit('test-translation')"
        >
          Test translation
        </button>
        <span class="text-xs text-slate-400">{{ connectionStatus[`translation:${localSettings.translateProvider}`] }}</span>
      </div>
    </div>

    <div v-if="localSettings.translateProvider === 'libretranslate'" class="space-y-2 pt-2 border-t border-dark-border/60">
      <label class="font-bold text-slate-200 block">LibreTranslate base URL:</label>
      <input
        v-model="localSettings.libreTranslateBaseUrl"
        type="url"
        placeholder="https://libretranslate.com"
        class="w-full bg-dark-muted border border-dark-border rounded-xl px-3 py-2 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-teal-500 font-mono"
      />
      <label class="font-bold text-slate-200 block">LibreTranslate API key (optional):</label>
      <input
        v-model="localSettings.libreTranslateApiKey"
        type="password"
        placeholder="LibreTranslate API key"
        class="w-full bg-dark-muted border border-dark-border rounded-xl px-3 py-2 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-teal-500 font-mono"
      />
    </div>

    <div class="space-y-2 pt-2 border-t border-dark-border/60">
      <label class="font-bold text-slate-200 block">📚 Default Dictionary Provider:</label>
      <select
        v-model="localSettings.dictionaryProvider"
        class="w-full bg-dark-muted border border-dark-border text-slate-200 text-sm font-medium rounded-xl px-3 py-2 outline-none focus:border-teal-500 cursor-pointer"
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
        class="w-full bg-dark-muted border border-dark-border rounded-xl px-3 py-2 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-teal-500 font-mono"
      />
      <p class="text-xs text-slate-400">Free key from dictionaryapi.com. Required only for Merriam-Webster.</p>
    </div>

    <div class="space-y-2 pt-2 border-t border-dark-border/60">
      <label class="font-bold text-slate-200 block">🔑 Wordnik API Key (Optional):</label>
      <input
        v-model="localSettings.wordnikApiKey"
        type="password"
        placeholder="Wordnik API Key..."
        class="w-full bg-dark-muted border border-dark-border rounded-xl px-3 py-2 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-teal-500 font-mono"
      />
    </div>

    <div class="space-y-2 pt-2 border-t border-dark-border/60">
      <label class="font-bold text-slate-200 block">🔑 WordsAPI Key (Optional):</label>
      <input
        v-model="localSettings.wordsApiKey"
        type="password"
        placeholder="WordsAPI Key..."
        class="w-full bg-dark-muted border border-dark-border rounded-xl px-3 py-2 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-teal-500 font-mono"
      />
    </div>

    <div class="space-y-2 pt-2 border-t border-dark-border/60">
      <label class="font-bold text-slate-200 block">🔎 Test dictionary connection:</label>
      <div class="grid grid-cols-2 gap-2">
        <button type="button" class="px-2 py-1.5 rounded-lg bg-dark-muted border border-dark-border text-sm font-bold cursor-pointer" :disabled="connectionBusy.free_dictionary" @click="emit('test-dictionary', 'free_dictionary')">Test Free Dictionary</button>
        <button type="button" class="px-2 py-1.5 rounded-lg bg-dark-muted border border-dark-border text-sm font-bold cursor-pointer" :disabled="connectionBusy.wiktionary" @click="emit('test-dictionary', 'wiktionary')">Test Wiktionary</button>
        <button type="button" class="px-2 py-1.5 rounded-lg bg-dark-muted border border-dark-border text-sm font-bold cursor-pointer" :disabled="connectionBusy.merriam_webster" @click="emit('test-dictionary', 'merriam_webster')">Test Merriam-Webster</button>
        <button type="button" class="px-2 py-1.5 rounded-lg bg-dark-muted border border-dark-border text-sm font-bold cursor-pointer" :disabled="connectionBusy.wordnik" @click="emit('test-dictionary', 'wordnik')">Test Wordnik</button>
        <button type="button" class="px-2 py-1.5 rounded-lg bg-dark-muted border border-dark-border text-sm font-bold cursor-pointer" :disabled="connectionBusy.words_api" @click="emit('test-dictionary', 'words_api')">Test WordsAPI</button>
      </div>
      <p class="text-xs text-slate-400">
        {{ connectionStatus[localSettings.dictionaryProvider] || Object.values(connectionStatus).filter((item) => !String(item).startsWith('translation:')).slice(-1)[0] }}
      </p>
    </div>

    <!-- Pronunciation Speech Settings -->
    <div class="space-y-2 pt-2 border-t border-dark-border/60">
      <label class="font-bold text-slate-200 block">🔊 Speech Synthesis Voice (TTS Voice):</label>
      <select
        v-model="localSettings.pronunciationVoiceURI"
        class="w-full bg-dark-muted border border-dark-border text-slate-200 text-sm font-medium rounded-xl px-3 py-2 outline-none focus:border-teal-500 cursor-pointer"
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
</template>
