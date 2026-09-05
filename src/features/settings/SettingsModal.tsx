import React, { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import {
  canAccessSecretSettings,
  parsePublicSettingsImport,
  serializePublicSettings,
  useStorage,
  whenSettingsReady,
} from '@/composables/composable.storage';
import { SECRET_SETTING_KEYS } from '@/shared/settings-export';
import { requestProviderValidation } from '@/shared/runtime-client';
import { DEFAULT_AI_PROMPTS } from '@/shared/ai-prompts';
import { KNOWN_LANGUAGE_MAPPINGS } from '@/shared/languages';
import { AppSettings } from '@/types';
import { useAppTheme } from '@/ui/theme';
import { cx } from '@/ui/cx';
import {
  IconBook,
  IconCheck,
  IconSearch,
  IconSettings,
  IconSparkles,
  IconSun,
} from '@/components/icons';

const TabGeneral = lazy(() => import('./tabs/TabGeneral'));
const TabAppearance = lazy(() => import('./tabs/TabAppearance'));
const TabSources = lazy(() => import('./tabs/TabSources'));
const TabAi = lazy(() => import('./tabs/TabAi'));

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

const presetModels = ['gemini-3.5-flash-lite'];

const TABS: Array<{ id: SettingsTab; label: string; icon: React.FC<{ className?: string }> }> = [
  { id: 'general', label: 'Triggers & Shortcuts', icon: IconSearch },
  { id: 'appearance', label: 'Appearance', icon: IconSun },
  { id: 'sources', label: 'Dictionaries & Translation', icon: IconBook },
  { id: 'ai', label: 'AI Intelligence', icon: IconSparkles },
];

function getInitialTab(): SettingsTab {
  if (typeof window !== 'undefined') {
    const hash = window.location.hash.replace('#', '') as SettingsTab;
    if (['general', 'appearance', 'sources', 'ai'].includes(hash)) return hash;
    const saved = sessionStorage.getItem('dict_settings_active_tab') as SettingsTab;
    if (['general', 'appearance', 'sources', 'ai'].includes(saved)) return saved;
  }
  return 'general';
}

export const SettingsModal: React.FC = () => {
  const [activeTab, setActiveTab] = useState<SettingsTab>(getInitialTab);
  const { settings, saveSettings } = useStorage();

  const [localSettings, setLocalSettings] = useState<AppSettings>({ ...settings });
  const [formHydrated, setFormHydrated] = useState(false);
  const [isSavedNotice, setIsSavedNotice] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [pausedSitesInput, setPausedSitesInput] = useState<string>('');
  const [isManualModelInput, setIsManualModelInput] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<Record<string, string>>({});
  const [connectionBusy, setConnectionBusy] = useState<Record<string, boolean>>({});
  const canEditApiKey = canAccessSecretSettings();

  function switchTab(tab: SettingsTab) {
    setActiveTab(tab);
    if (typeof window !== 'undefined') {
      window.location.hash = tab;
      try {
        sessionStorage.setItem('dict_settings_active_tab', tab);
      } catch {}
    }
  }

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
    const synth = typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null;
    synth?.addEventListener('voiceschanged', loadVoices);
    void syncLocalFromStore();
    return () => {
      synth?.removeEventListener('voiceschanged', loadVoices);
    };
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
    if (isSaving) return;
    setIsSaving(true);
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

    try {
      await saveSettings(toSave);
      setIsSavedNotice(true);
      setTimeout(() => {
        setIsSavedNotice(false);
      }, 2000);
    } finally {
      setIsSaving(false);
    }
  }

  // Keyboard shortcut: Cmd/Ctrl + S to save
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        void handleSave();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [localSettings, pausedSitesInput, isSaving, canEditApiKey]);

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

  const { isDarkMode } = useAppTheme(localSettings.theme, { syncDocument: true });

  return (
    <div
      className={cx(
        'min-h-screen bg-paper text-content font-sans transition-colors',
        isDarkMode ? 'dark' : 'light-theme light',
      )}
      data-theme={isDarkMode ? 'dark' : 'light'}
    >
      {/* Top App Bar */}
      <header className="sticky top-0 z-30 bg-surface/85 backdrop-blur-md border-b border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-accent-subtle border border-accent/30 flex items-center justify-center text-accent shadow-2xs shrink-0">
              <IconSettings className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h1 className="font-bold text-base sm:text-lg text-content font-heading truncate">
                Preferences
              </h1>
              <p className="text-[11.5px] text-content-muted truncate hidden sm:block">
                Configure triggers, dictionaries, AI provider, and appearance
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="h-8 px-4 rounded-lg bg-accent hover:opacity-90 text-white dark:text-neutral-950 text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50 shrink-0"
          >
            {isSavedNotice ? (
              <>
                <IconCheck className="w-3.5 h-3.5" />
                <span>Saved</span>
              </>
            ) : (
              <span>Save</span>
            )}
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 pb-24">
        {/* Mobile Horizontal Tab Scroller (< md) */}
        <div className="md:hidden flex items-center gap-1.5 overflow-x-auto pb-3 mb-4">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => switchTab(id)}
              className={cx(
                'px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 shrink-0 shadow-2xs',
                activeTab === id
                  ? 'chip-active font-extrabold'
                  : 'bg-surface border border-border text-content-secondary hover:text-content',
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{label}</span>
            </button>
          ))}
        </div>

        {/* 2-Column Layout on Desktop */}
        <div className="grid grid-cols-1 md:grid-cols-[240px_minmax(0,1fr)] gap-8 items-start">
          {/* Desktop Left Rail (Sticky) */}
          <aside className="hidden md:block sticky top-24 space-y-4">
            <nav className="space-y-1 bg-surface border border-border rounded-xl p-2 shadow-xs">
              {TABS.map(({ id, label, icon: Icon }) => {
                const isActive = activeTab === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => switchTab(id)}
                    className={cx(
                      'w-full px-3 py-2 rounded-lg text-left text-xs font-semibold transition-all cursor-pointer flex items-center gap-2.5',
                      isActive
                        ? 'chip-active font-bold shadow-2xs'
                        : 'text-content-secondary hover:text-content hover:bg-muted/60',
                    )}
                  >
                    <Icon className={cx('w-4 h-4 shrink-0', isActive ? 'text-accent' : 'text-content-muted')} />
                    <span>{label}</span>
                  </button>
                );
              })}
            </nav>

            {/* Backup & Tools Card */}
            <div className="bg-surface border border-border rounded-xl p-3.5 space-y-2.5 shadow-xs">
              <span className="text-[10.5px] font-bold text-content-muted uppercase tracking-wider block font-mono">
                Data &amp; Backup
              </span>
              <div className="space-y-1.5">
                <button
                  type="button"
                  onClick={exportSettings}
                  title="Download settings JSON backup"
                  className="w-full text-left px-2.5 py-1.5 rounded-md hover:bg-muted text-xs text-content-secondary hover:text-content font-medium transition-colors cursor-pointer flex items-center justify-between"
                >
                  <span>Export JSON</span>
                  <span className="text-[10px] text-content-muted font-mono">↓</span>
                </button>
                <button
                  type="button"
                  onClick={triggerImportFile}
                  title="Restore settings from JSON file"
                  className="w-full text-left px-2.5 py-1.5 rounded-md hover:bg-muted text-xs text-content-secondary hover:text-content font-medium transition-colors cursor-pointer flex items-center justify-between"
                >
                  <span>Import JSON</span>
                  <span className="text-[10px] text-content-muted font-mono">↑</span>
                </button>
              </div>
            </div>
          </aside>

          {/* Right Main Content Area */}
          <main className="min-w-0 space-y-6">
            {activeTab === 'general' && (
              <Suspense fallback={<div className="p-8 text-xs text-content-muted">Loading settings…</div>}>
                <TabGeneral
                  localSettings={localSettings}
                  pausedSitesInput={pausedSitesInput}
                  onChange={patchLocalSettings}
                  onPausedSitesChange={setPausedSitesInput}
                />
              </Suspense>
            )}

            {activeTab === 'appearance' && (
              <Suspense fallback={<div className="p-8 text-xs text-content-muted">Loading appearance…</div>}>
                <TabAppearance localSettings={localSettings} onChange={patchLocalSettings} />
              </Suspense>
            )}

            {activeTab === 'sources' && (
              <Suspense fallback={<div className="p-8 text-xs text-content-muted">Loading sources…</div>}>
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
            )}

            {activeTab === 'ai' && (
              <Suspense fallback={<div className="p-8 text-xs text-content-muted">Loading AI settings…</div>}>
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
            )}
          </main>
        </div>
      </div>

      {/* Floating Sticky Save Bar on scroll */}
      <div className="fixed bottom-0 inset-x-0 z-20 bg-surface/90 backdrop-blur-md border-t border-border py-3 px-4 sm:px-6 shadow-elevated">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-content-muted min-w-0">
            <button
              type="button"
              onClick={exportSettings}
              className="md:hidden px-2.5 py-1.5 rounded-lg bg-muted hover:bg-elevated text-content-secondary hover:text-content text-xs font-semibold border border-border cursor-pointer"
            >
              Export
            </button>
            <button
              type="button"
              onClick={triggerImportFile}
              className="md:hidden px-2.5 py-1.5 rounded-lg bg-muted hover:bg-elevated text-content-secondary hover:text-content text-xs font-semibold border border-border cursor-pointer"
            >
              Import
            </button>
            <span className="hidden sm:inline">Press</span>
            <kbd className="hidden sm:inline px-1.5 py-0.5 rounded bg-muted text-content border border-border font-mono text-[10.5px]">
              ⌘S
            </kbd>
            <span className="hidden sm:inline">or Ctrl+S to save</span>
            <input
              id="settings-import-input"
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleImportFile}
            />
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={resetForm}
              className="px-3.5 py-1.5 rounded-lg bg-muted hover:bg-elevated text-content-secondary hover:text-content text-xs font-semibold border border-border transition-colors cursor-pointer active:scale-95 shadow-2xs"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="px-5 py-1.5 rounded-lg bg-accent hover:opacity-90 text-white dark:text-neutral-950 text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50"
            >
              {isSavedNotice ? (
                <>
                  <IconCheck className="w-3.5 h-3.5" />
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
