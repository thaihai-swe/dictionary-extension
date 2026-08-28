<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useStorage } from '@/composables/composable.storage';
import { abortActiveAiRequest } from '@/composables/composable.ai-assistant';
import { abortActiveDictRequest, stopAllAudio } from '@/composables/composable.dictionary';
import InPageOverlay from './overlay.in-page.vue';

const { settings, saveSettings } = useStorage();

const showPopup = ref(false);
const showTriggerBtn = ref(false);
const isMaximized = ref(false);
const popupX = ref(0);
const popupY = ref(0);
const triggerX = ref(0);
const triggerY = ref(0);
const selectedText = ref('');
const contextSentence = ref('');

// Dynamic Resizing & Dragging State
const customWidth = ref<number | null>(null);
const customHeight = ref<number | null>(null);

const isDragging = ref(false);
let dragStartX = 0;
let dragStartY = 0;
let popupStartX = 0;
let popupStartY = 0;

const isResizing = ref(false);
let resizeStartX = 0;
let resizeStartY = 0;
let initialWidth = 0;
let initialHeight = 0;

const isDarkMode = computed(() => {
  if (settings.value.theme === 'system') {
    return typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches;
  }
  return settings.value.theme !== 'light';
});

function positionPopup(x: number, y: number) {
  const POPUP_W = customWidth.value || settings.value.popupWidth || 480;
  const POPUP_H = customHeight.value || settings.value.popupHeight || 580;
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  let left = x;
  let top = y + 14;

  // If placing below selection exceeds bottom of viewport, try placing above
  if (top + POPUP_H > vh - 24) {
    top = y - POPUP_H - 14;
  }

  // Strictly constrain popup within viewport margins (min 24px safety distance from all edges)
  left = Math.max(24, Math.min(left, vw - POPUP_W - 24));
  top = Math.max(24, Math.min(top, vh - POPUP_H - 24));

  popupX.value = left;
  popupY.value = top;
}

/* Dragging Event Handlers */
function handleStartDrag(e: MouseEvent) {
  if (isMaximized.value) return;
  isDragging.value = true;
  dragStartX = e.clientX;
  dragStartY = e.clientY;
  popupStartX = popupX.value;
  popupStartY = popupY.value;

  window.addEventListener('mousemove', handleDragMove);
  window.addEventListener('mouseup', handleDragEnd);
}

function handleDragMove(e: MouseEvent) {
  if (!isDragging.value) return;
  const deltaX = e.clientX - dragStartX;
  const deltaY = e.clientY - dragStartY;

  const POPUP_W = customWidth.value || settings.value.popupWidth || 480;
  const POPUP_H = customHeight.value || settings.value.popupHeight || 580;

  let newX = popupStartX + deltaX;
  let newY = popupStartY + deltaY;

  // Keep within browser window margins
  newX = Math.max(8, Math.min(newX, window.innerWidth - POPUP_W - 8));
  newY = Math.max(8, Math.min(newY, window.innerHeight - POPUP_H - 8));

  popupX.value = newX;
  popupY.value = newY;
}

function handleDragEnd() {
  isDragging.value = false;
  window.removeEventListener('mousemove', handleDragMove);
  window.removeEventListener('mouseup', handleDragEnd);
}

/* Resizing Event Handlers */
function handleStartResize(e: MouseEvent) {
  if (isMaximized.value) return;
  isResizing.value = true;
  resizeStartX = e.clientX;
  resizeStartY = e.clientY;
  initialWidth = customWidth.value || settings.value.popupWidth || 480;
  initialHeight = customHeight.value || settings.value.popupHeight || 580;

  window.addEventListener('mousemove', handleResizeMove);
  window.addEventListener('mouseup', handleResizeEnd);
}

function handleResizeMove(e: MouseEvent) {
  if (!isResizing.value) return;
  const deltaX = e.clientX - resizeStartX;
  const deltaY = e.clientY - resizeStartY;

  const newW = Math.max(360, Math.min(window.innerWidth - popupX.value - 16, initialWidth + deltaX));
  const newH = Math.max(380, Math.min(window.innerHeight - popupY.value - 16, initialHeight + deltaY));

  customWidth.value = newW;
  customHeight.value = newH;
}

function handleResizeEnd() {
  if (isResizing.value && customWidth.value && customHeight.value) {
    saveSettings({
      popupWidth: customWidth.value,
      popupHeight: customHeight.value,
    });
  }
  isResizing.value = false;
  window.removeEventListener('mousemove', handleResizeMove);
  window.removeEventListener('mouseup', handleResizeEnd);
}

function extractSurroundingContext(selectedStr: string): string {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return selectedStr;

  try {
    const range = selection.getRangeAt(0);
    let container: Node | null = range.commonAncestorContainer;
    if (container && container.nodeType === Node.TEXT_NODE) {
      container = container.parentNode;
    }
    const block = (container as HTMLElement)?.closest?.(
      'p, li, td, th, blockquote, figcaption, dd, dt, h1, h2, h3, h4, h5, h6, pre, article, section, main, div'
    ) || container;

    const fullText = (block?.textContent || '').replace(/\s+/g, ' ').trim();
    if (!fullText) return selectedStr;

    // Split block into sentences cleanly
    const sentences = fullText.match(/[^.!?]+[.!?]+(\s+|$)|[^.!?]+$/g) || [fullText];
    const match = sentences.find(s => s.toLowerCase().includes(selectedStr.toLowerCase()));

    return match?.trim() || fullText.slice(0, 300);
  } catch (e) {
    return selectedStr;
  }
}

function openPopup(x: number, y: number, text: string, context?: string) {
  showTriggerBtn.value = false;
  selectedText.value = text;
  contextSentence.value = context || extractSurroundingContext(text);
  positionPopup(x, y);
  showPopup.value = true;
}

function closePopup() {
  stopAllAudio();
  abortActiveAiRequest();
  abortActiveDictRequest();
  showPopup.value = false;
  showTriggerBtn.value = false;
  isMaximized.value = false;
}

function handleTriggerClick(e: MouseEvent) {
  e.preventDefault();
  e.stopPropagation();
  if (selectedText.value) {
    openPopup(triggerX.value, triggerY.value, selectedText.value, contextSentence.value);
  }
}

function updateSelectionTrigger(event?: MouseEvent) {
  const selection = window.getSelection();
  const text = selection?.toString().trim();

  if (!text || text.length === 0) {
    showTriggerBtn.value = false;
    return;
  }

  const mode = settings.value.selectionTriggerMode || 'icon';
  if (mode === 'off') return;

  selectedText.value = text;
  contextSentence.value = extractSurroundingContext(text);

  const iconSize = 38;
  const margin = 10;
  let x = window.innerWidth / 2;
  let y = window.innerHeight / 2;

  // If mouse event is available, position trigger icon right next to mouse cursor pointer
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
    // Fallback for keyboard shortcut or programmatic triggers: position next to selection bounding rect
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
    } catch (e) {
      // Ignore range rect error
    }
  }

  triggerX.value = Math.max(margin, Math.min(x, window.innerWidth - iconSize - margin));
  triggerY.value = Math.max(margin, Math.min(y, window.innerHeight - iconSize - margin));

  if (mode === 'direct') {
    openPopup(triggerX.value, triggerY.value, text, contextSentence.value);
  } else {
    showTriggerBtn.value = true;
  }
}

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
  const modifier = settings.value.postSelectionModifier || 'shift';

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
  if (isDragging.value || isResizing.value) return;
  const target = event.target as Node;
  const root = document.getElementById('dictionary-extension-root');
  if (root && !root.contains(target)) {
    closePopup();
  }
}

onMounted(() => {
  window.addEventListener('mouseup', handleMouseUp);
  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('click', handleGlobalClick, true);

  if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
    chrome.runtime.onMessage.addListener((message: { type?: string; text?: string }) => {
      if (message.type === 'DICTIONARY_LOOKUP' && message.text) {
        openPopup(window.innerWidth / 2 - 220, 60, message.text);
      }
    });
  }
});

onUnmounted(() => {
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
});
</script>

<template>
  <div class="relative font-sans pointer-events-none">
    <!-- Floating Trigger Icon Button (Theme Adaptive: Dark Teal vs Light Indigo) -->
    <button
      v-if="showTriggerBtn && !showPopup"
      @click="handleTriggerClick"
      title="Look up selection in Dictionary"
      :style="{ left: `${triggerX}px`, top: `${triggerY}px` }"
      :class="[
        'dictionary-trigger-icon-btn fixed z-[2147483646] w-9 h-9 rounded-full flex items-center justify-center cursor-pointer pointer-events-auto transition-transform hover:scale-110 active:scale-95 shadow-xl',
        isDarkMode
          ? 'bg-[#0d9488] hover:bg-[#0f766e] text-white border-2 border-[#1e293b] shadow-[#0d9488]/40'
          : 'bg-[#4f46a5] hover:bg-[#4338ca] text-white border-2 border-[#ffffff] shadow-[#4f46a5]/35'
      ]"
    >
      <!-- SVG Search Icon -->
      <svg class="w-4.5 h-4.5 text-white fill-current" viewBox="0 0 20 20" aria-hidden="true">
        <path d="M9 3.5a5.5 5.5 0 1 0 3.5 9.7l3.15 3.15a1 1 0 0 0 1.4-1.4l-3.15-3.15A5.5 5.5 0 0 0 9 3.5Zm-3.5 5.5a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0Z"></path>
      </svg>
    </button>

    <!-- Dark Backdrop for Maximized In-Page Workbench -->
    <div
      v-if="showPopup && isMaximized"
      class="fixed inset-0 z-[2147483646] bg-black/60 backdrop-blur-xs pointer-events-auto transition-opacity duration-300"
      @click="isMaximized = false"
    ></div>

    <!-- Floating In-Page Popup Window -->
    <div
      v-if="showPopup"
      :class="[
        isMaximized
          ? 'fixed inset-4 sm:inset-6 z-[2147483647] flex items-center justify-center pointer-events-auto transition-all duration-300 ease-out'
          : (isDragging || isResizing)
            ? 'fixed z-[2147483647] pointer-events-auto transition-none'
            : 'fixed z-[2147483647] pointer-events-auto transition-all duration-200 ease-out'
      ]"
      :style="isMaximized ? {} : { left: `${popupX}px`, top: `${popupY}px` }"
    >
      <InPageOverlay
        :selectedText="selectedText"
        :contextSentence="contextSentence"
        :isMaximized="isMaximized"
        :isDragging="isDragging"
        :isResizing="isResizing"
        :width="customWidth || undefined"
        :height="customHeight || undefined"
        @toggle-maximize="isMaximized = !isMaximized"
        @start-drag="handleStartDrag"
        @start-resize="handleStartResize"
        @close="closePopup"
      />
    </div>
  </div>
</template>

<style scoped>
.dictionary-trigger-icon-btn {
  animation: dictionary-trigger-enter 220ms cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes dictionary-trigger-enter {
  0% { opacity: 0; transform: scale(0.65); }
  70% { transform: scale(1.08); }
  100% { opacity: 1; transform: scale(1); }
}
</style>
