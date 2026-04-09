// SkillStamp — Profiles, Verification, QR

// ══════════════════════════════════════════════
//  PROFILES
// ══════════════════════════════════════════════
window.viewProfile=function(uid){
  if(uid===ME.uid){showPage('myprofile');return;}
  const u=getUser(uid);if(!u)return;
  document.getElementById('viewprofile-content').innerHTML=buildProfile(u,false);
  var vp=document.getElementById('viewprofile-content');
  if(vp) vp.addEventListener('click',function(e){
    var card=e.target.closest('[data-pfid]');
    if(card) openPortfolioItem(card.dataset.pfuid,card.dataset.pfid);
  });
  showPage('viewprofile');
  // Notify profile owner (throttled — only once per 10 min per viewer)
  try {
    var throttleKey = 'pv_' + ME.uid + '_' + uid;
    var lastView = parseInt(localStorage.getItem(throttleKey) || '0');
    if (Date.now() - lastView > 600000) {
      localStorage.setItem(throttleKey, Date.now());
      pushNotif(uid, 'profile_view', '👁️ Profile View', ME.name + ' viewed your profile', {type:'profile_view', viewerUid: ME.uid});
    }
  } catch(e) {}
};

function renderMyProfile(){
  ME=getUser(ME.uid)||ME;
  document.getElementById('myprofile-content').innerHTML=buildProfile(ME,true);
  // Portfolio click delegation
  var el=document.getElementById('myprofile-content');
  if(el) el.addEventListener('click',function(e){
    var card=e.target.closest('[data-pfid]');
    if(card) openPortfolioItem(card.dataset.pfuid,card.dataset.pfid);
  });
}


// ═══════════════════════════════════════════
// FIXED: buildProfile — pure string concat, no mixed template literals
// ═══════════════════════════════════════════
function buildProfile(u,isOwn){
  var isClient=u.role==='employer';
  var endorsements=getEndorsements().filter(function(e){return e.toUid===u.uid;});
  var myPosts=getPosts().filter(function(p){return p.uid===u.uid;});
  var grad=u.gradient||'#888';
  var avImg=u.avatar?'<img src="'+u.avatar+'" style="width:100%;height:100%;object-fit:cover;">':initials(u.name);

  // ── SkillID card — freelancers only ──────────────────────
  var skillIdCard='';
  var isVerifiedBadge=u.badgeStatus==='verified'||u.badgeStatus==='expert'||u.badgeStatus==='elite';
  if(isOwn&&!isClient&&isVerifiedBadge&&u.skillId){
    var infoRows=[['Name',u.name],['Country',flag(u.country)+' '+u.country],['Category',(CAT_ICONS[u.category]||'')+' '+u.category]];
    var infoHtml='';
    for(var ii=0;ii<infoRows.length;ii++){
      infoHtml+='<div style="text-align:center;"><div style="font-size:8px;color:rgba(255,255,255,.55);text-transform:uppercase;letter-spacing:.06em;margin-bottom:2px;">'+infoRows[ii][0]+'</div><div style="font-size:10px;font-family:Plus Jakarta Sans,sans-serif;font-weight:600;color:#fff;">'+infoRows[ii][1]+'</div></div>';
    }
    skillIdCard='<div class="skillid-card" style="margin-bottom:16px;">'
      +'<div style="font-size:9px;color:rgba(255,255,255,.65);text-transform:uppercase;letter-spacing:.12em;margin-bottom:3px;">SkillStamp ID</div>'
      +'<div class="sid-num">'+u.skillId+'</div>'
      +'<div style="display:flex;gap:18px;margin-top:14px;position:relative;z-index:1;">'+infoHtml+'</div>'
      +'</div>';
  }

  // ── Edit buttons — role-aware ─────────────────────────────
  var editBtns='';
  if(isOwn){
    if(isClient){
      editBtns='<div style="display:flex;gap:7px;margin-top:13px;flex-wrap:wrap;">'
        +'<button class="bsm" onclick="openEditProfile()">✏️ Edit Profile</button>'
        +'<button class="bgrn" onclick="goWallet()">💳 Wallet</button>'
        +'<button class="bsm" onclick="openPostGig()">+ Post a Gig</button>'
        +'<button class="b2sm" onclick="openChangePassword()">🔑 Password</button>'
        +'</div>';
    } else {
      var alreadyVerified=(u.badgeStatus==='verified'||u.badgeStatus==='expert'||u.badgeStatus==='elite');
      var pendingVerif=(u.verificationStatus==='pending');
      editBtns='<div style="display:flex;gap:7px;margin-top:13px;flex-wrap:wrap;">'
        +'<button class="bsm" onclick="openEditProfile()">✏️ Edit Profile</button>'
        +(!alreadyVerified&&!pendingVerif?'<button class="b2sm" onclick="openSubmitSkill()">⚡ Get Verified</button>':'')
        +'<button class="bgrn" onclick="goWallet()">💳 Wallet</button>'
        +'<button class="b2sm" onclick="openChangePassword()">🔑 Password</button>'
        +'</div>';
    }
  }

  // ── Bio ───────────────────────────────────────────────────
  var bioText=u.bio||('No bio yet.'+(isOwn?' <a onclick="openEditProfile()" style="color:var(--gld);cursor:pointer;">Add one →</a>':''));

  // ── Skills section — freelancers only ────────────────────
  var skillsSection='';
  if(!isClient){
    var PROF_SKILLS=(u.skills||[]).slice(0,6);
    if(PROF_SKILLS.length){
      var chipsHtml='';
      (u.skills||[]).forEach(function(s){
        var isVer=u.verifiedSkills&&u.verifiedSkills.indexOf(s)>=0;
        chipsHtml+='<span class="chip'+(isVer?' v':'')+'">'+s+(isVer?' ★':'')+'</span>';
      });
      var verNote=u.verifiedSkills&&u.verifiedSkills.length?'<div style="font-size:9px;color:var(--gld);margin-top:8px;">&#x2605; = Verified by SkillStamp</div>':'';
      var e2=getEndorsements().filter(function(e){return e.toUid===u.uid;});var sc={};e2.forEach(function(e){sc[e.skill]=(sc[e.skill]||0)+1;});
      var ss2=(u.skills||[]).slice().sort(function(a,b){return (sc[b]||0)-(sc[a]||0);});var ch2='';ss2.forEach(function(s){var iv=u.verifiedSkills&&u.verifiedSkills.indexOf(s)>=0;var cnt=sc[s]||0;ch2+='<span class="chip'+(iv?' v':'')+'">'+ s+(iv?' &#x2605;':'')+(cnt?'<span style="font-size:8px;opacity:.6;">('+cnt+')</span>':'')+'</span>';});
      var ofs='';if(u.offers&&u.offers.length){ofs='<div style="margin-top:10px;">'+u.offers.map(function(o){return '<div class="offer-item">&#x2713; '+o+'</div>';}).join('')+'</div>';}
      skillsSection='<div class="psec"><div class="psec-t">&#x26A1; Skills</div>'
        +'<div class="chips">'+ch2+'</div>'
        +verNote+ofs+'</div>';
    }
  }

  // ── Posts section ─────────────────────────────────────────

  // ── Endorsements — both roles can receive/give ────────────
  var endorseSection='';
  var endorseItemsHtml='';
  if(endorsements.length){
    endorsements.slice(0,5).forEach(function(en){
      var enGrad=en.fromGrad||'#888';
      var enAvImg=en.fromAvatar?'<img src="'+en.fromAvatar+'" style="width:100%;height:100%;object-fit:cover;">':initials(en.fromName);
      endorseItemsHtml+='<div class="endorse-item">'
        +'<div class="endorse-top" style="display:flex;align-items:center;gap:8px;margin-bottom:5px;">'
        +'<div class="endorse-av" style="background:linear-gradient(135deg,'+enGrad+','+enGrad+'88);">'+enAvImg+'</div>'
        +'<div style="flex:1;"><div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:600;font-size:10px;">'+en.fromName+'</div>'
        +'<div style="font-size:9px;color:var(--gld);">'+en.skill+'</div></div>'
        +'<div style="font-size:9px;color:var(--td);">'+timeAgo(en.ts||en.created)+'</div></div>'
        +'<div style="font-size:11px;color:var(--td);font-style:italic;">"'+en.comment+'"</div></div>';
    });
  } else {
    var noEndorseMsg='No endorsements yet.';
    if(!isOwn) noEndorseMsg+=' <a onclick="endorseUser(this)" data-uid="'+u.uid+'" style="color:var(--gld);cursor:pointer;">Be the first →</a>';
    endorseItemsHtml='<div style="font-size:11px;color:var(--td);">'+noEndorseMsg+'</div>';
  }
  var endorseBtn=!isOwn?'<button class="bgrn" style="margin-top:10px;" data-uid="'+u.uid+'" onclick="endorseUser(this)">🤝 Endorse '+u.name.split(' ')[0]+'</button>':'';
  endorseSection='<div class="psec"><div class="psec-t">🤝 Peer Endorsements <span style="font-size:9px;font-weight:400;color:var(--td);">('+endorsements.length+')</span></div>'
    +endorseItemsHtml+endorseBtn+'</div>';

  // ── Sidebar: action buttons (other profile) ───────────────
  var actionBtns='';
  if(!isOwn){
    var vic=ME&&ME.role==='employer';
    actionBtns='';
    if(vic&&!isClient&&u.available!==false) actionBtns+='<button class="hire-me-btn" onclick="openHireMe(\''+u.uid+'\')">💼 Hire '+u.name.split(' ')[0]+' Now</button>';

    if(!isClient){
      // Can only endorse freelancers
      actionBtns+='<button class="bgrn" style="width:100%;margin-bottom:8px;" data-uid="'+u.uid+'" onclick="endorseUser(this)">🤝 Endorse</button>';
    }
  }

  // ── Sidebar: wallet / stats card ─────────────────────────
  var walletCard='';
  if(isOwn){
    if(isClient){
      // Client sidebar — gigs posted + total paid
      var myGigs=getGigs().filter(function(g){return g.posterUid===u.uid;});
      var totalPaid=myGigs.filter(function(g){return g.status==='completed';}).reduce(function(s,g){return s+(g.escrowAmount||0);},0);
      walletCard='<div class="scard">'
        +'<div class="scard-t">📊 Activity</div>'
        +'<div class="irow"><span class="ilbl">Gigs Posted</span><span class="ival" style="color:#4d9fff;">'+(u.gigsCount||myGigs.length)+'</span></div>'
        +'<div class="irow"><span class="ilbl">Total Paid Out</span><span class="ival" style="color:var(--grn);">$'+totalPaid.toLocaleString()+'</span></div>'
        +'<div class="irow"><span class="ilbl">Wallet Balance</span><span class="ival" style="color:var(--gld);">$'+((u.wallet&&u.wallet.balance)||0).toLocaleString()+'</span></div>'
        +'<button class="bgrn" style="width:100%;margin-top:8px;" onclick="goWallet()">View Wallet →</button>'
        +'</div>';
    } else {
      // Freelancer sidebar — earnings
      walletCard='<div class="scard">'
        +'<div class="scard-t">💳 Wallet Summary</div>'
        +'<div class="irow"><span class="ilbl">Balance</span><span class="ival" style="color:var(--grn);">$'+((u.wallet&&u.wallet.balance)||0).toLocaleString()+'</span></div>'
        +'<div class="irow"><span class="ilbl">Total Earned</span><span class="ival">$'+((u.wallet&&u.wallet.earned)||u.earned||0).toLocaleString()+'</span></div>'
        +'<button class="bgrn" style="width:100%;margin-top:8px;" onclick="goWallet()">View Full Wallet →</button>'
        +'</div>';
    }
  }

  // ── Stats row — role-aware ────────────────────────────────
  var statsRow='';
  if(isClient){
    var myGigsCount=getGigs().filter(function(g){return g.posterUid===u.uid;}).length;
    var completedCount=getGigs().filter(function(g){return g.posterUid===u.uid&&g.status==='completed';}).length;
    statsRow='<div class="pstats">'
      +'<div class="pstat"><div class="psval" style="color:#4d9fff;">'+myGigsCount+'</div><div class="pslbl">Gigs Posted</div></div>'
      +'<div class="pstat"><div class="psval" style="color:var(--grn);">'+completedCount+'</div><div class="pslbl">Completed</div></div>'
      +'<div class="pstat"><div class="psval" style="color:var(--gld);">'+((u.wallet&&u.wallet.balance)||0).toLocaleString()+'</div><div class="pslbl">Balance</div></div>'
      +''
      +'</div>';
  } else {


    var _rt=u.score>0?u.score.toFixed(1):'New';
    var _rc=u.score>0?'var(--gld)':'var(--td)';
    var _rs=u.score>0?Math.min(5,Math.round(u.score)):0;
    var _sh='';for(var _si=1;_si<=5;_si++){_sh+='<svg width="10" height="10" viewBox="0 0 24 24" fill="'+(_si<=_rs?'#e8c547':'none')+'" stroke="'+(_si<=_rs?'#e8c547':'rgba(255,255,255,.15)')+'" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>';}
    statsRow='<div class="pstats">'
      +'<div class="pstat"><div style="display:flex;gap:2px;justify-content:center;margin-bottom:4px;">'+_sh+'</div><div class="psval" style="color:'+_rc+';">'+_rt+'</div><div class="pslbl">Rating</div></div>'
      +'<div class="pstat"><div class="psval">'+(u.gigsCount||0)+'</div><div class="pslbl">Gigs Done</div></div>'
      +'<div class="pstat"><div class="psval" style="color:var(--grn);">$'+(((u.wallet&&u.wallet.earned)||u.earned||0).toLocaleString())+'</div><div class="pslbl">Earned</div></div>'
      +'</div>';
  }

  // ── Badge display — clients get role badge not verification ──
  var roleBadge='';
  if(isClient){
    roleBadge='<span style="display:inline-flex;align-items:center;gap:4px;background:rgba(77,159,255,.1);border:1px solid rgba(77,159,255,.25);color:#4d9fff;padding:3px 9px;border-radius:20px;font-size:9px;font-weight:700;">🏢 Client</span>';
  } else {
    // Don't show badge here - checkmark already shown in name for verified users
    roleBadge=(u.badgeStatus==='verified'||u.badgeStatus==='expert'||u.badgeStatus==='elite')?'':badgeHTML(u.badgeStatus);
  }

  // ── SkillID display — freelancers only ────────────────────
  var isVerifiedUser=u.badgeStatus==='verified'||u.badgeStatus==='expert'||u.badgeStatus==='elite';
  var skillIdDisplay='';
  if(!isClient){
    if(isVerifiedUser&&u.skillId){
      skillIdDisplay='<div class="vbadge">✓ SkillID: '+u.skillId+'</div>';
    } else if(isOwn){
      skillIdDisplay='<div style="display:inline-flex;align-items:center;gap:4px;background:rgba(255,107,53,.06);border:1px solid rgba(255,107,53,.2);color:var(--acc);font-size:9px;padding:3px 9px;border-radius:20px;cursor:pointer;" onclick="openSubmitSkill()">⚡ Get Verified to unlock SkillID</div>';
    }
  }

  // ── Assemble profile ──────────────────────────────────────
  var bannerCSS=getBannerCSS(u);
  return '<div class="pbanner" style="background:'+bannerCSS+';">'+(isOwn?'<button onclick="openBannerPicker()" style="position:absolute;bottom:10px;right:10px;background:rgba(0,0,0,.45);border:1px solid rgba(255,255,255,.2);color:#fff;border-radius:6px;padding:4px 10px;font-size:9px;cursor:pointer;font-family:Plus Jakarta Sans,sans-serif;font-weight:600;">&#x1F3A8; Change</button>':'')+'</div>'
    +'<div class="playout">'
    +'<div>'
    +skillIdCard
    +'<div class="pid card-accent">'
    +'<div class="p-top">'
    +'<div class="p-big-av" style="background:linear-gradient(135deg,'+grad+','+grad+'88);">'+avImg
    +(isOwn?'<div class="av-overlay" onclick="openChangePhoto()">📸 Change</div>':'')
    +'<div class="online-dot"></div></div>'
    +'<div style="flex:1;">'
    +'<div class="p-name" style="display:flex;align-items:center;gap:6px;">'+u.name+(isVerifiedBadge?verifiedSVG(getVerifColor()):'')+'</div>'
    +roleBadge
    +'<div class="p-title">'+(u.title||'SkillStamp Member')+' · '+flag(u.country)+' '+u.country+'</div>'
    +'<div class="pmeta">'
    +'<span class="mpill">'+(CAT_ICONS[u.category]||'🌐')+' '+u.category+'</span>'
    
    
    
    +'</div>'
    +skillIdDisplay
    +(!isClient?'<div style="margin-top:8px;"><div class="avail-toggle '+(u.available?'available':'busy')+'"'+(isOwn?' onclick="toggleAvailability()"':'')+'><div class="avail-dot '+(u.available?'available':'busy')+'"></div>'+(u.available?'Available for work':'Currently busy')+'</div></div>':'')
    +'</div></div>'
    +statsRow
    +(u.tagline?'<div class="p-tagline">"'+u.tagline+'"</div>':'')
    +(u.tagline?'<div class="p-tagline">"'+u.tagline+'"</div>':'')
    +'<div class="psec"><div class="psec-t">About</div><div style="font-size:12px;color:var(--td);line-height:1.85;">'+bioText+'</div></div>'
    +editBtns
    +(!isClient?skillsSection:'')
    +(!isClient?buildPortfolio(u,isOwn):'')
    +buildWorkHistory(u)
    +endorseSection
    +'</div>'
    +'<div class="psidebar">'
    +'<div class="scard">'
    +'<div class="scard-t">🔐 Identity</div>'
    +(isClient
      ?'<div class="irow"><span class="ilbl">Role</span><span class="ival" style="color:#4d9fff;">Client</span></div>'
      :((u.badgeStatus==='verified'||u.badgeStatus==='expert')&&u.skillId
        ?'<div class="irow"><span class="ilbl">SkillID</span><span class="ival" style="color:var(--gld);font-size:9px;">'+u.skillId+'</span></div>'
        :'<div class="irow"><span class="ilbl">SkillID</span><span class="ival" style="color:var(--td);font-size:9px;">Not verified yet</span></div>')
       +'<div class="irow"><span class="ilbl">Badge</span><span>'+badgeHTML(u.badgeStatus)+'</span></div>'
   
    )
    +'<div class="irow"><span class="ilbl">Country</span><span class="ival">'+flag(u.country)+' '+u.country+'</span></div>'
    +'<div class="irow"><span class="ilbl">Category</span><span class="ival">'+(CAT_ICONS[u.category]||'')+' '+u.category+'</span></div>'
    +'<div class="irow"><span class="ilbl">Member Since</span><span class="ival">'+timeAgo(u.created||Date.now())+'</span></div>'
    +'</div>'
    +walletCard
    +(actionBtns?'<div class="scard" style="margin-top:14px;">'+actionBtns+'</div>':'')
    +(isOwn?'<div style="margin:20px 0 8px;padding:16px;text-align:center;border-top:1px solid var(--br);">'      +'<div style="font-size:10px;color:var(--td);line-height:2;">'      +'<span onclick="showTos()" style="cursor:pointer;color:var(--gld);text-decoration:underline;">Terms of Service</span>'      +' &nbsp;·&nbsp; '      +'<span onclick="showPrivacy()" style="cursor:pointer;color:var(--gld);text-decoration:underline;">Privacy Policy</span>'      +' &nbsp;·&nbsp; '      +'<span onclick="openChangePassword()" style="cursor:pointer;color:var(--td);">🔑 Change Password</span>'      +'</div>'      +'<div style="font-size:9px;color:var(--td);margin-top:4px;">© 2025 SkillStamp · Tega Technologies · NDPA 2023 Compliant</div>'      +'</div>':'')    +'</div>'
    +'</div>';
}


window.openChangePhoto=function(){
  var photoSection='';
  if(ME.avatar){
    photoSection='<div style="text-align:center;margin-bottom:12px;">'
      +'<img src="'+ME.avatar+'" style="width:80px;height:80px;border-radius:50%;object-fit:cover;border:3px solid var(--gld);">'
      +'<div style="font-size:10px;color:var(--td);margin-top:6px;">Current photo</div></div>'
      +'<button class="bacc" style="width:100%;" id="remove-photo-btn">Remove Photo</button>';
  }
  var mh='<button class="mclose" id="cp-close">✕</button>';
  mh+='<h3>📸 Profile Photo</h3>';
  mh+='<p>Upload a photo to personalise your profile.</p>';
  mh+='<label for="photo-input" style="border:2px dashed var(--br);border-radius:var(--r);padding:24px;text-align:center;margin-bottom:14px;cursor:pointer;display:block;">';
  mh+='<div style="font-size:28px;margin-bottom:8px;">📷</div>';
  mh+='<div style="font-size:12px;color:var(--td);font-weight:600;">Tap to choose from gallery</div>';
  mh+='<div style="font-size:10px;color:var(--td);margin-top:4px;">Or take a new photo · JPG, PNG — max 5MB</div>';
  mh+='</label>';
  mh+='<input type="file" id="photo-input" accept="image/*" style="display:none;" onchange="handlePhotoUpload(this)">';
  mh+=photoSection;
  setModal(mh);
  document.getElementById('cp-close').onclick=closeModal;
  var remBtn=document.getElementById('remove-photo-btn');
  if(remBtn) remBtn.onclick=removePhoto;
};

window.handlePhotoUpload=function(input){
  var file=input.files[0];if(!file)return;
  if(file.size>10*1024*1024){toast('Photo must be under 10MB.','bad');return;}
  var reader=new FileReader();
  reader.onload=function(e){
    var img=new Image();
    img.onload=function(){
      // Compress aggressively — keep avatar small enough for Firestore
      var canvas=document.createElement('canvas');
      var MAX=200;
      var w=img.width,h=img.height;
      if(w>h){if(w>MAX){h=Math.round(h*MAX/w);w=MAX;}}
      else{if(h>MAX){w=Math.round(w*MAX/h);h=MAX;}}
      canvas.width=w;canvas.height=h;
      canvas.getContext('2d').drawImage(img,0,0,w,h);
      var compressed=canvas.toDataURL('image/jpeg',0.6);
      toast('Saving photo...','ok');
      // Save avatar to dedicated collection (avoids Firestore 1MB doc limit)
      fbSet('avatars',ME.uid,{uid:ME.uid,data:compressed,ts:Date.now()}).then(function(){
        // Only after avatar saved, update user profile with avatar ref
        ME.avatar=compressed;
        return saveUser(ME);
      }).then(function(){
        var navAv=document.getElementById('nav-av');
        if(navAv){
          navAv.innerHTML='<img src="'+compressed+'" style="width:100%;height:100%;object-fit:cover;">';
          navAv.style.background='';
        }
        closeModal();
        toast('Profile photo saved! 📸');
        if(document.getElementById('page-myprofile').classList.contains('active')) renderMyProfile();
      }).catch(function(err){
        console.error('Photo save failed:',err);
        toast('Photo save failed. Try a smaller image.','bad');
      });
    };
    img.src=e.target.result;
  };
  reader.readAsDataURL(file);
};
window.removePhoto=function(){
  ME.avatar=null;saveUser(ME);
  var navAv=document.getElementById('nav-av');
  if(navAv){navAv.innerHTML=initials(ME.name);navAv.style.background='linear-gradient(135deg,'+ME.gradient+','+ME.gradient+'88)';}
  closeModal();toast('Photo removed.');
  if(document.getElementById('page-myprofile').classList.contains('active'))renderMyProfile();
};

window.openEditProfile=function(){
  var catOpts='';
  CATEGORIES.forEach(function(c){
    catOpts+='<option'+(ME.category===c?' selected':'')+'>'+c+'</option>';
  });
  var skillOpts='';
  ALL_SKILLS.forEach(function(s){
    var isOn=(ME.skills||[]).indexOf(s)>=0;
    skillOpts+='<span style="padding:3px 9px;background:var(--s2);border:1px solid '+(isOn?'rgba(232,197,71,.5)':'var(--br)')+';border-radius:4px;font-size:10px;color:'+(isOn?'var(--gld)':'var(--td)')+';cursor:pointer;" data-s="'+s+'" class="'+(isOn?'on':'')+'">'+s+'</span>';
  });
  var mh='<button class="mclose" id="ep-close">X</button>';
  mh+='<h3>Edit Profile</h3><p>Update your public SkillID profile</p>';
  mh+='<div class="fg"><label class="fl">Professional Title</label><input class="fi" id="ep-t" value="'+(ME.title||'')+'" placeholder="e.g. Senior Full-Stack Engineer"></div>';
  mh+='<div class="fg"><label class="fl">Bio</label><textarea class="fi" id="ep-b" rows="4" style="resize:vertical;">'+(ME.bio||'')+'</textarea></div>';
  mh+='<div class="fg"><label class="fl">Category</label><select class="fi" id="ep-cat">'+catOpts+'</select></div>';
  mh+='<div class="fg"><label class="fl">Skills (tap to toggle)</label>';
  mh+='<div style="display:flex;flex-wrap:wrap;gap:5px;margin-top:4px;max-height:160px;overflow-y:auto;" id="ep-skills">'+skillOpts+'</div></div>';
  mh+='<button class="btn" id="ep-save-btn">Save Profile</button>';
  setModal(mh);
  document.getElementById('ep-close').onclick=closeModal;
  document.getElementById('ep-save-btn').onclick=saveProfile;
  document.querySelectorAll('#ep-skills span').forEach(function(el){
    el.onclick=function(){
      this.classList.toggle('on');
      this.style.borderColor=this.classList.contains('on')?'rgba(232,197,71,.5)':'var(--br)';
      this.style.color=this.classList.contains('on')?'var(--gld)':'var(--td)';
    };
  });
};

window.saveProfile=function(){
  var title=document.getElementById('ep-t').value.trim();
  var bio=document.getElementById('ep-b').value.trim();
  var category=document.getElementById('ep-cat').value;
  var skills=[].slice.call(document.querySelectorAll('#ep-skills [data-s].on')).map(function(el){return el.dataset.s;});
  ME.title=title||ME.title;
  ME.bio=bio;
  ME.tagline=tagline;
  ME.offers=offers;
  ME.tagline=tagline;
  ME.offers=offers;
  ME.category=category;
  ME.skills=skills;
  saveUser(ME);
  closeModal();
  toast('Profile updated!');
  renderMyProfile();
};


// ── VERIFICATION SYSTEM V2 ────────────────────────────────────
// State for the multi-work submission
var _vwWorks = []; // array of {export: base64, proofType: 'screenshot'|'video', proof: base64, description: ''}
var _vwEditingIdx = null;

window.openSubmitSkill = function() {
  // Check if already pending or banned from reapplying
  if (ME.verifBannedUntil && Date.now() < ME.verifBannedUntil) {
    var days = Math.ceil((ME.verifBannedUntil - Date.now()) / 86400000);
    setModal('<button class="mclose" onclick="closeModal()">&#x2715;</button>'
      + '<div style="text-align:center;padding:20px 0;">'
      + '<div style="font-size:40px;margin-bottom:12px;">&#x23F3;</div>'
      + '<div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:800;font-size:16px;margin-bottom:8px;">Come Back Later</div>'
      + '<p style="font-size:12px;color:var(--td);line-height:1.7;">Your previous submission was not approved. You can reapply in <strong>' + days + ' day' + (days===1?'':'s') + '</strong>.</p>'
      + '</div>');
    return;
  }
  if (ME.verifPermanentBan) {
    setModal('<button class="mclose" onclick="closeModal()">&#x2715;</button>'
      + '<div style="text-align:center;padding:20px 0;">'
      + '<div style="font-size:40px;margin-bottom:12px;">&#x1F6AB;</div>'
      + '<div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:800;font-size:16px;margin-bottom:8px;">Verification Unavailable</div>'
      + '<p style="font-size:12px;color:var(--td);">Your verification status was permanently removed due to a policy violation.</p>'
      + '</div>');
    return;
  }
  _vwWorks = ME.verifDraft || [];
  renderVerifModal();
};

function renderVerifModal() {
  var count = _vwWorks.length;
  var maxWorks = 5;
  var minWorks = 2;
  var canSubmit = count >= minWorks;

  // Progress dots
  var dots = '';
  for (var i = 0; i < maxWorks; i++) {
    var cls = i < count ? 'done' : (i === count ? 'active' : '');
    dots += '<div class="vw-prog-dot ' + cls + '"></div>';
    if (i < maxWorks - 1) dots += '<div style="flex:1;height:2px;background:' + (i < count ? 'var(--grn)' : 'var(--br)') + ';border-radius:2px;"></div>';
  }

  var mh = '<button class="mclose" onclick="closeModal()">&#x2715;</button>';
  mh += '<div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:800;font-size:16px;margin-bottom:4px;">&#x2B50; Apply for Verification</div>';
  mh += '<div style="font-size:11px;color:var(--td);margin-bottom:14px;">Submit 2-5 works with proof of ownership. Admin will review within 48 hours.</div>';

  // Progress
  mh += '<div class="vw-progress">' + dots + '<span style="font-size:10px;color:var(--td);margin-left:4px;white-space:nowrap;">' + count + '/' + maxWorks + '</span></div>';

  // Existing works
  for (var wi = 0; wi < _vwWorks.length; wi++) {
    var w = _vwWorks[wi];
    mh += '<div class="vw-item">';
    mh += '<div class="vw-item-header">';
    mh += '<div style="display:flex;align-items:center;gap:8px;"><div class="vw-num done">' + (wi+1) + '</div>';
    mh += '<div style="font-size:11px;font-weight:600;">' + (w.description || 'Work ' + (wi+1)) + '</div></div>';
    mh += '<button onclick="removeVerifWork(' + wi + ')" style="background:none;border:none;color:var(--td);cursor:pointer;font-size:16px;">&#x1F5D1;</button>';
    mh += '</div>';
    mh += '<div style="display:flex;gap:8px;">';
    if (w.export) mh += '<img src="' + w.export + '" style="width:80px;height:60px;object-fit:cover;border-radius:6px;" alt="Work">';
    if (w.proof) mh += '<div style="position:relative;"><img src="' + w.proof + '" style="width:80px;height:60px;object-fit:cover;border-radius:6px;border:2px solid var(--gld);" alt="Proof"><div style="position:absolute;bottom:2px;left:2px;background:var(--gld);color:#000;font-size:7px;font-weight:700;padding:1px 4px;border-radius:3px;">PROOF</div></div>';
    mh += '</div></div>';
  }

  // Add work button
  if (count < maxWorks) {
    mh += '<button class="btn2" id="vw-add-btn" style="width:100%;margin-bottom:12px;border-style:dashed;">+ Add Work (' + (count+1) + ' of ' + maxWorks + ')</button>';
  }

  // Submit button
  mh += '<button class="btn" id="vw-final-submit" style="width:100%;' + (!canSubmit ? 'opacity:.45;' : '') + '">';
  mh += canSubmit ? 'Submit for Review &#x2192;' : 'Add ' + (minWorks - count) + ' more work' + (minWorks-count===1?'':'s') + ' to submit';
  mh += '</button>';
  if (!canSubmit) mh += '<div style="font-size:10px;color:var(--td);text-align:center;margin-top:6px;">Minimum 2 works required</div>';

  setModal(mh);

  setTimeout(function() {
    var addBtn = document.getElementById('vw-add-btn');
    if (addBtn) addBtn.onclick = function() { openAddVerifWork(); };
    var submitBtn = document.getElementById('vw-final-submit');
    if (submitBtn) submitBtn.onclick = function(){ if(_vwWorks.length >= minWorks) submitVerifFinal(); else toast('Add at least '+minWorks+' works first.','bad'); };
  }, 50);
}

window.removeVerifWork = function(idx) {
  _vwWorks.splice(idx, 1);
  ME.verifDraft = _vwWorks;
  saveUser(ME);
  renderVerifModal();
};

window.openAddVerifWork = function() {
  var workData = { export: null, proof: null, proofType: 'screenshot', description: '' };

  var mh = '<button class="mclose" id="vaw-back">&#x2190; Back</button>';
  mh += '<div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:800;font-size:15px;margin-bottom:4px;">Add Work #' + (_vwWorks.length + 1) + '</div>';
  mh += '<div style="font-size:11px;color:var(--td);margin-bottom:14px;">Upload the finished work + proof you created it.</div>';

  // Description
  mh += '<div class="fg"><label class="fl">Work Title / Description</label>';
  mh += '<input class="fi" id="vaw-desc" placeholder="e.g. Brand identity for a Lagos startup"></div>';

  // Export upload
  mh += '<div class="fg"><label class="fl">&#x1F5BC; Finished Work <span style="font-size:9px;color:var(--td);">(JPG, PNG, MP4 screenshot, code screenshot)</span></label>';
  mh += '<label for="vaw-export-input" id="vaw-export-label" style="border:2px dashed var(--br);border-radius:8px;padding:16px;text-align:center;cursor:pointer;display:block;transition:border-color .2s;">';
  mh += '<div style="font-size:22px;margin-bottom:4px;">&#x1F4E4;</div>';
  mh += '<div style="font-size:11px;color:var(--td);" id="vaw-export-txt">Tap to upload finished work</div>';
  mh += '</label><input type="file" id="vaw-export-input" accept="image/*" style="display:none;" onchange="handleVawExport(this)"></div>';
  mh += '<div id="vaw-export-preview" style="display:none;margin-bottom:12px;"></div>';

  // Proof type selector
  mh += '<div class="fg"><label class="fl">&#x1F512; Proof of Ownership</label>';
  mh += '<div class="vw-proof-type">';
  mh += '<button class="vw-proof-btn active" id="vaw-pt-screenshot">&#x1F4F8; Screenshot<br><span style="font-size:9px;font-weight:400;">of raw/source file</span></button>';
  mh += '<button class="vw-proof-btn" id="vaw-pt-video">&#x1F3AC; Video Proof<br><span style="font-size:9px;font-weight:400;">30 sec max, screen recording</span></button>';
  mh += '</div>';

  // Proof instructions
  mh += '<div id="vaw-proof-hint" style="background:rgba(232,197,71,.06);border:1px solid rgba(232,197,71,.15);border-radius:8px;padding:10px;font-size:10px;color:var(--td);line-height:1.6;margin-bottom:10px;">';
  mh += '&#x1F4A1; <strong>Screenshot:</strong> Take a screenshot showing the work open in your design tool (Figma, Photoshop, VS Code, etc). The file name and your work should both be visible.</div>';

  // Proof upload
  mh += '<label for="vaw-proof-input" id="vaw-proof-label" style="border:2px dashed var(--br);border-radius:8px;padding:16px;text-align:center;cursor:pointer;display:block;border-color:rgba(232,197,71,.3);">';
  mh += '<div style="font-size:22px;margin-bottom:4px;">&#x1F512;</div>';
  mh += '<div style="font-size:11px;color:var(--gld);" id="vaw-proof-txt">Tap to upload proof</div>';
  mh += '</label><input type="file" id="vaw-proof-input" accept="image/*,video/*" style="display:none;" onchange="handleVawProof(this)"></div>';
  mh += '<div id="vaw-proof-preview" style="display:none;margin-bottom:12px;"></div>';

  mh += '<button class="btn" id="vaw-save-btn" style="width:100%;margin-top:6px;">Save Work &#x2192;</button>';

  setModal(mh);

  setTimeout(function() {
    document.getElementById('vaw-back').onclick = function() { renderVerifModal(); };
    document.getElementById('vaw-save-btn').onclick = function() { saveVerifWork(workData); };
    var ss=document.getElementById('vaw-pt-screenshot');if(ss)ss.onclick=function(){selectVawProofType('screenshot');};
    var sv=document.getElementById('vaw-pt-video');if(sv)sv.onclick=function(){selectVawProofType('video');};
  }, 50);

  window._vawData = workData;
};

window.selectVawProofType = function(type) {
  type = (type==='scr')?'screenshot':(type==='vid')?'video':type;
  window._vawData.proofType = type;
  document.getElementById('vaw-pt-screenshot').classList.toggle('active', type === 'screenshot');
  document.getElementById('vaw-pt-video').classList.toggle('active', type === 'video');
  var hint = document.getElementById('vaw-proof-hint');
  var inp = document.getElementById('vaw-proof-input');
  if (type === 'screenshot') {
    hint.innerHTML = '&#x1F4A1; <strong>Screenshot:</strong> Show the work open in your editor (Figma, Photoshop, VS Code, Excel etc). The file name and your work should both be visible.';
    inp.accept = 'image/*';
  } else {
    hint.innerHTML = "&#x1F4A1; <strong>Video (30 sec max):</strong> Record your screen showing you opening and navigating the source file. Speak your name and the date at the start.";
    inp.accept = 'image/*,video/*';
  }
};

window.handleVawExport = function(input) {
  var file = input.files[0]; if (!file) return;
  var reader = new FileReader();
  reader.onload = function(e) {
    var img = new Image();
    img.onload = function() {
      var canvas = document.createElement('canvas');
      var max = 1200; var w = img.width, h = img.height;
      if (w > max) { h = h*max/w; w = max; }
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      var data = canvas.toDataURL('image/jpeg', 0.8);
      window._vawData.export = data;
      var prev = document.getElementById('vaw-export-preview');
      var txt = document.getElementById('vaw-export-txt');
      if (prev) { prev.style.display='block'; prev.innerHTML='<img src="'+data+'" style="width:100%;max-height:200px;object-fit:cover;border-radius:8px;">'; }
      if (txt) txt.textContent = '✓ ' + file.name;
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
};

window.handleVawProof = function(input) {
  var file = input.files[0]; if (!file) return;
  var isVideo = file.type.startsWith('video/');
  if (isVideo && file.size > 50*1024*1024) { toast('Video must be under 50MB', 'bad'); return; }
  var reader = new FileReader();
  reader.onload = function(e) {
    if (isVideo) {
      window._vawData.proof = e.target.result;
      window._vawData.proofIsVideo = true;
      var prev = document.getElementById('vaw-proof-preview');
      var txt = document.getElementById('vaw-proof-txt');
      if (prev) { prev.style.display='block'; prev.innerHTML='<div style="background:var(--s2);border:1px solid rgba(232,197,71,.3);border-radius:8px;padding:12px;font-size:11px;color:var(--gld);">&#x1F3AC; Video uploaded: '+file.name+'</div>'; }
      if (txt) txt.textContent = '✓ ' + file.name;
    } else {
      var img = new Image();
      img.onload = function() {
        var canvas = document.createElement('canvas');
        var max = 1200; var w = img.width, h = img.height;
        if (w > max) { h = h*max/w; w = max; }
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        var data = canvas.toDataURL('image/jpeg', 0.8);
        window._vawData.proof = data;
        window._vawData.proofIsVideo = false;
        var prev = document.getElementById('vaw-proof-preview');
        var txt = document.getElementById('vaw-proof-txt');
        if (prev) { prev.style.display='block'; prev.innerHTML='<img src="'+data+'" style="width:100%;max-height:180px;object-fit:cover;border-radius:8px;border:2px solid var(--gld);">'; }
        if (txt) txt.textContent = '✓ ' + file.name;
      };
      img.src = e.target.result;
    }
  };
  reader.readAsDataURL(file);
};

window.saveVerifWork = function(workData) {
  var desc = (document.getElementById('vaw-desc').value||'').trim();
  if (!workData.export) { toast('Please upload your finished work.', 'bad'); return; }
  if (!workData.proof) { toast('Please upload proof of ownership.', 'bad'); return; }
  workData.description = desc || ('Work ' + (_vwWorks.length + 1));
  _vwWorks.push(JSON.parse(JSON.stringify(workData)));
  ME.verifDraft = _vwWorks;
  saveUser(ME);
  renderVerifModal();
};

window.submitVerifFinal = async function() {
  if (_vwWorks.length < 2) { toast('Add at least 2 works.', 'bad'); return; }
  var svId = 'sv_' + Date.now();
  // Store works separately to avoid huge user doc
  await fbSet('skillVerifications', svId, {
    id: svId,
    uid: ME.uid,
    name: ME.name,
    avatar: ME.avatar || null,
    gradient: ME.gradient || '#888',
    category: ME.category,
    title: ME.title || '',
    works: _vwWorks.map(function(w, i) {
      return {
        idx: i,
        description: w.description,
        export: w.export,
        proof: w.proof,
        proofType: w.proofType,
        proofIsVideo: w.proofIsVideo || false
      };
    }),
    status: 'pending',
    ts: Date.now()
  });
  ME.verificationStatus = 'pending';
  ME.verifDraft = [];
  _vwWorks = [];
  saveUser(ME);
  closeModal();
  toast('Submitted! Admin will review within 48 hours. +10 rep &#x1F31F;');
  renderMyProfile();
};

window.submitSkillReview = window.submitVerifFinal;


window.showQR=function(){
  var mh='<button class="mclose" id="qr-close">X</button>';
  mh+='<div style="text-align:center;">';
  mh+='<h3>My SkillID QR Code</h3>';
  mh+='<p>Share on CV or LinkedIn for instant verification</p>';
  mh+='<div style="display:flex;justify-content:center;margin:18px 0;"><div style="background:white;padding:14px;border-radius:10px;" id="qr-box"></div></div>';
  mh+='<div class="chain" style="justify-content:center;margin-bottom:14px;"><div class="cdot"></div><div class="chash">'+ME.skillId+'</div></div>';
  mh+='<button class="btn" id="qr-copy-btn">Copy SkillID</button>';
  mh+='</div>';
  setModal(mh);
  document.getElementById('qr-close').onclick=closeModal;
  document.getElementById('qr-copy-btn').onclick=function(){
    if(navigator.clipboard){
      navigator.clipboard.writeText(ME.skillId).then(function(){toast('SkillID copied!');});
    }else{toast(ME.skillId);}
  };
  setTimeout(function(){
    try{
      new QRCode(document.getElementById('qr-box'),{
        text:'SkillStamp|ID:'+ME.skillId+'|Name:'+ME.name+'|Cat:'+ME.category,
        width:170,height:170,colorDark:'#000',colorLight:'#fff'
      });
    }catch(e){
      var el=document.getElementById('qr-box');
      if(el) el.innerHTML='<div style="width:170px;height:170px;background:#fff;display:flex;align-items:center;justify-content:center;font-size:10px;color:#000;text-align:center;padding:10px;">'+ME.skillId+'</div>';
    }
  },200);
};

