#!/usr/bin/env node
/**
 * upload-gms-from-excel.js
 * 
 * End-to-end uploader that reads:
 *   - Excel: "C:\Users\dr laptop\Downloads\GMS_PRODUCTS.xlsx"
 *   - Images: "C:\Users\dr laptop\Downloads\HELIO-MED-products-batches-01-to-09-COMPLETE\images"
 * 
 * Uploads photos to Firebase Storage bucket (heliomed-13855.firebasestorage.app)
 * and writes/merges product documents into Firestore ("medicines" collection).
 * 
 * Usage:
 *   node scripts/upload-gms-from-excel.js [options]
 * 
 * Options:
 *   --dry-run          Simulate without making changes to Storage or Firestore
 *   --upload-images    Upload local image files to Firebase Storage (products/<slug>/...)
 *   --skip-images      Skip Storage binary upload; update Firestore doc data only
 *   --sync-local       Sync images from Downloads to scripts/gms-images/ in repo first
 *   --refresh          Re-run parse-gms-excel.py to regenerate JSON before uploading
 *   --limit <number>   Process only the first N products
 *   --from <number>    Start processing from 1-based product index
 *   --slug <slug>      Process only a single product matching this slug or title
 *   --batch-size <N>   Firestore batch write size (default: 25)
 *   --excel <path>     Custom path to GMS_PRODUCTS.xlsx
 *   --images <path>    Custom path to images directory
 *   --help             Show help documentation
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { getStorage, getDownloadURL } = require("firebase-admin/storage");

const DEFAULT_EXCEL_PATH = "C:\\Users\\dr laptop\\Downloads\\GMS_PRODUCTS.xlsx";
const DEFAULT_IMAGES_DIR = "C:\\Users\\dr laptop\\Downloads\\HELIO-MED-products-batches-01-to-09-COMPLETE\\images";
const STORAGE_BUCKET = "heliomed-13855.firebasestorage.app";
const SERVICE_ACCOUNT_PATH = path.join(__dirname, "..", "service-account.json");
const EXTRACTED_JSON_PATH = path.join(__dirname, "gms-products-extracted.json");
const PARSER_SCRIPT_PATH = path.join(__dirname, "parse-gms-excel.py");

// Parse CLI flags
const args = process.argv.slice(2);

function getArgValue(flag) {
    const idx = args.indexOf(flag);
    if (idx !== -1 && idx + 1 < args.length) {
        return args[idx + 1];
    }
    const prefix = flag + "=";
    const found = args.find(a => a.startsWith(prefix));
    return found ? found.substring(prefix.length) : null;
}

const isHelp = args.includes("--help") || args.includes("-h");
const isDryRun = args.includes("--dry-run");
const shouldUploadImages = args.includes("--upload-images") || (!args.includes("--skip-images") && !isDryRun);
const shouldSkipImages = args.includes("--skip-images");
const shouldSyncLocal = args.includes("--sync-local");
const shouldRefresh = args.includes("--refresh");
const limitArg = parseInt(getArgValue("--limit") || "0", 10);
const fromArg = parseInt(getArgValue("--from") || "1", 10);
const targetSlug = (getArgValue("--slug") || "").toLowerCase().trim();
const batchSize = parseInt(getArgValue("--batch-size") || "25", 10);
const customExcel = getArgValue("--excel") || DEFAULT_EXCEL_PATH;
const customImages = getArgValue("--images") || DEFAULT_IMAGES_DIR;

if (isHelp) {
    console.log(`
================================================================================
 GMS Products Excel & Images Firebase Uploader
================================================================================

Description:
  Reads GMS_PRODUCTS.xlsx and images from HELIO-MED-products-batches-01-to-09-COMPLETE,
  uploads product images to Firebase Storage, and writes/merges product documents
  into Firestore collection "medicines".

Usage:
  node scripts/upload-gms-from-excel.js [options]

Options:
  --dry-run          Validate everything, print sample output, do not write to Firebase
  --upload-images    Upload image files to Firebase Storage (default when not --dry-run)
  --skip-images      Do not upload images to Storage; only write product data in Firestore
  --sync-local       Copy images from Downloads into scripts/gms-images/ in the workspace
  --refresh          Re-run parse-gms-excel.py to re-extract fresh data from Excel
  --limit <N>        Process only first N products (useful for testing)
  --from <N>         Start processing from product index N (1-based)
  --slug <slug>      Process only a specific product matching this slug or title
  --batch-size <N>   Number of documents per Firestore batch write (default: 25)
  --excel <path>     Custom path to GMS_PRODUCTS.xlsx
  --images <path>    Custom path to images directory
  --help, -h         Show this help message

Examples:
  # 1. Preview products without changing Firebase
  node scripts/upload-gms-from-excel.js --dry-run

  # 2. Test full upload (Storage + Firestore) on first 3 products
  node scripts/upload-gms-from-excel.js --upload-images --limit 3

  # 3. Upload a single product by slug
  node scripts/upload-gms-from-excel.js --upload-images --slug silicone-knee-brace

  # 4. Upload all 130 products and photos to Firebase
  node scripts/upload-gms-from-excel.js --upload-images
================================================================================
`);
    process.exit(0);
}

function getContentType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    switch (ext) {
        case ".webp": return "image/webp";
        case ".png": return "image/png";
        case ".jpg":
        case ".jpeg": return "image/jpeg";
        case ".jfif": return "image/jpeg";
        default: return "image/jpeg";
    }
}

function slug(value) {
    return String(value || "product")
        .toLowerCase()
        .replace(/&/g, " and ")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 120) || "product";
}

async function main() {
    console.log("================================================================================");
    console.log(" GMS Products Excel & Images Firebase Pipeline");
    console.log("================================================================================");
    console.log(` Mode:           ${isDryRun ? "DRY RUN (No Firebase mutations)" : "LIVE EXECUTION"}`);
    console.log(` Upload Images:  ${!shouldSkipImages && !isDryRun ? "YES (to Firebase Storage)" : "NO"}`);
    console.log(` Excel Path:     ${customExcel}`);
    console.log(` Images Dir:     ${customImages}`);
    console.log(` Service Account:${SERVICE_ACCOUNT_PATH}`);
    console.log("--------------------------------------------------------------------------------");

    // 1. Check / Sync local images if requested
    if (shouldSyncLocal) {
        console.log("\n[STEP 1] Syncing images into scripts/gms-images/...");
        try {
            execSync(`python "${path.join(__dirname, "sync-gms-local-images.py")}" --src "${customImages}"`, { stdio: "inherit" });
        } catch (err) {
            console.error("Image sync error:", err.message);
        }
    }

    // 2. Extract or reload JSON
    if (shouldRefresh || !fs.existsSync(EXTRACTED_JSON_PATH)) {
        console.log("\n[STEP 2] Running parse-gms-excel.py to extract latest Excel data...");
        try {
            execSync(`python "${PARSER_SCRIPT_PATH}" --excel "${customExcel}" --images "${customImages}"`, { stdio: "inherit" });
        } catch (err) {
            console.error("Excel parsing failed:", err.message);
            process.exit(1);
        }
    } else {
        console.log("\n[STEP 2] Loading existing extracted dataset from gms-products-extracted.json...");
    }

    const rawData = JSON.parse(fs.readFileSync(EXTRACTED_JSON_PATH, "utf8"));
    console.log(`Loaded ${rawData.length} products from extracted catalog.`);

    // 3. Filter products based on CLI options
    let products = rawData;
    if (targetSlug) {
        products = products.filter(p => (p.docId || slug(p.title)).toLowerCase().includes(targetSlug) || p.title.toLowerCase().includes(targetSlug));
        console.log(`Filtered by slug "${targetSlug}": found ${products.length} product(s).`);
        if (products.length === 0) {
            console.log("No matching product found. Exiting.");
            process.exit(0);
        }
    }

    if (fromArg > 1) {
        products = products.slice(fromArg - 1);
        console.log(`Starting from product index ${fromArg}. Remaining: ${products.length}.`);
    }

    if (limitArg > 0) {
        products = products.slice(0, limitArg);
        console.log(`Applied limit: processing first ${products.length} product(s).`);
    }

    // 4. Initialize Firebase Admin if not in dry-run
    let db = null;
    let bucket = null;

    if (!isDryRun) {
        if (!fs.existsSync(SERVICE_ACCOUNT_PATH)) {
            throw new Error(`service-account.json not found at ${SERVICE_ACCOUNT_PATH}. Required for live execution.`);
        }
        const serviceAccount = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_PATH, "utf8"));
        const app = initializeApp({
            credential: cert(serviceAccount),
            storageBucket: STORAGE_BUCKET
        }, "gms-uploader-" + Date.now());

        db = getFirestore(app);
        bucket = getStorage(app).bucket();
        console.log(`\n[STEP 3] Connected to Firebase Project: ${serviceAccount.project_id}`);
        console.log(`Storage Bucket: ${STORAGE_BUCKET}`);
    } else {
        console.log("\n[STEP 3] DRY RUN: Skipping Firebase Admin initialization.");
    }

    // 5. Process products
    console.log("\n[STEP 4] Processing products...");
    let processedCount = 0;
    let uploadedImagesCount = 0;
    let firestoreWrittenCount = 0;

    const batches = [];
    let currentBatch = db ? db.batch() : null;
    let currentBatchSize = 0;

    for (let i = 0; i < products.length; i++) {
        const item = products[i];
        const docId = item.docId || slug(item.title);
        const indexLabel = `[${i + 1}/${products.length}]`;

        console.log(`\n${indexLabel} Product: "${item.title}" (ID: ${docId})`);
        console.log(`  Category: ${item.category} | Price: ${item.newPrice || "[NO PRICE]"} | Brand: ${item.brand}`);

        // Resolve local images
        let localFiles = item.absoluteImageFiles || [];
        // If absolute paths not in JSON or don't exist, build from customImages
        if (!localFiles.length || !fs.existsSync(localFiles[0])) {
            const folderName = item.imageFolder;
            if (folderName) {
                const folderPath = path.join(customImages, folderName);
                if (fs.existsSync(folderPath)) {
                    localFiles = fs.readdirSync(folderPath)
                        .filter(f => f.match(/\.(webp|jpg|jpeg|png|jfif)$/i))
                        .sort()
                        .map(f => path.join(folderPath, f));
                }
            }
        }

        console.log(`  Found ${localFiles.length} image file(s) locally.`);

        // Image uploading
        const imageUrls = [];
        let primaryImageUrl = "";

        if (!isDryRun && !shouldSkipImages && bucket && localFiles.length > 0) {
            for (let imgIdx = 0; imgIdx < localFiles.length; imgIdx++) {
                const localFilePath = localFiles[imgIdx];
                if (!fs.existsSync(localFilePath)) {
                    console.warn(`  [WARN] Local image missing: ${localFilePath}`);
                    continue;
                }

                const ext = path.extname(localFilePath) || ".webp";
                const destFileName = imgIdx === 0 ? `${docId}${ext}` : `${docId}_${imgIdx + 1}${ext}`;
                const destPath = `products/${docId}/${destFileName}`;
                const contentType = getContentType(localFilePath);

                try {
                    process.stdout.write(`  -> Uploading [${imgIdx + 1}/${localFiles.length}] ${path.basename(localFilePath)} -> ${destPath}... `);
                    const [fileRef] = await bucket.upload(localFilePath, {
                        destination: destPath,
                        metadata: {
                            contentType,
                            metadata: {
                                productId: docId,
                                productTitle: item.title,
                                index: String(imgIdx),
                                uploadedBy: "upload-gms-from-excel.js"
                            }
                        }
                    });

                    const downloadUrl = await getDownloadURL(fileRef);
                    imageUrls.push(downloadUrl);
                    if (imgIdx === 0) primaryImageUrl = downloadUrl;
                    uploadedImagesCount++;
                    console.log("OK");
                } catch (uploadErr) {
                    console.log(`FAILED: ${uploadErr.message}`);
                }
            }
        } else if (isDryRun) {
            localFiles.forEach((f, idx) => {
                const ext = path.extname(f) || ".webp";
                const destFileName = idx === 0 ? `${docId}${ext}` : `${docId}_${idx + 1}${ext}`;
                console.log(`  [SIMULATE] Would upload ${path.basename(f)} -> products/${docId}/${destFileName}`);
            });
            primaryImageUrl = localFiles.length ? `[SIMULATED_URL_FOR_${docId}]` : "";
        }

        // Build document payload matching exact Heliomed schema
        const docData = {
            title: item.title,
            brand: item.brand || "GMS Medical",
            category: item.category,
            categories: item.categories || [item.category],
            categorySlugs: item.categorySlugs || [slug(item.category)],
            collections: item.collections || [],
            section: item.section || "Medical Supplies",
            badge: item.badge || "",
            oldPrice: item.oldPrice || "",
            newPrice: item.newPrice || "",
            oldPriceValue: item.oldPriceValue !== undefined ? item.oldPriceValue : null,
            newPriceValue: item.newPriceValue !== undefined ? item.newPriceValue : null,
            inventory: Number(item.inventory || 10),
            available: Boolean(item.available !== false),
            description: item.description || "",
            usage: item.usage || "",
            warnings: item.warnings || "",
            sku: item.sku || "",
            sourceUrl: item.sourceUrl || "",
            searchText: [
                item.title,
                item.brand,
                item.category,
                (item.categories || []).join(" "),
                item.section,
                item.badge
            ].filter(Boolean).join(" ").toLowerCase()
        };

        // Only update imageUrl/images if we uploaded new ones or if explicitly provided
        if (imageUrls.length > 0) {
            docData.imageUrl = primaryImageUrl;
            docData.images = imageUrls;
        }

        if (!isDryRun && db) {
            docData.updatedAt = FieldValue.serverTimestamp();
            const docRef = db.collection("medicines").doc(docId);
            currentBatch.set(docRef, docData, { merge: true });
            currentBatchSize++;
            firestoreWrittenCount++;

            if (currentBatchSize >= batchSize) {
                console.log(`  -> Committing Firestore batch of ${currentBatchSize} documents...`);
                await currentBatch.commit();
                currentBatch = db.batch();
                currentBatchSize = 0;
            }
        } else {
            console.log(`  [SIMULATE] Would write to Firestore: medicines/${docId}`);
        }

        processedCount++;
    }

    // Commit remaining batch
    if (!isDryRun && db && currentBatchSize > 0) {
        console.log(`\nCommiting final Firestore batch of ${currentBatchSize} documents...`);
        await currentBatch.commit();
    }

    console.log("\n================================================================================");
    console.log(" EXECUTION COMPLETED");
    console.log("================================================================================");
    console.log(` Total Products Processed:  ${processedCount} / ${products.length}`);
    console.log(` Images Uploaded to Storage: ${uploadedImagesCount}`);
    console.log(` Firestore Docs Written:    ${firestoreWrittenCount}`);
    console.log("================================================================================\n");
}

main().catch(err => {
    console.error("\n[FATAL ERROR]:", err);
    process.exit(1);
});
