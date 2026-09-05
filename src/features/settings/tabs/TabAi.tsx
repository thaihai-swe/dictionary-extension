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
    <div className="space-y-4 font-sans text-xs">
      {/* Enable AI Assistant */}
      <div className="space-y-2">
        <label className="flex items-center justify-between cursor-pointer p-2 rounded-xl hover:bg-muted transition-colors">
          <div>
            <span className="font-bold text-content block text-xs">
              Enable AI Assistant &amp; Smart Analysis
            </span>
            <span className="text-[11px] text-content-muted block">
              Contextual analysis, grammar nuance, breakdown, and confusable comparison
            </span>
          </div>
          <input
            type="checkbox"
            checked={localSettings.enableAI !== false}
            onChange={(e) => onChange({ enableAI: e.target.checked })}
            className="w-4 h-4 cursor-pointer"
          />
        </label>
      </div>

      {/* AI Preload Background */}
      <div className="space-y-2 pt-2 border-t border-border/60">
        <label className="flex items-center justify-between cursor-pointer p-2 rounded-xl hover:bg-muted transition-colors">
          <div>
            <span className="font-bold text-content block text-xs">
              Background AI Preload on Text Selection
            </span>
            <span className="text-[11px] text-content-muted block">
              Pre-fetches explanations when text is highlighted so results appear instantly
            </span>
          </div>
          <input
            type="checkbox"
            checked={Boolean(localSettings.enableAiPreload)}
            onChange={(e) => onChange({ enableAiPreload: e.target.checked })}
            className="w-4 h-4 cursor-pointer"
          />
        </label>
      </div>

      {/* Phrase Fallback */}
      <div className="space-y-2 pt-2 border-t border-border/60">
        <label className="flex items-center justify-between cursor-pointer p-2 rounded-xl hover:bg-muted transition-colors">
          <div>
            <span className="font-bold text-content block text-xs">
              Use AI when a phrase has no dictionary definition
            </span>
            <span className="text-[11px] text-content-muted block">
              Automatically provides AI explanations for idioms and multi-word phrases
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

      {/* Provider Selector: Gemini vs OpenAI Standard */}
      <div className="space-y-2 pt-3 border-t border-border/60">
        <label className="font-bold text-content-secondary uppercase tracking-wider text-[11px] block">
          AI Provider Engine
        </label>
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
            <span className="text-[10px] opacity-75 font-normal">(Default)</span>
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
            <span>OpenAI Standard</span>
            <span className="text-[10px] opacity-75 font-normal">(Ollama, etc.)</span>
          </button>
        </div>
      </div>

      {/* OpenAI Standard Base URL */}
      {isOpenAi && (
        <div className="space-y-2 pt-2 border-t border-border/60">
          <div className="flex items-center justify-between">
            <label className="font-bold text-content-secondary uppercase tracking-wider text-[11px]">
              API Base URL (OpenAI Standard)
            </label>
            <span className="text-[10px] text-content-muted">
              POST /chat/completions
            </span>
          </div>
          <input
            value={localSettings.aiBaseUrl || DEFAULT_OPENAI_BASE_URL}
            onChange={(e) => onChange({ aiBaseUrl: e.target.value })}
            type="text"
            placeholder={DEFAULT_OPENAI_BASE_URL}
            className="w-full bg-muted border border-border rounded-xl px-3 py-2 text-xs text-content placeholder:text-content-muted outline-none focus:border-accent font-mono shadow-xs"
          />
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {[
              [DEFAULT_OPENAI_BASE_URL, 'Default (localhost:20128)'],
              ['http://localhost:11434/v1', 'Ollama (localhost:11434)'],
              ['https://api.openai.com/v1', 'ChatGPT (OpenAI)'],
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
      )}

      {/* API Key */}
      <div className="space-y-2 pt-2 border-t border-border/60">
        <div className="flex items-center justify-between">
          <label className="font-bold text-content-secondary uppercase tracking-wider text-[11px]">
            {isOpenAi ? 'API Key (Optional for Local / Ollama)' : 'Google Gemini API Key'}
          </label>
          {!isOpenAi && (
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noreferrer"
              className="text-xs text-accent hover:underline flex items-center gap-1 font-semibold"
            >
              <span>Get Free Key</span>
              <IconExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>

        <input
          value={localSettings.aiApiKey || ''}
          onChange={(e) => onChange({ aiApiKey: e.target.value })}
          type="password"
          placeholder={isOpenAi ? 'sk-... (leave blank for local Ollama / proxy)' : 'Paste Gemini API Key (AIzaSy...)'}
          className="w-full bg-muted border border-border rounded-xl px-3 py-2.5 text-xs text-content placeholder:text-content-muted outline-none focus:border-accent font-mono shadow-xs"
        />
        <p className="text-[11px] text-content-muted">
          {isOpenAi
            ? 'Stored locally on this device. Leave blank if your local OpenAI server or Ollama does not require an API key.'
            : 'Stored locally on this device via Chrome secure storage. Never exported in backups.'}
        </p>
      </div>

      {/* Model Selection */}
      <div className="space-y-2 pt-2 border-t border-border/60">
        <div className="flex items-center justify-between">
          <label className="font-bold text-content-secondary uppercase tracking-wider text-[11px]">
            {isOpenAi ? 'OpenAI Model' : 'Gemini Model'}
          </label>
          {!isOpenAi && (
            <button
              type="button"
              onClick={onToggleManualModel}
              className="text-[11px] px-2.5 py-1 rounded-lg bg-muted hover:bg-elevated text-accent font-semibold border border-border cursor-pointer transition-colors"
            >
              {isManualModelInput ? 'Select Presets' : 'Custom Model ID'}
            </button>
          )}
        </div>

        {isOpenAi || isManualModelInput ? (
          <input
            value={localSettings.aiModel || ''}
            onChange={(e) => onChange({ aiModel: e.target.value })}
            type="text"
            placeholder={isOpenAi ? 'Model name as required by your server' : 'Enter custom Gemini model ID (e.g. gemini-3.5-flash-lite)...'}
            className="w-full bg-muted border border-border rounded-xl px-3 py-2 text-xs text-content placeholder:text-content-muted outline-none focus:border-accent font-mono shadow-xs"
          />
        ) : (
          <select
            value={localSettings.aiModel || DEFAULT_GEMINI_MODEL}
            onChange={(e) => onChange({ aiModel: e.target.value })}
            className="w-full bg-muted border border-border text-content text-xs font-medium rounded-xl px-3 py-2.5 outline-none focus:border-accent cursor-pointer shadow-xs"
          >
            <option value={DEFAULT_GEMINI_MODEL} className="bg-surface text-content">{DEFAULT_GEMINI_MODEL} (Recommended · Ultra Fast &amp; Smart)</option>
          </select>
        )}
      </div>

      {/* Test Connection Button */}
      <div className="pt-2 border-t border-border/60">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="px-3 py-1.5 rounded-lg bg-muted hover:bg-elevated border border-border text-xs font-semibold text-content-secondary hover:text-accent cursor-pointer shadow-xs flex items-center gap-1.5 active:scale-95"
            disabled={connectionBusy.ai}
            onClick={onTestAi}
          >
            {connectionBusy.ai ? <IconSpinner className="w-3.5 h-3.5 text-accent" /> : <IconSparkles className="w-3.5 h-3.5 text-accent" />}
            <span>Test {isOpenAi ? 'OpenAI' : 'Gemini'} Connection</span>
          </button>
          {connectionStatus.ai && (
            <span className="text-[11px] px-2 py-0.5 rounded-md bg-muted border border-border text-accent font-mono">
              {connectionStatus.ai}
            </span>
          )}
        </div>
      </div>

      {/* Prompt Templates */}
      <div className="space-y-3 pt-3 border-t border-border/60">
        <div className="flex items-center justify-between">
          <label className="font-bold text-content-secondary uppercase tracking-wider text-[11px]">
            Prompt Templates
          </label>
          <button
            type="button"
            className="text-[11px] px-2.5 py-1 rounded-lg bg-muted hover:bg-elevated text-accent font-semibold border border-border cursor-pointer transition-colors"
            onClick={onRestoreAllPrompts}
          >
            Reset All Prompts
          </button>
        </div>

        <div className="space-y-3">
          {promptEditors.map(({ key, label }) => (
            <div key={key} className="p-3 rounded-xl border border-border bg-surface space-y-2 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-content text-xs flex items-center gap-1.5">
                  <IconEdit className="w-3.5 h-3.5 text-accent" />
                  <span>{label}</span>
                </span>
                <button
                  type="button"
                  onClick={() => onRestorePrompt(key)}
                  className="text-[11px] text-content-muted hover:text-accent underline cursor-pointer"
                >
                  Restore default
                </button>
              </div>
              <textarea
                value={String(localSettings[key] || '')}
                onChange={(e) => onChange({ [key]: e.target.value })}
                rows={4}
                className="w-full bg-muted border border-border rounded-lg p-2.5 text-xs text-content font-mono outline-none focus:border-accent leading-relaxed"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TabAi;
