import React from 'react';
import { IconBook, IconGlobe } from './icons';

interface LookupPreferencesProps {
  provider?: string;
  targetLang?: string;
  onUpdateProvider: (value: string) => void;
  onUpdateTargetLang: (value: string) => void;
}

export default function LookupPreferences({ provider, targetLang, onUpdateProvider, onUpdateTargetLang }: LookupPreferencesProps) {
  return (
    <div className="lookup-preferences">
      <label className="flex items-center gap-1.5 cursor-pointer">
        <IconBook className="w-3.5 h-3.5 text-accent opacity-80 shrink-0" />
        <span className="font-medium text-content-muted">Source:</span>
        <select
          value={provider || 'wiktionary'}
          onChange={(event) => onUpdateProvider(event.target.value)}
          aria-label="Choose preferred dictionary source"
          title="Choose which dictionary source is shown first; all enabled sources are combined"
          className="cursor-pointer hover:border-accent/60 transition-colors"
        >
          <option value="wiktionary">Wiktionary</option>
          <option value="free_dictionary">FreeDict</option>
          <option value="datamuse">Datamuse</option>
          <option value="urban_dictionary">UrbanDict</option>
          <option value="wiktionary_bilingual">Bilingual</option>
          <option value="wikipedia">Wikipedia</option>
          <option value="tatoeba">Tatoeba</option>
          <option value="google_translate">Translate</option>
        </select>
      </label>
      <label className="flex items-center gap-1.5 cursor-pointer">
        <IconGlobe className="w-3.5 h-3.5 text-accent opacity-80 shrink-0" />
        <span className="font-medium text-content-muted">To:</span>
        <select
          value={targetLang || 'Vietnamese'}
          onChange={(event) => onUpdateTargetLang(event.target.value)}
          aria-label="Select Translation Target Language"
          title="Select Translation Target Language"
          className="cursor-pointer hover:border-accent/60 transition-colors"
        >
          {['Vietnamese', 'English', 'Japanese', 'Chinese', 'Korean', 'French', 'Spanish'].map((language) => (
            <option key={language} value={language}>{language}</option>
          ))}
        </select>
      </label>
    </div>
  );
}
