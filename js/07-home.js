// SkillStamp — Home Dashboard (2026 Premium Redesign)
// Glassmorphism · Squircle avatars · Gamified progress · Dock nav
// Logic preserved 100% — only UI/CSS changed.

// ═══════════════════════════════════════════════════
//  DESIGN TOKENS
// ═══════════════════════════════════════════════════
var D = {
  r24: 'border-radius:24px',
  r20: 'border-radius:20px',
  r16: 'border-radius:16px',
  r12: 'border-radius:12px',
  r8:  'border-radius:8px',
  shadow: 'box-shadow:0 2px 8px rgba(0,0,0,.14),0 8px 24px rgba(0,0,0,.10)',
  shadowHov: 'box-shadow:0 8px 24px rgba(0,0,0,.22),0 16px 48px rgba(0,0,0,.16)',
  shadowGold: 'box-shadow:0 4px 20px rgba(232,197,71,.25)',
  trans: 'transition:all .22s cubic-bezier(.22,.68,0,1.2)',
  font: 'font-family:Plus Jakarta Sans,sans-serif',
  glass: 'background:rgba(255,255,255,.06);border:0.5px solid rgba(255,255,255,.14);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px)',
};

// ═══════════════════════════════════════════════════
//  MAIN RENDER
// ═══════════════════════════════════════════════════
window.renderRoleHome = function() {
  var pg = document.getElementById('page-home');
  if (!pg || !ME) return;
  pg.innerHTML = (ME.role === 'employer' || ME.role === 'client')
    ? buildClientHome()
    : buildFreelancerHome();
};
window.renderTimeline = window.renderRoleHome;

// ═══════════════════════════════════════════════════
//  SHARED HELPERS  (all preserved)
// ═══════════════════════════════════════════════════
function greetingWord() {
  var h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}
function isVerified(u) {
  u = u || ME;
  return u.badgeStatus === 'verified' || u.badgeStatus === 'expert' || u.badgeStatus === 'elite';
}
function verifiedChip(small) {
  var sz = small ? 'font-size:8px;padding:2px 6px' : 'font-size:9px;padding:3px 8px';
  return '<span style="display:inline-flex;align-items:center;gap:3px;background:linear-gradient(135deg,rgba(74,222,128,.18),rgba(74,222,128,.08));border:1px solid rgba(74,222,128,.4);color:#4ade80;font-weight:800;border-radius:20px;vertical-align:middle;letter-spacing:.02em;'+sz+'">&#10003; Verified</span>';
}
function sectionHeader(title, linkLabel, linkOnclick) {
  var link = linkLabel
    ? '<button onclick="'+linkOnclick+'" style="background:none;border:none;color:var(--gld);font-size:11px;font-weight:700;cursor:pointer;padding:0;letter-spacing:.02em;display:flex;align-items:center;gap:3px;">'+linkLabel+' <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg></button>'
    : '';
  return '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">'
    + '<div style="'+D.font+';font-weight:800;font-size:14px;color:var(--tx);letter-spacing:-.02em;">'+title+'</div>'
    + link + '</div>';
}
function skeletonCard(h) {
  h = h || 72;
  return '<div style="height:'+h+'px;background:linear-gradient(90deg,var(--s2) 25%,var(--s3) 50%,var(--s2) 75%);background-size:200% 100%;animation:shimmer 1.4s infinite;border-radius:20px;margin-bottom:8px;"></div>';
}
// Squircle avatar (rounded square for talent cards)
function mkAvatarSquircle(u, size) {
  size = size || 44;
  var r = Math.round(size * 0.28) + 'px';
  if (u.avatar) return '<img src="'+u.avatar+'" style="width:'+size+'px;height:'+size+'px;border-radius:'+r+';object-fit:cover;flex-shrink:0;border:1.5px solid rgba(255,255,255,.1);">';
  return '<div style="width:'+size+'px;height:'+size+'px;border-radius:'+r+';background:linear-gradient(135deg,'+u.gradient+','+u.gradient+'88);display:flex;align-items:center;justify-content:center;'+D.font+';font-weight:800;font-size:'+(size*0.33)+'px;color:#000;flex-shrink:0;">'+initials(u.name)+'</div>';
}
// Standard round avatar
function mkAvatar(u, size, radius) {
  size = size || 40; radius = radius || '50%';
  if (u.avatar) return '<img src="'+u.avatar+'" style="width:'+size+'px;height:'+size+'px;border-radius:'+radius+';object-fit:cover;flex-shrink:0;">';
  return '<div style="width:'+size+'px;height:'+size+'px;border-radius:'+radius+';background:linear-gradient(135deg,'+u.gradient+','+u.gradient+'88);display:flex;align-items:center;justify-content:center;'+D.font+';font-weight:800;font-size:'+(size*0.35)+'px;color:#000;flex-shrink:0;">'+initials(u.name)+'</div>';
}
function statusPill(label, color, bg) {
  return '<span style="display:inline-block;'+D.font+';font-size:9px;font-weight:700;color:'+color+';background:'+bg+';padding:3px 9px;border-radius:20px;text-transform:uppercase;letter-spacing:.05em;">'+label+'</span>';
}
function btnPrimary(label, onclick) {
  return '<button onclick="'+onclick+'" style="'+D.font+';font-weight:700;font-size:11px;color:#000;background:var(--gld);border:none;padding:9px 16px;border-radius:12px;cursor:pointer;'+D.trans+';white-space:nowrap;display:inline-flex;align-items:center;gap:5px;'+D.shadowGold+'" onmouseover="this.style.transform=\'translateY(-2px)\';this.style.boxShadow=\'0 8px 24px rgba(232,197,71,.4)\'" onmouseout="this.style.transform=\'\';this.style.boxShadow=\'0 4px 20px rgba(232,197,71,.25)\'">'+label+'</button>';
}
function btnGhost(label, onclick) {
  return '<button onclick="'+onclick+'" style="'+D.font+';font-weight:600;font-size:11px;color:var(--tx);background:none;border:1px solid var(--br);padding:8px 14px;border-radius:12px;cursor:pointer;'+D.trans+';white-space:nowrap;" onmouseover="this.style.borderColor=\'var(--gld)\';this.style.color=\'var(--gld)\'" onmouseout="this.style.borderColor=\'var(--br)\';this.style.color=\'var(--tx)\'">'+label+'</button>';
}

// ═══════════════════════════════════════════════════
//  FREELANCER COMPONENTS
// ═══════════════════════════════════════════════════

function fHero() {
  var firstName = (ME.name || 'there').split(' ')[0];
  var wallet  = ME.wallet || {};
  var earned  = Math.round(wallet.earned  || ME.earned  || 0);
  var balance = Math.round(wallet.balance || 0);
  var isVerif = isVerified();

  var _comp = (typeof calculateProfileCompletion === 'function')
    ? calculateProfileCompletion(ME) : { pct: 0 };
  var pct  = _comp.pct;
  var ring = (typeof buildCompletionRing === 'function')
    ? buildCompletionRing(pct, 56)
    : '<svg width="56" height="56" viewBox="0 0 56 56"><text x="28" y="33" text-anchor="middle" font-size="11">'+pct+'%</text></svg>';

  // Mesh gradient hero background
  var html = '<div style="background:linear-gradient(145deg,#081c0f 0%,#0d2e18 40%,#0a2014 70%,#0c1a10 100%);border-radius:28px;padding:22px 20px;margin-bottom:16px;position:relative;overflow:hidden;">';
  // Mesh orbs
  html += '<div style="position:absolute;right:-30px;top:-30px;width:140px;height:140px;border-radius:50%;background:radial-gradient(circle,rgba(74,222,128,.12) 0%,transparent 70%);pointer-events:none;"></div>';
  html += '<div style="position:absolute;left:-20px;bottom:-40px;width:120px;height:120px;border-radius:50%;background:radial-gradient(circle,rgba(232,197,71,.08) 0%,transparent 70%);pointer-events:none;"></div>';
  html += '<div style="position:absolute;right:60px;bottom:-20px;width:80px;height:80px;border-radius:50%;background:radial-gradient(circle,rgba(96,165,250,.06) 0%,transparent 70%);pointer-events:none;"></div>';

  // Top row: greeting + ring
  html += '<div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:18px;">';
  html += '<div>';
  html += '<div style="font-size:11px;color:rgba(255,255,255,.45);margin-bottom:4px;letter-spacing:.02em;">'+greetingWord()+'</div>';
  html += '<div style="'+D.font+';font-weight:800;font-size:22px;color:#fff;line-height:1.1;letter-spacing:-.03em;">'+firstName+' 👋</div>';
  if (isVerif) {
    html += '<div style="margin-top:7px;">'+verifiedChip()+'</div>';
  } else {
    html += '<button onclick="openSubmitSkill()" style="margin-top:7px;background:rgba(232,197,71,.12);border:1px solid rgba(232,197,71,.28);color:#e8c547;font-size:9px;font-weight:700;padding:4px 10px;border-radius:20px;cursor:pointer;'+D.font+';letter-spacing:.03em;">⚡ Get Verified →</button>';
  }
  html += '</div>';
  // Profile ring
  html += '<div onclick="showPage(\'myprofile\')" style="display:flex;flex-direction:column;align-items:center;cursor:pointer;opacity:.95;">'+ring;
  html += '<div style="font-size:8px;color:rgba(255,255,255,.35);margin-top:3px;letter-spacing:.04em;">PROFILE</div></div>';
  html += '</div>';

  // Glass stat cards
  html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px;">';

  // Balance card with subtle glow
  html += '<div onclick="showPage(\'wallet\')" style="background:rgba(255,255,255,.06);border:0.5px solid rgba(255,255,255,.14);border-radius:16px;padding:13px 14px;cursor:pointer;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);position:relative;overflow:hidden;" onmouseover="this.style.background=\'rgba(255,255,255,.10)\'" onmouseout="this.style.background=\'rgba(255,255,255,.06)\'">';
  html += '<div style="position:absolute;bottom:-8px;right:-8px;width:50px;height:50px;border-radius:50%;background:radial-gradient(circle,rgba(74,222,128,.18) 0%,transparent 70%);pointer-events:none;"></div>';
  html += '<div style="font-size:9px;color:rgba(255,255,255,.4);margin-bottom:5px;text-transform:uppercase;letter-spacing:.06em;">Wallet</div>';
  html += '<div style="'+D.font+';font-weight:900;font-size:20px;color:#4ade80;letter-spacing:-.03em;text-shadow:0 0 20px rgba(74,222,128,.4);">$'+balance.toLocaleString()+'</div>';
  html += '</div>';

  // Earned card
  html += '<div onclick="showPage(\'wallet\')" style="background:rgba(255,255,255,.06);border:0.5px solid rgba(255,255,255,.14);border-radius:16px;padding:13px 14px;cursor:pointer;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);position:relative;overflow:hidden;" onmouseover="this.style.background=\'rgba(255,255,255,.10)\'" onmouseout="this.style.background=\'rgba(255,255,255,.06)\'">';
  html += '<div style="position:absolute;bottom:-8px;right:-8px;width:50px;height:50px;border-radius:50%;background:radial-gradient(circle,rgba(232,197,71,.15) 0%,transparent 70%);pointer-events:none;"></div>';
  html += '<div style="font-size:9px;color:rgba(255,255,255,.4);margin-bottom:5px;text-transform:uppercase;letter-spacing:.06em;">Earned</div>';
  html += '<div style="'+D.font+';font-weight:900;font-size:20px;color:#e8c547;letter-spacing:-.03em;text-shadow:0 0 20px rgba(232,197,71,.35);">$'+earned.toLocaleString()+'</div>';
  html += '</div>';
  html += '</div>';

  // CTA buttons — clear hierarchy
  html += '<div style="display:flex;gap:10px;">';
  html += '<button onclick="showPage(\'gigs\')" style="flex:1.6;'+D.font+';font-weight:800;font-size:13px;color:#000;background:#e8c547;border:none;padding:13px;border-radius:16px;cursor:pointer;'+D.trans+';box-shadow:0 4px 20px rgba(232,197,71,.45);letter-spacing:-.01em;" onmouseover="this.style.background=\'#f5d460\';this.style.transform=\'translateY(-1px)\'" onmouseout="this.style.background=\'#e8c547\';this.style.transform=\'\'\" onmousedown="this.style.transform=\'scale(0.97)\'" onmouseup="this.style.transform=\'\'">💼 Browse Gigs</button>';
  html += '<button onclick="showPage(\'myprofile\')" style="flex:1;'+D.font+';font-weight:600;font-size:12px;color:rgba(255,255,255,.75);background:rgba(255,255,255,.08);border:0.5px solid rgba(255,255,255,.18);padding:13px;border-radius:16px;cursor:pointer;'+D.trans+'" onmouseover="this.style.background=\'rgba(255,255,255,.13)\'" onmouseout="this.style.background=\'rgba(255,255,255,.08)\'">My Profile</button>';
  html += '</div>';
  html += '</div>';
  return html;
}

// Gamified profile completion — accordion-style prompts
function fProfileCard() {
  if (typeof calculateProfileCompletion !== 'function') return '';
  var comp = calculateProfileCompletion(ME);
  if (comp.pct >= 100) return '';

  var pct      = comp.pct;
  var prompts  = comp.missing.slice(0, 3);
  var barColor = pct < 40 ? '#f87171' : pct < 75 ? '#e8c547' : '#4ade80';
  var tierLabel = pct < 40 ? 'Getting Started' : pct < 75 ? 'Building Up' : 'Almost There!';

  var html = '<div style="background:var(--s);border:1px solid var(--br);border-radius:24px;padding:18px 16px;margin-bottom:14px;'+D.shadow+';">';
  // Header row
  html += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">';
  html += '<div>';
  html += '<div style="'+D.font+';font-weight:800;font-size:14px;letter-spacing:-.02em;">Profile Strength</div>';
  html += '<div style="font-size:10px;color:var(--td);margin-top:2px;">'+tierLabel+'</div>';
  html += '</div>';
  // Pct badge
  html += '<div style="background:'+barColor+';color:#000;'+D.font+';font-weight:900;font-size:13px;padding:5px 11px;border-radius:20px;box-shadow:0 2px 8px rgba(0,0,0,.2);">'+pct+'%</div>';
  html += '</div>';
  // Sleek segmented bar
  var segments = 10;
  var filled   = Math.round(pct / (100 / segments));
  html += '<div style="display:flex;gap:3px;margin-bottom:14px;">';
  for (var i = 0; i < segments; i++) {
    var active = i < filled;
    html += '<div style="flex:1;height:5px;border-radius:3px;background:'+(active ? barColor : 'var(--s2)')+';'+D.trans+';"></div>';
  }
  html += '</div>';
  // Prompt label
  html += '<div style="font-size:10px;color:var(--td);margin-bottom:10px;font-weight:600;">Complete to unlock more client visibility:</div>';
  // Accordion-style prompt items
  prompts.forEach(function(step, i) {
    html += '<div onclick="'+step.action+'" style="display:flex;align-items:center;gap:12px;padding:11px 13px;background:var(--s2);border-radius:14px;margin-bottom:7px;cursor:pointer;border:1px solid transparent;'+D.trans+'" onmouseover="this.style.borderColor=\'rgba(232,197,71,.3)\';this.style.background=\'var(--s3)\'" onmouseout="this.style.borderColor=\'transparent\';this.style.background=\'var(--s2)\'">';
    // Step number circle
    html += '<div style="width:26px;height:26px;border-radius:50%;background:rgba(232,197,71,.1);border:1.5px dashed rgba(232,197,71,.5);display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:10px;font-weight:800;color:var(--gld);">'+(i+1)+'</div>';
    html += '<div style="flex:1;'+D.font+';font-size:12px;font-weight:600;color:var(--tx);">'+step.label+'</div>';
    html += '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--gld)" stroke-width="2.5" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg>';
    html += '</div>';
  });
  html += '</div>';
  return html;
}

function fActiveWork() {
  var apps = (ME.applications || []).filter(function(a){ return a.status === 'accepted'; });
  if (!apps.length) return '';
  var gigs = apps.slice(0,2).map(function(app){ return getGigs().find(function(g){ return g.id === app.gigId; }); }).filter(Boolean);
  if (!gigs.length) return '';
  var statusMap = {hired:{label:'In Progress',color:'#60a5fa',bg:'rgba(96,165,250,.1)'},delivered:{label:'Awaiting Review',color:'#e8c547',bg:'rgba(232,197,71,.1)'},completed:{label:'Complete',color:'#4ade80',bg:'rgba(74,222,128,.1)'}};
  var html = '<div style="margin-bottom:16px;">' + sectionHeader('Active Work', null, '');
  gigs.forEach(function(g) {
    var sm = statusMap[g.status] || {label:g.status,color:'var(--td)',bg:'var(--s2)'};
    html += '<div onclick="openGigWorkspace(\''+g.id+'\')" style="background:var(--s);border:1px solid var(--br);border-radius:20px;padding:15px;margin-bottom:9px;cursor:pointer;'+D.shadow+';'+D.trans+'" onmouseover="this.style.transform=\'translateY(-2px)\';this.style.boxShadow=\'0 8px 24px rgba(0,0,0,.16)\'" onmouseout="this.style.transform=\'\';this.style.boxShadow=\'0 2px 8px rgba(0,0,0,.14),0 8px 24px rgba(0,0,0,.10)\'">';
    html += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:9px;">';
    html += '<div style="'+D.font+';font-weight:700;font-size:13px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;flex:1;margin-right:10px;">'+g.title+'</div>';
    html += statusPill(sm.label, sm.color, sm.bg);
    html += '</div>';
    html += '<div style="display:flex;align-items:center;justify-content:space-between;">';
    html += '<div style="font-size:10px;color:var(--td);">📌 '+(g.posterName||'Client')+'&nbsp;·&nbsp;<span style="color:#4ade80;font-weight:800;">$'+(g.pay||g.escrowAmount||'—')+'</span></div>';
    html += '<button onclick="event.stopPropagation();openGigWorkspace(\''+g.id+'\')" style="'+D.font+';font-size:10px;font-weight:700;color:var(--gld);background:rgba(232,197,71,.1);border:1px solid rgba(232,197,71,.2);padding:5px 11px;border-radius:10px;cursor:pointer;">Workspace →</button>';
    html += '</div></div>';
  });
  html += '</div>';
  return html;
}

function fProposals() {
  var apps = ME.applications || [];
  if (!apps.length) return '';
  var pending  = apps.filter(function(a){return a.status==='pending';}).length;
  var accepted = apps.filter(function(a){return a.status==='accepted';}).length;
  var rejected = apps.filter(function(a){return a.status==='rejected';}).length;
  var html = '<div style="background:var(--s);border:1px solid var(--br);border-radius:24px;padding:16px;margin-bottom:14px;cursor:pointer;'+D.shadow+'" onclick="showPage(\'gigs\');switchGigTab(\'myapps\')">';
  html += sectionHeader('My Proposals', 'View all', "showPage('gigs');switchGigTab('myapps')");
  html += '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:9px;">';
  [{val:pending,label:'Pending',color:'#e8c547',bg:'rgba(232,197,71,.07)'},{val:accepted,label:'Accepted',color:'#4ade80',bg:'rgba(74,222,128,.07)'},{val:rejected,label:'Rejected',color:'var(--td)',bg:'var(--s2)'}].forEach(function(c) {
    html += '<div style="text-align:center;background:'+c.bg+';border-radius:14px;padding:12px 6px;">';
    html += '<div style="'+D.font+';font-weight:900;font-size:24px;color:'+c.color+';letter-spacing:-.03em;">'+c.val+'</div>';
    html += '<div style="font-size:9px;color:var(--td);margin-top:3px;font-weight:600;text-transform:uppercase;letter-spacing:.04em;">'+c.label+'</div>';
    html += '</div>';
  });
  html += '</div></div>';
  return html;
}

function fRecommendedGigs() {
  var shown;
  if (typeof getHomeGigs === 'function') {
    shown = getHomeGigs(4);
  } else {
    var cat  = ME.category || '';
    var open = getGigs().filter(function(g){return g.status==='open';});
    var matched = cat ? open.filter(function(g){return g.category===cat;}) : [];
    shown = (matched.length >= 2 ? matched : open).slice(0, 4);
  }
  if (!shown.length) return '';
  var applied = (ME.applications||[]).map(function(a){return a.gigId;});
  var html = '<div style="margin-bottom:16px;">';
  html += sectionHeader('✨ Recommended for You', 'See all', "showPage('gigs')");
  shown.forEach(function(g) {
    var icon = CAT_ICONS[g.category] || '💼';
    var isApplied = applied.indexOf(g.id) >= 0;
    html += '<div style="background:var(--s);border:1px solid var(--br);border-radius:20px;padding:14px 15px;margin-bottom:9px;'+D.shadow+';'+D.trans+'" onmouseover="this.style.borderColor=\'rgba(232,197,71,.35)\';this.style.transform=\'translateY(-1px)\'" onmouseout="this.style.borderColor=\'var(--br)\';this.style.transform=\'\'">';
    html += '<div style="display:flex;align-items:flex-start;gap:12px;">';
    html += '<div style="width:42px;height:42px;border-radius:13px;background:rgba(232,197,71,.08);border:1px solid rgba(232,197,71,.14);display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;">'+icon+'</div>';
    html += '<div style="flex:1;min-width:0;">';
    html += '<div style="'+D.font+';font-weight:700;font-size:13px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;margin-bottom:3px;letter-spacing:-.01em;">'+g.title+'</div>';
    html += '<div style="font-size:10px;color:var(--td);">'+(g.posterName||'Client')+'&nbsp;·&nbsp;'+g.category+'</div>';
    html += '<div style="display:flex;align-items:center;justify-content:space-between;margin-top:11px;">';
    html += '<span style="'+D.font+';font-weight:900;font-size:15px;color:#4ade80;letter-spacing:-.02em;">$'+(g.pay||'Open')+'</span>';
    if (isApplied) {
      html += statusPill('Applied','var(--td)','var(--s2)');
    } else {
      html += btnPrimary('Apply →', "applyGig('"+g.id+"','"+g.title.replace(/'/g,'')+"','"+g.posterUid+"')");
    }
    html += '</div></div></div></div>';
  });
  html += '</div>';
  return html;
}

function fTipCard() {
  var tips = [
    {icon:'💡',title:'Win more proposals',body:'Personalise every cover note. Mention the client\'s specific project — generic proposals get ignored.'},
    {icon:'📸',title:'Photo = 60% more clicks',body:'Profiles with a real photo get significantly more client views than those without.'},
    {icon:'⚡',title:'Verification = visibility',body:'Verified freelancers appear first in searches and get unlimited proposals.'},
    {icon:'⏱️',title:'Speed matters',body:'Replying to client messages within an hour dramatically improves your hire rate.'},
    {icon:'🎨',title:'Build your portfolio',body:'Aim for at least 3 portfolio items. Clients want proof of work before hiring.'},
    {icon:'🔒',title:'Escrow protects you',body:'Funds are locked before work starts. You always get paid when work is approved.'},
    {icon:'📊',title:'Quality over quantity',body:'One strong, tailored proposal beats ten generic ones every time.'},
  ];
  var tip = tips[Math.floor(Date.now()/86400000) % tips.length];
  var key = 'tip_d_'+Math.floor(Date.now()/86400000);
  if (LOCAL.get(key)) return '';
  var html = '<div style="background:linear-gradient(135deg,rgba(96,165,250,.07),rgba(96,165,250,.03));border:1px solid rgba(96,165,250,.2);border-radius:20px;padding:14px 15px;margin-bottom:20px;display:flex;gap:12px;align-items:flex-start;">';
  html += '<div style="width:38px;height:38px;background:rgba(96,165,250,.12);border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;">'+tip.icon+'</div>';
  html += '<div style="flex:1;">';
  html += '<div style="font-size:9px;font-weight:800;color:#60a5fa;text-transform:uppercase;letter-spacing:.08em;margin-bottom:3px;">Tip of the day</div>';
  html += '<div style="'+D.font+';font-weight:700;font-size:12px;color:var(--tx);margin-bottom:3px;">'+tip.title+'</div>';
  html += '<div style="font-size:11px;color:var(--td);line-height:1.6;">'+tip.body+'</div>';
  html += '</div>';
  html += '<button onclick="LOCAL.set(\''+key+'\',1);renderRoleHome()" style="background:none;border:none;color:var(--td);font-size:18px;cursor:pointer;padding:0;line-height:1;flex-shrink:0;opacity:.6;">✕</button>';
  html += '</div>';
  return html;
}

// ═══════════════════════════════════════════════════
//  CLIENT COMPONENTS
// ═══════════════════════════════════════════════════

function cHero() {
  var firstName = (ME.name || 'there').split(' ')[0];
  var wallet = ME.wallet || {};
  var balance = Math.round(wallet.balance || 0);
  var pending = Math.round(wallet.pending || 0);
  var myGigs = getGigs().filter(function(g){ return g.posterUid === ME.uid; });
  var activeCount     = myGigs.filter(function(g){ return g.status === 'hired' || g.status === 'open'; }).length;
  var totalApplicants = myGigs.reduce(function(sum, g){ return sum + (g.applicants||[]).length; }, 0);

  // Deep blue-navy glassmorphism hero
  var html = '<div style="background:linear-gradient(145deg,#080f1c 0%,#0c1930 40%,#081428 70%,#080f1c 100%);border-radius:28px;padding:22px 20px;margin-bottom:16px;position:relative;overflow:hidden;">';
  html += '<div style="position:absolute;right:-30px;top:-30px;width:160px;height:160px;border-radius:50%;background:radial-gradient(circle,rgba(96,165,250,.1) 0%,transparent 70%);pointer-events:none;"></div>';
  html += '<div style="position:absolute;left:-20px;bottom:-50px;width:130px;height:130px;border-radius:50%;background:radial-gradient(circle,rgba(232,197,71,.07) 0%,transparent 70%);pointer-events:none;"></div>';

  html += '<div style="margin-bottom:18px;">';
  html += '<div style="font-size:11px;color:rgba(255,255,255,.4);margin-bottom:4px;letter-spacing:.02em;">'+greetingWord()+'</div>';
  html += '<div style="'+D.font+';font-weight:800;font-size:22px;color:#fff;margin-bottom:5px;letter-spacing:-.03em;">'+firstName+' 👋</div>';
  html += '<div style="font-size:10px;color:rgba(255,255,255,.35);letter-spacing:.03em;text-transform:uppercase;">Client &nbsp;·&nbsp; SkillStamp</div>';
  html += '</div>';

  // Glassmorphism stat cards with semi-transparent border
  html += '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:9px;margin-bottom:16px;">';
  var stats = [
    {val:'$'+balance.toLocaleString(), label:'Balance',    sub:pending?'$'+pending.toLocaleString()+' held':'Available', onclick:"showPage('wallet')", glow:'rgba(74,222,128,.15)'},
    {val:activeCount,                   label:'Active Gigs', sub:'Running',                                                onclick:"showPage('gigs')",   glow:'rgba(96,165,250,.12)'},
    {val:totalApplicants,               label:'Applicants',  sub:'To review',                                              onclick:"showPage('gigs')",   glow:'rgba(232,197,71,.12)'},
  ];
  stats.forEach(function(s) {
    html += '<div onclick="'+s.onclick+'" style="background:rgba(255,255,255,.06);border:0.5px solid rgba(255,255,255,.15);border-radius:16px;padding:11px 10px;cursor:pointer;backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);position:relative;overflow:hidden;'+D.trans+'" onmouseover="this.style.background=\'rgba(255,255,255,.10)\'" onmouseout="this.style.background=\'rgba(255,255,255,.06)\'">';
    html += '<div style="position:absolute;bottom:-10px;right:-10px;width:50px;height:50px;border-radius:50%;background:radial-gradient(circle,'+s.glow+' 0%,transparent 70%);pointer-events:none;"></div>';
    html += '<div style="'+D.font+';font-weight:900;font-size:18px;color:#fff;line-height:1;letter-spacing:-.03em;">'+s.val+'</div>';
    html += '<div style="font-size:9px;color:rgba(255,255,255,.45);margin-top:4px;font-weight:600;text-transform:uppercase;letter-spacing:.04em;">'+s.label+'</div>';
    if (s.sub) html += '<div style="font-size:8px;color:rgba(255,255,255,.28);margin-top:2px;">'+s.sub+'</div>';
    html += '</div>';
  });
  html += '</div>';

  // CTAs
  html += '<div style="display:flex;gap:10px;">';
  html += '<button onclick="openPostGig()" style="flex:1.5;'+D.font+';font-weight:800;font-size:13px;color:#000;background:#e8c547;border:none;padding:13px;border-radius:16px;cursor:pointer;'+D.trans+';box-shadow:0 4px 20px rgba(232,197,71,.4);letter-spacing:-.01em;" onmouseover="this.style.background=\'#f5d460\';this.style.transform=\'translateY(-1px)\'" onmouseout="this.style.background=\'#e8c547\';this.style.transform=\'\'\" onmousedown="this.style.transform=\'scale(0.97)\'" onmouseup="this.style.transform=\'\'">+ Post a Gig</button>';
  html += '<button onclick="showPage(\'talent\')" style="flex:1;'+D.font+';font-weight:600;font-size:12px;color:rgba(255,255,255,.75);background:rgba(255,255,255,.08);border:0.5px solid rgba(255,255,255,.18);padding:13px;border-radius:16px;cursor:pointer;'+D.trans+'" onmouseover="this.style.background=\'rgba(255,255,255,.13)\'" onmouseout="this.style.background=\'rgba(255,255,255,.08)\'">Browse Talent</button>';
  html += '</div></div>';
  return html;
}

function cActiveGigs() {
  var myGigs = getGigs().filter(function(g){ return g.posterUid === ME.uid && g.status !== 'completed' && g.status !== 'cancelled'; });

  if (!myGigs.length) {
    // Quick-start category cards instead of dashed briefcase box
    var quickStart = [
      {icon:'🎨', title:'Post a Design Gig',     sub:'Logo, UI, Brand', cat:'Graphics Design'},
      {icon:'💻', title:'Hire a Developer',       sub:'Web, Mobile, API', cat:'Web & Mobile Dev'},
      {icon:'✍️', title:'Get Content Written',    sub:'Blog, Copy, SEO', cat:'Content Writing'},
      {icon:'📣', title:'Boost Your Marketing',   sub:'Ads, Social, SEO', cat:'Digital Marketing'},
    ];
    var html = '<div style="margin-bottom:28px;">';
    html += sectionHeader('Quick Start', null, '');
    html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">';
    quickStart.forEach(function(q) {
      html += '<div onclick="openPostGig()" style="background:var(--s);border:1px solid var(--br);border-radius:20px;padding:16px 14px;cursor:pointer;'+D.shadow+';'+D.trans+'" onmouseover="this.style.transform=\'translateY(-3px)\';this.style.boxShadow=\'0 10px 28px rgba(0,0,0,.18)\';this.style.borderColor=\'rgba(232,197,71,.3)\'" onmouseout="this.style.transform=\'\';this.style.boxShadow=\'0 2px 8px rgba(0,0,0,.14),0 8px 24px rgba(0,0,0,.10)\';this.style.borderColor=\'var(--br)\'" onmousedown="this.style.transform=\'scale(0.97)\'" onmouseup="this.style.transform=\'translateY(-3px)\'">';
      html += '<div style="font-size:26px;margin-bottom:10px;">'+q.icon+'</div>';
      html += '<div style="'+D.font+';font-weight:700;font-size:12px;color:var(--tx);margin-bottom:3px;letter-spacing:-.01em;">'+q.title+'</div>';
      html += '<div style="font-size:10px;color:var(--td);">'+q.sub+'</div>';
      html += '</div>';
    });
    html += '</div></div>';
    return html;
  }

  var statusCfg = {open:{c:'#4ade80',bg:'rgba(74,222,128,.1)'},hired:{c:'#60a5fa',bg:'rgba(96,165,250,.1)'},delivered:{c:'#e8c547',bg:'rgba(232,197,71,.1)'},disputed:{c:'#f87171',bg:'rgba(248,113,113,.1)'}};
  var html = '<div style="margin-bottom:16px;">';
  html += sectionHeader('Your Active Gigs', 'See all', "showPage('gigs')");
  myGigs.slice(0,3).forEach(function(g) {
    var sc = statusCfg[g.status] || {c:'var(--td)',bg:'var(--s2)'};
    var apCount = (g.applicants||[]).length;
    html += '<div style="background:var(--s);border:1px solid var(--br);border-radius:20px;padding:15px;margin-bottom:9px;'+D.shadow+';'+D.trans+'" onmouseover="this.style.transform=\'translateY(-2px)\';this.style.boxShadow=\'0 8px 24px rgba(0,0,0,.16)\'" onmouseout="this.style.transform=\'\';this.style.boxShadow=\'0 2px 8px rgba(0,0,0,.14),0 8px 24px rgba(0,0,0,.10)\'">';
    html += '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:10px;">';
    html += '<div style="'+D.font+';font-weight:700;font-size:13px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;flex:1;letter-spacing:-.01em;">'+g.title+'</div>';
    html += '<div style="display:flex;align-items:center;gap:6px;flex-shrink:0;">';
    if (apCount > 0 && g.status === 'open') html += '<span style="background:var(--acc);color:#fff;'+D.font+';font-size:8px;font-weight:800;padding:2px 7px;border-radius:20px;">'+apCount+' new</span>';
    html += statusPill(g.status, sc.c, sc.bg);
    html += '</div></div>';
    html += '<div style="font-size:10px;color:var(--td);margin-bottom:11px;">$'+(g.pay||g.escrowAmount||'—')+(g.deadline?' &nbsp;·&nbsp; Due: '+g.deadline:'')+'</div>';
    html += '<div style="display:flex;gap:6px;">';
    if (g.status === 'open' && apCount > 0) {
      html += btnPrimary('👥 Review ('+apCount+')', "openHireModal('"+g.id+"')");
    } else if (g.status === 'hired' || g.status === 'delivered') {
      html += btnPrimary('📁 Workspace', "openGigWorkspace('"+g.id+"')");
    } else {
      html += btnGhost('View Details', "showPage('gigs')");
    }
    html += '</div></div>';
  });
  html += '</div>';
  return html;
}

function cFeaturedTalent() {
  var pool = getAllUsers().filter(function(u){ return u.role !== 'employer' && u.role !== 'client' && u.uid !== ME.uid; });
  var verif = pool.filter(isVerified).sort(function(a,b){return (b.score||0)-(a.score||0);}).slice(0,4);
  var talent = verif.length ? verif : pool.slice(0,4);
  if (!talent.length) return '';

  var html = '<div style="margin-bottom:18px;">';
  html += sectionHeader('⭐ Top Verified Talent', 'Browse all', "showPage('talent')");
  talent.forEach(function(u) {
    var verified = isVerified(u);
    var skills   = (u.skills||[]).slice(0,3);
    html += '<div style="background:var(--s);border:1px solid var(--br);border-radius:22px;padding:15px;margin-bottom:10px;'+D.shadow+';'+D.trans+'" onmouseover="this.style.transform=\'translateY(-2px)\';this.style.borderColor=\'rgba(232,197,71,.28)\'" onmouseout="this.style.transform=\'\';this.style.borderColor=\'var(--br)\'">';
    // Top row: squircle avatar + name + badge
    html += '<div style="display:flex;align-items:center;gap:12px;margin-bottom:11px;">';
    html += mkAvatarSquircle(u, 46);
    html += '<div style="flex:1;min-width:0;">';
    html += '<div style="display:flex;align-items:center;gap:7px;flex-wrap:wrap;margin-bottom:3px;">';
    html += '<div style="'+D.font+';font-weight:700;font-size:13px;letter-spacing:-.01em;">'+u.name+'</div>';
    if (verified) html += verifiedChip(true);
    html += '</div>';
    html += '<div style="font-size:10px;color:var(--td);">'+(CAT_ICONS[u.category]||'')+'&nbsp;'+u.category+(u.score>0?' &nbsp;·&nbsp; ⭐ '+u.score.toFixed(1):'')+'</div>';
    html += '</div></div>';
    // Skill tags — brand color tint
    if (skills.length) {
      html += '<div style="display:flex;flex-wrap:wrap;gap:5px;margin-bottom:12px;">';
      skills.forEach(function(sk){
        html += '<span style="font-size:9px;font-weight:600;color:var(--gld);background:rgba(232,197,71,.1);border:1px solid rgba(232,197,71,.18);padding:3px 9px;border-radius:20px;letter-spacing:.02em;">'+sk+'</span>';
      });
      html += '</div>';
    }
    // Actions row — Hire button on the right
    html += '<div style="display:flex;align-items:center;justify-content:space-between;">';
    html += '<button onclick="viewProfile(\''+u.uid+'\')" style="'+D.font+';font-size:11px;font-weight:600;color:var(--td);background:none;border:1px solid var(--br);padding:7px 14px;border-radius:12px;cursor:pointer;'+D.trans+'" onmouseover="this.style.borderColor=\'var(--gld)\';this.style.color=\'var(--gld)\'" onmouseout="this.style.borderColor=\'var(--br)\';this.style.color=\'var(--td)\'">View Profile</button>';
    html += '<button onclick="openHireMe(\''+u.uid+'\')" style="'+D.font+';font-weight:700;font-size:11px;color:#000;background:var(--gld);border:none;padding:8px 16px;border-radius:12px;cursor:pointer;'+D.trans+';'+D.shadowGold+'" onmouseover="this.style.transform=\'translateY(-1px)\'" onmouseout="this.style.transform=\'\'">Hire →</button>';
    html += '</div></div>';
  });
  html += '</div>';
  return html;
}

function cRecentTransactions() {
  var txns = ((ME.wallet||{}).transactions||[]).slice(0,4);
  if (!txns.length) return '';
  var html = '<div style="margin-bottom:16px;">';
  html += sectionHeader('Recent Transactions', 'Wallet', "showPage('wallet')");
  html += '<div style="background:var(--s);border:1px solid var(--br);border-radius:22px;overflow:hidden;'+D.shadow+';">';
  txns.forEach(function(t, i) {
    var isOut = t.type === 'out';
    html += '<div style="display:flex;align-items:center;gap:12px;padding:13px 15px;'+(i<txns.length-1?'border-bottom:1px solid var(--br);':'')+'">';
    html += '<div style="width:36px;height:36px;border-radius:11px;background:'+(isOut?'rgba(248,113,113,.1)':'rgba(74,222,128,.1)')+';display:flex;align-items:center;justify-content:center;font-size:15px;flex-shrink:0;">'+(isOut?'📤':'📥')+'</div>';
    html += '<div style="flex:1;min-width:0;">';
    html += '<div style="'+D.font+';font-size:12px;font-weight:600;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;">'+(t.desc||(isOut?'Payment sent':'Funds received'))+'</div>';
    html += '<div style="font-size:9px;color:var(--td);margin-top:2px;">'+timeAgo(t.ts)+'</div>';
    html += '</div>';
    html += '<div style="'+D.font+';font-size:14px;font-weight:900;color:'+(isOut?'#f87171':'#4ade80')+';flex-shrink:0;letter-spacing:-.02em;">'+(isOut?'-':'+')+'$'+Math.round(t.amount||0).toLocaleString()+'</div>';
    html += '</div>';
  });
  html += '</div></div>';
  return html;
}

// ═══════════════════════════════════════════════════
//  PAGE BUILDERS — no FAB (removed as per spec)
// ═══════════════════════════════════════════════════

function buildFreelancerHome() {
  var html = '<div style="padding:16px 14px 100px;">';
  html += fHero();
  html += fTipCard();
  html += fProfileCard();
  html += fActiveWork();
  html += fProposals();
  html += fRecommendedGigs();
  html += '</div>';
  return html;
}

function buildClientHome() {
  var html = '<div style="padding:16px 14px 100px;">';
  html += cHero();
  html += cActiveGigs();
  html += cFeaturedTalent();
  html += cRecentTransactions();
  html += '</div>';
  return html;
}

// ═══════════════════════════════════════════════════
//  updateHomeStats
// ═══════════════════════════════════════════════════
window.updateHomeStats = function() {
  var pg = document.getElementById('page-home');
  if (pg && pg.classList.contains('active') && ME) renderRoleHome();
};
