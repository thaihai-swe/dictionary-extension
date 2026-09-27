import {
  AiMarkdownIntent,
  ConfusablesIntent,
  RephraseIntent,
  SentenceBreakdownIntent,
} from '@/components/async-views';
import type { AiResult } from '@/types';
import React, { Suspense } from 'react';

export interface AiIntentRouterProps {
  result: AiResult;
  targetLang?: string;
  onSelectWord?: (word: string) => void;
}

type IntentComponent = React.ComponentType<{
  result: AiResult;
  targetLang?: string;
  onSelectWord?: (word: string) => void;
}>;

const INTENT_COMPONENTS: Record<string, IntentComponent> = {
  sentence_breakdown: SentenceBreakdownIntent as IntentComponent,
  confusables: ConfusablesIntent as IntentComponent,
  rephrase: RephraseIntent as IntentComponent,
};

export const AiIntentRouter: React.FC<AiIntentRouterProps> = ({
  result,
  targetLang,
  onSelectWord,
}) => {
  const Component = INTENT_COMPONENTS[result.type] ?? AiMarkdownIntent;

  return (
    <Suspense fallback={<div className="p-3 text-[13.5px] text-content-muted">Loading analysis…</div>}>
      <Component result={result} targetLang={targetLang} onSelectWord={onSelectWord} />
    </Suspense>
  );
};

export default AiIntentRouter;
