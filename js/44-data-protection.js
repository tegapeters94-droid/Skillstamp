/* SkillStamp - admin "Data protection" card (Users tab)
   Step 1: download a full backup of every user record
   Step 2: copy each member's email into its private record
   Step 3: remove the email from the public profile (only after step 2 is verified)
   Works together with js/00-private-adapter.js. Admin only. */
(function () {
  'use strict';
  var URL_FS = 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function say(m, bad) { try { if (window.toast) window.toast(m, bad ? 'bad' : undefined); } catch (e) {} }
  function O() { return window.SS_PRIV && window.SS_PRIV.orig && window.SS_PRIV.orig(); }
  function db() { return window.FB_DB; }
  function lower(e) { return String(e || '').trim().toLowerCase(); }

  async function rawAll(col) {
    var o = O(), s = await o.getDocs(o.collection(db(), col));
    return s.docs.map(function (d) { return { id: d.id, data: d.data() }; });
  }

  async function status() {
    var users = await rawAll('users'), priv = await rawAll('users_private');
    var pm = {}; priv.forEach(function (p) { pm[p.id] = lower(p.data && p.data.email); });
    var withEmail = users.filter(function (u) { return u.data && u.data.email; });
    var needCopy = withEmail.filter(function (u) { return pm[u.id] !== lower(u.data.email); });
    var noEmailAnywhere = users.filter(function (u) { return !(u.data && u.data.email) && !pm[u.id]; });
    return { total: users.length, publicEmail: withEmail.length, privateCount: priv.length, needCopy: needCopy, noEmailAnywhere: noEmailAnywhere.length, withEmail: withEmail };
  }

  function card(st, busy, msg) {
    var done = st.publicEmail === 0;
    var step2 = st.needCopy.length > 0;
    var h = '<div class="ap-cardbox" id="dp-card" style="margin-bottom:14px;">'
      + '<div class="ap-h2">Data protection: private emails</div>'
      + '<div class="ap-note" style="margin-bottom:10px;">Members\' emails are moved into a private record that only the member and admins can read. '
      + 'Until step 3 is done, emails are still visible to other signed-in members through the database.</div>'
      + '<div class="ap-box">'
      + '<div class="ap-kv"><span>Members</span><b>' + st.total + '</b></div>'
      + '<div class="ap-kv"><span>Emails still in public profiles</span><b style="color:' + (st.publicEmail ? '#b45309' : '#15803d') + '">' + st.publicEmail + '</b></div>'
      + '<div class="ap-kv"><span>Private email records</span><b>' + st.privateCount + '</b></div>'
      + '<div class="ap-kv"><span>Still to copy to private</span><b>' + st.needCopy.length + '</b></div></div>';
    if (msg) h += '<div class="ap-note">' + esc(msg) + '</div>';
    h += '<div class="ap-row">'
      + '<button class="ap-btn ap-ghost" ' + (busy ? 'disabled' : '') + ' onclick="ssDpBackup()">1. Download backup</button>'
      + '<button class="ap-btn ' + (step2 ? 'ap-primary' : 'ap-ghost') + '" style="' + (step2 ? 'width:auto;margin:0;padding:10px 16px;font-size:12px;' : '') + '" ' + (busy || !step2 ? 'disabled' : '') + ' onclick="ssDpCopy()">2. Copy emails to private (' + st.needCopy.length + ')</button>'
      + '<button class="ap-btn ap-danger" ' + (busy || step2 || done ? 'disabled' : '') + ' onclick="ssDpClean()">3. Remove from public profiles (' + st.publicEmail + ')</button></div>'
      + (done ? '<div class="ap-note" style="border-color:rgba(21,128,61,.4);background:rgba(21,128,61,.07);">All done. No email is stored in public profiles.</div>' : '')
      + '</div>';
    return h;
  }

  async function render(msg, busy) {
    var host = $('dp-host');
    if (!host) { var tab = $('admtab-users'); if (!tab) return; host = document.createElement('div'); host.id = 'dp-host'; tab.insertBefore(host, tab.firstChild); }
    try {
      if (!O()) { host.innerHTML = ''; return; }
      var st = await status();
      window._dpState = st;
      host.innerHTML = card(st, !!busy, msg);
    } catch (e) {
      host.innerHTML = '<div class="ap-note ap-dangerbox">Could not read the data-protection status. Publish the latest firestore.rules first.</div>';
    }
  }
  window.ssDpRender = render;

  window.ssDpBackup = async function () {
    try {
      say('Preparing backup…');
      var users = await rawAll('users'), priv = await rawAll('users_private');
      var out = { exportedAt: new Date().toISOString(), exportedBy: window.ME && window.ME.uid, users: users, users_private: priv };
      var blob = new Blob([JSON.stringify(out, null, 1)], { type: 'application/json' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'skillstamp-users-backup-' + new Date().toISOString().slice(0, 10) + '.json';
      document.body.appendChild(a); a.click(); a.remove();
      try { window.ssLog && window.ssLog('backup_users', '', '', users.length + ' users exported'); } catch (e) {}
      say('Backup downloaded (' + users.length + ' users). Keep that file somewhere safe.');
    } catch (e) { say('Could not create the backup.', true); }
  };

  window.ssDpCopy = async function () {
    var st = window._dpState; if (!st || !st.needCopy.length) return;
    await render('Copying…', true);
    var o = O(), ok = 0, fail = 0;
    for (var i = 0; i < st.needCopy.length; i++) {
      var u = st.needCopy[i];
      try { await o.setDoc(o.doc(db(), 'users_private', u.id), { uid: u.id, email: lower(u.data.email) }, { merge: true }); ok++; }
      catch (e) { fail++; console.warn('[dp] copy failed', u.id, e && e.message); }
    }
    try { window.ssLog && window.ssLog('copy_private_emails', '', '', ok + ' copied, ' + fail + ' failed'); } catch (e) {}
    if (window.SS_PRIV) window.SS_PRIV.loadAll();
    await render(fail ? ok + ' copied, ' + fail + ' failed. Publish the latest firestore.rules and try again.' : 'Copied ' + ok + ' emails. Now check the numbers, then do step 3.');
  };

  window.ssDpClean = async function () {
    var st = window._dpState; if (!st || st.needCopy.length || !st.publicEmail) return;
    var typed = window.prompt('This removes the email from ' + st.publicEmail + ' public profiles. The private copies stay. Type REMOVE to continue.');
    if (typed !== 'REMOVE') return;
    var del;
    try { del = (await import(URL_FS)).deleteField; } catch (e) { say('Could not load the Firestore library.', true); return; }
    await render('Removing…', true);
    var o = O(), ok = 0, fail = 0;
    for (var i = 0; i < st.withEmail.length; i++) {
      var u = st.withEmail[i];
      try { await o.updateDoc(o.doc(db(), 'users', u.id), { email: del() }); ok++; }
      catch (e) { fail++; console.warn('[dp] clean failed', u.id, e && e.message); }
    }
    try { window.ssLog && window.ssLog('remove_public_emails', '', '', ok + ' removed, ' + fail + ' failed'); } catch (e) {}
    await render(fail ? ok + ' removed, ' + fail + ' failed.' : 'Removed ' + ok + ' public emails.');
  };

  /* show the card when the Users tab opens */
  function hook() {
    var prev = window.adminTab;
    if (typeof prev !== 'function' || prev.__dp) return;
    var w = function (name) {
      var r = prev.apply(this, arguments);
      try { if (name === 'users' && window.ME && window.ME.isAdmin) render(); } catch (e) {}
      return r;
    };
    w.__dp = true; window.adminTab = w;
  }
  hook();
})();
