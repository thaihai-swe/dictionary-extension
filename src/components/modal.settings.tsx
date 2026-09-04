import React, { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import {
  canAccessSecretSettings,
  parsePublicSettingsImport,
  serializePublicSettings,
  useStorage,
  whenSettingsReady,
} from '../composables/composable.storage';
import { SECRET_SETTING_KEYS } from '../shared/settings-export';
import { requestProviderValidation } from '../shared/runtime-client';
import { DEFAULT_AI_PROMPTS } from '../shared/ai-prompts';
import { KNOWN_LANGUAGE_MAPPINGS } from '../shared/languages';
import { AppSettings } from '../types';
import { cx } from '../ui/cx';
import {
  IconBook,
  IconCheck,
  IconSearch,
  IconSettings,
  IconSparkles,
  IconSun,
} from './icons';

const TabAppearance = lazy(() => import('./settings/tab.appearance'));
const TabSources = lazy(() => import('./settings/tab.sources'));
const TabAi = lazy(() => import('./settings/tab.ai'));

type SettingsTab = 'general' | 'appearance' | 'sources' | 'ai';

const promptEditors: Array<{ key: keyof AppSettings; label: string }> = [
  { key: 'aiPromptTemplate', label: 'Main AI prompt' },
  { key: 'aiContextPromptTemplate', label: 'Context Explain prompt' },
  { key: 'aiGrammarPromptTemplate', label: 'Grammar & Nuance prompt' },
  { key: 'aiPhraseExplorerPromptTemplate', label: 'Phrase & Collocations prompt' },
  { key: 'aiSentencePromptTemplate', label: 'Sentence Breakdown prompt' },
  { key: 'aiComparePromptTemplate', label: 'Compare Confusables prompt' },
  { key: 'aiRephrasePromptTemplate', label: 'Rephrase prompt' },
];

const presetModels = [
  'gemini-3.5-flash-lite',
];

export const SettingsModal: React.FC = () => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const { settings, saveSettings } = useStorage();

  const [localSettings, setLocalSettings] = useState<AppSettings>({ ...settings });
  const [formHydrated, setFormHydrated] = useState(false);
  const [isSavedNotice, setIsSavedNotice] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [pausedSitesInput, setPausedSitesInput] = useState<string>('');
  const [isManualModelInput, setIsManualModelInput] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<Record<string, string>>({});
  const [connectionBusy, setConnectionBusy] = useState<Record<string, boolean>>({});
  const canEditApiKey = canAccessSecretSettings();

  const languageOptions = useMemo(() => {
    const custom = String(localSettings.customLanguages || '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
    const known = KNOWN_LANGUAGE_MAPPINGS.map((item) => item.name);
    return [...new Set([...custom, ...known, localSettings.translateTargetLanguage].filter(Boolean))];
  }, [localSettings.customLanguages, localSettings.translateTargetLanguage]);

  function loadVoices() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const voices = window.speechSynthesis.getVoices();
      setAvailableVoices(voices.filter((v) => v.lang.startsWith('en') || v.lang.startsWith('vi')));
    }
  }

  function applyStoreToLocal() {
    setLocalSettings((prev) => {
      const pendingSecrets: Partial<AppSettings> = {};
      for (const key of SECRET_SETTING_KEYS) {
        if (String(prev[key] || '').trim()) {
          pendingSecrets[key] = prev[key] as never;
        }
      }
      const merged = { ...settings, ...pendingSecrets };
      setPausedSitesInput(Array.isArray(merged.pausedHostnames) ? merged.pausedHostnames.join('\n') : '');
      setIsManualModelInput(Boolean(merged.aiModel && !presetModels.includes(merged.aiModel)));
      return merged;
    });
    setFormHydrated(true);
  }

  async function syncLocalFromStore() {
    await whenSettingsReady();
    applyStoreToLocal();
  }

  useEffect(() => {
    loadVoices();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
    void syncLocalFromStore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!formHydrated) return;
    setLocalSettings((prev) => {
      let updated = false;
      const next = { ...prev };
      for (const [key, value] of Object.entries(settings) as Array<[keyof AppSettings, unknown]>) {
        if (SECRET_SETTING_KEYS.includes(key as never)) continue;
        if (next[key] !== value) {
          next[key] = value as never;
          updated = true;
        }
      }
      return updated ? next : prev;
    });
  }, [settings, formHydrated]);

  function patchLocalSettings(patch: Partial<AppSettings>) {
    setLocalSettings((prev) => ({ ...prev, ...patch }));
  }

  function toggleManualModelMode() {
    setIsManualModelInput((prev) => !prev);
  }

  function restorePrompt(promptKey: keyof AppSettings) {
    const defaultPrompt = DEFAULT_AI_PROMPTS[promptKey as keyof typeof DEFAULT_AI_PROMPTS];
    if (defaultPrompt) {
      patchLocalSettings({ [promptKey]: defaultPrompt });
    }
  }

  function restoreAllPrompts() {
    patchLocalSettings({ ...DEFAULT_AI_PROMPTS });
  }

  async function handleSave() {
    const pausedList = pausedSitesInput
      .split('\n')
      .map((line) => line.trim().toLowerCase())
      .filter((line) => line.length > 0 && !line.startsWith('#'));

    const toSave: Partial<AppSettings> = {
      ...localSettings,
      pausedHostnames: pausedList,
    };

    if (!canEditApiKey) {
      for (const key of SECRET_SETTING_KEYS) {
        delete toSave[key];
      }
    }

    await saveSettings(toSave);
    setIsSavedNotice(true);
    setTimeout(() => {
      setIsSavedNotice(false);
    }, 2000);
  }

  function resetForm() {
    applyStoreToLocal();
  }

  function exportSettings() {
    const data = JSON.stringify(serializePublicSettings(localSettings), null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dictionary-settings-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function triggerImportFile() {
    const input = document.getElementById('settings-import-input') as HTMLInputElement;
    input?.click();
  }

  function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = evt.target?.result as string;
        const parsed = parsePublicSettingsImport(text);
        patchLocalSettings(parsed);
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Invalid settings JSON file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  async function testAiConnection() {
    setConnectionBusy((prev) => ({ ...prev, ai: true }));
    setConnectionStatus((prev) => ({ ...prev, ai: 'Testing…' }));
    try {
      const result = await requestProviderValidation('ai', undefined, localSettings);
      setConnectionStatus((prev) => ({
        ...prev,
        ai: result.ok ? result.message || 'Connected' : result.error || 'Failed',
      }));
    } catch (error) {
      setConnectionStatus((prev) => ({
        ...prev,
        ai: error instanceof Error ? error.message : 'Connection failed.',
      }));
    } finally {
      setConnectionBusy((prev) => ({ ...prev, ai: false }));
    }
  }

  async function testDictionaryConnection(providerId: string) {
    setConnectionBusy((prev) => ({ ...prev, [providerId]: true }));
    setConnectionStatus((prev) => ({ ...prev, [providerId]: 'Testing…' }));
    try {
      const result = await requestProviderValidation('dictionary', providerId, localSettings);
      setConnectionStatus((prev) => ({
        ...prev,
        [providerId]: result.ok ? result.message || 'Connected' : result.error || 'Failed',
      }));
    } catch (error) {
      setConnectionStatus((prev) => ({
        ...prev,
        [providerId]: error instanceof Error ? error.message : 'Connection failed.',
      }));
    } finally {
      setConnectionBusy((prev) => ({ ...prev, [providerId]: false }));
    }
  }

  async function testTranslationConnection() {
    const key = `translation:${localSettings.translateProvider || 'google'}`;
    setConnectionBusy((prev) => ({ ...prev, [key]: true }));
    setConnectionStatus((prev) => ({ ...prev, [key]: 'Testing…' }));
    try {
      const result = await requestProviderValidation('translation', undefined, localSettings);
      setConnectionStatus((prev) => ({
        ...prev,
        [key]: result.ok ? result.message || 'Connected' : result.error || 'Failed',
      }));
    } catch (error) {
      setConnectionStatus((prev) => ({
        ...prev,
        [key]: error instanceof Error ? error.message : 'Connection failed.',
      }));
    } finally {
      setConnectionBusy((prev) => ({ ...prev, [key]: false }));
    }
  }

  const isDarkMode =
    localSettings.theme === 'dark' ||
    (localSettings.theme !== 'light' &&
      typeof window !== 'undefined' &&
      Boolean(window.matchMedia?.('(prefers-color-scheme: dark)').matches));

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('dark', isDarkMode);
      document.documentElement.classList.toggle('light', !isDarkMode);
      document.documentElement.classList.toggle('light-theme', !isDarkMode);
      document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
    }
  }, [isDarkMode]);

  return (
    <div
      className={cx(
        'min-h-screen bg-paper text-content p-4 sm:p-6 flex items-start justify-center font-sans transition-colors',
        isDarkMode ? 'dark' : 'light-theme light',
      )}
      data-theme={isDarkMode ? 'dark' : 'light'}
    >
      <div className="w-full max-w-5xl bg-surface border border-border rounded-2xl p-6 sm:p-8 shadow-card-elevated space-y-6 text-sm flex flex-col my-4">
        {/* Settings Header */}
        <div className="flex items-center justify-between border-b border-border/60 pb-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-teal-500/15 border border-teal-500/30 flex items-center justify-center text-teal-600 dark:text-teal-400 shadow-xs">
              <IconSettings className="w-5 h-5 text-teal-600 dark:text-teal-400" />
            </div>
            <div>
              <h2 className="font-bold text-lg sm:text-xl text-content font-heading">
                Dictionary Preferences
              </h2>
              <p className="text-xs text-content-muted">Configure lookup behaviors, sources, AI, and appearance.</p>
            </div>
          </div>
        </div>

        {/* 4-Tab Navigation Bar */}
        <div className="flex items-center gap-1.5 bg-muted p-1 rounded-xl border border-border flex-shrink-0">
          {(
            [
              ['general', 'General', IconSettings],
              ['appearance', 'Appearance', IconSun],
              ['sources', 'Dictionaries & Sources', IconBook],
              ['ai', 'Gemini AI Assistant', IconSparkles],
            ] as const
          ).map(([id, label, IconComponent]) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              className={cx(
                'flex-1 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-2 shadow-xs',
                activeTab === id
                  ? 'bg-teal-500/15 text-teal-600 dark:text-teal-300 border border-teal-500/30 font-extrabold'
                  : 'text-content-muted hover:text-content hover:bg-elevated border border-transparent',
              )}
            >
              <IconComponent className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              <span>{label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {activeTab === 'general' ? (
            <div className="space-y-4">
              {/* Trigger Mode */}
              <div className="space-y-2">
                <label className="font-bold text-content-secondary block text-xs uppercase tracking-wider">
                  Text Selection Trigger Mode
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <label
                    className={cx(
                      'p-3 rounded-xl border cursor-pointer transition-all flex items-center gap-3 shadow-xs',
                      localSettings.selectionTriggerMode === 'icon'
                        ? 'bg-teal-500/10 border-teal-500/50 text-teal-600 dark:text-teal-300 font-bold'
                        : 'bg-muted border-border text-content-secondary hover:border-teal-500/40',
                    )}
                  >
                    <input
                      type="radio"
                      name="selectionTriggerMode"
                      value="icon"
                      checked={localSettings.selectionTriggerMode === 'icon'}
                      onChange={() => patchLocalSettings({ selectionTriggerMode: 'icon' })}
                      className="hidden"
                    />
                    <IconSearch className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                    <div>
                      <div className="font-semibold text-xs">Floating Action Icon</div>
                      <div className="text-[11px] text-content-muted font-normal">Show small icon near highlighted text</div>
                    </div>
                  </label>

                  <label
                    className={cx(
                      'p-3 rounded-xl border cursor-pointer transition-all flex items-center gap-3 shadow-xs',
                      localSettings.selectionTriggerMode === 'direct'
                        ? 'bg-teal-500/10 border-teal-500/50 text-teal-600 dark:text-teal-300 font-bold'
                        : 'bg-muted border-border text-content-secondary hover:border-teal-500/40',
                    )}
                  >
                    <input
                      type="radio"
                      name="selectionTriggerMode"
                      value="direct"
                      checked={localSettings.selectionTriggerMode === 'direct'}
                      onChange={() => patchLocalSettings({ selectionTriggerMode: 'direct' })}
                      className="hidden"
                    />
                    <IconSparkles className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                    <div>
                      <div className="font-semibold text-xs">Auto-open Popup</div>
                      <div className="text-[11px] text-content-muted font-normal">Directly open floating dictionary window</div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Shortcut modifier */}
              <div className="space-y-2 pt-3 border-t border-border/60">
                <label className="font-bold text-content-secondary block text-xs uppercase tracking-wider">
                  Quick Post-Selection Shortcut
                </label>
                <select
                  value={localSettings.postSelectionModifier || 'shift'}
                  onChange={(e) =>
                    patchLocalSettings({
                      postSelectionModifier: e.target.value as AppSettings['postSelectionModifier'],
                    })
                  }
                  className="w-full bg-muted border border-border text-content text-xs font-medium rounded-xl px-3 py-2.5 outline-none focus:border-teal-500 cursor-pointer shadow-xs"
                >
                  <option value="shift">Hold Shift + Press Q (Shift+Q)</option>
                  <option value="alt">Hold Alt + Press Q (Alt+Q)</option>
                  <option value="ctrl">Hold Ctrl + Press Q (Ctrl+Q)</option>
                </select>
              </div>

              {/* Default tab */}
              <div className="space-y-2 pt-3 border-t border-border/60">
                <label className="font-bold text-content-secondary block text-xs uppercase tracking-wider">
                  Default Start Tab
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <label
                    className={cx(
                      'p-2.5 rounded-xl border cursor-pointer transition-all text-center font-bold flex items-center justify-center gap-2 shadow-xs',
                      localSettings.defaultTab === 'dictionary'
                        ? 'bg-teal-500/10 border-teal-500/50 text-teal-600 dark:text-teal-300'
                        : 'bg-muted border-border text-content-secondary hover:border-teal-500/40',
                    )}
                  >
                    <input
                      type="radio"
                      name="defaultTab"
                      value="dictionary"
                      checked={localSettings.defaultTab === 'dictionary'}
                      onChange={() => patchLocalSettings({ defaultTab: 'dictionary' })}
                      className="hidden"
                    />
                    <IconBook className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                    <span>Dictionary</span>
                  </label>

                  <label
                    className={cx(
                      'p-2.5 rounded-xl border cursor-pointer transition-all text-center font-bold flex items-center justify-center gap-2 shadow-xs',
                      localSettings.defaultTab === 'ai_assistant'
                        ? 'bg-teal-500/10 border-teal-500/50 text-teal-600 dark:text-teal-300'
                        : 'bg-muted border-border text-content-secondary hover:border-teal-500/40',
                    )}
                  >
                    <input
                      type="radio"
                      name="defaultTab"
                      value="ai_assistant"
                      checked={localSettings.defaultTab === 'ai_assistant'}
                      onChange={() => patchLocalSettings({ defaultTab: 'ai_assistant' })}
                      className="hidden"
                    />
                    <IconSparkles className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                    <span>AI Assistant</span>
                  </label>
                </div>
              </div>

              {/* Context menu toggle */}
              <div className="space-y-2 pt-3 border-t border-border/60">
                <label className="flex items-center justify-between cursor-pointer p-2 rounded-xl hover:bg-muted transition-colors">
                  <div>
                    <span className="font-semibold text-content text-xs block">
                      Enable Right-Click Context Menu
                    </span>
                    <span className="text-[11px] text-content-muted block">
                      Adds "Lookup in Dictionary" to Chrome context menu
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={Boolean(localSettings.enableContextMenuTrigger)}
                    onChange={(e) => patchLocalSettings({ enableContextMenuTrigger: e.target.checked })}
                    className="accent-teal-500 w-4 h-4 cursor-pointer"
                  />
                </label>
              </div>

              {/* Surrounding Context toggle */}
              <div className="space-y-2 pt-1">
                <label className="flex items-center justify-between cursor-pointer p-2 rounded-xl hover:bg-muted transition-colors">
                  <div>
                    <span className="font-semibold text-content text-xs block">
                      Disable Surrounding Page Context Extraction
                    </span>
                    <span className="text-[11px] text-content-muted block">
                      When enabled, looks up only the exact selection without neighboring sentences
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={Boolean(localSettings.disablePageContextExtraction)}
                    onChange={(e) => patchLocalSettings({ disablePageContextExtraction: e.target.checked })}
                    className="accent-teal-500 w-4 h-4 cursor-pointer"
                  />
                </label>
              </div>

              {/* Paused Hostnames */}
              <div className="space-y-2 pt-3 border-t border-border/60">
                <label className="font-bold text-content-secondary block text-xs uppercase tracking-wider">
                  Paused Web Hostnames (1 per line)
                </label>
                <textarea
                  value={pausedSitesInput}
                  onChange={(e) => setPausedSitesInput(e.target.value)}
                  rows={3}
                  placeholder={'example.com\ndocs.google.com'}
                  className="w-full bg-muted border border-border rounded-xl p-2.5 text-xs text-content placeholder:text-content-muted outline-none focus:border-teal-500 font-mono shadow-xs"
                />
                <p className="text-[11px] text-content-muted">
                  The floating lookup icon will be disabled on these domain names.
                </p>
              </div>
            </div>
          ) : null}

          {activeTab === 'appearance' ? (
            <Suspense fallback={<div className="p-4 text-xs text-content-muted">Loading appearance settings…</div>}>
              <TabAppearance localSettings={localSettings} onChange={patchLocalSettings} />
            </Suspense>
          ) : null}

          {activeTab === 'sources' ? (
            <Suspense fallback={<div className="p-4 text-xs text-content-muted">Loading dictionary sources…</div>}>
              <TabSources
                localSettings={localSettings}
                languageOptions={languageOptions}
                connectionStatus={connectionStatus}
                connectionBusy={connectionBusy}
                availableVoices={availableVoices}
                onChange={patchLocalSettings}
                onTestTranslation={testTranslationConnection}
                onTestDictionary={testDictionaryConnection}
              />
            </Suspense>
          ) : null}

          {activeTab === 'ai' ? (
            <Suspense fallback={<div className="p-4 text-xs text-content-muted">Loading AI settings…</div>}>
              <TabAi
                localSettings={localSettings}
                isManualModelInput={isManualModelInput}
                connectionStatus={connectionStatus}
                connectionBusy={connectionBusy}
                promptEditors={promptEditors}
                onChange={patchLocalSettings}
                onToggleManualModel={toggleManualModelMode}
                onTestAi={testAiConnection}
                onRestorePrompt={restorePrompt}
                onRestoreAllPrompts={restoreAllPrompts}
              />
            </Suspense>
          ) : null}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-border/60 pt-4 flex-shrink-0 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={exportSettings}
              title="Download settings JSON backup"
              className="px-3 py-1.5 rounded-xl bg-muted hover:bg-elevated text-content-secondary hover:text-content text-xs font-semibold border border-border transition-colors cursor-pointer shadow-xs active:scale-95"
            >
              Export JSON
            </button>
            <button
              type="button"
              onClick={triggerImportFile}
              title="Restore settings from JSON file"
              className="px-3 py-1.5 rounded-xl bg-muted hover:bg-elevated text-content-secondary hover:text-content text-xs font-semibold border border-border transition-colors cursor-pointer shadow-xs active:scale-95"
            >
              Import JSON
            </button>
            <input
              id="settings-import-input"
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleImportFile}
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 rounded-xl bg-muted hover:bg-elevated text-content-secondary hover:text-content text-xs font-bold transition-colors cursor-pointer shadow-xs active:scale-95 border border-border"
            >
              Reset
            </button>

            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              {isSavedNotice ? (
                <>
                  <IconCheck className="w-4 h-4 text-white" />
                  <span>Saved!</span>
                </>
              ) : (
                <span>Save Changes</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
