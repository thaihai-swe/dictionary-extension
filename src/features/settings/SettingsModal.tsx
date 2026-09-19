import React, { lazy, Suspense } from 'react';
import type { AppSettings } from '@/types';
import { cx } from '@/ui/cx';
import {
  IconBook,
  IconCheck,
  IconSearch,
  IconSettings,
  IconSparkles,
  IconSun,
} from '@/components/icons';
import { useSettingsForm, type SettingsTab } from './use-settings-form';

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
  { id: 'general', label: 'Triggers & Shortcuts', icon: IconSearch },
  { id: 'appearance', label: 'Appearance', icon: IconSun },
  { id: 'sources', label: 'Dictionaries & Translation', icon: IconBook },
  { id: 'ai', label: 'AI Intelligence', icon: IconSparkles },
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

  return (
    <div
      className={cx(
        'app-shell settings-shell min-h-screen bg-paper text-content font-sans transition-colors selection:bg-accent/20',
        isDarkMode ? 'dark' : 'light-theme light',
      )}
      data-theme={isDarkMode ? 'dark' : 'light'}
    >
      {/* Top App Bar */}
      <header className="sticky top-0 z-30 bg-surface/90 backdrop-blur-md border-b border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-[4.75rem] flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-accent-subtle border border-accent/30 flex items-center justify-center text-accent shadow-xs shrink-0">
              <IconSettings className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h1 className="font-bold text-[17px] sm:text-lg text-content font-heading truncate tracking-tight">
                Preferences
              </h1>
              <p className="text-[11.5px] text-content-muted truncate hidden sm:block">
                Triggers, dictionaries, AI, and appearance
              </p>
            </div>
          </div>

          <div
            role="status"
            aria-live="polite"
            className={cx(
              'text-[11px] font-semibold whitespace-nowrap',
              isDirty ? 'text-amber-700 dark:text-amber-300' : 'text-content-muted',
            )}
          >
            {isSaving ? 'Saving…' : isDirty ? 'Unsaved changes' : isSavedNotice ? 'Saved' : 'All changes saved'}
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
                'px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 shrink-0',
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
            <nav className="space-y-1.5 bg-surface border border-border rounded-2xl p-2.5 shadow-card">
              {TABS.map(({ id, label, icon: Icon }) => {
                const isActive = activeTab === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => switchTab(id)}
                    className={cx(
                      'w-full px-3.5 py-2.5 rounded-xl text-left text-xs font-semibold transition-all cursor-pointer flex items-center gap-2.5',
                      isActive
                        ? 'chip-active font-bold shadow-2xs'
                        : 'text-content-secondary hover:text-content hover:bg-muted/70',
                    )}
                  >
                    <Icon className={cx('w-4 h-4 shrink-0', isActive ? 'text-accent' : 'text-content-muted')} />
                    <span>{label}</span>
                  </button>
                );
              })}
            </nav>

            {/* Backup & Tools Card */}
            <div className="bg-surface border border-border rounded-2xl p-4 space-y-3 shadow-card">
              <span className="text-[10.5px] font-bold text-content-muted uppercase tracking-wider block font-mono">
                Data &amp; Backup
              </span>
              <div className="space-y-1.5">
                <button
                  type="button"
                  onClick={exportSettings}
                  title="Download settings JSON backup"
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-muted/70 text-xs text-content-secondary hover:text-content font-medium transition-colors cursor-pointer flex items-center justify-between border border-transparent hover:border-border"
                >
                  <span>Export JSON</span>
                  <span className="text-[10px] text-content-muted font-mono">↓</span>
                </button>
                <button
                  type="button"
                  onClick={triggerImportFile}
                  title="Restore settings from JSON file"
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-muted/70 text-xs text-content-secondary hover:text-content font-medium transition-colors cursor-pointer flex items-center justify-between border border-transparent hover:border-border"
                >
                  <span>Import JSON</span>
                  <span className="text-[10px] text-content-muted font-mono">↑</span>
                </button>
                <button
                  type="button"
                  onClick={handleClearLookupCaches}
                  title="Remove locally cached lookup results"
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-muted/70 text-xs text-content-secondary hover:text-content font-medium transition-colors cursor-pointer flex items-center justify-between border border-transparent hover:border-border"
                >
                  <span>{cacheClearedNotice ? 'Cache cleared' : 'Clear lookup cache'}</span>
                  <span className="text-[10px] text-content-muted font-mono">×</span>
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

      {/* Floating Sticky Save Bar on scroll */}
      <div className="fixed bottom-0 inset-x-0 z-20 bg-surface/92 backdrop-blur-md border-t border-border py-3.5 px-4 sm:px-6 shadow-elevated">
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
            <kbd className="hidden sm:inline px-1.5 py-0.5 rounded-md bg-muted text-content border border-border font-mono text-[10.5px]">
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
