import { stopAllAudio, abortActiveDictRequest } from './composable.dictionary';
import { abortAiRuntimeIfLoaded } from './runtime-hooks';
import { useStorage } from './composable.storage';
import { createLookupSessionController } from '../application/lookup-session';

export function useLookupSession() {
  const { settings, setActiveTab } = useStorage();
  return createLookupSessionController({
    getSettings: () => settings,
    setActiveTab,
    stopAudio: stopAllAudio,
    abortDictionary: abortActiveDictRequest,
    abortAi: abortAiRuntimeIfLoaded,
  });
}
