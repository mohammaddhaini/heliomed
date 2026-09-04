import { createHash } from "node:crypto";

const DELIVERY_COSTS = new Map([
    ["akkar", 500], ["aley", 400], ["baabda", 400], ["baalbek", 600],
    ["batroun", 500], ["beirut", 300], ["bint-jbeil", 600], ["bsharri", 500],
    ["byblos", 500], ["chouf", 400], ["danniyeh", 600], ["hasbaya", 600],
    ["hermel", 600], ["jezzine", 500], ["keserwan", 400], ["koura", 500],
    ["marjeyoun", 600], ["matn", 400], ["nabatieh", 500], ["rashaya", 600],
    ["sidon", 400], ["tripoli", 500], ["tyre", 500], ["western-bekaa", 600],
    ["zahleh", 500], ["zgharta", 500]
]);
const DELIVERY_LABELS = new Map([
    ["akkar", "Akkar - عكار"], ["aley", "Aley - عاليه"], ["baabda", "Baabda - بعبدا"],
    ["baalbek", "Baalbek - بعلبك"], ["batroun", "Batroun - البترون"], ["beirut", "Beirut - بيروت"],
    ["bint-jbeil", "Bint Jbeil - بنت جبيل"], ["bsharri", "Bsharri - بشري"], ["byblos", "Byblos - جبيل"],
    ["chouf", "Chouf - الشوف"], ["danniyeh", "Danniyeh - الضنية"], ["hasbaya", "Hasbaya - حاصبيا"],
    ["hermel", "Hermel - الهرمل"], ["jezzine", "Jezzine - جزين"], ["keserwan", "Keserwan - كسروان"],
    ["koura", "Koura - الكورة"], ["marjeyoun", "Marjeyoun - مرجعيون"], ["matn", "Matn - المتن"],
    ["nabatieh", "Nabatieh - النبطية"], ["rashaya", "Rashaya - راشيا"], ["sidon", "Sidon - صيدا"],
    ["tripoli", "Tripoli - طرابلس"], ["tyre", "Tyre - صور"], ["western-bekaa", "Western Bekaa - البقاع الغربي"],
    ["zahleh", "Zahle - زحلة"], ["zgharta", "Zgharta - زغرتا"]
]);
const FREE_SHIPPING_CENTS = 7500;
const ALLOWED_PAYMENTS = new Set(["Cash on Delivery", "Whish"]);
const ALLOWED_STATUSES = new Set([
    "Order received",
    "Confirmation / processing",
    "Fulfillment",
    "Shipping",
    "Delivered / paid",
    "Cancelled"
]);
const CHECKOUT_KEYS = new Set([
    "idempotencyKey", "items", "discountCode", "deliveryArea", "payment", "customer", "address"
]);
const TRACKING_KEYS = new Set(["orderId", "phone"]);

export class CheckoutError extends Error {
    constructor(code, message) {
        super(message);
        this.name = "CheckoutError";
        this.code = code;
    }
}

export function resolveDeliveryConfig(settings) {
    if (settings && typeof settings === "object" && Array.isArray(settings.areas) && settings.areas.length > 0) {
        const costs = new Map();
        const labels = new Map();
        for (const item of settings.areas) {
            const val = String(item.value || item.id || "").trim().toLowerCase();
            if (!val || item.active === false) continue;
            const costCents = Math.max(0, Math.round(Number(item.cost ?? item.price ?? 0) * 100));
            costs.set(val, costCents);
            labels.set(val, String(item.label || item.name || val).trim());
        }
        const freeShippingCents = Number.isFinite(Number(settings.freeShippingThreshold))
            ? Math.max(0, Math.round(Number(settings.freeShippingThreshold) * 100))
            : FREE_SHIPPING_CENTS;
        if (costs.size > 0) {
            return {
                costs,
                labels,
                freeShippingCents
            };
        }
    }
    return {
        costs: DELIVERY_COSTS,
        labels: DELIVERY_LABELS,
        freeShippingCents: FREE_SHIPPING_CENTS
    };
}

function fail(code, message) {
    throw new CheckoutError(code, message);
}

function record(value, field) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        fail("invalid-argument", `${field} must be an object.`);
    }
    return value;
}

function text(value, field, maximum, required = true) {
    if (typeof value !== "string") fail("invalid-argument", `${field} must be text.`);
    const normalized = value.trim();
    if (required && normalized.length === 0) fail("invalid-argument", `${field} is required.`);
    if (normalized.length > maximum) fail("invalid-argument", `${field} is too long.`);
    return normalized;
}

export function normalizePhoneForMatch(value) {
    let digits = String(value || "").replace(/\D/g, "");
    if (digits.startsWith("00")) digits = digits.slice(2);
    if (digits.startsWith("961") && digits.length > 8) digits = digits.slice(3);
    return digits.replace(/^0+/, "");
}

function cartItem(value) {
    const item = record(value, "item");
    const id = text(item.id, "item.id", 200);
    if (id.includes("/")) fail("invalid-argument", "item.id is invalid.");
    const separator = id.indexOf(":");
    const medicineId = separator < 0 ? id : id.slice(0, separator);
    const variant = separator < 0 ? "" : text(id.slice(separator + 1), "item.variant", 80);
    const quantity = Number(item.quantity);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
        fail("invalid-argument", "item.quantity must be an integer from 1 to 99.");
    }
    if (Object.keys(item).some((key) => !new Set(["id", "quantity"]).has(key))) {
        fail("invalid-argument", "Cart items may only contain id and quantity.");
    }
    return { id, medicineId, variant, quantity };
}

function addressInput(value, deliveryArea) {
    const address = record(value, "address");
    const area = text(address.area, "address.area", 80).toLowerCase();
    if (area !== deliveryArea) fail("invalid-argument", "Address area must match delivery area.");
    return {
        city: text(address.city, "address.city", 100),
        country: text(address.country, "address.country", 100),
        area,
        building: text(address.building ?? "", "address.building", 120, false),
        floor: text(address.floor ?? "", "address.floor", 40, false),
        street: text(address.street, "address.street", 200),
        notes: text(address.notes ?? "", "address.notes", 500, false)
    };
}

export function parseCheckoutInput(value, deliveryConfig = null) {
    const input = record(value, "checkout");
    if (Object.keys(input).some((key) => !CHECKOUT_KEYS.has(key))) {
        fail("invalid-argument", "Checkout contains untrusted fields.");
    }
    if (!Array.isArray(input.items) || input.items.length < 1 || input.items.length > 50) {
        fail("invalid-argument", "Checkout must contain 1 to 50 items.");
    }
    const idempotencyKey = text(input.idempotencyKey, "idempotencyKey", 128);
    if (!/^[a-zA-Z0-9_-]{20,128}$/.test(idempotencyKey)) {
        fail("invalid-argument", "idempotencyKey is invalid.");
    }
    const deliveryArea = text(input.deliveryArea, "deliveryArea", 80).toLowerCase();
    if (deliveryConfig) {
        const config = resolveDeliveryConfig(deliveryConfig);
        if (!config.costs.has(deliveryArea)) fail("invalid-argument", "Unknown delivery area.");
    }
    const payment = text(input.payment, "payment", 80);
    if (!ALLOWED_PAYMENTS.has(payment)) fail("invalid-argument", "Unknown payment method.");
    const customer = record(input.customer, "customer");
    return {
        idempotencyKey,
        items: input.items.map(cartItem),
        discountCode: text(input.discountCode ?? "", "discountCode", 80, false).toUpperCase(),
        deliveryArea,
        payment,
        customer: {
            name: text(customer.name, "customer.name", 120),
            phone: text(customer.phone, "customer.phone", 40)
        },
        address: addressInput(input.address, deliveryArea)
    };
}

export function parseTrackingInput(value) {
    const input = record(value, "tracking request");
    if (Object.keys(input).some((key) => !TRACKING_KEYS.has(key))) {
        fail("invalid-argument", "Tracking request contains untrusted fields.");
    }
    const orderId = text(input.orderId, "orderId", 80).toUpperCase();
    if (!/^HM-[0-9]{8}-[A-Z0-9]{5,20}$/.test(orderId)) fail("invalid-argument", "orderId is invalid.");
    const phone = text(input.phone, "phone", 40);
    if (normalizePhoneForMatch(phone).length < 7) fail("invalid-argument", "phone is invalid.");
    return { orderId, phone };
}

function cents(value, field) {
    const amount = Number(value);
    if (!Number.isFinite(amount) || amount <= 0) fail("failed-precondition", `${field} is invalid.`);
    return Math.round(amount * 100);
}

function displayMoney(value) {
    return `$${(value / 100).toFixed(2)}`;
}

function medicinePrice(medicine) {
    if (medicine.newPriceValue !== undefined) return cents(medicine.newPriceValue, "Medicine price");
    const match = String(medicine.newPrice ?? "").match(/[0-9]+(?:\.[0-9]+)?/);
    return cents(match ? match[0] : Number.NaN, "Medicine price");
}

function slugify(value) {
    return String(value || "")
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 80) || "product";
}

function productPath({ id, title }) {
    const idPart = String(id || "")
        .toLowerCase()
        .replace(/[^a-z0-9_-]+/g, "-")
        .replace(/^-+|-+$/g, "");
    if (!idPart) fail("invalid-argument", "Medicine id is required.");
    return `./product/${slugify(title)}-${idPart}/`;
}

function priceFrom(source, fallback, field) {
    if (source?.newPriceValue !== undefined && source.newPriceValue !== null && source.newPriceValue !== "") {
        const value = Number(source.newPriceValue);
        if (Number.isFinite(value) && value > 0) return cents(value, field);
    }
    const match = String(source?.newPrice ?? "").match(/[0-9]+(?:\.[0-9]+)?/);
    return match ? cents(match[0], field) : fallback;
}

function normalizedVariant(value, index) {
    if (typeof value === "string") {
        return {
            index,
            raw: { name: value },
            name: value.trim(),
            sku: "",
            available: true,
            inventory: 0,
            oldPrice: "",
            newPrice: "",
            oldPriceValue: 0,
            newPriceValue: 0,
            imageUrl: ""
        };
    }
    const raw = value && typeof value === "object" && !Array.isArray(value) ? value : {};
    const name = String(raw.name ?? raw.title ?? raw.size ?? raw.label ?? "").trim();
    return {
        index,
        raw,
        name,
        sku: String(raw.sku ?? "").trim(),
        available: raw.available !== false,
        inventory: Number(raw.inventory ?? 0),
        oldPrice: String(raw.oldPrice ?? ""),
        newPrice: String(raw.newPrice ?? ""),
        oldPriceValue: Number(raw.oldPriceValue ?? 0),
        newPriceValue: Number(raw.newPriceValue ?? 0),
        imageUrl: String(raw.imageUrl ?? "")
    };
}

function normalizedVariants(medicine) {
    return Array.isArray(medicine.variants)
        ? medicine.variants.map(normalizedVariant)
        : [];
}

function resolveVariant(item, variants) {
    if (!variants.length) return null;
    const requested = item.variant.trim();
    if (!requested && variants.length === 1 && variants[0].name === "Standard" && !variants[0].sku) {
        return variants[0];
    }
    if (!requested) fail("failed-precondition", "Select an available option.");
    const exact = variants.find((variant) => variant.sku === requested || variant.name === requested);
    if (exact) return exact;
    const requestedKey = requested.toLowerCase();
    const loose = variants.find((variant) => variant.sku.toLowerCase() === requestedKey || variant.name.toLowerCase() === requestedKey);
    if (loose) return loose;
    fail("failed-precondition", "Selected option is unavailable.");
}

function normalizedDiscount(discount, requestedCode, subtotal) {
    if (!requestedCode) return null;
    if (!discount || discount.active === false) fail("failed-precondition", "Discount is unavailable.");
    const type = String(discount.type ?? discount.discountType ?? "fixed").toLowerCase();
    const value = Number(discount.value ?? discount.amount ?? discount.percent ?? 0);
    if (!Number.isFinite(value) || value < 0) fail("failed-precondition", "Discount value is invalid.");
    return {
        code: requestedCode,
        type,
        value,
        freeShipping: discount.freeShipping === true || type === "free_shipping" || type === "freeshipping"
    };
}

export function priceCheckout({ checkout, medicines, discount, deliveryConfig = null }) {
    const medicineStates = new Map();
    const pricedInputs = [];

    for (const item of checkout.items) {
        const medicine = medicines.get(item.medicineId);
        if (!medicine || medicine.available === false) fail("failed-precondition", "A medicine is unavailable.");
        let state = medicineStates.get(item.medicineId);
        if (!state) {
            state = {
                medicine,
                variants: normalizedVariants(medicine),
                quantities: new Map()
            };
            medicineStates.set(item.medicineId, state);
        }
        const variant = resolveVariant(item, state.variants);
        const inventoryKey = variant ? `variant:${variant.index}` : "base";
        state.quantities.set(inventoryKey, (state.quantities.get(inventoryKey) ?? 0) + item.quantity);
        pricedInputs.push({ item, medicine, variant });
    }

    const inventoryUpdates = [];
    for (const [medicineId, state] of medicineStates) {
        const totalQuantity = [...state.quantities.values()].reduce((sum, quantity) => sum + quantity, 0);
        if (state.variants.length) {
            const nextVariants = state.variants.map((variant) => ({ ...variant.raw }));
            for (const [key, quantity] of state.quantities) {
                const variantIndex = Number(key.slice("variant:".length));
                const variant = state.variants.find((candidate) => candidate.index === variantIndex);
                if (!variant || variant.available === false) fail("failed-precondition", "Selected option is unavailable.");
                if (!Number.isInteger(variant.inventory) || variant.inventory < quantity) {
                    fail("failed-precondition", "Insufficient inventory.");
                }
                const remaining = variant.inventory - quantity;
                nextVariants[variantIndex] = {
                    ...nextVariants[variantIndex],
                    inventory: remaining,
                    available: remaining > 0
                };
            }
            const remaining = nextVariants.reduce((sum, variant) => sum + Math.max(0, Number(variant.inventory || 0)), 0);
            inventoryUpdates.push({
                medicineId,
                quantity: totalQuantity,
                remaining,
                available: remaining > 0,
                variants: nextVariants
            });
        } else {
            const inventory = Number(state.medicine.inventory);
            if (!Number.isInteger(inventory) || inventory < totalQuantity) fail("failed-precondition", "Insufficient inventory.");
            const remaining = inventory - totalQuantity;
            inventoryUpdates.push({
                medicineId,
                quantity: totalQuantity,
                remaining,
                available: remaining > 0
            });
        }
    }

    const items = pricedInputs.map(({ item, medicine, variant }) => {
        const basePriceCents = medicinePrice(medicine);
        const priceCents = variant ? priceFrom(variant, basePriceCents, "Variant price") : basePriceCents;
        const title = text(medicine.title, "Medicine title", 200);
        const variantName = variant?.name || item.variant;
        return {
            id: item.id,
            productId: item.medicineId,
            variantKey: item.variant,
            variantSku: variant?.sku || "",
            variantName: variantName || "",
            title: variantName ? `${title} - ${variantName}` : title,
            brand: String(medicine.brand ?? "").trim(),
            imageUrl: String(variant?.imageUrl || medicine.imageUrl || "").trim(),
            oldPrice: String(variant?.oldPrice || medicine.oldPrice || (medicine.oldPriceValue ? `$${Number(medicine.oldPriceValue).toFixed(2)}` : "")),
            newPrice: String(variant?.newPrice || medicine.newPrice || displayMoney(priceCents)),
            price: priceCents / 100,
            url: productPath({ id: item.medicineId, title }),
            quantity: item.quantity
        };
    });
    const subtotal = items.reduce((sum, item) => sum + Math.round(item.price * 100) * item.quantity, 0);
    const config = resolveDeliveryConfig(deliveryConfig);
    const appliedDiscount = normalizedDiscount(discount, checkout.discountCode, subtotal);
    let delivery = subtotal >= config.freeShippingCents || appliedDiscount?.freeShipping
        ? 0
        : (config.costs.get(checkout.deliveryArea) ?? 0);
    let discountAmount = 0;
    if (appliedDiscount?.type === "percent" || appliedDiscount?.type === "percentage") {
        discountAmount = Math.min(subtotal, Math.round(subtotal * appliedDiscount.value / 100));
    } else if (appliedDiscount && !appliedDiscount.freeShipping) {
        discountAmount = Math.min(subtotal, Math.round(appliedDiscount.value * 100));
    }
    delivery = Number(delivery);
    return {
        items,
        inventoryUpdates,
        discount: appliedDiscount,
        moneyCents: {
            subtotal,
            discountAmount,
            delivery,
            total: Math.max(0, subtotal + delivery - discountAmount)
        }
    };
}

function canonical(value) {
    if (Array.isArray(value)) return value.map(canonical);
    if (value && typeof value === "object") {
        return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
    }
    return value;
}

export function fingerprintCheckout(userId, checkout) {
    return createHash("sha256").update(JSON.stringify(canonical({ userId, checkout }))).digest("hex");
}

export function getDeliveryAreaDetails(value, deliveryConfig = null) {
    const config = resolveDeliveryConfig(deliveryConfig);
    const key = String(value || "").toLowerCase();
    if (!config.costs.has(key)) fail("invalid-argument", "Unknown delivery area.");
    return { value: key, label: config.labels.get(key) || key, cost: (config.costs.get(key) ?? 0) / 100 };
}

export function parseStatusUpdate(value) {
    const input = record(value, "status update");
    const orderId = text(input.orderId, "orderId", 80);
    const status = text(input.status, "status", 80);
    if (!/^HM-[0-9]{8}-[A-Z0-9]{5,20}$/.test(orderId)) fail("invalid-argument", "orderId is invalid.");
    if (!ALLOWED_STATUSES.has(status)) fail("invalid-argument", "Unknown order status.");
    return { orderId, status };
}
