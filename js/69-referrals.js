/* SkillStamp - referrals (member side).
   - Every member gets a code and a share link (skillstamp.cv/?ref=CODE). The link is remembered in the browser and claimed
     after the new member signs up (within the allowed number of days).
   - A "Refer & Earn" card on the wallet screen opens a window with the code, the rules, and who joined and how far they are.
   - Bonuses are paid by the Worker only, after it checks the requirements itself. Nothing here can pay anyone.
   Removing this file removes the feature; it changes no existing function except by wrapping _doRenderWallet. */
(function () {
  'use strict';
  var API = window.SS_API || 'https://skillstamp-email.tegapeters94.workers.dev';
  function $(id) { return document.getElementById(id); }
  function me() { return window.ME; }
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function ngn(n) { return '₦' + (Number(n) || 0).toLocaleString('en-US'); }
  function say(m, bad) { try { if (window.toast) window.toast(m, bad ? 'bad' : undefined); } catch (e) {} }
  function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} return null; }
  async function call(path, body) {
    var u = window.FB_AUTH && window.FB_AUTH.currentUser; if (!u) throw new Error('signed-out');
    var tok = await u.getIdToken();
    var r = await fetch(API + path, { method: 'POST', headers: { 'Authorization': 'Bearer ' + tok, 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}) });
    var j = {}; try { j = await r.json(); } catch (e) {} j._status = r.status; return j;
  }

  /* 1. remember a code from the link */
  try {
    var m = /[?&]ref=([A-Za-z0-9]{6,12})/.exec(location.search || '');
    if (m) ls('ss_ref', m[1].toUpperCase());
  } catch (e) {}

  /* 2. once signed in: claim a remembered code, and let the server re-check this member's own referral */
  var DONE = {};
  var FINAL = ['bad-code', 'unknown-code', 'own-code', 'too-late', 'not-eligible', 'no-user'];
  async function afterLogin() {
    var u = me(); if (!u || !u.uid || DONE[u.uid] || !(window.FB_AUTH && window.FB_AUTH.currentUser)) return;
    DONE[u.uid] = 1;
    try {
      var code = ls('ss_ref');
      if (code) {
        var r = await call('/referral/claim', { code: code });
        if (r.ok || FINAL.indexOf(r.error) >= 0) ls('ss_ref', null);
        if (!r.ok && r.error === 'unknown-code') say('That referral code does not exist, so it was not applied.', true);
        else if (!r.ok && r.error === 'too-late') say('Referral codes can only be added in the first ' + (r.days || 7) + ' days.', true);
        else if (r._status >= 500 || !r._status) DONE[u.uid] = 0;
        if (r.ok && r.claimed) say('Referral code applied.');
      } else {
        await call('/referral/check', {});
      }
    } catch (e) { DONE[u.uid] = 0; }
  }
  setInterval(function () {
    try { afterLogin(); } catch (e) {}
    try { var i = $('ri-ref'), c = ls('ss_ref'); if (i && c && !i.value && document.activeElement !== i) i.value = c; } catch (e) {}
  }, 1500);

  /* 3. the Refer & Earn window */
  var CSS = '<style>.rf-b{padding:9px 14px;font-size:12px;font-weight:700;border-radius:9px;border:1px solid var(--br);background:var(--s);color:var(--tx);cursor:pointer;font-family:inherit}.rf-b.p{background:var(--acc);color:#fff;border-color:var(--acc)}.rf-t{display:inline-block;padding:2px 8px;border-radius:10px;font-size:10px;font-weight:800}</style>';
  function ago(ts) { try { return typeof window.timeAgo === 'function' ? window.timeAgo(ts) : ''; } catch (e) { return ''; } }
  function ticks(r) {
    var p = r.progress || {};
    var items = r.role === 'freelancer' ? [['Signed up', true], ['Verified', p.verified]] : [['Signed up', true], ['Profile complete', p.profile], ['Funded gig posted', p.posted], ['Hired someone', p.hired]];
    return items.map(function (x) { return (x[1] ? '✅ ' : '⬜ ') + x[0]; }).join(' &nbsp; ');
  }
  async function open() {
    var u = me(); if (!u) return;
    if (typeof window.setModal !== 'function') return;
    window.setModal(CSS + '<div style="padding:22px 18px;font-size:12px;color:var(--td);">Loading...</div>');
    var d;
    try { d = await call('/referral/me', {}); } catch (e) { d = { ok: false }; }
    if (!d.ok) { window.setModal(CSS + '<div style="padding:22px 18px;"><div style="font-weight:800;font-size:15px;margin-bottom:8px;">Refer &amp; Earn</div><div style="font-size:12px;color:var(--td);line-height:1.6;">Could not load this right now. Please try again in a moment.</div><button class="rf-b" style="margin-top:14px;" onclick="closeModal()">Close</button></div>'); return; }
    var link = location.origin + '/?ref=' + d.code, s = d.settings || {};
    var pend = d.referrals.filter(function (r) { return r.status === 'pending'; }).length;
    var canEnter = !d.referredBy && (Date.now() - (Number(u.created) || 0)) <= (s.windowDays || 7) * 86400000;
    var rows = d.referrals.length ? d.referrals.map(function (r) {
      var st = r.status === 'paid' ? '<span class="rf-t" style="background:rgba(74,222,128,.15);color:#15803d;">Paid ' + ngn(r.bonus) + '</span>' : r.status === 'void' ? '<span class="rf-t" style="background:rgba(148,163,184,.2);color:#475569;">Cancelled</span>' : '<span class="rf-t" style="background:rgba(255,167,38,.18);color:#9a5b00;">In progress</span>';
      return '<div style="border:1px solid var(--br);border-radius:10px;padding:10px;margin-bottom:8px;"><div style="display:flex;justify-content:space-between;gap:8px;align-items:center;"><div style="font-weight:700;font-size:12px;">' + esc(r.name) + ' <span style="font-weight:500;color:var(--td);">· ' + (r.role === 'freelancer' ? 'Freelancer' : 'Client') + ' · ' + esc(ago(r.created)) + '</span></div>' + st + '</div>'
        + (r.status === 'pending' ? '<div style="font-size:11px;color:var(--td);margin-top:6px;line-height:1.7;">' + ticks(r) + '</div>' : '') + '</div>';
    }).join('') : '<div style="font-size:12px;color:var(--td);margin-bottom:8px;">Nobody has joined with your code yet.</div>';
    window.setModal(CSS + '<div style="padding:20px 16px;max-height:80vh;overflow:auto;">'
      + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;"><div style="font-weight:800;font-size:16px;">🎁 Refer &amp; Earn</div><button class="rf-b" onclick="closeModal()">Close</button></div>'
      + (s.enabled === false ? '<div style="background:rgba(255,167,38,.12);border-radius:10px;padding:10px;font-size:12px;margin-bottom:10px;">Referral bonuses are paused right now. Invites you already made will be paid when it is switched back on.</div>' : '')
      + '<div style="font-size:12px;color:var(--td);line-height:1.65;margin-bottom:12px;">Invite people to SkillStamp. You earn money in your wallet when they do the following:<br>'
      + '• <b>Freelancer</b>: signs up and gets their skill verified: <b>' + ngn(s.freelancerBonus) + '</b><br>'
      + '• <b>Client</b>: completes their profile, posts a funded gig of at least ' + ngn(s.minGig) + ' and hires a freelancer: <b>' + ngn(s.clientBonus) + '</b></div>'
      + '<div style="border:1px dashed var(--acc);border-radius:12px;padding:12px;text-align:center;margin-bottom:10px;"><div style="font-size:10px;color:var(--td);letter-spacing:.08em;">YOUR CODE</div><div style="font-weight:900;font-size:24px;letter-spacing:.12em;margin:4px 0;">' + esc(d.code) + '</div><div style="font-size:11px;color:var(--td);word-break:break-all;">' + esc(link) + '</div></div>'
      + '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px;"><button class="rf-b p" onclick="ssRefCopy(\'' + esc(link) + '\')">Copy link</button><button class="rf-b" onclick="ssRefShare(\'' + esc(link) + '\')">Share</button></div>'
      + '<div style="display:flex;gap:8px;margin-bottom:14px;"><div style="flex:1;border:1px solid var(--br);border-radius:10px;padding:10px;text-align:center;"><div style="font-weight:800;font-size:18px;">' + d.referrals.length + '</div><div style="font-size:10px;color:var(--td);">Invited</div></div><div style="flex:1;border:1px solid var(--br);border-radius:10px;padding:10px;text-align:center;"><div style="font-weight:800;font-size:18px;">' + pend + '</div><div style="font-size:10px;color:var(--td);">In progress</div></div><div style="flex:1;border:1px solid var(--br);border-radius:10px;padding:10px;text-align:center;"><div style="font-weight:800;font-size:18px;">' + ngn(d.earned) + '</div><div style="font-size:10px;color:var(--td);">Earned</div></div></div>'
      + '<div style="font-weight:700;font-size:13px;margin-bottom:6px;">People you invited</div>' + rows
      + (canEnter ? '<div style="margin-top:14px;border-top:1px solid var(--br);padding-top:12px;"><div style="font-weight:700;font-size:12px;margin-bottom:6px;">Did someone invite you?</div><div style="display:flex;gap:8px;"><input id="rf-code" maxlength="8" placeholder="Enter their code" style="flex:1;padding:9px;border:1px solid var(--br);border-radius:9px;background:var(--s);color:var(--tx);text-transform:uppercase;"><button class="rf-b p" onclick="ssRefEnter()">Apply</button></div></div>' : '')
      + '</div>');
    if (d.wallet && me() && me().walletMode !== 'test') { try { me().wallet = d.wallet; if (typeof window._doRenderWallet === 'function' && $('tx-list')) window._doRenderWallet(); } catch (e) {} }
  }
  window.openReferral = open;
  window.ssRefCopy = function (t) { try { navigator.clipboard.writeText(t).then(function () { say('Link copied.'); }, function () { say('Copy failed.', true); }); } catch (e) { say('Copy failed.', true); } };
  window.ssRefShare = function (t) {
    var txt = 'Join me on SkillStamp, where African talent gets verified and hired: ' + t;
    try { if (navigator.share) { navigator.share({ title: 'SkillStamp', text: txt, url: t }); return; } } catch (e) {}
    window.ssRefCopy(txt);
  };
  window.ssRefEnter = async function () {
    var el = $('rf-code'), code = el ? el.value.trim().toUpperCase() : '';
    if (!code) { say('Enter a code first.', true); return; }
    var r; try { r = await call('/referral/claim', { code: code }); } catch (e) { r = {}; }
    if (r.ok) { say(r.already ? 'You already used a code.' : 'Code applied.'); open(); return; }
    var msg = { 'unknown-code': 'That code does not exist.', 'own-code': 'You cannot use your own code.', 'too-late': 'Codes can only be added in the first ' + (r.days || 7) + ' days after signing up.', 'bad-code': 'That is not a valid code.', 'not-eligible': 'This code cannot be used on your account.' }[r.error] || 'Could not apply the code. Try again.';
    say(msg, true);
  };

  /* 4. the card on the wallet screen */
  function cardEl(id) {
    var c = document.createElement('div'); c.id = id;
    c.style.cssText = 'margin:12px 0;border:1px solid var(--br);border-radius:14px;background:var(--s);padding:14px;display:flex;align-items:center;gap:12px;cursor:pointer;';
    c.setAttribute('onclick', 'openReferral()');
    c.innerHTML = '<div style="font-size:26px;">🎁</div><div style="flex:1;min-width:0;"><div style="font-weight:800;font-size:13px;">Refer &amp; Earn</div><div style="font-size:11px;color:var(--td);margin-top:2px;">Get your code and link. Earn money in your wallet for every friend who joins.</div></div><div style="font-size:18px;color:var(--td);">&rsaquo;</div>';
    return c;
  }
  function paintCard() {
    try {
      if (!me() || $('rf-card')) return;
      var host = document.querySelector('#page-wallet .section') || ($('tx-list') && $('tx-list').parentElement);
      if (!host) return;
      var c = cardEl('rf-card'), first = host.children[1] || null;
      host.insertBefore(c, first);
    } catch (e) {}
  }
  var orig = window._doRenderWallet;
  if (typeof orig === 'function') window._doRenderWallet = function () {
    var r = orig.apply(this, arguments);
    try { setTimeout(paintCard, 120); } catch (e) {}
    return r;
  };

  /* 5. a "Refer & Earn" row in Settings */
  var oS = window.openSettings;
  if (typeof oS === 'function') window.openSettings = function () {
    var r = oS.apply(this, arguments);
    try {
      var panel = $('settings-panel'); if (!panel || $('rf-set')) return r;
      var sec = document.createElement('div'); sec.id = 'rf-set'; sec.style.cssText = 'margin:0 16px 8px;';
      sec.innerHTML = '<div style="font-size:10px;font-weight:700;color:var(--td);text-transform:uppercase;letter-spacing:.08em;padding:0 4px;margin-bottom:6px;">Refer &amp; Earn</div>'
        + '<div onclick="openReferral()" style="display:flex;align-items:center;gap:13px;padding:14px 16px;cursor:pointer;background:var(--s);border:1px solid var(--br);border-radius:14px;"><div style="width:34px;height:34px;border-radius:10px;background:rgba(232,197,71,.12);display:flex;align-items:center;justify-content:center;font-size:18px;">🎁</div><div style="flex:1;min-width:0;"><div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:600;font-size:13px;">Your referral code and link</div><div style="font-size:10px;color:var(--td);margin-top:1px;">Invite friends and earn money in your wallet</div></div><div style="color:var(--td);font-size:18px;">&rsaquo;</div></div>';
      var kids = panel.children, target = null;
      for (var i = 0; i < kids.length; i++) { var h = kids[i].firstElementChild; if (h && /^support$/i.test((h.textContent || '').trim())) { target = kids[i]; break; } }
      if (target) panel.insertBefore(sec, target); else panel.appendChild(sec);
    } catch (e) {}
    return r;
  };
})();
