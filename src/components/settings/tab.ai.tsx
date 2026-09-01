import React from 'react';
import { DEFAULT_AI_PROMPTS } from '../../shared/ai-prompts';
import { AppSettings } from '../../types';

interface TabAiProps {
  localSettings: AppSettings;
  isManualModelInput: boolean;
  connectionStatus: Record<string, string>;
  connectionBusy: Record<string, boolean>;
  promptEditors: Array<{ key: keyof AppSettings; label: string }>;
  onChange: (patch: Partial<AppSettings>) => void;
  onToggleManualModel: () => void;
  onTestAi: () => void;
  onRestorePrompt: (key: keyof AppSettings) => void;
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
    <div className="space-y-3.5">
      <div className="space-y-2">
        <label className="flex items-center justify-between cursor-pointer">
          <span className="font-bold text-slate-200">✨ Enable AI Assistant Features:</span>
          <input
            type="checkbox"
            checked={localSettings.enableAI !== false}
            onChange={(e) => onChange({ enableAI: e.target.checked })}
            className="accent-teal-500 w-4 h-4 cursor-pointer"
          />
        </label>
      </div>

      <div className="space-y-2 pt-2 border-t border-dark-border/60">
        <label className="flex items-center justify-between cursor-pointer">
          <div>
            <span className="font-bold text-slate-200 block">⚡ Enable AI Preload (Background Pre-fetch):</span>
            <span className="text-xs text-slate-400 block">
              After Dictionary lookup finishes, load Main AI first, then Context, Grammar, and the other intents in the
              background.
            </span>
          </div>
          <input
            type="checkbox"
            checked={Boolean(localSettings.enableAiPreload)}
            onChange={(e) => onChange({ enableAiPreload: e.target.checked })}
            className="accent-teal-500 w-4 h-4 cursor-pointer flex-shrink-0 ml-2"
          />
        </label>
      </div>

      <div className="space-y-2 pt-2 border-t border-dark-border/60">
        <label className="flex items-center justify-between cursor-pointer">
          <div>
            <span className="font-bold text-slate-200 block">
              💬 Use AI when a phrase has no dictionary definition:
            </span>
            <span className="text-xs text-slate-400 block">
              Only runs when AI is enabled. Explains idioms dictionary backends miss.
            </span>
          </div>
          <input
            type="checkbox"
            checked={Boolean(localSettings.enablePhraseFallback)}
            onChange={(e) => onChange({ enablePhraseFallback: e.target.checked })}
            className="accent-teal-500 w-4 h-4 cursor-pointer flex-shrink-0 ml-2"
          />
        </label>
      </div>

      <div className="space-y-2 pt-2 border-t border-dark-border/60">
        <label className="font-bold text-slate-200 block flex items-center justify-between">
          <span>🔑 Google Gemini API Key:</span>
          <a
            href="https://aistudio.google.com/app/apikey"
            target="_blank"
            rel="noreferrer"
            className="text-xs text-teal-400 hover:underline flex items-center gap-1"
          >
            <span>Get Free API Key ↗</span>
          </a>
        </label>

        <input
          value={localSettings.aiApiKey || ''}
          onChange={(e) => onChange({ aiApiKey: e.target.value })}
          type="password"
          placeholder="Paste API Key (AIzaSy...)"
          className="w-full bg-dark-muted border border-dark-border rounded-xl px-3 py-2 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-teal-500 transition-all font-mono"
        />
        <p className="text-xs text-slate-400 leading-normal">
          Stored only on this device in `chrome.storage.local`. It is not synced and is never exported. Leave blank to
          keep the current key.
        </p>
      </div>

      <div className="space-y-2 pt-2 border-t border-dark-border/60">
        <div className="flex items-center justify-between">
          <label className="font-bold text-slate-200">🤖 AI Model (Gemini Model):</label>
          <button
            type="button"
            onClick={onToggleManualModel}
            className="text-xs px-2 py-0.5 rounded bg-dark-muted hover:bg-dark-border text-teal-400 font-bold border border-dark-border transition-colors cursor-pointer"
          >
            {isManualModelInput ? '📋 Preset List' : '✏️ Custom Model ID'}
          </button>
        </div>

        {!isManualModelInput ? (
          <select
            value={localSettings.aiModel || 'gemini-2.5-flash'}
            onChange={(e) => onChange({ aiModel: e.target.value })}
            className="w-full bg-dark-muted border border-dark-border text-slate-200 text-sm font-medium rounded-xl px-3 py-2 outline-none focus:border-teal-500 cursor-pointer"
          >
            <option value="gemini-2.5-flash">⚡ gemini-2.5-flash (Recommended - Fast &amp; Smart)</option>
            <option value="gemini-3.5-flash-lite">🚀 gemini-3.5-flash-lite (Maximum Speed)</option>
            <option value="gemini-1.5-flash">✨ gemini-1.5-flash (Standard Baseline)</option>
            <option value="gemini-1.5-pro">🧠 gemini-1.5-pro (Deep Analysis)</option>
          </select>
        ) : (
          <input
            value={localSettings.aiModel || ''}
            onChange={(e) => onChange({ aiModel: e.target.value })}
            type="text"
            placeholder="Enter custom Gemini model ID (e.g. gemini-2.5-pro)..."
            className="w-full bg-dark-muted border border-dark-border rounded-xl px-3 py-2 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-teal-500 transition-all font-mono"
          />
        )}
      </div>

      <div className="space-y-2 pt-2 border-t border-dark-border/60">
        <label className="font-bold text-slate-200 block">🔗 Custom AI Base URL (Optional Endpoint):</label>
        <input
          value={localSettings.aiBaseUrl || ''}
          onChange={(e) => onChange({ aiBaseUrl: e.target.value })}
          type="text"
          placeholder="https://generativelanguage.googleapis.com"
          className="w-full bg-dark-muted border border-dark-border rounded-xl px-3 py-2 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-teal-500 transition-all font-mono"
        />
        <p className="text-xs text-slate-400">
          Gemini URLs use generateContent. Any other URL is treated as OpenAI-compatible /chat/completions.
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="px-2.5 py-1.5 rounded-lg bg-dark-muted border border-dark-border text-sm font-bold text-slate-200 hover:border-teal-500 cursor-pointer"
            disabled={connectionBusy.ai}
            onClick={onTestAi}
          >
            Test AI connection
          </button>
          <span className="text-xs text-slate-400">{connectionStatus.ai}</span>
        </div>
      </div>

      <div className="space-y-3 pt-2 border-t border-dark-border/60">
        <div className="flex items-center justify-between">
          <label className="font-bold text-slate-200">📝 Prompt templates</label>
          <button
            type="button"
            className="text-xs px-2 py-0.5 rounded bg-dark-muted hover:bg-dark-border text-teal-400 font-bold border border-dark-border cursor-pointer"
            onClick={onRestoreAllPrompts}
          >
            Restore all defaults
          </button>
        </div>
        <p className="text-xs text-slate-400">
          These are the live prompts sent to Gemini. Edit to customize. Variables:{' '}
          <code>{'{{str}}'}</code>, <code>{'{{text}}'}</code>, <code>{'{{sentence}}'}</code>,{' '}
          <code>{'{{context}}'}</code>, <code>{'{{targetLang}}'}</code>, <code>{'{{word_count}}'}</code>
        </p>
        {promptEditors.map((editor) => {
          const stored = String((localSettings as unknown as Record<string, unknown>)[editor.key] || '');
          const fallback = DEFAULT_AI_PROMPTS[editor.key as keyof typeof DEFAULT_AI_PROMPTS] || '';
          return (
            <div key={editor.key} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-slate-300">{editor.label}</span>
                <button
                  type="button"
                  className="text-xs text-teal-400 font-bold cursor-pointer"
                  onClick={() => onRestorePrompt(editor.key)}
                >
                  Restore default
                </button>
              </div>
              <textarea
                value={stored.trim() ? stored : fallback}
                onChange={(e) => onChange({ [editor.key]: e.target.value } as Partial<AppSettings>)}
                rows={12}
                spellCheck={false}
                className="w-full min-h-[12rem] bg-dark-muted border border-dark-border rounded-xl px-3 py-2 text-xs leading-relaxed text-slate-100 placeholder-slate-500 outline-none focus:border-teal-500 font-mono"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TabAi;
