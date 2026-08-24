import test from "node:test";
import assert from "node:assert/strict";
import { isFresh, CACHE_TTL_MS } from "./products-cache.js";

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
