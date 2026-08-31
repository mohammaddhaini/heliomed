import { randomBytes } from "node:crypto";

import { initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import * as functionsLogger from "firebase-functions/logger";
import { defineSecret } from "firebase-functions/params";
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";

import { medicineWriteOperation, requestPagesDeploy } from "./deploy-hook.js";
import { CheckoutError } from "./domain.js";
import {
    createOrder as createOrderTransaction,
    trackOrder as trackOrderTransaction,
    updateOrderStatus as updateOrderStatusTransaction
} from "./order-service.js";
import {
    markProductBuildDirty,
    PRODUCT_BUILD_STATE_PATH,
    rebuildDirtyProducts
} from "./rebuild-service.js";
import { submitProductReview as submitProductReviewTransaction } from "./review-service.js";
import { sendOrderConfirmationWhatsApp } from "./whatsapp-service.js";

initializeApp();

const db = getFirestore();
const cloudflareDeployHook = defineSecret("CLOUDFLARE_PAGES_DEPLOY_HOOK");
const greenApiIdInstance = defineSecret("GREEN_API_ID_INSTANCE");
const greenApiTokenInstance = defineSecret("GREEN_API_TOKEN_INSTANCE");
const callableOptions = {
    region: "europe-west1",
    timeoutSeconds: 30,
    memory: "256MiB",
    maxInstances: 20
};
const createOrderOptions = {
    ...callableOptions,
    secrets: [greenApiIdInstance, greenApiTokenInstance]
};

const productDirtyOptions = {
    document: "medicines/{id}",
    region: "europe-west1",
    timeoutSeconds: 30,
    memory: "256MiB",
    maxInstances: 3,
    retry: true
};

const productRebuildOptions = {
    schedule: "every 1 minutes",
    region: "europe-west1",
    timeZone: "Asia/Beirut",
    timeoutSeconds: 30,
    memory: "256MiB",
    maxInstances: 1,
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

export const createOrder = onCall(createOrderOptions, async (request) => {
    try {
        const order = await createOrderTransaction({
            db,
            auth: request.auth,
            data: request.data,
            now: () => new Date(),
            makeOrderId
        });

        try {
            const notificationSnapshot = await db.collection("settings").doc("notifications").get().catch(() => null);
            const notifications = notificationSnapshot?.exists ? notificationSnapshot.data() : null;

            await sendOrderConfirmationWhatsApp({
                order,
                idInstance: greenApiIdInstance.value(),
                apiTokenInstance: greenApiTokenInstance.value(),
                template: notifications?.whatsappTemplate,
                enabled: notifications?.whatsappEnabled !== false,
                logger: functionsLogger
            });
        } catch (notificationError) {
            functionsLogger.error("Failed to send WhatsApp confirmation:", notificationError);
        }

        return order;
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

export const trackOrder = onCall(callableOptions, async (request) => {
    try {
        return await trackOrderTransaction({
            db,
            data: request.data
        });
    } catch (error) {
        throw callableError(error);
    }
});

export const submitProductReview = onCall(callableOptions, async (request) => {
    try {
        return await submitProductReviewTransaction({
            db,
            auth: request.auth,
            data: request.data,
            now: () => new Date()
        });
    } catch (error) {
        throw callableError(error);
    }
});

export const markProductPagesDirty = onDocumentWritten(productDirtyOptions, async (event) => {
    const operation = medicineWriteOperation(event.data);

    await markProductBuildDirty({
        stateRef: db.doc(PRODUCT_BUILD_STATE_PATH),
        eventId: event.id,
        documentId: event.params.id,
        operation,
        increment: FieldValue.increment,
        timestamp: FieldValue.serverTimestamp
    });
});

export const rebuildProductPages = onSchedule(productRebuildOptions, async () => {
    await rebuildDirtyProducts({
        db,
        stateRef: db.doc(PRODUCT_BUILD_STATE_PATH),
        hookUrl: cloudflareDeployHook.value(),
        requestDeploy: requestPagesDeploy,
        logger: functionsLogger,
        timestamp: FieldValue.serverTimestamp
    });
});
