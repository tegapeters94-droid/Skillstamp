// SkillStamp — Admin Analytics Tab (v1)
// Renders the Analytics tab inside the existing admin panel.
// Called by adminTab('analytics') in 21-admin.js after patching.
// All rendering is isolated — failures never crash the parent admin panel.

(function (global) {
'use strict';

// ── Guard ───────────────────────────────────────────────────────────────────
function _guard() {
  return global.ME && global.ME.isAdmin === true;
}

// ── Stat card ───────────────────────────────────────────────────────────────
function _stat(label, val, col, sub) {
  return '<div style="background:var(--s);border:1px solid var(--br);border-radius:10px;padding:12px;text-align:center;">'
    + '<div style="font-family:Plus Jakarta Sans,sans-serif;font-size:22px;font-weight:800;color:' + (col || 'var(--fg)') + ';">' + val + '</div>'
    + '<div style="font-size:10px;color:var(--td);margin-top:2px;">' + label + '</div>'
    + (sub ? '<div style="font-size:9px;color:var(--td);margin-top:1px;">' + sub + '</div>' : '')
    + '</div>';
}

// ── Section header ──────────────────────────────────────────────────────────
function _shead(icon, label) {
  return '<div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:700;font-size:11px;'
    + 'text-transform:uppercase;letter-spacing:.08em;color:var(--td);margin:16px 0 8px;">'
    + icon + ' ' + label + '</div>';
}

// ── Horizontal bar chart row ────────────────────────────────────────────────
function _bar(label, count, maxCount, col) {
  var pct = maxCount > 0 ? Math.round((count / maxCount) * 100) : 0;
  return '<div style="margin-bottom:8px;">'
    + '<div style="display:flex;justify-content:space-between;font-size:10px;margin-bottom:3px;">'
    + '<span style="color:var(--tx);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:70%;">' + label + '</span>'
    + '<span style="color:var(--td);font-weight:700;">' + count + '</span>'
    + '</div>'
    + '<div style="height:4px;background:var(--s2);border-radius:2px;overflow:hidden;">'
    + '<div style="height:100%;width:' + pct + '%;background:' + (col || 'var(--gld)') + ';border-radius:2px;transition:width .4s;"></div>'
    + '</div></div>';
}

// ── CTR badge ───────────────────────────────────────────────────────────────
function _ctrBadge(pct) {
  var col = pct >= 10 ? '#4ade80' : pct >= 5 ? '#e8c547' : '#ff6b35';
  return '<span style="background:' + col + ';color:#000;font-size:10px;font-weight:800;'
    + 'padding:3px 8px;border-radius:20px;">' + pct + '%</span>';
}

// ── Loading skeleton ─────────────────────────────────────────────────────────
function _loading() {
  return '<div style="padding:40px;text-align:center;color:var(--td);">'
    + '<div style="font-size:28px;margin-bottom:10px;">📊</div>'
    + '<div style="font-size:13px;font-weight:600;">Loading analytics…</div>'
    + '<div style="font-size:11px;margin-top:4px;">Fetching last 7 days of data</div>'
    + '</div>';
}

// ── Error fallback ───────────────────────────────────────────────────────────
function _error(msg) {
  return '<div style="padding:30px;text-align:center;color:var(--td);">'
    + '<div style="font-size:28px;margin-bottom:8px;">⚠️</div>'
    + '<div style="font-size:12px;">' + (msg || 'Analytics unavailable') + '</div>'
    + '</div>';
}

// ── Resolve user name from uid ───────────────────────────────────────────────
function _userName(uid) {
  if (!uid) return 'Unknown';
  var u = (typeof getCachedUser === 'function')
    ? getCachedUser(uid)
    : (global.CACHE && global.CACHE.users || []).find(function (x) { return x.uid === uid; });
  return u ? (u.name || 'Unknown') : uid.slice(0, 8) + '…';
}

// ── Resolve gig title from id ────────────────────────────────────────────────
function _gigTitle(id) {
  if (!id) return 'Unknown';
  var g = (typeof getCachedGig === 'function')
    ? getCachedGig(id)
    : (global.CACHE && global.CACHE.gigs || []).find(function (x) { return x.id === id; });
  return g ? (g.title || 'Untitled Gig').slice(0, 40) : id.slice(0, 12) + '…';
}

// ══════════════════════════════════════════════════════════════════════════
//  MAIN RENDER FUNCTION
// ══════════════════════════════════════════════════════════════════════════

global.renderAdminAnalytics = async function () {
  if (!_guard()) return;

  var el = document.getElementById('admtab-analytics');
  if (!el) return;

  // Show loading state immediately
  el.innerHTML = _loading();

  var events, agg;
  try {
    events = await global.fetchAnalyticsData();
    if (!events) { el.innerHTML = _error('Could not load event data.'); return; }
    agg = global.aggregateAnalytics(events);
    if (!agg)   { el.innerHTML = _error('Aggregation failed.'); return; }
  } catch (e) {
    console.warn('[AdminAnalytics] fetch failed:', e);
    el.innerHTML = _error('Analytics fetch error. Check Firestore rules.');
    return;
  }

  var users = (typeof getAllUsers === 'function') ? getAllUsers() : (global.CACHE && global.CACHE.users || []);
  var gigs  = (typeof getGigs   === 'function') ? getGigs()   : (global.CACHE && global.CACHE.gigs  || []);

  var html = '';

  // Refresh button
  html += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">';
  html += '<div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:800;font-size:13px;">Last 7 Days · ' + events.length + ' events</div>';
  html += '<button onclick="invalidateAnalyticsCache();renderAdminAnalytics();" '
    + 'style="background:var(--s);border:1px solid var(--br);border-radius:6px;padding:6px 12px;'
    + 'font-size:11px;font-family:Plus Jakarta Sans,sans-serif;font-weight:700;color:var(--fg);cursor:pointer;">🔄 Refresh</button>';
  html += '</div>';

  // ── SECTION A: Platform Overview ──────────────────────────────────────────
  html += _shead('🌐', 'Platform Overview');
  html += '<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:9px;margin-bottom:16px;">';
  html += _stat('Total Users',     users.length,              'var(--gld)');
  html += _stat('Active (7d)',      agg.activeUsersCount,      'var(--grn)');
  html += _stat('Total Gigs',       gigs.length,               'var(--blu)');
  html += _stat('Applications',     agg.applications,          'var(--acc)');
  html += _stat('Profile Views',    agg.profileViews,          'var(--pur)');
  html += _stat('Gig Clicks',       agg.gigClicks,             'var(--gld)');
  html += _stat('Conversations',    agg.messageInits,          'var(--grn)');
  html += _stat('Searches',         agg.searches,              'var(--blu)');
  html += '</div>';

  // ── SECTION B: User Engagement ────────────────────────────────────────────
  html += _shead('👁️', 'Most Viewed Profiles');
  if (agg.topProfilesList.length) {
    html += '<div style="background:var(--s);border:1px solid var(--br);border-radius:10px;padding:12px;margin-bottom:14px;">';
    var maxPv = agg.topProfilesList[0].count;
    agg.topProfilesList.forEach(function (item) {
      html += _bar(_userName(item.id), item.count, maxPv, 'var(--pur)');
    });
    html += '</div>';
  } else {
    html += '<div style="color:var(--td);font-size:11px;margin-bottom:14px;">No profile views tracked yet.</div>';
  }

  // ── SECTION C: Gig Performance ────────────────────────────────────────────
  html += _shead('💼', 'Most Clicked Gigs');
  if (agg.topGigsList.length) {
    html += '<div style="background:var(--s);border:1px solid var(--br);border-radius:10px;padding:12px;margin-bottom:14px;">';
    var maxGc = agg.topGigsList[0].count;
    agg.topGigsList.forEach(function (item) {
      html += _bar(_gigTitle(item.id), item.count, maxGc, 'var(--gld)');
    });
    html += '</div>';
  } else {
    html += '<div style="color:var(--td);font-size:11px;margin-bottom:14px;">No gig clicks tracked yet.</div>';
  }

  // Category breakdown
  if (agg.topCategoryList.length) {
    html += _shead('📂', 'Category Engagement');
    html += '<div style="background:var(--s);border:1px solid var(--br);border-radius:10px;padding:12px;margin-bottom:14px;">';
    var maxCat = agg.topCategoryList[0].count;
    agg.topCategoryList.forEach(function (item) {
      html += _bar(item.id, item.count, maxCat, 'var(--blu)');
    });
    html += '</div>';
  }

  // ── SECTION D: Search Intelligence ───────────────────────────────────────
  html += _shead('🔍', 'Search Intelligence');
  html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-bottom:12px;">';
  html += _stat('Total Searches',    agg.searches,           'var(--gld)');
  html += _stat('No-Result Searches',agg.noResultSearches,   agg.noResultSearches > 0 ? 'var(--acc)' : 'var(--td)',
    agg.searches > 0 ? Math.round(agg.noResultSearches / agg.searches * 100) + '% of total' : '');
  html += '</div>';

  if (agg.topSearchList.length) {
    html += '<div style="background:var(--s);border:1px solid var(--br);border-radius:10px;padding:12px;margin-bottom:14px;">';
    var maxSr = agg.topSearchList[0].count;
    agg.topSearchList.forEach(function (item) {
      var isNoResult = false; // could cross-reference but keep simple
      html += _bar(item.id, item.count, maxSr, 'var(--grn)');
    });
    html += '</div>';
  } else {
    html += '<div style="color:var(--td);font-size:11px;margin-bottom:14px;">No searches tracked yet.</div>';
  }

  // ── SECTION E: Recommendation Performance ────────────────────────────────
  html += _shead('🎯', 'Recommendation Performance');
  html += '<div style="background:var(--s);border:1px solid var(--br);border-radius:10px;padding:14px;margin-bottom:14px;">';
  html += '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:12px;">';
  html += _stat('Impressions',  agg.recImpressions, 'var(--blu)');
  html += _stat('Clicks',       agg.recClicks,      'var(--grn)');
  html += '<div style="background:var(--s2);border:1px solid var(--br);border-radius:10px;padding:12px;text-align:center;">'
    + '<div style="font-size:12px;font-weight:700;color:var(--td);margin-bottom:6px;">CTR</div>'
    + _ctrBadge(agg.recCTRPct)
    + '</div>';
  html += '</div>';
  if (agg.recImpressions === 0) {
    html += '<div style="font-size:11px;color:var(--td);">No recommendation impressions tracked yet. Algorithm events will appear here once users browse the talent and gig pages.</div>';
  }
  html += '</div>';

  // ── SECTION F: Messaging Insights ────────────────────────────────────────
  html += _shead('💬', 'Messaging Activity');
  html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-bottom:16px;">';
  html += _stat('Conversations Started', agg.messageInits, 'var(--pur)');
  html += _stat('Unique Chatters',
    events.filter(function(e){return e.type==='message_init';})
           .map(function(e){return e.actorUid;})
           .filter(function(v,i,a){return a.indexOf(v)===i;}).length,
    'var(--gld)');
  html += '</div>';

  el.innerHTML = html;
};

}(window));
