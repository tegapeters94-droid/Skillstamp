// SkillStamp — Talent page

// ══════════════════════════════════════════════
//  TALENT
// ══════════════════════════════════════════════
window.filterCat=function(cat,el){activeCat=cat;document.querySelectorAll('#talent-cats .cat').forEach(c=>c.classList.remove('active'));el.classList.add('active');renderTalent();};

window.renderTalent=function(){
  const search=document.getElementById('talent-search')?.value?.toLowerCase()||'';
  let users=getAllUsers().filter(u=>u.role==='freelancer');
  if(activeCat!=='All')users=users.filter(u=>u.category===activeCat);
  if(search)users=users.filter(u=>u.name.toLowerCase().includes(search)||(u.skills||[]).some(s=>s.toLowerCase().includes(search)));
  users=users.sort((a,b)=>(b.repPoints||0)-(a.repPoints||0));
  document.getElementById('talent-count').textContent=`${users.length} verified`;
  const grid=document.getElementById('tgrid');
  if(!users.length){grid.innerHTML='<div class="empty">No talent found.</div>';return;}
  grid.innerHTML=users.slice(0,60).map(u=>talentCard(u)).join('');
};

function talentCard(u){
  const isMe=u.uid===ME.uid;
  const endorse=getEndorsements().filter(e=>e.toUid===u.uid);
  return `<div class="card card-accent" onclick="viewProfile('${u.uid}')" style="cursor:pointer;">
    <div style="display:flex;gap:12px;align-items:flex-start;margin-bottom:15px;">
      ${avHTML(u,52,'10px')}
      <div style="flex:1;min-width:0;">
        <div style="font-family:Plus Jakarta Sans,sans-serif;font-size:13px;font-weight:700;margin-bottom:2px;display:flex;align-items:center;gap:5px;flex-wrap:wrap;">${flag(u.country)} ${u.name}${(u.badgeStatus==='verified'||u.badgeStatus==='expert'||u.badgeStatus==='elite')?verifiedSVG(getVerifColor()):''}${isMe?'<span style="font-size:8px;background:rgba(232,197,71,.12);border:1px solid rgba(232,197,71,.25);color:var(--gld);padding:1px 5px;border-radius:8px;">YOU</span>':''}</div>
        <div style="font-size:9px;color:var(--td);margin-bottom:6px;">${u.title||'Digital Professional'}</div>
        <div style="display:flex;gap:5px;flex-wrap:wrap;"><span style="font-size:9px;color:var(--td);">${CAT_ICONS[u.category]||''} ${u.category}</span></div>
      </div>
    </div>
    <div class="chips" style="margin-bottom:12px;">${(function(){var _r='';var _sk=(u.skills||[]).slice(0,4);for(var _i=0;_i<_sk.length;_i++)_r+='<span class="chip v">'+_sk[_i]+'</span>';return _r;}())||'<span style="font-size:9px;color:var(--td);">No skills yet</span>'}</div>
    <div class="rep-strip">
      <div><div class="stars">${u.repPoints>0?'★'.repeat(Math.min(5,Math.round(u.score))):'—'}</div><div style="font-size:8px;color:var(--td);">Rating</div></div>
      <div class="rep-num">${u.score>0?u.score.toFixed(1):'New'}</div>

      <div style="margin-left:auto;text-align:right;"><div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:700;font-size:12px;">${endorse.length}</div><div style="font-size:8px;color:var(--td);">Endorsements</div></div>
    </div>
    ${(u.badgeStatus==='verified'||u.badgeStatus==='expert'||u.badgeStatus==='elite')?'<div class="chain" style="margin-top:10px;"><div class="cdot"></div><div class="chash">'+u.skillId+'</div></div>':''}
    ${!isMe?'<div style="display:flex;gap:6px;margin-top:10px;"><button class="bsm" onclick="event.stopPropagation();openMsg(\''+u.uid+'\')" >💬 Message</button><button class="bgrn" onclick="event.stopPropagation();openEndorse(\''+u.uid+'\')" >🤝 Endorse</button><button class="b2sm" onclick="event.stopPropagation();viewProfile(\''+u.uid+'\')" >Profile</button></div>':''}
  </div>`;
}

