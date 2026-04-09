// SkillStamp — App Shell — enterApp, showPage, Portfolio, Onboarding, Gig Tracker, Workspace

// ══════════════════════════════════════════════
//  APP SHELL
// ══════════════════════════════════════════════
function enterApp(){
  var ls=document.getElementById('screen-loading');if(ls)ls.style.display='none';
  var loginEl=document.getElementById('screen-login');
  loginEl.classList.remove('active');
  loginEl.style.display='none';
  var appEl=document.getElementById('screen-app');
  appEl.classList.add('active');
  appEl.style.display='block';
  var bn=document.getElementById('bottom-nav');if(bn){bn.style.display='';bn.classList.add('app-visible');}
  if(typeof applyThemeBtn==='function') applyThemeBtn();
  setTimeout(checkMaintenanceMode,800);
  // Sync applications from Firebase in case they were updated by clients
  setTimeout(async function(){
    var fresh=await fbGet('users',ME.uid);
    if(fresh&&fresh.applications) ME.applications=fresh.applications;
  },2000);
  const av=document.getElementById('nav-av');
  if(ME.avatar){av.innerHTML=`<img src="${ME.avatar}" style="width:100%;height:100%;object-fit:cover;">`;}
  else{av.textContent=initials(ME.name);av.style.background=`linear-gradient(135deg,${ME.gradient},${ME.gradient}88)`;}
  // Admin tab permanently hidden — use admin.html portal instead
  updateHomeStats();
  startRealtimeListeners();
  updateUnreadBadge();
  updateNotifBadge();
  // Load all data immediately in parallel — don't wait for onSnapshot
  Promise.all([
    fbGetAll('users'),
    fbGetAll('gigs'),
    fbGetAll('posts'),
    fbGetAll('endorsements')
  ]).then(function(results){
    if(results[0]&&results[0].length) CACHE.users=results[0];
    if(results[1]&&results[1].length) CACHE.gigs=results[1];
    if(results[2]&&results[2].length) CACHE.posts=results[2].sort(function(a,b){return (b.ts||0)-(a.ts||0);});
    if(results[3]&&results[3].length) CACHE.endorsements=results[3];
    updateHomeStats();
    // Re-render current page with fresh data
    if(document.getElementById('page-home').classList.contains('active')) renderRoleHome();
    if(document.getElementById('page-talent').classList.contains('active')) renderTalent();
  }).catch(function(e){ console.warn('Initial data load failed, retrying...', e); });
  showPage('home'); // triggers renderRoleHome
  // Load Firebase notifications (verification results, ban notices etc)
  setTimeout(loadFirebaseNotifs, 1200);
  // AI simulation disabled
}


// ── PROFILE COMPLETION CHECK ────────────────────────────────
function checkProfileComplete(){
  if(!ME||ME.role!=="freelancer") return;
  var missing=[];
  if(!ME.bio||ME.bio.length<10) missing.push("bio");
  if(!ME.skills||ME.skills.length===0) missing.push("skills");
  if(!ME.avatar) missing.push("photo");
  if(ME.title==="Digital Professional"||!ME.title) missing.push("title");
  if(!missing.length) return;
  if(LOCAL.get("pc_snoozed_"+ME.uid)>Date.now()) return;
  var tips={
    bio:"Add a bio so clients know who you are",
    skills:"Add your skills to get discovered",
    photo:"Add a profile photo to build trust",
    title:"Set your professional title"
  };
  var items=missing.slice(0,3).map(function(k){return '<div style="display:flex;align-items:center;gap:8px;padding:9px 0;border-bottom:1px solid var(--br);">'
    +'<div style="width:6px;height:6px;border-radius:50%;background:var(--acc);flex-shrink:0;"></div>'
    +'<div style="font-size:12px;color:var(--tx);">'+tips[k]+'</div></div>';}).join("");
  setModal(
    '<button class="mclose" id="pc-close">✕</button>'
    +'<div style="text-align:center;padding:8px 0 14px;">'
    +'<div style="font-size:36px;margin-bottom:10px;">✨</div>'
    +'<div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:800;font-size:16px;margin-bottom:6px;">Complete Your Profile</div>'
    +'<div style="font-size:12px;color:var(--td);margin-bottom:16px;">A complete profile gets <strong>3x more views</strong> from clients.</div>'
    +'</div>'
    +items
    +'<div style="display:flex;gap:8px;margin-top:16px;">'
    +'<button class="btn" id="pc-go" style="flex:1;">Update Profile →</button>'
    +'<button class="btn2" id="pc-later" style="flex:1;font-size:11px;">Later</button>'
    +'</div>'
  );
  setTimeout(function(){
    var c=document.getElementById("pc-close");
    var g=document.getElementById("pc-go");
    var l=document.getElementById("pc-later");
    if(c) c.onclick=closeModal;
    if(g) g.onclick=function(){closeModal();showPage("myprofile");setTimeout(function(){var eb=document.getElementById("edit-profile-btn");if(eb)eb.click();},400);};
    if(l) l.onclick=function(){closeModal();LOCAL.set("pc_snoozed_"+ME.uid,Date.now()+86400000*3);};
  },50);
}


// ── PORTFOLIO ─────────────────────────────────────────────────
window.openAddPortfolio = function() {
  var mh = '<button class="mclose" id="pf-close">&#x2715;</button>';
  mh += '<h3>&#x1F4F8; Add Portfolio Item</h3>';
  mh += '<p style="font-size:11px;color:var(--td);margin-bottom:14px;">Showcase your work — designs, code, projects, anything you are proud of.</p>';
  mh += '<div class="fg"><label class="fl">Title</label><input class="fi" id="pf-title" placeholder="e.g. Brand Identity for TechCorp"></div>';
  mh += '<div class="fg"><label class="fl">Category</label><select class="fi" id="pf-cat"><option>Design</option><option>Development</option><option>Writing</option><option>Marketing</option><option>Video</option><option>Other</option></select></div>';
  mh += '<div class="fg"><label class="fl">Description <span style="font-size:9px;color:var(--td);">(optional)</span></label><textarea class="fi" id="pf-desc" rows="2" placeholder="Brief description of the work..." style="resize:none;"></textarea></div>';
  mh += '<div class="fg"><label class="fl">Project Link <span style="font-size:9px;color:var(--td);">(optional)</span></label><input class="fi" id="pf-link" placeholder="https://..."></div>';
  mh += '<div class="fg"><label class="fl">Cover Image <span style="font-size:9px;color:var(--td);">(optional)</span></label>';
  mh += '<label for="pf-img-input" style="border:2px dashed var(--br);border-radius:8px;padding:16px;text-align:center;cursor:pointer;display:block;">';
  mh += '<div style="font-size:22px;margin-bottom:4px;">&#x1F4F7;</div>';
  mh += '<div style="font-size:11px;color:var(--td);">Tap to add image</div>';
  mh += '</label><input type="file" id="pf-img-input" accept="image/*" style="display:none;" onchange="handlePFImage(this)"></div>';
  mh += '<div id="pf-img-preview" style="display:none;margin-bottom:12px;"></div>';
  mh += '<button class="btn" id="pf-save" style="width:100%;margin-top:4px;">Add to Portfolio &#x2192;</button>';
  setModal(mh);
  setTimeout(function() {
    document.getElementById('pf-close').onclick = closeModal;
    document.getElementById('pf-save').onclick = savePortfolioItem;
  }, 50);
};

var _pfImageData = null;
window.handlePFImage = function(input) {
  var file = input.files[0]; if (!file) return;
  var reader = new FileReader();
  reader.onload = function(e) {
    var img = new Image();
    img.onload = function() {
      var canvas = document.createElement('canvas');
      var max = 800; var w = img.width, h = img.height;
      if (w > max) { h = h * max / w; w = max; }
      if (h > max) { w = w * max / h; h = max; }
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      _pfImageData = canvas.toDataURL('image/jpeg', 0.7);
      var prev = document.getElementById('pf-img-preview');
      if (prev) {
        prev.style.display = 'block';
        prev.innerHTML = '<img src="' + _pfImageData + '" style="width:100%;max-height:150px;object-fit:cover;border-radius:8px;">';
      }
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
};

window.savePortfolioItem = async function() {
  var title = document.getElementById('pf-title').value.trim();
  if (!title) { toast('Please add a title.', 'bad'); return; }
  var item = {
    id: 'pf' + Date.now(),
    title: title,
    cat: document.getElementById('pf-cat').value,
    desc: document.getElementById('pf-desc').value.trim(),
    link: document.getElementById('pf-link').value.trim(),
    image: _pfImageData || null,
    ts: Date.now()
  };
  if (!ME.portfolio) ME.portfolio = [];
  ME.portfolio.unshift(item);
  _pfImageData = null;
  await saveUser(ME);
  toast('Portfolio item added!');
  closeModal();
  renderMyProfile();
};

window.openPortfolioItem = function(uid, itemId) {
  var u = getUser(uid) || ME;
  var item = (u.portfolio || []).find(function(p) { return p.id === itemId; });
  if (!item) return;
  var isOwn = u.uid === ME.uid;
  var mh = '<button class="mclose" id="pfv-close">&#x2715;</button>';
  if (item.image) mh += '<img src="' + item.image + '" style="width:100%;max-height:220px;object-fit:cover;border-radius:8px;margin-bottom:14px;">';
  mh += '<div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:800;font-size:16px;margin-bottom:4px;">' + item.title + '</div>';
  mh += '<div style="font-size:10px;color:var(--td);margin-bottom:12px;">' + item.cat + (item.ts ? ' &middot; ' + timeAgo(item.ts) : '') + '</div>';
  if (item.desc) mh += '<div style="font-size:12px;color:var(--tx);line-height:1.7;margin-bottom:12px;">' + item.desc + '</div>';
  if (item.link) mh += '<a href="' + item.link + '" target="_blank" style="display:flex;align-items:center;gap:6px;background:var(--s2);border:1px solid var(--br);border-radius:8px;padding:10px 14px;font-size:12px;color:var(--gld);text-decoration:none;margin-bottom:10px;">&#x1F517; View Project</a>';
  if (isOwn) {
    mh += '<button class="btn2" id="pfv-del" style="width:100%;border-color:rgba(239,68,68,.3);color:#ef4444;font-size:11px;">&#x1F5D1; Remove</button>';
  }
  setModal(mh);
  setTimeout(function() {
    document.getElementById('pfv-close').onclick = closeModal;
    if (isOwn) {
      document.getElementById('pfv-del').onclick = async function() {
        if (!confirm('Remove this portfolio item?')) return;
        ME.portfolio = ME.portfolio.filter(function(p) { return p.id !== itemId; });
        await saveUser(ME);
        toast('Removed.');
        closeModal();
        renderMyProfile();
      };
    }
  }, 50);
};

function buildPortfolio(u, isOwn) {
  var items = u.portfolio || [];
  if (!items.length && !isOwn) return '';
  var h = '<div class="psec"><div class="psec-t" style="display:flex;align-items:center;justify-content:space-between;">&#x1F4F8; Portfolio'
    + '<span style="font-size:9px;font-weight:400;color:var(--td);">(' + items.length + ' items)</span></div>';
  h += '<div class="portfolio-grid">';
  items.slice(0, 6).forEach(function(item) {
    h += '<div class="pf-card" data-pfuid="'+u.uid+'" data-pfid="'+item.id+'">';
    if (item.image) {
      h += '<img src="' + item.image + '" class="pf-img" alt="' + item.title + '">';
    } else {
      var catIcon = {'Design':'&#x1F3A8;','Development':'&#x1F4BB;','Writing':'&#x270D;','Marketing':'&#x1F4E3;','Video':'&#x1F3AC;','Other':'&#x2728;'}[item.cat] || '&#x2728;';
      h += '<div class="pf-img-placeholder">' + catIcon + '</div>';
    }
    h += '<div class="pf-info"><div class="pf-title">' + item.title + '</div><div style="display:flex;align-items:center;gap:4px;">'+'<div class="pf-tag">' + item.cat + '</div>'+(item.verified?'<span class="verified-work-badge">&#x2713; Verified</span>':'')+'</div></div>';
    h += '</div>';
  });
  if (isOwn) {
    h += '<div class="pf-add" onclick="openAddPortfolio()"><div style="font-size:24px;">+</div><div>Add Work</div></div>';
  }
  h += '</div></div>';
  // Event delegation attached after render via initPortfolioClicks()
  return h;
}

// ── ONBOARDING ────────────────────────────────────────────
var _obSlide=0;
var _obSlides=[];
function getObSlides(){
  if(!ME) return [];
  var isClient=ME.role==='employer';
  if(isClient){
    return [
      {icon:"🌍",title:"Welcome to SkillStamp",body:"Africa's verified freelance marketplace. Hire pre-verified talent, pay securely through escrow, and manage everything in one place."},
      {icon:"💼",title:"Post Your First Gig",body:"Go to the Gigs page and tap '+ Post a Gig'. Set a clear title, description, budget, and deadline. Verified freelancers will submit proposals to you."},
      {icon:"🔒",title:"Escrow Keeps It Safe",body:"Your budget is held in escrow when a gig is posted. Funds only release to the freelancer after you confirm the work is complete — you're always protected."},
      {icon:"✅",title:"You're All Set!",body:"Your account is ready. Head to the Gigs page to post your first job, or browse the Talent page to contact verified freelancers directly.",_clientLast:true},
    ];
  } else {
    return [
      {icon:"🌍",title:"Welcome to SkillStamp",body:"Africa's verified freelance marketplace. Build your SkillID, apply to real gigs, and get paid securely through escrow."},
      {icon:"👤",title:"Complete Your Profile",body:"Add your professional title, a strong bio, your skills, and a profile photo. Clients browse profiles before hiring — make yours stand out."},
      {icon:"⚡",title:"Submit for Verification",body:"Upload 2–5 portfolio samples with proof of ownership. Once approved you receive a SkillID. Unverified members can still apply to gigs — 3 free proposals per month."},
      {icon:"💰",title:"Get Paid Securely",body:"When a client hires you, their payment goes into escrow. Your wallet is credited the moment they mark the work complete. No scams, no delays.",_freelanceLast:true},
    ];
  }
}
function showOnboarding(){
  if(document.getElementById("onboard-overlay")) return;
  _obSlides=getObSlides();
  _obSlide=0;
  var ov=document.createElement("div");
  ov.className="onboard-overlay";
  ov.id="onboard-overlay";
  document.body.appendChild(ov);
  renderObSlide();
}
function renderObSlide(){
  var ov=document.getElementById("onboard-overlay");
  if(!ov) return;
  var s=_obSlides[_obSlide];
  var isLast=_obSlide===_obSlides.length-1;
  var dots=_obSlides.map(function(_,i){return '<div class="onboard-dot'+(i===_obSlide?' active':'')+'"></div>';}).join("");
  var lastActions='';
  if(isLast&&s._clientLast){
    lastActions='<div class="ob-action-row">'
      +'<button class="ob-action-btn" onclick="obSkip();showPage(\'gigs\')">💼 Post a Gig →</button>'
      +'<button class="ob-action-btn" onclick="obSkip();showPage(\'talent\')">👥 Browse Talent →</button>'
      +'</div>';
  } else if(isLast&&s._freelanceLast){
    lastActions='<div class="ob-action-row">'
      +'<button class="ob-action-btn" onclick="obSkip();openSubmitSkill()">⚡ Submit for Verification →</button>'
      +'<button class="ob-action-btn" onclick="obSkip();showPage(\'gigs\')">📋 Browse Gigs →</button>'
      +'</div>';
  }
  ov.innerHTML='<div class="onboard-sheet">'
    +'<div class="onboard-dots">'+dots+'</div>'
    +'<div style="font-size:56px;margin-bottom:16px;line-height:1;">'+s.icon+'</div>'
    +'<div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:800;font-size:20px;margin-bottom:12px;color:var(--tx);">'+s.title+'</div>'
    +'<div style="font-size:13px;color:var(--td);line-height:1.7;margin-bottom:20px;max-width:300px;">'+s.body+'</div>'
    +(lastActions||('<button onclick="obNext()" style="width:100%;padding:15px;background:var(--gld);color:#000;font-family:Plus Jakarta Sans,sans-serif;font-weight:800;font-size:13px;border:none;border-radius:12px;cursor:pointer;margin-bottom:10px;">'
    +(isLast?"Get Started →":"Next →")+'</button>'))
    +(!isLast?'<button onclick="obSkip()" style="background:none;border:none;color:var(--td);font-size:12px;cursor:pointer;padding:8px;">Skip</button>':"")
    +'</div>';
}
window.obNext=function(){
  if(_obSlide<_obSlides.length-1){_obSlide++;renderObSlide();}
  else obSkip();
};
window.obSkip=function(){
  var ov=document.getElementById("onboard-overlay");
  if(ov) ov.remove();
  LOCAL.set("ob_done_"+ME.uid,"1");
  setTimeout(checkProfileComplete,600);
};

// ── GIG APPLICATION TRACKER ──────────────────────────────────
var _gigTab="browse";
window.switchGigTab=function(tab){
  _gigTab=tab;
  document.getElementById("gtab-browse").classList.toggle("active",tab==="browse");
  document.getElementById("gtab-myapps").classList.toggle("active",tab==="myapps");
  // Clear content area before re-rendering
  var ca=document.getElementById("gig-content-area");
  if(ca) ca.innerHTML='';
  if(tab==="browse") renderGigs();
  else renderMyApplications();
};

function renderMyApplications(){
  // Only for freelancers
  if(!ME||ME.role==="employer") return;
  var gigsPage=document.getElementById("page-gigs");
  if(!gigsPage) return;
  // Find or create the content area
  var content=document.getElementById("gig-content-area");
  if(!content){
    content=document.createElement("div");
    content.id="gig-content-area";
    gigsPage.appendChild(content);
  }
  var apps=(ME.applications||[]).slice().reverse();
  if(!apps.length){
    content.innerHTML='<div style="padding:40px 20px;text-align:center;">'
      +'<div style="font-size:40px;margin-bottom:12px;opacity:.3;">📋</div>'
      +'<div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:700;font-size:14px;margin-bottom:6px;">No applications yet</div>'
      +'<div style="font-size:12px;color:var(--td);">Browse gigs and apply to track your progress here.</div>'
      +'</div>';
    return;
  }
  var statusCfg={
    pending:{label:"Pending",bg:"rgba(232,197,71,.1)",border:"rgba(232,197,71,.3)",color:"var(--gld)",icon:"⏳"},
    accepted:{label:"Hired!",bg:"rgba(74,222,128,.1)",border:"rgba(74,222,128,.3)",color:"var(--grn)",icon:"✅"},
    delivered:{label:"Delivered",bg:"rgba(77,159,255,.1)",border:"rgba(77,159,255,.3)",color:"#4d9fff",icon:"📦"},
    rejected:{label:"Not Selected",bg:"rgba(239,68,68,.08)",border:"rgba(239,68,68,.2)",color:"#ef4444",icon:"❌"}
  };
  var h='<div style="padding:14px 16px;">';
  h+='<div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:700;font-size:13px;margin-bottom:14px;">My Applications ('+apps.length+')</div>';
  apps.forEach(function(app){
    var cfg=statusCfg[app.status]||statusCfg.pending;
    var gig=getGigs().find(function(g){return g.id===app.gigId;});
    var poster=getUser(app.posterUid);
    h+='<div style="background:var(--s);border:1px solid var(--br);border-radius:12px;padding:16px;margin-bottom:12px;">'
      +'<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:10px;">'
      +'<div style="flex:1;min-width:0;">'
      +'<div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:700;font-size:13px;margin-bottom:3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">'+app.title+'</div>'
      +'<div style="font-size:10px;color:var(--td);">'+( poster?poster.name:"Client")+' · Applied '+timeAgo(app.appliedAt)+'</div>'
      +'</div>'
      +'<span style="flex-shrink:0;background:'+cfg.bg+';border:1px solid '+cfg.border+';color:'+cfg.color+';font-size:9px;font-family:Plus Jakarta Sans,sans-serif;font-weight:700;padding:3px 9px;border-radius:20px;white-space:nowrap;">'+cfg.icon+' '+cfg.label+'</span>'
      +'</div>'
      +(app.status==="accepted"||app.status==="delivered"?
        '<div style="background:rgba(74,222,128,.06);border:1px solid rgba(74,222,128,.15);border-radius:8px;padding:10px;font-size:11px;color:var(--grn);margin-bottom:10px;">🎉 You were hired! Open the workspace to manage your delivery.</div>'
        :app.status==="rejected"?
        '<div style="font-size:11px;color:var(--td);margin-bottom:10px;">The client selected another freelancer for this gig.</div>'
        :'<div style="font-size:11px;color:var(--td);margin-bottom:10px;">Your application is being reviewed by the client.</div>')
      +(gig&&(gig.status==="hired"||gig.status==="completed")&&gig.hiredUid===ME.uid?
        '<button onclick="openGigWorkspace(\''+app.gigId+'\')" style="background:var(--gld);color:#000;font-family:Plus Jakarta Sans,sans-serif;font-weight:700;font-size:10px;padding:6px 14px;border-radius:6px;cursor:pointer;margin-right:6px;">💼 Workspace</button>'
        :'')

      +'</div>';
  });
  h+='</div>';
  content.innerHTML=h;
}


// ── GIG WORKSPACE ─────────────────────────────────────────────
function deadlineDisplay(deadline){
  if(!deadline) return '';
  var now=Date.now();
  var diff=deadline-now;
  var days=Math.floor(diff/(1000*60*60*24));
  var hours=Math.floor((diff%(1000*60*60*24))/(1000*60*60));
  var cls=diff>172800000?'ok':diff>86400000?'warn':'late';
  var label=diff<=0?'OVERDUE':days>0?days+'d '+hours+'h remaining':hours+'h remaining';
  return '<div class="ws-deadline '+cls+'">\u23F1 '+label+'</div>';
}

function milestoneBar(step){
  var steps=['Hired','In Progress','Delivered','Complete'];
  var h='<div class="ws-milestone">';
  steps.forEach(function(s,i){
    var cls=i<step?'done':i===step?'active':'';
    var icon=i<step?'\u2713':(i+1).toString();
    h+='<div class="ws-step"><div class="ws-step-dot '+cls+'">'+icon+'</div><div class="ws-step-lbl">'+s+'</div></div>';
    if(i<steps.length-1) h+='<div class="ws-line'+(i<step?' done':'')+'" style="flex:1;height:2px;background:var(--br);margin:0 4px;margin-bottom:14px;'+(i<step?'background:var(--grn);':'')+'" ></div>';
  });
  h+='</div>';
  return h;
}

window.openGigWorkspace=async function(gid){
  var gig=getGigs().find(function(g){return g.id===gid;});
  if(!gig){toast('Gig not found.','bad');return;}
  var isClient=ME.uid===gig.posterUid;
  var freelancer=getUser(gig.hiredUid)||{name:'Freelancer',gradient:'#888'};
  var client=getUser(gig.posterUid)||{name:'Client',gradient:'#888'};
  var step=1;
  if(gig.deliveredAt) step=2;
  if(gig.status==='completed') step=3;
  var deadline=gig.deadline?new Date(gig.deadline).getTime():null;
  var deadlineHtml=deadline?deadlineDisplay(deadline):'';
  var mh='<button class="mclose" id="ws-close">\u2715</button>';
  mh+='<div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:800;font-size:15px;margin-bottom:4px;">\uD83D\uDCBC Gig Workspace</div>';
  mh+='<div style="font-size:11px;color:var(--td);margin-bottom:14px;">'+gig.title+'</div>';
  mh+=milestoneBar(step);
  mh+='<div class="ws-escrow"><div><div style="font-size:10px;color:var(--td);margin-bottom:2px;">\uD83D\uDD12 Funds in Escrow</div><div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:800;font-size:18px;color:var(--grn);">$'+(gig.escrowAmount||gig.pay||0).toLocaleString()+'</div></div><div style="font-size:10px;color:var(--td);text-align:right;">Auto-releases on<br>completion</div></div>';
  if(deadlineHtml) mh+=deadlineHtml+'<div style="height:10px;"></div>';
  mh+='<div class="ws-card"><div class="ws-card-title">\uD83D\uDCCB Gig Brief</div><div style="font-size:12px;color:var(--tx);line-height:1.65;">'+gig.description+'</div></div>';
  if(gig.deliveryLink||gig.deliveryNote){
    mh+='<div class="ws-card" style="border-color:rgba(74,222,128,.3);"><div class="ws-card-title" style="color:var(--grn);">\u2705 Delivery Submitted</div>';
    if(gig.deliveryLink) mh+='<div style="font-size:11px;margin-bottom:6px;">\uD83D\uDD17 <a href="'+gig.deliveryLink+'" target="_blank" style="color:var(--gld);">'+gig.deliveryLink+'</a></div>';
    if(gig.deliveryNote) mh+='<div style="font-size:11px;color:var(--td);line-height:1.6;">'+gig.deliveryNote+'</div>';
    mh+='</div>';
  }
  if(gig.lastRevisionNote){
    mh+='<div class="ws-card" style="border-color:rgba(255,165,0,.3);"><div class="ws-card-title" style="color:#ffa500;">\uD83D\uDD04 Revision Requested</div>';
    mh+='<div style="font-size:12px;color:var(--tx);line-height:1.6;">'+gig.lastRevisionNote+'</div></div>';
  }
  mh+='<div id="ws-actions"></div>';
  setModal(mh);
  setTimeout(function(){
    var cl=document.getElementById('ws-close');
    if(cl) cl.onclick=closeModal;
    var acts=document.getElementById('ws-actions');
    if(!acts) return;
    if(!isClient&&gig.status==='hired'&&!gig.deliveredAt){
      acts.innerHTML='<button class="btn" id="ws-deliver" style="width:100%;margin-bottom:8px;">\uD83D\uDCE6 Submit Delivery</button>';
      setTimeout(function(){var db=document.getElementById('ws-deliver');if(db)db.onclick=function(){openDeliveryForm(gid);};},50);
    } else if(isClient&&gig.deliveredAt&&gig.status==='hired'){
      var revisionsLeft=(gig.maxRevisions||1)-(gig.revisionCount||0);
      acts.innerHTML='<button class="btn" id="ws-approve" style="width:100%;margin-bottom:8px;background:var(--grn);color:#000;">\u2705 Approve & Release Payment</button>';
      if(revisionsLeft>0) acts.innerHTML+='<button class="btn2" id="ws-revise" style="width:100%;margin-bottom:8px;">\uD83D\uDD04 Request Revision ('+revisionsLeft+' left)</button>';
      acts.innerHTML+='<button class="btn2" id="ws-dispute" style="width:100%;border-color:rgba(239,68,68,.4);color:#ef4444;">\u26A0\uFE0F Raise Dispute</button>';
      setTimeout(function(){
        var ab=document.getElementById('ws-approve');
        var rb=document.getElementById('ws-revise');
        var db=document.getElementById('ws-dispute');
        if(ab) ab.onclick=function(){openCompleteGig(gid);};
        if(rb) rb.onclick=function(){openRevisionRequest(gid);};
        if(db) db.onclick=function(){closeModal();openDispute(gid);};
      },50);
    } else if(gig.status==='completed'){
      acts.innerHTML='<div style="text-align:center;padding:12px;font-size:12px;color:var(--grn);">\u2713 This gig has been completed successfully</div>';
      var myRating=isClient?gig.clientRating:gig.freelancerRating;
      if(!myRating){
        acts.innerHTML+='<button class="btn" id="ws-rate" style="width:100%;margin-top:8px;">\u2B50 Rate '+(isClient?freelancer.name:client.name)+'</button>';
        setTimeout(function(){var rb=document.getElementById('ws-rate');if(rb)rb.onclick=function(){openRatingPrompt(gid,isClient);};},50);
      }
    } else if(gig.status==='hired'&&!gig.deliveredAt){
      acts.innerHTML='<div style="background:rgba(77,159,255,.06);border:1px solid rgba(77,159,255,.15);border-radius:8px;padding:12px;font-size:11px;color:#4d9fff;">\uD83D\uDD04 Waiting for freelancer to submit delivery.</div>';
      acts.innerHTML+='<button class="btn2" id="ws-dispute2" style="width:100%;margin-top:10px;border-color:rgba(239,68,68,.4);color:#ef4444;">\u26A0\uFE0F Raise Dispute</button>';
      setTimeout(function(){var db=document.getElementById('ws-dispute2');if(db)db.onclick=function(){closeModal();openDispute(gid);};},50);
    }
    acts.innerHTML+='<button class="btn2" id="ws-msg" style="width:100%;margin-top:8px;font-size:11px;">\uD83D\uDCAC Message '+(isClient?freelancer.name:client.name)+'</button>';
    setTimeout(function(){var mb=document.getElementById('ws-msg');if(mb)mb.onclick=function(){openMsg(isClient?gig.hiredUid:gig.posterUid);};},50);
  },50);
};

window.openDeliveryForm=function(gid){
  var mh='<button class="mclose" id="df-close">\u2715</button>';
  mh+='<div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:800;font-size:15px;margin-bottom:4px;">\uD83D\uDCE6 Submit Delivery</div>';
  mh+='<div style="font-size:11px;color:var(--td);margin-bottom:16px;">Share your work link and a note for the client.</div>';
  mh+='<div class="fg"><label class="fl">Delivery Link (Google Drive, GitHub, Figma, etc.)</label><input class="fi" id="df-link" placeholder="https://" style="margin-bottom:12px;"></div>';
  mh+='<div class="fg"><label class="fl">Delivery Note</label><textarea class="fi" id="df-note" rows="3" placeholder="Describe what you have delivered and any instructions..." style="resize:vertical;"></textarea></div>';
  mh+='<button class="btn" id="df-submit" style="width:100%;margin-top:14px;">\uD83D\uDCE4 Confirm Delivery</button>';
  setModal(mh);
  setTimeout(function(){
    document.getElementById('df-close').onclick=closeModal;
    document.getElementById('df-submit').onclick=async function(){
      var link=document.getElementById('df-link').value.trim();
      var note=document.getElementById('df-note').value.trim();
      if(!link&&!note){toast('Please add a delivery link or note.','bad');return;}
      var gig=getGigs().find(function(g){return g.id===gid;});
      if(!gig){toast('Gig not found.','bad');return;}
      gig.deliveryLink=link;gig.deliveryNote=note;gig.deliveredAt=Date.now();
      gig.autoReleaseAt=Date.now()+(48*60*60*1000);
      await fbSet('gigs',gid,gig);
      var ci=CACHE.gigs.findIndex(function(g){return g.id===gid;});
      if(ci>=0) CACHE.gigs[ci]=gig;
      if(ME.applications){ME.applications.forEach(function(a){if(a.gigId===gid)a.status='delivered';});saveUser(ME);}
      pushNotif(gig.posterUid,'delivery','\uD83D\uDCE6 Delivery Submitted',ME.name+' submitted delivery for: '+gig.title+'. Review and release payment within 48h.',{type:'delivery',gigId:gid});
      toast('\uD83D\uDCE6 Delivery submitted! Client has 48 hours to review.');
      closeModal();
    };
  },50);
};

window.openRevisionRequest=function(gid){
  var mh='<button class="mclose" id="rv-close">\u2715</button>';
  mh+='<div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:800;font-size:15px;margin-bottom:4px;">\uD83D\uDD04 Request Revision</div>';
  mh+='<div style="font-size:11px;color:var(--td);margin-bottom:16px;">Tell the freelancer what needs to change.</div>';
  mh+='<div class="fg"><label class="fl">Revision Notes</label><textarea class="fi" id="rv-note" rows="4" placeholder="Describe clearly what needs to be revised..." style="resize:vertical;"></textarea></div>';
  mh+='<button class="btn" id="rv-submit" style="width:100%;margin-top:14px;">Send Revision Request</button>';
  setModal(mh);
  setTimeout(function(){
    document.getElementById('rv-close').onclick=closeModal;
    document.getElementById('rv-submit').onclick=async function(){
      var note=document.getElementById('rv-note').value.trim();
      if(!note){toast('Please describe what needs to change.','bad');return;}
      var gig=getGigs().find(function(g){return g.id===gid;});
      if(!gig) return;
      gig.revisionCount=(gig.revisionCount||0)+1;
      gig.deliveredAt=null;gig.deliveryLink=null;gig.deliveryNote=null;gig.lastRevisionNote=note;
      await fbSet('gigs',gid,gig);
      var ci=CACHE.gigs.findIndex(function(g){return g.id===gid;});
      if(ci>=0) CACHE.gigs[ci]=gig;
      pushNotif(gig.hiredUid,'revision','\uD83D\uDD04 Revision Requested','Client requested changes for: '+gig.title+'. Note: '+note.slice(0,80),{type:'revision',gigId:gid});
      toast('Revision request sent.');closeModal();
    };
  },50);
};

window.openRatingPrompt=function(gid,isClient){
  var gig=getGigs().find(function(g){return g.id===gid;});
  if(!gig) return;
  var other=isClient?getUser(gig.hiredUid):getUser(gig.posterUid);
  if(!other) return;
  var mh='<button class="mclose" id="rt-close">\u2715</button>';
  mh+='<div style="text-align:center;padding:8px 0 14px;">';
  mh+='<div style="font-size:36px;margin-bottom:10px;">\u2B50</div>';
  mh+='<div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:800;font-size:16px;margin-bottom:6px;">Rate '+other.name+'</div>';
  mh+='<div style="font-size:12px;color:var(--td);margin-bottom:18px;">How was your experience working together?</div>';
  mh+='</div>';
  mh+='<div style="display:flex;justify-content:center;gap:10px;margin-bottom:18px;" id="rt-stars">';
  for(var i=1;i<=5;i++) mh+='<span style="font-size:32px;cursor:pointer;opacity:.3;transition:opacity .15s;" data-star="'+i+'">\u2605</span>';
  mh+='</div>';
  mh+='<div class="fg"><textarea class="fi" id="rt-comment" rows="2" placeholder="Optional comment..." style="resize:none;"></textarea></div>';
  mh+='<button class="btn" id="rt-submit" style="width:100%;margin-top:14px;">Submit Rating</button>';
  setModal(mh);
  var selectedStar=0;
  setTimeout(function(){
    document.getElementById('rt-close').onclick=closeModal;
    document.querySelectorAll('#rt-stars span').forEach(function(s){
      s.onclick=function(){
        selectedStar=parseInt(this.getAttribute('data-star'));
        document.querySelectorAll('#rt-stars span').forEach(function(x,xi){x.style.opacity=xi<selectedStar?'1':'.3';});
      };
    });
    document.getElementById('rt-submit').onclick=async function(){
      if(!selectedStar){toast('Please select a star rating.','bad');return;}
      var comment=document.getElementById('rt-comment').value.trim();
      var gi=CACHE.gigs.findIndex(function(g){return g.id===gid;});
      if(gi>=0){
        if(isClient) CACHE.gigs[gi].clientRating={stars:selectedStar,comment:comment,by:ME.uid};
        else CACHE.gigs[gi].freelancerRating={stars:selectedStar,comment:comment,by:ME.uid};
        await fbSet('gigs',gid,CACHE.gigs[gi]);
        if(isClient){
          var fl=getUser(gig.hiredUid);
          if(fl){
            var total=(fl.score||0)*(fl.gigsCount||1)+selectedStar;
            fl.score=Math.round((total/((fl.gigsCount||1)+1))*10)/10;
            fbSet('users',fl.uid,fl);
          }
        }
      }
      toast('\u2B50 Rating submitted! Thank you.');closeModal();
    };
  },50);
};


// ── AVAILABILITY TOGGLE ──────────────────────────────────────
window.toggleAvailability=function(){
  ME.available=!ME.available;
  saveUser(ME);
  renderMyProfile();
  toast(ME.available?'You are now available for work':'Status set to busy');
};

// ── BANNER COLOR ──────────────────────────────────────────────
var BANNER_COLORS=[
  {id:'default',css:'linear-gradient(135deg,#0d1015,#121a10,#150f0a)'},
  {id:'green',  css:'linear-gradient(135deg,#0a2e1a,#1a6b3c,#0f5430)'},
  {id:'blue',   css:'linear-gradient(135deg,#0a1628,#1a3a6b,#0f2a50)'},
  {id:'purple', css:'linear-gradient(135deg,#1a0a28,#4a1a6b,#2a0f50)'},
  {id:'gold',   css:'linear-gradient(135deg,#2a1a00,#6b4a00,#3a2800)'},
  {id:'red',    css:'linear-gradient(135deg,#2a0a0a,#6b1a1a,#500f0f)'},
];
window.openBannerPicker=function(){
  var cur=ME.bannerColor||'default';
  var dots=BANNER_COLORS.map(function(c){
    return '<div class="bcp'+(c.id===cur?' selected':'')+'" style="background:'+c.css+';" onclick="setBannerColor(\''+c.id+'\')"></div>';
  }).join('');
  setModal('<button class="mclose" id="bp-close">&#x2715;</button><h3>&#x1F3A8; Banner Color</h3><p style="font-size:11px;color:var(--td);margin-bottom:14px;">Choose a color for your profile banner.</p><div class="banner-color-pick">'+dots+'</div>');
  document.getElementById('bp-close').onclick=closeModal;
};
window.setBannerColor=function(id){ME.bannerColor=id;saveUser(ME);closeModal();renderMyProfile();};
function getBannerCSS(u){
  var c=BANNER_COLORS.find(function(x){return x.id===(u.bannerColor||'default');});
  return c?c.css:BANNER_COLORS[0].css;
}

// ── HIRE ME FLOW ──────────────────────────────────────────────
window.openHireMe=function(uid){
  var u=getUser(uid);if(!u)return;
  var isVerified=u.badgeStatus==='verified'||u.badgeStatus==='expert'||u.badgeStatus==='elite';

  if(!isVerified){
    // Unverified freelancer — show Job Enquiry form only (no escrow commitment)
    setModal('<button class="mclose" id="hm-close">&#x2715;</button>'
      +'<div style="text-align:center;padding:8px 0 14px;">'
      +'<div style="font-size:36px;margin-bottom:10px;">📩</div>'
      +'<div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:800;font-size:16px;margin-bottom:4px;">Job Enquiry for '+u.name.split(' ')[0]+'</div>'
      +'<div style="font-size:11px;color:var(--td);margin-bottom:4px;">'+(u.title||'Digital Professional')+'</div>'
      +'<div style="display:inline-flex;align-items:center;gap:5px;background:rgba(255,107,53,.08);border:1px solid rgba(255,107,53,.2);border-radius:6px;padding:4px 10px;font-size:10px;color:var(--acc);margin-bottom:14px;">⚠ Not yet verified — enquiry only, no escrow</div>'
      +'</div>'
      +'<div class="fg"><label class="fl">Project Title</label><input class="fi" id="hm-title" placeholder="e.g. Design a logo for my startup"></div>'
      +'<div class="fg"><label class="fl">Budget Range</label>'
      +'<select class="fi" id="hm-budget-range">'
      +'<option value="Under $100">Under $100</option>'
      +'<option value="$100–$300" selected>$100–$300</option>'
      +'<option value="$300–$500">$300–$500</option>'
      +'<option value="$500–$1,000">$500–$1,000</option>'
      +'<option value="$1,000+">$1,000+</option>'
      +'</select></div>'
      +'<div class="fg"><label class="fl">Timeline</label>'
      +'<select class="fi" id="hm-timeline">'
      +'<option>3 days</option><option selected>1 week</option><option>2 weeks</option><option>1 month</option>'
      +'</select></div>'
      +'<div class="fg"><label class="fl">Project Description</label><textarea class="fi" id="hm-desc" rows="4" placeholder="Describe your project, goals, and any specific requirements..." style="resize:vertical;"></textarea></div>'
      +'<div style="background:rgba(232,197,71,.06);border:1px solid rgba(232,197,71,.15);border-radius:8px;padding:10px;font-size:10px;color:var(--td);margin-bottom:14px;">💡 This sends your enquiry as a message. Escrow is only created once both parties agree and a gig is formally posted.</div>'
      +'<button class="btn" id="hm-submit" style="width:100%;margin-top:4px;">Send Enquiry →</button>');
    document.getElementById('hm-close').onclick=closeModal;
    document.getElementById('hm-submit').onclick=function(){
      var title=(document.getElementById('hm-title').value||'').trim();
      var budgetRange=document.getElementById('hm-budget-range').value;
      var timeline=document.getElementById('hm-timeline').value;
      var desc=(document.getElementById('hm-desc').value||'').trim();
      if(!title||!desc){toast('Please fill all fields.','bad');return;}
      var msg='📩 Job Enquiry from '+ME.name+'\n\n'
        +'Project: '+title+'\n'
        +'Budget Range: '+budgetRange+'\n'
        +'Timeline: '+timeline+'\n\n'
        +'Description:\n'+desc+'\n\n'
        +'—\nReply to discuss further. This is an enquiry and does not commit funds.';
      sendAutoMsg(uid,msg);
      pushNotif(uid,'enquiry','📩 New Job Enquiry',ME.name+' sent a job enquiry: '+title,{type:'enquiry',fromUid:ME.uid});
      toast('Enquiry sent to '+u.name.split(' ')[0]+'!');closeModal();
    };
    return;
  }

  // Verified freelancer — direct hire flow with escrow
  setModal('<button class="mclose" id="hm-close">&#x2715;</button>'
    +'<div style="text-align:center;padding:8px 0 14px;">'
    +'<div style="font-size:36px;margin-bottom:10px;">&#x1F4BC;</div>'
    +'<div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:800;font-size:16px;margin-bottom:4px;">Hire '+u.name.split(' ')[0]+'</div>'
    +'<div style="font-size:11px;color:var(--td);margin-bottom:4px;">'+(u.title||'Digital Professional')+'</div>'
    +'<div style="display:inline-flex;align-items:center;gap:5px;background:rgba(74,222,128,.08);border:1px solid rgba(74,222,128,.2);border-radius:6px;padding:4px 10px;font-size:10px;color:var(--grn);margin-bottom:14px;">✓ Verified · Budget goes into escrow</div>'
    +'</div>'
    +'<div class="fg"><label class="fl">Gig Title</label><input class="fi" id="hm-title" placeholder="e.g. Design a logo for my startup"></div>'
    +'<div class="fg"><label class="fl">Budget ($)</label><input class="fi" id="hm-budget" type="number" placeholder="e.g. 500" min="1"></div>'
    +'<div class="fg"><label class="fl">Timeline</label><select class="fi" id="hm-timeline"><option>3 days</option><option selected>1 week</option><option>2 weeks</option><option>1 month</option></select></div>'
    +'<div class="fg"><label class="fl">Description</label><textarea class="fi" id="hm-desc" rows="3" placeholder="Describe what you need..." style="resize:vertical;"></textarea></div>'
    +'<div id="hm-wallet-note" style="font-size:10px;color:var(--td);margin-bottom:10px;background:var(--s2);border:1px solid var(--br);border-radius:6px;padding:8px;">💳 Your wallet: <strong style="color:var(--gld);">$'+(ME.wallet?Math.round(ME.wallet.balance||0).toLocaleString():'0')+'</strong></div>'
    +'<button class="btn" id="hm-submit" style="width:100%;margin-top:4px;">Hire &amp; Lock Escrow &#x2192;</button>');
  document.getElementById('hm-close').onclick=closeModal;
  document.getElementById('hm-submit').onclick=async function(){
    var title=(document.getElementById('hm-title').value||'').trim();
    var budget=parseFloat(document.getElementById('hm-budget').value)||0;
    var timeline=document.getElementById('hm-timeline').value;
    var desc=(document.getElementById('hm-desc').value||'').trim();
    if(!title||!budget||!desc){toast('Please fill all fields.','bad');return;}
    if(!ME.wallet||(ME.wallet.balance||0)<budget){toast('Insufficient wallet balance. Top up first.','bad');return;}
    var gig={
      id:'g'+Date.now(),title:title,description:desc,pay:budget,
      category:u.category,posterUid:ME.uid,posterName:ME.name,
      applicants:[uid],hiredUid:uid,status:'hired',
      escrowAmount:budget,created:Date.now(),deadline:timeline,
      directHire:true,maxRevisions:1
    };
    await fbSet('gigs',gig.id,gig);
    CACHE.gigs.unshift(gig);
    ME.wallet.balance=Math.max(0,(ME.wallet.balance||0)-budget);
    ME.wallet.pending=(ME.wallet.pending||0)+budget;
    ME.wallet.transactions.unshift({id:'t'+Date.now(),type:'out',amount:budget,from:ME.name,desc:'Direct hire: '+title,ts:Date.now()});
    saveUser(ME);
    pushNotif(uid,'hired','🎉 You Got Hired!',ME.name+' hired you directly for: '+title+' — $'+budget,{type:'gig_hired',gigId:gig.id,clientUid:ME.uid});
    sendAutoMsg(uid,'Hi '+u.name.split(' ')[0]+'! I hired you for: '+title+'. Budget: $'+budget+'. Timeline: '+timeline+'. Open the Gig Workspace to get started.');
    toast('Hire request sent! $'+budget+' locked in escrow.');closeModal();
    renderWallet();
  };
};

// ── REP MILESTONE ─────────────────────────────────────────────
function repMilestoneHTML(rep){
  var milestones=[{pts:0,label:'Beginner'},{pts:100,label:'Rising'},{pts:250,label:'Skilled'},{pts:500,label:'Expert'},{pts:1000,label:'Elite'}];
  var cur=milestones.filter(function(m){return (rep||0)>=m.pts;}).pop()||milestones[0];
  var nxt=milestones.find(function(m){return m.pts>(rep||0);});
  if(!nxt) return '<div class="rep-milestone"><div style="font-size:10px;color:var(--pur);font-weight:700;">Max Level Reached!</div></div>';
  var pct=Math.round(((rep||0)-cur.pts)/(nxt.pts-cur.pts)*100);
  return '<div class="rep-milestone">'
    +'<div style="display:flex;justify-content:space-between;font-size:9px;color:var(--td);">'
    +'<span style="color:var(--pur);font-weight:700;">'+cur.label+'</span>'
    +'<span>'+(rep||0)+' / '+nxt.pts+' to '+nxt.label+'</span></div>'
    +'<div class="rep-bar-bg"><div class="rep-bar-fill" style="width:'+pct+'%;"></div></div>'
    +'<div style="font-size:9px;color:var(--td);">'+(nxt.pts-(rep||0))+' pts to reach '+nxt.label+'</div>'
    +'</div>';
}

// ── WORK HISTORY ──────────────────────────────────────────────
function buildWorkHistory(u){
  var completed=getGigs().filter(function(g){
    return g.status==='completed'&&(g.hiredUid===u.uid||g.posterUid===u.uid);
  });
  if(!completed.length) return '';
  var isClient=u.role==='employer';
  var h='<div class="psec"><div class="psec-t">Work History <span style="font-size:9px;font-weight:400;color:var(--td);">('+completed.length+' completed)</span></div>';
  completed.slice(0,5).forEach(function(g){
    var rating=isClient?g.freelancerRating:g.clientRating;
    var stars=rating?'★'.repeat(rating.stars)+'☆'.repeat(5-rating.stars):'Not rated yet';
    var starsColor=rating?'color:var(--gld);font-size:12px;':'color:var(--td);font-size:10px;';
    var otherUid=isClient?g.hiredUid:g.posterUid;
    var other=getUser(otherUid);
    var isOwn=u.uid===ME.uid;
    var showReHire=isOwn&&isClient&&g.hiredUid&&other;
    h+='<div class="wh-card">'
      +'<div class="wh-title">'+g.title+'</div>'
      +'<div class="wh-meta">'+(other?(isClient?'Freelancer: ':'Client: ')+other.name:'')
      +' &middot; $'+(g.pay||g.escrowAmount||0).toLocaleString()+' &middot; '+timeAgo(g.created)+'</div>'
      +'<div style="'+starsColor+'">'+stars+'</div>'
      +(rating&&rating.comment?'<div style="font-size:11px;color:var(--td);margin-top:4px;font-style:italic;">"'+rating.comment+'"</div>':'')
      +(showReHire?'<div style="margin-top:8px;"><button onclick="openReHire(\''+g.id+'\',\''+g.hiredUid+'\')" style="background:rgba(74,222,128,.08);border:1px solid rgba(74,222,128,.2);color:var(--grn);font-size:10px;font-family:Plus Jakarta Sans,sans-serif;font-weight:700;padding:5px 13px;border-radius:6px;cursor:pointer;">↩ Re-hire '+other.name.split(' ')[0]+'</button></div>':'')
      +'</div>';
  });
  return h+'</div>';
}

// ── IMAGE POST ────────────────────────────────────────────────
var _postImageData=null;
window.handlePostImage=function(input){
  var file=input.files[0];if(!file)return;
  if(file.size>5*1024*1024){toast('Image must be under 5MB','bad');return;}
  var reader=new FileReader();
  reader.onload=function(e){
    var img=new Image();
    img.onload=function(){
      var canvas=document.createElement('canvas');
      var max=1000;var w=img.width,h=img.height;
      if(w>max){h=h*max/w;w=max;}if(h>max){w=w*max/h;h=max;}
      canvas.width=w;canvas.height=h;
      canvas.getContext('2d').drawImage(img,0,0,w,h);
      _postImageData=canvas.toDataURL('image/jpeg',0.75);
      var prev=document.getElementById('post-img-preview');
      if(prev){
        prev.style.display='block';
        prev.innerHTML='<div style="position:relative;margin-bottom:6px;"><img src="'+_postImageData+'" style="width:100%;max-height:260px;object-fit:cover;border-radius:8px 8px 0 0;">'
          +'<button onclick="clearPostImage()" style="position:absolute;top:6px;right:6px;background:rgba(0,0,0,.6);border:none;color:#fff;border-radius:50%;width:24px;height:24px;cursor:pointer;font-size:13px;line-height:1;">&#x2715;</button></div>'
          +'<div style="font-size:10px;color:var(--td);padding:0 4px 4px;">&#x1F4AC; Add a caption in the box above</div>';
      }
    };
    img.src=e.target.result;
  };
  reader.readAsDataURL(file);
};
window.clearPostImage=function(){
  _postImageData=null;
  var prev=document.getElementById('post-img-preview');if(prev){prev.style.display='none';prev.innerHTML='';}
  var inp=document.getElementById('post-img-input');if(inp)inp.value='';
};



// ── ADMIN: VERIFICATION REVIEW ───────────────────────────────
window.loadVerifQueue = async function() {
  var container = document.getElementById('admin-verif-queue');
  if (!container) return;
  container.innerHTML = '<div style="padding:20px;text-align:center;color:var(--td);font-size:12px;">Loading...</div>';
  try {
    var all = await fbGetAll('skillVerifications');
    var pending = all.filter(function(v){return v.status==='pending';}).sort(function(a,b){return (a.ts||0)-(b.ts||0);});
    if (!pending.length) {
      container.innerHTML = '<div style="padding:20px;text-align:center;color:var(--td);font-size:12px;">No pending submissions.</div>';
      return;
    }
    container.innerHTML = '<div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:700;font-size:13px;margin-bottom:12px;">Verification Queue (' + pending.length + ')</div>';
    // Event delegation wired after render
    pending.forEach(function(v) {
      var worksHtml = '';
      (v.works||[]).forEach(function(w, wi) {
        worksHtml += '<div style="margin-bottom:10px;padding:10px;background:var(--s);border-radius:8px;border:1px solid var(--br);">';
        worksHtml += '<div style="font-size:10px;font-weight:600;margin-bottom:6px;">' + (wi+1) + '. ' + (w.description||'Work') + '</div>';
        worksHtml += '<div style="display:flex;gap:8px;flex-wrap:wrap;">';
        if (w.export) worksHtml += '<img src="'+w.export+'" style="width:100px;height:75px;object-fit:cover;border-radius:6px;" alt="Work">';
        if (w.export) worksHtml += '<img src="'+w.export+'" style="width:100px;height:75px;object-fit:cover;border-radius:6px;" alt="Work">';
        if (w.proof && !w.proofIsVideo) worksHtml += '<div style="position:relative;"><img src="'+w.proof+'" style="width:100px;height:75px;object-fit:cover;border-radius:6px;border:2px solid var(--gld);" alt="Proof"><div style="position:absolute;bottom:2px;left:2px;background:var(--gld);color:#000;font-size:7px;font-weight:700;padding:1px 4px;border-radius:3px;">PROOF</div></div>';
        worksHtml += '</div></div>';
      });

      var card = '<div class="adm-vw-card">';
      card += '<div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">';
      var av = v.avatar ? '<img src="'+v.avatar+'" style="width:38px;height:38px;border-radius:50%;object-fit:cover;">' : '<div style="width:38px;height:38px;border-radius:50%;background:linear-gradient(135deg,'+(v.gradient||'#888')+','+(v.gradient||'#888')+'88);display:flex;align-items:center;justify-content:center;font-family:Plus Jakarta Sans,sans-serif;font-weight:700;font-size:13px;color:#000;">'+initials(v.name||'?')+'</div>';
      card += av;
      card += '<div><div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:700;font-size:13px;">' + (v.name||'Unknown') + '</div>';
      card += '<div style="font-size:10px;color:var(--td);">' + (v.category||'') + ' &middot; ' + timeAgo(v.ts) + '</div></div></div>';
      card += worksHtml;
      card += '<div style="display:flex;gap:8px;margin-top:10px;">';
      card += '<button class="btn" style="flex:1;background:var(--grn);color:#000;" data-svid="'+v.id+'" data-uid="'+v.uid+'" data-action="approve">&#x2705; Approve</button>';
      card += '<button class="btn2" style="flex:1;border-color:rgba(239,68,68,.4);color:#ef4444;" data-svid="'+v.id+'" data-uid="'+v.uid+'" data-action="reject">&#x274C; Reject</button>';
      card += '</div></div>';
      container.innerHTML += card;
    });
    // Wire approve/reject buttons via event delegation
    container.addEventListener('click', function(e){
      var btn=e.target.closest('[data-action]');
      if(!btn) return;
      var action=btn.dataset.action;
      var svId=btn.dataset.svid;
      var uid=btn.dataset.uid;
      if(action==='approve') adminVerifDecision(svId,uid,true);
      else if(action==='reject') adminVerifDecision(svId,uid,false);
    });
  } catch(e) {
    container.innerHTML = '<div style="padding:20px;color:#ef4444;font-size:11px;">Error loading queue: ' + e.message + '</div>';
  }
};

window.adminVerifDecision = async function(svId, uid, approved) {
  var reason = '';
  if (!approved) {
    reason = prompt('Rejection reason (shown to user):') || 'Work did not meet verification standards.';
  }
  // Update verification record
  // Fetch existing and merge
  var existing=await fbGet('skillVerifications',svId)||{};
  await fbSet('skillVerifications', svId, Object.assign(existing,{status:approved?'approved':'rejected',decidedAt:Date.now(),reason:reason}));

  // Update user
  var u = getUser(uid);
  if (u) {
    if (approved) {
      u.badgeStatus = 'verified';
      u.verificationStatus = 'approved';
      u.verifBannedUntil = null;
      u.verifDraft = [];
      // Get the works from Firebase and mark as verified portfolio items
      try {
        var sv = await fbGet('skillVerifications', svId);
        if (sv && sv.works) {
          if (!u.portfolio) u.portfolio = [];
          sv.works.forEach(function(w) {
            u.portfolio.unshift({
              id: 'pf_v_' + Date.now() + '_' + w.idx,
              title: w.description || 'Verified Work',
              cat: u.category || 'General',
              image: w.export,
              verified: true,
              ts: Date.now()
            });
          });
        }
      } catch(e) {}
      pushNotif(uid, 'verification_approved', '&#x2B50; Verification Approved!', 'Congratulations! Your work has been verified by SkillStamp. Your verified badge is now live.', {type:'verification_approved'});
      toast(u.name + ' approved ✅');
    } else {
      u.verificationStatus = 'rejected';
      u.verifBannedUntil = Date.now() + (30 * 24 * 60 * 60 * 1000); // 1 month
      u.verifDraft = [];
      pushNotif(uid, 'verification_rejected', '&#x274C; Verification Not Approved', 'Your submission was not approved. Reason: ' + reason + '. You can reapply in 30 days.', {type:'verification_rejected'});
      toast(u.name + ' rejected. 30-day ban applied.');
    }
    await fbSet('users', uid, u);
    if (CACHE.users) {
      var ci = CACHE.users.findIndex(function(x){return x.uid===uid;});
      if (ci>=0) CACHE.users[ci] = u;
    }
    // Reload queue
    setTimeout(loadVerifQueue, 500);
  }
};

// updateHomeStats moved to 07-home.js

// Page history for back navigation
window._pageHistory = [];
window._currentPage = 'home';

window.showPage=function(name, skipHistory){
  if(!skipHistory && window._currentPage && window._currentPage !== name){
    window._pageHistory.push(window._currentPage);
    if(window._pageHistory.length > 20) window._pageHistory.shift();
  }
  window._currentPage = name;
  try{ sessionStorage.setItem('ss_page',name); localStorage.setItem('ss_last_page',name); }catch(e){}
  try { history.pushState({page:name}, '', '#'+name); } catch(e){}
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nt').forEach(b=>b.classList.remove('active'));
  var spPg=document.getElementById('page-'+name);if(spPg)spPg.classList.add('active');
  var spTb=document.getElementById('tab-'+name);if(spTb)spTb.classList.add('active');
  window.scrollTo(0,0);
  if(name==='home'||name==='timeline'){ if(typeof renderRoleHome==='function') renderRoleHome(); }
  if(name==='talent') renderTalent();
  if(name==='gigs'){
    loadGigsToCache().then(function(){
      // Show tabs for freelancers, hide for clients
      var tabBar=document.getElementById('gig-tabs-bar');
      if(tabBar) tabBar.style.display=ME&&ME.role==='freelancer'?'flex':'none';
      // Update applications badge
      if(ME&&ME.role==='freelancer'){
        var apps=ME.applications||[];
        var pending=apps.filter(function(a){return a.status==='pending';}).length;
        var cnt=document.getElementById('myapps-count');
        if(cnt){cnt.textContent=pending;cnt.style.display=pending?'':'none';}
      }
      if(_gigTab==='myapps') renderMyApplications();
      else renderGigs();
    });
  }

  if(name==='myprofile') renderMyProfile();
  if(name==='leaderboard') renderLeaderboard();
  if(name==='dashboard') renderDashboard();
  if(name==='admin'){renderAdminV6();return;}
  if(name==='wallet') renderWallet();
  if(name==='learn'){var lPg=document.getElementById('page-learn');if(lPg)lPg.innerHTML=renderLearnV6();}
  if(name==='centers'){var cPg=document.getElementById('page-centers');if(cPg)cPg.innerHTML=renderCentersV6();}
};

window.addEventListener('popstate', function(e){
  var pg = document.getElementById('page-messages');
  var inConv = pg && !pg.querySelector('#conv-list');
  if(inConv){ backToInbox(); return; }
  var modal = document.getElementById('moverlay');
  if(modal && modal.classList.contains('show')){ closeModal(); return; }
  if(window._pageHistory && window._pageHistory.length > 0){
    var prev = window._pageHistory.pop();
    showPage(prev, true);
  } else {
    showPage('home', true);
  }
});

