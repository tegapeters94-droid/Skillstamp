/* SkillStamp - withdrawals to a Nigerian bank account (manual payout by admin).
   Member: request -> amount moves from balance to "held" -> admin sends the money and marks it paid.
   Admin: "Withdrawals" tab. Held money can only be released (paid) or returned (rejected) by an admin. */
(function () {
  'use strict';
  var MIN = 1000, MAX = 5000000;
  var API = window.SS_API || 'https://skillstamp-email.tegapeters94.workers.dev';
  var LIM = { min: 1000, daily: 500000, holdHours: 24 };
  async function loadLim() {
    try { var d = await F().getDoc(doc('payment_settings', 'limits')); if (d.exists()) { var x = d.data() || {}; LIM = { min: Number(x.min) >= 100 ? Number(x.min) : 1000, daily: Number(x.daily) >= 1000 ? Number(x.daily) : 500000, holdHours: Number(x.holdHours) >= 0 ? Number(x.holdHours) : 24 }; } } catch (e) {}
  }
  async function callWorker(path, body) {
    var u = window.FB_AUTH && window.FB_AUTH.currentUser; if (!u) throw new Error('signed-out');
    var tok = await u.getIdToken();
    var r = await fetch(API + path, { method: 'POST', headers: { 'Authorization': 'Bearer ' + tok, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    var j = {}; try { j = await r.json(); } catch (e) {} j._status = r.status; return j;
  }
  function $(id) { return document.getElementById(id); }
  function F() { return window.FB_FNS; }
  function DB() { return window.FB_DB; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function say(m, bad) { try { if (window.toast) window.toast(m, bad ? 'bad' : undefined); } catch (e) {} }
  function ngn(n) { return '₦' + (Math.round((Number(n) || 0) * 100) / 100).toLocaleString(); }
  function me() { return window.ME; }
  function doc(c, id) { return F().doc(DB(), c, id); }
  function ago(ts) { var s = Math.max(1, Math.floor((Date.now() - ts) / 1000)); return s < 3600 ? Math.max(1, Math.floor(s / 60)) + 'm ago' : s < 86400 ? Math.floor(s / 3600) + 'h ago' : Math.floor(s / 86400) + 'd ago'; }
  function modal(h) { if (typeof window.setModal === 'function') window.setModal(h); }
  function newRef() { var a = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789', r = 'WD-'; var b = new Uint8Array(6); crypto.getRandomValues(b); for (var i = 0; i < 6; i++) r += a[b[i] % a.length]; return r; }
  function blank() { return { balance: 0, pending: 0, earned: 0, held: 0, transactions: [] }; }
  function saved() { try { return JSON.parse(localStorage.getItem('ss_wd_bank') || '{}'); } catch (e) { return {}; } }

  /* ═════════════ member side ═════════════ */
  async function mine() {
    var s = await F().getDocs(F().query(F().collection(DB(), 'withdrawals'), F().where('uid', '==', me().uid)));
    return s.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); }).sort(function (a, b) { return (b.created || 0) - (a.created || 0); });
  }
  window.openWithdraw = async function () {
    var u = me(); if (!u) return;
    if (u.walletMode === 'test') return modal('<button class="mclose" onclick="closeModal()">✕</button><h3>Withdrawals are off</h3><p style="font-size:13px;line-height:1.6;">You are using test credits, which are not real money. Withdrawals open once your wallet is reset to the live ₦ wallet.</p><button class="btn" style="width:100%;" onclick="closeModal()">Okay</button>');
    await loadLim();
    var fresh = u;
    try { var s = await F().getDoc(doc('users', u.uid)); if (s.exists()) fresh = Object.assign({}, u, s.data()); } catch (e) {}
    var w = Object.assign(blank(), fresh.wallet || {});
    var open = null;
    try { open = (await mine()).filter(function (d) { return d.status === 'pending'; })[0]; } catch (e) {}
    if (open) return modal('<button class="mclose" onclick="closeModal()">✕</button><h3>Withdrawal in progress</h3><p style="font-size:13px;line-height:1.6;">Your request for <b>' + ngn(open.amount) + '</b> to ' + esc(open.bankName) + ' ' + esc(open.accountNumber) + ' is being processed (ref ' + esc(open.ref) + '). You can request another one once it is paid.</p><button class="btn" style="width:100%;" onclick="closeModal()">Okay</button>');
    var sv = saved();
    modal('<button class="mclose" onclick="closeModal()">✕</button><h3>Withdraw to your bank</h3>'
      + '<p style="font-size:13px;line-height:1.6;">Available: <b>' + ngn(w.balance) + '</b>. Minimum ' + ngn(LIM.min) + '. Daily limit ' + ngn(LIM.daily) + (LIM.holdHours > 0 ? '. Money from a new top-up can be withdrawn ' + LIM.holdHours + ' hours after it is confirmed' : '') + '. We send the money to your bank account after a quick review.</p>'
      + '<div class="fg"><label class="fl">Amount (₦)</label><input class="fi" id="wd-amt" type="number" min="' + LIM.min + '" max="' + (w.balance || 0) + '" placeholder="e.g. 10000"></div>'
      + '<div class="fg"><label class="fl">Bank name</label><input class="fi" id="wd-bank" value="' + esc(sv.bankName || '') + '" placeholder="e.g. GTBank"></div>'
      + '<div class="fg"><label class="fl">Account number</label><input class="fi" id="wd-num" inputmode="numeric" maxlength="10" value="' + esc(sv.accountNumber || '') + '" placeholder="10 digits"></div>'
      + '<div class="fg"><label class="fl">Account name</label><input class="fi" id="wd-acc" value="' + esc(sv.accountName || fresh.name || '') + '" placeholder="Name on the account"></div>'
      + '<div style="font-size:11px;color:var(--td);margin-bottom:12px;line-height:1.5;">The account must be in your own name, matching your SkillStamp profile. The amount is set aside as soon as you request, and returned if we cannot pay it.</div>'
      + '<button class="btn" style="width:100%;" id="wd-go" onclick="ssWithdrawGo()">Request withdrawal</button>');
  };
  window.processWithdraw = function () { window.openWithdraw(); };
  window.ssWithdrawGo = async function () {
    var u = me(), amt = Math.floor(Number($('wd-amt').value));
    var bank = $('wd-bank').value.trim(), num = $('wd-num').value.replace(/\s/g, ''), acc = $('wd-acc').value.trim();
    if (!(amt >= LIM.min)) return say('Minimum withdrawal is ' + ngn(LIM.min) + '.', true);
    if (amt > MAX) return say('Maximum single withdrawal is ' + ngn(MAX) + '.', true);
    if (!bank || !acc) return say('Enter your bank name and account name.', true);
    if (!/^[0-9]{10}$/.test(num)) return say('Account number must be 10 digits.', true);
    var btn = $('wd-go'); btn.disabled = true; btn.textContent = 'Please wait...';
    function fail(m) { say(m, true); btn.disabled = false; btn.textContent = 'Request withdrawal'; }
    try {
      /* the Worker checks the limits and moves the money; the browser cannot do it directly */
      var j = await callWorker('/withdraw/request', { amount: amt, bankName: bank, accountNumber: num, accountName: acc });
      if (!j.ok) {
        var e = j.error;
        if (e === 'min') return fail('Minimum withdrawal is ' + ngn(j.min) + '.');
        if (e === 'daily') return fail('Daily limit reached. You can withdraw up to ' + ngn(j.remaining) + ' more in the next 24 hours.');
        if (e === 'fresh') return fail('Money from a recent top-up can be withdrawn after ' + new Date(j.until).toLocaleString() + '. You can withdraw up to ' + ngn(j.withdrawable) + ' now.');
        if (e === 'insufficient') return fail('That is more than your available balance.');
        if (e === 'in-progress') return fail('You already have a withdrawal waiting. Wait until it is paid.');
        if (e === 'bad-account') return fail('Check your bank name, account number and account name.');
        if (e === 'test-mode') return fail('Withdrawals are off while you use test credits.');
        return fail('Could not place the request. Please try again.');
      }
      try { localStorage.setItem('ss_wd_bank', JSON.stringify({ bankName: bank, accountNumber: num, accountName: acc })); } catch (e2) {}
      try { if (j.wallet) u.wallet = j.wallet; window.renderWallet(); } catch (e3) {}
      modal('<button class="mclose" onclick="closeModal()">✕</button><h3>Request received</h3><p style="font-size:13px;line-height:1.6;">We have set aside <b>' + ngn(amt) + '</b> and will send it to ' + esc(bank) + ' ' + esc(num) + '. You will see it marked paid in your wallet. Reference: <b>' + esc(j.ref || '') + '</b>.</p><button class="btn" style="width:100%;" onclick="closeModal()">Done</button>');
    } catch (e) { console.warn(e); fail('Could not place the request. Please check your connection and try again.'); }
  };

  async function pendingCard() {
    try {
      var page = $('page-wallet'); if (!page || !me() || me().walletMode === 'test') return;
      var open = (await mine()).filter(function (d) { return d.status === 'pending'; })[0];
      var el = $('wallet-pending-wd');
      if (!open) { if (el) el.remove(); return; }
      if (!el) { el = document.createElement('div'); el.id = 'wallet-pending-wd'; var n = $('wallet-mode-note') || page.querySelector('.wallet-card'); if (n && n.parentNode) n.parentNode.insertBefore(el, n.nextSibling); }
      el.style.cssText = 'margin:0 0 14px;padding:12px 14px;border-radius:12px;background:var(--s);border:1px solid var(--br);font-size:12px;';
      el.innerHTML = '<b>Withdrawal pending</b>: ' + ngn(open.amount) + ' to ' + esc(open.bankName) + ' · ref ' + esc(open.ref);
    } catch (e) {}
  }
  var rw = window.renderWallet;
  if (typeof rw === 'function') window.renderWallet = function () { var r = rw.apply(this, arguments); setTimeout(pendingCard, 1000); return r; };
  var watching = false;
  setInterval(function () {
    var u = me(); if (watching || !u || !u.uid) return; watching = true;
    var seen = {};
    try {
      F().onSnapshot(F().query(F().collection(DB(), 'withdrawals'), F().where('uid', '==', u.uid)), function (snap) {
        (typeof snap.docChanges === 'function' ? snap.docChanges() : []).forEach(function (c) {
          var d = c.doc.data(), k = c.doc.id;
          if (seen[k] && seen[k] !== d.status) {
            if (d.status === 'paid') say(ngn(d.amount) + ' has been sent to your bank account.');
            if (d.status === 'rejected') say('Your withdrawal of ' + ngn(d.amount) + ' was not processed and the money is back in your wallet.' + (d.note ? ' ' + d.note : ''), true);
            try { window.renderWallet(); } catch (e) {}
          }
          seen[k] = d.status;
        });
        pendingCard();
      }, function () {});
    } catch (e) {}
  }, 2500);

  /* ═════════════ admin side ═════════════ */
  function admin() { return !!(me() && me().isAdmin); }
  var WDS = [], HOLD = {};
  async function load() {
    await loadLim();
    try {
      var s = await F().getDocs(F().collection(DB(), 'withdrawals'));
      WDS = s.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); }).sort(function (a, b) { return (b.created || 0) - (a.created || 0); });
      var pend = WDS.filter(function (d) { return d.status === 'pending'; });
      for (var i = 0; i < pend.length; i++) {
        try { var u = await F().getDoc(doc('users', pend[i].uid)); var w = (u.data() || {}).wallet || {}; HOLD[pend[i].id] = { held: w.held || 0, ok: (w.held || 0) >= pend[i].amount, name: (u.data() || {}).name }; } catch (e) {}
      }
    } catch (e) { console.warn(e); }
    draw();
  }
  function badge(n) { var b = $('admt-withdrawals'); if (b) b.textContent = '💸 Withdrawals' + (n ? ' (' + n + ')' : ''); }
  function draw() {
    var el = $('admtab-withdrawals'); if (!el) return;
    var pend = WDS.filter(function (d) { return d.status === 'pending'; }), done = WDS.filter(function (d) { return d.status !== 'pending'; }).slice(0, 15);
    function cp(v) { return '<button style="border:0;background:none;color:var(--acc);font-weight:700;font-size:11px;cursor:pointer;" onclick="ssCopy(\'' + esc(v) + '\',this)">Copy</button>'; }
    function card(d) {
      var h = HOLD[d.id], p = d.status === 'pending';
      return '<div style="border:1px solid var(--br);border-radius:12px;padding:12px;margin-bottom:8px;background:var(--s);"><div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;"><div><b>' + esc(d.name) + '</b> · ' + ngn(d.amount) + '</div><div style="font-size:11px;color:var(--td);">' + ago(d.created) + ' · ' + esc(d.status) + '</div></div>'
        + '<div style="font-size:12px;line-height:1.9;margin:6px 0;">' + esc(d.bankName) + ' · ' + esc(d.accountNumber) + ' ' + cp(d.accountNumber) + '<br>Account name: <b>' + esc(d.accountName) + '</b>' + (h && h.name && h.name.toLowerCase() !== String(d.accountName).toLowerCase() ? ' <span style="color:#b45309;">(profile name: ' + esc(h.name) + ')</span>' : '') + '<br>Ref ' + esc(d.ref) + '</div>'
        + (p && d.riskReasons && d.riskReasons.length ? '<div style="font-size:12px;margin-bottom:8px;padding:8px 10px;border-radius:8px;background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.3);color:#b42318;line-height:1.5;"><b>🚩 Look before you pay (risk ' + esc(d.riskScore) + ')</b><br>' + d.riskReasons.map(esc).join('<br>') + '</div>' : '')
        + (p ? '<div style="font-size:12px;margin-bottom:8px;color:' + (h && h.ok ? '#1a6b3c' : '#b42318') + ';">' + (h ? (h.ok ? 'Wallet check: ' + ngn(h.held) + ' is held for this member.' : 'Wallet check FAILED: only ' + ngn(h.held) + ' held. Do not pay; reject this request.') : 'Wallet check unavailable.') + '</div>'
          + '<div style="display:flex;gap:8px;flex-wrap:wrap;"><button class="btn wd-b" onclick="ssWdPaid(\'' + d.id + '\')">Mark as paid</button><button class="btn wd-b" style="background:var(--s2);color:var(--tx);border:1px solid var(--br);" onclick="ssWdReject(\'' + d.id + '\')">Reject and return money</button></div>' : '') + '</div>';
    }
    el.innerHTML = '<style>#admtab-withdrawals .wd-b{width:auto!important;display:inline-block!important;flex:none;padding:9px 14px!important;border-radius:10px;font-size:12px}</style>'
      + '<div style="border:1px solid var(--br);border-radius:12px;padding:12px;margin-bottom:14px;background:var(--s);"><div style="font-weight:800;font-size:13px;margin-bottom:8px;">Withdrawal limits</div><div style="display:flex;gap:8px;flex-wrap:wrap;align-items:flex-end;">'
      + '<label style="font-size:11px;color:var(--td);">Minimum (₦)<br><input class="fi" id="wl-min" type="number" value="' + LIM.min + '" style="width:110px;"></label>'
      + '<label style="font-size:11px;color:var(--td);">Daily limit (₦)<br><input class="fi" id="wl-day" type="number" value="' + LIM.daily + '" style="width:130px;"></label>'
      + '<label style="font-size:11px;color:var(--td);">Hold new top-ups (hours)<br><input class="fi" id="wl-hold" type="number" value="' + LIM.holdHours + '" style="width:110px;"></label>'
      + '<button class="btn wd-b" onclick="ssWdSaveLimits()">Save</button></div><div style="font-size:11px;color:var(--td);margin-top:8px;line-height:1.5;">Members cannot withdraw money from a top-up until it has been confirmed for this many hours. Set 0 to turn the hold off.</div></div>'
      + '<div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:800;font-size:15px;margin-bottom:6px;">Pending withdrawals (' + pend.length + ')</div><div style="font-size:12px;color:var(--td);margin-bottom:8px;">Send the money from your bank first, then tap Mark as paid. The account name should match the member.</div>'
      + (pend.map(card).join('') || '<div style="font-size:12px;color:var(--td);margin-bottom:14px;">Nothing waiting.</div>')
      + '<div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:800;font-size:15px;margin:16px 0 6px;">Recent</div>' + (done.map(card).join('') || '<div style="font-size:12px;color:var(--td);">None yet.</div>');
    badge(pend.length);
  }
  window.ssWdSaveLimits = async function () {
    if (!admin()) return;
    var mn = Math.floor(Number($('wl-min').value)), dy = Math.floor(Number($('wl-day').value)), hd = Math.floor(Number($('wl-hold').value));
    if (!(mn >= 100) || !(dy >= mn) || !(hd >= 0 && hd <= 720)) return say('Check the numbers: minimum at least 100, daily limit at least the minimum, hold between 0 and 720 hours.', true);
    try { await F().setDoc(doc('payment_settings', 'limits'), { min: mn, daily: dy, holdHours: hd, updated: Date.now(), by: me().uid }); LIM = { min: mn, daily: dy, holdHours: hd }; say('Limits saved.'); }
    catch (e) { console.warn(e); say('Could not save the limits (is the panel unlocked?).', true); }
  };
  var lock = {};
  async function settle(id, paid, note) {
    var cur = (await F().getDoc(doc('withdrawals', id))).data();
    if (!cur || cur.status !== 'pending') { say('That request was already handled.', true); return false; }
    var us = await F().getDoc(doc('users', cur.uid)); if (!us.exists()) throw new Error('member missing');
    var w = Object.assign(blank(), us.data().wallet || {}); w.transactions = (w.transactions || []).slice();
    var tx = w.transactions.filter(function (t) { return t.id === 'wd_' + id; })[0];
    if (!tx || !tx.settled) {
      if ((w.held || 0) < cur.amount) throw new Error('no hold on this member\'s wallet');
      w.held = (w.held || 0) - cur.amount;
      if (!paid) w.balance = (w.balance || 0) + cur.amount;
      var nt = { id: 'wd_' + id, type: 'out', amount: cur.amount, to: cur.bankName, desc: paid ? 'Withdrawal paid (' + cur.ref + ')' : 'Withdrawal returned (' + cur.ref + ')', ts: tx ? tx.ts : Date.now(), settled: true };
      if (tx) w.transactions[w.transactions.indexOf(tx)] = nt; else w.transactions.unshift(nt);
      await F().updateDoc(doc('users', cur.uid), { wallet: w });
    }
    await F().updateDoc(doc('withdrawals', id), { status: paid ? 'paid' : 'rejected', note: note || '', settledAt: Date.now(), settledBy: me().uid });
    try { var nid = 'n' + Date.now() + Math.random().toString(36).slice(2, 5); await F().setDoc(doc('notifications', nid), { id: nid, uid: cur.uid, type: 'payment', title: paid ? 'Withdrawal paid' : 'Withdrawal returned', body: paid ? ngn(cur.amount) + ' has been sent to your bank account.' : ngn(cur.amount) + ' is back in your wallet.' + (note ? ' ' + note : ''), meta: {}, read: false, ts: Date.now(), fromUid: me().uid }); } catch (e) {}
    try { if (window.ssLog) window.ssLog(paid ? 'withdrawal_paid' : 'withdrawal_rejected', cur.uid, cur.name, ngn(cur.amount) + ' ' + cur.ref); } catch (e) {}
    return true;
  }
  window.ssWdPaid = async function (id) {
    if (!admin() || lock[id]) return;
    var d = WDS.filter(function (x) { return x.id === id; })[0]; if (!d) return;
    if (!confirm('Have you already sent ' + ngn(d.amount) + ' to ' + d.accountName + ' (' + d.bankName + ' ' + d.accountNumber + ')?')) return;
    lock[id] = 1;
    try { if (await settle(id, true, '')) say('Marked as paid.'); } catch (e) { console.warn(e); say('Could not complete: ' + (e && e.message || 'try again'), true); }
    lock[id] = 0; load();
  };
  window.ssWdReject = async function (id) {
    if (!admin() || lock[id]) return;
    var d = WDS.filter(function (x) { return x.id === id; })[0]; if (!d) return;
    var note = prompt('Reason (shown to the member):', 'Please check your account details and try again.'); if (note === null) return;
    lock[id] = 1;
    try { if (await settle(id, false, String(note).slice(0, 200))) say('Rejected and money returned.'); } catch (e) { console.warn(e); say('Could not complete: ' + (e && e.message || 'try again'), true); }
    lock[id] = 0; load();
  };

  function addTab() {
    var tabs = $('adm-tabs'), root = $('admin-root'); if (!tabs || !root || $('admt-withdrawals')) return;
    var b = document.createElement('button'); b.id = 'admt-withdrawals'; b.textContent = '💸 Withdrawals'; b.setAttribute('onclick', "adminTab('withdrawals')");
    b.style.cssText = 'padding:7px 13px;font-size:11px;font-family:Plus Jakarta Sans,sans-serif;font-weight:700;border-radius:6px;border:1px solid var(--br);background:var(--s);color:var(--td);cursor:pointer;';
    tabs.appendChild(b);
    var p = document.createElement('div'); p.id = 'admtab-withdrawals'; p.style.display = 'none'; root.appendChild(p);
  }
  var rA = window.renderAdminV6;
  if (typeof rA === 'function') window.renderAdminV6 = function () { var r = rA.apply(this, arguments); try { if (admin()) { addTab(); badge(WDS.filter(function (d) { return d.status === 'pending'; }).length); } } catch (e) {} return r; };
  var tA = window.adminTab;
  if (typeof tA === 'function') window.adminTab = function (name) {
    var r = tA.apply(this, arguments);
    try {
      var p = $('admtab-withdrawals'), b = $('admt-withdrawals'), on = name === 'withdrawals';
      if (p) p.style.display = on ? 'block' : 'none';
      if (b) { b.style.background = on ? 'var(--acc)' : 'var(--s)'; b.style.color = on ? '#fff' : 'var(--td)'; b.style.borderColor = on ? 'var(--acc)' : 'var(--br)'; }
      if (on) load();
    } catch (e) {}
    return r;
  };
  var aw = false;
  setInterval(function () {
    if (aw || !admin()) return; aw = true; var first = true;
    try {
      F().onSnapshot(F().query(F().collection(DB(), 'withdrawals'), F().where('status', '==', 'pending')), function (snap) {
        badge(snap.size);
        if (!first && typeof snap.docChanges === 'function') snap.docChanges().forEach(function (c) { if (c.type === 'added') say('New withdrawal request in Withdrawals.'); });
        first = false;
        var p = $('admtab-withdrawals'); if (p && p.style.display !== 'none') load();
      }, function () {});
    } catch (e) {}
  }, 3000);
})();
