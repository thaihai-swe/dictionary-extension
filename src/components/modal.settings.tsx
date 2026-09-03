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
      for (const key of SECRET_SETTING_KEYS) {
        if (!String(prev[key] || '').trim() && String(settings[key] || '').trim()) {
          (next as Record<string, unknown>)[key] = settings[key];
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
    const nextManual = !isManualModelInput;
    setIsManualModelInput(nextManual);
    if (!nextManual && !presetModels.includes(localSettings.aiModel || '')) {
      patchLocalSettings({ aiModel: 'gemini-3.5-flash-lite' });
    }
  }

  function preserveStoredSecrets(current: AppSettings) {
    if (!canEditApiKey) return current;
    const next = { ...current };
    for (const key of SECRET_SETTING_KEYS) {
      if (!String(next[key] || '').trim() && String(settings[key] || '').trim()) {
        (next as Record<string, unknown>)[key] = settings[key];
      }
    }
    return next;
  }

  async function resetForm() {
    setFormHydrated(false);
    await syncLocalFromStore();
  }

  async function handleSave() {
    await whenSettingsReady();
    let current = localSettings;
    if (!formHydrated) current = preserveStoredSecrets(current);

    const parsedHostnames = pausedSitesInput
      .split('\n')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);

    const payload: Partial<AppSettings> = {
      ...current,
      pausedHostnames: parsedHostnames,
      aiModel: current.aiModel && current.aiModel.trim() ? current.aiModel : 'gemini-3.5-flash-lite',
    };

    for (const key of SECRET_SETTING_KEYS) {
      if (!canEditApiKey || !String(payload[key] ?? '').trim()) delete payload[key];
    }
    delete payload.hasAiApiKey;

    await saveSettings(payload);
    setIsSavedNotice(true);
    setTimeout(() => {
      setIsSavedNotice(false);
    }, 1600);
  }

  function exportSettings() {
    const payload = serializePublicSettings(settings);
    const jsonStr = JSON.stringify(payload, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dictionary-settings-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function triggerImportFile() {
    const fileInput = document.getElementById('settings-import-input') as HTMLInputElement;
    if (fileInput) fileInput.click();
  }

  function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = parsePublicSettingsImport(JSON.parse(event.target?.result as string));
        void saveSettings(imported);
        setLocalSettings((prev) => ({ ...prev, ...imported }));
        alert('Settings backup restored successfully!');
      } catch {
        alert('Invalid JSON settings file.');
      }
    };
    reader.readAsText(file);
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

  function restorePrompt(key: keyof AppSettings) {
    const fallback = DEFAULT_AI_PROMPTS[key as keyof typeof DEFAULT_AI_PROMPTS];
    if (typeof fallback === 'string') {
      patchLocalSettings({ [key]: fallback });
    }
  }

  function restoreAllPrompts() {
    patchLocalSettings(DEFAULT_AI_PROMPTS);
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

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100 p-4 sm:p-6 flex items-start justify-center">
      <div className="w-full max-w-5xl bg-dark-surface border border-dark-border rounded-2xl p-8 shadow-2xl space-y-5 text-sm flex flex-col my-4">
        <div className="flex items-center justify-between border-b border-dark-border pb-3 flex-shrink-0">
          <h3 className="font-bold text-xl text-slate-100 flex items-center gap-2">
            <span>⚙️</span>
            <span>Dictionary Settings</span>
          </h3>
        </div>

        {/* 4-Tab Navigation Bar */}
        <div className="flex items-center gap-1 bg-dark-muted p-1 rounded-xl border border-dark-border flex-shrink-0">
          {(
            [
              ['general', '⚡ General'],
              ['appearance', '🎨 Appearance'],
              ['sources', '📚 Dictionaries'],
              ['ai', '🤖 Gemini AI'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              className={cx(
                'flex-1 py-2.5 rounded-lg text-sm font-bold transition-all cursor-pointer',
                activeTab === id
                  ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                  : 'text-slate-400 hover:text-slate-200',
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Scrollable Tab Content Container */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {activeTab === 'general' ? (
            <div className="space-y-3.5">
              <div className="space-y-2">
                <label className="font-bold text-slate-200 block">⚡ Text Selection Trigger Mode:</label>
                <div className="grid grid-cols-2 gap-2">
                  <label
                    className={cx(
                      'p-2.5 rounded-xl border cursor-pointer transition-all flex items-center gap-2',
                      localSettings.selectionTriggerMode === 'icon'
                        ? 'bg-teal-500/10 border-teal-500/50 text-teal-300 font-bold'
                        : 'bg-dark-muted border-dark-border text-slate-300 hover:border-slate-500',
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
                    <span>🔍 Floating Action Icon</span>
                  </label>

                  <label
                    className={cx(
                      'p-2.5 rounded-xl border cursor-pointer transition-all flex items-center gap-2',
                      localSettings.selectionTriggerMode === 'direct'
                        ? 'bg-teal-500/10 border-teal-500/50 text-teal-300 font-bold'
                        : 'bg-dark-muted border-dark-border text-slate-300 hover:border-slate-500',
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
                    <span>⚡ Auto-open Popup</span>
                  </label>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-dark-border/60">
                <label className="font-bold text-slate-200 block">⌨️ Quick Post-Selection Shortcut:</label>
                <select
                  value={localSettings.postSelectionModifier || 'shift'}
                  onChange={(e) =>
                    patchLocalSettings({
                      postSelectionModifier: e.target.value as AppSettings['postSelectionModifier'],
                    })
                  }
                  className="w-full bg-dark-muted border border-dark-border text-slate-200 text-sm font-medium rounded-xl px-3 py-2 outline-none focus:border-teal-500 cursor-pointer"
                >
                  <option value="shift">Hold Shift + Press Q (Shift+Q)</option>
                  <option value="alt">Hold Alt + Press Q (Alt+Q)</option>
                  <option value="ctrl">Hold Ctrl + Press Q (Ctrl+Q)</option>
                </select>
              </div>

              <div className="space-y-2 pt-2 border-t border-dark-border/60">
                <label className="font-bold text-slate-200 block">📌 Default Active Start Tab:</label>
                <div className="grid grid-cols-2 gap-2">
                  <label
                    className={cx(
                      'p-2 rounded-xl border cursor-pointer transition-all text-center font-bold',
                      localSettings.defaultTab === 'dictionary'
                        ? 'bg-teal-500/10 border-teal-500/50 text-teal-300'
                        : 'bg-dark-muted border-dark-border text-slate-300',
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
                    <span>📖 Dictionary</span>
                  </label>

                  <label
                    className={cx(
                      'p-2 rounded-xl border cursor-pointer transition-all text-center font-bold',
                      localSettings.defaultTab === 'ai_assistant'
                        ? 'bg-teal-500/10 border-teal-500/50 text-teal-300'
                        : 'bg-dark-muted border-dark-border text-slate-300',
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
                    <span>✨ AI Assistant</span>
                  </label>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-dark-border/60">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="font-bold text-slate-200">
                    🖱️ Enable Right-Click Context Menu ("Lookup in Dictionary"):
                  </span>
                  <input
                    type="checkbox"
                    checked={Boolean(localSettings.enableContextMenuTrigger)}
                    onChange={(e) => patchLocalSettings({ enableContextMenuTrigger: e.target.checked })}
                    className="accent-teal-500 w-4 h-4 cursor-pointer"
                  />
                </label>
              </div>

              <div className="space-y-2 pt-2 border-t border-dark-border/60">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="font-bold text-slate-200">
                    📖 Disable Surrounding Page Context Extraction:
                  </span>
                  <input
                    type="checkbox"
                    checked={Boolean(localSettings.disablePageContextExtraction)}
                    onChange={(e) => patchLocalSettings({ disablePageContextExtraction: e.target.checked })}
                    className="accent-teal-500 w-4 h-4 cursor-pointer"
                  />
                </label>
              </div>

              <div className="space-y-2 pt-2 border-t border-dark-border/60">
                <label className="font-bold text-slate-200 block">
                  🚫 Paused Web Hostnames (1 hostname per line):
                </label>
                <textarea
                  value={pausedSitesInput}
                  onChange={(e) => setPausedSitesInput(e.target.value)}
                  rows={3}
                  placeholder={'example.com\ndocs.google.com'}
                  className="w-full bg-dark-muted border border-dark-border rounded-xl p-2.5 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-teal-500 font-mono"
                />
                <p className="text-xs text-slate-400">
                  The floating lookup icon will be suppressed on these domain names.
                </p>
              </div>
            </div>
          ) : null}

          {activeTab === 'appearance' ? (
            <Suspense fallback={<div className="p-4 text-xs text-slate-400">Loading appearance settings…</div>}>
              <TabAppearance localSettings={localSettings} onChange={patchLocalSettings} />
            </Suspense>
          ) : null}

          {activeTab === 'sources' ? (
            <Suspense fallback={<div className="p-4 text-xs text-slate-400">Loading dictionary sources…</div>}>
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
            <Suspense fallback={<div className="p-4 text-xs text-slate-400">Loading AI settings…</div>}>
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

        {/* Footer Buttons & Actions */}
        <div className="flex items-center justify-between border-t border-dark-border pt-3 flex-shrink-0">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={exportSettings}
              title="Download settings JSON backup"
              className="px-2.5 py-1.5 rounded-xl bg-dark-muted hover:bg-dark-border text-slate-300 text-sm font-medium border border-dark-border transition-colors cursor-pointer"
            >
              📥 Export JSON
            </button>
            <button
              type="button"
              onClick={triggerImportFile}
              title="Restore settings from JSON file"
              className="px-2.5 py-1.5 rounded-xl bg-dark-muted hover:bg-dark-border text-slate-300 text-sm font-medium border border-dark-border transition-colors cursor-pointer"
            >
              📤 Import JSON
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
              className="px-4 py-2 rounded-xl bg-dark-muted hover:bg-dark-border text-slate-300 text-sm font-bold transition-colors cursor-pointer"
            >
              Reset
            </button>

            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-sm font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
            >
              <span>{isSavedNotice ? '✓ Saved!' : 'Save Settings'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
