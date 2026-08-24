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

export class CheckoutError extends Error {
    constructor(code, message) {
        super(message);
        this.name = "CheckoutError";
        this.code = code;
    }
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

export function parseCheckoutInput(value) {
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
    if (!DELIVERY_COSTS.has(deliveryArea)) fail("invalid-argument", "Unknown delivery area.");
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

function normalizedDiscount(discount, requestedCode, subtotal) {
    if (!requestedCode) return null;
    if (!discount || discount.active === false) fail("failed-precondition", "Discount is unavailable.");
    const minimum = Number(discount.minSubtotal ?? discount.minimumSubtotal ?? 0);
    if (!Number.isFinite(minimum) || subtotal < Math.round(minimum * 100)) {
        fail("failed-precondition", "Discount minimum subtotal is not met.");
    }
    const type = String(discount.type ?? discount.discountType ?? "fixed").toLowerCase();
    const value = Number(discount.value ?? discount.amount ?? discount.percent ?? 0);
    if (!Number.isFinite(value) || value < 0) fail("failed-precondition", "Discount value is invalid.");
    return {
        code: requestedCode,
        type,
        value,
        minSubtotal: minimum,
        freeShipping: discount.freeShipping === true || type === "free_shipping" || type === "freeshipping"
    };
}

export function priceCheckout({ checkout, medicines, discount }) {
    const quantities = new Map();
    for (const item of checkout.items) {
        quantities.set(item.medicineId, (quantities.get(item.medicineId) ?? 0) + item.quantity);
    }
    const inventoryUpdates = [];
    for (const [medicineId, quantity] of quantities) {
        const medicine = medicines.get(medicineId);
        if (!medicine || medicine.available === false) fail("failed-precondition", "A medicine is unavailable.");
        const inventory = Number(medicine.inventory);
        if (!Number.isInteger(inventory) || inventory < quantity) fail("failed-precondition", "Insufficient inventory.");
        inventoryUpdates.push({ medicineId, quantity, remaining: inventory - quantity });
    }
    const items = checkout.items.map((item) => {
        const medicine = medicines.get(item.medicineId);
        const priceCents = medicinePrice(medicine);
        const title = text(medicine.title, "Medicine title", 200);
        return {
            id: item.id,
            title: item.variant ? `${title} - ${item.variant}` : title,
            brand: String(medicine.brand ?? "").trim(),
            imageUrl: String(medicine.imageUrl ?? "").trim(),
            oldPrice: String(medicine.oldPrice ?? (medicine.oldPriceValue ? `$${Number(medicine.oldPriceValue).toFixed(2)}` : "")),
            newPrice: String(medicine.newPrice ?? displayMoney(priceCents)),
            price: priceCents / 100,
            url: `./productdetail.html?id=${encodeURIComponent(item.medicineId)}`,
            quantity: item.quantity
        };
    });
    const subtotal = items.reduce((sum, item) => sum + Math.round(item.price * 100) * item.quantity, 0);
    const appliedDiscount = normalizedDiscount(discount, checkout.discountCode, subtotal);
    let delivery = subtotal >= FREE_SHIPPING_CENTS || appliedDiscount?.freeShipping ? 0 : DELIVERY_COSTS.get(checkout.deliveryArea);
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

export function getDeliveryAreaDetails(value) {
    if (!DELIVERY_COSTS.has(value)) fail("invalid-argument", "Unknown delivery area.");
    return { value, label: DELIVERY_LABELS.get(value), cost: DELIVERY_COSTS.get(value) / 100 };
}

export function parseStatusUpdate(value) {
    const input = record(value, "status update");
    const orderId = text(input.orderId, "orderId", 80);
    const status = text(input.status, "status", 80);
    if (!/^HM-[0-9]{8}-[A-Z0-9]{5,20}$/.test(orderId)) fail("invalid-argument", "orderId is invalid.");
    if (!ALLOWED_STATUSES.has(status)) fail("invalid-argument", "Unknown order status.");
    return { orderId, status };
}
