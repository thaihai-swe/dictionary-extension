<script setup lang="ts">
import { computed } from 'vue';
import { useDictionary } from '../composables/composable.dictionary';

interface MistakeItem {
  mistake: string;
  correction: string;
  exampleIncorrect?: string;
  exampleCorrect?: string;
}

const props = defineProps<{
  word?: string;
  mistakes?: MistakeItem[];
}>();

const { speakTTS } = useDictionary();

const calculatedMistakes = computed<MistakeItem[]>(() => {
  if (props.mistakes && props.mistakes.length > 0) {
    return props.mistakes;
  }

  const w = (props.word || '').toLowerCase().trim();
  if (!w) return [];

  // Authentic curated linguistic mistake rules for common learner verbs
  if (w.includes('explain')) {
    return [{
      mistake: "Saying 'explain me something' instead of 'explain something to me'.",
      correction: "Use 'explain something to someone'.",
      exampleIncorrect: "Can you explain me this rule?",
      exampleCorrect: "Can you explain this rule to me?"
    }];
  } else if (w.includes('suggest') || w.includes('recommend')) {
    return [{
      mistake: "Using infinitive 'suggest to do' instead of gerund or 'that' clause.",
      correction: "Use 'suggest doing' or 'suggest that someone do'.",
      exampleIncorrect: "I suggest to go home.",
      exampleCorrect: "I suggest going home."
    }];
  } else if (w.includes('listen')) {
    return [{
      mistake: "Omitting 'to' after 'listen'.",
      correction: "Always use 'listen to' when specifying an object.",
      exampleIncorrect: "Listen the music.",
      exampleCorrect: "Listen to the music."
    }];
  } else if (w.includes('discuss')) {
    return [{
      mistake: "Adding 'about' after 'discuss'.",
      correction: "'Discuss' is a transitive verb; do not add 'about'.",
      exampleIncorrect: "We discussed about the problem.",
      exampleCorrect: "We discussed the problem."
    }];
  } else if (w.includes('watch') || w.includes('video')) {
    return [{
      mistake: "Using 'look' instead of 'watch' for moving media.",
      correction: "Use 'watch' for videos and movies.",
      exampleIncorrect: "Look 15s of the video.",
      exampleCorrect: "Watch 15s of the video."
    }];
  }

  // If no authentic mistake exists, return empty array so card is cleanly hidden
  return [];
});

function listenExample(item: MistakeItem) {
  const textToSpeak = item.exampleCorrect || item.correction;
  speakTTS(textToSpeak);
}
</script>

<template>
  <div v-if="calculatedMistakes.length > 0" class="pt-3 border-t border-dark-border/50 space-y-2.5">
    <div class="flex items-center gap-1.5 text-[11px] font-extrabold text-amber-400 uppercase tracking-wider">
      <span>⚠️</span>
      <span>COMMON LEARNER MISTAKES</span>
    </div>

    <div class="space-y-2">
      <div
        v-for="(item, idx) in calculatedMistakes"
        :key="idx"
        class="pl-3.5 py-2.5 pr-3 rounded-r-lg border-l-2 border-amber-500/70 bg-amber-500/5 text-xs space-y-1.5"
      >
        <div class="text-rose-400 font-semibold leading-relaxed">
          <span class="font-extrabold">Mistake:</span> {{ item.mistake }}
        </div>

        <div class="text-emerald-400 font-semibold leading-relaxed">
          <span class="font-extrabold">Correction:</span> {{ item.correction }}
        </div>

        <div v-if="item.exampleIncorrect || item.exampleCorrect" class="text-slate-300 italic text-[11px] leading-relaxed pt-1 flex items-center justify-between flex-wrap gap-2">
          <div>
            <span v-if="item.exampleIncorrect" class="mr-3"><span class="not-italic font-bold text-slate-300">Incorrect:</span> {{ item.exampleIncorrect }}</span>
            <span v-if="item.exampleCorrect"><span class="not-italic font-bold text-slate-300">Correct:</span> {{ item.exampleCorrect }}</span>
          </div>

          <button
            @click="listenExample(item)"
            title="Listen correct pronunciation"
            class="px-2 py-0.5 rounded bg-dark-muted hover:bg-dark-border text-slate-300 hover:text-white text-[10px] font-semibold transition-all flex items-center gap-1 ml-auto cursor-pointer"
          >
            <span>🔊 Listen</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
