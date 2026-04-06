// SkillStamp — Global Search

// ═══════════════════════════════════════════════════════
//  GLOBAL SEARCH
// ═══════════════════════════════════════════════════════
window.openGlobalSearch=function(){
  var overlay=document.getElementById('search-overlay');
  if(!overlay) return;
  overlay.style.display='flex';
  setTimeout(function(){
    var inp=document.getElementById('search-input-main');
    if(inp){inp.value='';inp.focus();runGlobalSearch('');}
  },60);
};
window.closeGlobalSearch=function(){
  var overlay=document.getElementById('search-overlay');
  if(overlay) overlay.style.display='none';
};
window.runGlobalSearch=function(q){
  var results=document.getElementById('search-results');
  if(!results) return;
  var query=(q||'').trim().toLowerCase();
  if(query.length<2){
    results.innerHTML='<div class="search-empty"><div style="font-size:40px;margin-bottom:12px;opacity:.3;">🔍</div><div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:700;font-size:14px;margin-bottom:6px;">Search SkillStamp</div><div style="font-size:12px;">Find people by name, skill, or country · Find open gigs by title or category</div></div>';
    return;
  }
  var matchedUsers=(CACHE.users||[]).filter(function(u){
    return (u.name||'').toLowerCase().includes(query)
      ||(u.skills||[]).some(function(s){return (s||'').toLowerCase().includes(query);})
      ||(u.title||'').toLowerCase().includes(query)
      ||(u.category||'').toLowerCase().includes(query)
      ||(u.country||'').toLowerCase().includes(query);
  }).slice(0,7);
  var matchedGigs=(CACHE.gigs||[]).filter(function(g){
    return g.status==='open'
      &&((g.title||'').toLowerCase().includes(query)
        ||(g.description||'').toLowerCase().includes(query)
        ||(g.category||'').toLowerCase().includes(query));
  }).slice(0,5);
  var html='';
  if(matchedUsers.length){
    html+='<div class="search-section-title">👤 People</div>';
    matchedUsers.forEach(function(u){
      var isVer=u.badgeStatus==='verified'||u.badgeStatus==='expert'||u.badgeStatus==='elite';
      var avStyle='width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,'+u.gradient+','+u.gradient+'99);display:flex;align-items:center;justify-content:center;font-family:Plus Jakarta Sans,sans-serif;font-weight:800;font-size:14px;color:#000;flex-shrink:0;overflow:hidden;';
      var avContent=u.avatar?'<img src="'+u.avatar+'" style="width:100%;height:100%;object-fit:cover;">':initials(u.name);
      html+='<div class="search-result-item" onclick="closeGlobalSearch();viewProfile(\''+u.uid+'\')">';
      html+='<div style="'+avStyle+'">'+avContent+'</div>';
      html+='<div style="flex:1;min-width:0;">';
      html+='<div class="search-result-title">'+u.name+(isVer?' <span style="color:var(--grn);font-size:10px;">✓ Verified</span>':'')+'</div>';
      html+='<div class="search-result-sub">'+(u.category||'')+(u.country?' · '+u.country:'')+(u.skills&&u.skills.length?' · '+u.skills.slice(0,3).join(', '):'')+'</div>';
      html+='</div></div>';
    });
  }
  if(matchedGigs.length){
    html+='<div class="search-section-title">💼 Open Gigs</div>';
    matchedGigs.forEach(function(g){
      html+='<div class="search-result-item" onclick="closeGlobalSearch();showPage(\'gigs\')">';
      html+='<div style="width:40px;height:40px;border-radius:10px;background:rgba(232,197,71,.1);border:1px solid rgba(232,197,71,.2);display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;">'+(CAT_ICONS[g.category]||'💼')+'</div>';
      html+='<div style="flex:1;min-width:0;">';
      html+='<div class="search-result-title">'+g.title+'</div>';
      html+='<div class="search-result-sub">'+(g.category||'')+' · $'+(g.pay||'?')+' · '+(g.posterName||'Client')+'</div>';
      html+='</div></div>';
    });
  }
  if(!matchedUsers.length&&!matchedGigs.length){
    html='<div class="search-empty"><div style="font-size:40px;margin-bottom:12px;opacity:.4;">🤷</div><div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:700;font-size:14px;margin-bottom:6px;">No results for "'+q+'"</div><div style="font-size:12px;">Try a skill name, category, country, or gig title</div></div>';
  }
  results.innerHTML=html;
};
// Close search on Escape key
document.addEventListener('keydown',function(e){if(e.key==='Escape') closeGlobalSearch();});

