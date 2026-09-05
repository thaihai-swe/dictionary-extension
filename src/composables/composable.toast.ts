import { useEffect, useState } from 'react';

type ToastListener = (message: string | null) => void;
let activeToast: string | null = null;
let toastTimeout: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<ToastListener>();

function notify(msg: string | null) {
  activeToast = msg;
  listeners.forEach((fn) => fn(msg));
}

export function showToast(message: string, durationMs = 2200): void {
  if (toastTimeout) {
    clearTimeout(toastTimeout);
    toastTimeout = null;
  }
  notify(message);
  toastTimeout = setTimeout(() => {
    notify(null);
    toastTimeout = null;
  }, durationMs);
}

export function hideToast(): void {
  if (toastTimeout) {
    clearTimeout(toastTimeout);
    toastTimeout = null;
  }
  notify(null);
}

export function useToast(): string | null {
  const [toast, setToast] = useState<string | null>(activeToast);

  useEffect(() => {
    listeners.add(setToast);
    return () => {
      listeners.delete(setToast);
    };
  }, []);

  return toast;
}
