const fs = require("fs");
const path = require("path");
const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

function slug(value) {
    return String(value || "product")
        .toLowerCase()
        .replace(/&/g, " and ")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 120) || "product";
}

async function main() {
    console.log("==================================================================");
    console.log(" GMS Products Firestore Price Updater");
    console.log("==================================================================");

    const saPath = path.join(__dirname, "..", "service-account.json");
    if (!fs.existsSync(saPath)) {
        throw new Error("service-account.json not found in project root.");
    }
    const serviceAccount = JSON.parse(fs.readFileSync(saPath, "utf8"));
    const app = initializeApp({ credential: cert(serviceAccount) });
    const db = getFirestore(app);

    const priceMapPath = path.join(__dirname, "gms-prices-map.json");
    const extractedPath = path.join(__dirname, "gms-products-extracted.json");

    if (!fs.existsSync(priceMapPath)) {
        throw new Error("gms-prices-map.json not found. Run parse-excel.py first.");
    }
    const priceMap = JSON.parse(fs.readFileSync(priceMapPath, "utf8"));
    const extractedProducts = JSON.parse(fs.readFileSync(extractedPath, "utf8"));

    const priceLookup = new Map();
    for (const item of priceMap) {
        priceLookup.set(item.title.trim().toLowerCase(), item);
    }

    console.log(`Loaded ${priceMap.length} price entries from Excel mapping.`);
    console.log(`Loaded ${extractedProducts.length} extracted products from JSON.`);

    // Update local JSON first
    let updatedLocalCount = 0;
    for (const prod of extractedProducts) {
        const key = prod.title.trim().toLowerCase();
        const priceInfo = priceLookup.get(key);
        if (priceInfo) {
            prod.oldPrice = "";
            prod.oldPriceValue = null;
            prod.newPrice = priceInfo.newPrice;
            prod.newPriceValue = priceInfo.newPriceValue;
            updatedLocalCount++;
        } else {
            console.warn(`[WARN] No price found in Excel map for product: "${prod.title}"`);
        }
    }

    fs.writeFileSync(extractedPath, JSON.stringify(extractedProducts, null, 2), "utf8");
    console.log(`Updated ${updatedLocalCount} products in ${extractedPath}`);

    // Update Firestore in batches
    console.log("\nStarting Firestore batch update...");
    const batch = db.batch();
    let firestoreCount = 0;
    let pricedCount = 0;
    let unpricedCount = 0;

    for (let i = 0; i < extractedProducts.length; i++) {
        const prod = extractedProducts[i];
        const docId = slug(prod.title);
        const docRef = db.collection("medicines").doc(docId);

        const updateData = {
            oldPrice: prod.oldPrice || "",
            oldPriceValue: prod.oldPriceValue,
            newPrice: prod.newPrice || "",
            newPriceValue: prod.newPriceValue,
            updatedAt: FieldValue.serverTimestamp()
        };

        batch.set(docRef, updateData, { merge: true });
        firestoreCount++;

        if (prod.newPriceValue !== null) {
            pricedCount++;
            console.log(`  [${i + 1}/${extractedProducts.length}] ${docId} -> ${prod.newPrice} ($${prod.newPriceValue})`);
        } else {
            unpricedCount++;
            console.log(`  [${i + 1}/${extractedProducts.length}] ${docId} -> [NO PRICE] (kept blank)`);
        }
    }

    console.log(`\nCommitting batch update for ${firestoreCount} documents to Firestore...`);
    await batch.commit();
    console.log("Batch commit successful!");

    console.log("==================================================================");
    console.log(`Summary:`);
    console.log(`  Total Firestore documents updated: ${firestoreCount}`);
    console.log(`  Products with price: ${pricedCount}`);
    console.log(`  Products with no price (kept unpriced): ${unpricedCount}`);
    console.log("==================================================================");

    // Regenerate uploader HTML so it is also in sync
    try {
        require("./generate-gms-uploader.js");
        console.log("Regenerated upload-gms-products-to-firestore.html successfully.");
    } catch (e) {
        console.warn("Could not regenerate upload-gms-products-to-firestore.html:", e.message);
    }
}

main().catch(err => {
    console.error("FATAL ERROR:", err);
    process.exit(1);
});
