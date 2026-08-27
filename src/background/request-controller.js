const activeControllers = new Map();

function getRequestKey(tabId, scope, requestId) {
    return `${tabId || "global"}:${scope || "default"}:${requestId}`;
}

export function registerController(tabId, scope, requestId) {
    const controller = new AbortController();
    const key = getRequestKey(tabId, scope, requestId);
    // Only cancel older in-flight requests in the SAME scope on this tab
    // so background AI preloads do not cancel the primary dictionary lookup.
    cancelRequestsForScope(tabId, scope);
    activeControllers.set(key, controller);
    return controller;
}

export function getController(tabId, scope, requestId) {
    return activeControllers.get(getRequestKey(tabId, scope, requestId)) || null;
}

export function unregisterController(tabId, scope, requestId) {
    const key = getRequestKey(tabId, scope, requestId);
    activeControllers.delete(key);
}

export function cancelRequestsForScope(tabId, scope) {
    const prefix = `${tabId || "global"}:${scope || "default"}:`;
    for (const [key, ctrl] of activeControllers.entries()) {
        if (key.startsWith(prefix)) {
            ctrl.abort();
            activeControllers.delete(key);
        }
    }
}

export function cancelRequestsForTab(tabId) {
    const prefix = `${tabId || "global"}:`;
    for (const [key, ctrl] of activeControllers.entries()) {
        if (key.startsWith(prefix)) {
            ctrl.abort();
            activeControllers.delete(key);
        }
    }
}
