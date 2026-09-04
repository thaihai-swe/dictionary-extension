import { TabId } from '../types';
import { stopAllAudio, abortActiveDictRequest } from './composable.dictionary';
import { abortAiRuntimeIfLoaded } from './runtime-hooks';
import { useStorage } from './composable.storage';

export function useLookupSession() {
  const { settings, saveSettings, setActiveTab } = useStorage();

  function abortAllLookups() {
    stopAllAudio();
    abortActiveDictRequest();
    abortAiRuntimeIfLoaded();
  }

  function switchTab(nextTab: TabId) {
    stopAllAudio();
    if (nextTab === 'ai_assistant' && settings.enableAI === false) {
      setActiveTab('dictionary');
      return;
    }
    setActiveTab(nextTab);
    void saveSettings({ defaultTab: nextTab });
  }

  return {
    abortAllLookups,
    switchTab,
  };
}
