/* SkillStamp - error monitoring
   Catches real problems members hit (script errors, unhandled promise failures, rejected saves,
   scripts that fail to load) and files a small report in the private `client_errors` collection.
   Admins see them grouped in Admin > Overview ("App errors"); the email Worker emails you when a
   NEW kind of error appears. Reports contain no passwords, messages or personal content: only an
   error summary, the page, the browser type and the member's id. */
(function () {
  'use strict';
  if (window.__ssMon) return;
  window.__ssMon = true;

  var API = window.SS_API || 'https://skillstamp-email.tegapeters94.workers.dev';
  var MAX_PER_SESSION = 8;
  var seen = {}, queue = [], sent = 0;

  function lc(s) { return String(s == null ? '' : s); }
  function hash(s) {
    var h = 2166136261;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return (h >>> 0).toString(36);
  }
  function cleanStack(st) {
    st = lc(st).replace(new RegExp(location.origin.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), '');
    return st.split('\n').slice(0, 5).join('\n').slice(0, 800);
  }
  function noise(msg, stack, file) {
    msg = lc(msg);
    if (/ResizeObserver loop|^Script error\.?$|Non-Error promise rejection|AbortError|The user aborted|cancell?ed/i.test(msg)) return true;
    if (/chrome-extension:|moz-extension:|safari-extension:/.test(lc(stack) + lc(file))) return true;
    if (file && file.indexOf(location.origin) !== 0 && /^https?:/.test(file) && !/gstatic\.com\/firebasejs/.test(file)) return true; // other people's scripts
    return false;
  }

  function report(type, msg, stack, extra) {
    try {
      msg = lc(msg).slice(0, 300);
      if (!msg || noise(msg, stack, extra && extra.file)) return;
      var st = cleanStack(stack);
      var sig = hash(type + '|' + msg.replace(/[0-9a-f]{12,}/gi, 'ID').replace(/\d+/g, 'N') + '|' + (st.split('\n')[1] || st.split('\n')[0] || '').replace(/\d+/g, 'N'));
      if (seen[sig]) { seen[sig].n++; return; }
      if (Object.keys(seen).length >= MAX_PER_SESSION) return;
      var ev = {
        sig: sig, type: type, msg: msg, stack: st,
        path: (location.pathname + (location.hash || '')).replace(/\?.*$/, '').slice(0, 120),
        ua: (navigator.userAgent || '').replace(/\s+/g, ' ').slice(0, 120),
        ts: Date.now(), day: new Date().toISOString().slice(0, 10), n: 1
      };
      if (extra && extra.col) ev.col = lc(extra.col).slice(0, 40);
      if (extra && extra.code) ev.code = lc(extra.code).slice(0, 60);
      seen[sig] = ev;
      queue.push(ev);
      flush();
    } catch (e) {}
  }

  function flush() {
    try {
      var m = window.ME, u = window.FB_AUTH && window.FB_AUTH.currentUser, F = window.FB_FNS;
      if (!m || !m.uid || !u || u.uid !== m.uid || !F || !window.FB_DB) return;   // not signed in yet: keep for later
      while (queue.length) {
        var ev = queue.shift();
        ev.uid = m.uid; ev.role = lc(m.role).slice(0, 12); ev.n = (seen[ev.sig] && seen[ev.sig].n) || 1;
        var id = ev.day + '_' + ev.sig + '_' + m.uid;
        F.setDoc(F.doc(window.FB_DB, 'client_errors', id), ev, { merge: true }).catch(function () {});
        sent++;
      }
    } catch (e) {}
  }
  setInterval(flush, 5000);

  window.addEventListener('error', function (e) {
    try {
      if (e.target && e.target !== window && e.target.tagName) {                    // a file failed to load
        var t = e.target, src = t.src || t.href || '';
        if (t.tagName === 'SCRIPT' && src && src.indexOf(location.origin) === 0) report('load', 'Script failed to load: ' + src.replace(location.origin, ''), '', { file: src });
        return;
      }
      report('error', e.message, e.error && e.error.stack || (e.filename + ':' + e.lineno + ':' + e.colno), { file: e.filename });
    } catch (x) {}
  }, true);
  window.addEventListener('unhandledrejection', function (e) {
    try {
      var r = e.reason;
      report('promise', (r && (r.message || r.code)) || r, r && r.stack || '', {});
    } catch (x) {}
  });

  /* rejected saves (permission-denied after a rules change is the one you most want to know about) */
  (function () {
    var prev = window.onFbWriteFail;
    window.onFbWriteFail = function (col, id, err) {
      try { if (col !== 'client_errors' && col !== 'analytics_events' && col !== 'notifications') report('write', (col + ': ' + ((err && (err.code || err.message)) || 'error')), '', { col: col, code: err && err.code }); } catch (e) {}
      if (typeof prev === 'function') return prev.apply(this, arguments);
    };
  })();

  /* ── admin: "App errors" card in Overview ── */
  function esc(s) { return lc(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function ago(ts) { var m = Math.max(0, Math.round((Date.now() - ts) / 60000)); return m < 60 ? m + ' min ago' : m < 1440 ? Math.round(m / 60) + ' h ago' : Math.round(m / 1440) + ' d ago'; }

  function load() {
    var F = window.FB_FNS;
    return F.getDocs(F.query(F.collection(window.FB_DB, 'client_errors'), F.orderBy('ts', 'desc'), F.limit(200)))
      .then(function (s) { return s.docs.map(function (d) { var x = d.data(); x._id = d.id; return x; }); });
  }
  function group(rows) {
    var g = {};
    rows.forEach(function (r) {
      var k = g[r.sig] || (g[r.sig] = { sig: r.sig, type: r.type, msg: r.msg, stack: r.stack, path: r.path, col: r.col, code: r.code, users: {}, count: 0, first: r.ts, last: r.ts, ids: [] });
      k.count += (r.n || 1); k.users[r.uid] = 1; k.ids.push(r._id);
      if (r.ts > k.last) k.last = r.ts; if (r.ts < k.first) k.first = r.ts;
    });
    return Object.keys(g).map(function (k) { return g[k]; }).sort(function (a, b) { return b.last - a.last; });
  }
  var TYPE = { error: 'Script error', promise: 'Failed action', write: 'Save refused', load: 'File missing' };

  function paint(host, groups, health) {
    var last24 = groups.filter(function (g) { return Date.now() - g.last < 864e5; }).length;
    var h = '<div class="ap-cardbox" id="mon-card" style="margin-bottom:14px;"><div class="ap-h2">App errors (last 200 reports)</div>'
      + '<div class="ap-note" style="margin-bottom:8px;">' + (groups.length
        ? '<b>' + groups.length + '</b> kinds of error reported; <b style="color:' + (last24 ? '#b45309' : '#15803d') + ';">' + last24 + '</b> in the last 24 hours.'
        : 'No errors reported. 🎉')
      + (health ? '<br>Email service: ' + health : '') + '</div>';
    groups.slice(0, 8).forEach(function (g) {
      var n = Object.keys(g.users).length;
      h += '<div style="border-top:1px solid var(--br);padding:9px 0;">'
        + '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;"><span style="font-size:10px;font-weight:800;background:rgba(239,68,68,.1);color:#dc2626;border-radius:6px;padding:2px 7px;">' + esc(TYPE[g.type] || g.type) + '</span>'
        + '<span style="font-size:11px;color:var(--td);">' + g.count + '× · ' + n + ' member' + (n === 1 ? '' : 's') + ' · last ' + ago(g.last) + ' · ' + esc(g.path) + '</span></div>'
        + '<div style="font-size:12px;font-weight:600;margin-top:4px;word-break:break-word;">' + esc(g.msg) + '</div>'
        + (g.stack ? '<details style="margin-top:3px;"><summary style="font-size:10px;color:var(--td);cursor:pointer;">Details</summary><pre style="font-size:10px;white-space:pre-wrap;word-break:break-all;color:var(--td);margin:4px 0 0;">' + esc(g.stack) + '</pre></details>' : '')
        + '</div>';
    });
    if (groups.length > 8) h += '<div class="ap-note">…and ' + (groups.length - 8) + ' more kinds.</div>';
    h += '<div class="ap-row" style="margin:10px 0 0;"><button class="ap-btn ap-ghost" onclick="ssMonRefresh()">Refresh</button>'
      + (groups.length ? '<button class="ap-btn ap-danger" onclick="ssMonClear()">Clear all reports</button>' : '') + '</div></div>';
    host.innerHTML = h;
  }
  function render() {
    var tab = document.getElementById('admtab-overview'); if (!tab) return;
    var host = document.getElementById('mon-host');
    if (!host) { host = document.createElement('div'); host.id = 'mon-host'; tab.appendChild(host); }
    Promise.all([
      load().then(function (r) { window._monRows = r; return group(r); }),
      fetch(API + '/health', { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (j) {
        if (!j || !j.ok) return 'not responding';
        return j.cronAgeMin == null ? 'running (update the Worker to see schedule health)' : (j.cronAgeMin <= 15 ? '<b style="color:#15803d;">running</b> · scheduler ran ' + j.cronAgeMin + ' min ago' : '<b style="color:#dc2626;">scheduler stalled</b> (last ran ' + j.cronAgeMin + ' min ago)');
      }).catch(function () { return '<b style="color:#dc2626;">not reachable</b>'; })
    ]).then(function (r) { paint(host, r[0], r[1]); })
      .catch(function () { host.innerHTML = '<div class="ap-note ap-dangerbox">Could not load error reports. Publish the latest firestore.rules first.</div>'; });
  }
  window.ssMonRefresh = render;
  window.ssMonClear = function () {
    if (!window.confirm('Delete all error reports?')) return;
    var F = window.FB_FNS, ids = (window._monRows || []).map(function (r) { return r._id; });
    var chain = Promise.resolve();
    for (var i = 0; i < ids.length; i += 20) (function (part) {
      chain = chain.then(function () { return Promise.all(part.map(function (id) { return F.deleteDoc(F.doc(window.FB_DB, 'client_errors', id)).catch(function () {}); })); });
    })(ids.slice(i, i + 20));
    chain.then(render);
  };
  window.ssMonTest = function () { report('error', 'Test error from admin (safe to ignore)', 'at test (monitoring)', {}); say(); function say() { try { window.toast('Test error sent. Refresh in a few seconds.'); } catch (e) {} } };

  function hook() {
    var prev = window.adminTab;
    if (typeof prev !== 'function' || prev.__mon) return;
    var w = function (name) {
      var r = prev.apply(this, arguments);
      try { if (name === 'overview') setTimeout(render, 120); } catch (e) {}
      return r;
    };
    w.__mon = true; window.adminTab = w;
  }
  hook();
})();
