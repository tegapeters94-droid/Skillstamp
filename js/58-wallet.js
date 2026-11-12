/* SkillStamp - wallet modes.
   Naira (₦) is the real currency. Members holding admin-granted test credits (T₦) are in "test" mode:
   they see only test credits and cannot withdraw until an admin resets them, which returns them to the live ₦ wallet.
   Wraps existing wallet screens; adds an admin "Wallets" tab for granting and resetting test credits. */
(function () {
  'use strict';
  var MAX_GRANT = 1000000;
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function F() { return window.FB_FNS; }
  function DB() { return window.FB_DB; }
  function say(m, bad) { try { if (window.toast) window.toast(m, bad ? 'bad' : undefined); } catch (e) {} }
  function isTest(u) { return !!(u && u.walletMode === 'test'); }
  function sym(u) { return isTest(u) ? 'T₦' : '₦'; }
  function fmt(u, n) { return sym(u) + (Math.round((Number(n) || 0) * 100) / 100).toLocaleString(); }
  /* Format a gig price for display: always naira, whether it is stored as 5000, "5,000" or an old "$5,000". */
  window.ssPay = function (v) {
    if (v === null || v === undefined || v === '') return '';
    if (typeof v === 'number') return '₦' + v.toLocaleString();
    var s = String(v);
    if (!/\d/.test(s)) return s;
    return '₦' + s.replace(/^[₦$]+\s*/, '');
  };
  window.ssWalletSym = function (u) { return sym(u || window.ME); };
  window.ssIsTestWallet = function (u) { return isTest(u || window.ME); };

  /* ---------- member wallet screen ---------- */
  var busy = false, OBS = null;
  function decorate() {
    if (busy) return; busy = true;
    try {
      var me = window.ME; var page = $('page-wallet'); if (!me || !page) return;
      var s = sym(me), test = isTest(me), client = me.role === 'employer';
      ['w-balance', 'w-earned', 'w-pending'].forEach(function (id) {
        var el = $(id); if (el && (el.textContent.charAt(0) === '$' || el.textContent.charAt(0) === '₦')) el.textContent = el.textContent.replace(/^(T₦|₦|\$)/, s);
      });
      var rows = page.querySelectorAll('.tx-amount');
      for (var i = 0; i < rows.length; i++) rows[i].textContent = rows[i].textContent.replace('$', s);
      var lab = page.querySelector('.w-label'); if (lab) lab.textContent = test ? 'Test credits (not real money)' : 'Available balance';
      var demo = $('wallet-demo-notice'); if (demo) demo.style.display = 'none';
      var acts = page.querySelectorAll('.w-btn');
      for (var j = 0; j < acts.length; j++) {
        var oc = acts[j].getAttribute('onclick') || '', show = true;
        if (/openReceive|openSend/.test(oc)) show = false;
        else if (test && /openWithdraw|openTopUp/.test(oc)) show = false;
        else if (/openTopUp/.test(oc) && !client) show = false;
        else if (/openWithdraw/.test(oc) && client) show = false;
        acts[j].style.display = show ? '' : 'none';
      }
      var note = $('wallet-mode-note');
      if (!note) {
        note = document.createElement('div'); note.id = 'wallet-mode-note';
        var card = page.querySelector('.wallet-card'); if (card && card.parentNode) card.parentNode.insertBefore(note, card.nextSibling);
      }
      if (note) {
        note.style.cssText = 'margin:0 0 14px;padding:11px 14px;border-radius:12px;font-size:12px;line-height:1.5;background:' + (test ? 'rgba(232,197,71,.12)' : 'rgba(26,107,60,.08)') + ';color:var(--tx);';
        note.innerHTML = test
          ? '<b>Test mode.</b> These T₦ credits are for trying SkillStamp and cannot be withdrawn. When testing ends your wallet is reset to a real ₦ wallet.'
          : '<b>Real money wallet (₦).</b> ' + (client ? 'Top up by bank transfer to fund gigs.' : 'Withdraw your earnings to your bank account.');
      }
    } catch (e) { console.warn('[wallet] decorate', e); }
    finally { busy = false; if (OBS) OBS.takeRecords(); }
  }
  function watch() {
    var page = $('page-wallet'); if (!page || page.__wm) return; page.__wm = true;
    OBS = new MutationObserver(function () { decorate(); }); OBS.observe(page, { childList: true, subtree: true, characterData: true });
    decorate();
  }
  var rw = window.renderWallet;
  if (typeof rw === 'function') {
    window.renderWallet = function () { var r = rw.apply(this, arguments); watch(); setTimeout(decorate, 50); return r; };
  }
  document.addEventListener('DOMContentLoaded', watch);
  setTimeout(watch, 1500);

  function info(title, body) {
    if (typeof window.setModal !== 'function') { say(title, true); return; }
    window.setModal('<button class="mclose" onclick="closeModal()">✕</button><h3>' + esc(title) + '</h3><p style="font-size:13px;line-height:1.6;">' + body + '</p><button class="btn" style="width:100%;margin-top:10px;" onclick="closeModal()">Okay</button>');
  }
  var oTop = window.openTopUp, oWd = window.openWithdraw;
  window.openTopUp = function () {
    if (isTest(window.ME)) return info('Test credits', 'Test credits are granted by SkillStamp admin. Ask us if you need more.');
    return info('Bank-transfer top-ups', 'Top-ups by bank transfer are opening very soon. You will be able to add money in ₦ right here.');
  };
  window.openWithdraw = function () {
    if (isTest(window.ME)) return info('Withdrawals are off', 'You are using test credits, which are not real money. Withdrawals open once your wallet is reset to the live ₦ wallet.');
    return info('Withdrawals', 'Withdrawals to your bank account are opening very soon.');
  };
  window.processTopUp = function () { say('Top-ups are not available yet.', true); };
  window.processWithdraw = function () { say('Withdrawals are not available yet.', true); };
  window.openSend = function () { say('Send is no longer available.', true); };
  window.openReceive = function () { say('Receive is no longer available.', true); };

  /* ---------- admin: Wallets tab ---------- */
  function admin() { return !!(window.ME && window.ME.isAdmin); }
  var USERS = [];
  async function loadUsers() {
    var s = await F().getDocs(F().collection(DB(), 'users'));
    USERS = s.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); }).filter(function (u) { return !u.deleted; });
  }
  function logA(a, u, d) { try { if (window.ssLog) window.ssLog(a, u.uid || u.id, u.name, d); } catch (e) {} }
  function blank() { return { balance: 0, pending: 0, earned: 0, transactions: [] }; }
  function activeEscrow(uid) {
    try {
      var g = (window.getGigs && window.getGigs()) || [];
      return g.filter(function (x) { return Number(x.escrowAmount) > 0 && ['hired', 'delivered', 'in_progress', 'disputed'].indexOf(x.status) >= 0 && (x.hiredUid === uid || x.posterUid === uid || x.clientUid === uid || x.employerUid === uid); }).length;
    } catch (e) { return 0; }
  }
  window.ssWalletGrant = async function (uid) {
    if (!admin()) return;
    var inp = $('wl-amt-' + uid), amt = Math.floor(Number(inp && inp.value));
    if (!(amt > 0)) return say('Enter an amount greater than 0.', true);
    if (amt > MAX_GRANT) return say('Maximum single grant is T₦' + MAX_GRANT.toLocaleString() + '.', true);
    var u = USERS.filter(function (x) { return x.id === uid; })[0]; if (!u) return;
    if (u.walletMode !== 'test' && (u.wallet && ((u.wallet.balance || 0) > 0 || (u.wallet.pending || 0) > 0))) {
      if (!confirm('This member already has a balance in a live wallet. Granting test credits puts them in test mode. Reset them first. Continue anyway?')) return;
    }
    if (!confirm('Give T₦' + amt.toLocaleString() + ' test credits to ' + u.name + '?')) return;
    var w = Object.assign(blank(), u.wallet || {}); w.transactions = (w.transactions || []).slice();
    w.balance = (w.balance || 0) + amt;
    w.transactions.unshift({ id: 'tg_' + Date.now(), type: 'in', amount: amt, from: 'SkillStamp Admin', desc: 'Test credit', ts: Date.now() });
    try {
      await F().updateDoc(F().doc(DB(), 'users', uid), { wallet: w, walletMode: 'test' });
      logA('test_credit_grant', u, 'T₦' + amt);
      say('Granted T₦' + amt.toLocaleString() + ' to ' + u.name + '.');
      await render();
    } catch (e) { console.warn(e); say('Could not grant credits: ' + (e && e.message || 'try again'), true); }
  };
  async function resetOne(u, by) {
    try { await F().setDoc(F().doc(DB(), 'wallet_archive', u.id + '_' + Date.now()), { uid: u.id, name: u.name || '', mode: u.walletMode || 'live', wallet: u.wallet || blank(), resetAt: Date.now(), by: by }); } catch (e) { throw new Error('archive failed'); }
    await F().updateDoc(F().doc(DB(), 'users', u.id), { wallet: blank(), walletMode: 'live' });
  }
  window.ssWalletReset = async function (uid) {
    if (!admin()) return;
    var u = USERS.filter(function (x) { return x.id === uid; })[0]; if (!u) return;
    var n = activeEscrow(uid);
    if (!confirm('Reset ' + u.name + "'s wallet to zero and switch them to the live ₦ wallet? Their history will be cleared for them (a copy is archived for you)." + (n ? '\n\nWarning: they have ' + n + ' active gig(s) with money in escrow.' : ''))) return;
    try { await resetOne(u, window.ME.uid); logA('wallet_reset', u, 'single'); say(u.name + ' reset to a live wallet.'); await render(); }
    catch (e) { console.warn(e); say('Reset failed: ' + (e && e.message || 'try again'), true); }
  };
  window.ssWalletResetAll = async function (everyone) {
    if (!admin()) return;
    var list = USERS.filter(function (u) { return everyone ? (u.wallet && ((u.wallet.balance || 0) || (u.wallet.pending || 0) || (u.wallet.earned || 0) || (u.wallet.transactions || []).length)) || u.walletMode === 'test' : u.walletMode === 'test'; });
    if (!list.length) return say('Nothing to reset.');
    var word = everyone ? 'WIPE' : 'RESET';
    var t = prompt('This will reset ' + list.length + ' wallet(s) to zero' + (everyone ? ' (EVERY member, test or not)' : ' (test-mode members only)') + ' and switch them to the live ₦ wallet. Copies are archived.\n\nType ' + word + ' to confirm.');
    if (t !== word) return;
    var ok = 0, bad = 0;
    for (var i = 0; i < list.length; i++) { try { await resetOne(list[i], window.ME.uid); ok++; } catch (e) { bad++; } }
    logA('wallet_reset_bulk', { uid: window.ME.uid, name: window.ME.name }, ok + ' ok, ' + bad + ' failed');
    say('Reset ' + ok + ' wallet(s)' + (bad ? ', ' + bad + ' failed' : '') + '.', bad > 0);
    await render();
  };
  var query = '';
  window.ssWalletSearch = function (v) { query = String(v || '').toLowerCase(); draw(); };
  function draw() {
    var el = $('admtab-wallets'); if (!el) return;
    var testN = USERS.filter(isTest).length;
    var list = USERS.filter(function (u) { return !query || String(u.name || '').toLowerCase().indexOf(query) >= 0 || String(u.skillId || '').toLowerCase().indexOf(query) >= 0; })
      .sort(function (a, b) { return (isTest(b) ? 1 : 0) - (isTest(a) ? 1 : 0) || String(a.name).localeCompare(String(b.name)); }).slice(0, 60);
    var h = '<style>#admtab-wallets .wl-b{width:auto!important;display:inline-block!important;flex:none;padding:9px 14px!important;border-radius:10px;font-size:12px}#admtab-wallets .wl-i{width:120px!important;flex:none;box-sizing:border-box;padding:9px 10px}</style><div style="padding:4px 0 14px;"><div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:800;font-size:15px;">Wallets</div>'
      + '<div style="font-size:12px;color:var(--td);margin-top:4px;line-height:1.5;">Members on test credits (T₦) cannot withdraw. Resetting clears their wallet and switches them to the real ₦ wallet. ' + testN + ' member(s) in test mode.</div></div>'
      + '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;">'
      + '<input class="fi" placeholder="Search name or SkillID" oninput="ssWalletSearch(this.value)" value="' + esc(query) + '" style="flex:1;min-width:180px;">'
      + '<button class="btn wl-b" onclick="ssWalletResetAll(false)">Reset all test wallets</button>'
      + '<button class="btn wl-b" onclick="ssWalletResetAll(true)" style="background:#b42318;">Wipe every wallet</button></div>';
    h += list.map(function (u) {
      var t = isTest(u), w = u.wallet || {};
      return '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:10px 12px;border:1px solid var(--br);border-radius:12px;margin-bottom:8px;background:var(--s);">'
        + '<div style="flex:1;min-width:150px;"><div style="font-weight:700;font-size:13px;">' + esc(u.name) + ' <span style="font-size:10px;color:var(--td);">' + esc(u.role || '') + '</span></div>'
        + '<div style="font-size:11px;color:' + (t ? '#b45309' : 'var(--td)') + ';">' + (t ? 'Test mode' : 'Live') + ' · ' + fmt(u, w.balance) + '</div></div>'
        + '<input id="wl-amt-' + u.id + '" type="number" min="1" placeholder="T₦ amount" class="fi wl-i">'
        + '<button class="btn wl-b" onclick="ssWalletGrant(\'' + u.id + '\')">Grant</button>'
        + '<button class="btn wl-b" onclick="ssWalletReset(\'' + u.id + '\')" style="background:var(--s2);color:var(--tx);border:1px solid var(--br);">Reset</button></div>';
    }).join('') || '<div style="padding:20px;text-align:center;color:var(--td);font-size:12px;">No members found.</div>';
    el.innerHTML = h;
  }
  async function render() { try { await loadUsers(); } catch (e) { console.warn(e); } draw(); }

  function addTab() {
    var tabs = $('adm-tabs'), root = $('admin-root'); if (!tabs || !root || $('admt-wallets')) return;
    var b = document.createElement('button'); b.id = 'admt-wallets'; b.textContent = '₦ Wallets';
    b.setAttribute('onclick', "adminTab('wallets')");
    b.style.cssText = 'padding:7px 13px;font-size:11px;font-family:Plus Jakarta Sans,sans-serif;font-weight:700;border-radius:6px;border:1px solid var(--br);background:var(--s);color:var(--td);cursor:pointer;';
    tabs.appendChild(b);
    var p = document.createElement('div'); p.id = 'admtab-wallets'; p.style.display = 'none'; root.appendChild(p);
  }
  var rA = window.renderAdminV6;
  if (typeof rA === 'function') {
    window.renderAdminV6 = function () { var r = rA.apply(this, arguments); try { if (admin()) addTab(); } catch (e) {} return r; };
  }
  var tA = window.adminTab;
  if (typeof tA === 'function') {
    window.adminTab = function (name) {
      var r = tA.apply(this, arguments);
      try {
        var p = $('admtab-wallets'), b = $('admt-wallets');
        if (p) p.style.display = name === 'wallets' ? 'block' : 'none';
        if (b) { var on = name === 'wallets'; b.style.background = on ? 'var(--acc)' : 'var(--s)'; b.style.color = on ? '#fff' : 'var(--td)'; b.style.borderColor = on ? 'var(--acc)' : 'var(--br)'; }
        if (name === 'wallets') render();
      } catch (e) {}
      return r;
    };
  }
})();
