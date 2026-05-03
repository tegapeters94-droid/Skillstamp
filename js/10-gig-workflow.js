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
  // ── Smart-Sort: Verified+Boosted > Verified > Unverified+Boosted > Standard ──
  var sortedApplicants = applicants.slice().sort(function(a, b) {
    var ua = getUser(a) || {};
    var ub = getUser(b) || {};
    var isVerifA = userIsVerified(ua);
    var isVerifB = userIsVerified(ub);
    var isBoostedA = !!(ua.proposalBoosts && ua.proposalBoosts[gid]);
    var isBoostedB = !!(ub.proposalBoosts && ub.proposalBoosts[gid]);
    function tierScore(v, b) { if(v && b) return 4; if(v) return 3; if(b) return 2; return 1; }
    return tierScore(isVerifB, isBoostedB) - tierScore(isVerifA, isBoostedA);
  });
  sortedApplicants.forEach(function(uid){
    var u=getUser(uid)||{name:'User',skillId:uid,gradient:'#888'};
    var proposal=gig.proposals&&gig.proposals[uid];
    var cover=proposal&&proposal.cover?proposal.cover:'';
    var timeline=proposal&&proposal.timeline?proposal.timeline:'';
    var rate=proposal&&proposal.rate?'$'+proposal.rate:'';
    var screeningAnswer=proposal&&proposal.screeningAnswer?proposal.screeningAnswer:'';
    rows+='<div style="background:var(--s2);border:1px solid var(--br);border-radius:10px;margin-bottom:10px;overflow:hidden;">';
    // Applicant header row
    rows+='<div style="display:flex;align-items:center;gap:10px;padding:11px 12px;">';
    rows+=avHTML(u,36,'50%');
    var isApplicantVerif=userIsVerified(u);
    var isApplicantBoosted=!!(u.proposalBoosts&&u.proposalBoosts[gid]);
    var applicantBadge=isApplicantVerif?'<span style="font-size:8px;background:rgba(74,222,128,.1);color:#4ade80;border:1px solid rgba(74,222,128,.3);padding:1px 5px;border-radius:6px;margin-left:4px;">✓ Verified</span>':'';
    var boostBadge=isApplicantBoosted?'<span style="font-size:8px;background:rgba(96,165,250,.1);color:#60a5fa;border:1px solid rgba(96,165,250,.3);padding:1px 5px;border-radius:6px;margin-left:3px;">⚡ Boosted</span>':'';
    rows+='<div style="flex:1;min-width:0;"><div style="font-size:13px;font-weight:700;font-family:Plus Jakarta Sans,sans-serif;">'+u.name+applicantBadge+boostBadge+'</div>';
    rows+='<div style="font-size:10px;color:var(--td);">'+(u.skillId||'')+(timeline?' · 📅 '+timeline:'')+(rate?' · '+rate:'')+'</div></div>';
    // View Profile button
    rows+='<button onclick="closeModal();viewProfile(\'' + uid + '\')" style="background:none;border:1px solid var(--br);border-radius:6px;padding:5px 9px;font-size:10px;font-weight:600;color:var(--gld);cursor:pointer;flex-shrink:0;">👤 Profile</button>';
    // Radio select
    rows+='<label style="cursor:pointer;margin-left:6px;"><input type="radio" name="hire-pick" value="'+uid+'" style="width:18px;height:18px;accent-color:var(--grn);"></label>';
    rows+='</div>';
    // Proposal cover note
    if(cover){
      rows+='<div style="padding:10px 12px;border-top:1px solid var(--br);font-size:11px;color:var(--td);line-height:1.75;background:var(--bg);">';
      rows+='<div style="font-size:9px;font-weight:700;color:var(--tx);text-transform:uppercase;letter-spacing:.5px;margin-bottom:5px;">📋 Proposal</div>';
      rows+=cover;
      rows+='</div>';
    }
    // Screening question answer
    if(gig.screeningQ&&gig.screeningQ.trim()&&screeningAnswer){
      rows+='<div style="padding:10px 12px;border-top:1px solid var(--br);background:rgba(5,150,105,.04);">';
      rows+='<div style="font-size:9px;font-weight:700;color:#059669;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px;">❓ Screening Answer</div>';
      rows+='<div style="font-size:10px;color:var(--td);margin-bottom:4px;font-style:italic;">"'+gig.screeningQ+'"</div>';
      rows+='<div style="font-size:12px;color:var(--tx);line-height:1.6;">'+screeningAnswer+'</div>';
      rows+='</div>';
    }
    rows+='</div>';
  });
  hList.innerHTML=rows;
  if(!rows) hList.innerHTML='<div style="text-align:center;color:var(--td);font-size:12px;padding:20px;">No applicants to show.</div>';
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
  var notifMsg='Congratulations '+hiredUser.name+'! You have been hired for: '+gig.title+'. Budget: $'+(gig.escrowAmount||gig.payNum||0).toLocaleString()+'. Deliver your work and the client will release payment through escrow.';
  sendAutoMsg(hiredUid,notifMsg);
  // Push notification to freelancer
  pushNotif(hiredUid,'hired','🎉 You Got Hired!','You have been hired for: '+gig.title+' — $'+(gig.escrowAmount||gig.payNum||0).toLocaleString()+'. Tap to open chat with client.',{type:'gig_hired',gigId:gid,clientUid:ME.uid});

  // ── SUCCESS CONFIRMATION MODAL ──────────────────────────
  var hiredAv=hiredU&&hiredU.avatar?'<img src="'+hiredU.avatar+'" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">':initials(hiredUser.name);
  var hiredGrad=hiredU&&hiredU.gradient?hiredU.gradient:'#1a6b3c';
  var mh='<div style="text-align:center;padding:8px 0 4px;">';
  mh+='<div class="sick" style="margin:0 auto 14px;">✓</div>';
  mh+='<h3 style="margin-bottom:6px;">Hired!</h3>';
  mh+='<p style="font-size:12px;color:var(--td);margin-bottom:20px;">'+hiredUser.name+' has been notified and is ready to start.</p>';
  mh+='<div style="background:var(--s2);border:1px solid var(--br);border-radius:12px;padding:14px;margin-bottom:20px;text-align:left;">';
  mh+='<div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">';
  mh+='<div style="width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,'+hiredGrad+','+hiredGrad+'88);display:flex;align-items:center;justify-content:center;font-family:Plus Jakarta Sans,sans-serif;font-weight:800;font-size:14px;color:#000;overflow:hidden;flex-shrink:0;">'+hiredAv+'</div>';
  mh+='<div><div style="font-weight:700;font-size:13px;">'+hiredUser.name+'</div><div style="font-size:10px;color:var(--td);">Hired for: '+gig.title+'</div></div>';
  mh+='</div>';
  mh+='<div style="display:flex;justify-content:space-between;font-size:11px;padding:5px 0;border-top:1px solid var(--br);"><span style="color:var(--td);">Budget locked in escrow</span><span style="color:var(--grn);font-weight:700;">$'+(gig.escrowAmount||gig.payNum||0).toLocaleString()+'</span></div>';
  mh+='<div style="display:flex;justify-content:space-between;font-size:11px;padding:5px 0;"><span style="color:var(--td);">Status</span><span style="color:var(--gld);font-weight:600;">In Progress</span></div>';
  mh+='</div>';
  mh+='<button class="btn" style="width:100%;margin-bottom:10px;" onclick="event.stopPropagation();var mc=document.getElementById(\'mcontent\');var ov=document.getElementById(\'moverlay\');if(mc)mc.style.cssText=\'\';if(ov)ov.style.cssText=\'\';openMsg(\''+hiredUid+'\');">Open Chat with '+hiredUser.name+' →</button>';
  mh+='<button class="btn2" style="width:100%;" onclick="closeModal();">Done</button>';
  mh+='</div>';
  setModal(mh);
};

window.openCompleteGig=function(gid){
  var gig=getGigs().find(function(g){return g.id===gid;});
  if(!gig)return;
  var freelancer=getUser(gig.hiredUid)||{name:'Freelancer'};
  var payNum=gig.escrowAmount||gig.payNum||0;
  var freelancerForFee=getUser(gig.hiredUid);
  var commRateDisplay=freelancerForFee?getCommissionRate(freelancerForFee):0.10;
  var holdDisplay=freelancerForFee?getPayoutHoldDays(freelancerForFee):10;
  var fee=Math.round(payNum*commRateDisplay);
  var payout=payNum-fee;
  var mh='<button class="mclose" id="comp-close">✕</button>';
  mh+='<h3>✅ Release Payment</h3>';
  mh+='<p>Confirm you are satisfied with the work delivered by '+freelancer.name+'.</p>';
  mh+='<div style="background:var(--s2);border:1px solid var(--br);border-radius:8px;padding:14px;margin-bottom:14px;">';
  mh+='<div style="display:flex;justify-content:space-between;font-size:12px;padding:5px 0;"><span style="color:var(--td);">Escrow Amount</span><span>$'+payNum.toLocaleString()+'</span></div>';
  mh+='<div style="display:flex;justify-content:space-between;font-size:12px;padding:5px 0;"><span style="color:var(--td);">SkillStamp Fee ('+Math.round(commRateDisplay*100)+'%)</span><span style="color:var(--acc);">-$'+fee.toLocaleString()+'</span></div>';
  mh+='<div style="display:flex;justify-content:space-between;font-size:11px;padding:3px 0;"><span style="color:var(--td);">Payout Hold</span><span style="color:var(--gld);">'+( holdDisplay===0?'Instant (Whale tier)':holdDisplay+' days')+'</span></div>';
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
  // Commission: 0% for Pro users, 10% for free users
  var freelancer_=getUser(gig.hiredUid);
  var commRate=freelancer_?getCommissionRate(freelancer_):0.10;
  var fee=Math.round(payNum*commRate);
  var payout=payNum-fee;
  // Payout hold days: Whale=0 (instant), Elite=5 days, Discoverer/Hustler=10 days
  var holdDays=freelancer_?getPayoutHoldDays(freelancer_):10;
  // Disable button and show loading state immediately
  var btn=document.getElementById('comp-confirm-btn');
  if(btn){btn.disabled=true;btn.textContent='Processing…';}
  try{
    gig.status='completed';gig.completedAt=Date.now();
    await fbSet('gigs',gig.id,gig);
    var cidx=CACHE.gigs.findIndex(function(g){return g.id===gig.id;});
    if(cidx>=0) CACHE.gigs[cidx]=gig;
    if(!freelancer.wallet) freelancer.wallet={balance:0,pending:0,earned:0,transactions:[]};
    var holdLabel=holdDays===0?'(Instant)':'(Available in '+holdDays+'d)';
    if(holdDays>0){
      // Schedule release: store holdUntil — admin/cloud function releases after hold
      freelancer.wallet.pending=(freelancer.wallet.pending||0)+payout;
      freelancer.wallet.transactions.unshift({id:'pay_'+Date.now(),type:'pending',amount:payout,from:ME.name,desc:'Payment pending '+holdDays+'d hold: '+gig.title,holdUntil:Date.now()+(holdDays*86400000),ts:Date.now()});
    } else {
      // Instant payout (Whale tier)
      freelancer.wallet.balance+=payout;
      freelancer.wallet.earned=(freelancer.wallet.earned||0)+payout;
      freelancer.wallet.transactions.unshift({id:'pay_'+Date.now(),type:'in',amount:payout,from:ME.name,desc:'Payment (Instant): '+gig.title,ts:Date.now()});
    }
    freelancer.repPoints=(freelancer.repPoints||0)+20;
    freelancer.gigsCount=(freelancer.gigsCount||0)+1;
    await fbSet('users',freelancer.uid,freelancer);
    ME.wallet.pending=Math.max(0,(ME.wallet.pending||0)-payNum);
    ME.wallet.transactions.unshift({id:'rel_'+Date.now(),type:'out',amount:payout,from:freelancer.name,desc:'Released: '+gig.title,ts:Date.now()});
    ME.repPoints=(ME.repPoints||0)+10;
    saveUser(ME);
    var payMsg=holdDays===0
      ?'Payment of $'+payout.toLocaleString()+' added to your wallet instantly (Whale tier)! Great work!'
      :'Payment of $'+payout.toLocaleString()+' is pending a '+holdDays+'-day hold and will be released automatically. Great work!';
    sendAutoMsg(gig.hiredUid,payMsg);
    var payNotifBody=holdDays===0
      ?'$'+payout.toLocaleString()+' has been sent to your wallet for: '+gig.title
      :'$'+payout.toLocaleString()+' will be released in '+holdDays+' days for: '+gig.title;
    pushNotif(gig.hiredUid,'payment','💰 Payment '+( holdDays===0?'Received':'Pending'),payNotifBody,{type:'payment',gigId:gig.id});
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

