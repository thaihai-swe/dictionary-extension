import { defineAsyncComponent } from 'vue';
import type { AiIntentId } from '../types';

export const ShortcutsModal = defineAsyncComponent(() => import('./modal.shortcuts.vue'));
export const WordFamilyCard = defineAsyncComponent(() => import('./card.word-family.vue'));
export const UsageNotesCard = defineAsyncComponent(() => import('./card.usage-notes.vue'));
export const WordFormationCard = defineAsyncComponent(() => import('./card.word-formation.vue'));
export const LearnerMistakesCard = defineAsyncComponent(() => import('./card.learner-mistakes.vue'));
export const CollocationsCard = defineAsyncComponent(() => import('./card.collocations.vue'));

export const loadAiMarkdownIntent = () => import('./intent.ai-markdown.vue');
export const loadSentenceBreakdownIntent = () => import('./intent.sentence-breakdown.vue');
export const loadConfusablesIntent = () => import('./intent.confusables.vue');

export const AiMarkdownIntent = defineAsyncComponent(loadAiMarkdownIntent);
export const SentenceBreakdownIntent = defineAsyncComponent(loadSentenceBreakdownIntent);
export const ConfusablesIntent = defineAsyncComponent(loadConfusablesIntent);

const INTENT_CHUNK_LOADERS: Record<AiIntentId, () => Promise<unknown>> = {
  default: loadAiMarkdownIntent,
  explain_in_context: loadAiMarkdownIntent,
  grammar: loadAiMarkdownIntent,
  collocations: loadAiMarkdownIntent,
  rephrase: loadAiMarkdownIntent,
  phrase_fallback: loadAiMarkdownIntent,
  sentence_breakdown: loadSentenceBreakdownIntent,
  confusables: loadConfusablesIntent,
};

export function preloadAiIntentChunks(intentIds?: AiIntentId[]) {
  const loaders = intentIds?.length
    ? intentIds.map((id) => INTENT_CHUNK_LOADERS[id]).filter(Boolean)
    : Object.values(INTENT_CHUNK_LOADERS);
  return Promise.all(loaders.map((load) => load().catch(() => undefined)));
}
