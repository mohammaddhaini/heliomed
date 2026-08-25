import { db } from "./firebase-init.js";
import {
    collection,
    doc,
    getDoc,
    getDocs,
    orderBy,
    query
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";
import { fetchQueryLazy } from "./products-cache.js";
import { applyHeroImage } from "./hero-image.mjs";

const isPreviewMode = detectPreviewMode();
const HOMEPAGE_LOADER_MIN_MS = 3000;
const homepageLoaderStartedAt = performance.now();
let currentHeroIndex = 0;
let activeLayout = { sections: [] };
let selectedSectionId = null;
let cleanupCallbacks = [];
let productCatalog = [];
let productCatalogPromise = null;
let collectionCatalog = [];
let brandCatalog = [];
let contentCatalogPromise = null;

document.addEventListener("DOMContentLoaded", async function () {
    const root = document.getElementById("homepage-dynamic-root");
    if (!root) {
        hideHomepageLoader({ immediate: true });
        return;
    }
    document.body.classList.toggle("cms-preview-mode", isPreviewMode);
    initHomepageSearchPredictions();

    if (isPreviewMode) {
        hideHomepageLoader({ immediate: true });
        window.heliomedDynamicCMSLoaded = true;
        postPreviewReady();
        return;
    }

    const minimumLoaderTime = waitForHomepageLoaderMinimum();
    try {
        const [layoutData] = await Promise.all([
            fetchQueryLazy("homepage_layout:published", async () => {
                const snap = await getDoc(doc(db, "homepage_layout", "published"));
                return snap.exists() ? snap.data() : null;
            }),
            ensureProductCatalog(),
            ensureContentCatalog()
        ]);
        if (layoutData && Array.isArray(layoutData.sections) && layoutData.sections.length > 0) {
            renderLayout(layoutData);
        } else {
            renderLayout(getDefaultHomepageLayout());
        }
    } catch (err) {
        console.warn("Could not render dynamic homepage CMS, loading default layout:", err);
        renderLayout(getDefaultHomepageLayout());
    } finally {
        await minimumLoaderTime;
        hideHomepageLoader();
    }
});

window.addEventListener("message", async function (event) {
    if (!isPreviewMode || event.origin !== window.location.origin || !event.data) return;
    
    if (event.data.type === "CMS_PREVIEW_UPDATE") {
        selectedSectionId = event.data.selectedSectionId || null;
        await Promise.all([ensureProductCatalog(), ensureContentCatalog()]);
        renderLayout(event.data.layout || { sections: [] }, { preview: true });
        return;
    }

    if (event.data.type === "CMS_PREVIEW_SET_HERO_SLIDE") {
        const hero = document.querySelector(".dynamic-hero");
        if (hero && typeof hero._applySlide === "function") {
            hero._applySlide(Number(event.data.slideIndex || 0));
        }
        return;
    }

    if (event.data.type === "CMS_PREVIEW_SET_BRAND_TAB") {
        const brandSec = document.querySelector(".dynamic-brand-showcase");
        if (brandSec) {
            const tabs = brandSec.querySelectorAll(".cc-cat-tabs li");
            const targetTab = tabs[Number(event.data.tabIndex || 0)];
            if (targetTab) targetTab.click();
        }
        return;
    }
});

function detectPreviewMode() {
    const params = new URLSearchParams(window.location.search);
    if (params.get("preview") === "customizer") return true;
    try {
        return window.self !== window.top;
    } catch (error) {
        return true;
    }
}

function postPreviewReady() {
    try {
        window.parent.postMessage({ type: "CMS_PREVIEW_READY" }, window.location.origin);
    } catch (error) {
        console.warn("Could not notify customizer parent:", error);
    }
}

function waitForHomepageLoaderMinimum() {
    const elapsed = performance.now() - homepageLoaderStartedAt;
    return new Promise(resolve => window.setTimeout(resolve, Math.max(0, HOMEPAGE_LOADER_MIN_MS - elapsed)));
}

function hideHomepageLoader(options = {}) {
    const loader = document.getElementById("homepageCmsLoader");
    if (!loader) return;
    if (options.immediate) {
        loader.classList.add("is-hidden");
        loader.style.display = "none";
        return;
    }
    loader.classList.add("is-hidden");
    window.setTimeout(() => {
        loader.style.display = "none";
    }, 400);
}

function ensureProductCatalog() {
    if (productCatalogPromise) return productCatalogPromise;
    
    const fetcher = async () => {
        const snapshot = await getDocs(query(collection(db, "medicines"), orderBy("title")));
        return snapshot.docs.map(item => normalizeProduct({ id: item.id, ...item.data() }));
    };

    const loaderPromise = isPreviewMode ? fetcher() : fetchQueryLazy("catalog:all", fetcher);

    productCatalogPromise = loaderPromise
        .then(products => {
            productCatalog = (products || [])
                .map(item => normalizeProduct(item))
                .filter(window.HeliomedProductUrls.isProductAvailable);
            window.dispatchEvent(new CustomEvent("heliomed:product-catalog-ready"));
        })
        .catch(error => {
            console.warn("Could not load product catalog for CMS sections:", error);
            productCatalog = [];
            window.dispatchEvent(new CustomEvent("heliomed:product-catalog-ready"));
        });
    return productCatalogPromise;
}

function ensureContentCatalog() {
    if (contentCatalogPromise) return contentCatalogPromise;

    const fetcher = async () => {
        const [categorySnap, collectionSnap, brandSnap] = await Promise.all([
            getDocs(collection(db, "categories")),
            getDocs(collection(db, "collectionContent")),
            getDocs(collection(db, "brandContent"))
        ]);
        return {
            categories: categorySnap.docs.map(item => ({ id: item.id, ...item.data() })),
            collections: collectionSnap.docs.map(item => ({ id: item.id, ...item.data() })),
            brands: brandSnap.docs.map(item => ({ id: item.id, ...item.data() }))
        };
    };

    const loaderPromise = isPreviewMode ? fetcher() : fetchQueryLazy("content_catalog:all", fetcher);

    contentCatalogPromise = ensureProductCatalog().then(() => loaderPromise).then(contentData => {
        const categoryCollections = [];
        (contentData.categories || []).forEach(data => {
            collectCategoryOptions(data, "Category", categoryCollections);
        });
        const contentCollections = (contentData.collections || []).map(item => {
            return {
                id: item.id,
                title: item.title || item.id,
                subtitle: item.description || "Collection",
                href: "./collection.html?collection=" + encodeURIComponent(item.id),
                imageUrl: item.imageUrl || ""
            };
        });
        const contentBrands = (contentData.brands || []).map(item => {
            const brandSlug = String(item.id || item.title || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
            return {
                id: item.id,
                title: item.title || item.id,
                subtitle: item.description || "Brand",
                href: "./collection.html?collection=" + encodeURIComponent(brandSlug || item.id),
                imageUrl: item.imageUrl || ""
            };
        });
        const productBrands = Array.from(new Set(productCatalog.map(product => product.brand).filter(Boolean))).map(brand => {
            const brandSlug = String(brand || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
            return {
                id: brand,
                title: brand,
                subtitle: "Brand",
                href: "./collection.html?collection=" + encodeURIComponent(brandSlug || brand),
                imageUrl: ""
            };
        });
        collectionCatalog = mergeCatalogItems([...categoryCollections, ...contentCollections]);
        brandCatalog = mergeCatalogItems([...contentBrands, ...productBrands]);
    }).catch(error => {
        console.warn("Could not load content catalogs for CMS sections:", error);
        collectionCatalog = [];
        brandCatalog = [];
    });
    return contentCatalogPromise;
}

function collectCategoryOptions(item, level, target) {
    const id = item.slug || item.id || item.title;
    if (id) {
        target.push({
            id,
            title: item.title || id,
            subtitle: level,
            href: item.href || "./collection.html?collection=" + encodeURIComponent(id),
            imageUrl: item.imageUrl || ""
        });
    }
    (item.children || []).forEach(child => {
        collectCategoryOptions(child, level === "Category" ? "Subcategory" : "Sub-subcategory", target);
    });
}

function mergeCatalogItems(items) {
    const merged = new Map();
    items.forEach(item => {
        if (item.id && !merged.has(item.id)) merged.set(item.id, item);
    });
    return Array.from(merged.values());
}

function normalizeProductVariant(variant) {
    if (typeof variant === "string") return { name: variant };
    return {
        name: variant?.name || variant?.title || variant?.size || variant?.label || "",
        oldPrice: variant?.oldPrice || "",
        newPrice: variant?.newPrice || "",
        oldPriceValue: Number(variant?.oldPriceValue || 0),
        newPriceValue: Number(variant?.newPriceValue || 0),
        inventory: Number(variant?.inventory || 0),
        available: variant?.available !== false,
        imageUrl: variant?.imageUrl || ""
    };
}

function normalizeProduct(product) {
    const variants = Array.isArray(product.variants) ? product.variants.map(normalizeProductVariant) : [];
    const firstVariant = variants[0] || {};
    return {
        id: product.id || "",
        title: product.title || "",
        brand: product.brand || "",
        category: product.category || "",
        section: product.section || "",
        badge: product.badge || "",
        oldPrice: product.oldPrice || firstVariant.oldPrice || "",
        newPrice: product.newPrice || firstVariant.newPrice || "",
        oldPriceValue: Number(product.oldPriceValue || firstVariant.oldPriceValue || 0),
        newPriceValue: Number(product.newPriceValue || firstVariant.newPriceValue || 0),
        inventory: Number(product.inventory || firstVariant.inventory || 0),
        available: product.available !== false,
        imageUrl: product.imageUrl || firstVariant.imageUrl || product.images?.[0] || "",
        images: Array.isArray(product.images) ? product.images : [],
        variants,
        description: product.description || "",
        usage: product.usage || "",
        warnings: product.warnings || ""
    };
}

function normalizeSearchText(value) {
    return String(value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function productIsOutOfStock(product) {
    return !window.HeliomedProductUrls.isProductAvailable(product);
}

function productHasVisiblePrice(product) {
    return !productIsOutOfStock(product) && Boolean(product.newPrice);
}

function buildSearchEntry(product, index) {
    const blob = [
        product.title,
        product.brand,
        product.category,
        product.section,
        product.badge,
        product.description,
        product.usage,
        product.warnings
    ].join(" ");
    return {
        product,
        index,
        title: normalizeSearchText(product.title),
        brand: normalizeSearchText(product.brand),
        category: normalizeSearchText(product.category),
        section: normalizeSearchText(product.section),
        badge: normalizeSearchText(product.badge),
        blob: normalizeSearchText(blob)
    };
}

function scoreHomepageSearchEntry(entry, term) {
    if (!term) return -1;
    const words = term.split(" ").filter(Boolean);
    if (!words.every(word => entry.blob.includes(word))) return -1;

    let score = 0;
    words.forEach(word => {
        if (entry.title === word) score += 140;
        else if (entry.title.startsWith(word)) score += 105;
        else if (entry.title.includes(word)) score += 72;
        if (entry.brand.startsWith(word)) score += 34;
        if (entry.category.includes(word)) score += 22;
        if (entry.section.includes(word)) score += 16;
        if (entry.badge.includes(word)) score += 10;
    });
    if (entry.product.available) score += 8;
    score += Math.max(0, 18 - entry.index * 0.01);
    return score;
}

function initHomepageSearchPredictions() {
    const searchInput = document.querySelector(".header .search-box input");
    const predictionPanel = document.getElementById("homeSearchPredict");
    if (!searchInput || !predictionPanel) return;

    let searchIndex = [];

    function rebuildIndex() {
        searchIndex = productCatalog.map(buildSearchEntry);
    }

    function hidePredictions() {
        predictionPanel.classList.remove("is-visible");
        searchInput.setAttribute("aria-expanded", "false");
    }

    function getPredictions() {
        const term = normalizeSearchText(searchInput.value);
        if (!term) return [];
        return searchIndex
            .map(entry => ({ entry, score: scoreHomepageSearchEntry(entry, term) }))
            .filter(result => result.score >= 0)
            .sort((a, b) => {
                return b.score - a.score || String(a.entry.product.title).localeCompare(String(b.entry.product.title));
            })
            .slice(0, 4)
            .map(result => result.entry.product);
    }

    function renderPredictions() {
        rebuildIndex();
        const predictions = getPredictions();
        predictionPanel.innerHTML = predictions.map(product => {
            const productUrl = product.id ? window.HeliomedProductUrls.productPath(product) : "#";
            const metaParts = [
                escapeHtml(product.brand || "Heliomed"),
                productHasVisiblePrice(product) ? `<span class="home-search-predict-price">${escapeHtml(product.newPrice)}</span>` : ""
            ].filter(Boolean);
            return `
                <a class="home-search-predict-item" role="option" href="${escapeHtml(productUrl)}">
                    ${product.imageUrl
                        ? `<img class="home-search-predict-thumb" src="${escapeHtml(product.imageUrl)}" alt="${escapeHtml(product.title || 'Product')}">`
                        : `<span class="home-search-predict-thumb" aria-hidden="true"></span>`
                    }
                    <span class="home-search-predict-copy">
                        <span class="home-search-predict-title">${escapeHtml(product.title || "Untitled product")}</span>
                        <span class="home-search-predict-meta">${metaParts.join(" - ")}</span>
                    </span>
                </a>
            `;
        }).join("");
        const shouldShow = predictions.length > 0 && document.activeElement === searchInput;
        predictionPanel.classList.toggle("is-visible", shouldShow);
        searchInput.setAttribute("aria-expanded", shouldShow ? "true" : "false");
    }

    searchInput.addEventListener("input", renderPredictions);
    searchInput.addEventListener("focus", renderPredictions);
    searchInput.addEventListener("keydown", event => {
        if (event.key === "Escape") hidePredictions();
    });
    document.addEventListener("click", event => {
        if (!event.target.closest(".header .search-box")) hidePredictions();
    });
    window.addEventListener("heliomed:product-catalog-ready", renderPredictions);
}

function renderLayout(layout, options = {}) {
    const dynamicRoot = document.getElementById("homepage-dynamic-root");
    if (!dynamicRoot) return;

    cleanupInteractions();
    activeLayout = normalizeLayout(layout);
    const scrollTop = window.scrollY;
    const sections = activeLayout.sections.filter(sec => sec.active !== false);

    window.heliomedDynamicCMSLoaded = true;
    dynamicRoot.innerHTML = "";

    sections.forEach((sec, visibleIndex) => {
        const originalIndex = activeLayout.sections.findIndex(item => item.id === sec.id);
        const sectionEl = renderSection(sec, originalIndex >= 0 ? originalIndex : visibleIndex);
        if (sectionEl) dynamicRoot.appendChild(sectionEl);
    });

    initHeroSliders();
    initBrandTabs();
    initScrollAnimations();
    initCartDelegation();

    if (options.preview) {
        initPreviewSelection();
        window.scrollTo({ top: scrollTop, behavior: "instant" });
    }
}

function normalizeLayout(layout) {
    const sections = Array.isArray(layout?.sections) ? layout.sections : [];
    return {
        ...layout,
        sections: sections.map((section, index) => ({
            id: section.id || "preview_section_" + index,
            ...section
        }))
    };
}

function renderSection(sec, index) {
    let sectionEl = null;
    switch (sec.type) {
        case "hero_carousel":
            sectionEl = renderHeroCarousel(sec);
            break;
        case "trust_strip":
            sectionEl = renderTrustStrip(sec);
            break;
        case "category_finder":
            sectionEl = renderCategoryFinder(sec);
            break;
        case "split_promo":
            sectionEl = renderSplitPromo(sec);
            break;
        case "collection_showcase":
            sectionEl = renderCollectionShowcase(sec);
            break;
        case "brand_showcase":
            sectionEl = renderBrandShowcase(sec);
            break;
        case "brand_collection_grid":
            sectionEl = renderBrandCollectionGrid(sec);
            break;
        case "concern_masonry":
            sectionEl = renderConcernMasonry(sec);
            break;
        default:
            sectionEl = null;
    }

    if (sectionEl) {
        sectionEl.dataset.cmsSectionId = sec.id;
        sectionEl.dataset.cmsSectionIndex = String(index);
        sectionEl.classList.toggle("cms-preview-selected", isPreviewMode && selectedSectionId === sec.id);
    }
    return sectionEl;
}

function renderHeroCarousel(sec) {
    const slides = sec.slides || [];
    if (!slides.length) return null;

    const initial = slides[0];
    const heroEl = document.createElement("section");
    heroEl.className = "hero dynamic-hero";
    heroEl.id = "shop";
    applyHeroColors(heroEl, initial, sec);

    heroEl.innerHTML = `
        <div class="slider-arrow left"><i class="fas fa-chevron-left"></i></div>
        <div class="hero-image">
            <img${initial.imageUrl ? ` src="${escapeHtml(initial.imageUrl)}"` : ' hidden'} alt="${escapeHtml(initial.headline || 'Hero banner')}">
        </div>
        <div class="hero-content">
            <div class="hero-kicker">${escapeHtml(initial.kicker || 'Heliomed Essentials')}</div>
            <h1>${escapeHtml(initial.headline || '')}</h1>
            <p>${escapeHtml(initial.copy || '')}</p>
            <div class="hero-actions">
                <a href="${escapeHtml(initial.primaryCtaUrl || '#')}" class="hero-btn">${escapeHtml(initial.primaryCtaText || 'Shop Daily Care')}</a>
                ${initial.secondaryCtaText ? `<a href="${escapeHtml(initial.secondaryCtaUrl || '#')}" class="hero-link">${escapeHtml(initial.secondaryCtaText)}</a>` : ''}
            </div>
            <div class="hero-highlights">
                ${(initial.highlights || []).map(tag => `<span>${escapeHtml(tag)}</span>`).join('')}
            </div>
        </div>
        <div class="slider-arrow right"><i class="fas fa-chevron-right"></i></div>
    `;

    heroEl._slidesData = slides;
    heroEl._sectionData = sec;
    return heroEl;
}

function applyHeroColors(heroEl, slide, section) {
    const bgColor = slide.bgColor || section.bgColor || "#FFFFFF";
    const accentColor = slide.accentColor || section.accentColor || "#C2A26B";
    const kickerColor = slide.kickerColor || accentColor;
    const headlineColor = slide.headlineColor || "#07111F";
    const copyColor = slide.copyColor || "#4D5B66";
    const buttonBg = slide.buttonBgColor || accentColor;
    const buttonText = slide.buttonTextColor || "#FFFFFF";
    const linkColor = slide.linkColor || "#07111F";
    const linkLine = slide.linkLineColor || accentColor;
    const pillBg = slide.highlightsBgColor || "transparent";
    const pillText = slide.highlightsTextColor || "#07111F";
    const pillLine = slide.highlightsLineColor || "transparent";

    heroEl.style.backgroundColor = bgColor;
    heroEl.style.setProperty("--hero-bg", bgColor);
    heroEl.style.setProperty("--hero-accent", accentColor);
    heroEl.style.setProperty("--hero-kicker-color", kickerColor);
    heroEl.style.setProperty("--hero-headline-color", headlineColor);
    heroEl.style.setProperty("--hero-copy-color", copyColor);
    heroEl.style.setProperty("--hero-button-bg", buttonBg);
    heroEl.style.setProperty("--hero-button-text", buttonText);
    heroEl.style.setProperty("--hero-link-color", linkColor);
    heroEl.style.setProperty("--hero-link-line", linkLine);
    heroEl.style.setProperty("--hero-pill-bg", pillBg);
    heroEl.style.setProperty("--hero-pill-text", pillText);
    heroEl.style.setProperty("--hero-pill-line", pillLine);
}

function renderTrustStrip(sec) {
    const items = sec.items || [];
    if (!items.length) return null;

    const stripEl = document.createElement("section");
    stripEl.className = "care-strip";
    stripEl.style.backgroundColor = sec.bgColor || "#FFFFFF";
    stripEl.innerHTML = `
        <div class="care-strip-inner">
            ${items.map(item => `
                <div class="care-strip-item">
                    <i class="${escapeHtml(item.icon || 'fas fa-check')}"></i>
                    <span>${escapeHtml(item.title)}</span>
                </div>
            `).join('')}
        </div>
    `;
    return stripEl;
}

function renderCategoryFinder(sec) {
    const cards = sec.cards || [];
    const finderEl = document.createElement("section");
    finderEl.className = "care-finder";
    finderEl.id = "categories";
    finderEl.style.backgroundColor = sec.bgColor || "";
    finderEl.innerHTML = `
        <div class="care-finder-inner">
            <div class="care-finder-copy">
                <h2>${escapeHtml(sec.title || 'Shop by Category')}</h2>
                <p>${escapeHtml(sec.subtitle || '')}</p>
            </div>
            <div class="care-finder-grid">
                ${cards.map(card => `
                    <div class="care-finder-tile" data-href="${escapeHtml(card.targetUrl || '#')}">
                        <i class="${escapeHtml(card.icon || 'fas fa-stethoscope')}"></i>
                        <strong>${escapeHtml(card.title)}</strong>
                        <span>${escapeHtml(card.subtitle || '')}</span>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    return finderEl;
}

function renderSplitPromo(sec) {
    const isReverse = sec.direction === "reverse";
    const prods = resolveSectionProducts(sec);
    const promoEl = document.createElement("section");
    promoEl.className = "cc-container";
    promoEl.style.backgroundColor = sec.bgColor || "";

    const bannerBg = sec.bannerBgColor || sec.bgColor || "#FFFFFF";
    const hasImage = Boolean(sec.imageUrl);
    const textTheme = sec.bannerTextColor || (hasImage ? "light" : "dark");

    promoEl.innerHTML = `
        <div class="cc-split-layout ${isReverse ? 'is-reversed' : ''}">
            <div class="cc-split-banner ${hasImage ? 'has-image' : 'is-solid'} theme-${escapeHtml(textTheme)}" style="background-color: ${escapeHtml(bannerBg)};">
                ${hasImage ? `<img src="${escapeHtml(sec.imageUrl)}" alt="${escapeHtml(sec.title || 'Promotion')}">` : ''}
                <div class="banner-overlay">
                    <h2>${escapeHtml(sec.title || 'Special Promotion')}</h2>
                    ${sec.subtitle ? `<h3 style="font-weight: 700; text-transform: uppercase; margin-bottom: 20px; font-size:14px;">${escapeHtml(sec.subtitle)}</h3>` : ''}
                    <a href="${escapeHtml(sec.ctaUrl || '#')}" class="${textTheme === 'dark' ? 'hero-btn' : 'cc-btn-outline'}">${escapeHtml(sec.ctaText || 'Shop Now')}</a>
                </div>
            </div>
            <div class="cc-split-products">
                ${prods.map(p => renderProductCard(p, true)).join('')}
            </div>
        </div>
    `;
    return promoEl;
}

function renderCollectionShowcase(sec) {
    const collection = collectionCatalog.find(item => item.id === sec.collectionId);
    const products = resolveSectionProducts(sec);
    if (!products.length && !isPreviewMode) return null;

    const sectionEl = document.createElement("section");
    sectionEl.className = "cc-container dynamic-collection-showcase";
    sectionEl.style.backgroundColor = sec.bgColor || "";
    sectionEl.innerHTML = `
        <div class="cc-cat-header">
            <h2>${escapeHtml(sec.title || collection?.title || 'Collection Spotlight')}</h2>
            <p>${escapeHtml(sec.subtitle || collection?.subtitle || '')}</p>
        </div>
        ${products.length ? `
            <div class="cc-cat-grid">
                ${products.map(product => renderProductCard(product, false)).join("")}
            </div>
        ` : `
            <div style="text-align:center; padding:36px 16px; color:#64748b; font-size:14px; font-weight:600;">
                No products found in this collection.
            </div>
        `}
        ${(sec.ctaText || collection?.href) ? `<div style="text-align:center; margin-top:20px;"><a class="hero-btn" href="${escapeHtml(sec.ctaUrl || collection?.href || '#')}">${escapeHtml(sec.ctaText || 'Shop Collection')}</a></div>` : ""}
    `;
    return sectionEl;
}

function renderBrandCollectionGrid(sec) {
    const cards = sec.cards || [];
    if (!cards.length) return null;
    const sectionEl = document.createElement("section");
    sectionEl.className = "care-finder dynamic-brand-collection-grid";
    sectionEl.style.backgroundColor = sec.bgColor || "";
    sectionEl.innerHTML = `
        <div class="care-finder-inner">
            <div class="care-finder-copy">
                <h2>${escapeHtml(sec.title || 'Brands & Collections')}</h2>
                <p>${escapeHtml(sec.subtitle || '')}</p>
            </div>
            <div class="care-finder-grid">
                ${cards.map(card => {
                    const resolved = resolveTileCard(card);
                    return `
                        <div class="care-finder-tile" data-href="${escapeHtml(resolved.targetUrl || '#')}">
                            ${resolved.imageUrl ? `<img src="${escapeHtml(resolved.imageUrl)}" alt="" style="width:34px;height:34px;object-fit:cover;border-radius:6px;">` : `<i class="${resolved.sourceType === 'brand' ? 'fas fa-tags' : 'fas fa-table-cells'}"></i>`}
                            <strong>${escapeHtml(resolved.title)}</strong>
                            <span>${escapeHtml(resolved.subtitle || '')}</span>
                        </div>
                    `;
                }).join("")}
            </div>
        </div>
    `;
    return sectionEl;
}

function resolveSectionProducts(section) {
    const ids = Array.isArray(section.productIds) ? section.productIds : [];
    const byId = ids
        .map(id => productCatalog.find(product => product.id === id))
        .filter(Boolean);
    if (byId.length) return byId.slice(0, 4);
    if (ids.length > 0) return [];

    if (Array.isArray(section.products) && section.products.length) {
        return section.products.map(normalizeProduct).slice(0, 4);
    }

    if (section.collectionId) {
        const colId = String(section.collectionId).trim().toLowerCase();
        const collectionMatches = productCatalog
            .filter(product => {
                const category = String(product.category || "").toLowerCase();
                const sectionName = String(product.section || "").toLowerCase();
                const title = String(product.title || "").toLowerCase();
                return category.includes(colId) || sectionName.includes(colId) || title.includes(colId);
            })
            .filter(product => product.available !== false)
            .slice(0, 4);
        return collectionMatches;
    }

    if (section.type === "split_promo" && (!section.collectionId && ids.length === 0)) {
        return productCatalog.filter(product => product.available !== false).slice(0, 4);
    }

    return [];
}

function resolveTileCard(card) {
    const sourceCatalog = card.sourceType === "brand" ? brandCatalog : collectionCatalog;
    const source = sourceCatalog.find(item => item.id === card.sourceId);
    return {
        ...card,
        title: card.title || source?.title || "Storefront Link",
        subtitle: card.subtitle || source?.subtitle || "",
        imageUrl: card.imageUrl || source?.imageUrl || "",
        targetUrl: card.targetUrl || source?.href || "#"
    };
}

function renderBrandShowcase(sec) {
    const tabs = sec.tabs || [];
    if (!tabs.length) return null;

    const brandEl = document.createElement("section");
    brandEl.className = "cc-container dynamic-brand-showcase";
    brandEl.id = "brands";
    brandEl.style.backgroundColor = sec.bgColor || "";

    const initialTab = tabs[0] || {};
    const initialBrandName = initialTab.brandName || "";
    const initialBrandSlug = String(initialBrandName || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    const initialProducts = resolveTabProducts(initialTab);
    const initialBrandUrl = initialBrandName ? `./collection.html?collection=${encodeURIComponent(initialBrandSlug || initialBrandName)}` : "./collection.html";

    brandEl.innerHTML = `
        <div class="cc-cat-header">
            <h2>${escapeHtml(sec.title || 'Popular Brands')}</h2>
            <p>${escapeHtml(sec.subtitle || '')}</p>
        </div>
        <ul class="cc-cat-tabs">
            ${tabs.map((tab, idx) => `
                <li class="${idx === 0 ? 'active' : ''}" data-tab-idx="${idx}">${escapeHtml(tab.brandName)}</li>
            `).join('')}
        </ul>
        <div class="cc-cat-grid">
            ${initialProducts.length 
                ? initialProducts.map(p => renderProductCard(p, false)).join('') 
                : '<div style="grid-column: 1 / -1; text-align:center; padding:36px 16px; color:#64748b; font-size:14px; font-weight:600;">No products available for this brand.</div>'}
        </div>
        <div class="cc-brand-show-all-wrap" style="text-align:center; margin-top:28px;">
            <a class="cc-brand-show-all-btn hero-btn" href="${escapeHtml(initialBrandUrl)}">
                Show all in ${escapeHtml(initialBrandName || 'Brand')} &rarr;
            </a>
        </div>
    `;

    brandEl._tabsData = tabs;
    return brandEl;
}

function resolveTabProducts(tab) {
    if (!tab) return [];
    const ids = Array.isArray(tab.productIds) ? tab.productIds : [];
    const byId = ids
        .map(id => productCatalog.find(product => product.id === id))
        .filter(Boolean);
    if (byId.length) return byId;
    if (ids.length > 0) return [];

    if (tab.brandName) {
        const brandTarget = String(tab.brandName || "").trim().toLowerCase();
        const brandMatches = productCatalog
            .filter(product => String(product.brand || "").trim().toLowerCase() === brandTarget)
            .filter(product => product.available !== false)
            .slice(0, 4);
        return brandMatches;
    }

    return Array.isArray(tab.products) ? tab.products.map(normalizeProduct) : [];
}

function renderConcernMasonry(sec) {
    const bricks = sec.bricks || [];
    const tall = bricks.find(b => b.size === "tall") || bricks[0];
    const squares = bricks.filter(b => b.size === "square").slice(0, 2);
    const wideTop = bricks.find(b => b.size === "wide_top") || bricks[1];
    const wideBottom = bricks.find(b => b.size === "wide_bottom") || bricks[2];

    const masonryEl = document.createElement("section");
    masonryEl.className = "cc-container";
    masonryEl.id = "concerns";
    masonryEl.style.backgroundColor = sec.bgColor || "";
    masonryEl.innerHTML = `
        <div class="cc-cat-header">
            <h2>${escapeHtml(sec.title || 'Shop by Concern')}</h2>
            <p>${escapeHtml(sec.subtitle || '')}</p>
        </div>
        <div class="cc-brick-section">
            <div class="cc-brick-col-left">
                ${tall ? renderBrick(tall, "cc-brick-tall") : ''}
                <div class="cc-brick-col-left-bottom">
                    ${squares.map(sq => renderBrick(sq, "cc-brick-square")).join('')}
                </div>
            </div>
            <div class="cc-brick-col-right">
                ${wideTop ? renderBrick(wideTop, "cc-brick-col-right-top") : ''}
                ${wideBottom ? renderBrick(wideBottom, "cc-brick-col-right-bottom") : ''}
            </div>
        </div>
    `;
    return masonryEl;
}

function renderProductCard(product, includeTrustBadge) {
    const productUrl = product.id ? window.HeliomedProductUrls.productPath(product) : "#";
    const isWishlisted = Boolean(window.HeliomedWishlist && window.HeliomedWishlist.hasItem(product.id));
    const showPrice = productHasVisiblePrice(product);
    return `
        <div class="cc-product-card" data-product-id="${escapeHtml(product.id || '')}" data-product-url="${escapeHtml(productUrl)}">
            <a class="cc-pc-link" href="${escapeHtml(productUrl)}">
                <div class="cc-pc-img-wrapper">
                    ${product.badge ? `<span class="cc-pc-badge">${escapeHtml(product.badge)}</span>` : ''}
                    ${product.imageUrl ? `<img src="${escapeHtml(product.imageUrl)}" alt="${escapeHtml(product.title || 'Product')}" loading="lazy">` : '<div class="cc-pc-placeholder">Image coming soon</div>'}
                    ${includeTrustBadge ? '<div class="cc-pc-trust-badge"><i class="fas fa-check"></i></div>' : ''}
                </div>
                <div class="cc-pc-brand">${escapeHtml(product.brand || 'Heliomed')}</div>
                <div class="cc-pc-title">${escapeHtml(product.title || 'Untitled product')}</div>
                ${showPrice ? `
                    <div class="cc-pc-price">
                        ${product.oldPrice ? `<span class="old">${escapeHtml(product.oldPrice)}</span>` : ''}
                        <span class="new">${escapeHtml(product.newPrice)}</span>
                    </div>
                ` : ''}
            </a>
            <div class="card-actions">
                <a class="quick-add" href="${escapeHtml(productUrl)}">Details</a>
                <button class="add-card-btn" type="button" data-product-id="${escapeHtml(product.id || '')}" ${showPrice ? '' : 'disabled'}>Add</button>
                <button class="wishlist-btn" type="button" data-product-id="${escapeHtml(product.id || '')}" aria-label="Toggle wishlist"><i class="${isWishlisted ? 'fas' : 'far'} fa-heart"></i></button>
            </div>
        </div>
    `;
}

function renderBrick(brick, className) {
    return `
        <a href="${escapeHtml(brick.targetUrl || '#')}" class="cc-brick-block ${escapeHtml(className)}" style="background: ${escapeHtml(brick.bgColor || '#e5dde3')}; text-decoration:none;">
            ${brick.imageUrl ? `<img src="${escapeHtml(brick.imageUrl)}" alt="${escapeHtml(brick.title)}">` : ''}
            <div class="cc-brick-content">
                <h3>${escapeHtml(brick.title)}</h3>
                <p>${escapeHtml(brick.subtitle || '')}</p>
            </div>
        </a>
    `;
}

/* ================= LIFECYCLE & EVENT MANAGERS ================= */
function cleanupInteractions() {
    cleanupCallbacks.forEach(cleanup => cleanup());
    cleanupCallbacks = [];
    currentHeroIndex = 0;
}

function registerCleanup(callback) {
    cleanupCallbacks.push(callback);
}

function initHeroSliders() {
    const hero = document.querySelector(".dynamic-hero");
    if (!hero || !hero._slidesData) return;

    const slides = hero._slidesData;
    const sectionData = hero._sectionData || {};
    if (slides.length <= 1) return;

    let heroTimer = null;
    let heroFadeTimer = null;
    const controller = new AbortController();

    function applySlide(index) {
        const slide = slides[index];
        if (!slide) return;
        currentHeroIndex = index;

        hero.classList.add("is-fading");
        window.clearTimeout(heroFadeTimer);

        heroFadeTimer = window.setTimeout(() => {
            applyHeroColors(hero, slide, sectionData);

            const kicker = hero.querySelector(".hero-kicker");
            if (kicker) kicker.textContent = slide.kicker || "Heliomed Essentials";

            const h1 = hero.querySelector(".hero-content h1");
            if (h1) h1.textContent = slide.headline || "";

            const copy = hero.querySelector(".hero-content p");
            if (copy) copy.textContent = slide.copy || "";

            const btn = hero.querySelector(".hero-btn");
            if (btn) {
                btn.textContent = slide.primaryCtaText || "Shop Daily Care";
                btn.href = slide.primaryCtaUrl || "#";
            }

            const link = hero.querySelector(".hero-link");
            if (link) {
                link.textContent = slide.secondaryCtaText || "";
                link.href = slide.secondaryCtaUrl || "#";
            }

            const highlights = hero.querySelector(".hero-highlights");
            if (highlights) {
                highlights.innerHTML = (slide.highlights || []).map(tag => `<span>${escapeHtml(tag)}</span>`).join("");
            }

            const img = hero.querySelector(".hero-image img");
            applyHeroImage(img, slide);

            hero.classList.remove("is-fading");
        }, 180);
    }

    function startTimer() {
        window.clearInterval(heroTimer);
        if (isPreviewMode) return;
        heroTimer = window.setInterval(() => {
            applySlide((currentHeroIndex + 1) % slides.length);
        }, 5200);
    }

    hero._applySlide = applySlide;

    hero.querySelector(".slider-arrow.left")?.addEventListener("click", (e) => {
        e.preventDefault();
        applySlide((currentHeroIndex - 1 + slides.length) % slides.length);
        startTimer();
    }, { signal: controller.signal });

    hero.querySelector(".slider-arrow.right")?.addEventListener("click", (e) => {
        e.preventDefault();
        applySlide((currentHeroIndex + 1) % slides.length);
        startTimer();
    }, { signal: controller.signal });

    startTimer();
    registerCleanup(() => {
        controller.abort();
        window.clearTimeout(heroFadeTimer);
        window.clearInterval(heroTimer);
    });
}

function initBrandTabs() {
    document.querySelectorAll(".dynamic-brand-showcase").forEach(section => {
        const tabsData = section._tabsData || [];
        const tabsList = section.querySelectorAll(".cc-cat-tabs li");
        const grid = section.querySelector(".cc-cat-grid");
        const showAllBtn = section.querySelector(".cc-brand-show-all-btn");
        const controller = new AbortController();

        tabsList.forEach(tab => {
            tab.addEventListener("click", function () {
                const idx = Number(this.dataset.tabIdx);
                const data = tabsData[idx];
                if (!data || !grid) return;

                tabsList.forEach(t => t.classList.remove("active"));
                this.classList.add("active");
                const tabProds = resolveTabProducts(data);
                grid.innerHTML = tabProds.length 
                    ? tabProds.map(p => renderProductCard(p, false)).join("")
                    : '<div style="grid-column: 1 / -1; text-align:center; padding:36px 16px; color:#64748b; font-size:14px; font-weight:600;">No products available for this brand.</div>';

                if (showAllBtn) {
                    const brandName = data.brandName || "";
                    const brandSlug = String(brandName || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
                    showAllBtn.href = brandName ? `./collection.html?collection=${encodeURIComponent(brandSlug || brandName)}` : "./collection.html";
                    showAllBtn.innerHTML = `Show all in ${escapeHtml(brandName || 'Brand')} &rarr;`;
                }
            }, { signal: controller.signal });
        });

        registerCleanup(() => controller.abort());
    });
}

function initScrollAnimations() {
    if (isPreviewMode) {
        document.querySelectorAll(".care-strip-item, .care-finder-tile, .cc-product-card, .cc-brick-block").forEach(el => {
            el.classList.add("is-visible");
        });
        return;
    }

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add("is-visible");
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.12 });

    document.querySelectorAll(".care-strip-item, .care-finder-tile, .cc-product-card, .cc-brick-block").forEach(el => {
        el.classList.add("reveal-on-scroll");
        observer.observe(el);
    });

    registerCleanup(() => observer.disconnect());
}

function initCartDelegation() {
    const controller = new AbortController();

    document.addEventListener("click", function (event) {
        if (isPreviewMode) return;

        const addBtn = event.target.closest(".add-card-btn");
        if (addBtn) {
            event.preventDefault();
            event.stopPropagation();
            const productId = addBtn.dataset.productId;
            const product = productCatalog.find(p => p.id === productId);
            const card = addBtn.closest(".cc-product-card");
            if (product && !productHasVisiblePrice(product)) return;

            const item = product ? {
                id: product.id,
                title: product.title,
                brand: product.brand,
                imageUrl: product.imageUrl,
                oldPrice: product.oldPrice,
                newPrice: product.newPrice,
                price: product.newPriceValue,
                url: window.HeliomedProductUrls.productPath(product)
            } : (card && window.HeliomedCart?.itemFromCard(card));

            if (item && window.HeliomedCart) {
                window.HeliomedCart.addItem(item, 1);
                addBtn.textContent = "Added";
                setTimeout(() => { addBtn.textContent = "Add"; }, 1200);

                const toast = document.querySelector(".toast-message");
                if (toast) {
                    toast.textContent = (item.title || "Product") + " added to cart.";
                    toast.classList.add("show");
                    setTimeout(() => toast.classList.remove("show"), 2200);
                }
            }
            return;
        }

        const wishBtn = event.target.closest(".wishlist-btn");
        if (wishBtn) {
            event.preventDefault();
            event.stopPropagation();
            const productId = wishBtn.dataset.productId;
            const product = productCatalog.find(p => p.id === productId);
            const card = wishBtn.closest(".cc-product-card");

            const item = product ? {
                id: product.id,
                title: product.title,
                brand: product.brand,
                imageUrl: product.imageUrl,
                oldPrice: product.oldPrice,
                newPrice: product.newPrice,
                price: product.newPriceValue,
                url: window.HeliomedProductUrls.productPath(product)
            } : (card && window.HeliomedCart?.itemFromCard(card));

            if (item && window.HeliomedWishlist) {
                const saved = window.HeliomedWishlist.toggleItem(item);
                const icon = wishBtn.querySelector("i");
                if (icon) icon.className = (saved ? "fas" : "far") + " fa-heart";

                const toast = document.querySelector(".toast-message");
                if (toast) {
                    toast.textContent = (item.title || "Product") + (saved ? " added to wishlist." : " removed from wishlist.");
                    toast.classList.add("show");
                    setTimeout(() => toast.classList.remove("show"), 2200);
                }
            }
            return;
        }

        const card = event.target.closest(".cc-product-card");
        if (card && !event.target.closest("a") && !event.target.closest("button")) {
            const url = card.dataset.productUrl;
            if (url && url !== "#") {
                window.location.href = url;
            }
        }
    }, { signal: controller.signal });

    document.querySelectorAll(".care-finder-tile").forEach(tile => {
        tile.addEventListener("click", function () {
            const href = this.dataset.href;
            if (href && href !== "#" && !isPreviewMode) window.location.href = href;
        }, { signal: controller.signal });
    });

    registerCleanup(() => controller.abort());
}

function getDefaultHomepageLayout() {
    const brands = Array.from(new Set(productCatalog.map(p => p.brand).filter(Boolean)));
    const brandTabs = (brands.length ? brands.slice(0, 4) : ["Pro-Bio Pharma", "Dietpharm"]).map(brand => ({
        brandName: brand,
        productIds: []
    }));

    return {
        sections: [
            {
                id: "sec_hero",
                type: "hero_carousel",
                title: "Hero Carousel",
                subtitle: "",
                active: true,
                bgColor: "#FFFFFF",
                accentColor: "#C2A26B",
                slides: [
                    {
                        headline: "Care You Can Trust at Home",
                        kicker: "Heliomed Essentials",
                        copy: "Daily parapharmacy, beauty, wellness, and recovery essentials organized for fast decisions.",
                        primaryCtaText: "Shop Daily Care",
                        primaryCtaUrl: "./collection.html?collection=parapharmacy",
                        secondaryCtaText: "Find by concern",
                        secondaryCtaUrl: "#concerns",
                        bgColor: "#FFFFFF",
                        accentColor: "#C2A26B",
                        headlineColor: "#07111F",
                        copyColor: "#4D5B66",
                        kickerColor: "#C2A26B",
                        buttonBgColor: "#C2A26B",
                        buttonTextColor: "#FFFFFF",
                        linkColor: "#07111F",
                        linkLineColor: "#C2A26B",
                        highlightsBgColor: "transparent",
                        highlightsTextColor: "#07111F",
                        highlightsLineColor: "#C2A26B",
                        imageUrl: "https://images.unsplash.com/photo-1563467410-57df8894e173?q=80&w=800&auto=format&fit=crop",
                        highlights: ["Supplements & Vitamins", "Skin & Beauty", "Recovery Care"]
                    }
                ]
            },
            {
                id: "sec_trust",
                type: "trust_strip",
                title: "Trust Badges",
                active: true,
                items: [
                    { icon: "fas fa-shield-heart", title: "Expert-curated parapharmacy selection" },
                    { icon: "fas fa-truck-fast", title: "Delivery across Lebanon" },
                    { icon: "fas fa-money-bill-wave", title: "COD and Whish Money checkout" }
                ]
            },
            {
                id: "sec_cat",
                type: "category_finder",
                title: "Shop by Category",
                subtitle: "Jump straight into the main Heliomed departments.",
                active: true,
                cards: [
                    { icon: "fas fa-capsules", title: "Vitamins & Supplements", subtitle: "Energy, immunity, sleep, and joint support.", targetUrl: "./collection.html?collection=supplements" },
                    { icon: "fas fa-spa", title: "Beauty & Skin Care", subtitle: "Skincare, haircare, and cosmetics.", targetUrl: "./collection.html?collection=skin-care" },
                    { icon: "fas fa-baby", title: "Mother & Baby", subtitle: "Gentle daily care for babies and mothers.", targetUrl: "./collection.html?collection=baby-care" },
                    { icon: "fas fa-stethoscope", title: "Medical Devices", subtitle: "Home health essentials and diagnostics.", targetUrl: "./collection.html?collection=medical-supplies" }
                ]
            },
            {
                id: "sec_promo1",
                type: "split_promo",
                title: "Featured Product Picks",
                subtitle: "Curated selections from the live catalog",
                direction: "normal",
                active: true,
                bgColor: "#FFFFFF",
                bannerBgColor: "#FFFFFF",
                bannerTextColor: "dark",
                imageUrl: "",
                ctaText: "Shop Featured Picks",
                ctaUrl: "./collection.html?collection=offers",
                productIds: []
            },
            {
                id: "sec_brands",
                type: "brand_showcase",
                title: "Popular Brands",
                subtitle: "Trusted beauty, wellness, and healthcare names",
                active: true,
                tabs: brandTabs
            },
            {
                id: "sec_spotlight",
                type: "collection_showcase",
                title: "Featured Products",
                subtitle: "Explore our full catalog of vitamins, wellness, and care essentials",
                active: true,
                bgColor: "#FFFFFF",
                accentColor: "#C2A26B",
                collectionId: "",
                ctaText: "Browse All Products",
                ctaUrl: "./collection.html?collection=parapharmacy",
                productIds: []
            },
            {
                id: "sec_concerns",
                type: "concern_masonry",
                title: "Shop by Concern",
                subtitle: "Start with what you need help with.",
                active: true,
                bricks: [
                    { size: "tall", title: "Repair Your Skin Barrier", subtitle: "Cleansers and recovery creams", bgColor: "#e5dde3", imageUrl: "", targetUrl: "./collection.html?collection=skin-care" },
                    { size: "square", title: "Daily Wellness", subtitle: "Vitamins and supplements", bgColor: "#d6bcb1", imageUrl: "", targetUrl: "./collection.html?collection=supplements" },
                    { size: "square", title: "Mother & Baby", subtitle: "Gentle everyday basics", bgColor: "#cfc2c6", imageUrl: "", targetUrl: "./collection.html?collection=baby-care" },
                    { size: "wide_top", title: "Supports & Recovery", subtitle: "Braces and movement care", bgColor: "#d8c5bd", imageUrl: "", targetUrl: "./collection.html?collection=medical-supplies" },
                    { size: "wide_bottom", title: "Beauty Basics", subtitle: "Hair, nails, and makeup", bgColor: "#cbb8b8", imageUrl: "", targetUrl: "./collection.html?collection=makeup" }
                ]
            }
        ]
    };
}

function initPreviewSelection() {
    const controller = new AbortController();
    document.addEventListener("click", function (event) {
        const section = event.target.closest("[data-cms-section-id]");
        if (!section) return;

        const isInteractiveControl = Boolean(
            event.target.closest(".slider-arrow") ||
            event.target.closest(".cc-cat-tabs li") ||
            event.target.closest(".add-card-btn") ||
            event.target.closest(".wishlist-btn")
        );

        if (!isInteractiveControl && event.target.closest("a, button")) {
            event.preventDefault();
        }

        selectedSectionId = section.dataset.cmsSectionId;
        document.querySelectorAll("[data-cms-section-id]").forEach(el => {
            el.classList.toggle("cms-preview-selected", el === section);
        });

        window.parent.postMessage({
            type: "CMS_PREVIEW_SECTION_SELECT",
            sectionId: section.dataset.cmsSectionId,
            index: Number(section.dataset.cmsSectionIndex)
        }, window.location.origin);
    }, { signal: controller.signal });
    registerCleanup(() => controller.abort());
}

function escapeHtml(val) {
    return String(val ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
    }[char]));
}
