import { useEffect, useMemo, useState } from 'react';
import type { ChangeEvent } from 'react';
import {
  canAccessSecretSettings,
  clearLookupCaches,
  parsePublicSettingsImport,
  serializePublicSettings,
  saveSettingsToStorage,
  settingsStore,
  useSettings,
  whenSettingsReady,
} from '@/composables/composable.storage';
import { SECRET_SETTING_KEYS } from '@/shared/settings-export';
import { requestProviderValidation } from '@/shared/runtime-client';
import { requestOriginPermission } from '@/shared/permissions';
import { DEFAULT_AI_PROMPTS } from '@/prompts/prompt-templates';
import { KNOWN_LANGUAGE_MAPPINGS } from '@/shared/languages';
import { normalizeSettings } from '@/shared/settings';
import type { AppSettings } from '@/types';
import { useAppTheme } from '@/ui/theme';

export type SettingsTab = 'general' | 'appearance' | 'sources' | 'ai';

const presetModels = ['gemini-3.5-flash-lite'];
const MANIFEST_ENDPOINT_ORIGINS = [
  'https://generativelanguage.googleapis.com',
  'https://libretranslate.com',
];

function areSettingValuesEqual(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true;
  if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) return false;
  return left.every((value, index) => Object.is(value, right[index]));
}

function normalizePausedSitesInput(value: string): string[] {
  return value
    .split('\n')
    .map((line) => line.trim().toLowerCase())
    .filter((line) => line.length > 0 && !line.startsWith('#'));
}

function getInitialTab(): SettingsTab {
  if (typeof window !== 'undefined') {
    const hash = window.location.hash.replace('#', '') as SettingsTab;
    if (['general', 'appearance', 'sources', 'ai'].includes(hash)) return hash;
    const saved = sessionStorage.getItem('dict_settings_active_tab') as SettingsTab;
    if (['general', 'appearance', 'sources', 'ai'].includes(saved)) return saved;
  }
  return 'general';
}

export function useSettingsForm() {
  const [activeTab, setActiveTab] = useState<SettingsTab>(getInitialTab);
  const settings = useSettings();
  const [localSettings, setLocalSettings] = useState<AppSettings>({ ...settings });
  const [formHydrated, setFormHydrated] = useState(false);
  const [isSavedNotice, setIsSavedNotice] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [cacheClearedNotice, setCacheClearedNotice] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [pausedSitesInput, setPausedSitesInput] = useState('');
  const [isManualModelInput, setIsManualModelInput] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<Record<string, string>>({});
  const [connectionBusy, setConnectionBusy] = useState<Record<string, boolean>>({});
  const canEditApiKey = canAccessSecretSettings();

  const isDirty = useMemo(() => {
    if (!formHydrated) return false;
    return (Object.keys(localSettings) as Array<keyof AppSettings>).some((key) => {
      if (SECRET_SETTING_KEYS.includes(key as never) && !canEditApiKey) return false;
      return !areSettingValuesEqual(localSettings[key], settings[key]);
    }) || normalizePausedSitesInput(pausedSitesInput).join('\n') !== (settings.pausedHostnames || []).join('\n');
  }, [localSettings, settings, pausedSitesInput, canEditApiKey, formHydrated]);

  function switchTab(tab: SettingsTab) {
    setActiveTab(tab);
    if (typeof window !== 'undefined') {
      window.location.hash = tab;
      try {
        sessionStorage.setItem('dict_settings_active_tab', tab);
      } catch {
        // Session persistence is optional.
      }
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

  function applyStoreToLocal(source: AppSettings = settings) {
    setLocalSettings((prev) => {
      const pendingSecrets: Partial<AppSettings> = {};
      for (const key of SECRET_SETTING_KEYS) {
        if (String(prev[key] || '').trim()) pendingSecrets[key] = prev[key] as never;
      }
      const merged = { ...source, ...pendingSecrets };
      setPausedSitesInput(Array.isArray(merged.pausedHostnames) ? merged.pausedHostnames.join('\n') : '');
      setIsManualModelInput(Boolean(merged.aiModel && !presetModels.includes(merged.aiModel)));
      return merged;
    });
    setFormHydrated(true);
  }

  async function syncLocalFromStore() {
    await whenSettingsReady();
    applyStoreToLocal(settingsStore.value);
  }

  useEffect(() => {
    loadVoices();
    const synth = typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null;
    synth?.addEventListener('voiceschanged', loadVoices);
    void syncLocalFromStore();
    return () => synth?.removeEventListener('voiceschanged', loadVoices);
  }, []);

  useEffect(() => {
    if (!formHydrated) return;
    setPausedSitesInput((settings.pausedHostnames || []).join('\n'));
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
    if (defaultPrompt) patchLocalSettings({ [promptKey]: defaultPrompt });
  }

  function restoreAllPrompts() {
    patchLocalSettings({ ...DEFAULT_AI_PROMPTS });
  }

  async function handleSave() {
    if (isSaving || !isDirty) return;
    setIsSaving(true);
    setSaveError(null);
    const pausedList = normalizePausedSitesInput(pausedSitesInput);
    const toSave: Partial<AppSettings> = { ...localSettings, pausedHostnames: pausedList };

    if (!canEditApiKey) {
      for (const key of SECRET_SETTING_KEYS) delete toSave[key];
    }

    try {
      if (toSave.aiBaseUrl) {
        const allowed = await requestOriginPermission(toSave.aiBaseUrl, MANIFEST_ENDPOINT_ORIGINS);
        if (!allowed) throw new Error('Permission was not granted for the custom AI endpoint.');
      }
      if (toSave.translateProvider === 'libretranslate') {
        const allowed = await requestOriginPermission(toSave.libreTranslateBaseUrl, MANIFEST_ENDPOINT_ORIGINS);
        if (!allowed) throw new Error('Permission was not granted for the custom translation endpoint.');
      }
      await saveSettingsToStorage(toSave);
      const savedSettings = normalizeSettings({ ...settings, ...toSave });
      setLocalSettings(savedSettings);
      setPausedSitesInput(savedSettings.pausedHostnames.join('\n'));
      setIsSavedNotice(true);
      setTimeout(() => setIsSavedNotice(false), 2000);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Settings could not be saved.');
    } finally {
      setIsSaving(false);
    }
  }

  function handleClearLookupCaches() {
    clearLookupCaches();
    setCacheClearedNotice(true);
    setTimeout(() => setCacheClearedNotice(false), 2000);
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key === 's') {
        event.preventDefault();
        void handleSave();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [localSettings, pausedSitesInput, isSaving, canEditApiKey, isDirty, formHydrated]);

  useEffect(() => {
    if (!isDirty) return;
    function warnBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = '';
    }
    window.addEventListener('beforeunload', warnBeforeUnload);
    return () => window.removeEventListener('beforeunload', warnBeforeUnload);
  }, [isDirty]);

  function resetForm() {
    applyStoreToLocal();
  }

  function exportSettings() {
    const data = JSON.stringify(serializePublicSettings(localSettings), null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `dictionary-settings-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function triggerImportFile() {
    (document.getElementById('settings-import-input') as HTMLInputElement | null)?.click();
  }

  function handleImportFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      try {
        const parsed = parsePublicSettingsImport(loadEvent.target?.result as string);
        patchLocalSettings(parsed);
      } catch (error) {
        alert(error instanceof Error ? error.message : 'Invalid settings JSON file.');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  }

  async function runConnectionTest(key: string, kind: 'ai' | 'dictionary' | 'translation', providerId?: string) {
    setConnectionBusy((prev) => ({ ...prev, [key]: true }));
    setConnectionStatus((prev) => ({ ...prev, [key]: 'Testing…' }));
    try {
      const result = await requestProviderValidation(kind, providerId, localSettings);
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

  const testAiConnection = () => runConnectionTest('ai', 'ai');
  const testDictionaryConnection = (providerId: string) => runConnectionTest(providerId, 'dictionary', providerId);
  const testTranslationConnection = () => runConnectionTest(`translation:${localSettings.translateProvider || 'google'}`, 'translation');
  const { isDarkMode } = useAppTheme(localSettings.theme, { syncDocument: true });

  return {
    activeTab,
    switchTab,
    localSettings,
    pausedSitesInput,
    setPausedSitesInput,
    languageOptions,
    isManualModelInput,
    connectionStatus,
    connectionBusy,
    availableVoices,
    isDirty,
    isSaving,
    isSavedNotice,
    saveError,
    cacheClearedNotice,
    patchLocalSettings,
    toggleManualModelMode,
    restorePrompt,
    restoreAllPrompts,
    handleSave,
    handleClearLookupCaches,
    resetForm,
    exportSettings,
    triggerImportFile,
    handleImportFile,
    testAiConnection,
    testDictionaryConnection,
    testTranslationConnection,
    isDarkMode,
  };
}
