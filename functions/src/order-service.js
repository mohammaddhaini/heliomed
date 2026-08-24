import { createHash } from "node:crypto";

import {
    CheckoutError,
    fingerprintCheckout,
    getDeliveryAreaDetails,
    parseCheckoutInput,
    parseStatusUpdate,
    priceCheckout
} from "./domain.js";

function requireAuth(auth) {
    if (!auth?.uid) throw new CheckoutError("unauthenticated", "Sign in before continuing.");
    return auth;
}

function idempotencyId(userId, key) {
    return createHash("sha256").update(`${userId}\0${key}`).digest("hex");
}

function dollars(value) {
    return value / 100;
}

const CHECKOUT_THROTTLE_MS = 60 * 1000;
const MAX_OPEN_ORDERS_PER_USER = 3;
const TERMINAL_STATUSES = new Set(["Delivered / paid", "Cancelled"]);

function medicineSnapshots(snapshots, refs) {
    return new Map(snapshots.map((snapshot, index) => [
        refs[index].id,
        snapshot.exists ? { id: refs[index].id, ...snapshot.data() } : null
    ]));
}

function orderMedicineId(item) {
    return String(item.productId || item.id || "").split(":")[0];
}

function orderVariantKeys(item) {
    const encoded = String(item.id || "").includes(":") ? String(item.id).split(":").slice(1).join(":") : "";
    return [
        item.variantSku,
        item.variantKey,
        item.variantName,
        encoded
    ].map((value) => String(value || "").trim()).filter(Boolean);
}

function normalizeVariant(value, index) {
    if (typeof value === "string") {
        return { index, raw: { name: value }, name: value.trim(), sku: "", inventory: 0 };
    }
    const raw = value && typeof value === "object" && !Array.isArray(value) ? value : {};
    return {
        index,
        raw,
        name: String(raw.name ?? raw.title ?? raw.size ?? raw.label ?? "").trim(),
        sku: String(raw.sku ?? "").trim(),
        inventory: Number(raw.inventory ?? 0)
    };
}

function findVariant(variants, keys) {
    const exact = variants.find((variant) => keys.includes(variant.sku) || keys.includes(variant.name));
    if (exact) return exact;
    const normalizedKeys = new Set(keys.map((key) => key.toLowerCase()));
    return variants.find((variant) => normalizedKeys.has(variant.sku.toLowerCase()) || normalizedKeys.has(variant.name.toLowerCase()));
}

function restoredMedicineUpdate(medicine, orderItems) {
    const variants = Array.isArray(medicine.variants) ? medicine.variants.map(normalizeVariant) : [];
    if (variants.length) {
        const nextVariants = variants.map((variant) => ({ ...variant.raw }));
        for (const item of orderItems) {
            const variant = findVariant(variants, orderVariantKeys(item));
            if (!variant) throw new CheckoutError("failed-precondition", "Ordered variant is no longer available for restock.");
            const currentInventory = Number.isInteger(variant.inventory) ? variant.inventory : 0;
            const nextInventory = currentInventory + Number(item.quantity || 0);
            nextVariants[variant.index] = {
                ...nextVariants[variant.index],
                inventory: nextInventory,
                available: nextInventory > 0
            };
            variant.inventory = nextInventory;
        }
        const inventory = nextVariants.reduce((sum, variant) => sum + Math.max(0, Number(variant.inventory || 0)), 0);
        return {
            inventory,
            available: inventory > 0,
            variants: nextVariants
        };
    }

    const quantity = orderItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
    const inventory = Math.max(0, Number(medicine.inventory || 0)) + quantity;
    return {
        inventory,
        available: inventory > 0
    };
}

function openOrderCount(throttle) {
    const count = Number(throttle?.openOrderCount ?? 0);
    return Number.isInteger(count) && count > 0 ? count : 0;
}

function canonicalOrder({ auth, checkout, priced, orderId, createdAt }) {
    const area = getDeliveryAreaDetails(checkout.deliveryArea);
    return {
        id: orderId,
        userId: auth.uid,
        createdAt,
        updatedAt: createdAt,
        status: "Order received",
        items: priced.items,
        productIds: [...new Set(priced.items.map((item) => item.id.split(":")[0]))],
        itemCount: priced.items.reduce((sum, item) => sum + item.quantity, 0),
        subtotal: dollars(priced.moneyCents.subtotal),
        discount: priced.discount,
        discountAmount: dollars(priced.moneyCents.discountAmount),
        deliveryArea: area,
        delivery: dollars(priced.moneyCents.delivery),
        total: dollars(priced.moneyCents.total),
        payment: checkout.payment,
        customer: {
            name: checkout.customer.name,
            phone: checkout.customer.phone,
            email: String(auth.token?.email ?? "")
        },
        address: { ...checkout.address, areaLabel: area.label }
    };
}

export async function createOrder({ db, auth: authValue, data, now, makeOrderId }) {
    const auth = requireAuth(authValue);
    const checkout = parseCheckoutInput(data);
    const fingerprint = fingerprintCheckout(auth.uid, checkout);
    const idempotencyRef = db.collection("orderIdempotency").doc(idempotencyId(auth.uid, checkout.idempotencyKey));
    const throttleRef = db.collection("checkoutThrottle").doc(auth.uid);

    return db.runTransaction(async (transaction) => {
        const [idempotencySnapshot, throttleSnapshot] = await transaction.getAll(idempotencyRef, throttleRef);
        if (idempotencySnapshot.exists) {
            const replay = idempotencySnapshot.data();
            if (replay.userId !== auth.uid || replay.fingerprint !== fingerprint) {
                throw new CheckoutError("already-exists", "This checkout key was already used for different details.");
            }
            const orderSnapshot = await transaction.get(db.collection("orders").doc(replay.orderId));
            if (!orderSnapshot.exists) throw new CheckoutError("internal", "The original order is unavailable.");
            return orderSnapshot.data();
        }

        const throttle = throttleSnapshot.exists ? throttleSnapshot.data() : null;
        const throttleTime = Date.parse(String(throttle?.lastCreatedAt ?? ""));
        const createdAt = now().toISOString();
        const currentOpenOrders = openOrderCount(throttle);
        if (Number.isFinite(throttleTime) && Date.parse(createdAt) - throttleTime < CHECKOUT_THROTTLE_MS) {
            if (throttle?.fingerprint === fingerprint && throttle?.orderId) {
                const orderSnapshot = await transaction.get(db.collection("orders").doc(throttle.orderId));
                if (orderSnapshot.exists) return orderSnapshot.data();
            }
            throw new CheckoutError("resource-exhausted", "Please wait before placing another order.");
        }
        if (currentOpenOrders >= MAX_OPEN_ORDERS_PER_USER) {
            throw new CheckoutError("resource-exhausted", "You have too many open orders. Please wait for one to finish before placing another.");
        }

        const medicineIds = [...new Set(checkout.items.map((item) => item.medicineId))];
        const medicineRefs = medicineIds.map((id) => db.collection("medicines").doc(id));
        const discountRef = checkout.discountCode
            ? db.collection("discountCodes").doc(checkout.discountCode)
            : null;
        const refs = discountRef ? [...medicineRefs, discountRef] : medicineRefs;
        const snapshots = await transaction.getAll(...refs);
        const medicines = medicineSnapshots(snapshots.slice(0, medicineRefs.length), medicineRefs);
        const discountSnapshot = discountRef ? snapshots.at(-1) : null;
        const discount = discountSnapshot?.exists ? discountSnapshot.data() : null;
        const priced = priceCheckout({ checkout, medicines, discount });
        const order = canonicalOrder({ auth, checkout, priced, orderId: makeOrderId(), createdAt });
        const medicineRefById = new Map(medicineRefs.map((ref) => [ref.id, ref]));

        for (const update of priced.inventoryUpdates) {
            const fields = {
                inventory: update.remaining,
                available: update.available,
                updatedAt: createdAt
            };
            if (update.variants) fields.variants = update.variants;
            transaction.update(medicineRefById.get(update.medicineId), fields);
        }
        transaction.create(db.collection("orders").doc(order.id), order);
        transaction.create(idempotencyRef, {
            userId: auth.uid,
            fingerprint,
            orderId: order.id,
            createdAt
        });
        const throttleRecord = {
            userId: auth.uid,
            fingerprint,
            orderId: order.id,
            lastCreatedAt: createdAt,
            openOrderCount: currentOpenOrders + 1
        };
        if (throttleSnapshot.exists) {
            transaction.update(throttleRef, throttleRecord);
        } else {
            transaction.create(throttleRef, throttleRecord);
        }
        return order;
    });
}

export async function updateOrderStatus({ db, auth: authValue, data, now }) {
    const auth = requireAuth(authValue);
    const update = parseStatusUpdate(data);
    const adminRef = db.collection("admins").doc(auth.uid);
    const email = String(auth.token?.email ?? "").toLowerCase();
    const emailRef = db.collection("adminEmails").doc(email || "missing-email");
    const orderRef = db.collection("orders").doc(update.orderId);

    return db.runTransaction(async (transaction) => {
        const [adminSnapshot, emailSnapshot, orderSnapshot] = await transaction.getAll(adminRef, emailRef, orderRef);
        const authorized = auth.token?.admin === true
            || (adminSnapshot.exists && adminSnapshot.data().active !== false)
            || (emailSnapshot.exists && emailSnapshot.data().active !== false);
        if (!authorized) throw new CheckoutError("permission-denied", "Administrator access is required.");
        if (!orderSnapshot.exists) throw new CheckoutError("not-found", "Order not found.");
        const order = orderSnapshot.data();
        const oldStatus = String(order.status ?? "");
        const wasTerminal = TERMINAL_STATUSES.has(oldStatus);
        const willBeTerminal = TERMINAL_STATUSES.has(update.status);
        if (wasTerminal && update.status !== oldStatus) {
            throw new CheckoutError("failed-precondition", "Terminal orders cannot be reopened.");
        }
        const updatedAt = now().toISOString();
        let throttleRef = null;
        let throttleSnapshot = null;
        if (willBeTerminal && !wasTerminal) {
            const orderUserId = String(order.userId || "").trim();
            if (orderUserId) {
                throttleRef = db.collection("checkoutThrottle").doc(orderUserId);
                throttleSnapshot = await transaction.get(throttleRef);
            }
        }
        if (update.status === "Cancelled" && oldStatus !== "Cancelled") {
            const items = Array.isArray(order.items) ? order.items : [];
            const medicineIds = [...new Set(items.map(orderMedicineId).filter(Boolean))];
            const medicineRefs = medicineIds.map((id) => db.collection("medicines").doc(id));
            const medicineSnapshots = medicineRefs.length ? await transaction.getAll(...medicineRefs) : [];
            const itemsByMedicine = new Map();
            for (const item of items) {
                const medicineId = orderMedicineId(item);
                if (!medicineId) continue;
                itemsByMedicine.set(medicineId, [...(itemsByMedicine.get(medicineId) ?? []), item]);
            }
            for (const [index, ref] of medicineRefs.entries()) {
                const snapshot = medicineSnapshots[index];
                if (!snapshot.exists) throw new CheckoutError("failed-precondition", "Ordered medicine is no longer available for restock.");
                transaction.update(ref, {
                    ...restoredMedicineUpdate(snapshot.data(), itemsByMedicine.get(ref.id) ?? []),
                    updatedAt
                });
            }
        }
        if (throttleSnapshot?.exists) {
            transaction.update(throttleRef, {
                openOrderCount: Math.max(0, openOrderCount(throttleSnapshot.data()) - 1),
                updatedAt
            });
        }
        transaction.update(orderRef, { status: update.status, updatedAt });
        return update;
    });
}
