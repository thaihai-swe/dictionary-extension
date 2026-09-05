let abortAiRuntime: (() => void) | null = null;

export function registerAiRuntimeAbort(abort: () => void) {
  abortAiRuntime = abort;
}

export function abortAiRuntimeIfLoaded() {
  abortAiRuntime?.();
}
