(function () {
    "use strict";

    var STORAGE_KEY = "heliomedCart";
    var DISCOUNT_KEY = "heliomedDiscount";
    var DELIVERY_KEY = "heliomedDeliveryArea";
    var DELIVERY_SETTINGS_KEY = "heliomedDeliverySettings";
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

    function t(key, params) {
        return window.HeliomedI18n && typeof window.HeliomedI18n.t === "function"
            ? window.HeliomedI18n.t(key, params)
            : key;
    }

    function escapeHtml(value) {
        return String(value ?? "").replace(/[&<>"']/g, function (char) {
            return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char];
        });
    }

    function escapeAttr(value) {
        return escapeHtml(value);
    }

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

    function addItem(item, quantity, options) {
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
        if (!options || options.openDrawer !== false) {
            openDrawer();
        }
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
        try {
            var raw = JSON.parse(localStorage.getItem(DELIVERY_SETTINGS_KEY) || "null");
            if (raw && Array.isArray(raw.areas) && raw.areas.length > 0) {
                var activeAreas = raw.areas.filter(function (item) { return item && item.active !== false; }).map(function (item) {
                    var fallbackLabel = String(item.label || item.name || item.value || "").trim();
                    var localizedLabel = window.HeliomedI18n && typeof window.HeliomedI18n.contentValue === "function"
                        ? window.HeliomedI18n.contentValue(item, "label", fallbackLabel)
                        : fallbackLabel;
                    return {
                        value: String(item.value || item.id || "").trim().toLowerCase(),
                        label: String(localizedLabel || fallbackLabel).trim(),
                        cost: Number(item.cost ?? item.price ?? 0)
                    };
                });
                if (activeAreas.length > 0) return activeAreas;
            }
        } catch (e) {}
        return DELIVERY_AREAS.slice();
    }

    function getFreeShippingThreshold() {
        try {
            var raw = JSON.parse(localStorage.getItem(DELIVERY_SETTINGS_KEY) || "null");
            if (raw && Number.isFinite(Number(raw.freeShippingThreshold))) {
                return Number(raw.freeShippingThreshold);
            }
        } catch (e) {}
        return FREE_SHIPPING_THRESHOLD;
    }

    function setDeliverySettings(settings) {
        if (!settings || typeof settings !== "object") {
            localStorage.removeItem(DELIVERY_SETTINGS_KEY);
        } else {
            localStorage.setItem(DELIVERY_SETTINGS_KEY, JSON.stringify(settings));
        }
        window.dispatchEvent(new CustomEvent("heliomed-delivery-change", { detail: { settings: settings } }));
        window.dispatchEvent(new CustomEvent("heliomed-cart-change", { detail: { items: readCart() } }));
    }

    function getDeliveryArea() {
        var areas = getDeliveryAreas();
        var stored = localStorage.getItem(DELIVERY_KEY) || "beirut";
        return areas.find(function (area) { return area.value === stored; }) || areas[0] || DELIVERY_AREAS[0];
    }

    function setDeliveryArea(value) {
        var areas = getDeliveryAreas();
        var area = areas.find(function (item) { return item.value === value; }) || areas[0] || DELIVERY_AREAS[0];
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
        var threshold = getFreeShippingThreshold();
        var deliveryCost = subtotal >= threshold || (discount && discount.freeShipping === true) ? 0 : Number(area.cost || 0);
        var discountAmount = getDiscountAmount(subtotal, deliveryCost);
        var total = Math.max(0, subtotal + deliveryCost - discountAmount);
        return {
            subtotal: subtotal,
            deliveryArea: area,
            delivery: deliveryCost,
            discount: discount,
            discountAmount: discountAmount,
            total: total,
            freeShippingThreshold: threshold,
            freeShippingRemaining: Math.max(0, threshold - subtotal)
        };
    }

    function updateCounters() {
        var count = getCount();
        document.querySelectorAll(".cart-count").forEach(function (counter) {
            counter.textContent = count;
        });
        var drawer = document.getElementById("cart-drawer");
        if (drawer && drawer.classList.contains("is-open")) {
            renderCartDrawer();
        }
    }

    function initCartDrawer() {
        var drawer = document.getElementById("cart-drawer");
        if (drawer) return drawer;

        drawer = document.createElement("div");
        drawer.id = "cart-drawer";
        drawer.className = "cart-drawer";
        drawer.setAttribute("aria-hidden", "true");
        drawer.innerHTML = [
            '<div class="cart-drawer-overlay" data-cart-drawer-close></div>',
            '<aside class="cart-drawer-panel" role="dialog" aria-modal="true" aria-label="' + escapeAttr(t("aria.cartPanel")) + '">',
            '    <div class="cart-drawer-header">',
            '        <div class="cart-drawer-title-wrap">',
            '            <h2 class="cart-drawer-title">' + escapeHtml(t("cart.title")) + '</h2>',
            '            <span class="cart-drawer-badge" id="cart-drawer-count">0</span>',
            '        </div>',
            '        <button type="button" class="cart-drawer-close-btn" data-cart-drawer-close aria-label="' + escapeAttr(t("aria.closeCart")) + '">',
            '            <i class="fas fa-times"></i>',
            '        </button>',
            '    </div>',
            '    <div class="cart-drawer-shipping" id="cart-drawer-shipping"></div>',
            '    <div class="cart-drawer-body" id="cart-drawer-body"></div>',
            '    <div class="cart-drawer-footer" id="cart-drawer-footer">',
            '        <div class="cart-drawer-subtotal-row">',
            '            <span class="cart-drawer-subtotal-label">' + escapeHtml(t("cart.subtotal")) + '</span>',
            '            <span class="cart-drawer-subtotal-val" id="cart-drawer-subtotal">$0.00</span>',
            '        </div>',
            '        <p class="cart-drawer-note">' + escapeHtml(t("cart.note")) + '</p>',
            '        <div class="cart-drawer-actions">',
            '            <a href="./cart.html" class="cart-drawer-btn cart-drawer-btn-secondary">' + escapeHtml(t("cart.goToCart")) + '</a>',
            '            <a href="./checkout.html" class="cart-drawer-btn cart-drawer-btn-primary">' + escapeHtml(t("cart.checkout")) + ' <i class="fas fa-arrow-right"></i></a>',
            '        </div>',
            '    </div>',
            '</aside>'
        ].join("\n");

        document.body.appendChild(drawer);

        drawer.addEventListener("click", function (event) {
            if (event.target.closest("[data-cart-drawer-close]")) {
                event.preventDefault();
                closeDrawer();
                return;
            }

            var qtyBtn = event.target.closest("[data-qty-action]");
            if (qtyBtn) {
                event.preventDefault();
                var action = qtyBtn.dataset.qtyAction;
                var id = qtyBtn.dataset.id;
                var item = readCart().find(function (it) { return it.id === id; });
                if (item) {
                    var current = Number(item.quantity || 1);
                    if (action === "plus") {
                        updateQuantity(id, current + 1);
                    } else if (action === "minus") {
                        updateQuantity(id, current - 1);
                    }
                }
                return;
            }

            var removeBtn = event.target.closest("[data-remove-id]");
            if (removeBtn) {
                event.preventDefault();
                var removeId = removeBtn.dataset.removeId;
                if (removeId) {
                    removeItem(removeId);
                }
                return;
            }

            var directLink = event.target.closest("a");
            if (directLink && directLink.href && !directLink.classList.contains("cart-drawer-btn-secondary") && !directLink.classList.contains("cart-drawer-btn-primary")) {
                closeDrawer();
            }
        });

        return drawer;
    }

    function renderCartDrawer() {
        var drawer = initCartDrawer();
        if (!drawer) return;

        var items = readCart();
        var count = getCount();
        var subtotal = getSubtotal();

        var countElem = document.getElementById("cart-drawer-count");
        if (countElem) countElem.textContent = count;

        var shippingElem = document.getElementById("cart-drawer-shipping");
        if (shippingElem) {
            if (items.length === 0) {
                shippingElem.innerHTML = '<div class="cart-drawer-shipping-text">' + escapeHtml(t("cart.freeOverAmount", { amount: "$" + FREE_SHIPPING_THRESHOLD.toFixed(2) })) + '</div>';
            } else if (subtotal >= FREE_SHIPPING_THRESHOLD) {
                shippingElem.innerHTML = [
                    '<div class="cart-drawer-shipping-text unlocked"><i class="fas fa-check-circle"></i> ' + escapeHtml(t("cart.freeUnlockedFull")) + '</div>',
                    '<div class="cart-drawer-progress-track"><div class="cart-drawer-progress-fill unlocked" style="width: 100%;"></div></div>'
                ].join("");
            } else {
                var remaining = FREE_SHIPPING_THRESHOLD - subtotal;
                var percent = Math.min(100, Math.max(0, Math.round((subtotal / FREE_SHIPPING_THRESHOLD) * 100)));
                shippingElem.innerHTML = [
                    '<div class="cart-drawer-shipping-text">' + escapeHtml(t("cart.addMoreFull", { amount: formatMoney(remaining) })) + '</div>',
                    '<div class="cart-drawer-progress-track"><div class="cart-drawer-progress-fill" style="width: ' + percent + '%;"></div></div>'
                ].join("");
            }
        }

        var bodyElem = document.getElementById("cart-drawer-body");
        var footerElem = document.getElementById("cart-drawer-footer");
        var subtotalElem = document.getElementById("cart-drawer-subtotal");

        if (subtotalElem) subtotalElem.textContent = formatMoney(subtotal);

        if (bodyElem) {
            if (items.length === 0) {
                if (footerElem) footerElem.style.display = "none";
                bodyElem.innerHTML = [
                    '<div class="cart-drawer-empty">',
                    '    <div class="cart-drawer-empty-icon"><i class="fas fa-shopping-bag"></i></div>',
                    '    <h3 class="cart-drawer-empty-title">' + escapeHtml(t("cart.emptyTitle")) + '</h3>',
                    '    <p class="cart-drawer-empty-desc">' + escapeHtml(t("cart.emptyCopy")) + '</p>',
                    '    <a href="./collection.html" class="cart-drawer-empty-btn" data-cart-drawer-close>' + escapeHtml(t("cart.startShopping")) + '</a>',
                    '</div>'
                ].join("\n");
            } else {
                if (footerElem) footerElem.style.display = "block";
                var itemsHtml = items.map(function (item) {
                    var brandHtml = item.brand ? '<span class="cart-drawer-item-brand">' + escapeHtml(item.brand) + '</span>' : '';
                    var oldPriceHtml = item.oldPrice ? '<span class="cart-drawer-item-old-price">' + escapeHtml(item.oldPrice) + '</span>' : '';
                    var itemUrl = escapeAttr(item.url || './cart.html');

                    return [
                        '<div class="cart-drawer-item" data-id="' + escapeAttr(item.id) + '">',
                        '    <a href="' + itemUrl + '" class="cart-drawer-item-img-link">',
                        '        <img src="' + escapeAttr(item.imageUrl || './heliomed-logo.png') + '" alt="' + escapeAttr(item.title) + '" loading="lazy" />',
                        '    </a>',
                        '    <div class="cart-drawer-item-details">',
                        '        ' + brandHtml,
                        '        <a href="' + itemUrl + '" class="cart-drawer-item-name">' + escapeHtml(item.title) + '</a>',
                        '        <div class="cart-drawer-item-pricing">',
                        '            <span class="cart-drawer-item-price">' + formatMoney(item.price) + '</span>',
                        '            ' + oldPriceHtml,
                        '        </div>',
                        '        <div class="cart-drawer-item-bottom">',
                        '            <div class="cart-drawer-qty-control">',
                        '                <button type="button" class="cart-drawer-qty-btn" data-qty-action="minus" data-id="' + escapeAttr(item.id) + '" aria-label="' + escapeAttr(t("aria.decreaseQuantity")) + '"><i class="fas fa-minus"></i></button>',
                        '                <span class="cart-drawer-qty-num">' + Number(item.quantity || 1) + '</span>',
                        '                <button type="button" class="cart-drawer-qty-btn" data-qty-action="plus" data-id="' + escapeAttr(item.id) + '" aria-label="' + escapeAttr(t("aria.increaseQuantity")) + '"><i class="fas fa-plus"></i></button>',
                        '            </div>',
                        '            <button type="button" class="cart-drawer-remove-btn" data-remove-id="' + escapeAttr(item.id) + '" aria-label="' + escapeAttr(t("cart.remove") + " " + item.title) + '">',
                        '                <i class="far fa-trash-alt"></i> ' + escapeHtml(t("cart.remove")),
                        '            </button>',
                        '        </div>',
                        '    </div>',
                        '</div>'
                    ].join("\n");
                }).join("\n");

                bodyElem.innerHTML = '<div class="cart-drawer-item-list">' + itemsHtml + '</div>';
            }
        }
    }

    function openDrawer() {
        var drawer = initCartDrawer();
        renderCartDrawer();
        requestAnimationFrame(function () {
            drawer.classList.add("is-open");
            document.documentElement.classList.add("cart-drawer-lock");
            document.body.classList.add("cart-drawer-lock");
            drawer.setAttribute("aria-hidden", "false");
        });
    }

    function closeDrawer() {
        var drawer = document.getElementById("cart-drawer");
        if (!drawer) return;
        drawer.classList.remove("is-open");
        document.documentElement.classList.remove("cart-drawer-lock");
        document.body.classList.remove("cart-drawer-lock");
        drawer.setAttribute("aria-hidden", "true");
    }

    function toggleDrawer() {
        var drawer = document.getElementById("cart-drawer");
        if (drawer && drawer.classList.contains("is-open")) {
            closeDrawer();
        } else {
            openDrawer();
        }
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
        closeDrawer: closeDrawer,
        formatMoney: formatMoney,
        getCount: getCount,
        getDeliveryArea: getDeliveryArea,
        getDeliveryAreas: getDeliveryAreas,
        getDiscount: readDiscount,
        getFreeShippingThreshold: getFreeShippingThreshold,
        getItems: readCart,
        getSummary: getSummary,
        getSubtotal: getSubtotal,
        initCartDrawer: initCartDrawer,
        itemFromCard: itemFromCard,
        openDrawer: openDrawer,
        parseMoney: parseMoney,
        renderCartDrawer: renderCartDrawer,
        removeItem: removeItem,
        setDeliveryArea: setDeliveryArea,
        setDeliverySettings: setDeliverySettings,
        setDiscount: setDiscount,
        slug: slug,
        toggleDrawer: toggleDrawer,
        updateCounters: updateCounters,
        updateQuantity: updateQuantity
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", function () {
            updateCounters();
            initCartDrawer();
        });
    } else {
        updateCounters();
        initCartDrawer();
    }

    document.addEventListener("keydown", function (event) {
        if (event.key === "Escape") {
            var drawer = document.getElementById("cart-drawer");
            if (drawer && drawer.classList.contains("is-open")) {
                closeDrawer();
            }
        }
    });

    document.addEventListener("click", function (event) {
        var cartTrigger = event.target.closest(".cart-icon-wrapper[href*='cart.html'], a.header-cart-btn, [data-open-cart]");
        if (cartTrigger && !cartTrigger.closest("#cart-drawer")) {
            event.preventDefault();
            toggleDrawer();
        }
    });

    window.addEventListener("storage", function (event) {
        if (event.key === STORAGE_KEY) updateCounters();
    });

    window.addEventListener("heliomed:language-change", function () {
        var drawer = document.getElementById("cart-drawer");
        if (drawer) drawer.remove();
        initCartDrawer();
        renderCartDrawer();
    });
})();
