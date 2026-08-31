/**
 * Heliomed Product Caching & Lazy-Loading Layer
 * IndexedDB storage with 1-hour TTL (Time-To-Live)
 */

const DB_NAME = "heliomed_cache_db";
const DB_VERSION = 1;
const STORE_PRODUCTS = "products";
const STORE_QUERIES = "queries";
export const CACHE_TTL_MS = 60 * 60 * 1000; // 1 Hour

let dbPromise = null;

/**
 * Open or initialize IndexedDB connection
 */
export function openProductDB() {
    if (typeof window === "undefined" || !("indexedDB" in window)) {
        return Promise.resolve(null);
    }
    if (dbPromise) return dbPromise;

    dbPromise = new Promise((resolve) => {
        try {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(STORE_PRODUCTS)) {
                    db.createObjectStore(STORE_PRODUCTS, { keyPath: "id" });
                }
                if (!db.objectStoreNames.contains(STORE_QUERIES)) {
                    db.createObjectStore(STORE_QUERIES, { keyPath: "key" });
                }
            };

            request.onsuccess = (event) => {
                const db = event.target.result;
                if (db) {
                    db.onversionchange = () => {
                        try {
                            db.close();
                        } catch (e) {}
                        dbPromise = null;
                    };
                }
                resolve(db);
            };

            request.onerror = (event) => {
                console.warn("IndexedDB open error, falling back to network:", event.target.error);
                resolve(null);
            };
        } catch (e) {
            console.warn("IndexedDB unavailable:", e);
            resolve(null);
        }
    });

    return dbPromise;
}

/**
 * Check if a cached item has not expired (< 1 hour old)
 */
export function isFresh(item, ttl = CACHE_TTL_MS) {
    if (!item || typeof item._cachedAt !== "number") return false;
    return (Date.now() - item._cachedAt) < ttl;
}

/**
 * Get a single product from IndexedDB if cached within the last 1 hour
 */
export async function getCachedProduct(id) {
    if (!id) return null;
    const db = await openProductDB();
    if (!db) return null;

    return new Promise((resolve) => {
        try {
            const tx = db.transaction(STORE_PRODUCTS, "readonly");
            const store = tx.objectStore(STORE_PRODUCTS);
            const req = store.get(String(id));

            req.onsuccess = () => {
                const result = req.result;
                if (result && isFresh(result)) {
                    // Strip the internal cache metadata before returning
                    const { _cachedAt, ...productData } = result;
                    resolve(productData);
                } else {
                    resolve(null);
                }
            };
            req.onerror = () => resolve(null);
        } catch (err) {
            console.warn("Error reading product from IndexedDB:", err);
            resolve(null);
        }
    });
}

/**
 * Save a single product to IndexedDB with 1-hour expiration timestamp
 */
export async function setCachedProduct(id, productData) {
    if (!id || !productData) return;
    const db = await openProductDB();
    if (!db) return;

    return new Promise((resolve) => {
        try {
            const tx = db.transaction(STORE_PRODUCTS, "readwrite");
            const store = tx.objectStore(STORE_PRODUCTS);
            const record = {
                ...productData,
                id: String(id),
                _cachedAt: Date.now()
            };
            store.put(record);
            tx.oncomplete = () => resolve(true);
            tx.onerror = () => resolve(false);
        } catch (err) {
            console.warn("Error saving product to IndexedDB:", err);
            resolve(false);
        }
    });
}

/**
 * Batch save multiple products to IndexedDB with 1-hour expiration timestamp
 */
export async function setCachedProducts(productsArray) {
    if (!Array.isArray(productsArray) || !productsArray.length) return;
    const db = await openProductDB();
    if (!db) return;

    return new Promise((resolve) => {
        try {
            const tx = db.transaction(STORE_PRODUCTS, "readwrite");
            const store = tx.objectStore(STORE_PRODUCTS);
            const now = Date.now();

            for (const product of productsArray) {
                if (!product || !product.id) continue;
                store.put({
                    ...product,
                    id: String(product.id),
                    _cachedAt: now
                });
            }

            tx.oncomplete = () => resolve(true);
            tx.onerror = () => resolve(false);
        } catch (err) {
            console.warn("Error batch saving products to IndexedDB:", err);
            resolve(false);
        }
    });
}

/**
 * Get a cached query result (e.g. "catalog:all", "category:skincare") if fresh
 */
export async function getCachedQuery(queryKey) {
    if (!queryKey) return null;
    const db = await openProductDB();
    if (!db) return null;

    return new Promise((resolve) => {
        try {
            const tx = db.transaction(STORE_QUERIES, "readonly");
            const store = tx.objectStore(STORE_QUERIES);
            const req = store.get(String(queryKey));

            req.onsuccess = () => {
                const result = req.result;
                if (result && isFresh(result)) {
                    resolve(result.data);
                } else {
                    resolve(null);
                }
            };
            req.onerror = () => resolve(null);
        } catch (err) {
            console.warn("Error reading query from IndexedDB:", err);
            resolve(null);
        }
    });
}

/**
 * Save query result to IndexedDB with 1-hour expiration
 */
export async function setCachedQuery(queryKey, data) {
    if (!queryKey || data === undefined) return;
    const db = await openProductDB();
    if (!db) return;

    return new Promise((resolve) => {
        try {
            const tx = db.transaction(STORE_QUERIES, "readwrite");
            const store = tx.objectStore(STORE_QUERIES);
            store.put({
                key: String(queryKey),
                data: data,
                _cachedAt: Date.now()
            });
            tx.oncomplete = () => resolve(true);
            tx.onerror = () => resolve(false);
        } catch (err) {
            console.warn("Error saving query to IndexedDB:", err);
            resolve(false);
        }
    });
}

/**
 * Lazy fetch a single product:
 * 1. Checks IndexedDB first. If present and fresh (< 1h), returns it with 0 network calls.
 * 2. If missing or expired (> 1h), calls fetcherFn(), writes to IndexedDB, and returns product.
 */
export async function fetchProductLazy(id, fetcherFn) {
    const cached = await getCachedProduct(id);
    if (cached) {
        return cached;
    }

    const fetched = await fetcherFn();
    if (fetched) {
        await setCachedProduct(id, fetched);
    }
    return fetched;
}

/**
 * Lazy fetch query products (or whole catalog):
 * 1. Checks IndexedDB for queryKey. If fresh (< 1h), returns cached items immediately.
 * 2. If expired or missing, calls fetcherFn(), stores both the query and individual products, and returns result.
 */
export async function fetchQueryLazy(queryKey, fetcherFn) {
    const cached = await getCachedQuery(queryKey);
    if (cached) {
        return cached;
    }

    const result = await fetcherFn();
    if (result) {
        await setCachedQuery(queryKey, result);
        if (Array.isArray(result)) {
            await setCachedProducts(result);
        }
    }
    return result;
}

export async function closeProductDB() {
    if (dbPromise) {
        try {
            const db = await dbPromise;
            if (db && typeof db.close === "function") {
                db.close();
            }
        } catch (err) {
            console.warn("Error closing IndexedDB:", err);
        }
        dbPromise = null;
    }
}

export async function clearAllProductCache() {
    try {
        const db = await openProductDB();
        if (db) {
            await new Promise((resolve) => {
                try {
                    const tx = db.transaction([STORE_PRODUCTS, STORE_QUERIES], "readwrite");
                    tx.objectStore(STORE_PRODUCTS).clear();
                    tx.objectStore(STORE_QUERIES).clear();
                    tx.oncomplete = () => resolve(true);
                    tx.onerror = () => resolve(false);
                } catch (err) {
                    resolve(false);
                }
            });
        }
    } catch (e) {}

    await closeProductDB();

    return new Promise((resolve) => {
        try {
            if (typeof indexedDB === "undefined") return resolve(true);
            const req = indexedDB.deleteDatabase(DB_NAME);
            req.onsuccess = () => resolve(true);
            req.onerror = () => resolve(false);
            req.onblocked = () => resolve(true);
        } catch (err) {
            resolve(false);
        }
    });
}

export async function clearAllCache() {
    const results = {
        indexedDB: false,
        caches: false,
        serviceWorkers: false,
        sessionStorage: false,
        localStorage: false
    };

    try {
        await clearAllProductCache();

        if (typeof indexedDB !== "undefined" && typeof indexedDB.databases === "function") {
            try {
                const dbs = await indexedDB.databases();
                for (const dbInfo of (dbs || [])) {
                    if (!dbInfo || !dbInfo.name) continue;
                    if (
                        dbInfo.name.includes("firebaseLocalStorageDb") ||
                        dbInfo.name.includes("firebase-heartbeat")
                    ) {
                        continue;
                    }
                    if (dbInfo.name === DB_NAME || dbInfo.name.toLowerCase().includes("cache")) {
                        indexedDB.deleteDatabase(dbInfo.name);
                    }
                }
            } catch (e) {}
        }
        results.indexedDB = true;
    } catch (err) {
        console.warn("Error clearing IndexedDB cache:", err);
    }

    try {
        if (typeof window !== "undefined" && "caches" in window && window.caches) {
            const keys = await window.caches.keys();
            await Promise.all(keys.map((k) => window.caches.delete(k)));
            results.caches = true;
        }
    } catch (err) {
        console.warn("Error clearing CacheStorage:", err);
    }

    try {
        if (typeof navigator !== "undefined" && "serviceWorker" in navigator && navigator.serviceWorker) {
            const registrations = await navigator.serviceWorker.getRegistrations();
            await Promise.all(registrations.map((reg) => reg.unregister()));
            results.serviceWorkers = true;
        }
    } catch (err) {
        console.warn("Error unregistering service workers:", err);
    }

    try {
        if (typeof sessionStorage !== "undefined") {
            sessionStorage.clear();
            results.sessionStorage = true;
        }
    } catch (err) {
        console.warn("Error clearing sessionStorage:", err);
    }

    try {
        if (typeof localStorage !== "undefined") {
            const keysToRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key) {
                    const lower = key.toLowerCase();
                    if (
                        lower.includes("cache") ||
                        key === "heliomedDeliverySettings"
                    ) {
                        keysToRemove.push(key);
                    }
                }
            }
            keysToRemove.forEach((k) => localStorage.removeItem(k));
            results.localStorage = true;
        }
    } catch (err) {
        console.warn("Error clearing localStorage cache keys:", err);
    }

    return results;
}

let isClearing = false;

export function setupCacheClearShortcut() {
    if (typeof window === "undefined" || window.__heliomedCacheShortcutBound) return;
    window.__heliomedCacheShortcutBound = true;

    window.addEventListener("keydown", async (event) => {
        const isCtrlOrCmd = event.ctrlKey || event.metaKey;
        const isRKey = event.key === "R" || event.key === "r" || event.code === "KeyR";
        const isF5Key = event.key === "F5" || event.code === "F5";
        const isClearCacheShortcut = (isCtrlOrCmd && event.shiftKey && isRKey) || (isCtrlOrCmd && isF5Key);

        if (!isClearCacheShortcut) return;

        event.preventDefault();
        event.stopPropagation();

        if (isClearing) return;
        isClearing = true;

        try {
            await clearAllCache();
        } catch (err) {
            console.error("[Heliomed] Error clearing cache:", err);
        }

        setTimeout(() => {
            if (typeof window !== "undefined" && window.location && typeof window.location.reload === "function") {
                window.location.reload();
            }
        }, 80);
    }, { capture: true });
}

if (typeof window !== "undefined") {
    window.HeliomedCache = {
        clearAll: clearAllCache,
        clearProducts: clearAllProductCache,
        closeDB: closeProductDB,
        setupShortcut: setupCacheClearShortcut
    };
    setupCacheClearShortcut();
}
