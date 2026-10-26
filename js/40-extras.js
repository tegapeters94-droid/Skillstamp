/* ═══════════════════════════════════════════════════════════════════════
   40-extras.js — Saved items, Report & Block, Admin Reports /
   Activity Log, and the Stats page.
   Loaded last. Hooks existing functions by wrapping them; it does not change
   authentication, wallet or payment logic. Remove its <script> tag to revert
   (the small edits in 12-messages.js and 21-admin.js degrade gracefully).
   ═══════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* ── helpers ─────────────────────────────────────────────────────── */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function isEmp() { return !!(ME && ME.role === 'employer'); }
  function fns() { return window.FB_FNS; }
  function dbRef(col, id) { return fns().doc(window.FB_DB, col, id); }
  function uid8() { return Date.now() + '_' + Math.random().toString(36).slice(2, 8); }
  function ok(m) { if (typeof toast === 'function') toast(m); }
  function bad(m) { if (typeof toast === 'function') toast(m, 'bad'); }

  var IC = {
    bm: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>',
    msg: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
    flag: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>',
    ban: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="4.9" y1="4.9" x2="19.1" y2="19.1"/></svg>',
    more: '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg>',
    back: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>',
    clip: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>'
  };

  function pageEl(id) {
    var el = document.getElementById('page-' + id);
    if (el) return el;
    el = document.createElement('div');
    el.className = 'page';
    el.id = 'page-' + id;
    var anchor = document.getElementById('page-notifications');
    if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(el, anchor.nextSibling);
    else document.body.appendChild(el);
    return el;
  }
  function pageHead(title, sub) {
    return '<div class="xp-head"><button class="xp-back" onclick="if(window._pageHistory&&window._pageHistory.length){showPage(window._pageHistory.pop(),true)}else{showPage(\'home\')}" aria-label="Back">' + IC.back + '</button>'
      + '<div><div class="xp-title">' + esc(title) + '</div>' + (sub ? '<div class="xp-sub">' + esc(sub) + '</div>' : '') + '</div></div>';
  }
  function avatarHTML(u, size) {
    size = size || 42;
    if (!u) u = { name: '?', gradient: '#888' };
    if (u.avatar && /^(data:image\/|https?:)/.test(u.avatar)) {
      return '<img src="' + esc(u.avatar) + '" style="width:' + size + 'px;height:' + size + 'px;border-radius:50%;object-fit:cover;flex-shrink:0;">';
    }
    var g = u.gradient || '#888';
    return '<div style="width:' + size + 'px;height:' + size + 'px;border-radius:50%;background:linear-gradient(135deg,' + esc(g) + ',' + esc(g) + '88);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:' + Math.round(size * 0.38) + 'px;color:#fff;flex-shrink:0;">' + esc((u.name || '?').charAt(0).toUpperCase()) + '</div>';
  }
  function ensureUser(uid, cb) {
    var u = getUser(uid);
    if (u) { cb(u); return; }
    fbGet('users', uid).then(function (fu) {
      if (fu) { CACHE.users.push(fu); cb(fu); }
    }).catch(function () {});
  }
  function confirmBox(title, text, okLabel, onOk, danger) {
    setModal('<button class="mclose" onclick="closeModal()">✕</button>'
      + '<h3>' + esc(title) + '</h3><p style="margin-bottom:16px;line-height:1.6;">' + esc(text) + '</p>'
      + '<div style="display:flex;gap:8px;"><button class="btn-o" style="flex:1;" onclick="closeModal()">Cancel</button>'
      + '<button class="btn" id="xc-ok" style="flex:1;' + (danger ? 'background:var(--acc);' : '') + '">' + esc(okLabel) + '</button></div>');
    var b = document.getElementById('xc-ok');
    if (b) b.onclick = function () { closeModal(); onOk(); };
  }
  function ownField(key, arr) {
    // Writes ONE field on the signed-in user's own doc (does not rewrite the whole profile)
    ME[key] = arr;
    var cu = (CACHE.users || []).find(function (u) { return u.uid === ME.uid; });
    if (cu) cu[key] = arr;
    var p = {}; p[key] = arr;
    return fns().updateDoc(dbRef('users', ME.uid), p).catch(function (e) {
      console.warn('[extras] save ' + key + ' failed', e);
      bad('Could not save. Check your connection and try again.');
    });
  }
  function list(key) { return (ME && Array.isArray(ME[key])) ? ME[key] : []; }

  /* ═════════════════════ SAVED (bookmarks) ═════════════════════════ */
  function isSaved(kind, id) { return list(kind === 'talent' ? 'savedTalent' : 'savedGigs').indexOf(id) >= 0; }
  window.ssToggleSave = function (kind, id) {
    if (!ME) return;
    var key = kind === 'talent' ? 'savedTalent' : 'savedGigs';
    var a = list(key).slice(), i = a.indexOf(id), added = i < 0;
    if (added) a.unshift(id); else a.splice(i, 1);
    ownField(key, a);
    ok(added ? 'Saved' : 'Removed from saved');
    refreshBookmarks();
    if (window._currentPage === 'saved') renderSaved();
  };
  function refreshBookmarks() {
    document.querySelectorAll('[data-bm-kind]').forEach(function (b) {
      var on = isSaved(b.getAttribute('data-bm-kind'), b.getAttribute('data-bm-id'));
      b.classList.toggle('on', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
      b.title = on ? 'Remove from saved' : 'Save';
    });
  }
  function mkBm(kind, id) {
    var b = document.createElement('button');
    b.className = 'ss-bm';
    b.setAttribute('data-bm-kind', kind);
    b.setAttribute('data-bm-id', id);
    b.innerHTML = IC.bm;
    b.onclick = function (e) { e.stopPropagation(); e.preventDefault(); ssToggleSave(kind, id); };
    return b;
  }
  function decorate() {
    if (!ME) return;
    var blocked = list('blockedUsers');
    if (isEmp()) {
      document.querySelectorAll('.tc-card:not([data-bmd])').forEach(function (card) {
        card.setAttribute('data-bmd', '1');
        var m = /viewProfile\('([^']+)'/.exec(card.getAttribute('onclick') || '');
        if (!m) return;
        var uid = m[1];
        if (blocked.indexOf(uid) >= 0) { card.style.display = 'none'; return; }
        if (uid === ME.uid) return;
        card.appendChild(mkBm('talent', uid));
      });
    } else {
      document.querySelectorAll('.gig-item[data-gid]:not([data-bmd])').forEach(function (item) {
        item.setAttribute('data-bmd', '1');
        var gid = item.getAttribute('data-gid');
        var g = (getGigs() || []).find(function (x) { return x.id === gid; });
        if (g && blocked.indexOf(g.posterUid) >= 0) { item.style.display = 'none'; return; }
        if (g && g.posterUid === ME.uid) return;
        item.appendChild(mkBm('gig', gid));
      });
    }
    refreshBookmarks();
  }
  var _decT = null;
  new MutationObserver(function () {
    if (_decT) return;
    _decT = setTimeout(function () { _decT = null; try { decorate(); } catch (e) {} }, 60);
  }).observe(document.body, { childList: true, subtree: true });

  /* ═════════════════════ SAVED PAGE ════════════════════════════════ */
  window._savedTab = 'saved';
  function renderSaved() {
    var el = pageEl('saved');
    if (!ME) { el.innerHTML = ''; return; }
    var tab = window._savedTab;
    var h = '<div class="section xp-wrap">' + pageHead('Saved', 'Your bookmarks and blocked people');
    h += '<div class="xp-tabs"><button class="' + (tab === 'saved' ? 'on' : '') + '" onclick="_savedTab=\'saved\';renderSaved()">' + (isEmp() ? 'Saved talent' : 'Saved gigs') + ' <span>' + list(isEmp() ? 'savedTalent' : 'savedGigs').length + '</span></button>'
      + '<button class="' + (tab === 'blocked' ? 'on' : '') + '" onclick="_savedTab=\'blocked\';renderSaved()">Blocked <span>' + list('blockedUsers').length + '</span></button></div>';
    h += '<div id="xp-saved-body"></div></div>';
    el.innerHTML = h;
    var body = document.getElementById('xp-saved-body');
    if (tab === 'blocked') return renderBlockedList(body);
    if (isEmp()) {
      var ids = list('savedTalent'), out = '';
      ids.forEach(function (uid) {
        var u = getUser(uid);
        if (u && typeof talentCard === 'function') out += talentCard(u);
      });
      if (!out) out = emptyBox('No saved talent yet', 'Tap the bookmark on any freelancer to keep them here for later.');
      body.innerHTML = out;
    } else {
      var go = function () {
        var ids2 = list('savedGigs'), out2 = '';
        ids2.forEach(function (gid) {
          var g = getGigs().find(function (x) { return x.id === gid; });
          if (!g) {
            out2 += '<div class="xp-row"><div class="xp-main"><div class="xp-name" style="color:var(--td);">Gig no longer available</div></div>'
              + '<button class="xp-btn" onclick="ssToggleSave(\'gig\',\'' + esc(gid) + '\')">Remove</button></div>';
            return;
          }
          var closed = g.status && g.status !== 'open';
          out2 += '<div class="xp-row" style="cursor:pointer;" onclick="showGigDetail(\'' + esc(g.id) + '\')">'
            + '<div class="xp-main"><div class="xp-name">' + esc(g.title) + (closed ? ' <span class="xp-tag">' + esc(g.status) + '</span>' : '') + '</div>'
            + '<div class="xp-meta">' + esc(g.posterName || '') + ' · ' + esc(g.category || '') + ' · ' + esc(g.type || '') + '</div></div>'
            + '<div class="xp-pay">' + esc(g.pay || '') + '</div>'
            + '<button class="ss-bm on xp-bm" data-bm-kind="gig" data-bm-id="' + esc(g.id) + '" onclick="event.stopPropagation();ssToggleSave(\'gig\',\'' + esc(g.id) + '\')">' + IC.bm + '</button></div>';
        });
        if (!out2) out2 = emptyBox('No saved gigs yet', 'Tap the bookmark on any gig to keep it here and apply later.');
        body.innerHTML = out2;
      };
      if (typeof loadGigsToCache === 'function') loadGigsToCache().then(go).catch(go); else go();
    }
  }
  window.renderSaved = renderSaved;
  function emptyBox(t, s) {
    return '<div class="empty"><strong class="empty-title">' + esc(t) + '</strong><div class="empty-sub">' + esc(s) + '</div></div>';
  }
  function renderBlockedList(body) {
    var ids = list('blockedUsers');
    if (!ids.length) { body.innerHTML = emptyBox('Nobody blocked', 'People you block can\'t message you and are hidden from your talent and gig lists.'); return; }
    body.innerHTML = ids.map(function (uid) {
      var u = getUser(uid) || { name: 'Unknown user', uid: uid };
      return '<div class="xp-row">' + avatarHTML(u, 40) + '<div class="xp-main"><div class="xp-name">' + esc(u.name) + '</div><div class="xp-meta">' + esc(u.title || u.role || '') + '</div></div>'
        + '<button class="xp-btn" onclick="ssToggleBlock(\'' + esc(uid) + '\',true)">Unblock</button></div>';
    }).join('');
    ids.forEach(function (uid) { if (!getUser(uid)) ensureUser(uid, function () { if (window._currentPage === 'saved') renderSaved(); }); });
  }

  /* ═════════════════════ BLOCK ═════════════════════════════════════ */
  window.ssToggleBlock = function (uid, silent) {
    if (!ME || !uid || uid === ME.uid) return;
    var blocked = list('blockedUsers').slice(), i = blocked.indexOf(uid);
    var u = getUser(uid) || { name: 'this user' };
    var apply = function () {
      if (i >= 0) blocked.splice(i, 1); else blocked.unshift(uid);
      ownField('blockedUsers', blocked);
      ok(i >= 0 ? 'Unblocked ' + u.name : 'Blocked ' + u.name);
      if (window._currentPage === 'saved') renderSaved();
      if (window._currentPage === 'talent' && typeof renderTalent === 'function') renderTalent();
      if (window._currentPage === 'gigs' && typeof renderGigs === 'function') renderGigs();
    };
    if (i >= 0 || silent) apply();
    else confirmBox('Block ' + u.name + '?', 'They won\'t be able to message you, and they\'ll be hidden from your lists. You can unblock them any time from Saved → Blocked.', 'Block', apply, true);
  };

  /* ═════════════════════ REPORT ════════════════════════════════════ */
  var REASONS = ['Spam or scam', 'Harassment or abuse', 'Fake profile or impersonation', 'Inappropriate content', 'Trying to move payment off-platform', 'Other'];
  window.ssReport = function (type, targetUid, targetId, label) {
    if (!ME) return;
    setModal('<button class="mclose" onclick="closeModal()">✕</button>'
      + '<h3>Report ' + esc(type) + '</h3><p style="margin-bottom:12px;">' + esc(label || '') + '</p>'
      + '<label class="xr-lbl">Reason</label><select id="xr-reason" class="fi no-icon" style="margin-bottom:12px;">'
      + REASONS.map(function (r) { return '<option>' + esc(r) + '</option>'; }).join('') + '</select>'
      + '<label class="xr-lbl">Details <span style="font-weight:400;color:var(--td);">(optional)</span></label>'
      + '<textarea id="xr-details" class="fi no-icon" maxlength="500" rows="4" placeholder="Tell us what happened…" style="height:auto;resize:vertical;margin-bottom:14px;"></textarea>'
      + '<button class="btn" id="xr-send" style="width:100%;">Submit report</button>'
      + '<div style="font-size:10px;color:var(--td);margin-top:10px;line-height:1.5;text-align:center;">Reports are reviewed by the SkillStamp team. The person you report is not told who reported them.</div>');
    var btn = document.getElementById('xr-send');
    btn.onclick = function () {
      var guard = 'xr_' + ME.uid + '_' + type + '_' + (targetId || targetUid);
      try { if (Date.now() - parseInt(localStorage.getItem(guard) || '0', 10) < 86400000) { closeModal(); ok('You already reported this — thank you.'); return; } } catch (e) {}
      btn.disabled = true; btn.textContent = 'Sending…';
      var t = getUser(targetUid) || {};
      var id = 'rep_' + uid8();
      var data = {
        id: id, type: type, targetUid: targetUid || '', targetId: targetId || '', targetName: t.name || label || '',
        reason: document.getElementById('xr-reason').value,
        details: (document.getElementById('xr-details').value || '').slice(0, 500),
        reporterUid: ME.uid, reporterName: ME.name || '', status: 'open', ts: Date.now()
      };
      fns().setDoc(dbRef('reports', id), data).then(function () {
        try { localStorage.setItem(guard, String(Date.now())); } catch (e) {}
        closeModal(); ok('Report sent. Thank you.');
      }).catch(function (e) {
        console.warn('[extras] report failed', e);
        btn.disabled = false; btn.textContent = 'Submit report';
        bad('Could not send the report. Try again.');
      });
    };
  };

  /* menu used on profiles and in chat */
  window.ssUserMenu = function (uid) {
    var u = getUser(uid) || { name: 'this user' };
    var isB = list('blockedUsers').indexOf(uid) >= 0;
    setModal('<button class="mclose" onclick="closeModal()">✕</button><h3>' + esc(u.name) + '</h3>'
      + '<div class="xm-list">'
      + '<button onclick="closeModal();ssReport(\'user\',\'' + esc(uid) + '\',\'' + esc(uid) + '\',\'' + esc(u.name) + '\')">' + IC.flag + ' Report this user</button>'
      + '<button onclick="closeModal();ssToggleBlock(\'' + esc(uid) + '\')">' + IC.ban + ' ' + (isB ? 'Unblock' : 'Block') + ' this user</button>'
      + '</div>');
  };

  /* ═════════════════════ PROFILE ACTIONS ═══════════════════════════ */
  var _vp = window.viewProfile;
  if (typeof _vp === 'function') {
    window.viewProfile = function (uid) {
      var r = _vp.apply(this, arguments);
      try { setTimeout(function () { injectProfileActions(uid); }, 0); } catch (e) {}
      return r;
    };
  }
  function injectProfileActions(uid) {
    var root = document.getElementById('viewprofile-content');
    if (!root || !ME || !uid || uid === ME.uid) return;
    var old = root.querySelector('.xpa'); if (old) old.remove();
    var u = getUser(uid); if (!u) return;
    var banner = root.querySelector('.prf-banner');
    if (!banner) return;
    var showSave = (u.role !== 'employer') && isEmp();
    var bar = document.createElement('div');
    bar.className = 'xpa';
    bar.innerHTML = (showSave ? '<button class="xpa-i ss-bm" data-bm-kind="talent" data-bm-id="' + esc(uid) + '" title="Save" aria-label="Save talent">' + IC.bm + '</button>' : '')
      + '<button class="xpa-i" aria-label="More options" title="More" onclick="ssUserMenu(\'' + esc(uid) + '\')">' + IC.more + '</button>';
    banner.appendChild(bar);
    var sv = bar.querySelector('.ss-bm');
    if (sv) sv.onclick = function (e) { e.stopPropagation(); ssToggleSave('talent', uid); };
    refreshBookmarks();
  }

  /* Report a gig from the gig detail modal */
  var _sgd = window.showGigDetail;
  if (typeof _sgd === 'function') {
    window.showGigDetail = function (gid) {
      var r = _sgd.apply(this, arguments);
      try {
        var g = getGigs().find(function (x) { return x.id === gid; });
        var mc = document.getElementById('mcontent');
        if (g && mc && g.posterUid !== ME.uid && !mc.querySelector('.xg-report')) {
          var a = document.createElement('button');
          a.className = 'xg-report';
          a.innerHTML = IC.flag + ' Report this gig';
          a.onclick = function () { ssReport('gig', g.posterUid, g.id, g.title); };
          mc.appendChild(a);
        }
      } catch (e) {}
      return r;
    };
  }

  /* Block checks when opening a chat */
  var _om = window.openMsg;
  if (typeof _om === 'function') {
    window.openMsg = function (uid) {
      if (ME && uid) {
        if (list('blockedUsers').indexOf(uid) >= 0) { bad('You blocked this person. Unblock them in Saved → Blocked to message.'); return; }
        var o = getUser(uid);
        if (o && Array.isArray(o.blockedUsers) && o.blockedUsers.indexOf(ME.uid) >= 0) { bad('You can\'t message this person.'); return; }
      }
      return _om.apply(this, arguments);
    };
  }

  /* ═════════════════════ CHAT HELPERS (used by 12-messages.js) ═════ */
  window.ssLightbox = function (src) {
    if (!/^data:image\//.test(src || '')) return;
    var d = document.createElement('div');
    d.className = 'xl-box';
    d.innerHTML = '<img src="' + src + '" alt="">';
    d.onclick = function () { d.remove(); };
    document.body.appendChild(d);
  };
  window.ssPickImage = function (cb) {
    var inp = document.createElement('input');
    inp.type = 'file'; inp.accept = 'image/*';
    inp.onchange = function () {
      var f = inp.files && inp.files[0];
      if (!f) return;
      if (!/^image\//.test(f.type)) { bad('Please choose an image.'); return; }
      var rd = new FileReader();
      rd.onload = function () {
        var img = new Image();
        img.onload = function () {
          function enc(max, q) {
            var s = Math.min(1, max / Math.max(img.width, img.height));
            var c = document.createElement('canvas');
            c.width = Math.max(1, Math.round(img.width * s)); c.height = Math.max(1, Math.round(img.height * s));
            var x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(img, 0, 0, c.width, c.height);
            return c.toDataURL('image/jpeg', q);
          }
          var out = enc(900, 0.65);
          if (out.length > 140000) out = enc(640, 0.55);
          if (out.length > 160000) { bad('That image is too large. Try a smaller one.'); return; }
          cb(out);
        };
        img.onerror = function () { bad('Could not read that image.'); };
        img.src = rd.result;
      };
      rd.readAsDataURL(f);
    };
    inp.click();
  };
  window.ssChatMenu = function (uid) { ssUserMenu(uid); };

  /* ═════════════════════ STATS ═════════════════════════════════════ */
  function fmtDur(ms) {
    if (!ms) return '—';
    var m = Math.round(ms / 60000);
    if (m < 60) return m + ' min';
    var h = m / 60;
    if (h < 48) return (Math.round(h * 10) / 10) + ' hr';
    return (Math.round(h / 24 * 10) / 10) + ' days';
  }
  function statCard(label, val, sub) {
    return '<div class="xs-card"><div class="xs-val">' + esc(val) + '</div><div class="xs-lbl">' + esc(label) + '</div>' + (sub ? '<div class="xs-sub">' + esc(sub) + '</div>' : '') + '</div>';
  }
  async function renderStats() {
    var el = pageEl('stats');
    if (!ME) { el.innerHTML = ''; return; }
    var h0 = '<div class="section xp-wrap">' + pageHead(isEmp() ? 'Hiring stats' : 'Your stats', isEmp() ? 'How your gigs are performing' : 'How your profile is performing');
    el.innerHTML = h0 + '<div class="xp-loading">Loading…</div></div>';
    try { if (typeof loadGigsToCache === 'function') await loadGigsToCache(); } catch (e) {}
    var h = h0;
    if (isEmp()) {
      var mine = getGigs().filter(function (g) { return g.posterUid === ME.uid; });
      var applicants = 0, hired = 0, done = 0;
      mine.forEach(function (g) { applicants += (g.applicants || []).length; if (g.hiredUid) hired++; if (g.status === 'completed') done++; });
      h += '<div class="xs-grid">'
        + statCard('Gigs posted', mine.length)
        + statCard('Applicants', applicants, mine.length ? 'avg ' + (Math.round(applicants / mine.length * 10) / 10) + ' per gig' : '')
        + statCard('Freelancers hired', hired)
        + statCard('Gigs completed', done)
        + '</div>';
    } else {
      var apps = ME.applications || [];
      var acc = apps.filter(function (a) { return a.status === 'accepted'; }).length;
      var rej = apps.filter(function (a) { return a.status === 'rejected'; }).length;
      var pend = apps.length - acc - rej;
      var decided = acc + rej;
      var win = decided ? Math.round(acc / decided * 100) + '%' : '—';
      var views = [];
      try {
        var q = fns().query(fns().collection(window.FB_DB, 'notifications'), fns().where('uid', '==', ME.uid));
        var snap = await fns().getDocs(q);
        views = snap.docs.map(function (d) { return d.data(); }).filter(function (n) { return n.type === 'profile_view'; });
      } catch (e) { console.warn('[extras] stats views failed', e); }
      var now = Date.now(), D = 86400000;
      var v7 = views.filter(function (n) { return now - (n.ts || 0) <= 7 * D; }).length;
      var v30 = views.filter(function (n) { return now - (n.ts || 0) <= 30 * D; }).length;
      var viewers = {}; views.forEach(function (n) { viewers[(n.meta && n.meta.viewerUid) || n.fromUid || n.id] = 1; });
      var jobsDone = getGigs().filter(function (g) { return g.hiredUid === ME.uid && g.status === 'completed'; }).length;
      var endorse = getEndorsements().filter(function (e) { return e.toUid === ME.uid; }).length;
      // 14-day sparkline
      var days = [], max = 1, i;
      for (i = 13; i >= 0; i--) {
        var start = new Date(); start.setHours(0, 0, 0, 0); start = start.getTime() - i * D;
        var c = views.filter(function (n) { return n.ts >= start && n.ts < start + D; }).length;
        days.push({ d: new Date(start), c: c }); if (c > max) max = c;
      }
      h += '<div class="xs-grid">'
        + statCard('Profile views (7 days)', v7, v30 + ' in the last 30 days')
        + statCard('Unique viewers', Object.keys(viewers).length, 'all time')
        + statCard('Applications sent', apps.length, pend + ' pending')
        + statCard('Win rate', win, decided ? acc + ' hired of ' + decided + ' decided' : 'No decisions yet')
        + statCard('Jobs completed', jobsDone)
        + statCard('Endorsements', endorse)
        + statCard('Avg. reply time', fmtDur(ME.avgResponseMs), ME.responseCount ? 'across ' + ME.responseCount + ' replies' : 'Reply to messages to build this')
        + statCard('Rating', ME.score ? (Math.round(ME.score * 10) / 10) + ' / 5' : '—', (ME.repPoints || 0) + ' rep points')
        + '</div>';
      h += '<div class="xs-chart"><div class="xs-chart-t">Profile views · last 14 days</div><div class="xs-bars">'
        + days.map(function (x) {
          return '<div class="xs-bar" title="' + x.c + ' on ' + x.d.toLocaleDateString() + '"><div class="xs-fill" style="height:' + Math.round(x.c / max * 100) + '%;' + (x.c ? '' : 'min-height:2px;opacity:.25;') + '"></div><div class="xs-day">' + x.d.getDate() + '</div></div>';
        }).join('') + '</div></div>';
    }
    h += '</div>';
    if (window._currentPage === 'stats') el.innerHTML = h;
  }
  window.renderStats = renderStats;

  /* small entry card on the home screen */
  var _rrh = window.renderRoleHome;
  if (typeof _rrh === 'function') {
    window.renderRoleHome = function () {
      var r = _rrh.apply(this, arguments);
      try { setTimeout(addHomeLinks, 30); } catch (e) {}
      return r;
    };
  }
  function addHomeLinks() {
    var home = document.getElementById('page-home');
    if (!home || !ME || home.querySelector('.xh-links')) return;
    var box = document.createElement('div');
    box.className = 'xh-links';
    box.innerHTML = '<button onclick="showPage(\'stats\')"><span>📊</span> ' + (isEmp() ? 'Hiring stats' : 'My stats') + '</button>'
      + '<button onclick="showPage(\'saved\')"><span>🔖</span> Saved</button>';
    // place right after the hero block
    var hero = home.querySelector('.ss-hero');
    if (hero && hero.parentNode) hero.parentNode.insertBefore(box, hero.nextSibling);
    else home.insertBefore(box, home.firstChild);
  }

  /* ═════════════════════ showPage hook ═════════════════════════════ */
  var _sp = window.showPage;
  window.showPage = function (name) {
    if (name === 'saved' || name === 'stats') pageEl(name); // must exist before showPage activates it
    var r = _sp.apply(this, arguments);
    try {
      if (name === 'saved') renderSaved();
      else if (name === 'stats') renderStats();
    } catch (e) { console.warn('[extras] page render', e); }
    return r;
  };

  /* ═════════════════════ ADMIN: logging ═════════════════════════════ */
  function snapAll() {
    var s = { users: {}, gigs: {}, posts: {}, skills: {} };
    (CACHE.users || []).forEach(function (u) { s.users[u.uid] = { n: u.name, b: u.badgeStatus || '', a: !!u.isAdmin, r: u.repPoints || 0, x: !!u.isBanned }; });
    (CACHE.gigs || []).forEach(function (g) { s.gigs[g.id] = g.title; });
    (CACHE.posts || []).forEach(function (p) { s.posts[p.id] = !!p.flagged; });
    try { (getPending() || []).forEach(function (p) { s.skills[p.id] = { st: p.status, n: p.skill, u: p.uid }; }); } catch (e) {}
    return s;
  }
  function ssLog(action, targetUid, targetName, detail) {
    if (!ME || !ME.isAdmin || !fns()) return;
    var id = 'log_' + uid8();
    fns().setDoc(dbRef('admin_audit_log', id), {
      id: id, adminUid: ME.uid, adminName: ME.name || '', action: action,
      targetUid: targetUid || '', targetName: targetName || '', detail: detail || '', ts: Date.now()
    }).catch(function (e) { console.warn('[extras] audit log failed', e && e.message); });
  }
  window.ssLog = ssLog;
  function diffLog(a, b) {
    Object.keys(a.users).forEach(function (uid) {
      var x = a.users[uid], y = b.users[uid];
      if (!y) { ssLog('delete_user', uid, x.n, 'Account removed'); return; }
      if (x.b !== y.b) {
        var act = y.b === 'suspended' ? 'ban_user' : (x.b === 'suspended' ? 'unban_user' : 'badge_change');
        ssLog(act, uid, y.n, x.b + ' → ' + y.b);
      }
      if (x.x !== y.x) ssLog(y.x ? 'ban_user' : 'unban_user', uid, y.n, 'isBanned ' + x.x + ' → ' + y.x);
      if (x.a !== y.a) ssLog(y.a ? 'promote_admin' : 'demote_admin', uid, y.n, 'Admin ' + (y.a ? 'granted' : 'removed'));
      if (x.r !== y.r) ssLog('rep_change', uid, y.n, x.r + ' → ' + y.r + ' rep points');
    });
    Object.keys(a.gigs).forEach(function (id) { if (!(id in b.gigs)) ssLog('delete_gig', '', a.gigs[id], 'Gig removed'); });
    Object.keys(a.posts).forEach(function (id) {
      if (!(id in b.posts)) ssLog('delete_post', '', id, 'Post removed');
      else if (!a.posts[id] && b.posts[id]) ssLog('flag_post', '', id, 'Post flagged');
    });
    Object.keys(b.skills).forEach(function (id) {
      var x = a.skills[id], y = b.skills[id];
      if (x && x.st !== y.st) {
        var u = getUser(y.u);
        ssLog(y.st === 'approved' ? 'skill_approved' : 'skill_rejected', y.u, u ? u.name : '', y.n || 'skill');
      }
    });
  }
  ['adminApprove', 'adminReject', 'adminSetBadge', 'adminSetBadgeInline', 'adminToggleBanInline', 'adminToggleBanV6',
    'adminAdjRep', 'adminPromoteInline', 'adminDemoteInline', 'adminPromoteFromSelect', 'adminPromote', 'adminSaveEdit',
    'adminSaveUserEdit', 'adminDeleteUser', 'adminDeletePost', 'adminFlagPost', 'adminDeleteGig'].forEach(function (name) {
    var orig = window[name];
    if (typeof orig !== 'function') return;
    window[name] = function () {
      var before = null;
      try { before = snapAll(); } catch (e) {}
      var res = orig.apply(this, arguments);
      var done = function () { try { if (before) diffLog(before, snapAll()); } catch (e) { console.warn('[extras] diff', e); } };
      if (res && typeof res.then === 'function') res.then(function () { setTimeout(done, 300); }, function () {});
      else setTimeout(done, 350);
      return res;
    };
  });

  var ACTION_LABEL = {
    ban_user: ['Banned user', '#dc2626'], unban_user: ['Unbanned user', '#16a34a'], badge_change: ['Changed badge', '#2563eb'],
    promote_admin: ['Made admin', '#9333ea'], demote_admin: ['Removed admin', '#9333ea'], rep_change: ['Adjusted reputation', '#ca8a04'],
    delete_user: ['Deleted account', '#dc2626'], delete_gig: ['Deleted gig', '#dc2626'], delete_post: ['Deleted post', '#dc2626'],
    flag_post: ['Flagged post', '#ca8a04'], skill_approved: ['Approved skill', '#16a34a'], skill_rejected: ['Rejected skill', '#dc2626'],
    report_resolved: ['Resolved report', '#16a34a'], report_dismissed: ['Dismissed report', '#6b7280']
  };
  window.renderAdminActivity = async function () {
    var el = document.getElementById('admtab-activity');
    if (!el) return;
    el.innerHTML = '<div class="xp-loading">Loading activity…</div>';
    var logs = [];
    try { logs = await fbGetAll('admin_audit_log'); } catch (e) {}
    logs.sort(function (a, b) { return (b.ts || 0) - (a.ts || 0); });
    window._admLogs = logs.slice(0, 300);
    var h = '<div class="xa-bar"><input id="xa-q" class="fi no-icon" placeholder="Filter by admin, user or action…" oninput="adminActivityFilter()" style="margin:0;"></div><div id="xa-list"></div>';
    el.innerHTML = h;
    adminActivityFilter();
  };
  window.adminActivityFilter = function () {
    var q = ((document.getElementById('xa-q') || {}).value || '').toLowerCase();
    var box = document.getElementById('xa-list'); if (!box) return;
    var rows = (window._admLogs || []).filter(function (l) {
      if (!q) return true;
      return [l.adminName, l.targetName, l.action, l.detail, (ACTION_LABEL[l.action] || [''])[0]].join(' ').toLowerCase().indexOf(q) >= 0;
    });
    if (!rows.length) { box.innerHTML = '<div class="empty"><strong class="empty-title">No activity recorded</strong><div class="empty-sub">Admin actions will appear here from now on.</div></div>'; return; }
    box.innerHTML = rows.map(function (l) {
      var a = ACTION_LABEL[l.action] || [l.action || 'Action', '#6b7280'];
      return '<div class="xa-row"><span class="xa-dot" style="background:' + a[1] + '"></span><div class="xa-main">'
        + '<div class="xa-t"><strong>' + esc(l.adminName || 'Admin') + '</strong> · ' + esc(a[0]) + (l.targetName ? ' · <strong>' + esc(l.targetName) + '</strong>' : '') + '</div>'
        + (l.detail ? '<div class="xa-d">' + esc(l.detail) + '</div>' : '')
        + '</div><div class="xa-time" title="' + esc(new Date(l.ts).toLocaleString()) + '">' + esc(timeAgo(l.ts)) + '</div></div>';
    }).join('');
  };

  /* ═════════════════════ ADMIN: reports ═════════════════════════════ */
  window._repFilter = 'open';
  window.renderAdminReports = async function () {
    var el = document.getElementById('admtab-reports');
    if (!el) return;
    el.innerHTML = '<div class="xp-loading">Loading reports…</div>';
    var reps = [];
    try { reps = await fbGetAll('reports'); } catch (e) {}
    reps.sort(function (a, b) { return (b.ts || 0) - (a.ts || 0); });
    window._admReports = reps;
    drawReports();
  };
  function drawReports() {
    var el = document.getElementById('admtab-reports'); if (!el) return;
    var all = window._admReports || [], f = window._repFilter;
    var open = all.filter(function (r) { return r.status === 'open'; }).length;
    var rows = all.filter(function (r) { return f === 'all' ? true : (f === 'open' ? r.status === 'open' : r.status !== 'open'); });
    var h = '<div class="xp-tabs" style="margin-bottom:14px;">'
      + ['open', 'closed', 'all'].map(function (k) {
        return '<button class="' + (f === k ? 'on' : '') + '" onclick="_repFilter=\'' + k + '\';_drawReports()">' + (k === 'open' ? 'Open <span>' + open + '</span>' : k === 'closed' ? 'Closed' : 'All') + '</button>';
      }).join('') + '</div>';
    if (!rows.length) h += '<div class="empty"><strong class="empty-title">' + (f === 'open' ? 'No open reports' : 'Nothing here') + '</strong><div class="empty-sub">Reports from users appear here.</div></div>';
    rows.forEach(function (r) {
      var t = r.targetUid ? getUser(r.targetUid) : null;
      var banned = t && t.badgeStatus === 'suspended';
      h += '<div class="xr-card"><div class="xr-top"><span class="xr-tag">' + esc(r.type) + '</span><strong>' + esc(r.reason) + '</strong>'
        + '<span class="xr-time">' + esc(timeAgo(r.ts)) + '</span></div>'
        + '<div class="xr-line">Against <strong>' + esc(r.targetName || '—') + '</strong> · reported by ' + esc(r.reporterName || '—') + '</div>'
        + (r.details ? '<div class="xr-det">' + esc(r.details) + '</div>' : '')
        + (r.status !== 'open' ? '<div class="xr-line" style="color:var(--td);">' + esc(r.status) + (r.resolvedByName ? ' by ' + esc(r.resolvedByName) : '') + (r.resolution ? ' — ' + esc(r.resolution) : '') + '</div>' : '')
        + '<div class="xr-act">'
        + (r.targetUid ? '<button class="xp-btn" onclick="adminViewProfile(\'' + esc(r.targetUid) + '\')">View profile</button>' : '')
        + (r.targetUid && r.type === 'gig' ? '<button class="xp-btn" onclick="showGigDetail(\'' + esc(r.targetId) + '\')">View gig</button>' : '')
        + (r.status === 'open' && r.targetUid && t && !banned ? '<button class="xp-btn danger" onclick="adminReportBan(\'' + esc(r.id) + '\')">Ban user</button>' : '')
        + (r.status === 'open' ? '<button class="xp-btn" onclick="adminReportClose(\'' + esc(r.id) + '\',\'resolved\')">Mark resolved</button>'
          + '<button class="xp-btn" onclick="adminReportClose(\'' + esc(r.id) + '\',\'dismissed\')">Dismiss</button>' : '')
        + '</div></div>';
    });
    el.innerHTML = h;
  }
  window._drawReports = drawReports;
  window.adminReportClose = function (id, st, note) {
    var r = (window._admReports || []).find(function (x) { return x.id === id; });
    if (!r) return;
    var upd = { status: st, resolvedBy: ME.uid, resolvedByName: ME.name || '', resolvedAt: Date.now() };
    if (note) upd.resolution = note;
    fns().updateDoc(dbRef('reports', id), upd).then(function () {
      Object.assign(r, upd);
      ssLog(st === 'resolved' ? 'report_resolved' : 'report_dismissed', r.targetUid, r.targetName, r.reason);
      drawReports();
    }).catch(function () { bad('Could not update the report.'); });
  };
  window.adminReportBan = function (id) {
    var r = (window._admReports || []).find(function (x) { return x.id === id; });
    var u = r && getUser(r.targetUid);
    if (!u) return;
    confirmBox('Ban ' + u.name + '?', 'They will lose access to the platform. The report will be marked resolved.', 'Ban user', function () {
      var prev = u.badgeStatus;
      u.badgeStatus = 'suspended';
      saveUser(u);
      ssLog('ban_user', u.uid, u.name, prev + ' → suspended (from report)');
      adminReportClose(id, 'resolved', 'User banned');
      ok('Banned ' + u.name);
    }, true);
  };

  /* initial render if the user reloads on one of the new pages */
  setTimeout(function () {
    try {
      var p = window._currentPage;
      if (ME && (p === 'saved' || p === 'stats')) showPage(p, true);
    } catch (e) {}
  }, 1500);
})();
