const { existsSync, readFileSync } = require("node:fs");
const path = require("node:path");
const { cert, initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

const rootDir = path.resolve(__dirname, "..");
const translationsPath = path.join(__dirname, "translations-to-fill.json");
const isDryRun = process.argv.includes("--dry-run");

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

function isFilled(value) {
  if (Array.isArray(value)) return value.some(isFilled);
  return typeof value === "string" ? value.trim().length > 0 : value !== undefined && value !== null;
}

function readTarget(fieldEntry) {
  if (!fieldEntry || typeof fieldEntry !== "object" || !("target" in fieldEntry)) return undefined;
  return fieldEntry.target;
}

function collectFilledFields(fields = {}) {
  return Object.entries(fields).reduce((acc, [fieldName, fieldEntry]) => {
    const value = readTarget(fieldEntry);
    if (isFilled(value)) acc[fieldName] = value;
    return acc;
  }, {});
}

function mergeChildTranslations(children, childEntries = []) {
  if (!Array.isArray(children)) return children;

  const nextChildren = children.map((child) => ({ ...child }));
  let changed = false;

  for (const childEntry of childEntries) {
    const index = Number(childEntry.index);
    if (!Number.isInteger(index) || !nextChildren[index]) continue;

    const fields = collectFilledFields(childEntry.fields);
    if (Object.keys(fields).length > 0) {
      Object.assign(nextChildren[index], fields);
      changed = true;
    }

    if (Array.isArray(childEntry.children) && Array.isArray(nextChildren[index].children)) {
      const mergedChildren = mergeChildTranslations(nextChildren[index].children, childEntry.children);
      if (mergedChildren !== nextChildren[index].children) {
        nextChildren[index].children = mergedChildren;
        changed = true;
      }
    }
  }

  return changed ? nextChildren : children;
}

function mergeIndexedTranslations(items, itemEntries = []) {
  if (!Array.isArray(items)) return items;

  const nextItems = items.map((item) => ({ ...item }));
  let changed = false;

  for (const itemEntry of itemEntries) {
    const index = Number(itemEntry.index);
    if (!Number.isInteger(index) || !nextItems[index]) continue;

    const fields = collectFilledFields(itemEntry.fields);
    if (Object.keys(fields).length > 0) {
      Object.assign(nextItems[index], fields);
      changed = true;
    }
  }

  return changed ? nextItems : items;
}

function describeUpdate(collectionName, id, update) {
  const keys = Object.keys(update);
  return `${collectionName}/${id}: ${keys.join(", ")}`;
}

async function queueMerge(batchState, db, ref, update, description) {
  if (Object.keys(update).length === 0) return;

  batchState.descriptions.push(description);
  if (isDryRun) return;

  batchState.batch.set(ref, update, { merge: true });
  batchState.pendingWrites += 1;

  if (batchState.pendingWrites >= 450) {
    await batchState.batch.commit();
    batchState.batch = db.batch();
    batchState.pendingWrites = 0;
  }
}

async function queueCategories(batchState, db, categories = []) {
  for (const category of categories || []) {
    const ref = db.collection("categories").doc(category.id);
    const update = collectFilledFields(category.fields);

    if (Array.isArray(category.children) && category.children.length > 0) {
      const docSnap = await ref.get();
      if (docSnap.exists) {
        const children = docSnap.get("children");
        const nextChildren = mergeChildTranslations(children, category.children);
        if (nextChildren !== children) update.children = nextChildren;
      }
    }

    await queueMerge(batchState, db, ref, update, describeUpdate("categories", category.id, update));
  }
}

async function queueMedicines(batchState, db, medicines = []) {
  for (const medicine of medicines || []) {
    const ref = db.collection("medicines").doc(medicine.id);
    const update = collectFilledFields(medicine.fields);
    await queueMerge(batchState, db, ref, update, describeUpdate("medicines", medicine.id, update));
  }
}

async function queueHomepageLayout(batchState, db, homepageLayout) {
  if (!homepageLayout) return;

  const ref = db.collection("homepage_layout").doc("published");
  const update = collectFilledFields(homepageLayout.fields);

  if (Array.isArray(homepageLayout.slides) && homepageLayout.slides.length > 0) {
    const docSnap = await ref.get();
    if (docSnap.exists) {
      const slides = docSnap.get("slides");
      const nextSlides = mergeIndexedTranslations(slides, homepageLayout.slides);
      if (nextSlides !== slides) update.slides = nextSlides;
    }
  }

  if (Array.isArray(homepageLayout.sections) && homepageLayout.sections.length > 0) {
    const docSnap = await ref.get();
    if (docSnap.exists) {
      const sections = docSnap.get("sections");
      const nextSections = mergeIndexedTranslations(sections, homepageLayout.sections);
      if (nextSections !== sections) update.sections = nextSections;
    }
  }

  await queueMerge(batchState, db, ref, update, describeUpdate("homepage_layout", "published", update));
}

async function main() {
  if (!existsSync(translationsPath)) {
    throw new Error(`Missing ${translationsPath}. Run node scripts/export-missing-translations.js first.`);
  }

  const translations = JSON.parse(readFileSync(translationsPath, "utf8"));
  const db = initializeFirestore();
  const batchState = {
    batch: db.batch(),
    pendingWrites: 0,
    descriptions: [],
  };

  console.log(`${isDryRun ? "Dry run: previewing" : "Uploading"} filled Arabic translations...`);

  await queueCategories(batchState, db, translations.collections?.categories);
  await queueMedicines(batchState, db, translations.collections?.medicines);
  await queueHomepageLayout(batchState, db, translations.collections?.homepage_layout);

  if (!isDryRun && batchState.pendingWrites > 0) {
    await batchState.batch.commit();
  }

  if (batchState.descriptions.length === 0) {
    console.log("No filled Arabic target fields found. Nothing to upload.");
    return;
  }

  for (const description of batchState.descriptions) {
    console.log(`- ${description}`);
  }

  console.log(`${isDryRun ? "Dry run complete" : "Upload complete"}: ${batchState.descriptions.length} document(s) with translation updates.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
