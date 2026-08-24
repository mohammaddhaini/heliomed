import { createHash } from "node:crypto";

import { CheckoutError } from "./domain.js";

const DELIVERED_STATUS = "delivered / paid";
const REVIEW_KEYS = new Set(["productId", "orderId", "rating", "text", "name"]);

function fail(code, message) {
    throw new CheckoutError(code, message);
}

function requireAuth(auth) {
    if (!auth?.uid) fail("unauthenticated", "Sign in before reviewing a product.");
    return auth;
}

function text(value, field, maximum, required = true) {
    if (typeof value !== "string") fail("invalid-argument", `${field} must be text.`);
    const normalized = value.trim();
    if (required && normalized.length === 0) fail("invalid-argument", `${field} is required.`);
    if (normalized.length > maximum) fail("invalid-argument", `${field} is too long.`);
    return normalized;
}

function parseReviewInput(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        fail("invalid-argument", "Review must be an object.");
    }
    if (Object.keys(value).some((key) => !REVIEW_KEYS.has(key))) {
        fail("invalid-argument", "Review contains untrusted fields.");
    }
    const productId = text(value.productId, "productId", 200);
    const orderId = text(value.orderId, "orderId", 80);
    if (productId.includes("/") || orderId.includes("/")) {
        fail("invalid-argument", "Review target is invalid.");
    }
    const rating = Number(value.rating);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
        fail("invalid-argument", "rating must be an integer from 1 to 5.");
    }
    return {
        productId,
        orderId,
        rating,
        text: text(value.text, "text", 2000),
        name: text(value.name ?? "", "name", 120, false)
    };
}

function isDelivered(order) {
    return String(order?.status || "").trim().toLowerCase() === DELIVERED_STATUS;
}

function baseProductId(item) {
    return String(item?.id || "").split(":")[0];
}

function orderContainsProduct(order, productId) {
    const productIds = Array.isArray(order?.productIds) ? order.productIds.map(String) : [];
    const itemProductIds = Array.isArray(order?.items) ? order.items.map(baseProductId) : [];
    return [...productIds, ...itemProductIds].includes(productId);
}

function reviewDocumentId(userId, orderId, productId) {
    return createHash("sha256").update(`${userId}\0${orderId}\0${productId}`).digest("hex");
}

function reviewerName({ auth, profile, inputName }) {
    const profileName = String(profile?.name || "").trim();
    const tokenName = String(auth.token?.name || "").trim();
    const emailName = String(auth.token?.email || "Customer").split("@")[0].trim();
    return text(profileName || tokenName || inputName || emailName || "Customer", "name", 120);
}

export async function submitProductReview({ db, auth: authValue, data, now }) {
    const auth = requireAuth(authValue);
    const input = parseReviewInput(data);
    const orderRef = db.collection("orders").doc(input.orderId);
    const profileRef = db.collection("userProfiles").doc(auth.uid);
    const reviewRef = db.collection("productReviews").doc(reviewDocumentId(auth.uid, input.orderId, input.productId));

    return db.runTransaction(async (transaction) => {
        const [orderSnapshot, profileSnapshot, reviewSnapshot] = await transaction.getAll(orderRef, profileRef, reviewRef);
        if (!orderSnapshot.exists) fail("not-found", "Order not found.");

        const order = orderSnapshot.data();
        if (order.userId !== auth.uid) fail("permission-denied", "This order does not belong to you.");
        if (!isDelivered(order)) fail("failed-precondition", "Only delivered purchases can be reviewed.");
        if (!orderContainsProduct(order, input.productId)) {
            fail("failed-precondition", "This order does not include the reviewed product.");
        }

        const timestamp = now().toISOString();
        const existing = reviewSnapshot.exists ? reviewSnapshot.data() : null;
        const review = {
            id: reviewRef.id,
            productId: input.productId,
            orderId: input.orderId,
            userId: auth.uid,
            name: reviewerName({
                auth,
                profile: profileSnapshot.exists ? profileSnapshot.data() : null,
                inputName: input.name
            }),
            text: input.text,
            rating: input.rating,
            verifiedPurchase: true,
            createdAt: existing?.createdAt ?? timestamp,
            updatedAt: timestamp
        };

        if (reviewSnapshot.exists) {
            transaction.update(reviewRef, review);
        } else {
            transaction.create(reviewRef, review);
        }
        return review;
    });
}
