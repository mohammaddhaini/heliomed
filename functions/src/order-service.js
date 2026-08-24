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

function medicineSnapshots(snapshots, refs) {
    return new Map(snapshots.map((snapshot, index) => [
        refs[index].id,
        snapshot.exists ? { id: refs[index].id, ...snapshot.data() } : null
    ]));
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

    return db.runTransaction(async (transaction) => {
        const idempotencySnapshot = await transaction.get(idempotencyRef);
        if (idempotencySnapshot.exists) {
            const replay = idempotencySnapshot.data();
            if (replay.userId !== auth.uid || replay.fingerprint !== fingerprint) {
                throw new CheckoutError("already-exists", "This checkout key was already used for different details.");
            }
            const orderSnapshot = await transaction.get(db.collection("orders").doc(replay.orderId));
            if (!orderSnapshot.exists) throw new CheckoutError("internal", "The original order is unavailable.");
            return orderSnapshot.data();
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
        const createdAt = now().toISOString();
        const order = canonicalOrder({ auth, checkout, priced, orderId: makeOrderId(), createdAt });
        const medicineRefById = new Map(medicineRefs.map((ref) => [ref.id, ref]));

        for (const update of priced.inventoryUpdates) {
            transaction.update(medicineRefById.get(update.medicineId), {
                inventory: update.remaining,
                available: update.remaining > 0,
                updatedAt: createdAt
            });
        }
        transaction.create(db.collection("orders").doc(order.id), order);
        transaction.create(idempotencyRef, {
            userId: auth.uid,
            fingerprint,
            orderId: order.id,
            createdAt
        });
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
        transaction.update(orderRef, { status: update.status, updatedAt: now().toISOString() });
        return update;
    });
}
