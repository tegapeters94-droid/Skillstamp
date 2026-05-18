// ─── Firebase Initialization (ES Module) ────────────────
// ═══════════════════════════════════════════════════════
//  FIREBASE CONFIG — Replace with YOUR config from Firebase Console
// ═══════════════════════════════════════════════════════
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, sendPasswordResetEmail, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, getDocs, addDoc, updateDoc, deleteDoc, collection, query, orderBy, onSnapshot, serverTimestamp, where, limit } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-functions.js";

const firebaseConfig = {
  apiKey: "AIzaSyBFYNYLGyHMpMwicgvDX1THQUoVsA7ewD4",
  authDomain: "skillstamp-12714.firebaseapp.com",
  projectId: "skillstamp-12714",
  storageBucket: "skillstamp-12714.firebasestorage.app",
  messagingSenderId: "156372069524",
  appId: "1:156372069524:web:06230a7b6f537c60b35881",
  measurementId: "G-NLNWBPXZLP"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const fns = getFunctions(app, 'us-central1');

// ── Expose Firebase to the rest of the app ──────────────
window.FB_AUTH = auth;
window.FB_DB = db;
window.FB_FNS = {
  createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut,
  onAuthStateChanged, sendPasswordResetEmail, GoogleAuthProvider, signInWithPopup,
  doc, setDoc, getDoc, getDocs,
  addDoc, updateDoc, deleteDoc, collection, query, orderBy, onSnapshot,
  serverTimestamp, where, limit
};
// FB_CALL: factory for calling Cloud Functions from the backend bridge
// Usage: window.FB_CALL('functionName')({ ...data }) → Promise
window.FB_CALL = function(fnName) { return httpsCallable(fns, fnName); };

// ── Auth resolution promise ──────────────────────────────────────────────
// firebase.js owns the ONLY onAuthStateChanged listener.
// Resolves once with the Firebase user (or null).
// 00-init-gate.js consumes this promise — no race, no missed events.
console.log('[AUTH] Attaching onAuthStateChanged — setting _fbAuthReady promise');
window._fbAuthReady = new Promise(function(resolve) {
  var unsubscribe = onAuthStateChanged(auth, function(fbUser) {
    unsubscribe(); // one-time — detach immediately after first event
    console.log('[AUTH] onAuthStateChanged fired —',
                fbUser ? 'uid: ' + fbUser.uid : 'null (guest)');
    window._fbAuthUser = fbUser;
    resolve(fbUser);
  });
});

console.log('[INIT] Firebase initialized ✓');
