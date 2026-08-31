import { db } from "./firebase-init.js";
import {
    collection,
    getDocs,
    orderBy,
    query
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";
import { fetchQueryLazy } from "./products-cache.js";

let renderedCategories = [];

function t(key, params) {
    return window.HeliomedI18n && typeof window.HeliomedI18n.t === "function"
        ? window.HeliomedI18n.t(key, params)
        : key;
}

function contentValue(record, key, fallback) {
    return window.HeliomedI18n && typeof window.HeliomedI18n.contentValue === "function"
        ? window.HeliomedI18n.contentValue(record, key, fallback)
        : (record && record[key]) || fallback;
}

document.addEventListener("DOMContentLoaded", async function () {
    const navLinks = document.querySelector(".nav-links");
    if (!navLinks) return;

    try {
        const rawCategories = await fetchQueryLazy("navbar_categories:all", async () => {
            const snapshot = await getDocs(query(collection(db, "categories"), orderBy("sortOrder")));
            return snapshot.docs.map(function (item) { return { id: item.id, ...item.data() }; });
        });

        const categories = (rawCategories || [])
            .filter(function (category) {
                return category.active !== false && category.displayInNavbar !== false;
            })
            .sort(sortCategory);

        if (!categories.length) return;
        renderedCategories = categories;
        renderNavbar(navLinks, categories);
        document.dispatchEvent(new CustomEvent("heliomed:navbar-categories-loaded"));
    } catch (error) {
        console.warn("Could not load navbar categories from Firebase.", error);
    }
});

function renderNavbar(navLinks, categories) {
    navLinks.removeAttribute("data-i18n-static-text");
    const mobileItems = Array.from(navLinks.querySelectorAll(".mobile-only-nav")).filter(function (item) {
        return !item.querySelector("a[href*='cart.html']");
    });
    const panelHeader = navLinks.querySelector(".nav-panel-header");
    const panelHeaderHtml = panelHeader ? panelHeader.outerHTML : `
        <li class="nav-panel-header" aria-hidden="true">
            <span class="nav-panel-title">MENU</span>
            <button class="nav-panel-close" type="button" aria-label="Close menu"><i class="fas fa-times"></i></button>
        </li>`;

    navLinks.innerHTML = panelHeaderHtml
        + categories.map(categoryTemplate).join("")
        + mobileItems.map(function (item) {
            return item.outerHTML;
        }).join("");
}

function categoryTemplate(category) {
    const children = visibleChildren(category);
    const icon = category.slug === "offers" ? '<i class="fas fa-tags"></i> ' : "";
    const categoryTitle = contentValue(category, "title", category.slug);
    if (!children.length) {
        return '<li class="nav-item"><a href="' + escapeAttr(category.href || collectionHref(category.slug)) + '" class="nav-trigger">' + icon + escapeHtml(categoryTitle) + '</a></li>';
    }

    const totalLinks = children.reduce((sum, c) => sum + 1 + (visibleChildren(c).length || 0), 0);
    const colClass = children.length <= 1 ? "compact" : (children.length === 2 ? "two" : (children.length === 3 ? "three" : "four"));

    return '<li class="nav-item">' +
        '<a href="' + escapeAttr(category.href || collectionHref(category.slug)) + '" class="nav-trigger">' + icon + escapeHtml(categoryTitle) + ' <i class="fas fa-chevron-down"></i></a>' +
        '<div class="mega-menu' + (children.length <= 1 ? " compact" : "") + '">' +
            '<div class="mega-grid ' + colClass + '">' +
                children.map(childColumnTemplate).join("") +
            '</div>' +
            '<a class="category-view-all" style="border-top:1px solid var(--brand-border); padding:10px 0 0; margin-top:8px;" href="' + escapeAttr(category.href || collectionHref(category.slug)) + '">' + escapeHtml(t("nav.viewAll", { name: categoryTitle })) + ' &rarr;</a>' +
        '</div>' +
    '</li>';
}

function childColumnTemplate(child) {
    const grandchildren = visibleChildren(child);
    const childHref = escapeAttr(child.href || collectionHref(child.slug));
    const localizedChildTitle = contentValue(child, "title", child.slug);
    const childTitle = escapeHtml(localizedChildTitle);
    if (grandchildren.length) {
        return '<div class="mega-column mega-group">' +
            '<div class="mega-group-header">' +
                '<strong><a href="' + childHref + '">' + childTitle + '</a></strong>' +
                '<button type="button" class="mega-group-toggle" aria-expanded="false" aria-label="' + escapeAttr(t("aria.toggleSubcategories", { name: localizedChildTitle })) + '"><i class="fas fa-chevron-down"></i></button>' +
            '</div>' +
            '<div class="mega-group-links">' +
                grandchildren.map(linkTemplate).join("") +
            '</div>' +
        '</div>';
    }
    return '<div class="mega-column mega-single">' +
        '<strong><a href="' + childHref + '">' + childTitle + '</a></strong>' +
    '</div>';
}

function linkTemplate(item) {
    return '<a href="' + escapeAttr(item.href || collectionHref(item.slug)) + '">' + escapeHtml(contentValue(item, "title", item.slug)) + '</a>';
}

function visibleChildren(item) {
    return (item.children || [])
        .filter(function (child) {
            return child.active !== false && child.displayInNavbar !== false;
        })
        .sort(sortCategory);
}

function sortCategory(a, b) {
    return Number(a.sortOrder || 0) - Number(b.sortOrder || 0) || String(a.title || "").localeCompare(String(b.title || ""));
}

function collectionHref(slug) {
    return "./collection.html?collection=" + encodeURIComponent(slug || "");
}

function gridStyle(children) {
    if (children.length === 2) return "grid-template-columns:repeat(2,minmax(0,1fr));max-width:520px;";
    if (children.length === 1) return "grid-template-columns:1fr;max-width:360px;";
    return "";
}

function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, function (char) {
        return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char];
    });
}

function escapeAttr(value) {
    return escapeHtml(value).replace(/`/g, "&#096;");
}

window.addEventListener("heliomed:language-change", function () {
    const navLinks = document.querySelector(".nav-links");
    if (!navLinks || !renderedCategories.length) return;
    renderNavbar(navLinks, renderedCategories);
    document.dispatchEvent(new CustomEvent("heliomed:navbar-categories-loaded"));
});
