import { stopAllAudio, abortActiveDictRequest } from './composable.dictionary';
import { abortAiRuntimeIfLoaded } from './runtime-hooks';
import { setActiveTab, useSettings } from './composable.storage';
import { createLookupSessionController } from '../application/lookup-session';

export function useLookupSession() {
  const settings = useSettings();
  return createLookupSessionController({
    getSettings: () => settings,
    setActiveTab,
    stopAudio: stopAllAudio,
    abortDictionary: abortActiveDictRequest,
    abortAi: abortAiRuntimeIfLoaded,
  });
}
