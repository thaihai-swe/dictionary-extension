import { useSyncExternalStore } from 'react';

export type Signal<T> = {
  get value(): T;
  set value(next: T);
  subscribe(listener: () => void): () => void;
};

export function signal<T>(initial: T): Signal<T> {
  let current = initial;
  const listeners = new Set<() => void>();
  return {
    get value() {
      return current;
    },
    set value(next: T) {
      if (Object.is(current, next)) return;
      current = next;
      listeners.forEach((listener) => listener());
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

export function useSignal<T>(source: Signal<T>): T {
  return useSyncExternalStore(source.subscribe, () => source.value, () => source.value);
}
