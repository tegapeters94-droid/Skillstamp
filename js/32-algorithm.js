// SkillStamp — Discovery & Recommendation Algorithm (v1)
// Modular, weighted scoring system. No AI. Pure data signals.
// All functions are pure helpers — no Firestore reads, no side effects.
// Drop-in: existing render functions call these helpers; they work fine without them too.

(function (global) {
'use strict';

// ═══════════════════════════════════════════════════════════════════════════
//  CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

// Weights for final talent score (must sum to 1.0)
var W = {
  profile:     0.20,   // completeness signals
  performance: 0.25,   // ratings, gigs completed
  trust:       0.20,   // verification, links, portfolio proof
  activity:    0.15,   // recency of login / actions
  availability:0.10,   // open > busy
  portfolio:   0.10,   // richness of case studies
};

// Category → related categories (for 20% "related" feed slice)
var RELATED_CATS = {
  'Graphics Design':   ['UI/UX Design', 'Digital Marketing'],
  'UI/UX Design':      ['Graphics Design', 'Web & Mobile Dev'],
  'Content Writing':   ['Digital Marketing', 'Graphics Design'],
  'Data Analysis':     ['Web & Mobile Dev', 'Digital Marketing'],
  'Digital Marketing': ['Content Writing', 'Graphics Design'],
  'Web & Mobile Dev':  ['Data Analysis', 'UI/UX Design'],
};

// Keyword → category mapping (for search intent)
var CAT_KEYWORDS = {
  'Graphics Design':   ['logo','brand','illustrat','banner','poster','flyer','graphic','packaging','motion','artwork'],
  'UI/UX Design':      ['ui','ux','figma','wireframe','prototype','mockup','dashboard','app design','user interface'],
  'Content Writing':   ['blog','article','copywrite','seo','content','ghost','proofread','technical writing','email copy'],
  'Data Analysis':     ['data','python','sql','analytics','power bi','tableau','machine learning','statistics','ml','ai'],
  'Digital Marketing': ['marketing','ads','google ads','facebook','instagram','campaign','influencer','social media'],
  'Web & Mobile Dev':  ['website','web dev','react','node','flutter','api','backend','frontend','firebase','nextjs'],
};

// ═══════════════════════════════════════════════════════════════════════════
//  PART 1 — TALENT SCORING  (individual sub-scores 0–100)
// ═══════════════════════════════════════════════════════════════════════════

// 1a. Profile Strength Score
// Uses centralized calculateProfileCompletion() if available
function getProfileStrengthScore(u) {
  if (typeof calculateProfileCompletion === 'function') {
    try { return calculateProfileCompletion(u).pct; } catch(e) {}
  }
  // Fallback if 34-profile-completion.js not loaded yet
  if (!u) return 0;
  var score = 0;
  if (u.avatar)                           score += 15;
  if ((u.bio  || '').length > 40)         score += 15;
  if ((u.title|| '').length > 5)          score += 10;
  if ((u.headline||'').length > 5)        score += 8;
  if ((u.skills   || []).length >= 3)     score += 12;
  if ((u.services || []).length >= 1)     score += 8;
  if ((u.portfolio|| []).length >= 1)     score += 12;
  if ((u.portfolio|| []).length >= 3)     score += 8;   // bonus for richer portfolio
  var links = u.links || {};
  var linkCount = ['linkedin','github','behance','dribbble','website']
    .filter(function(k){ return !!links[k]; }).length;
  score += Math.min(linkCount * 4, 12);   // up to 12pts for links
  return Math.min(score, 100);
}

// 1b. Performance Score
function getPerformanceScore(u) {
  if (!u) return 0;
  var score = 0;
  var rating = u.score || 0;                     // 0–5
  score += rating * 12;                           // up to 60
  score += Math.min((u.gigsCount || 0) * 3, 25); // up to 25 for gig history
  score += Math.min((u.repPoints || 0) / 10, 15);// up to 15 for rep points
  return Math.min(score, 100);
}

// 1c. Activity Score (recency decay)
function getActivityScore(u) {
  if (!u) return 0;
  var now   = Date.now();
  var last  = u.lastSeen || u.lastActive || u.created || 0;
  var ageDays = (now - last) / 86400000;

  var score;
  if      (ageDays < 1)  score = 100;
  else if (ageDays < 3)  score = 90;
  else if (ageDays < 7)  score = 75;
  else if (ageDays < 14) score = 55;
  else if (ageDays < 30) score = 35;
  else if (ageDays < 60) score = 15;
  else                   score = 5;

  // Bonus: recently uploaded portfolio item
  var pf = (u.portfolio || []);
  if (pf.length) {
    var latestPf = pf.reduce(function(mx, p){ return (p.ts||0) > mx ? (p.ts||0) : mx; }, 0);
    if ((now - latestPf) < 7 * 86400000) score = Math.min(score + 10, 100);
  }
  return score;
}

// 1d. Availability Score
function getAvailabilityScore(u) {
  if (!u) return 0;
  var status = u.availabilityStatus || (u.available !== false ? 'available' : 'busy');
  var map = { available: 100, open: 70, busy: 30, unavailable: 0 };
  return map[status] !== undefined ? map[status] : 50;
}

// 1e. Trust Score
function getTrustScore(u) {
  if (!u) return 0;
  var score = 0;
  var badge = u.badgeStatus || 'beginner';
  var badgeMap = { elite: 60, expert: 50, verified: 40, review: 15, beginner: 0 };
  score += badgeMap[badge] || 0;

  // Verified portfolio items
  var verifiedItems = (u.portfolio || []).filter(function(p){ return p.verified; }).length;
  score += Math.min(verifiedItems * 8, 24);

  // Professional links (social proof)
  var links = u.links || {};
  var linkCount = ['linkedin','github','behance','dribbble','website']
    .filter(function(k){ return !!links[k]; }).length;
  score += Math.min(linkCount * 4, 16);

  return Math.min(score, 100);
}

// 1f. Portfolio Quality Score
function getPortfolioScore(u) {
  if (!u) return 0;
  var pf = u.portfolio || [];
  if (!pf.length) return 0;

  var score = 0;
  // Count + richness
  score += Math.min(pf.length * 8, 30);   // up to 30 for quantity

  pf.forEach(function(item) {
    if (item.overview || item.desc)  score += 5;   // has description
    if (item.results)                score += 8;   // has results (most valuable signal)
    if (item.skills && item.skills.length) score += 3;
    var imgCount = (item.images || (item.image ? [item.image] : [])).length;
    if (imgCount > 1)                score += 3;   // multi-image
    if (item.testimonial)            score += 5;   // social proof
    if (item.verified)               score += 8;   // platform-verified
  });

  return Math.min(score, 100);
}

// 1g. Freshness Boost (new high-quality users get temporary visibility)
function getFreshnessBoost(u) {
  if (!u) return 0;
  var age = (Date.now() - (u.created || Date.now())) / 86400000; // days
  if (age > 30) return 0;   // expires after 30 days
  // Only boost if profile is reasonably complete
  if (getProfileStrengthScore(u) < 40) return 0;
  // Linear decay: 30 → 0 over 30 days
  return Math.round((1 - age / 30) * 20);
}

// 1h. Anti-spam / low-quality penalty
function getQualityPenalty(u) {
  if (!u) return 0;
  var penalty = 0;
  if (!(u.bio || '').trim())         penalty += 20;
  if (!(u.avatar))                   penalty += 10;
  if (!(u.title || '').trim())       penalty += 15;
  if (!(u.skills || []).length)      penalty += 15;
  if (!(u.portfolio || []).length)   penalty += 10;
  if (u.isBanned)                    penalty += 200; // effectively removes from results
  return penalty;
}

// ── Master talent score (0–100, combined) ──────────────────────────────────
global.getTalentScore = function(u) {
  if (!u) return 0;
  var raw =
    getProfileStrengthScore(u) * W.profile     +
    getPerformanceScore(u)     * W.performance +
    getTrustScore(u)           * W.trust       +
    getActivityScore(u)        * W.activity    +
    getAvailabilityScore(u)    * W.availability+
    getPortfolioScore(u)       * W.portfolio;

  raw += getFreshnessBoost(u);
  raw -= getQualityPenalty(u);
  return Math.max(0, Math.min(100, Math.round(raw)));
};

// Expose individual scorers for admin/debug use
global.getProfileStrengthScore = getProfileStrengthScore;
global.getPerformanceScore      = getPerformanceScore;
global.getActivityScore         = getActivityScore;
global.getAvailabilityScore     = getAvailabilityScore;
global.getTrustScore            = getTrustScore;
global.getPortfolioScore        = getPortfolioScore;

// ═══════════════════════════════════════════════════════════════════════════
//  PART 2 — GIG MATCHING  (score how well a gig matches a freelancer)
// ═══════════════════════════════════════════════════════════════════════════

// Token overlap helper — returns 0..1
function _overlap(setA, setB) {
  if (!setA.length || !setB.length) return 0;
  var aLow = setA.map(function(s){ return (s||'').toLowerCase(); });
  var bLow = setB.map(function(s){ return (s||'').toLowerCase(); });
  var hits = aLow.filter(function(a){
    return bLow.some(function(b){ return b.indexOf(a) >= 0 || a.indexOf(b) >= 0; });
  }).length;
  return hits / Math.max(aLow.length, bLow.length);
}

// Keyword scan of a text against a category's keyword list
function _catKeywordScore(text, cat) {
  if (!text || !cat) return 0;
  var kws  = CAT_KEYWORDS[cat] || [];
  var tLow = text.toLowerCase();
  var hits = kws.filter(function(kw){ return tLow.indexOf(kw) >= 0; }).length;
  return hits / Math.max(kws.length, 1);
}

global.getGigMatchScore = function(user, gig) {
  if (!user || !gig) return 0;
  var score = 0;

  var userCat      = user.category  || '';
  var userSkills   = user.skills    || [];
  var userServices = user.services  || [];
  var gigCat       = gig.category   || '';
  var gigSkills    = gig.skills     || [];
  var gigTitle     = gig.title      || '';
  var gigDesc      = gig.description|| '';
  var gigText      = gigTitle + ' ' + gigDesc;

  // — Category exact match (biggest signal)
  if (userCat && gigCat === userCat) score += 40;
  else if (userCat && (RELATED_CATS[userCat] || []).indexOf(gigCat) >= 0) score += 18;

  // — Skill overlap
  score += _overlap(userSkills, gigSkills) * 30;

  // — Service overlap (freelancer's offered services vs gig description)
  score += _overlap(userServices, [gigTitle].concat(gigSkills)) * 15;

  // — Keyword match in gig text vs user category
  score += _catKeywordScore(gigText, userCat) * 15;

  // — Already applied penalty (suppress re-showing applied gigs)
  var applied = (user.applications || []).map(function(a){ return a.gigId; });
  if (applied.indexOf(gig.id) >= 0) score -= 30;

  // — Freshness (newer gigs slightly preferred)
  var ageDays = (Date.now() - (gig.created || 0)) / 86400000;
  if (ageDays < 1)  score += 8;
  else if (ageDays < 3) score += 5;
  else if (ageDays < 7) score += 2;

  return Math.max(0, Math.round(score));
};

// ═══════════════════════════════════════════════════════════════════════════
//  PART 3 — BEHAVIORAL SIGNALS (lightweight, localStorage-backed)
//  Architecture is ready; signals are written now so future AI can read them.
// ═══════════════════════════════════════════════════════════════════════════

var _BEH_KEY = 'ss_beh_v1';

function _readBeh() {
  try {
    return JSON.parse(localStorage.getItem(_BEH_KEY) || '{}');
  } catch(e) { return {}; }
}

function _writeBeh(data) {
  try { localStorage.setItem(_BEH_KEY, JSON.stringify(data)); } catch(e) {}
}

// Record a behavioral signal
global.recordSignal = function(type, payload) {
  if (!ME || !ME.uid) return;
  var beh = _readBeh();
  var uid = ME.uid;
  if (!beh[uid]) beh[uid] = { gigViews:{}, gigApplies:{}, catCounts:{}, profileViews:{}, searches:[], ts: Date.now() };

  var u = beh[uid];
  u.ts = Date.now(); // last active signal time

  if (type === 'gig_view'    && payload.gigId)   u.gigViews[payload.gigId]   = (u.gigViews[payload.gigId]   || 0) + 1;
  if (type === 'gig_apply'   && payload.gigId)   u.gigApplies[payload.gigId] = Date.now();
  if (type === 'cat_interact'&& payload.cat)     u.catCounts[payload.cat]    = (u.catCounts[payload.cat]    || 0) + 1;
  if (type === 'profile_view'&& payload.uid)     u.profileViews[payload.uid] = (u.profileViews[payload.uid]|| 0) + 1;
  if (type === 'search'      && payload.query) {
    u.searches = [payload.query].concat(u.searches).slice(0, 20); // keep last 20
  }

  _writeBeh(beh);
};

// Read behavioral context for current user
global.getBehaviorContext = function() {
  if (!ME || !ME.uid) return null;
  var beh = _readBeh();
  return beh[ME.uid] || null;
};

// Behavior-informed category boost (returns extra score for a category)
global.getBehaviorScore = function(cat) {
  if (!cat) return 0;
  var ctx = global.getBehaviorContext();
  if (!ctx) return 0;
  var count = (ctx.catCounts || {})[cat] || 0;
  return Math.min(count * 2, 15); // up to 15pt boost for heavily interacted category
};

// ═══════════════════════════════════════════════════════════════════════════
//  PART 4 — SORTED TALENT FEED
// ═══════════════════════════════════════════════════════════════════════════

// Returns freelancers sorted by relevance to a viewer (viewer = ME or null)
global.rankTalent = function(users, viewerCat) {
  if (!users || !users.length) return [];
  var cat = viewerCat || (ME && ME.category) || '';

  return users.slice().sort(function(a, b) {
    var sa = global.getTalentScore(a);
    var sb = global.getTalentScore(b);

    // Behaviour boost for viewer's category
    if (cat) {
      if (a.category === cat) sa += 8;
      if (b.category === cat) sb += 8;
    }
    // Behavior score boost (frequent category interactions)
    sa += global.getBehaviorScore(a.category);
    sb += global.getBehaviorScore(b.category);

    return sb - sa;
  });
};

// ═══════════════════════════════════════════════════════════════════════════
//  PART 5 — PERSONALIZED GIG FEED (70/20/10 mix)
// ═══════════════════════════════════════════════════════════════════════════

global.rankGigsForUser = function(gigs, user) {
  user = user || ME;
  if (!user || !gigs || !gigs.length) return gigs || [];

  var openGigs = gigs.filter(function(g){ return !g.status || g.status === 'open'; });
  if (!openGigs.length) return [];

  var userCat   = user.category || '';
  var relCats   = RELATED_CATS[userCat] || [];

  // Score each gig
  var scored = openGigs.map(function(g) {
    var ms  = global.getGigMatchScore(user, g);
    var beh = global.getBehaviorScore(g.category);
    return { gig: g, score: ms + beh };
  });

  scored.sort(function(a, b){ return b.score - a.score; });

  // Partition into buckets
  var primary   = [];  // 70%: category match
  var related   = [];  // 20%: related category
  var discovery = [];  // 10%: everything else

  scored.forEach(function(item) {
    var gc = item.gig.category || '';
    if (gc === userCat)                  primary.push(item);
    else if (relCats.indexOf(gc) >= 0)  related.push(item);
    else                                 discovery.push(item);
  });

  // Mix: take up to N total, respecting 70/20/10 ratio
  var N = 20;
  var nPrimary   = Math.round(N * 0.70);
  var nRelated   = Math.round(N * 0.20);
  var nDiscovery = N - nPrimary - nRelated;

  var result = []
    .concat(primary.slice(0, nPrimary).map(function(i){ return i.gig; }))
    .concat(related.slice(0, nRelated).map(function(i){ return i.gig; }))
    .concat(discovery.slice(0, nDiscovery).map(function(i){ return i.gig; }));

  // If primary bucket was thin, fill remainder with related/discovery
  if (result.length < N) {
    var used = result.map(function(g){ return g.id; });
    var extras = scored
      .filter(function(i){ return used.indexOf(i.gig.id) < 0; })
      .slice(0, N - result.length)
      .map(function(i){ return i.gig; });
    result = result.concat(extras);
  }

  return result;
};

// ═══════════════════════════════════════════════════════════════════════════
//  PART 6 — SEARCH INTENT SCORING
// ═══════════════════════════════════════════════════════════════════════════

// Score a user against a text query (for search results ranking)
global.getSearchRelevance = function(user, query) {
  if (!user || !query) return 0;
  var q   = query.toLowerCase();
  var score = 0;

  // Name match (strongest)
  if ((user.name || '').toLowerCase().indexOf(q) >= 0)     score += 40;
  // Title match
  if ((user.title || '').toLowerCase().indexOf(q) >= 0)    score += 25;
  // Skill exact match
  var skills = user.skills || [];
  if (skills.some(function(s){ return (s||'').toLowerCase().indexOf(q) >= 0; })) score += 20;
  // Category match
  if ((user.category || '').toLowerCase().indexOf(q) >= 0) score += 15;
  // Service match
  var services = user.services || [];
  if (services.some(function(s){ return (s||'').toLowerCase().indexOf(q) >= 0; })) score += 12;
  // Headline match
  if ((user.headline || '').toLowerCase().indexOf(q) >= 0) score += 8;
  // Country match
  if ((user.country || '').toLowerCase().indexOf(q) >= 0)  score += 5;

  // Boost for keyword-to-category alignment (intent matching)
  Object.keys(CAT_KEYWORDS).forEach(function(cat) {
    var kws = CAT_KEYWORDS[cat];
    var hit = kws.some(function(kw){ return q.indexOf(kw) >= 0 || kw.indexOf(q) >= 0; });
    if (hit && user.category === cat) score += 10;
  });

  // Quality multiplier: higher quality profiles rank better for same query
  var qualityMult = 0.5 + (global.getTalentScore(user) / 200); // 0.5–1.0
  return Math.round(score * qualityMult);
};

// Score a gig against a query
global.getGigSearchRelevance = function(gig, query) {
  if (!gig || !query) return 0;
  var q = query.toLowerCase();
  var score = 0;
  if ((gig.title       || '').toLowerCase().indexOf(q) >= 0) score += 40;
  if ((gig.category    || '').toLowerCase().indexOf(q) >= 0) score += 20;
  if ((gig.description || '').toLowerCase().indexOf(q) >= 0) score += 15;
  var gigSkills = gig.skills || [];
  if (gigSkills.some(function(s){ return (s||'').toLowerCase().indexOf(q) >= 0; })) score += 15;
  // Freshness
  var ageDays = (Date.now() - (gig.created || 0)) / 86400000;
  if (ageDays < 7) score += 10;
  return score;
};

// ═══════════════════════════════════════════════════════════════════════════
//  PART 7 — CLIENT-SIDE: RANK FREELANCERS FOR A GIG (client view)
// ═══════════════════════════════════════════════════════════════════════════

// Score a freelancer for a specific gig (used in hire modal / talent page)
global.getFreelancerGigFit = function(user, gig) {
  if (!user || !gig) return 0;
  var score = 0;

  // Base talent quality
  score += global.getTalentScore(user) * 0.4;

  // Category fit
  if (user.category === (gig.category || '')) score += 25;

  // Skill overlap with gig requirements
  var gigSkills  = gig.skills    || [];
  var userSkills = user.skills   || [];
  score += _overlap(userSkills, gigSkills) * 20;

  // Service overlap
  var userServices = user.services || [];
  score += _overlap(userServices, [gig.title || '']) * 10;

  // Availability — only show available freelancers near top
  score += getAvailabilityScore(user) * 0.05;

  return Math.round(score);
};

// ═══════════════════════════════════════════════════════════════════════════
//  PART 8 — HOME FEED HELPERS (called by 07-home.js)
// ═══════════════════════════════════════════════════════════════════════════

// Top N recommended gigs for the home dashboard (already ranked)
global.getHomeGigs = function(n) {
  n = n || 4;
  var all  = typeof getGigs === 'function' ? getGigs() : (CACHE && CACHE.gigs || []);
  var ranked = global.rankGigsForUser(all, ME);
  return ranked.slice(0, n);
};

// Top N recommended freelancers for a client home dashboard
global.getHomeTalent = function(n) {
  n = n || 4;
  var all = typeof getAllUsers === 'function' ? getAllUsers() : (CACHE && CACHE.users || []);
  var freelancers = all.filter(function(u){ return u.role === 'freelancer' && !u.isBanned; });
  return global.rankTalent(freelancers).slice(0, n);
};

// ═══════════════════════════════════════════════════════════════════════════
//  PART 9 — TRENDING (placeholder architecture, data-ready)
// ═══════════════════════════════════════════════════════════════════════════

// "Trending" = high activity score + high performance + recent portfolio
global.getTrendingTalent = function(n) {
  n = n || 6;
  var all = typeof getAllUsers === 'function' ? getAllUsers() : [];
  var freelancers = all.filter(function(u){ return u.role === 'freelancer' && !u.isBanned; });
  return freelancers.slice().sort(function(a, b) {
    var sa = getActivityScore(a) * 0.5 + getPerformanceScore(a) * 0.3 + getPortfolioScore(a) * 0.2;
    var sb = getActivityScore(b) * 0.5 + getPerformanceScore(b) * 0.3 + getPortfolioScore(b) * 0.2;
    return sb - sa;
  }).slice(0, n);
};

// "Trending" gigs = most recently posted with decent engagement signals
global.getTrendingGigs = function(n) {
  n = n || 6;
  var all = typeof getGigs === 'function' ? getGigs() : [];
  var open = all.filter(function(g){ return !g.status || g.status === 'open'; });
  return open.slice().sort(function(a, b){
    return (b.created || 0) - (a.created || 0);
  }).slice(0, n);
};

// ═══════════════════════════════════════════════════════════════════════════
//  PART 10 — DEBUG HELPER (dev only, no-op in prod)
// ═══════════════════════════════════════════════════════════════════════════

global.debugScore = function(uid) {
  var all   = typeof getAllUsers === 'function' ? getAllUsers() : [];
  var u     = all.find(function(x){ return x.uid === uid; }) || ME;
  if (!u) { console.log('User not found'); return; }
  console.group('SkillStamp Score Debug — ' + u.name);
  console.log('Profile Strength : ', getProfileStrengthScore(u));
  console.log('Performance      : ', getPerformanceScore(u));
  console.log('Activity         : ', getActivityScore(u));
  console.log('Availability     : ', getAvailabilityScore(u));
  console.log('Trust            : ', getTrustScore(u));
  console.log('Portfolio        : ', getPortfolioScore(u));
  console.log('Freshness Boost  : ', getFreshnessBoost(u));
  console.log('Quality Penalty  : ', getQualityPenalty(u));
  console.log('FINAL SCORE      : ', global.getTalentScore(u));
  console.groupEnd();
};

}(window));
