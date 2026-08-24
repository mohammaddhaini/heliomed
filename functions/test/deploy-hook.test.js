import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
    DeployHookError,
    medicineWriteOperation,
    requestPagesDeploy
} from "../src/deploy-hook.js";

const hookUrl = "https://api.cloudflare.com/client/v4/pages/webhooks/deploy_hooks/secret-token";

function memoryLogger() {
    const entries = [];
    return {
        entries,
        info(message, metadata) {
            entries.push({ level: "info", message, metadata });
        },
        error(message, metadata) {
            entries.push({ level: "error", message, metadata });
        }
    };
}

describe("medicineWriteOperation", () => {
    it("classifies create, update, and delete writes", () => {
        assert.equal(
            medicineWriteOperation({ before: { exists: false }, after: { exists: true } }),
            "create"
        );
        assert.equal(
            medicineWriteOperation({ before: { exists: true }, after: { exists: true } }),
            "update"
        );
        assert.equal(
            medicineWriteOperation({ before: { exists: true }, after: { exists: false } }),
            "delete"
        );
    });

    it("rejects an event without a before or after document", () => {
        assert.throws(
            () => medicineWriteOperation({ before: { exists: false }, after: { exists: false } }),
            (error) => error instanceof DeployHookError && error.code === "invalid-event"
        );
    });
});

describe("requestPagesDeploy", () => {
    it("posts once and logs safe event metadata for a successful hook", async () => {
        const logger = memoryLogger();
        let request;
        const times = [100, 125];

        const result = await requestPagesDeploy({
            hookUrl,
            eventId: "event-1",
            documentId: "medicine-1",
            operation: "update",
            logger,
            now: () => times.shift(),
            fetchImpl: async (url, options) => {
                request = { url, options };
                return { ok: true, status: 200 };
            }
        });

        assert.deepEqual(result, { status: 200 });
        assert.equal(request.url, hookUrl);
        assert.equal(request.options.method, "POST");
        assert.equal(request.options.headers.Accept, "application/json");
        assert.ok(request.options.signal instanceof AbortSignal);
        assert.equal(logger.entries.at(-1).metadata.durationMs, 25);
        assert.doesNotMatch(JSON.stringify(logger.entries), /secret-token/);
    });

    it("rejects non-success responses without logging the hook URL", async () => {
        const logger = memoryLogger();

        await assert.rejects(
            requestPagesDeploy({
                hookUrl,
                eventId: "event-2",
                documentId: "medicine-2",
                operation: "create",
                logger,
                fetchImpl: async () => ({ ok: false, status: 429 })
            }),
            (error) => error instanceof DeployHookError
                && error.code === "http-error"
                && error.message === "Cloudflare deploy hook returned HTTP 429."
        );

        assert.equal(logger.entries.at(-1).metadata.status, 429);
        assert.doesNotMatch(JSON.stringify(logger.entries), /secret-token/);
    });

    it("sanitizes network failures so secret URLs never enter logs or errors", async () => {
        const logger = memoryLogger();

        await assert.rejects(
            requestPagesDeploy({
                hookUrl,
                eventId: "event-3",
                documentId: "medicine-3",
                operation: "delete",
                logger,
                fetchImpl: async () => {
                    throw new Error(`Could not fetch ${hookUrl}`);
                }
            }),
            (error) => error instanceof DeployHookError
                && error.code === "network-error"
                && !error.message.includes("secret-token")
        );

        assert.doesNotMatch(JSON.stringify(logger.entries), /secret-token/);
    });

    it("aborts a hook request after the configured timeout", async () => {
        const logger = memoryLogger();

        await assert.rejects(
            requestPagesDeploy({
                hookUrl,
                eventId: "event-4",
                documentId: "medicine-4",
                operation: "update",
                logger,
                timeoutMs: 5,
                fetchImpl: (_url, { signal }) => new Promise((_resolve, reject) => {
                    signal.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
                })
            }),
            (error) => error instanceof DeployHookError && error.code === "timeout"
        );

        assert.equal(logger.entries.at(-1).metadata.result, "timeout");
    });

    it("rejects non-Cloudflare and non-HTTPS hook URLs before fetching", async () => {
        let called = false;

        for (const invalidUrl of [
            "http://api.cloudflare.com/hook",
            "https://example.com/hook",
            "not-a-url"
        ]) {
            await assert.rejects(
                requestPagesDeploy({
                    hookUrl: invalidUrl,
                    eventId: "event-5",
                    documentId: "medicine-5",
                    operation: "create",
                    fetchImpl: async () => {
                        called = true;
                    }
                }),
                (error) => error instanceof DeployHookError && error.code === "invalid-hook-url"
            );
        }

        assert.equal(called, false);
    });
});

