import type { AppSettings, TabId } from '../../types';

export interface LookupSessionActions {
  getSettings(): AppSettings;
  setActiveTab(tab: TabId): void;
  stopAudio(): void;
  abortDictionary(): void;
  abortAi(): void;
}

/** Application policy for switching surfaces and cancelling work. */
export function createLookupSessionController(actions: LookupSessionActions) {
  return {
    abortAllLookups() {
      actions.stopAudio();
      actions.abortDictionary();
      actions.abortAi();
    },
    switchTab(nextTab: TabId) {
      actions.stopAudio();
      if (nextTab === 'ai_assistant' && actions.getSettings().enableAI === false) {
        actions.setActiveTab('dictionary');
        return;
      }
      actions.setActiveTab(nextTab);
    },
  };
}
