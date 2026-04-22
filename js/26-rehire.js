// SkillStamp — Re-hire

// ═══════════════════════════════════════════════════════
//  RE-HIRE
// ═══════════════════════════════════════════════════════
window.openReHire=function(prevGigId,freelancerUid){
  var u=getUser(freelancerUid);
  if(!u){toast('Freelancer not found.','bad');return;}
  var prevGig=getGigs().find(function(g){return g.id===prevGigId;});
  setModal('<button class="mclose" onclick="closeModal()">✕</button>'
    +'<div style="text-align:center;padding:8px 0 12px;">'
    +'<div style="font-size:36px;margin-bottom:8px;">↩</div>'
    +'<div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:800;font-size:16px;margin-bottom:3px;">Re-hire '+u.name.split(' ')[0]+'</div>'
    +'<div style="font-size:11px;color:var(--td);margin-bottom:16px;">Previous: '+(prevGig?prevGig.title:'')+'</div>'
    +'</div>'
    +'<div class="fg"><label class="fl">New Project Title</label><input class="fi" id="rh-title" value="'+(prevGig?prevGig.title+' (follow-up)':'')+'"></div>'
    +'<div class="fg"><label class="fl">Budget ($)</label><input class="fi" id="rh-budget" type="number" placeholder="e.g. 500" min="1" value="'+(prevGig&&prevGig.escrowAmount?prevGig.escrowAmount:'')+'"></div>'
    +'<div class="fg"><label class="fl">Timeline</label><select class="fi" id="rh-timeline"><option>3 days</option><option selected>1 week</option><option>2 weeks</option><option>1 month</option></select></div>'
    +'<div class="fg"><label class="fl">Description</label><textarea class="fi" id="rh-desc" rows="3" placeholder="What do you need this time around?" style="resize:vertical;"></textarea></div>'
    +'<div style="font-size:10px;color:var(--td);margin-bottom:12px;">💳 Wallet: <strong style="color:var(--gld);">$'+Math.round((ME.wallet&&ME.wallet.balance)||0).toLocaleString()+'</strong> available</div>'
    +'<button class="btn" id="rh-submit-btn" style="width:100%;">Re-hire &amp; Lock Escrow →</button>');
  setTimeout(function(){
    var btn=document.getElementById('rh-submit-btn');
    if(btn) btn.onclick=async function(){
      var title=(document.getElementById('rh-title').value||'').trim();
      var budget=parseFloat(document.getElementById('rh-budget').value)||0;
      var timeline=document.getElementById('rh-timeline').value;
      var desc=(document.getElementById('rh-desc').value||'').trim();
      if(!title||!budget||!desc){toast('Please fill all fields.','bad');return;}
      if(!ME.wallet||(ME.wallet.balance||0)<budget){toast('Insufficient wallet balance. Top up first.','bad');return;}
      btn.disabled=true;btn.textContent='Processing…';
      var gig={
        id:'g'+Date.now(),title:title,description:desc,pay:budget,
        category:u.category,posterUid:ME.uid,posterName:ME.name,
        applicants:[freelancerUid],hiredUid:freelancerUid,status:'hired',
        escrowAmount:budget,created:Date.now(),deadline:timeline,
        directHire:true,reHire:true,prevGigId:prevGigId,maxRevisions:1
      };
      await fbSet('gigs',gig.id,gig);
      CACHE.gigs.unshift(gig);
      ME.wallet.balance=Math.max(0,(ME.wallet.balance||0)-budget);
      ME.wallet.pending=(ME.wallet.pending||0)+budget;
      ME.wallet.transactions.unshift({id:'t'+Date.now(),type:'out',amount:budget,from:ME.name,desc:'Re-hire: '+title,ts:Date.now()});
      saveUser(ME);
      pushNotif(freelancerUid,'hired','🎉 Re-hired!',ME.name+' hired you again for: '+title+' — $'+budget,{type:'gig_hired',gigId:gig.id,clientUid:ME.uid});
      sendAutoMsg(freelancerUid,'👋 Hi '+u.name.split(' ')[0]+'! I\'ve re-hired you for a new project: '+title+'. Budget: $'+budget+'. Timeline: '+timeline+'. Great working with you again!');
      closeModal();
      toast('Re-hire complete! $'+budget+' locked in escrow.');
      renderWallet();
    };
  },60);
};

