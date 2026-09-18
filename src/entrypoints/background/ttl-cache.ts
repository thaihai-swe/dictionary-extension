export interface TtlCache<T> {
  get(): Promise<T>;
  invalidate(): void;
  clear(): void;
}

export function createTtlCache<T>(loader: () => Promise<T>, ttlMs: number): TtlCache<T> {
  let value: T | null = null;
  let loadedAt = 0;
  let pending: Promise<T> | null = null;
  let pendingEpoch = 0;
  let epoch = 0;

  return {
    get() {
      if (value !== null && Date.now() - loadedAt < ttlMs) return Promise.resolve(value);
      if (!pending || pendingEpoch !== epoch) {
        const requestEpoch = epoch;
        pendingEpoch = requestEpoch;
        pending = loader()
          .then((next) => {
            if (requestEpoch === epoch) {
              value = next;
              loadedAt = Date.now();
            }
            return next;
          })
          .finally(() => {
            if (pendingEpoch === requestEpoch) pending = null;
          });
      }
      return pending;
    },
    invalidate() {
      epoch += 1;
      value = null;
      loadedAt = 0;
    },
    clear() {
      epoch += 1;
      value = null;
      loadedAt = 0;
      pending = null;
    },
  };
}
