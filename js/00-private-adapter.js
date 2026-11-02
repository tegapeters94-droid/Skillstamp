/* SkillStamp - private email storage adapter
   Keeps every member's email in a private record (users_private/<uid>) that only the
   owner and admins can read, instead of in the public profile (users/<uid>).

   How it works: it wraps a few Firestore functions so the rest of the app keeps working
   exactly as before:
     - writes to users/<uid> that contain `email` are split: the email goes to users_private
     - reads of users/<uid> (your own profile, or any profile when you are an admin) get the
       private email merged back in, so ME.email, the admin tables, etc. still work
   Every wrapper falls back to the original behaviour if anything unexpected happens.
   Must load before firebase.js runs (it is a plain script, firebase.js is a deferred module). */
(function () {
  'use strict';
  if (window.__ssPrivAdapter) return;
  window.__ssPrivAdapter = true;

  var PRIV = {};                 // uid -> private email ('' = looked up, none found)
  var privAll = { at: 0, p: null };
  var ORIG = null;               // the unwrapped Firestore functions
  var store;

  function auth() { return window.FB_AUTH; }
  function selfUid() { var u = auth() && auth().currentUser; return u ? u.uid : null; }
  function selfEmail() { var u = auth() && auth().currentUser; return (u && u.email) ? String(u.email).toLowerCase() : ''; }
  function isAdm() { return !!(window.ME && window.ME.isAdmin); }
  function db() { return window.FB_DB; }
  function docPathUid(ref) {
    var p = ref && ref.path;
    if (typeof p !== 'string') return null;
    var m = /^users\/([^\/]+)$/.exec(p);
    return m ? m[1] : null;
  }
  function isUsersCol(x) { return !!(x && x.__col === 'users'); }
  function without(obj, key) { var o = {}; for (var k in obj) { if (Object.prototype.hasOwnProperty.call(obj, k) && k !== key) o[k] = obj[k]; } return o; }

  /* ── private reads ── */
  async function ensurePriv(uid) {
    if (!uid || PRIV[uid] !== undefined) return;
    try {
      var s = await ORIG.getDoc(ORIG.doc(db(), 'users_private', uid));
      PRIV[uid] = (s.exists() && s.data() && s.data().email) ? String(s.data().email).toLowerCase() : '';
    } catch (e) { PRIV[uid] = ''; }
  }
  function loadPrivAll() {
    if (privAll.p && Date.now() - privAll.at < 60000) return privAll.p;
    privAll.at = Date.now();
    privAll.p = (async function () {
      try {
        var s = await ORIG.getDocs(ORIG.collection(db(), 'users_private'));
        s.docs.forEach(function (d) { var e = d.data() && d.data().email; PRIV[d.id] = e ? String(e).toLowerCase() : ''; });
        try { if (typeof CACHE !== 'undefined' && CACHE.users) CACHE.users.forEach(function (u) { if (PRIV[u.uid]) u.email = PRIV[u.uid]; }); } catch (e) {}
      } catch (e) { privAll.at = 0; }
    })();
    return privAll.p;
  }
  function mergeEmail(id, d) {
    if (!d) return d;
    var e = PRIV[id];
    if (e) { if (d.email === e) return d; var o = Object.assign({}, d); o.email = e; return o; }
    if (!d.email && id === selfUid() && selfEmail()) { var o2 = Object.assign({}, d); o2.email = selfEmail(); return o2; }
    return d;
  }
  function wrapDoc(snap) {
    if (!snap) return snap;
    var w = Object.create(snap);
    w.data = function (o) { return mergeEmail(snap.id, snap.data(o)); };
    w.get = function (f, o) { if (f === 'email') { var d = w.data(); return d ? d.email : undefined; } return snap.get(f, o); };
    return w;
  }
  function wrapQuery(snap) {
    var docs = snap.docs.map(wrapDoc);
    var w = Object.create(snap);
    Object.defineProperty(w, 'docs', { value: docs, enumerable: true });
    w.forEach = function (cb, t) { docs.forEach(cb, t); };
    return w;
  }

  /* ── private writes ── */
  async function writePrivate(uid, email) {
    var val = String((uid === selfUid() && selfEmail()) ? selfEmail() : (email || '')).toLowerCase();
    if (!val) return;
    await ORIG.setDoc(ORIG.doc(db(), 'users_private', uid), { uid: uid, email: val }, { merge: true });
    PRIV[uid] = val;
  }

  function wrap(F) {
    ORIG = F;
    var W = Object.assign({}, F);

    W.collection = function () {
      var c = F.collection.apply(this, arguments);
      try { c.__col = c.path; } catch (e) {}
      return c;
    };
    W.query = function () {
      var q = F.query.apply(this, arguments);
      try { var a = arguments[0]; q.__col = a && (a.__col || a.path); } catch (e) {}
      return q;
    };

    W.setDoc = async function (ref, data, opts) {
      var uid = docPathUid(ref);
      if (uid && data && typeof data === 'object' && 'email' in data) {
        var okPriv = true;
        try { await writePrivate(uid, data.email); } catch (e) { okPriv = false; console.warn('[private-email] save failed, keeping email in profile', e && e.message); }
        var pub = okPriv ? without(data, 'email') : data;   // if the private record cannot be saved yet, nothing is lost
        if (Object.keys(pub).length) return await F.setDoc(ref, pub, opts);   // a rejected write throws exactly as before
        return;
      }
      return F.setDoc.apply(this, arguments);
    };

    W.updateDoc = async function (ref, data) {
      var uid = docPathUid(ref);
      if (uid && data && typeof data === 'object' && !Array.isArray(data) && 'email' in data) {
        var okPriv = true;
        try { await writePrivate(uid, data.email); } catch (e) { okPriv = false; console.warn('[private-email] save failed, keeping email in profile', e && e.message); }
        var pub = okPriv ? without(data, 'email') : data;
        if (Object.keys(pub).length) return await F.updateDoc(ref, pub);
        return;
      }
      return F.updateDoc.apply(this, arguments);
    };

    W.deleteDoc = async function (ref) {
      var res = await F.deleteDoc.apply(this, arguments);
      var uid = docPathUid(ref);
      if (uid && isAdm()) { try { await F.deleteDoc(F.doc(db(), 'users_private', uid)); } catch (e) {} delete PRIV[uid]; }
      return res;
    };

    W.getDoc = async function (ref) {
      var snap = await F.getDoc.apply(this, arguments);
      var uid = docPathUid(ref);
      if (!uid) return snap;
      try {
        if (uid === selfUid() || isAdm()) await ensurePriv(uid);
        return wrapDoc(snap);
      } catch (e) { return snap; }
    };

    W.getDocs = async function (q) {
      var snap = await F.getDocs.apply(this, arguments);
      if (!isUsersCol(q)) return snap;
      try {
        if (isAdm()) await loadPrivAll(); else if (selfUid()) await ensurePriv(selfUid());
        return wrapQuery(snap);
      } catch (e) { return snap; }
    };

    W.onSnapshot = function (target) {
      var args = Array.prototype.slice.call(arguments);
      var uid = docPathUid(target), col = isUsersCol(target);
      if (uid || col) {
        try {
          if (isAdm()) loadPrivAll(); else if (selfUid()) ensurePriv(selfUid());
          var fixOne = function (cb) {
            return function (snap) { var s = snap; try { s = uid ? wrapDoc(snap) : wrapQuery(snap); } catch (e) {} return cb(s); };
          };
          for (var i = 1; i < args.length; i++) {
            if (typeof args[i] === 'function') { args[i] = fixOne(args[i]); break; }
            if (args[i] && typeof args[i].next === 'function') { var o = Object.assign({}, args[i]); o.next = fixOne(args[i].next.bind(args[i])); args[i] = o; break; }
          }
        } catch (e) {}
      }
      return F.onSnapshot.apply(this, args);
    };
    return W;
  }

  /* install: wrap FB_FNS the moment firebase.js assigns it */
  try {
    Object.defineProperty(window, 'FB_FNS', {
      configurable: true, enumerable: true,
      get: function () { return store; },
      set: function (v) { try { store = wrap(v); } catch (e) { console.warn('[private-email] adapter off', e); store = v; } }
    });
  } catch (e) { console.warn('[private-email] adapter could not install', e); }

  /* ME read directly by firebase.js on session restore has no email: fill it from the sign-in account */
  setInterval(function () {
    try {
      var m = window.ME, e = selfEmail();
      if (m && !m.email && e && m.uid && m.uid === selfUid()) m.email = e;
    } catch (x) {}
  }, 500);

  /* used by the admin data-protection tools */
  window.SS_PRIV = {
    orig: function () { return ORIG; },
    cache: PRIV,
    loadAll: function () { privAll.at = 0; privAll.p = null; return loadPrivAll(); },
    write: writePrivate
  };
})();
