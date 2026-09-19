export interface ViewportSize {
  width: number;
  height: number;
}

export interface PopupSize {
  width: number;
  height: number;
}

export interface SelectionRectLike {
  left: number;
  right: number;
  top: number;
  bottom: number;
  width: number;
  height: number;
}

export interface TriggerPositionInput {
  viewport: ViewportSize;
  event?: { clientX: number; clientY: number };
  selectionRect?: SelectionRectLike;
  iconSize?: number;
  margin?: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface PopupPosition {
  left: number;
  top: number;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(value, maximum));
}

export function calculatePopupPosition(
  point: Point,
  popupSize: PopupSize,
  viewport: ViewportSize,
  offset = 14,
  margin = 24,
): PopupPosition {
  let left = point.x;
  let top = point.y + offset;
  if (top + popupSize.height > viewport.height - margin) top = point.y - popupSize.height - offset;
  return {
    left: clamp(left, margin, viewport.width - popupSize.width - margin),
    top: clamp(top, margin, viewport.height - popupSize.height - margin),
  };
}

export function calculateDraggedPopupPosition(
  start: Point,
  delta: Point,
  popupSize: PopupSize,
  viewport: ViewportSize,
  margin = 8,
): PopupPosition {
  return {
    left: clamp(start.x + delta.x, margin, viewport.width - popupSize.width - margin),
    top: clamp(start.y + delta.y, margin, viewport.height - popupSize.height - margin),
  };
}

export function calculateTriggerPosition({
  viewport,
  event,
  selectionRect,
  iconSize = 38,
  margin = 10,
}: TriggerPositionInput): Point {
  let x = viewport.width / 2;
  let y = viewport.height / 2;

  if (event && typeof event.clientX === 'number') {
    x = event.clientX + 12;
    y = event.clientY + 8;
    if (x + iconSize > viewport.width - margin) x = event.clientX - iconSize - 12;
    if (y + iconSize > viewport.height - margin) y = event.clientY - iconSize - 8;
  } else if (selectionRect && (selectionRect.width || selectionRect.height)) {
    x = selectionRect.right + margin;
    y = selectionRect.top + Math.max(0, (selectionRect.height - iconSize) / 2);
    if (x + iconSize > viewport.width - margin) x = selectionRect.left - iconSize - margin;
    if (x < margin) {
      x = Math.max(margin, Math.min(selectionRect.left, viewport.width - iconSize - margin));
      y = selectionRect.bottom + margin;
    }
  }

  return {
    x: clamp(x, margin, viewport.width - iconSize - margin),
    y: clamp(y, margin, viewport.height - iconSize - margin),
  };
}
