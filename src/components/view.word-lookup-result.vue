<script setup lang="ts">
import { computed, ref } from 'vue';
import { useDictionary } from '../composables/composable.dictionary';
import { Phonetic } from '../types';
import SenseMatrixCard from './card.sense-matrix.vue';
import MarkdownRenderer from './component.markdown-renderer.vue';
import {
  CollocationsCard,
  LearnerMistakesCard,
  UsageNotesCard,
  WordFamilyCard,
  WordFormationCard,
} from './async-views';

const emit = defineEmits<{
  (e: 'select-word', word: string): void;
}>();

const {
  query,
  result,
  playPronunciation,
  startSpeechPractice,
  practiceResult,
  isPracticing,
  playingKey,
  supportsSpeechPractice,
} = useDictionary();

const copiedNotice = ref(false);

const displayHeadword = computed(() => {
  const entry = result.value;
  return String(entry?.originalText || query.value || entry?.word || '').trim();
});

const pronunciations = computed<Phonetic[]>(() => result.value?.pronunciations?.length
  ? result.value.pronunciations
  : result.value?.phonetics || []);

function pronunciationFor(lang: 'en-GB' | 'en-US'): Phonetic | undefined {
  return pronunciations.value.find((item) => String(item.language || '').toLowerCase() === lang.toLowerCase())
    || pronunciations.value.find((item) => (lang === 'en-GB' ? item.region === 'uk' : item.region === 'us'));
}

function phoneticText(item?: Phonetic): string {
  const word = String(result.value?.word || '').trim().toLowerCase();
  const phonetic = String(item?.phonetic || '').trim();
  if (phonetic && phonetic.toLowerCase() !== word) return phonetic;
  const text = String(item?.text || '').trim();
  if (text && text.toLowerCase() !== word) return text;
  return '';
}

function audioUrlOf(item?: Phonetic): string {
  return String(item?.audioUrl || item?.audio || '').trim();
}

function hasAccentData(item?: Phonetic): boolean {
  return Boolean(phoneticText(item) || audioUrlOf(item));
}

const ukPronunciation = computed(() => {
  const item = pronunciationFor('en-GB');
  return hasAccentData(item) ? item : undefined;
});
const usPronunciation = computed(() => {
  const item = pronunciationFor('en-US');
  return hasAccentData(item) ? item : undefined;
});
const genericPronunciation = computed(() => {
  if (ukPronunciation.value || usPronunciation.value) return undefined;
  const found = pronunciations.value.find((item) => hasAccentData(item) || item?.fallbackOnly);
  if (found) return found;
  if (result.value?.word) {
    return { text: result.value.word, language: 'en-US', fallbackOnly: true };
  }
  return undefined;
});
const usageWarnings = computed(() => result.value?.lexicalProfile?.usageWarnings || []);
const formationText = computed(() => {
  const formation = result.value?.lexicalProfile?.wordFormation;
  if (!formation) return '';
  if (typeof formation === 'string') return formation;
  return formation.explanation || '';
});
const formationPrefixes = computed(() => {
  const formation = result.value?.lexicalProfile?.wordFormation;
  return typeof formation === 'object' ? formation?.prefixes || [] : [];
});
const formationSuffixes = computed(() => {
  const formation = result.value?.lexicalProfile?.wordFormation;
  return typeof formation === 'object' ? formation?.suffixes || [] : [];
});

function accentLabel(item: Phonetic | undefined, accent: 'UK' | 'US' | ''): string {
  const action = audioUrlOf(item) ? 'Listen' : 'Speak';
  return accent ? `🔊 ${action} (${accent})` : `🔊 ${action}`;
}

function handleSearch(wordToSearch: string) {
  emit('select-word', wordToSearch);
}

function copyWordDefinition() {
  if (!result.value) return;
  const def = result.value.meanings?.[0]?.definitions?.[0]?.definition || '';
  const text = `${result.value.word} (${result.value.phonetic || ''}): ${def}`;
  navigator.clipboard.writeText(text).then(() => {
    copiedNotice.value = true;
    setTimeout(() => { copiedNotice.value = false; }, 2000);
  });
}
</script>

<template>
  <div v-if="result" class="space-y-4">
    <div class="pb-3.5 border-b border-dark-border/60 space-y-2.5">
      <div class="flex items-start justify-between gap-3">
        <div class="space-y-1">
          <div class="flex items-center gap-2.5 flex-wrap">
            <h2 class="text-2xl font-extrabold text-slate-100 tracking-tight font-heading">{{ displayHeadword }}</h2>
            <span
              v-if="result.lexicalProfile?.cefr"
              class="px-2.5 py-0.5 rounded-full bg-teal-500/15 text-teal-300 font-extrabold border border-teal-500/30 text-[10px] uppercase tracking-wider font-mono"
            >
              {{ result.lexicalProfile.cefr }}
            </span>
            <span
              v-if="result.lexicalProfile?.frequencyPill"
              class="px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 font-bold border border-amber-500/30 text-[10px]"
            >
              {{ result.lexicalProfile.frequencyPill }}
            </span>
          </div>

          <p v-if="result.subtitle" class="text-[11px] text-amber-300 font-medium">
            {{ result.subtitle }}
          </p>

          <p v-if="result.syllables" class="text-[11px] text-slate-300 font-medium">
            <span class="uppercase tracking-wider text-[10px] text-slate-400 font-bold mr-1">Syllables</span>
            <span class="font-mono text-teal-300">{{ result.syllables }}</span>
          </p>
        </div>

        <div class="flex items-center gap-1.5 flex-shrink-0 flex-wrap justify-end">
          <div v-if="ukPronunciation" class="flex items-center gap-1">
            <span v-if="phoneticText(ukPronunciation)" class="text-[11px] font-mono font-bold text-teal-400">
              {{ phoneticText(ukPronunciation) }} (UK)
            </span>
            <button
              @click="playPronunciation({ text: displayHeadword, audioUrl: audioUrlOf(ukPronunciation), language: 'en-GB', key: 'en-GB' })"
              :class="[
                'px-2.5 py-1 rounded-lg border text-[11px] font-bold transition-all flex items-center gap-1 shadow-xs cursor-pointer active:scale-95 font-mono',
                playingKey === 'en-GB'
                  ? 'bg-teal-500/25 text-teal-200 border-teal-500/50'
                  : 'bg-dark-muted hover:bg-teal-500/20 hover:text-teal-300 text-slate-200 border-dark-border'
              ]"
              :aria-pressed="playingKey === 'en-GB'"
              :title="accentLabel(ukPronunciation, 'UK')"
            >
              <span>{{ accentLabel(ukPronunciation, 'UK') }}</span>
            </button>
          </div>

          <div v-if="usPronunciation" class="flex items-center gap-1">
            <span v-if="phoneticText(usPronunciation)" class="text-[11px] font-mono font-bold text-teal-400">
              {{ phoneticText(usPronunciation) }} (US)
            </span>
            <button
              @click="playPronunciation({ text: displayHeadword, audioUrl: audioUrlOf(usPronunciation), language: 'en-US', key: 'en-US' })"
              :class="[
                'px-2.5 py-1 rounded-lg border text-[11px] font-bold transition-all flex items-center gap-1 shadow-xs cursor-pointer active:scale-95 font-mono',
                playingKey === 'en-US'
                  ? 'bg-teal-500/25 text-teal-200 border-teal-500/50'
                  : 'bg-dark-muted hover:bg-teal-500/20 hover:text-teal-300 text-slate-200 border-dark-border'
              ]"
              :aria-pressed="playingKey === 'en-US'"
              :title="accentLabel(usPronunciation, 'US')"
            >
              <span>{{ accentLabel(usPronunciation, 'US') }}</span>
            </button>
          </div>

          <div v-if="genericPronunciation" class="flex items-center gap-1">
            <span v-if="phoneticText(genericPronunciation)" class="text-[11px] font-mono font-bold text-teal-400">
              {{ phoneticText(genericPronunciation) }}
            </span>
            <button
              @click="playPronunciation({ text: displayHeadword, audioUrl: audioUrlOf(genericPronunciation), language: genericPronunciation.language || 'en-US', key: 'generic' })"
              :class="[
                'px-2.5 py-1 rounded-lg border text-[11px] font-bold transition-all flex items-center gap-1 shadow-xs cursor-pointer active:scale-95 font-mono',
                playingKey === 'generic'
                  ? 'bg-teal-500/25 text-teal-200 border-teal-500/50'
                  : 'bg-dark-muted hover:bg-teal-500/20 hover:text-teal-300 text-slate-200 border-dark-border'
              ]"
              :aria-pressed="playingKey === 'generic'"
              :title="accentLabel(genericPronunciation, '')"
            >
              <span>{{ accentLabel(genericPronunciation, '') }}</span>
            </button>
          </div>

          <button
            v-if="supportsSpeechPractice"
            @click="startSpeechPractice(displayHeadword, 'en-US')"
            :class="[
              'px-2.5 py-1 rounded-lg border text-[11px] font-bold transition-all flex items-center gap-1 shadow-xs cursor-pointer active:scale-95',
              isPracticing
                ? 'bg-amber-500/25 text-amber-200 border-amber-500/50'
                : 'bg-dark-muted hover:bg-amber-500/20 hover:text-amber-300 text-slate-200 border-dark-border'
            ]"
            :aria-pressed="isPracticing"
            title="Practice pronunciation"
          >
            <span>{{ isPracticing ? 'Listening…' : '🎙️ Practice' }}</span>
          </button>
          <span v-else class="text-[10px] text-slate-400 font-medium">
            Practice needs Chrome speech recognition.
          </span>

          <button
            @click="copyWordDefinition()"
            title="Copy definition"
            class="p-1.5 rounded-lg bg-dark-muted hover:bg-dark-border text-slate-300 hover:text-white border border-dark-border text-xs transition-colors cursor-pointer active:scale-95"
          >
            {{ copiedNotice ? '✓' : '📋' }}
          </button>
        </div>
      </div>
    </div>

    <div
      v-if="result.translation?.translatedText"
      class="rounded-xl border border-teal-500/30 bg-teal-500/10 p-3.5 space-y-1.5"
    >
      <div class="flex items-center justify-between gap-2">
        <div class="flex items-center gap-1.5 text-[11px] font-extrabold text-teal-300 uppercase tracking-wider">
          <span>🌐</span>
          <span>Translation</span>
        </div>
        <span class="text-[10px] text-slate-400 font-semibold">
          {{ result.translation.sourceBadges?.map((badge) => badge.label).join(' + ') || 'Google Translate' }}
        </span>
      </div>
      <p class="text-sm text-slate-100 leading-relaxed font-medium">
        {{ result.translation.translatedText }}
      </p>
      <p v-if="result.originalText && !result.meanings?.length" class="text-[11px] text-slate-400">
        Original: {{ result.originalText }}
      </p>
    </div>

    <div
      v-if="practiceResult"
      :class="[
        'rounded-xl border px-3 py-2 text-xs font-semibold space-y-1.5',
        practiceResult.grade === 'excellent' ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300' :
        practiceResult.grade === 'good' ? 'border-teal-500/40 bg-teal-500/10 text-teal-300' :
        practiceResult.grade === 'almost' ? 'border-amber-500/40 bg-amber-500/10 text-amber-300' :
        'border-rose-500/40 bg-rose-500/10 text-rose-300'
      ]"
    >
      <div>
        {{ practiceResult.score }}% · {{ practiceResult.gradeLabel }}
        <span v-if="practiceResult.spoken"> · heard “{{ practiceResult.spoken }}”</span>
      </div>
      <div v-if="practiceResult.details && practiceResult.details.length > 1" class="flex flex-wrap gap-1">
        <span
          v-for="(detail, index) in practiceResult.details"
          :key="`${detail.word}-${index}`"
          :class="[
            'px-2 py-0.5 rounded-full text-[10px] font-bold border',
            detail.matched
              ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
              : detail.closeMatch
                ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
          ]"
        >
          {{ detail.word }}
        </span>
      </div>
    </div>

    <SenseMatrixCard
      v-if="result.meanings?.length"
      :meanings="result.meanings"
      @select-word="handleSearch"
    />

    <div v-if="result.examples?.length" class="space-y-2">
      <div class="text-[11px] font-extrabold text-teal-400 uppercase tracking-wider">💬 Examples</div>
      <blockquote
        v-for="(example, index) in result.examples"
        :key="`${example.text}-${index}`"
        class="pl-3.5 py-2 pr-3 border-l-2 border-teal-500/70 bg-teal-500/5 rounded-r-lg text-slate-200 italic text-sm flex items-center justify-between gap-3"
      >
        <span>
          "{{ example.text }}"
          <span v-if="example.source" class="not-italic text-[10px] text-slate-400 ml-2">{{ example.source }}</span>
        </span>
        <button
          @click="playPronunciation({ text: example.text, language: 'en-US', key: `example-${index}` })"
          :class="[
            'px-2.5 py-1 rounded border text-[10px] not-italic font-semibold cursor-pointer',
            playingKey === `example-${index}`
              ? 'bg-teal-500/25 text-teal-200 border-teal-500/50'
              : 'bg-dark-muted hover:bg-dark-border text-slate-200 border-dark-border'
          ]"
          :aria-pressed="playingKey === `example-${index}`"
        >
          🔊 Listen
        </button>
      </blockquote>
    </div>

    <div v-if="result.synonyms?.length" class="flex flex-wrap items-center gap-1.5">
      <span class="text-xs text-slate-400 font-bold uppercase tracking-wider mr-1">Synonyms:</span>
      <button
        v-for="item in result.synonyms"
        :key="item.text"
        @click="handleSearch(item.text)"
        class="px-3 py-1 rounded-full bg-dark-muted hover:bg-teal-500/20 hover:text-teal-300 text-slate-200 text-xs font-semibold transition-all cursor-pointer"
      >
        {{ item.text }}
      </button>
    </div>

    <div v-if="result.antonyms?.length" class="flex flex-wrap items-center gap-1.5">
      <span class="text-xs text-rose-400/80 font-bold uppercase tracking-wider mr-1">Antonyms:</span>
      <button
        v-for="item in result.antonyms"
        :key="item.text"
        @click="handleSearch(item.text)"
        class="px-3 py-1 rounded-full bg-dark-muted hover:bg-rose-500/20 hover:text-rose-400 text-slate-200 text-xs font-semibold transition-all cursor-pointer"
      >
        {{ item.text }}
      </button>
    </div>

    <div v-if="result.phraseExplanation?.length" class="rounded-xl border border-indigo-500/30 bg-indigo-500/10 p-3.5 space-y-3">
      <div class="flex items-center justify-between gap-2">
        <div class="text-[11px] font-extrabold text-indigo-300 uppercase tracking-wider">💡 Phrase explanation</div>
        <span
          v-if="result.phraseExplanation[0]?.source"
          class="px-2 py-0.5 rounded-full bg-dark-muted border border-dark-border text-[10px] text-slate-300 font-semibold"
        >
          {{ result.phraseExplanation[0].source }}
        </span>
      </div>
      <div v-for="(section, index) in result.phraseExplanation" :key="index" class="space-y-2">
        <div v-if="section.title && index > 0" class="font-bold text-xs text-indigo-200">{{ section.title }}</div>
        <MarkdownRenderer v-if="section.markdown || section.text" :content="section.text || ''" />
        <ul v-if="section.items?.length" class="space-y-1 text-sm text-slate-100 list-disc pl-4">
          <li v-for="item in section.items" :key="item">{{ item }}</li>
        </ul>
      </div>
    </div>

    <WordFamilyCard
      :word="displayHeadword"
      :family="result.lexicalProfile?.wordFamily"
      @select-word="handleSearch"
    />

    <UsageNotesCard
      :warnings="usageWarnings"
      :pairs="result.lexicalProfile?.confusablePairs"
    />

    <WordFormationCard
      :formation="formationText"
      :prefixes="formationPrefixes"
      :suffixes="formationSuffixes"
    />

    <LearnerMistakesCard
      :mistakes="result.lexicalProfile?.learnerMistakes"
    />

    <CollocationsCard
      :word="displayHeadword"
      :collocations="result.lexicalProfile?.collocations"
      @select-word="handleSearch"
    />
  </div>
</template>
