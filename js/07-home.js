// SkillStamp — Home Dashboard (role-based, rebuilt)

// ── Main render entry point ────────────────────────────────
window.renderRoleHome = function() {
  var pg = document.getElementById('page-home');
  if (!pg || !ME) return;
  if (ME.role === 'employer' || ME.role === 'client') {
    pg.innerHTML = buildClientHome();
  } else {
    pg.innerHTML = buildFreelancerHome();
  }
  wireHomeEvents();
};

// Also called as renderTimeline for backward compat
window.renderTimeline = window.renderRoleHome;

// ── Greeting helpers ───────────────────────────────────────
function greetingWord() {
  var h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function verifiedBadgeInline() {
  var s = ME.badgeStatus;
  if (s === 'verified' || s === 'expert' || s === 'elite') {
    return '<span style="display:inline-flex;align-items:center;gap:3px;background:rgba(74,222,128,.1);border:1px solid rgba(74,222,128,.25);color:var(--grn);font-size:9px;font-weight:700;padding:2px 7px;border-radius:10px;vertical-align:middle;margin-left:6px;">✓ Verified</span>';
  }
  return '<span style="display:inline-flex;align-items:center;gap:3px;background:rgba(255,107,53,.08);border:1px solid rgba(255,107,53,.2);color:var(--acc);font-size:9px;font-weight:700;padding:2px 7px;border-radius:10px;vertical-align:middle;margin-left:6px;">Unverified</span>';
}

// ── Profile strength (freelancer) ──────────────────────────
function profileStrength() {
  var steps = [
    { key: 'photo',     label: 'Add a profile photo',         done: !!ME.avatar,                          action: "openChangePhoto()"  },
    { key: 'title',     label: 'Set your professional title',  done: !!(ME.title && ME.title !== 'Digital Professional'), action: "openEditProfile()" },
    { key: 'bio',       label: 'Write a bio (min 50 chars)',   done: !!(ME.bio && ME.bio.length >= 50),    action: "openEditProfile()"  },
    { key: 'skills',    label: 'Add your skills',             done: !!(ME.skills && ME.skills.length > 0), action: "openEditProfile()" },
    { key: 'portfolio', label: 'Upload a portfolio item',     done: !!(ME.portfolio && ME.portfolio.length > 0), action: "openAddPortfolio()" },
    { key: 'verified',  label: 'Get skill verified',          done: ME.badgeStatus === 'verified' || ME.badgeStatus === 'expert' || ME.badgeStatus === 'elite', action: "openSubmitSkill()" }
  ];
  var done = steps.filter(function(s) { return s.done; }).length;
  var pct = Math.round((done / steps.length) * 100);
  var color = pct < 40 ? 'var(--acc)' : pct < 80 ? 'var(--gld)' : 'var(--grn)';
  var missing = steps.filter(function(s) { return !s.done; }).slice(0, 2);

  var html = '<div style="background:var(--s);border:1px solid var(--br);border-radius:12px;padding:16px;margin-bottom:14px;">';
  html += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">';
  html += '<div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:700;font-size:13px;">Profile Strength</div>';
  html += '<div style="font-size:12px;font-weight:700;color:' + color + ';">' + pct + '%</div>';
  html += '</div>';
  // Progress bar
  html += '<div style="height:6px;background:var(--s2);border-radius:3px;margin-bottom:12px;overflow:hidden;">';
  html += '<div style="height:100%;width:' + pct + '%;background:' + color + ';border-radius:3px;transition:width .4s ease;"></div>';
  html += '</div>';
  if (pct < 100 && missing.length) {
    html += '<div style="font-size:10px;color:var(--td);margin-bottom:8px;">Complete your profile to attract more clients:</div>';
    missing.forEach(function(step) {
      html += '<div onclick="' + step.action + '" style="display:flex;align-items:center;gap:8px;padding:7px 10px;background:var(--s2);border-radius:7px;margin-bottom:5px;cursor:pointer;">';
      html += '<div style="width:18px;height:18px;border-radius:50%;border:1.5px solid var(--gld);display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:9px;color:var(--gld);">+</div>';
      html += '<div style="font-size:11px;color:var(--tx);">' + step.label + '</div>';
      html += '<div style="margin-left:auto;font-size:10px;color:var(--gld);">→</div>';
      html += '</div>';
    });
  } else if (pct === 100) {
    html += '<div style="font-size:11px;color:var(--grn);text-align:center;">🎉 Profile complete — you\'re ready to get hired!</div>';
  }
  html += '</div>';
  return html;
}

// ── Active gig card (freelancer) ───────────────────────────
function activeGigCard() {
  var apps = ME.applications || [];
  var active = apps.filter(function(a) {
    return a.status === 'accepted';
  });
  if (!active.length) return '';

  var html = '<div style="margin-bottom:14px;">';
  html += '<div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:800;font-size:12px;color:var(--td);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px;">Active Work</div>';
  active.slice(0, 2).forEach(function(app) {
    var gig = getGigs().find(function(g) { return g.id === app.gigId; });
    if (!gig) return;
    var statusColor = {'hired':'var(--blu)','delivered':'var(--gld)','completed':'var(--grn)'}[gig.status] || 'var(--td)';
    var statusLabel = {'hired':'In Progress','delivered':'Awaiting Review','completed':'Completed'}[gig.status] || gig.status;
    html += '<div onclick="openGigWorkspace(\'' + gig.id + '\')" style="background:var(--s);border:1px solid var(--br);border-radius:12px;padding:14px;margin-bottom:8px;cursor:pointer;border-left:3px solid ' + statusColor + ';">';
    html += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">';
    html += '<div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:700;font-size:13px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;flex:1;margin-right:8px;">' + gig.title + '</div>';
    html += '<span style="font-size:9px;font-weight:700;color:' + statusColor + ';background:' + statusColor.replace(')', ',.1)').replace('var', 'rgba') + ';padding:3px 8px;border-radius:8px;flex-shrink:0;">' + statusLabel + '</span>';
    html += '</div>';
    html += '<div style="font-size:10px;color:var(--td);">Client: ' + (gig.posterName || 'Client') + ' · $' + (gig.pay || gig.escrowAmount || '—') + '</div>';
    html += '<div style="margin-top:10px;"><button class="bsm" onclick="event.stopPropagation();openGigWorkspace(\'' + gig.id + '\')" style="font-size:10px;">📁 Open Workspace</button></div>';
    html += '</div>';
  });
  html += '</div>';
  return html;
}

// ── Matching gigs (freelancer) ─────────────────────────────
function matchingGigsSection() {
  var cat = ME.category || '';
  var allGigs = getGigs().filter(function(g) { return g.status === 'open'; });
  // Prefer matching category, fall back to all
  var matched = cat ? allGigs.filter(function(g) { return g.category === cat; }) : [];
  var shown = matched.length >= 2 ? matched : allGigs;
  shown = shown.slice(0, 4);
  if (!shown.length) return '';

  var myAppliedIds = (ME.applications || []).map(function(a) { return a.gigId; });

  var html = '<div style="margin-bottom:14px;">';
  html += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">';
  html += '<div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:800;font-size:12px;color:var(--td);text-transform:uppercase;letter-spacing:.5px;">' + (cat ? 'Gigs for You' : 'Open Gigs') + '</div>';
  html += '<button onclick="showPage(\'gigs\')" style="background:none;border:none;color:var(--gld);font-size:11px;font-weight:600;cursor:pointer;">See all →</button>';
  html += '</div>';

  shown.forEach(function(g) {
    var applied = myAppliedIds.indexOf(g.id) >= 0;
    var icon = CAT_ICONS[g.category] || '💼';
    html += '<div style="background:var(--s);border:1px solid var(--br);border-radius:12px;padding:13px;margin-bottom:8px;">';
    html += '<div style="display:flex;align-items:flex-start;gap:10px;">';
    html += '<div style="width:38px;height:38px;border-radius:10px;background:rgba(232,197,71,.08);border:1px solid rgba(232,197,71,.15);display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;">' + icon + '</div>';
    html += '<div style="flex:1;min-width:0;">';
    html += '<div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:700;font-size:13px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;">' + g.title + '</div>';
    html += '<div style="font-size:10px;color:var(--td);margin-top:2px;">' + (g.posterName || 'Client') + ' · ' + g.category + '</div>';
    html += '<div style="display:flex;align-items:center;justify-content:space-between;margin-top:8px;">';
    html += '<span style="font-size:12px;font-weight:700;color:var(--grn);">$' + (g.pay || 'Open') + '</span>';
    if (applied) {
      html += '<span style="font-size:10px;color:var(--td);font-style:italic;">Applied</span>';
    } else {
      html += '<button onclick="applyGig(\'' + g.id + '\',\'' + g.title.replace(/'/g, '') + '\',\'' + g.posterUid + '\')" style="background:var(--gld);color:#000;border:none;padding:5px 12px;border-radius:6px;font-size:10px;font-weight:700;cursor:pointer;">Apply →</button>';
    }
    html += '</div></div></div></div>';
  });
  html += '</div>';
  return html;
}

// ── My proposals summary (freelancer) ─────────────────────
function proposalsSummary() {
  var apps = ME.applications || [];
  if (!apps.length) return '';
  var pending = apps.filter(function(a) { return a.status === 'pending'; }).length;
  var accepted = apps.filter(function(a) { return a.status === 'accepted'; }).length;
  var rejected = apps.filter(function(a) { return a.status === 'rejected'; }).length;

  var html = '<div onclick="showPage(\'gigs\');switchGigTab(\'myapps\')" style="background:var(--s);border:1px solid var(--br);border-radius:12px;padding:13px;margin-bottom:14px;cursor:pointer;">';
  html += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">';
  html += '<div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:700;font-size:13px;">My Proposals</div>';
  html += '<span style="font-size:10px;color:var(--gld);">View all →</span>';
  html += '</div>';
  html += '<div style="display:flex;gap:8px;">';
  html += '<div style="flex:1;text-align:center;background:var(--s2);border-radius:8px;padding:8px 4px;">';
  html += '<div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:800;font-size:20px;color:var(--gld);">' + pending + '</div>';
  html += '<div style="font-size:9px;color:var(--td);">Pending</div></div>';
  html += '<div style="flex:1;text-align:center;background:var(--s2);border-radius:8px;padding:8px 4px;">';
  html += '<div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:800;font-size:20px;color:var(--grn);">' + accepted + '</div>';
  html += '<div style="font-size:9px;color:var(--td);">Accepted</div></div>';
  html += '<div style="flex:1;text-align:center;background:var(--s2);border-radius:8px;padding:8px 4px;">';
  html += '<div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:800;font-size:20px;color:var(--td);">' + rejected + '</div>';
  html += '<div style="font-size:9px;color:var(--td);">Rejected</div></div>';
  html += '</div></div>';
  return html;
}

// ── Earnings mini card (freelancer) ───────────────────────
function earningsMini() {
  var wallet = ME.wallet || {};
  var earned = Math.round(wallet.earned || ME.earned || 0);
  var balance = Math.round(wallet.balance || 0);
  var pending = Math.round(wallet.pending || 0);
  if (!earned && !balance && !pending) return '';

  var html = '<div onclick="showPage(\'wallet\')" style="background:linear-gradient(135deg,rgba(74,222,128,.08),rgba(232,197,71,.06));border:1px solid rgba(74,222,128,.2);border-radius:12px;padding:13px;margin-bottom:14px;cursor:pointer;">';
  html += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">';
  html += '<div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:700;font-size:13px;">💰 Earnings</div>';
  html += '<span style="font-size:10px;color:var(--gld);">Wallet →</span>';
  html += '</div>';
  html += '<div style="display:flex;gap:10px;">';
  html += '<div style="flex:1;"><div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:800;font-size:18px;color:var(--grn);">$' + balance.toLocaleString() + '</div><div style="font-size:9px;color:var(--td);">Available</div></div>';
  if (pending) html += '<div style="flex:1;"><div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:800;font-size:18px;color:var(--gld);">$' + pending.toLocaleString() + '</div><div style="font-size:9px;color:var(--td);">In Escrow</div></div>';
  html += '<div style="flex:1;"><div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:800;font-size:18px;color:var(--tx);">$' + earned.toLocaleString() + '</div><div style="font-size:9px;color:var(--td);">Total Earned</div></div>';
  html += '</div></div>';
  return html;
}

// ── Verification nudge (freelancer) ───────────────────────
function verifNudge() {
  var s = ME.badgeStatus;
  if (s === 'verified' || s === 'expert' || s === 'elite') return '';
  return '<div onclick="openSubmitSkill()" style="background:rgba(232,197,71,.06);border:1px dashed rgba(232,197,71,.4);border-radius:12px;padding:13px;margin-bottom:14px;cursor:pointer;display:flex;align-items:center;gap:12px;">'
    + '<div style="font-size:28px;flex-shrink:0;">🏅</div>'
    + '<div style="flex:1;">'
    + '<div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:700;font-size:12px;margin-bottom:2px;">Get Skill Verified</div>'
    + '<div style="font-size:10px;color:var(--td);line-height:1.5;">Verified freelancers get 3× more views, unlimited proposals, and a SkillID badge.</div>'
    + '</div>'
    + '<div style="color:var(--gld);font-size:18px;flex-shrink:0;">→</div>'
    + '</div>';
}

// ── Quick actions row ──────────────────────────────────────
function quickActionsRow(role) {
  var isClient = role === 'employer' || role === 'client';
  var actions = isClient
    ? [
        { icon: '🔍', label: 'Browse Talent', onclick: "showPage('talent')" },
        { icon: '💼', label: 'Post a Gig',    onclick: "openPostGig()" },
        { icon: '💳', label: 'Wallet',         onclick: "showPage('wallet')" }
      ]
    : [
        { icon: '💼', label: 'Browse Gigs',   onclick: "showPage('gigs')" },
        { icon: '👤', label: 'My Profile',    onclick: "showPage('myprofile')" },
        { icon: '💳', label: 'Wallet',         onclick: "showPage('wallet')" }
      ];

  var html = '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:14px;">';
  actions.forEach(function(a) {
    html += '<div onclick="' + a.onclick + '" style="background:var(--s);border:1px solid var(--br);border-radius:12px;padding:12px 8px;text-align:center;cursor:pointer;transition:border-color .15s;" onmouseover="this.style.borderColor=\'var(--gld)\'" onmouseout="this.style.borderColor=\'var(--br)\'">';
    html += '<div style="font-size:22px;margin-bottom:5px;">' + a.icon + '</div>';
    html += '<div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:600;font-size:10px;color:var(--tx);">' + a.label + '</div>';
    html += '</div>';
  });
  html += '</div>';
  return html;
}

// ── CLIENT: Active gigs panel ─────────────────────────────
function clientActiveGigs() {
  var myGigs = getGigs().filter(function(g) { return g.posterUid === ME.uid && g.status !== 'completed' && g.status !== 'cancelled'; });
  if (!myGigs.length) {
    return '<div onclick="openPostGig()" style="background:rgba(232,197,71,.05);border:2px dashed rgba(232,197,71,.3);border-radius:12px;padding:20px;text-align:center;margin-bottom:14px;cursor:pointer;">'
      + '<div style="font-size:32px;margin-bottom:8px;">💼</div>'
      + '<div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:700;font-size:13px;margin-bottom:4px;">Post Your First Gig</div>'
      + '<div style="font-size:11px;color:var(--td);margin-bottom:12px;">Hire verified African talent for your project</div>'
      + '<div class="bsm" style="display:inline-block;">+ Post a Gig</div>'
      + '</div>';
  }

  var html = '<div style="margin-bottom:14px;">';
  html += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">';
  html += '<div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:800;font-size:12px;color:var(--td);text-transform:uppercase;letter-spacing:.5px;">Your Active Gigs</div>';
  html += '<button onclick="showPage(\'gigs\')" style="background:none;border:none;color:var(--gld);font-size:11px;font-weight:600;cursor:pointer;">See all →</button>';
  html += '</div>';

  myGigs.slice(0, 3).forEach(function(g) {
    var applicants = (g.applicants || []).length;
    var statusColor = {open:'var(--grn)',hired:'var(--blu)',delivered:'var(--gld)',disputed:'var(--acc)'}[g.status] || 'var(--td)';
    var hasNew = g.status === 'open' && applicants > 0;

    html += '<div style="background:var(--s);border:1px solid var(--br);border-radius:12px;padding:13px;margin-bottom:8px;">';
    html += '<div style="display:flex;align-items:flex-start;gap:10px;">';
    html += '<div style="flex:1;min-width:0;">';
    html += '<div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:700;font-size:13px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;">' + g.title + '</div>';
    html += '<div style="display:flex;align-items:center;gap:8px;margin-top:4px;">';
    html += '<span style="font-size:9px;font-weight:700;color:' + statusColor + ';text-transform:uppercase;">' + g.status + '</span>';
    html += '<span style="font-size:10px;color:var(--td);">$' + (g.pay || g.escrowAmount || '—') + '</span>';
    html += '</div></div>';
    if (hasNew) {
      html += '<div style="background:var(--acc);color:#fff;font-size:9px;font-weight:700;padding:3px 8px;border-radius:8px;flex-shrink:0;">' + applicants + ' applicant' + (applicants > 1 ? 's' : '') + '</div>';
    }
    html += '</div>';
    // Action button
    html += '<div style="margin-top:10px;display:flex;gap:6px;">';
    if (g.status === 'open') {
      if (applicants > 0) {
        html += '<button onclick="openHireModal(\'' + g.id + '\')" class="bsm" style="font-size:10px;">👥 Review Applicants (' + applicants + ')</button>';
      } else {
        html += '<button onclick="showPage(\'gigs\')" style="background:none;border:1px solid var(--br);border-radius:6px;padding:5px 10px;font-size:10px;color:var(--td);cursor:pointer;">Waiting for applicants…</button>';
      }
    } else if (g.status === 'hired' || g.status === 'delivered') {
      html += '<button onclick="openGigWorkspace(\'' + g.id + '\')" class="bsm" style="font-size:10px;">📁 Open Workspace</button>';
    }
    html += '</div></div>';
  });
  html += '</div>';
  return html;
}

// ── CLIENT: Featured verified talent ─────────────────────
function featuredTalent() {
  var talent = getAllUsers().filter(function(u) {
    return u.role !== 'employer' && u.role !== 'client' && u.uid !== ME.uid
      && (u.badgeStatus === 'verified' || u.badgeStatus === 'expert' || u.badgeStatus === 'elite');
  }).sort(function(a, b) { return (b.score || 0) - (a.score || 0); }).slice(0, 4);

  if (!talent.length) {
    talent = getAllUsers().filter(function(u) {
      return u.role !== 'employer' && u.role !== 'client' && u.uid !== ME.uid;
    }).slice(0, 4);
  }
  if (!talent.length) return '';

  var html = '<div style="margin-bottom:14px;">';
  html += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">';
  html += '<div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:800;font-size:12px;color:var(--td);text-transform:uppercase;letter-spacing:.5px;">Featured Talent</div>';
  html += '<button onclick="showPage(\'talent\')" style="background:none;border:none;color:var(--gld);font-size:11px;font-weight:600;cursor:pointer;">Browse all →</button>';
  html += '</div>';

  talent.forEach(function(u) {
    var avH = u.avatar
      ? '<img src="' + u.avatar + '" style="width:40px;height:40px;border-radius:50%;object-fit:cover;">'
      : '<div style="width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,' + u.gradient + ',' + u.gradient + '88);display:flex;align-items:center;justify-content:center;font-family:Plus Jakarta Sans,sans-serif;font-weight:800;font-size:14px;color:#000;">' + initials(u.name) + '</div>';

    html += '<div style="background:var(--s);border:1px solid var(--br);border-radius:12px;padding:12px;margin-bottom:8px;display:flex;align-items:center;gap:10px;">';
    html += avH;
    html += '<div style="flex:1;min-width:0;">';
    html += '<div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:700;font-size:13px;display:flex;align-items:center;gap:4px;">' + u.name + (u.badgeStatus === 'verified' || u.badgeStatus === 'expert' || u.badgeStatus === 'elite' ? '<span style="color:var(--grn);font-size:11px;">✓</span>' : '') + '</div>';
    html += '<div style="font-size:10px;color:var(--td);">' + (CAT_ICONS[u.category] || '') + ' ' + u.category + (u.score > 0 ? ' · ⭐ ' + u.score.toFixed(1) : '') + '</div>';
    html += '</div>';
    html += '<div style="display:flex;flex-direction:column;gap:5px;align-items:flex-end;">';
    html += '<button onclick="viewProfile(\'' + u.uid + '\')" style="background:none;border:1px solid var(--br);border-radius:6px;padding:4px 9px;font-size:10px;font-weight:600;color:var(--tx);cursor:pointer;white-space:nowrap;">View</button>';
    html += '<button onclick="openMsg(\'' + u.uid + '\')" style="background:var(--gld);color:#000;border:none;border-radius:6px;padding:4px 9px;font-size:10px;font-weight:700;cursor:pointer;white-space:nowrap;">Message</button>';
    html += '</div></div>';
  });
  html += '</div>';
  return html;
}

// ── CLIENT: Wallet snapshot ───────────────────────────────
function clientWalletSnap() {
  var wallet = ME.wallet || {};
  var balance = Math.round(wallet.balance || 0);
  var pending = Math.round(wallet.pending || 0);
  if (!balance && !pending) return '';

  return '<div onclick="showPage(\'wallet\')" style="background:linear-gradient(135deg,rgba(96,165,250,.08),rgba(232,197,71,.05));border:1px solid rgba(96,165,250,.2);border-radius:12px;padding:13px;margin-bottom:14px;cursor:pointer;display:flex;align-items:center;justify-content:space-between;">'
    + '<div>'
    + '<div style="font-size:10px;color:var(--td);margin-bottom:2px;">Wallet Balance</div>'
    + '<div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:800;font-size:20px;color:var(--tx);">$' + balance.toLocaleString() + '</div>'
    + (pending ? '<div style="font-size:10px;color:var(--gld);">$' + pending.toLocaleString() + ' in escrow</div>' : '')
    + '</div>'
    + '<div style="text-align:right;">'
    + '<div style="font-size:10px;color:var(--gld);font-weight:600;">Manage →</div>'
    + '</div></div>';
}

// ── Daily tip card (freelancer) ──────────────────────────
function dailyTipCard() {
  var tips = [
    { icon:'💡', text:'Proposals with a personal cover note get hired 4x more often than generic ones.' },
    { icon:'📸', text:'Profiles with a real photo receive 60% more clicks than those without one.' },
    { icon:'⚡', text:'Verified freelancers appear first in client searches — get verified for full visibility.' },
    { icon:'📋', text:'Be specific in proposals. Mention the client\'s gig title and your relevant experience.' },
    { icon:'⏱️', text:'Reply to client messages quickly — response time is a key factor in getting hired.' },
    { icon:'🎨', text:'Upload at least 3 portfolio items to show the range of your work to clients.' },
    { icon:'💰', text:'Funds in escrow are always safe — released to you only when work is confirmed complete.' }
  ];
  var dayIndex = Math.floor(Date.now() / 86400000) % tips.length;
  var tip = tips[dayIndex];
  var dismissKey = 'tip_d_' + Math.floor(Date.now() / 86400000);
  if (LOCAL.get(dismissKey)) return '';
  return '<div style="background:rgba(96,165,250,.06);border:1px solid rgba(96,165,250,.2);border-radius:12px;padding:13px;margin-bottom:14px;display:flex;align-items:flex-start;gap:10px;">'    +'<div style="font-size:22px;flex-shrink:0;margin-top:1px;">'+tip.icon+'</div>'    +'<div style="flex:1;"><div style="font-size:10px;font-weight:700;color:var(--blu);text-transform:uppercase;letter-spacing:.5px;margin-bottom:3px;">Tip of the Day</div>'    +'<div style="font-size:11px;color:var(--td);line-height:1.6;">'+tip.text+'</div></div>'    +'<button onclick="LOCAL.set(\''+dismissKey+'\',1);renderRoleHome()" style="background:none;border:none;color:var(--td);font-size:16px;cursor:pointer;padding:0;flex-shrink:0;line-height:1;">✕</button>'    +'</div>';
}

// ── FREELANCER HOME BUILD ──────────────────────────────────
function buildFreelancerHome() {
  var firstName = (ME.name || 'there').split(' ')[0];
  var html = '<div style="padding:16px 14px 80px;">';

  // Greeting
  html += '<div style="margin-bottom:18px;">';
  html += '<div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:800;font-size:20px;color:var(--tx);line-height:1.3;">' + greetingWord() + ', ' + firstName + ' 👋' + verifiedBadgeInline() + '</div>';
  html += '<div style="font-size:11px;color:var(--td);margin-top:4px;">' + (ME.title || 'SkillStamp Freelancer') + '</div>';
  html += '</div>';

  // Profile strength
  html += profileStrength();

  // Verification nudge
  html += verifNudge();

  // Active work
  html += activeGigCard();

  // Earnings (only if has activity)
  html += earningsMini();

  // Tip card (dismissable, rotates daily)
  html += dailyTipCard();

  // Quick actions
  html += quickActionsRow('freelancer');

  // Proposals summary
  html += proposalsSummary();

  // Matching gigs
  html += matchingGigsSection();

  html += '</div>';
  return html;
}

// ── CLIENT: Recent transactions ──────────────────────────
function clientRecentTransactions() {
  var wallet = ME.wallet || {};
  var txns = (wallet.transactions || []).slice(0, 4);
  if (!txns.length) return '';

  var html = '<div style="margin-bottom:14px;">';
  html += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">';
  html += '<div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:800;font-size:12px;color:var(--td);text-transform:uppercase;letter-spacing:.5px;">Recent Transactions</div>';
  html += '<button onclick="showPage(\'wallet\')" style="background:none;border:none;color:var(--gld);font-size:11px;font-weight:600;cursor:pointer;">Wallet →</button>';
  html += '</div>';
  html += '<div style="background:var(--s);border:1px solid var(--br);border-radius:12px;overflow:hidden;">';
  txns.forEach(function(t, i) {
    var isOut = t.type === 'out';
    html += '<div style="display:flex;align-items:center;gap:10px;padding:11px 14px;' + (i < txns.length - 1 ? 'border-bottom:1px solid var(--br);' : '') + '">';
    html += '<div style="width:32px;height:32px;border-radius:50%;background:' + (isOut ? 'rgba(255,107,53,.1)' : 'rgba(74,222,128,.1)') + ';display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0;">' + (isOut ? '📤' : '📥') + '</div>';
    html += '<div style="flex:1;min-width:0;">';
    html += '<div style="font-size:12px;font-weight:600;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;">' + (t.desc || (isOut ? 'Payment sent' : 'Funds received')) + '</div>';
    html += '<div style="font-size:9px;color:var(--td);">' + timeAgo(t.ts) + '</div>';
    html += '</div>';
    html += '<div style="font-size:13px;font-weight:700;color:' + (isOut ? 'var(--acc)' : 'var(--grn)') + ';flex-shrink:0;">' + (isOut ? '-' : '+') + '$' + Math.round(t.amount || 0).toLocaleString() + '</div>';
    html += '</div>';
  });
  html += '</div></div>';
  return html;
}

// ── CLIENT HOME BUILD ──────────────────────────────────────
function buildClientHome() {
  var firstName = (ME.name || 'there').split(' ')[0];
  var html = '<div style="padding:16px 14px 80px;">';

  // Greeting
  html += '<div style="margin-bottom:18px;">';
  html += '<div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:800;font-size:20px;color:var(--tx);line-height:1.3;">' + greetingWord() + ', ' + firstName + ' 👋</div>';
  html += '<div style="font-size:11px;color:var(--td);margin-top:4px;">Client Account · SkillStamp</div>';
  html += '</div>';

  // Wallet snap
  html += clientWalletSnap();

  // Quick actions
  html += quickActionsRow('client');

  // Active gigs
  html += clientActiveGigs();

  // Featured talent
  html += featuredTalent();

  // Recent transactions
  html += clientRecentTransactions();

  html += '</div>';
  return html;
}

// ── Wire events after render ───────────────────────────────
function wireHomeEvents() {
  // nothing to wire — all done via inline onclick
}

// ── updateHomeStats — now a no-op (IDs removed from HTML) ─
window.updateHomeStats = function() {
  // Home is now fully dynamic via renderRoleHome
  // Trigger a re-render if home is active
  var pg = document.getElementById('page-home');
  if (pg && pg.classList.contains('active')) {
    renderRoleHome();
  }
};

