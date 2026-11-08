/* SkillStamp - database read saver + meter
   Firebase's free plan allows about 50,000 document reads a day. At start-up the app used to
   download the same big collections (users, gigs, endorsements, posts) three or four times in a
   row. This wraps the Firestore functions so those identical whole-collection downloads, made
   within 20 seconds of each other by the same signed-in member, share ONE download.
   - Any write to a collection clears its saved copy, so nothing stale is shown after a change.
   - Real-time listeners are untouched; filtered queries are untouched.
   - Also counts reads so the admin Overview can show real usage (see "Database reads").
   If anything unexpected happens it falls back to the normal behaviour. */
(function () {
  'use strict';
  if (window.__ssReadGuard) return;
  window.__ssReadGuard = true;

  var TTL = 20000;
  var WHOLE = ['users', 'gigs', 'endorsements', 'posts'];
  var memo = {};
  var stats = { reads: 0, saved: 0, calls: 0, since: Date.now(), byCol: {} };
  window.ssReads = function () { return stats; };

  function uid() { var a = window.FB_AUTH; return a && a.currentUser ? a.currentUser.uid : ''; }
  function colOf(ref) {
    try {
      var p = ref && ref.path;
      if (typeof p === 'string') return p.split('/')[0];
      return ref && (ref.col || ref.id) || '';
    } catch (e) { return ''; }
  }
  function isWholeCol(ref) {
    try { return !!ref && ref.type === 'collection' && WHOLE.indexOf(colOf(ref)) >= 0 && String(ref.path).indexOf('/') < 0; } catch (e) { return false; }
  }
  function count(col, n) {
    n = Math.max(0, n | 0);
    stats.reads += n; stats.byCol[col || '?'] = (stats.byCol[col || '?'] || 0) + n;
  }
  function clear(col) { if (col) delete memo[col]; else memo = {}; }

  function guard(F) {
    var W = Object.assign({}, F);

    W.getDocs = function (q) {
      var col = colOf(q);
      try {
        if (isWholeCol(q)) {
          var m = memo[col], me = uid();
          if (m && m.uid === me && Date.now() - m.t < TTL) { stats.saved += m.n || 0; return m.p; }
          var entry = { t: Date.now(), uid: me, n: 0, p: null };
          entry.p = F.getDocs(q).then(function (s) { entry.n = s.size || 0; stats.calls++; count(col, entry.n); return s; });
          memo[col] = entry;
          entry.p.catch(function () { if (memo[col] === entry) delete memo[col]; });
          return entry.p;
        }
      } catch (e) { /* fall through to normal behaviour */ }
      return F.getDocs.apply(this, arguments).then(function (s) { stats.calls++; try { count(col, s.size || 1); } catch (e) {} return s; });
    };

    W.getDoc = function (ref) {
      return F.getDoc.apply(this, arguments).then(function (s) { stats.calls++; count(colOf(ref), 1); return s; });
    };

    ['setDoc', 'updateDoc', 'deleteDoc', 'addDoc'].forEach(function (name) {
      if (typeof F[name] !== 'function') return;
      W[name] = function (ref) {
        var col = colOf(ref);
        return F[name].apply(this, arguments).then(function (r) { clear(col); return r; }, function (e) { clear(col); throw e; });
      };
    });

    W.onSnapshot = function (target) {
      var args = Array.prototype.slice.call(arguments), col = colOf(target);
      try {
        var wrapCb = function (cb) {
          return function (snap) {
            try { count(col, typeof snap.docChanges === 'function' ? snap.docChanges().length : (snap.exists && snap.exists() ? 1 : 0)); } catch (e) {}
            return cb.apply(this, arguments);
          };
        };
        for (var i = 1; i < args.length; i++) {
          if (typeof args[i] === 'function') { args[i] = wrapCb(args[i]); break; }
          if (args[i] && typeof args[i].next === 'function') { var o = Object.assign({}, args[i]); o.next = wrapCb(args[i].next.bind(args[i])); args[i] = o; break; }
        }
      } catch (e) {}
      return F.onSnapshot.apply(this, args);
    };
    return W;
  }

  /* install on top of whatever is (or will be) assigned to FB_FNS, including the private-email adapter */
  try {
    var d = Object.getOwnPropertyDescriptor(window, 'FB_FNS');
    var store = d && !d.get ? d.value : undefined;
    var prevGet = d && d.get, prevSet = d && d.set, wrapped;
    var setIn = function (v) {
      if (prevSet) prevSet.call(window, v); else store = v;
      var base = prevGet ? prevGet.call(window) : store;
      try { wrapped = guard(base); } catch (e) { wrapped = base; }
    };
    if (store) setIn(store);
    Object.defineProperty(window, 'FB_FNS', { configurable: true, enumerable: true, get: function () { return wrapped || (prevGet ? prevGet.call(window) : store); }, set: setIn });
  } catch (e) { console.warn('[read-guard] off', e); }

  /* ── admin Overview: usage card ── */
  function fmt(n) { return Number(n || 0).toLocaleString(); }
  function card() {
    var s = stats, mins = Math.max(1, Math.round((Date.now() - s.since) / 60000));
    var cols = Object.keys(s.byCol).sort(function (a, b) { return s.byCol[b] - s.byCol[a]; }).slice(0, 5)
      .map(function (c) { return c + ' ' + fmt(s.byCol[c]); }).join(' · ');
    var pct = Math.min(100, Math.round(s.reads / 500)); // of 50,000 a day
    return '<div class="ap-cardbox" id="rg-card" style="margin-bottom:14px;"><div class="ap-h2">Database reads (this browser, since you opened the app)</div>'
      + '<div class="ap-box"><div class="ap-kv"><span>Reads counted</span><b>' + fmt(s.reads) + '</b></div>'
      + '<div class="ap-kv"><span>Reads avoided by sharing</span><b style="color:#15803d;">' + fmt(s.saved) + '</b></div>'
      + '<div class="ap-kv"><span>Open for</span><b>' + mins + ' min</b></div></div>'
      + '<div style="height:7px;background:var(--br);border-radius:6px;overflow:hidden;margin:8px 0;"><div style="height:100%;width:' + pct + '%;background:' + (pct > 60 ? '#dc2626' : '#1a6b3c') + ';"></div></div>'
      + '<div class="ap-note" style="margin-bottom:0;">The free plan allows about 50,000 reads per day across everyone. One visit costs roughly the number above. ' + (cols ? 'Biggest: ' + esc(cols) + '.' : '') + ' Check the Firebase Console → Usage for the real daily total.</div></div>';
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function hook() {
    var prev = window.adminTab;
    if (typeof prev !== 'function' || prev.__rg) return;
    var w = function (name) {
      var r = prev.apply(this, arguments);
      try {
        if (name === 'overview') {
          setTimeout(function () {
            var tab = document.getElementById('admtab-overview'); if (!tab) return;
            var old = document.getElementById('rg-card'); if (old) old.remove();
            var h = document.createElement('div'); h.innerHTML = card(); tab.appendChild(h.firstChild);
          }, 60);
        }
      } catch (e) {}
      return r;
    };
    w.__rg = true; window.adminTab = w;
  }
  hook();
})();
