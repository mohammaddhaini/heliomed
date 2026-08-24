/**
 * Node.js CLI Script: Delete Products from Firestore by Timestamp & Prefix
 * 
 * Usage Examples:
 * 
 * 1. Dry Run (Scan only - default safe mode):
 *    node scripts/delete-products-by-time.js --date=2026-08-15 --time=17:01:12 --dry-run
 * 
 * 2. Delete with Admin Auth:
 *    node scripts/delete-products-by-time.js --date=2026-08-15 --time=17:01:12 --email=admin@example.com --password=secret --delete
 * 
 * 3. Delete by prefix:
 *    node scripts/delete-products-by-time.js --prefix=home-health-essentials --delete
 */

import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, collection, getDocs, doc, writeBatch } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyCFlrhhPDtVxFqkLA3kG-23m-BPflxU9nw",
    authDomain: "heliomed-13855.firebaseapp.com",
    projectId: "heliomed-13855",
    storageBucket: "heliomed-13855.firebasestorage.app",
    messagingSenderId: "375605550861",
    appId: "1:375605550861:web:9d8b605cd24ee841df5a44",
    measurementId: "G-ST63P01MF4"
};

// Parse command line arguments
const args = process.argv.slice(2).reduce((acc, curr) => {
    if (curr.startsWith("--")) {
        const [key, val] = curr.replace(/^--/, "").split("=");
        acc[key] = val === undefined ? true : val;
    }
    return acc;
}, {});

const targetDateStr = args.date || "2026-08-15";
const targetTimeStr = args.time || "17:01:12";
const toleranceSeconds = Number(args.tolerance || 10);
const idPrefix = (args.prefix || "home-health-essentials").toLowerCase();
const isDeleteMode = Boolean(args.delete);
const adminEmail = args.email || process.env.ADMIN_EMAIL;
const adminPassword = args.password || process.env.ADMIN_PASSWORD;

async function run() {
    console.log("==================================================================");
    console.log(" Heliomed Firestore Product Deletion Utility");
    console.log("==================================================================");
    console.log(` Target Date:      ${targetDateStr}`);
    console.log(` Target Time:      ${targetTimeStr} (UTC+3)`);
    console.log(` Time Window:      ±${toleranceSeconds} seconds`);
    console.log(` Document Prefix:  "${idPrefix}"`);
    console.log(` Mode:             ${isDeleteMode ? "🚨 LIVE DELETION" : "🛡️ DRY RUN (Scan only)"}`);
    console.log("==================================================================\n");

    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    const auth = getAuth(app);

    if (isDeleteMode && adminEmail && adminPassword) {
        console.log(`Signing in as admin (${adminEmail})...`);
        await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
        console.log("✓ Authenticated successfully.\n");
    }

    // Target Epoch calculation (Target is in UTC+3: Beirut/Arabia Standard Time)
    const [year, month, day] = targetDateStr.split("-").map(Number);
    const [hour, minute, second] = targetTimeStr.split(":").map(Number);
    const targetUtcEpoch = Date.UTC(year, month - 1, day, hour - 3, minute, second || 0);

    const minEpoch = targetUtcEpoch - (toleranceSeconds * 1000);
    const maxEpoch = targetUtcEpoch + (toleranceSeconds * 1000);

    console.log(`Scanning Firestore collection 'medicines'...`);
    const snapshot = await getDocs(collection(db, "medicines"));
    console.log(`Total documents scanned: ${snapshot.docs.length}`);

    const matched = [];

    snapshot.docs.forEach((docSnap) => {
        const data = docSnap.data();
        const id = docSnap.id;

        // Check timestamp
        let docEpoch = null;
        let tsField = null;

        for (const field of ["updatedAt", "createdAt", "timestamp", "dateAdded"]) {
            const val = data[field];
            if (!val) continue;
            if (typeof val.toDate === "function") {
                docEpoch = val.toDate().getTime();
                tsField = field;
                break;
            } else if (val.seconds !== undefined) {
                docEpoch = val.seconds * 1000;
                tsField = field;
                break;
            }
        }

        const matchesPrefix = !idPrefix || id.toLowerCase().startsWith(idPrefix);
        const matchesTime = docEpoch !== null && docEpoch >= minEpoch && docEpoch <= maxEpoch;

        if (matchesPrefix && matchesTime) {
            matched.push({
                id,
                title: data.title,
                category: data.category,
                section: data.section,
                timestamp: docEpoch ? new Date(docEpoch).toISOString() : "Unknown",
                tsField
            });
        }
    });

    console.log(`\nFound ${matched.length} product(s) matching the criteria.\n`);

    if (matched.length === 0) {
        console.log("No matching products found. Exiting.");
        return;
    }

    // Display matching items
    console.log("Matching items preview:");
    matched.forEach((item, idx) => {
        console.log(` [${idx + 1}] ID: ${item.id}`);
        console.log(`     Title: ${item.title || "N/A"} | Category: ${item.category || "N/A"}`);
        console.log(`     Time:  ${item.timestamp} (${item.tsField})`);
    });

    if (!isDeleteMode) {
        console.log("\n==================================================================");
        console.log(" [DRY RUN COMPLETED]");
        console.log(` To delete these ${matched.length} items, run with '--delete' and admin credentials:`);
        console.log(` node scripts/delete-products-by-time.js --date=${targetDateStr} --time=${targetTimeStr} --email=<email> --password=<password> --delete`);
        console.log(" Or simply open 'scripts/delete-products-by-time.html' in your browser!");
        console.log("==================================================================");
        return;
    }

    // Live deletion execution
    console.log(`\n🚨 Starting deletion of ${matched.length} documents...`);
    const chunkSize = 450;
    let deleted = 0;

    for (let i = 0; i < matched.length; i += chunkSize) {
        const chunk = matched.slice(i, i + chunkSize);
        const batch = writeBatch(db);

        chunk.forEach((item) => {
            batch.delete(doc(db, "medicines", item.id));
        });

        await batch.commit();
        deleted += chunk.length;
        console.log(`✓ Deleted batch ${deleted}/${matched.length}`);
    }

    console.log(`\n🎉 Successfully deleted all ${deleted} products from Firestore!`);
}

run().catch((err) => {
    console.error("\n❌ Fatal error:", err.message);
    process.exit(1);
});
