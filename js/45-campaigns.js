/* SkillStamp - promotional / campaign emails
   1. Members opt in (sign-up checkbox, Settings switch, one-time prompt). Stored on their own
      profile as promoOptIn. Nobody is emailed without saying yes.
   2. Admin "Campaigns" tab: write, send a test to yourself, send to everyone who opted in.
   3. Sending happens in the email Worker in small batches; every email has an unsubscribe link.
   Wraps existing functions (openSettings, adminTab); does not change login or sign-up code. */
(function () {
  'use strict';
  var API = window.SS_API || 'https://skillstamp-email.tegapeters94.workers.dev';

  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function say(m, bad) { try { if (window.toast) window.toast(m, bad ? 'bad' : 'ok'); } catch (e) {} }
  function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} return null; }
  function me() { return window.ME && window.ME.uid ? window.ME : null; }
  function tokenP() { var u = window.FB_AUTH && window.FB_AUTH.currentUser; return u && u.getIdToken ? u.getIdToken() : Promise.reject(new Error('not signed in')); }
  function api(path, method, body) {
    return tokenP().then(function (t) {
      return fetch(API + path, { method: method || 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + t }, body: body ? JSON.stringify(body) : undefined })
        .then(function (r) { return r.json().catch(function () { return { ok: false, error: 'bad response' }; }); });
    });
  }
  function ownUpdate(fields) { var F = window.FB_FNS; return F.updateDoc(F.doc(window.FB_DB, 'users', me().uid), fields); }

  /* ───────── consent ───────── */
  function saveConsent(on) {
    var m = me(); if (!m) return Promise.reject(new Error('no user'));
    var prev = { a: m.promoOptIn, b: m.promoPrompted, c: m.promoOptInAt };
    m.promoOptIn = !!on; m.promoPrompted = true; m.promoOptInAt = Date.now();
    return ownUpdate({ promoOptIn: !!on, promoPrompted: true, promoOptInAt: m.promoOptInAt }).then(function () {
      api(on ? '/promo/optin' : '/promo/optout', 'POST', {}).catch(function () {});
    }).catch(function (e) { m.promoOptIn = prev.a; m.promoPrompted = prev.b; m.promoOptInAt = prev.c; throw e; });
  }

  /* sign-up checkbox: remember the choice, apply it to the brand-new account on first login */
  (function signupCheckbox() {
    setInterval(function () {
      try {
        var cb = $('ss-promo-cb');
        if (cb && !cb.__ss) {
          cb.__ss = 1;
          ls('ss_promo_pending', cb.checked ? '1' : '0');
          cb.addEventListener('change', function () { ls('ss_promo_pending', cb.checked ? '1' : '0'); });
        }
        var m = me(), u = window.FB_AUTH && window.FB_AUTH.currentUser, p = ls('ss_promo_pending');
        if (!m || !u || u.uid !== m.uid || p === null) return;
        ls('ss_promo_pending', null);
        var created = Number(m.created) || 0;
        if (created && Date.now() - created < 15 * 60 * 1000 && m.promoPrompted !== true) saveConsent(p === '1').catch(function () {});
      } catch (e) {}
    }, 1500);
  })();

  /* one-time prompt for members who were never asked */
  (function oncePrompt() {
    var shown = false;
    function ready() {
      var m = me(); if (!m || shown) return false;
      if (m.promoPrompted === true || m.promoOptIn === true || m.promoOptIn === false) return false;
      if (ls('ss_promo_snooze_' + m.uid) && Date.now() < Number(ls('ss_promo_snooze_' + m.uid))) return false;
      if (ls('ss_promo_pending') !== null) return false;                       // brand-new account still being set up
      var created = Number(m.created) || 0;
      if (created && Date.now() - created < 20 * 60 * 1000) return false;      // let new members settle in first
      if ($('settings-panel') || document.querySelector('.modal-bg.open,.modal-overlay.open')) return false;
      return true;
    }
    function hide() { var b = $('ss-promo-ask'); if (b) b.remove(); }
    function show() {
      shown = true;
      var d = document.createElement('div');
      d.id = 'ss-promo-ask';
      d.setAttribute('role', 'dialog');
      d.style.cssText = 'position:fixed;left:50%;transform:translateX(-50%);bottom:84px;z-index:1900;width:min(440px,calc(100% - 28px));background:var(--s,#fff);border:1px solid var(--br,#dde2d6);border-radius:16px;box-shadow:0 10px 36px rgba(0,0,0,.25);padding:16px 16px 14px;font-family:Plus Jakarta Sans,sans-serif;';
      d.innerHTML = '<div style="display:flex;gap:10px;align-items:flex-start;"><div style="font-size:22px;line-height:1;">✉️</div><div style="flex:1;min-width:0;">'
        + '<div style="font-weight:800;font-size:14px;color:var(--tx,#0d1109);">Want news and offers by email?</div>'
        + '<div style="font-size:12px;line-height:1.55;color:var(--td,#6b7a70);margin-top:3px;">Occasional updates about new features, tips and special offers. Unsubscribe any time. Emails about your own gigs and payments are separate.</div></div>'
        + '<button id="ss-pa-x" aria-label="Close" style="background:none;border:none;color:var(--td,#6b7a70);font-size:18px;cursor:pointer;line-height:1;padding:0 2px;">×</button></div>'
        + '<div style="display:flex;gap:8px;margin-top:12px;"><button id="ss-pa-yes" style="flex:1;background:#1a6b3c;color:#fff;border:none;border-radius:10px;padding:10px;font-weight:700;font-size:13px;cursor:pointer;">Yes, keep me posted</button>'
        + '<button id="ss-pa-no" style="flex:1;background:transparent;color:var(--tx,#0d1109);border:1px solid var(--br,#dde2d6);border-radius:10px;padding:10px;font-weight:700;font-size:13px;cursor:pointer;">No thanks</button></div>';
      document.body.appendChild(d);
      $('ss-pa-yes').onclick = function () { saveConsent(true).then(function () { say('Thanks! You are on the list.'); }).catch(function () { say("Couldn't save that. Try again from Settings.", true); }); hide(); };
      $('ss-pa-no').onclick = function () { saveConsent(false).catch(function () {}); hide(); };
      $('ss-pa-x').onclick = function () { ls('ss_promo_snooze_' + me().uid, String(Date.now() + 7 * 864e5)); hide(); };
    }
    var waited = 0, iv = setInterval(function () {
      waited++;
      if (waited > 400) return clearInterval(iv);
      try {
        if (!ready()) return;
        clearInterval(iv);
        setTimeout(function () { try { if (ready()) show(); } catch (e) {} }, 6000);
      } catch (e) {}
    }, 4000);
  })();

  /* ───────── Settings switch ───────── */
  (function settingsSwitch() {
    function inject() {
      try {
        var panel = $('settings-panel'), m = me();
        if (!panel || !m || panel.querySelector('#ss-promo-pref')) return;
        var anchor = panel.querySelector('#ss-email-pref'), body = panel.querySelector('.ss-body');
        if (!anchor && !body) return;
        var on = m.promoOptIn === true;
        var card = document.createElement('div');
        card.id = 'ss-promo-pref';
        card.style.cssText = 'margin:0 16px 12px;';
        card.innerHTML = '<div style="background:var(--s);border:1px solid var(--br);border-radius:14px;padding:14px 16px;display:flex;align-items:center;gap:14px;">'
          + '<div style="flex:1;min-width:0;"><div style="font-weight:700;font-size:14px;color:var(--tx);">News &amp; offers</div>'
          + '<div style="font-size:12px;color:var(--td);margin-top:2px;line-height:1.45;">Occasional emails about new features, tips and special offers. You can unsubscribe at any time.</div></div>'
          + '<button id="ss-promo-sw" type="button" role="switch" aria-checked="' + on + '" style="flex-shrink:0;width:46px;height:28px;border-radius:14px;border:none;cursor:pointer;position:relative;transition:background .2s;background:' + (on ? '#1a6b3c' : '#9aa59d') + ';">'
          + '<span style="position:absolute;top:3px;left:' + (on ? '21px' : '3px') + ';width:22px;height:22px;border-radius:50%;background:#fff;transition:left .2s;box-shadow:0 1px 3px rgba(0,0,0,.3);"></span></button></div>';
        if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(card, anchor.nextSibling);
        else { var first = body.children[1] || body.children[0]; if (first && first.nextSibling) body.insertBefore(card, first.nextSibling); else body.appendChild(card); }
        var sw = card.querySelector('#ss-promo-sw');
        function paint(v) { sw.setAttribute('aria-checked', String(v)); sw.style.background = v ? '#1a6b3c' : '#9aa59d'; sw.firstChild.style.left = v ? '21px' : '3px'; }
        sw.onclick = function () {
          var next = !(me().promoOptIn === true), before = me().promoOptIn === true;
          paint(next);
          saveConsent(next).then(function () { say(next ? 'You will get news and offers.' : 'Unsubscribed from news and offers.'); })
            .catch(function () { paint(before); say("Couldn't save that. Please try again.", true); });
        };
        // if they unsubscribed from an email link, mirror that here
        if (on) api('/promo/state', 'GET').then(function (r) {
          if (r && r.ok && r.unsub && me() && me().promoOptIn === true) { me().promoOptIn = false; paint(false); ownUpdate({ promoOptIn: false }).catch(function () {}); }
        }).catch(function () {});
      } catch (e) {}
    }
    var prev = window.openSettings;
    if (typeof prev === 'function' && !prev.__promo) {
      var w = function () { var r = prev.apply(this, arguments); setTimeout(inject, 0); return r; };
      w.__promo = true; window.openSettings = w;
    }
  })();

  /* ───────── admin: Campaigns tab ───────── */
  var DRAFT = 'ss_campaign_draft', poll = null, armed = null;

  function audience() {
    var users = (typeof CACHE !== 'undefined' && CACHE.users) ? CACHE.users : [];
    var ok = users.filter(function (u) { return u.promoOptIn === true && u.isBanned !== true && u.badgeStatus !== 'suspended'; });
    return { all: ok.length, freelancer: ok.filter(function (u) { return u.role === 'freelancer'; }).length, employer: ok.filter(function (u) { return u.role === 'employer'; }).length, members: users.length };
  }
  function draft() { try { return JSON.parse(ls(DRAFT) || '{}') || {}; } catch (e) { return {}; } }
  function readForm() {
    return { audience: ($('cp-aud') || {}).value || 'all', subject: ($('cp-subj') || {}).value || '', eyebrow: ($('cp-eye') || {}).value || '', heading: ($('cp-head') || {}).value || '', body: ($('cp-body') || {}).value || '', ctaText: ($('cp-cta') || {}).value || '', ctaUrl: ($('cp-url') || {}).value || '' };
  }
  function saveDraft() { ls(DRAFT, JSON.stringify(readForm())); }

  function preview() {
    var f = readForm(), box = $('cp-prev'); if (!box) return;
    var paras = f.body.split(/\n{2,}/).map(function (p) { return p.trim(); }).filter(Boolean);
    box.innerHTML = '<div style="background:#0d3320;color:#fff;text-align:center;padding:12px;font-weight:800;border-radius:10px 10px 0 0;font-size:14px;">Skill<span style="color:#7ee2a8;">Stamp</span></div>'
      + '<div style="background:#fff;color:#4b5a50;padding:16px;border:1px solid #dde2d6;border-top:none;border-radius:0 0 10px 10px;">'
      + (f.eyebrow ? '<div style="font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#1a6b3c;">' + esc(f.eyebrow) + '</div>' : '')
      + '<div style="font-size:17px;font-weight:800;color:#0d1109;margin:6px 0 8px;line-height:1.25;">' + esc(f.heading || f.subject || 'Your heading') + '</div>'
      + '<div style="font-size:13px;margin-bottom:6px;">Hi Ada,</div>'
      + (paras.length ? paras.map(function (p) { return '<div style="font-size:13px;line-height:1.6;margin-top:8px;">' + esc(p).replace(/\n/g, '<br>') + '</div>'; }).join('') : '<div style="font-size:13px;color:#9aa59d;margin-top:8px;">Your message appears here…</div>')
      + (f.ctaText && f.ctaUrl ? '<div style="display:inline-block;background:#1a6b3c;color:#fff;font-weight:700;font-size:13px;padding:10px 20px;border-radius:10px;margin-top:14px;">' + esc(f.ctaText) + '</div>' : '')
      + '<div style="font-size:10px;color:#7a877e;margin-top:16px;border-top:1px solid #dde2d6;padding-top:8px;">You are receiving this because you chose to hear about SkillStamp news and offers. Unsubscribe</div></div>';
  }

  function statusHtml(s) {
    if (!s || !s.ok) return '<div class="ap-note">Could not load sending status. Make sure the latest Worker is deployed.</div>';
    var h = '';
    if (s.active) {
      var done = s.active.sent + s.active.failed + s.active.skipped, pct = s.active.total ? Math.round(done / s.active.total * 100) : 0;
      h += '<div class="ap-note" style="border-color:rgba(26,107,60,.4);"><b>Sending: ' + esc(s.active.subject) + '</b><div style="height:7px;background:var(--br);border-radius:6px;margin:8px 0;overflow:hidden;"><div style="height:100%;width:' + pct + '%;background:#1a6b3c;"></div></div>'
        + done + ' of ' + s.active.total + ' processed · ' + s.active.sent + ' sent · ' + s.active.skipped + ' skipped · ' + s.active.failed + ' failed'
        + '<div class="ap-row" style="margin-bottom:0;"><button class="ap-btn ap-danger" onclick="ssCampCancel()">Stop this campaign</button></div></div>';
    } else if (s.last) {
      h += '<div class="ap-note"><b>Last campaign: ' + esc(s.last.subject) + '</b><br>' + esc(s.last.status) + ' · ' + s.last.sent + ' sent · ' + s.last.skipped + ' skipped · ' + s.last.failed + ' failed (of ' + s.last.total + ')</div>';
    }
    var left = Math.max(0, (s.dailyCap || 0) - (s.reserve || 0) - (s.sentToday || 0));
    h += '<div class="ap-note" style="color:var(--td);">Emails sent today: ' + (s.sentToday || 0) + ' of ' + (s.dailyCap || 0) + '. Campaigns pause once only ' + (s.reserve || 0) + ' are left, so welcome and gig emails always go out. About ' + left + ' campaign emails can still go today; a bigger list continues tomorrow automatically.</div>';
    return h;
  }
  function refreshStatus() {
    var box = $('cp-status'); if (!box) { if (poll) { clearInterval(poll); poll = null; } return; }
    api('/campaign', 'POST', { action: 'status' }).then(function (s) { var b = $('cp-status'); if (b) b.innerHTML = statusHtml(s); }).catch(function () { var b = $('cp-status'); if (b) b.innerHTML = '<div class="ap-note">Could not reach the email service.</div>'; });
  }

  function render() {
    var host = $('admtab-campaigns'); if (!host) return;
    var a = audience(), d = draft();
    var inp = 'class="fi" style="width:100%;margin-bottom:8px;"';
    host.innerHTML = '<div class="ap-h2" style="margin-top:6px;">Email campaigns</div>'
      + '<div class="ap-note">Only members who ticked "news and offers" receive these. Every email has an unsubscribe link. <b>' + a.all + '</b> of ' + a.members + ' members have opted in (' + a.freelancer + ' freelancers, ' + a.employer + ' employers).</div>'
      + '<div id="cp-status"></div>'
      + '<div class="ap-cardbox" style="margin-bottom:12px;">'
      + '<label class="ap-lbl">Send to</label><select id="cp-aud" ' + inp + '><option value="all">Everyone who opted in (' + a.all + ')</option><option value="freelancer">Freelancers only (' + a.freelancer + ')</option><option value="employer">Employers only (' + a.employer + ')</option></select>'
      + '<label class="ap-lbl">Subject line</label><input id="cp-subj" ' + inp + ' maxlength="120" placeholder="What is new on SkillStamp"/>'
      + '<label class="ap-lbl">Small label above the heading (optional)</label><input id="cp-eye" ' + inp + ' maxlength="40" placeholder="Product update"/>'
      + '<label class="ap-lbl">Heading</label><input id="cp-head" ' + inp + ' maxlength="120" placeholder="Short and clear"/>'
      + '<label class="ap-lbl">Message (leave a blank line between paragraphs)</label><textarea id="cp-body" ' + inp + ' rows="7" maxlength="3000" placeholder="Write your message here"></textarea>'
      + '<div class="ap-two" style="display:grid;grid-template-columns:1fr 1fr;gap:8px;"><div><label class="ap-lbl">Button text (optional)</label><input id="cp-cta" ' + inp + ' maxlength="40" placeholder="Open SkillStamp"/></div>'
      + '<div><label class="ap-lbl">Button link (https)</label><input id="cp-url" ' + inp + ' maxlength="500" placeholder="https://skillstamp.cv/"/></div></div>'
      + '<div class="ap-lbl">Preview</div><div id="cp-prev" style="max-width:420px;margin-bottom:12px;"></div>'
      + '<div class="ap-row"><button class="ap-btn ap-ghost" id="cp-test" onclick="ssCampTest()">Send a test to me</button>'
      + '<button class="ap-btn ap-primary" id="cp-send" style="width:auto;margin:0;padding:10px 16px;font-size:12px;" onclick="ssCampSend()">Send campaign</button></div>'
      + '<div class="ap-note" style="color:var(--td);margin-bottom:0;">Tip: always send a test first and check it on your phone.</div></div>';
    $('cp-aud').value = d.audience || 'all'; $('cp-subj').value = d.subject || ''; $('cp-eye').value = d.eyebrow || ''; $('cp-head').value = d.heading || ''; $('cp-body').value = d.body || ''; $('cp-cta').value = d.ctaText || ''; $('cp-url').value = d.ctaUrl || '';
    ['cp-aud', 'cp-subj', 'cp-eye', 'cp-head', 'cp-body', 'cp-cta', 'cp-url'].forEach(function (id) { $(id).addEventListener('input', function () { saveDraft(); preview(); disarm(); }); $(id).addEventListener('change', function () { saveDraft(); preview(); disarm(); }); });
    preview(); refreshStatus();
    if (poll) clearInterval(poll);
    poll = setInterval(refreshStatus, 10000);
  }
  function disarm() { armed = null; var b = $('cp-send'); if (b) b.textContent = 'Send campaign'; }

  window.ssCampTest = function () {
    var b = $('cp-test'); if (b) { b.disabled = true; b.textContent = 'Sending…'; }
    var f = readForm(); f.action = 'test';
    api('/campaign', 'POST', f).then(function (r) { if (r && r.ok) say('Test sent to ' + r.to); else say((r && r.error) || 'Could not send the test.', true); })
      .catch(function () { say('Could not reach the email service.', true); })
      .then(function () { var b2 = $('cp-test'); if (b2) { b2.disabled = false; b2.textContent = 'Send a test to me'; } });
  };
  window.ssCampSend = function () {
    var f = readForm(), a = audience(), n = f.audience === 'freelancer' ? a.freelancer : f.audience === 'employer' ? a.employer : a.all;
    if (!n) { say('Nobody has opted in for that audience yet.', true); return; }
    var b = $('cp-send');
    if (!armed) { armed = Date.now(); if (b) b.textContent = 'Tap again to send to ' + n + ' members'; setTimeout(function () { if (armed && Date.now() - armed >= 6000) disarm(); }, 6200); return; }
    disarm(); if (b) { b.disabled = true; b.textContent = 'Starting…'; }
    f.action = 'start';
    api('/campaign', 'POST', f).then(function (r) {
      if (r && r.ok) { say('Campaign started for ' + r.total + ' members.'); try { if (window.ssLog) window.ssLog('send_campaign', '', '', f.subject + ' (' + r.total + ' members)'); } catch (e) {} refreshStatus(); }
      else say((r && r.error) || 'Could not start the campaign.', true);
    }).catch(function () { say('Could not reach the email service.', true); })
      .then(function () { var b2 = $('cp-send'); if (b2) { b2.disabled = false; b2.textContent = 'Send campaign'; } });
  };
  window.ssCampCancel = function () {
    if (!window.confirm('Stop sending this campaign? Emails already sent cannot be recalled.')) return;
    api('/campaign', 'POST', { action: 'cancel' }).then(function () { say('Campaign stopped.'); refreshStatus(); }).catch(function () { say('Could not stop it.', true); });
  };

  function hookAdmin() {
    var prev = window.adminTab;
    if (typeof prev !== 'function' || prev.__camp) return;
    var w = function (name) {
      var r = prev.apply(this, arguments);
      try {
        var p = $('admtab-campaigns'), b = $('admt-campaigns');
        if (p) p.style.display = name === 'campaigns' ? 'block' : 'none';
        if (b) { b.style.background = name === 'campaigns' ? 'var(--acc)' : 'var(--s)'; b.style.color = name === 'campaigns' ? '#fff' : 'var(--td)'; b.style.borderColor = name === 'campaigns' ? 'var(--acc)' : 'var(--br)'; }
        if (name === 'campaigns') render();
        else if (poll) { clearInterval(poll); poll = null; }
      } catch (e) { console.warn('[campaigns] tab', e); }
      return r;
    };
    w.__camp = true; window.adminTab = w;
  }
  hookAdmin();
})();
