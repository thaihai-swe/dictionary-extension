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

const DICTIONARY_TESTS = [
  ['wiktionary', 'Wiktionary'],
  ['free_dictionary', 'Free Dictionary'],
  ['datamuse', 'Datamuse'],
  ['wikipedia', 'Wikipedia'],
  ['rhymebrain', 'RhymeBrain'],
  ['wiktionary_etymology', 'Etymology'],
  ['wiktionary_bilingual', 'Bilingual'],
  ['tatoeba', 'Tatoeba'],
] as const;

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
    <div className="space-y-6 font-sans text-xs">
      <section className="bg-surface border border-border rounded-xl p-5 space-y-3 shadow-xs">
        <div>
          <h3 className="text-sm font-bold text-content font-heading">Dictionary View</h3>
          <p className="text-[11.5px] text-content-muted">
            What appears on a word lookup besides the headword.
          </p>
        </div>
        <div className="space-y-1 divide-y divide-border/40">
          <label className="flex items-center justify-between cursor-pointer py-2.5 hover:bg-muted/30 px-1 rounded-lg transition-colors">
            <div className="pr-4">
              <span className="font-semibold text-content text-xs block">Show translation</span>
              <span className="text-[11px] text-content-muted block">
                Localized gloss above meanings
              </span>
            </div>
            <input
              type="checkbox"
              checked={localSettings.enableTranslate !== false}
              onChange={(e) => onChange({ enableTranslate: e.target.checked })}
              className="w-4 h-4 cursor-pointer"
            />
          </label>
          <label className="flex items-center justify-between cursor-pointer py-2.5 hover:bg-muted/30 px-1 rounded-lg transition-colors">
            <div className="pr-4">
              <span className="font-semibold text-content text-xs block">Show definitions</span>
              <span className="text-[11px] text-content-muted block">
                Sense cards and example sentences
              </span>
            </div>
            <input
              type="checkbox"
              checked={localSettings.enableDictionary !== false}
              onChange={(e) => onChange({ enableDictionary: e.target.checked })}
              className="w-4 h-4 cursor-pointer"
            />
          </label>
        </div>
      </section>

      <section className="bg-surface border border-border rounded-xl p-5 space-y-4 shadow-xs">
        <div>
          <h3 className="text-sm font-bold text-content font-heading">Translation</h3>
          <p className="text-[11.5px] text-content-muted">
            Target language and engine used for the gloss line.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="font-bold text-content-secondary block text-[11px] uppercase tracking-wider">
              Target language
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
          <div className="space-y-1.5">
            <label className="font-bold text-content-secondary block text-[11px] uppercase tracking-wider">
              Engine
            </label>
            <select
              value={localSettings.translateProvider || 'google'}
              onChange={(e) => onChange({ translateProvider: e.target.value as AppSettings['translateProvider'] })}
              className="w-full bg-muted border border-border text-content text-xs font-medium rounded-xl px-3 py-2.5 outline-none focus:border-accent cursor-pointer shadow-xs"
            >
              <option value="google" className="bg-surface text-content">Google Translate</option>
              <option value="libretranslate" className="bg-surface text-content">LibreTranslate</option>
              <option value="mymemory" className="bg-surface text-content">MyMemory</option>
            </select>
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="font-bold text-content-secondary block text-[11px] uppercase tracking-wider">
            Extra languages (comma-separated)
          </label>
          <input
            value={localSettings.customLanguages || ''}
            onChange={(e) => onChange({ customLanguages: e.target.value })}
            type="text"
            placeholder="Vietnamese, English, Japanese, French"
            className="w-full bg-muted border border-border rounded-xl px-3 py-2 text-xs text-content placeholder:text-content-muted outline-none focus:border-accent shadow-xs"
          />
        </div>
        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            className="px-3 py-1.5 rounded-lg bg-muted hover:bg-elevated border border-border text-xs font-semibold text-content-secondary hover:text-accent cursor-pointer shadow-xs flex items-center gap-1.5"
            disabled={connectionBusy[translationKey]}
            onClick={onTestTranslation}
          >
            {connectionBusy[translationKey] ? (
              <IconSpinner className="w-3.5 h-3.5 text-accent" />
            ) : (
              <IconTranslate className="w-3.5 h-3.5 text-accent" />
            )}
            <span>Test translation</span>
          </button>
          {connectionStatus[translationKey] ? (
            <span className="text-[11px] px-2 py-0.5 rounded-md bg-muted border border-border text-accent font-mono">
              {connectionStatus[translationKey]}
            </span>
          ) : null}
        </div>
      </section>

      <section className="bg-surface border border-border rounded-xl p-5 space-y-4 shadow-xs">
        <div>
          <h3 className="text-sm font-bold text-content font-heading">Dictionary provider</h3>
          <p className="text-[11.5px] text-content-muted">
            Primary source for definitions. Others still enrich in the background.
          </p>
        </div>
        <select
          value={localSettings.dictionaryProvider || 'wiktionary'}
          onChange={(e) =>
            onChange({ dictionaryProvider: e.target.value as AppSettings['dictionaryProvider'] })
          }
          className="w-full bg-muted border border-border text-content text-xs font-medium rounded-xl px-3 py-2.5 outline-none focus:border-accent cursor-pointer shadow-xs"
        >
          <option value="wiktionary" className="bg-surface text-content">Wiktionary (default)</option>
          <option value="free_dictionary" className="bg-surface text-content">Free Dictionary API</option>
          <option value="datamuse" className="bg-surface text-content">Datamuse</option>
          <option value="wikipedia" className="bg-surface text-content">Wikipedia Summary</option>
          <option value="wiktionary_etymology" className="bg-surface text-content">Wiktionary Etymology</option>
          <option value="wiktionary_bilingual" className="bg-surface text-content">Wiktionary Bilingual</option>
          <option value="tatoeba" className="bg-surface text-content">Tatoeba Sentences</option>
          <option value="google_translate" className="bg-surface text-content">Google Translate API</option>
        </select>
        <details className="rounded-lg border border-border bg-muted/30">
          <summary className="px-3 py-2 text-[11px] font-bold text-content-muted uppercase tracking-wider cursor-pointer">
            Test connectivity
          </summary>
          <div className="px-3 pb-3 space-y-2">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {DICTIONARY_TESTS.map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  className="px-2.5 py-1.5 rounded-lg bg-surface hover:bg-elevated border border-border text-xs font-semibold text-content-secondary hover:text-accent cursor-pointer shadow-xs flex items-center justify-center gap-1 active:scale-95"
                  disabled={connectionBusy[id]}
                  onClick={() => onTestDictionary(id)}
                >
                  {connectionBusy[id] ? (
                    <IconSpinner className="w-3 h-3 text-accent" />
                  ) : (
                    <IconBook className="w-3 h-3 text-accent" />
                  )}
                  <span>{label}</span>
                </button>
              ))}
            </div>
            {lastDictStatus ? (
              <p className="text-[11px] text-accent font-mono">{lastDictStatus}</p>
            ) : null}
          </div>
        </details>
      </section>

      <section className="bg-surface border border-border rounded-xl p-5 space-y-4 shadow-xs">
        <div>
          <h3 className="text-sm font-bold text-content font-heading flex items-center gap-1.5">
            <IconSpeaker className="w-4 h-4 text-accent" />
            Speech
          </h3>
          <p className="text-[11.5px] text-content-muted">
            Voice and speed for pronunciation playback.
          </p>
        </div>
        <select
          value={localSettings.pronunciationVoiceURI || ''}
          onChange={(e) => onChange({ pronunciationVoiceURI: e.target.value })}
          className="w-full bg-muted border border-border text-content text-xs font-medium rounded-xl px-3 py-2.5 outline-none focus:border-accent cursor-pointer shadow-xs"
        >
          <option value="" className="bg-surface text-content">System default</option>
          {availableVoices.map((voice) => (
            <option key={voice.voiceURI} value={voice.voiceURI} className="bg-surface text-content">
              {voice.name} ({voice.lang})
            </option>
          ))}
        </select>
        <div className="flex items-center justify-between gap-3 bg-muted/40 p-2.5 rounded-xl border border-border">
          <div>
            <span className="text-content font-semibold text-xs block">Speech rate</span>
            <span className="text-[11px] text-content-muted">0.5× to 1.5×</span>
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
      </section>
    </div>
  );
};

export default TabSources;
