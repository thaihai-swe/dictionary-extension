import { createBoundedLruCache } from './bounded-cache.ts';

export interface CacheEntry<T> {
  value: T;
  createdAt: number;
}

export interface PersistedLruCache<T> {
  read(key: string): T | undefined;
  write(key: string, value: T): void;
  clear(): void;
  flush(): void;
}

// Cache keys are obfuscated to avoid putting the user's lookup text in storage keys.
// This is not encryption; cached values still remain local until cleared or expired.
export function hashCacheKey(value: string): string {
  let hash = 2166136261;
  const input = String(value || '');
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `${(hash >>> 0).toString(16).padStart(8, '0')}_${input.length.toString(16)}`;
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
  maxBytes?: number;
  ttlMs: number;
  storageKey: string;
  persistDelayMs?: number;
  shouldPersist?: (value: T) => boolean;
  isPersistenceEnabled?: () => boolean;
}): PersistedLruCache<T> {
  const persistDelayMs = options.persistDelayMs ?? 1500;
  const maxBytes = options.maxBytes ?? Number.POSITIVE_INFINITY;
  const map = createBoundedLruCache<string, CacheEntry<T>>({
    maxSize: options.maxSize,
    maxBytes,
    estimateSize: (entry) => estimateSize(entry.value),
  });
  let hydrated = false;
  let persistTimer: ReturnType<typeof setTimeout> | null = null;
  let dirty = false;
  let unloadBound = false;
  let cacheEpoch = 0;

  function estimateSize(value: T): number {
    try {
      return JSON.stringify(value).length * 2;
    } catch {
      return 0;
    }
  }

  function persistenceEnabled(): boolean {
    return options.isPersistenceEnabled ? options.isPersistenceEnabled() : true;
  }

  function prune() {
    const now = Date.now();
    for (const [key, entry] of map.entries()) {
      if (now - entry.createdAt > options.ttlMs) map.delete(key);
    }
  }

  function persistNow() {
    if (!canUseLocalStorage() || !dirty) return;
    dirty = false;
    if (!persistenceEnabled()) {
      void Promise.resolve(chrome.storage.local.remove(options.storageKey)).catch(() => undefined);
      return;
    }
    prune();
    const snapshot: Record<string, CacheEntry<T>> = {};
    for (const [key, entry] of map.entries()) {
      if (options.shouldPersist && !options.shouldPersist(entry.value)) continue;
      snapshot[key] = entry;
    }
    void Promise.resolve(chrome.storage.local.set({ [options.storageKey]: snapshot })).catch(() => undefined);
  }

  function persist() {
    if (!canUseLocalStorage()) return;
    if (!persistenceEnabled()) {
      dirty = false;
      if (persistTimer) {
        clearTimeout(persistTimer);
        persistTimer = null;
      }
      void Promise.resolve(chrome.storage.local.remove(options.storageKey)).catch(() => undefined);
      return;
    }
    dirty = true;
    if (persistTimer) clearTimeout(persistTimer);
    persistTimer = setTimeout(() => {
      persistTimer = null;
      persistNow();
    }, persistDelayMs);
  }

  function bindUnload() {
    if (unloadBound || typeof window === 'undefined') return;
    unloadBound = true;
    const flush = () => persistNow();
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') flush();
    });
  }

  function hydrate() {
    if (hydrated) return;
    hydrated = true;
    const hydrateEpoch = cacheEpoch;
    bindUnload();
    if (!canUseLocalStorage() || !persistenceEnabled()) return;
    void Promise.resolve(chrome.storage.local.get(options.storageKey))
      .then((stored) => {
        if (hydrateEpoch !== cacheEpoch) return;
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
      return entry.value;
    },
    write(key: string, value: T) {
      map.set(key, { value, createdAt: Date.now() });
      prune();
      persist();
    },
    flush() {
      if (persistTimer) {
        clearTimeout(persistTimer);
        persistTimer = null;
      }
      persistNow();
    },
    clear() {
      cacheEpoch += 1;
      map.clear();
      dirty = false;
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
