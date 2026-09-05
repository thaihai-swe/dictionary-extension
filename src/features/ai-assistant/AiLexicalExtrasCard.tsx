import React, { Suspense, useMemo } from 'react';
import { lexicalExtrasForIntent } from '@/shared/ai-prompts';
import { LexicalProfile } from '@/types';
import {
  CollocationsCard,
  LearnerMistakesCard,
  UsageNotesCard,
  WordFamilyCard,
  WordFormationCard,
} from '@/components/async-views';

interface AiLexicalExtrasProps {
  query?: string;
  profile?: LexicalProfile;
  intent?: string;
  onSelectWord?: (word: string) => void;
}

export const AiLexicalExtras: React.FC<AiLexicalExtrasProps> = ({
  query,
  profile,
  intent,
  onSelectWord,
}) => {
  const extras = useMemo(() => new Set(lexicalExtrasForIntent(intent)), [intent]);

  const formation = useMemo(() => {
    const value = profile?.wordFormation;
    if (!value) return { text: '', prefixes: [] as string[], suffixes: [] as string[] };
    if (typeof value === 'string') return { text: value, prefixes: [], suffixes: [] };
    return {
      text: value.explanation || '',
      prefixes: value.prefixes || [],
      suffixes: value.suffixes || [],
    };
  }, [profile]);

  return (
    <Suspense fallback={null}>
      {extras.has('wordFamily') ? (
        <WordFamilyCard word={query} family={profile?.wordFamily} onSelectWord={onSelectWord} />
      ) : null}
      {extras.has('usageNotes') ? (
        <UsageNotesCard warnings={profile?.usageWarnings} pairs={profile?.confusablePairs} />
      ) : null}
      {extras.has('wordFormation') ? (
        <WordFormationCard
          formation={formation.text}
          prefixes={formation.prefixes}
          suffixes={formation.suffixes}
        />
      ) : null}
      {extras.has('learnerMistakes') ? (
        <LearnerMistakesCard mistakes={profile?.learnerMistakes} />
      ) : null}
      {extras.has('collocations') ? (
        <CollocationsCard
          word={query}
          collocations={profile?.collocations}
          onSelectWord={onSelectWord}
        />
      ) : null}
    </Suspense>
  );
};

export default AiLexicalExtras;
