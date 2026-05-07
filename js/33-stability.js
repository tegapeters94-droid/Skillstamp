// SkillStamp — Stability Layer (v1)
// Normalizers · Safe rendering guards · Error boundary · Listener registry
// · Async sequencer · Schema contracts · Debug logging
//
// ARCHITECTURE RULE: This file ONLY adds safety infrastructure.
// It does NOT replace, rewrite, or override existing auth/data/UI code.
// Every function here is purely additive and backward-compatible.
// Load order: after 02-db.js, before everything else (position 3 in index.html).

(function (global) {
'use strict';

// ═══════════════════════════════════════════════════════════════════════════
//  PART 1 — DATA CONTRACTS (schema definitions as documentation + runtime)
// ═══════════════════════════════════════════════════════════════════════════

// These are the canonical shapes for all major objects.
// normalizeX() functions below enforce these at runtime safely.

var SCHEMA_VERSION = 1;  // bump when breaking changes happen

// ── PART 2 — NORMALIZERS ────────────────────────────────────────────────────
// Each normalizer returns a safe, complete object with all fields guaranteed.
// Uses spread so all *existing* fields are preserved — normalizers only ADD
// missing defaults, they never remove or overwrite existing data.

global.normalizeUser = function (u) {
  u = u || {};
  return Object.assign({
    uid:                '',
    email:              '',
    name:               'Unknown User',
    username:           '',
    role:               'freelancer',
    title:              '',
    headline:           '',
    bio:                '',
    country:            '',
    city:               '',
    category:           '',
    skills:             [],
    services:           [],
    links:              {},
    portfolio:          [],
    experience:         '',
    badgeStatus:        'beginner',
    score:              0,
    repPoints:          0,
    gigsCount:          0,
    earned:             0,
    skillId:            null,
    gradient:           '#16a25a',
    avatar:             null,
    available:          true,
    availabilityStatus: 'available',
    wallet:             { balance: 0, pending: 0, earned: 0, transactions: [] },
    applications:       [],
    isAdmin:            false,
    isBanned:           false,
    created:            0,
    lastSeen:           0,
    lastActive:         0,
    lastUsernameChange: 0,
    _schemaVersion:     SCHEMA_VERSION,
  }, u, {
    // Force-safe nested arrays/objects even if u has them as null/undefined
    skills:       Array.isArray(u.skills)       ? u.skills       : [],
    services:     Array.isArray(u.services)     ? u.services     : [],
    portfolio:    Array.isArray(u.portfolio)    ? u.portfolio    : [],
    applications: Array.isArray(u.applications) ? u.applications : [],
    links:        (u.links && typeof u.links === 'object') ? u.links : {},
    wallet:       Object.assign(
      { balance: 0, pending: 0, earned: 0, transactions: [] },
      (u.wallet && typeof u.wallet === 'object') ? u.wallet : {},
      { transactions: Array.isArray((u.wallet || {}).transactions) ? u.wallet.transactions : [] }
    ),
  });
};

global.normalizeGig = function (g) {
  g = g || {};
  return Object.assign({
    id:          '',
    title:       '',
    description: '',
    category:    '',
    skills:      [],
    pay:         0,
    escrowAmount:0,
    scope:       '',
    duration:    '',
    deadline:    '',
    screeningQ:  '',
    posterUid:   '',
    posterName:  '',
    hiredUid:    null,
    status:      'open',
    directHire:  false,
    proposalId:  null,
    created:     0,
  }, g, {
    skills: Array.isArray(g.skills) ? g.skills : [],
  });
};

global.normalizeMessage = function (m) {
  m = m || {};
  return Object.assign({
    from:     '',
    text:     '',
    ts:       Date.now(),
    read:     false,
    _flagged: false,
    type:     'text',
  }, m);
};

global.normalizeConversation = function (c) {
  c = c || {};
  return Object.assign({
    participants: [],
    messages:     [],
    lastMsg:      '',
    lastTs:       0,
    unread:       {},
  }, c, {
    participants: Array.isArray(c.participants) ? c.participants : [],
    messages:     Array.isArray(c.messages)     ? c.messages.map(global.normalizeMessage) : [],
    unread:       (c.unread && typeof c.unread === 'object') ? c.unread : {},
  });
};

global.normalizeNotification = function (n) {
  n = n || {};
  return Object.assign({
    id:        '',
    uid:       '',
    type:      'system',
    title:     'Notification',
    body:      '',
    msg:       '',
    read:      false,
    ts:        Date.now(),
    priority:  'normal',
    meta:      {},
  }, n, {
    meta: (n.meta && typeof n.meta === 'object') ? n.meta : {},
  });
};

global.normalizePortfolioItem = function (p) {
  p = p || {};
  return Object.assign({
    id:          'pf' + Date.now(),
    title:       'Untitled Project',
    cat:         '',
    image:       null,
    images:      [],
    desc:        '',
    link:        null,
    overview:    null,
    problem:     null,
    solution:    null,
    results:     null,
    skills:      [],
    tools:       [],
    duration:    null,
    testimonial: null,
    projectType: null,
    clientName:  null,
    confidential:false,
    verified:    false,
    ts:          Date.now(),
  }, p, {
    skills: Array.isArray(p.skills) ? p.skills : [],
    tools:  Array.isArray(p.tools)  ? p.tools  : [],
    images: Array.isArray(p.images) ? p.images : (p.image ? [p.image] : []),
  });
};

global.normalizeTransaction = function (t) {
  t = t || {};
  return Object.assign({
    id:     't' + Date.now(),
    type:   'out',
    amount: 0,
    from:   '',
    to:     '',
    desc:   '',
    ts:     Date.now(),
    status: 'completed',
  }, t);
};

// ── Normalize ME safely (called once after login) ─────────────────────────
global.normalizeME = function () {
  if (!global.ME) return;
  global.ME = global.normalizeUser(global.ME);
};

// ═══════════════════════════════════════════════════════════════════════════
//  PART 3 — ERROR BOUNDARY & SAFE RENDER WRAPPER
// ═══════════════════════════════════════════════════════════════════════════

// Wrap any render function so it never produces a white screen
global.safeRender = function (label, fn) {
  try {
    return fn();
  } catch (err) {
    console.error('[SkillStamp] Render error in "' + label + '":', err);
    // Return empty string so callers can still concatenate safely
    return '';
  }
};

// Wrap a full page render (returns null on failure but logs clearly)
global.safePageRender = function (label, fn) {
  try {
    fn();
  } catch (err) {
    console.error('[SkillStamp] Page render failed "' + label + '":', err);
    // Show a non-intrusive error indicator instead of blank screen
    var pageId = 'page-' + label.toLowerCase().replace(/\s+/g, '-');
    var page   = document.getElementById(pageId);
    if (page && !page.querySelector('.ss-render-error')) {
      var errDiv = document.createElement('div');
      errDiv.className = 'ss-render-error';
      errDiv.style.cssText = 'padding:40px 24px;text-align:center;color:var(--td);font-size:13px;';
      errDiv.innerHTML = '<div style="font-size:28px;margin-bottom:10px;">⚠️</div>'
        + '<div style="font-weight:700;margin-bottom:6px;">Something went wrong loading this page.</div>'
        + '<div style="font-size:11px;">Pull to refresh or tap below.</div>'
        + '<button onclick="location.reload()" style="margin-top:16px;padding:10px 20px;background:var(--gld);border:none;border-radius:8px;font-weight:700;font-size:12px;cursor:pointer;">Reload App</button>';
      page.appendChild(errDiv);
    }
  }
};

// Guard: verify DOM node exists before rendering into it
global.guardEl = function (id, label) {
  var el = document.getElementById(id);
  if (!el) {
    console.warn('[SkillStamp] Missing DOM element "' + id + '"' + (label ? ' for ' + label : ''));
    return null;
  }
  return el;
};

// Guard: verify user/object exists
global.guardUser = function (u, context) {
  if (!u || typeof u !== 'object') {
    console.warn('[SkillStamp] Invalid user object' + (context ? ' in ' + context : ''), u);
    return false;
  }
  return true;
};

// ═══════════════════════════════════════════════════════════════════════════
//  PART 4 — LISTENER REGISTRY (deduplicate & clean up)
// ═══════════════════════════════════════════════════════════════════════════

var _listenerRegistry = {};  // key → unsubscribe function

// Register a Firebase listener. Automatically unsubs the previous one for the same key.
global.registerListener = function (key, unsubFn) {
  if (!key || typeof unsubFn !== 'function') return;
  global.unregisterListener(key);  // kill any previous listener for this key
  _listenerRegistry[key] = unsubFn;
};

// Unregister and call unsubscribe for a specific key
global.unregisterListener = function (key) {
  if (_listenerRegistry[key]) {
    try { _listenerRegistry[key](); } catch (e) {}
    delete _listenerRegistry[key];
  }
};

// Tear down ALL registered listeners (called on logout)
global.unregisterAllListeners = function () {
  Object.keys(_listenerRegistry).forEach(function (key) {
    try { _listenerRegistry[key](); } catch (e) {}
  });
  _listenerRegistry = {};
};

// Safe onSnapshot wrapper — registers, deduplicates, guards auth
global.safeListener = function (key, queryFn, onData, onError) {
  if (!global.ME || !global.ME.uid) {
    console.warn('[SkillStamp] safeListener called before ME is ready:', key);
    return;
  }
  if (!window.FB_FNS || !window.FB_DB) {
    console.warn('[SkillStamp] safeListener called before Firebase is ready:', key);
    return;
  }
  try {
    var unsub = window.FB_FNS.onSnapshot(
      queryFn(),
      function (snap) {
        try { onData(snap); } catch (e) {
          console.error('[SkillStamp] Listener data handler error [' + key + ']:', e);
        }
      },
      function (err) {
        console.warn('[SkillStamp] Listener error [' + key + ']:', err);
        if (typeof onError === 'function') onError(err);
      }
    );
    global.registerListener(key, unsub);
  } catch (e) {
    console.warn('[SkillStamp] safeListener setup failed [' + key + ']:', e);
  }
};

// ═══════════════════════════════════════════════════════════════════════════
//  PART 5 — ASYNC SEQUENCER (load critical path first, defer secondary)
// ═══════════════════════════════════════════════════════════════════════════

// Queue secondary async tasks to run after the critical path completes
var _deferQueue = [];
var _deferTimer = null;

global.deferTask = function (label, fn, delayMs) {
  _deferQueue.push({ label: label, fn: fn, delay: delayMs || 0 });
};

global.flushDeferredTasks = function () {
  _deferQueue.forEach(function (task) {
    setTimeout(function () {
      try {
        task.fn();
      } catch (e) {
        console.warn('[SkillStamp] Deferred task "' + task.label + '" failed:', e);
      }
    }, task.delay);
  });
  _deferQueue = [];
};

// ═══════════════════════════════════════════════════════════════════════════
//  PART 6 — SAFE PARTIAL FIRESTORE UPDATE
// ═══════════════════════════════════════════════════════════════════════════

// Replaces fbSet for profile/user updates — uses updateDoc (merge) to avoid
// overwriting fields set by other devices/tabs.
global.safeUpdateUser = async function (uid, partialData) {
  if (!uid || !partialData) {
    console.warn('[SkillStamp] safeUpdateUser called with invalid args', uid);
    return;
  }
  if (!window.FB_FNS || !window.FB_DB) {
    console.warn('[SkillStamp] safeUpdateUser: Firebase not ready');
    return;
  }
  // Never allow overwriting another user's data
  if (global.ME && global.ME.uid && uid !== global.ME.uid && !global.ME.isAdmin) {
    console.error('[SkillStamp] SECURITY: attempted cross-user write blocked', uid);
    return;
  }
  try {
    var ref = window.FB_FNS.doc(window.FB_DB, 'users', uid);
    await window.FB_FNS.updateDoc(ref, partialData);
  } catch (e) {
    // updateDoc fails if doc doesn't exist yet — fall back to setDoc (first-time user)
    if (e.code === 'not-found') {
      try { await window.FB_FNS.setDoc(window.FB_FNS.doc(window.FB_DB, 'users', uid), partialData, { merge: true }); } catch (e2) {
        console.warn('[SkillStamp] safeUpdateUser setDoc fallback failed:', e2);
      }
    } else {
      console.warn('[SkillStamp] safeUpdateUser failed:', uid, e);
    }
  }
};

// Convenience: update only specific profile fields (not the whole ME object)
global.updateProfileFields = function (fields) {
  if (!global.ME) return Promise.resolve();
  // Optimistically apply to local ME
  Object.assign(global.ME, fields);
  // Sync CACHE
  if (global.CACHE && global.CACHE.users) {
    var idx = global.CACHE.users.findIndex(function (u) { return u.uid === global.ME.uid; });
    if (idx >= 0) Object.assign(global.CACHE.users[idx], fields);
  }
  return global.safeUpdateUser(global.ME.uid, fields);
};

// ═══════════════════════════════════════════════════════════════════════════
//  PART 7 — MESSAGING SAFETY LAYER
// ═══════════════════════════════════════════════════════════════════════════

// Safe conversation ID builder (always consistent ordering)
global.convId = function (uidA, uidB) {
  if (!uidA || !uidB) return null;
  return [uidA, uidB].sort().join('_');
};

// Safe message text sanitizer (prevent XSS in rendered chat)
global.sanitizeMsgText = function (text) {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

// Validate a conversation object before rendering
global.validateConversation = function (conv) {
  if (!conv) { console.warn('[SkillStamp] validateConversation: null conv'); return false; }
  if (!Array.isArray(conv.participants) || conv.participants.length < 2) {
    console.warn('[SkillStamp] validateConversation: bad participants', conv);
    return false;
  }
  return true;
};

// ═══════════════════════════════════════════════════════════════════════════
//  PART 8 — ARRAY/OBJECT SAFE HELPERS (global utilities)
// ═══════════════════════════════════════════════════════════════════════════

// Safe array — never throws, always returns array
global.safeArr = function (val) {
  return Array.isArray(val) ? val : [];
};

// Safe object — never throws, always returns object
global.safeObj = function (val) {
  return (val && typeof val === 'object' && !Array.isArray(val)) ? val : {};
};

// Safe string
global.safeStr = function (val, fallback) {
  return (typeof val === 'string' && val.trim()) ? val : (fallback || '');
};

// Safe number
global.safeNum = function (val, fallback) {
  var n = parseFloat(val);
  return isNaN(n) ? (fallback || 0) : n;
};

// Deep-safe nested value read: safeGet(user, 'wallet.balance', 0)
global.safeGet = function (obj, path, fallback) {
  try {
    var parts  = path.split('.');
    var result = obj;
    for (var i = 0; i < parts.length; i++) {
      if (result == null) return fallback !== undefined ? fallback : null;
      result = result[parts[i]];
    }
    return result !== undefined ? result : (fallback !== undefined ? fallback : null);
  } catch (e) {
    return fallback !== undefined ? fallback : null;
  }
};

// ═══════════════════════════════════════════════════════════════════════════
//  PART 9 — CACHE INTEGRITY HELPERS
// ═══════════════════════════════════════════════════════════════════════════

// Safely get a user from CACHE with normalization
global.getCachedUser = function (uid) {
  if (!uid) return null;
  var raw = (global.CACHE && global.CACHE.users || []).find(function (u) { return u.uid === uid; });
  return raw ? global.normalizeUser(raw) : null;
};

// Safely get a gig from CACHE
global.getCachedGig = function (id) {
  if (!id) return null;
  var raw = (global.CACHE && global.CACHE.gigs || []).find(function (g) { return g.id === id; });
  return raw ? global.normalizeGig(raw) : null;
};

// Validate CACHE is healthy (called after preload)
global.validateCache = function () {
  var issues = [];
  if (!global.CACHE) { issues.push('CACHE is undefined'); }
  else {
    if (!Array.isArray(global.CACHE.users))        issues.push('CACHE.users not array');
    if (!Array.isArray(global.CACHE.gigs))         issues.push('CACHE.gigs not array');
    if (!Array.isArray(global.CACHE.endorsements)) issues.push('CACHE.endorsements not array');
  }
  if (issues.length) {
    console.warn('[SkillStamp] Cache issues:', issues.join(', '));
    // Self-heal
    if (!global.CACHE) global.CACHE = {};
    if (!Array.isArray(global.CACHE.users))        global.CACHE.users = [];
    if (!Array.isArray(global.CACHE.gigs))         global.CACHE.gigs = [];
    if (!Array.isArray(global.CACHE.endorsements)) global.CACHE.endorsements = [];
    if (!global.CACHE.messages)                    global.CACHE.messages = {};
    if (!Array.isArray(global.CACHE.posts))        global.CACHE.posts = [];
  }
  return issues.length === 0;
};

// ═══════════════════════════════════════════════════════════════════════════
//  PART 10 — PERFORMANCE: SCORE CACHE (prevent re-scoring same user)
// ═══════════════════════════════════════════════════════════════════════════

var _scoreCache     = {};   // uid → { score, ts }
var _SCORE_TTL_MS   = 5 * 60 * 1000;  // 5 minutes

global.getCachedTalentScore = function (u) {
  if (!u || !u.uid) return 0;
  var cached = _scoreCache[u.uid];
  if (cached && (Date.now() - cached.ts) < _SCORE_TTL_MS) return cached.score;
  var score = (typeof global.getTalentScore === 'function') ? global.getTalentScore(u) : 0;
  _scoreCache[u.uid] = { score: score, ts: Date.now() };
  return score;
};

// Invalidate score cache for a user (call after profile save)
global.invalidateScoreCache = function (uid) {
  if (uid) delete _scoreCache[uid];
  else _scoreCache = {};
};

// ═══════════════════════════════════════════════════════════════════════════
//  PART 11 — STARTUP SEQUENCE HOOK
// ═══════════════════════════════════════════════════════════════════════════

// Called from enterApp() after login — runs normalizers and cache validation
global.onAppReady = function () {
  // 1. Validate cache integrity
  global.validateCache();

  // 2. Normalize ME
  global.normalizeME();

  // 3. Invalidate stale score caches
  global.invalidateScoreCache();

  // 4. Flush any deferred startup tasks (secondary enhancements)
  global.flushDeferredTasks();

  if (process.env && process.env.NODE_ENV === 'development') {
    console.log('[SkillStamp] onAppReady complete. ME:', global.ME && global.ME.uid);
  }
};

// ═══════════════════════════════════════════════════════════════════════════
//  PART 12 — STRUCTURED LOGGING
// ═══════════════════════════════════════════════════════════════════════════

var _SS_DEBUG = (function () {
  try { return localStorage.getItem('ss_debug') === 'true'; } catch (e) { return false; }
})();

global.ssLog = function (level, module, msg, data) {
  if (level === 'debug' && !_SS_DEBUG) return;
  var prefix = '[SkillStamp:' + module + ']';
  if (level === 'error')  console.error(prefix, msg, data || '');
  else if (level === 'warn') console.warn(prefix, msg, data || '');
  else if (level === 'debug') console.log(prefix, msg, data || '');
  // info only in debug mode
  else if (_SS_DEBUG) console.log(prefix, msg, data || '');
};

// Enable debug mode from console: window.enableSSDebug()
global.enableSSDebug = function () {
  localStorage.setItem('ss_debug', 'true');
  _SS_DEBUG = true;
  console.log('[SkillStamp] Debug mode enabled. Refresh to see full logs.');
};

}(window));
