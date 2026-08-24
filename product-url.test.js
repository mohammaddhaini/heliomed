const assert = require("node:assert/strict");
const test = require("node:test");

const { productPath, productSlug, slugify } = require("./product-url.js");

test("slugify normalizes product titles for URL paths", () => {
  assert.equal(slugify("  Vitamin C 1000mg + Zinc!  "), "vitamin-c-1000mg-zinc");
  assert.equal(slugify(""), "product");
});

test("productSlug appends the stable Firestore document id", () => {
  assert.equal(
    productSlug({ id: "ABC_123", title: "Baby Care / Cream" }),
    "baby-care-cream-abc_123"
  );
});

test("productPath returns the generated static product URL", () => {
  assert.equal(
    productPath({ id: "med-7", title: "Cold & Flu" }),
    "./product/cold-flu-med-7/"
  );
});

test("productSlug rejects products without document ids", () => {
  assert.throws(() => productSlug({ title: "No ID" }), /document ID/);
});
