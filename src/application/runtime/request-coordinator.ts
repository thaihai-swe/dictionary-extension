import { AbortRegistry } from '../../shared/abort-registry';

export function requestKey(tabId: number | undefined, scope: string, requestId: string): string {
  return `${Number.isInteger(tabId) ? tabId : 'popup'}:${scope}:${requestId}`;
}

export function requestPrefix(tabId: number | undefined, scope: string): string {
  return `${Number.isInteger(tabId) ? tabId : 'popup'}:${scope}:`;
}

/** Coordinates abort scopes and in-flight dictionary requests in the background runtime. */
export class RequestCoordinator<TRequest extends { requestId: string }> {
  readonly controllers = new AbortRegistry();
  readonly dictionaryRequests = new Map<string, Promise<TRequest>>();

  register(tabId: number | undefined, scope: string, requestId: string): AbortController {
    return this.controllers.register(
      requestKey(tabId, scope, requestId),
      requestPrefix(tabId, scope),
    );
  }

  unregister(tabId: number | undefined, scope: string, requestId: string): void {
    this.controllers.unregister(requestKey(tabId, scope, requestId));
  }

  cancelScope(tabId: number | undefined, scope: string, exceptRequestId?: string): void {
    const prefix = requestPrefix(tabId, scope);
    const exceptKey = exceptRequestId ? requestKey(tabId, scope, exceptRequestId) : '';
    this.controllers.cancelPrefix(prefix, exceptKey);
    for (const key of this.dictionaryRequests.keys()) {
      if (key.startsWith(prefix) && key !== exceptKey) this.dictionaryRequests.delete(key);
    }
  }

  cancelTab(tabId: number | undefined): void {
    const prefix = `${Number.isInteger(tabId) ? tabId : 'popup'}:`;
    this.controllers.cancelPrefix(prefix);
    for (const key of this.dictionaryRequests.keys()) {
      if (key.startsWith(prefix)) this.dictionaryRequests.delete(key);
    }
  }

  clear(): void {
    this.controllers.cancelAll();
    this.dictionaryRequests.clear();
  }
}
