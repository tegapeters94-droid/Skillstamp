/* SkillStamp - email verification (6-digit code) + phone number at sign-up.
   Wraps existing functions only; removing this file restores the previous behaviour.
   New email/password accounts must verify before posting gigs, applying, hiring or messaging.
   Accounts created before CUTOFF, and Google sign-ins, are exempt. */
(function () {
  'use strict';
  var API = window.SS_API || 'https://skillstamp-email.tegapeters94.workers.dev';
  var CUTOFF = 1794399028000;
  var sentAt = 0;

  function fbUser() { try { return window.FB_AUTH && window.FB_AUTH.currentUser; } catch (e) { return null; } }
  function required() {
    var u = fbUser();
    if (!u || u.emailVerified) return false;
    if (typeof ME === 'undefined' || !ME || ME.uid !== u.uid) return false;
    if (!(ME.created >= CUTOFF)) return false;
    var pd = u.providerData || [];
    for (var i = 0; i < pd.length; i++) if (pd[i] && pd[i].providerId === 'google.com') return false;
    return true;
  }
  window.ssNeedsVerify = required;

  async function call(path, body) {
    var u = fbUser();
    if (!u) throw new Error('signed-out');
    var tok = await u.getIdToken();
    var r = await fetch(API + path, {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + tok, 'Content-Type': 'application/json' },
      body: JSON.stringify(body || {})
    });
    var j = {};
    try { j = await r.json(); } catch (e) {}
    j._status = r.status;
    return j;
  }

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  /* ---------- modal ---------- */
  function closeV() { var m = document.getElementById('vf-modal'); if (m) m.remove(); }
  function setMsg(t, ok) {
    var el = document.getElementById('vf-msg'); if (!el) return;
    el.textContent = t || ''; el.className = 'vf-msg' + (ok ? ' ok' : '');
    el.style.display = t ? 'block' : 'none';
  }
  async function sendCode(quiet) {
    if (Date.now() - sentAt < 55000) { if (!quiet) setMsg('Code already sent. Check your inbox and spam, or wait a minute to resend.', true); return; }
    var btn = document.getElementById('vf-resend');
    if (btn) btn.disabled = true;
    try {
      var j = await call('/verify/send');
      if (j.ok) { sentAt = Date.now(); if (j.already) { done(); return; } if (!quiet) setMsg('A new code is on its way.', true); }
      else if (j.error === 'wait') { sentAt = Date.now() - 60000 + (j.retry || 30) * 1000; if (!quiet) setMsg('Please wait ' + (j.retry || 30) + 's before requesting another code.'); }
      else if (j.error === 'rate-limited') { if (!quiet) setMsg('Too many codes requested today. Please try again tomorrow.'); }
      else if (!quiet) setMsg('We could not send the code. Please try again shortly.');
    } catch (e) { if (!quiet) setMsg('Network problem. Please try again.'); }
    if (btn) { setTimeout(function () { btn.disabled = false; }, 15000); }
  }
  async function done() {
    try { var u = fbUser(); if (u) { await u.reload(); await u.getIdToken(true); } } catch (e) {}
    closeV(); hideBanner();
    if (typeof toast === 'function') toast('Email verified. You are all set.');
  }
  async function check() {
    var inp = document.getElementById('vf-code'); if (!inp) return;
    var code = inp.value.replace(/\D/g, '');
    if (code.length !== 6) { setMsg('Enter the 6-digit code from your email.'); return; }
    var b = document.getElementById('vf-go'); b.disabled = true; b.textContent = 'Checking...';
    try {
      var j = await call('/verify/check', { code: code });
      if (j.ok) { await done(); return; }
      var m = { wrong: 'That code is not right.' + (typeof j.left === 'number' ? ' ' + j.left + ' tries left.' : ''), expired: 'That code has expired. Tap resend for a new one.', 'too-many': 'Too many wrong tries. Request a new code.', 'bad-code': 'Enter the 6-digit code from your email.' };
      setMsg(m[j.error] || 'Could not verify right now. Please try again.');
    } catch (e) { setMsg('Network problem. Please try again.'); }
    b.disabled = false; b.textContent = 'Verify email';
  }
  function openVerify(reason) {
    var u = fbUser(); if (!u) return;
    closeV();
    var m = document.createElement('div');
    m.id = 'vf-modal'; m.className = 'vf-overlay';
    m.innerHTML =
      '<div class="vf-card" role="dialog" aria-modal="true" aria-labelledby="vf-h">' +
      '<button class="vf-x" id="vf-x" aria-label="Close">&times;</button>' +
      '<img class="vf-logo" src="logo-green.png" alt="">' +
      '<h3 id="vf-h">Confirm your email</h3>' +
      '<p class="vf-p">' + (reason ? esc(reason) + ' ' : '') + 'We sent a 6-digit code to <b>' + esc(u.email || 'your email') + '</b>. Enter it below.</p>' +
      '<input id="vf-code" class="vf-input" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="000000">' +
      '<div class="vf-msg" id="vf-msg" style="display:none"></div>' +
      '<button class="vf-btn" id="vf-go">Verify email</button>' +
      '<button class="vf-link" id="vf-resend">Resend code</button>' +
      '<div class="vf-note">Check your spam folder if you do not see it. The code expires in 15 minutes.</div>' +
      '</div>';
    document.body.appendChild(m);
    document.getElementById('vf-x').onclick = closeV;
    m.addEventListener('click', function (e) { if (e.target === m) closeV(); });
    document.getElementById('vf-go').onclick = check;
    document.getElementById('vf-resend').onclick = function () { sendCode(false); };
    document.getElementById('vf-code').onkeydown = function (e) { if (e.key === 'Enter') check(); };
    setTimeout(function () { var c = document.getElementById('vf-code'); if (c) c.focus(); }, 50);
    sendCode(true);
  }
  window.openEmailVerify = openVerify;

  /* ---------- banner ---------- */
  function hideBanner() { var b = document.getElementById('vf-banner'); if (b) b.remove(); document.body.classList.remove('vf-on'); }
  function tick() {
    var need = required();
    var b = document.getElementById('vf-banner');
    if (need && !b) {
      b = document.createElement('div'); b.id = 'vf-banner'; b.className = 'vf-banner';
      b.innerHTML = '<span>Verify your email to post gigs, apply, hire and message.</span><button id="vf-b1">Verify now</button>';
      document.body.appendChild(b); document.body.classList.add('vf-on');
      document.getElementById('vf-b1').onclick = function () { openVerify(''); };
    } else if (!need && b) hideBanner();
  }
  setInterval(tick, 2500);

  /* ---------- gating ---------- */
  var REASONS = {
    submitGig: 'Verify your email to post a gig.',
    applyGig: 'Verify your email to apply for gigs.',
    confirmHire: 'Verify your email to hire.',
    openMsg: 'Verify your email to send messages.',
    sendDirectProposalToHub: 'Verify your email to send proposals.',
    openDirectProposal: 'Verify your email to send proposals.'
  };
  function gate(name) {
    var orig = window[name];
    if (typeof orig !== 'function' || orig.__vfGated) return;
    var w = function () {
      if (required()) { openVerify(REASONS[name]); return; }
      return orig.apply(this, arguments);
    };
    w.__vfGated = true;
    window[name] = w;
  }
  Object.keys(REASONS).forEach(gate);

  /* ---------- sign-up: validate phone, store it privately, start verification ---------- */
  function cleanPhone(v) { return String(v || '').replace(/[\s().-]/g, ''); }
  window.ssPhoneOk = function (v) { return /^\+?[0-9]{7,15}$/.test(cleanPhone(v)); };
  var origSignup = window.doSignup;
  if (typeof origSignup === 'function') {
    window.doSignup = async function () {
      var ph = document.getElementById('ri-ph');
      var raw = ph ? ph.value : '';
      if (ph && !window.ssPhoneOk(raw)) {
        var er = document.getElementById('ri-err');
        if (er) { er.textContent = 'Please enter a valid mobile number, e.g. +234 801 234 5678.'; er.style.display = 'block'; setTimeout(function () { er.style.display = 'none'; }, 4000); }
        return;
      }
      var res = await origSignup.apply(this, arguments);
      try {
        var u = fbUser();
        if (u && typeof ME !== 'undefined' && ME && ME.uid === u.uid && ME._isNew) {
          if (ph) {
            var F = window.FB_FNS;
            try { await F.setDoc(F.doc(window.FB_DB, 'users_private', u.uid), { uid: u.uid, email: (u.email || '').toLowerCase(), phone: cleanPhone(raw) }, { merge: true }); }
            catch (e) { console.warn('phone save failed', e); }
          }
          sendCode(true);
          setTimeout(tick, 400);
        }
      } catch (e) {}
      return res;
    };
  }
})();
