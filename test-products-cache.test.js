import test from "node:test";
import assert from "node:assert/strict";
import {
    isFresh,
    CACHE_TTL_MS,
    clearAllProductCache,
    clearAllCache,
    closeProductDB,
    setupCacheClearShortcut
} from "./products-cache.js";

test("CACHE_TTL_MS is set to exactly 1 hour (3600000ms)", () => {
    assert.equal(CACHE_TTL_MS, 60 * 60 * 1000);
});

test("isFresh returns true for items cached less than 1 hour ago", () => {
    const halfHourAgo = Date.now() - (30 * 60 * 1000);
    const item = { id: "item-123", title: "Vitamin C", _cachedAt: halfHourAgo };
    assert.equal(isFresh(item), true);
});

test("isFresh returns false for items cached more than 1 hour ago", () => {
    const twoHoursAgo = Date.now() - (2 * 60 * 60 * 1000);
    const item = { id: "item-123", title: "Vitamin C", _cachedAt: twoHoursAgo };
    assert.equal(isFresh(item), false);
});

test("isFresh returns false for invalid or missing _cachedAt", () => {
    assert.equal(isFresh(null), false);
    assert.equal(isFresh({}), false);
    assert.equal(isFresh({ _cachedAt: "not a number" }), false);
});

test("exported cache functions exist and are callable", () => {
    assert.equal(typeof clearAllProductCache, "function");
    assert.equal(typeof clearAllCache, "function");
    assert.equal(typeof closeProductDB, "function");
    assert.equal(typeof setupCacheClearShortcut, "function");
});

test("clearAllCache gracefully completes in headless environments", async () => {
    const result = await clearAllCache();
    assert.equal(typeof result, "object");
    assert.equal(result.indexedDB, true);
});

test("clearAllCache clears localStorage cache keys while preserving user state", async () => {
    const originalLocalStorage = globalThis.localStorage;
    const store = new Map([
        ["heliomedCart", JSON.stringify([{ id: "item-1", qty: 1 }])],
        ["heliomedWishlist", JSON.stringify(["item-1"])],
        ["heliomed_lang", "ar"],
        ["heliomedDeliverySettings", JSON.stringify({ areas: [] })],
        ["some_cache_query", "data"],
        ["unrelatedKey", "keepMe"]
    ]);

    globalThis.localStorage = {
        get length() {
            return store.size;
        },
        key(index) {
            return Array.from(store.keys())[index] || null;
        },
        getItem(key) {
            return store.get(key) ?? null;
        },
        setItem(key, val) {
            store.set(key, String(val));
        },
        removeItem(key) {
            store.delete(key);
        }
    };

    try {
        await clearAllCache();

        assert.equal(store.has("heliomedCart"), true);
        assert.equal(store.has("heliomedWishlist"), true);
        assert.equal(store.has("heliomed_lang"), true);
        assert.equal(store.has("unrelatedKey"), true);
        assert.equal(store.has("heliomedDeliverySettings"), false);
        assert.equal(store.has("some_cache_query"), false);
    } finally {
        if (originalLocalStorage) {
            globalThis.localStorage = originalLocalStorage;
        } else {
            delete globalThis.localStorage;
        }
    }
});

test("clearAllCache clears CacheStorage and service workers when available", async () => {
    const deletedCaches = [];
    let unregisteredWorker = false;
    let sessionStorageCleared = false;

    const originalCaches = globalThis.caches;
    const originalNavigatorDesc = Object.getOwnPropertyDescriptor(globalThis, "navigator");
    const originalSessionStorage = globalThis.sessionStorage;
    const originalWindow = globalThis.window;

    globalThis.window = {
        caches: {
            async keys() {
                return ["v1-assets", "api-cache"];
            },
            async delete(name) {
                deletedCaches.push(name);
                return true;
            }
        }
    };

    Object.defineProperty(globalThis, "navigator", {
        value: {
            serviceWorker: {
                async getRegistrations() {
                    return [{
                        async unregister() {
                            unregisteredWorker = true;
                            return true;
                        }
                    }];
                }
            }
        },
        configurable: true,
        writable: true
    });

    globalThis.sessionStorage = {
        clear() {
            sessionStorageCleared = true;
        }
    };

    try {
        const result = await clearAllCache();
        assert.equal(result.caches, true);
        assert.deepEqual(deletedCaches.sort(), ["api-cache", "v1-assets"].sort());
        assert.equal(result.serviceWorkers, true);
        assert.equal(unregisteredWorker, true);
        assert.equal(result.sessionStorage, true);
        assert.equal(sessionStorageCleared, true);
    } finally {
        if (originalWindow) globalThis.window = originalWindow; else delete globalThis.window;
        if (originalCaches) globalThis.caches = originalCaches; else delete globalThis.caches;
        if (originalNavigatorDesc) {
            Object.defineProperty(globalThis, "navigator", originalNavigatorDesc);
        }
        if (originalSessionStorage) globalThis.sessionStorage = originalSessionStorage; else delete globalThis.sessionStorage;
    }
});

test("setupCacheClearShortcut attaches keydown listener and intercepts Ctrl+Shift+R", async () => {
    let listener = null;
    let reloadCalled = false;
    const originalWindow = globalThis.window;

    globalThis.window = {
        addEventListener(event, fn, opts) {
            if (event === "keydown") listener = fn;
        },
        location: {
            reload() {
                reloadCalled = true;
            }
        }
    };

    try {
        setupCacheClearShortcut();
        assert.equal(typeof listener, "function");

        function testEvent(overrides) {
            let prevented = false;
            let stopped = false;
            const event = {
                ctrlKey: false,
                metaKey: false,
                shiftKey: false,
                key: "",
                code: "",
                preventDefault() { prevented = true; },
                stopPropagation() { stopped = true; },
                ...overrides
            };
            listener(event);
            return { prevented, stopped };
        }

        assert.equal(testEvent({ ctrlKey: true, shiftKey: true, key: "R" }).prevented, true);
        assert.equal(testEvent({ metaKey: true, shiftKey: true, key: "r" }).prevented, true);
        assert.equal(testEvent({ ctrlKey: true, shiftKey: true, key: "ق", code: "KeyR" }).prevented, true);
        assert.equal(testEvent({ ctrlKey: true, key: "F5" }).prevented, true);
        assert.equal(testEvent({ metaKey: true, code: "F5" }).prevented, true);

        assert.equal(testEvent({ ctrlKey: true, key: "r", shiftKey: false }).prevented, false);
        assert.equal(testEvent({ shiftKey: true, key: "R" }).prevented, false);
        assert.equal(testEvent({ ctrlKey: true, shiftKey: true, key: "S" }).prevented, false);

        await new Promise((resolve) => setTimeout(resolve, 180));
        assert.equal(reloadCalled, true);
    } finally {
        if (originalWindow) globalThis.window = originalWindow; else delete globalThis.window;
    }
});
