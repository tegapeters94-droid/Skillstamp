// SkillStamp — Centralized Init Gate (00-init-gate.js)
// ─────────────────────────────────────────────────────────────────────────
// THE SINGLE AUTHORITY for app startup sequencing.
//
// How it works:
//   firebase.js (ES module) owns the ONE onAuthStateChanged listener.
//   It resolves window._fbAuthReady promise with the user (or null).
//   This gate awaits that promise — no polling, no race, no missed fires.
//
// Startup paths:
//   A) Session restore  → _fbAuthReady resolves with fbUser
//                       → fetch profile + CACHE → enterApp() once
//   B) Guest / no auth  → _fbAuthReady resolves with null
//                       → show login immediately
//   C) Manual login     → doLogin sets _loginInProgress=true
//                       → gate's session path skips
//                       → doLogin calls _gateEnter() after hydration
// ─────────────────────────────────────────────────────────────────────────

(function(global) {
'use strict';

// ── Global state flags ────────────────────────────────────────────────────
global._appReady             = false;
global._appEntered           = false;
global._loginInProgress      = false;
global._googleAuthInProgress = false;

// ── Deadlock safety ───────────────────────────────────────────────────────
// If nothing resolves within 8 seconds, force the login screen.
// This prevents infinite blank state if Firebase fails to respond.
var _hardTimeout = setTimeout(function() {
  if (!global._appEntered) {
    console.warn('[InitGate] Hard timeout — forcing login screen');
    _showLogin();
  }
}, 8000);

// ── Screen helpers ────────────────────────────────────────────────────────
function _hideLoading() {
  var el = document.getElementById('screen-loading');
  if (el) el.style.display = 'none';
}

function _showLogin() {
  clearTimeout(_hardTimeout);
  _hideLoading();
  var loginEl = document.getElementById('screen-login');
  if (loginEl) { loginEl.classList.add('active'); loginEl.style.display = ''; }
  var appEl = document.getElementById('screen-app');
  if (appEl) { appEl.classList.remove('active'); appEl.style.display = 'none'; }
  if (global.showLsScreen) global.showLsScreen('start');
}

function _showBanned() {
  _showLogin();
  setTimeout(function() {
    if (global.showBannedScreen) global.showBannedScreen();
  }, 400);
}

// ── Safe CACHE preload ────────────────────────────────────────────────────
async function _preloadCache() {
  if (!global.FB_FNS || !global.FB_DB) return;
  try {
    var results = await Promise.all([
      global.FB_FNS.getDocs(global.FB_FNS.collection(global.FB_DB, 'users')),
      global.FB_FNS.getDocs(global.FB_FNS.collection(global.FB_DB, 'gigs')),
      global.FB_FNS.getDocs(global.FB_FNS.collection(global.FB_DB, 'endorsements')),
    ]);
    global.CACHE = global.CACHE || {};
    if (results[0] && !results[0].empty) CACHE.users        = results[0].docs.map(function(d){ return d.data(); });
    if (results[1] && !results[1].empty) CACHE.gigs         = results[1].docs.map(function(d){ return d.data(); });
    if (results[2] && !results[2].empty) CACHE.endorsements = results[2].docs.map(function(d){ return d.data(); });
  } catch(e) {
    console.warn('[InitGate] Cache preload failed (non-fatal):', e.message);
  }
}

// ── Avatar loader (background, non-blocking) ──────────────────────────────
function _loadAvatar(uid) {
  if (!global.fbGet) return;
  global.fbGet('avatars', uid).then(function(av) {
    if (av && av.data && global.ME && !global.ME.avatar) {
      global.ME.avatar = av.data;
      var navAv = document.getElementById('nav-av');
      if (navAv) {
        navAv.innerHTML = '<img src="' + av.data + '" style="width:100%;height:100%;object-fit:cover;">';
        navAv.style.background = '';
      }
    }
  }).catch(function() {});
}

// ── Core: enter app ONCE after full hydration ─────────────────────────────
function _doEnter(pageToShow, isNewUser) {
  clearTimeout(_hardTimeout);

  if (global._appEntered) {
    console.info('[InitGate] Already entered — skipping duplicate call');
    return;
  }

  // enterApp() in 06-app-shell.js wires DOM, starts realtime listeners
  if (typeof global.enterApp === 'function') {
    global.enterApp();
  }

  global._appReady = true;

  // Navigate to correct page AFTER enterApp wires the DOM
  var targetPage = pageToShow || 'home';
  if (typeof global.showPage === 'function') {
    global.showPage(targetPage);
  }

  // Deferred UX — fires once, after render settles
  setTimeout(function() {
    if (!global.ME) return;
    var obKey  = 'ob_done_' + global.ME.uid;
    var obDone = global.LOCAL && global.LOCAL.get(obKey);
    if (isNewUser && !obDone) {
      if (typeof global.showOnboarding === 'function') global.showOnboarding();
    } else if (!obDone) {
      if (typeof global.checkProfileComplete === 'function') global.checkProfileComplete();
    }
    if (typeof global.startNotifRealtimeListener === 'function') {
      global.startNotifRealtimeListener();
    }
  }, 800);
}

// ── Session restore ───────────────────────────────────────────────────────
async function _restoreSession(fbUser) {
  try {
    var snap = await global.FB_FNS.getDoc(
      global.FB_FNS.doc(global.FB_DB, 'users', fbUser.uid)
    );

    if (!snap.exists()) {
      console.warn('[InitGate] No Firestore profile for uid:', fbUser.uid);
      _showLogin();
      return;
    }

    var user = snap.data();

    if (user.isBanned || user.badgeStatus === 'suspended') {
      try { await global.FB_FNS.signOut(global.FB_AUTH); } catch(e) {}
      localStorage.clear();
      _showBanned();
      return;
    }

    // Hydrate ME with confirmed role BEFORE any rendering
    global.ME = user;
    if (typeof global.normalizeUser === 'function') {
      global.ME = global.normalizeUser(global.ME);
    }
    if (global.LOCAL) global.LOCAL.set('session', global.ME.uid);

    // Load CACHE with role already known — first render will be correct
    await _preloadCache();
    _loadAvatar(global.ME.uid);

    var saved = localStorage.getItem('ss_last_page') ||
                sessionStorage.getItem('ss_page') || 'home';
    var valid = ['home', 'talent', 'gigs', 'myprofile', 'wallet'];
    var page  = valid.indexOf(saved) >= 0 ? saved : 'home';

    _doEnter(page, false);

  } catch(e) {
    console.error('[InitGate] Session restore error:', e);
    _showLogin();
  }
}

// ── Main boot ─────────────────────────────────────────────────────────────
function _boot() {
  if (global._loginInProgress || global._googleAuthInProgress) return;

  // Poll for _fbAuthReady — set by firebase.js ES module asynchronously
  if (typeof global._fbAuthReady === 'undefined') {
    setTimeout(_boot, 50);
    return;
  }

  global._fbAuthReady.then(function(fbUser) {
    // Step aside if a manual login fired while we were waiting
    if (global._loginInProgress || global._googleAuthInProgress) return;
    if (global._appEntered) return;

    if (fbUser) {
      _restoreSession(fbUser);
    } else {
      // No session — show login immediately
      _showLogin();
    }
  }).catch(function(e) {
    console.error('[InitGate] Auth promise failed:', e);
    _showLogin();
  });
}

// ── Public API ────────────────────────────────────────────────────────────
global._gateEnter = function(pageToShow, isNewUser) {
  _doEnter(pageToShow || 'home', !!isNewUser);
};

// Boot after all synchronous scripts have loaded
setTimeout(_boot, 0);

})(window);
