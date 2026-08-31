<script setup lang="ts">
import { computed } from 'vue';
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
}>();

const emit = defineEmits<{
  (e: 'select-word', word: string): void;
}>();

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
    :word="query"
    :family="profile?.wordFamily"
    @select-word="emit('select-word', $event)"
  />
  <UsageNotesCard
    :warnings="profile?.usageWarnings"
    :pairs="profile?.confusablePairs"
  />
  <WordFormationCard
    :formation="formation.text"
    :prefixes="formation.prefixes"
    :suffixes="formation.suffixes"
  />
  <LearnerMistakesCard
    :mistakes="profile?.learnerMistakes"
  />
  <CollocationsCard
    :word="query"
    :collocations="profile?.collocations"
    @select-word="emit('select-word', $event)"
  />
</template>
