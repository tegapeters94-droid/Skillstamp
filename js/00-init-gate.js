// SkillStamp — Centralized Init Gate (00-init-gate.js)
// ─────────────────────────────────────────────────────────────────────────
// THE SINGLE AUTHORITY for app startup sequencing.
//
// Every previous startup path (onAuthStateChanged in firebase.js,
// window.addEventListener('load') in 05-auth.js) was competing and
// causing double/triple enterApp() calls and role flicker.
//
// This file owns the entire sequence:
//   1. Wait for Firebase auth to resolve (one-time onAuthStateChanged)
//   2. If user found → fetch profile + CACHE in parallel
//   3. Hydrate ME + role fully
//   4. THEN call enterApp() exactly once
//   5. Restore the last page (or home)
//   6. Trigger welcome/onboarding ONCE
//
// ALL other modules must NOT call enterApp() during startup.
// doLogin / doSignup / doGoogleAuth are the only other callers,
// and they set window._loginInProgress = true before doing so,
// which prevents this gate from double-firing.
// ─────────────────────────────────────────────────────────────────────────

(function(global) {
'use strict';

// ── State ────────────────────────────────────────────────────────────────
// All flags are on window so any module can read them safely.
global._appReady         = false;   // true after full hydration + enterApp
global._appEntered       = false;   // true after enterApp() DOM wiring runs
global._loginInProgress  = false;   // true during doLogin/doSignup/doGoogleAuth
global._googleAuthInProgress = false;

// ── Screen helpers ────────────────────────────────────────────────────────
function _showLoading() {
  var el = document.getElementById('screen-loading');
  if (el) el.style.display = '';
}

function _hideLoading() {
  var el = document.getElementById('screen-loading');
  if (el) el.style.display = 'none';
}

function _showLogin() {
  _hideLoading();
  var el = document.getElementById('screen-login');
  if (el) { el.classList.add('active'); el.style.display = ''; }
  var app = document.getElementById('screen-app');
  if (app) { app.classList.remove('active'); app.style.display = 'none'; }
  if (global.showLsScreen) global.showLsScreen('start');
}

function _showBanned() {
  _showLogin();
  setTimeout(function() {
    if (global.showBannedScreen) global.showBannedScreen();
  }, 400);
}

// ── Safe CACHE preload ────────────────────────────────────────────────────
// Loads all collections in parallel. Never throws.
async function _preloadCache() {
  if (!global.FB_FNS || !global.FB_DB) return;
  try {
    var results = await Promise.all([
      global.FB_FNS.getDocs(global.FB_FNS.collection(global.FB_DB, 'users')),
      global.FB_FNS.getDocs(global.FB_FNS.collection(global.FB_DB, 'gigs')),
      global.FB_FNS.getDocs(global.FB_FNS.collection(global.FB_DB, 'endorsements')),
    ]);
    global.CACHE = global.CACHE || {};
    if (results[0] && !results[0].empty) {
      CACHE.users = results[0].docs.map(function(d) { return d.data(); });
    }
    if (results[1] && !results[1].empty) {
      CACHE.gigs = results[1].docs.map(function(d) { return d.data(); });
    }
    if (results[2] && !results[2].empty) {
      CACHE.endorsements = results[2].docs.map(function(d) { return d.data(); });
    }
  } catch(e) {
    console.warn('[InitGate] Cache preload failed (non-fatal):', e.message);
  }
}

// ── Avatar loader ─────────────────────────────────────────────────────────
function _loadAvatar(uid) {
  if (!global.fbGet) return;
  global.fbGet('avatars', uid).then(function(av) {
    if (av && av.data && global.ME && !global.ME.avatar) {
      global.ME.avatar = av.data;
      // Update nav avatar if already rendered
      var navAv = document.getElementById('nav-av');
      if (navAv && navAv.tagName) {
        navAv.innerHTML = '<img src="' + av.data + '" style="width:100%;height:100%;object-fit:cover;">';
        navAv.style.background = '';
      }
    }
  }).catch(function() {});
}

// ── Core: enter app exactly once ──────────────────────────────────────────
// Called only AFTER ME is fully hydrated and CACHE is loaded.
function _doEnter(pageToShow, isNewUser) {
  if (global._appEntered) {
    console.info('[InitGate] enterApp already ran — skipping');
    return;
  }

  // Call the app-shell's enterApp() which wires DOM, starts listeners, etc.
  if (typeof global.enterApp === 'function') {
    global.enterApp();
  }

  global._appReady = true;

  // Navigate to the correct page
  var targetPage = pageToShow || 'home';
  if (typeof global.showPage === 'function') {
    global.showPage(targetPage);
  }

  // Deferred: welcome popup / onboarding — fires ONCE after render settles
  setTimeout(function() {
    if (!global.ME) return;
    var obDone = global.LOCAL && global.LOCAL.get('ob_done_' + global.ME.uid);
    if (isNewUser && !obDone) {
      if (typeof global.showOnboarding === 'function') global.showOnboarding();
    } else if (!isNewUser && !obDone) {
      if (typeof global.checkProfileComplete === 'function') global.checkProfileComplete();
    }
    // Notif listener — start late so it doesn't compete with initial render
    if (typeof global.startNotifRealtimeListener === 'function') {
      global.startNotifRealtimeListener();
    }
  }, 800);
}

// ── Session restore path ──────────────────────────────────────────────────
// Called by onAuthStateChanged when a returning session is detected.
// (NOT called during manual login — doLogin sets _loginInProgress to block this)
async function _restoreSession(fbUser) {
  try {
    // Fetch user profile from Firestore
    var snap = await global.FB_FNS.getDoc(
      global.FB_FNS.doc(global.FB_DB, 'users', fbUser.uid)
    );

    if (!snap.exists()) {
      // Firebase Auth user exists but no Firestore profile — treat as logged out
      console.warn('[InitGate] No user profile found for uid:', fbUser.uid);
      _showLogin();
      return;
    }

    var user = snap.data();

    // Ban check
    if (user.isBanned || user.badgeStatus === 'suspended') {
      try { await global.FB_FNS.signOut(global.FB_AUTH); } catch(e) {}
      localStorage.clear();
      _showBanned();
      return;
    }

    // Hydrate ME — role is now confirmed before any rendering
    global.ME = user;
    if (typeof global.normalizeUser === 'function') {
      global.ME = global.normalizeUser(global.ME);
    }

    // Set session key
    if (global.LOCAL) global.LOCAL.set('session', global.ME.uid);

    // Load CACHE in parallel — role is already known, so rendering will be correct
    await _preloadCache();

    // Load avatar in background (non-blocking)
    _loadAvatar(global.ME.uid);

    // Restore last visited page
    var savedPage = localStorage.getItem('ss_last_page') ||
                    sessionStorage.getItem('ss_page') || 'home';
    var validPages = ['home', 'talent', 'gigs', 'myprofile', 'wallet'];
    var pageToRestore = validPages.indexOf(savedPage) >= 0 ? savedPage : 'home';

    _doEnter(pageToRestore, false);

  } catch(e) {
    console.error('[InitGate] Session restore failed:', e);
    _showLogin();
  }
}

// ── Main startup listener ─────────────────────────────────────────────────
// Runs once on page load. After that, it's only relevant for manual
// login/logout flows which set _loginInProgress to skip this path.
function _attachAuthListener() {
  if (!global.FB_AUTH || !global.FB_FNS) {
    // Firebase not ready yet — retry in 100ms
    setTimeout(_attachAuthListener, 100);
    return;
  }

  global.FB_FNS.onAuthStateChanged(global.FB_AUTH, function(fbUser) {
    // Skip entirely if a manual login/signup/google flow is handling the session.
    // Those flows call enterApp() themselves after full hydration.
    if (global._loginInProgress)      return;
    if (global._googleAuthInProgress) return;

    if (fbUser) {
      // Only restore session if app hasn't entered yet (prevents double-fire)
      if (!global._appEntered) {
        _restoreSession(fbUser);
      }
    } else {
      // Guest/unauthenticated flow
      // Ensure startup gate fully resolves instead of leaving the app
      // in a partial loading state.
      global._appReady = true;
      global._appEntered = false;

      // Cleanly reset app shell visibility
      var appEl = document.getElementById('screen-app');
      if (appEl) {
        appEl.classList.remove('active');
        appEl.style.display = 'none';
      }

      var navEl = document.getElementById('bottom-nav');
      if (navEl) {
        navEl.style.display = 'none';
      }

      // Clear stale session references
      try {
        if (global.LOCAL) global.LOCAL.del('session');
      } catch(e) {}

      // Properly show login/start screen
      _showLogin();
    }
  });
}

// ── Expose _doEnter for use by doLogin/doSignup/doGoogleAuth ─────────────
// These flows set _loginInProgress, pre-load CACHE themselves, then call
// global._gateEnter(pageToShow, isNewUser) to complete startup.
global._gateEnter = function(pageToShow, isNewUser) {
  _doEnter(pageToShow, isNewUser);
};

// ── Boot ──────────────────────────────────────────────────────────────────
// Wait for DOM + Firebase SDK before attaching the auth listener.
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function() {
    setTimeout(_attachAuthListener, 0);
  });
} else {
  setTimeout(_attachAuthListener, 0);
}

})(window);
