/**
 * Bounded lookup cache with TTL support.
 * Used by the in-page lookup popup.
 */
(function (global) {
    const DEFAULT_MAX_ENTRIES = 40;
    const DEFAULT_TTL_MS = 10 * 60 * 1000;

    function createLookupCache(options = {}) {
        const maxEntries = options.maxEntries || DEFAULT_MAX_ENTRIES;
        const ttlMs = options.ttlMs || DEFAULT_TTL_MS;
        const cache = new Map();
        const pending = new Map();

        function isExpired(entry) {
            return !entry || Date.now() - entry.createdAt > ttlMs;
        }

        function prune() {
            const now = Date.now();
            for (const [key, entry] of cache.entries()) {
                if (now - entry.createdAt > ttlMs) {
                    cache.delete(key);
                }
            }

            while (cache.size > maxEntries) {
                const oldestKey = cache.keys().next().value;
                cache.delete(oldestKey);
            }
        }

        return {
            get(key) {
                const entry = cache.get(key);
                if (!entry) {
                    return undefined;
                }
                if (isExpired(entry)) {
                    cache.delete(key);
                    return undefined;
                }
                // Refresh insertion order for LRU-ish eviction.
                cache.delete(key);
                cache.set(key, entry);
                return entry.value;
            },

            has(key) {
                const entry = cache.get(key);
                if (!entry) {
                    return false;
                }
                if (isExpired(entry)) {
                    cache.delete(key);
                    return false;
                }
                return true;
            },

            set(key, value) {
                cache.delete(key);
                cache.set(key, { value, createdAt: Date.now() });
                prune();
            },

            clear() {
                cache.clear();
                pending.clear();
            },

            getPending(key) {
                return pending.get(key);
            },

            setPending(key, promise) {
                pending.set(key, promise);
            },

            deletePending(key) {
                pending.delete(key);
            }
        };
    }

    global.DictionaryHelperCache = { createLookupCache };
})(typeof window !== "undefined" ? window : globalThis);
