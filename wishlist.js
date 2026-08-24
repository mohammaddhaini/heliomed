(function () {
    "use strict";

    var STORAGE_KEY = "heliomedWishlist";

    function readWishlist() {
        try {
            var parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
            return Array.isArray(parsed) ? parsed : [];
        } catch (error) {
            return [];
        }
    }

    function writeWishlist(items) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
        updateCounters();
        window.dispatchEvent(new CustomEvent("heliomed-wishlist-change", { detail: { items: items } }));
    }

    function normalizeItem(item) {
        return {
            id: String(item.id || window.HeliomedCart?.slug(item.title) || "product"),
            title: String(item.title || "Product"),
            brand: String(item.brand || ""),
            imageUrl: String(item.imageUrl || ""),
            oldPrice: String(item.oldPrice || ""),
            newPrice: String(item.newPrice || ""),
            price: Number(item.price || item.newPriceValue || 0),
            url: String(item.url || "")
        };
    }

    function hasItem(id) {
        return readWishlist().some(function (item) { return item.id === id; });
    }

    function addItem(item) {
        var normalized = normalizeItem(item);
        var items = readWishlist();
        if (!items.some(function (stored) { return stored.id === normalized.id; })) {
            items.push(normalized);
            writeWishlist(items);
        }
        return readWishlist();
    }

    function removeItem(id) {
        var items = readWishlist().filter(function (item) { return item.id !== id; });
        writeWishlist(items);
        return items;
    }

    function toggleItem(item) {
        var normalized = normalizeItem(item);
        if (hasItem(normalized.id)) {
            removeItem(normalized.id);
            return false;
        }
        addItem(normalized);
        return true;
    }

    function updateCounters() {
        var count = readWishlist().length;
        document.querySelectorAll(".wishlist-count").forEach(function (counter) {
            counter.textContent = count;
        });
    }

    function itemFromSearchProduct(product) {
        return normalizeItem({
            id: product.id,
            title: product.title,
            brand: product.brand,
            imageUrl: product.imageUrl,
            oldPrice: product.oldPrice,
            newPrice: product.newPrice,
            price: product.newPriceValue,
            url: window.HeliomedProductUrls.productPath(product)
        });
    }

    window.HeliomedWishlist = {
        addItem: addItem,
        getItems: readWishlist,
        hasItem: hasItem,
        itemFromSearchProduct: itemFromSearchProduct,
        removeItem: removeItem,
        toggleItem: toggleItem,
        updateCounters: updateCounters
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
