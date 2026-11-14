/* SkillStamp - wallet screen extras (live naira wallets and test wallets):
   1. failed (rejected) top-ups now show in the history with a "failed" label;
   2. the Escrow section lists the member's real escrow: gigs a client has locked money in,
      or gigs a freelancer is hired on, instead of always saying "no active escrow";
   3. the empty-state wording depends on whether the member is a client or a freelancer.
   Wraps _doRenderWallet only. Removing this file restores the old screen. */
(function () {
  'use strict';
  function $(id) { return document.getElementById(id); }
  function me() { return window.ME; }
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function sym() { try { if (typeof window.ssWalletSym === 'function') return window.ssWalletSym(); } catch (e) {} return (me() && me().walletMode === 'test') ? 'T₦' : '₦'; }
  function money(n) { return sym() + (Number(n) || 0).toLocaleString('en-US'); }
  function ago(ts) { try { return typeof window.timeAgo === 'function' ? window.timeAgo(ts) : ''; } catch (e) { return ''; } }
  var LABEL = { open: 'Waiting for a freelancer', hired: 'In progress', in_progress: 'In progress', delivered: 'Delivered, awaiting review', disputed: 'In dispute' };

  function escrowRows() {
    var m = me(); if (!m) return [];
    var gigs = (window.CACHE && CACHE.gigs) || [];
    var client = m.role !== 'freelancer';
    return gigs.filter(function (g) {
      if (!LABEL[g.status || 'open'] || !(Number(g.escrowAmount) > 0)) return false;
      return client ? g.posterUid === m.uid : g.hiredUid === m.uid;
    }).map(function (g) { return { title: g.title || 'Gig', amount: g.escrowAmount, status: LABEL[g.status || 'open'], ts: g.created }; });
  }
  function paintEscrow() {
    var box = $('escrow-list'), m = me(); if (!box || !m) return;
    var rows = escrowRows();
    if (!rows.length) {
      box.innerHTML = '<div style="font-size:11px;color:var(--td);padding:12px;">' + (m.role === 'freelancer'
        ? 'No active escrow contracts. When a client hires you, the locked payment shows here.'
        : 'Nothing in escrow right now. When you post a gig, its budget is locked here until you confirm delivery.') + '</div>';
      return;
    }
    box.innerHTML = rows.map(function (r) {
      return '<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;padding:11px 12px;border-bottom:1px solid var(--br);">'
        + '<div style="min-width:0;"><div style="font-weight:700;font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + esc(r.title) + '</div>'
        + '<div style="font-size:10px;color:var(--td);margin-top:2px;">' + esc(r.status) + '</div></div>'
        + '<div style="font-weight:800;font-size:13px;white-space:nowrap;">🔒 ' + money(r.amount) + '</div></div>';
    }).join('');
  }

  var FAILED = null, FAILED_FOR = '';
  async function loadFailed() {
    var m = me(); if (!m || m.walletMode === 'test') return [];
    if (FAILED && FAILED_FOR === m.uid) return FAILED;
    try {
      var F = window.FB_FNS, s = await F.getDocs(F.query(F.collection(window.FB_DB, 'deposits'), F.where('uid', '==', m.uid)));
      FAILED = s.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); }).filter(function (d) { return d.status === 'rejected'; });
      FAILED_FOR = m.uid;
    } catch (e) { FAILED = []; FAILED_FOR = m.uid; }
    return FAILED;
  }
  function row(icon, bg, title, sub, amt, cls) {
    return '<div class="tx-row"><div class="tx-icon" style="background:' + bg + ';">' + icon + '</div><div style="flex:1;"><div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:600;font-size:12px;">' + title + '</div><div style="font-size:10px;color:var(--td);">' + sub + '</div></div><div class="tx-amount ' + cls + '">' + amt + '</div></div>';
  }
  async function paintHistory() {
    var m = me(), box = $('tx-list'); if (!m || !box) return;
    var bad = await loadFailed(); if (!bad.length) return;
    var txs = ((m.wallet && m.wallet.transactions) || []).map(function (t) { return { ts: t.ts || 0, html: row(t.type === 'in' ? '📥' : '📤', t.type === 'in' ? 'rgba(74,222,128,.12)' : 'rgba(255,107,53,.12)', esc(t.desc), esc(t.from || 'SkillStamp') + ' · ' + ago(t.ts), (t.type === 'in' ? '+' : '-') + money(t.amount), t.type === 'in' ? 'tx-in' : 'tx-out') }; });
    var fails = bad.map(function (d) { var ts = d.confirmedAt || d.created || 0; return { ts: ts, html: row('⚠️', 'rgba(239,68,68,.12)', 'Top-up failed (' + esc(d.ref || '') + ')', 'Payment not confirmed · ' + ago(ts) + (d.note ? ' · ' + esc(d.note) : ''), money(d.amount), 'tx-out') }; });
    box.innerHTML = txs.concat(fails).sort(function (a, b) { return b.ts - a.ts; }).map(function (x) { return x.html; }).join('');
  }

  var orig = window._doRenderWallet;
  if (typeof orig === 'function') window._doRenderWallet = function () {
    var r = orig.apply(this, arguments);
    try { setTimeout(function () { paintEscrow(); paintHistory(); }, 80); } catch (e) {}
    return r;
  };
  /* a rejected top-up changes the list: forget the cache whenever the wallet reloads after a few seconds */
  setInterval(function () { FAILED = null; }, 60000);
})();
