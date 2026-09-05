import type { AiIntentId } from '../types';

export interface DemoPreset {
  tag: string;
  label: string;
  query: string;
  context?: string;
  intent?: AiIntentId;
}

export const DEMO_PRESETS: readonly DemoPreset[] = [
  {
    tag: 'Word',
    label: 'resilience',
    query: 'resilience',
    context: 'Their resilience under pressure allowed the engineering team to ship on time.',
    intent: 'default',
  },
  {
    tag: 'Idiom',
    label: 'spill the beans',
    query: 'spill the beans',
    context: 'He finally spilled the beans about the surprise launch.',
    intent: 'collocations',
  },
  {
    tag: 'Sentence',
    label: 'The algorithm adapts…',
    query: 'The algorithm adapts dynamically to high traffic.',
    context: 'The algorithm adapts dynamically to high traffic.',
    intent: 'sentence_breakdown',
  },
  {
    tag: 'Compare',
    label: 'affect vs effect',
    query: 'affect vs effect',
    context: 'The policy will affect housing costs, but the long-term effect is still unclear.',
    intent: 'confusables',
  },
];
