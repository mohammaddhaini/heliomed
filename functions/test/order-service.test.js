import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { CheckoutError } from "../src/domain.js";
import { createOrder, updateOrderStatus } from "../src/order-service.js";
import { MemoryFirestore } from "./memory-firestore.js";

const checkoutData = () => ({
    idempotencyKey: "37cfa84a-b95e-4f77-bc0b-fc121bceaf0a",
    items: [
        { id: "pain-relief:Small", quantity: 1 },
        { id: "pain-relief:Large", quantity: 2 }
    ],
    discountCode: "SAVE10",
    deliveryArea: "beirut",
    payment: "Cash on Delivery",
    customer: { name: "Jane Doe", phone: "+961 70 123 456" },
    address: {
        city: "Beirut",
        country: "Lebanon",
        area: "beirut",
        building: "12",
        floor: "3",
        street: "Hamra Street",
        notes: "Call on arrival"
    }
});

const firestore = () => new MemoryFirestore({
    "medicines/pain-relief": {
        title: "Pain Relief",
        brand: "Heliomed",
        imageUrl: "https://example.test/pain-relief.jpg",
        newPriceValue: 12.34,
        oldPriceValue: 14,
        inventory: 5,
        available: true
    },
    "discountCodes/SAVE10": {
        code: "SAVE10",
        active: true,
        type: "percent",
        value: 10
    }
});

const auth = {
    uid: "user-1",
    token: { email: "jane@example.test" }
};

const dependencies = {
    now: () => new Date("2026-08-20T12:00:00.000Z"),
    makeOrderId: () => "HM-20260820-ABCDE"
};

describe("createOrder", () => {
    it("atomically creates an authoritative order and decrements base stock", async () => {
        // Given
        const db = firestore();

        // When
        const order = await createOrder({ db, auth, data: checkoutData(), ...dependencies });

        // Then
        assert.equal(order.id, "HM-20260820-ABCDE");
        assert.equal(order.userId, "user-1");
        assert.equal(order.customer.email, "jane@example.test");
        assert.equal(order.subtotal, 37.02);
        assert.equal(order.discountAmount, 3.7);
        assert.equal(order.delivery, 3);
        assert.equal(order.total, 36.32);
        assert.deepEqual(order.productIds, ["pain-relief"]);
        assert.equal(db.read("medicines/pain-relief").inventory, 2);
        assert.deepEqual(db.read("orders/HM-20260820-ABCDE"), order);
    });

    it("returns the original order for an idempotent replay without changing stock", async () => {
        // Given
        const db = firestore();
        const first = await createOrder({ db, auth, data: checkoutData(), ...dependencies });

        // When
        const replay = await createOrder({ db, auth, data: checkoutData(), ...dependencies });

        // Then
        assert.deepEqual(replay, first);
        assert.equal(db.read("medicines/pain-relief").inventory, 2);
    });

    it("rejects reuse of an idempotency key for a changed payload", async () => {
        // Given
        const db = firestore();
        await createOrder({ db, auth, data: checkoutData(), ...dependencies });
        const changed = { ...checkoutData(), deliveryArea: "aley", address: { ...checkoutData().address, area: "aley" } };

        // When / Then
        await assert.rejects(
            createOrder({ db, auth, data: changed, ...dependencies }),
            (error) => error instanceof CheckoutError && error.code === "already-exists"
        );
    });
});

describe("updateOrderStatus", () => {
    it("allows an active administrator document to update an existing order", async () => {
        // Given
        const db = new MemoryFirestore({
            "admins/admin-1": { active: true },
            "orders/HM-20260820-ABCDE": { id: "HM-20260820-ABCDE", status: "Order received" }
        });

        // When
        const result = await updateOrderStatus({
            db,
            auth: { uid: "admin-1", token: { email: "admin@example.test" } },
            data: { orderId: "HM-20260820-ABCDE", status: "Shipping" },
            now: dependencies.now
        });

        // Then
        assert.deepEqual(result, { orderId: "HM-20260820-ABCDE", status: "Shipping" });
        assert.equal(db.read("orders/HM-20260820-ABCDE").updatedAt, "2026-08-20T12:00:00.000Z");
    });

    it("rejects a non-admin without changing the order", async () => {
        // Given
        const db = new MemoryFirestore({
            "orders/HM-20260820-ABCDE": { id: "HM-20260820-ABCDE", status: "Order received" }
        });

        // When / Then
        await assert.rejects(
            updateOrderStatus({
                db,
                auth,
                data: { orderId: "HM-20260820-ABCDE", status: "Shipping" },
                now: dependencies.now
            }),
            (error) => error instanceof CheckoutError && error.code === "permission-denied"
        );
        assert.equal(db.read("orders/HM-20260820-ABCDE").status, "Order received");
    });
});
