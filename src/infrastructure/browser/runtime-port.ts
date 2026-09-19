import {
  isExtensionContextInvalidated,
  runtimeErrorMessage,
  type RuntimeResponse,
} from '../../shared/messages';

export interface BrowserRuntimePort {
  isAvailable(): boolean;
  send<T>(message: unknown): Promise<RuntimeResponse<T>>;
  sendNoWait(message: unknown): void;
}

function runtimeUnavailable(): Error {
  return new Error('Extension runtime is unavailable.');
}

export const browserRuntimePort: BrowserRuntimePort = {
  isAvailable() {
    try {
      return typeof chrome !== 'undefined'
        && typeof chrome.runtime?.sendMessage === 'function'
        && !isExtensionContextInvalidated();
    } catch {
      return false;
    }
  },

  send<T>(message: unknown): Promise<RuntimeResponse<T>> {
    if (!browserRuntimePort.isAvailable()) return Promise.reject(runtimeUnavailable());
    return new Promise((resolve, reject) => {
      try {
        chrome.runtime.sendMessage(message, (response: RuntimeResponse<T>) => {
          const lastError = runtimeErrorMessage('');
          if (lastError) {
            reject(new Error(lastError));
            return;
          }
          resolve(response || { ok: false, error: 'Empty runtime response.' });
        });
      } catch (error) {
        reject(isExtensionContextInvalidated(error)
          ? runtimeUnavailable()
          : error instanceof Error ? error : runtimeUnavailable());
      }
    });
  },

  sendNoWait(message: unknown) {
    if (!browserRuntimePort.isAvailable()) return;
    try {
      chrome.runtime.sendMessage(message, () => {
        void runtimeErrorMessage('');
      });
    } catch {
      // The receiver may disappear while a popup or content script is closing.
    }
  },
};
