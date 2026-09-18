export interface BoundedLruCache<K, V> {
  readonly size: number;
  get(key: K): V | undefined;
  has(key: K): boolean;
  set(key: K, value: V): void;
  delete(key: K): boolean;
  clear(): void;
  entries(): IterableIterator<[K, V]>;
}

export interface BoundedLruCacheOptions<V> {
  maxSize: number;
  maxBytes?: number;
  estimateSize?: (value: V) => number;
}

/**
 * Small insertion-ordered LRU with count and approximate byte bounds.
 * The cache is intentionally policy-only; callers own TTL and persistence.
 */
export function createBoundedLruCache<K, V>(options: BoundedLruCacheOptions<V>): BoundedLruCache<K, V> {
  const values = new Map<K, V>();
  const sizes = new Map<K, number>();
  const estimateSize = options.estimateSize || (() => 0);
  const maxBytes = options.maxBytes ?? Number.POSITIVE_INFINITY;
  let totalBytes = 0;

  function remove(key: K): boolean {
    if (!values.has(key)) return false;
    values.delete(key);
    totalBytes = Math.max(0, totalBytes - (sizes.get(key) || 0));
    sizes.delete(key);
    return true;
  }

  function prune() {
    while (values.size > options.maxSize || totalBytes > maxBytes) {
      const oldest = values.keys().next().value;
      if (oldest === undefined) break;
      remove(oldest);
    }
  }

  return {
    get size() {
      return values.size;
    },
    get(key) {
      const value = values.get(key);
      if (value === undefined) return undefined;
      values.delete(key);
      values.set(key, value);
      return value;
    },
    has(key) {
      return values.has(key);
    },
    set(key, value) {
      remove(key);
      values.set(key, value);
      const size = Math.max(0, estimateSize(value));
      sizes.set(key, size);
      totalBytes += size;
      prune();
    },
    delete: remove,
    clear() {
      values.clear();
      sizes.clear();
      totalBytes = 0;
    },
    entries() {
      return values.entries();
    },
  };
}
