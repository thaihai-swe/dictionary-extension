import React from 'react';
import { AppSettings } from '@/types';
import { cx } from '@/ui/cx';
import { IconEdit, IconExternalLink, IconSparkles, IconSpinner } from '@/components/icons';
import {
  DEFAULT_GEMINI_BASE_URL,
  DEFAULT_GEMINI_MODEL,
  DEFAULT_OPENAI_BASE_URL,
  isOpenAiStandard,
} from '@/shared/settings';

interface TabAiProps {
  localSettings: AppSettings;
  isManualModelInput: boolean;
  connectionStatus: Record<string, string>;
  connectionBusy: Record<string, boolean>;
  promptEditors: Array<{ key: keyof AppSettings; label: string }>;
  onChange: (patch: Partial<AppSettings>) => void;
  onToggleManualModel: () => void;
  onTestAi: () => void;
  onRestorePrompt: (promptKey: keyof AppSettings) => void;
  onRestoreAllPrompts: () => void;
}

export const TabAi: React.FC<TabAiProps> = ({
  localSettings,
  isManualModelInput,
  connectionStatus,
  connectionBusy,
  promptEditors,
  onChange,
  onToggleManualModel,
  onTestAi,
  onRestorePrompt,
  onRestoreAllPrompts,
}) => {
  const isOpenAi = isOpenAiStandard(localSettings);

  return (
    <div className="space-y-6 font-sans text-xs">
      <section className="bg-surface border border-border rounded-xl p-5 space-y-3 shadow-xs">
        <div>
          <h3 className="text-sm font-bold text-content font-heading">AI features</h3>
          <p className="text-[11.5px] text-content-muted">
            Contextual analysis, grammar, breakdown, and confusable comparison.
          </p>
        </div>
        <div className="space-y-1 divide-y divide-border/40">
          <label className="flex items-center justify-between cursor-pointer py-2.5 hover:bg-muted/30 px-1 rounded-lg transition-colors">
            <div className="pr-4">
              <span className="font-semibold text-content text-xs block">Enable AI Assistant</span>
              <span className="text-[11px] text-content-muted block">
                Smart analysis tab and related intents
              </span>
            </div>
            <input
              type="checkbox"
              checked={localSettings.enableAI !== false}
              onChange={(e) => onChange({ enableAI: e.target.checked })}
              className="w-4 h-4 cursor-pointer"
            />
          </label>
          <label className="flex items-center justify-between cursor-pointer py-2.5 hover:bg-muted/30 px-1 rounded-lg transition-colors">
            <div className="pr-4">
              <span className="font-semibold text-content text-xs block">Preload on selection</span>
              <span className="text-[11px] text-content-muted block">
                Fetch explanations in the background so the AI tab feels instant
              </span>
            </div>
            <input
              type="checkbox"
              checked={Boolean(localSettings.enableAiPreload)}
              onChange={(e) => onChange({ enableAiPreload: e.target.checked })}
              className="w-4 h-4 cursor-pointer"
            />
          </label>
          <label className="flex items-center justify-between cursor-pointer py-2.5 hover:bg-muted/30 px-1 rounded-lg transition-colors">
            <div className="pr-4">
              <span className="font-semibold text-content text-xs block">Phrase fallback</span>
              <span className="text-[11px] text-content-muted block">
                Use AI when a multi-word phrase has no dictionary entry
              </span>
            </div>
            <input
              type="checkbox"
              checked={Boolean(localSettings.enablePhraseFallback)}
              onChange={(e) => onChange({ enablePhraseFallback: e.target.checked })}
              className="w-4 h-4 cursor-pointer"
            />
          </label>
        </div>
      </section>

      <section className="bg-surface border border-border rounded-xl p-5 space-y-4 shadow-xs">
        <div>
          <h3 className="text-sm font-bold text-content font-heading">Provider</h3>
          <p className="text-[11.5px] text-content-muted">
            Gemini by default, or any OpenAI-compatible server (Ollama, local proxy).
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 p-1 bg-muted rounded-xl border border-border">
          <button
            type="button"
            onClick={() => {
              onChange({
                aiProvider: 'gemini',
                aiModel: DEFAULT_GEMINI_MODEL,
                aiBaseUrl: DEFAULT_GEMINI_BASE_URL,
              });
            }}
            className={cx(
              'py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer',
              !isOpenAi
                ? 'bg-surface text-accent border border-border shadow-xs'
                : 'text-content-muted hover:text-content',
            )}
          >
            <span>Google Gemini</span>
            <span className="text-[10px] opacity-75 font-normal">Default</span>
          </button>
          <button
            type="button"
            onClick={() => {
              onChange({
                aiProvider: 'openai',
                aiModel: '',
                aiBaseUrl: DEFAULT_OPENAI_BASE_URL,
              });
            }}
            className={cx(
              'py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer',
              isOpenAi
                ? 'bg-surface text-accent border border-border shadow-xs'
                : 'text-content-muted hover:text-content',
            )}
          >
            <span>OpenAI-compatible</span>
            <span className="text-[10px] opacity-75 font-normal">Ollama, etc.</span>
          </button>
        </div>

        {isOpenAi ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-bold text-content-secondary uppercase tracking-wider text-[11px]">
                API base URL
              </label>
              <span className="text-[10px] text-content-muted">POST /chat/completions</span>
            </div>
            <input
              value={localSettings.aiBaseUrl || DEFAULT_OPENAI_BASE_URL}
              onChange={(e) => onChange({ aiBaseUrl: e.target.value })}
              type="text"
              placeholder={DEFAULT_OPENAI_BASE_URL}
              className="w-full bg-muted border border-border rounded-xl px-3 py-2 text-xs text-content placeholder:text-content-muted outline-none focus:border-accent font-mono shadow-xs"
            />
            <div className="flex flex-wrap gap-1.5">
              {[
                [DEFAULT_OPENAI_BASE_URL, 'localhost:20128'],
                ['http://localhost:11434/v1', 'Ollama'],
                ['https://api.openai.com/v1', 'OpenAI'],
              ].map(([url, label]) => (
                <button
                  key={url}
                  type="button"
                  onClick={() => onChange({ aiBaseUrl: url })}
                  className="text-[11px] px-2 py-0.5 rounded-md bg-muted hover:bg-elevated border border-border text-content-secondary hover:text-accent font-mono cursor-pointer transition-colors"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="font-bold text-content-secondary uppercase tracking-wider text-[11px]">
              {isOpenAi ? 'API key (optional for local)' : 'Gemini API key'}
            </label>
            {!isOpenAi ? (
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-xs text-accent hover:underline flex items-center gap-1 font-semibold"
              >
                <span>Get free key</span>
                <IconExternalLink className="w-3 h-3" />
              </a>
            ) : null}
          </div>
          <input
            value={localSettings.aiApiKey || ''}
            onChange={(e) => onChange({ aiApiKey: e.target.value })}
            type="password"
            placeholder={isOpenAi ? 'sk-… (blank for local Ollama)' : 'AIzaSy…'}
            className="w-full bg-muted border border-border rounded-xl px-3 py-2.5 text-xs text-content placeholder:text-content-muted outline-none focus:border-accent font-mono shadow-xs"
          />
          <p className="text-[11px] text-content-muted">
            Stored locally. Never included in JSON backups.
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="font-bold text-content-secondary uppercase tracking-wider text-[11px]">
              {isOpenAi ? 'Model' : 'Gemini model'}
            </label>
            {!isOpenAi ? (
              <button
                type="button"
                onClick={onToggleManualModel}
                className="text-[11px] px-2.5 py-1 rounded-lg bg-muted hover:bg-elevated text-accent font-semibold border border-border cursor-pointer transition-colors"
              >
                {isManualModelInput ? 'Use preset' : 'Custom ID'}
              </button>
            ) : null}
          </div>
          {isOpenAi || isManualModelInput ? (
            <input
              value={localSettings.aiModel || ''}
              onChange={(e) => onChange({ aiModel: e.target.value })}
              type="text"
              placeholder={isOpenAi ? 'Model name your server expects' : 'e.g. gemini-3.5-flash-lite'}
              className="w-full bg-muted border border-border rounded-xl px-3 py-2 text-xs text-content placeholder:text-content-muted outline-none focus:border-accent font-mono shadow-xs"
            />
          ) : (
            <select
              value={localSettings.aiModel || DEFAULT_GEMINI_MODEL}
              onChange={(e) => onChange({ aiModel: e.target.value })}
              className="w-full bg-muted border border-border text-content text-xs font-medium rounded-xl px-3 py-2.5 outline-none focus:border-accent cursor-pointer shadow-xs"
            >
              <option value={DEFAULT_GEMINI_MODEL} className="bg-surface text-content">
                {DEFAULT_GEMINI_MODEL} (recommended)
              </option>
            </select>
          )}
        </div>

        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            className="px-3 py-1.5 rounded-lg bg-muted hover:bg-elevated border border-border text-xs font-semibold text-content-secondary hover:text-accent cursor-pointer shadow-xs flex items-center gap-1.5 active:scale-95"
            disabled={connectionBusy.ai}
            onClick={onTestAi}
          >
            {connectionBusy.ai ? (
              <IconSpinner className="w-3.5 h-3.5 text-accent" />
            ) : (
              <IconSparkles className="w-3.5 h-3.5 text-accent" />
            )}
            <span>Test {isOpenAi ? 'OpenAI' : 'Gemini'} connection</span>
          </button>
          {connectionStatus.ai ? (
            <span className="text-[11px] px-2 py-0.5 rounded-md bg-muted border border-border text-accent font-mono">
              {connectionStatus.ai}
            </span>
          ) : null}
        </div>
      </section>

      <section className="bg-surface border border-border rounded-xl p-5 space-y-3 shadow-xs">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-content font-heading">Prompt templates</h3>
            <p className="text-[11.5px] text-content-muted">
              Advanced. Defaults work for most lookups.
            </p>
          </div>
          <button
            type="button"
            className="text-[11px] px-2.5 py-1 rounded-lg bg-muted hover:bg-elevated text-accent font-semibold border border-border cursor-pointer transition-colors shrink-0"
            onClick={onRestoreAllPrompts}
          >
            Reset all
          </button>
        </div>
        <div className="space-y-2">
          {promptEditors.map(({ key, label }) => (
            <details key={key} className="rounded-xl border border-border bg-muted/20">
              <summary className="px-3 py-2.5 cursor-pointer flex items-center justify-between gap-2 list-none">
                <span className="font-bold text-content text-xs flex items-center gap-1.5">
                  <IconEdit className="w-3.5 h-3.5 text-accent" />
                  {label}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    onRestorePrompt(key);
                  }}
                  className="text-[11px] text-content-muted hover:text-accent underline cursor-pointer"
                >
                  Restore default
                </button>
              </summary>
              <div className="px-3 pb-3">
                <textarea
                  value={String(localSettings[key] || '')}
                  onChange={(e) => onChange({ [key]: e.target.value })}
                  rows={5}
                  className="w-full bg-muted border border-border rounded-lg p-2.5 text-xs text-content font-mono outline-none focus:border-accent leading-relaxed"
                />
              </div>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
};

export default TabAi;
