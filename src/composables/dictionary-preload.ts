import { GenerationGate } from '../shared/generation-gate';
import { settingsStore, whenSettingsReady } from './composable.storage';

export const aiPreloadGeneration = new GenerationGate();

const AI_PRELOAD_DEBOUNCE_MS = 600;
let aiPreloadTimer: ReturnType<typeof setTimeout> | null = null;

export function cancelAiPreload() {
  aiPreloadGeneration.invalidate();
  if (aiPreloadTimer) {
    clearTimeout(aiPreloadTimer);
    aiPreloadTimer = null;
  }
}

export function scheduleAiPreload(
  text: string,
  targetLang: string,
  context?: string,
  generation = aiPreloadGeneration.current(),
) {
  const settings = settingsStore.value;
  if (!settings.enableAI || !settings.preloadedAiIntents?.length) return;
  if (aiPreloadTimer) {
    clearTimeout(aiPreloadTimer);
    aiPreloadTimer = null;
  }

  aiPreloadTimer = setTimeout(() => {
    aiPreloadTimer = null;
    void (async () => {
      await whenSettingsReady();
      if (!aiPreloadGeneration.isCurrent(generation)) return;
      const next = settingsStore.value;
      if (!next.enableAI || !next.preloadedAiIntents?.length) return;
      const { getAiAssistantStore } = await import('./composable.ai-assistant');
      if (!aiPreloadGeneration.isCurrent(generation)) return;
      await getAiAssistantStore().preloadIntents(text, context, targetLang);
    })();
  }, AI_PRELOAD_DEBOUNCE_MS);
}
