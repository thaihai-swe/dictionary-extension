import { extractSurroundingContext as extractPageContext } from '../../shared/page-context';
import { isExtensionContextInvalidated } from '../../shared/messages';

type BootSettings = {
  theme: string;
  selectionTriggerMode: 'off' | 'icon' | 'direct';
  postSelectionModifier: 'shift' | 'alt' | 'ctrl';
  pausedHostnames: string[];
  popupWidth: number;
  popupHeight: number;
  disablePageContextExtraction: boolean;
};

type OverlayApi = {
  update: (props: Record<string, unknown>) => void;
  unmount: () => void;
};

type OverlayModule = {
  mountOverlay: (
    shadow: ShadowRoot,
    container: HTMLElement,
    props: Record<string, unknown>,
    handlers: {
      onClose: () => void;
      onToggleMaximize: () => void;
      onStartDrag: (event: MouseEvent) => void;
      onStartResize: (event: MouseEvent) => void;
    },
  ) => OverlayApi;
};

const BOOT_DEFAULTS: BootSettings = {
  theme: 'dark',
  selectionTriggerMode: 'icon',
  postSelectionModifier: 'shift',
  pausedHostnames: [],
  popupWidth: 620,
  popupHeight: 720,
  disablePageContextExtraction: false,
};

const TRIGGER_CSS = `
.dictionary-trigger-icon-btn {
  position: fixed;
  z-index: 2147483646;
  width: 36px;
  height: 36px;
  border-radius: 9999px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 10px 24px rgba(13, 148, 136, 0.35);
  transition: transform 160ms ease;
  animation: dictionary-trigger-enter 220ms cubic-bezier(0.34, 1.56, 0.64, 1);
}
.dictionary-trigger-icon-btn:hover { transform: scale(1.1); }
.dictionary-trigger-icon-btn.dark {
  background: #0d9488;
  color: #fff;
  border: 2px solid #1e293b;
}
.dictionary-trigger-icon-btn.light {
  background: #4f46a5;
  color: #fff;
  border: 2px solid #fff;
}
.dictionary-popup-layer {
  position: fixed;
  z-index: 2147483647;
  pointer-events: auto;
}
.dictionary-popup-layer.maximized {
  inset: 1.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
}
.dictionary-backdrop {
  position: fixed;
  inset: 0;
  z-index: 2147483646;
  background: rgba(0, 0, 0, 0.6);
}
@keyframes dictionary-trigger-enter {
  0% { opacity: 0; transform: scale(0.65); }
  70% { transform: scale(1.08); }
  100% { opacity: 1; transform: scale(1); }
}
`;

if (document.getElementById('dictionary-extension-root')) {
  // Already injected in this frame.
} else {
  void startBootstrap();
}

async function startBootstrap() {
  const host = document.createElement('div');
  host.id = 'dictionary-extension-root';
  (document.body || document.documentElement).appendChild(host);
  const shadow = host.attachShadow({ mode: 'open' });

  const bootStyle = document.createElement('style');
  bootStyle.textContent = TRIGGER_CSS;
  shadow.appendChild(bootStyle);

  const triggerBtn = document.createElement('button');
  triggerBtn.type = 'button';
  triggerBtn.title = 'Look up selection in Dictionary';
  triggerBtn.className = 'dictionary-trigger-icon-btn dark';
  triggerBtn.style.display = 'none';
  triggerBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M9 3.5a5.5 5.5 0 1 0 3.5 9.7l3.15 3.15a1 1 0 0 0 1.4-1.4l-3.15-3.15A5.5 5.5 0 0 0 9 3.5Zm-3.5 5.5a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0Z"></path></svg>';
  shadow.appendChild(triggerBtn);

  const backdrop = document.createElement('div');
  backdrop.className = 'dictionary-backdrop';
  backdrop.style.display = 'none';
  shadow.appendChild(backdrop);

  const popupLayer = document.createElement('div');
  popupLayer.className = 'dictionary-popup-layer';
  popupLayer.style.display = 'none';
  const overlayMount = document.createElement('div');
  popupLayer.appendChild(overlayMount);
  shadow.appendChild(popupLayer);

  let settings: BootSettings = { ...BOOT_DEFAULTS };
  let overlayApi: OverlayApi | null = null;
  let overlayModulePromise: Promise<OverlayModule> | null = null;
  let showPopup = false;
  let isMaximized = false;
  let selectedText = '';
  let contextSentence = '';
  let selectionRange: Range | null = null;
  let customWidth: number | null = null;
  let customHeight: number | null = null;
  let popupX = 0;
  let popupY = 0;
  let triggerX = 0;
  let triggerY = 0;

  let isDragging = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let popupStartX = 0;
  let popupStartY = 0;
  let isResizing = false;
  let resizeStartX = 0;
  let resizeStartY = 0;
  let initialWidth = 0;
  let initialHeight = 0;

  await loadBootSettings();
  applyTheme();

  function isDarkMode() {
    if (settings.theme === 'system') {
      return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? true;
    }
    return settings.theme !== 'light';
  }

  function applyTheme() {
    triggerBtn.classList.toggle('dark', isDarkMode());
    triggerBtn.classList.toggle('light', !isDarkMode());
  }

  function isHostnamePaused() {
    const hostName = location.hostname.toLowerCase();
    return settings.pausedHostnames.some((item) => item === hostName);
  }

  function popupSize() {
    return {
      width: customWidth || settings.popupWidth || 480,
      height: customHeight || settings.popupHeight || 580,
    };
  }

  function positionPopup(x: number, y: number) {
    const { width, height } = popupSize();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let left = x;
    let top = y + 14;
    if (top + height > vh - 24) top = y - height - 14;
    left = Math.max(24, Math.min(left, vw - width - 24));
    top = Math.max(24, Math.min(top, vh - height - 24));
    popupX = left;
    popupY = top;
    popupLayer.style.left = `${left}px`;
    popupLayer.style.top = `${top}px`;
  }

  function snapshotSelection(selection: Selection | null) {
    selectionRange = null;
    if (!selection || selection.rangeCount <= 0) return;
    try {
      selectionRange = selection.getRangeAt(0).cloneRange();
    } catch {
      selectionRange = null;
    }
  }

  function extractSurroundingContext(selectedStr: string): string {
    return extractPageContext(
      selectedStr,
      settings.disablePageContextExtraction,
      selectionRange,
    ).context || '';
  }

  function loadOverlayModule() {
    if (isExtensionContextInvalidated()) {
      return Promise.reject(new Error('Extension was reloaded. Refresh this page to continue.'));
    }
    if (!overlayModulePromise) {
      try {
        overlayModulePromise = import(/* @vite-ignore */ chrome.runtime.getURL('overlay.js')) as Promise<OverlayModule>;
      } catch (error) {
        if (isExtensionContextInvalidated(error)) {
          return Promise.reject(new Error('Extension was reloaded. Refresh this page to continue.'));
        }
        throw error;
      }
    }
    return overlayModulePromise;
  }

  function overlayProps() {
    return {
      selectedText,
      contextSentence,
      isMaximized,
      isDragging,
      isResizing,
      width: customWidth || undefined,
      height: customHeight || undefined,
    };
  }

  async function openPopup(x: number, y: number, text: string, context?: string) {
    if (isHostnamePaused()) return;
    triggerBtn.style.display = 'none';
    selectedText = text;
    contextSentence = context || extractSurroundingContext(text);
    positionPopup(x, y);
    showPopup = true;
    isMaximized = false;
    popupLayer.classList.remove('maximized');
    popupLayer.style.display = 'block';
    backdrop.style.display = 'none';

    let mod: OverlayModule;
    try {
      mod = await loadOverlayModule();
    } catch (error) {
      if (isExtensionContextInvalidated(error)) {
        closePopup();
        return;
      }
      throw error;
    }
    if (!showPopup) return;
    if (!overlayApi) {
      overlayApi = mod.mountOverlay(shadow, overlayMount, overlayProps(), {
        onClose: closePopup,
        onToggleMaximize: toggleMaximize,
        onStartDrag: handleStartDrag,
        onStartResize: handleStartResize,
      });
    } else {
      overlayApi.update(overlayProps());
    }
  }

  function closePopup() {
    showPopup = false;
    isMaximized = false;
    triggerBtn.style.display = 'none';
    popupLayer.style.display = 'none';
    backdrop.style.display = 'none';
    overlayApi?.unmount();
    overlayApi = null;
  }

  function toggleMaximize() {
    isMaximized = !isMaximized;
    popupLayer.classList.toggle('maximized', isMaximized);
    popupLayer.style.left = isMaximized ? '' : `${popupX}px`;
    popupLayer.style.top = isMaximized ? '' : `${popupY}px`;
    backdrop.style.display = isMaximized ? 'block' : 'none';
    overlayApi?.update(overlayProps());
  }

  function handleStartDrag(e: MouseEvent) {
    if (isMaximized) return;
    isDragging = true;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    popupStartX = popupX;
    popupStartY = popupY;
    overlayApi?.update(overlayProps());
    window.addEventListener('mousemove', handleDragMove);
    window.addEventListener('mouseup', handleDragEnd);
  }

  function handleDragMove(e: MouseEvent) {
    if (!isDragging) return;
    const { width, height } = popupSize();
    let newX = popupStartX + (e.clientX - dragStartX);
    let newY = popupStartY + (e.clientY - dragStartY);
    newX = Math.max(8, Math.min(newX, window.innerWidth - width - 8));
    newY = Math.max(8, Math.min(newY, window.innerHeight - height - 8));
    popupX = newX;
    popupY = newY;
    popupLayer.style.left = `${newX}px`;
    popupLayer.style.top = `${newY}px`;
  }

  function handleDragEnd() {
    isDragging = false;
    overlayApi?.update(overlayProps());
    window.removeEventListener('mousemove', handleDragMove);
    window.removeEventListener('mouseup', handleDragEnd);
  }

  function handleStartResize(e: MouseEvent) {
    if (isMaximized) return;
    isResizing = true;
    resizeStartX = e.clientX;
    resizeStartY = e.clientY;
    initialWidth = customWidth || settings.popupWidth || 480;
    initialHeight = customHeight || settings.popupHeight || 580;
    overlayApi?.update(overlayProps());
    window.addEventListener('mousemove', handleResizeMove);
    window.addEventListener('mouseup', handleResizeEnd);
  }

  function handleResizeMove(e: MouseEvent) {
    if (!isResizing) return;
    customWidth = Math.max(360, Math.min(window.innerWidth - popupX - 16, initialWidth + (e.clientX - resizeStartX)));
    customHeight = Math.max(380, Math.min(window.innerHeight - popupY - 16, initialHeight + (e.clientY - resizeStartY)));
    overlayApi?.update(overlayProps());
  }

  function handleResizeEnd() {
    if (isResizing && customWidth && customHeight) {
      settings.popupWidth = customWidth;
      settings.popupHeight = customHeight;
      void chrome.storage?.sync?.set({ popupWidth: customWidth, popupHeight: customHeight });
    }
    isResizing = false;
    overlayApi?.update(overlayProps());
    window.removeEventListener('mousemove', handleResizeMove);
    window.removeEventListener('mouseup', handleResizeEnd);
  }

  function updateSelectionTrigger(event?: MouseEvent) {
    if (isHostnamePaused()) {
      triggerBtn.style.display = 'none';
      return;
    }
    const selection = window.getSelection();
    const text = selection?.toString().trim();
    if (!text) {
      triggerBtn.style.display = 'none';
      return;
    }
    const mode = settings.selectionTriggerMode || 'icon';
    if (mode === 'off') return;

    snapshotSelection(selection);
    selectedText = text;
    contextSentence = extractSurroundingContext(text);
    void loadOverlayModule();

    const iconSize = 38;
    const margin = 10;
    let x = window.innerWidth / 2;
    let y = window.innerHeight / 2;
    if (event && typeof event.clientX === 'number') {
      x = event.clientX + 12;
      y = event.clientY + 8;
      if (x + iconSize > window.innerWidth - margin) x = event.clientX - iconSize - 12;
      if (y + iconSize > window.innerHeight - margin) y = event.clientY - iconSize - 8;
    } else if (selection && selection.rangeCount > 0) {
      const rect = selection.getRangeAt(0).getBoundingClientRect();
      if (rect && (rect.width || rect.height)) {
        x = rect.right + margin;
        y = rect.top + Math.max(0, (rect.height - iconSize) / 2);
        if (x + iconSize > window.innerWidth - margin) x = rect.left - iconSize - margin;
        if (x < margin) {
          x = Math.max(margin, Math.min(rect.left, window.innerWidth - iconSize - margin));
          y = rect.bottom + margin;
        }
      }
    }
    triggerX = Math.max(margin, Math.min(x, window.innerWidth - iconSize - margin));
    triggerY = Math.max(margin, Math.min(y, window.innerHeight - iconSize - margin));

    if (mode === 'direct') {
      void openPopup(triggerX, triggerY, text, contextSentence);
      return;
    }

    triggerBtn.style.left = `${triggerX}px`;
    triggerBtn.style.top = `${triggerY}px`;
    triggerBtn.style.display = showPopup ? 'none' : 'flex';
  }

  triggerBtn.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (selectedText) void openPopup(triggerX, triggerY, selectedText, contextSentence);
  });
  backdrop.addEventListener('click', () => {
    if (isMaximized) toggleMaximize();
  });

  window.addEventListener('mouseup', (event) => {
    if (host.contains(event.target as Node) || shadow.contains(event.target as Node)) return;
    setTimeout(() => updateSelectionTrigger(event), 10);
  });

  window.addEventListener('keydown', (event) => {
    const target = event.target as HTMLElement;
    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target.isContentEditable) return;
    const currentSelection = window.getSelection()?.toString().trim();
    const modifier = settings.postSelectionModifier || 'shift';
    if (currentSelection) {
      const matches =
        (modifier === 'shift' && event.shiftKey)
        || (modifier === 'alt' && event.altKey)
        || (modifier === 'ctrl' && (event.ctrlKey || event.metaKey));
      if (matches && (event.key === 'Q' || event.key === 'q')) {
        updateSelectionTrigger();
        event.preventDefault();
        return;
      }
    }
    if (event.key === 'Escape') closePopup();
  });

  window.addEventListener('click', (event) => {
    if (isDragging || isResizing || !showPopup) return;
    const target = event.target as Node;
    if (!host.contains(target) && !shadow.contains(target)) closePopup();
  }, true);

  chrome.runtime?.onMessage?.addListener((message: { type?: string; text?: string; payload?: { text?: string; context?: string; fromSelection?: boolean } }) => {
    const payload = message.payload || {};
    const fromLookup = message.type === 'OPEN_LOOKUP_POPUP' || message.type === 'DICTIONARY_LOOKUP';
    if (!fromLookup) return;
    const selection = window.getSelection();
    const text = String(payload.text || message.text || '').trim() || (payload.fromSelection || !message.text ? selection?.toString().trim() : '') || '';
    if (!text) return;
    snapshotSelection(selection);
    void openPopup(window.innerWidth / 2 - 220, 60, text, payload.context);
  });

  chrome.storage?.onChanged?.addListener((changes, area) => {
    if (area !== 'sync') return;
    for (const [key, change] of Object.entries(changes)) {
      if (key in settings) (settings as Record<string, unknown>)[key] = change.newValue;
    }
    settings.pausedHostnames = normalizeHostnames(settings.pausedHostnames);
    applyTheme();
  });

  async function loadBootSettings() {
    if (typeof chrome === 'undefined' || !chrome.storage?.sync) return;
    try {
      const stored = await chrome.storage.sync.get({
        theme: BOOT_DEFAULTS.theme,
        selectionTriggerMode: BOOT_DEFAULTS.selectionTriggerMode,
        postSelectionModifier: BOOT_DEFAULTS.postSelectionModifier,
        pausedHostnames: BOOT_DEFAULTS.pausedHostnames,
        popupWidth: BOOT_DEFAULTS.popupWidth,
        popupHeight: BOOT_DEFAULTS.popupHeight,
        disablePageContextExtraction: BOOT_DEFAULTS.disablePageContextExtraction,
      });
      const mode = stored.selectionTriggerMode;
      const modifier = stored.postSelectionModifier;
      settings = {
        theme: String(stored.theme || BOOT_DEFAULTS.theme),
        selectionTriggerMode: mode === 'off' || mode === 'direct' || mode === 'icon' ? mode : BOOT_DEFAULTS.selectionTriggerMode,
        postSelectionModifier: modifier === 'alt' || modifier === 'ctrl' || modifier === 'shift' ? modifier : BOOT_DEFAULTS.postSelectionModifier,
        pausedHostnames: normalizeHostnames(stored.pausedHostnames),
        popupWidth: Number(stored.popupWidth) || BOOT_DEFAULTS.popupWidth,
        popupHeight: Number(stored.popupHeight) || BOOT_DEFAULTS.popupHeight,
        disablePageContextExtraction: Boolean(stored.disablePageContextExtraction),
      };
    } catch {
      settings = { ...BOOT_DEFAULTS };
    }
  }
}

function normalizeHostnames(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => String(item).trim().toLowerCase()).filter(Boolean);
  if (typeof value === 'string' && value.trim()) {
    return value.split('\n').map((item) => item.trim().toLowerCase()).filter(Boolean);
  }
  return [];
}
