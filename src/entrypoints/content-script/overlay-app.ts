import React from 'react';
import { createRoot, Root } from 'react-dom/client';
import Overlay from './overlay.in-page';

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

  let root: Root | null = createRoot(container);
  let currentProps = { ...props };

  function render(nextProps: OverlayProps) {
    if (!root) return;
    root.render(
      React.createElement(
        React.StrictMode,
        null,
        React.createElement(Overlay, {
          selectedText: nextProps.selectedText,
          contextSentence: nextProps.contextSentence,
          lookupRequestId: nextProps.lookupRequestId,
          isMaximized: nextProps.isMaximized,
          isDragging: nextProps.isDragging,
          isResizing: nextProps.isResizing,
          width: nextProps.width,
          height: nextProps.height,
          onClose: handlers.onClose,
          onToggleMaximize: handlers.onToggleMaximize,
          onStartDrag: handlers.onStartDrag,
          onStartResize: handlers.onStartResize,
        }),
      ),
    );
  }

  render(currentProps);

  return {
    update(next: OverlayProps) {
      currentProps = { ...currentProps, ...next };
      render(currentProps);
    },
    unmount() {
      if (root) {
        root.unmount();
        root = null;
      }
      container.innerHTML = '';
    },
  };
}
