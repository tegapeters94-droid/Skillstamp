// SkillStamp — Init Gate v3 (00-init-gate.js)
// ─────────────────────────────────────────────────────────────────────────
// THE SINGLE AUTHORITY for startup sequencing.
//
// ARCHITECTURE:
//   firebase.js (ES module) sets window._fbAuthReady — a Promise that
//   resolves once with the Firebase user (or null). This gate awaits it.
//
// THREE startup paths:
//   GUEST:  _fbAuthReady → null → _showLogin() → STOP
//   RETURN: _fbAuthReady → user → _restoreSession() → _doEnter()
//   LOGIN:  doLogin/doSignup set _loginInProgress=true → gate steps aside
//           → they call window._gateEnter() after full hydration
//
// INVARIANT: exactly one of {loading, login, app} is visible at all times.
// ─────────────────────────────────────────────────────────────────────────

(function(global) {
'use strict';

// ── Global flags (window-scoped so all modules can read/write) ────────────
global._appReady             = false;
global._appEntered           = false;
global._loginInProgress      = false;
global._googleAuthInProgress = false;

console.log('[INIT] Gate loaded — waiting for Firebase auth promise');

// ── Hard safety timeout ───────────────────────────────────────────────────
// If NOTHING resolves within 10s, force login. Prevents infinite blank state.
var _hardTimeout = setTimeout(function() {
  if (!global._appEntered && !global._appReady) {
    console.warn('[INIT] Hard timeout hit — forcing login screen');
    _showLogin();
  }
}, 10000);

// ── Enforce UI invariant: always exactly one screen visible ───────────────
function _assertOneScreen(active) {
  var loading = document.getElementById('screen-loading');
  var login   = document.getElementById('screen-login');
  var app     = document.getElementById('screen-app');
  if (!loading || !login || !app) return;

  if (active === 'loading') {
    loading.style.display = '';
    login.classList.remove('active'); login.style.display = 'none';
    app.classList.remove('active');   app.style.display   = 'none';
  } else if (active === 'login') {
    loading.style.display = 'none';
    login.classList.add('active');    login.style.display  = '';
    app.classList.remove('active');   app.style.display    = 'none';
  } else if (active === 'app') {
    loading.style.display = 'none';
    login.classList.remove('active'); login.style.display = 'none';
    app.classList.add('active');      app.style.display   = 'block';
  }
}

// ── Screen transitions ────────────────────────────────────────────────────
function _showLogin() {
  clearTimeout(_hardTimeout);
  console.log('[AUTH] No session → showing login screen');
  _assertOneScreen('login');
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
  console.log('[INIT] Preloading CACHE (users, gigs, endorsements)');
  if (!global.FB_FNS || !global.FB_DB) {
    console.warn('[INIT] Firebase not ready for CACHE preload');
    return;
  }
  try {
    var results = await Promise.all([
      global.FB_FNS.getDocs(global.FB_FNS.collection(global.FB_DB, 'users')),
      global.FB_FNS.getDocs(global.FB_FNS.collection(global.FB_DB, 'gigs')),
      global.FB_FNS.getDocs(global.FB_FNS.collection(global.FB_DB, 'endorsements')),
    ]);
    global.CACHE = global.CACHE || {};
    if (results[0] && !results[0].empty) {
      CACHE.users = results[0].docs.map(function(d){ return d.data(); });
    }
    if (results[1] && !results[1].empty) {
      CACHE.gigs = results[1].docs.map(function(d){ return d.data(); });
    }
    if (results[2] && !results[2].empty) {
      CACHE.endorsements = results[2].docs.map(function(d){ return d.data(); });
    }
    console.log('[INIT] CACHE loaded — users:', (CACHE.users||[]).length,
                'gigs:', (CACHE.gigs||[]).length);
  } catch(e) {
    console.warn('[INIT] CACHE preload failed (non-fatal):', e.message);
  }
}

// ── Avatar loader (background, never blocks render) ───────────────────────
function _loadAvatar(uid) {
  if (!global.fbGet) return;
  global.fbGet('avatars', uid).then(function(av) {
    if (av && av.data && global.ME && !global.ME.avatar) {
      global.ME.avatar = av.data;
      var navAv = document.getElementById('nav-av');
      if (navAv) {
        navAv.innerHTML = '<img src="' + av.data +
          '" style="width:100%;height:100%;object-fit:cover;">';
        navAv.style.background = '';
      }
    }
  }).catch(function() {});
}

// ── Core entry: wire app + route ONCE ────────────────────────────────────
// Called only after ME is fully hydrated and CACHE is populated.
// enterApp() wires the DOM. showPage() does the first render.
// Neither is called anywhere else during startup.
function _doEnter(pageToShow, isNewUser) {
  clearTimeout(_hardTimeout);

  if (global._appEntered) {
    console.info('[INIT] _doEnter: already entered — skipping');
    return;
  }

  console.log('[RENDER] _doEnter() — role:', global.ME && global.ME.role,
              '— page:', pageToShow);

  // Wire the app shell DOM (hides login, shows app, starts listeners)
  // enterApp() does NOT call showPage() anymore — we control routing here
  if (typeof global.enterApp === 'function') {
    global.enterApp();
  } else {
    console.error('[INIT] enterApp() not found — falling back to login');
    _showLogin();
    return;
  }

  global._appReady = true;

  // First page render — role is confirmed, CACHE is loaded
  // This is the ONLY showPage() call during startup
  var targetPage = pageToShow || 'home';
  console.log('[ROUTE] First showPage:', targetPage);
  if (typeof global.showPage === 'function') {
    global.showPage(targetPage);
  }

  // Deferred UX — after render settles (800ms)
  // Welcome popup / onboarding fires ONCE here and nowhere else
  setTimeout(function() {
    if (!global.ME || !global.ME.uid) return;
    var obKey  = 'ob_done_' + global.ME.uid;
    var obDone = global.LOCAL && global.LOCAL.get(obKey);

    console.log('[RENDER] Deferred UX — isNewUser:', isNewUser,
                'obDone:', !!obDone);

    if (isNewUser && !obDone) {
      if (typeof global.showOnboarding === 'function') {
        console.log('[RENDER] Showing onboarding');
        global.showOnboarding();
      }
    } else if (!obDone) {
      if (typeof global.checkProfileComplete === 'function') {
        global.checkProfileComplete();
      }
    }

    // Notif listener starts last — never competes with initial render
    if (typeof global.startNotifRealtimeListener === 'function') {
      global.startNotifRealtimeListener();
    }
  }, 800);
}

// ── Session restore (returning authenticated user) ────────────────────────
async function _restoreSession(fbUser) {
  console.log('[AUTH] Authenticated user found:', fbUser.uid,
              '— fetching Firestore profile');
  try {
    var snap = await global.FB_FNS.getDoc(
      global.FB_FNS.doc(global.FB_DB, 'users', fbUser.uid)
    );

    if (!snap.exists()) {
      console.warn('[AUTH] No Firestore profile for uid:', fbUser.uid);
      _showLogin();
      return;
    }

    var user = snap.data();
    console.log('[AUTH] Profile fetched — role:', user.role,
                'badge:', user.badgeStatus);

    if (user.isBanned || user.badgeStatus === 'suspended') {
      console.warn('[AUTH] User is banned — signing out');
      try { await global.FB_FNS.signOut(global.FB_AUTH); } catch(e) {}
      localStorage.clear();
      _showBanned();
      return;
    }

    // Hydrate ME with confirmed role BEFORE any rendering
    console.log('[AUTH] Hydrating ME — role confirmed:', user.role);
    global.ME = user;
    if (typeof global.normalizeUser === 'function') {
      global.ME = global.normalizeUser(global.ME);
    }
    if (global.LOCAL) global.LOCAL.set('session', global.ME.uid);

    // Load CACHE — role is known, so first render will be correct
    await _preloadCache();

    // Avatar loads in background after first render
    _loadAvatar(global.ME.uid);

    // Restore last visited page (default: home)
    var saved = '';
    try { saved = localStorage.getItem('ss_last_page') || ''; } catch(e){}
    var valid = ['home', 'talent', 'gigs', 'myprofile', 'wallet'];
    var page  = valid.indexOf(saved) >= 0 ? saved : 'home';

    console.log('[ROUTE] Restoring page:', page);
    _doEnter(page, false);

  } catch(e) {
    console.error('[AUTH] Session restore failed:', e);
    _showLogin();
  }
}

// ── Boot sequence ─────────────────────────────────────────────────────────
// Polls for window._fbAuthReady (set by firebase.js ES module).
// ES modules are async — _fbAuthReady may not exist immediately.
var _pollCount = 0;
function _boot() {
  // If a manual login/signup is already handling the flow, step aside
  if (global._loginInProgress || global._googleAuthInProgress) {
    console.log('[INIT] Login in progress — gate stepping aside');
    return;
  }

  if (typeof global._fbAuthReady === 'undefined') {
    _pollCount++;
    if (_pollCount > 100) { // 5 seconds of polling
      console.error('[INIT] _fbAuthReady never set — Firebase may have failed');
      _showLogin();
      return;
    }
    setTimeout(_boot, 50);
    return;
  }

  console.log('[AUTH] _fbAuthReady found — awaiting auth resolution');

  global._fbAuthReady.then(function(fbUser) {
    console.log('[AUTH] Auth resolved —', fbUser ? 'user: ' + fbUser.uid : 'no session');

    // If a login flow started while we polled, step aside
    if (global._loginInProgress || global._googleAuthInProgress) {
      console.log('[INIT] Login flow took over — gate stepping aside');
      return;
    }
    // If somehow enterApp already ran (shouldn't happen), skip
    if (global._appEntered) {
      console.info('[INIT] App already entered before gate resolved');
      return;
    }

    if (fbUser) {
      console.log('[AUTH] Session found — restoring');
      _restoreSession(fbUser);
    } else {
      console.log('[AUTH] No session — showing login');
      _showLogin();
    }
  }).catch(function(e) {
    console.error('[AUTH] _fbAuthReady rejected:', e);
    _showLogin();
  });
}

// ── Public API ────────────────────────────────────────────────────────────
// Called by doLogin / doSignup / _loadCacheAndEnter after hydrating ME + CACHE
global._gateEnter = function(pageToShow, isNewUser) {
  console.log('[INIT] _gateEnter() called by login flow —',
              'page:', pageToShow, 'new:', isNewUser);
  _doEnter(pageToShow || 'home', !!isNewUser);
};

// ── Start ─────────────────────────────────────────────────────────────────
console.log('[INIT] Gate booting');
setTimeout(_boot, 0);

})(window);
