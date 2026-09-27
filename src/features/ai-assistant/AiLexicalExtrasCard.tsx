import React from 'react';
import { LexicalProfile } from '@/types';
import LexicalProfileSection from '@/components/component.lexical-profile';

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
  return (
    <LexicalProfileSection
      query={query}
      profile={profile}
      intent={intent}
      collapsible={false}
      onSelectWord={onSelectWord}
    />
  );
};

export default AiLexicalExtras;
