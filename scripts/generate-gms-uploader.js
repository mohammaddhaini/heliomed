const fs = require('fs');
const path = require('path');

const scriptsDir = __dirname;
const products = JSON.parse(fs.readFileSync(path.join(scriptsDir, 'gms-products-extracted.json'), 'utf8'));

const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Upload GMS Medical Products & Photos to Firebase</title>
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
            width: min(1420px, 100%);
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

        .summary-bar {
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            gap: 10px;
            margin-bottom: 20px;
            padding: 12px 16px;
            background: var(--aqua-light);
            border: 1px solid var(--aqua);
            border-radius: 8px;
        }

        .pill {
            display: inline-flex;
            align-items: center;
            padding: 6px 12px;
            border-radius: 999px;
            background: #FFFFFF;
            border: 1px solid rgba(47, 124, 115, 0.25);
            color: var(--aqua-dark);
            font-size: 13px;
            font-weight: 700;
        }

        .pill.accent {
            background: var(--aqua-dark);
            color: #FFFFFF;
            border-color: transparent;
        }

        .pipeline-info {
            background: #F1F5F9;
            border-left: 4px solid var(--gold);
            padding: 14px 18px;
            border-radius: 4px;
            font-size: 13px;
            color: #334155;
            margin-bottom: 20px;
            line-height: 1.6;
        }

        .pipeline-info ol {
            margin: 6px 0 0;
            padding-left: 20px;
        }

        .pipeline-info code {
            background: #E2E8F0;
            padding: 2px 6px;
            border-radius: 4px;
            font-family: Consolas, monospace;
            color: #0F172A;
        }

        .progress-bar-container {
            width: 100%;
            height: 14px;
            background: #E2E8F0;
            border-radius: 999px;
            overflow: hidden;
            margin-bottom: 20px;
            display: none;
        }

        .progress-bar {
            height: 100%;
            width: 0%;
            background: linear-gradient(90deg, var(--aqua-dark), var(--gold));
            transition: width 0.3s ease;
        }

        .controls-bar {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 16px;
            margin-bottom: 16px;
            flex-wrap: wrap;
        }

        .search-box {
            position: relative;
            flex: 1;
            min-width: 260px;
            max-width: 420px;
        }

        .search-box input {
            width: 100%;
            height: 44px;
            padding: 0 14px;
            border: 1px solid var(--line);
            border-radius: 6px;
            font-size: 13px;
            outline: none;
        }

        .search-box input:focus {
            border-color: var(--gold);
        }

        .table-wrap {
            max-height: 580px;
            overflow: auto;
            border: 1px solid var(--line);
            border-radius: 8px;
            margin-bottom: 24px;
            background: #FFFFFF;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            font-size: 13px;
            text-align: left;
        }

        th, td {
            padding: 12px 14px;
            border-bottom: 1px solid var(--line);
            vertical-align: middle;
            white-space: nowrap;
        }

        th {
            position: sticky;
            top: 0;
            background: #0F172A;
            color: #F8FAFC;
            font-weight: 600;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            z-index: 1;
        }

        tbody tr:hover {
            background: #F8FAFC;
        }

        .product-thumb {
            width: 52px;
            height: 52px;
            object-fit: cover;
            border-radius: 6px;
            border: 1px solid var(--line);
            background: #F1F5F9;
            display: block;
        }

        .product-thumb-placeholder {
            width: 52px;
            height: 52px;
            border-radius: 6px;
            background: #E2E8F0;
            display: grid;
            place-items: center;
            font-size: 10px;
            color: var(--muted);
            font-weight: 600;
            text-align: center;
        }

        .badge-status {
            display: inline-block;
            padding: 3px 8px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 700;
        }

        .in-stock {
            background: #DCFCE7;
            color: #15803D;
        }

        .btn-upload {
            min-height: 48px;
            border: 0;
            border-radius: 8px;
            padding: 0 28px;
            background: var(--gold);
            color: #FFFFFF;
            font-size: 15px;
            font-weight: 700;
            cursor: pointer;
            transition: background 0.2s, transform 0.1s;
            box-shadow: 0 4px 12px rgba(194, 162, 107, 0.35);
        }

        .btn-upload:hover {
            background: var(--gold-hover);
        }

        .btn-upload:disabled {
            cursor: not-allowed;
            opacity: 0.5;
            box-shadow: none;
        }

        pre#log {
            min-height: 200px;
            max-height: 380px;
            margin: 20px 0 0;
            padding: 16px 20px;
            overflow: auto;
            white-space: pre-wrap;
            background: #0F172A;
            border-left: 4px solid var(--gold);
            border-radius: 0 8px 8px 0;
            color: #E2E8F0;
            font-family: Consolas, "Courier New", monospace;
            font-size: 13px;
            line-height: 1.5;
        }
    </style>
</head>
<body>
    <main>
        <h1>Upload GMS Medical Products & Photos to Firebase</h1>
        <p class="subtitle">
            Uploads 130 GMS Medical products and 184 product photos to <strong>Firebase Storage</strong> and saves product metadata to Firestore's <strong>medicines</strong> collection.
        </p>

        <div id="authSection" class="auth-card">
            <div id="authPrompt">
                <div style="font-weight: 700; color: #0F172A; margin-bottom: 4px;">Admin Authentication Required</div>
                <div style="font-size: 12px; color: var(--muted);">Firestore write security rules require an authenticated Admin account.</div>
            </div>
            <form id="authForm" class="auth-form">
                <input type="email" id="adminEmail" placeholder="Admin Email" required autocomplete="username">
                <input type="password" id="adminPassword" placeholder="Admin Password" required autocomplete="current-password">
                <button type="submit" id="signInBtn" class="btn-auth">Sign In to Admin</button>
            </form>
            <div id="authSuccess" style="display: none; align-items: center; justify-content: space-between; width: 100%;">
                <div>
                    <span style="font-weight: 700; color: #15803D;">✓ Authenticated as Admin: </span>
                    <strong id="userEmailBadge" style="color: #0F172A;"></strong>
                </div>
                <button type="button" id="signOutBtn" class="btn-signout">Sign Out</button>
            </div>
        </div>

        <div class="summary-bar">
            <span class="pill accent" id="productCount">130 products</span>
            <span class="pill" id="photoCount">184 photos to upload</span>
            <span class="pill">Section: <strong>Medical Supplies</strong></span>
            <span class="pill">Storage: <strong>heliomed-13855.firebasestorage.app</strong></span>
            <span class="pill">Firestore: <strong>medicines</strong></span>
        </div>

        <div class="progress-bar-container" id="progressContainer">
            <div class="progress-bar" id="progressBar"></div>
        </div>

        <div class="controls-bar">
            <div class="search-box">
                <input type="text" id="searchInput" placeholder="Search 130 products by title, brand, category...">
            </div>
            <button id="uploadButton" class="btn-upload" type="button" disabled>Sign in above to enable Upload</button>
        </div>

        <div class="table-wrap">
            <table>
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Photo</th>
                        <th>Title & Doc ID</th>
                        <th>Brand</th>
                        <th>Category</th>
                        <th>Section</th>
                        <th>Photos Count</th>
                        <th>Status</th>
                        <th>Firebase Storage Path</th>
                    </tr>
                </thead>
                <tbody id="productRows"></tbody>
            </table>
        </div>

        <pre id="log">Please sign in with your Admin credentials above to enable uploading.</pre>
    </main>

    <script type="module">
        import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
        import {
            getAuth,
            signInWithEmailAndPassword,
            onAuthStateChanged,
            signOut
        } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";
        import {
            getFirestore,
            doc,
            setDoc,
            serverTimestamp
        } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";
        import {
            getStorage,
            ref,
            uploadBytes,
            getDownloadURL
        } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-storage.js";

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

        const authSection = document.getElementById("authSection");
        const authPrompt = document.getElementById("authPrompt");
        const authForm = document.getElementById("authForm");
        const authSuccess = document.getElementById("authSuccess");
        const userEmailBadge = document.getElementById("userEmailBadge");
        const signInBtn = document.getElementById("signInBtn");
        const signOutBtn = document.getElementById("signOutBtn");
        const adminEmail = document.getElementById("adminEmail");
        const adminPassword = document.getElementById("adminPassword");

        const uploadButton = document.getElementById("uploadButton");
        const logOutput = document.getElementById("log");
        const productRows = document.getElementById("productRows");
        const searchInput = document.getElementById("searchInput");
        const progressBar = document.getElementById("progressBar");
        const progressContainer = document.getElementById("progressContainer");

        let currentUser = null;

        onAuthStateChanged(auth, (user) => {
            currentUser = user;
            if (user) {
                authSection.classList.add("authenticated");
                authPrompt.style.display = "none";
                authForm.style.display = "none";
                authSuccess.style.display = "flex";
                userEmailBadge.textContent = user.email;
                uploadButton.disabled = false;
                uploadButton.textContent = "Upload All 130 Products & Photos to Firebase";
                logOutput.textContent = "Ready. Authenticated as " + user.email + ". Click 'Upload All 130 Products & Photos to Firebase' to start.";
            } else {
                authSection.classList.remove("authenticated");
                authPrompt.style.display = "block";
                authForm.style.display = "flex";
                authSuccess.style.display = "none";
                uploadButton.disabled = true;
                uploadButton.textContent = "Sign in above to enable Upload";
                logOutput.textContent = "Please sign in with your Admin credentials above to enable uploading.";
            }
        });

        authForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            signInBtn.disabled = true;
            signInBtn.textContent = "Signing In...";
            try {
                await signInWithEmailAndPassword(auth, adminEmail.value.trim(), adminPassword.value);
                log("Signed in successfully as " + adminEmail.value.trim());
            } catch (err) {
                console.error(err);
                alert("Sign-in failed: " + err.message);
                log("Sign-in failed: " + err.message);
            } finally {
                signInBtn.disabled = false;
                signInBtn.textContent = "Sign In to Admin";
            }
        });

        signOutBtn.addEventListener("click", () => {
            signOut(auth);
        });

        function slug(value) {
            return String(value || "product")
                .toLowerCase()
                .replace(/&/g, " and ")
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/^-+|-+$/g, "")
                .slice(0, 120) || "product";
        }

        const productsData = ` + JSON.stringify(products, null, 8) + `;

        function escapeHtml(value) {
            return String(value ?? "")
                .replaceAll("&", "&amp;")
                .replaceAll("<", "&lt;")
                .replaceAll(">", "&gt;")
                .replaceAll('"', "&quot;")
                .replaceAll("'", "&#039;");
        }

        function log(message) {
            logOutput.textContent += "\\n" + message;
            logOutput.scrollTop = logOutput.scrollHeight;
        }

        function renderTable(filterText = "") {
            const term = filterText.trim().toLowerCase();
            const filtered = productsData.filter(p => 
                !term || 
                p.title.toLowerCase().includes(term) || 
                p.brand.toLowerCase().includes(term) || 
                p.category.toLowerCase().includes(term) ||
                p.description.toLowerCase().includes(term)
            );

            productRows.innerHTML = filtered.map((p, i) => {
                const docId = slug(p.title);
                const photoCount = (p.localImageFiles || []).length;

                return \`
                    <tr>
                        <td><strong>\${i + 1}</strong></td>
                        <td>
                            \${p.localImageFile ? \`<img class="product-thumb" src="\${escapeHtml(p.localImageFile)}" alt="\${escapeHtml(p.title)}" loading="lazy">\` : '<div class="product-thumb-placeholder">No Photo</div>'}
                        </td>
                        <td>
                            <strong>\${escapeHtml(p.title)}</strong>
                            <div style="font-size:11px; color:var(--muted);">\${escapeHtml(docId)}</div>
                        </td>
                        <td>\${escapeHtml(p.brand)}</td>
                        <td><span class="pill" style="padding:3px 8px; font-size:11px;">\${escapeHtml(p.category)}</span></td>
                        <td>\${escapeHtml(p.section)}</td>
                        <td><strong>\${photoCount} photo\${photoCount > 1 ? 's' : ''}</strong></td>
                        <td>
                            <span class="badge-status in-stock">In Stock</span>
                        </td>
                        <td>
                            <span style="font-family:monospace; font-size:11px;">products/\${escapeHtml(docId)}/</span>
                        </td>
                    </tr>
                \`;
            }).join("");
        }

        renderTable();

        searchInput.addEventListener("input", (e) => {
            renderTable(e.target.value);
        });

        async function fetchImageBlob(localPath) {
            const response = await fetch(localPath);
            if (!response.ok) {
                throw new Error(\`Failed to load local image: \${localPath} (Status \${response.status})\`);
            }
            return await response.blob();
        }

        async function uploadProducts() {
            if (!currentUser) {
                alert("Please sign in with your Admin account first.");
                return;
            }

            uploadButton.disabled = true;
            progressContainer.style.display = "block";
            progressBar.style.width = "0%";
            logOutput.textContent = "Initiating GMS Products upload pipeline to Firebase Storage + Firestore...";

            const total = productsData.length;
            let successCount = 0;

            try {
                for (let i = 0; i < total; i++) {
                    const item = productsData[i];
                    const id = slug(item.title);
                    let uploadedImageUrl = "";
                    const uploadedImageUrls = [];

                    log(\`\\n[\${i + 1}/\${total}] Processing "\${item.title}"...\`);

                    // Upload all available photos to Firebase Storage
                    const imageFiles = item.localImageFiles || (item.localImageFile ? [item.localImageFile] : []);
                    for (let imgIdx = 0; imgIdx < imageFiles.length; imgIdx++) {
                        const localImg = imageFiles[imgIdx];
                        try {
                            const ext = localImg.split('.').pop() || 'jpg';
                            const fileName = imgIdx === 0 ? \`\${id}.\${ext}\` : \`\${id}_\${imgIdx + 1}.\${ext}\`;
                            const storagePath = \`products/\${id}/\${fileName}\`;
                            
                            log(\`  -> Fetching & uploading image [\${imgIdx + 1}/\${imageFiles.length}]: \${localImg}\`);
                            const blob = await fetchImageBlob(localImg);
                            const storageRef = ref(storage, storagePath);

                            await uploadBytes(storageRef, blob, {
                                contentType: ext === 'webp' ? 'image/webp' : (ext === 'png' ? 'image/png' : 'image/jpeg'),
                                customMetadata: {
                                    productId: id,
                                    productTitle: item.title,
                                    index: String(imgIdx)
                                }
                            });

                            const downloadUrl = await getDownloadURL(storageRef);
                            uploadedImageUrls.push(downloadUrl);
                            if (imgIdx === 0) uploadedImageUrl = downloadUrl;
                            log(\`  -> Uploaded to Firebase Storage: \${storagePath}\`);
                        } catch (storageErr) {
                            console.error("Storage upload error for " + item.title, storageErr);
                            log(\`  -> [STORAGE WARNING]: \${storageErr.message}\`);
                        }
                    }

                    // Prepare Firestore document
                    const docData = {
                        title: item.title,
                        brand: item.brand,
                        category: item.category,
                        section: item.section,
                        badge: item.badge || "",
                        oldPrice: item.oldPrice || "",
                        newPrice: item.newPrice || "",
                        oldPriceValue: item.oldPriceValue,
                        newPriceValue: item.newPriceValue,
                        inventory: Number(item.inventory || 10),
                        available: Boolean(item.available),
                        imageUrl: uploadedImageUrl,
                        images: uploadedImageUrls,
                        description: item.description || "",
                        usage: item.usage || "",
                        warnings: item.warnings || "",
                        sourceUrl: item.sourceUrl || "",
                        searchText: [item.title, item.brand, item.category, item.section, item.badge].filter(Boolean).join(" ").toLowerCase(),
                        updatedAt: serverTimestamp()
                    };

                    // Write/Merge to Firestore
                    const docRef = doc(db, "medicines", id);
                    await setDoc(docRef, docData, { merge: true });
                    log(\`  -> Firestore saved: medicines/\${id}\`);

                    successCount++;
                    const percent = Math.round(((i + 1) / total) * 100);
                    progressBar.style.width = percent + "%";
                }

                log(\`\\n======================================================\`);
                log(\`ALL DONE! Successfully uploaded \${successCount} / \${total} products & photos to Firebase!\`);
                log(\`- Images stored in Firebase Storage (products/...)\`);
                log(\`- Documents saved in Firestore (medicines/...)\`);
                log(\`======================================================\`);
            } catch (error) {
                console.error("Upload process error:", error);
                log(\`\\nFATAL ERROR: \${error.message}\`);
            } finally {
                uploadButton.disabled = false;
            }
        }

        uploadButton.addEventListener("click", uploadProducts);
    </script>
</body>
</html>
`;

fs.writeFileSync(path.join(scriptsDir, 'upload-gms-products-to-firestore.html'), htmlContent);
console.log('Successfully generated upload-gms-products-to-firestore.html');
