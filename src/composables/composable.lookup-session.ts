import { signal, useSignal } from '../ui/signal';
import { TabId, AiIntentId } from '../types';
import {
  searchWord,
  stopAllAudio,
  playPronunciation,
  startSpeechPractice,
  abortActiveDictRequest,
  clearDictionaryCache,
  isAudioPlayingRef,
  playingKeyRef,
  supportsSpeechPractice,
  getDictionaryStore,
} from './composable.dictionary';
import { getAiAssistantStore } from './composable.ai-assistant';
import { useStorage } from './composable.storage';

const sessionTermRef = signal<string>('');
const sessionContextRef = signal<string>('');

export function useLookupSession() {
  const { settings, saveSettings, activeTab, setActiveTab, activeIntent, setActiveIntent } = useStorage();
  const dictStore = getDictionaryStore();
  const aiStore = getAiAssistantStore();

  const term = useSignal(sessionTermRef);
  const context = useSignal(sessionContextRef);
  const dictResult = useSignal(dictStore.result);
  const isDictLoading = useSignal(dictStore.isLoading);
  const dictError = useSignal(dictStore.error);
  const practiceResult = useSignal(dictStore.practiceResult);
  const isPracticing = useSignal(dictStore.isPracticing);
  const isAudioPlaying = useSignal(isAudioPlayingRef);
  const playingKey = useSignal(playingKeyRef);

  const aiResult = useSignal(aiStore.aiResult);
  const isAiLoading = useSignal(aiStore.isAiLoading);
  const aiError = useSignal(aiStore.aiError);
  const intentStatusEpoch = useSignal(aiStore.intentStatusEpoch);

  function setSessionTerm(newTerm: string) {
    sessionTermRef.value = newTerm;
  }

  function setSessionContext(newContext: string) {
    sessionContextRef.value = newContext;
    aiStore.activeContext.value = newContext;
  }

  function lookupTerm(
    targetWord: string,
    surroundingContext?: string,
    providerName?: string,
    targetLang?: string,
    requestId?: string,
  ) {
    const cleanWord = String(targetWord || '').trim();
    if (!cleanWord) return;
    sessionTermRef.value = cleanWord;
    if (surroundingContext !== undefined) {
      sessionContextRef.value = surroundingContext;
    }
    const cleanContext = surroundingContext !== undefined ? surroundingContext : sessionContextRef.value;
    searchWord(cleanWord, providerName, targetLang, cleanContext, requestId);
  }

  function executeAiIntent(
    intentId: AiIntentId,
    targetWord?: string,
    surroundingContext?: string,
    targetLang?: string,
  ) {
    stopAllAudio();
    const word = String(targetWord || sessionTermRef.value).trim();
    if (!word) return;
    const ctx = surroundingContext !== undefined ? surroundingContext : sessionContextRef.value;
    setActiveIntent(intentId);
    void aiStore.runIntent(intentId, word, targetLang, ctx);
  }

  function abortAllLookups() {
    stopAllAudio();
    abortActiveDictRequest();
    aiStore.abortActiveAiRequest();
    aiStore.cancelAiPreload();
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
    term,
    context,
    setSessionTerm,
    setSessionContext,
    lookupTerm,
    executeAiIntent,
    abortAllLookups,
    switchTab,
    dictResult,
    isDictLoading,
    dictError,
    practiceResult,
    isPracticing,
    playPronunciation,
    startSpeechPractice,
    supportsSpeechPractice: supportsSpeechPractice(),
    clearDictionaryCache,
    isAudioPlaying,
    playingKey,
    stopAllAudio,
    aiResult,
    isAiLoading,
    aiError,
    activeIntent,
    setActiveIntent,
    activeTab,
    setActiveTab,
    intentStatusEpoch,
    getAiIntentStatus: aiStore.getAiIntentStatus,
    isAiIntentDisabled: aiStore.isAiIntentDisabled,
    preloadSpecificIntent: aiStore.preloadSpecificIntent,
    clearAiCache: aiStore.clearAiCache,
    settings,
    saveSettings,
  };
}
