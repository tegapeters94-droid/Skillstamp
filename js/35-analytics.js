// SkillStamp — Analytics & Event Tracking System (v1)
// Centralized event tracking, analytics data layer, and admin analytics dashboard.
// NEVER crashes the app — every function is wrapped in try/catch.
// Writes are rate-limited to prevent spam. All reads are admin-only.

(function (global) {
'use strict';

// ═══════════════════════════════════════════════════════════════════════════
//  CONFIG
// ═══════════════════════════════════════════════════════════════════════════
var ANALYTICS_COLLECTION = 'analytics_events';
var DEBOUNCE_MS          = 2000;   // min ms between identical events
var MAX_LOCAL_EVENTS     = 200;    // local buffer before flushing
var _lastEvents          = {};     // key → timestamp (dedup guard)
var _localBuffer         = [];     // events queued for batch write

// ═══════════════════════════════════════════════════════════════════════════
//  CORE EVENT TRACKER
// ═══════════════════════════════════════════════════════════════════════════

// trackEvent(type, payload) — the single write point for all analytics
global.trackEvent = function (type, payload) {
  if (!type) return;
  // Gate: don't track if no Firebase or no user (pre-login)
  if (!window.FB_FNS || !window.FB_DB) return;

  // Dedup: skip if same type+target was tracked within DEBOUNCE_MS
  var dedupeKey = type + ':' + (payload && (payload.targetId || payload.gigId || payload.query || ''));
  var now = Date.now();
  if (_lastEvents[dedupeKey] && (now - _lastEvents[dedupeKey]) < DEBOUNCE_MS) return;
  _lastEvents[dedupeKey] = now;

  var event = {
    type:      type,
    userId:    (global.ME && global.ME.uid) || 'anon',
    userRole:  (global.ME && global.ME.role) || '',
    targetId:  (payload && payload.targetId)  || null,
    metadata:  payload || {},
    createdAt: now,
    // Remove large fields from metadata to keep docs small
  };
  // Strip binary data from metadata
  if (event.metadata.dataUrl) delete event.metadata.dataUrl;

  // Write to Firestore (best-effort, never blocks UI)
  try {
    window.FB_FNS.addDoc(
      window.FB_FNS.collection(window.FB_DB, ANALYTICS_COLLECTION),
      event
    ).catch(function () {});  // silent failure
  } catch (e) {}

  // Also buffer locally for in-session analytics
  _localBuffer.push(event);
  if (_localBuffer.length > MAX_LOCAL_EVENTS) _localBuffer.shift();

  // Mirror to behavioral signals (32-algorithm.js integration)
  try {
    if (type === 'gig_view'      && payload && typeof recordSignal === 'function') recordSignal('gig_view',      payload);
    if (type === 'profile_view'  && payload && typeof recordSignal === 'function') recordSignal('profile_view',  payload);
    if (type === 'search'        && payload && typeof recordSignal === 'function') recordSignal('search',        payload);
    if (type === 'cat_interact'  && payload && typeof recordSignal === 'function') recordSignal('cat_interact',  payload);
  } catch (e) {}
};

// ── Typed helpers ─────────────────────────────────────────────────────────

global.trackProfileView = function (targetUid, targetName) {
  global.trackEvent('profile_view', { targetId: targetUid, targetName: targetName || '' });
};

global.trackGigClick = function (gigId, gigTitle, category) {
  global.trackEvent('gig_view', { targetId: gigId, gigId: gigId, gigTitle: gigTitle || '', category: category || '' });
};

global.trackSearch = function (query, resultCount) {
  global.trackEvent('search', { query: query, resultCount: resultCount || 0, targetId: 'search:'+query });
  if (!resultCount) global.trackEvent('search_no_results', { query: query });
};

global.trackRecommendationClick = function (type, targetId, position) {
  global.trackEvent('recommendation_click', { targetId: targetId, recType: type, position: position || 0 });
};

global.trackRecommendationImpression = function (type, items) {
  global.trackEvent('recommendation_impression', { recType: type, count: (items||[]).length });
};

global.trackMessageInitiation = function (toUid) {
  global.trackEvent('message_initiation', { targetId: toUid });
};

global.trackApplication = function (gigId, gigTitle) {
  global.trackEvent('gig_application', { targetId: gigId, gigId: gigId, gigTitle: gigTitle || '' });
};

global.trackGigPost = function (gigId, category) {
  global.trackEvent('gig_post', { targetId: gigId, category: category || '' });
};

global.trackPageView = function (pageName) {
  global.trackEvent('page_view', { targetId: pageName });
};

// ═══════════════════════════════════════════════════════════════════════════
//  ANALYTICS DATA FETCHER (admin only)
// ═══════════════════════════════════════════════════════════════════════════

// Fetch events for a given type in last N days
async function _fetchEvents(types, days) {
  if (!global.ME || !global.ME.isAdmin) return [];
  if (!window.FB_FNS || !window.FB_DB) return [];
  var since = Date.now() - (days || 30) * 86400000;
  try {
    var typesArr = Array.isArray(types) ? types : [types];
    // Firestore: query by createdAt >= since (no composite index needed — just one field)
    // Simple limit-only query — no where() to avoid index requirements
    var q = window.FB_FNS.query(
      window.FB_FNS.collection(window.FB_DB, ANALYTICS_COLLECTION),
      window.FB_FNS.limit(2000)
    );
    var snap = await window.FB_FNS.getDocs(q);
    var events = snap.docs.map(function (d) { return d.data(); });
    // Filter by date and type client-side (no index needed)
    events = events.filter(function (e) { return !e.createdAt || e.createdAt >= since; });
    if (typesArr.length) {
      events = events.filter(function (e) { return typesArr.indexOf(e.type) >= 0; });
    }
    return events;
  } catch (e) {
    console.warn('[SkillStamp:Analytics] _fetchEvents failed:', e.code || e.message);
    // Return local in-session buffer so dashboard still shows something
    return _localBuffer.slice();
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//  ANALYTICS DASHBOARD RENDERER
// ═══════════════════════════════════════════════════════════════════════════

global.renderAnalyticsDashboard = async function (containerId) {
  var el = document.getElementById(containerId || 'admtab-analytics');
  if (!el) return;
  if (!global.ME || !global.ME.isAdmin) {
    el.innerHTML = '<div style="padding:40px;text-align:center;color:var(--td);">🔒 Admin only.</div>';
    return;
  }

  // Loading state
  el.innerHTML = _loadingHTML('Loading analytics…');

  try {
    // Fetch last 30 days of events
    var allEvents = await _fetchEvents([], 30);

    // Supplement with local buffer (in-session events not yet in Firestore)
    var combined = allEvents.concat(_localBuffer);

    // Deduplicate by createdAt+type+userId
    var seen = {};
    combined = combined.filter(function (e) {
      var k = e.type + ':' + e.userId + ':' + e.createdAt;
      if (seen[k]) return false;
      seen[k] = true;
      return true;
    });

    el.innerHTML = _buildAnalyticsHTML(combined);
  } catch (e) {
    console.warn('[SkillStamp:Analytics] render error:', e);
    // Show empty dashboard instead of error — better UX
    try { el.innerHTML = _buildAnalyticsHTML(_localBuffer.slice()); } catch(e2) {
      el.innerHTML = '<div style="padding:40px;text-align:center;color:var(--td);font-size:12px;">📊<br><br>Analytics will appear here as users interact with the platform.</div>';
    }
  }
};

// ── Build full analytics HTML from events array ───────────────────────────
function _buildAnalyticsHTML(events) {
  var users = typeof getAllUsers === 'function' ? getAllUsers() : [];
  var gigs  = typeof getGigs    === 'function' ? getGigs()    : [];

  // ── Event type counters ───────────────────────────────────
  function byType(t) {
    return events.filter(function (e) { return e.type === t; });
  }
  function countBy(arr, key) {
    var map = {};
    arr.forEach(function (e) {
      var k = (e.metadata && e.metadata[key]) || e[key] || 'unknown';
      map[k] = (map[k] || 0) + 1;
    });
    return Object.entries(map).sort(function (a, b) { return b[1] - a[1]; });
  }

  var profileViews    = byType('profile_view');
  var gigViews        = byType('gig_view');
  var searches        = byType('search');
  var noResults       = byType('search_no_results');
  var recClicks       = byType('recommendation_click');
  var recImpressions  = byType('recommendation_impression');
  var msgInits        = byType('message_initiation');
  var applications    = byType('gig_application');
  var pageViews       = byType('page_view');

  // Unique active users (any event in period)
  var activeUids = {};
  events.forEach(function (e) { if (e.userId && e.userId !== 'anon') activeUids[e.userId] = true; });
  var activeCount = Object.keys(activeUids).length;

  // CTR = recClicks / recImpressions
  var recTotal = recImpressions.reduce(function (s, e) { return s + ((e.metadata && e.metadata.count) || 1); }, 0);
  var ctr = recTotal > 0 ? Math.round((recClicks.length / recTotal) * 100) : 0;

  // ── Stat card helper ──────────────────────────────────────
  function sCard(label, val, col, sub) {
    return '<div style="background:var(--s);border:1px solid var(--br);border-radius:12px;padding:14px;text-align:center;">'
      + '<div style="font-family:Plus Jakarta Sans,sans-serif;font-size:24px;font-weight:800;color:' + (col || 'var(--gld)') + ';">' + val + '</div>'
      + '<div style="font-size:10px;color:var(--td);margin-top:3px;">' + label + '</div>'
      + (sub ? '<div style="font-size:9px;color:var(--td);margin-top:2px;">' + sub + '</div>' : '')
      + '</div>';
  }

  // ── Ranked list helper ────────────────────────────────────
  function sRanked(entries, labelFn, max) {
    if (!entries.length) return '<div style="padding:16px;text-align:center;font-size:11px;color:var(--td);">No data yet</div>';
    var maxVal = entries[0][1] || 1;
    return entries.slice(0, max || 6).map(function (entry, i) {
      var lbl = labelFn ? labelFn(entry[0]) : entry[0];
      var pct = Math.round((entry[1] / maxVal) * 100);
      return '<div style="padding:8px 12px;border-bottom:1px solid var(--br);">'
        + '<div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:4px;">'
        + '<span style="color:var(--tx);font-weight:600;">' + (i + 1) + '. ' + lbl + '</span>'
        + '<span style="color:var(--gld);font-weight:700;">' + entry[1] + '</span></div>'
        + '<div style="height:3px;background:var(--s2);border-radius:2px;"><div style="height:100%;width:' + pct + '%;background:var(--gld);border-radius:2px;"></div></div>'
        + '</div>';
    }).join('');
  }

  // ── Section card helper ───────────────────────────────────
  function sSection(title, icon, body) {
    return '<div style="background:var(--s);border:1px solid var(--br);border-radius:12px;margin-bottom:14px;overflow:hidden;">'
      + '<div style="padding:12px 14px;border-bottom:1px solid var(--br);display:flex;align-items:center;gap:8px;">'
      + '<span style="font-size:16px;">' + icon + '</span>'
      + '<span style="font-family:Plus Jakarta Sans,sans-serif;font-weight:700;font-size:13px;">' + title + '</span>'
      + '</div>'
      + body
      + '</div>';
  }

  var h = '';

  // ── SECTION A — Platform Overview ────────────────────────
  h += '<div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:700;font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:var(--td);margin-bottom:8px;">Last 30 Days</div>';
  h += '<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-bottom:16px;">';
  h += sCard('Active Users',   activeCount,       'var(--gld)',    'interacted with platform');
  h += sCard('Profile Views',  profileViews.length, 'var(--blu)');
  h += sCard('Gig Views',      gigViews.length,     '#4ade80');
  h += sCard('Searches',       searches.length,     'var(--pur)');
  h += sCard('Messages Started', msgInits.length,   '#ff6b35');
  h += sCard('Applications',   applications.length, 'var(--acc)');
  h += sCard('Rec Clicks',     recClicks.length,    'var(--gld)',   ctr + '% CTR');
  h += sCard('No-Result Searches', noResults.length, '#ef4444');
  h += '</div>';

  // ── SECTION B — Profile Engagement ───────────────────────
  var topViewed = countBy(profileViews, 'targetId');
  function profileLabel(uid) {
    var u = users.find(function (x) { return x.uid === uid; });
    return u ? (u.name || uid) : uid;
  }
  h += sSection('User Engagement', '👤',
    sRanked(topViewed, profileLabel, 6)
  );

  // ── SECTION C — Gig Performance ───────────────────────────
  var topGigViews = countBy(gigViews, 'gigId');
  function gigLabel(id) {
    var g = gigs.find(function (x) { return x.id === id; });
    return g ? (g.title || id).slice(0, 32) : id;
  }
  var topApplied = countBy(applications, 'gigId');
  var catEngagement = countBy(gigViews, 'category');

  h += sSection('Gig Performance', '💼',
    '<div style="padding:8px 12px;border-bottom:1px solid var(--br);font-size:10px;font-weight:700;color:var(--td);text-transform:uppercase;">Most Viewed</div>'
    + sRanked(topGigViews, gigLabel, 5)
    + '<div style="padding:8px 12px;border-bottom:1px solid var(--br);font-size:10px;font-weight:700;color:var(--td);text-transform:uppercase;">Most Applied</div>'
    + sRanked(topApplied, gigLabel, 5)
    + '<div style="padding:8px 12px;border-bottom:1px solid var(--br);font-size:10px;font-weight:700;color:var(--td);text-transform:uppercase;">Top Categories</div>'
    + sRanked(catEngagement, null, 6)
  );

  // ── SECTION D — Search Intelligence ──────────────────────
  var topQueries   = countBy(searches,   'query');
  var noResultQ    = countBy(noResults,  'query');
  h += sSection('Search Intelligence', '🔍',
    '<div style="padding:8px 12px;border-bottom:1px solid var(--br);font-size:10px;font-weight:700;color:var(--td);text-transform:uppercase;">Top Searches</div>'
    + sRanked(topQueries, null, 8)
    + '<div style="padding:8px 12px;border-bottom:1px solid var(--br);font-size:10px;font-weight:700;color:var(--td);text-transform:uppercase;">Dead-End Searches (no results)</div>'
    + sRanked(noResultQ, null, 6)
  );

  // ── SECTION E — Recommendation Performance ────────────────
  var recTypeBreakdown = countBy(recClicks, 'recType');
  h += sSection('Recommendation Performance', '🎯',
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:12px;">'
    + sCard('Clicks',      recClicks.length, 'var(--gld)')
    + sCard('CTR',         ctr + '%',        ctr > 10 ? '#4ade80' : ctr > 5 ? 'var(--gld)' : '#ef4444', 'clicks / impressions')
    + '</div>'
    + '<div style="padding:8px 12px;border-top:1px solid var(--br);font-size:10px;font-weight:700;color:var(--td);text-transform:uppercase;">By Type</div>'
    + sRanked(recTypeBreakdown, null, 5)
  );

  // ── SECTION F — Messaging Insights ────────────────────────
  var msgByUser    = countBy(msgInits, 'userId');
  var msgToTarget  = countBy(msgInits, 'targetId');
  h += sSection('Messaging Insights', '💬',
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:12px;">'
    + sCard('Conversations Started', msgInits.length, 'var(--blu)')
    + sCard('Unique Messagers', Object.keys(countBy(msgInits,'userId').reduce(function(a,e){a[e[0]]=1;return a;},{})).length, '#4ade80')
    + '</div>'
    + '<div style="padding:8px 12px;border-top:1px solid var(--br);font-size:10px;font-weight:700;color:var(--td);text-transform:uppercase;">Most Contacted Freelancers</div>'
    + sRanked(msgToTarget, profileLabel, 6)
  );

  // ── SECTION G — Page Engagement ─────────────────────────
  var pageBreakdown = countBy(pageViews, 'targetId');
  h += sSection('Page Engagement', '📱', sRanked(pageBreakdown, null, 8));

  return h;
}

// ── UI helpers ────────────────────────────────────────────────────────────
function _loadingHTML(msg) {
  return '<div style="padding:40px;text-align:center;color:var(--td);font-size:12px;">'
    + '<div style="font-size:24px;margin-bottom:10px;">⏳</div>' + (msg || 'Loading…') + '</div>';
}
function _errorHTML(msg) {
  return '<div style="padding:40px;text-align:center;color:#ef4444;font-size:12px;">'
    + '<div style="font-size:24px;margin-bottom:10px;">⚠️</div>' + msg + '</div>';
}

}(window));
