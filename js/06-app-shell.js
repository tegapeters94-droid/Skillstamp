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
  if(!ME||ME.role!=='freelancer') return;

  // ── Session gate: show once per login session only ──────
  var sessKey='pc_shown_'+ME.uid;
  try{ if(sessionStorage.getItem(sessKey)) return; }catch(e){}

  // ── Freshly read completion from ME (Firebase-synced on login) ──
  var checks={
    bio:  !!(ME.bio&&ME.bio.length>=10),
    skills:!!(ME.skills&&ME.skills.length>0),
    photo:!!ME.avatar,
    title:!!(ME.title&&ME.title!=='Digital Professional')
  };
  var fields=Object.keys(checks);
  var done=fields.filter(function(k){return checks[k];}).length;
  var total=fields.length;
  var pct=Math.round((done/total)*100);

  if(pct>=100){
    setTimeout(maybeShowVerifNudge,400);
    return;
  }

  // Mark shown for this session immediately
  try{ sessionStorage.setItem(sessKey,'1'); }catch(e){}

  var tipMap={
    bio:  {label:'Add a bio',    desc:'Let clients know who you are and what you do.'},
    skills:{label:'Add skills',  desc:'Get discovered by clients searching your expertise.'},
    photo:{label:'Upload a photo',desc:'Profiles with photos earn 4× more trust.'},
    title:{label:'Set your title',desc:'Your professional headline — make it count.'}
  };

  // Build checklist — completed items show green tick, missing show grey circle
  var itemsHTML=fields.map(function(k){
    var done_=checks[k];
    var t=tipMap[k];
    var indicator=done_
      ? '<svg width="20" height="20" viewBox="0 0 20 20"><circle cx="10" cy="10" r="9" fill="#16a34a"/><polyline points="5,10 8.5,13.5 15,7" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
      : '<div style="width:20px;height:20px;border-radius:50%;border:2px solid #d1d5db;"></div>';
    return '<div style="display:flex;align-items:center;gap:12px;padding:11px 0;border-bottom:1px solid #f3f4f6;">'
      +'<div style="flex:1;">'
      +'<div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:600;font-size:13px;color:'+(done_?'#9ca3af':'#111827')+(done_?';text-decoration:line-through':'')+';">'+t.label+'</div>'
      +'<div style="font-size:11px;color:#6b7280;line-height:1.4;margin-top:1px;">'+t.desc+'</div>'
      +'</div>'
      +'<div style="flex-shrink:0;transition:all .3s ease;">'+indicator+'</div>'
      +'</div>';
  }).join('');

  var arcR=22, arcC=2*Math.PI*arcR;

  var html=
    '<button class="mclose" id="pc-close" style="z-index:2;color:#374151;">✕</button>'
    // Header card — light
    +'<div style="background:linear-gradient(135deg,#f0fdf4,#dcfce7);border-radius:16px;padding:18px 16px 14px;margin-bottom:16px;border:1px solid #bbf7d0;">'
    +'<div style="display:flex;align-items:center;gap:14px;">'
    // Animated SVG ring
    +'<div style="position:relative;width:60px;height:60px;flex-shrink:0;">'
    +'<svg id="pc-ring-svg" width="60" height="60" viewBox="0 0 60 60" style="transform:rotate(-90deg);">'
    +'<circle cx="30" cy="30" r="'+arcR+'" fill="none" stroke="#e5e7eb" stroke-width="4"/>'
    +'<circle id="pc-ring-arc" cx="30" cy="30" r="'+arcR+'" fill="none" stroke="#16a34a" stroke-width="4" stroke-linecap="round"'
    +' stroke-dasharray="0 '+arcC+'" style="transition:stroke-dasharray .9s cubic-bezier(.34,1.2,.64,1);"/>'
    +'</svg>'
    +'<div id="pc-ring-pct" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-family:Plus Jakarta Sans,sans-serif;font-weight:800;font-size:13px;color:#111827;">0%</div>'
    +'</div>'
    +'<div style="flex:1;">'
    +'<div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:800;font-size:15px;color:#111827;margin-bottom:3px;">Unlock Your Full Potential</div>'
    +'<div style="font-size:11px;color:#4b5563;line-height:1.5;">Complete profiles get <strong style="color:#16a34a;">3× more views</strong> from premium clients.</div>'
    +'</div>'
    +'</div>'
    +'</div>'
    // Checklist
    +itemsHTML
    // Actions
    +'<div style="display:flex;gap:8px;margin-top:16px;">'
    +'<button id="pc-go" style="flex:1;padding:13px;background:linear-gradient(135deg,#16a34a,#15803d);color:#fff;font-family:Plus Jakarta Sans,sans-serif;font-weight:800;font-size:12px;border:none;border-radius:12px;cursor:pointer;box-shadow:0 4px 14px rgba(22,163,74,.35);letter-spacing:.01em;">Complete Profile →</button>'
    +'<button id="pc-later" style="padding:13px 16px;background:#f9fafb;border:1px solid #e5e7eb;color:#6b7280;font-family:Plus Jakarta Sans,sans-serif;font-weight:600;font-size:11px;border-radius:12px;cursor:pointer;">Later</button>'
    +'</div>';

  setModal(html);

  // Light modal styling
  var mc=document.getElementById('mcontent');
  if(mc){
    mc.style.background='#ffffff';
    mc.style.backdropFilter='blur(8px)';
    mc.style.WebkitBackdropFilter='blur(8px)';
    mc.style.border='1px solid #e5e7eb';
    mc.style.boxShadow='0 20px 60px rgba(0,0,0,.12)';
  }
  var ov=document.getElementById('moverlay');
  if(ov) ov.style.background='rgba(0,0,0,.45)';

  // Animate ring after paint
  setTimeout(function(){
    var arc=document.getElementById('pc-ring-arc');
    var pctEl=document.getElementById('pc-ring-pct');
    if(arc){ arc.style.strokeDasharray=(pct/100)*arcC+' '+arcC; }
    if(pctEl){ pctEl.textContent=pct+'%'; }
  },80);

  setTimeout(function(){
    var c=document.getElementById('pc-close');
    var g=document.getElementById('pc-go');
    var l=document.getElementById('pc-later');
    if(c) c.onclick=function(){closeModal();if(mc){mc.style.background='';mc.style.border='';mc.style.boxShadow='';}if(ov)ov.style.background='';};
    if(g) g.onclick=function(){
      closeModal();
      if(mc){mc.style.background='';mc.style.border='';mc.style.boxShadow='';}
      if(ov)ov.style.background='';
      showPage('myprofile');
      setTimeout(function(){var eb=document.getElementById('edit-profile-btn');if(eb)eb.click();},400);
    };
    // Later: close for this session only (sessionStorage already set)
    if(l) l.onclick=function(){
      closeModal();
      if(mc){mc.style.background='';mc.style.border='';mc.style.boxShadow='';}
      if(ov)ov.style.background='';
    };
  },50);
}

// ── VERIFICATION NUDGE ─────────────────────────────────────────
function maybeShowVerifNudge(){
  if(!ME||ME.role!=='freelancer') return;
  if(ME.badgeStatus==='verified'||ME.badgeStatus==='expert'||ME.badgeStatus==='elite') return;
  var lk='vn_logins_'+ME.uid;
  var count=(LOCAL.get(lk)||0)+1;
  LOCAL.set(lk,count);
  if(count!==1&&count%3!==0) return;
  if(LOCAL.get('vn_snoozed_'+ME.uid)>Date.now()) return;
  var isInReview=ME.badgeStatus==='review';
  var html=
    '<button class="mclose" id="vn-close" style="z-index:2;">✕</button>'
    +'<div style="text-align:center;padding:8px 0 18px;">'
    +'<div style="display:inline-flex;align-items:center;justify-content:center;width:64px;height:64px;border-radius:20px;background:linear-gradient(135deg,rgba(26,107,60,.3),rgba(26,107,60,.1));border:1.5px solid rgba(26,107,60,.4);margin-bottom:14px;font-size:30px;backdrop-filter:blur(8px);">🏅</div>'
    +(isInReview
      ?'<div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:800;font-size:17px;margin-bottom:6px;color:var(--tx);">Verification in Progress</div>'
       +'<div style="font-size:11px;color:var(--td);line-height:1.6;max-width:280px;margin:0 auto 16px;">Our team is reviewing your submission. You\'ll be notified the moment your SkillID badge is live.</div>'
      :'<div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:800;font-size:17px;margin-bottom:6px;color:var(--tx);">Unlock Your SkillID Badge</div>'
       +'<div style="font-size:11px;color:var(--td);line-height:1.6;max-width:280px;margin:0 auto 16px;">Verified freelancers stand out. Here\'s what you unlock:</div>'
    )+'</div>'
    +(isInReview?'':
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px;">'
      +[
        {icon:'📬',label:'Unlimited Proposals',desc:'No proposal cap — apply to every gig.'},
        {icon:'🔝',label:'Priority Placement',desc:'Appear first in talent search results.'},
        {icon:'🔒',label:'Escrow Protected',desc:'Full payment protection on all gigs.'},
        {icon:'💎',label:'Premium Badge',desc:'SkillID badge on your profile + QR card.'}
      ].map(function(b){
        return '<div style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:12px 10px;backdrop-filter:blur(4px);">'
          +'<div style="font-size:18px;margin-bottom:6px;">'+b.icon+'</div>'
          +'<div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:700;font-size:11px;color:var(--tx);margin-bottom:2px;">'+b.label+'</div>'
          +'<div style="font-size:10px;color:var(--td);line-height:1.4;">'+b.desc+'</div>'
          +'</div>';
      }).join('')
      +'</div>'
      +'<div style="background:rgba(26,107,60,.1);border:1px solid rgba(26,107,60,.2);border-radius:10px;padding:10px 12px;display:flex;align-items:center;gap:10px;margin-bottom:16px;">'
      +'<div style="font-size:13px;">📈</div>'
      +'<div style="font-size:11px;color:var(--td);line-height:1.5;"><strong style="color:#4ade80;">Verified freelancers earn 2.8× more</strong> on average than unverified profiles.</div>'
      +'</div>'
    )
    +'<div style="display:flex;gap:8px;">'
    +(isInReview
      ?'<button id="vn-ok" style="flex:1;padding:13px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);color:var(--tx);font-family:Plus Jakarta Sans,sans-serif;font-weight:700;font-size:12px;border-radius:12px;cursor:pointer;">Got it — I\'ll wait</button>'
      :'<button id="vn-go" style="flex:1;padding:13px;background:linear-gradient(135deg,#1a6b3c,#0f4a28);color:#fff;font-family:Plus Jakarta Sans,sans-serif;font-weight:800;font-size:12px;border:none;border-radius:12px;cursor:pointer;letter-spacing:.01em;">Get Verified Now →</button>'
       +'<button id="vn-later" style="padding:13px 16px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);color:var(--td);font-family:Plus Jakarta Sans,sans-serif;font-weight:600;font-size:11px;border-radius:12px;cursor:pointer;">Not now</button>'
    )+'</div>';

  setModal(html);
  var mc=document.getElementById('mcontent');
  if(mc){mc.style.backdropFilter='blur(24px)';mc.style.WebkitBackdropFilter='blur(24px)';mc.style.border='1px solid rgba(255,255,255,.08)';}

  setTimeout(function(){
    var cl=document.getElementById('vn-close');
    if(cl) cl.onclick=function(){closeModal();LOCAL.set('vn_snoozed_'+ME.uid,Date.now()+86400000*7);};
    var go=document.getElementById('vn-go');
    if(go) go.onclick=function(){closeModal();showPage('myprofile');setTimeout(function(){var vb=document.getElementById('verify-btn');if(vb)vb.click();},400);};
    var ok=document.getElementById('vn-ok');
    if(ok) ok.onclick=closeModal;
    var later=document.getElementById('vn-later');
    if(later) later.onclick=function(){closeModal();LOCAL.set('vn_snoozed_'+ME.uid,Date.now()+86400000*3);};
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

// ── CINEMATIC ONBOARDING ──────────────────────────────────────
// Uses @lottiefiles/lottie-player web component — most reliable CDN approach
function _ensureLottiePlayer(cb){
  if(customElements.get('lottie-player')){ cb(); return; }
  var s=document.createElement('script');
  s.src='https://unpkg.com/@lottiefiles/lottie-player@latest/dist/lottie-player.js';
  s.onload=function(){ setTimeout(cb,100); };
  s.onerror=function(){ cb(); }; // graceful fallback — animations just won't play
  document.head.appendChild(s);
}

// Public Lottie animation URLs (royalty-free, LottieFiles CDN)
var OB_LOTTIES=[
  'https://assets10.lottiefiles.com/packages/lf20_uwWgICKCxj.json', // globe / network
  'https://assets9.lottiefiles.com/packages/lf20_qp1q7mct.json',   // search / scan
  'https://assets5.lottiefiles.com/packages/lf20_xvmprfgt.json',   // shield / security
  'https://assets6.lottiefiles.com/packages/lf20_jcikwtux.json',   // badge / stamp
  'https://assets2.lottiefiles.com/packages/lf20_jR229r.json'      // checkmark / success
];

function showOnboarding(){
  if(document.getElementById('ob-cinematic')) return;
  LOCAL.set('ob_done_'+ME.uid,'1');
  _buildCinematicOnboarding();
}

function _buildCinematicOnboarding(){
  var isClient=ME.role==='employer'||ME.role==='client';

  var pages=[
    {tag:'The Platform',  headline:'Welcome to the<br>Future of Work.',         sub:'SkillStamp connects Africa\'s elite digital talent with global opportunities through a high-trust, verified ecosystem.',lottieIdx:0},
    {tag:'Smart Matching',headline:'Precision<br>Matching.',                    sub:'No more bidding wars. Our engine pairs your exact skills to the right gigs — instantly and intelligently.',lottieIdx:1},
    {tag:'Security',      headline:'Work with<br>Peace of Mind.',               sub:'Your payments are protected. Our Communication Guard and Escrow system ensure you get paid for every milestone.',lottieIdx:2},
    {tag:'Verification',  headline:'Stand Out<br>from the Crowd.',              sub:'Earn your SkillID badge and unlock 3× more visibility from premium clients worldwide.',lottieIdx:3},
    {tag:'Get Started',   headline:'Ready to Build<br>Your Legacy?',            sub:'Join thousands of verified African professionals. Your first gig is waiting.',lottieIdx:4,isCta:true}
  ];

  // ── Inject CSS ──────────────────────────────────────────
  if(!document.getElementById('ob-style')){
    var st=document.createElement('style');
    st.id='ob-style';
    st.textContent=
      '#ob-cinematic{'
        +'position:fixed;inset:0;z-index:99990;'
        +'background:#ffffff;'
        +'overflow:hidden;'
        +'font-family:"Plus Jakarta Sans",sans-serif;'
        +'display:flex;flex-direction:column;'
        +'touch-action:pan-y;'
      '}'
      +'.ob-track{'
        +'display:flex;flex-direction:row;'
        +'width:500%;height:100%;'
        +'transition:transform .38s cubic-bezier(.4,0,.2,1);'
        +'will-change:transform;'
      '}'
      +'.ob-page{'
        +'width:20%;height:100%;flex-shrink:0;'
        +'display:flex;flex-direction:column;'
        +'align-items:center;justify-content:flex-end;'
        +'padding:0 0 44px;'
        +'position:relative;overflow:hidden;'
      '}'
      +'.ob-bg-accent{'
        +'position:absolute;top:-10%;left:50%;transform:translateX(-50%);'
        +'width:380px;height:380px;border-radius:50%;'
        +'background:radial-gradient(circle,rgba(22,163,74,.07) 0%,transparent 70%);'
        +'pointer-events:none;'
      '}'
      +'.ob-anim-zone{'
        +'position:absolute;top:0;left:0;right:0;bottom:46%;'
        +'display:flex;align-items:center;justify-content:center;'
        +'pointer-events:none;'
      '}'
      +'lottie-player.ob-lottie{'
        +'width:200px;height:200px;'
      '}'
      +'.ob-content{'
        +'position:relative;z-index:2;'
        +'width:100%;padding:0 28px;'
        +'text-align:center;'
      '}'
      +'.ob-tag{'
        +'display:inline-block;'
        +'font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;'
        +'color:#16a34a;'
        +'background:rgba(22,163,74,.08);'
        +'border:1px solid rgba(22,163,74,.2);'
        +'border-radius:20px;padding:4px 12px;'
        +'margin-bottom:16px;'
      '}'
      +'.ob-headline{'
        +'font-size:clamp(26px,7vw,32px);font-weight:800;line-height:1.18;'
        +'color:#111827;letter-spacing:-.02em;'
        +'margin-bottom:12px;'
      '}'
      +'.ob-sub{'
        +'font-size:14px;font-weight:400;line-height:1.65;'
        +'color:#4b5563;'
        +'max-width:320px;margin:0 auto 26px;'
      '}'
      +'.ob-dots{'
        +'display:flex;gap:6px;align-items:center;justify-content:center;'
        +'margin-bottom:20px;'
      '}'
      +'.ob-dot{'
        +'width:6px;height:6px;border-radius:3px;'
        +'background:#d1d5db;'
        +'transition:all .3s ease;'
      '}'
      +'.ob-dot.active{width:22px;background:#16a34a;}'
      +'.ob-nav{'
        +'display:flex;align-items:center;justify-content:space-between;'
        +'padding:0 28px;width:100%;box-sizing:border-box;'
      '}'
      +'.ob-skip{'
        +'background:none;border:none;'
        +'color:#9ca3af;'
        +'font-family:"Plus Jakarta Sans",sans-serif;'
        +'font-size:12px;font-weight:500;'
        +'cursor:pointer;padding:10px 0;'
        +'transition:color .2s;'
      '}'
      +'.ob-skip:active{color:#6b7280;}'
      +'.ob-next{'
        +'background:linear-gradient(135deg,#16a34a,#15803d);'
        +'border:none;color:#fff;'
        +'font-family:"Plus Jakarta Sans",sans-serif;'
        +'font-weight:800;font-size:13px;'
        +'padding:13px 28px;border-radius:50px;'
        +'cursor:pointer;'
        +'box-shadow:0 4px 20px rgba(22,163,74,.4);'
        +'transition:transform .15s,box-shadow .15s;'
        +'letter-spacing:.01em;'
      '}'
      +'.ob-next:active{transform:scale(.96);box-shadow:0 2px 10px rgba(22,163,74,.3);}'
      +'.ob-cta-wrap{'
        +'width:100%;padding:0 28px;box-sizing:border-box;'
        +'display:flex;flex-direction:column;gap:10px;'
        +'margin-bottom:12px;'
      '}'
      +'.ob-cta-main{'
        +'width:100%;padding:15px;'
        +'background:linear-gradient(135deg,#16a34a,#15803d);'
        +'border:none;color:#fff;'
        +'font-family:"Plus Jakarta Sans",sans-serif;'
        +'font-weight:800;font-size:14px;'
        +'border-radius:16px;cursor:pointer;'
        +'box-shadow:0 4px 20px rgba(22,163,74,.4);'
        +'transition:transform .15s;'
      '}'
      +'.ob-cta-main:active{transform:scale(.98);}'
      +'.ob-cta-ghost{'
        +'width:100%;padding:13px;'
        +'background:#f9fafb;'
        +'border:1px solid #e5e7eb;'
        +'color:#374151;'
        +'font-family:"Plus Jakarta Sans",sans-serif;'
        +'font-weight:600;font-size:13px;'
        +'border-radius:16px;cursor:pointer;'
      '}';
    document.head.appendChild(st);
  }

  // ── Build DOM ───────────────────────────────────────────
  var wrap=document.createElement('div');
  wrap.id='ob-cinematic';
  var track=document.createElement('div');
  track.className='ob-track';

  pages.forEach(function(pg,i){
    var page=document.createElement('div');
    page.className='ob-page';

    var accent=document.createElement('div');
    accent.className='ob-bg-accent';
    page.appendChild(accent);

    // Animation zone
    var az=document.createElement('div');
    az.className='ob-anim-zone';
    // Placeholder shown before lottie-player loads
    var placeholder=document.createElement('div');
    placeholder.id='ob-ph-'+i;
    placeholder.style.cssText='width:200px;height:200px;display:flex;align-items:center;justify-content:center;';
    placeholder.innerHTML='<div style="width:80px;height:80px;border-radius:50%;background:linear-gradient(135deg,rgba(22,163,74,.12),rgba(22,163,74,.04));border:2px solid rgba(22,163,74,.15);display:flex;align-items:center;justify-content:center;font-size:32px;">'
      +(['🌐','🎯','🛡️','🏅','✅'][i])+'</div>';
    az.appendChild(placeholder);
    page.appendChild(az);

    // Content
    var con=document.createElement('div');
    con.className='ob-content';
    if(!pg.isCta){
      con.innerHTML='<div class="ob-tag">'+pg.tag+'</div>'
        +'<div class="ob-headline">'+pg.headline+'</div>'
        +'<div class="ob-sub">'+pg.sub+'</div>';
    } else {
      con.innerHTML='<div class="ob-tag">'+pg.tag+'</div>'
        +'<div class="ob-headline">'+pg.headline+'</div>'
        +'<div class="ob-sub">'+pg.sub+'</div>';
    }
    page.appendChild(con);

    // Dots
    var dotsDiv=document.createElement('div');
    dotsDiv.className='ob-dots';
    pages.forEach(function(_2,di){
      var d=document.createElement('div');
      d.className='ob-dot'+(di===i?' active':'');
      d.id='ob-dot-'+i+'-'+di;
      dotsDiv.appendChild(d);
    });
    page.appendChild(dotsDiv);

    if(!pg.isCta){
      var nav=document.createElement('div');
      nav.className='ob-nav';
      nav.innerHTML='<button class="ob-skip" id="ob-skip-'+i+'">Skip</button>'
        +'<button class="ob-next" id="ob-next-'+i+'">Next →</button>';
      page.appendChild(nav);
    } else {
      var ctaWrap=document.createElement('div');
      ctaWrap.className='ob-cta-wrap';
      if(isClient){
        ctaWrap.innerHTML='<button class="ob-cta-main" id="ob-cta-main">💼 Post Your First Gig →</button>'
          +'<button class="ob-cta-ghost" id="ob-cta-sec">Browse Talent</button>';
      } else {
        ctaWrap.innerHTML='<button class="ob-cta-main" id="ob-cta-main">🔍 Browse Open Gigs →</button>'
          +'<button class="ob-cta-ghost" id="ob-cta-sec">Complete My Profile</button>';
      }
      page.appendChild(ctaWrap);
    }

    track.appendChild(page);
  });

  wrap.appendChild(track);
  document.body.appendChild(wrap);

  // ── State ───────────────────────────────────────────────
  var cur=0;
  var total=pages.length;
  var lottiesInited={};

  function goTo(idx){
    if(idx<0||idx>=total) return;
    cur=idx;
    track.style.transform='translateX(-'+(cur*(100/total))+'%)';
    pages.forEach(function(_,pi){
      pages.forEach(function(_2,di){
        var d=document.getElementById('ob-dot-'+pi+'-'+di);
        if(d) d.className='ob-dot'+(di===cur?' active':'');
      });
    });
    _initLottieSlide(cur);
  }

  function finish(){
    wrap.style.transition='opacity .28s ease';
    wrap.style.opacity='0';
    setTimeout(function(){
      wrap.remove();
      LOCAL.set('ob_done_'+ME.uid,'1');
      setTimeout(checkProfileComplete,600);
    },280);
  }

  // Wire navigation
  pages.forEach(function(_,i){
    var sk=document.getElementById('ob-skip-'+i);
    if(sk) sk.onclick=finish;
    var nx=document.getElementById('ob-next-'+i);
    if(nx) nx.onclick=function(){ if(cur<total-1) goTo(cur+1); else finish(); };
  });

  var ctaMain=document.getElementById('ob-cta-main');
  if(ctaMain) ctaMain.onclick=function(){
    finish();
    setTimeout(function(){ if(isClient && typeof openPostGig==='function') openPostGig(); else showPage('gigs'); },320);
  };
  var ctaSec=document.getElementById('ob-cta-sec');
  if(ctaSec) ctaSec.onclick=function(){
    finish();
    setTimeout(function(){ if(isClient) showPage('talent'); else showPage('myprofile'); },320);
  };

  // ── Touch swipe ─────────────────────────────────────────
  var tx0=0, ty0=0;
  wrap.addEventListener('touchstart',function(e){ tx0=e.touches[0].clientX; ty0=e.touches[0].clientY; },{passive:true});
  wrap.addEventListener('touchend',function(e){
    var dx=e.changedTouches[0].clientX-tx0, dy=e.changedTouches[0].clientY-ty0;
    if(Math.abs(dx)>Math.abs(dy)&&Math.abs(dx)>40){ if(dx<0) goTo(cur+1); else goTo(cur-1); }
  },{passive:true});

  // ── Lottie init ─────────────────────────────────────────
  function _initLottieSlide(idx){
    if(lottiesInited[idx]) return;
    if(!customElements.get('lottie-player')) return; // not loaded yet
    lottiesInited[idx]=true;
    var az=pages[idx] ? wrap.querySelectorAll('.ob-anim-zone')[idx] : null;
    if(!az) return;
    var ph=document.getElementById('ob-ph-'+idx);
    var player=document.createElement('lottie-player');
    player.className='ob-lottie';
    player.setAttribute('src', OB_LOTTIES[pages[idx].lottieIdx]);
    player.setAttribute('background','transparent');
    player.setAttribute('speed','1');
    player.setAttribute('loop','');
    player.setAttribute('autoplay','');
    player.setAttribute('renderer','svg');
    az.appendChild(player);
    // Hide placeholder once player fires
    player.addEventListener('ready',function(){ if(ph) ph.style.display='none'; },{once:true});
    // Fallback: hide placeholder after 1.5s regardless
    setTimeout(function(){ if(ph) ph.style.display='none'; },1500);
  }

  // Load lottie-player then init slide 0
  goTo(0);
  _ensureLottiePlayer(function(){
    _initLottieSlide(0);
  });
}

window.obNext=function(){};
window.obSkip=function(){
  var ov=document.getElementById('ob-cinematic')||document.getElementById('onboard-overlay');
  if(ov){ ov.style.opacity='0'; ov.style.transition='opacity .28s ease'; setTimeout(function(){ ov.remove(); },280); }
  LOCAL.set('ob_done_'+ME.uid,'1');
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
window.openHireMe=function(uid){ openDirectProposal(uid); };

// ── Direct Proposal Page ──────────────────────────────────
// Opens as a full-screen slide-in page (not a modal)
// Allows client to send a detailed project brief directly to a freelancer
window.openDirectProposal = function(uid) {
  var u = getUser(uid);
  if (!u) return;

  var isVerif = u.badgeStatus === 'verified' || u.badgeStatus === 'expert' || u.badgeStatus === 'elite';
  var firstName = u.name.split(' ')[0];

  // ── Access control: block if client already hired this freelancer on an open gig ──
  var alreadyHired = getGigs().some(function(g) {
    return g.posterUid === ME.uid && g.hiredUid === uid &&
           (g.status === 'hired' || g.status === 'open');
  });

  if (alreadyHired) {
    setModal(
      '<button class="mclose" onclick="closeModal()">✕</button>' +
      '<div style="text-align:center;padding:16px 0;">' +
      '<div style="font-size:40px;margin-bottom:10px;">🔗</div>' +
      '<div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:800;font-size:16px;margin-bottom:8px;">Already Working Together</div>' +
      '<div style="font-size:12px;color:var(--td);line-height:1.6;margin-bottom:16px;">You already have an active gig with ' + u.name + '. Use the Workspace to manage your current project.</div>' +
      '<button class="btn" onclick="closeModal();showPage(\'gigs\')" style="width:100%;">View Active Gig →</button>' +
      '</div>'
    );
    return;
  }

  // ── Build avatar ──────────────────────────────────────────
  var avEl = u.avatar
    ? '<img src="' + u.avatar + '" style="width:52px;height:52px;border-radius:50%;object-fit:cover;border:2px solid var(--gld);">'
    : '<div style="width:52px;height:52px;border-radius:50%;background:linear-gradient(135deg,' + u.gradient + ',' + u.gradient + '88);display:flex;align-items:center;justify-content:center;font-family:Plus Jakarta Sans,sans-serif;font-weight:800;font-size:19px;color:#000;border:2px solid var(--gld);">' + initials(u.name) + '</div>';

  // ── Build full-screen proposal page ──────────────────────
  var panel = document.createElement('div');
  panel.id = 'proposal-panel';
  panel.style.cssText = 'position:fixed;inset:0;z-index:2000;background:var(--bg);overflow-y:auto;animation:slideInRight .25s ease;';

  var verifBadge = isVerif
    ? '<span style="display:inline-flex;align-items:center;gap:3px;background:rgba(74,222,128,.1);border:1px solid rgba(74,222,128,.25);color:#4ade80;font-size:9px;font-weight:700;padding:2px 8px;border-radius:20px;">✓ Verified</span>'
    : '<span style="display:inline-flex;align-items:center;gap:3px;background:rgba(255,107,53,.08);border:1px solid rgba(255,107,53,.2);color:var(--acc);font-size:9px;font-weight:700;padding:2px 8px;border-radius:20px;">Unverified</span>';

  var escrowNote = isVerif
    ? '<div style="display:flex;align-items:flex-start;gap:9px;background:rgba(74,222,128,.06);border:1px solid rgba(74,222,128,.18);border-radius:10px;padding:11px 13px;margin-bottom:16px;"><div style="font-size:15px;flex-shrink:0;">🔒</div><div style="font-size:11px;color:var(--td);line-height:1.55;"><strong style="color:var(--grn);">Escrow Protected</strong> — Your budget will be locked until you confirm delivery. The freelancer only gets paid after you approve.</div></div>'
    : '<div style="display:flex;align-items:flex-start;gap:9px;background:rgba(255,107,53,.05);border:1px solid rgba(255,107,53,.18);border-radius:10px;padding:11px 13px;margin-bottom:16px;"><div style="font-size:15px;flex-shrink:0;">⚠️</div><div style="font-size:11px;color:var(--td);line-height:1.55;"><strong style="color:var(--acc);">Not Verified</strong> — This freelancer hasn\'t been verified yet. Your proposal will be sent as a direct enquiry without escrow.</div></div>';

  panel.innerHTML =
    // ── Header ──
    '<div style="display:flex;align-items:center;gap:12px;padding:14px 16px;border-bottom:1px solid var(--br);background:var(--s);position:sticky;top:0;z-index:1;">' +
    '<button onclick="document.getElementById(\'proposal-panel\').remove()" style="background:none;border:none;color:var(--fg);font-size:22px;cursor:pointer;line-height:1;padding:0 6px 0 0;">←</button>' +
    '<div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:800;font-size:16px;color:var(--tx);">Direct Proposal</div>' +
    '</div>' +

    // ── Freelancer card ──
    '<div style="margin:16px 16px 0;">' +
    '<div style="background:var(--s);border:1px solid var(--br);border-radius:14px;padding:14px;display:flex;align-items:center;gap:12px;margin-bottom:16px;">' +
    avEl +
    '<div style="flex:1;min-width:0;">' +
    '<div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:800;font-size:14px;color:var(--tx);margin-bottom:3px;">' + u.name + '</div>' +
    '<div style="font-size:10px;color:var(--td);margin-bottom:5px;">' + (u.title || 'SkillStamp Freelancer') + '</div>' +
    verifBadge +
    '</div>' +
    (u.score > 0 ? '<div style="text-align:center;flex-shrink:0;"><div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:800;font-size:16px;color:var(--gld);">' + u.score.toFixed(1) + '</div><div style="font-size:8px;color:var(--td);">Rating</div></div>' : '') +
    '</div>' +

    // ── Escrow notice ──
    escrowNote +

    // ── Wallet balance (verified flow only) ──
    (isVerif ? '<div style="background:var(--s2);border:1px solid var(--br);border-radius:10px;padding:10px 13px;margin-bottom:14px;display:flex;justify-content:space-between;align-items:center;"><div style="font-size:11px;color:var(--td);">Your wallet balance</div><div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:800;font-size:15px;color:var(--grn);">$' + Math.round((ME.wallet && ME.wallet.balance) || 0).toLocaleString() + '</div></div>' : '') +

    // ── Form ──
    '<div class="fg"><label class="fl">Project Title <span style="color:var(--acc);">*</span></label>' +
    '<input class="fi" id="dp-title" placeholder="e.g. Design a logo for my startup" autocomplete="off"></div>' +

    (isVerif
      ? '<div class="fg"><label class="fl">Budget ($) <span style="color:var(--acc);">*</span></label>' +
        '<input class="fi" id="dp-budget" type="number" placeholder="e.g. 200" min="1" style="font-size:16px;"></div>'
      : '<div class="fg"><label class="fl">Budget Range</label>' +
        '<select class="fi" id="dp-budget-range">' +
        '<option value="Under $100">Under $100</option>' +
        '<option value="$100–$300" selected>$100–$300</option>' +
        '<option value="$300–$500">$300–$500</option>' +
        '<option value="$500–$1,000">$500–$1,000</option>' +
        '<option value="$1,000+">$1,000+</option>' +
        '</select></div>'
    ) +

    '<div class="fg"><label class="fl">Timeline <span style="color:var(--acc);">*</span></label>' +
    '<select class="fi" id="dp-timeline">' +
    '<option value="3 days">3 days</option>' +
    '<option value="1 week" selected>1 week</option>' +
    '<option value="2 weeks">2 weeks</option>' +
    '<option value="1 month">1 month</option>' +
    '<option value="2+ months">2+ months</option>' +
    '</select></div>' +

    '<div class="fg"><label class="fl">Project Description <span style="color:var(--acc);">*</span></label>' +
    '<textarea class="fi" id="dp-desc" rows="5" placeholder="Describe your project goals, deliverables, and any specific requirements. The more detail you give, the better the outcome." style="resize:vertical;"></textarea>' +
    '<div id="dp-desc-count" style="font-size:9px;color:var(--td);margin-top:3px;text-align:right;">0 / 50 min</div></div>' +

    // ── Reference image uploader ──
    '<div class="fg">' +
    '<label class="fl">Reference Images <span style="font-size:9px;font-weight:400;color:var(--td);">(optional — up to 3)</span></label>' +
    '<label id="dp-img-label" for="dp-img-input" style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;background:var(--s2);border:2px dashed rgba(232,197,71,.3);border-radius:12px;padding:20px;cursor:pointer;transition:border-color .2s;">' +
    '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--gld)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>' +
    '<div style="font-size:11px;font-weight:600;color:var(--gld);">Tap to upload reference images</div>' +
    '<div style="font-size:9px;color:var(--td);">JPG, PNG · Max 2MB each</div>' +
    '</label>' +
    '<input type="file" id="dp-img-input" accept="image/*" multiple style="display:none;" onchange="dpHandleImages(this)">' +
    '<div id="dp-img-previews" style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px;"></div>' +
    '</div>' +

    // ── Submit button ──
    '<button id="dp-submit-btn" style="width:100%;padding:14px;background:var(--gld);color:#fff;font-family:Plus Jakarta Sans,sans-serif;font-weight:800;font-size:14px;border:none;border-radius:12px;cursor:pointer;margin-top:8px;margin-bottom:32px;transition:background .2s;" onmouseover="this.style.background=\'#f5d460\'" onmouseout="this.style.background=\'var(--gld)\'">' +
    (isVerif ? '💼 Send Proposal & Lock Escrow →' : '📩 Send Direct Enquiry →') +
    '</button>' +
    '</div>';

  document.body.appendChild(panel);

  // ── Description character counter ────────────────────────
  var descEl = document.getElementById('dp-desc');
  var countEl = document.getElementById('dp-desc-count');
  if (descEl && countEl) {
    descEl.addEventListener('input', function() {
      var len = descEl.value.length;
      countEl.textContent = len + ' / 50 min';
      countEl.style.color = len >= 50 ? 'var(--grn)' : 'var(--td)';
    });
  }

  // ── Image upload handler ──────────────────────────────────
  window.dpHandleImages = function(input) {
    var files = Array.from(input.files).slice(0, 3);
    var previews = document.getElementById('dp-img-previews');
    if (!previews) return;
    window._dpImages = window._dpImages || [];
    files.forEach(function(file) {
      if (window._dpImages.length >= 3) return;
      if (file.size > 2 * 1024 * 1024) { toast('Image must be under 2MB.', 'bad'); return; }
      var reader = new FileReader();
      reader.onload = function(e) {
        var img = new Image();
        img.onload = function() {
          var canvas = document.createElement('canvas');
          var MAX = 600;
          var w = img.width, h = img.height;
          if (w > MAX) { h = Math.round(h * MAX / w); w = MAX; }
          if (h > MAX) { w = Math.round(w * MAX / h); h = MAX; }
          canvas.width = w; canvas.height = h;
          canvas.getContext('2d').drawImage(img, 0, 0, w, h);
          var dataUrl = canvas.toDataURL('image/jpeg', 0.7);
          window._dpImages.push(dataUrl);
          var idx = window._dpImages.length - 1;
          var wrap = document.createElement('div');
          wrap.style.cssText = 'position:relative;width:80px;height:80px;';
          wrap.innerHTML = '<img src="' + dataUrl + '" style="width:80px;height:80px;object-fit:cover;border-radius:8px;border:1px solid var(--br);">'
            + '<button onclick="window._dpImages.splice(' + idx + ',1);this.parentNode.remove()" style="position:absolute;top:-5px;right:-5px;background:var(--acc);color:#fff;border:none;border-radius:50%;width:18px;height:18px;font-size:10px;cursor:pointer;line-height:1;display:flex;align-items:center;justify-content:center;">✕</button>';
          previews.appendChild(wrap);
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  };

  // ── Submit handler ────────────────────────────────────────
  window._dpImages = [];
  var submitBtn = document.getElementById('dp-submit-btn');
  if (submitBtn) submitBtn.onclick = async function() {
    var title = (document.getElementById('dp-title').value || '').trim();
    var desc  = (document.getElementById('dp-desc').value || '').trim();
    var timeline = document.getElementById('dp-timeline').value;

    if (!title) { toast('Please enter a project title.', 'bad'); return; }
    if (desc.length < 50) { toast('Description must be at least 50 characters.', 'bad'); return; }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending…';

    try {
      if (isVerif) {
        // ── Verified: full escrow gig ──────────────────────
        var budget = parseFloat(document.getElementById('dp-budget').value) || 0;
        if (!budget || budget < 1) { toast('Please enter a valid budget.', 'bad'); submitBtn.disabled = false; submitBtn.textContent = '💼 Send Proposal & Lock Escrow →'; return; }
        if (!ME.wallet || (ME.wallet.balance || 0) < budget) { toast('Insufficient wallet balance. Top up first.', 'bad'); submitBtn.disabled = false; submitBtn.textContent = '💼 Send Proposal & Lock Escrow →'; return; }

        var gig = {
          id: 'g' + Date.now(),
          title: title,
          description: desc,
          pay: budget,
          category: u.category,
          posterUid: ME.uid,
          posterName: ME.name,
          applicants: [uid],
          hiredUid: uid,
          status: 'hired',
          escrowAmount: budget,
          created: Date.now(),
          deadline: timeline,
          directHire: true,
          freelancerId: uid,          // explicit freelancer_id for data flow
          referenceImages: window._dpImages.slice(),
          maxRevisions: 1
        };

        await fbSet('gigs', gig.id, gig);
        CACHE.gigs.unshift(gig);
        ME.wallet.balance = Math.max(0, (ME.wallet.balance || 0) - budget);
        ME.wallet.pending = (ME.wallet.pending || 0) + budget;
        ME.wallet.transactions.unshift({ id: 't' + Date.now(), type: 'out', amount: budget, from: ME.name, desc: 'Direct hire: ' + title, ts: Date.now() });
        saveUser(ME);

        pushNotif(uid, 'hired', '🎉 You Got a Direct Proposal!',
          ME.name + ' sent you a direct hire proposal: ' + title + ' — $' + budget,
          { type: 'gig_hired', gigId: gig.id, clientUid: ME.uid });
        sendAutoMsg(uid,
          '💼 Direct Hire Proposal from ' + ME.name + '\n\n' +
          'Project: ' + title + '\n' +
          'Budget: $' + budget + '\n' +
          'Timeline: ' + timeline + '\n\n' +
          'Brief:\n' + desc + '\n\n' +
          'Open the Gig Workspace to get started!');

        document.getElementById('proposal-panel').remove();
        window._dpImages = [];
        renderWallet();
        toast('Proposal sent! $' + budget + ' locked in escrow. ✅');

      } else {
        // ── Unverified: enquiry message only ──────────────
        var budgetRange = document.getElementById('dp-budget-range').value;
        var msg = '📩 Direct Proposal from ' + ME.name + '\n\n' +
          'Project: ' + title + '\n' +
          'Budget Range: ' + budgetRange + '\n' +
          'Timeline: ' + timeline + '\n\n' +
          'Brief:\n' + desc + '\n\n' +
          '— Open for discussion. Reply to move forward.';
        sendAutoMsg(uid, msg);
        pushNotif(uid, 'enquiry', '📩 New Direct Proposal', ME.name + ' sent a proposal: ' + title, { type: 'enquiry', fromUid: ME.uid });
        document.getElementById('proposal-panel').remove();
        window._dpImages = [];
        toast('Proposal sent to ' + firstName + '! 📩');
      }

    } catch(err) {
      console.error('Proposal submit failed', err);
      submitBtn.disabled = false;
      submitBtn.textContent = isVerif ? '💼 Send Proposal & Lock Escrow →' : '📩 Send Direct Enquiry →';
      toast('Something went wrong. Please try again.', 'bad');
    }
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

