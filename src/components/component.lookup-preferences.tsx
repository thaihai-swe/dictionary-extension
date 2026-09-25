import React from 'react';
import { IconBook, IconGlobe } from './icons';

interface LookupPreferencesProps {
  provider?: string;
  targetLang?: string;
  onUpdateProvider: (value: string) => void;
  onUpdateTargetLang: (value: string) => void;
}

export default function LookupPreferences({
  provider,
  targetLang,
  onUpdateProvider,
  onUpdateTargetLang,
}: LookupPreferencesProps) {
  return (
    <div className="lookup-preferences">
      {/* Source selector */}
      <label className="flex items-center gap-1.5 cursor-pointer min-w-0">
        <IconBook className="w-3 h-3 text-accent shrink-0 opacity-70" />
        <span className="text-[11px] font-semibold text-content-muted whitespace-nowrap">Source</span>
        <select
          value={provider || 'wiktionary'}
          onChange={(e) => onUpdateProvider(e.target.value)}
          aria-label="Choose preferred dictionary source"
          title="Choose which dictionary source is shown first"
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

      {/* Language selector */}
      <label className="flex items-center gap-1.5 cursor-pointer min-w-0">
        <IconGlobe className="w-3 h-3 text-accent shrink-0 opacity-70" />
        <span className="text-[11px] font-semibold text-content-muted whitespace-nowrap">To</span>
        <select
          value={targetLang || 'Vietnamese'}
          onChange={(e) => onUpdateTargetLang(e.target.value)}
          aria-label="Select translation target language"
          title="Select translation target language"
        >
          {['Vietnamese', 'English', 'Japanese', 'Chinese', 'Korean', 'French', 'Spanish'].map((lang) => (
            <option key={lang} value={lang}>{lang}</option>
          ))}
        </select>
      </label>
    </div>
  );
}
