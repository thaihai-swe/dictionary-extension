import React from 'react';
import { AppSettings } from '../../types';

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
    <div className="space-y-3.5">
      <div className="space-y-2">
        <label className="flex items-center justify-between cursor-pointer">
          <span className="font-bold text-slate-200">🌐 Show translation in Dictionary tab:</span>
          <input
            type="checkbox"
            checked={localSettings.enableTranslate !== false}
            onChange={(e) => onChange({ enableTranslate: e.target.checked })}
            className="accent-teal-500 w-4 h-4 cursor-pointer"
          />
        </label>
        <label className="flex items-center justify-between cursor-pointer">
          <span className="font-bold text-slate-200">📖 Show definitions in Dictionary tab:</span>
          <input
            type="checkbox"
            checked={localSettings.enableDictionary !== false}
            onChange={(e) => onChange({ enableDictionary: e.target.checked })}
            className="accent-teal-500 w-4 h-4 cursor-pointer"
          />
        </label>
      </div>

      <div className="space-y-2 pt-2 border-t border-dark-border/60">
        <label className="font-bold text-slate-200 block">🌐 Default Target Translation Language:</label>
        <select
          value={localSettings.translateTargetLanguage || 'Vietnamese'}
          onChange={(e) => onChange({ translateTargetLanguage: e.target.value })}
          className="w-full bg-dark-muted border border-dark-border text-slate-200 text-sm font-medium rounded-xl px-3 py-2 outline-none focus:border-teal-500 cursor-pointer"
        >
          {languageOptions.map((lang) => (
            <option key={lang} value={lang}>
              {lang}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2 pt-2 border-t border-dark-border/60">
        <label className="font-bold text-slate-200 block">📝 Custom language list:</label>
        <input
          value={localSettings.customLanguages || ''}
          onChange={(e) => onChange({ customLanguages: e.target.value })}
          type="text"
          placeholder="Vietnamese, English, Japanese"
          className="w-full bg-dark-muted border border-dark-border rounded-xl px-3 py-2 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-teal-500"
        />
      </div>

      <div className="space-y-2 pt-2 border-t border-dark-border/60">
        <label className="font-bold text-slate-200 block">🌍 Translation provider:</label>
        <select
          value={localSettings.translateProvider || 'google'}
          onChange={(e) => onChange({ translateProvider: e.target.value as AppSettings['translateProvider'] })}
          className="w-full bg-dark-muted border border-dark-border text-slate-200 text-sm font-medium rounded-xl px-3 py-2 outline-none focus:border-teal-500 cursor-pointer"
        >
          <option value="google">Google Translate</option>
          <option value="libretranslate">LibreTranslate</option>
          <option value="mymemory">MyMemory (keyless fallback)</option>
        </select>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="px-2.5 py-1.5 rounded-lg bg-dark-muted border border-dark-border text-sm font-bold text-slate-200 hover:border-teal-500 cursor-pointer"
            disabled={connectionBusy[translationKey]}
            onClick={onTestTranslation}
          >
            Test translation
          </button>
          <span className="text-xs text-slate-400">{connectionStatus[translationKey]}</span>
        </div>
      </div>

      {localSettings.translateProvider === 'libretranslate' ? (
        <div className="space-y-2 pt-2 border-t border-dark-border/60">
          <label className="font-bold text-slate-200 block">LibreTranslate base URL:</label>
          <input
            value={localSettings.libreTranslateBaseUrl || ''}
            onChange={(e) => onChange({ libreTranslateBaseUrl: e.target.value })}
            type="url"
            placeholder="https://libretranslate.com"
            className="w-full bg-dark-muted border border-dark-border rounded-xl px-3 py-2 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-teal-500 font-mono"
          />
          <label className="font-bold text-slate-200 block">LibreTranslate API key (optional):</label>
          <input
            value={localSettings.libreTranslateApiKey || ''}
            onChange={(e) => onChange({ libreTranslateApiKey: e.target.value })}
            type="password"
            placeholder="LibreTranslate API key"
            className="w-full bg-dark-muted border border-dark-border rounded-xl px-3 py-2 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-teal-500 font-mono"
          />
        </div>
      ) : null}

      <div className="space-y-2 pt-2 border-t border-dark-border/60">
        <label className="font-bold text-slate-200 block">📚 Default Dictionary Provider:</label>
        <select
          value={localSettings.dictionaryProvider || 'free_dictionary'}
          onChange={(e) =>
            onChange({ dictionaryProvider: e.target.value as AppSettings['dictionaryProvider'] })
          }
          className="w-full bg-dark-muted border border-dark-border text-slate-200 text-sm font-medium rounded-xl px-3 py-2 outline-none focus:border-teal-500 cursor-pointer"
        >
          <option value="free_dictionary">🌐 Free Dictionary API (Google Baseline)</option>
          <option value="wiktionary">📖 Wiktionary Open API</option>
          <option value="datamuse">⚡ Datamuse (keyless collocations)</option>
          <option value="wikipedia">📰 Wikipedia Summary</option>
          <option value="urban_dictionary">💬 Urban Dictionary (slang)</option>
          <option value="google_translate">🌐 Google Translate API</option>
        </select>
      </div>

      <div className="space-y-2 pt-2 border-t border-dark-border/60">
        <label className="font-bold text-slate-200 block">🔎 Test dictionary connection:</label>
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              ['free_dictionary', 'Test Free Dictionary'],
              ['wiktionary', 'Test Wiktionary'],
              ['datamuse', 'Test Datamuse'],
              ['wikipedia', 'Test Wikipedia'],
              ['urban_dictionary', 'Test Urban Dictionary'],
              ['rhymebrain', 'Test RhymeBrain'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className="px-2 py-1.5 rounded-lg bg-dark-muted border border-dark-border text-sm font-bold cursor-pointer"
              disabled={connectionBusy[id]}
              onClick={() => onTestDictionary(id)}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-400">{lastDictStatus}</p>
      </div>

      <div className="space-y-2 pt-2 border-t border-dark-border/60">
        <label className="font-bold text-slate-200 block">🔊 Speech Synthesis Voice (TTS Voice):</label>
        <select
          value={localSettings.pronunciationVoiceURI || ''}
          onChange={(e) => onChange({ pronunciationVoiceURI: e.target.value })}
          className="w-full bg-dark-muted border border-dark-border text-slate-200 text-sm font-medium rounded-xl px-3 py-2 outline-none focus:border-teal-500 cursor-pointer"
        >
          <option value="">Auto-select system default voice</option>
          {availableVoices.map((voice) => (
            <option key={voice.voiceURI} value={voice.voiceURI}>
              {voice.name} ({voice.lang})
            </option>
          ))}
        </select>

        <div className="flex items-center gap-3 pt-1">
          <span className="text-slate-300 font-bold">Speech Rate:</span>
          <input
            type="range"
            value={localSettings.pronunciationRate ?? 0.95}
            min={0.5}
            max={1.5}
            step={0.05}
            onChange={(e) => onChange({ pronunciationRate: Number(e.target.value) })}
            className="flex-1 accent-teal-500 cursor-pointer"
          />
          <span className="font-mono text-teal-400 font-bold w-10 text-right">
            {localSettings.pronunciationRate}x
          </span>
        </div>
      </div>
    </div>
  );
};

export default TabSources;
