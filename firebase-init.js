import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
import { getAnalytics, isSupported as isAnalyticsSupported } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-analytics.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";
import { getFunctions } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-functions.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-storage.js";

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
const db = getFirestore(app);
const auth = getAuth(app);
const functions = getFunctions(app, "europe-west1");
const storage = getStorage(app);

let analytics = null;
isAnalyticsSupported()
    .then(function (supported) {
        if (supported) analytics = getAnalytics(app);
    })
    .catch(function () {
        analytics = null;
    });

window.heliomedFirebase = {
    app,
    auth,
    db,
    functions,
    storage,
    get analytics() {
        return analytics;
    }
};

export { app, auth, db, functions, storage };
