// Chrome Extension Manifest V3 Background Service Worker

chrome.runtime.onInstalled.addListener(() => {
  console.log('[Dictionary Extension v2.0] Background Service Worker initialized.');

  chrome.contextMenus.create({
    id: 'lookup_selection',
    title: 'Lookup "%s" in Dictionary',
    contexts: ['selection'],
  });
});

chrome.contextMenus.onClicked.addListener((info: chrome.contextMenus.OnClickData, tab?: chrome.tabs.Tab) => {
  if (info.menuItemId === 'lookup_selection' && info.selectionText && tab?.id) {
    chrome.tabs.sendMessage(tab.id, {
      type: 'DICTIONARY_LOOKUP',
      text: info.selectionText,
    });
  }
});

chrome.commands.onCommand.addListener((command: string) => {
  if (command === 'lookup-selection') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, {
          type: 'DICTIONARY_LOOKUP',
          text: '',
        });
      }
    });
  }
});

// Map to track active in-flight network requests for background cancellation
const activeProxyRequests = new Map<string, AbortController>();

// Proxy fetch requests from content-script to bypass webpage CORS policies with cancellation support
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'FETCH_PROXY' && message.url) {
    const requestId = message.requestId;
    const controller = new AbortController();
    if (requestId) {
      activeProxyRequests.set(requestId, controller);
    }

    const fetchOptions = {
      ...(message.options || {}),
      signal: controller.signal,
    };

    fetch(message.url, fetchOptions)
      .then(async (res) => {
        if (requestId) activeProxyRequests.delete(requestId);
        const text = await res.text();
        let data;
        try {
          data = JSON.parse(text);
        } catch {
          data = text;
        }
        sendResponse({ ok: res.ok, status: res.status, data });
      })
      .catch((err) => {
        if (requestId) activeProxyRequests.delete(requestId);
        sendResponse({ ok: false, status: 0, error: err.message });
      });

    return true; // Keep message channel open for async response
  }

  if (message.type === 'ABORT_FETCH_PROXY' && message.requestId) {
    const controller = activeProxyRequests.get(message.requestId);
    if (controller) {
      controller.abort();
      activeProxyRequests.delete(message.requestId);
    }
    sendResponse({ ok: true });
  }
});
