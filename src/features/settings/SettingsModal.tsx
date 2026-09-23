import React, { lazy, Suspense } from 'react';
import type { AppSettings } from '@/types';
import { cx } from '@/ui/cx';
import {
  IconBook,
  IconCheck,
  IconSearch,
  IconSparkles,
  IconSun,
} from '@/components/icons';
import { useSettingsForm, type SettingsTab } from './use-settings-form';
import { getTextSizeStyle } from '@/ui/text-size';

const TabGeneral = lazy(() => import('./tabs/TabGeneral'));
const TabAppearance = lazy(() => import('./tabs/TabAppearance'));
const TabSources = lazy(() => import('./tabs/TabSources'));
const TabAi = lazy(() => import('./tabs/TabAi'));

const promptEditors: Array<{ key: keyof AppSettings; label: string; intent: AppSettings['preloadedAiIntents'][number] }> = [
  { key: 'aiPromptTemplate', label: 'Main AI', intent: 'default' },
  { key: 'aiContextPromptTemplate', label: 'Context Explain', intent: 'explain_in_context' },
  { key: 'aiGrammarPromptTemplate', label: 'Grammar & Nuance', intent: 'grammar' },
  { key: 'aiPhraseExplorerPromptTemplate', label: 'Phrase & Collocations', intent: 'collocations' },
  { key: 'aiSentencePromptTemplate', label: 'Sentence Breakdown', intent: 'sentence_breakdown' },
  { key: 'aiComparePromptTemplate', label: 'Compare Confusables', intent: 'confusables' },
  { key: 'aiRephrasePromptTemplate', label: 'Rephrase', intent: 'rephrase' },
  { key: 'aiRewritePromptTemplate', label: 'Rewriter', intent: 'rewrite' },
];

const TABS: Array<{ id: SettingsTab; label: string; icon: React.FC<{ className?: string }> }> = [
  { id: 'general', label: 'General', icon: IconSearch },
  { id: 'appearance', label: 'Appearance', icon: IconSun },
  { id: 'sources', label: 'Sources', icon: IconBook },
  { id: 'ai', label: 'AI assistant', icon: IconSparkles },
];

export const SettingsModal: React.FC = () => {
  const {
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
  } = useSettingsForm();

  const activeTabInfo = TABS.find((tab) => tab.id === activeTab) ?? TABS[0];
  const tabDescriptions: Record<SettingsTab, string> = {
    general: 'Decide how lookups begin and where the extension appears.',
    appearance: 'Make your reading space feel right for you.',
    sources: 'Choose where definitions, translations, and speech come from.',
    ai: 'Connect your assistant and tailor its responses.',
  };

  return (
    <div
      className={cx(
        'app-shell glass-shell settings-shell min-h-screen bg-paper text-content font-sans transition-colors selection:bg-accent/20',
        isDarkMode ? 'dark' : 'light-theme light',
      )}
      data-theme={isDarkMode ? 'dark' : 'light'}
      style={getTextSizeStyle(localSettings.textSize)}
    >
      <header className="settings-topbar sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 h-[4.5rem] flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="settings-brand-mark shrink-0" aria-hidden="true"><IconBook className="w-5 h-5" /></div>
            <div className="min-w-0">
              <p className="settings-eyebrow">DICTIONARY ASSISTANT</p>
              <h1 className="font-heading font-bold text-[17px] text-content tracking-tight leading-tight">Settings</h1>
            </div>
          </div>
          <div role="status" aria-live="polite" className={cx('settings-save-status', isDirty && 'is-dirty')}>
            <span className="settings-status-dot" aria-hidden="true" />
            {isSaving ? 'Saving…' : isDirty ? 'Unsaved changes' : isSavedNotice ? 'Saved' : 'Up to date'}
          </div>
        </div>
      </header>

      {saveError ? (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-4">
          <p role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-700 dark:text-rose-300">
            {saveError}
          </p>
        </div>
      ) : null}

      <div className="max-w-6xl mx-auto px-5 sm:px-8 py-8 sm:py-10 pb-28">
        <div className="settings-intro mb-8">
          <p className="settings-eyebrow mb-2">MAKE IT YOURS / 01—04</p>
          <h2 className="settings-intro-title">A better way to <em>understand.</em></h2>
          <p className="text-content-secondary text-sm sm:text-base mt-2 max-w-xl leading-relaxed">Fine-tune the little details that shape every lookup, from the first highlight to the final answer.</p>
        </div>
        <nav aria-label="Settings sections" className="md:hidden flex items-center gap-2 overflow-x-auto pb-3 mb-5">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => switchTab(id)}
              aria-current={activeTab === id ? 'page' : undefined}
              className={cx('settings-mobile-tab', activeTab === id && 'is-active')}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <div className="grid grid-cols-1 md:grid-cols-[220px_minmax(0,1fr)] gap-8 lg:gap-12 items-start">
          <aside className="hidden md:block sticky top-28 space-y-8">
            <nav aria-label="Settings sections" className="settings-side-nav space-y-1">
              <p className="settings-eyebrow px-3 mb-4">PREFERENCES</p>
              {TABS.map(({ id, label, icon: Icon }) => {
                const isActive = activeTab === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => switchTab(id)}
                    aria-current={isActive ? 'page' : undefined}
                    className={cx('settings-side-link', isActive && 'is-active')}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{label}</span>
                  </button>
                );
              })}
            </nav>

            <div className="settings-backup-card p-4 space-y-3">
              <span className="settings-eyebrow block">YOUR DATA</span>
              <p className="text-sm font-semibold text-content leading-snug">Keep your setup close.</p>
              <div className="space-y-1.5">
                <button
                  type="button"
                  onClick={exportSettings}
                  title="Download settings JSON backup"
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-muted/70 text-xs text-content-secondary hover:text-content font-medium transition-colors cursor-pointer flex items-center justify-between border border-transparent hover:border-border"
                >
                  <span>Export JSON</span>
                  <span className="text-[12px] text-content-muted font-mono">↓</span>
                </button>
                <button
                  type="button"
                  onClick={triggerImportFile}
                  title="Restore settings from JSON file"
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-muted/70 text-xs text-content-secondary hover:text-content font-medium transition-colors cursor-pointer flex items-center justify-between border border-transparent hover:border-border"
                >
                  <span>Import JSON</span>
                  <span className="text-[12px] text-content-muted font-mono">↑</span>
                </button>
                <button
                  type="button"
                  onClick={handleClearLookupCaches}
                  title="Remove locally cached lookup results"
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-muted/70 text-xs text-content-secondary hover:text-content font-medium transition-colors cursor-pointer flex items-center justify-between border border-transparent hover:border-border"
                >
                  <span>{cacheClearedNotice ? 'Cache cleared' : 'Clear lookup cache'}</span>
                  <span className="text-[12px] text-content-muted font-mono">×</span>
                </button>
              </div>
            </div>
          </aside>

          <main className="min-w-0 space-y-6 settings-content">
            <div className="settings-section-heading">
              <p className="settings-eyebrow mb-2">SECTION {String(TABS.findIndex((tab) => tab.id === activeTab) + 1).padStart(2, '0')} / 04</p>
              <h2 className="font-heading text-3xl sm:text-4xl font-semibold tracking-tight text-content">{activeTabInfo.label}</h2>
              <p className="text-content-secondary text-sm mt-2">{tabDescriptions[activeTab]}</p>
            </div>
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
                <TabAppearance localSettings={localSettings} onChange={patchLocalSettings} onClearCache={handleClearLookupCaches} />
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

      <div className="settings-save-bar fixed bottom-0 inset-x-0 z-20 py-3 px-5 sm:px-8">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-content-muted min-w-0">
            <button
              type="button"
              onClick={exportSettings}
              className="md:hidden px-2.5 py-1.5 rounded-xl bg-muted hover:bg-elevated text-content-secondary hover:text-content text-xs font-semibold border border-border cursor-pointer"
            >
              Export
            </button>
            <button
              type="button"
              onClick={triggerImportFile}
              className="md:hidden px-2.5 py-1.5 rounded-xl bg-muted hover:bg-elevated text-content-secondary hover:text-content text-xs font-semibold border border-border cursor-pointer"
            >
              Import
            </button>
            <span className="hidden sm:inline">Press</span>
            <kbd className="hidden sm:inline px-1.5 py-0.5 rounded-md bg-muted text-content border border-border font-mono text-[12.5px]">
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
              disabled={!isDirty || isSaving}
              className="px-3.5 py-2 rounded-xl bg-muted hover:bg-elevated text-content-secondary hover:text-content text-xs font-semibold border border-border transition-colors cursor-pointer active:scale-95 shadow-2xs disabled:opacity-50 disabled:pointer-events-none"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || !isDirty}
              className="ui-button-primary px-5 py-2 text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer disabled:pointer-events-none"
            >
              {isSaving ? (
                <span>Saving…</span>
              ) : isSavedNotice ? (
                <>
                  <IconCheck className="w-3.5 h-3.5" />
                  <span>Saved</span>
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
