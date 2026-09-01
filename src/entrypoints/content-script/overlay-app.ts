import { createApp, h, reactive } from 'vue';
import Overlay from './overlay.in-page.vue';

interface OverlayProps {
  selectedText?: string;
  contextSentence?: string;
  lookupRequestId?: string;
  isMaximized?: boolean;
  isDragging?: boolean;
  isResizing?: boolean;
  width?: number;
  height?: number;
}

interface OverlayHandlers {
  onClose: () => void;
  onToggleMaximize: () => void;
  onStartDrag: (event: MouseEvent) => void;
  onStartResize: (event: MouseEvent) => void;
}

function ensureOverlayStyles(shadow: ShadowRoot) {
  if (shadow.querySelector('[data-dict-overlay-css]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.dataset.dictOverlayCss = 'true';
  link.href = chrome.runtime.getURL('overlay.css');
  shadow.appendChild(link);
}

export function mountOverlay(
  shadow: ShadowRoot,
  container: HTMLElement,
  props: OverlayProps,
  handlers: OverlayHandlers,
) {
  ensureOverlayStyles(shadow);

  const state = reactive({ ...props });
  const app = createApp({
    setup() {
      return () => h(Overlay, {
        selectedText: state.selectedText,
        contextSentence: state.contextSentence,
        lookupRequestId: state.lookupRequestId,
        isMaximized: state.isMaximized,
        isDragging: state.isDragging,
        isResizing: state.isResizing,
        width: state.width,
        height: state.height,
        onClose: handlers.onClose,
        onToggleMaximize: handlers.onToggleMaximize,
        onStartDrag: handlers.onStartDrag,
        onStartResize: handlers.onStartResize,
      });
    },
  });
  app.mount(container);

  return {
    update(next: OverlayProps) {
      Object.assign(state, next);
    },
    unmount() {
      app.unmount();
      container.innerHTML = '';
    },
  };
}
