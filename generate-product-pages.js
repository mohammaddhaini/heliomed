/**
 * Static product page generator for Heliomed.
 *
 * Pulls every doc from Firestore "medicines", and for each one writes a
 * static HTML file at:  dist/product/<slug>/index.html
 *
 * Each file has real <title>, <meta description>, OG tags, and JSON-LD
 * Product schema baked into the markup so search engines index unique,
 * crawlable content per product — no JS execution required.
 *
 * The existing client-side app (productdetail.html + its script) still
 * runs on top for interactivity (cart, variants, reviews). This script
 * clones productdetail.html and injects server-known data plus the Firestore
 * document ID needed to hydrate the generated slug URL.
 *
 * USAGE:
 *   1. npm install firebase-admin
 *   2. Set FIREBASE_SERVICE_ACCOUNT_JSON to the complete service-account JSON.
 *      In Cloudflare Pages, store it as an encrypted environment variable.
 *   3. Edit CONFIG below (domain, collection name if different)
 *   4. npm run build
 *   5. Deploy the `dist/` folder to Cloudflare Pages (or copy dist/product/*
 *      into your existing site root before deploying)
 */

const fs = require("fs");
const path = require("path");
const { cert, initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { isProductAvailable, productSlug } = require("./product-url.js");

// ---------------------------------------------------------------------------
// CONFIG — edit these
// ---------------------------------------------------------------------------
const CONFIG = {
  domain: "https://heliomed-lb.com",
  collection: "medicines",
  templatePath: path.join(__dirname, "productdetail.html"), // your existing file
  outDir: path.join(__dirname, "dist", "product"),
  siteName: "Heliomed",
};

// ---------------------------------------------------------------------------
// Init Firebase Admin
// ---------------------------------------------------------------------------
const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

if (!serviceAccountJson) {
  throw new Error(
    "Missing FIREBASE_SERVICE_ACCOUNT_JSON. Configure it as an encrypted build secret."
  );
}

let serviceAccount;
try {
  serviceAccount = JSON.parse(serviceAccountJson);
} catch {
  throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON must contain valid JSON.");
}

initializeApp({
  credential: cert(serviceAccount),
});
const db = getFirestore();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttr(str) {
  return escapeHtml(str);
}

function jsonForInlineScript(value) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

function stripTags(str) {
  return String(str || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function metaDescription(product) {
  const raw = product.description || `${product.title} from ${product.brand || CONFIG.siteName}.`;
  const text = stripTags(raw);
  return text.length > 155 ? text.slice(0, 152).trimEnd() + "..." : text;
}

function priceValue(product) {
  return Number(product.newPriceValue ?? 0) || Number(product.oldPriceValue ?? 0) || undefined;
}

function replaceRequired(html, pattern, replacement, label) {
  if (!pattern.test(html)) {
    throw new Error(`Product template is missing required ${label}.`);
  }

  return html.replace(pattern, replacement);
}

// ---------------------------------------------------------------------------
// Build one product page
// ---------------------------------------------------------------------------
function buildProductHtml(template, product, slug) {
  const canonicalUrl = `${CONFIG.domain}/product/${slug}/`;
  const title = `${product.title} | ${CONFIG.siteName}`;
  const description = metaDescription(product);
  const imageUrl = product.imageUrl || (product.variants?.[0]?.imageUrl) || "";
  const price = priceValue(product);

  const jsonLd = {
    "@context": "https://schema.org/",
    "@type": "Product",
    name: product.title,
    description: stripTags(product.description || description),
    brand: { "@type": "Brand", name: product.brand || CONFIG.siteName },
    ...(imageUrl ? { image: [imageUrl] } : {}),
    ...(price
      ? {
          offers: {
            "@type": "Offer",
            url: canonicalUrl,
            priceCurrency: "USD",
            price: price,
            availability: product.available === false
              ? "https://schema.org/OutOfStock"
              : "https://schema.org/InStock",
          },
        }
      : {}),
  };

  // Prerendered content block: crawlers see this immediately.
  // The existing client script still runs and will populate/replace
  // the same elements once Firestore loads (harmless double-render).
  const prerenderedBlock = `
    <h1 id="ssg-title">${escapeHtml(product.title)}</h1>
    <p id="ssg-brand">${escapeHtml(product.brand || "")}</p>
    <p id="ssg-description">${escapeHtml(stripTags(product.description || ""))}</p>
    ${price ? `<p id="ssg-price">$${escapeHtml(String(price))}</p>` : ""}
    ${imageUrl ? `<img id="ssg-image" src="${escapeAttr(imageUrl)}" alt="${escapeAttr(product.title)}" width="600" height="600" loading="eager">` : ""}
  `.trim();

  let html = template;

  // 1. Title
  html = replaceRequired(
    html,
    /<title>.*?<\/title>/s,
    `<title>${escapeHtml(title)}</title>`,
    "<title> tag"
  );

  // 2. Meta description
  html = replaceRequired(
    html,
    /<meta name="description" content=".*?">/s,
    `<meta name="description" content="${escapeAttr(description)}">`,
    "meta description tag"
  );

  // 3. Inject canonical + OG tags + JSON-LD + noscript fallback right after <title>
  const headExtras = `
    <base href="/">
    <link rel="canonical" href="${escapeAttr(canonicalUrl)}">
    <meta property="og:type" content="product">
    <meta property="og:title" content="${escapeAttr(title)}">
    <meta property="og:description" content="${escapeAttr(description)}">
    <meta property="og:url" content="${escapeAttr(canonicalUrl)}">
    ${imageUrl ? `<meta property="og:image" content="${escapeAttr(imageUrl)}">` : ""}
    <script type="application/ld+json">${jsonForInlineScript(jsonLd)}</script>
    <script>window.__PRERENDERED_PRODUCT_ID__ = ${jsonForInlineScript(product.id)};</script>
`;
  html = replaceRequired(html, /<title>/, `${headExtras}\n    <title>`, "<title> insertion point");

  // 4. Keep the Firestore-backed content visible in the initial document.
  //    The client removes this block after it renders the interactive layout.
  html = replaceRequired(
    html,
    /<body([^>]*)>/,
    `<body$1>\n    <main id="ssg-fallback" style="max-width:1200px;margin:40px auto;padding:24px">${prerenderedBlock}</main>`,
    "<body> tag"
  );

  return html;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  if (!fs.existsSync(CONFIG.templatePath)) {
    console.error(`Template not found at ${CONFIG.templatePath}. Copy your productdetail.html next to this script.`);
    process.exit(1);
  }
  const template = fs.readFileSync(CONFIG.templatePath, "utf8");

  const snapshot = await db.collection(CONFIG.collection).get();
  if (snapshot.empty) {
    console.error(`No documents found in "${CONFIG.collection}".`);
    process.exit(1);
  }

  fs.rmSync(CONFIG.outDir, { recursive: true, force: true });
  fs.mkdirSync(CONFIG.outDir, { recursive: true });

  const sitemapEntries = [];
  let skippedUnavailable = 0;

  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    const product = { id: docSnap.id, ...data };

    if (!isProductAvailable(product)) {
      skippedUnavailable += 1;
      return;
    }

    const slug = productSlug(product);

    const html = buildProductHtml(template, product, slug);

    const pageDir = path.join(CONFIG.outDir, slug);
    fs.mkdirSync(pageDir, { recursive: true });
    fs.writeFileSync(path.join(pageDir, "index.html"), html, "utf8");

    sitemapEntries.push(`${CONFIG.domain}/product/${slug}/`);
  });

  // sitemap.xml
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapEntries.map((u) => `  <url><loc>${u}</loc></url>`).join("\n")}
</urlset>
`;
  fs.writeFileSync(path.join(__dirname, "dist", "sitemap.xml"), sitemap, "utf8");

  console.log(`Generated ${sitemapEntries.length} product pages in ${CONFIG.outDir}`);
  console.log(`Skipped ${skippedUnavailable} unavailable products`);
  console.log(`Sitemap written to dist/sitemap.xml`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
