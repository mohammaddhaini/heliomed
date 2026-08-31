import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
    buildOrderConfirmationMessage,
    normalizeWhatsAppPhone,
    sendGreenApiMessage,
    sendOrderConfirmationWhatsApp,
    toGreenApiChatId
} from "../src/whatsapp-service.js";

const sampleOrder = () => ({
    id: "HM-20260820-ABCDE",
    customer: {
        name: "Ahmad Khalil",
        phone: "+961 70 123 456",
        email: "ahmad@example.test"
    },
    total: 35.50,
    subtotal: 30.50,
    delivery: 5.00,
    discountAmount: 0,
    payment: "Cash on Delivery",
    deliveryArea: { id: "matn", label: "Matn - المتن" },
    address: {
        city: "Jal El Dib",
        street: "Main Street",
        building: "Al-Amir Building",
        floor: "2",
        areaLabel: "Matn - المتن"
    },
    items: [
        { title: "Panadol Extra", quantity: 2, price: 10.00 },
        { title: "Vitamin C 1000mg", quantity: 1, price: 10.50 }
    ]
});

describe("normalizeWhatsAppPhone", () => {
    it("normalizes standard Lebanese 8-digit numbers without prefix", () => {
        assert.equal(normalizeWhatsAppPhone("70123456"), "+96170123456");
        assert.equal(normalizeWhatsAppPhone("71 999 888"), "+96171999888");
        assert.equal(normalizeWhatsAppPhone("76-111-222"), "+96176111222");
    });

    it("normalizes Lebanese 7-digit / 8-digit numbers starting with 0", () => {
        assert.equal(normalizeWhatsAppPhone("03123456"), "+9613123456");
        assert.equal(normalizeWhatsAppPhone("03 123 456"), "+9613123456");
        assert.equal(normalizeWhatsAppPhone("070123456"), "+96170123456");
    });

    it("normalizes numbers already containing international prefixes", () => {
        assert.equal(normalizeWhatsAppPhone("+961 70 123 456"), "+96170123456");
        assert.equal(normalizeWhatsAppPhone("00961 70 123 456"), "+96170123456");
        assert.equal(normalizeWhatsAppPhone("96170123456"), "+96170123456");
    });

    it("normalizes international numbers outside Lebanon", () => {
        assert.equal(normalizeWhatsAppPhone("+1 (415) 555-2671"), "+14155552671");
        assert.equal(normalizeWhatsAppPhone("0044 7911 123456"), "+447911123456");
    });

    it("returns empty string for invalid inputs", () => {
        assert.equal(normalizeWhatsAppPhone(""), "");
        assert.equal(normalizeWhatsAppPhone(null), "");
        assert.equal(normalizeWhatsAppPhone("abc"), "");
        assert.equal(normalizeWhatsAppPhone("123"), "");
    });
});

describe("toGreenApiChatId", () => {
    it("converts a normalized phone number to a personal Green API chat ID", () => {
        assert.equal(toGreenApiChatId("+961 70 123 456"), "96170123456@c.us");
        assert.equal(toGreenApiChatId("invalid"), "");
    });
});

describe("buildOrderConfirmationMessage", () => {
    it("formats a comprehensive Arabic message with order details and tracking link", () => {
        const order = sampleOrder();
        const message = buildOrderConfirmationMessage(order, { siteUrl: "https://heliomed-lb.com" });

        assert.match(message, /مرحباً Ahmad Khalil/);
        assert.match(message, /Helio Med/);
        assert.match(message, /رقم الطلب: HM-20260820-ABCDE/);
        assert.match(message, /المجموع: \$35.50/);
        assert.match(message, /Cash on Delivery/);
        assert.match(message, /Matn - المتن/);
        assert.match(message, /Jal El Dib/);
        assert.match(message, /Panadol Extra \(x2\)/);
        assert.match(message, /https:\/\/heliomed-lb\.com\/track-order\.html\?order=HM-20260820-ABCDE/);
    });

    it("handles orders with Whish payment and minimal address fields", () => {
        const order = {
            id: "HM-9999",
            customer: { name: "Sarah" },
            total: 25,
            payment: "Whish",
            deliveryArea: { label: "Beirut - بيروت" }
        };
        const message = buildOrderConfirmationMessage(order);

        assert.match(message, /Whish Money/);
        assert.match(message, /Beirut - بيروت/);
        assert.match(message, /HM-9999/);
    });

    it("interpolates custom template with placeholders", () => {
        const order = sampleOrder();
        const customTemplate = "Order {orderId} confirmed for {customerName}! Total is ${total} to {area}. Track: {trackingUrl}";
        const message = buildOrderConfirmationMessage(order, { template: customTemplate, siteUrl: "https://heliomed-lb.com" });

        assert.equal(
            message,
            "Order HM-20260820-ABCDE confirmed for Ahmad Khalil! Total is $35.50 to Matn - المتن. Track: https://heliomed-lb.com/track-order.html?order=HM-20260820-ABCDE"
        );
    });
});

describe("sendGreenApiMessage", () => {
    it("posts a JSON payload to the Green API sendMessage endpoint", async () => {
        let capturedUrl = "";
        let capturedOptions = {};

        const mockFetch = async (url, options) => {
            capturedUrl = url;
            capturedOptions = options;
            return {
                ok: true,
                json: async () => ({ idMessage: "3EB0123456789" })
            };
        };

        const result = await sendGreenApiMessage({
            idInstance: "1101000001",
            apiTokenInstance: "test-token",
            chatId: "96170123456@c.us",
            message: "Hello test",
            fetchImpl: mockFetch
        });

        assert.equal(capturedUrl, "https://api.green-api.com/waInstance1101000001/sendMessage/test-token");
        assert.equal(capturedOptions.method, "POST");
        assert.equal(capturedOptions.headers["Content-Type"], "application/json");

        assert.deepEqual(JSON.parse(capturedOptions.body), {
            chatId: "96170123456@c.us",
            message: "Hello test"
        });
        assert.equal(result.success, true);
    });

    it("throws an error when Green API returns a non-OK status", async () => {
        const mockFetch = async () => ({
            ok: false,
            status: 400,
            statusText: "Bad Request",
            json: async () => ({ message: "Validation failed" })
        });

        await assert.rejects(
            sendGreenApiMessage({
                idInstance: "1101000001",
                apiTokenInstance: "test-token",
                chatId: "961000@c.us",
                message: "Hello",
                fetchImpl: mockFetch
            }),
            /Green API error: Validation failed/
        );
    });

    it("rejects a successful response without a Green API message ID", async () => {
        const mockFetch = async () => ({
            ok: true,
            json: async () => ({})
        });

        await assert.rejects(
            sendGreenApiMessage({
                idInstance: "1101000001",
                apiTokenInstance: "test-token",
                chatId: "96170123456@c.us",
                message: "Hello",
                fetchImpl: mockFetch
            }),
            /did not include a message ID/
        );
    });
});

describe("sendOrderConfirmationWhatsApp", () => {
    it("successfully sends order confirmation and logs success", async () => {
        let loggedInfo = "";
        const mockLogger = {
            info: (msg) => { loggedInfo = msg; },
            warn: () => {},
            error: () => {}
        };

        const mockFetch = async () => ({
            ok: true,
            json: async () => ({ idMessage: "3EB0123456789" })
        });

        const result = await sendOrderConfirmationWhatsApp({
            order: sampleOrder(),
            idInstance: "1101000001",
            apiTokenInstance: "test-token",
            fetchImpl: mockFetch,
            logger: mockLogger
        });

        assert.equal(result.sent, true);
        assert.equal(result.recipient, "+96170123456");
        assert.equal(result.chatId, "96170123456@c.us");
        assert.match(loggedInfo, /sent via Green API for order HM-20260820-ABCDE to \+96170123456/);
    });

    it("returns sent:false without throwing when phone number is invalid", async () => {
        let loggedWarn = "";
        const mockLogger = {
            info: () => {},
            warn: (msg) => { loggedWarn = msg; },
            error: () => {}
        };

        const order = sampleOrder();
        order.customer.phone = "invalid";

        const result = await sendOrderConfirmationWhatsApp({
            order,
            idInstance: "1101000001",
            apiTokenInstance: "test-token",
            logger: mockLogger
        });

        assert.equal(result.sent, false);
        assert.equal(result.reason, "invalid-phone");
        assert.match(loggedWarn, /Invalid or missing phone number/);
    });

    it("returns sent:false without throwing when API call fails", async () => {
        let loggedError = "";
        const mockLogger = {
            info: () => {},
            warn: () => {},
            error: (msg) => { loggedError = msg; }
        };

        const mockFetch = async () => ({
            ok: false,
            status: 500,
            statusText: "Internal Error",
            json: async () => ({ message: "Green API service unavailable" })
        });

        const result = await sendOrderConfirmationWhatsApp({
            order: sampleOrder(),
            idInstance: "1101000001",
            apiTokenInstance: "test-token",
            fetchImpl: mockFetch,
            logger: mockLogger
        });

        assert.equal(result.sent, false);
        assert.match(result.error, /Green API error/);
        assert.match(loggedError, /Failed to send WhatsApp confirmation via Green API/);
    });

    it("skips sending when enabled is false", async () => {
        let loggedInfo = "";
        const mockLogger = {
            info: (msg) => { loggedInfo = msg; },
            warn: () => {},
            error: () => {}
        };

        const result = await sendOrderConfirmationWhatsApp({
            order: sampleOrder(),
            enabled: false,
            logger: mockLogger
        });

        assert.equal(result.sent, false);
        assert.equal(result.reason, "disabled");
        assert.match(loggedInfo, /WhatsApp confirmation disabled/);
    });
});
