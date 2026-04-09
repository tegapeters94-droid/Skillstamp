// SkillStamp — Talent Page (Redesigned v3)

window.filterCat = function(cat, el) {
  activeCat = cat;
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
  // Sort: verified first, then by rating
  users = users.sort((a, b) => {
    var aV = (a.badgeStatus==='verified'||a.badgeStatus==='expert'||a.badgeStatus==='elite') ? 1 : 0;
    var bV = (b.badgeStatus==='verified'||b.badgeStatus==='expert'||b.badgeStatus==='elite') ? 1 : 0;
    if (bV !== aV) return bV - aV;
    return (b.repPoints || 0) - (a.repPoints || 0);
  });

  var countEl = document.getElementById('talent-count');
  if (countEl) countEl.textContent = users.length + ' ' + (activeCat !== 'All' ? activeCat + ' ' : '') + 'freelancers';

  const grid = document.getElementById('tgrid');
  if (!users.length) {
    grid.innerHTML = '<div style="padding:48px 16px;text-align:center;"><div style="font-size:40px;margin-bottom:12px;">🔍</div><div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:700;font-size:14px;margin-bottom:6px;">No talent found</div><div style="font-size:12px;color:var(--td);">Try a different category or search term</div></div>';
    return;
  }
  grid.innerHTML = users.slice(0, 60).map(u => talentCard(u)).join('');
};

function talentCard(u) {
  const isMe = u.uid === ME.uid;
  const endorse = getEndorsements().filter(e => e.toUid === u.uid);
  const isVerif = u.badgeStatus === 'verified' || u.badgeStatus === 'expert' || u.badgeStatus === 'elite';
  const skills = (u.skills || []).slice(0, 3);
  const rating = u.score > 0 ? u.score.toFixed(1) : null;
  const stars = rating ? Math.min(5, Math.round(u.score)) : 0;

  // Avatar
  var av = u.avatar
    ? '<img src="'+u.avatar+'" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">'
    : '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-family:Plus Jakarta Sans,sans-serif;font-weight:800;font-size:22px;color:#000;">'+initials(u.name)+'</div>';

  // Star icons SVG
  var starsHtml = '';
  for (var i = 1; i <= 5; i++) {
    var filled = i <= stars;
    starsHtml += '<svg width="11" height="11" viewBox="0 0 24 24" fill="'+(filled?'#e8c547':'none')+'" stroke="'+(filled?'#e8c547':'rgba(255,255,255,.2)')+'" stroke-width="2" style="flex-shrink:0;"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>';
  }

  // Availability dot
  var availDot = u.available !== false
    ? '<span style="width:8px;height:8px;border-radius:50%;background:#4ade80;display:inline-block;flex-shrink:0;" title="Available"></span>'
    : '<span style="width:8px;height:8px;border-radius:50%;background:#ef4444;display:inline-block;flex-shrink:0;" title="Busy"></span>';

  // SkillID chain
  var chainHtml = isVerif && u.skillId
    ? '<div style="display:flex;align-items:center;gap:6px;padding:6px 10px;background:rgba(96,165,250,.05);border:1px solid rgba(96,165,250,.15);border-radius:7px;margin-bottom:12px;">'
      +'<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>'
      +'<span style="font-size:9px;color:#60a5fa;font-family:Plus Jakarta Sans,sans-serif;font-weight:700;letter-spacing:.06em;">'+u.skillId+'</span>'
      +'</div>'
    : '';

  // YOU badge
  var youBadge = isMe ? '<span style="font-size:8px;background:rgba(232,197,71,.15);border:1px solid rgba(232,197,71,.3);color:var(--gld);padding:2px 6px;border-radius:6px;font-weight:700;font-family:Plus Jakarta Sans,sans-serif;">YOU</span>' : '';

  // Verified badge
  var verifBadge = isVerif
    ? '<span style="display:inline-flex;align-items:center;gap:2px;background:rgba(74,222,128,.1);border:1px solid rgba(74,222,128,.25);color:#4ade80;font-size:8px;font-weight:700;padding:2px 7px;border-radius:20px;font-family:Plus Jakarta Sans,sans-serif;">'+verifiedSVG(getVerifColor())+' Verified</span>'
    : '';

  return `<div class="tc-card" onclick="viewProfile('${u.uid}')" style="cursor:pointer;">
    <!-- Card top: avatar + name -->
    <div class="tc-top">
      <div class="tc-av-wrap">
        <div class="tc-av" style="background:linear-gradient(135deg,${u.gradient},${u.gradient}88);">${av}</div>
        <div class="tc-av-dot">${availDot}</div>
      </div>
      <div class="tc-info">
        <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:3px;">
          <div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:800;font-size:14px;color:var(--tx);line-height:1.2;">${u.name}</div>
          ${youBadge}
        </div>
        <div style="font-size:10px;color:var(--td);margin-bottom:5px;line-height:1.4;">${u.title||'SkillStamp Freelancer'}</div>
        <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
          ${verifBadge}
          <span style="font-size:10px;color:var(--td);">${flag(u.country)} ${u.country}</span>
        </div>
      </div>
    </div>

    <!-- Category pill -->
    <div style="display:flex;align-items:center;gap:6px;margin-bottom:10px;">
      <span style="font-size:10px;background:var(--s2);border:1px solid var(--br);color:var(--td);padding:3px 9px;border-radius:20px;font-family:Plus Jakarta Sans,sans-serif;">${CAT_ICONS[u.category]||''} ${u.category}</span>
    </div>

    <!-- Skills -->
    <div style="display:flex;flex-wrap:wrap;gap:5px;margin-bottom:12px;">
      ${skills.length
        ? skills.map(s => '<span class="tc-skill">'+s+'</span>').join('')
        : '<span style="font-size:10px;color:var(--td);">No skills added yet</span>'
      }
      ${(u.skills||[]).length > 3 ? '<span style="font-size:10px;color:var(--td);align-self:center;">+'+((u.skills||[]).length-3)+' more</span>' : ''}
    </div>

    <!-- SkillID -->
    ${chainHtml}

    <!-- Stats row -->
    <div class="tc-stats">
      <div class="tc-stat">
        <div style="display:flex;align-items:center;gap:3px;margin-bottom:2px;">${starsHtml}</div>
        <div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:800;font-size:13px;color:${rating?'var(--gld)':'var(--td)'};">${rating||'New'}</div>
        <div style="font-size:8px;color:var(--td);text-transform:uppercase;letter-spacing:.05em;">Rating</div>
      </div>
      <div class="tc-stat-div"></div>
      <div class="tc-stat">
        <div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:800;font-size:13px;color:var(--tx);">${u.gigsCount||0}</div>
        <div style="font-size:8px;color:var(--td);text-transform:uppercase;letter-spacing:.05em;">Gigs</div>
      </div>
      <div class="tc-stat-div"></div>
      <div class="tc-stat">
        <div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:800;font-size:13px;color:var(--tx);">${endorse.length}</div>
        <div style="font-size:8px;color:var(--td);text-transform:uppercase;letter-spacing:.05em;">Endorsements</div>
      </div>
    </div>

    <!-- Actions -->
    ${!isMe ? `<div class="tc-actions" onclick="event.stopPropagation()">
      <button class="tc-btn-primary" onclick="viewProfile('${u.uid}')">View Profile</button>
      <button class="tc-btn-ghost" onclick="openEndorse('${u.uid}')">🤝 Endorse</button>
    </div>` : ''}
  </div>`;
}
