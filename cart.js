(function () {
    "use strict";

    var STORAGE_KEY = "heliomedCart";
    var DISCOUNT_KEY = "heliomedDiscount";
    var DELIVERY_KEY = "heliomedDeliveryArea";
    var FREE_SHIPPING_THRESHOLD = 75;
    var DELIVERY_AREAS = [
        { value: "akkar", label: "Akkar - عكار", cost: 5 },
        { value: "aley", label: "Aley - عاليه", cost: 4 },
        { value: "baabda", label: "Baabda - بعبدا", cost: 4 },
        { value: "baalbek", label: "Baalbek - بعلبك", cost: 6 },
        { value: "batroun", label: "Batroun - البترون", cost: 5 },
        { value: "beirut", label: "Beirut - بيروت", cost: 3 },
        { value: "bint-jbeil", label: "Bint Jbeil - بنت جبيل", cost: 6 },
        { value: "bsharri", label: "Bsharri - بشري", cost: 5 },
        { value: "byblos", label: "Byblos - جبيل", cost: 5 },
        { value: "chouf", label: "Chouf - الشوف", cost: 4 },
        { value: "danniyeh", label: "Danniyeh - الضنية", cost: 6 },
        { value: "hasbaya", label: "Hasbaya - حاصبيا", cost: 6 },
        { value: "hermel", label: "Hermel - الهرمل", cost: 6 },
        { value: "jezzine", label: "Jezzine - جزين", cost: 5 },
        { value: "keserwan", label: "Keserwan - كسروان", cost: 4 },
        { value: "koura", label: "Koura - الكورة", cost: 5 },
        { value: "marjeyoun", label: "Marjeyoun - مرجعيون", cost: 6 },
        { value: "matn", label: "Matn - المتن", cost: 4 },
        { value: "nabatieh", label: "Nabatieh - النبطية", cost: 5 },
        { value: "rashaya", label: "Rashaya - راشيا", cost: 6 },
        { value: "sidon", label: "Sidon - صيدا", cost: 4 },
        { value: "tripoli", label: "Tripoli - طرابلس", cost: 5 },
        { value: "tyre", label: "Tyre - صور", cost: 5 },
        { value: "western-bekaa", label: "Western Bekaa - البقاع الغربي", cost: 6 },
        { value: "zahleh", label: "Zahle - زحلة", cost: 5 },
        { value: "zgharta", label: "Zgharta - زغرتا", cost: 5 }
    ];

    function parseMoney(value) {
        var match = String(value || "").match(/[0-9]+(?:\.[0-9]+)?/);
        var amount = match ? Number(match[0]) : 0;
        return Number.isFinite(amount) ? amount : 0;
    }

    function formatMoney(value) {
        return "$" + Number(value || 0).toFixed(2);
    }

    function slug(value) {
        return String(value || "product")
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "")
            .slice(0, 80) || "product";
    }

    function readCart() {
        try {
            var parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
            return Array.isArray(parsed) ? parsed : [];
        } catch (error) {
            return [];
        }
    }

    function writeCart(items) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
        updateCounters();
        window.dispatchEvent(new CustomEvent("heliomed-cart-change", { detail: { items: items } }));
    }

    function normalizeItem(item) {
        var title = String(item.title || "Product").trim();
        var newPrice = item.newPrice || item.priceLabel || "";
        var price = Number(item.price ?? item.newPriceValue ?? parseMoney(newPrice));
        return {
            id: String(item.id || slug(title)),
            title: title,
            brand: String(item.brand || "").trim(),
            imageUrl: String(item.imageUrl || "").trim(),
            oldPrice: String(item.oldPrice || "").trim(),
            newPrice: String(newPrice || formatMoney(price)).trim(),
            price: Number.isFinite(price) ? price : 0,
            url: String(item.url || "").trim(),
            quantity: Math.max(1, Number(item.quantity || 1))
        };
    }

    function addItem(item, quantity) {
        var normalized = normalizeItem(item);
        var addQuantity = Math.max(1, Number(quantity || normalized.quantity || 1));
        var items = readCart();
        var existing = items.find(function (cartItem) { return cartItem.id === normalized.id; });
        if (existing) {
            existing.quantity = Math.max(1, Number(existing.quantity || 0) + addQuantity);
            existing.title = normalized.title;
            existing.brand = normalized.brand;
            existing.imageUrl = normalized.imageUrl;
            existing.oldPrice = normalized.oldPrice;
            existing.newPrice = normalized.newPrice;
            existing.price = normalized.price;
            existing.url = normalized.url || existing.url;
        } else {
            normalized.quantity = addQuantity;
            items.push(normalized);
        }
        writeCart(items);
        return readCart();
    }

    function updateQuantity(id, quantity) {
        var nextQuantity = Number(quantity);
        var items = readCart();
        if (!Number.isFinite(nextQuantity) || nextQuantity < 1) {
            items = items.filter(function (item) { return item.id !== id; });
        } else {
            items = items.map(function (item) {
                if (item.id === id) item.quantity = Math.floor(nextQuantity);
                return item;
            });
        }
        writeCart(items);
        return items;
    }

    function removeItem(id) {
        var items = readCart().filter(function (item) { return item.id !== id; });
        writeCart(items);
        return items;
    }

    function clearCart() {
        writeCart([]);
    }

    function readDiscount() {
        try {
            return JSON.parse(localStorage.getItem(DISCOUNT_KEY) || "null");
        } catch (error) {
            return null;
        }
    }

    function setDiscount(discount) {
        if (!discount) {
            localStorage.removeItem(DISCOUNT_KEY);
        } else {
            localStorage.setItem(DISCOUNT_KEY, JSON.stringify(discount));
        }
        window.dispatchEvent(new CustomEvent("heliomed-cart-change", { detail: { items: readCart() } }));
    }

    function clearDiscount() {
        setDiscount(null);
    }

    function getDeliveryAreas() {
        return DELIVERY_AREAS.slice();
    }

    function getDeliveryArea() {
        var stored = localStorage.getItem(DELIVERY_KEY) || "beirut";
        return DELIVERY_AREAS.find(function (area) { return area.value === stored; }) || DELIVERY_AREAS[0];
    }

    function setDeliveryArea(value) {
        var area = DELIVERY_AREAS.find(function (item) { return item.value === value; }) || DELIVERY_AREAS[0];
        localStorage.setItem(DELIVERY_KEY, area.value);
        window.dispatchEvent(new CustomEvent("heliomed-cart-change", { detail: { items: readCart() } }));
        return area;
    }

    function getCount() {
        return readCart().reduce(function (total, item) {
            return total + Math.max(0, Number(item.quantity || 0));
        }, 0);
    }

    function getSubtotal() {
        return readCart().reduce(function (total, item) {
            return total + (Number(item.price || 0) * Math.max(0, Number(item.quantity || 0)));
        }, 0);
    }

    function getDiscountAmount(subtotal, deliveryCost) {
        var discount = readDiscount();
        if (!discount) return 0;
        var minSubtotal = Number(discount.minSubtotal || discount.minimumSubtotal || 0);
        if (subtotal < minSubtotal) return 0;
        var type = String(discount.type || discount.discountType || "").toLowerCase();
        var value = Number(discount.value ?? discount.amount ?? discount.percent ?? 0);
        if (type === "percent" || type === "percentage") return Math.min(subtotal, subtotal * (value / 100));
        if (type === "fixed" || type === "amount") return Math.min(subtotal, value);
        if (type === "free_shipping" || type === "freeshipping") return Math.min(deliveryCost, deliveryCost);
        return Math.min(subtotal, value);
    }

    function getSummary() {
        var subtotal = getSubtotal();
        var area = getDeliveryArea();
        var discount = readDiscount();
        var deliveryCost = subtotal >= FREE_SHIPPING_THRESHOLD || (discount && discount.freeShipping === true) ? 0 : Number(area.cost || 0);
        var discountAmount = getDiscountAmount(subtotal, deliveryCost);
        var total = Math.max(0, subtotal + deliveryCost - discountAmount);
        return {
            subtotal: subtotal,
            deliveryArea: area,
            delivery: deliveryCost,
            discount: discount,
            discountAmount: discountAmount,
            total: total,
            freeShippingThreshold: FREE_SHIPPING_THRESHOLD,
            freeShippingRemaining: Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal)
        };
    }

    function updateCounters() {
        var count = getCount();
        document.querySelectorAll(".cart-count").forEach(function (counter) {
            counter.textContent = count;
        });
    }

    function itemFromCard(card) {
        var title = card.querySelector(".cc-pc-title")?.textContent.trim() || "Product";
        var brand = title.includes(" - ") ? title.split(" - ")[0].trim() : title.split(/\s+/)[0];
        var image = card.querySelector(".cc-pc-img-wrapper img");
        var oldPrice = card.querySelector(".cc-pc-price .old")?.textContent.trim() || "";
        var newPrice = card.querySelector(".cc-pc-price .new")?.textContent.trim() || "";
        return normalizeItem({
            id: card.dataset.productId || slug(title),
            title: title,
            brand: brand,
            imageUrl: image ? image.src : "",
            oldPrice: oldPrice,
            newPrice: newPrice,
            url: card.dataset.productUrl || ""
        });
    }

    window.HeliomedCart = {
        addItem: addItem,
        clearCart: clearCart,
        clearDiscount: clearDiscount,
        formatMoney: formatMoney,
        getCount: getCount,
        getDeliveryArea: getDeliveryArea,
        getDeliveryAreas: getDeliveryAreas,
        getDiscount: readDiscount,
        getItems: readCart,
        getSummary: getSummary,
        getSubtotal: getSubtotal,
        itemFromCard: itemFromCard,
        parseMoney: parseMoney,
        removeItem: removeItem,
        setDeliveryArea: setDeliveryArea,
        setDiscount: setDiscount,
        slug: slug,
        updateCounters: updateCounters,
        updateQuantity: updateQuantity
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", updateCounters);
    } else {
        updateCounters();
    }
    window.addEventListener("storage", function (event) {
        if (event.key === STORAGE_KEY) updateCounters();
    });
})();
