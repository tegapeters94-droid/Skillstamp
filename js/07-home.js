// SkillStamp — Home Dashboard v3 (Full Redesign)
// Senior Frontend Engineer + Product Designer quality

// ═══════════════════════════════════════════════════
//  DESIGN TOKENS (inline — consistent 8px grid)
// ═══════════════════════════════════════════════════
var D = {
  r16: 'border-radius:16px',
  r12: 'border-radius:12px',
  r8:  'border-radius:8px',
  shadow: 'box-shadow:0 1px 3px rgba(0,0,0,.12),0 4px 16px rgba(0,0,0,.08)',
  shadowHov: 'box-shadow:0 4px 12px rgba(0,0,0,.18),0 8px 32px rgba(0,0,0,.12)',
  trans: 'transition:all .2s ease',
  font: 'font-family:Plus Jakarta Sans,sans-serif',
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
//  SHARED HELPERS
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
  var sz = small ? 'font-size:8px;padding:2px 5px' : 'font-size:9px;padding:2px 7px';
  return '<span style="display:inline-flex;align-items:center;gap:2px;background:rgba(74,222,128,.12);border:1px solid rgba(74,222,128,.3);color:#4ade80;font-weight:700;border-radius:20px;vertical-align:middle;'+sz+'">&#10003; Verified</span>';
}

function sectionHeader(title, linkLabel, linkOnclick) {
  var link = linkLabel
    ? '<button onclick="'+linkOnclick+'" style="background:none;border:none;color:var(--gld);font-size:11px;font-weight:700;cursor:pointer;padding:0;letter-spacing:.02em;">'+linkLabel+' →</button>'
    : '';
  return '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">'
    + '<div style="'+D.font+';font-weight:800;font-size:13px;color:var(--tx);letter-spacing:-.01em;">'+title+'</div>'
    + link + '</div>';
}

function skeletonCard(h) {
  h = h || 72;
  return '<div style="height:'+h+'px;background:linear-gradient(90deg,var(--s2) 25%,var(--s3) 50%,var(--s2) 75%);background-size:200% 100%;animation:shimmer 1.4s infinite;border-radius:12px;margin-bottom:8px;"></div>';
}

// Avatar builder
function mkAvatar(u, size, radius) {
  size = size || 40;
  radius = radius || '50%';
  if (u.avatar) return '<img src="'+u.avatar+'" style="width:'+size+'px;height:'+size+'px;border-radius:'+radius+';object-fit:cover;flex-shrink:0;">';
  return '<div style="width:'+size+'px;height:'+size+'px;border-radius:'+radius+';background:linear-gradient(135deg,'+u.gradient+','+u.gradient+'88);display:flex;align-items:center;justify-content:center;'+D.font+';font-weight:800;font-size:'+(size*0.35)+'px;color:#000;flex-shrink:0;">'+initials(u.name)+'</div>';
}

// Status pill
function statusPill(label, color, bg) {
  return '<span style="display:inline-block;'+D.font+';font-size:9px;font-weight:700;color:'+color+';background:'+bg+';padding:3px 8px;border-radius:20px;text-transform:uppercase;letter-spacing:.04em;">'+label+'</span>';
}

// Primary button
function btnPrimary(label, onclick, icon) {
  var ic = icon ? '<span style="margin-right:5px;">'+icon+'</span>' : '';
  return '<button onclick="'+onclick+'" style="'+D.font+';font-weight:700;font-size:11px;color:#fff;background:var(--gld);border:none;padding:8px 14px;border-radius:8px;cursor:pointer;'+D.trans+';white-space:nowrap;display:inline-flex;align-items:center;" onmouseover="this.style.transform=\'translateY(-1px)\';this.style.boxShadow=\'0 4px 14px rgba(232,197,71,.35)\'" onmouseout="this.style.transform=\'\';this.style.boxShadow=\'\'">'+ic+label+'</button>';
}

// Ghost button
function btnGhost(label, onclick, icon) {
  var ic = icon ? '<span style="margin-right:5px;">'+icon+'</span>' : '';
  return '<button onclick="'+onclick+'" style="'+D.font+';font-weight:600;font-size:11px;color:var(--tx);background:none;border:1px solid var(--br);padding:7px 13px;border-radius:8px;cursor:pointer;'+D.trans+';white-space:nowrap;display:inline-flex;align-items:center;" onmouseover="this.style.borderColor=\'var(--gld)\';this.style.color=\'var(--gld)\'" onmouseout="this.style.borderColor=\'var(--br)\';this.style.color=\'var(--tx)\'">'+ic+label+'</button>';
}

// ═══════════════════════════════════════════════════
//  FREELANCER COMPONENTS
// ═══════════════════════════════════════════════════

// Hero greeting banner
function fHero() {
  var firstName = (ME.name || 'there').split(' ')[0];
  var wallet = ME.wallet || {};
  var earned = Math.round(wallet.earned || ME.earned || 0);
  var balance = Math.round(wallet.balance || 0);
  var isVerif = isVerified();

  // Circular progress SVG (SVG-based donut)
  var steps = [!!ME.avatar, !!(ME.title && ME.title !== 'Digital Professional'), !!(ME.bio && ME.bio.length >= 50), !!(ME.skills && ME.skills.length > 0), !!(ME.portfolio && ME.portfolio.length > 0), isVerif];
  var done = steps.filter(Boolean).length;
  var pct = Math.round((done / steps.length) * 100);
  var radius = 22, circ = 2 * Math.PI * radius;
  var dash = (pct / 100) * circ;
  var color = pct < 40 ? '#ff6b35' : pct < 80 ? '#e8c547' : '#4ade80';
  var ring = '<svg width="56" height="56" viewBox="0 0 56 56" style="flex-shrink:0;">'
    + '<circle cx="28" cy="28" r="'+radius+'" fill="none" stroke="rgba(255,255,255,.08)" stroke-width="4"/>'
    + '<circle cx="28" cy="28" r="'+radius+'" fill="none" stroke="'+color+'" stroke-width="4" stroke-dasharray="'+dash+' '+circ+'" stroke-dashoffset="'+circ/4+'" stroke-linecap="round" style="transition:stroke-dasharray .6s ease"/>'
    + '<text x="28" y="33" text-anchor="middle" fill="'+color+'" font-family="Plus Jakarta Sans,sans-serif" font-weight="800" font-size="11">'+pct+'%</text>'
    + '</svg>';

  var html = '<div style="background:linear-gradient(135deg,#0d2818 0%,#0f3a20 50%,#0e2e1a 100%);border-radius:16px;padding:20px;margin-bottom:16px;position:relative;overflow:hidden;">';
  // Decorative circle
  html += '<div style="position:absolute;right:-20px;top:-20px;width:100px;height:100px;border-radius:50%;background:rgba(232,197,71,.07);pointer-events:none;"></div>';
  html += '<div style="position:absolute;right:30px;bottom:-30px;width:80px;height:80px;border-radius:50%;background:rgba(74,222,128,.05);pointer-events:none;"></div>';

  // Top row: greeting + ring
  html += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">';
  html += '<div>';
  html += '<div style="font-size:11px;color:rgba(255,255,255,.5);margin-bottom:3px;">'+greetingWord()+'</div>';
  html += '<div style="'+D.font+';font-weight:800;font-size:20px;color:#fff;line-height:1.2;">'+firstName+' 👋</div>';
  if (isVerif) {
    html += '<div style="margin-top:5px;">'+verifiedChip()+'</div>';
  } else {
    html += '<button onclick="openSubmitSkill()" style="margin-top:5px;background:rgba(232,197,71,.15);border:1px solid rgba(232,197,71,.3);color:#e8c547;font-size:9px;font-weight:700;padding:3px 8px;border-radius:20px;cursor:pointer;'+D.font+';">Get Verified →</button>';
  }
  html += '</div>';
  // Profile ring
  html += '<div onclick="showPage(\'myprofile\')" style="display:flex;flex-direction:column;align-items:center;cursor:pointer;">'+ring+'<div style="font-size:8px;color:rgba(255,255,255,.4);margin-top:2px;">Profile</div></div>';
  html += '</div>';

  // Stats row
  html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">';
  html += '<div onclick="showPage(\'wallet\')" style="background:rgba(255,255,255,.07);border-radius:10px;padding:10px 12px;cursor:pointer;">';
  html += '<div style="font-size:9px;color:rgba(255,255,255,.45);margin-bottom:3px;">Wallet Balance</div>';
  html += '<div style="'+D.font+';font-weight:800;font-size:18px;color:#4ade80;">$'+balance.toLocaleString()+'</div>';
  html += '</div>';
  html += '<div onclick="showPage(\'wallet\')" style="background:rgba(255,255,255,.07);border-radius:10px;padding:10px 12px;cursor:pointer;">';
  html += '<div style="font-size:9px;color:rgba(255,255,255,.45);margin-bottom:3px;">Total Earned</div>';
  html += '<div style="'+D.font+';font-weight:800;font-size:18px;color:#e8c547;">$'+earned.toLocaleString()+'</div>';
  html += '</div>';
  html += '</div>';

  // CTA buttons
  html += '<div style="display:flex;gap:8px;margin-top:12px;">';
  html += '<button onclick="showPage(\'gigs\')" style="flex:1;'+D.font+';font-weight:700;font-size:11px;color:#fff;background:#e8c547;border:none;padding:10px;border-radius:10px;cursor:pointer;'+D.trans+'" onmouseover="this.style.background=\'#f5d460\'" onmouseout="this.style.background=\'#e8c547\'">💼 Browse Gigs</button>';
  html += '<button onclick="showPage(\'myprofile\')" style="flex:1;'+D.font+';font-weight:700;font-size:11px;color:rgba(255,255,255,.9);background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.15);padding:10px;border-radius:10px;cursor:pointer;'+D.trans+'" onmouseover="this.style.background=\'rgba(255,255,255,.15)\'" onmouseout="this.style.background=\'rgba(255,255,255,.1)\'">👤 My Profile</button>';
  html += '</div>';
  html += '</div>';
  return html;
}

// Profile completion card
function fProfileCard() {
  var steps = [
    { label: 'Profile photo',       done: !!ME.avatar,                                       action: 'openChangePhoto()' },
    { label: 'Professional title',  done: !!(ME.title && ME.title !== 'Digital Professional'), action: 'openEditProfile()' },
    { label: 'Bio (50+ chars)',      done: !!(ME.bio && ME.bio.length >= 50),                 action: 'openEditProfile()' },
    { label: 'Add skills',          done: !!(ME.skills && ME.skills.length > 0),              action: 'openEditProfile()' },
    { label: 'Portfolio item',      done: !!(ME.portfolio && ME.portfolio.length > 0),        action: 'openAddPortfolio()' },
    { label: 'Get verified',        done: isVerified(),                                       action: 'openSubmitSkill()' },
  ];
  var done = steps.filter(function(s){return s.done;}).length;
  var pct = Math.round((done / steps.length) * 100);
  if (pct === 100) return '';
  var missing = steps.filter(function(s){return !s.done;}).slice(0, 2);
  var barColor = pct < 40 ? 'var(--acc)' : pct < 80 ? 'var(--gld)' : 'var(--grn)';

  var html = '<div style="background:var(--s);border:1px solid var(--br);'+D.r16+';padding:16px;margin-bottom:12px;'+D.shadow+';">';
  html += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">';
  html += '<div style="'+D.font+';font-weight:700;font-size:13px;">Profile Strength</div>';
  html += '<span style="'+D.font+';font-size:11px;font-weight:800;color:'+barColor+';">'+pct+'%</span>';
  html += '</div>';
  // Bar
  html += '<div style="height:5px;background:var(--s2);border-radius:3px;margin-bottom:12px;overflow:hidden;">';
  html += '<div style="height:100%;width:'+pct+'%;background:'+barColor+';border-radius:3px;transition:width .5s ease;"></div>';
  html += '</div>';
  html += '<div style="font-size:10px;color:var(--td);margin-bottom:8px;">Complete these to attract more clients:</div>';
  missing.forEach(function(s) {
    html += '<div onclick="'+s.action+'" style="display:flex;align-items:center;gap:10px;padding:8px 10px;background:var(--s2);border-radius:9px;margin-bottom:6px;cursor:pointer;'+D.trans+'" onmouseover="this.style.background=\'var(--s3)\'" onmouseout="this.style.background=\'var(--s2)\'">';
    html += '<div style="width:20px;height:20px;border-radius:50%;border:1.5px dashed var(--gld);display:flex;align-items:center;justify-content:center;flex-shrink:0;"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--gld)" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></div>';
    html += '<div style="flex:1;font-size:11px;color:var(--tx);">'+s.label+'</div>';
    html += '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--gld)" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>';
    html += '</div>';
  });
  html += '</div>';
  return html;
}

// Active work cards
function fActiveWork() {
  var apps = (ME.applications || []).filter(function(a){ return a.status === 'accepted'; });
  if (!apps.length) return '';

  var gigs = apps.slice(0,2).map(function(app){ return getGigs().find(function(g){ return g.id === app.gigId; }); }).filter(Boolean);
  if (!gigs.length) return '';

  var statusMap = {hired:{label:'In Progress',color:'#60a5fa',bg:'rgba(96,165,250,.1)'},delivered:{label:'Awaiting Review',color:'#e8c547',bg:'rgba(232,197,71,.1)'},completed:{label:'Complete',color:'#4ade80',bg:'rgba(74,222,128,.1)'}};

  var html = '<div style="margin-bottom:16px;">' + sectionHeader('Active Work', null, '');
  gigs.forEach(function(g) {
    var sm = statusMap[g.status] || {label:g.status,color:'var(--td)',bg:'var(--s2)'};
    html += '<div onclick="openGigWorkspace(\''+g.id+'\')" style="background:var(--s);border:1px solid var(--br);'+D.r16+';padding:14px;margin-bottom:8px;cursor:pointer;'+D.shadow+';'+D.trans+'" onmouseover="this.style.transform=\'translateY(-2px)\';this.style.boxShadow=\'0 6px 20px rgba(0,0,0,.15)\'" onmouseout="this.style.transform=\'\';this.style.boxShadow=\'0 1px 3px rgba(0,0,0,.12),0 4px 16px rgba(0,0,0,.08)\'">';
    html += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">';
    html += '<div style="'+D.font+';font-weight:700;font-size:13px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;flex:1;margin-right:10px;">'+g.title+'</div>';
    html += statusPill(sm.label, sm.color, sm.bg);
    html += '</div>';
    html += '<div style="display:flex;align-items:center;justify-content:space-between;">';
    html += '<div style="font-size:10px;color:var(--td);">📌 '+(g.posterName||'Client')+' &nbsp;·&nbsp; <span style="color:var(--grn);font-weight:700;">$'+(g.pay||g.escrowAmount||'—')+'</span></div>';
    html += '<button onclick="event.stopPropagation();openGigWorkspace(\''+g.id+'\')" style="'+D.font+';font-size:10px;font-weight:700;color:var(--gld);background:rgba(232,197,71,.1);border:1px solid rgba(232,197,71,.2);padding:5px 10px;border-radius:8px;cursor:pointer;">Workspace →</button>';
    html += '</div></div>';
  });
  html += '</div>';
  return html;
}

// Proposals summary
function fProposals() {
  var apps = ME.applications || [];
  if (!apps.length) return '';
  var pending  = apps.filter(function(a){return a.status==='pending';}).length;
  var accepted = apps.filter(function(a){return a.status==='accepted';}).length;
  var rejected = apps.filter(function(a){return a.status==='rejected';}).length;

  var html = '<div style="background:var(--s);border:1px solid var(--br);'+D.r16+';padding:16px;margin-bottom:12px;cursor:pointer;'+D.shadow+'" onclick="showPage(\'gigs\');switchGigTab(\'myapps\')">';
  html += sectionHeader('My Proposals', 'View all', "showPage('gigs');switchGigTab('myapps')");
  html += '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;">';

  var cols = [
    {val:pending,  label:'Pending',  color:'#e8c547', bg:'rgba(232,197,71,.08)'},
    {val:accepted, label:'Accepted', color:'#4ade80', bg:'rgba(74,222,128,.08)'},
    {val:rejected, label:'Rejected', color:'var(--td)', bg:'var(--s2)'},
  ];
  cols.forEach(function(c) {
    html += '<div style="text-align:center;background:'+c.bg+';border-radius:10px;padding:10px 6px;">';
    html += '<div style="'+D.font+';font-weight:800;font-size:22px;color:'+c.color+';">'+c.val+'</div>';
    html += '<div style="font-size:9px;color:var(--td);margin-top:2px;">'+c.label+'</div>';
    html += '</div>';
  });
  html += '</div></div>';
  return html;
}

// Matching gigs
function fRecommendedGigs() {
  var cat = ME.category || '';
  var open = getGigs().filter(function(g){return g.status==='open';});
  var matched = cat ? open.filter(function(g){return g.category===cat;}) : [];
  var shown = (matched.length >= 2 ? matched : open).slice(0, 4);
  if (!shown.length) return '';

  var applied = (ME.applications||[]).map(function(a){return a.gigId;});

  var html = '<div style="margin-bottom:16px;">';
  html += sectionHeader(cat ? '✨ Recommended for You' : '💼 Open Gigs', 'See all', "showPage('gigs')");

  shown.forEach(function(g) {
    var icon = CAT_ICONS[g.category] || '💼';
    var isApplied = applied.indexOf(g.id) >= 0;
    html += '<div style="background:var(--s);border:1px solid var(--br);'+D.r16+';padding:14px;margin-bottom:8px;'+D.shadow+';'+D.trans+'" onmouseover="this.style.borderColor=\'rgba(232,197,71,.4)\';this.style.transform=\'translateY(-1px)\'" onmouseout="this.style.borderColor=\'var(--br)\';this.style.transform=\'\'">';
    html += '<div style="display:flex;align-items:flex-start;gap:11px;">';
    // Icon
    html += '<div style="width:40px;height:40px;border-radius:10px;background:rgba(232,197,71,.08);border:1px solid rgba(232,197,71,.12);display:flex;align-items:center;justify-content:center;font-size:19px;flex-shrink:0;">'+icon+'</div>';
    html += '<div style="flex:1;min-width:0;">';
    html += '<div style="'+D.font+';font-weight:700;font-size:13px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;margin-bottom:3px;">'+g.title+'</div>';
    html += '<div style="font-size:10px;color:var(--td);">'+(g.posterName||'Client')+' &nbsp;·&nbsp; '+g.category+'</div>';
    html += '<div style="display:flex;align-items:center;justify-content:space-between;margin-top:10px;">';
    html += '<span style="'+D.font+';font-weight:800;font-size:14px;color:var(--grn);">$'+(g.pay||'Open')+'</span>';
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

// Daily tip
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

  var html = '<div style="background:linear-gradient(135deg,rgba(96,165,250,.06),rgba(96,165,250,.03));border:1px solid rgba(96,165,250,.18);'+D.r16+';padding:14px;margin-bottom:12px;display:flex;gap:12px;align-items:flex-start;">';
  html += '<div style="width:36px;height:36px;background:rgba(96,165,250,.1);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:17px;flex-shrink:0;">'+tip.icon+'</div>';
  html += '<div style="flex:1;">';
  html += '<div style="font-size:9px;font-weight:700;color:#60a5fa;text-transform:uppercase;letter-spacing:.06em;margin-bottom:3px;">Tip of the day</div>';
  html += '<div style="'+D.font+';font-weight:700;font-size:12px;color:var(--tx);margin-bottom:2px;">'+tip.title+'</div>';
  html += '<div style="font-size:11px;color:var(--td);line-height:1.55;">'+tip.body+'</div>';
  html += '</div>';
  html += '<button onclick="LOCAL.set(\''+key+'\',1);renderRoleHome()" style="background:none;border:none;color:var(--td);font-size:18px;cursor:pointer;padding:0;line-height:1;flex-shrink:0;">✕</button>';
  html += '</div>';
  return html;
}

// FAB (Floating Action Button)
function fFAB(role) {
  var isClient = role === 'client';
  var onclick = isClient ? "openPostGig()" : "showPage('gigs')";
  var label = isClient ? '+ Post Gig' : '+ Browse Gigs';
  return '<div style="position:fixed;bottom:88px;right:16px;z-index:200;">'
    + '<button onclick="'+onclick+'" style="'+D.font+';font-weight:800;font-size:12px;color:#fff;background:var(--gld);border:none;padding:12px 18px;border-radius:24px;cursor:pointer;box-shadow:0 4px 16px rgba(232,197,71,.5);'+D.trans+'" onmouseover="this.style.transform=\'scale(1.05)\'" onmouseout="this.style.transform=\'\'">'+label+'</button>'
    + '</div>';
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
  var activeCount = myGigs.filter(function(g){ return g.status === 'hired' || g.status === 'open'; }).length;
  var totalApplicants = myGigs.reduce(function(sum, g){ return sum + (g.applicants||[]).length; }, 0);

  var html = '<div style="background:linear-gradient(135deg,#0a1f2e 0%,#0e2d40 60%,#0a1f2e 100%);border-radius:16px;padding:20px;margin-bottom:16px;position:relative;overflow:hidden;">';
  html += '<div style="position:absolute;right:-30px;top:-30px;width:120px;height:120px;border-radius:50%;background:rgba(96,165,250,.07);pointer-events:none;"></div>';
  html += '<div style="position:absolute;left:20px;bottom:-40px;width:90px;height:90px;border-radius:50%;background:rgba(232,197,71,.05);pointer-events:none;"></div>';

  html += '<div style="margin-bottom:16px;">';
  html += '<div style="font-size:11px;color:rgba(255,255,255,.45);margin-bottom:3px;">'+greetingWord()+'</div>';
  html += '<div style="'+D.font+';font-weight:800;font-size:20px;color:#fff;margin-bottom:6px;">'+firstName+' 👋</div>';
  html += '<div style="font-size:10px;color:rgba(255,255,255,.4);">Client &nbsp;·&nbsp; SkillStamp</div>';
  html += '</div>';

  // Stats grid
  html += '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:14px;">';
  var stats = [
    {val:'$'+balance.toLocaleString(), label:'Balance',    sub: pending ? '$'+pending.toLocaleString()+' escrow' : 'Available', onclick:"showPage('wallet')"},
    {val:activeCount,                   label:'Active Gigs', sub:'In progress',                                                    onclick:"showPage('gigs')"},
    {val:totalApplicants,               label:'Applicants',  sub:'Awaiting review',                                                onclick:"showPage('gigs')"},
  ];
  stats.forEach(function(s) {
    html += '<div onclick="'+s.onclick+'" style="background:rgba(255,255,255,.07);border-radius:10px;padding:10px 8px;cursor:pointer;'+D.trans+'" onmouseover="this.style.background=\'rgba(255,255,255,.11)\'" onmouseout="this.style.background=\'rgba(255,255,255,.07)\'">';
    html += '<div style="'+D.font+';font-weight:800;font-size:17px;color:#fff;line-height:1;">'+s.val+'</div>';
    html += '<div style="font-size:9px;color:rgba(255,255,255,.5);margin-top:3px;">'+s.label+'</div>';
    if (s.sub) html += '<div style="font-size:8px;color:rgba(255,255,255,.3);margin-top:1px;">'+s.sub+'</div>';
    html += '</div>';
  });
  html += '</div>';

  // CTAs
  html += '<div style="display:flex;gap:8px;">';
  html += '<button onclick="openPostGig()" style="flex:1;'+D.font+';font-weight:800;font-size:11px;color:#fff;background:#e8c547;border:none;padding:10px;border-radius:10px;cursor:pointer;'+D.trans+'" onmouseover="this.style.background=\'#f5d460\'" onmouseout="this.style.background=\'#e8c547\'">+ Post a Gig</button>';
  html += '<button onclick="showPage(\'talent\')" style="flex:1;'+D.font+';font-weight:700;font-size:11px;color:rgba(255,255,255,.9);background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.15);padding:10px;border-radius:10px;cursor:pointer;'+D.trans+'" onmouseover="this.style.background=\'rgba(255,255,255,.16)\'" onmouseout="this.style.background=\'rgba(255,255,255,.1)\'">Browse Talent</button>';
  html += '</div>';
  html += '</div>';
  return html;
}

function cActiveGigs() {
  var myGigs = getGigs().filter(function(g){ return g.posterUid === ME.uid && g.status !== 'completed' && g.status !== 'cancelled'; });

  if (!myGigs.length) {
    var html = '<div style="margin-bottom:16px;">';
    html += sectionHeader('Your Gigs', null, '');
    html += '<div onclick="openPostGig()" style="background:var(--s);border:2px dashed rgba(232,197,71,.25);'+D.r16+';padding:24px 16px;text-align:center;cursor:pointer;'+D.trans+'" onmouseover="this.style.borderColor=\'rgba(232,197,71,.5)\'" onmouseout="this.style.borderColor=\'rgba(232,197,71,.25)\'">';
    html += '<div style="font-size:32px;margin-bottom:8px;">💼</div>';
    html += '<div style="'+D.font+';font-weight:700;font-size:13px;margin-bottom:4px;">Post your first gig</div>';
    html += '<div style="font-size:11px;color:var(--td);margin-bottom:14px;">Connect with verified African talent for your project</div>';
    html += btnPrimary('+ Post a Gig', 'openPostGig()');
    html += '</div></div>';
    return html;
  }

  var statusCfg = {open:{c:'#4ade80',bg:'rgba(74,222,128,.1)'},hired:{c:'#60a5fa',bg:'rgba(96,165,250,.1)'},delivered:{c:'#e8c547',bg:'rgba(232,197,71,.1)'},disputed:{c:'#f87171',bg:'rgba(248,113,113,.1)'}};
  var html = '<div style="margin-bottom:16px;">';
  html += sectionHeader('Your Active Gigs', 'See all', "showPage('gigs')");

  myGigs.slice(0,3).forEach(function(g) {
    var sc = statusCfg[g.status] || {c:'var(--td)',bg:'var(--s2)'};
    var apCount = (g.applicants||[]).length;
    html += '<div style="background:var(--s);border:1px solid var(--br);'+D.r16+';padding:14px;margin-bottom:8px;'+D.shadow+';'+D.trans+'" onmouseover="this.style.transform=\'translateY(-2px)\';this.style.boxShadow=\'0 6px 20px rgba(0,0,0,.15)\'" onmouseout="this.style.transform=\'\';this.style.boxShadow=\'0 1px 3px rgba(0,0,0,.12),0 4px 16px rgba(0,0,0,.08)\'">';
    // Top row
    html += '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:10px;">';
    html += '<div style="'+D.font+';font-weight:700;font-size:13px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;flex:1;">'+g.title+'</div>';
    html += '<div style="display:flex;align-items:center;gap:6px;flex-shrink:0;">';
    if (apCount > 0 && g.status === 'open') html += '<span style="background:var(--acc);color:#fff;'+D.font+';font-size:8px;font-weight:800;padding:2px 6px;border-radius:20px;">'+apCount+' new</span>';
    html += statusPill(g.status, sc.c, sc.bg);
    html += '</div></div>';
    // Meta
    html += '<div style="font-size:10px;color:var(--td);margin-bottom:10px;">$'+(g.pay||g.escrowAmount||'—')+(g.deadline?' &nbsp;·&nbsp; Due: '+g.deadline:'')+'</div>';
    // Action
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
  var pool = getAllUsers().filter(function(u){
    return u.role !== 'employer' && u.role !== 'client' && u.uid !== ME.uid;
  });
  var verif = pool.filter(isVerified).sort(function(a,b){return (b.score||0)-(a.score||0);}).slice(0,4);
  var talent = verif.length ? verif : pool.slice(0,4);
  if (!talent.length) return '';

  var html = '<div style="margin-bottom:16px;">';
  html += sectionHeader('⭐ Top Verified Talent', 'Browse all', "showPage('talent')");

  talent.forEach(function(u) {
    var verif = isVerified(u);
    var skills = (u.skills||[]).slice(0,2);
    html += '<div style="background:var(--s);border:1px solid var(--br);'+D.r16+';padding:14px;margin-bottom:8px;'+D.shadow+';'+D.trans+'" onmouseover="this.style.transform=\'translateY(-2px)\';this.style.borderColor=\'rgba(232,197,71,.3)\'" onmouseout="this.style.transform=\'\';this.style.borderColor=\'var(--br)\'">';
    html += '<div style="display:flex;align-items:center;gap:11px;">';
    html += mkAvatar(u, 44, '50%');
    html += '<div style="flex:1;min-width:0;">';
    // Name row
    html += '<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:2px;">';
    html += '<div style="'+D.font+';font-weight:700;font-size:13px;">'+u.name+'</div>';
    if (verif) html += verifiedChip(true);
    html += '</div>';
    // Category + rating
    html += '<div style="font-size:10px;color:var(--td);">'+(CAT_ICONS[u.category]||'')+'&nbsp;'+u.category+(u.score>0?' &nbsp;·&nbsp; ⭐ '+u.score.toFixed(1):'')+'</div>';
    // Skill tags
    if (skills.length) {
      html += '<div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:6px;">';
      skills.forEach(function(sk){
        html += '<span style="font-size:9px;color:var(--td);background:var(--s2);border:1px solid var(--br);padding:2px 7px;border-radius:20px;">'+sk+'</span>';
      });
      html += '</div>';
    }
    html += '</div>';
    // Buttons
    html += '<div style="display:flex;flex-direction:column;gap:5px;">';
    html += btnPrimary('Hire', "openMsg('"+u.uid+"')");
    html += btnGhost('Profile', "viewProfile('"+u.uid+"')");
    html += '</div>';
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
  html += '<div style="background:var(--s);border:1px solid var(--br);'+D.r16+';overflow:hidden;'+D.shadow+';">';
  txns.forEach(function(t, i) {
    var isOut = t.type === 'out';
    html += '<div style="display:flex;align-items:center;gap:11px;padding:12px 14px;'+(i<txns.length-1?'border-bottom:1px solid var(--br);':'')+';">';
    html += '<div style="width:34px;height:34px;border-radius:10px;background:'+(isOut?'rgba(248,113,113,.1)':'rgba(74,222,128,.1)')+';display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0;">'+(isOut?'📤':'📥')+'</div>';
    html += '<div style="flex:1;min-width:0;">';
    html += '<div style="'+D.font+';font-size:12px;font-weight:600;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;">'+(t.desc||(isOut?'Payment sent':'Funds received'))+'</div>';
    html += '<div style="font-size:9px;color:var(--td);margin-top:1px;">'+timeAgo(t.ts)+'</div>';
    html += '</div>';
    html += '<div style="'+D.font+';font-size:13px;font-weight:800;color:'+(isOut?'#f87171':'#4ade80')+';flex-shrink:0;">'+(isOut?'-':'+')+'$'+Math.round(t.amount||0).toLocaleString()+'</div>';
    html += '</div>';
  });
  html += '</div></div>';
  return html;
}

// ═══════════════════════════════════════════════════
//  PAGE BUILDERS
// ═══════════════════════════════════════════════════

function buildFreelancerHome() {
  var html = '<div style="padding:16px 14px 96px;">';
  html += fHero();
  html += fTipCard();
  html += fProfileCard();
  html += fActiveWork();
  html += fProposals();
  html += fRecommendedGigs();
  html += '</div>';
  // FAB
  html += fFAB('freelancer');
  return html;
}

function buildClientHome() {
  var html = '<div style="padding:16px 14px 96px;">';
  html += cHero();
  html += cActiveGigs();
  html += cFeaturedTalent();
  html += cRecentTransactions();
  html += '</div>';
  html += fFAB('client');
  return html;
}

// ═══════════════════════════════════════════════════
//  updateHomeStats — triggers re-render when data loads
// ═══════════════════════════════════════════════════
window.updateHomeStats = function() {
  var pg = document.getElementById('page-home');
  if (pg && pg.classList.contains('active') && ME) renderRoleHome();
};

