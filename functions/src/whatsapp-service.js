const DEFAULT_API_URL = "https://api.green-api.com";
const DEFAULT_SITE_URL = "https://heliomed-lb.com";

/**
 * Normalizes a phone number to standard international format (e.g. +96170123456).
 * Handles Lebanese local formats (03xxxxxx, 70xxxxxx) and international prefixes (00, +).
 */
export function normalizeWhatsAppPhone(phone, defaultCountryCode = "961") {
    if (!phone || typeof phone !== "string") return "";
    let cleaned = phone.replace(/[^\d+]/g, "").trim();
    if (!cleaned) return "";

    if (cleaned.startsWith("00")) {
        cleaned = "+" + cleaned.slice(2);
    }
    if (cleaned.startsWith("+")) {
        return cleaned.length > 5 ? cleaned : "";
    }
    if (cleaned.startsWith(defaultCountryCode) && cleaned.length >= defaultCountryCode.length + 7) {
        return "+" + cleaned;
    }
    if (cleaned.startsWith("0") && cleaned.length >= 7 && cleaned.length <= 9) {
        return `+${defaultCountryCode}${cleaned.slice(1)}`;
    }
    if (cleaned.length >= 7 && cleaned.length <= 8) {
        return `+${defaultCountryCode}${cleaned}`;
    }
    return cleaned.length >= 8 ? `+${cleaned}` : "";
}

export function toGreenApiChatId(phone) {
    const normalizedPhone = normalizeWhatsAppPhone(phone);
    return normalizedPhone ? `${normalizedPhone.slice(1)}@c.us` : "";
}

export function interpolateTemplate(template, vars) {
    if (!template || typeof template !== "string") return "";
    return template.replace(/\{([a-zA-Z0-9_-]+)\}/g, (match, key) => {
        return vars[key] !== undefined ? String(vars[key]) : match;
    });
}

/**
 * Builds the Arabic order confirmation message with full order details.
 */
export function buildOrderConfirmationMessage(order, options = {}) {
    const siteUrl = (options.siteUrl || DEFAULT_SITE_URL).replace(/\/+$/, "");
    const customerName = String(order?.customer?.name || "عزيزي العميل").trim();
    const orderId = String(order?.id || "").trim();
    const total = Number(order?.total ?? 0).toFixed(2);
    const payment = String(order?.payment || "Cash on Delivery").trim();
    const paymentText = payment === "Whish" ? "Whish Money" : "الدفع عند الاستلام (Cash on Delivery)";
    const area = String(order?.address?.areaLabel || order?.deliveryArea?.label || order?.address?.area || "").trim();

    const addressParts = [
        order?.address?.city,
        order?.address?.street,
        order?.address?.building ? `بناية ${order.address.building}` : "",
        order?.address?.floor ? `طابق ${order.address.floor}` : ""
    ].filter(Boolean);
    const addressText = addressParts.length ? addressParts.join("، ") : (area || "لبنان");

    const items = Array.isArray(order?.items) ? order.items : [];
    const itemsText = items.map((item) => {
        const title = String(item.title || item.name || "منتج").trim();
        const quantity = item.quantity || 1;
        const price = item.price != null ? `$${Number(item.price * quantity).toFixed(2)}` : "";
        return `• ${title} (x${quantity})${price ? ` - ${price}` : ""}`;
    }).join("\n");

    const trackingUrl = orderId ? `${siteUrl}/track-order.html?order=${encodeURIComponent(orderId)}` : `${siteUrl}/track-order.html`;

    if (options.template && typeof options.template === "string" && options.template.trim()) {
        return interpolateTemplate(options.template, {
            customerName,
            orderId,
            total,
            payment: paymentText,
            area: area || "لبنان",
            address: addressText,
            items: itemsText,
            trackingUrl,
            siteUrl
        });
    }

    const lines = [
        `مرحباً ${customerName} 👋`,
        `شكراً لطلبك من Helio Med! 🩺`,
        ``,
        `تم استلام طلبك بنجاح وهو قيد التجهيز:`,
        `📦 رقم الطلب: ${orderId}`,
        `💰 المجموع: $${total} (${paymentText})`,
        `📍 منطقة التوصيل: ${area || "لبنان"}`,
        `🏢 العنوان: ${addressText}`,
        ``
    ];

    if (itemsText) {
        lines.push(`🛒 تفاصيل الطلب:`, itemsText, ``);
    }

    lines.push(
        `🔗 تتبع حالة طلبك عبر الرابط:`,
        `${trackingUrl}`,
        ``,
        `📍 يمكنك الرد على هذه الرسالة بموقعك الجغرافي (Location Pin) لتسهيل وتنسيق التوصيل.`
    );

    return lines.join("\n");
}

export function buildAdminOrderNotificationMessage(order, options = {}) {
    const siteUrl = (options.siteUrl || DEFAULT_SITE_URL).replace(/\/+$/, "");
    const customerName = String(order?.customer?.name || "عميل (Customer)").trim();
    const customerPhone = String(order?.customer?.phone || "غير محدد (N/A)").trim();
    const customerEmail = String(order?.customer?.email || "").trim();
    const orderId = String(order?.id || "").trim();
    const total = Number(order?.total ?? 0).toFixed(2);
    const subtotal = Number(order?.subtotal ?? 0).toFixed(2);
    const delivery = Number(order?.delivery ?? 0).toFixed(2);
    const discountAmount = Number(order?.discountAmount ?? 0).toFixed(2);
    const payment = String(order?.payment || "Cash on Delivery").trim();
    const paymentText = payment === "Whish" ? "Whish Money" : "الدفع عند الاستلام (Cash on Delivery)";
    const area = String(order?.address?.areaLabel || order?.deliveryArea?.label || order?.address?.area || "").trim();

    const addressParts = [
        order?.address?.city,
        order?.address?.street,
        order?.address?.building ? `بناية ${order.address.building}` : "",
        order?.address?.floor ? `طابق ${order.address.floor}` : ""
    ].filter(Boolean);
    const addressText = addressParts.length ? addressParts.join("، ") : (area || "لبنان");

    const items = Array.isArray(order?.items) ? order.items : [];
    const itemsText = items.map((item) => {
        const title = String(item.title || item.name || "منتج").trim();
        const quantity = item.quantity || 1;
        const price = item.price != null ? `$${Number(item.price * quantity).toFixed(2)}` : "";
        return `• ${title} (x${quantity})${price ? ` - ${price}` : ""}`;
    }).join("\n");

    const trackingUrl = orderId ? `${siteUrl}/track-order.html?order=${encodeURIComponent(orderId)}` : `${siteUrl}/track-order.html`;
    const adminOrderUrl = `${siteUrl}/admin.html`;
    const notes = String(order?.address?.notes || order?.customer?.notes || "").trim();

    if (options.template && typeof options.template === "string" && options.template.trim()) {
        return interpolateTemplate(options.template, {
            customerName,
            customerPhone,
            customerEmail,
            orderId,
            total,
            subtotal,
            delivery,
            discountAmount,
            payment: paymentText,
            area: area || "لبنان",
            address: addressText,
            items: itemsText,
            notes,
            trackingUrl,
            adminOrderUrl,
            siteUrl
        });
    }

    const lines = [
        `🚨 *طلب جديد! New Order Received*`,
        ``,
        `📦 رقم الطلب: *${orderId}*`,
        `👤 الزبون: *${customerName}*`,
        `📞 الهاتف: *${customerPhone}*`,
        `💰 المجموع: *$${total}* (${paymentText})`,
        `📍 منطقة التوصيل: ${area || "لبنان"}`,
        `🏢 العنوان: ${addressText}`
    ];

    if (notes) {
        lines.push(`📝 ملاحظات: ${notes}`);
    }

    if (itemsText) {
        lines.push(``, `🛒 *المنتجات المطلوبة:*`, itemsText);
    }

    lines.push(``, `🔗 تتبع الطلب: ${trackingUrl}`);

    return lines.join("\n");
}

/**
 * Sends a WhatsApp message via the Green API REST API.
 */
export async function sendGreenApiMessage({
    idInstance,
    apiTokenInstance,
    apiUrl = DEFAULT_API_URL,
    chatId,
    message,
    fetchImpl = fetch
}) {
    if (!idInstance || !String(idInstance).trim()) {
        throw new Error("Missing Green API instance ID.");
    }
    if (!apiTokenInstance || typeof apiTokenInstance !== "string") {
        throw new Error("Missing Green API instance token.");
    }
    if (!chatId || typeof chatId !== "string") {
        throw new Error("Missing Green API chat ID.");
    }
    if (!message || typeof message !== "string") {
        throw new Error("Missing message body.");
    }

    const endpoint = `${apiUrl.replace(/\/+$/, "")}/waInstance${encodeURIComponent(String(idInstance).trim())}/sendMessage/${encodeURIComponent(apiTokenInstance)}`;
    let response;
    try {
        response = await fetchImpl(endpoint, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ chatId, message })
        });
    } catch {
        throw new Error("Green API request failed.");
    }

    const data = await response.json().catch(() => null);

    if (!response.ok) {
        const errorMessage = data?.message || data?.error || data?.errorText || `HTTP ${response.status} ${response.statusText}`;
        throw new Error(`Green API error: ${errorMessage}`);
    }
    if (!data?.idMessage) {
        throw new Error("Green API response did not include a message ID.");
    }

    return {
        success: true,
        data
    };
}

/**
 * Orchestrates sending the order confirmation WhatsApp message for a newly created order.
 */
export async function sendOrderConfirmationWhatsApp({
    order,
    template,
    enabled = true,
    idInstance = process.env.GREEN_API_ID_INSTANCE,
    apiTokenInstance = process.env.GREEN_API_TOKEN_INSTANCE,
    apiUrl = process.env.GREEN_API_URL || DEFAULT_API_URL,
    siteUrl = process.env.SITE_URL || DEFAULT_SITE_URL,
    fetchImpl = fetch,
    logger = console
} = {}) {
    if (enabled === false) {
        logger.info?.("sendOrderConfirmationWhatsApp: WhatsApp confirmation disabled in settings.");
        return { sent: false, reason: "disabled" };
    }
    if (!order) {
        logger.warn?.("sendOrderConfirmationWhatsApp: No order provided.");
        return { sent: false, reason: "missing-order" };
    }

    const rawPhone = order?.customer?.phone || "";
    const recipientPhone = normalizeWhatsAppPhone(rawPhone);

    if (!recipientPhone) {
        logger.warn?.(`sendOrderConfirmationWhatsApp: Invalid or missing phone number for order ${order.id}: "${rawPhone}"`);
        return { sent: false, reason: "invalid-phone" };
    }

    const message = buildOrderConfirmationMessage(order, { siteUrl, template });
    const chatId = toGreenApiChatId(recipientPhone);

    try {
        const result = await sendGreenApiMessage({
            idInstance,
            apiTokenInstance,
            apiUrl,
            chatId,
            message,
            fetchImpl
        });

        logger.info?.(`WhatsApp confirmation sent via Green API for order ${order.id} to ${recipientPhone}`);
        return { sent: true, recipient: recipientPhone, chatId, result };
    } catch (error) {
        logger.error?.(`Failed to send WhatsApp confirmation via Green API for order ${order.id} to ${recipientPhone}:`, error);
        return { sent: false, error: error.message };
    }
}

export async function sendAdminOrderNotificationWhatsApp({
    order,
    adminPhone,
    adminPhoneSecondary,
    adminPhones,
    template,
    enabled = true,
    idInstance = process.env.GREEN_API_ID_INSTANCE,
    apiTokenInstance = process.env.GREEN_API_TOKEN_INSTANCE,
    apiUrl = process.env.GREEN_API_URL || DEFAULT_API_URL,
    siteUrl = process.env.SITE_URL || DEFAULT_SITE_URL,
    fetchImpl = fetch,
    logger = console
} = {}) {
    if (enabled === false) {
        logger.info?.("sendAdminOrderNotificationWhatsApp: Admin WhatsApp alert disabled in settings.");
        return { sent: false, reason: "disabled" };
    }
    if (!order) {
        logger.warn?.("sendAdminOrderNotificationWhatsApp: No order provided.");
        return { sent: false, reason: "missing-order" };
    }

    const rawCandidates = [];
    if (Array.isArray(adminPhones)) {
        rawCandidates.push(...adminPhones);
    } else if (typeof adminPhones === "string" && adminPhones.trim()) {
        rawCandidates.push(adminPhones);
    }
    if (adminPhone) rawCandidates.push(adminPhone);
    if (adminPhoneSecondary) rawCandidates.push(adminPhoneSecondary);

    const individualPhones = [];
    for (const candidate of rawCandidates) {
        if (typeof candidate === "string") {
            const split = candidate.split(/[,;\n\r]+/);
            for (const s of split) {
                const trimmed = s.trim();
                if (trimmed) individualPhones.push(trimmed);
            }
        }
    }

    const validRecipients = [];
    const seen = new Set();
    for (const raw of individualPhones) {
        const normalized = normalizeWhatsAppPhone(raw);
        if (normalized && !seen.has(normalized)) {
            seen.add(normalized);
            validRecipients.push(normalized);
        }
    }

    if (validRecipients.length === 0) {
        logger.warn?.(`sendAdminOrderNotificationWhatsApp: Invalid or missing admin phone number(s): "${individualPhones.join(", ")}"`);
        return { sent: false, reason: "invalid-phone" };
    }

    const message = buildAdminOrderNotificationMessage(order, { siteUrl, template });

    const dispatchPromises = validRecipients.map(async (recipientPhone) => {
        const chatId = toGreenApiChatId(recipientPhone);
        try {
            const result = await sendGreenApiMessage({
                idInstance,
                apiTokenInstance,
                apiUrl,
                chatId,
                message,
                fetchImpl
            });
            logger.info?.(`Admin WhatsApp alert sent via Green API for order ${order.id} to ${recipientPhone}`);
            return { sent: true, recipient: recipientPhone, chatId, result };
        } catch (error) {
            logger.error?.(`Failed to send Admin WhatsApp alert via Green API for order ${order.id} to ${recipientPhone}:`, error);
            return { sent: false, recipient: recipientPhone, error: error.message };
        }
    });

    const settled = await Promise.allSettled(dispatchPromises);
    const results = settled.map((s, idx) => {
        if (s.status === "fulfilled") return s.value;
        return { sent: false, recipient: validRecipients[idx], error: s.reason?.message || "Unknown error" };
    });

    const anySent = results.some((r) => r.sent === true);
    const primaryResult = results[0] || {};

    if (!anySent && results.length === 1 && results[0].error) {
        return {
            sent: false,
            recipient: primaryResult.recipient,
            error: primaryResult.error,
            results
        };
    }

    return {
        sent: anySent,
        recipient: primaryResult.recipient,
        chatId: primaryResult.chatId,
        results
    };
}

