const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const ROOT = __dirname;
const STOREFRONT_PAGES = [
  "account.html",
  "brand.html",
  "cart.html",
  "checkout.html",
  "collection.html",
  "index.html",
  "order-confirmation.html",
  "productdetail.html",
  "search.html",
  "track-order.html",
  "wishlist.html",
];
const TRANSLATED_SCRIPTS = [
  "cart.js",
  "header.js",
  "index-cms.js",
  "navbar-categories.js",
];

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

function dictionaryKeys() {
  const source = read("i18n.js");
  const match = source.match(
    /var messages = \{\s*en: \{([\s\S]*?)\n\s*\},\s*ar: \{([\s\S]*?)\n\s*\}\s*\};/
  );
  assert.ok(match, "i18n.js should expose paired English and Arabic dictionaries");
  const keys = (body) => new Set(
    [...body.matchAll(/"([a-zA-Z0-9_.-]+)"\s*:/g)].map((item) => item[1])
  );
  return { en: keys(match[1]), ar: keys(match[2]) };
}

test("every storefront page loads the shared static i18n and RTL assets", () => {
  for (const page of STOREFRONT_PAGES) {
    const source = read(page);
    assert.match(source, /heliomed_lang/, `${page} should set direction before render`);
    assert.match(source, /i18n\.js/, `${page} should load i18n.js`);
    assert.match(source, /rtl\.css/, `${page} should load rtl.css`);
    assert.match(source, /header\.js/, `${page} should load the shared language switcher`);
  }
});

test("every storefront page loads the Cairo font and rtl.css enforces Cairo for Arabic", () => {
  for (const page of STOREFRONT_PAGES) {
    const source = read(page);
    assert.match(source, /family=Cairo/, `${page} should load Google Font Cairo`);
  }

  const rtlCss = read("rtl.css");
  assert.match(rtlCss, /family=Cairo/, "rtl.css should import Cairo font");
  assert.match(rtlCss, /font-family:\s*"Cairo"/, "rtl.css should apply Cairo to Arabic/RTL elements");
  assert.match(rtlCss, /font-family:\s*"Font Awesome 6 Free"/, "rtl.css should protect Font Awesome 6 Free icons");
  assert.match(rtlCss, /font-family:\s*"Font Awesome 6 Brands"/, "rtl.css should protect Font Awesome 6 Brands icons");
  assert.doesNotMatch(rtlCss, /(?:^|\n):lang\(ar\)\s*\{/, "rtl.css should not use bare :lang(ar) selector");
});

test("every referenced static translation key exists in both languages", () => {
  const { en, ar } = dictionaryKeys();
  assert.deepEqual([...en].sort(), [...ar].sort(), "English and Arabic keys should stay in sync");

  const used = new Set();
  for (const file of [...STOREFRONT_PAGES, ...TRANSLATED_SCRIPTS]) {
    const source = read(file);
    for (const match of source.matchAll(
      /data-i18n(?:-placeholder|-aria|-aria-label|-title|-value)?="([^"]+)"/g
    )) {
      used.add(match[1]);
    }
    for (const match of source.matchAll(/\bt\("([^"]+)"/g)) {
      if (!match[1].endsWith(".")) used.add(match[1]);
    }
  }

  const missing = [...used].filter((key) => !en.has(key));
  assert.deepEqual(missing, []);
});

function loadI18n(initialLang = "en") {
  let storedLang = initialLang;
  const document = {
    nodeType: 9,
    readyState: "complete",
    documentElement: { setAttribute() {} },
    addEventListener() {},
    querySelectorAll() { return []; },
    createTreeWalker() { return { nextNode() { return false; } }; },
  };
  const context = {
    window: { dispatchEvent() {} },
    document,
    localStorage: {
      getItem() { return storedLang; },
      setItem(_key, value) { storedLang = value; },
    },
    CustomEvent: class CustomEvent {},
    MutationObserver: class MutationObserver { observe() {} },
    NodeFilter: { SHOW_TEXT: 4, FILTER_REJECT: 2, FILTER_ACCEPT: 1 },
  };
  vm.runInNewContext(read("i18n.js"), context);
  return context.window.HeliomedI18n;
}

test("non-product CMS fields use Arabic values with English fallback", () => {
  const i18n = loadI18n("ar");
  assert.equal(i18n.contentValue({ title: "English", title_ar: "العربية" }, "title"), "العربية");
  assert.equal(i18n.contentValue({ title: "English", title_ar: "   " }, "title"), "English");
  assert.deepEqual(
    Array.from(i18n.contentValue({ highlights: ["Care"], highlights_ar: ["عناية"] }, "highlights")),
    ["عناية"]
  );
  i18n.setLang("en");
  assert.equal(i18n.contentValue({ title: "English", title_ar: "العربية" }, "title"), "English");
});

test("product schemas and product rendering do not opt into Arabic fields", () => {
  for (const file of ["productdetail.html", "cart.js", "search.html", "generate-product-pages.js"]) {
    assert.doesNotMatch(read(file), /\b(?:title|name|description|usage|warnings|brand|category)_ar\b/, `${file} must keep products unchanged`);
  }

  const adminProductSubmit = read("admin.html").match(
    /productForm\.addEventListener\("submit"[\s\S]*?productsTable\.addEventListener/
  );
  assert.ok(adminProductSubmit, "admin product save block should remain detectable");
  assert.doesNotMatch(adminProductSubmit[0], /\b\w+_ar\b/);

  const cmsProductNormalizer = read("index-cms.js").match(
    /function normalizeProductVariant[\s\S]*?function normalizeSearchText/
  );
  assert.ok(cmsProductNormalizer, "homepage product normalizer should remain detectable");
  assert.doesNotMatch(cmsProductNormalizer[0], /\b\w+_ar\b/);
});
