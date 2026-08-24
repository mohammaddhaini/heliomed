import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
    CheckoutError,
    fingerprintCheckout,
    parseCheckoutInput,
    parseStatusUpdate,
    priceCheckout
} from "../src/domain.js";

const validCheckout = () => ({
    idempotencyKey: "37cfa84a-b95e-4f77-bc0b-fc121bceaf0a",
    items: [{ id: "pain-relief:Large", quantity: 2 }],
    discountCode: " SAVE10 ",
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

const medicines = new Map([
    ["pain-relief", {
        id: "pain-relief",
        title: "Pain Relief",
        brand: "Heliomed",
        imageUrl: "https://example.test/pain-relief.jpg",
        newPriceValue: 12.34,
        oldPriceValue: 14,
        inventory: 10,
        available: true,
        variants: [
            {
                name: "Small",
                sku: "PR-S",
                newPriceValue: 10,
                newPrice: "$10.00",
                oldPrice: "$12.00",
                inventory: 6,
                available: true,
                imageUrl: "https://example.test/pain-relief-small.jpg"
            },
            {
                name: "Large",
                sku: "PR-L",
                newPriceValue: 14,
                newPrice: "$14.00",
                oldPrice: "$16.00",
                inventory: 4,
                available: true
            }
        ]
    }]
]);

describe("parseCheckoutInput", () => {
    it("normalizes trusted checkout fields when input is valid", () => {
        // Given
        const input = validCheckout();

        // When
        const parsed = parseCheckoutInput(input);

        // Then
        assert.deepEqual(parsed.items, [{ id: "pain-relief:Large", medicineId: "pain-relief", variant: "Large", quantity: 2 }]);
        assert.equal(parsed.discountCode, "SAVE10");
        assert.equal(parsed.customer.name, "Jane Doe");
    });

    it("rejects client prices and totals", () => {
        // Given
        const input = { ...validCheckout(), total: 0.01 };

        // When / Then
        assert.throws(
            () => parseCheckoutInput(input),
            (error) => error instanceof CheckoutError && error.code === "invalid-argument"
        );
    });

    it("rejects invalid quantities", () => {
        // Given
        const input = { ...validCheckout(), items: [{ id: "pain-relief", quantity: 0 }] };

        // When / Then
        assert.throws(
            () => parseCheckoutInput(input),
            (error) => error instanceof CheckoutError && error.code === "invalid-argument"
        );
    });
});

describe("priceCheckout", () => {
    it("uses variant prices and inventory for variant cart IDs", () => {
        // Given
        const checkout = parseCheckoutInput({
            ...validCheckout(),
            items: [{ id: "pain-relief:PR-L", quantity: 2 }]
        });
        const discount = { code: "SAVE10", active: true, type: "percent", value: 10 };

        // When
        const priced = priceCheckout({ checkout, medicines, discount });

        // Then
        assert.deepEqual(priced.moneyCents, {
            subtotal: 2800,
            discountAmount: 280,
            delivery: 300,
            total: 2820
        });
        assert.equal(priced.items[0].price, 14);
        assert.equal(priced.items[0].title, "Pain Relief - Large");
        assert.equal(priced.items[0].variantSku, "PR-L");
        assert.equal(priced.items[0].url, "./product/pain-relief-pain-relief/");
        assert.equal(priced.inventoryUpdates[0].remaining, 8);
        assert.equal(priced.inventoryUpdates[0].variants[1].inventory, 2);
    });

    it("aggregates quantities against the selected variant inventory", () => {
        // Given
        const checkout = parseCheckoutInput({
            ...validCheckout(),
            items: [
                { id: "pain-relief:PR-L", quantity: 3 },
                { id: "pain-relief:Large", quantity: 2 }
            ]
        });

        // When / Then
        assert.throws(
            () => priceCheckout({ checkout, medicines, discount: null }),
            (error) => error instanceof CheckoutError && error.code === "failed-precondition"
        );
    });

    it("rejects missing variant IDs for products with stored variants", () => {
        // Given
        const checkout = parseCheckoutInput({
            ...validCheckout(),
            items: [{ id: "pain-relief", quantity: 1 }]
        });

        // When / Then
        assert.throws(
            () => priceCheckout({ checkout, medicines, discount: null }),
            (error) => error instanceof CheckoutError && error.code === "failed-precondition"
        );
    });

    it("applies free delivery at the authoritative threshold", () => {
        // Given
        const baseMedicines = new Map([
            ["pain-relief", { ...medicines.get("pain-relief"), variants: [] }]
        ]);
        const checkout = parseCheckoutInput({
            ...validCheckout(),
            items: [{ id: "pain-relief", quantity: 7 }],
            discountCode: ""
        });

        // When
        const priced = priceCheckout({ checkout, medicines: baseMedicines, discount: null });

        // Then
        assert.equal(priced.moneyCents.subtotal, 8638);
        assert.equal(priced.moneyCents.delivery, 0);
        assert.equal(priced.moneyCents.total, 8638);
    });

    it("rejects inactive and minimum-subtotal discounts", () => {
        // Given
        const checkout = parseCheckoutInput(validCheckout());

        // When / Then
        assert.throws(
            () => priceCheckout({ checkout, medicines, discount: { code: "SAVE10", active: false, type: "percent", value: 10 } }),
            (error) => error instanceof CheckoutError && error.code === "failed-precondition"
        );
        assert.throws(
            () => priceCheckout({ checkout, medicines, discount: { code: "SAVE10", active: true, type: "fixed", value: 5, minSubtotal: 30 } }),
            (error) => error instanceof CheckoutError && error.code === "failed-precondition"
        );
    });
});

describe("fingerprintCheckout", () => {
    it("is stable for equivalent object key ordering and changes with payload", () => {
        // Given
        const checkout = parseCheckoutInput(validCheckout());
        const reordered = { ...checkout, customer: { phone: checkout.customer.phone, name: checkout.customer.name } };

        // When
        const first = fingerprintCheckout("user-1", checkout);
        const second = fingerprintCheckout("user-1", reordered);
        const changed = fingerprintCheckout("user-1", { ...checkout, deliveryArea: "aley" });

        // Then
        assert.equal(first, second);
        assert.notEqual(first, changed);
        assert.match(first, /^[a-f0-9]{64}$/);
    });
});

describe("parseStatusUpdate", () => {
    it("accepts existing status vocabulary and rejects unknown statuses", () => {
        // Given
        const valid = { orderId: "HM-20260820-12345", status: "Delivered / paid" };

        // When
        const parsed = parseStatusUpdate(valid);

        // Then
        assert.deepEqual(parsed, valid);
        assert.throws(
            () => parseStatusUpdate({ ...valid, status: "Refund pending" }),
            (error) => error instanceof CheckoutError && error.code === "invalid-argument"
        );
    });
});
