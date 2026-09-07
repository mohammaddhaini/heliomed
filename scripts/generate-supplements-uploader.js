const fs = require('fs');
const path = require('path');

const scriptsDir = __dirname;
const products = JSON.parse(fs.readFileSync(path.join(scriptsDir, 'supplements-products-extracted.json'), 'utf8'));

// Prepare image base64
const productsWithImages = products.map(item => {
    let base64 = "";
    if (item.localImagePath && fs.existsSync(item.localImagePath)) {
        const buffer = fs.readFileSync(item.localImagePath);
        base64 = `data:image/webp;base64,${buffer.toString('base64')}`;
    }
    return {
        ...item,
        imageBase64: base64
    };
});

const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Upload Supplements Products & Photos to Firebase</title>
    <style>
        :root {
            --aqua: #BFE7E1;
            --aqua-dark: #2F7C73;
            --aqua-light: #EBF8F6;
            --gold: #C2A26B;
            --gold-hover: #AA8B56;
            --ink: #07111F;
            --line: #E2E8F0;
            --muted: #64748B;
            --bg: #F8FAFC;
            --card: #FFFFFF;
            --success: #10B981;
            --danger: #EF4444;
        }

        * { box-sizing: border-box; }

        body {
            margin: 0;
            min-height: 100vh;
            padding: 32px 20px;
            background: var(--bg);
            color: var(--ink);
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        }

        main {
            width: min(1300px, 100%);
            margin: 0 auto;
            border: 1px solid var(--line);
            border-radius: 12px;
            padding: 32px;
            background: var(--card);
            box-shadow: 0 20px 45px rgba(7, 17, 31, 0.08);
        }

        h1 {
            margin: 0 0 6px;
            font-size: 26px;
            font-weight: 800;
            letter-spacing: -0.5px;
        }

        p.subtitle {
            margin: 0 0 20px;
            color: var(--muted);
            line-height: 1.5;
            font-size: 14px;
        }

        .auth-card {
            background: #FFFDF9;
            border: 1px solid #E5DDD0;
            border-left: 4px solid var(--gold);
            border-radius: 8px;
            padding: 16px 20px;
            margin-bottom: 20px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            flex-wrap: wrap;
            gap: 12px;
        }

        .auth-card.authenticated {
            background: #F0FDF4;
            border-color: #BBF7D0;
            border-left-color: var(--success);
        }

        .auth-form {
            display: flex;
            gap: 10px;
            align-items: center;
            flex-wrap: wrap;
        }

        .auth-form input {
            height: 38px;
            padding: 0 12px;
            border: 1px solid var(--line);
            border-radius: 6px;
            font-size: 13px;
            outline: none;
        }

        .auth-form input:focus {
            border-color: var(--gold);
        }

        .btn-auth {
            height: 38px;
            padding: 0 16px;
            background: var(--gold);
            color: #fff;
            border: 0;
            border-radius: 6px;
            font-weight: 700;
            font-size: 13px;
            cursor: pointer;
            transition: background 0.2s;
        }

        .btn-auth:hover {
            background: var(--gold-hover);
        }

        .btn-signout {
            height: 34px;
            padding: 0 14px;
            background: #E2E8F0;
            color: #334155;
            border: 0;
            border-radius: 6px;
            font-weight: 600;
            font-size: 12px;
            cursor: pointer;
        }

        .btn-signout:hover {
            background: #CBD5E1;
        }

        .actions {
            display: flex;
            align-items: center;
            gap: 12px;
            margin: 20px 0;
        }

        button.btn-primary {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            height: 44px;
            padding: 0 22px;
            border: 0;
            border-radius: 8px;
            background: var(--aqua-dark);
            color: #ffffff;
            font-size: 14px;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.2s ease;
        }

        button.btn-primary:hover:not(:disabled) {
            background: #25665E;
            transform: translateY(-1px);
        }

        button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
            transform: none !important;
        }

        .progress-box {
            margin: 16px 0;
            background: #F1F5F9;
            border-radius: 999px;
            height: 10px;
            overflow: hidden;
            display: none;
        }

        .progress-bar {
            height: 100%;
            width: 0%;
            background: var(--success);
            transition: width 0.2s ease;
        }

        .stats-summary {
            display: flex;
            gap: 16px;
            margin-bottom: 20px;
            flex-wrap: wrap;
        }

        .stat-card {
            flex: 1;
            min-width: 140px;
            background: #F8FAFC;
            border: 1px solid var(--line);
            border-radius: 8px;
            padding: 12px 16px;
        }

        .stat-card .val {
            font-size: 20px;
            font-weight: 800;
            color: var(--ink);
        }

        .stat-card .lbl {
            font-size: 12px;
            color: var(--muted);
            margin-top: 2px;
        }

        .grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
            gap: 16px;
            max-height: 480px;
            overflow-y: auto;
            padding: 4px;
            margin-bottom: 24px;
        }

        .card {
            border: 1px solid var(--line);
            border-radius: 8px;
            padding: 12px;
            display: flex;
            flex-direction: column;
            gap: 8px;
            background: #fff;
        }

        .card img {
            width: 100%;
            height: 160px;
            object-fit: contain;
            background: #F8FAFC;
            border-radius: 6px;
        }

        .card .title {
            font-size: 14px;
            font-weight: 700;
            line-height: 1.3;
        }

        .card .meta {
            font-size: 12px;
            color: var(--muted);
            display: flex;
            justify-content: space-between;
        }

        .price-badge {
            font-weight: 700;
            color: var(--aqua-dark);
            background: var(--aqua-light);
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 12px;
        }

        pre.console {
            background: #0B1220;
            color: #E2E8F0;
            border-radius: 8px;
            padding: 16px;
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
            font-size: 12px;
            line-height: 1.5;
            max-height: 280px;
            overflow-y: auto;
            white-space: pre-wrap;
        }
    </style>
</head>
<body>
    <main>
        <h1>Upload Supplements Catalog to Firebase</h1>
        <p class="subtitle">Direct browser uploader for 16 supplement products and photos from <code>supplements website.xlsx</code> and <code>scripts/imgs</code> into Firebase Storage and Cloud Firestore.</p>

        <!-- Auth Block -->
        <div class="auth-card" id="authCard">
            <div id="authStatusText">
                <strong>Admin Authentication</strong>
                <div style="font-size: 12px; color: var(--muted); margin-top: 2px;">Stored admin credentials are used automatically.</div>
            </div>
            <div class="auth-form" id="authForm">
                <input type="email" id="authEmail" placeholder="admin email" value="tabibclinic@gmail.com">
                <input type="password" id="authPassword" placeholder="Admin Password" autocomplete="current-password">
                <button class="btn-auth" id="signInBtn">Sign In to Admin</button>
            </div>
            <div id="authSuccess" style="display: none; align-items: center; gap: 12px;">
                <span style="color: var(--success); font-weight: 700;">&#10003; Authenticated as Admin: <span id="userEmailBadge"></span></span>
                <button class="btn-signout" id="signOutBtn">Sign Out</button>
            </div>
        </div>

        <!-- Summary Stats -->
        <div class="stats-summary">
            <div class="stat-card">
                <div class="val">${products.length}</div>
                <div class="lbl">Total Products</div>
            </div>
            <div class="stat-card">
                <div class="val">${products.filter(p => p.localImagePath).length}</div>
                <div class="lbl">With Photos</div>
            </div>
            <div class="stat-card">
                <div class="val">Supplements</div>
                <div class="lbl">Target Category</div>
            </div>
            <div class="stat-card">
                <div class="val">medicines</div>
                <div class="lbl">Firestore Collection</div>
            </div>
        </div>

        <!-- Action Controls -->
        <div class="actions">
            <button class="btn-primary" id="uploadBtn" disabled>
                Sign in above to enable Upload
            </button>
        </div>

        <div class="progress-box" id="progressBox">
            <div class="progress-bar" id="progressBar"></div>
        </div>

        <!-- Catalog Preview -->
        <div class="grid">
            ${productsWithImages.map(item => `
                <div class="card">
                    ${item.imageBase64 ? `<img src="${item.imageBase64}" alt="${item.title}">` : `<div style="height:160px;display:flex;align-items:center;justify-content:center;background:#F1F5F9;color:#94A3B8;font-size:12px;border-radius:6px;">No Image</div>`}
                    <div class="title">${item.title}</div>
                    <div class="meta">
                        <span>${item.brand}</span>
                        <span class="price-badge">${item.newPrice}</span>
                    </div>
                </div>
            `).join('')}
        </div>

        <!-- Live Terminal Logs -->
        <pre class="console" id="consoleLog">Checking stored authentication credentials...</pre>
    </main>

    <script type="module">
        import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
        import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
        import { getFirestore, doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
        import { getStorage, ref, uploadString, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

        // Accurate Helio Med Firebase configuration
        const firebaseConfig = {
            apiKey: "AIzaSyCFlrhhPDtVxFqkLA3kG-23m-BPflxU9nw",
            authDomain: "heliomed-13855.firebaseapp.com",
            projectId: "heliomed-13855",
            storageBucket: "heliomed-13855.firebasestorage.app",
            messagingSenderId: "375605550861",
            appId: "1:375605550861:web:9d8b605cd24ee841df5a44",
            measurementId: "G-ST63P01MF4"
        };

        const app = initializeApp(firebaseConfig);
        const auth = getAuth(app);
        const db = getFirestore(app);
        const storage = getStorage(app);

        const productsData = ${JSON.stringify(productsWithImages)};

        const consoleLog = document.getElementById("consoleLog");
        const uploadBtn = document.getElementById("uploadBtn");
        const progressBox = document.getElementById("progressBox");
        const progressBar = document.getElementById("progressBar");
        const authCard = document.getElementById("authCard");
        const authForm = document.getElementById("authForm");
        const authSuccess = document.getElementById("authSuccess");
        const userEmailBadge = document.getElementById("userEmailBadge");
        const authStatusText = document.getElementById("authStatusText");
        const authEmail = document.getElementById("authEmail");
        const authPassword = document.getElementById("authPassword");
        const signInBtn = document.getElementById("signInBtn");
        const signOutBtn = document.getElementById("signOutBtn");

        function log(msg) {
            consoleLog.textContent += msg + "\\n";
            consoleLog.scrollTop = consoleLog.scrollHeight;
        }

        // Restore stored credentials if saved in localStorage
        const savedEmail = localStorage.getItem("heliomed_admin_email") || "tabibclinic@gmail.com";
        const savedPassword = localStorage.getItem("heliomed_admin_password") || "";
        if (savedEmail) authEmail.value = savedEmail;
        if (savedPassword) authPassword.value = savedPassword;

        // Auto sign-in if stored password exists
        if (savedPassword && !auth.currentUser) {
            signInWithEmailAndPassword(auth, savedEmail, savedPassword).catch(() => {
                log("[AUTH] Stored password expired or changed. Please enter your password above.");
            });
        }

        onAuthStateChanged(auth, (user) => {
            if (user) {
                authCard.classList.add("authenticated");
                authForm.style.display = "none";
                authSuccess.style.display = "flex";
                userEmailBadge.textContent = user.email;
                uploadBtn.disabled = false;
                uploadBtn.textContent = "Upload All " + productsData.length + " Products & Photos to Firebase";
                log(\`[AUTH] Authenticated as \${user.email}. Ready to upload!\`);
            } else {
                authCard.classList.remove("authenticated");
                authForm.style.display = "flex";
                authSuccess.style.display = "none";
                uploadBtn.disabled = true;
                uploadBtn.textContent = "Sign in above to enable Upload";
                log("[AUTH] Ready. Please enter your password for " + authEmail.value + " to continue.");
            }
        });

        signInBtn.addEventListener("click", async (e) => {
            e.preventDefault();
            const email = authEmail.value.trim();
            const password = authPassword.value;
            if (!email || !password) {
                alert("Please enter both email and password.");
                return;
            }

            signInBtn.disabled = true;
            signInBtn.textContent = "Signing In...";
            log(\`Signing in as \${email}...\`);

            try {
                await signInWithEmailAndPassword(auth, email, password);
                // Remember credentials for future convenience
                localStorage.setItem("heliomed_admin_email", email);
                localStorage.setItem("heliomed_admin_password", password);
                log(\`[AUTH] Successfully signed in as \${email}.\`);
            } catch (err) {
                alert("Sign-in failed: " + err.message);
                log("[AUTH ERROR] " + err.message);
            } finally {
                signInBtn.disabled = false;
                signInBtn.textContent = "Sign In to Admin";
            }
        });

        signOutBtn.addEventListener("click", async () => {
            await signOut(auth);
            localStorage.removeItem("heliomed_admin_password");
            log("[AUTH] Signed out.");
        });

        uploadBtn.addEventListener("click", async () => {
            uploadBtn.disabled = true;
            progressBox.style.display = "block";
            progressBar.style.width = "0%";
            log("\\nInitiating upload pipeline for " + productsData.length + " products...");

            let success = 0;
            const total = productsData.length;

            for (let i = 0; i < total; i++) {
                const item = productsData[i];
                const docId = item.docId;
                log(\`\\n[\${i+1}/\${total}] Processing: \${item.title}\`);

                let uploadedImageUrl = "";
                let uploadedImageUrls = [];

                if (item.imageBase64) {
                    try {
                        const storagePath = \`products/\${docId}/\${docId}.webp\`;
                        const fileRef = ref(storage, storagePath);
                        await uploadString(fileRef, item.imageBase64, "data_url");
                        uploadedImageUrl = await getDownloadURL(fileRef);
                        uploadedImageUrls.push(uploadedImageUrl);
                        log(\`  -> Photo uploaded to Storage: \${storagePath}\`);
                    } catch (sErr) {
                        log(\`  -> [STORAGE WARNING]: \${sErr.message}\`);
                    }
                }

                const docData = {
                    title: item.title,
                    brand: item.brand,
                    category: item.category,
                    categories: item.categories || ["Supplements", "Parapharmacy"],
                    categorySlugs: item.categorySlugs || ["supplements", "parapharmacy"],
                    collections: item.collections || ["supplements", "parapharmacy"],
                    section: item.section || "Parapharmacy",
                    badge: item.badge || "",
                    newPrice: item.newPrice || "",
                    newPriceValue: item.newPriceValue,
                    oldPrice: item.oldPrice || "",
                    oldPriceValue: item.oldPriceValue,
                    inventory: Number(item.inventory || 15),
                    available: Boolean(item.available !== false),
                    description: item.description || "",
                    usage: item.usage || "As directed on packaging or by your healthcare professional.",
                    warnings: item.warnings || "Do not exceed recommended daily dosage. Keep out of reach of children.",
                    sku: \`SUPP-\${String(item.index).padStart(3, "0")}\`,
                    sourceUrl: "",
                    searchText: item.searchText,
                    updatedAt: serverTimestamp()
                };

                if (uploadedImageUrl) {
                    docData.imageUrl = uploadedImageUrl;
                    docData.images = uploadedImageUrls;
                }

                try {
                    const docRef = doc(db, "medicines", docId);
                    await setDoc(docRef, docData, { merge: true });
                    log(\`  -> Firestore document saved: medicines/\${docId}\`);
                    success++;
                } catch (dbErr) {
                    log(\`  -> [FIRESTORE ERROR]: \${dbErr.message}\`);
                }

                progressBar.style.width = Math.round(((i + 1) / total) * 100) + "%";
            }

            log(\`\\n======================================================\`);
            log(\`COMPLETED! Successfully processed \${success}/\${total} products.\`);
            log(\`======================================================\`);
            uploadBtn.disabled = false;
        });
    </script>
</body>
</html>
`;

fs.writeFileSync(path.join(scriptsDir, 'upload-supplements-to-firestore.html'), htmlContent);
console.log('Successfully regenerated scripts/upload-supplements-to-firestore.html');
