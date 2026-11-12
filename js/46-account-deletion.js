/* SkillStamp - account deletion requests
   Members who delete their account are flagged (users.deleted = true) and hidden from the platform.
   - If they log back in within 30 days they are asked whether to keep the account.
   - Admins see the requests in Users > "Deletion requests" and remove them permanently (Manage > Delete).
   Wraps existing functions only; does not change login code. */
(function () {
  'use strict';
  var DAY = 864e5, WINDOW = 30;
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function say(m, bad) { try { if (window.toast) window.toast(m, bad ? 'bad' : 'ok'); } catch (e) {} }

  /* ── member: offer to cancel the deletion ── */
  var shown = false;
  function restoreBox() {
    var m = window.ME;
    var left = Math.max(0, Math.ceil(WINDOW - (Date.now() - (Number(m.deletedAt) || Date.now())) / DAY));
    var d = document.createElement('div');
    d.id = 'ss-del-restore';
    d.style.cssText = 'position:fixed;inset:0;z-index:3500;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;padding:16px;';
    d.innerHTML = '<div style="background:var(--s,#fff);color:var(--tx,#0d1109);border-radius:18px;max-width:380px;width:100%;padding:22px;text-align:center;font-family:Plus Jakarta Sans,sans-serif;box-shadow:0 14px 50px rgba(0,0,0,.35);">'
      + '<div style="font-size:38px;">🗑️</div>'
      + '<div style="font-weight:800;font-size:17px;margin:8px 0 6px;">Your account is scheduled for deletion</div>'
      + '<div style="font-size:12.5px;line-height:1.6;color:var(--td,#6b7a70);margin-bottom:16px;">Your profile is hidden and will be permanently deleted in about ' + left + ' day' + (left === 1 ? '' : 's') + '. Do you want to keep your account?</div>'
      + '<button id="ss-del-keep" style="width:100%;background:#1a6b3c;color:#fff;border:none;border-radius:12px;padding:13px;font-weight:700;font-size:14px;cursor:pointer;margin-bottom:8px;">Keep my account</button>'
      + '<button id="ss-del-out" style="width:100%;background:transparent;color:var(--td,#6b7a70);border:1px solid var(--br,#dde2d6);border-radius:12px;padding:12px;font-weight:600;font-size:13px;cursor:pointer;">Log out and let it be deleted</button></div>';
    document.body.appendChild(d);
    $('ss-del-keep').onclick = function () {
      var b = this; b.disabled = true; b.textContent = 'Restoring…';
      var F = window.FB_FNS;
      F.updateDoc(F.doc(window.FB_DB, 'users', m.uid), { deleted: false }).then(function () {
        m.deleted = false;
        try { var cu = CACHE.users.find(function (u) { return u.uid === m.uid; }); if (cu) cu.deleted = false; } catch (e) {}
        d.remove(); shown = false; say('Welcome back! Your account is restored.');
      }).catch(function () { b.disabled = false; b.textContent = 'Keep my account'; say("Couldn't restore it. Please try again.", true); });
    };
    $('ss-del-out').onclick = function () { d.remove(); shown = false; try { window.doLogout(); } catch (e) {} };
  }
  setInterval(function () {
    try {
      var m = window.ME, u = window.FB_AUTH && window.FB_AUTH.currentUser;
      if (!m || !m.uid || m.deleted !== true) { if (shown && $('ss-del-restore') && (!m || m.deleted !== true)) { $('ss-del-restore').remove(); shown = false; } return; }
      if (shown || (u && u.uid !== m.uid)) return;
      shown = true; restoreBox();
    } catch (e) {}
  }, 1500);

  /* ── admin: deletion requests card ── */
  function render() {
    var tab = $('admtab-users'); if (!tab) return;
    var host = $('del-host');
    if (!host) { host = document.createElement('div'); host.id = 'del-host'; tab.insertBefore(host, tab.firstChild); }
    var list = ((typeof CACHE !== 'undefined' && CACHE.users) ? CACHE.users : []).filter(function (u) { return u.deleted === true && !u.isAdmin; })
      .sort(function (a, b) { return (a.deletedAt || 0) - (b.deletedAt || 0); });
    if (!list.length) { host.innerHTML = ''; return; }
    host.innerHTML = '<div class="ap-cardbox" style="margin-bottom:14px;border-color:rgba(239,68,68,.35);"><div class="ap-h2">Deletion requests (' + list.length + ')</div>'
      + '<div class="ap-note" style="margin-bottom:8px;">These members deleted their account. They are already hidden from the platform. Delete them permanently within 30 days, after checking they have no money held in escrow.</div>'
      + list.map(function (u) {
        var days = Math.floor((Date.now() - (u.deletedAt || Date.now())) / DAY), left = WINDOW - days;
        var pend = u.wallet && Number(u.wallet.pending) > 0 ? ' · <b style="color:#b45309;">₦' + Number(u.wallet.pending) + ' in escrow</b>' : '';
        return '<div style="display:flex;align-items:center;gap:10px;padding:9px 0;border-top:1px solid var(--br);">'
          + '<div style="flex:1;min-width:0;"><div style="font-weight:700;font-size:13px;">' + esc(u.name || 'Member') + '</div>'
          + '<div style="font-size:11px;color:var(--td);">Requested ' + (days <= 0 ? 'today' : days + ' day' + (days === 1 ? '' : 's') + ' ago') + ' · ' + (left > 0 ? left + ' days left' : '<b style="color:#dc2626;">past 30 days</b>') + pend + '</div></div>'
          + '<button class="ap-btn ap-ghost" onclick="ssAdminUser(\'' + esc(u.uid) + '\')">Manage</button></div>';
      }).join('') + '</div>';
  }
  function hook() {
    var prev = window.adminTab;
    if (typeof prev !== 'function' || prev.__del) return;
    var w = function (name) {
      var r = prev.apply(this, arguments);
      try { if (name === 'users') render(); } catch (e) {}
      return r;
    };
    w.__del = true; window.adminTab = w;
  }
  hook();
})();
