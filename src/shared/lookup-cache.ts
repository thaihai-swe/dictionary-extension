export interface CacheEntry<T> {
  value: T;
  createdAt: number;
}

export interface PersistedLruCache<T> {
  read(key: string): T | undefined;
  write(key: string, value: T): void;
  clear(): void;
}

function canUseLocalStorage(): boolean {
  try {
    return typeof chrome !== 'undefined' && typeof chrome.storage?.local?.get === 'function';
  } catch {
    return false;
  }
}

export function createPersistedLruCache<T>(options: {
  maxSize: number;
  ttlMs: number;
  storageKey: string;
  persistDelayMs?: number;
}): PersistedLruCache<T> {
  const map = new Map<string, CacheEntry<T>>();
  const persistDelayMs = options.persistDelayMs ?? 250;
  let hydrated = false;
  let persistTimer: ReturnType<typeof setTimeout> | null = null;

  function prune() {
    const now = Date.now();
    for (const [key, entry] of map.entries()) {
      if (now - entry.createdAt > options.ttlMs) map.delete(key);
    }
    while (map.size > options.maxSize) {
      const oldestKey = map.keys().next().value;
      if (!oldestKey) break;
      map.delete(oldestKey);
    }
  }

  function persist() {
    if (!canUseLocalStorage()) return;
    if (persistTimer) clearTimeout(persistTimer);
    persistTimer = setTimeout(() => {
      persistTimer = null;
      prune();
      const snapshot: Record<string, CacheEntry<T>> = {};
      for (const [key, entry] of map.entries()) snapshot[key] = entry;
      void Promise.resolve(chrome.storage.local.set({ [options.storageKey]: snapshot })).catch(() => undefined);
    }, persistDelayMs);
  }

  function hydrate() {
    if (hydrated) return;
    hydrated = true;
    if (!canUseLocalStorage()) return;
    void Promise.resolve(chrome.storage.local.get(options.storageKey))
      .then((stored) => {
        const snapshot = (stored as Record<string, Record<string, CacheEntry<T>> | undefined>)?.[options.storageKey];
        if (!snapshot || typeof snapshot !== 'object') return;
        const now = Date.now();
        for (const [key, entry] of Object.entries(snapshot)) {
          if (!entry?.value || now - entry.createdAt > options.ttlMs) continue;
          if (!map.has(key)) map.set(key, entry);
        }
        prune();
      })
      .catch(() => undefined);
  }

  hydrate();

  return {
    read(key: string) {
      const entry = map.get(key);
      if (!entry) return undefined;
      if (Date.now() - entry.createdAt > options.ttlMs) {
        map.delete(key);
        return undefined;
      }
      map.delete(key);
      map.set(key, entry);
      return entry.value;
    },
    write(key: string, value: T) {
      map.delete(key);
      map.set(key, { value, createdAt: Date.now() });
      prune();
      persist();
    },
    clear() {
      map.clear();
      if (persistTimer) {
        clearTimeout(persistTimer);
        persistTimer = null;
      }
      if (canUseLocalStorage()) {
        void Promise.resolve(chrome.storage.local.remove(options.storageKey)).catch(() => undefined);
      }
    },
  };
}
