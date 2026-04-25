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
// buildProfile — redesigned to match professional mockup
// ═══════════════════════════════════════════
function buildProfile(u,isOwn){
  var isClient=u.role==='employer';
  var endorsements=getEndorsements().filter(function(e){return e.toUid===u.uid;});
  var grad=u.gradient||'#1a6b3c';
  var avImg=u.avatar?'<img src="'+u.avatar+'" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">':initials(u.name);
  var isVerifiedBadge=u.badgeStatus==='verified'||u.badgeStatus==='expert'||u.badgeStatus==='elite';
  var isVerifiedUser=isVerifiedBadge;

  // ── BANNER ────────────────────────────────────────────────
  var bannerCSS=getBannerCSS(u);
  var changeBannerBtn=isOwn?'<button onclick="openBannerPicker()" class="prf-change-banner">🎨 Edit Banner</button>':'';
  var changePhotoBtn=isOwn?'<div class="prf-av-edit" onclick="openChangePhoto()">📸</div>':'';

  // ── AVATAR section (overlaps banner) ─────────────────────
  // Role badge pill
  var rolePill='';
  if(isClient){
    rolePill='<span class="prf-role-pill client">🏢 Client</span>';
  } else if(isVerifiedBadge){
    rolePill=''; // verified checkmark on name is enough
  } else {
    rolePill='<span class="prf-role-pill freelancer">Freelancer</span>';
  }

  // SkillID chip
  var skillIdChip='';
  if(!isClient&&isVerifiedBadge&&u.skillId){
    skillIdChip='<div class="prf-skillid-chip">Skill ID: '+u.skillId+'</div>';
  } else if(!isClient&&isOwn&&!isVerifiedBadge){
    skillIdChip='<div class="prf-skillid-chip unverified" onclick="openSubmitSkill()">⚡ Get Verified → unlock SkillID</div>';
  }

  // Availability badge (freelancers)
  var availBadge='';
  if(!isClient){
    var avail=u.available!==false;
    availBadge='<div class="prf-avail '+(avail?'open':'busy')+'"'+(isOwn?' onclick="toggleAvailability()"':'')+' style="cursor:'+(isOwn?'pointer':'default')+';">'
      +'<span class="prf-avail-dot"></span>'+(avail?'Available for work':'Currently busy')+'</div>';
  }

  // ── STATS ROW ─────────────────────────────────────────────
  var statsHtml='';
  if(isClient){
    var myGigs=getGigs().filter(function(g){return g.posterUid===u.uid;});
    var totalHires=myGigs.filter(function(g){return g.status==='hired'||g.status==='completed';}).length;
    var activeGigsC=myGigs.filter(function(g){return g.status==='hired';}).length;
    var gigsPosted=myGigs.length;
    var clientRating=u.clientRating||u.score||0;
    var reviewCount=u.reviewCount||0;

    statsHtml='<div class="prf-stats-grid">'
      +'<div class="prf-stat-box">'
        +'<div class="prf-stat-icon" style="background:rgba(77,159,255,.1);color:#4d9fff;">📋</div>'
        +'<div class="prf-stat-num">'+gigsPosted+'</div>'
        +'<div class="prf-stat-lbl">Gigs Posted</div>'
      +'</div>'
      +'<div class="prf-stat-box">'
        +'<div class="prf-stat-icon" style="background:rgba(74,222,128,.1);color:var(--grn);">👥</div>'
        +'<div class="prf-stat-num">'+totalHires+'</div>'
        +'<div class="prf-stat-lbl">Total Hires</div>'
      +'</div>'
      +'<div class="prf-stat-box">'
        +'<div class="prf-stat-icon" style="background:rgba(255,165,0,.1);color:#ffa500;">💼</div>'
        +'<div class="prf-stat-num">'+activeGigsC+'</div>'
        +'<div class="prf-stat-lbl">Active Gigs</div>'
      +'</div>'
      +'<div class="prf-stat-box">'
        +'<div class="prf-stat-icon" style="background:rgba(239,68,68,.08);color:#ef4444;">⭐</div>'
        +'<div class="prf-stat-num">'+(clientRating>0?clientRating.toFixed(1):'—')+'</div>'
        +'<div class="prf-stat-lbl">Client Rating'+(reviewCount?'<br><span style="font-size:9px;color:var(--td);">('+reviewCount+' reviews)</span>':'')+'</div>'
      +'</div>'
      +'</div>';
  } else {
    var _rt=u.score>0?u.score.toFixed(1):'—';
    var _gc=u.gigsCount||0;
    var _rawEarned=(u.wallet&&u.wallet.earned)||u.earned||0;
    var _earnedStr=_rawEarned>=1000?('$'+(_rawEarned/1000).toFixed(1)+'k'):('$'+_rawEarned.toLocaleString());
    var _reviews=u.reviewCount||0;

    statsHtml='<div class="prf-stats-row">'
      +'<div class="prf-stat-item">'
        +'<div class="prf-stat-icon-sm">⭐</div>'
        +'<div class="prf-stat-val">'+_rt+'</div>'
        +'<div class="prf-stat-sub">Rating'+(_reviews?' ('+_reviews+')':'')+'</div>'
      +'</div>'
      +'<div class="prf-stat-div"></div>'
      +'<div class="prf-stat-item">'
        +'<div class="prf-stat-icon-sm">💼</div>'
        +'<div class="prf-stat-val">'+_gc+'</div>'
        +'<div class="prf-stat-sub">Completed Gigs</div>'
      +'</div>'
      +'<div class="prf-stat-div"></div>'
      +'<div class="prf-stat-item">'
        +'<div class="prf-stat-icon-sm">💰</div>'
        +'<div class="prf-stat-val">'+_earnedStr+'</div>'
        +'<div class="prf-stat-sub">Total Earned</div>'
      +'</div>'
      +'</div>';
  }

  // ── CTA BUTTON ────────────────────────────────────────────
  var ctaBtn='';
  if(isOwn){
    if(isClient){
      ctaBtn='<button class="prf-cta-btn" onclick="openPostGig()" style="background:var(--grn);color:#000;">⊕ Post a Gig</button>';
    } else {
      ctaBtn=''; // edit profile handled via edit icon
    }
  } else {
    if(!isClient&&u.available!==false&&ME&&ME.role==='employer'){
      ctaBtn='<button class="prf-cta-btn" onclick="openHireMe(\''+u.uid+'\')">✈ Hire Me</button>';
    }
    if(!isClient){
      ctaBtn+='\n<button class="prf-endorse-btn" onclick="endorseUser(this)" data-uid="'+u.uid+'">🤝 Endorse '+u.name.split(' ')[0]+'</button>';
    }
  }

  // ── ABOUT section ─────────────────────────────────────────
  var bioText=u.bio||('No bio yet.'+(isOwn?' <a onclick="openEditProfile()" style="color:var(--gld);cursor:pointer;">Add one →</a>':''));
  var bioFull=bioText;
  var bioPreview=bioText.length>160?bioText.substring(0,160)+'…':bioText;
  var bioSection='<div class="prf-card">'
    +'<div class="prf-card-title">About</div>'
    +'<div class="prf-bio-text" id="prf-bio-short">'+bioPreview+'</div>'
    +(bioText.length>160
      ?'<div class="prf-bio-text" id="prf-bio-full" style="display:none;">'+bioFull+'</div>'
       +'<button class="prf-view-more" onclick="var s=document.getElementById(\'prf-bio-short\');var f=document.getElementById(\'prf-bio-full\');var b=this;if(f.style.display===\'none\'){f.style.display=\'\';s.style.display=\'none\';b.textContent=\'View less ↑\';}else{f.style.display=\'none\';s.style.display=\'\';b.textContent=\'View more ↓\';}">View more ↓</button>'
      :'')
    +'</div>';

  // ── EDIT BUTTONS (owner unverified freelancer) ─────────────
  var verifCta='';
  if(isOwn&&!isClient){
    var alreadyVerified=isVerifiedBadge;
    var pendingVerif=(u.verificationStatus==='pending');
    if(!alreadyVerified&&!pendingVerif){
      verifCta='<div class="prf-verif-banner" onclick="openSubmitSkill()">'
        +'<span style="font-size:16px;">⚡</span>'
        +'<div><div style="font-weight:700;font-size:12px;margin-bottom:2px;">Get Verified on SkillStamp</div>'
        +'<div style="font-size:10px;color:var(--td);">Stand out to clients · Unlock SkillID · Earn more</div></div>'
        +'<span style="color:var(--gld);font-size:12px;">→</span>'
        +'</div>';
    } else if(pendingVerif&&!alreadyVerified){
      verifCta='<div class="prf-verif-banner" style="background:rgba(232,197,71,.06);border-color:rgba(232,197,71,.25);">'
        +'<span style="font-size:16px;">⏳</span>'
        +'<div><div style="font-weight:700;font-size:12px;margin-bottom:2px;">Verification Under Review</div>'
        +'<div style="font-size:10px;color:var(--td);">Admin will review within 48 hours</div></div>'
        +'</div>';
    }
  }

  // ── SKILLS section (freelancers only) ─────────────────────
  var skillsSection='';
  if(!isClient&&(u.skills||[]).length){
    var sc={};
    getEndorsements().filter(function(e){return e.toUid===u.uid;}).forEach(function(e){sc[e.skill]=(sc[e.skill]||0)+1;});
    var sortedSkills=(u.skills||[]).slice().sort(function(a,b){return (sc[b]||0)-(sc[a]||0);});
    var chipsHtml=sortedSkills.map(function(s){
      var isVer=u.verifiedSkills&&u.verifiedSkills.indexOf(s)>=0;
      var cnt=sc[s]||0;
      return '<span class="prf-skill-chip'+(isVer?' verified':'')+'">'
        +(isVer?'★ ':'')+s
        +(cnt?'<span class="prf-skill-cnt">'+cnt+'</span>':'')
        +'</span>';
    }).join('');
    var verNote=u.verifiedSkills&&u.verifiedSkills.length?'<div class="prf-skill-note">★ = Verified by SkillStamp admin</div>':'';
    skillsSection='<div class="prf-card">'
      +'<div class="prf-card-title">⚡ Skills</div>'
      +'<div class="prf-skills-wrap">'+chipsHtml+'</div>'
      +verNote
      +'</div>';
  }

  // ── ENDORSEMENTS section ──────────────────────────────────
  var endorseBtn=!isOwn&&!isClient?'<button class="prf-endorse-chip" data-uid="'+u.uid+'" onclick="endorseUser(this)">🤝 Endorse '+u.name.split(' ')[0]+'</button>':'';
  var endorseItems='';
  if(endorsements.length){
    endorsements.slice(0,5).forEach(function(en){
      var enImg=en.fromAvatar?'<img src="'+en.fromAvatar+'" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">':initials(en.fromName);
      var enGrad=en.fromGrad||'#888';
      endorseItems+='<div class="prf-endorse-item">'
        +'<div class="prf-endorse-av" style="background:linear-gradient(135deg,'+enGrad+','+enGrad+'88);">'+enImg+'</div>'
        +'<div style="flex:1;min-width:0;">'
          +'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px;">'
            +'<span style="font-family:Plus Jakarta Sans,sans-serif;font-weight:700;font-size:12px;">'+en.fromName+'</span>'
            +'<span style="font-size:9px;color:var(--td);">'+timeAgo(en.ts||en.created)+'</span>'
          +'</div>'
          +'<div style="font-size:10px;color:var(--gld);margin-bottom:5px;">'+en.skill+'</div>'
          +'<div style="font-size:11px;color:var(--td);font-style:italic;line-height:1.6;">"'+en.comment+'"</div>'
        +'</div>'
      +'</div>';
    });
  } else {
    endorseItems='<div style="padding:16px 0;text-align:center;">'
      +'<div style="font-size:28px;margin-bottom:8px;opacity:.3;">🤝</div>'
      +'<div style="font-size:12px;color:var(--td);">No endorsements yet.</div>'
      +(isOwn?'':(endorseBtn?'<div style="margin-top:12px;">'+endorseBtn+'</div>':''))
      +'</div>';
    endorseBtn='';
  }
  var endorseSection='<div class="prf-card">'
    +'<div class="prf-card-title" style="display:flex;align-items:center;justify-content:space-between;">'
      +'<span>🤝 Peer Endorsements <span style="font-size:10px;font-weight:400;color:var(--td);">('+endorsements.length+')</span></span>'
      +endorseBtn
    +'</div>'
    +endorseItems
    +'</div>';

  // ── IDENTITY sidebar card ─────────────────────────────────
  var identityCard='<div class="prf-side-card">'
    +'<div class="prf-side-title">🔐 Identity</div>'
    +(isClient
      ?'<div class="prf-side-row"><span class="prf-side-lbl">Role</span><span class="prf-side-val" style="color:#4d9fff;">Client</span></div>'
      :((isVerifiedBadge&&u.skillId?'<div class="prf-side-row"><span class="prf-side-lbl">SkillID</span><span class="prf-side-val" style="color:var(--gld);font-size:9px;">'+u.skillId+'</span></div>':'<div class="prf-side-row"><span class="prf-side-lbl">SkillID</span><span class="prf-side-val" style="color:var(--td);font-size:10px;">Not verified</span></div>')
       +'<div class="prf-side-row"><span class="prf-side-lbl">Badge</span><span>'+badgeHTML(u.badgeStatus)+'</span></div>')
    )
    +'<div class="prf-side-row"><span class="prf-side-lbl">Country</span><span class="prf-side-val">'+flag(u.country)+' '+u.country+'</span></div>'
    +'<div class="prf-side-row"><span class="prf-side-lbl">Category</span><span class="prf-side-val">'+(CAT_ICONS[u.category]||'')+' '+u.category+'</span></div>'
    +'<div class="prf-side-row"><span class="prf-side-lbl">Member since</span><span class="prf-side-val">'+timeAgo(u.created||Date.now())+'</span></div>'
    +'</div>';

  // ── WALLET sidebar card (own only) ────────────────────────
  var walletCard='';
  if(isOwn){
    if(isClient){
      var myGigsW=getGigs().filter(function(g){return g.posterUid===u.uid;});
      var totalPaidW=myGigsW.filter(function(g){return g.status==='completed';}).reduce(function(s,g){return s+(g.escrowAmount||0);},0);
      walletCard='<div class="prf-side-card">'
        +'<div class="prf-side-title">📊 Activity</div>'
        +'<div class="prf-side-row"><span class="prf-side-lbl">Gigs Posted</span><span class="prf-side-val" style="color:#4d9fff;">'+(myGigsW.length)+'</span></div>'
        +'<div class="prf-side-row"><span class="prf-side-lbl">Total Paid</span><span class="prf-side-val" style="color:var(--grn);">$'+totalPaidW.toLocaleString()+'</span></div>'
        +'<div class="prf-side-row"><span class="prf-side-lbl">Balance</span><span class="prf-side-val" style="color:var(--gld);">$'+((u.wallet&&u.wallet.balance)||0).toLocaleString()+'</span></div>'
        +'<button class="prf-side-btn" onclick="goWallet()">View Wallet →</button>'
        +'</div>';
    } else {
      walletCard='<div class="prf-side-card">'
        +'<div class="prf-side-title">💳 Wallet</div>'
        +'<div class="prf-side-row"><span class="prf-side-lbl">Balance</span><span class="prf-side-val" style="color:var(--grn);">$'+((u.wallet&&u.wallet.balance)||0).toLocaleString()+'</span></div>'
        +'<div class="prf-side-row"><span class="prf-side-lbl">Total Earned</span><span class="prf-side-val">$'+((u.wallet&&u.wallet.earned)||u.earned||0).toLocaleString()+'</span></div>'
        +'<button class="prf-side-btn" onclick="goWallet()">View Full Wallet →</button>'
        +'</div>';
    }
  }

  // ── EDIT PROFILE button (own profile) ─────────────────────
  var editProfileBtn=isOwn?'<button class="prf-edit-btn" onclick="openEditProfile()">✏️ Edit Profile</button>':'';

  // ── FOOTER (own only) ─────────────────────────────────────
  var footer=isOwn
    ?'<div class="prf-footer">'
      +'<span onclick="showTos()" style="cursor:pointer;color:var(--gld);text-decoration:underline;">Terms</span>'
      +' · <span onclick="showPrivacy()" style="cursor:pointer;color:var(--gld);text-decoration:underline;">Privacy</span>'
      +' · <span onclick="openChangePassword()" style="cursor:pointer;color:var(--td);">🔑 Change Password</span>'
      +'<div style="font-size:9px;margin-top:6px;color:var(--td);">© 2025 SkillStamp · Tega Technologies · NDPA 2023</div>'
      +'</div>'
    :'';

  // ── SKILLID CARD (own verified freelancer) ─────────────────
  var skillIdCard='';
  if(isOwn&&!isClient&&isVerifiedBadge&&u.skillId){
    var infoRows=[['Name',u.name],['Country',flag(u.country)+' '+u.country],['Category',(CAT_ICONS[u.category]||'')+' '+u.category]];
    var infoHtml=infoRows.map(function(r){
      return '<div style="text-align:center;"><div style="font-size:8px;color:rgba(255,255,255,.5);text-transform:uppercase;letter-spacing:.06em;margin-bottom:2px;">'+r[0]+'</div><div style="font-size:10px;font-family:Plus Jakarta Sans,sans-serif;font-weight:600;color:#fff;">'+r[1]+'</div></div>';
    }).join('');
    skillIdCard='<div class="skillid-card">'
      +'<div style="font-size:9px;color:rgba(255,255,255,.6);text-transform:uppercase;letter-spacing:.12em;margin-bottom:3px;">SkillStamp ID</div>'
      +'<div class="sid-num">'+u.skillId+'</div>'
      +'<div style="display:flex;gap:18px;margin-top:14px;position:relative;z-index:1;">'+infoHtml+'</div>'
      +'</div>';
  }

  // ── ASSEMBLE ──────────────────────────────────────────────
  return ''
    // Banner
    +'<div class="prf-banner" style="background:'+bannerCSS+';">'+changeBannerBtn+'</div>'

    // Header card — avatar overlaps banner
    +'<div class="prf-header-card">'
      +'<div class="prf-av-wrap">'
        +'<div class="prf-av-circle" style="background:linear-gradient(135deg,'+grad+','+grad+'88);">'+avImg+'</div>'
        +(isClient?'<div class="prf-av-role-icon">💼</div>':'')
        +changePhotoBtn
      +'</div>'
      +'<div class="prf-header-info">'
        +'<div class="prf-name">'+u.name+(isVerifiedBadge?' <span class="prf-check">'+verifiedSVG(getVerifColor())+'</span>':'')+'</div>'
        +rolePill
        +(u.title&&!isClient?'<div class="prf-title-sub">'+u.title+'</div>':'')
        +'<div class="prf-country">'+flag(u.country)+' '+u.country+'</div>'
        +availBadge
        +skillIdChip
      +'</div>'
      // CTA buttons
      +'<div class="prf-cta-wrap">'
        +ctaBtn
        +(isOwn?editProfileBtn:'')
      +'</div>'
    +'</div>'

    // Stats
    +'<div class="prf-stats-wrap">'+statsHtml+'</div>'

    // Main layout: content + sidebar
    +'<div class="prf-layout">'
      // Left: main content
      +'<div class="prf-main">'
        +verifCta
        +skillIdCard
        +bioSection
        +(!isClient?skillsSection:'')
        +(!isClient?buildPortfolio(u,isOwn):'')
        +buildWorkHistory(u)
        +endorseSection
        +footer
      +'</div>'
      // Right: sidebar
      +'<div class="prf-sidebar">'
        +identityCard
        +walletCard
      +'</div>'
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

