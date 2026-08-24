import { randomBytes } from "node:crypto";

import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import * as functionsLogger from "firebase-functions/logger";
import { defineSecret } from "firebase-functions/params";
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";

import { medicineWriteOperation, requestPagesDeploy } from "./deploy-hook.js";
import { CheckoutError } from "./domain.js";
import {
    createOrder as createOrderTransaction,
    updateOrderStatus as updateOrderStatusTransaction
} from "./order-service.js";

initializeApp();

const db = getFirestore();
const cloudflareDeployHook = defineSecret("CLOUDFLARE_PAGES_DEPLOY_HOOK");
const callableOptions = {
    region: "europe-west1",
    timeoutSeconds: 30,
    memory: "256MiB",
    maxInstances: 20
};

const productRebuildOptions = {
    document: "medicines/{id}",
    region: "europe-west1",
    timeoutSeconds: 30,
    memory: "256MiB",
    maxInstances: 3,
    retry: false,
    secrets: [cloudflareDeployHook]
};

function makeOrderId() {
    const now = new Date();
    const date = now.getUTCFullYear().toString()
        + String(now.getUTCMonth() + 1).padStart(2, "0")
        + String(now.getUTCDate()).padStart(2, "0");
    return `HM-${date}-${randomBytes(5).toString("hex").toUpperCase()}`;
}

function callableError(error) {
    if (error instanceof CheckoutError) return new HttpsError(error.code, error.message);
    return new HttpsError("internal", "The request could not be completed.");
}

export const createOrder = onCall(callableOptions, async (request) => {
    try {
        return await createOrderTransaction({
            db,
            auth: request.auth,
            data: request.data,
            now: () => new Date(),
            makeOrderId
        });
    } catch (error) {
        throw callableError(error);
    }
});

export const updateOrderStatus = onCall(callableOptions, async (request) => {
    try {
        return await updateOrderStatusTransaction({
            db,
            auth: request.auth,
            data: request.data,
            now: () => new Date()
        });
    } catch (error) {
        throw callableError(error);
    }
});

export const rebuildProductPages = onDocumentWritten(productRebuildOptions, async (event) => {
    const operation = medicineWriteOperation(event.data);

    await requestPagesDeploy({
        hookUrl: cloudflareDeployHook.value(),
        eventId: event.id,
        documentId: event.params.id,
        operation,
        logger: functionsLogger
    });
});
