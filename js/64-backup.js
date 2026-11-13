/* SkillStamp - Admin > Backup tab. Lists the Worker's daily data backups, runs one now, and downloads a day as a file.
   Admin only. Removing this file just removes the tab. */
(function () {
  'use strict';
  var API = window.SS_API || 'https://skillstamp-email.tegapeters94.workers.dev';
  function $(id) { return document.getElementById(id); }
  function admin() { return !!(window.ME && window.ME.isAdmin); }
  function say(m, bad) { try { if (window.toast) window.toast(m, bad ? 'bad' : undefined); } catch (e) {} }
  async function call(body) {
    var u = window.FB_AUTH && window.FB_AUTH.currentUser; if (!u) throw new Error('signed-out');
    var tok = await u.getIdToken();
    var r = await fetch(API + '/admin/backup', { method: 'POST', headers: { 'Authorization': 'Bearer ' + tok, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    var j = {}; try { j = await r.json(); } catch (e) {}
    if (!r.ok || j.ok === false) throw new Error(j.error || ('status ' + r.status));
    return j;
  }
  function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  var CSS = '.bk-b{padding:7px 12px;font-size:11px;font-weight:700;border-radius:6px;border:1px solid var(--br);background:var(--s);color:var(--tx);cursor:pointer;font-family:inherit;}.bk-b.p{background:var(--acc);color:#fff;border-color:var(--acc);}.bk-r{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--br);font-size:12px;}';
  function panel() { return $('admtab-backup'); }
  async function load() {
    var p = panel(); if (!p) return;
    p.innerHTML = '<style>' + CSS + '</style><div style="padding:14px;font-size:12px;color:var(--td);">Loading...</div>';
    try {
      var j = await call({ action: 'list' });
      var rows = (j.days || []).map(function (d) {
        var n = 0, e = Object.keys(d.meta.errors || {}).length; Object.keys(d.meta.counts || {}).forEach(function (k) { n += d.meta.counts[k]; });
        return '<div class="bk-r"><div><b>' + esc(d.date) + '</b><br><span style="color:var(--td);">' + n + ' records' + (e ? ' · <span style="color:#ef4444;">' + e + ' collection(s) failed</span>' : '') + '</span></div><button class="bk-b" onclick="ssBackupGet(\'' + esc(d.date) + '\')">Download</button></div>';
      }).join('') || '<div style="padding:12px 0;font-size:12px;color:var(--td);">No backups yet. Tap "Back up now".</div>';
      p.innerHTML = '<style>' + CSS + '</style><div style="padding:14px;"><div style="font-size:14px;font-weight:800;margin-bottom:4px;">Data backups</div><div style="font-size:12px;color:var(--td);line-height:1.6;margin-bottom:12px;">A copy of your key data (members, wallets, deposits, withdrawals, escrow, gigs, proposals, reviews) is saved automatically once a day and kept for 8 days. Download a day and keep it somewhere safe. The file contains member details, so treat it as private.</div><button class="bk-b p" onclick="ssBackupRun(this)">Back up now</button><div style="margin-top:10px;">' + rows + '</div></div>';
    } catch (e) { p.innerHTML = '<div style="padding:14px;font-size:12px;color:#ef4444;">Could not load backups (' + esc(e.message) + ').</div>'; }
  }
  window.ssBackupRun = async function (b) {
    if (b) { b.disabled = true; b.textContent = 'Backing up...'; }
    try { await call({ action: 'run' }); say('Backup finished.'); } catch (e) { say('Backup failed: ' + e.message, true); }
    load();
  };
  window.ssBackupGet = async function (date) {
    try {
      var j = await call({ action: 'get', date: date });
      var blob = new Blob([JSON.stringify(j.data, null, 1)], { type: 'application/json' });
      var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'skillstamp-backup-' + date + '.json';
      document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
    } catch (e) { say('Download failed: ' + e.message, true); }
  };
  function addTab() {
    var tabs = $('adm-tabs'), root = $('admin-root'); if (!tabs || !root || $('admt-backup')) return;
    var b = document.createElement('button'); b.id = 'admt-backup'; b.textContent = '💾 Backup'; b.setAttribute('onclick', "adminTab('backup')");
    b.style.cssText = 'padding:7px 13px;font-size:11px;font-family:Plus Jakarta Sans,sans-serif;font-weight:700;border-radius:6px;border:1px solid var(--br);background:var(--s);color:var(--td);cursor:pointer;';
    tabs.appendChild(b);
    var p = document.createElement('div'); p.id = 'admtab-backup'; p.style.display = 'none'; root.appendChild(p);
  }
  var rA = window.renderAdminV6;
  if (typeof rA === 'function') window.renderAdminV6 = function () { var r = rA.apply(this, arguments); try { if (admin()) addTab(); } catch (e) {} return r; };
  var tA = window.adminTab;
  if (typeof tA === 'function') window.adminTab = function (name) {
    var r = tA.apply(this, arguments);
    try {
      var p = $('admtab-backup'), b = $('admt-backup'), on = name === 'backup';
      if (p) p.style.display = on ? 'block' : 'none';
      if (b) { b.style.background = on ? 'var(--acc)' : 'var(--s)'; b.style.color = on ? '#fff' : 'var(--td)'; b.style.borderColor = on ? 'var(--acc)' : 'var(--br)'; }
      if (on) load();
    } catch (e) {}
    return r;
  };
})();
