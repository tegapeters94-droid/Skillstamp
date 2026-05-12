// SkillStamp — Talent Page (Redesigned v3)

window.filterCat = function(cat, el) {
  activeCat = cat;
  // Record behavioral signal for personalization
  if (typeof recordSignal === 'function' && cat !== 'All') {
    recordSignal('cat_interact', { cat: cat });
  }
  document.querySelectorAll('#talent-cats .cat').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  renderTalent();
};

window.renderTalent = function() {
  const search = document.getElementById('talent-search')?.value?.toLowerCase() || '';
  let users = getAllUsers().filter(u => u.role === 'freelancer');
  if (activeCat !== 'All') users = users.filter(u => u.category === activeCat);
  if (search) users = users.filter(u =>
    u.name.toLowerCase().includes(search) ||
    (u.skills || []).some(s => s.toLowerCase().includes(search)) ||
    (u.title || '').toLowerCase().includes(search)
  );
  // Sort: algorithm-ranked (profile strength, performance, trust, activity, availability)
  if (typeof rankTalent === 'function') {
    users = rankTalent(users, ME && ME.category);
  } else {
    // Fallback: verified first, then repPoints
    users = users.sort(function(a, b) {
      var aV = (a.badgeStatus==='verified'||a.badgeStatus==='expert'||a.badgeStatus==='elite') ? 1 : 0;
      var bV = (b.badgeStatus==='verified'||b.badgeStatus==='expert'||b.badgeStatus==='elite') ? 1 : 0;
      if (bV !== aV) return bV - aV;
      return (b.repPoints || 0) - (a.repPoints || 0);
    });
  }

  var countEl = document.getElementById('talent-count');
  if (countEl) countEl.textContent = users.length + ' ' + (activeCat !== 'All' ? activeCat + ' ' : '') + 'freelancers';

  const grid = document.getElementById('tgrid');
  if (!users.length) {
    grid.innerHTML = '<div style="padding:48px 16px;text-align:center;"><div style="font-size:40px;margin-bottom:12px;">🔍</div><div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:700;font-size:17px;margin-bottom:6px;">No talent found</div><div style="font-size:12px;color:var(--td);">Try a different category or search term</div></div>';
    return;
  }
  grid.innerHTML = users.slice(0, 60).map(u => talentCard(u)).join('');
  // Track recommendation impressions
  if (typeof trackRecommendationImpression === 'function' && users.length) {
    trackRecommendationImpression('user', users.slice(0,20).map(function(u){return u.uid;}));
  }
};

function talentCard(u) {
  var isMe    = u.uid === ME.uid;
  var endorse = getEndorsements().filter(function(e){ return e.toUid === u.uid; });
  var isVerif = u.badgeStatus === 'verified' || u.badgeStatus === 'expert' || u.badgeStatus === 'elite';
  var skills  = (u.skills || []).slice(0, 3);
  var rating  = u.score > 0 ? u.score.toFixed(1) : null;
  var stars   = rating ? Math.min(5, Math.round(u.score)) : 0;

  // Squircle avatar
  var av = u.avatar
    ? '<img src="'+u.avatar+'" style="width:100%;height:100%;object-fit:cover;display:block;">'
    : '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-family:Plus Jakarta Sans,sans-serif;font-weight:800;font-size:22px;color:#000;">'+initials(u.name)+'</div>';

  // Online glow dot
  var availOnline = u.available !== false;
  var dotClass    = availOnline ? 'tc-av-dot tc-av-dot-online' : 'tc-av-dot tc-av-dot-busy';

  // Inline star row
  var starsHtml = '';
  for (var i = 1; i <= 5; i++) {
    var f = i <= stars;
    starsHtml += '<svg width="10" height="10" viewBox="0 0 24 24" fill="'+(f?'#e8c547':'none')+'" stroke="'+(f?'#e8c547':'rgba(255,255,255,.18)')+'" stroke-width="1.8" style="flex-shrink:0;"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>';
  }

  // Verified badge — high contrast inline
  var verifBadge = isVerif
    ? '<span style="display:inline-flex;align-items:center;gap:3px;background:linear-gradient(135deg,rgba(74,222,128,.16),rgba(74,222,128,.06));border:1px solid rgba(74,222,128,.35);color:#4ade80;font-size:8px;font-weight:800;padding:2px 7px;border-radius:20px;letter-spacing:.03em;flex-shrink:0;">&#10003; Verified</span>'
    : '';

  // Rating inline
  var ratingBadge = rating
    ? '<span style="font-family:Plus Jakarta Sans,sans-serif;font-weight:800;font-size:11px;color:var(--gld);">'+rating+'</span>'
    : '<span style="font-size:10px;color:var(--td);font-weight:600;">New</span>';

  // YOU badge
  var youBadge = isMe
    ? '<span style="font-size:8px;background:rgba(232,197,71,.12);border:1px solid rgba(232,197,71,.28);color:var(--gld);padding:2px 7px;border-radius:6px;font-weight:800;font-family:Plus Jakarta Sans,sans-serif;flex-shrink:0;">YOU</span>'
    : '';

  // SkillID — discreet, no background box
  var chainHtml = isVerif && u.skillId
    ? '<div style="font-size:7px;color:rgba(255,255,255,.22);font-family:Plus Jakarta Sans,sans-serif;font-weight:600;letter-spacing:.08em;margin-top:-2px;margin-bottom:12px;padding-left:2px;text-transform:uppercase;">'+u.skillId+'</div>'
    : '';

  // Skill tags — soft brand tint
  var skillsHtml = skills.length
    ? skills.map(function(s){ return '<span class="tc-skill">'+s+'</span>'; }).join('')
    : '<span style="font-size:10px;color:var(--td);">No skills added</span>';
  var moreHtml = (u.skills||[]).length > 3
    ? '<span style="font-size:9px;color:var(--td);align-self:center;font-weight:600;">+'+((u.skills||[]).length-3)+'</span>'
    : '';

  // Category pill
  var catHtml = u.category
    ? '<span style="font-size:9px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);color:var(--td);padding:2px 8px;border-radius:20px;font-family:Plus Jakarta Sans,sans-serif;font-weight:600;">'+(CAT_ICONS[u.category]||'')+'&nbsp;'+u.category+'</span>'
    : '';

  // Stats row — clean dividers, no background box
  var statsHtml = '<div class="tc-stats">'
    + '<div class="tc-stat">'
    +   '<div style="display:flex;align-items:center;justify-content:center;gap:2px;margin-bottom:3px;">'+starsHtml+'</div>'
    +   '<div style="display:flex;align-items:center;justify-content:center;">'+ratingBadge+'</div>'
    +   '<div style="font-size:9px;color:var(--td);text-transform:uppercase;letter-spacing:.18em;margin-top:4px;">Rating</div>'
    + '</div>'
    + ''
    + '<div class="tc-stat">'
    +   '<div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:800;font-size:17px;color:var(--tx);line-height:1;">'+(u.gigsCount||0)+'</div>'
    +   '<div style="font-size:9px;color:var(--td);text-transform:uppercase;letter-spacing:.18em;margin-top:4px;">Gigs</div>'
    + '</div>'
    + ''
    + '<div class="tc-stat">'
    +   '<div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:800;font-size:17px;color:var(--tx);line-height:1;">'+endorse.length+'</div>'
    +   '<div style="font-size:9px;color:var(--td);text-transform:uppercase;letter-spacing:.18em;margin-top:4px;">Endorsed</div>'
    + '</div>'
    + '</div>';

  // Actions: primary View Profile + icon-only Endorse ghost
  var actionsHtml = !isMe
    ? '<div class="tc-actions" onclick="event.stopPropagation()">'
      + '<button class="tc-btn-primary" onclick="viewProfile(\''+u.uid+'\')">View Profile</button>'
      + '<button class="tc-btn-ghost" onclick="openEndorse(\''+u.uid+'\')" title="Endorse this freelancer">'
      +   '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/><path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>'
      + '</button>'
      + '</div>'
    : '';

  return '<div class="tc-card" onclick="if(typeof recordSignal===\'function\')recordSignal(\'profile_view\',{uid:\''+u.uid+'\'});if(typeof trackRecommendationClick===\'function\')trackRecommendationClick(\'user\',\''+u.uid+'\',0);viewProfile(\''+u.uid+'\')" style="cursor:pointer;">'

    // Top: squircle avatar + name row with inline badges
    + '<div class="tc-top">'
    +   '<div class="tc-av-wrap">'
    +     '<div class="tc-av" style="background:linear-gradient(135deg,'+u.gradient+','+u.gradient+'88);">'+av+'</div>'
    +     '<div class="'+dotClass+'"></div>'
    +   '</div>'
    +   '<div class="tc-info">'
    // Name + verified + YOU inline in one row
    +     '<div style="display:flex;align-items:center;gap:5px;flex-wrap:wrap;margin-bottom:3px;">'
    +       '<div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:800;font-size:17px;color:var(--tx);line-height:1.2;letter-spacing:-.02em;">'+u.name+'</div>'
    +       verifBadge
    +       youBadge
    +     '</div>'
    // Title
    +     '<div style="font-size:10px;color:var(--td);margin-bottom:6px;line-height:1.4;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;">'+(u.title||'SkillStamp Freelancer')+'</div>'
    // Country + category
    +     '<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">'
    +       '<span style="font-size:10px;color:var(--td);">'+flag(u.country)+'&nbsp;'+u.country+'</span>'
    +       catHtml
    +     '</div>'
    +   '</div>'
    + '</div>'

    // SkillID — discreet small text
    + chainHtml

    // Skills — soft brand tint tags
    + '<div style="display:flex;flex-wrap:wrap;gap:5px;margin-bottom:14px;">'
    +   skillsHtml + moreHtml
    + '</div>'

    // Metrics row — thin dividers, no grey box
    + statsHtml

    // Actions
    + actionsHtml

    + '</div>';
}
