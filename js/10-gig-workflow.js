// SkillStamp — Gig Workflow — Hire, Complete, Dispute, Rate

// ══════════════════════════════════════════════
//  GIG WORKFLOW: HIRE / COMPLETE / DISPUTE / RATE
// ══════════════════════════════════════════════

window.openHireModal=async function(gid){
  var gig=getGigs().find(function(g){return g.id===gid;});
  if(!gig){toast('Gig not found.','bad');return;}
  var applicants=gig.applicants||[];
  if(!applicants.length){toast('No applicants yet.','bad');return;}
  var freshUsers=await fbGetAll('users');
  if(freshUsers&&freshUsers.length) CACHE.users=freshUsers;
  var mh='<button class="mclose" id="hire-close">✕</button>';
  mh+='<h3>👤 Hire a Freelancer</h3>';
  mh+='<p style="font-size:11px;color:var(--td);margin-bottom:12px;">Select who to hire for: '+gig.title+'</p>';
  mh+='<div id="hire-list"></div>';
  if(gig.escrowAmount) mh+='<div style="background:rgba(255,165,0,.06);border:1px solid rgba(255,165,0,.18);border-radius:7px;padding:10px 12px;margin:12px 0;font-size:11px;color:#ffa500;">🔒 $'+gig.escrowAmount.toLocaleString()+' held in escrow — released when you mark complete.</div>';
  mh+='<button class="btn" id="hire-confirm-btn" style="width:100%;">Hire & Notify →</button>';
  setModal(mh);
  document.getElementById('hire-close').onclick=closeModal;
  var hList=document.getElementById('hire-list');
  var rows='';
  applicants.forEach(function(uid){
    var u=getUser(uid)||{name:'User',skillId:uid,gradient:'#888'};
    rows+='<label style="display:flex;align-items:center;gap:10px;padding:10px;background:var(--s2);border:1px solid var(--br);border-radius:7px;margin-bottom:7px;cursor:pointer;">';
    rows+=avHTML(u,34,'50%');
    rows+='<div style="flex:1;"><div style="font-size:12px;font-weight:600;">'+u.name+'</div>';
    rows+='<div style="font-size:10px;color:var(--td);">'+u.skillId+'</div></div>';
    rows+='<input type="radio" name="hire-pick" value="'+uid+'"></label>';
  });
  hList.innerHTML=rows;
  document.getElementById('hire-confirm-btn').onclick=function(){confirmHire(gid);};
};

window.confirmHire=async function(gid){
  var picked=document.querySelector('input[name="hire-pick"]:checked');
  if(!picked){toast('Select a freelancer first.','bad');return;}
  var hiredUid=picked.value;
  var gig=getGigs().find(function(g){return g.id===gid;});
  // Update hired user's application status
  var hiredU=getUser(hiredUid);
  if(hiredU){
    if(!hiredU.applications) hiredU.applications=[];
    hiredU.applications.forEach(function(a){if(a.gigId===gid) a.status='accepted';});
    fbSet('users',hiredUid,hiredU);
  }
  // Mark other applicants as rejected
  (gig?gig.applicants||[]:[]).forEach(function(uid){
    if(uid===hiredUid) return;
    var u=getUser(uid);
    if(u&&u.applications){
      u.applications.forEach(function(a){if(a.gigId===gid&&a.status==='pending') a.status='rejected';});
      fbSet('users',uid,u);
    }
  });
  if(!gig)return;
  var hiredUser=getUser(hiredUid)||{name:'Freelancer'};
  gig.status='hired';gig.hiredUid=hiredUid;gig.hiredAt=Date.now();
  await fbSet('gigs',gig.id,gig);
  var idx=CACHE.gigs.findIndex(function(g){return g.id===gid;});
  if(idx>=0) CACHE.gigs[idx]=gig;
  var notifMsg='Congratulations '+hiredUser.name+'! You have been hired for: '+gig.title+'. Budget: '+gig.pay+'. Deliver your work and the client will release payment through escrow.';
  sendAutoMsg(hiredUid,notifMsg);
  // Push notification to freelancer
  pushNotif(hiredUid,'hired','🎉 You Got Hired!','You have been hired for: '+gig.title+' — $'+gig.pay+'. Tap to open chat with client.',{type:'gig_hired',gigId:gid,clientUid:ME.uid});
  closeModal();
  toast(hiredUser.name+' hired! Opening chat...');
  // Take client directly to freelancer DM

};

window.openCompleteGig=function(gid){
  var gig=getGigs().find(function(g){return g.id===gid;});
  if(!gig)return;
  var freelancer=getUser(gig.hiredUid)||{name:'Freelancer'};
  var payNum=gig.escrowAmount||gig.payNum||0;
  var fee=Math.round(payNum*0.10);
  var payout=payNum-fee;
  var mh='<button class="mclose" id="comp-close">✕</button>';
  mh+='<h3>✅ Release Payment</h3>';
  mh+='<p>Confirm you are satisfied with the work delivered by '+freelancer.name+'.</p>';
  mh+='<div style="background:var(--s2);border:1px solid var(--br);border-radius:8px;padding:14px;margin-bottom:14px;">';
  mh+='<div style="display:flex;justify-content:space-between;font-size:12px;padding:5px 0;"><span style="color:var(--td);">Escrow Amount</span><span>$'+payNum.toLocaleString()+'</span></div>';
  mh+='<div style="display:flex;justify-content:space-between;font-size:12px;padding:5px 0;"><span style="color:var(--td);">SkillStamp Fee (10%)</span><span style="color:var(--acc);">-$'+fee.toLocaleString()+'</span></div>';
  mh+='<div style="display:flex;justify-content:space-between;font-size:13px;font-weight:700;border-top:1px solid var(--br);margin-top:6px;padding-top:8px;"><span>'+freelancer.name+' Receives</span><span style="color:var(--grn);">$'+payout.toLocaleString()+'</span></div>';
  mh+='</div>';
  mh+='<button class="btn" id="comp-confirm-btn" style="width:100%;">Release Payment →</button>';
  setModal(mh);
  document.getElementById('comp-close').onclick=closeModal;
  document.getElementById('comp-confirm-btn').onclick=function(){confirmComplete(gid);};
};

window.confirmComplete=async function(gid){
  var gig=getGigs().find(function(g){return g.id===gid;});
  if(!gig)return;
  var freelancer=getUser(gig.hiredUid);
  if(!freelancer){toast('Freelancer not found.','bad');return;}
  var payNum=gig.escrowAmount||0;
  var fee=Math.round(payNum*0.10);
  var payout=payNum-fee;
  // Disable button and show loading state immediately
  var btn=document.getElementById('comp-confirm-btn');
  if(btn){btn.disabled=true;btn.textContent='Processing…';}
  try{
    gig.status='completed';gig.completedAt=Date.now();
    await fbSet('gigs',gig.id,gig);
    var cidx=CACHE.gigs.findIndex(function(g){return g.id===gig.id;});
    if(cidx>=0) CACHE.gigs[cidx]=gig;
    if(!freelancer.wallet) freelancer.wallet={balance:0,pending:0,earned:0,transactions:[]};
    freelancer.wallet.balance+=payout;
    freelancer.wallet.earned=(freelancer.wallet.earned||0)+payout;
    freelancer.wallet.transactions.unshift({id:'pay_'+Date.now(),type:'in',amount:payout,from:ME.name,desc:'Payment: '+gig.title,ts:Date.now()});
    freelancer.repPoints=(freelancer.repPoints||0)+20;
    freelancer.gigsCount=(freelancer.gigsCount||0)+1;
    await fbSet('users',freelancer.uid,freelancer);
    ME.wallet.pending=Math.max(0,(ME.wallet.pending||0)-payNum);
    ME.wallet.transactions.unshift({id:'rel_'+Date.now(),type:'out',amount:payout,from:freelancer.name,desc:'Released: '+gig.title,ts:Date.now()});
    ME.repPoints=(ME.repPoints||0)+10;
    saveUser(ME);
    sendAutoMsg(gig.hiredUid,'Payment of $'+payout.toLocaleString()+' added to your wallet for: '+gig.title+'. Great work!');
    pushNotif(gig.hiredUid,'payment','💰 Payment Received','$'+payout.toLocaleString()+' has been added to your wallet for: '+gig.title,{type:'payment',gigId:gig.id});
    pushNotif(ME.uid,'payment','✅ Payment Released','You released $'+payout.toLocaleString()+' to '+freelancer.name+' for: '+gig.title,{type:'payment',gigId:gig.id});
    renderWallet();
    // Show success confirmation modal immediately
    setModal('<div style="text-align:center;padding:10px 0 6px;">'
      +'<div style="font-size:52px;margin-bottom:12px;">✅</div>'
      +'<div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:800;font-size:18px;margin-bottom:6px;">Payment Released!</div>'
      +'<div style="font-size:12px;color:var(--td);margin-bottom:16px;line-height:1.7;">'
      +'<strong style="color:var(--grn);">$'+payout.toLocaleString()+'</strong> has been sent to '+freelancer.name+'\'s wallet.<br>'
      +'The gig is now marked complete.</div>'
      +'<div style="background:var(--s2);border:1px solid var(--br);border-radius:8px;padding:12px;margin-bottom:16px;font-size:11px;">'
      +'<div style="display:flex;justify-content:space-between;padding:3px 0;"><span style="color:var(--td);">Escrow Released</span><span>$'+payNum.toLocaleString()+'</span></div>'
      +'<div style="display:flex;justify-content:space-between;padding:3px 0;"><span style="color:var(--td);">SkillStamp Fee (10%)</span><span style="color:var(--acc);">-$'+fee.toLocaleString()+'</span></div>'
      +'<div style="display:flex;justify-content:space-between;padding:6px 0 3px;border-top:1px solid var(--br);font-weight:700;"><span>'+freelancer.name+' Received</span><span style="color:var(--grn);">$'+payout.toLocaleString()+'</span></div>'
      +'</div>'
      +'<button class="btn" onclick="closeModal();" style="width:100%;">Done</button>'
      +'</div>');
    // Trigger rating prompt after user closes success modal
    setTimeout(function(){openRatingPrompt(gig.id,true);},3000);
  } catch(err){
    console.error('Payment release failed',err);
    if(btn){btn.disabled=false;btn.textContent='Release Payment →';}
    toast('Payment failed. Please try again.','bad');
  }
};

window.openDispute=function(gid){
  var mh='<button class="mclose" id="disp-close">✕</button>';
  mh+='<h3>⚠️ Raise a Dispute</h3>';
  mh+='<p style="font-size:11px;color:var(--td);">Funds remain locked in escrow until our team resolves this within 24 hours.</p>';
  mh+='<div class="fg"><label class="fl">Reason</label><select class="fi" id="d-reason" style="width:100%;">';
  mh+='<option>Work not delivered</option><option>Work quality below standard</option>';
  mh+='<option>Freelancer unresponsive</option><option>Payment not released for completed work</option><option>Other</option>';
  mh+='</select></div>';
  mh+='<div class="fg"><label class="fl">Details</label><textarea class="fi" id="d-detail" rows="3" placeholder="Describe the issue clearly..." style="resize:none;width:100%;"></textarea></div>';
  mh+='<button class="btn" id="disp-submit-btn" style="width:100%;">Submit Dispute →</button>';
  setModal(mh);
  document.getElementById('disp-close').onclick=closeModal;
  document.getElementById('disp-submit-btn').onclick=function(){submitDispute(gid);};
};

window.submitDispute=async function(gid){
  var reason=document.getElementById('d-reason').value;
  var detail=(document.getElementById('d-detail').value||'').trim();
  if(!detail){toast('Please describe the issue.','bad');return;}
  var gig=getGigs().find(function(g){return g.id===gid;});
  if(gig){
    gig.status='disputed';
    await fbSet('gigs',gig.id,gig);
    var di=CACHE.gigs.findIndex(function(g){return g.id===gid;});
    if(di>=0) CACHE.gigs[di]=gig;
  }
  await fbSet('disputes','d_'+Date.now(),{gigId:gid,raisedBy:ME.uid,raisedByName:ME.name,reason:reason,detail:detail,status:'pending',ts:Date.now()});
  // Notify both parties
  var disputeGig=getGigs().find(function(g){return g.id===gid;});
  if(disputeGig){
    var otherUid=ME.uid===disputeGig.posterUid?disputeGig.hiredUid:disputeGig.posterUid;
    pushNotif(otherUid,'dispute_raised','⚠️ Dispute Raised',ME.name+' has raised a dispute on: '+disputeGig.title+'. Funds are frozen pending admin review.',{type:'dispute_raised',gigId:gid});
    pushNotif(ME.uid,'dispute_raised','⚠️ Dispute Submitted','Your dispute on: '+disputeGig.title+' has been submitted. Admin will review within 24 hours.',{type:'dispute_raised',gigId:gid});
  }
  closeModal();
  toast('Dispute raised. Admin will review within 24 hours.','bad');
  renderGigs();
};

window.openRateUser=function(uid,name){
  var mh='<button class="mclose" id="rate-close">✕</button>';
  mh+='<h3>⭐ Rate '+name+'</h3>';
  mh+='<p style="font-size:11px;color:var(--td);">How was your experience working together?</p>';
  mh+='<div class="fg"><label class="fl">Rating</label><div style="display:flex;gap:14px;margin-top:6px;flex-wrap:wrap;">';
  [5,4,3,2,1].forEach(function(n){
    mh+='<label style="display:flex;align-items:center;gap:4px;cursor:pointer;font-size:13px;"><input type="radio" name="rstar" value="'+n+'"'+(n===5?' checked':'')+'>'+n+'★</label>';
  });
  mh+='</div></div>';
  mh+='<div class="fg"><label class="fl">Comment</label><textarea class="fi" id="r-comment" rows="2" placeholder="Share your experience..." style="resize:none;width:100%;"></textarea></div>';
  mh+='<button class="btn" id="rate-submit-btn" style="width:100%;">Submit Rating →</button>';
  setModal(mh);
  document.getElementById('rate-close').onclick=closeModal;
  document.getElementById('rate-submit-btn').onclick=function(){submitRating(uid);};
};

window.submitRating=async function(uid){
  var stars=parseInt((document.querySelector('input[name="rstar"]:checked')||{value:'5'}).value);
  var comment=(document.getElementById('r-comment').value||'Good work!').trim();
  var e={id:'e'+Date.now(),fromUid:ME.uid,fromName:ME.name,fromGrad:ME.gradient,toUid:uid,skill:'Gig Completion',comment:comment,stars:stars,ts:Date.now()};
  await fbSet('endorsements',e.id,e);
  CACHE.endorsements.push(e);
  var target=CACHE.users.find(function(u){return u.uid===uid;});
  if(target){target.repPoints=(target.repPoints||0)+(stars*5);saveUser(target);}
  closeModal();toast('Rating submitted! ⭐');
};

window.openSubmitVerify=function(){
  var skillOpts=(ME.skills&&ME.skills.length?ME.skills:['General']).map(function(s){return '<option>'+s+'</option>';}).join('');
  var mh='<button class="mclose" id="sv-close">✕</button>';
  mh+='<h3>✅ Get Verified</h3>';
  mh+='<p style="font-size:11px;color:var(--td);margin-bottom:12px;">Submit proof of your skills. Our team reviews within 48 hours.</p>';
  mh+='<div class="fg"><label class="fl">Skill to Verify</label><select class="fi" id="sv-skill" style="width:100%;">'+skillOpts+'</select></div>';
  mh+='<div class="fg"><label class="fl">Proof Type</label><select class="fi" id="sv-type" style="width:100%;"><option>Portfolio Link</option><option>GitHub</option><option>LinkedIn</option><option>Certificate URL</option><option>Live Project URL</option></select></div>';
  mh+='<div class="fg"><label class="fl">Link / URL</label><input class="fi" id="sv-link" placeholder="https://..." style="width:100%;"></div>';
  mh+='<div class="fg"><label class="fl">Notes</label><textarea class="fi" id="sv-note" rows="2" placeholder="Brief description..." style="resize:none;width:100%;"></textarea></div>';
  mh+='<button class="btn" id="sv-submit-btn" style="width:100%;">Submit for Review →</button>';
  setModal(mh);
  document.getElementById('sv-close').onclick=closeModal;
  document.getElementById('sv-submit-btn').onclick=submitVerifyRequest;
};

window.submitVerifyRequest=async function(){
  var skill=document.getElementById('sv-skill').value;
  var proofType=document.getElementById('sv-type').value;
  var proofLink=(document.getElementById('sv-link').value||'').trim();
  var description=(document.getElementById('sv-note').value||'').trim();
  if(!proofLink){toast('Please provide a link or URL.','bad');return;}
  await fbSet('skillVerifications','sv_'+Date.now(),{uid:ME.uid,name:ME.name,skill:skill,proofType:proofType,proofLink:proofLink,description:description,status:'pending',ts:Date.now()});
  closeModal();
  toast('Submitted! Our team will review within 48 hours. ✅');
};

