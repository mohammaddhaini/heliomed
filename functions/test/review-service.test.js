import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { CheckoutError } from "../src/domain.js";
import { submitProductReview } from "../src/review-service.js";
import { MemoryFirestore } from "./memory-firestore.js";

const auth = {
    uid: "user-1",
    token: { email: "jane@example.test", name: "Jane Token" }
};

const reviewData = () => ({
    productId: "pain-relief",
    orderId: "HM-20260820-ABCDE",
    rating: 5,
    text: "Worked well and arrived quickly.",
    name: "Browser Name"
});

const firestore = (overrides = {}) => new MemoryFirestore({
    "orders/HM-20260820-ABCDE": {
        id: "HM-20260820-ABCDE",
        userId: "user-1",
        status: "Delivered / paid",
        productIds: ["pain-relief"],
        items: [{ id: "pain-relief:Large", quantity: 1 }]
    },
    "userProfiles/user-1": {
        name: "Jane Profile"
    },
    ...overrides
});

const dependencies = {
    now: () => new Date("2026-08-20T12:00:00.000Z")
};

function productReviews(db) {
    return [...db.store.entries()]
        .filter(([path]) => path.startsWith("productReviews/"))
        .map(([, value]) => value);
}

describe("submitProductReview", () => {
    it("writes a normalized verified purchase review for a delivered owned order", async () => {
        // Given
        const db = firestore();

        // When
        const review = await submitProductReview({ db, auth, data: reviewData(), ...dependencies });

        // Then
        assert.match(review.id, /^[a-f0-9]{64}$/);
        assert.equal(review.productId, "pain-relief");
        assert.equal(review.orderId, "HM-20260820-ABCDE");
        assert.equal(review.userId, "user-1");
        assert.equal(review.name, "Jane Profile");
        assert.equal(review.rating, 5);
        assert.equal(review.verifiedPurchase, true);
        assert.equal(review.createdAt, "2026-08-20T12:00:00.000Z");
        assert.equal(review.updatedAt, "2026-08-20T12:00:00.000Z");
        assert.deepEqual(productReviews(db), [review]);
    });

    it("updates the same user/order/product review instead of creating a duplicate", async () => {
        // Given
        const db = firestore();
        const first = await submitProductReview({ db, auth, data: reviewData(), ...dependencies });

        // When
        const second = await submitProductReview({
            db,
            auth,
            data: { ...reviewData(), rating: 4, text: "Updated after using it again." },
            now: () => new Date("2026-08-21T09:30:00.000Z")
        });

        // Then
        assert.equal(second.id, first.id);
        assert.equal(second.createdAt, first.createdAt);
        assert.equal(second.updatedAt, "2026-08-21T09:30:00.000Z");
        assert.equal(second.rating, 4);
        assert.equal(productReviews(db).length, 1);
        assert.deepEqual(productReviews(db)[0], second);
    });

    it("rejects unauthenticated users", async () => {
        // Given
        const db = firestore();

        // When / Then
        await assert.rejects(
            submitProductReview({ db, auth: null, data: reviewData(), ...dependencies }),
            (error) => error instanceof CheckoutError && error.code === "unauthenticated"
        );
    });

    it("rejects reviews for orders owned by another user", async () => {
        // Given
        const db = firestore({
            "orders/HM-20260820-ABCDE": {
                id: "HM-20260820-ABCDE",
                userId: "user-2",
                status: "Delivered / paid",
                productIds: ["pain-relief"]
            }
        });

        // When / Then
        await assert.rejects(
            submitProductReview({ db, auth, data: reviewData(), ...dependencies }),
            (error) => error instanceof CheckoutError && error.code === "permission-denied"
        );
        assert.equal(productReviews(db).length, 0);
    });

    it("rejects reviews before the order is delivered and paid", async () => {
        // Given
        const db = firestore({
            "orders/HM-20260820-ABCDE": {
                id: "HM-20260820-ABCDE",
                userId: "user-1",
                status: "Shipping",
                productIds: ["pain-relief"]
            }
        });

        // When / Then
        await assert.rejects(
            submitProductReview({ db, auth, data: reviewData(), ...dependencies }),
            (error) => error instanceof CheckoutError && error.code === "failed-precondition"
        );
        assert.equal(productReviews(db).length, 0);
    });

    it("rejects reviews for products that were not in the order", async () => {
        // Given
        const db = firestore();

        // When / Then
        await assert.rejects(
            submitProductReview({
                db,
                auth,
                data: { ...reviewData(), productId: "different-product" },
                ...dependencies
            }),
            (error) => error instanceof CheckoutError && error.code === "failed-precondition"
        );
        assert.equal(productReviews(db).length, 0);
    });

    it("accepts product membership from order item ids when productIds is absent", async () => {
        // Given
        const db = firestore({
            "orders/HM-20260820-ABCDE": {
                id: "HM-20260820-ABCDE",
                userId: "user-1",
                status: "Delivered / paid",
                items: [{ id: "pain-relief:Large", quantity: 1 }]
            }
        });

        // When
        const review = await submitProductReview({ db, auth, data: reviewData(), ...dependencies });

        // Then
        assert.equal(review.productId, "pain-relief");
        assert.equal(productReviews(db).length, 1);
    });

    it("rejects untrusted fields, invalid ratings, and oversized text", async () => {
        // Given
        const db = firestore();

        // When / Then
        await assert.rejects(
            submitProductReview({
                db,
                auth,
                data: { ...reviewData(), verifiedPurchase: true },
                ...dependencies
            }),
            (error) => error instanceof CheckoutError && error.code === "invalid-argument"
        );
        await assert.rejects(
            submitProductReview({ db, auth, data: { ...reviewData(), rating: 6 }, ...dependencies }),
            (error) => error instanceof CheckoutError && error.code === "invalid-argument"
        );
        await assert.rejects(
            submitProductReview({ db, auth, data: { ...reviewData(), text: "x".repeat(2001) }, ...dependencies }),
            (error) => error instanceof CheckoutError && error.code === "invalid-argument"
        );
        assert.equal(productReviews(db).length, 0);
    });
});
