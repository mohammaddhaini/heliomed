import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { markProductBuildDirty, rebuildDirtyProducts } from "../src/rebuild-service.js";

function stateHarness(initial) {
    let state = initial;
    const stateRef = {
        async get() {
            return { exists: state !== undefined, data: () => structuredClone(state) };
        },
        async set(value, options) {
            state = options?.merge ? { ...state, ...structuredClone(value) } : structuredClone(value);
        }
    };
    const db = {
        async runTransaction(operation) {
            return operation({
                get: () => stateRef.get(),
                update(_ref, value) {
                    state = { ...state, ...structuredClone(value) };
                }
            });
        }
    };
    return { db, stateRef, read: () => structuredClone(state), write: (value) => { state = value; } };
}

const logger = { info() {}, error() {} };

describe("markProductBuildDirty", () => {
    it("records the latest event and atomically increments the durable version", async () => {
        const harness = stateHarness({ dirty: false, version: 4 });
        const increment = (amount) => ({ __increment: amount });
        const timestamp = () => "server-time";

        await markProductBuildDirty({
            stateRef: harness.stateRef,
            eventId: "event-5",
            documentId: "medicine-1",
            operation: "update",
            increment,
            timestamp
        });

        assert.deepEqual(harness.read(), {
            dirty: true,
            version: { __increment: 1 },
            latestEventId: "event-5",
            latestDocumentId: "medicine-1",
            latestOperation: "update",
            updatedAt: "server-time"
        });
    });
});
describe("rebuildDirtyProducts", () => {
    it("does nothing when no catalog write is pending", async () => {
        const harness = stateHarness({ dirty: false, version: 2 });
        let calls = 0;

        const result = await rebuildDirtyProducts({
            db: harness.db,
            stateRef: harness.stateRef,
            hookUrl: "secret",
            requestDeploy: async () => { calls += 1; },
            logger,
            timestamp: () => "server-time"
        });

        assert.deepEqual(result, { requested: false, cleared: false });
        assert.equal(calls, 0);
    });

    it("requests one deploy and clears the same durable version", async () => {
        const harness = stateHarness({ dirty: true, version: 7, latestDocumentId: "medicine-7" });
        let request;

        const result = await rebuildDirtyProducts({
            db: harness.db,
            stateRef: harness.stateRef,
            hookUrl: "secret",
            requestDeploy: async (value) => { request = value; },
            logger,
            timestamp: () => "server-time"
        });

        assert.equal(request.eventId, "catalog-version-7");
        assert.deepEqual(result, { requested: true, cleared: true, version: 7 });
        assert.deepEqual(harness.read(), {
            dirty: false,
            version: 7,
            latestDocumentId: "medicine-7",
            lastBuiltVersion: 7,
            lastBuiltAt: "server-time"
        });
    });

    it("leaves the state dirty when a newer write arrives during the hook request", async () => {
        const harness = stateHarness({ dirty: true, version: 8, latestDocumentId: "medicine-8" });

        const result = await rebuildDirtyProducts({
            db: harness.db,
            stateRef: harness.stateRef,
            hookUrl: "secret",
            requestDeploy: async () => {
                harness.write({ dirty: true, version: 9, latestDocumentId: "medicine-9" });
            },
            logger,
            timestamp: () => "server-time"
        });

        assert.deepEqual(result, { requested: true, cleared: false, version: 8 });
        assert.deepEqual(harness.read(), {
            dirty: true,
            version: 9,
            latestDocumentId: "medicine-9"
        });
    });

    it("keeps the state dirty when the deploy hook fails", async () => {
        const harness = stateHarness({ dirty: true, version: 10 });

        await assert.rejects(
            rebuildDirtyProducts({
                db: harness.db,
                stateRef: harness.stateRef,
                hookUrl: "secret",
                requestDeploy: async () => { throw new Error("hook failed"); },
                logger,
                timestamp: () => "server-time"
            }),
            /hook failed/
        );

        assert.deepEqual(harness.read(), { dirty: true, version: 10 });
    });
});
