<script setup lang="ts">
import { computed } from 'vue';
import { lexicalExtrasForIntent } from '../shared/ai-prompts';
import { LexicalProfile } from '../types';
import {
  CollocationsCard,
  LearnerMistakesCard,
  UsageNotesCard,
  WordFamilyCard,
  WordFormationCard,
} from './async-views';

const props = defineProps<{
  query?: string;
  profile?: LexicalProfile;
  intent?: string;
}>();

const emit = defineEmits<{
  (e: 'select-word', word: string): void;
}>();

const extras = computed(() => new Set(lexicalExtrasForIntent(props.intent)));

const formation = computed(() => {
  const value = props.profile?.wordFormation;
  if (!value) return { text: '', prefixes: [] as string[], suffixes: [] as string[] };
  if (typeof value === 'string') return { text: value, prefixes: [], suffixes: [] };
  return {
    text: value.explanation || '',
    prefixes: value.prefixes || [],
    suffixes: value.suffixes || [],
  };
});
</script>

<template>
  <WordFamilyCard
    v-if="extras.has('wordFamily')"
    :word="query"
    :family="profile?.wordFamily"
    @select-word="emit('select-word', $event)"
  />
  <UsageNotesCard
    v-if="extras.has('usageNotes')"
    :warnings="profile?.usageWarnings"
    :pairs="profile?.confusablePairs"
  />
  <WordFormationCard
    v-if="extras.has('wordFormation')"
    :formation="formation.text"
    :prefixes="formation.prefixes"
    :suffixes="formation.suffixes"
  />
  <LearnerMistakesCard
    v-if="extras.has('learnerMistakes')"
    :mistakes="profile?.learnerMistakes"
  />
  <CollocationsCard
    v-if="extras.has('collocations')"
    :word="query"
    :collocations="profile?.collocations"
    @select-word="emit('select-word', $event)"
  />
</template>
