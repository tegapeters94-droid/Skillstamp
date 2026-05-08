// SkillStamp — Profile Completion System (v1)
// Single source of truth for ALL profile completion logic.
// Role-aware, weighted, backward-compatible.
// Used by: home dashboard, edit profile, algorithm, onboarding, future achievements.

(function (global) {
'use strict';

// ═══════════════════════════════════════════════════════════════════════════
//  WEIGHTED COMPLETION SCHEMAS
//  Each step: { id, label, weight, done(user), action, role? }
//  role: 'freelancer' | 'employer' | undefined (= both)
// ═══════════════════════════════════════════════════════════════════════════

var FREELANCER_STEPS = [
  // Identity — core (high weight)
  { id: 'avatar',       label: 'Add profile photo',        weight: 10, action: 'openChangePhoto()',
    done: function(u) { return !!u.avatar; } },
  { id: 'name',         label: 'Set your full name',        weight:  5, action: 'openEditProfile()',
    done: function(u) { return !!(u.name || '').trim(); } },
  { id: 'title',        label: 'Add professional title',    weight: 10, action: 'openEditProfile()',
    done: function(u) { return !!(u.title || '').trim() && u.title !== 'Digital Professional'; } },
  { id: 'headline',     label: 'Write a headline',          weight:  8, action: 'openEditProfile()',
    done: function(u) { return !!(u.headline || u.tagline || '').trim(); } },
  { id: 'bio',          label: 'Write your bio (50+ chars)',weight: 12, action: 'openEditProfile()',
    done: function(u) { return !!(u.bio && u.bio.length >= 50); } },

  // Location
  { id: 'country',      label: 'Add your country',          weight:  4, action: 'openEditProfile()',
    done: function(u) { return !!(u.country || '').trim(); } },

  // Professional
  { id: 'category',     label: 'Set your category',         weight:  8, action: 'openEditProfile()',
    done: function(u) { return !!(u.category || '').trim(); } },
  { id: 'skills',       label: 'Add skills (3+)',            weight: 12, action: 'openEditProfile()',
    done: function(u) { return (u.skills || []).length >= 3; } },
  { id: 'services',     label: 'Add services offered',       weight:  8, action: 'openEditProfile()',
    done: function(u) { return (u.services || []).length >= 1; } },

  // Portfolio
  { id: 'portfolio',    label: 'Add portfolio project',      weight: 15, action: 'openAddPortfolio()',
    done: function(u) { return (u.portfolio || []).length >= 1; } },
  { id: 'portfolio3',   label: 'Add 3+ portfolio projects',  weight:  5, action: 'openAddPortfolio()',
    done: function(u) { return (u.portfolio || []).length >= 3; } },

  // Links
  { id: 'links',        label: 'Add professional link',      weight:  6, action: 'openEditProfile()',
    done: function(u) {
      var l = u.links || {};
      return !!(l.linkedin || l.github || l.behance || l.dribbble || l.website);
    }},

  // Availability
  { id: 'availability', label: 'Set availability status',    weight:  4, action: 'openEditProfile()',
    done: function(u) { return !!(u.availabilityStatus || u.available !== undefined); } },

  // Verification (bonus — not penalised if not done)
  { id: 'verified',     label: 'Get skill verified',         weight:  8, action: 'openSubmitSkill()',
    done: function(u) {
      return u.badgeStatus === 'verified' || u.badgeStatus === 'expert' || u.badgeStatus === 'elite';
    }},
];

var CLIENT_STEPS = [
  { id: 'avatar',       label: 'Add profile photo',          weight: 15, action: 'openChangePhoto()',
    done: function(u) { return !!u.avatar; } },
  { id: 'name',         label: 'Set your full name',          weight: 10, action: 'openEditProfile()',
    done: function(u) { return !!(u.name || '').trim(); } },
  { id: 'bio',          label: 'Write your bio',              weight: 20, action: 'openEditProfile()',
    done: function(u) { return !!(u.bio && u.bio.length >= 30); } },
  { id: 'country',      label: 'Add your country',            weight: 10, action: 'openEditProfile()',
    done: function(u) { return !!(u.country || '').trim(); } },
  { id: 'city',         label: 'Add your city',               weight:  8, action: 'openEditProfile()',
    done: function(u) { return !!(u.city || '').trim(); } },
  { id: 'industry',     label: 'Set your industry',           weight: 20, action: 'openEditProfile()',
    done: function(u) { return !!(u.industry || '').trim(); } },
  { id: 'projectTypes', label: 'Add project types',           weight: 17, action: 'openEditProfile()',
    done: function(u) { return (u.projectTypes || []).length >= 1; } },
];

// ═══════════════════════════════════════════════════════════════════════════
//  CORE CALCULATION FUNCTION
// ═══════════════════════════════════════════════════════════════════════════

// Returns { pct, earned, total, missing, completed, steps }
global.calculateProfileCompletion = function (user) {
  user = user || global.ME || {};
  var isClient = user.role === 'employer';
  var steps    = isClient ? CLIENT_STEPS : FREELANCER_STEPS;

  var totalWeight  = steps.reduce(function(s, st) { return s + st.weight; }, 0);
  var earnedWeight = 0;
  var completed    = [];
  var missing      = [];

  steps.forEach(function (step) {
    var isDone = false;
    try { isDone = step.done(user); } catch (e) {}
    if (isDone) {
      earnedWeight += step.weight;
      completed.push(step);
    } else {
      missing.push(step);
    }
  });

  var pct = totalWeight > 0 ? Math.round((earnedWeight / totalWeight) * 100) : 0;
  pct = Math.min(100, Math.max(0, pct));

  return {
    pct:       pct,
    earned:    earnedWeight,
    total:     totalWeight,
    steps:     steps,
    completed: completed,
    missing:   missing,
    isClient:  isClient,
  };
};

// Convenience: just the percentage
global.profileCompletionPct = function (user) {
  return global.calculateProfileCompletion(user || global.ME).pct;
};

// ═══════════════════════════════════════════════════════════════════════════
//  PROMPT GENERATOR — smart actionable tips
// ═══════════════════════════════════════════════════════════════════════════

// Returns up to `n` missing steps with contextual copy
global.getProfilePrompts = function (user, n) {
  user = user || global.ME || {};
  n    = n    || 3;
  var result = global.calculateProfileCompletion(user);
  return result.missing.slice(0, n);
};

// ═══════════════════════════════════════════════════════════════════════════
//  DONUT RING BUILDER (SVG — used by home hero)
// ═══════════════════════════════════════════════════════════════════════════

global.buildCompletionRing = function (pct, size) {
  size = size || 56;
  var r    = size / 2 - 4;
  var cx   = size / 2;
  var circ = 2 * Math.PI * r;
  var dash = (pct / 100) * circ;
  var col  = pct < 40 ? '#ff6b35' : pct < 80 ? '#e8c547' : '#4ade80';
  var fs   = Math.round(size * 0.2);
  return '<svg width="'+size+'" height="'+size+'" viewBox="0 0 '+size+' '+size+'" style="flex-shrink:0;">'
    + '<circle cx="'+cx+'" cy="'+cx+'" r="'+r+'" fill="none" stroke="rgba(255,255,255,.08)" stroke-width="4"/>'
    + '<circle cx="'+cx+'" cy="'+cx+'" r="'+r+'" fill="none" stroke="'+col+'" stroke-width="4"'
    + ' stroke-dasharray="'+dash+' '+circ+'" stroke-dashoffset="'+circ/4+'"'
    + ' stroke-linecap="round" style="transition:stroke-dasharray .6s ease"/>'
    + '<text x="'+cx+'" y="'+(cx+fs*0.4)+'" text-anchor="middle" fill="'+col+'"'
    + ' font-family="Plus Jakarta Sans,sans-serif" font-weight="800" font-size="'+fs+'">'+pct+'%</text>'
    + '</svg>';
};

// ═══════════════════════════════════════════════════════════════════════════
//  PROFILE STRENGTH BAR HTML (inline bar — used by completion card)
// ═══════════════════════════════════════════════════════════════════════════

global.buildCompletionBar = function (pct, showLabel) {
  var col = pct < 40 ? 'var(--acc)' : pct < 80 ? 'var(--gld)' : 'var(--grn)';
  var html = '';
  if (showLabel) {
    html += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">'
      + '<span style="font-size:11px;font-weight:700;color:var(--tx);">Profile Strength</span>'
      + '<span style="font-size:11px;font-weight:800;color:'+col+';">'+pct+'%</span>'
      + '</div>';
  }
  html += '<div style="height:5px;background:var(--s2);border-radius:3px;overflow:hidden;">'
    + '<div style="height:100%;width:'+pct+'%;background:'+col+';border-radius:3px;transition:width .5s ease;"></div>'
    + '</div>';
  return html;
};

}(window));
