// SkillStamp — Notifications (Enhanced v2)
// SAFE ENHANCEMENT — no auth, ME init, or Firestore init changes.
// All fields guarded: (n.read||false), (n.type||'system'), (n.ts||n.createdAt||Date.now())

// ── Icon & colour map ──────────────────────────────────────────────────────
var NOTIF_ICONS = {
  hired:'🎉', gig_hired:'🎉',
  application:'💼', gig_application:'💼',
  gig_posted:'📢',
  verification_approved:'✅', verification_rejected:'❌',
  payment:'💰',
  account_banned:'🚫', account_unbanned:'✅',
  delivery:'📦', revision:'🔄',
  post_liked:'❤️', post_commented:'💬',
  endorsed:'🤝',
  message:'💬',
  proposal:'📋', proposal_accepted:'🎉', proposal_rejected:'📋',
  dispute_raised:'⚠️', dispute_resolved:'⚖️',
  profile_view:'👁️',
  system:'🔔',
  default:'🔔'
};

// Type → badge colour (used in full page and panel)
var NOTIF_TYPE_COLORS = {
  payment:               { bg:'rgba(74,222,128,.12)',  border:'rgba(74,222,128,.2)',  dot:'#4ade80'  },
  gig_hired:             { bg:'rgba(74,222,128,.12)',  border:'rgba(74,222,128,.2)',  dot:'#4ade80'  },
  hired:                 { bg:'rgba(74,222,128,.12)',  border:'rgba(74,222,128,.2)',  dot:'#4ade80'  },
  proposal_accepted:     { bg:'rgba(74,222,128,.12)',  border:'rgba(74,222,128,.2)',  dot:'#4ade80'  },
  verification_approved: { bg:'rgba(232,197,71,.12)',  border:'rgba(232,197,71,.2)',  dot:'#e8c547'  },
  gig_application:       { bg:'rgba(77,159,255,.12)',  border:'rgba(77,159,255,.2)',  dot:'#4d9fff'  },
  application:           { bg:'rgba(77,159,255,.12)',  border:'rgba(77,159,255,.2)',  dot:'#4d9fff'  },
  message:               { bg:'rgba(77,159,255,.12)',  border:'rgba(77,159,255,.2)',  dot:'#4d9fff'  },
  proposal:              { bg:'rgba(77,159,255,.12)',  border:'rgba(77,159,255,.2)',  dot:'#4d9fff'  },
  verification_rejected: { bg:'rgba(239,68,68,.10)',   border:'rgba(239,68,68,.2)',   dot:'#ef4444'  },
  account_banned:        { bg:'rgba(239,68,68,.10)',   border:'rgba(239,68,68,.2)',   dot:'#ef4444'  },
  dispute_raised:        { bg:'rgba(239,68,68,.10)',   border:'rgba(239,68,68,.2)',   dot:'#ef4444'  },
  profile_view:          { bg:'rgba(232,197,71,.08)',  border:'rgba(232,197,71,.15)', dot:'#e8c547'  },
  default:               { bg:'rgba(255,255,255,.05)', border:'var(--br)',            dot:'var(--gld)'}
};

// ── Safe timestamp helper ──────────────────────────────────────────────────
function _nTs(n) {
  return n.ts || n.createdAt || 0;
}

// ── Relative time (safe) ───────────────────────────────────────────────────
function _nTimeAgo(n) {
  var ts = _nTs(n);
  if (!ts) return '';
  var diff = Date.now() - ts;
  if (diff < 60000)     return 'Just now';
  if (diff < 3600000)   return Math.floor(diff / 60000) + ' min ago';
  if (diff < 86400000)  return Math.floor(diff / 3600000) + 'h ago';
  if (diff < 604800000) return Math.floor(diff / 86400000) + 'd ago';
  return new Date(ts).toLocaleDateString('en-GB', { day:'numeric', month:'short' });
}

// ── Sort notifications: high priority first, then newest ──────────────────
function _sortNotifs(notifs) {
  var pMap = { high: 0, normal: 1, low: 2 };
  return (notifs || []).slice().sort(function(a, b) {
    var pa = pMap[a.priority || 'normal'];
    var pb = pMap[b.priority || 'normal'];
    if (pa !== pb) return pa - pb;
    return _nTs(b) - _nTs(a);
  });
}

// ── Build a single notification row (used in both panel & page) ────────────
function _buildNotifRow(n, isPage) {
  if (!n) return '';
  var type    = n.type  || 'default';
  var icon    = NOTIF_ICONS[type] || NOTIF_ICONS.default;
  var colours = NOTIF_TYPE_COLORS[type] || NOTIF_TYPE_COLORS.default;
  var title   = n.title || 'Notification';
  var msg     = n.body  || n.msg || '';
  var isUnread = !(n.read || false);
  var timeStr  = _nTimeAgo(n);
  // meta is URL-encoded so quotes inside the JSON can never break the onclick attribute
  var metaStr  = encodeURIComponent(JSON.stringify(n.meta || {})).replace(/'/g, '%27');
  var nid      = (n.id || '').replace(/'/g, '');

  // Priority badge
  var priBadge = '';
  if (n.priority === 'high') {
    priBadge = '<span style="font-size:8px;background:rgba(239,68,68,.12);border:1px solid rgba(239,68,68,.25);color:#ef4444;padding:1px 6px;border-radius:8px;font-family:Plus Jakarta Sans,sans-serif;font-weight:700;margin-left:5px;vertical-align:middle;">URGENT</span>';
  }

  var rowStyle = isPage
    ? 'display:flex;align-items:flex-start;gap:12px;padding:14px 16px;border-bottom:1px solid var(--br);cursor:pointer;background:' + (isUnread ? 'rgba(232,197,71,.04)' : 'transparent') + ';transition:background .15s;'
    : 'display:flex;align-items:flex-start;gap:11px;padding:12px 16px;border-bottom:1px solid var(--br);cursor:pointer;background:' + (isUnread ? 'rgba(232,197,71,.04)' : 'transparent') + ';transition:background .15s;';

  var html = '<div onclick="_handleNotifTap(\'' + type + '\',\'' + metaStr + '\',\'' + nid + '\')" style="' + rowStyle + '" onmouseover="this.style.background=\'var(--s2)\'" onmouseout="this.style.background=\'' + (isUnread ? 'rgba(232,197,71,.04)' : 'transparent') + '\'">';

  // Icon circle
  html += '<div style="width:36px;height:36px;border-radius:10px;background:' + colours.bg + ';border:1px solid ' + colours.border + ';display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;">' + icon + '</div>';

  // Body
  html += '<div style="flex:1;min-width:0;">';
  html += '<div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:700;font-size:12px;color:var(--tx);margin-bottom:2px;">' + title + priBadge + '</div>';
  if (msg) html += '<div style="font-size:11px;color:var(--td);line-height:1.5;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;">' + msg + '</div>';
  html += '<div style="font-size:9px;color:var(--td);margin-top:4px;">' + timeStr + '</div>';
  html += '</div>';

  // Unread dot
  if (isUnread) {
    html += '<div style="width:7px;height:7px;border-radius:50%;background:' + colours.dot + ';flex-shrink:0;margin-top:5px;"></div>';
  }

  html += '</div>';
  return html;
}

// ── Unified tap handler (panel + page) ────────────────────────────────────
window._handleNotifTap = function(type, meta, nid) {
  if (typeof meta === 'string') { try { meta = JSON.parse(decodeURIComponent(meta)); } catch (e) { meta = {}; } }
  meta = meta || {};
  // Mark single notification as read
  if (nid) _markNotifRead(nid);
  // Close panel if open
  var panel = document.getElementById('notif-panel');
  if (panel) panel.classList.remove('show');
  // Navigate
  navigateFromNotif(type, meta);
};

// ── Mark single notif as read ─────────────────────────────────────────────
function _markNotifRead(nid) {
  if (!nid || !ME) return;
  var notifs = getNotifs();
  var changed = false;
  notifs = notifs.map(function(n) {
    if ((n.id || '') === nid && !n.read) { changed = true; return Object.assign({}, n, { read: true }); }
    return n;
  });
  if (changed) {
    saveNotifs(notifs);
    updateNotifBadge();
    // Update in Firestore safely
    if (window.FB_FNS && window.FB_DB) {
      try {
        window.FB_FNS.updateDoc(
          window.FB_FNS.doc(window.FB_DB, 'notifications', nid),
          { read: true }
        ).catch(function(){});
      } catch(e) {}
    }
  }
}

// ── Mark ALL as read ──────────────────────────────────────────────────────
window.markAllNotifsRead = function() {
  if (!ME) return;
  var notifs = getNotifs().map(function(n) { return Object.assign({}, n, { read: true }); });
  saveNotifs(notifs);
  updateNotifBadge();
  // Firestore batch update (best-effort)
  if (window.FB_FNS && window.FB_DB) {
    try {
      var q = window.FB_FNS.query(
        window.FB_FNS.collection(window.FB_DB, 'notifications'),
        window.FB_FNS.where('uid', '==', ME.uid),
        window.FB_FNS.where('read', '==', false)
      );
      window.FB_FNS.getDocs(q).then(function(snap) {
        snap.forEach(function(d) {
          window.FB_FNS.updateDoc(d.ref, { read: true }).catch(function(){});
        });
      }).catch(function(){});
    } catch(e) {}
  }
  // Re-render wherever we are
  var page = document.getElementById('page-notifications');
  if (page && page.classList.contains('active')) renderNotificationsPage();
  else renderNotifPanel();
  toast('All notifications marked as read.');
};

// ── Real-time listener (runs only after ME is ready) ──────────────────────
var _notifRealtimeUnsub = null;
var _notifSnapCount = 0;

window.startNotifRealtimeListener = function() {
  if (!ME || !ME.uid) return;
  if (_notifRealtimeUnsub) { try { _notifRealtimeUnsub(); } catch(e) {} _notifRealtimeUnsub = null; }
  _notifSnapCount = 0;
  if (!window.FB_FNS || !window.FB_DB) return;
  try {
    var q = window.FB_FNS.query(
      window.FB_FNS.collection(window.FB_DB, 'notifications'),
      window.FB_FNS.where('uid', '==', ME.uid),
      window.FB_FNS.limit(50)
    );
    _notifRealtimeUnsub = window.FB_FNS.onSnapshot(q, function(snap) {
      if (!ME || !ME.uid) return;
      var fresh = snap.docs.map(function(d) { return Object.assign({ id: d.id }, d.data()); });
      if (!fresh.length) { _notifSnapCount++; return; }
      // Merge with local (local may have entries not yet in Firebase)
      var existing = getNotifs();
      var existingIds = existing.map(function(n) { return n.id || n.ts; });
      // Pop up genuinely new, unread notices from other people (never on the first load of the listener)
      if (_notifSnapCount > 0) {
        fresh.forEach(function(n) {
          var lid = n.id || n.ts;
          if (existingIds.indexOf(lid) < 0 && !(n.read || false) && n.fromUid !== ME.uid && (Date.now() - _nTs(n)) < 120000) {
            if (typeof window.showNotifPopup === 'function') window.showNotifPopup(n);
          }
        });
      }
      _notifSnapCount++;
      fresh.forEach(function(n) {
        var lid = n.id || n.ts;
        if (existingIds.indexOf(lid) < 0) existing.unshift(n);
        else {
          // Update read state from Firebase (another device may have marked it read)
          var idx = existing.findIndex(function(x) { return (x.id || x.ts) === lid; });
          if (idx >= 0) existing[idx] = Object.assign({}, existing[idx], { read: n.read || false });
        }
      });
      saveNotifs(existing.slice(0, 50));
      updateNotifBadge();
      // Live-update if notif page is open
      var pg = document.getElementById('page-notifications');
      if (pg && pg.classList.contains('active')) renderNotificationsPage();
    }, function(err) { console.warn('Notif listener error', err); });
  } catch(e) { console.warn('startNotifRealtimeListener failed', e); }
};

// ── Stop listener on logout ───────────────────────────────────────────────
window.stopNotifRealtimeListener = function() {
  if (_notifRealtimeUnsub) { try { _notifRealtimeUnsub(); } catch(e) {} _notifRealtimeUnsub = null; }
};

// ── Bell icon → navigate to notifications page ────────────────────────────
window.toggleNotifs = function() {
  showPage('notifications');
};

window.closeNotifPanel = function() {
  var panel = document.getElementById('notif-panel');
  if (panel) panel.classList.remove('show');
  document.removeEventListener('click', _notifOutsideHandler);
};

function _notifOutsideHandler(e) {
  var panel = document.getElementById('notif-panel');
  var bell  = e.target.closest('[onclick*="toggleNotifs"]');
  if (panel && !panel.contains(e.target) && !bell) closeNotifPanel();
}

// ── Panel (small popup — kept for backward compat, no longer opened by bell) ──
function renderNotifPanel() {
  var panel = document.getElementById('notif-panel');
  if (!panel) return;
  var notifs  = _sortNotifs(getNotifs());
  var unread  = notifs.filter(function(n) { return !(n.read || false); }).length;

  var html = '';
  // Header
  html += '<div style="display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border-bottom:1px solid var(--br);flex-shrink:0;">';
  html += '<div style="display:flex;align-items:center;gap:8px;">';
  html += '<span style="font-family:Plus Jakarta Sans,sans-serif;font-weight:800;font-size:13px;">Notifications</span>';
  if (unread > 0) html += '<span style="background:var(--acc);color:#fff;font-size:9px;padding:2px 7px;border-radius:10px;font-weight:700;">' + unread + ' new</span>';
  html += '</div>';
  html += '<div style="display:flex;align-items:center;gap:4px;">';
  if (unread > 0) html += '<button onclick="markAllNotifsRead()" style="background:none;border:none;color:var(--gld);font-size:9px;cursor:pointer;padding:4px 8px;font-family:Plus Jakarta Sans,sans-serif;font-weight:700;">Mark all read</button>';
  html += '<button onclick="clearNotifs()" style="background:none;border:none;color:var(--td);font-size:10px;cursor:pointer;padding:4px 8px;">Clear all</button>';
  html += '<button onclick="closeNotifPanel()" style="background:none;border:none;color:var(--td);font-size:18px;cursor:pointer;padding:4px 6px;line-height:1;">✕</button>';
  html += '</div></div>';

  // Body
  html += '<div style="flex:1;overflow-y:auto;">';
  if (!notifs.length) {
    html += '<div style="padding:32px 16px;text-align:center;">';
    html += '<div style="font-size:36px;margin-bottom:10px;">🎉</div>';
    html += '<div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:700;font-size:13px;margin-bottom:4px;">You\'re all caught up!</div>';
    html += '<div style="font-size:11px;color:var(--td);">No new notifications.</div>';
    html += '</div>';
  } else {
    notifs.slice(0, 20).forEach(function(n) { html += _buildNotifRow(n, false); });
  }
  html += '</div>';
  panel.innerHTML = html;
}

// ── Helpers for the redesigned page + pop-ups ───────────────────────────────
// Titles/bodies can contain text typed by other users, so everything is escaped.
// Numeric HTML entities used by a few built-in titles (e.g. &#x2B50;) are decoded first.
function _nxDecode(t) {
  return String(t == null ? '' : t)
    .replace(/&#x([0-9a-f]+);/gi, function(m, h) { try { return String.fromCodePoint(parseInt(h, 16)); } catch (e) { return ''; } })
    .replace(/&#(\d+);/g, function(m, d) { try { return String.fromCodePoint(parseInt(d, 10)); } catch (e) { return ''; } });
}
function _nxEsc(t) {
  return _nxDecode(t).replace(/[&<>"']/g, function(c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
}
// Leading emoji in titles is replaced by a proper icon, so drop it.
function _nxCleanTitle(t) {
  var d = _nxDecode(t || 'Notification').replace(/^[^\p{L}\p{N}$"'(]+/u, '').trim();
  return d || 'Notification';
}
var _NX_CAT = {
  hired:'gigs', gig_hired:'gigs', gig_posted:'gigs', gig_application:'gigs', application:'gigs', delivery:'gigs', revision:'gigs',
  dispute_raised:'gigs', dispute_resolved:'gigs', proposal:'gigs', proposal_accepted:'gigs', proposal_rejected:'gigs',
  message:'messages', payment:'payments'
};
var _NX_FILTERS = [['all','All'],['unread','Unread'],['gigs','Gigs'],['messages','Messages'],['payments','Payments'],['account','Account']];
var _NX_PATH = {
  gigs:'<rect x="2.5" y="7" width="19" height="13" rx="2.5"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><path d="M2.5 13h19"/>',
  messages:'<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
  payments:'<rect x="2.5" y="5" width="19" height="14" rx="2.5"/><path d="M2.5 10h19"/><path d="M6.5 15h3"/>',
  proposal:'<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h4"/>',
  verified:'<path d="M12 2.5l2.4 1.7 2.9-.2 1 2.7 2.4 1.7-.9 2.8.9 2.8-2.4 1.7-1 2.7-2.9-.2L12 21.5l-2.4-1.7-2.9.2-1-2.7-2.4-1.7.9-2.8-.9-2.8 2.4-1.7 1-2.7 2.9.2z"/><path d="M8.5 12l2.5 2.5 4.5-5"/>',
  alert:'<path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
  eye:'<path d="M1.5 12S5.5 5 12 5s10.5 7 10.5 7-4 7-10.5 7S1.5 12 1.5 12z"/><circle cx="12" cy="12" r="3"/>',
  users:'<path d="M17 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9.5" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>',
  box:'<path d="M21 8l-9-5-9 5v8l9 5 9-5z"/><path d="M3.3 7.5L12 12.5l8.7-5M12 22V12.5"/>',
  refresh:'<path d="M21 12a9 9 0 0 0-15.5-6.2L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 15.5 6.2L21 16"/><path d="M21 21v-5h-5"/>',
  bell:'<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>'
};
// type → [icon, tone]   tone: g=green b=blue a=amber r=red n=neutral
var _NX_TYPE = {
  hired:['gigs','g'], gig_hired:['gigs','g'], gig_posted:['gigs','b'], gig_application:['gigs','b'], application:['gigs','b'],
  delivery:['box','b'], revision:['refresh','a'], dispute_raised:['alert','r'], dispute_resolved:['verified','g'],
  proposal:['proposal','b'], proposal_accepted:['proposal','g'], proposal_rejected:['proposal','r'],
  message:['messages','b'], payment:['payments','g'], profile_view:['eye','a'], endorsed:['users','a'],
  verification_approved:['verified','g'], verification_rejected:['alert','r'], account_banned:['alert','r'], account_unbanned:['verified','g'],
  post_liked:['users','a'], post_commented:['messages','b'], system:['bell','n']
};
function _nxIcon(type, size) {
  var m = _NX_TYPE[type] || ['bell', 'n'];
  return '<svg viewBox="0 0 24 24" width="' + (size || 20) + '" height="' + (size || 20) + '" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + _NX_PATH[m[0]] + '</svg>';
}
function _nxTone(type) { return (_NX_TYPE[type] || ['bell', 'n'])[1]; }
function _nxCat(type) { return _NX_CAT[type] || 'account'; }
// Small round avatar of the sender when we know who it is.
function _nxAvatar(n, size) {
  try {
    var u = n.fromUid && typeof getUser === 'function' ? getUser(n.fromUid) : null;
    if (!u || (ME && u.uid === ME.uid)) return '';
    if (u.avatar && /^(data:image\/|https?:)/.test(u.avatar)) return '<img class="nx-av" src="' + _nxEsc(u.avatar) + '" alt="" style="width:' + size + 'px;height:' + size + 'px;">';
    var g = u.gradient || '#1a6b3c';
    return '<span class="nx-av" style="width:' + size + 'px;height:' + size + 'px;background:linear-gradient(135deg,' + _nxEsc(g) + ',' + _nxEsc(g) + '99);">' + _nxEsc((u.name || '?').charAt(0).toUpperCase()) + '</span>';
  } catch (e) { return ''; }
}
function _nxLead(n, size) {
  var type = n.type || 'system';
  var av = _nxAvatar(n, size);
  var tile = '<span class="nx-ic tone-' + _nxTone(type) + '" style="width:' + (av ? 20 : size) + 'px;height:' + (av ? 20 : size) + 'px;' + (av ? 'border-radius:50%;' : '') + '">' + _nxIcon(type, av ? 12 : Math.round(size * 0.46)) + '</span>';
  return av ? '<span class="nx-lead" style="width:' + size + 'px;height:' + size + 'px;">' + av + '<span class="nx-badge">' + tile + '</span></span>'
            : '<span class="nx-lead" style="width:' + size + 'px;height:' + size + 'px;">' + tile + '</span>';
}
function _nxRow(n) {
  var type = n.type || 'system';
  var unread = !(n.read || false);
  var metaStr = encodeURIComponent(JSON.stringify(n.meta || {})).replace(/'/g, '%27');
  var nid = String(n.id || '').replace(/[^\w-]/g, '');
  var body = n.body || n.msg || '';
  return '<div class="nx-row' + (unread ? ' unread' : '') + '" role="button" tabindex="0" onclick="_handleNotifTap(\'' + String(type).replace(/[^\w]/g, '') + '\',\'' + metaStr + '\',\'' + nid + '\')">'
    + _nxLead(n, 46)
    + '<div class="nx-main"><div class="nx-title">' + _nxEsc(_nxCleanTitle(n.title)) + '</div>'
    + (body ? '<div class="nx-body">' + _nxEsc(body) + '</div>' : '')
    + '<div class="nx-time">' + _nxEsc(_nTimeAgo(n)) + '</div></div>'
    + (unread ? '<span class="nx-dot" aria-label="Unread"></span>' : '')
    + (nid ? '<button class="nx-x" aria-label="Dismiss" title="Dismiss" onclick="event.stopPropagation();dismissNotif(\'' + nid + '\')"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg></button>' : '')
    + '</div>';
}

window._nFilter = window._nFilter || 'all';
window.setNotifFilter = function(k) { window._nFilter = k; renderNotificationsPage(); };

window.dismissNotif = function(nid) {
  if (!nid || !ME) return;
  saveNotifs(getNotifs().filter(function(n) { return (n.id || '') !== nid; }));
  updateNotifBadge();
  try {
    if (window.FB_FNS && window.FB_DB) window.FB_FNS.deleteDoc(window.FB_FNS.doc(window.FB_DB, 'notifications', nid)).catch(function() {});
  } catch (e) {}
  var pg = document.getElementById('page-notifications');
  if (pg && pg.classList.contains('active')) renderNotificationsPage();
};

window.askNotifPermission = function() {
  try {
    if (!('Notification' in window)) return;
    Notification.requestPermission().then(function() { renderNotificationsPage(); });
  } catch (e) {}
};

var _nxClearArmed = false;
window.clearNotifsConfirm = function() {
  if (!_nxClearArmed) {
    _nxClearArmed = true;
    var b = document.getElementById('nx-clear'); if (b) { b.textContent = 'Tap again to confirm'; b.classList.add('armed'); }
    setTimeout(function() { _nxClearArmed = false; var b2 = document.getElementById('nx-clear'); if (b2) { b2.textContent = 'Clear all'; b2.classList.remove('armed'); } }, 3500);
    return;
  }
  _nxClearArmed = false;
  clearNotifs();
};

// ── Full notifications page (redesigned) ───────────────────────────────────
window.renderNotificationsPage = function() {
  if (!ME) return;
  var page = document.getElementById('page-notifications');
  if (!page) return;

  var all = _sortNotifs(getNotifs());
  // newest first inside the page (priority sorting is only for the old panel)
  all = all.slice().sort(function(a, b) { return _nTs(b) - _nTs(a); });
  var unreadAll = all.filter(function(n) { return !(n.read || false); }).length;
  var f = window._nFilter || 'all';
  var shown = all.filter(function(n) {
    if (f === 'all') return true;
    if (f === 'unread') return !(n.read || false);
    return _nxCat(n.type || 'system') === f;
  });

  var h = '<div class="nx-wrap">';
  h += '<div class="nx-head"><div><div class="nx-h1">Notifications</div><div class="nx-sub">'
     + (unreadAll ? unreadAll + ' unread' : 'You\'re all caught up') + '</div></div><div class="nx-acts">'
     + (unreadAll ? '<button class="nx-btn primary" onclick="markAllNotifsRead()">Mark all as read</button>' : '')
     + (all.length ? '<button class="nx-btn" id="nx-clear" onclick="clearNotifsConfirm()">Clear all</button>' : '')
     + '</div></div>';

  // desktop alerts prompt
  try {
    if ('Notification' in window && Notification.permission === 'default') {
      h += '<div class="nx-perm"><div><strong>Turn on desktop alerts</strong><span>Get a notification even when SkillStamp is in another tab.</span></div>'
         + '<button class="nx-btn primary" onclick="askNotifPermission()">Enable</button></div>';
    }
  } catch (e) {}

  h += '<div class="nx-chips">' + _NX_FILTERS.map(function(c) {
    var count = c[0] === 'unread' && unreadAll ? ' <span>' + unreadAll + '</span>' : '';
    return '<button class="' + (f === c[0] ? 'on' : '') + '" onclick="setNotifFilter(\'' + c[0] + '\')">' + c[1] + count + '</button>';
  }).join('') + '</div>';

  if (!shown.length) {
    h += '<div class="nx-empty"><div class="nx-empty-ic"><svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' + _NX_PATH.bell + '</svg></div>'
       + '<div class="nx-empty-t">' + (all.length ? 'Nothing here' : 'No notifications yet') + '</div>'
       + '<div class="nx-empty-s">' + (all.length ? 'No notifications match this filter.' : 'When something important happens — a hire, a message, a payment — it shows up here.') + '</div></div>';
  } else {
    var today = new Date(); today.setHours(0, 0, 0, 0);
    var yest = new Date(today); yest.setDate(yest.getDate() - 1);
    var week = new Date(today); week.setDate(week.getDate() - 7);
    var groups = [['Today', []], ['Yesterday', []], ['This week', []], ['Earlier', []]];
    shown.forEach(function(n) {
      var d = new Date(_nTs(n)); d.setHours(0, 0, 0, 0);
      var t = d.getTime();
      if (t >= today.getTime()) groups[0][1].push(n);
      else if (t === yest.getTime()) groups[1][1].push(n);
      else if (t > week.getTime()) groups[2][1].push(n);
      else groups[3][1].push(n);
    });
    groups.forEach(function(g) {
      if (!g[1].length) return;
      h += '<div class="nx-group">' + g[0] + '</div><div class="nx-card">' + g[1].map(_nxRow).join('') + '</div>';
    });
  }
  h += '</div>';
  page.innerHTML = h;
};

// ── In-app pop-up notifications ────────────────────────────────────────────
window.showNotifPopup = function(n) {
  try {
    if (!n || !ME) return;
    var type = n.type || 'system';
    // don't pop up for the thing the person is already looking at
    var pg = document.getElementById('page-notifications');
    if (pg && pg.classList.contains('active')) return;
    if (type === 'message' && document.getElementById('chat-feed') && n.meta && n.meta.cid) {
      var parts = String(n.meta.cid).split('_');
      if (parts.indexOf(n.fromUid) >= 0) return;
    }
    var wrap = document.getElementById('np-wrap');
    if (!wrap) { wrap = document.createElement('div'); wrap.id = 'np-wrap'; wrap.className = 'np-wrap'; document.body.appendChild(wrap); }
    var metaStr = encodeURIComponent(JSON.stringify(n.meta || {})).replace(/'/g, '%27');
    var nid = String(n.id || '').replace(/[^\w-]/g, '');
    var el = document.createElement('div');
    el.className = 'np-card';
    el.setAttribute('role', 'status');
    el.innerHTML = _nxLead(n, 42)
      + '<div class="np-main"><div class="np-title">' + _nxEsc(_nxCleanTitle(n.title)) + '</div>'
      + ((n.body || n.msg) ? '<div class="np-body">' + _nxEsc(n.body || n.msg) + '</div>' : '') + '</div>'
      + '<button class="np-x" aria-label="Close"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg></button>'
      + '<span class="np-bar"></span>';
    var gone = false;
    function close() { if (gone) return; gone = true; el.classList.remove('in'); setTimeout(function() { if (el.parentNode) el.parentNode.removeChild(el); }, 220); }
    el.onclick = function(e) {
      if (e.target.closest('.np-x')) { close(); return; }
      close();
      _handleNotifTap(String(type).replace(/[^\w]/g, ''), metaStr, nid);
    };
    wrap.appendChild(el);
    // keep at most 3 on screen
    while (wrap.children.length > 3) wrap.removeChild(wrap.firstChild);
    requestAnimationFrame(function() { el.classList.add('in'); });
    var timer = setTimeout(close, 6500);
    el.onmouseenter = function() { clearTimeout(timer); el.classList.add('hold'); };
    el.onmouseleave = function() { el.classList.remove('hold'); timer = setTimeout(close, 2500); };

    // Browser notification when the tab is in the background
    try {
      if (document.hidden && 'Notification' in window && Notification.permission === 'granted') {
        var bn = new Notification(_nxCleanTitle(n.title), { body: _nxDecode(n.body || n.msg || ''), tag: nid || undefined });
        bn.onclick = function() { window.focus(); _handleNotifTap(String(type).replace(/[^\w]/g, ''), metaStr, nid); bn.close(); };
      }
    } catch (e) {}
  } catch (e) { console.warn('popup failed', e); }
};

// ── Clear (unchanged logic, kept here) ────────────────────────────────────
window.clearNotifs = function() {
  if (!ME) return;
  saveNotifs([]);
  updateNotifBadge();
  if (ME && ME.uid && window.FB_FNS && window.FB_DB) {
    try {
      var q = window.FB_FNS.query(
        window.FB_FNS.collection(window.FB_DB, 'notifications'),
        window.FB_FNS.where('uid', '==', ME.uid)
      );
      window.FB_FNS.getDocs(q).then(function(snap) {
        snap.forEach(function(d) {
          window.FB_FNS.deleteDoc(window.FB_FNS.doc(window.FB_DB, 'notifications', d.id)).catch(function(){});
        });
      }).catch(function(){});
    } catch(e) {}
  }
  var page = document.getElementById('page-notifications');
  if (page && page.classList.contains('active')) renderNotificationsPage();
  else renderNotifPanel();
  toast('Notifications cleared.');
};

// ── Navigate on tap — every notification type opens the thing it is about ──
function _nGo(fn, delay) { setTimeout(function() { try { fn(); } catch (e) { console.warn('notif nav failed', e); } }, delay || 120); }

// Open a gig's detail (with the Apply button). Refreshes the gig list first if
// the gig is not in memory yet (e.g. posted a moment ago by someone else).
function _nOpenGig(gigId) {
  showPage('gigs');
  if (!gigId) return;
  var open = function() {
    var g = getGigs().find(function(x) { return x.id === gigId; });
    if (g && typeof showGigDetail === 'function') showGigDetail(gigId);
    else toast('That gig is no longer available.', 'bad');
  };
  if (getGigs().some(function(x) { return x.id === gigId; })) { _nGo(open, 250); return; }
  if (typeof loadGigsToCache === 'function') {
    Promise.resolve(loadGigsToCache()).then(function() { _nGo(open, 100); }).catch(function() { _nGo(open, 100); });
  } else { _nGo(open, 250); }
}

window.navigateFromNotif = function(type, meta) {
  meta = meta || {};
  closeNotifPanel();
  // Some notifications store their kind in meta.type (e.g. type 'hired' → 'gig_hired')
  if (type === 'hired') type = 'gig_hired';
  if (type === 'application') type = 'gig_application';

  if (type === 'gig_posted') {
    _nOpenGig(meta.gigId);                                   // → the gig, with Apply button
  } else if (type === 'gig_hired') {
    if (meta.clientUid) _nGo(function() { openMsg(meta.clientUid); });   // → chat with the client
    else if (meta.gigId) _nGo(function() { openGigWorkspace(meta.gigId); });
    else showPage('gigs');
  } else if (type === 'gig_application') {
    showPage('gigs');                                         // → review applicants
    if (meta.gigId) _nGo(function() { if (getGigs().some(function(g) { return g.id === meta.gigId; })) openHireModal(meta.gigId); }, 400);
  } else if (type === 'payment') {
    showPage('wallet');
  } else if (type === 'message') {
    var otherId = meta.fromUid;
    if (!otherId && meta.cid) {
      otherId = String(meta.cid).split('_').find(function(p) { return p !== (ME && ME.uid); });
    }
    if (otherId) _nGo(function() { openMsg(otherId); });      // → the DM, ready to reply
    else showPage('home');
  } else if (type === 'proposal' || type === 'proposal_rejected') {
    showPage('gigs');
    _nGo(function() { if (typeof switchGigTab === 'function') switchGigTab('proposals'); }, 300);
  } else if (type === 'proposal_accepted') {
    if (meta.gigId) _nGo(function() { openGigWorkspace(meta.gigId); });
    else { showPage('gigs'); _nGo(function() { if (typeof switchGigTab === 'function') switchGigTab('proposals'); }, 300); }
  } else if (type === 'endorsed') {
    if (meta.fromUid) _nGo(function() { viewProfile(meta.fromUid); });   // → the person who endorsed you
    else showPage('myprofile');
  } else if (type === 'profile_view') {
    if (meta.viewerUid) _nGo(function() { viewProfile(meta.viewerUid); });   // → the person who viewed you
    else showPage('myprofile');
  } else if (type === 'verification_approved' || type === 'verification_rejected' || type === 'system') {
    showPage('myprofile');
  } else if (type === 'delivery' || type === 'revision' || type === 'dispute_raised' || type === 'dispute_resolved') {
    if (meta.gigId) _nGo(function() { openGigWorkspace(meta.gigId); });
    else showPage('gigs');
  } else if (type === 'post_liked' || type === 'post_commented') {
    showPage('home');
  } else {
    showPage('home');
  }
};
