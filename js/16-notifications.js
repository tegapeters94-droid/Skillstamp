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
  var metaStr  = JSON.stringify(n.meta || {}).replace(/'/g, '&#39;');
  var nid      = (n.id || '').replace(/'/g, '');

  // Priority badge
  var priBadge = '';
  if (n.priority === 'high') {
    priBadge = '<span style="font-size:8px;background:rgba(239,68,68,.12);border:1px solid rgba(239,68,68,.25);color:#ef4444;padding:1px 6px;border-radius:8px;font-family:Plus Jakarta Sans,sans-serif;font-weight:700;margin-left:5px;vertical-align:middle;">URGENT</span>';
  }

  var rowStyle = isPage
    ? 'display:flex;align-items:flex-start;gap:12px;padding:14px 16px;border-bottom:1px solid var(--br);cursor:pointer;background:' + (isUnread ? 'rgba(232,197,71,.04)' : 'transparent') + ';transition:background .15s;'
    : 'display:flex;align-items:flex-start;gap:11px;padding:12px 16px;border-bottom:1px solid var(--br);cursor:pointer;background:' + (isUnread ? 'rgba(232,197,71,.04)' : 'transparent') + ';transition:background .15s;';

  var html = '<div onclick="_handleNotifTap(\'' + type + '\',' + metaStr + ',\'' + nid + '\')" style="' + rowStyle + '" onmouseover="this.style.background=\'var(--s2)\'" onmouseout="this.style.background=\'' + (isUnread ? 'rgba(232,197,71,.04)' : 'transparent') + '\'">';

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

window.startNotifRealtimeListener = function() {
  if (!ME || !ME.uid) return;
  if (_notifRealtimeUnsub) { try { _notifRealtimeUnsub(); } catch(e) {} _notifRealtimeUnsub = null; }
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
      if (!fresh.length) return;
      // Merge with local (local may have entries not yet in Firebase)
      var existing = getNotifs();
      var existingIds = existing.map(function(n) { return n.id || n.ts; });
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

// ── Full notifications page ────────────────────────────────────────────────
window.renderNotificationsPage = function() {
  if (!ME) return;
  var page = document.getElementById('page-notifications');
  if (!page) return;

  var notifs = _sortNotifs(getNotifs());
  var unread = notifs.filter(function(n) { return !(n.read || false); }).length;

  var html = '';

  // Sticky header
  html += '<div style="position:sticky;top:0;z-index:10;background:var(--s);border-bottom:1px solid var(--br);padding:14px 16px;display:flex;align-items:center;gap:12px;">';
  html += '<div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:800;font-size:17px;flex:1;">Notifications';
  if (unread > 0) html += ' <span style="font-size:11px;background:var(--acc);color:#fff;padding:2px 8px;border-radius:10px;font-weight:700;vertical-align:middle;">' + unread + '</span>';
  html += '</div>';
  if (unread > 0) {
    html += '<button onclick="markAllNotifsRead()" style="background:rgba(232,197,71,.1);border:1px solid rgba(232,197,71,.25);color:var(--gld);font-family:Plus Jakarta Sans,sans-serif;font-weight:700;font-size:11px;padding:6px 12px;border-radius:8px;cursor:pointer;white-space:nowrap;">✓ Mark all read</button>';
  }
  html += '<button onclick="clearNotifs()" style="background:var(--s2);border:1px solid var(--br);color:var(--td);font-family:Plus Jakarta Sans,sans-serif;font-weight:600;font-size:11px;padding:6px 12px;border-radius:8px;cursor:pointer;">Clear all</button>';
  html += '</div>';

  if (!notifs.length) {
    // Empty state
    html += '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:80px 24px;text-align:center;">';
    html += '<div style="width:72px;height:72px;border-radius:20px;background:rgba(232,197,71,.08);border:1px solid rgba(232,197,71,.15);display:flex;align-items:center;justify-content:center;font-size:32px;margin-bottom:18px;">🎉</div>';
    html += '<div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:800;font-size:18px;margin-bottom:6px;">You\'re all caught up!</div>';
    html += '<div style="font-size:13px;color:var(--td);line-height:1.6;max-width:260px;">No new notifications. When something important happens, it will appear here.</div>';
    html += '</div>';
  } else {
    // Group by date
    var today    = new Date(); today.setHours(0,0,0,0);
    var yesterday = new Date(today); yesterday.setDate(yesterday.getDate()-1);

    var groups = [
      { label: 'Today',    items: [] },
      { label: 'Yesterday',items: [] },
      { label: 'Earlier',  items: [] }
    ];

    notifs.forEach(function(n) {
      var ts = _nTs(n);
      var d  = new Date(ts); d.setHours(0,0,0,0);
      if (d.getTime() === today.getTime())     groups[0].items.push(n);
      else if (d.getTime() === yesterday.getTime()) groups[1].items.push(n);
      else                                      groups[2].items.push(n);
    });

    groups.forEach(function(g) {
      if (!g.items.length) return;
      html += '<div style="padding:10px 16px 4px;font-size:10px;font-weight:700;color:var(--td);text-transform:uppercase;letter-spacing:.08em;background:var(--bg);">' + g.label + '</div>';
      g.items.forEach(function(n) { html += _buildNotifRow(n, true); });
    });
  }

  page.innerHTML = html;
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

// ── Navigate on tap (unchanged logic) ─────────────────────────────────────
window.navigateFromNotif = function(type, meta) {
  meta = meta || {};
  closeNotifPanel();

  if (type === 'gig_hired') {
    if (meta.clientUid) setTimeout(function() { openMsg(meta.clientUid); }, 100);
    else showPage('gigs');
  } else if (type === 'gig_application') {
    showPage('gigs');
    if (meta.gigId) {
      setTimeout(function() {
        var gig = getGigs().find(function(g) { return g.id === meta.gigId; });
        if (gig) openHireModal(meta.gigId);
      }, 400);
    }
  } else if (type === 'gig_posted') {
    showPage('gigs');
  } else if (type === 'payment') {
    showPage('wallet');
  } else if (type === 'message') {
    if (meta.fromUid) setTimeout(function() { openMsg(meta.fromUid); }, 100);
    else if (meta.cid) {
      var parts = (meta.cid || '').split('_');
      var otherId = parts.find(function(p) { return p !== (ME && ME.uid); });
      if (otherId) setTimeout(function() { openMsg(otherId); }, 100);
    }
  } else if (type === 'proposal' || type === 'proposal_accepted' || type === 'proposal_rejected') {
    showPage('gigs');
    setTimeout(function() {
      if (typeof switchGigTab === 'function') switchGigTab('proposals');
    }, 300);
  } else if (type === 'endorsed') {
    if (meta.fromUid) setTimeout(function() { viewProfile(meta.fromUid); }, 100);
    else showPage('myprofile');
  } else if (type === 'profile_view') {
    showPage('myprofile');
  } else if (type === 'verification_approved' || type === 'verification_rejected') {
    showPage('myprofile');
  } else if (type === 'delivery' || type === 'revision') {
    if (meta.gigId) setTimeout(function() { openGigWorkspace(meta.gigId); }, 100);
    else showPage('gigs');
  } else if (type === 'dispute_raised' || type === 'dispute_resolved') {
    if (meta.gigId) setTimeout(function() { openGigWorkspace(meta.gigId); }, 100);
    else showPage('gigs');
  } else if (type === 'post_liked' || type === 'post_commented') {
    showPage('home');
  } else if (type === 'account_banned' || type === 'account_unbanned') {
    showPage('home');
  } else {
    showPage('home');
  }
};
