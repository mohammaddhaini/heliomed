#!/usr/bin/env node
/**
 * upload-supplements-from-excel.js
 * 
 * End-to-end uploader that reads:
 *   - Excel: "C:\Users\dr laptop\Downloads\supplements website.xlsx"
 *   - Images: "C:\Users\dr laptop\Vs code programs\client-websites\tabib-clinc\scripts\imgs"
 * 
 * Uploads photos to Firebase Storage bucket (heliomed-13855.firebasestorage.app)
 * and writes/merges product documents into Firestore ("medicines" collection).
 * 
 * Usage:
 *   node scripts/upload-supplements-from-excel.js [options]
 * 
 * Options:
 *   --dry-run          Simulate without making changes to Storage or Firestore
 *   --upload-images    Upload local image files to Firebase Storage (products/<slug>/...)
 *   --skip-images      Skip Storage binary upload; update Firestore doc data only
 *   --refresh          Re-run parse-supplements-excel.py before uploading
 *   --limit <number>   Process only the first N products
 *   --from <number>    Start processing from 1-based product index
 *   --slug <slug>      Process only a single product matching this slug or title
 *   --batch-size <N>   Firestore batch write size (default: 25)
 *   --excel <path>     Custom path to supplements website.xlsx
 *   --imgs <path>      Custom path to images directory
 *   --help             Show help documentation
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { getStorage, getDownloadURL } = require("firebase-admin/storage");

const DEFAULT_EXCEL_PATH = "C:\\Users\\dr laptop\\Downloads\\supplements website.xlsx";
const DEFAULT_IMGS_DIR = path.join(__dirname, "imgs");
const STORAGE_BUCKET = "heliomed-13855.firebasestorage.app";
const SERVICE_ACCOUNT_PATH = path.join(__dirname, "..", "service-account.json");
const EXTRACTED_JSON_PATH = path.join(__dirname, "supplements-products-extracted.json");
const PARSER_SCRIPT_PATH = path.join(__dirname, "parse-supplements-excel.py");

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
const shouldRefresh = args.includes("--refresh");
const limitArg = getArgValue("--limit");
const fromArg = getArgValue("--from");
const slugFilter = getArgValue("--slug");
const batchSizeArg = getArgValue("--batch-size");
const customExcel = getArgValue("--excel") || DEFAULT_EXCEL_PATH;
const customImgs = getArgValue("--imgs") || DEFAULT_IMGS_DIR;

const limit = limitArg ? parseInt(limitArg, 10) : null;
const fromIndex = fromArg ? parseInt(fromArg, 10) : 1;
const batchSize = batchSizeArg ? parseInt(batchSizeArg, 10) : 25;

if (isHelp) {
    console.log(`
Upload Supplements Products from Excel to Firestore & Storage

Usage:
  node scripts/upload-supplements-from-excel.js [options]

Options:
  --dry-run          Simulate without making changes to Storage or Firestore
  --upload-images    Upload local image files to Firebase Storage
  --skip-images      Skip Storage upload; update Firestore doc data only
  --refresh          Re-run parse-supplements-excel.py before uploading
  --limit <N>        Process only the first N products
  --from <N>         Start processing from 1-based index (e.g. --from 5)
  --slug <slug>      Process only a single product matching this slug or title
  --batch-size <N>   Firestore batch write size (default: 25)
  --excel <path>     Custom path to Excel file
  --imgs <path>      Custom path to images folder
  --help, -h         Show this message
`);
    process.exit(0);
}

function slug(str) {
    return String(str || "")
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, "")
        .replace(/[\s_-]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

function getContentType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    switch (ext) {
        case ".webp": return "image/webp";
        case ".png": return "image/png";
        case ".jpg":
        case ".jpeg": return "image/jpeg";
        default: return "application/octet-stream";
    }
}

async function main() {
    console.log("======================================================================");
    console.log(" Supplements Catalog Uploader (Excel -> Storage -> Firestore)");
    console.log("======================================================================");
    console.log(`Mode:           ${isDryRun ? "DRY RUN (Simulation Only)" : "LIVE EXECUTION"}`);
    console.log(`Upload Images:  ${shouldSkipImages ? "NO (--skip-images)" : (shouldUploadImages ? "YES" : "NO")}`);
    console.log(`Excel Path:     ${customExcel}`);
    console.log(`Images Dir:     ${customImgs}`);
    console.log(`Storage Bucket: ${STORAGE_BUCKET}`);
    console.log("======================================================================\n");

    // 1. Refresh extraction if requested or if JSON does not exist
    if (shouldRefresh || !fs.existsSync(EXTRACTED_JSON_PATH)) {
        console.log("Running python parser script to extract Excel data...");
        try {
            execSync(`python "${PARSER_SCRIPT_PATH}" --excel "${customExcel}" --imgs "${customImgs}" --output "${EXTRACTED_JSON_PATH}"`, {
                stdio: "inherit"
            });
            console.log("Extraction complete.\n");
        } catch (err) {
            console.error("Failed to run parse-supplements-excel.py:", err.message);
            process.exit(1);
        }
    }

    // 2. Load extracted data
    if (!fs.existsSync(EXTRACTED_JSON_PATH)) {
        console.error(`Extracted JSON file not found at: ${EXTRACTED_JSON_PATH}`);
        process.exit(1);
    }

    const rawData = fs.readFileSync(EXTRACTED_JSON_PATH, "utf-8");
    let allProducts = JSON.parse(rawData);
    console.log(`Loaded ${allProducts.length} supplement products from extracted JSON.`);

    // Filter by slug / from / limit
    if (slugFilter) {
        const cleanSlug = slug(slugFilter);
        allProducts = allProducts.filter(p => p.docId === cleanSlug || p.title.toLowerCase().includes(slugFilter.toLowerCase()));
        console.log(`Filtered by slug "${slugFilter}": ${allProducts.length} product(s) match.`);
    }

    if (fromIndex > 1) {
        allProducts = allProducts.filter(p => p.index >= fromIndex);
        console.log(`Starting from product index ${fromIndex}: ${allProducts.length} remaining.`);
    }

    if (limit && limit > 0) {
        allProducts = allProducts.slice(0, limit);
        console.log(`Limited to ${limit} product(s).`);
    }

    if (allProducts.length === 0) {
        console.log("No products to process. Exiting.");
        return;
    }

    // 3. Initialize Firebase Admin SDK
    let db = null;
    let bucket = null;

    if (!isDryRun) {
        if (!fs.existsSync(SERVICE_ACCOUNT_PATH)) {
            console.error(`[ERROR] service-account.json not found at: ${SERVICE_ACCOUNT_PATH}`);
            console.error("Firebase admin credentials are required for live execution. Use --dry-run to simulate.");
            process.exit(1);
        }

        const serviceAccount = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_PATH, "utf8"));
        const app = initializeApp({
            credential: cert(serviceAccount),
            storageBucket: STORAGE_BUCKET
        });

        db = getFirestore(app);
        bucket = getStorage(app).bucket();
        console.log("[FIREBASE] Initialized Firebase Admin SDK successfully.\n");
    }

    // 4. Process products
    let processedCount = 0;
    let uploadedImagesCount = 0;
    let firestoreWrittenCount = 0;

    let currentBatch = db ? db.batch() : null;
    let currentBatchSize = 0;

    for (let i = 0; i < allProducts.length; i++) {
        const item = allProducts[i];
        const docId = item.docId;
        console.log(`\n----------------------------------------------------------------------`);
        console.log(`[${i + 1}/${allProducts.length}] Product: "${item.title}"`);
        console.log(`  Doc ID:   ${docId}`);
        console.log(`  Brand:    ${item.brand} | Category: ${item.category}`);
        console.log(`  Price:    ${item.newPrice || "N/A"} (${item.newPriceValue !== null ? "$" + item.newPriceValue : "None"})`);

        // Check local image
        const localFiles = [];
        if (item.localImagePath && fs.existsSync(item.localImagePath)) {
            localFiles.push(item.localImagePath);
        } else if (item.imageFileName) {
            const fallbackPath = path.join(customImgs, item.imageFileName);
            if (fs.existsSync(fallbackPath)) {
                localFiles.push(fallbackPath);
            }
        }

        console.log(`  Local Image: ${localFiles.length > 0 ? path.basename(localFiles[0]) : "None"}`);

        // Image uploading
        const imageUrls = [];
        let primaryImageUrl = "";

        if (!isDryRun && !shouldSkipImages && bucket && localFiles.length > 0) {
            for (let imgIdx = 0; imgIdx < localFiles.length; imgIdx++) {
                const localFilePath = localFiles[imgIdx];
                const ext = path.extname(localFilePath) || ".webp";
                const destFileName = imgIdx === 0 ? `${docId}${ext}` : `${docId}_${imgIdx + 1}${ext}`;
                const destPath = `products/${docId}/${destFileName}`;
                const contentType = getContentType(localFilePath);

                try {
                    process.stdout.write(`  -> Uploading image to ${destPath}... `);
                    const [fileRef] = await bucket.upload(localFilePath, {
                        destination: destPath,
                        metadata: {
                            contentType,
                            metadata: {
                                productId: docId,
                                productTitle: item.title,
                                index: String(imgIdx),
                                uploadedBy: "upload-supplements-from-excel.js"
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
        } else if (isDryRun && localFiles.length > 0) {
            const ext = path.extname(localFiles[0]) || ".webp";
            console.log(`  [SIMULATE] Would upload ${path.basename(localFiles[0])} -> products/${docId}/${docId}${ext}`);
            primaryImageUrl = `[SIMULATED_STORAGE_URL_FOR_${docId}]`;
            imageUrls.push(primaryImageUrl);
        }

        // Build document payload matching exact Heliomed schema
        const docData = {
            title: item.title,
            brand: item.brand || "Supplements",
            category: item.category || "Supplements",
            categories: item.categories || ["Supplements", "Parapharmacy"],
            categorySlugs: item.categorySlugs || ["supplements", "parapharmacy"],
            collections: item.collections || ["supplements", "parapharmacy"],
            section: item.section || "Parapharmacy",
            badge: item.badge || "",
            oldPrice: item.oldPrice || "",
            newPrice: item.newPrice || "",
            oldPriceValue: item.newPriceValue !== undefined ? item.newPriceValue : null,
            newPriceValue: item.newPriceValue !== undefined ? item.newPriceValue : null,
            inventory: Number(item.inventory || 15),
            available: Boolean(item.available !== false),
            description: item.description || "",
            usage: item.usage || "As directed on packaging or by your healthcare professional.",
            warnings: item.warnings || "Do not exceed recommended daily dosage. Keep out of reach of children.",
            sku: `SUPP-${String(item.index).padStart(3, "0")}`,
            sourceUrl: "",
            searchText: item.searchText || [
                item.title,
                item.brand,
                item.category,
                "Supplements",
                "Parapharmacy",
                "Vitamins"
            ].filter(Boolean).join(" ").toLowerCase()
        };

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
        console.log(`\n-> Committing final Firestore batch of ${currentBatchSize} documents...`);
        await currentBatch.commit();
    }

    console.log("\n======================================================================");
    console.log(" Upload Summary");
    console.log("======================================================================");
    console.log(`Total Processed:    ${processedCount}`);
    console.log(`Images Uploaded:    ${uploadedImagesCount} (in live mode)`);
    console.log(`Firestore Updates:  ${firestoreWrittenCount} documents (in live mode)`);
    if (isDryRun) {
        console.log("\nNOTE: This was a DRY RUN. Run without --dry-run to commit changes.");
        console.log("To upload images and sync to Firestore, run:");
        console.log("  node scripts/upload-supplements-from-excel.js --upload-images");
    }
    console.log("======================================================================\n");
}

main().catch(err => {
    console.error("\n[FATAL ERROR]:", err);
    process.exit(1);
});
