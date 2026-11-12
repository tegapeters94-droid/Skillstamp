/* SkillStamp - bank-transfer top-ups (manual confirmation by admin).
   Client: amount -> bank details + unique reference -> "I have paid" -> waits for admin.
   Admin: "Deposits" tab with bank settings and a confirmation queue.
   Balances are only ever credited by an admin; members cannot raise their own balance. */
(function () {
  'use strict';
  var MIN = 1000, MAX = 5000000, HOURS = 2;
  function $(id) { return document.getElementById(id); }
  function F() { return window.FB_FNS; }
  function DB() { return window.FB_DB; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function say(m, bad) { try { if (window.toast) window.toast(m, bad ? 'bad' : undefined); } catch (e) {} }
  function ngn(n) { return '₦' + (Math.round((Number(n) || 0) * 100) / 100).toLocaleString(); }
  function me() { return window.ME; }
  function ago(ts) { var s = Math.max(1, Math.floor((Date.now() - ts) / 1000)); return s < 3600 ? Math.max(1, Math.floor(s / 60)) + 'm ago' : s < 86400 ? Math.floor(s / 3600) + 'h ago' : Math.floor(s / 86400) + 'd ago'; }
  function doc(col, id) { return F().doc(DB(), col, id); }
  function newRef() { var a = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789', r = 'SS-'; var b = new Uint8Array(6); crypto.getRandomValues(b); for (var i = 0; i < 6; i++) r += a[b[i] % a.length]; return r; }
  function modal(h) { if (typeof window.setModal === 'function') window.setModal(h); }
  window.ssCopy = function (t, btn) { try { navigator.clipboard.writeText(t); if (btn) { var o = btn.textContent; btn.textContent = 'Copied'; setTimeout(function () { btn.textContent = o; }, 1200); } } catch (e) {} };

  /* ═════════════ member side ═════════════ */
  async function myDeposits() {
    var q = F().query(F().collection(DB(), 'deposits'), F().where('uid', '==', me().uid));
    var s = await F().getDocs(q);
    return s.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); }).sort(function (a, b) { return (b.created || 0) - (a.created || 0); });
  }
  async function bank() {
    try { var s = await F().getDoc(doc('payment_settings', 'bank')); return s.exists() ? s.data() : null; } catch (e) { return null; }
  }
  function open(d) { return d.status === 'awaiting' && d.expires > Date.now() || d.status === 'claimed'; }

  function showDeposit(d, b) {
    var claimed = d.status === 'claimed';
    var left = Math.max(0, Math.round((d.expires - Date.now()) / 60000));
    modal('<button class="mclose" onclick="closeModal()">✕</button><h3>' + (claimed ? 'Waiting for confirmation' : 'Pay by bank transfer') + '</h3>'
      + '<p style="font-size:13px;line-height:1.6;">' + (claimed
        ? 'We have been told you sent <b>' + ngn(d.amount) + '</b>. We will confirm it against our bank account and credit your wallet. This usually takes a short while.'
        : 'Transfer exactly <b>' + ngn(d.amount) + '</b> to the account below and put the reference in the transfer description.') + '</p>'
      + '<div style="background:var(--s2);border:1px solid var(--br);border-radius:14px;padding:14px;margin:10px 0;font-size:13px;line-height:2;">'
      + row('Bank', b.bankName) + row('Account number', b.accountNumber, true) + row('Account name', b.accountName) + row('Amount', ngn(d.amount)) + row('Reference', d.ref, true) + '</div>'
      + (claimed ? '<div style="font-size:12px;color:var(--td);">Keep your transfer receipt in case we need it. You can close this window; your wallet updates when we confirm.</div>'
        : '<div style="font-size:11px;color:var(--td);margin-bottom:12px;">This request expires in about ' + left + ' minutes. Send the money first, then tap the button below.</div>'
          + '<button class="btn" style="width:100%;" id="td-paid" onclick="ssDepositPaid(\'' + d.id + '\')">I have made the payment</button>')
      + '<button class="btn" style="width:100%;margin-top:8px;background:var(--s2);color:var(--tx);border:1px solid var(--br);" onclick="closeModal()">Close</button>');
  }
  function row(k, v, copy) {
    return '<div style="display:flex;justify-content:space-between;gap:10px;align-items:center;"><span style="color:var(--td);">' + esc(k) + '</span><span style="font-weight:700;text-align:right;word-break:break-all;">' + esc(v) + (copy ? ' <button style="border:0;background:none;color:var(--acc);font-weight:700;font-size:11px;cursor:pointer;" onclick="ssCopy(\'' + esc(v) + '\',this)">Copy</button>' : '') + '</span></div>';
  }

  window.openTopUp = async function () {
    var u = me(); if (!u) return;
    if (u.walletMode === 'test') return say('You are on test credits. Ask SkillStamp admin for more.', true);
    var b = await bank();
    if (!b || !b.accountNumber) { modal('<button class="mclose" onclick="closeModal()">✕</button><h3>Top-ups not ready</h3><p style="font-size:13px;line-height:1.6;">Bank-transfer top-ups are not switched on yet. Please check back soon.</p><button class="btn" style="width:100%;" onclick="closeModal()">Okay</button>'); return; }
    var existing = null;
    try { existing = (await myDeposits()).filter(open)[0]; } catch (e) { console.warn(e); }
    if (existing) return showDeposit(existing, b);
    var chips = [5000, 10000, 25000, 50000].map(function (a) { return '<div onclick="ssTopAmt(' + a + ')" style="padding:12px;background:var(--s2);border:1px solid var(--br);border-radius:12px;text-align:center;cursor:pointer;font-weight:700;">' + ngn(a) + '</div>'; }).join('');
    modal('<button class="mclose" onclick="closeModal()">✕</button><h3>Top up your wallet</h3><p style="font-size:13px;line-height:1.6;">Add money in naira by bank transfer to fund your gigs. Minimum ' + ngn(MIN) + '.</p>'
      + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px;">' + chips + '</div>'
      + '<div class="fg"><label class="fl">Amount (₦)</label><input class="fi" id="td-amt" type="number" min="' + MIN + '" placeholder="e.g. 20000"></div>'
      + '<button class="btn" style="width:100%;" id="td-go" onclick="ssDepositStart()">Continue</button>');
  };
  window.ssTopAmt = function (a) { var el = $('td-amt'); if (el) el.value = a; };
  window.ssDepositStart = async function () {
    var amt = Math.floor(Number($('td-amt') && $('td-amt').value));
    if (!(amt >= MIN)) return say('Minimum top-up is ' + ngn(MIN) + '.', true);
    if (amt > MAX) return say('Maximum single top-up is ' + ngn(MAX) + '.', true);
    var btn = $('td-go'); if (btn) { btn.disabled = true; btn.textContent = 'Please wait...'; }
    try {
      var b = await bank();
      var d = { uid: me().uid, name: me().name || '', amount: amt, ref: newRef(), status: 'awaiting', created: Date.now(), expires: Date.now() + HOURS * 3600000 };
      var id = 'd' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      await F().setDoc(doc('deposits', id), d);
      d.id = id; showDeposit(d, b);
    } catch (e) { console.warn(e); say('Could not start the top-up. Please try again.', true); if (btn) { btn.disabled = false; btn.textContent = 'Continue'; } }
  };
  window.ssDepositPaid = async function (id) {
    var btn = $('td-paid'); if (btn) { btn.disabled = true; btn.textContent = 'Sending...'; }
    try {
      await F().updateDoc(doc('deposits', id), { status: 'claimed', claimedAt: Date.now() });
      var d = (await myDeposits()).filter(function (x) { return x.id === id; })[0]; var b = await bank();
      if (d && b) showDeposit(d, b); say('Thanks. We will confirm your payment shortly.'); pendingCard();
    } catch (e) { console.warn(e); say('Could not send that. Please try again.', true); if (btn) { btn.disabled = false; btn.textContent = 'I have made the payment'; } }
  };

  /* pending top-up card on the wallet screen */
  async function pendingCard() {
    try {
      var page = $('page-wallet'); if (!page || !me() || me().walletMode === 'test') return;
      var list = (await myDeposits()).filter(open);
      var el = $('wallet-pending-dep');
      if (!list.length) { if (el) el.remove(); return; }
      if (!el) { el = document.createElement('div'); el.id = 'wallet-pending-dep'; var n = $('wallet-mode-note') || page.querySelector('.wallet-card'); if (n && n.parentNode) n.parentNode.insertBefore(el, n.nextSibling); }
      el.style.cssText = 'margin:0 0 14px;padding:12px 14px;border-radius:12px;background:var(--s);border:1px solid var(--br);font-size:12px;';
      var d = list[0];
      el.innerHTML = '<b>Top-up ' + (d.status === 'claimed' ? 'awaiting confirmation' : 'not paid yet') + '</b>: ' + ngn(d.amount) + ' · ref ' + esc(d.ref) + ' <a style="color:var(--acc);font-weight:700;cursor:pointer;" onclick="openTopUp()">View</a>';
    } catch (e) {}
  }
  var rw = window.renderWallet;
  if (typeof rw === 'function') window.renderWallet = function () { var r = rw.apply(this, arguments); setTimeout(pendingCard, 900); return r; };

  var watching = false;
  function watchMine() {
    var u = me(); if (watching || !u || !u.uid || u.isAdmin && false) return; watching = true;
    var seen = {};
    try {
      F().onSnapshot(F().query(F().collection(DB(), 'deposits'), F().where('uid', '==', u.uid)), function (snap) {
        (typeof snap.docChanges === 'function' ? snap.docChanges() : []).forEach(function (c) {
          var d = c.doc.data(), k = c.doc.id;
          if (seen[k] && seen[k] !== d.status) {
            if (d.status === 'confirmed') { say(ngn(d.creditedAmount || d.amount) + ' added to your wallet.'); try { window.renderWallet(); } catch (e) {} }
            if (d.status === 'rejected') say('Your top-up of ' + ngn(d.amount) + ' could not be confirmed.' + (d.note ? ' ' + d.note : ''), true);
          }
          seen[k] = d.status;
        });
        pendingCard();
      }, function () {});
    } catch (e) {}
  }
  setInterval(function () { if (me() && me().uid && !watching) watchMine(); }, 2500);

  /* ═════════════ admin side ═════════════ */
  function admin() { return !!(me() && me().isAdmin); }
  var DEPS = [], BANK = {};
  async function load() {
    try { var s = await F().getDocs(F().collection(DB(), 'deposits')); DEPS = s.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); }).sort(function (a, b) { return (b.created || 0) - (a.created || 0); }); } catch (e) { console.warn(e); }
    BANK = (await bank()) || {};
    drawAdmin();
  }
  function drawAdmin() {
    var el = $('admtab-deposits'); if (!el) return;
    var todo = DEPS.filter(function (d) { return d.status === 'claimed'; }), wait = DEPS.filter(function (d) { return d.status === 'awaiting'; }), done = DEPS.filter(function (d) { return d.status === 'confirmed' || d.status === 'rejected'; }).slice(0, 15);
    function card(d, actions) {
      var exp = d.status === 'awaiting' && d.expires < Date.now();
      return '<div style="border:1px solid var(--br);border-radius:12px;padding:12px;margin-bottom:8px;background:var(--s);"><div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;"><div><b>' + esc(d.name) + '</b> · ' + ngn(d.amount) + '</div><div style="font-size:11px;color:var(--td);">' + ago(d.claimedAt || d.created) + (exp ? ' · expired' : '') + '</div></div>'
        + '<div style="font-size:12px;color:var(--td);margin:4px 0 8px;">Reference <b style="color:var(--tx);">' + esc(d.ref) + '</b>' + (d.status === 'confirmed' ? ' · credited ' + ngn(d.creditedAmount || d.amount) : '') + (d.status === 'rejected' ? ' · rejected' : '') + '</div>' + (actions || '') + '</div>';
    }
    function acts(d) {
      return '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;"><input id="dp-amt-' + d.id + '" type="number" class="fi dp-i" value="' + d.amount + '" title="Amount actually received">'
        + '<button class="btn dp-b" onclick="ssDepositConfirm(\'' + d.id + '\')">Confirm received</button><button class="btn dp-b" style="background:var(--s2);color:var(--tx);border:1px solid var(--br);" onclick="ssDepositReject(\'' + d.id + '\')">Reject</button></div>';
    }
    el.innerHTML = '<style>#admtab-deposits .dp-b{width:auto!important;display:inline-block!important;flex:none;padding:9px 14px!important;border-radius:10px;font-size:12px}#admtab-deposits .dp-i{width:130px!important;flex:none;box-sizing:border-box;padding:9px 10px}#admtab-deposits .dp-t{width:100%!important;box-sizing:border-box;margin-bottom:8px}</style>'
      + '<div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:800;font-size:15px;margin-bottom:6px;">Bank account shown to clients</div>'
      + '<div style="border:1px solid var(--br);border-radius:12px;padding:12px;background:var(--s);margin-bottom:18px;"><input id="bk-name" class="fi dp-t" placeholder="Bank name" value="' + esc(BANK.bankName || '') + '"><input id="bk-num" class="fi dp-t" placeholder="Account number" value="' + esc(BANK.accountNumber || '') + '"><input id="bk-acc" class="fi dp-t" placeholder="Account name" value="' + esc(BANK.accountName || '') + '"><button class="btn dp-b" onclick="ssBankSave()">Save bank details</button></div>'
      + '<div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:800;font-size:15px;margin-bottom:6px;">Claimed payments (' + todo.length + ')</div><div style="font-size:12px;color:var(--td);margin-bottom:8px;">Check your bank app first. Credit only what actually arrived, matching the reference.</div>'
      + (todo.map(function (d) { return card(d, acts(d)); }).join('') || '<div style="font-size:12px;color:var(--td);margin-bottom:14px;">Nothing waiting.</div>')
      + '<div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:800;font-size:15px;margin:16px 0 6px;">Started, not yet marked paid (' + wait.length + ')</div>'
      + (wait.map(function (d) { return card(d, acts(d)); }).join('') || '<div style="font-size:12px;color:var(--td);">None.</div>')
      + '<div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:800;font-size:15px;margin:16px 0 6px;">Recent</div>'
      + (done.map(function (d) { return card(d); }).join('') || '<div style="font-size:12px;color:var(--td);">None yet.</div>');
    badge(todo.length);
  }
  function badge(n) { var b = $('admt-deposits'); if (b) b.textContent = '🏦 Deposits' + (n ? ' (' + n + ')' : ''); }
  window.ssBankSave = async function () {
    var v = { bankName: $('bk-name').value.trim(), accountNumber: $('bk-num').value.replace(/\s/g, ''), accountName: $('bk-acc').value.trim(), updated: Date.now() };
    if (!v.bankName || !/^[0-9]{10}$/.test(v.accountNumber) || !v.accountName) return say('Enter the bank name, a 10-digit account number and the account name.', true);
    try { await F().setDoc(doc('payment_settings', 'bank'), v); say('Bank details saved.'); await load(); } catch (e) { say('Could not save.', true); }
  };
  var lock = {};
  window.ssDepositConfirm = async function (id) {
    if (!admin() || lock[id]) return;
    var amt = Math.floor(Number($('dp-amt-' + id) && $('dp-amt-' + id).value));
    var d = DEPS.filter(function (x) { return x.id === id; })[0]; if (!d) return;
    if (!(amt > 0) || amt > MAX) return say('Enter the amount that actually arrived.', true);
    if (!confirm('Confirm you received ' + ngn(amt) + ' in your bank account with reference ' + d.ref + ' and credit ' + d.name + '?')) return;
    lock[id] = 1;
    try {
      var cur = (await F().getDoc(doc('deposits', id))).data();
      if (!cur || (cur.status !== 'claimed' && cur.status !== 'awaiting')) { say('That deposit was already handled.', true); lock[id] = 0; return load(); }
      var us = await F().getDoc(doc('users', d.uid)); if (!us.exists()) throw new Error('user missing');
      var u = us.data(), w = Object.assign({ balance: 0, pending: 0, earned: 0, transactions: [] }, u.wallet || {});
      w.transactions = (w.transactions || []).slice();
      if (!w.transactions.some(function (t) { return t.id === 'dep_' + id; })) {
        w.balance = (w.balance || 0) + amt;
        w.transactions.unshift({ id: 'dep_' + id, type: 'in', amount: amt, from: 'Bank transfer', desc: 'Wallet top-up (' + d.ref + ')', ts: Date.now() });
        await F().updateDoc(doc('users', d.uid), { wallet: w });
      }
      await F().updateDoc(doc('deposits', id), { status: 'confirmed', creditedAmount: amt, confirmedAt: Date.now(), confirmedBy: me().uid });
      try { var nid = 'n' + Date.now() + Math.random().toString(36).slice(2, 5); await F().setDoc(doc('notifications', nid), { id: nid, uid: d.uid, type: 'payment', title: 'Top-up confirmed', body: ngn(amt) + ' has been added to your wallet.', meta: {}, read: false, ts: Date.now(), fromUid: me().uid }); } catch (e) {}
      try { if (window.ssLog) window.ssLog('deposit_confirmed', d.uid, d.name, ngn(amt) + ' ' + d.ref); } catch (e) {}
      say('Credited ' + ngn(amt) + ' to ' + d.name + '.');
    } catch (e) { console.warn(e); say('Could not complete: ' + (e && e.message || 'try again') + '. Check before retrying; the system will not double-credit.', true); }
    lock[id] = 0; load();
  };
  window.ssDepositReject = async function (id) {
    if (!admin() || lock[id]) return;
    var d = DEPS.filter(function (x) { return x.id === id; })[0]; if (!d) return;
    var note = prompt('Reason for rejecting (shown to the client):', 'We could not find this transfer.'); if (note === null) return;
    lock[id] = 1;
    try {
      var cur = (await F().getDoc(doc('deposits', id))).data();
      if (!cur || (cur.status !== 'claimed' && cur.status !== 'awaiting')) { say('That deposit was already handled.', true); }
      else { await F().updateDoc(doc('deposits', id), { status: 'rejected', note: String(note).slice(0, 200), confirmedAt: Date.now(), confirmedBy: me().uid }); say('Rejected.'); }
    } catch (e) { say('Could not reject.', true); }
    lock[id] = 0; load();
  };

  function addTab() {
    var tabs = $('adm-tabs'), root = $('admin-root'); if (!tabs || !root || $('admt-deposits')) return;
    var b = document.createElement('button'); b.id = 'admt-deposits'; b.textContent = '🏦 Deposits'; b.setAttribute('onclick', "adminTab('deposits')");
    b.style.cssText = 'padding:7px 13px;font-size:11px;font-family:Plus Jakarta Sans,sans-serif;font-weight:700;border-radius:6px;border:1px solid var(--br);background:var(--s);color:var(--td);cursor:pointer;';
    tabs.appendChild(b);
    var p = document.createElement('div'); p.id = 'admtab-deposits'; p.style.display = 'none'; root.appendChild(p);
  }
  var rA = window.renderAdminV6;
  if (typeof rA === 'function') window.renderAdminV6 = function () { var r = rA.apply(this, arguments); try { if (admin()) { addTab(); badge(DEPS.filter(function (d) { return d.status === 'claimed'; }).length); } } catch (e) {} return r; };
  var tA = window.adminTab;
  if (typeof tA === 'function') window.adminTab = function (name) {
    var r = tA.apply(this, arguments);
    try {
      var p = $('admtab-deposits'), b = $('admt-deposits'), on = name === 'deposits';
      if (p) p.style.display = on ? 'block' : 'none';
      if (b) { b.style.background = on ? 'var(--acc)' : 'var(--s)'; b.style.color = on ? '#fff' : 'var(--td)'; b.style.borderColor = on ? 'var(--acc)' : 'var(--br)'; }
      if (on) load();
    } catch (e) {}
    return r;
  };

  /* admin alert when a client marks a payment as sent */
  var adminWatch = false;
  setInterval(function () {
    if (adminWatch || !admin()) return; adminWatch = true;
    var first = true;
    try {
      F().onSnapshot(F().query(F().collection(DB(), 'deposits'), F().where('status', '==', 'claimed')), function (snap) {
        DEPS = DEPS.filter(function (d) { return d.status !== 'claimed'; }).concat(snap.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); }));
        badge(snap.size);
        if (!first && typeof snap.docChanges === 'function') snap.docChanges().forEach(function (c) { if (c.type === 'added') say('New payment to confirm in Deposits.'); });
        first = false;
        var p = $('admtab-deposits'); if (p && p.style.display !== 'none') load();
      }, function () {});
    } catch (e) {}
  }, 3000);
})();
