import React from 'react';
import { IconBook, IconChevronDown, IconGlobe } from './icons';

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
      <label className="flex items-center gap-1 cursor-pointer">
        <IconBook className="w-3 h-3" style={{ color: 'var(--color-primary)', opacity: 0.9 }} />
        <span className="pref-label">Source</span>
        <div className="relative inline-flex items-center">
          <select
            value={provider || 'wiktionary'}
            onChange={(e) => onUpdateProvider(e.target.value)}
            aria-label="Choose preferred dictionary source"
            title="Choose which dictionary source is shown first"
            className="pr-3 appearance-none bg-transparent cursor-pointer font-bold text-xs"
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
          <IconChevronDown className="w-2.5 h-2.5 absolute right-0 text-content-muted pointer-events-none" />
        </div>
      </label>

      <label className="flex items-center gap-1 cursor-pointer">
        <IconGlobe className="w-3 h-3" style={{ color: 'var(--color-primary)', opacity: 0.9 }} />
        <span className="pref-label">To</span>
        <div className="relative inline-flex items-center">
          <select
            value={targetLang || 'Vietnamese'}
            onChange={(e) => onUpdateTargetLang(e.target.value)}
            aria-label="Select translation target language"
            title="Select translation target language"
            className="pr-3 appearance-none bg-transparent cursor-pointer font-bold text-xs"
          >
            {['Vietnamese', 'English', 'Japanese', 'Chinese', 'Korean', 'French', 'Spanish'].map((lang) => (
              <option key={lang} value={lang}>{lang}</option>
            ))}
          </select>
          <IconChevronDown className="w-2.5 h-2.5 absolute right-0 text-content-muted pointer-events-none" />
        </div>
      </label>
    </div>
  );
}
