import { lazy } from 'react';
import type { AiIntentId } from '../types';

export const ShortcutsModal = lazy(() => import('@/features/settings/ShortcutsModal'));
export const WordFamilyCard = lazy(() => import('@/features/dictionary/WordFamilyCard'));
export const UsageNotesCard = lazy(() => import('@/features/dictionary/UsageNotesCard'));
export const WordFormationCard = lazy(() => import('@/features/dictionary/WordFormationCard'));
export const LearnerMistakesCard = lazy(() => import('@/features/dictionary/LearnerMistakesCard'));
export const CollocationsCard = lazy(() => import('@/features/dictionary/CollocationsCard'));

const loadAiMarkdownIntent = () => import('@/features/ai-assistant/AiMarkdownIntent');
const loadSentenceBreakdownIntent = () => import('@/features/ai-assistant/SentenceBreakdownIntent');
const loadConfusablesIntent = () => import('@/features/ai-assistant/ConfusablesIntent');
const loadRephraseIntent = () => import('@/features/ai-assistant/RephraseIntent');

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
