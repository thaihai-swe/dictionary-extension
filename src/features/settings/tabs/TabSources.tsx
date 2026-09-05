import React from 'react';
import { AppSettings } from '@/types';
import { IconBook, IconSpeaker, IconSpinner, IconTranslate } from '@/components/icons';

interface TabSourcesProps {
  localSettings: AppSettings;
  languageOptions: string[];
  connectionStatus: Record<string, string>;
  connectionBusy: Record<string, boolean>;
  availableVoices: SpeechSynthesisVoice[];
  onChange: (patch: Partial<AppSettings>) => void;
  onTestTranslation: () => void;
  onTestDictionary: (providerId: string) => void;
}

export const TabSources: React.FC<TabSourcesProps> = ({
  localSettings,
  languageOptions,
  connectionStatus,
  connectionBusy,
  availableVoices,
  onChange,
  onTestTranslation,
  onTestDictionary,
}) => {
  const translationKey = `translation:${localSettings.translateProvider || 'google'}`;
  const lastDictStatus =
    connectionStatus[localSettings.dictionaryProvider] ||
    Object.entries(connectionStatus)
      .filter(([key]) => !key.startsWith('translation:') && key !== 'ai')
      .map(([, value]) => value)
      .slice(-1)[0];

  return (
    <div className="space-y-4 font-sans text-xs">
      {/* Toggles */}
      <div className="space-y-2">
        <label className="flex items-center justify-between cursor-pointer p-2 rounded-xl hover:bg-muted transition-colors">
          <div>
            <span className="font-bold text-content block text-xs">Show Translation in Dictionary View</span>
            <span className="text-[11px] text-content-muted block">Displays instant localized translation above meanings</span>
          </div>
          <input
            type="checkbox"
            checked={localSettings.enableTranslate !== false}
            onChange={(e) => onChange({ enableTranslate: e.target.checked })}
            className="w-4 h-4 cursor-pointer"
          />
        </label>
        <label className="flex items-center justify-between cursor-pointer p-2 rounded-xl hover:bg-muted transition-colors">
          <div>
            <span className="font-bold text-content block text-xs">Show Definitions in Dictionary View</span>
            <span className="text-[11px] text-content-muted block">Displays full dictionary definition cards and word senses</span>
          </div>
          <input
            type="checkbox"
            checked={localSettings.enableDictionary !== false}
            onChange={(e) => onChange({ enableDictionary: e.target.checked })}
            className="w-4 h-4 cursor-pointer"
          />
        </label>
      </div>

      {/* Target language */}
      <div className="space-y-2 pt-3 border-t border-border/60">
        <label className="font-bold text-content-secondary block uppercase tracking-wider text-[11px]">
          Default Target Translation Language
        </label>
        <select
          value={localSettings.translateTargetLanguage || 'Vietnamese'}
          onChange={(e) => onChange({ translateTargetLanguage: e.target.value })}
          className="w-full bg-muted border border-border text-content text-xs font-medium rounded-xl px-3 py-2.5 outline-none focus:border-accent cursor-pointer shadow-xs"
        >
          {languageOptions.map((lang) => (
            <option key={lang} value={lang} className="bg-surface text-content">
              {lang}
            </option>
          ))}
        </select>
      </div>

      {/* Custom languages */}
      <div className="space-y-2 pt-3 border-t border-border/60">
        <label className="font-bold text-content-secondary block uppercase tracking-wider text-[11px]">
          Custom Language List
        </label>
        <input
          value={localSettings.customLanguages || ''}
          onChange={(e) => onChange({ customLanguages: e.target.value })}
          type="text"
          placeholder="Vietnamese, English, Japanese, French"
          className="w-full bg-muted border border-border rounded-xl px-3 py-2 text-xs text-content placeholder:text-content-muted outline-none focus:border-accent shadow-xs"
        />
      </div>

      {/* Translation Provider */}
      <div className="space-y-2 pt-3 border-t border-border/60">
        <label className="font-bold text-content-secondary block uppercase tracking-wider text-[11px]">
          Translation Engine Provider
        </label>
        <select
          value={localSettings.translateProvider || 'google'}
          onChange={(e) => onChange({ translateProvider: e.target.value as AppSettings['translateProvider'] })}
          className="w-full bg-muted border border-border text-content text-xs font-medium rounded-xl px-3 py-2.5 outline-none focus:border-accent cursor-pointer shadow-xs"
        >
          <option value="google" className="bg-surface text-content">Google Translate (Default)</option>
          <option value="libretranslate" className="bg-surface text-content">LibreTranslate</option>
          <option value="mymemory" className="bg-surface text-content">MyMemory (Keyless fallback)</option>
        </select>
        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            className="px-3 py-1.5 rounded-lg bg-muted hover:bg-elevated border border-border text-xs font-semibold text-content-secondary hover:text-accent cursor-pointer shadow-xs flex items-center gap-1.5"
            disabled={connectionBusy[translationKey]}
            onClick={onTestTranslation}
          >
            {connectionBusy[translationKey] ? <IconSpinner className="w-3.5 h-3.5 text-accent" /> : <IconTranslate className="w-3.5 h-3.5 text-accent" />}
            <span>Test Translation Connection</span>
          </button>
          {connectionStatus[translationKey] && (
            <span className="text-[11px] px-2 py-0.5 rounded-md bg-muted border border-border text-accent font-mono">
              {connectionStatus[translationKey]}
            </span>
          )}
        </div>
      </div>

      {/* Dictionary Provider */}
      <div className="space-y-2 pt-3 border-t border-border/60">
        <label className="font-bold text-content-secondary block uppercase tracking-wider text-[11px]">
          Default Dictionary Provider
        </label>
        <select
          value={localSettings.dictionaryProvider || 'wiktionary'}
          onChange={(e) =>
            onChange({ dictionaryProvider: e.target.value as AppSettings['dictionaryProvider'] })
          }
          className="w-full bg-muted border border-border text-content text-xs font-medium rounded-xl px-3 py-2.5 outline-none focus:border-accent cursor-pointer shadow-xs"
        >
          <option value="wiktionary" className="bg-surface text-content">Wiktionary Open API (Default)</option>
          <option value="free_dictionary" className="bg-surface text-content">Free Dictionary API</option>
          <option value="datamuse" className="bg-surface text-content">Datamuse (Keyless collocations)</option>
          <option value="wikipedia" className="bg-surface text-content">Wikipedia Summary</option>
          <option value="urban_dictionary" className="bg-surface text-content">Urban Dictionary (Slang &amp; Idioms)</option>
          <option value="wiktionary_etymology" className="bg-surface text-content">Wiktionary Etymology (Origins)</option>
          <option value="wiktionary_bilingual" className="bg-surface text-content">Wiktionary Bilingual Gloss</option>
          <option value="tatoeba" className="bg-surface text-content">Tatoeba Sentence Corpus</option>
          <option value="google_translate" className="bg-surface text-content">Google Translate API</option>
        </select>
      </div>

      {/* Test Dictionary Connection */}
      <div className="space-y-2 pt-3 border-t border-border/60">
        <label className="font-bold text-content-secondary block uppercase tracking-wider text-[11px]">
          Test Dictionary Connectivity
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {(
            [
              ['wiktionary', 'Wiktionary'],
              ['free_dictionary', 'Free Dictionary'],
              ['datamuse', 'Datamuse'],
              ['wikipedia', 'Wikipedia'],
              ['urban_dictionary', 'Urban Dictionary'],
              ['rhymebrain', 'RhymeBrain'],
              ['wiktionary_etymology', 'Wiktionary Etymology'],
              ['wiktionary_bilingual', 'Wiktionary Bilingual'],
              ['tatoeba', 'Tatoeba Sentences'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className="px-2.5 py-1.5 rounded-lg bg-muted hover:bg-elevated border border-border text-xs font-semibold text-content-secondary hover:text-accent cursor-pointer shadow-xs flex items-center justify-center gap-1 active:scale-95"
              disabled={connectionBusy[id]}
              onClick={() => onTestDictionary(id)}
            >
              {connectionBusy[id] ? <IconSpinner className="w-3 h-3 text-accent" /> : <IconBook className="w-3 h-3 text-accent" />}
              <span>{label}</span>
            </button>
          ))}
        </div>
        {lastDictStatus ? (
          <p className="text-[11px] text-accent font-mono mt-1">{lastDictStatus}</p>
        ) : null}
      </div>

      {/* Voice & Speech Synthesis */}
      <div className="space-y-2 pt-3 border-t border-border/60">
        <label className="font-bold text-content-secondary block uppercase tracking-wider text-[11px] flex items-center gap-1.5">
          <IconSpeaker className="w-3.5 h-3.5 text-accent" />
          <span>Speech Synthesis (TTS Voice)</span>
        </label>
        <select
          value={localSettings.pronunciationVoiceURI || ''}
          onChange={(e) => onChange({ pronunciationVoiceURI: e.target.value })}
          className="w-full bg-muted border border-border text-content text-xs font-medium rounded-xl px-3 py-2.5 outline-none focus:border-accent cursor-pointer shadow-xs"
        >
          <option value="" className="bg-surface text-content">Auto-select system default voice</option>
          {availableVoices.map((voice) => (
            <option key={voice.voiceURI} value={voice.voiceURI} className="bg-surface text-content">
              {voice.name} ({voice.lang})
            </option>
          ))}
        </select>

        <div className="pt-2">
          <div className="flex items-center justify-between gap-3 bg-muted/40 p-2.5 rounded-xl border border-border">
            <div>
              <span className="text-content font-semibold text-xs block">Pronunciation Speech Rate:</span>
              <span className="text-[11px] text-content-muted">Controls playback speed of speech synthesis</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="0.5"
                max="1.5"
                step="0.05"
                value={localSettings.pronunciationRate ?? 1}
                onChange={(e) => onChange({ pronunciationRate: parseFloat(e.target.value) })}
                className="cursor-pointer w-28"
              />
              <span className="font-mono text-accent text-xs w-10 text-right">
                {localSettings.pronunciationRate ?? 1}x
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TabSources;
