import { mountOverlay } from './overlay-app';

type OverlayRuntime = typeof globalThis & {
  __dictionaryAssistantOverlay?: { mountOverlay: typeof mountOverlay };
};

(globalThis as OverlayRuntime).__dictionaryAssistantOverlay = { mountOverlay };
