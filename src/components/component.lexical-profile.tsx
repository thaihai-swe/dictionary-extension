import React, { Suspense, useMemo } from 'react';
import { LexicalProfile } from '@/types';
import { lexicalExtrasForIntent } from '@/shared/ai-prompts';
import {
  CollocationsCard,
  LearnerMistakesCard,
  UsageNotesCard,
  WordFamilyCard,
  WordFormationCard,
} from '@/components/async-views';
import LexicalDisclosure from '@/features/dictionary/LexicalDisclosure';

export interface LexicalProfileSectionProps {
  profile?: LexicalProfile;
  query?: string;
  intent?: string;
  collapsible?: boolean;
  onSelectWord?: (word: string) => void;
  className?: string;
}

export const LexicalProfileSection: React.FC<LexicalProfileSectionProps> = ({
  profile,
  query,
  intent,
  collapsible = false,
  onSelectWord,
  className,
}) => {
  const allowedExtras = useMemo(() => {
    if (intent) {
      return new Set(lexicalExtrasForIntent(intent));
    }
    // If no specific intent is specified, allow all extras
    return new Set(['wordFamily', 'collocations', 'wordFormation', 'usageNotes', 'learnerMistakes']);
  }, [intent]);

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

  const usageWarnings = profile?.usageWarnings || [];
  const hasFormation = Boolean(formation.text || formation.prefixes.length || formation.suffixes.length);
  const hasUsageNotes = Boolean(profile?.usageNotes || usageWarnings.length || profile?.confusablePairs);
  const hasLearnerMistakes = Boolean(profile?.learnerMistakes?.length);
  const hasWordFamily = Boolean(profile?.wordFamily);
  const hasCollocations = Boolean(profile?.collocations);

  if (!profile) return null;

  return (
    <div className={className}>
      <Suspense fallback={null}>
        {/* Word Family */}
        {hasWordFamily && allowedExtras.has('wordFamily') ? (
          collapsible ? (
            <LexicalDisclosure label="Word family">
              <WordFamilyCard word={query} family={profile.wordFamily} onSelectWord={onSelectWord} />
            </LexicalDisclosure>
          ) : (
            <WordFamilyCard word={query} family={profile.wordFamily} onSelectWord={onSelectWord} />
          )
        ) : null}

        {/* Collocations */}
        {hasCollocations && allowedExtras.has('collocations') ? (
          collapsible ? (
            <LexicalDisclosure label="Collocations">
              <CollocationsCard word={query} collocations={profile.collocations} onSelectWord={onSelectWord} />
            </LexicalDisclosure>
          ) : (
            <CollocationsCard word={query} collocations={profile.collocations} onSelectWord={onSelectWord} />
          )
        ) : null}

        {/* Word Formation */}
        {hasFormation && allowedExtras.has('wordFormation') ? (
          collapsible ? (
            <LexicalDisclosure label="Word formation">
              <WordFormationCard
                formation={formation.text}
                prefixes={formation.prefixes}
                suffixes={formation.suffixes}
              />
            </LexicalDisclosure>
          ) : (
            <WordFormationCard
              formation={formation.text}
              prefixes={formation.prefixes}
              suffixes={formation.suffixes}
            />
          )
        ) : null}

        {/* Usage and Nuance */}
        {hasUsageNotes && allowedExtras.has('usageNotes') ? (
          collapsible ? (
            <LexicalDisclosure label="Usage and nuance">
              <UsageNotesCard
                notes={profile.usageNotes}
                warnings={usageWarnings}
                pairs={profile.confusablePairs}
              />
            </LexicalDisclosure>
          ) : (
            <UsageNotesCard
              notes={profile.usageNotes}
              warnings={usageWarnings}
              pairs={profile.confusablePairs}
            />
          )
        ) : null}

        {/* Learner Mistakes */}
        {hasLearnerMistakes && allowedExtras.has('learnerMistakes') ? (
          collapsible ? (
            <LexicalDisclosure label="Learner mistakes" count={profile.learnerMistakes?.length}>
              <LearnerMistakesCard mistakes={profile.learnerMistakes} />
            </LexicalDisclosure>
          ) : (
            <LearnerMistakesCard mistakes={profile.learnerMistakes} />
          )
        ) : null}
      </Suspense>
    </div>
  );
};

export default LexicalProfileSection;
