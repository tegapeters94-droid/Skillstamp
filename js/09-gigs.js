// SkillStamp — Gigs — render & post

// ══════════════════════════════════════════════
//  GIGS
// ══════════════════════════════════════════════
window.filterGigCat=function(cat,el){activeGigCat=cat;document.querySelectorAll('#gig-cats .cat').forEach(c=>c.classList.remove('active'));el.classList.add('active');renderGigs();};

function renderGigs(){
  var isClient=ME&&ME.role==='employer';
  // Remove My Applications content area if client is viewing
  if(isClient){var ca=document.getElementById('gig-content-area');if(ca)ca.remove();}
  // Add My Gigs tab for clients (only once)
  if(isClient&&!document.getElementById('gtab-bar')){
    var gigsPage=document.getElementById('page-gigs');
    var firstChild=gigsPage?gigsPage.firstElementChild:null;
    if(firstChild){
      var tabBar=document.createElement('div');
      tabBar.id='gtab-bar';
      tabBar.style.cssText='display:flex;gap:8px;padding:0 16px 12px;';
      var b1=document.createElement('button');
      b1.className='bsm';b1.id='gtab-all';b1.textContent='All Gigs';
      b1.onclick=function(){window._gigsMode='all';renderGigs();};
      var b2=document.createElement('button');
      b2.className='bsm';b2.id='gtab-mine';b2.textContent='My Posted Gigs';
      b2.onclick=function(){window._gigsMode='mine';renderGigs();};
      tabBar.appendChild(b1);tabBar.appendChild(b2);
      firstChild.parentNode.insertBefore(tabBar,firstChild);
    }
  }
  var tabAll=document.getElementById('gtab-all');
  var tabMine=document.getElementById('gtab-mine');
  var mode=window._gigsMode||'all';
  if(tabAll) tabAll.style.background=mode!=='mine'?'var(--gld)':'';
  if(tabAll) tabAll.style.color=mode!=='mine'?'#000':'';
  if(tabMine) tabMine.style.background=mode==='mine'?'#4d9fff':'';
  if(tabMine) tabMine.style.color=mode==='mine'?'#000':'';
  var gigs=getGigs();
  if(mode==='mine'&&ME){
    gigs=gigs.filter(function(g){return g.posterUid===ME.uid;});
    document.getElementById('gigs-count').textContent=gigs.length+' posted';
  } else {
    // Only show open gigs in browse view
    gigs=gigs.filter(function(g){return !g.status||g.status==='open';});
    if(activeGigCat!=='All') gigs=gigs.filter(function(g){return g.category===activeGigCat;});
    document.getElementById('gigs-count').textContent=gigs.length+' open';
  }
  // Show/hide Post Gig button based on role
  var pgBtn=document.getElementById('post-gig-btn');
  if(pgBtn) pgBtn.style.display=(ME&&ME.role==='employer')?'':'none';
  var list=document.getElementById('gig-list');
  if(!gigs.length){list.innerHTML='<div class="empty">'+(mode==='mine'?'No gigs posted yet.':'No gigs available.')+'</div>';return;}
  var rows='';
  gigs.filter(function(g){return g.title&&g.title.trim();}).slice(0,40).forEach(function(g,i){
    var statusTag=g.status&&g.status!=='open'?'<span style="font-size:9px;padding:2px 7px;border-radius:10px;background:rgba(77,159,255,.1);color:#4d9fff;border:1px solid rgba(77,159,255,.2);margin-left:5px;">'+g.status+'</span>':'';
    var escrowTag=g.escrowAmount?'<span style="font-size:9px;color:#ffa500;margin-left:4px;">🔒 $'+g.escrowAmount.toLocaleString()+'</span>':'';
    var skills='';
    (g.skills||[]).slice(0,3).forEach(function(s){
      skills+='<span style="display:inline-block;font-size:9px;background:rgba(232,197,71,.07);border:1px solid rgba(232,197,71,.2);color:var(--gld);padding:1px 6px;border-radius:3px;margin:2px;">'+s+'</span>';
    });
    rows+='<div class="gig-item" data-gid="'+g.id+'">';
    rows+='<div class="gig-icon" style="background:'+GIG_COLS[i%GIG_COLS.length]+'">'+GIG_ICONS[i%GIG_ICONS.length]+'</div>';
    rows+='<div style="flex:1;min-width:0;">';
    rows+='<div class="gig-title">'+g.title+statusTag+'</div>';
    rows+='<div style="font-size:10px;color:var(--td);">'+g.posterName+' · '+g.category+' · '+timeAgo(g.created)+'</div>';
    rows+='<div style="margin-top:4px;">'+skills+'</div>';
    if(escrowTag) rows+='<div style="margin-top:2px;">'+escrowTag+'</div>';
    rows+='</div>';
    rows+='<div style="text-align:right;flex-shrink:0;"><div class="gig-pay">'+g.pay+'</div><div style="font-size:9px;color:var(--td);text-transform:uppercase;letter-spacing:.06em;margin-top:2px;">'+g.type+'</div></div>';
    rows+='</div>';
  });
  list.innerHTML=rows;
  // Attach click handlers via event delegation (no inline onclick)
  list.onclick=function(e){
    var item=e.target.closest('[data-gid]');
    if(item) showGigDetail(item.dataset.gid);
  };
}

window.openPostGig=function(){
  if(ME&&ME.role!=='employer'){
    toast('Only clients can post gigs.','bad');
    return;
  }
  var SKILLS=['Python','React','Node.js','Data Science','UI/UX','Solidity','AWS','Flutter','SQL','Machine Learning','Figma','TypeScript','Django','Next.js','Marketing','SEO','Content','Analytics','Go','Rust'];
  var skillChips='';
  SKILLS.forEach(function(s){
    var isOn=(ME.skills||[]).indexOf(s)>=0;
    skillChips+='<span style="padding:3px 9px;background:var(--s2);border:1px solid '+(isOn?'rgba(232,197,71,.5)':'var(--br)')+';border-radius:4px;font-size:10px;color:'+(isOn?'var(--gld)':'var(--td)')+';cursor:pointer;" data-s="'+s+'" class="'+(isOn?'on':'')+'">'+s+'</span>';
  });
  var mh='<button class="mclose" id="pg-close">X</button>';
  mh+='<h3>Post a Gig</h3><p>Find verified SkillStamp talent for your project</p>';
  mh+='<div class="fg"><label class="fl">Title *</label><input class="fi" id="pg-t" placeholder="e.g. Build a Python data pipeline"></div>';
  mh+='<div class="fg"><label class="fl">Description</label><textarea class="fi" id="pg-d" rows="3" placeholder="Describe scope and deliverables..." style="resize:vertical;"></textarea></div>';
  mh+='<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:9px;">';
  mh+='<div class="fg"><label class="fl">Budget *</label><input class="fi" id="pg-pay" placeholder="$1,500"></div>';
  mh+='<div class="fg"><label class="fl">Type</label><select class="fi" id="pg-ty"><option>Contract</option><option>Full-time Remote</option><option>Project</option><option>Part-time</option></select></div>';
  mh+='<div class="fg"><label class="fl">Category</label><select class="fi" id="pg-c"><option>Graphics Design</option><option>UI/UX Design</option><option>Content Writing</option><option>Data Analysis</option><option>Digital Marketing</option><option>Web & Mobile Dev</option></select></div>';
  mh+='</div>';
  mh+='<div class="fg"><label class="fl">Required Skills</label>';
  mh+='<div style="display:flex;flex-wrap:wrap;gap:5px;margin-top:4px;" id="pg-skills">'+skillChips+'</div></div>';
  mh+='<div class="fg"><label class="fl">Deadline (optional)</label><input class="fi" id="pg-deadline" type="date"></div>';
  mh+='<div id="pg-wallet-note" style="padding:9px 12px;background:rgba(232,197,71,.05);border:1px solid rgba(232,197,71,.15);border-radius:7px;font-size:11px;color:var(--td);margin-bottom:12px;"></div>';
  mh+='<button class="btn" id="pg-submit-btn">Post Gig &amp; Lock Escrow</button>';
  setModal(mh);
  document.getElementById('pg-close').onclick=closeModal;
  var walBal=(ME.wallet&&ME.wallet.balance)?ME.wallet.balance.toLocaleString():'0';
  var note=document.getElementById('pg-wallet-note');
  if(note) note.textContent='Wallet balance: $'+walBal+'. Full budget locked in escrow on post.';
  var pgBtn=document.getElementById('pg-submit-btn');
  if(pgBtn) pgBtn.onclick=window.submitGig;
  document.querySelectorAll('#pg-skills span').forEach(function(el){
    el.onclick=function(){
      this.classList.toggle('on');
      this.style.borderColor=this.classList.contains('on')?'rgba(232,197,71,.5)':'var(--br)';
      this.style.color=this.classList.contains('on')?'var(--gld)':'var(--td)';
    };
  });
};


window.submitGig=async function(){
  var title=document.getElementById('pg-t').value.trim();
  var pay=document.getElementById('pg-pay').value.trim();
  var category=document.getElementById('pg-c').value;
  var type=document.getElementById('pg-ty').value;
  var desc=document.getElementById('pg-d').value.trim();
  var deadlineEl=document.getElementById('pg-deadline');
  var deadline=deadlineEl?deadlineEl.value:'';
  var skills=[].slice.call(document.querySelectorAll('#pg-skills [data-s].sel')).map(function(c){return c.dataset.s;});
  if(!title||!pay){toast('Title and budget are required.','bad');return;}
  var payNum=parseFloat((pay||'0').replace(/[^0-9.]/g,''))||0;
  if(!ME.wallet) ME.wallet={balance:0,pending:0,earned:0,transactions:[]};
  if(payNum>0&&ME.wallet.balance<payNum){
    toast('Insufficient balance. Need $'+payNum.toLocaleString()+' — top up your wallet first.','bad');
    closeModal();
    setTimeout(function(){showPage('wallet');openTopUp();},400);
    return;
  }
  if(payNum>0){
    ME.wallet.balance-=payNum;
    ME.wallet.pending=(ME.wallet.pending||0)+payNum;
    ME.wallet.transactions.unshift({id:'escrow_'+Date.now(),type:'out',amount:payNum,from:'Escrow',desc:'Escrow: '+title,ts:Date.now()});
  }
  var gig={
    id:'g'+Date.now(),title:title,pay:pay,payNum:payNum,
    category:category,type:type,description:desc,
    posterUid:ME.uid,posterName:ME.name,
    skills:skills,created:Date.now(),applicants:[],
    status:'open',escrowAmount:payNum,
    deadline:deadline||null,hiredUid:null
  };
  try{
    await fbSet('gigs',gig.id,gig);
    CACHE.gigs.unshift(gig);
    ME.gigsCount=(ME.gigsCount||0)+1;
    saveUser(ME);
    // Notify all freelancers about the new gig
    var allFreelancers=getAllUsers().filter(function(u){return u.role==='freelancer'&&u.uid!==ME.uid;});
    allFreelancers.slice(0,50).forEach(function(u){
      pushNotif(u.uid,'gig_posted','💼 New Gig Available',ME.name+' posted: '+title+' — '+pay,{type:'gig_posted',gigId:gig.id});
    });
    var allFreelancers=getAllUsers().filter(function(u){return u.role==='freelancer'&&u.uid!==ME.uid;});
    allFreelancers.slice(0,50).forEach(function(u){
      pushNotif(u.uid,'gig_posted','💼 New Gig Available',ME.name+' posted: '+title+' — '+pay,{type:'gig_posted',gigId:gig.id});
    });
    closeModal();
    toast('Gig posted! $'+payNum.toLocaleString()+' locked in escrow.');
    showPage('gigs');
  }catch(e){
    if(payNum>0){ME.wallet.balance+=payNum;ME.wallet.pending-=payNum;saveUser(ME);}
    toast('Failed to post gig. Try again.','bad');
  }
};

window.showGigDetail=function(gid){
  var g=getGigs().find(function(x){return x.id===gid;});
  if(!g)return;
  var payNum=parseFloat((g.pay||'0').replace(/[^0-9.]/g,''))||0;
  var fee=Math.round(payNum*0.10);
  var payout=payNum-fee;
  var isOwn=g.posterUid===ME.uid;
  var alreadyApplied=(g.applicants||[]).indexOf(ME.uid)>=0;
  var isHired=g.hiredUid===ME.uid;

  // Build modal HTML using variable concatenation — no inline onclick
  var mh='<button class="mclose" id="gd-close">✕</button>';
  mh+='<div style="font-size:22px;margin-bottom:8px;">'+(CAT_ICONS[g.category]||'💼')+'</div>';
  mh+='<h3>'+g.title+'</h3>';
  mh+='<p>'+g.posterName+' · '+g.category+' · '+g.type+' · '+timeAgo(g.created)+'</p>';
  if(g.description) mh+='<div style="font-size:11px;color:var(--td);line-height:1.75;margin-bottom:13px;padding:12px;background:var(--s2);border-radius:6px;">'+g.description+'</div>';
  var skillTags='';
  (g.skills||[]).forEach(function(s){skillTags+='<span style="display:inline-block;font-size:9px;background:rgba(232,197,71,.07);border:1px solid rgba(232,197,71,.2);color:var(--gld);padding:2px 8px;border-radius:3px;margin:2px;">'+s+'</span>';});
  if(skillTags) mh+='<div style="margin-bottom:14px;">'+skillTags+'</div>';
  // Escrow breakdown
  mh+='<div class="escrow">';
  mh+='<div style="font-size:11px;font-weight:600;margin-bottom:9px;">💰 Escrow Breakdown</div>';
  mh+='<div class="erow"><span style="color:var(--td);">Contract Value</span><span>'+g.pay+'</span></div>';
  mh+='<div class="erow"><span style="color:var(--td);">SkillStamp Fee (10%)</span><span style="color:var(--acc);">-$'+fee+'</span></div>';
  mh+='<div class="erow" style="border-top:1px solid var(--br);padding-top:6px;margin-top:4px;font-weight:700;"><span>Freelancer Receives</span><span style="color:var(--grn);">$'+payout+'</span></div>';
  mh+='</div>';
  // Action buttons — using ids, wired after render
  mh+='<div id="gd-actions" style="margin-top:14px;"></div>';
  setModal(mh);

  // Wire close
  var cl=document.getElementById('gd-close');
  if(cl) cl.onclick=closeModal;

  // Wire actions based on role
  var acts=document.getElementById('gd-actions');
  if(!acts)return;

  if(isOwn){
    // Client view
    var status=g.status||'open';
    var statusColor={open:'#4ade80',hired:'#4d9fff',completed:'var(--gld)',disputed:'#ef4444',cancelled:'var(--td)'}[status]||'var(--td)';
    acts.innerHTML='<div style="margin-bottom:10px;"><span style="font-size:10px;padding:3px 10px;border-radius:20px;background:rgba(255,255,255,.06);color:'+statusColor+';">'+status+'</span>'+(g.escrowAmount?'<span style="font-size:10px;color:#ffa500;margin-left:8px;">🔒 $'+g.escrowAmount.toLocaleString()+' in escrow</span>':'')+'</div>';
    if(status==='open'){
      var hBtn=document.createElement('button');
      hBtn.className='btn';hBtn.style.cssText='width:100%;margin-bottom:8px;';
      hBtn.textContent='👤 Review Applicants ('+(g.applicants||[]).length+')';
      hBtn.onclick=function(){openHireModal(gid);};
      acts.appendChild(hBtn);
    }
    if(status==='hired'){
      var wsBtn2=document.createElement('button');
      wsBtn2.className='btn';wsBtn2.style.cssText='width:100%;margin-bottom:8px;';
      wsBtn2.textContent='\uD83D\uDCBC Open Gig Workspace';
      wsBtn2.onclick=function(){openGigWorkspace(gid);};
      acts.appendChild(wsBtn2);
      var cBtn=document.createElement('button');
      cBtn.className='btn2';cBtn.style.cssText='width:100%;margin-bottom:8px;';
      cBtn.textContent='\u2705 Mark Complete & Release Payment';
      cBtn.onclick=function(){openCompleteGig(gid);};
      acts.appendChild(cBtn);
      var dBtn=document.createElement('button');
      dBtn.className='btn2';dBtn.style.cssText='width:100%;margin-bottom:8px;border-color:rgba(239,68,68,.4);color:#ef4444;';
      dBtn.textContent='⚠️ Raise Dispute';
      dBtn.onclick=function(){openDispute(gid);};
      acts.appendChild(dBtn);
    }
    var delBtn=document.createElement('button');
    delBtn.className='btn2';delBtn.style.cssText='width:100%;font-size:11px;';
    delBtn.textContent='Delete Gig';
    delBtn.onclick=function(){deleteGig(gid);};
    acts.appendChild(delBtn);
  } else {
    // Freelancer view
    if(isHired&&g.status==='hired'){
      var wsBtn=document.createElement('button');
      wsBtn.className='btn';wsBtn.style.cssText='width:100%;margin-bottom:8px;';
      wsBtn.textContent='\uD83D\uDCBC Open Gig Workspace';
      wsBtn.onclick=function(){openGigWorkspace(gid);};
      acts.appendChild(wsBtn);
      var fdBtn=document.createElement('button');
      fdBtn.className='btn2';fdBtn.style.cssText='width:100%;border-color:rgba(239,68,68,.4);color:#ef4444;';
      fdBtn.textContent='\u26A0\uFE0F Raise Dispute';
      fdBtn.onclick=function(){openDispute(gid);};
      acts.appendChild(fdBtn);
    } else if(g.status!=='open'){
      acts.innerHTML='<div style="font-size:11px;color:var(--td);text-align:center;padding:12px;">This gig is no longer accepting applications.</div>';
    } else if(alreadyApplied){
      acts.innerHTML='<div style="background:rgba(74,222,128,.06);border:1px solid rgba(74,222,128,.2);border-radius:8px;padding:12px;font-size:11px;color:var(--grn);text-align:center;">✓ Applied — waiting for client to review.</div>';
    } else {
      var apBtn=document.createElement('button');
      apBtn.className='btn';apBtn.style.cssText='width:100%;';
      apBtn.textContent='Apply with SkillID →';
      apBtn.onclick=function(){applyGig(gid,g.title,g.posterUid);};
      acts.appendChild(apBtn);
    }
  }
};

// ── PROPOSAL HELPERS ────────────────────────────────────────
function getProposalTracker(){
  var currentMonth=new Date().toISOString().slice(0,7);
  var tracker=ME.proposalTracker||{count:0,month:currentMonth};
  if(tracker.month!==currentMonth) tracker={count:0,month:currentMonth};
  return tracker;
}
function saveProposalTracker(tracker){ME.proposalTracker=tracker;saveUser(ME);}
function getProposalCredits(){return ME.proposalCredits||0;}

window.purchaseProposalPack=async function(count,price){
  if(!ME.wallet||(ME.wallet.balance||0)<price){toast('Insufficient wallet balance. Top up first.','bad');closeModal();showPage('wallet');return;}
  ME.wallet.balance=(ME.wallet.balance||0)-price;
  ME.wallet.transactions.unshift({id:'pp_'+Date.now(),type:'out',amount:price,from:'SkillStamp',desc:count+' Proposal Credits',ts:Date.now()});
  ME.proposalCredits=(ME.proposalCredits||0)+count;
  await saveUser(ME);
  closeModal();toast('✓ '+count+' proposal credits added!');
};
function openProposalCredits(){
  setModal('<button class="mclose" onclick="closeModal()">✕</button>'
    +'<div style="text-align:center;padding:8px 0 14px;">'
    +'<div style="font-size:40px;margin-bottom:12px;">📦</div>'
    +'<div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:800;font-size:16px;margin-bottom:6px;">Proposal Credits</div>'
    +'<p style="font-size:12px;color:var(--td);line-height:1.7;margin-bottom:18px;">You\'ve used all your free proposals this month. Buy a credit pack to keep applying, or get verified for unlimited proposals.</p>'
    +'</div>'
    +'<div style="display:grid;gap:10px;margin-bottom:14px;">'
    +'<div style="background:var(--s2);border:1px solid var(--br);border-radius:10px;padding:14px;cursor:pointer;" onclick="purchaseProposalPack(5,3)">'
    +'<div style="display:flex;justify-content:space-between;align-items:center;">'
    +'<div><div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:700;font-size:13px;">Starter Pack</div><div style="font-size:11px;color:var(--td);">5 extra proposals</div></div>'
    +'<div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:800;font-size:15px;color:var(--gld);">$3</div>'
    +'</div></div>'
    +'<div style="background:var(--s2);border:2px solid var(--gld);border-radius:10px;padding:14px;cursor:pointer;position:relative;" onclick="purchaseProposalPack(15,8)">'
    +'<div style="position:absolute;top:-8px;right:12px;background:var(--gld);color:#000;font-size:8px;font-weight:800;padding:2px 8px;border-radius:8px;font-family:Plus Jakarta Sans,sans-serif;">BEST VALUE</div>'
    +'<div style="display:flex;justify-content:space-between;align-items:center;">'
    +'<div><div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:700;font-size:13px;">Pro Pack</div><div style="font-size:11px;color:var(--td);">15 extra proposals</div></div>'
    +'<div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:800;font-size:15px;color:var(--gld);">$8</div>'
    +'</div></div>'
    +'</div>'
    +'<button class="btn2" onclick="closeModal();openSubmitSkill();" style="width:100%;margin-bottom:8px;">⚡ Get Verified Instead (Unlimited)</button>'
    +'<div style="font-size:10px;color:var(--td);text-align:center;">Deducted from your wallet balance</div>');
}

window.applyGig=async function(gid,title,posterUid){
  if(!checkRateLimit('apply_gig',5,60000)) return;
  var isVerified=ME.badgeStatus==='verified'||ME.badgeStatus==='expert'||ME.badgeStatus==='elite';
  var tracker=getProposalTracker();
  var credits=getProposalCredits();
  var FREE_LIMIT=3;
  var gig=getGigs().find(function(g){return g.id===gid;});
  if(gig&&(gig.applicants||[]).indexOf(ME.uid)>=0){toast('You have already applied to this gig.','bad');return;}
  if(!isVerified&&tracker.count>=FREE_LIMIT&&credits<=0){openProposalCredits();return;}

  var portfolio=ME.portfolio||[];
  var pfOpts=portfolio.map(function(p){return '<option value="'+p.id+'">'+p.title+'</option>';}).join('');
  var pfSection=portfolio.length?'<div class="fg"><label class="fl">Portfolio Item <span style="font-size:9px;color:var(--td);">(optional)</span></label><select class="fi" id="ap-portfolio"><option value="">— None selected —</option>'+pfOpts+'</select></div>':'';
  var isOpenBudget=!gig||!gig.pay||gig.pay==='Open'||gig.pay===0;
  var rateSection=isOpenBudget?'<div class="fg"><label class="fl">Your Proposed Rate ($)</label><input class="fi" id="ap-rate" type="number" placeholder="e.g. 500" min="1"></div>':'';
  var remaining=isVerified?null:(FREE_LIMIT-tracker.count+credits);
  var proposalNotice=!isVerified?('<div style="background:rgba(255,107,53,.06);border:1px solid rgba(255,107,53,.2);border-radius:8px;padding:10px 12px;margin-bottom:14px;">'
    +'<div style="display:flex;justify-content:space-between;align-items:center;font-size:11px;">'
    +'<span style="color:var(--acc);font-weight:700;">📋 Proposals Used</span>'
    +'<span style="color:var(--acc);font-weight:700;">'+tracker.count+'/'+FREE_LIMIT+' this month'+(credits>0?' · '+credits+' credits':'')+'</span>'
    +'</div><div style="font-size:10px;color:var(--td);margin-top:3px;">Get verified for unlimited proposals + lower platform fees.</div>'
    +'</div>'):'';

  var mh='<button class="mclose" onclick="closeModal()">✕</button>';
  mh+='<h3>📋 Submit Proposal</h3>';
  mh+='<p style="font-size:11px;color:var(--td);margin-bottom:16px;">Applying for: <strong style="color:var(--tx);">'+title+'</strong></p>';
  mh+=proposalNotice;
  mh+='<div class="fg"><label class="fl">Cover Note <span style="font-size:9px;color:var(--acc);">*required · min 50 chars</span></label>';
  mh+='<textarea class="fi" id="ap-cover" rows="5" placeholder="Introduce yourself and explain why you\'re the best fit. Be specific about your experience and how you\'ll approach this project..." style="resize:vertical;"></textarea>';
  mh+='<div style="font-size:9px;color:var(--td);margin-top:4px;" id="ap-cover-counter">0 characters — minimum 50 required</div></div>';
  mh+=pfSection;
  mh+='<div class="fg"><label class="fl">Proposed Timeline</label><select class="fi" id="ap-timeline"><option value="3 days">3 days</option><option value="1 week" selected>1 week</option><option value="2 weeks">2 weeks</option><option value="1 month">1 month</option><option value="2+ months">2+ months</option></select></div>';
  mh+=rateSection;
  mh+='<button class="btn" id="ap-submit-btn" style="width:100%;">Submit Proposal →</button>';
  setModal(mh);

  setTimeout(function(){
    var coverEl=document.getElementById('ap-cover');
    var counterEl=document.getElementById('ap-cover-counter');
    if(coverEl&&counterEl){
      coverEl.addEventListener('input',function(){
        var len=coverEl.value.length;
        counterEl.style.color=len>=50?'var(--grn)':'var(--acc)';
        counterEl.textContent=len+' characters'+(len<50?' — '+Math.max(0,50-len)+' more needed':' ✓');
      });
    }
    var submitBtn=document.getElementById('ap-submit-btn');
    if(submitBtn) submitBtn.onclick=async function(){
      var cover=(document.getElementById('ap-cover').value||'').trim();
      var timeline=document.getElementById('ap-timeline').value;
      var pfId=document.getElementById('ap-portfolio')?document.getElementById('ap-portfolio').value:'';
      var rate=document.getElementById('ap-rate')?parseFloat(document.getElementById('ap-rate').value)||null:null;
      if(cover.length<50){toast('Cover note must be at least 50 characters.','bad');return;}
      submitBtn.disabled=true;submitBtn.textContent='Submitting...';

      // Deduct proposal for unverified users
      if(!isVerified){
        if(tracker.count<FREE_LIMIT){tracker.count++;saveProposalTracker(tracker);}
        else if(credits>0){ME.proposalCredits=credits-1;await saveUser(ME);}
      }
      // Save to user applications
      if(!ME.applications) ME.applications=[];
      var alreadySaved=ME.applications.find(function(a){return a.gigId===gid;});
      if(!alreadySaved){
        ME.applications.push({gigId:gid,title:title,posterUid:posterUid,status:'pending',appliedAt:Date.now(),cover:cover,timeline:timeline,rate:rate,pfId:pfId});
      }
      saveUser(ME);
      // Update gig
      var currentGig=getGigs().find(function(g){return g.id===gid;});
      if(currentGig){
        if(!currentGig.applicants) currentGig.applicants=[];
        currentGig.applicants.push(ME.uid);
        if(!currentGig.proposals) currentGig.proposals={};
        currentGig.proposals[ME.uid]={cover:cover,timeline:timeline,rate:rate,pfId:pfId,submittedAt:Date.now()};
        await fbSet('gigs',currentGig.id,currentGig);
      }
      // Message client
      var appMsg='👋 Hi! I\'d like to apply for: '+title+'\n\n'+cover;
      if(timeline) appMsg+='\n\n📅 Proposed timeline: '+timeline;
      if(rate) appMsg+='\n💰 Proposed rate: $'+rate;
      appMsg+='\n\n🏷 SkillID: '+(ME.skillId||'Pending Verification')+' · '+(isVerified?'✓ Verified':'Unverified');
      sendAutoMsg(posterUid,appMsg);
      pushNotif(posterUid,'gig_application','💼 New Proposal',ME.name+' submitted a proposal for: '+title+'. Tap to review.',{type:'gig_application',gigId:gid,applicantUid:ME.uid});

      closeModal();
      var leftover=isVerified?null:(FREE_LIMIT-tracker.count+(ME.proposalCredits||0));
      var mhtml='<div class="sick">&#10003;</div>';
      mhtml+='<h3>Proposal Submitted!</h3>';
      mhtml+='<p>Your cover note and details have been sent to the client.</p>';
      if(!isVerified) mhtml+='<div style="background:rgba(255,107,53,.06);border:1px solid rgba(255,107,53,.2);border-radius:8px;padding:10px;font-size:11px;color:var(--acc);margin:10px 0;"><strong>'+(leftover>0?leftover:'0')+' proposals</strong> left this month. <span onclick="closeModal();openSubmitSkill();" style="color:var(--gld);cursor:pointer;text-decoration:underline;">Get verified</span> for unlimited.</div>';
      mhtml+='<div style="background:rgba(74,222,128,.06);border:1px solid rgba(74,222,128,.15);border-radius:8px;padding:10px;font-size:11px;color:var(--td);margin:10px 0;">Track this in <strong>Gigs → My Applications</strong></div>';
      mhtml+='<button class="btn" style="margin-top:14px;" onclick="closeModal();showPage(\'gigs\');switchGigTab(\'myapps\');">View My Applications →</button>';
      setModal(mhtml);
    };
  },80);
};

window.msgUser=function(el){openMsg(el.dataset.uid);};
window.endorseUser=function(el){openEndorse(el.dataset.uid);};
window.goWallet=function(){showPage('wallet');};
window.goTimeline=function(){showPage('timeline');};
window.deleteGig=function(gid){
  if(!confirm('Delete this gig?'))return;
  (async()=>{
  await fbDelete('gigs', gid);
  CACHE.gigs=CACHE.gigs.filter(g=>g.id!==gid);
  closeModal(); toast('Gig deleted.');
  renderGigs();
})();
};

