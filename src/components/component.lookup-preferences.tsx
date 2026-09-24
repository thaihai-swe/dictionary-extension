import React from 'react';

interface LookupPreferencesProps {
  provider?: string;
  targetLang?: string;
  onUpdateProvider: (value: string) => void;
  onUpdateTargetLang: (value: string) => void;
}

export default function LookupPreferences({ provider, targetLang, onUpdateProvider, onUpdateTargetLang }: LookupPreferencesProps) {
  return (
    <div className="lookup-preferences">
      <label>
        <span>Preferred Source</span>
        <select value={provider || 'wiktionary'} onChange={(event) => onUpdateProvider(event.target.value)} aria-label="Choose preferred dictionary source" title="Choose which dictionary source is shown first; all enabled sources are combined">
          <option value="wiktionary">Wiktionary</option>
          <option value="free_dictionary">FreeDict</option>
          <option value="datamuse">Datamuse</option>
          <option value="urban_dictionary">UrbanDict</option>
          <option value="wiktionary_bilingual">Bilingual</option>
          <option value="google_translate">Translate</option>
        </select>
      </label>
      <label>
        <span>Target Language</span>
        <select value={targetLang || 'Vietnamese'} onChange={(event) => onUpdateTargetLang(event.target.value)} aria-label="Select Translation Target Language" title="Select Translation Target Language">
          {['Vietnamese', 'English', 'Japanese', 'Chinese', 'Korean', 'French', 'Spanish'].map((language) => <option key={language}>{language}</option>)}
        </select>
      </label>
    </div>
  );
}
