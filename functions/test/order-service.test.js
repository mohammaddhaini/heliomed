import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { CheckoutError } from "../src/domain.js";
import { createOrder, trackOrder, updateOrderStatus } from "../src/order-service.js";
import { MemoryFirestore } from "./memory-firestore.js";

const checkoutData = () => ({
    idempotencyKey: "37cfa84a-b95e-4f77-bc0b-fc121bceaf0a",
    items: [
        { id: "pain-relief:PR-S", quantity: 1 },
        { id: "pain-relief:PR-L", quantity: 2 }
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

const firestore = (extra = {}) => new MemoryFirestore({
    "medicines/pain-relief": {
        title: "Pain Relief",
        brand: "Heliomed",
        imageUrl: "https://example.test/pain-relief.jpg",
        newPriceValue: 12.34,
        oldPriceValue: 14,
        inventory: 5,
        available: true,
        variants: [
            {
                name: "Small",
                sku: "PR-S",
                newPriceValue: 10,
                newPrice: "$10.00",
                inventory: 3,
                available: true
            },
            {
                name: "Large",
                sku: "PR-L",
                newPriceValue: 14,
                newPrice: "$14.00",
                inventory: 2,
                available: true
            }
        ]
    },
    "discountCodes/SAVE10": {
        code: "SAVE10",
        active: true,
        type: "percent",
        value: 10
    },
    ...extra
});

const auth = {
    uid: "user-1",
    token: { email: "jane@example.test" }
};

const dependencies = {
    now: () => new Date("2026-08-20T12:00:00.000Z"),
    makeOrderId: () => "HM-20260820-ABCDE"
};

function laterDependencies(index) {
    return {
        now: () => new Date(Date.UTC(2026, 7, 20, 12, index + 1, 0)),
        makeOrderId: () => `HM-20260820-ABC${String(index).padStart(2, "0")}`
    };
}

function oneUnitCheckout(index) {
    return {
        ...checkoutData(),
        idempotencyKey: `37cfa84a-b95e-4f77-bc0b-fc121bceaf${String(index).padStart(2, "0")}`,
        items: [{ id: "pain-relief:PR-S", quantity: 1 }],
        discountCode: ""
    };
}

describe("createOrder", () => {
    it("creates a guest order without Firebase auth", async () => {
        // Given
        const db = firestore();

        // When
        const order = await createOrder({ db, auth: null, data: checkoutData(), ...dependencies });

        // Then
        assert.equal(order.id, "HM-20260820-ABCDE");
        assert.equal(order.userId, "");
        assert.equal(order.customer.email, "");
        assert.equal(order.customer.phone, "+961 70 123 456");
        assert.deepEqual(db.read("orders/HM-20260820-ABCDE"), order);
    });

    it("atomically creates an authoritative order and decrements selected variant stock", async () => {
        // Given
        const db = firestore();

        // When
        const order = await createOrder({ db, auth, data: checkoutData(), ...dependencies });

        // Then
        assert.equal(order.id, "HM-20260820-ABCDE");
        assert.equal(order.userId, "user-1");
        assert.equal(order.customer.email, "jane@example.test");
        assert.equal(order.subtotal, 38);
        assert.equal(order.discountAmount, 3.8);
        assert.equal(order.delivery, 3);
        assert.equal(order.total, 37.2);
        assert.deepEqual(order.productIds, ["pain-relief"]);
        assert.equal(db.read("medicines/pain-relief").inventory, 2);
        assert.equal(db.read("medicines/pain-relief").variants[0].inventory, 2);
        assert.equal(db.read("medicines/pain-relief").variants[1].inventory, 0);
        assert.equal(db.read("medicines/pain-relief").variants[1].available, false);
        assert.deepEqual(db.read("orders/HM-20260820-ABCDE"), order);
        assert.equal(db.read("checkoutThrottle/user-1").openOrderCount, 1);
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
        assert.equal(db.read("medicines/pain-relief").variants[1].inventory, 0);
        assert.equal(db.read("checkoutThrottle/user-1").openOrderCount, 1);
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

    it("rejects rapid different checkout payloads for the same user", async () => {
        // Given
        const db = firestore();
        await createOrder({ db, auth, data: checkoutData(), ...dependencies });
        const changed = {
            ...checkoutData(),
            idempotencyKey: "47cfa84a-b95e-4f77-bc0b-fc121bceaf0b",
            discountCode: ""
        };

        // When / Then
        await assert.rejects(
            createOrder({ db, auth, data: changed, ...dependencies }),
            (error) => error instanceof CheckoutError && error.code === "resource-exhausted"
        );
        assert.equal(db.read("medicines/pain-relief").inventory, 2);
    });

    it("limits each user to three open orders while preserving existing idempotent replays", async () => {
        // Given
        const db = firestore({
            "medicines/pain-relief": {
                ...firestore().read("medicines/pain-relief"),
                inventory: 10,
                variants: [
                    { name: "Small", sku: "PR-S", newPriceValue: 10, newPrice: "$10.00", inventory: 10, available: true }
                ]
            }
        });
        const orders = [];
        for (let index = 0; index < 3; index += 1) {
            orders.push(await createOrder({
                db,
                auth,
                data: oneUnitCheckout(index),
                ...laterDependencies(index)
            }));
        }

        // When / Then
        assert.equal(db.read("checkoutThrottle/user-1").openOrderCount, 3);
        await assert.rejects(
            createOrder({
                db,
                auth,
                data: oneUnitCheckout(3),
                ...laterDependencies(3)
            }),
            (error) => error instanceof CheckoutError && error.code === "resource-exhausted"
        );

        const replay = await createOrder({
            db,
            auth,
            data: oneUnitCheckout(2),
            ...laterDependencies(4)
        });
        assert.deepEqual(replay, orders[2]);
        assert.equal(db.read("checkoutThrottle/user-1").openOrderCount, 3);
    });
});

describe("trackOrder", () => {
    it("returns an order when the order number and customer phone match", async () => {
        // Given
        const db = firestore();
        const created = await createOrder({ db, auth: null, data: checkoutData(), ...dependencies });

        // When
        const tracked = await trackOrder({
            db,
            data: { orderId: created.id.toLowerCase(), phone: "70 123 456" }
        });

        // Then
        assert.deepEqual(tracked, created);
    });

    it("rejects tracking when the phone number does not match", async () => {
        // Given
        const db = firestore();
        const created = await createOrder({ db, auth: null, data: checkoutData(), ...dependencies });

        // When / Then
        await assert.rejects(
            trackOrder({ db, data: { orderId: created.id, phone: "+961 70 000 000" } }),
            (error) => error instanceof CheckoutError && error.code === "permission-denied"
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

    it("restores selected variant stock exactly once when an order is cancelled", async () => {
        // Given
        const db = firestore({ "admins/admin-1": { active: true } });
        await createOrder({ db, auth, data: checkoutData(), ...dependencies });

        // When
        await updateOrderStatus({
            db,
            auth: { uid: "admin-1", token: { email: "admin@example.test" } },
            data: { orderId: "HM-20260820-ABCDE", status: "Cancelled" },
            now: dependencies.now
        });

        // Then
        assert.equal(db.read("orders/HM-20260820-ABCDE").status, "Cancelled");
        assert.equal(db.read("medicines/pain-relief").inventory, 5);
        assert.equal(db.read("medicines/pain-relief").variants[0].inventory, 3);
        assert.equal(db.read("medicines/pain-relief").variants[1].inventory, 2);
        assert.equal(db.read("medicines/pain-relief").available, true);

        await assert.rejects(
            updateOrderStatus({
                db,
                auth: { uid: "admin-1", token: { email: "admin@example.test" } },
                data: { orderId: "HM-20260820-ABCDE", status: "Shipping" },
                now: dependencies.now
            }),
            (error) => error instanceof CheckoutError && error.code === "failed-precondition"
        );
        assert.equal(db.read("medicines/pain-relief").inventory, 5);
        assert.equal(db.read("checkoutThrottle/user-1").openOrderCount, 0);

        await updateOrderStatus({
            db,
            auth: { uid: "admin-1", token: { email: "admin@example.test" } },
            data: { orderId: "HM-20260820-ABCDE", status: "Cancelled" },
            now: dependencies.now
        });
        assert.equal(db.read("medicines/pain-relief").inventory, 5);
        assert.equal(db.read("checkoutThrottle/user-1").openOrderCount, 0);
    });

    it("decrements open order count once when an order is delivered or paid", async () => {
        // Given
        const db = firestore({ "admins/admin-1": { active: true } });
        await createOrder({ db, auth, data: checkoutData(), ...dependencies });

        // When
        await updateOrderStatus({
            db,
            auth: { uid: "admin-1", token: { email: "admin@example.test" } },
            data: { orderId: "HM-20260820-ABCDE", status: "Delivered / paid" },
            now: dependencies.now
        });

        // Then
        assert.equal(db.read("checkoutThrottle/user-1").openOrderCount, 0);
        await updateOrderStatus({
            db,
            auth: { uid: "admin-1", token: { email: "admin@example.test" } },
            data: { orderId: "HM-20260820-ABCDE", status: "Delivered / paid" },
            now: dependencies.now
        });
        assert.equal(db.read("checkoutThrottle/user-1").openOrderCount, 0);

        await assert.rejects(
            updateOrderStatus({
                db,
                auth: { uid: "admin-1", token: { email: "admin@example.test" } },
                data: { orderId: "HM-20260820-ABCDE", status: "Shipping" },
                now: dependencies.now
            }),
            (error) => error instanceof CheckoutError && error.code === "failed-precondition"
        );
    });

    it("decrements guest open order count when a guest order is delivered", async () => {
        // Given
        const db = firestore({
            "admins/admin-1": { active: true },
            "medicines/pain-relief": {
                ...firestore().read("medicines/pain-relief"),
                inventory: 10,
                variants: [
                    { name: "Small", sku: "PR-S", newPriceValue: 10, newPrice: "$10.00", inventory: 10, available: true }
                ]
            }
        });
        const orders = [];
        for (let index = 0; index < 3; index += 1) {
            orders.push(await createOrder({
                db,
                auth: null,
                data: oneUnitCheckout(index),
                ...laterDependencies(index)
            }));
        }
        await assert.rejects(
            createOrder({
                db,
                auth: null,
                data: oneUnitCheckout(3),
                ...laterDependencies(3)
            }),
            (error) => error instanceof CheckoutError && error.code === "resource-exhausted"
        );

        // When
        await updateOrderStatus({
            db,
            auth: { uid: "admin-1", token: { email: "admin@example.test" } },
            data: { orderId: orders[0].id, status: "Delivered / paid" },
            now: dependencies.now
        });
        const fourth = await createOrder({
            db,
            auth: null,
            data: oneUnitCheckout(4),
            ...laterDependencies(4)
        });

        // Then
        assert.equal(fourth.id, "HM-20260820-ABC04");
    });
});
