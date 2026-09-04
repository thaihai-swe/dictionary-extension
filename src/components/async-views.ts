import { lazy } from 'react';
import type { AiIntentId } from '../types';

export const ShortcutsModal = lazy(() => import('./modal.shortcuts'));
export const WordFamilyCard = lazy(() => import('./card.word-family'));
export const UsageNotesCard = lazy(() => import('./card.usage-notes'));
export const WordFormationCard = lazy(() => import('./card.word-formation'));
export const LearnerMistakesCard = lazy(() => import('./card.learner-mistakes'));
export const CollocationsCard = lazy(() => import('./card.collocations'));

const loadAiMarkdownIntent = () => import('./intent.ai-markdown');
const loadSentenceBreakdownIntent = () => import('./intent.sentence-breakdown');
const loadConfusablesIntent = () => import('./intent.confusables');
const loadRephraseIntent = () => import('./intent.rephrase');

export const AiMarkdownIntent = lazy(loadAiMarkdownIntent);
export const SentenceBreakdownIntent = lazy(loadSentenceBreakdownIntent);
export const ConfusablesIntent = lazy(loadConfusablesIntent);
export const RephraseIntent = lazy(loadRephraseIntent);

const INTENT_CHUNK_LOADERS: Record<AiIntentId, () => Promise<unknown>> = {
  default: loadAiMarkdownIntent,
  explain_in_context: loadAiMarkdownIntent,
  grammar: loadAiMarkdownIntent,
  collocations: loadAiMarkdownIntent,
  rephrase: loadRephraseIntent,
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
