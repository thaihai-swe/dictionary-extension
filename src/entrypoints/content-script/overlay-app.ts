import { createApp, h, reactive } from 'vue';
import Overlay from './overlay.in-page.vue';
import overlayCss from '@/assets/main.css?inline';

interface OverlayProps {
  selectedText?: string;
  contextSentence?: string;
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

export function mountOverlay(
  shadow: ShadowRoot,
  container: HTMLElement,
  props: OverlayProps,
  handlers: OverlayHandlers,
) {
  if (!shadow.querySelector('style[data-dict-overlay]')) {
    const style = document.createElement('style');
    style.dataset.dictOverlay = 'true';
    style.textContent = overlayCss;
    shadow.appendChild(style);
  }

  const state = reactive({ ...props });
  const app = createApp({
    setup() {
      return () => h(Overlay, {
        selectedText: state.selectedText,
        contextSentence: state.contextSentence,
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
