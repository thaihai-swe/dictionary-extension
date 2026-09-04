import React from 'react';
import { AppSettings } from '../../types';
import { IconEdit, IconExternalLink, IconSparkles, IconSpinner } from '../icons';

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
  return (
    <div className="space-y-4 font-sans text-xs">
      {/* Enable AI Assistant */}
      <div className="space-y-2">
        <label className="flex items-center justify-between cursor-pointer p-2 rounded-xl hover:bg-muted transition-colors">
          <div>
            <span className="font-bold text-content block text-xs">
              Enable Gemini AI Assistant &amp; Smart Analysis
            </span>
            <span className="text-[11px] text-content-muted block">
              Enables contextual analysis, grammar nuance, breakdown, and confusable comparison
            </span>
          </div>
          <input
            type="checkbox"
            checked={localSettings.enableAI !== false}
            onChange={(e) => onChange({ enableAI: e.target.checked })}
            className="accent-teal-500 w-4 h-4 cursor-pointer"
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
            className="accent-teal-500 w-4 h-4 cursor-pointer"
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
            className="accent-teal-500 w-4 h-4 cursor-pointer"
          />
        </label>
      </div>

      {/* Gemini API Key */}
      <div className="space-y-2 pt-3 border-t border-border/60">
        <div className="flex items-center justify-between">
          <label className="font-bold text-content-secondary uppercase tracking-wider text-[11px]">
            Google Gemini API Key
          </label>
          <a
            href="https://aistudio.google.com/app/apikey"
            target="_blank"
            rel="noreferrer"
            className="text-xs text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1 font-semibold"
          >
            <span>Get Free Key</span>
            <IconExternalLink className="w-3 h-3" />
          </a>
        </div>

        <input
          value={localSettings.aiApiKey || ''}
          onChange={(e) => onChange({ aiApiKey: e.target.value })}
          type="password"
          placeholder="Paste Gemini API Key (AIzaSy...)"
          className="w-full bg-muted border border-border rounded-xl px-3 py-2.5 text-xs text-content placeholder:text-content-muted outline-none focus:border-teal-500 font-mono shadow-xs"
        />
        <p className="text-[11px] text-content-muted">
          Stored locally on this device via Chrome secure storage. Never exported in backups.
        </p>
      </div>

      {/* Model Selection */}
      <div className="space-y-2 pt-3 border-t border-border/60">
        <div className="flex items-center justify-between">
          <label className="font-bold text-content-secondary uppercase tracking-wider text-[11px]">
            Gemini Model
          </label>
          <button
            type="button"
            onClick={onToggleManualModel}
            className="text-[11px] px-2.5 py-1 rounded-lg bg-muted hover:bg-elevated text-teal-600 dark:text-teal-300 font-semibold border border-border cursor-pointer transition-colors"
          >
            {isManualModelInput ? 'Select Presets' : 'Custom Model ID'}
          </button>
        </div>

        {!isManualModelInput ? (
          <select
            value={localSettings.aiModel || 'gemini-3.5-flash-lite'}
            onChange={(e) => onChange({ aiModel: e.target.value })}
            className="w-full bg-muted border border-border text-content text-xs font-medium rounded-xl px-3 py-2.5 outline-none focus:border-teal-500 cursor-pointer shadow-xs"
          >
            <option value="gemini-3.5-flash-lite" className="bg-surface text-content">gemini-3.5-flash-lite (Recommended · Ultra Fast &amp; Smart)</option>
          </select>
        ) : (
          <input
            value={localSettings.aiModel || ''}
            onChange={(e) => onChange({ aiModel: e.target.value })}
            type="text"
            placeholder="Enter custom Gemini model ID (e.g. gemini-3.5-flash-lite)..."
            className="w-full bg-muted border border-border rounded-xl px-3 py-2 text-xs text-content placeholder:text-content-muted outline-none focus:border-teal-500 font-mono shadow-xs"
          />
        )}
      </div>

      {/* Custom AI Base URL */}
      <div className="space-y-2 pt-3 border-t border-border/60">
        <label className="font-bold text-content-secondary block uppercase tracking-wider text-[11px]">
          Custom AI Endpoint Base URL (Optional)
        </label>
        <input
          value={localSettings.aiBaseUrl || ''}
          onChange={(e) => onChange({ aiBaseUrl: e.target.value })}
          type="text"
          placeholder="https://generativelanguage.googleapis.com"
          className="w-full bg-muted border border-border rounded-xl px-3 py-2 text-xs text-content placeholder:text-content-muted outline-none focus:border-teal-500 font-mono shadow-xs"
        />
        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            className="px-3 py-1.5 rounded-lg bg-muted hover:bg-elevated border border-border text-xs font-semibold text-content-secondary hover:text-teal-600 dark:hover:text-teal-300 cursor-pointer shadow-xs flex items-center gap-1.5 active:scale-95"
            disabled={connectionBusy.ai}
            onClick={onTestAi}
          >
            {connectionBusy.ai ? <IconSpinner className="w-3.5 h-3.5 text-teal-500 dark:text-teal-400" /> : <IconSparkles className="w-3.5 h-3.5 text-teal-500 dark:text-teal-400" />}
            <span>Test AI Connection</span>
          </button>
          {connectionStatus.ai && (
            <span className="text-[11px] px-2 py-0.5 rounded-md bg-muted border border-border text-teal-600 dark:text-teal-300 font-mono">
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
            className="text-[11px] px-2.5 py-1 rounded-lg bg-muted hover:bg-elevated text-teal-600 dark:text-teal-300 font-semibold border border-border cursor-pointer transition-colors"
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
                  <IconEdit className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                  <span>{label}</span>
                </span>
                <button
                  type="button"
                  onClick={() => onRestorePrompt(key)}
                  className="text-[10px] text-content-muted hover:text-teal-600 dark:hover:text-teal-300 underline cursor-pointer"
                >
                  Restore default
                </button>
              </div>
              <textarea
                value={String(localSettings[key] || '')}
                onChange={(e) => onChange({ [key]: e.target.value })}
                rows={4}
                className="w-full bg-muted border border-border rounded-lg p-2.5 text-xs text-content font-mono outline-none focus:border-teal-500 leading-relaxed"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TabAi;
