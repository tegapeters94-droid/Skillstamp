// SkillStamp — Notifications (rebuilt)

// ── Icon map ───────────────────────────────────────────────
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
  dispute_raised:'⚠️', dispute_resolved:'⚖️',
  profile_view:'👁️',
  default:'🔔'
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
  html += '<span style="font-family:Syne,sans-serif;font-weight:800;font-size:13px;">Notifications</span>';
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
    html += '<div style="font-size:36px;margin-bottom:10px;">🔔</div>';
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
      html += '<div style="font-family:Syne,sans-serif;font-weight:700;font-size:12px;color:var(--tx);margin-bottom:2px;">' + title + '</div>';
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

