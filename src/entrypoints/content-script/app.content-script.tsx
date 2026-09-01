import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useStorage } from '@/composables/composable.storage';
import { abortActiveAiRequest } from '@/composables/composable.ai-assistant';
import { abortActiveDictRequest, stopAllAudio } from '@/composables/composable.dictionary';
import { extractSurroundingContext as extractPageContext } from '@/shared/page-context';
import InPageOverlay from './overlay.in-page';
import { cx } from '@/ui/cx';

export const ContentScriptApp: React.FC = () => {
  const { settings, saveSettings } = useStorage();

  const [showPopup, setShowPopup] = useState(false);
  const [showTriggerBtn, setShowTriggerBtn] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [popupX, setPopupX] = useState(0);
  const [popupY, setPopupY] = useState(0);
  const [triggerX, setTriggerX] = useState(0);
  const [triggerY, setTriggerY] = useState(0);
  const [selectedText, setSelectedText] = useState('');
  const [contextSentence, setContextSentence] = useState('');

  const [customWidth, setCustomWidth] = useState<number | null>(null);
  const [customHeight, setCustomHeight] = useState<number | null>(null);

  const isDragging = useRef(false);
  const dragStartX = useRef(0);
  const dragStartY = useRef(0);
  const popupStartX = useRef(0);
  const popupStartY = useRef(0);
  const popupXRef = useRef(0);
  const popupYRef = useRef(0);

  const isResizing = useRef(false);
  const resizeStartX = useRef(0);
  const resizeStartY = useRef(0);
  const initialWidth = useRef(0);
  const initialHeight = useRef(0);
  const customWidthRef = useRef<number | null>(null);
  const customHeightRef = useRef<number | null>(null);
  const [dragOrResizeTick, setDragOrResizeTick] = useState(0);

  const isDarkMode =
    settings.theme === 'system'
      ? typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches
      : settings.theme !== 'light';

  function positionPopup(x: number, y: number) {
    const POPUP_W = customWidthRef.current || settings.popupWidth || 480;
    const POPUP_H = customHeightRef.current || settings.popupHeight || 580;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let left = x;
    let top = y + 14;

    if (top + POPUP_H > vh - 24) {
      top = y - POPUP_H - 14;
    }

    left = Math.max(24, Math.min(left, vw - POPUP_W - 24));
    top = Math.max(24, Math.min(top, vh - POPUP_H - 24));

    popupXRef.current = left;
    popupYRef.current = top;
    setPopupX(left);
    setPopupY(top);
  }

  const handleDragMove = useCallback((e: MouseEvent) => {
    if (!isDragging.current) return;
    const deltaX = e.clientX - dragStartX.current;
    const deltaY = e.clientY - dragStartY.current;

    const POPUP_W = customWidthRef.current || settings.popupWidth || 480;
    const POPUP_H = customHeightRef.current || settings.popupHeight || 580;

    let newX = popupStartX.current + deltaX;
    let newY = popupStartY.current + deltaY;

    newX = Math.max(8, Math.min(newX, window.innerWidth - POPUP_W - 8));
    newY = Math.max(8, Math.min(newY, window.innerHeight - POPUP_H - 8));

    popupXRef.current = newX;
    popupYRef.current = newY;
    setPopupX(newX);
    setPopupY(newY);
  }, [settings.popupWidth, settings.popupHeight]);

  const handleDragEnd = useCallback(() => {
    isDragging.current = false;
    setDragOrResizeTick((n) => n + 1);
    window.removeEventListener('mousemove', handleDragMove);
    window.removeEventListener('mouseup', handleDragEnd);
  }, [handleDragMove]);

  function handleStartDrag(e: MouseEvent) {
    if (isMaximized) return;
    isDragging.current = true;
    setDragOrResizeTick((n) => n + 1);
    dragStartX.current = e.clientX;
    dragStartY.current = e.clientY;
    popupStartX.current = popupXRef.current;
    popupStartY.current = popupYRef.current;

    window.addEventListener('mousemove', handleDragMove);
    window.addEventListener('mouseup', handleDragEnd);
  }

  const handleResizeMove = useCallback((e: MouseEvent) => {
    if (!isResizing.current) return;
    const deltaX = e.clientX - resizeStartX.current;
    const deltaY = e.clientY - resizeStartY.current;

    const newW = Math.max(360, Math.min(window.innerWidth - popupXRef.current - 16, initialWidth.current + deltaX));
    const newH = Math.max(380, Math.min(window.innerHeight - popupYRef.current - 16, initialHeight.current + deltaY));

    customWidthRef.current = newW;
    customHeightRef.current = newH;
    setCustomWidth(newW);
    setCustomHeight(newH);
  }, []);

  const handleResizeEnd = useCallback(() => {
    if (isResizing.current && customWidthRef.current && customHeightRef.current) {
      void saveSettings({
        popupWidth: customWidthRef.current,
        popupHeight: customHeightRef.current,
      });
    }
    isResizing.current = false;
    setDragOrResizeTick((n) => n + 1);
    window.removeEventListener('mousemove', handleResizeMove);
    window.removeEventListener('mouseup', handleResizeEnd);
  }, [handleResizeMove, saveSettings]);

  function handleStartResize(e: MouseEvent) {
    if (isMaximized) return;
    isResizing.current = true;
    setDragOrResizeTick((n) => n + 1);
    resizeStartX.current = e.clientX;
    resizeStartY.current = e.clientY;
    initialWidth.current = customWidthRef.current || settings.popupWidth || 480;
    initialHeight.current = customHeightRef.current || settings.popupHeight || 580;

    window.addEventListener('mousemove', handleResizeMove);
    window.addEventListener('mouseup', handleResizeEnd);
  }

  function extractSurroundingContext(selectedStr: string): string {
    return extractPageContext(selectedStr, settings.disablePageContextExtraction).context || selectedStr;
  }

  function openPopup(x: number, y: number, text: string, context?: string) {
    setShowTriggerBtn(false);
    setSelectedText(text);
    setContextSentence(context || extractSurroundingContext(text));
    positionPopup(x, y);
    setShowPopup(true);
  }

  function closePopup() {
    stopAllAudio();
    abortActiveAiRequest();
    abortActiveDictRequest();
    setShowPopup(false);
    setShowTriggerBtn(false);
    setIsMaximized(false);
  }

  function handleTriggerClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (selectedText) {
      openPopup(triggerX, triggerY, selectedText, contextSentence);
    }
  }

  function updateSelectionTrigger(event?: MouseEvent) {
    const selection = window.getSelection();
    const text = selection?.toString().trim();

    if (!text || text.length === 0) {
      setShowTriggerBtn(false);
      return;
    }

    const mode = settings.selectionTriggerMode || 'icon';
    if (mode === 'off') return;

    setSelectedText(text);
    const surrounding = extractSurroundingContext(text);
    setContextSentence(surrounding);

    const iconSize = 38;
    const margin = 10;
    let x = window.innerWidth / 2;
    let y = window.innerHeight / 2;

    if (event && typeof event.clientX === 'number' && typeof event.clientY === 'number') {
      x = event.clientX + 12;
      y = event.clientY + 8;

      if (x + iconSize > window.innerWidth - margin) {
        x = event.clientX - iconSize - 12;
      }
      if (y + iconSize > window.innerHeight - margin) {
        y = event.clientY - iconSize - 8;
      }
    } else {
      try {
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          const rect = range.getBoundingClientRect();
          if (rect && (rect.width || rect.height)) {
            x = rect.right + margin;
            y = rect.top + Math.max(0, (rect.height - iconSize) / 2);

            if (x + iconSize > window.innerWidth - margin) {
              x = rect.left - iconSize - margin;
            }
            if (x < margin) {
              x = Math.max(margin, Math.min(rect.left, window.innerWidth - iconSize - margin));
              y = rect.bottom + margin;
            }
          }
        }
      } catch {
        // Ignore range rect error
      }
    }

    const nextX = Math.max(margin, Math.min(x, window.innerWidth - iconSize - margin));
    const nextY = Math.max(margin, Math.min(y, window.innerHeight - iconSize - margin));
    setTriggerX(nextX);
    setTriggerY(nextY);

    if (mode === 'direct') {
      openPopup(nextX, nextY, text, surrounding);
    } else {
      setShowTriggerBtn(true);
    }
  }

  useEffect(() => {
    function handleMouseUp(event: MouseEvent) {
      const root = document.getElementById('dictionary-extension-root');
      if (root && root.contains(event.target as Node)) return;
      setTimeout(() => {
        updateSelectionTrigger(event);
      }, 10);
    }

    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target.isContentEditable
      ) return;

      const currentSelection = window.getSelection()?.toString().trim();
      const modifier = settings.postSelectionModifier || 'shift';

      if (currentSelection) {
        const isMatchingModifierKey =
          (modifier === 'shift' && event.shiftKey) ||
          (modifier === 'alt' && event.altKey) ||
          (modifier === 'ctrl' && (event.ctrlKey || event.metaKey));

        const isQKey = event.key === 'Q' || event.key === 'q';

        if (isMatchingModifierKey && isQKey) {
          updateSelectionTrigger();
          event.preventDefault();
          return;
        }
      }

      if (event.key === 'Escape') {
        closePopup();
      }
    }

    function handleGlobalClick(event: MouseEvent) {
      if (isDragging.current || isResizing.current) return;
      const target = event.target as Node;
      const root = document.getElementById('dictionary-extension-root');
      if (root && !root.contains(target)) {
        closePopup();
      }
    }

    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('click', handleGlobalClick, true);

    let onMessage: ((message: { type?: string; text?: string; payload?: { text?: string; context?: string; fromSelection?: boolean } }) => void) | undefined;
    if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
      onMessage = (message) => {
        const payload = message.payload || {};
        const fromLookup = message.type === 'OPEN_LOOKUP_POPUP' || message.type === 'DICTIONARY_LOOKUP';
        if (!fromLookup) return;
        const text =
          String(payload.text || message.text || '').trim() ||
          (payload.fromSelection ? window.getSelection()?.toString().trim() : '') ||
          '';
        if (!text) return;
        openPopup(window.innerWidth / 2 - 220, 60, text, payload.context);
      };
      chrome.runtime.onMessage.addListener(onMessage);
    }

    return () => {
      stopAllAudio();
      abortActiveAiRequest();
      abortActiveDictRequest();
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('click', handleGlobalClick, true);
      window.removeEventListener('mousemove', handleDragMove);
      window.removeEventListener('mouseup', handleDragEnd);
      window.removeEventListener('mousemove', handleResizeMove);
      window.removeEventListener('mouseup', handleResizeEnd);
      if (onMessage && typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
        chrome.runtime.onMessage.removeListener(onMessage);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.postSelectionModifier, settings.selectionTriggerMode, settings.disablePageContextExtraction]);

  const draggingOrResizing = isDragging.current || isResizing.current;
  void dragOrResizeTick;

  return (
    <div className="relative font-sans pointer-events-none">
      {showTriggerBtn && !showPopup ? (
        <button
          type="button"
          onClick={handleTriggerClick}
          title="Look up selection in Dictionary"
          style={{ left: `${triggerX}px`, top: `${triggerY}px` }}
          className={cx(
            'dictionary-trigger-icon-btn fixed z-[2147483646] w-9 h-9 rounded-full flex items-center justify-center cursor-pointer pointer-events-auto transition-transform hover:scale-110 active:scale-95 shadow-xl',
            isDarkMode
              ? 'bg-[#0d9488] hover:bg-[#0f766e] text-white border-2 border-[#1e293b] shadow-[#0d9488]/40'
              : 'bg-[#4f46a5] hover:bg-[#4338ca] text-white border-2 border-[#ffffff] shadow-[#4f46a5]/35',
          )}
        >
          <svg className="w-4.5 h-4.5 text-white fill-current" viewBox="0 0 20 20" aria-hidden="true">
            <path d="M9 3.5a5.5 5.5 0 1 0 3.5 9.7l3.15 3.15a1 1 0 0 0 1.4-1.4l-3.15-3.15A5.5 5.5 0 0 0 9 3.5Zm-3.5 5.5a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0Z"></path>
          </svg>
        </button>
      ) : null}

      {showPopup && isMaximized ? (
        <div
          className="fixed inset-0 z-[2147483646] bg-black/60 backdrop-blur-xs pointer-events-auto transition-opacity duration-300"
          onClick={() => setIsMaximized(false)}
        />
      ) : null}

      {showPopup ? (
        <div
          className={cx(
            isMaximized
              ? 'fixed inset-4 sm:inset-6 z-[2147483647] flex items-center justify-center pointer-events-auto transition-all duration-300 ease-out'
              : draggingOrResizing
                ? 'fixed z-[2147483647] pointer-events-auto transition-none'
                : 'fixed z-[2147483647] pointer-events-auto transition-all duration-200 ease-out',
          )}
          style={isMaximized ? undefined : { left: `${popupX}px`, top: `${popupY}px` }}
        >
          <InPageOverlay
            selectedText={selectedText}
            contextSentence={contextSentence}
            isMaximized={isMaximized}
            isDragging={isDragging.current}
            isResizing={isResizing.current}
            width={customWidth || undefined}
            height={customHeight || undefined}
            onToggleMaximize={() => setIsMaximized((v) => !v)}
            onStartDrag={handleStartDrag}
            onStartResize={handleStartResize}
            onClose={closePopup}
          />
        </div>
      ) : null}
    </div>
  );
};

export default ContentScriptApp;
