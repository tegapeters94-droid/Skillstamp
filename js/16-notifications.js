// SkillStamp — Notifications (rebuilt)

// ── Icon map ───────────────────────────────────────────────
var NOTIF_ICONS = {
  hired:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>', gig_hired:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>',
  application:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>', gig_application:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>',
  gig_posted:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>',
  verification_approved:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4ade80" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>', verification_rejected:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
  payment:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>',
  account_banned:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>', account_unbanned:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4ade80" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>',
  delivery:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>', revision:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>',
  post_liked:'<svg width="14" height="14" viewBox="0 0 24 24" fill="#ef4444" stroke="none"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>', post_commented:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
  endorsed:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.42 4.58a5.4 5.4 0 0 0-7.65 0l-.77.78-.77-.78a5.4 5.4 0 0 0-7.65 0C1.46 6.7 1.33 10.28 4 13l8 8 8-8c2.67-2.72 2.54-6.3.42-8.42z"/></svg>',
  message:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
  dispute_raised:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#e8c547" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>', dispute_resolved:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/><line x1="4" y1="4" x2="9" y2="9"/></svg>',
  profile_view:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>',
  default:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>'
};

// ── Toggle panel open/close ────────────────────────────────
window.toggleNotifs = function() {
  var panel = document.getElementById('notif-panel');
  if (!panel) return;
  if (panel.classList.contains('show')) {
    closeNotifPanel();
    return;
  }
  // Load latest from Firebase then render
  loadFirebaseNotifs().then(function() {
    renderNotifPanel();
    panel.classList.add('show');
    // Mark all as read
    var n = getNotifs().map(function(x) { return Object.assign({}, x, { read: true }); });
    saveNotifs(n);
    updateNotifBadge();
    // Wire click-outside to close
    setTimeout(function() {
      document.addEventListener('click', _notifOutsideHandler);
    }, 50);
  });
};

window.closeNotifPanel = function closeNotifPanel() {
  var panel = document.getElementById('notif-panel');
  if (panel) panel.classList.remove('show');
  document.removeEventListener('click', _notifOutsideHandler);
}

function _notifOutsideHandler(e) {
  var panel = document.getElementById('notif-panel');
  var bell = e.target.closest('[onclick*="toggleNotifs"]');
  if (panel && !panel.contains(e.target) && !bell) {
    closeNotifPanel();
  }
}

// ── Render panel ───────────────────────────────────────────
function renderNotifPanel() {
  var panel = document.getElementById('notif-panel');
  if (!panel) return;
  var notifs = getNotifs();
  var unread = notifs.filter(function(n) { return !n.read; }).length;

  var html = '';

  // Header
  html += '<div style="display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border-bottom:1px solid var(--br);flex-shrink:0;">';
  html += '<div style="display:flex;align-items:center;gap:8px;">';
  html += '<span style="font-family:Plus Jakarta Sans,sans-serif;font-weight:800;font-size:13px;">Notifications</span>';
  if (unread > 0) html += '<span style="background:var(--acc);color:#fff;font-size:9px;padding:2px 7px;border-radius:10px;font-weight:700;">' + unread + ' new</span>';
  html += '</div>';
  html += '<div style="display:flex;align-items:center;gap:4px;">';
  html += '<button onclick="clearNotifs()" style="background:none;border:none;color:var(--td);font-size:10px;cursor:pointer;padding:4px 8px;">Clear all</button>';
  html += '<button onclick="closeNotifPanel()" style="background:none;border:none;color:var(--td);font-size:18px;cursor:pointer;padding:4px 6px;line-height:1;">✕</button>';
  html += '</div></div>';

  // Body
  html += '<div style="flex:1;overflow-y:auto;">';
  if (!notifs.length) {
    html += '<div style="padding:32px 16px;text-align:center;">';
    html += '<div style="font-size:36px;margin-bottom:10px;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg></div>';
    html += '<div style="font-size:12px;color:var(--td);">All caught up! No notifications yet.</div>';
    html += '</div>';
  } else {
    notifs.slice(0, 40).forEach(function(n) {
      var type = n.type || 'default';
      var icon = NOTIF_ICONS[type] || NOTIF_ICONS.default;
      var title = n.title || 'Notification';
      var msg = n.body || n.msg || '';
      var isUnread = !n.read;
      var metaStr = JSON.stringify(n.meta || {}).replace(/'/g, '&#39;');

      html += '<div onclick="navigateFromNotif(\'' + type + '\',' + metaStr + ')" style="display:flex;align-items:flex-start;gap:11px;padding:12px 16px;border-bottom:1px solid var(--br);cursor:pointer;background:' + (isUnread ? 'rgba(232,197,71,.04)' : 'transparent') + ';transition:background .15s;" onmouseover="this.style.background=\'var(--s2)\'" onmouseout="this.style.background=\'' + (isUnread ? 'rgba(232,197,71,.04)' : 'transparent') + '\'">';
      // Icon circle
      html += '<div style="width:36px;height:36px;border-radius:50%;background:var(--s2);display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;">' + icon + '</div>';
      // Text
      html += '<div style="flex:1;min-width:0;">';
      html += '<div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:700;font-size:12px;color:var(--tx);margin-bottom:2px;">' + title + '</div>';
      if (msg) html += '<div style="font-size:11px;color:var(--td);line-height:1.5;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;">' + msg + '</div>';
      html += '<div style="font-size:9px;color:var(--td);margin-top:4px;">' + timeAgo(n.ts) + '</div>';
      html += '</div>';
      // Unread dot
      if (isUnread) html += '<div style="width:8px;height:8px;border-radius:50%;background:var(--gld);flex-shrink:0;margin-top:4px;"></div>';
      html += '</div>';
    });
  }
  html += '</div>';

  panel.innerHTML = html;
}

// ── Clear — removes from both localStorage AND Firebase ───
window.clearNotifs = function() {
  saveNotifs([]);
  updateNotifBadge();
  // Also delete from Firebase
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
  closeNotifPanel();
  toast('Notifications cleared.');
};

// ── Navigate on tap ────────────────────────────────────────
window.navigateFromNotif = function(type, meta) {
  meta = meta || {};
  closeNotifPanel();

  if (type === 'gig_hired') {
    // Take freelancer straight to chat with client
    if (meta.clientUid) {
      setTimeout(function() { openMsg(meta.clientUid); }, 100);
    } else if (meta.gigId) {
      showPage('gigs');
    } else {
      showPage('gigs');
    }
  } else if (type === 'gig_application') {
    // Take client to their gig so they can review applicants
    showPage('gigs');
    if (meta.gigId) {
      setTimeout(function() {
        var gig = getGigs().find(function(g) { return g.id === meta.gigId; });
        if (gig) openHireModal(meta.gigId);
      }, 400);
    }
  } else if (type === 'gig_posted') {
    // Take freelancer to gigs browse
    showPage('gigs');
  } else if (type === 'payment') {
    showPage('wallet');
  } else if (type === 'message') {
    // Open chat directly
    if (meta.fromUid) {
      setTimeout(function() { openMsg(meta.fromUid); }, 100);
    } else if (meta.cid) {
      var parts = (meta.cid || '').split('_');
      var otherId = parts.find(function(p) { return p !== ME.uid; });
      if (otherId) setTimeout(function() { openMsg(otherId); }, 100);
    }
  } else if (type === 'endorsed') {
    if (meta.fromUid) {
      setTimeout(function() { viewProfile(meta.fromUid); }, 100);
    } else {
      showPage('myprofile');
    }
  } else if (type === 'profile_view') {
    showPage('myprofile');
  } else if (type === 'verification_approved' || type === 'verification_rejected') {
    showPage('myprofile');
  } else if (type === 'delivery') {
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

