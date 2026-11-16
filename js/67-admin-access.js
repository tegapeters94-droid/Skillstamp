/* SkillStamp - admin password and per-person admin access.
   * The owner (an admin whose profile has no adminScope) can see every tool.
   * Anyone the owner adds in Admin > Team only gets the tools ticked for them.
   * Any admin can protect their admin tools with a password (Admin > Security). After a password is set the panel
     locks after 30 minutes; money actions and team changes need it unlocked (enforced by the rules and the Worker,
     not just hidden on screen).
   Removing this file hides the screens but the rules and Worker still enforce the same limits. */
(function () {
  'use strict';
  var API = window.SS_API || 'https://skillstamp-email.tegapeters94.workers.dev';
  var URL_FS = 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
  var SCOPES = [
    ['payments', '💰 Payments', 'Deposits, Withdrawals, Wallets, Risk review, bank details and limits'],
    ['disputes', '⚖️ Disputes & gigs', 'Disputes and Gigs & Escrow'],
    ['moderation', '🛡️ Moderation', 'Moderation, Reports, reviews and the message guard'],
    ['users', '👤 Users & verification', 'Users, Skills verification, account deletion, data protection'],
    ['campaigns', '📣 Campaigns', 'Broadcast and email campaigns'],
    ['analytics', '📊 Analytics', 'Overview stats, Analytics, Activity log, monitoring']
  ];
  var TAB_SCOPE = { overview: 'overview', users: 'users', disputes: 'disputes', gigs: 'disputes', content: 'moderation', skills: 'users', announce: 'campaigns', campaigns: 'campaigns', analytics: 'analytics', reports: 'moderation', activity: 'analytics', deposits: 'payments', withdrawals: 'payments', wallets: 'payments', risk: 'payments', referrals: 'payments', backup: 'owner', security: 'any', team: 'owner' };
  var HOST_SCOPE = { 'rva-host': 'moderation', 'mg-host': 'moderation', 'rg-card': 'moderation', 'mon-host': 'analytics', 'ap-ov-host': 'disputes' };
  var ORDER = ['overview', 'users', 'disputes', 'gigs', 'content', 'skills', 'announce', 'campaigns', 'analytics', 'reports', 'activity', 'deposits', 'withdrawals', 'wallets', 'risk', 'referrals', 'backup', 'team', 'security'];
  function $(id) { return document.getElementById(id); }
  function F() { return window.FB_FNS; }
  function me() { return window.ME; }
  function admin() { return !!(me() && me().isAdmin); }
  function owner() { return admin() && !Array.isArray(me().adminScope); }
  function has(sc) { return owner() || (admin() && Array.isArray(me().adminScope) && me().adminScope.indexOf(sc) >= 0); }
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function say(m, bad) { try { if (window.toast) window.toast(m, bad ? 'bad' : undefined); } catch (e) {} }
  function tabAllowed(t) {
    if (owner()) return true;
    var sc = TAB_SCOPE[t]; if (!sc) return false;
    if (sc === 'any') return true;
    if (sc === 'owner') return false;
    if (sc === 'overview') return has('analytics') || has('moderation') || has('disputes');
    return has(sc);
  }
  function firstAllowed() { for (var i = 0; i < ORDER.length; i++) if (tabAllowed(ORDER[i])) return ORDER[i]; return 'security'; }

  async function call(body) {
    var u = window.FB_AUTH && window.FB_AUTH.currentUser; if (!u) throw new Error('signed-out');
    var tok = await u.getIdToken();
    var r = await fetch(API + '/admin/gate', { method: 'POST', headers: { 'Authorization': 'Bearer ' + tok, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    var j = {}; try { j = await r.json(); } catch (e) {} j._status = r.status; return j;
  }

  /* ───────────── gate (password lock) ───────────── */
  var GATE = null;
  async function status() { try { var j = await call({ action: 'status' }); if (j.ok) GATE = j; } catch (e) {} return GATE; }
  function hideLock() { var l = $('ag-lock'); if (l) l.remove(); }
  function showLock(msg) {
    if ($('ag-lock')) { var m0 = $('ag-msg'); if (m0 && msg) m0.textContent = msg; return; }
    var d = document.createElement('div'); d.id = 'ag-lock';
    d.style.cssText = 'position:fixed;inset:0;z-index:99990;background:var(--bg,#f6f5f1);display:flex;align-items:center;justify-content:center;padding:20px;';
    d.innerHTML = '<div style="width:100%;max-width:360px;background:var(--s,#fff);border:1px solid var(--br,#ddd);border-radius:16px;padding:22px;">'
      + '<div style="font-size:30px;margin-bottom:6px;">🔐</div><div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:800;font-size:17px;margin-bottom:4px;">Admin locked</div>'
      + '<div style="font-size:12px;color:var(--td);line-height:1.6;margin-bottom:12px;">Enter your admin password to continue.</div>'
      + '<input class="fi" id="ag-pw" type="password" autocomplete="current-password" placeholder="Admin password" style="width:100%;margin-bottom:8px;">'
      + '<div id="ag-msg" style="font-size:12px;color:#b42318;min-height:16px;margin-bottom:8px;">' + esc(msg || '') + '</div>'
      + '<button class="btn" id="ag-go" style="width:100%;">Unlock</button>'
      + '<button id="ag-leave" style="width:100%;margin-top:8px;border:0;background:none;color:var(--td);font-size:12px;cursor:pointer;">Leave admin</button>'
      + '<div style="font-size:11px;color:var(--td);line-height:1.5;margin-top:10px;">Forgot it? A team member asks the owner to reset it in Admin, Team. The owner clears it by deleting their document in the admin_gate collection in the Firebase console.</div></div>';
    document.body.appendChild(d);
    var go = async function () {
      var pw = $('ag-pw').value; if (!pw) return;
      var b = $('ag-go'); b.disabled = true; b.textContent = 'Checking...';
      var j = await call({ action: 'verify', password: pw }).catch(function () { return {}; });
      if (j.ok && j.unlocked) { GATE = Object.assign(GATE || {}, { hasPassword: true, unlocked: true, exp: j.exp }); hideLock(); rerender(); return; }
      b.disabled = false; b.textContent = 'Unlock';
      $('ag-msg').textContent = j.error === 'too-many-tries' ? 'Too many wrong tries. Wait 15 minutes.' : j.error === 'wrong-password' ? 'Wrong password.' + (j.left != null ? ' ' + j.left + ' tries left.' : '') : 'Could not check the password. Try again.';
      $('ag-pw').value = ''; $('ag-pw').focus();
    };
    $('ag-go').onclick = go; $('ag-pw').onkeydown = function (e) { if (e.key === 'Enter') go(); };
    $('ag-leave').onclick = function () { hideLock(); location.hash = '#home'; };
    setTimeout(function () { try { $('ag-pw').focus(); } catch (e) {} }, 50);
  }
  function onAdminPage() { var r = $('admin-root'); return !!(r && r.offsetParent !== null); }
  async function ensureUnlocked() {
    if (!admin()) return;
    var g = await status(); if (!g) return;
    if (g.hasPassword && !g.unlocked) showLock(); else hideLock();
    nag();
  }
  function nag() {
    var tabs = $('adm-tabs'); if (!tabs) return;
    var n = $('ag-nag');
    var need = GATE && !GATE.hasPassword;
    if (!need) { if (n) n.remove(); return; }
    if (n) return;
    n = document.createElement('div'); n.id = 'ag-nag';
    n.style.cssText = 'background:rgba(255,167,38,.12);border:1px solid rgba(255,167,38,.35);border-radius:10px;padding:10px 12px;font-size:12px;margin-bottom:12px;display:flex;gap:10px;align-items:center;flex-wrap:wrap;';
    n.innerHTML = '<span>🔐 Protect the admin tools with a password.</span><button class="btn" style="width:auto;padding:6px 12px;font-size:11px;" onclick="adminTab(\'security\')">Set it now</button>';
    tabs.parentNode.insertBefore(n, tabs);
  }
  setInterval(function () {
    if (!admin() || !onAdminPage() || !GATE || !GATE.hasPassword) return;
    if (!$('ag-lock') && GATE.exp && Date.now() > GATE.exp) { GATE.unlocked = false; showLock('Locked after 30 minutes. Enter your password to continue.'); }
  }, 15000);

  /* ───────────── tabs ───────────── */
  function addTab(id, label) {
    var tabs = $('adm-tabs'), root = $('admin-root'); if (!tabs || !root || $('admt-' + id)) return;
    var b = document.createElement('button'); b.id = 'admt-' + id; b.textContent = label; b.setAttribute('onclick', "adminTab('" + id + "')");
    b.style.cssText = 'padding:7px 13px;font-size:11px;font-family:Plus Jakarta Sans,sans-serif;font-weight:700;border-radius:6px;border:1px solid var(--br);background:var(--s);color:var(--td);cursor:pointer;';
    tabs.appendChild(b);
    var p = document.createElement('div'); p.id = 'admtab-' + id; p.style.display = 'none'; root.appendChild(p);
  }
  function applyAccess() {
    if (!admin()) return;
    var tabs = $('adm-tabs');
    if (tabs) Array.prototype.forEach.call(tabs.querySelectorAll('button[id^="admt-"]'), function (b) { b.style.display = tabAllowed(b.id.slice(5)) ? '' : 'none'; });
    var ex = document.querySelector('#admin-root button[onclick^="adminExportCSV"]'); if (ex) ex.style.display = has('users') ? '' : 'none';
    var ov = $('admtab-overview');
    if (ov && !owner()) Array.prototype.forEach.call(ov.children, function (c) { var sc = HOST_SCOPE[c.id]; c.style.display = (sc ? has(sc) : has('analytics')) ? '' : 'none'; });
  }
  function rerender() { try { if (window.renderAdminV6) window.renderAdminV6(); } catch (e) {} }

  var rA = window.renderAdminV6;
  if (typeof rA === 'function') window.renderAdminV6 = function () {
    var r = rA.apply(this, arguments);
    try { if (admin()) { addTab('security', '🔐 Security'); if (owner()) addTab('team', '👥 Team'); applyAccess(); ensureUnlocked(); } } catch (e) {}
    return r;
  };
  var tA = window.adminTab;
  if (typeof tA === 'function') window.adminTab = function (name) {
    if (admin() && !tabAllowed(name)) name = firstAllowed();
    var r = tA.call(this, name);
    try {
      ['security', 'team'].forEach(function (t) {
        var p = $('admtab-' + t), b = $('admt-' + t), on = name === t;
        if (p) p.style.display = on ? 'block' : 'none';
        if (b) { b.style.background = on ? 'var(--acc)' : 'var(--s)'; b.style.color = on ? '#fff' : 'var(--td)'; b.style.borderColor = on ? 'var(--acc)' : 'var(--br)'; }
      });
      if (name === 'security') drawSecurity();
      if (name === 'team') drawTeam();
      applyAccess(); setTimeout(applyAccess, 300); setTimeout(applyAccess, 800); setTimeout(applyAccess, 1500);
    } catch (e) {}
    return r;
  };

  /* ───────────── Security tab ───────────── */
  var CSS = '<style>.ag-b{padding:8px 13px;font-size:12px;font-weight:700;border-radius:8px;border:1px solid var(--br);background:var(--s);color:var(--tx);cursor:pointer;font-family:inherit}.ag-b.p{background:var(--acc);color:#fff;border-color:var(--acc)}.ag-b.d{color:#b42318}.ag-c{border:1px solid var(--br);border-radius:12px;padding:12px;margin-bottom:10px;background:var(--s)}.ag-k{display:flex;gap:8px;align-items:flex-start;font-size:12px;margin:6px 0;line-height:1.4}.ag-k small{display:block;color:var(--td);font-size:10px}</style>';
  async function drawSecurity() {
    var p = $('admtab-security'); if (!p) return;
    var g = await status() || {};
    var until = g.hasPassword && g.unlocked && g.exp ? new Date(g.exp).toLocaleTimeString() : '';
    p.innerHTML = CSS + '<div style="padding:12px;max-width:420px;"><div style="font-weight:800;font-size:15px;margin-bottom:4px;">Admin password</div>'
      + '<div style="font-size:12px;color:var(--td);line-height:1.6;margin-bottom:12px;">' + (g.hasPassword ? 'A password is set. The admin tools lock after 30 minutes' + (until ? ' (unlocked until ' + esc(until) + ')' : '') + '.' : 'No password yet. Set one so nobody can use the admin tools from your open browser. Money actions and team changes will need it.') + '</div>'
      + (g.hasPassword ? '<input class="fi" id="ag-cur" type="password" autocomplete="current-password" placeholder="Current password" style="width:100%;margin-bottom:8px;">' : '')
      + '<input class="fi" id="ag-new" type="password" autocomplete="new-password" placeholder="New password (at least 8 characters)" style="width:100%;margin-bottom:8px;">'
      + '<input class="fi" id="ag-new2" type="password" autocomplete="new-password" placeholder="Repeat new password" style="width:100%;margin-bottom:10px;">'
      + '<button class="ag-b p" onclick="ssAgSet()">' + (g.hasPassword ? 'Change password' : 'Set password') + '</button> '
      + (g.hasPassword ? '<button class="ag-b" onclick="ssAgLock()">Lock now</button>' : '')
      + '</div>';
  }
  window.ssAgSet = async function () {
    var a = $('ag-new').value, b = $('ag-new2').value, c = $('ag-cur') ? $('ag-cur').value : '';
    if (a.length < 8) return say('Use at least 8 characters.', true);
    if (a !== b) return say('The two passwords do not match.', true);
    var j = await call({ action: 'set', password: a, current: c }).catch(function () { return {}; });
    if (j.ok) { say('Password saved.'); await ensureUnlocked(); drawSecurity(); }
    else say(j.error === 'wrong-password' ? 'Current password is wrong.' : j.error === 'too-many-tries' ? 'Too many wrong tries. Wait 15 minutes.' : j.error === 'weak-password' ? 'Use at least 8 characters.' : 'Could not save the password.', true);
  };
  window.ssAgLock = async function () { await call({ action: 'lock' }).catch(function () {}); GATE = Object.assign(GATE || {}, { unlocked: false }); showLock(); };

  /* ───────────── Team tab (owner only) ───────────── */
  var PICK = null, Q = '';
  function users() { return (window.CACHE && CACHE.users) || []; }
  function scopeBoxes(prefix, sel) {
    return SCOPES.map(function (s) { return '<label class="ag-k"><input type="checkbox" class="' + prefix + '" value="' + s[0] + '"' + (sel.indexOf(s[0]) >= 0 ? ' checked' : '') + '><span>' + s[1] + '<small>' + s[2] + '</small></span></label>'; }).join('');
  }
  function picked(prefix, root) { return Array.prototype.map.call((root || document).querySelectorAll('.' + prefix + ':checked'), function (x) { return x.value; }); }
  function drawTeam() {
    var p = $('admtab-team'); if (!p || !owner()) return;
    var team = users().filter(function (u) { return u.isAdmin && Array.isArray(u.adminScope) && u.uid !== me().uid; });
    var full = users().filter(function (u) { return u.isAdmin && !Array.isArray(u.adminScope) && u.uid !== me().uid; });
    var q = Q.trim().toLowerCase();
    var found = q.length >= 2 ? users().filter(function (u) { return !u.isAdmin && ((u.name || '').toLowerCase().indexOf(q) >= 0 || (u.skillId || '').toLowerCase().indexOf(q) >= 0 || (u.email || '').toLowerCase().indexOf(q) >= 0); }).slice(0, 8) : [];
    var h = CSS + '<div style="padding:12px;max-width:560px;"><div style="font-weight:800;font-size:15px;margin-bottom:4px;">Admin team</div>'
      + '<div style="font-size:12px;color:var(--td);line-height:1.6;margin-bottom:12px;">You (the owner) see everything. Each person you add below only gets the tools you tick. Changes need your admin panel unlocked.</div>';
    h += '<div class="ag-c"><div style="font-weight:700;font-size:13px;margin-bottom:6px;">Add a team member</div>'
      + '<input class="fi" id="ag-q" placeholder="Search a member by name or SkillID" value="' + esc(Q) + '" style="width:100%;margin-bottom:8px;" oninput="ssAgSearch(this.value)">';
    if (PICK) {
      var pu = users().filter(function (u) { return u.uid === PICK; })[0];
      h += '<div style="font-size:12px;margin:6px 0;">Selected: <b>' + esc(pu ? pu.name : PICK) + '</b> <button class="ag-b" style="padding:3px 8px;font-size:10px;" onclick="ssAgPick(null)">Change</button></div>' + scopeBoxes('ag-new-sc', []) + '<button class="ag-b p" onclick="ssAgGive()">Give access</button>';
    } else {
      h += found.map(function (u) { return '<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid var(--br);font-size:12px;"><span>' + esc(u.name || u.uid) + ' <span style="color:var(--td);">' + esc(u.skillId || '') + '</span></span><button class="ag-b" style="padding:4px 10px;font-size:11px;" onclick="ssAgPick(\'' + esc(u.uid) + '\')">Select</button></div>'; }).join('') || (q.length >= 2 ? '<div style="font-size:12px;color:var(--td);">No match.</div>' : '');
    }
    h += '</div>';
    h += '<div style="font-weight:700;font-size:13px;margin:14px 0 6px;">Team (' + team.length + ')</div>';
    h += team.map(function (u) {
      return '<div class="ag-c" data-uid="' + esc(u.uid) + '"><div style="font-weight:700;font-size:13px;margin-bottom:4px;">' + esc(u.name || u.uid) + '</div>' + scopeBoxes('ag-sc-' + u.uid.replace(/[^A-Za-z0-9]/g, ''), u.adminScope)
        + '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px;"><button class="ag-b p" onclick="ssAgSave(\'' + esc(u.uid) + '\')">Save access</button><button class="ag-b" onclick="ssAgReset(\'' + esc(u.uid) + '\')">Reset password</button><button class="ag-b d" onclick="ssAgRemove(\'' + esc(u.uid) + '\')">Remove from team</button></div></div>';
    }).join('') || '<div style="font-size:12px;color:var(--td);">Nobody yet.</div>';
    if (full.length) h += '<div style="font-weight:700;font-size:13px;margin:14px 0 6px;">Other admins with full access</div>' + full.map(function (u) { return '<div class="ag-c" style="display:flex;justify-content:space-between;align-items:center;gap:8px;"><span style="font-size:12px;"><b>' + esc(u.name || u.uid) + '</b><br><span style="color:var(--td);">Sees everything</span></span><button class="ag-b" onclick="ssAgPick(\'' + esc(u.uid) + '\');" title="Limit what this person can open">Limit access</button></div>'; }).join('');
    h += '</div>';
    p.innerHTML = h;
  }
  window.ssAgSearch = function (v) { Q = v; PICK = null; drawTeam(); var i = $('ag-q'); if (i) { i.focus(); i.setSelectionRange(v.length, v.length); } };
  window.ssAgPick = function (uid) { PICK = uid; if (!uid) Q = ''; drawTeam(); };
  async function patch(uid, data, withDelete) {
    var db = window.FB_DB, ref = F().doc(db, 'users', uid);
    if (withDelete) { var df = (await import(URL_FS)).deleteField; data = Object.assign({}, data, { adminScope: df() }); }
    await F().updateDoc(ref, data);
    var u = users().filter(function (x) { return x.uid === uid; })[0];
    if (u) { Object.keys(data).forEach(function (k) { if (k === 'adminScope' && withDelete) delete u.adminScope; else u[k] = data[k]; }); }
  }
  function fail(e) { console.warn(e); say('Could not save. Unlock the admin panel and try again.', true); }
  window.ssAgGive = async function () {
    var sc = picked('ag-new-sc'); if (!PICK) return; if (!sc.length) return say('Tick at least one tool.', true);
    if (PICK === me().uid) return;
    try { await patch(PICK, { isAdmin: true, adminScope: sc }); say('Access given.'); PICK = null; Q = ''; drawTeam(); } catch (e) { fail(e); }
  };
  window.ssAgSave = async function (uid) {
    var sc = picked('ag-sc-' + uid.replace(/[^A-Za-z0-9]/g, '')); if (!sc.length) return say('Tick at least one tool, or remove the person from the team.', true);
    try { await patch(uid, { adminScope: sc }); say('Access updated.'); drawTeam(); } catch (e) { fail(e); }
  };
  window.ssAgReset = async function (uid) {
    if (!confirm('Clear this person\'s admin password? They must set a new one before they can use money tools.')) return;
    var j = await call({ action: 'reset-user', uid: uid }).catch(function () { return {}; });
    say(j.ok ? 'Password cleared. They will set a new one.' : (j.error === 'locked' ? 'Unlock your admin panel first.' : 'Could not reset the password.'), !j.ok);
  };
  window.ssAgRemove = async function (uid) {
    if (!confirm('Remove this person from the admin team? They will lose all admin access.')) return;
    try { await call({ action: 'reset-user', uid: uid }).catch(function () {}); await patch(uid, { isAdmin: false }, true); say('Removed from the team.'); drawTeam(); } catch (e) { fail(e); }
  };
})();
