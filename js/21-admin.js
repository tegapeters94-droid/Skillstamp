// SkillStamp — Admin Portal (Full Suite)

// ══════════════════════════════════════════════
//  LEADERBOARD
// ══════════════════════════════════════════════
function renderLeaderboard(){
  const users=getAllUsers().filter(u=>u.role==='freelancer').sort((a,b)=>(b.repPoints||0)-(a.repPoints||0));
  const list=document.getElementById('lb-list');
  list.innerHTML=users.slice(0,50).map((u,i)=>{
    const rankIcon=i===0?'🥇':i===1?'🥈':i===2?'🥉':`#${i+1}`;
    const rankColor=i===0?'var(--gld)':i===1?'#c0c0c0':i===2?'#cd7f32':'var(--td)';
    return `<div class="lb-row" onclick="viewProfile('${u.uid}')">
      <div class="lb-rank" style="color:${rankColor};">${rankIcon}</div>
      ${avHTML(u,42,'50%')}
      <div style="flex:1;min-width:0;">
        <div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:700;font-size:12px;margin-bottom:2px;">${flag(u.country)} ${u.name}${u.uid===ME.uid?' <span style="font-size:8px;color:var(--gld);">(you)</span>':''}</div>
        <div style="display:flex;align-items:center;gap:6px;"><span style="font-size:9px;color:var(--td);">${CAT_ICONS[u.category]||''} ${u.category}</span></div>
      </div>
      <div style="text-align:center;margin-right:6px;">
        <div style="font-size:9px;color:var(--td);">${getEndorsements().filter(e=>e.toUid===u.uid).length} endorse</div>
        <div style="font-size:9px;color:var(--td);">${u.gigsCount||0} gigs</div>
      </div>
      <div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:700;font-size:15px;color:var(--pur);">${u.repPoints||0}</div>
    </div>`;
  }).join('');
  const myRank=users.findIndex(u=>u.uid===ME.uid);
  document.getElementById('my-rank-content').innerHTML=`<div style="text-align:center;padding:8px 0;">
    <div style="font-family:Plus Jakarta Sans,sans-serif;font-size:30px;font-weight:800;color:var(--pur);line-height:1;">${ME.repPoints||0}</div>
    <div style="font-size:9px;color:var(--td);margin-top:3px;">reputation points</div>
    <div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:700;font-size:24px;margin-top:8px;">#${myRank+1}</div>
    <div style="font-size:9px;color:var(--td);">of ${users.length} freelancers</div>
  </div>`;
}

// ══════════════════════════════════════════════
//  DASHBOARD
// ══════════════════════════════════════════════
function renderDashboard(){
  const users=getAllUsers();const gigs=getGigs();const endorse=getEndorsements();
  const totalPts=users.reduce((a,u)=>a+(u.repPoints||0),0);
  document.getElementById('d-users').textContent=users.length;
  document.getElementById('d-gigs').textContent=gigs.length;
  document.getElementById('d-endorse').textContent=endorse.length;
  document.getElementById('d-pts').textContent=totalPts.toLocaleString();
  const freq={};users.forEach(u=>(u.skills||[]).forEach(s=>freq[s]=(freq[s]||0)+1));
  const top=Object.entries(freq).sort((a,b)=>b[1]-a[1]).slice(0,10);const maxF=top[0]?.[1]||1;
  document.getElementById('d-skills').innerHTML=top.map(([s,f])=>`<div style="margin-bottom:8px;"><div style="display:flex;justify-content:space-between;font-size:10px;margin-bottom:2px;"><span>${s}</span><span style="color:var(--td);">${f}x</span></div><div style="height:3px;background:var(--br);border-radius:3px;overflow:hidden;"><div style="height:100%;width:${Math.round(f/maxF*100)}%;background:linear-gradient(90deg,var(--gld),var(--acc));border-radius:3px;"></div></div></div>`).join('');
  const cats={};users.forEach(u=>{if(u.category)cats[u.category]=(cats[u.category]||0)+1;});
  const catTotal=Object.values(cats).reduce((a,b)=>a+b,0)||1;
  document.getElementById('d-cats').innerHTML=Object.entries(cats).map(([c,n])=>`<div style="display:flex;align-items:center;gap:9px;margin-bottom:8px;"><span style="font-size:12px;">${CAT_ICONS[c]||'🌐'}</span><div style="flex:1;"><div style="display:flex;justify-content:space-between;font-size:10px;margin-bottom:2px;"><span>${c}</span><span style="color:var(--td);">${n}</span></div><div style="height:3px;background:var(--br);border-radius:3px;overflow:hidden;"><div style="height:100%;width:${Math.round(n/catTotal*100)}%;background:var(--pur);border-radius:3px;"></div></div></div></div>`).join('');
}

// ══════════════════════════════════════════════
//  ADMIN
// ══════════════════════════════════════════════
function renderAdmin(){
  if(typeof renderAdminV6==='function') renderAdminV6();
}

window.adminApprove=function(pid){
  const pending=getPending();const p=pending.find(x=>x.id===pid);if(!p)return;
  p.status='approved';savePending(pending);
  const u=getUser(p.uid);
  if(u){if(!u.skills.includes(p.skill))u.skills.push(p.skill);u.repPoints=(u.repPoints||0)+10;if(u.badgeStatus==='beginner')u.badgeStatus='review';saveUser(u);if(u.uid===ME.uid)ME=u;}
  toast(`✅ "${p.skill}" approved! +10 pts`);renderAdmin();
};

window.adminReject=function(pid){
  const pending=getPending();const p=pending.find(x=>x.id===pid);if(!p)return;
  p.status='rejected';
  const u=getUser(p.uid);if(u){u.repPoints=Math.max(0,(u.repPoints||0)-10);saveUser(u);}
  savePending(pending);toast(`❌ Rejected. -10 pts.`,'bad');renderAdmin();
};

window.adminSetBadge=function(uid,badge){
  const u=getUser(uid);if(!u)return;u.badgeStatus=badge;saveUser(u);if(u.uid===ME.uid)ME=u;toast(`Badge → "${badge}" for ${u.name}`);
};

window.adminAdjRep=function(uid){
  const u=getUser(uid);if(!u)return;
  const amt=parseInt(prompt(`Adjust rep for ${u.name} (current: ${u.repPoints||0})\nEnter amount (e.g. +20 or -10):`)||'0');
  if(!amt||isNaN(amt))return;
  u.repPoints=Math.max(0,(u.repPoints||0)+amt);saveUser(u);if(u.uid===ME.uid)ME=u;
  toast(`Rep adjusted ${amt>0?'+':''}${amt} for ${u.name}`);renderAdmin();
}

// ═══════════════════════════════════════════════════════
//  ADMIN ACTIONS — Full Suite
// ═══════════════════════════════════════════════════════

// Tab switcher
// adminTab defined below;

// User search (users tab)
window.adminSearchV6=function(q){
  var users=getAllUsers();
  var fil=q?users.filter(function(u){
    return u.name.toLowerCase().indexOf(q.toLowerCase())>=0
      ||(u.email||'').toLowerCase().indexOf(q.toLowerCase())>=0
      ||(u.skillId||'').toLowerCase().indexOf(q.toLowerCase())>=0;
  }):users.slice(0,40);
  var el=document.getElementById('adm-users-list');
  if(el) el.innerHTML=buildUsersList(fil.slice(0,40));
}

// ═══════════════════════════════════════════════════════
//  ADMIN FUNCTIONS — Full Suite
// ═══════════════════════════════════════════════════════

// Tab switcher
window.adminTab=function(name){
  ['overview','users','content','skills','announce'].forEach(function(t){
    var panel=document.getElementById('admtab-'+t);
    var btn=document.getElementById('admt-'+t);
    if(panel) panel.style.display=(t===name)?'block':'none';
    if(btn){
      btn.style.background=t===name?'var(--acc)':'var(--s)';
      btn.style.color=t===name?'#fff':'var(--td)';
      btn.style.borderColor=t===name?'var(--acc)':'var(--br)';
    }
  });
  if(name==='users') adminFilterUsers();
};

// User filtering
window.adminFilterUsers=function(){
  var q=(document.getElementById('adm-user-search')||{}).value||'';
  var role=(document.getElementById('adm-user-role')||{}).value||'';
  var badge=(document.getElementById('adm-user-badge')||{}).value||'';
  var list=(window._adminAllUsers||[]).filter(function(u){
    var matchQ=!q||u.name.toLowerCase().includes(q.toLowerCase())||u.email.toLowerCase().includes(q.toLowerCase());
    var matchRole=!role||u.role===role;
    var matchBadge=!badge||u.badgeStatus===badge;
    return matchQ&&matchRole&&matchBadge;
  });
  var el=document.getElementById('adm-users-list');
  if(el&&window._adminUserCards) el.innerHTML=window._adminUserCards(list);
};

// Ban / Unban inline
window.adminToggleBanInline=function(uid,ban){
  var u=(window._adminAllUsers||[]).find(function(x){return x.uid===uid;});
  if(!u)return;
  if(ban&&!confirm('Ban '+u.name+'? They will lose access to the platform.'))return;
  u.badgeStatus=ban?'suspended':'beginner';
  saveUser(u);
  toast((ban?'🚫 Banned: ':'✓ Unbanned: ')+u.name);
  renderAdminV6(); adminTab('users');
};

// Set badge inline
window.adminSetBadgeInline=function(uid,badge){
  if(!badge)return;
  var u=(window._adminAllUsers||[]).find(function(x){return x.uid===uid;});
  if(!u)return;
  u.badgeStatus=badge;
  saveUser(u);
  toast('Badge set to "'+badge+'" for '+u.name);
  renderAdminV6(); adminTab('users');
};

// Promote to admin inline
window.adminPromoteInline=function(uid){
  var u=(window._adminAllUsers||[]).find(function(x){return x.uid===uid;});
  if(!u)return;
  if(!confirm('Grant admin access to '+u.name+'? They will control the entire platform.'))return;
  u.isAdmin=true;
  saveUser(u);
  toast('🛡 '+u.name+' is now an admin');
  renderAdminV6(); adminTab('users');
};

// Demote admin
window.adminDemoteInline=function(uid){
  var u=(window._adminAllUsers||[]).find(function(x){return x.uid===uid;});
  if(!u)return;
  if(!confirm('Remove admin access from '+u.name+'?'))return;
  u.isAdmin=false;
  saveUser(u);
  toast(u.name+' is no longer an admin');
  renderAdminV6(); adminTab('users');
};

// Promote from select dropdown (broadcast tab)
window.adminPromoteFromSelect=function(){
  var sel=document.getElementById('promote-user-select');
  if(!sel||!sel.value){toast('Please select a user.','bad');return;}
  adminPromoteInline(sel.value);
};

// Edit user profile
window.adminEditUser=function(uid){
  var u=(window._adminAllUsers||[]).find(function(x){return x.uid===uid;});
  if(!u)return;
  var m=document.getElementById('modal-root');
  if(!m)return;
  m.innerHTML='<div class="modal-overlay" onclick="closeModal()">'
    +'<div class="modal-box" onclick="event.stopPropagation()">'
    +'<div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:800;font-size:15px;margin-bottom:14px;">✏ Edit: '+u.name+'</div>'
    +'<div class="fg"><label class="fl">Full Name</label><input class="fi" id="ae-name" value="'+u.name+'"></div>'
    +'<div class="fg"><label class="fl">Title / Headline</label><input class="fi" id="ae-title" value="'+(u.title||'')+'"></div>'
    +'<div class="fg"><label class="fl">Bio</label><textarea class="fi" id="ae-bio" rows="3">'+( u.bio||'')+'</textarea></div>'
    +'<div class="fg"><label class="fl">Country</label><input class="fi" id="ae-country" value="'+(u.country||'')+'"></div>'
    +'<div class="fg"><label class="fl">Rep Points</label><input class="fi" type="number" id="ae-rep" value="'+(u.repPoints||0)+'"></div>'
    +'<div style="display:flex;gap:8px;margin-top:12px;">'
    +'<button class="hbtn" onclick="adminSaveEdit(\''+uid+'\')" style="flex:1;padding:10px;">Save Changes</button>'
    +'<button class="hbtn2" onclick="adminDeleteUser(\''+uid+'\')" style="padding:10px 14px;border-color:var(--acc);color:var(--acc);">🗑 Delete User</button>'
    +'</div>'
    +'</div></div>';
  m.style.display='flex';
};

window.adminSaveEdit=function(uid){
  var u=(window._adminAllUsers||[]).find(function(x){return x.uid===uid;});
  if(!u)return;
  u.name=(document.getElementById('ae-name')||{}).value||u.name;
  u.title=(document.getElementById('ae-title')||{}).value||u.title;
  u.bio=(document.getElementById('ae-bio')||{}).value||u.bio;
  u.country=(document.getElementById('ae-country')||{}).value||u.country;
  u.repPoints=parseInt((document.getElementById('ae-rep')||{}).value)||u.repPoints;
  saveUser(u);
  closeModal();
  toast('✓ Profile updated for '+u.name);
  renderAdminV6(); adminTab('users');
};

window.adminDeleteUser=function(uid){
  var u=(window._adminAllUsers||[]).find(function(x){return x.uid===uid;});
  if(!u||u.uid===ME.uid){toast('Cannot delete yourself.','bad');return;}
  if(!confirm('Permanently DELETE '+u.name+'? This cannot be undone.'))return;
  // Remove from cache
  CACHE.users=CACHE.users.filter(function(x){return x.uid!==uid;});
  if(window._adminAllUsers) window._adminAllUsers=window._adminAllUsers.filter(function(x){return x.uid!==uid;});
  // Remove from Firebase
  fbDelete('users',uid);
  closeModal();
  toast('🗑 User deleted: '+u.name);
  renderAdminV6(); adminTab('users');
};

window.adminViewProfile=function(uid){
  closeModal();
  var u=(CACHE.users||[]).find(function(x){return x.uid===uid;});
  if(u) openProfile(u);
};

// Post moderation
window.adminDeletePost=function(pid){
  if(!confirm('Delete this post?'))return;
  CACHE.posts=CACHE.posts.filter(function(p){return p.id!==pid;});
  fbDelete('posts',pid);
  var el=document.getElementById('postcrd-'+pid);
  if(el) el.remove();
  toast('Post deleted.');
};

window.adminFlagPost=function(pid){
  var p=CACHE.posts.find(function(x){return x.id===pid;});
  if(!p)return;
  if(!p.flags) p.flags=[];
  var already=p.flags.includes('admin');
  if(already) p.flags=p.flags.filter(function(f){return f!=='admin';});
  else p.flags.push('admin');
  fbSet('posts',pid,p);
  toast(already?'Flag removed.':'⚠ Post flagged.');
  renderAdminV6(); adminTab('content');
};

// Gig moderation
window.adminDeleteGig=function(gid){
  if(!confirm('Delete this gig?'))return;
  CACHE.gigs=CACHE.gigs.filter(function(g){return g.id!==gid;});
  fbDelete('gigs',gid);
  var el=document.getElementById('gigcrd-'+gid);
  if(el) el.remove();
  toast('Gig deleted.');
};

// Admin DM
window.adminSendDM=function(){
  var sel=document.getElementById('ann-target-user');
  var msg=(document.getElementById('ann-dm-msg')||{}).value.trim();
  if(!sel||!sel.value){toast('Select a user.','bad');return;}
  if(!msg){toast('Write a message.','bad');return;}
  var toUid=sel.value;
  var cid=[ME.uid,toUid].sort().join('_');
  var convData={participants:[ME.uid,toUid],messages:[]};
  convData.messages.push({from:ME.uid,text:'[Admin] '+msg,ts:Date.now(),read:false});
  convData.lastMsg='[Admin] '+msg; convData.lastTs=Date.now();
  fbSet('conversations',cid,convData);
  toast('✉ Message sent!');
  if(document.getElementById('ann-dm-msg')) document.getElementById('ann-dm-msg').value='';
};

// CSV exports
window.adminExportCSV=function(){
  var users=window._adminAllUsers||getAllUsers();
  var rows=[['Name','Email','Role','Country','Category','Badge','SkillID','Rep Points','Score','Gigs','Joined']];
  users.forEach(function(u){
    rows.push([u.name,u.email,u.role,u.country||'',u.category||'',u.badgeStatus,u.skillId,u.repPoints||0,(u.score||0).toFixed(1),u.gigsCount||0,new Date(u.created||Date.now()).toLocaleDateString()]);
  });
  downloadCSV('skillstamp_users.csv',rows);
  toast('⬇ Downloading users CSV…');
};

window.adminExportPostsCSV=function(){
  var rows=[['Author','Content','Type','Likes','Comments','Posted At']];
  (CACHE.posts||[]).forEach(function(p){
    rows.push([p.userName,(p.content||'').replace(/,/g,' '),p.type||'general',p.likes||0,(p.comments||[]).length,new Date(p.ts||Date.now()).toLocaleString()]);
  });
  downloadCSV('skillstamp_posts.csv',rows);
  toast('⬇ Downloading posts CSV…');
};

window.adminExportGigsCSV=function(){
  var rows=[['Title','Pay','Category','Type','Posted By','Applicants','Posted At']];
  (CACHE.gigs||[]).forEach(function(g){
    rows.push([g.title,g.pay,g.category||'',g.type||'',g.posterName,(g.applicants||[]).length,new Date(g.created||Date.now()).toLocaleString()]);
  });
  downloadCSV('skillstamp_gigs.csv',rows);
  toast('⬇ Downloading gigs CSV…');
};

function downloadCSV(filename,rows){
  var csv=rows.map(function(r){return r.map(function(c){return '"'+String(c).replace(/"/g,'""')+'"';}).join(',');}).join('\n');
  var blob=new Blob([csv],{type:'text/csv'});
  var a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download=filename;
  a.click();
}

// postAnnV6 / clearAnnV6 — update to also write to Firebase
window.postAnnV6=async function(){
  var text=(document.getElementById('ann-inp')||{}).value.trim();
  if(!text){toast('Write something first.','bad');return;}
  var ann={text,by:ME.name,ts:Date.now()};
  CACHE.announcement=ann;
  await fbSet('meta','announcement',ann);
  var bar=document.getElementById('ann-bar');
  var txt=document.getElementById('ann-text');
  if(bar&&txt){txt.textContent=text;bar.style.display='flex';}
  toast('📢 Announcement broadcast!');
};

window.clearAnnV6=async function(){
  CACHE.announcement=null;
  await fbDelete('meta','announcement');
  var bar=document.getElementById('ann-bar');
  if(bar) bar.style.display='none';
  toast('Announcement cleared.');
  renderAdminV6(); adminTab('announce');
};

;

// Delete post
window.adminDeletePost=async function(pid){
  if(!confirm('Delete this post permanently?')) return;
  await fbDelete('posts', pid);
  CACHE.posts=CACHE.posts.filter(function(p){return p.id!==pid;});
  adminTab('content');
  renderAdminV6();
  toast('Post deleted.','bad');
};

// Delete gig
window.adminDeleteGig=async function(gid){
  if(!confirm('Delete this gig permanently?')) return;
  await fbDelete('gigs', gid);
  CACHE.gigs=CACHE.gigs.filter(function(g){return g.id!==gid;});
  renderAdminV6();
  toast('Gig deleted.','bad');
};

// Edit user profile (admin override)
window.adminEditUser=function(uid){
  var u=getUser(uid);if(!u)return;
  setModal('<button class="mclose" onclick="closeModal()">✕</button>'
    +'<h3>✏️ Edit User — '+u.name+'</h3>'
    +'<div class="fg"><label class="fl">Display Name</label><input class="fi" id="ae-name" value="'+u.name+'"></div>'
    +'<div class="fg"><label class="fl">Professional Title</label><input class="fi" id="ae-title" value="'+(u.title||'')+'"></div>'
    +'<div class="fg"><label class="fl">Tagline</label><input class="fi" id="ae-tagline" placeholder="e.g. I make brands unforgettable" value="'+(u.tagline||'')+'"></div>'
    +'<div class="fg"><label class="fl">Bio</label><textarea class="fi" id="ae-bio" rows="3" style="resize:vertical;">'+(u.bio||'')+'</textarea></div>'
    +'<div class="fg"><label class="fl">What I Offer <span style="font-size:9px;color:var(--td);">(one per line)</span></label><textarea class="fi" id="ae-offers" rows="3" style="resize:vertical;" placeholder="Brand identity&#10;Logo design">'+(u.offers?u.offers.join('\n'):'')+'</textarea></div>'
    +'<div class="fg"><label class="fl">Reputation Points</label><input class="fi" type="number" id="ae-rep" value="'+(u.repPoints||0)+'"></div>'
    +'<div class="fg"><label class="fl">Badge Status</label>'
    +'<select class="fi" id="ae-badge">'
    +['beginner','review','verified','expert','suspended'].map(function(b){return '<option value="'+b+'"'+(u.badgeStatus===b?' selected':'')+'>'+b+'</option>';}).join('')
    +'</select></div>'
    +'<button class="btn" onclick="adminSaveUserEdit(\''+uid+'\')">Save Changes →</button>');
};

window.adminSaveUserEdit=function(uid){
  var u=getUser(uid);if(!u)return;
  u.name=document.getElementById('ae-name').value.trim()||u.name;
  u.title=document.getElementById('ae-title').value.trim();
  u.bio=document.getElementById('ae-bio').value.trim();
  u.repPoints=Math.max(0,parseInt(document.getElementById('ae-rep').value)||0);
  u.badgeStatus=document.getElementById('ae-badge').value;
  u.score=u.repPoints>0?Math.min(5,(3.5+u.repPoints/200)):0;
  saveUser(u);
  closeModal();
  renderAdminV6();
  toast('User profile updated ✓');
};

// Promote to admin
window.adminPromote=function(){
  var email=document.getElementById('promote-email').value.trim().toLowerCase();
  if(!email){toast('Enter an email address.','bad');return;}
  var u=getAllUsers().find(function(x){return (x.email||'').toLowerCase()===email;});
  if(!u){toast('User not found.','bad');return;}
  if(u.isAdmin){toast(u.name+' is already an admin.');return;}
  if(!confirm('Make '+u.name+' ('+u.email+') an admin? They will have full admin access.')) return;
  u.isAdmin=true;
  saveUser(u);
  toast(u.name+' is now an admin 🛡');
  renderAdminV6();
};

// Export CSV
window.adminExportCSV=function(){
  var users=getAllUsers();
  var rows=[['Name','Email','Country','Category','Role','Badge','Rep Points','Skills','SkillID','Joined']];
  for(var i=0;i<users.length;i++){
    var u=users[i];
    rows.push([
      u.name, u.email, u.country, u.category, u.role,
      u.badgeStatus, u.repPoints||0,
      (u.skills||[]).join('|'),
      u.skillId||'',
      u.created?new Date(u.created).toISOString().slice(0,10):''
    ]);
  }
  var csv=rows.map(function(r){var cells=r.map(function(v){return '"'+(String(v)).split('"').join('""')+'"';});return cells.join(',');}).join('\n');
  var blob=new Blob([csv],{type:'text/csv'});
  var a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download='skillstamp_users_'+new Date().toISOString().slice(0,10)+'.csv';
  a.click();
  toast('CSV exported — '+users.length+' users 📥');
};

// Refresh admin view
window.refreshAdmin=function(){
  renderAdminV6();
  toast('Admin panel refreshed.');
};


// ═══════════════════════════════════════════════════════
// ENHANCED ADMIN PORTAL V6
// ═══════════════════════════════════════════════════════
function renderAdminV6(){
  var root=document.getElementById('admin-root');
  if(!root) return;
  if(!ME||!ME.isAdmin){
    root.innerHTML='<div style="padding:60px;text-align:center;color:var(--td);font-size:13px;">🔒 Access denied. Admins only.</div>';
    return;
  }
  root.innerHTML=buildAdminHTML();
  // activate first tab
  adminTab('overview');
}

function buildAdminHTML(){
  var users=getAllUsers();
  var posts=CACHE.posts||[];
  var gigs=CACHE.gigs||[];
  var endorse=CACHE.endorsements||[];
  var pending=LOCAL.get('pending')||[];
  var pendingList=pending.filter(function(p){return p.status==='pending';});
  var now=Date.now();
  var week=now-7*864e5; var day=now-864e5; var hour=now-36e5;
  var newToday=0,newWeek=0,freelancers=0,employers=0,verified=0,banned=0,experts=0,activeWeek=0;
  for(var i=0;i<users.length;i++){
    var u=users[i];
    if((u.created||0)>day) newToday++;
    if((u.created||0)>week) newWeek++;
    if(u.role==='freelancer') freelancers++;
    else if(u.role==='employer') employers++;
    if(u.badgeStatus==='verified'||u.badgeStatus==='expert') verified++;
    if(u.badgeStatus==='expert') experts++;
    if(u.badgeStatus==='suspended') banned++;
    if((u.lastActive||u.created||0)>week) activeWeek++;
  }

  // ── Stat card helper ─────────────────────────────────────────────────────
  function statCard(label,val,col,sub){
    return '<div style="background:var(--s);border:1px solid var(--br);border-radius:var(--r);padding:12px;text-align:center;">'
      +'<div style="font-family:Plus Jakarta Sans,sans-serif;font-size:22px;font-weight:800;color:'+(col||'var(--fg)')+';">'+val+'</div>'
      +'<div style="font-size:10px;color:var(--td);margin-top:2px;">'+label+'</div>'
      +(sub?'<div style="font-size:9px;color:var(--td);margin-top:1px;">'+sub+'</div>':'')
      +'</div>';
  }

  // ── Section header helper ────────────────────────────────────────────────
  function sHead(icon,label){
    return '<div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:700;font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:var(--td);margin:16px 0 8px;">'+icon+' '+label+'</div>';
  }

  // ── Tab nav ──────────────────────────────────────────────────────────────
  var tabs=['overview','users','content','skills','tickets','reports','analytics','announce'];
  var tabIcons={overview:'📊',users:'👥',content:'🛡',skills:'🔖',tickets:'🎫',reports:'🚩',analytics:'📈',announce:'📢'};
  var tabLabels={overview:'Overview',users:'Users',content:'Moderation',skills:'Verify',tickets:'Support',reports:'Reports',analytics:'Analytics',announce:'Broadcast'};

  var h='<div style="display:flex;align-items:center;gap:10px;margin-bottom:18px;">'
    +'<span style="font-size:24px;">⚙️</span>'
    +'<div><div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:800;font-size:16px;color:var(--acc);">SkillStamp Admin</div>'
    +'<div style="font-size:10px;color:var(--td);">Signed in as '+ME.name+' · Admin Portal</div></div>'
    +'<button onclick="adminExportCSV()" style="margin-left:auto;background:var(--s);border:1px solid var(--br);border-radius:6px;padding:7px 12px;font-size:11px;font-family:Plus Jakarta Sans,sans-serif;font-weight:700;color:var(--fg);cursor:pointer;">⬇ Export CSV</button>'
    +'</div>';

  h+='<div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:18px;" id="adm-tabs">';
  tabs.forEach(function(t){
    var badge=(t==='skills'&&pendingList.length)?'<span style="margin-left:4px;background:var(--acc);color:#fff;border-radius:8px;padding:1px 5px;font-size:9px;">'+pendingList.length+'</span>':'';
    h+='<button id="admt-'+t+'" onclick="adminTab(\''+t+'\')" style="padding:7px 13px;font-size:11px;font-family:Plus Jakarta Sans,sans-serif;font-weight:700;border-radius:6px;border:1px solid var(--br);background:var(--s);color:var(--td);cursor:pointer;transition:all .15s;">'+tabIcons[t]+' '+tabLabels[t]+badge+'</button>';
  });
  h+='</div>';
  h+='<div id="adm-panel">';

  // ════════════════════════════════════════════════════════════════
  //  TAB 1 — OVERVIEW
  // ════════════════════════════════════════════════════════════════
  h+='<div id="admtab-overview" style="display:none;">';

  // Stat grid
  h+='<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:9px;margin-bottom:16px;">'
    +statCard('Total Users',users.length,'var(--gld)')
    +statCard('New Today',newToday,'var(--grn)')
    +statCard('New This Week',newWeek,'var(--blu)')
    +statCard('Active This Week',activeWeek,'var(--pur)')
    +statCard('Freelancers',freelancers,'var(--acc)')
    +statCard('Employers',employers,'var(--td)')
    +statCard('Total Posts',posts.length,'var(--blu)')
    +statCard('Active Gigs',gigs.length,'var(--grn)')
    +statCard('Endorsements',endorse.length,'var(--pur)')
    +statCard('Verified Users',verified,'var(--grn)')
    +statCard('Experts',experts,'var(--gld)')
    +statCard('Suspended',banned,banned?'var(--acc)':'var(--td)')
    +statCard('Active Now',users.filter(function(u){return u.lastSeen&&(now-u.lastSeen)<1800000;}).length,'#4ade80','online in 30m')
    +'</div>';

  // Growth bar chart (posts by day for past 7 days)
  var days=[];
  for(var d=6;d>=0;d--){
    var dayStart=now-(d+1)*864e5; var dayEnd=now-d*864e5;
    var label=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][new Date(dayEnd).getDay()];
    var count=posts.filter(function(p){return (p.ts||0)>=dayStart&&(p.ts||0)<dayEnd;}).length;
    days.push({label:label,count:count});
  }
  var maxDay=Math.max(1,...days.map(function(d){return d.count;}));
  h+=sHead('📈','Post Activity — Last 7 Days');
  h+='<div style="background:var(--s);border:1px solid var(--br);border-radius:var(--r);padding:14px;margin-bottom:14px;">'
    +'<div style="display:flex;align-items:flex-end;gap:6px;height:70px;">';
  days.forEach(function(d){
    var pct=Math.round(d.count/maxDay*100);
    h+='<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;">'
      +'<div style="font-size:9px;color:var(--td);">'+(d.count||'')+'</div>'
      +'<div style="flex:1;width:100%;display:flex;align-items:flex-end;">'
      +'<div style="width:100%;background:var(--acc);border-radius:3px 3px 0 0;height:'+pct+'%;min-height:3px;"></div>'
      +'</div>'
      +'<div style="font-size:9px;color:var(--td);">'+d.label+'</div>'
      +'</div>';
  });
  h+='</div></div>';

  // Country breakdown
  var countries={};
  users.forEach(function(u){if(u.country)countries[u.country]=(countries[u.country]||0)+1;});
  var topCountries=Object.entries(countries).sort(function(a,b){return b[1]-a[1];}).slice(0,5);
  if(topCountries.length){
    h+=sHead('🌍','Users by Country');
    h+='<div style="background:var(--s);border:1px solid var(--br);border-radius:var(--r);padding:14px;margin-bottom:14px;">';
    topCountries.forEach(function(e){
      var pct=Math.round(e[1]/users.length*100);
      h+='<div style="margin-bottom:8px;">'
        +'<div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:3px;">'
        +'<span>'+e[0]+'</span><span style="color:var(--td);">'+e[1]+' ('+pct+'%)</span></div>'
        +'<div style="height:5px;background:var(--br);border-radius:3px;overflow:hidden;">'
        +'<div style="height:100%;width:'+pct+'%;background:var(--acc);border-radius:3px;"></div></div>'
        +'</div>';
    });
    h+='</div>';
  }

  // Category breakdown
  var cats={};
  users.forEach(function(u){if(u.category)cats[u.category]=(cats[u.category]||0)+1;});
  var topCats=Object.entries(cats).sort(function(a,b){return b[1]-a[1];}).slice(0,6);
  if(topCats.length){
    h+=sHead('🎯','Users by Category');
    h+='<div style="background:var(--s);border:1px solid var(--br);border-radius:var(--r);padding:14px;margin-bottom:14px;">';
    topCats.forEach(function(e){
      var pct=Math.round(e[1]/users.length*100);
      h+='<div style="margin-bottom:8px;">'
        +'<div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:3px;">'
        +'<span>'+e[0]+'</span><span style="color:var(--td);">'+e[1]+'</span></div>'
        +'<div style="height:5px;background:var(--br);border-radius:3px;overflow:hidden;">'
        +'<div style="height:100%;width:'+pct+'%;background:var(--pur);border-radius:3px;"></div></div>'
        +'</div>';
    });
    h+='</div>';
  }

  // Recent activity log
  var actLog=LOCAL.get('activity_log')||[];
  h+=sHead('⚡','Recent Activity');
  h+='<div style="background:var(--s);border:1px solid var(--br);border-radius:var(--r);padding:14px;margin-bottom:14px;">';
  if(!actLog.length){
    h+='<div style="text-align:center;font-size:12px;color:var(--td);padding:10px;">No activity yet</div>';
  }
  var recentAct=[...posts.slice(0,3).map(function(p){return {msg:p.userName+' posted: "'+p.content.slice(0,40)+(p.content.length>40?'…':'')+'"',ts:p.ts,col:'var(--blu)'};}),...gigs.slice(0,2).map(function(g){return {msg:g.posterName+' posted gig: '+g.title.slice(0,35),ts:g.created||Date.now(),col:'var(--gld)'};}),...users.slice(-3).map(function(u){return {msg:u.name+' joined as '+u.role,ts:u.created||Date.now(),col:'var(--grn)'};})].sort(function(a,b){return b.ts-a.ts;}).slice(0,10);
  recentAct.forEach(function(a){
    h+='<div style="display:flex;align-items:center;gap:9px;padding:6px 0;border-bottom:1px solid var(--br);">'
      +'<div style="width:7px;height:7px;border-radius:50%;background:'+a.col+';flex-shrink:0;"></div>'
      +'<div style="flex:1;font-size:11px;">'+a.msg+'</div>'
      +'<div style="font-size:9px;color:var(--td);white-space:nowrap;">'+timeAgo(a.ts)+'</div>'
      +'</div>';
  });
  h+='</div>';
  h+='</div>'; // end overview tab

  // ════════════════════════════════════════════════════════════════
  //  TAB 2 — USERS
  // ════════════════════════════════════════════════════════════════
  h+='<div id="admtab-users" style="display:none;">';
  h+=sHead('🔍','Search & Filter Users');
  h+='<div style="display:flex;gap:7px;margin-bottom:10px;">'
    +'<input class="fi" id="adm-user-search" placeholder="Search by name or email…" oninput="adminFilterUsers()" style="flex:1;">'
    +'<select class="fi" id="adm-user-role" onchange="adminFilterUsers()" style="flex:0 0 110px;padding:0 8px;">'
    +'<option value="">All roles</option>'
    +'<option>freelancer</option><option>employer</option><option>tutor</option>'
    +'</select>'
    +'<select class="fi" id="adm-user-badge" onchange="adminFilterUsers()" style="flex:0 0 120px;padding:0 8px;">'
    +'<option value="">All badges</option>'
    +'<option>beginner</option><option>review</option><option>verified</option><option>expert</option><option>suspended</option>'
    +'</select>'
    +'</div>';
  h+='<div id="adm-users-list"></div>';

  // User cards (initial render)
  function buildUserCards(list){
    if(!list.length) return '<div style="text-align:center;padding:24px;font-size:12px;color:var(--td);">No users found</div>';
    var out='';
    list.forEach(function(u){
      var isBanned=u.badgeStatus==='suspended';
      var badgeCol={beginner:'var(--td)',review:'var(--blu)',verified:'var(--grn)',expert:'var(--gld)',suspended:'var(--acc)'}[u.badgeStatus]||'var(--td)';
      out+='<div id="ucard-'+u.uid+'" style="background:var(--s);border:1px solid var(--br);border-radius:var(--r);padding:13px;margin-bottom:8px;">'
        +'<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">'
        +'<div style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,'+u.gradient+','+u.gradient+'88);display:flex;align-items:center;justify-content:center;font-family:Plus Jakarta Sans,sans-serif;font-weight:800;font-size:13px;color:#fff;flex-shrink:0;">'
        +(u.avatar?'<img src="'+u.avatar+'" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">':initials(u.name))
        +'</div>'
        +'<div style="flex:1;min-width:0;">'
        +'<div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:700;font-size:13px;">'+u.name+'</div>'
        +'<div style="font-size:10px;color:var(--td);">'+u.email+' · '+u.country+' · <span style="color:'+badgeCol+';">'+u.badgeStatus+'</span></div>'
        +'<div style="font-size:10px;color:var(--td);">'+u.role+' · SkillID: '+(u.skillId||'N/A')+' · Joined '+new Date(u.created||Date.now()).toLocaleDateString()+'</div>'
        +'<div style="font-size:10px;color:'+(u.lastSeen&&(Date.now()-u.lastSeen)<3600000?'#4ade80':'var(--td)')+';margin-top:2px;">⏱ Last seen: '+(u.lastSeen?timeAgo(u.lastSeen):'Never')+'</div>'
        +'</div></div>'
        // Actions row
        +'<div style="display:flex;gap:6px;flex-wrap:wrap;">'
        +'<select onchange="adminSetBadgeInline(\''+u.uid+'\',this.value)" style="font-size:10px;padding:5px 8px;border:1px solid var(--br);border-radius:5px;background:var(--bg);color:var(--fg);cursor:pointer;flex:1;min-width:100px;">'
        +'<option value="">Set badge…</option>'
        +'<option value="beginner">Beginner</option>'
        +'<option value="review">In Review</option>'
        +'<option value="verified">✓ Verified</option>'
        +'<option value="expert">⭐ Expert</option>'
        +'<option value="suspended">🚫 Suspend</option>'
        +'</select>'
        +'<button onclick="adminEditUser(\''+u.uid+'\')" style="font-size:10px;padding:5px 10px;border:1px solid var(--br);border-radius:5px;background:var(--s);color:var(--fg);cursor:pointer;">✏ Edit</button>'
        +'<button onclick="adminViewDetail(\''+u.uid+'\')" style="font-size:10px;padding:5px 10px;border:1px solid rgba(96,165,250,.3);border-radius:5px;background:rgba(96,165,250,.08);color:#60a5fa;cursor:pointer;">👁 Details</button>'
        +'<button onclick="adminInstantVerify(\''+u.uid+'\')" style="font-size:10px;padding:5px 10px;border:1px solid rgba(74,222,128,.35);border-radius:5px;background:rgba(74,222,128,.08);color:var(--grn);cursor:pointer;font-weight:700;">✓ Verify</button>'
        +(isBanned
          ?'<button onclick="adminToggleBanInline(\''+u.uid+'\',false)" style="font-size:10px;padding:5px 10px;border:1px solid var(--grn);border-radius:5px;background:rgba(39,174,96,.1);color:var(--grn);cursor:pointer;">✓ Unban</button>'
          :u.uid===ME.uid?''
          :'<button onclick="adminToggleBanInline(\''+u.uid+'\',true)" style="font-size:10px;padding:5px 10px;border:1px solid var(--acc);border-radius:5px;background:rgba(255,107,53,.08);color:var(--acc);cursor:pointer;">🚫 Ban</button>')
        +(u.uid!==ME.uid&&!u.isAdmin?'<button onclick="adminPromoteInline(\''+u.uid+'\')" style="font-size:10px;padding:5px 10px;border:1px solid var(--pur);border-radius:5px;background:rgba(155,89,182,.08);color:var(--pur);cursor:pointer;">🛡 Admin</button>':'')
        +(u.isAdmin&&u.uid!==ME.uid?'<button onclick="adminDemoteInline(\''+u.uid+'\')" style="font-size:10px;padding:5px 10px;border:1px solid var(--td);border-radius:5px;background:var(--s);color:var(--td);cursor:pointer;">Remove Admin</button>':'')
        +'</div>'
        +'</div>';
    });
    return out;
  }
  window._adminAllUsers=users;
  window._adminUserCards=buildUserCards;
  h=h+'<!-- user list injected by adminFilterUsers -->';
  h+='</div>'; // end users tab

  // ════════════════════════════════════════════════════════════════
  //  TAB 3 — CONTENT MODERATION
  // ════════════════════════════════════════════════════════════════
  h+='<div id="admtab-content" style="display:none;">';
  h+=sHead('📝','Posts ('+posts.length+')');
  h+='<div style="margin-bottom:14px;">';
  if(!posts.length){
    h+='<div style="text-align:center;padding:20px;font-size:12px;color:var(--td);">No posts yet</div>';
  }
  var sortedPosts=[...posts].sort(function(a,b){return (b.ts||0)-(a.ts||0);});
  sortedPosts.slice(0,30).forEach(function(p){
    var flagged=(p.flags||[]).length>0;
    h+='<div id="postcrd-'+p.id+'" style="background:var(--s);border:1px solid '+(flagged?'var(--acc)':'var(--br)')+';border-radius:var(--r);padding:11px;margin-bottom:7px;">'
      +'<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">'
      +'<div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:700;font-size:12px;">'+p.userName+'</div>'
      +(flagged?'<span style="font-size:9px;background:rgba(255,107,53,.15);color:var(--acc);border-radius:3px;padding:1px 5px;">⚠ Flagged</span>':'')
      +'<div style="margin-left:auto;font-size:9px;color:var(--td);">'+timeAgo(p.ts||Date.now())+'</div>'
      +'</div>'
      +'<div style="font-size:12px;color:var(--fg);margin-bottom:8px;line-height:1.5;">'+p.content.slice(0,200)+(p.content.length>200?'…':'')+'</div>'
      +'<div style="display:flex;gap:6px;align-items:center;">'
      +'<span style="font-size:10px;color:var(--td);">❤ '+( p.likes||0)+' · 💬 '+(p.comments||[]).length+'</span>'
      +'<button onclick="adminDeletePost(\''+p.id+'\')" style="margin-left:auto;font-size:10px;padding:4px 10px;border:1px solid var(--acc);border-radius:5px;background:rgba(255,107,53,.08);color:var(--acc);cursor:pointer;">🗑 Delete</button>'
      +'<button onclick="adminFlagPost(\''+p.id+'\')" style="font-size:10px;padding:4px 10px;border:1px solid var(--br);border-radius:5px;background:var(--s);color:var(--td);cursor:pointer;">'+(flagged?'✓ Unflag':'⚠ Flag')+'</button>'
      +'</div>'
      +'</div>';
  });
  h+='</div>';

  h+=sHead('💼','Gigs ('+gigs.length+')');
  h+='<div style="margin-bottom:14px;">';
  if(!gigs.length){
    h+='<div style="text-align:center;padding:20px;font-size:12px;color:var(--td);">No gigs yet</div>';
  }
  [...gigs].sort(function(a,b){return (b.created||0)-(a.created||0);}).slice(0,20).forEach(function(g){
    h+='<div id="gigcrd-'+g.id+'" style="background:var(--s);border:1px solid var(--br);border-radius:var(--r);padding:11px;margin-bottom:7px;">'
      +'<div style="display:flex;align-items:center;gap:8px;margin-bottom:5px;">'
      +'<div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:700;font-size:12px;flex:1;">'+g.title+'</div>'
      +'<span style="font-size:10px;color:var(--grn);font-weight:700;">'+g.pay+'</span>'
      +'</div>'
      +'<div style="font-size:10px;color:var(--td);margin-bottom:8px;">By: '+g.posterName+' · '+(g.category||'General')+' · '+g.type+'</div>'
      +'<button onclick="adminDeleteGig(\''+g.id+'\')" style="font-size:10px;padding:4px 10px;border:1px solid var(--acc);border-radius:5px;background:rgba(255,107,53,.08);color:var(--acc);cursor:pointer;">🗑 Delete Gig</button>'
      +'</div>';
  });
  h+='</div>';
  h+='</div>'; // end content tab

  // ════════════════════════════════════════════════════════════════
  //  TAB 4 — SKILL VERIFICATION
  // ════════════════════════════════════════════════════════════════
  h+='<div id="admtab-skills" style="display:none;">';
  h+='<div style="display:flex;gap:9px;margin-bottom:14px;">'
    +statCard('Pending',pendingList.length,pendingList.length?'var(--acc)':'var(--grn)')
    +statCard('Approved',pending.filter(function(p){return p.status==='approved';}).length,'var(--grn)')
    +statCard('Rejected',pending.filter(function(p){return p.status==='rejected';}).length,'var(--td)')
    +'</div>';
  h+=sHead('⏳','Pending Submissions ('+pendingList.length+')');
  if(!pendingList.length){
    h+='<div style="text-align:center;padding:30px;font-size:13px;color:var(--td);">✅ All caught up — no pending skill submissions</div>';
  }
  pendingList.forEach(function(p){
    var submitter=users.find(function(u){return u.uid===p.uid;})||{name:p.userName||'Unknown',gradient:'#ccc'};
    h+='<div style="background:var(--s);border:1px solid var(--br);border-radius:var(--r);padding:14px;margin-bottom:9px;">'
      +'<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">'
      +'<div style="width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,'+submitter.gradient+','+submitter.gradient+'88);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;color:#fff;">'+initials(submitter.name)+'</div>'
      +'<div><div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:700;font-size:12px;">'+submitter.name+'</div>'
      +'<div style="font-size:10px;color:var(--td);">'+timeAgo(p.submitted||Date.now())+'</div></div>'
      +'<div style="margin-left:auto;background:var(--acc);color:#fff;border-radius:5px;padding:3px 9px;font-size:10px;font-weight:700;">'+p.skill+'</div>'
      +'</div>'
      +(p.evidence?'<div style="font-size:11px;color:var(--fg);margin-bottom:8px;background:var(--bg);border-radius:5px;padding:9px;line-height:1.5;"><strong>Evidence:</strong> '+p.evidence+'</div>':'')
      +(p.link?'<a href="'+p.link+'" target="_blank" style="font-size:10px;color:var(--blu);display:block;margin-bottom:8px;">🔗 View Portfolio Link</a>':'')
      +'<div style="display:flex;gap:7px;">'
      +'<button onclick="adminApprove(\''+p.id+'\')" style="flex:1;padding:8px;font-size:11px;font-family:Plus Jakarta Sans,sans-serif;font-weight:700;background:var(--grn);color:#fff;border:none;border-radius:6px;cursor:pointer;">✓ Approve</button>'
      +'<button onclick="adminReject(\''+p.id+'\')" style="flex:1;padding:8px;font-size:11px;font-family:Plus Jakarta Sans,sans-serif;font-weight:700;background:rgba(255,107,53,.15);color:var(--acc);border:1px solid var(--acc);border-radius:6px;cursor:pointer;">✕ Reject</button>'
      +'<button onclick="adminViewProfile(\''+p.uid+'\')" style="padding:8px 12px;font-size:11px;border:1px solid var(--br);border-radius:6px;background:var(--s);color:var(--fg);cursor:pointer;">👤 Profile</button>'
      +'</div>'
      +'</div>';
  });

  // Approved / Rejected history
  var approved=pending.filter(function(p){return p.status!=='pending';}).slice(-20).reverse();
  if(approved.length){
    h+=sHead('📜','Recent Decisions');
    h+='<div style="background:var(--s);border:1px solid var(--br);border-radius:var(--r);padding:12px;">';
    approved.forEach(function(p){
      var col=p.status==='approved'?'var(--grn)':'var(--td)';
      h+='<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--br);">'
        +'<span style="font-size:10px;color:'+col+';">'+(p.status==='approved'?'✓':'✕')+'</span>'
        +'<span style="font-size:11px;flex:1;">'+(p.userName||'User')+' — <strong>'+p.skill+'</strong></span>'
        +'<span style="font-size:9px;color:var(--td);">'+timeAgo(p.submitted||Date.now())+'</span>'
        +'</div>';
    });
    h+='</div>';
  }
  h+='</div>'; // end skills tab

  // ════════════════════════════════════════════════════════════════
  //  TAB — SUPPORT TICKETS
  // ════════════════════════════════════════════════════════════════
  h+='<div id="admtab-tickets" style="display:none;">';
  h+=sHead('🎫','Support Tickets');
  h+='<div id="adm-tickets-list"><div style="text-align:center;padding:24px;font-size:12px;color:var(--td);">Loading...</div></div>';
  h+='</div>';

  // ════════════════════════════════════════════════════════════════
  //  TAB — PROFILE REPORTS
  // ════════════════════════════════════════════════════════════════
  h+='<div id="admtab-reports" style="display:none;">';
  h+=sHead('🚩','Profile Reports');
  h+='<div id="adm-reports-list"><div style="text-align:center;padding:24px;font-size:12px;color:var(--td);">Loading...</div></div>';
  h+='</div>';

  // ════════════════════════════════════════════════════════════════
  //  TAB — ANALYTICS
  // ════════════════════════════════════════════════════════════════
  h+='<div id="admtab-analytics" style="display:none;">';
  h+=sHead('📈','Deep Analytics');

  var totalGigsAll = gigs.length || 1;
  var completedCount = gigs.filter(function(g){return g.status==='completed';}).length;
  var postedCount = gigs.filter(function(g){return g.status!=='completed';}).length;
  var compRate = Math.round(completedCount/totalGigsAll*100);

  h+='<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:9px;margin-bottom:16px;">';
  h+=statCard('Gigs Posted',postedCount,'var(--blu)');
  h+=statCard('Gigs Completed',completedCount,'var(--grn)');
  h+=statCard('Completion Rate',compRate+'%',compRate>50?'var(--grn)':'var(--acc)');
  h+=statCard('Active (7d)',activeWeek,'var(--pur)');
  h+='</div>';

  h+=sHead('🕐','Last Seen — All Users');
  h+='<div style="background:var(--s);border:1px solid var(--br);border-radius:var(--r);overflow:hidden;margin-bottom:14px;">';
  var byLogin=users.slice().sort(function(a,b){return (b.lastActive||b.created||0)-(a.lastActive||a.created||0);});
  byLogin.slice(0,12).forEach(function(u,i){
    var sep=i<11?'border-bottom:1px solid var(--br);':'';
    var last=u.lastActive?timeAgo(u.lastActive):'Never';
    var hot=(Date.now()-(u.lastActive||0))<3600000;
    h+='<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;'+sep+'">';
    h+='<div style="width:8px;height:8px;border-radius:50%;background:'+(hot?'#4ade80':'var(--br)')+';flex-shrink:0;"></div>';
    h+='<div style="flex:1;min-width:0;"><div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:600;font-size:11px;">'+u.name+'</div><div style="font-size:9px;color:var(--td);">'+u.role+' · '+u.country+'</div></div>';
    h+='<div style="font-size:10px;color:'+(hot?'#4ade80':'var(--td)')+';">'+last+'</div>';
    h+='</div>';
  });
  h+='</div>';

  h+=sHead('📊','Gig Trend — Posted vs Completed (4 weeks)');
  var gigWeeks=[];
  for(var wki=3;wki>=0;wki--){
    var ws=now-(wki+1)*7*864e5, we=now-wki*7*864e5;
    var wlabel=wki===0?'This wk':wki===1?'Last wk':'W-'+wki;
    gigWeeks.push({label:wlabel,
      posted:gigs.filter(function(g){return (g.created||0)>=ws&&(g.created||0)<we;}).length,
      completed:gigs.filter(function(g){return g.status==='completed'&&(g.created||0)>=ws&&(g.created||0)<we;}).length
    });
  }
  var wkMax=Math.max(1,...gigWeeks.map(function(w){return Math.max(w.posted,w.completed);}));
  h+='<div style="background:var(--s);border:1px solid var(--br);border-radius:var(--r);padding:14px;margin-bottom:14px;">';
  h+='<div style="display:flex;align-items:flex-end;gap:8px;height:80px;">';
  gigWeeks.forEach(function(wk){
    var ph=Math.round(wk.posted/wkMax*100), ch=Math.round(wk.completed/wkMax*100);
    h+='<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:2px;">';
    h+='<div style="width:100%;display:flex;gap:2px;align-items:flex-end;height:60px;">';
    h+='<div style="flex:1;background:#60a5fa;border-radius:3px 3px 0 0;height:'+ph+'%;min-height:2px;"></div>';
    h+='<div style="flex:1;background:#4ade80;border-radius:3px 3px 0 0;height:'+ch+'%;min-height:2px;"></div>';
    h+='</div><div style="font-size:8px;color:var(--td);text-align:center;">'+wk.label+'</div>';
    h+='</div>';
  });
  h+='</div>';
  h+='<div style="display:flex;gap:14px;margin-top:6px;">';
  h+='<div style="display:flex;align-items:center;gap:4px;font-size:10px;color:var(--td);"><div style="width:10px;height:10px;background:#60a5fa;border-radius:2px;"></div>Posted</div>';
  h+='<div style="display:flex;align-items:center;gap:4px;font-size:10px;color:var(--td);"><div style="width:10px;height:10px;background:#4ade80;border-radius:2px;"></div>Completed</div>';
  h+='</div></div>';
  h+='</div>'; // end analytics

  // ════════════════════════════════════════════════════════════════
  //  TAB 5 — BROADCAST / ANNOUNCE
  // ════════════════════════════════════════════════════════════════
  h+='<div id="admtab-announce" style="display:none;">';

  var ann=CACHE.announcement||null;
  var currentAnn=ann&&ann.text?ann.text:'';
  h+=sHead('📢','Platform Announcement');
  h+='<div style="background:var(--s);border:1px solid var(--br);border-radius:var(--r);padding:14px;margin-bottom:14px;">'
    +'<div style="font-size:11px;color:var(--td);margin-bottom:10px;">This appears as a banner to ALL users at the top of the app.</div>'
    +(currentAnn?'<div style="background:rgba(232,197,32,.1);border:1px solid rgba(232,197,32,.3);border-radius:6px;padding:9px;font-size:12px;margin-bottom:10px;">📢 Current: '+currentAnn+'</div>':'')
    +'<textarea class="fi" id="ann-inp" placeholder="SkillStamp is now live in Ghana 🇬🇭" rows="3" style="width:100%;resize:vertical;margin-bottom:8px;">'+currentAnn+'</textarea>'
    +'<div style="display:flex;gap:7px;">'
    +'<button class="hbtn" onclick="postAnnV6()" style="flex:1;padding:10px;font-size:12px;">📢 Broadcast to All Users</button>'
    +(currentAnn?'<button class="hbtn2" onclick="clearAnnV6()" style="padding:10px 14px;font-size:12px;">✕ Clear</button>':'')
    +'</div></div>';

  h+=sHead('✉️','Direct Message a User');
  h+='<div style="background:var(--s);border:1px solid var(--br);border-radius:var(--r);padding:14px;margin-bottom:14px;">'
    +'<select class="fi" id="ann-target-user" style="margin-bottom:8px;">'
    +'<option value="">Select a user…</option>'
    +users.filter(function(u){return u.uid!==ME.uid;}).map(function(u){return '<option value="'+u.uid+'">'+u.name+' ('+u.email+')</option>';}).join('')
    +'</select>'
    +'<textarea class="fi" id="ann-dm-msg" placeholder="Hi! Just wanted to let you know…" rows="3" style="width:100%;resize:vertical;margin-bottom:8px;"></textarea>'
    +'<button class="hbtn" onclick="adminSendDM()" style="width:100%;padding:10px;font-size:12px;">✉ Send Message</button>'
    +'</div>';

  h+=sHead('⬇','Export Platform Data');
  h+='<div style="background:var(--s);border:1px solid var(--br);border-radius:var(--r);padding:14px;margin-bottom:14px;">'
    +'<div style="font-size:11px;color:var(--td);margin-bottom:10px;">Download platform data as CSV files. Opens in Excel / Google Sheets.</div>'
    +'<div style="display:flex;flex-direction:column;gap:7px;">'
    +'<button onclick="adminExportCSV()" style="padding:10px;font-size:12px;font-family:Plus Jakarta Sans,sans-serif;font-weight:700;border:1px solid var(--br);border-radius:6px;background:var(--s);color:var(--fg);cursor:pointer;text-align:left;">⬇ Users CSV — '+users.length+' users</button>'
    +'<button onclick="adminExportPostsCSV()" style="padding:10px;font-size:12px;font-family:Plus Jakarta Sans,sans-serif;font-weight:700;border:1px solid var(--br);border-radius:6px;background:var(--s);color:var(--fg);cursor:pointer;text-align:left;">⬇ Posts CSV — '+posts.length+' posts</button>'
    +'<button onclick="adminExportGigsCSV()" style="padding:10px;font-size:12px;font-family:Plus Jakarta Sans,sans-serif;font-weight:700;border:1px solid var(--br);border-radius:6px;background:var(--s);color:var(--fg);cursor:pointer;text-align:left;">⬇ Gigs CSV — '+gigs.length+' gigs</button>'
    +'</div></div>';

  h+=sHead('🛡','Grant / Revoke Admin Access');
  h+='<div style="background:var(--s);border:1px solid var(--br);border-radius:var(--r);padding:14px;margin-bottom:14px;">'
    +'<div style="font-size:11px;color:var(--acc);margin-bottom:10px;">⚠ Admin access gives full control over all users and content.</div>'
    +'<select class="fi" id="promote-user-select" style="margin-bottom:8px;">'
    +'<option value="">Select user to promote…</option>'
    +users.filter(function(u){return u.uid!==ME.uid&&!u.isAdmin;}).map(function(u){return '<option value="'+u.uid+'">'+u.name+' ('+u.email+')</option>';}).join('')
    +'</select>'
    +'<button class="hbtn" onclick="adminPromoteFromSelect()" style="width:100%;padding:10px;font-size:12px;">🛡 Grant Admin Access</button>'
    +'</div>';

  h+='</div>'; // end announce tab
  h+='</div>'; // end adm-panel
  return h;
}

function adminStat(label,val,col){
  return '<div style="background:var(--s);border:1px solid var(--br);border-radius:var(--r);padding:12px;text-align:center;">'
    +'<div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:800;font-size:20px;color:'+(col||'var(--gld)')+';">'+val+'</div>'
    +'<div style="font-size:9px;color:var(--td);margin-top:2px;text-transform:uppercase;letter-spacing:.05em;">'+label+'</div>'
    +'</div>';
}

function buildUsersList(users){
  if(!users||!users.length) return '<div style="text-align:center;padding:20px;color:var(--td);">No users found.</div>';
  var h='';
  for(var i=0;i<users.length;i++){
    var u=users[i];
    var isBanned=u.badgeStatus==='suspended';
    var badgeCols={'beginner':'var(--td)','review':'var(--blu)','verified':'var(--grn)','expert':'var(--gld)','suspended':'var(--acc)'};
    h+='<div style="background:var(--s);border:1px solid '+(isBanned?'rgba(255,107,53,.4)':'var(--br)')+';border-radius:var(--r);padding:12px;margin-bottom:8px;">'
      +'<div style="display:flex;align-items:flex-start;gap:9px;margin-bottom:9px;">'
      +'<div style="width:34px;height:34px;border-radius:50%;background:linear-gradient(135deg,'+u.gradient+','+u.gradient+'88);display:flex;align-items:center;justify-content:center;font-family:Plus Jakarta Sans,sans-serif;font-weight:700;font-size:12px;flex-shrink:0;">'+initials(u.name)+'</div>'
      +'<div style="flex:1;min-width:0;">'
      +'<div style="font-weight:700;font-size:12px;font-family:Plus Jakarta Sans,sans-serif;">'+u.name+(u.isAdmin?' <span style="font-size:9px;background:rgba(255,107,53,.15);border:1px solid rgba(255,107,53,.3);color:var(--acc);padding:1px 5px;border-radius:6px;">ADMIN</span>':'')+'</div>'
      +'<div style="font-size:10px;color:var(--td);">'+u.email+' · '+u.country+'</div>'
      +'<div style="display:flex;gap:6px;margin-top:3px;flex-wrap:wrap;">'
      +'<span style="font-size:9px;color:'+(badgeCols[u.badgeStatus]||'var(--td)')+';font-weight:700;">'+u.badgeStatus.toUpperCase()+'</span>'
      
      +'<span style="font-size:9px;color:var(--td);">'+u.role+'</span>'
      +'</div></div></div>'
      // Actions row
      +'<div style="display:flex;gap:5px;flex-wrap:wrap;">'
      +'<button onclick="adminToggleBanV6(\''+u.uid+'\')" style="flex:1;padding:6px;font-size:10px;border-radius:4px;cursor:pointer;border:1px solid '+(isBanned?'rgba(46,213,115,.35)':'rgba(255,107,53,.35)')+';background:'+(isBanned?'rgba(46,213,115,.08)':'rgba(255,107,53,.08)')+';color:'+(isBanned?'var(--grn)':'var(--acc)') +';font-family:Plus Jakarta Sans,sans-serif;font-weight:700;">'+(isBanned?'✅ Unban':'🚫 Ban')+'</button>'
      +'<select onchange="adminSetBadge(\''+u.uid+'\',this.value)" style="flex:1;padding:6px;font-size:10px;border-radius:4px;border:1px solid var(--br);background:var(--s2);color:var(--t);cursor:pointer;">'
      +['beginner','review','verified','expert','suspended'].map(function(b){return '<option value="'+b+'"'+(u.badgeStatus===b?' selected':'')+'>'+b+'</option>';}).join('')
      +'</select>'
      +'<button onclick="adminEditUser(\''+u.uid+'\')" style="padding:6px 10px;font-size:10px;border-radius:4px;cursor:pointer;border:1px solid var(--br);background:var(--s2);color:var(--t);">✏️ Edit</button>'
      +'<button onclick="adminAdjRep(\''+u.uid+'\')" style="padding:6px 10px;font-size:10px;border-radius:4px;cursor:pointer;border:1px solid var(--br);background:var(--s2);color:var(--t);">⭐ Rep</button>'
      +'</div></div>';
  }
  return h;
}
window.renderAdminV6=renderAdminV6;

function adminToggleBanV6(uid){
  var u=getUser(uid);if(!u)return;
  var wasBanned=u.badgeStatus==='suspended';
  u.badgeStatus=wasBanned?'beginner':'suspended';
  saveUser(u);
  var log=LOCAL.get('activity_log')||[];
  log.unshift({msg:'Admin '+(wasBanned?'unbanned':'banned')+' '+u.name,ts:Date.now(),col:'var(--acc)'});
  LOCAL.set('activity_log',log.slice(0,50));
  toast(u.name+' '+(wasBanned?'unbanned ✅':'banned ⛔'));
  var p=document.getElementById('page-admin');if(p)p.innerHTML=renderAdminV6();
}
window.adminToggleBanV6=adminToggleBanV6;

function adminSearchV6(q){
  var users=getAllUsers();
  var fil=q?users.filter(function(u){return u.name.toLowerCase().indexOf(q.toLowerCase())>=0||(u.email||'').toLowerCase().indexOf(q.toLowerCase())>=0;}):users.slice(0,50);
  var el=document.getElementById('adm-users');if(!el)return;
  var h='';
  for(var i=0;i<Math.min(fil.length,50);i++){
    var u=fil[i];
    var isBanned=u.badgeStatus==='suspended';
    var opts='';
    var blist=['beginner','review','verified','expert','suspended'];
    for(var bi=0;bi<blist.length;bi++) opts+='<option'+(u.badgeStatus===blist[bi]?' selected':'')+'>'+blist[bi]+'</option>';
    h+='<div style="display:flex;align-items:center;gap:8px;padding:9px;background:var(--s);border:1px solid '+(isBanned?'rgba(255,107,53,.3)':'var(--br)')+';border-radius:var(--r);margin-bottom:5px;">'
      +avHTML(u,30,'50%')
      +'<div style="flex:1;min-width:0;"><div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:700;font-size:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">'+u.name+'</div>'
      +'<div style="font-size:8px;color:var(--td);">'+u.role+' · '+(u.repPoints||0)+' pts</div></div>'
      +'<select style="background:var(--s2);border:1px solid var(--br);color:#f0ede6;font-size:8px;padding:2px;border-radius:4px;max-width:72px;" onchange="adminSetBadge(\''+u.uid+'\',this.value)">'+opts+'</select>'
      +'<button class="'+(isBanned?'unban-btn':'ban-btn')+'" onclick="adminToggleBanV6(\''+u.uid+'\')">'+(isBanned?'Unban':'Ban')+'</button>'
      +'</div>';
  }
  el.innerHTML=h;
}
window.adminSearchV6=adminSearchV6;

function postAnnV6(){
  var inp=document.getElementById('ann-inp');
  var text=inp?inp.value.trim():'';
  if(!text){toast('Write an announcement first.','bad');return;}
  fbSet('meta','announcement',{text:text,ts:Date.now()});
  var bar=document.getElementById('ann-bar');
  var txt=document.getElementById('ann-text');
  if(bar&&txt){txt.textContent=text;bar.style.display='flex';}
  var log=LOCAL.get('activity_log')||[];
  log.unshift({msg:'Admin broadcast: '+text.slice(0,40),ts:Date.now(),col:'var(--acc)'});
  LOCAL.set('activity_log',log.slice(0,50));
  toast('Announcement sent to all users! 📢');
}
window.postAnnV6=postAnnV6;

function clearAnnV6(){
  fbSet('meta','announcement',{text:''});
  var bar=document.getElementById('ann-bar');
  if(bar) bar.style.display='none';
  var inp=document.getElementById('ann-inp');
  if(inp) inp.value='';
  toast('Announcement cleared.');
}
window.clearAnnV6=clearAnnV6;

// Load announcement on app enter
window.addEventListener('load',function(){
  setTimeout(function(){
    var ann=CACHE.announcement||null;
    if(ann&&ann.text){
      var bar=document.getElementById('ann-bar');
      var txt=document.getElementById('ann-text');
      if(bar&&txt){txt.textContent=ann.text;bar.style.display='flex';}
    }
  },1000);
});

// ════════════════════════════════════════════════════════════════
//  NEW ADMIN FUNCTIONS — v8
// ════════════════════════════════════════════════════════════════

// Override adminTab with version that lazy-loads new tabs
window.adminTab = function(tab) {
  document.querySelectorAll('[id^="admt-"]').forEach(function(b) {
    b.style.background = 'var(--s)'; b.style.color = 'var(--td)'; b.style.borderColor = 'var(--br)';
  });
  var btn = document.getElementById('admt-' + tab);
  if (btn) { btn.style.background = 'var(--acc)'; btn.style.color = '#fff'; btn.style.borderColor = 'var(--acc)'; }
  document.querySelectorAll('[id^="admtab-"]').forEach(function(p) { p.style.display = 'none'; });
  var panel = document.getElementById('admtab-' + tab);
  if (panel) panel.style.display = '';
  if (tab === 'users') adminFilterUsers();
  if (tab === 'tickets') adminLoadTickets();
  if (tab === 'reports') adminLoadReports();
};

// Instant verify — works immediately, no submission required
window.adminInstantVerify = async function(uid) {
  var u = getUser(uid);
  if (!u) { toast('User not found.', 'bad'); return; }
  u.badgeStatus = 'verified';
  u.verificationStatus = 'approved';
  if (!u.skillId) u.skillId = genSkillId();
  await saveUser(u);
  try { pushNotif(u.uid, 'verified', 'You Are Verified!', 'Your SkillID badge is now live on SkillStamp.', { type: 'verified' }); } catch(e) {}
  toast('Verified: ' + u.name + ' ✓');
  if (document.getElementById('adm-users-list')) adminFilterUsers();
};

// View full user account details + disputes
window.adminViewDetail = function(uid) {
  var u = getUser(uid);
  if (!u) { toast('User not found.', 'bad'); return; }
  var w = u.wallet || {};
  var userGigs = getGigs().filter(function(g){ return g.posterUid === uid || g.hiredUid === uid; });
  var disputes = userGigs.filter(function(g){ return g.status === 'disputed'; });

  var avEl = u.avatar
    ? '<img src="' + u.avatar + '" style="width:48px;height:48px;border-radius:50%;object-fit:cover;">'
    : '<div style="width:48px;height:48px;border-radius:50%;background:linear-gradient(135deg,' + u.gradient + ',' + u.gradient + '88);display:flex;align-items:center;justify-content:center;font-family:Plus Jakarta Sans,sans-serif;font-weight:800;font-size:18px;color:#000;">' + initials(u.name) + '</div>';

  var h = '<button class="mclose" onclick="closeModal()">✕</button>';
  h += '<div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">' + avEl;
  h += '<div><div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:800;font-size:15px;">' + u.name + '</div>';
  h += '<div style="font-size:10px;color:var(--td);">' + u.email + ' · ' + u.role + '</div>';
  h += '<div style="font-size:10px;color:var(--td);">' + u.country + ' · Joined ' + new Date(u.created||Date.now()).toLocaleDateString() + '</div></div></div>';

  h += '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:14px;">';
  h += '<div style="background:var(--s2);border-radius:8px;padding:10px;text-align:center;"><div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:800;font-size:14px;color:var(--grn);">$' + Math.round(w.balance||0).toLocaleString() + '</div><div style="font-size:9px;color:var(--td);">Balance</div></div>';
  h += '<div style="background:var(--s2);border-radius:8px;padding:10px;text-align:center;"><div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:800;font-size:14px;">$' + Math.round(w.earned||0).toLocaleString() + '</div><div style="font-size:9px;color:var(--td);">Earned</div></div>';
  h += '<div style="background:var(--s2);border-radius:8px;padding:10px;text-align:center;"><div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:800;font-size:14px;">' + (u.gigsCount||0) + '</div><div style="font-size:9px;color:var(--td);">Gigs</div></div>';
  h += '</div>';

  h += '<div style="background:var(--s2);border-radius:10px;padding:12px;margin-bottom:12px;">';
  h += '<div style="font-size:10px;font-weight:700;color:var(--td);text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px;">Badge · Status</div>';
  h += '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">';
  h += '<span style="font-size:12px;font-weight:700;color:var(--gld);">' + (u.badgeStatus||'beginner').toUpperCase() + '</span>';
  h += '<button onclick="adminInstantVerify(\'' + uid + '\');closeModal();" style="background:var(--grn);color:#000;border:none;border-radius:6px;padding:5px 12px;font-size:10px;font-weight:800;cursor:pointer;">Verify Now</button>';
  if (u.badgeStatus !== 'suspended') {
    h += '<button onclick="adminToggleBanInline(\'' + uid + '\',true);closeModal();" style="background:rgba(239,68,68,.1);color:#ef4444;border:1px solid rgba(239,68,68,.3);border-radius:6px;padding:5px 12px;font-size:10px;font-weight:700;cursor:pointer;">Suspend</button>';
  }
  h += '</div></div>';

  h += '<div style="font-size:10px;color:var(--td);margin-bottom:12px;">Last active: ' + (u.lastActive ? timeAgo(u.lastActive) : 'Unknown') + '</div>';

  if (disputes.length) {
    h += '<div style="background:rgba(239,68,68,.06);border:1px solid rgba(239,68,68,.2);border-radius:10px;padding:12px;margin-bottom:12px;">';
    h += '<div style="font-size:10px;font-weight:700;color:#ef4444;margin-bottom:8px;">ACTIVE DISPUTES (' + disputes.length + ')</div>';
    disputes.forEach(function(g) {
      h += '<div style="background:var(--s2);border-radius:7px;padding:8px 10px;margin-bottom:6px;">';
      h += '<div style="font-size:11px;font-weight:600;">' + g.title + '</div>';
      h += '<div style="font-size:10px;color:var(--td);margin-top:2px;">$' + (g.escrowAmount||0).toLocaleString() + ' in escrow · ' + timeAgo(g.created) + '</div>';
      h += '<button onclick="adminChatLog(\'' + g.id + '\',\'' + g.posterUid + '\',\'' + g.hiredUid + '\')" style="margin-top:6px;background:rgba(96,165,250,.1);border:1px solid rgba(96,165,250,.2);color:#60a5fa;border-radius:6px;padding:4px 10px;font-size:10px;font-weight:700;cursor:pointer;">View Chat Log</button>';
      h += '</div>';
    });
    h += '</div>';
  }

  // Transaction history
  var txns = ((u.wallet||{}).transactions||[]).slice(0,8);
  if (txns.length) {
    h += '<div style="font-size:10px;font-weight:700;color:var(--td);text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px;margin-top:4px;">TRANSACTION HISTORY</div>';
    h += '<div style="background:var(--s2);border:1px solid var(--br);border-radius:10px;overflow:hidden;margin-bottom:12px;">';
    txns.forEach(function(t,i) {
      var isIn = t.type === 'in';
      var sep = i < txns.length-1 ? 'border-bottom:1px solid var(--br);' : '';
      h += '<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;' + sep + '">';
      h += '<div style="width:28px;height:28px;border-radius:8px;background:' + (isIn?'rgba(74,222,128,.1)':'rgba(255,107,53,.1)') + ';display:flex;align-items:center;justify-content:center;font-size:11px;flex-shrink:0;">' + (isIn?'📥':'📤') + '</div>';
      h += '<div style="flex:1;min-width:0;"><div style="font-family:Plus Jakarta Sans,sans-serif;font-size:11px;font-weight:600;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;">' + (t.desc||'Transaction') + '</div>';
      h += '<div style="font-size:9px;color:var(--td);">' + timeAgo(t.ts) + '</div></div>';
      h += '<div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:700;font-size:12px;color:' + (isIn?'var(--grn)':'var(--acc)') + ';flex-shrink:0;">' + (isIn?'+':'-') + '$' + Math.round(t.amount||0).toLocaleString() + '</div>';
      h += '</div>';
    });
    h += '</div>';
  }

  // Danger zone — permanent delete
  h += '<div style="background:rgba(239,68,68,.05);border:1px solid rgba(239,68,68,.18);border-radius:10px;padding:12px;margin-top:4px;">';
  h += '<div style="font-size:10px;font-weight:700;color:#ef4444;text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px;">Danger Zone</div>';
  h += '<button onclick="adminDeleteUserPermanently(\'' + uid + '\',\'' + encodeURIComponent(u.name) + '\')" style="width:100%;padding:10px;background:rgba(239,68,68,.1);border:1.5px solid rgba(239,68,68,.3);color:#ef4444;font-family:Plus Jakarta Sans,sans-serif;font-weight:700;font-size:12px;border-radius:8px;cursor:pointer;">🗑 Delete Account Permanently</button>';
  h += '</div>';

  setModal(h);
};

// Chat log viewer for dispute resolution
window.adminChatLog = async function(gigId, posterUid, hiredUid) {
  closeModal();
  var h = '<button class="mclose" onclick="closeModal()">✕</button>';
  h += '<h3>Chat Log — Dispute Review</h3>';
  h += '<p style="font-size:11px;color:var(--td);">Admin read-only view for dispute settlement.</p>';
  h += '<div id="cl-msgs"><div style="text-align:center;padding:20px;font-size:12px;color:var(--td);">Loading messages...</div></div>';
  setModal(h);

  try {
    var convKey = [posterUid, hiredUid].sort().join('_');
    var allMsgs = [];
    try {
      var snap = await fbGetAll('messages_' + convKey);
      allMsgs = allMsgs.concat(snap);
    } catch(e) {}
    try {
      var snap2 = await fbGetAll('messages_' + gigId);
      allMsgs = allMsgs.concat(snap2);
    } catch(e) {}

    allMsgs.sort(function(a,b){ return (a.ts||0)-(b.ts||0); });
    var el = document.getElementById('cl-msgs');
    if (!el) return;

    if (!allMsgs.length) {
      el.innerHTML = '<div style="text-align:center;padding:20px;font-size:12px;color:var(--td);">No messages found for this gig.</div>';
      return;
    }
    el.innerHTML = allMsgs.map(function(m) {
      var sender = getUser(m.from) || { name: m.from || 'Unknown' };
      return '<div style="margin-bottom:10px;padding:10px;background:var(--s2);border:1px solid var(--br);border-radius:8px;">'
        + '<div style="display:flex;justify-content:space-between;margin-bottom:4px;">'
        + '<span style="font-size:10px;font-weight:700;color:var(--gld);">' + sender.name + '</span>'
        + '<span style="font-size:9px;color:var(--td);">' + timeAgo(m.ts) + '</span>'
        + '</div>'
        + '<div style="font-size:11px;line-height:1.5;">' + (m.text||'') + '</div>'
        + '</div>';
    }).join('');
  } catch(e) {
    var el2 = document.getElementById('cl-msgs');
    if (el2) el2.innerHTML = '<div style="text-align:center;padding:20px;font-size:12px;color:var(--td);">Could not load chat log.</div>';
  }
};

// Load support tickets tab
window.adminLoadTickets = async function() {
  var el = document.getElementById('adm-tickets-list');
  if (!el) return;
  try {
    var tickets = await fbGetAll('support_tickets');
    tickets.sort(function(a,b){ return (b.ts||0)-(a.ts||0); });
    if (!tickets.length) { el.innerHTML = '<div style="text-align:center;padding:30px;font-size:12px;color:var(--td);">No support tickets yet</div>'; return; }
    var typeCfg = { bug_report:{icon:'🐛',label:'Bug',c:'var(--acc)'}, feedback:{icon:'💬',label:'Feedback',c:'var(--blu)'} };
    el.innerHTML = tickets.map(function(t) {
      var cfg = typeCfg[t.type] || {icon:'🎫',label:'Ticket',c:'var(--td)'};
      var isOpen = t.status !== 'closed' && t.status !== 'replied';
      return '<div style="background:var(--s);border:1px solid var(--br);border-radius:var(--r);padding:13px;margin-bottom:8px;">'
        + '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">'
        + '<span style="font-size:16px;">' + cfg.icon + '</span>'
        + '<div style="flex:1;"><div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:700;font-size:12px;color:' + cfg.c + ';">' + cfg.label + '</div>'
        + '<div style="font-size:10px;color:var(--td);">' + (t.name||'User') + ' · ' + timeAgo(t.ts) + '</div></div>'
        + '<span style="font-size:9px;font-weight:700;padding:2px 8px;border-radius:20px;color:' + (isOpen?'var(--grn)':'var(--td)') + ';background:' + (isOpen?'rgba(74,222,128,.1)':'rgba(100,100,100,.1)') + ';">' + (t.status||'open') + '</span>'
        + '</div>'
        + '<div style="font-size:11px;color:var(--tx);line-height:1.6;background:var(--s2);border-radius:6px;padding:9px;margin-bottom:8px;">' + (t.desc||t.text||'No description') + '</div>'
        + (t.steps ? '<div style="font-size:10px;color:var(--td);margin-bottom:8px;"><strong>Steps:</strong> ' + t.steps + '</div>' : '')
        + '<div style="display:flex;gap:6px;">'
        + (isOpen ? '<button onclick="adminCloseTicket(\'' + t.id + '\')" style="flex:1;padding:6px;font-size:10px;background:rgba(74,222,128,.1);border:1px solid rgba(74,222,128,.25);color:var(--grn);border-radius:5px;cursor:pointer;font-weight:700;">Mark Resolved</button>' : '<span style="font-size:10px;color:var(--td);padding:6px;">Resolved</span>')
        + '<button onclick="adminReplyTicket(\'' + t.id + '\',\'' + (t.uid||'') + '\')" style="flex:1;padding:6px;font-size:10px;background:rgba(96,165,250,.08);border:1px solid rgba(96,165,250,.2);color:#60a5fa;border-radius:5px;cursor:pointer;font-weight:700;">Reply</button>'
        + '</div></div>';
    }).join('');
  } catch(e) { el.innerHTML = '<div style="padding:20px;text-align:center;font-size:12px;color:var(--td);">Could not load tickets.</div>'; }
};

window.adminCloseTicket = async function(id) {
  try {
    var t = await fbGet('support_tickets', id);
    if (t) { t.status = 'closed'; t.closedAt = Date.now(); await fbSet('support_tickets', id, t); }
    toast('Ticket resolved');
    adminLoadTickets();
  } catch(e) { toast('Could not update ticket.', 'bad'); }
};

window.adminReplyTicket = function(ticketId, userUid) {
  setModal(
    '<button class="mclose" onclick="closeModal()">✕</button>'
    + '<h3>Reply to Support Ticket</h3>'
    + '<div class="fg"><label class="fl">Your response</label>'
    + '<textarea class="fi" id="tr-msg" rows="4" placeholder="Your reply to the user..." style="resize:vertical;"></textarea></div>'
    + '<button class="btn" id="tr-btn" style="width:100%;">Send Reply</button>'
  );
  setTimeout(function() {
    var btn = document.getElementById('tr-btn');
    if (!btn) return;
    btn.onclick = async function() {
      var msg = (document.getElementById('tr-msg').value||'').trim();
      if (!msg) { toast('Write a reply.', 'bad'); return; }
      btn.disabled = true; btn.textContent = 'Sending...';
      try {
        if (userUid) await pushNotif(userUid, 'support_reply', 'Support Reply', 'SkillStamp replied to your ticket: ' + msg.slice(0,80), { type:'support_reply' });
        var t = await fbGet('support_tickets', ticketId);
        if (t) { t.adminReply = msg; t.status = 'replied'; t.repliedAt = Date.now(); await fbSet('support_tickets', ticketId, t); }
        closeModal(); toast('Reply sent');
      } catch(e) { btn.disabled = false; btn.textContent = 'Send Reply'; toast('Failed.', 'bad'); }
    };
  }, 50);
};

// Load profile reports tab
window.adminLoadReports = async function() {
  var el = document.getElementById('adm-reports-list');
  if (!el) return;
  try {
    var reports = await fbGetAll('profile_reports');
    reports.sort(function(a,b){ return (b.ts||0)-(a.ts||0); });
    if (!reports.length) { el.innerHTML = '<div style="text-align:center;padding:30px;font-size:12px;color:var(--td);">No profile reports</div>'; return; }
    el.innerHTML = reports.map(function(r) {
      var reported = getUser(r.reportedUid) || { name:r.reportedName||'Unknown', gradient:'#888' };
      var reporter = getUser(r.reporterUid) || { name:r.reporterName||'Unknown' };
      var isPending = r.status === 'pending' || !r.status;
      return '<div style="background:var(--s);border:1px solid var(--br);border-radius:var(--r);padding:13px;margin-bottom:8px;">'
        + '<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">'
        + avHTML(reported, 36, '50%')
        + '<div style="flex:1;min-width:0;"><div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:700;font-size:12px;">Reported: ' + reported.name + '</div>'
        + '<div style="font-size:10px;color:var(--td);">By: ' + reporter.name + ' · ' + timeAgo(r.ts) + '</div></div>'
        + '<span style="font-size:9px;font-weight:700;padding:2px 8px;border-radius:20px;color:' + (isPending?'var(--acc)':'var(--td)') + ';background:' + (isPending?'rgba(255,107,53,.1)':'rgba(100,100,100,.1)') + ';">' + (r.status||'pending') + '</span>'
        + '</div>'
        + '<div style="font-size:10px;font-weight:700;color:var(--acc);margin-bottom:4px;">Reason: ' + r.reason + '</div>'
        + (r.detail ? '<div style="font-size:11px;color:var(--td);line-height:1.5;background:var(--s2);border-radius:6px;padding:8px;margin-bottom:8px;">' + r.detail + '</div>' : '')
        + '<div style="display:flex;gap:6px;flex-wrap:wrap;">'
        + '<button onclick="adminViewDetail(\'' + r.reportedUid + '\')" style="flex:1;padding:6px;font-size:10px;background:rgba(96,165,250,.08);border:1px solid rgba(96,165,250,.2);color:#60a5fa;border-radius:5px;cursor:pointer;font-weight:700;">View Account</button>'
        + '<button onclick="adminInstantVerify(\'' + r.reportedUid + '\');" style="flex:1;padding:6px;font-size:10px;background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.2);color:#ef4444;border-radius:5px;cursor:pointer;font-weight:700;">Suspend User</button>'
        + '<button onclick="adminDismissReport(\'' + r.id + '\')" style="flex:1;padding:6px;font-size:10px;background:var(--s);border:1px solid var(--br);color:var(--td);border-radius:5px;cursor:pointer;">Dismiss</button>'
        + '</div></div>';
    }).join('');
  } catch(e) { el.innerHTML = '<div style="padding:20px;text-align:center;font-size:12px;color:var(--td);">Could not load reports.</div>'; }
};

window.adminDismissReport = async function(id) {
  try {
    var r = await fbGet('profile_reports', id);
    if (r) { r.status = 'dismissed'; r.dismissedAt = Date.now(); await fbSet('profile_reports', id, r); }
    toast('Report dismissed');
    adminLoadReports();
  } catch(e) { toast('Could not dismiss.', 'bad'); }
};

// Track lastActive on every app entry
(function() {
  var _oe = window.enterApp;
  window.enterApp = function() {
    if (typeof _oe === 'function') _oe.apply(this, arguments);
    if (window.ME && window.ME.uid) {
      var ts = Date.now();
      window.ME.lastActive = ts;
      fbSet('users', window.ME.uid, Object.assign({}, window.ME, { lastActive: ts })).catch(function(){});
    }
  };
})();

// Permanently delete a user account and all associated data
window.adminDeleteUserPermanently = async function(uid, encodedName) {
  var uname = decodeURIComponent(encodedName || 'this user');
  setModal(
    '<button class="mclose" onclick="closeModal()">✕</button>'
    + '<div style="text-align:center;padding:12px 0 16px;">'
    + '<div style="font-size:44px;margin-bottom:10px;">🗑️</div>'
    + '<div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:800;font-size:16px;color:#ef4444;margin-bottom:6px;">Delete Account</div>'
    + '<div style="font-size:12px;color:var(--td);line-height:1.6;margin-bottom:16px;">This will <strong style="color:var(--tx);">permanently delete</strong> <strong>' + uname + '</strong> and all their data. This cannot be undone.</div>'
    + '</div>'
    + '<div class="fg"><label class="fl">Type DELETE to confirm</label>'
    + '<input class="fi no-icon" id="del-confirm-admin" placeholder="DELETE" style="text-transform:uppercase;"></div>'
    + '<button class="btn" id="del-confirm-btn" style="background:#ef4444;color:#fff;box-shadow:0 4px 14px rgba(239,68,68,.3);">Delete Permanently</button>'
  );
  setTimeout(function() {
    var btn = document.getElementById('del-confirm-btn');
    if (!btn) return;
    btn.onclick = async function() {
      var val = (document.getElementById('del-confirm-admin').value||'').trim().toUpperCase();
      if (val !== 'DELETE') { toast('Type DELETE to confirm.', 'bad'); return; }
      btn.disabled = true; btn.textContent = 'Deleting...';
      try {
        // Delete user document from Firestore
        await fbDelete('users', uid);
        // Mark in deleted_accounts archive
        await fbSet('deleted_accounts', uid, {
          uid: uid, name: uname, deletedAt: Date.now(), deletedBy: ME.uid
        });
        // Remove from local cache
        CACHE.users = CACHE.users.filter(function(u){ return u.uid !== uid; });
        closeModal();
        toast(uname + ' has been permanently deleted.');
        // Refresh user list
        setTimeout(function(){ if(typeof adminFilterUsers==='function') adminFilterUsers(); }, 300);
      } catch(e) {
        btn.disabled = false; btn.textContent = 'Delete Permanently';
        toast('Delete failed: ' + e.message, 'bad');
      }
    };
  }, 50);
};
