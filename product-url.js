(function (root, factory) {
  const api = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = api;
  } else {
    root.HeliomedProductUrls = api;
  }
}(typeof globalThis !== "undefined" ? globalThis : this, function () {
  function slugify(value) {
    return String(value || "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "product";
  }

  function productSlug(product) {
    const idPart = String(product && product.id || "")
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "");

    if (!idPart) {
      throw new Error("Cannot generate a stable product slug without a document ID.");
    }

    return slugify(product && product.title) + "-" + idPart;
  }

  function productPath(product) {
    return "./product/" + productSlug(product) + "/";
  }

  function isProductAvailable(product) {
    if (!product || product.available === false) return false;
    if (product.inventory !== undefined && product.inventory !== null && product.inventory !== "") {
      const inventory = Number(product.inventory);
      if (Number.isFinite(inventory) && inventory <= 0) return false;
    }
    const badge = String(product.badge || "").toLowerCase();
    return !badge.includes("sold out") && !badge.includes("out of stock");
  }

  return {
    isProductAvailable,
    productPath,
    productSlug,
    slugify
  };
}));
