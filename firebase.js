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

// ── Auth state ───────────────────────────────────────────────────────────
// Session restore is handled by window.addEventListener('load') in 05-auth.js
// which reads LOCAL.get('session') and calls enterApp() directly.
// This listener is kept only to handle the case where the load listener
// doesn't have a session key but Firebase still has an active auth token.
onAuthStateChanged(auth, async (fbUser) => {
  if (window._appEntered) return; // app already running — skip
  if (fbUser) {
    // Only act if the load listener didn't already enter the app
    setTimeout(async function() {
      if (window._appEntered) return;
      try {
        const snap = await getDoc(doc(db, 'users', fbUser.uid));
        if (snap.exists()) {
          window.ME = snap.data();
          if (window.ME.isBanned || window.ME.badgeStatus === 'suspended') {
            try { await signOut(auth); } catch(e) {}
            localStorage.clear();
            var ls = document.getElementById('screen-loading');
            if (ls) ls.style.display = 'none';
            return;
          }
          if (typeof normalizeUser === 'function') window.ME = normalizeUser(window.ME);
          LOCAL.set('session', window.ME.uid);
          var ls2 = document.getElementById('screen-loading');
          if (ls2) ls2.style.display = 'none';
          if (typeof enterApp === 'function') enterApp();
        } else {
          var ls3 = document.getElementById('screen-loading');
          if (ls3) ls3.style.display = 'none';
        }
      } catch(e) {
        var ls4 = document.getElementById('screen-loading');
        if (ls4) ls4.style.display = 'none';
      }
    }, 800); // delay gives load listener time to run first
  } else {
    // Not signed in — hide loading if load listener hasn't already
    setTimeout(function() {
      if (window._appEntered) return;
      var ls = document.getElementById('screen-loading');
      if (ls) ls.style.display = 'none';
    }, 800);
  }
});

console.log('Firebase initialized ✓');
