const { existsSync, readFileSync, writeFileSync } = require("node:fs");
const path = require("node:path");
const { cert, initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

const rootDir = path.resolve(__dirname, "..");
const outputPath = path.join(__dirname, "translations-to-fill.json");

const categoryFields = [{ source: "title", target: "title_ar" }];
const medicineFields = [
  { source: "title", target: "title_ar" },
  { source: "description", target: "description_ar" },
  { source: "usage", target: "usage_ar" },
  { source: "warnings", target: "warnings_ar" },
];
const homepageRootFields = [
  { source: "headline", target: "headline_ar" },
  { source: "kicker", target: "kicker_ar" },
  { source: "copy", target: "copy_ar" },
  { source: "primaryCtaText", target: "primaryCtaText_ar" },
];
const homepageSlideFields = [
  { source: "headline", target: "headline_ar" },
  { source: "kicker", target: "kicker_ar" },
  { source: "copy", target: "copy_ar" },
  { source: "primaryCtaText", target: "primaryCtaText_ar" },
  { source: "highlights", target: "highlights_ar" },
];
const homepageSectionFields = [
  { source: "title", target: "title_ar" },
  { source: "subtitle", target: "subtitle_ar" },
  { source: "ctaText", target: "ctaText_ar" },
];

function readFirebaseConfigProjectId() {
  const firebaseInitPath = path.join(rootDir, "firebase-init.js");
  if (!existsSync(firebaseInitPath)) return undefined;

  const match = readFileSync(firebaseInitPath, "utf8").match(/projectId:\s*["']([^"']+)["']/);
  return match?.[1];
}

function readServiceAccount() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
  }

  const serviceAccountPath = path.join(rootDir, "service-account.json");
  if (existsSync(serviceAccountPath)) {
    return JSON.parse(readFileSync(serviceAccountPath, "utf8"));
  }

  return null;
}

function initializeFirestore() {
  const serviceAccount = readServiceAccount();
  const projectId = serviceAccount?.project_id || readFirebaseConfigProjectId();

  if (!serviceAccount && !projectId) {
    throw new Error("Could not find service-account.json, FIREBASE_SERVICE_ACCOUNT_JSON, or projectId in firebase-init.js.");
  }

  initializeApp(
    serviceAccount
      ? { credential: cert(serviceAccount), projectId }
      : { projectId }
  );

  return getFirestore();
}

function hasArabicValue(value) {
  if (Array.isArray(value)) return value.some(hasArabicValue);
  return typeof value === "string" ? value.trim().length > 0 : value !== undefined && value !== null;
}

function targetPlaceholder(sourceValue, targetValue) {
  if (targetValue !== undefined && targetValue !== null) return targetValue;
  return Array.isArray(sourceValue) ? [] : "";
}

function missingFields(data, fields) {
  return fields.reduce((acc, field) => {
    if (!hasArabicValue(data?.[field.target])) {
      acc[field.target] = {
        sourceField: field.source,
        source: data?.[field.source] ?? "",
        target: targetPlaceholder(data?.[field.source], data?.[field.target]),
      };
    }

    return acc;
  }, {});
}

function hasEntries(value) {
  return value && Object.keys(value).length > 0;
}

function collectCategoryChildren(children, depth = 1) {
  if (!Array.isArray(children)) return [];

  return children.reduce((acc, child, index) => {
    const fields = missingFields(child, categoryFields);
    const entry = {
      index,
      sourceTitle: child?.title ?? "",
    };

    if (hasEntries(fields)) entry.fields = fields;
    if (depth < 2) {
      const nestedChildren = collectCategoryChildren(child?.children, depth + 1);
      if (nestedChildren.length > 0) entry.children = nestedChildren;
    }

    if (entry.fields || entry.children) acc.push(entry);
    return acc;
  }, []);
}

function collectHomepageItems(items, fields) {
  if (!Array.isArray(items)) return [];

  return items.reduce((acc, item, index) => {
    const missing = missingFields(item, fields);
    if (hasEntries(missing)) {
      acc.push({
        index,
        sourceTitle: item?.title || item?.headline || "",
        fields: missing,
      });
    }

    return acc;
  }, []);
}

async function exportCategories(db) {
  const snapshot = await db.collection("categories").get();
  const categories = [];

  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    const fields = missingFields(data, categoryFields);
    const children = collectCategoryChildren(data.children);
    const entry = {
      id: docSnap.id,
      path: `categories/${docSnap.id}`,
      sourceTitle: data.title ?? "",
    };

    if (hasEntries(fields)) entry.fields = fields;
    if (children.length > 0) entry.children = children;

    if (entry.fields || entry.children) categories.push(entry);
  });

  return categories;
}

async function exportMedicines(db) {
  const snapshot = await db.collection("medicines").get();
  const medicines = [];

  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    const fields = missingFields(data, medicineFields);

    if (hasEntries(fields)) {
      medicines.push({
        id: docSnap.id,
        path: `medicines/${docSnap.id}`,
        sourceTitle: data.title ?? "",
        fields,
      });
    }
  });

  return medicines;
}

async function exportHomepageLayout(db) {
  const docSnap = await db.collection("homepage_layout").doc("published").get();
  if (!docSnap.exists) return null;

  const data = docSnap.data();
  const fields = missingFields(data, homepageRootFields);
  const slides = collectHomepageItems(data.slides, homepageSlideFields);
  const sections = collectHomepageItems(data.sections, homepageSectionFields);

  if (!hasEntries(fields) && slides.length === 0 && sections.length === 0) {
    return null;
  }

  return {
    id: "published",
    path: "homepage_layout/published",
    ...(hasEntries(fields) ? { fields } : {}),
    ...(slides.length > 0 ? { slides } : {}),
    ...(sections.length > 0 ? { sections } : {}),
  };
}

async function main() {
  const db = initializeFirestore();

  console.log("Scanning Firestore for missing Arabic translations...");
  const [categories, medicines, homepageLayout] = await Promise.all([
    exportCategories(db),
    exportMedicines(db),
    exportHomepageLayout(db),
  ]);

  const exportData = {
    generatedAt: new Date().toISOString(),
    instructions: "Fill only the target values you want to upload. Empty strings and empty arrays are ignored by upload-translations.js.",
    collections: {
      categories,
      medicines,
      homepage_layout: homepageLayout,
    },
  };

  writeFileSync(outputPath, `${JSON.stringify(exportData, null, 2)}\n`, "utf8");

  console.log(`Wrote ${outputPath}`);
  console.log(`Categories needing translations: ${categories.length}`);
  console.log(`Medicines needing translations: ${medicines.length}`);
  console.log(`Homepage layout needs translations: ${homepageLayout ? "yes" : "no"}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
