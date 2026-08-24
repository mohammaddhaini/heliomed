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

  return {
    productPath,
    productSlug,
    slugify
  };
}));
