const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const ROOT_DIR = __dirname;
const DIST_DIR = path.join(ROOT_DIR, "dist");

// Explicit allowlist: only browser-facing files are published.
const PUBLIC_FILES = [
  "account.html",
  "admin.html",
  "brand.html",
  "cart.html",
  "cart.js",
  "checkout.html",
  "collection.html",
  "firebase-init.js",
  "header.css",
  "header.js",
  "heliomed-logo.png",
  "icon.ico",
  "icon.png",
  "index-cms.js",
  "index.html",
  "navbar-categories.js",
  "order-confirmation.html",
  "productdetail.html",
  "products-cache.js",
  "responsive.css",
  "search.html",
  "track-order.html",
  "wishlist.html",
  "wishlist.js",
];

function copyPublicSite() {
  const missingFiles = PUBLIC_FILES.filter(
    (relativePath) => !fs.existsSync(path.join(ROOT_DIR, relativePath))
  );

  if (missingFiles.length > 0) {
    throw new Error(`Missing public files: ${missingFiles.join(", ")}`);
  }

  fs.rmSync(DIST_DIR, { recursive: true, force: true });
  fs.mkdirSync(DIST_DIR, { recursive: true });

  for (const relativePath of PUBLIC_FILES) {
    fs.copyFileSync(
      path.join(ROOT_DIR, relativePath),
      path.join(DIST_DIR, relativePath)
    );
  }

  fs.writeFileSync(
    path.join(DIST_DIR, "robots.txt"),
    [
      "User-agent: *",
      "Allow: /",
      "Sitemap: https://heliomed-lb.com/sitemap.xml",
      "",
    ].join("\n"),
    "utf8"
  );

  console.log(`Copied ${PUBLIC_FILES.length} public files into ${DIST_DIR}`);
}

function generateProductPages() {
  const result = spawnSync(process.execPath, ["generate-product-pages.js"], {
    cwd: ROOT_DIR,
    env: process.env,
    stdio: "inherit",
  });

  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`Product generation failed with exit code ${result.status}`);
  }
}

function main() {
  copyPublicSite();
  generateProductPages();
  console.log("Complete static site build finished successfully.");
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
