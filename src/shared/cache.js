/**
 * Bounded lookup cache with TTL support and persistent Session/LocalStorage fallback.
 * Used by the in-page lookup popup and toolbar action popup.
 */
(function (global) {
    const DEFAULT_MAX_ENTRIES = 60;
    const DEFAULT_TTL_MS = 30 * 60 * 1000;
    const STORAGE_KEY = "dictionary_lookup_cache_v2";

    function createLookupCache(options = {}) {
        const maxEntries = options.maxEntries || DEFAULT_MAX_ENTRIES;
        const ttlMs = options.ttlMs || DEFAULT_TTL_MS;
        const cache = new Map();
        const pending = new Map();

        // Hydrate persistent cache on creation
        try {
            const raw = (typeof sessionStorage !== "undefined" && sessionStorage.getItem(STORAGE_KEY))
                || (typeof localStorage !== "undefined" && localStorage.getItem(STORAGE_KEY));
            if (raw) {
                const parsed = JSON.parse(raw);
                const now = Date.now();
                if (Array.isArray(parsed)) {
                    for (const [k, entry] of parsed) {
                        if (entry && (now - entry.createdAt <= ttlMs)) {
                            cache.set(k, entry);
                        }
                    }
                }
            }
        } catch (_e) {
            // Best effort
        }

        function persist() {
            try {
                const entries = Array.from(cache.entries());
                const json = JSON.stringify(entries);
                if (typeof sessionStorage !== "undefined") {
                    sessionStorage.setItem(STORAGE_KEY, json);
                }
                if (typeof localStorage !== "undefined") {
                    localStorage.setItem(STORAGE_KEY, json);
                }
            } catch (_e) {
                // Best effort
            }
        }

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
            persist();
        }

        return {
            get(key) {
                const entry = cache.get(key);
                if (!entry) {
                    return undefined;
                }
                if (isExpired(entry)) {
                    cache.delete(key);
                    persist();
                    return undefined;
                }
                // Refresh insertion order for LRU-ish eviction.
                cache.delete(key);
                cache.set(key, entry);
                persist();
                return entry.value;
            },

            has(key) {
                const entry = cache.get(key);
                if (!entry) {
                    return false;
                }
                if (isExpired(entry)) {
                    cache.delete(key);
                    persist();
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
                try {
                    if (typeof sessionStorage !== "undefined") sessionStorage.removeItem(STORAGE_KEY);
                    if (typeof localStorage !== "undefined") localStorage.removeItem(STORAGE_KEY);
                } catch (_e) {
                    // Best effort
                }
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
