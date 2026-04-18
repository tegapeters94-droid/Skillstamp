// ─── Firebase Initialization (ES Module) ────────────────
// ═══════════════════════════════════════════════════════
//  FIREBASE CONFIG — Replace with YOUR config from Firebase Console
// ═══════════════════════════════════════════════════════
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, getDocs, addDoc, updateDoc, deleteDoc, collection, query, orderBy, onSnapshot, serverTimestamp, where, limit } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

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

// ── Expose Firebase to the rest of the app ──────────────
window.FB_AUTH = auth;
window.FB_DB = db;
window.FB_FNS = {
  createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut,
  onAuthStateChanged, sendPasswordResetEmail, doc, setDoc, getDoc, getDocs,
  addDoc, updateDoc, deleteDoc, collection, query, orderBy, onSnapshot,
  serverTimestamp, where, limit
};

// ── Auth state listener ─────────────────────────────────
onAuthStateChanged(auth, async (fbUser) => {
  if (fbUser) {
    try {
      const snap = await getDoc(doc(db, 'users', fbUser.uid));
      if (snap.exists()) {
        window.ME = snap.data();
        // Block banned users even on session restore
        if(window.ME && (window.ME.isBanned || window.ME.badgeStatus==='suspended')){
          try{ await signOut(auth); }catch(e){}
          localStorage.clear();
          document.getElementById('screen-login').classList.add('active'); if(window.showLsScreen) showLsScreen('start');
          document.getElementById('screen-app').classList.remove('active');
          setTimeout(function(){ if(window.showBannedScreen) window.showBannedScreen(); },400);
          return;
        }
        // Admin access via admin.html only — tab permanently hidden
        // Restore session — load all data first then enter app
        if (!document.getElementById('screen-app').classList.contains('active')) {
          // Load ALL data before rendering — retry up to 3x on failure
          var loadScreen=document.getElementById('screen-loading');
          if(loadScreen) loadScreen.style.display='flex';
          var dataReady = false;
          for (var attempt = 0; attempt < 3 && !dataReady; attempt++) {
            try {
              const [users, gigs, posts, endorsements] = await Promise.all([
                window.FB_FNS.getDocs(window.FB_FNS.collection(window.FB_DB,'users')),
                window.FB_FNS.getDocs(window.FB_FNS.collection(window.FB_DB,'gigs')),
                window.FB_FNS.getDocs(window.FB_FNS.collection(window.FB_DB,'posts')),
                window.FB_FNS.getDocs(window.FB_FNS.collection(window.FB_DB,'endorsements'))
              ]);
              CACHE.users = users.docs.map(d=>d.data());
              CACHE.gigs = gigs.docs.map(d=>d.data());
              CACHE.posts = posts.docs.map(d=>d.data()).sort((a,b)=>(b.ts||0)-(a.ts||0));
              CACHE.endorsements = endorsements.docs.map(d=>d.data());
              dataReady = true;
            } catch(loadErr) {
              console.warn('Data load attempt '+(attempt+1)+' failed:', loadErr.message);
              if (attempt < 2) await new Promise(r => setTimeout(r, 800 * (attempt + 1)));
            }
          }
          if(loadScreen) loadScreen.style.display='none';
          enterApp();
          var savedPage=localStorage.getItem('ss_last_page')||sessionStorage.getItem('ss_page')||'home';
          var validPages=['home','talent','gigs','myprofile','wallet'];
          var pageToRestore=validPages.indexOf(savedPage)>=0?savedPage:'home';
          // Data is guaranteed loaded — render immediately
          showPage(pageToRestore);
          // Load avatar fresh from avatars collection
          fbGet('avatars', window.ME.uid).then(function(av){
            if(av&&av.data){
              window.ME.avatar=av.data;
              var navAv=document.getElementById('nav-av');
              if(navAv){navAv.innerHTML='<img src="'+av.data+'" style="width:100%;height:100%;object-fit:cover;">';navAv.style.background='';}
            }
          }).catch(function(){});
        } else {
          // Already in app - refresh admin tab visibility
          if (adminTab && window.ME && window.ME.isAdmin) adminTab.style.display = '';
        }
      }
    } catch(e) {
      console.warn('Session restore failed', e);
      document.getElementById('screen-loading').style.display='none';
      document.getElementById('screen-login').classList.add('active'); if(window.showLsScreen) showLsScreen('start');
    }
  } else {
    document.getElementById('screen-loading').style.display='none';
    document.getElementById('screen-login').classList.add('active'); if(window.showLsScreen) showLsScreen('start');
  }
});

console.log('Firebase initialized ✓');
