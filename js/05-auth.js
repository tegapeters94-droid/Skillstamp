// SkillStamp — Auth — Login, Signup, Logout

// ══════════════════════════════════════════════
//  AUTH
// ══════════════════════════════════════════════
function switchTab(tab,btn){
  document.querySelectorAll('.atab').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('auth-login').style.display=tab==='login'?'':'none';
  document.getElementById('auth-signup').style.display=tab==='signup'?'':'none';
}
window.switchTab=switchTab;

// ── New login screen navigation ──────────────────
function showLsScreen(screen){
  var start=document.getElementById('ls-start');
  var signin=document.getElementById('ls-signin');
  var signup=document.getElementById('ls-signup');
  if(!start||!signin||!signup) return;
  // Hide all
  [start,signin,signup].forEach(function(el){
    el.style.display='none';
    el.classList.remove('ls-enter');
  });
  function animIn(el){
    el.style.display='flex';
    // Trigger reflow then add class
    void el.offsetWidth;
    el.classList.add('ls-enter');
  }
  if(screen==='start'){ animIn(start); }
  else if(screen==='signin'){
    animIn(signin);
    var tabLogin=document.getElementById('ls-atab-login');
    if(tabLogin){ switchTab('login',tabLogin); }
    document.getElementById('auth-login').style.display='';
    document.getElementById('auth-signup').style.display='none';
  }
  else if(screen==='signup'){
    animIn(signup);
    var tabSignup=document.getElementById('ls-atab-signup');
    if(tabSignup){ switchTab('signup',tabSignup); }
    document.getElementById('auth-login').style.display='none';
    document.getElementById('auth-signup').style.display='';
  }
}
window.showLsScreen=showLsScreen;

// Load saved credentials
// Force browser to always check for fresh version
if('serviceWorker' in navigator){
  navigator.serviceWorker.getRegistrations().then(function(regs){
    regs.forEach(function(r){ r.unregister(); });
  });
}

window.addEventListener('load',()=>{
  generateUsers();
  // Never read saved passwords - Firebase handles session persistence
  LOCAL.del('saved_creds');
  // Load real user count — wait for Firebase to be ready first
  setTimeout(function(){
    try{
      var db=window.FB_DB;
      var fns=window.FB_FNS;
      if(!db||!fns){
        var el=document.getElementById('login-user-count');
        if(el) el.textContent='Growing';
        return;
      }
      fns.getDocs(fns.collection(db,'users')).then(function(snap){
        var el=document.getElementById('login-user-count');
        if(el) el.textContent=(snap.size||0).toLocaleString()+'+';
      }).catch(function(){
        var el=document.getElementById('login-user-count');
        if(el) el.textContent='Growing';
      });
    }catch(e){
      var el=document.getElementById('login-user-count');
      if(el) el.textContent='Growing';
    }
  }, 1500);

  const sid=LOCAL.get('session');
  if(sid){
    // Keep loading screen visible (it already shows by default)
    fbGet('users', sid).then(async function(u){
      if(u){
        ME=u;
        // Normalize ME to ensure all fields have safe defaults
        if (typeof normalizeUser === 'function') ME = normalizeUser(ME);
        if(ME.isBanned||ME.badgeStatus==='suspended'){
          LOCAL.del('session');
          // Hide loading screen and show login
          var lsEl=document.getElementById('screen-loading');
          if(lsEl) lsEl.style.display='none';
          return;
        }
        try {
          // Load ALL cache data before entering the app so pages never render empty
          var results = await Promise.all([
            fbGetAll('users').catch(function(){ return []; }),
            fbGetAll('gigs').catch(function(){ return []; }),
            fbGetAll('endorsements').catch(function(){ return []; })
          ]);
          if(results[0]&&results[0].length) CACHE.users=results[0];
          if(results[1]&&results[1].length) CACHE.gigs=results[1];
          if(results[2]&&results[2].length) CACHE.endorsements=results[2];
          // Load avatar in background (non-blocking)
          fbGet('avatars', ME.uid).then(function(av){
            if(av&&av.data&&!ME.avatar){
              ME.avatar=av.data;
            }
          }).catch(function(){});
        } catch(e) {
          console.warn('Cache preload failed, continuing anyway', e);
        }
        // enterApp() hides screen-loading, shows screen-app, and calls showPage('home')
        enterApp();
      } else {
        LOCAL.del('session');
        var lsEl2=document.getElementById('screen-loading');
        if(lsEl2) lsEl2.style.display='none';
      }
    }).catch(function(){
      LOCAL.del('session');
      var lsEl3=document.getElementById('screen-loading');
      if(lsEl3) lsEl3.style.display='none';
    });
    return;
  }
  // No session — hide loading screen and show login
  var lsNoSess=document.getElementById('screen-loading');
  if(lsNoSess) lsNoSess.style.display='none';
});

let signupRole='freelancer';
window.selRole=function(r_){
  signupRole=r_;
  // Legacy .sel class (kept for doSignup compatibility)
  var rf=document.getElementById('role-f');
  var re=document.getElementById('role-e');
  if(rf) rf.classList.toggle('sel',r_==='freelancer');
  if(re) re.classList.toggle('sel',r_==='employer');
  // New ob-role-card styling
  if(rf) rf.classList.toggle('ob-selected',r_==='freelancer');
  if(re) re.classList.toggle('ob-selected',r_==='employer');
  var chkF=document.getElementById('ob-chk-f');
  var chkE=document.getElementById('ob-chk-e');
  if(chkF) chkF.style.opacity=(r_==='freelancer')?'1':'0';
  if(chkE) chkE.style.opacity=(r_==='employer')?'1':'0';
};

window.showBannedScreen=function(){
  document.getElementById('screen-app').classList.remove('active');
  var loginScreen=document.getElementById('screen-login');
  loginScreen.classList.add('active');
  var lr=loginScreen.querySelector('.lr');
  if(!lr) return;
  var html='<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:80vh;padding:32px;text-align:center;">';
  html+='<div style="font-size:52px;margin-bottom:16px;">🚫</div>';
  html+='<div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:800;font-size:20px;margin-bottom:8px;color:var(--tx);">Account Suspended</div>';
  html+='<div style="font-size:13px;color:var(--td);line-height:1.7;margin-bottom:24px;max-width:320px;">Your SkillStamp account has been suspended due to a violation of our community guidelines.</div>';
  html+='<div style="background:rgba(239,68,68,.06);border:1px solid rgba(239,68,68,.2);border-radius:12px;padding:18px 20px;margin-bottom:24px;width:100%;max-width:360px;">';
  html+='<div style="font-size:11px;font-weight:700;color:#ef4444;margin-bottom:6px;">To appeal this decision:</div>';
  html+='<div style="font-size:11px;color:var(--td);margin-bottom:14px;">Email us with your SkillID and the reason for your appeal.</div>';
  var subject='Account%20Appeal%20Request';
  var body='Hi%20SkillStamp%20Team%2C%0A%0AI%20would%20like%20to%20appeal%20my%20account%20suspension.%0A%0AEmail%3A%20%0ASkillID%3A%20%0AReason%3A%20';
  html+='<a href="mailto:tegapeters94@gmail.com?subject='+subject+'&body='+body+'" style="display:block;background:var(--gld);color:#000;font-family:Plus Jakarta Sans,sans-serif;font-weight:800;font-size:12px;padding:13px 20px;border-radius:8px;text-decoration:none;">📧 Send Appeal Email</a>';
  html+='</div>';
  html+='<div style="font-size:10px;color:var(--td);">Appeals are reviewed within 48 hours.</div>';
  html+='</div>';
  lr.innerHTML=html;
};

window.togglePwdVis=function(inputId, btn){
  var inp=document.getElementById(inputId);
  if(!inp) return;
  if(inp.type==='password'){
    inp.type='text';
    if(btn) btn.textContent='🙈';
  } else {
    inp.type='password';
    if(btn) btn.textContent='👁';
  }
};

window.openForgotPassword=function(){
  var mh='<button class="mclose" id="fp-close">✕</button>';
  mh+='<h3>Reset Password</h3>';
  mh+='<p style="font-size:12px;color:var(--td);">Enter your email and we will send you a reset link.</p>';
  mh+='<div class="fg"><label class="fl">Email Address</label><input class="fi" id="fp-email" type="email" placeholder="you@example.com" style="width:100%;"></div>';
  mh+='<div class="aerr" id="fp-err" style="display:none;margin-bottom:10px;"></div>';
  mh+='<button class="btn" id="fp-send-btn" style="width:100%;">Send Reset Link →</button>';
  mh+='<div id="fp-success" style="display:none;background:rgba(74,222,128,.08);border:1px solid rgba(74,222,128,.2);border-radius:8px;padding:12px;margin-top:12px;font-size:12px;color:var(--grn);text-align:center;">Reset email sent! Check your inbox and spam folder.</div>';
  setModal(mh);
  document.getElementById('fp-close').onclick=closeModal;
  document.getElementById('fp-send-btn').onclick=doForgotPassword;
  document.getElementById('fp-email').onkeydown=function(e){if(e.key==='Enter')doForgotPassword();};
};

window.doForgotPassword=async function(){
  var email=(document.getElementById('fp-email').value||'').trim().toLowerCase();
  var errEl=document.getElementById('fp-err');
  var btn=document.getElementById('fp-send-btn');
  if(!email){
    errEl.textContent='Please enter your email address.';
    errEl.style.display='block';
    return;
  }
  btn.textContent='Sending...';
  btn.disabled=true;
  try{
    await window.FB_FNS.sendPasswordResetEmail(window.FB_AUTH, email);
    document.getElementById('fp-success').style.display='block';
    btn.style.display='none';
    errEl.style.display='none';
  }catch(e){
    var msg=e.code==='auth/user-not-found'||e.code==='auth/invalid-email'
      ?'No account found with that email address.'
      :'Something went wrong. Please try again.';
    errEl.textContent=msg;
    errEl.style.display='block';
    btn.textContent='Send Reset Link →';
    btn.disabled=false;
  }
};

window._loginFired=false;
window.doLogin=async function(){
  if(window._loginFired)return;window._loginFired=true;setTimeout(()=>{window._loginFired=false;},3000);
  const email=document.getElementById('li-e').value.trim().toLowerCase();
  const pass=document.getElementById('li-p').value;
  const save=document.getElementById('save-creds').checked;
  if(!email||!pass){showAErr('li-err','Please fill in all fields.');return;}

  // Show loading
  const btn=document.getElementById('li-btn');
  if(btn){btn.textContent='Signing in...';btn.disabled=true;}

  // Block onAuthStateChanged from racing with our manual login flow
  window._loginInProgress = true;

  try {
    const cred = await window.FB_FNS.signInWithEmailAndPassword(window.FB_AUTH, email, pass);

    // Load user profile + CACHE before entering app so role is known at render time
    const snap = await fbGet('users', cred.user.uid);
    if(!snap){showAErr('li-err','Account not found. Please sign up.'); window._loginInProgress=false; return;}
    ME = snap;
    if (typeof normalizeUser === 'function') ME = normalizeUser(ME);

    if(ME.isBanned||ME.badgeStatus==='suspended'){
      await window.FB_FNS.signOut(window.FB_AUTH);
      window._loginInProgress = false;
      showBannedScreen();
      return;
    }

    if(save) LOCAL.set('saved_creds',{email,pass}); else LOCAL.del('saved_creds');
    LOCAL.set('session', ME.uid);

    // Pre-load all CACHE collections BEFORE enterApp so renderRoleHome has real data
    await Promise.all([
      fbGetAll('users').then(function(r){ if(r&&r.length) CACHE.users=r; }).catch(function(){}),
      fbGetAll('gigs').then(function(r){ if(r&&r.length) CACHE.gigs=r; }).catch(function(){}),
      fbGetAll('endorsements').then(function(r){ if(r&&r.length) CACHE.endorsements=r; }).catch(function(){})
    ]);

    // Load avatar in background
    fbGet('avatars', ME.uid).then(function(av){
      if(av&&av.data&&!ME.avatar){
        ME.avatar=av.data;
        var navAv=document.getElementById('nav-av');
        if(navAv){navAv.innerHTML='<img src="'+av.data+'" style="width:100%;height:100%;object-fit:cover;">';navAv.style.background='';}
      }
    }).catch(function(){});

    // Seed test wallet if empty
    if(!ME.wallet) ME.wallet={balance:0,pending:0,earned:0,transactions:[]};
    var hasWelcome=(ME.wallet.transactions||[]).find(function(t){return t.id==='t_welcome';});
    if(!hasWelcome){
      ME.wallet.balance=(ME.wallet.balance||0)+1000;
      ME.wallet.transactions.unshift({id:'t_welcome',type:'in',amount:1000,from:'SkillStamp',desc:'Demo credit — not withdrawable (for testing only)',ts:Date.now()});
      saveUser(ME);
    }

    // enterApp() is idempotent — safe to call once here.
    // It calls startRealtimeListeners() internally, so we do NOT call it here.
    enterApp();

    toast('Welcome back, '+ME.name.split(' ')[0]+'! 👋');
    setTimeout(function(){
      if (typeof startNotifRealtimeListener === 'function') startNotifRealtimeListener();
    }, 1500);
    setTimeout(function(){
      if(!LOCAL.get('ob_done_'+ME.uid)) {
        if (typeof showOnboarding === 'function') showOnboarding();
      } else {
        if (typeof checkProfileComplete === 'function') checkProfileComplete();
      }
    }, 1200);

  } catch(e) {
    window._loginInProgress = false;
    const msg = e.code==='auth/user-not-found'||e.code==='auth/wrong-password'||e.code==='auth/invalid-credential'
      ? 'Invalid email or password.' : 'Login failed. Try again.';
    showAErr('li-err', msg);
  } finally {
    if(btn){btn.textContent='Sign In →';btn.disabled=false;}
    window._loginFired=false;
  }
};

var DISPOSABLE_DOMAINS=['mailinator.com','tempmail.com','guerrillamail.com','throwaway.email',
  'yopmail.com','sharklasers.com','trashmail.com','maildrop.cc','dispostable.com',
  'mailnull.com','trashmail.me','fakeinbox.com','tempinbox.com','mintemail.com',
  '10minutemail.com','getairmail.com','mailtemp.org','spambox.us','discard.email','spam4.me'];
async function validateEmail(email){
  email=email.toLowerCase().trim();
  if(!/^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/.test(email)) return {valid:false,reason:'Invalid email format.'};
  var domain=email.split('@')[1];
  if(DISPOSABLE_DOMAINS.indexOf(domain)>=0) return {valid:false,reason:'Disposable email addresses are not allowed.'};
  if(/^(test|fake|temp|demo|noreply|asdf|qwert|aaaa|1234|abcd)@/.test(email)) return {valid:false,reason:'Please use a real email address.'};
  return {valid:true};
}
window._signupFired=false;
window.doSignup=async function(){
  if(window._signupFired)return;window._signupFired=true;setTimeout(()=>window._signupFired=false,3000);
  const fn=document.getElementById('ri-fn').value.trim();
  const ln=document.getElementById('ri-ln').value.trim();
  const email=document.getElementById('ri-em').value.trim().toLowerCase();
  const pass=document.getElementById('ri-pw').value;
  const country=document.getElementById('ri-co').value;
  // ri-cat is now a hidden input; obSelectCat() sets its value
  const category=document.getElementById('ri-cat').value;
  // Pick up skills from new ob-skill-chips if present
  var _obSkills=[];
  document.querySelectorAll('.ob-skill-chip.ob-selected').forEach(function(el){
    _obSkills.push(el.dataset.skill||el.textContent.trim());
  });
  const save=document.getElementById('save-creds-s').checked;
  if(!fn||!ln||!email||!pass){toast('Please fill all fields.','bad');return;}
  var emailCheck=await validateEmail(email);
  if(!emailCheck.valid){showAErr('ri-err',emailCheck.reason||'Please use a valid email.');window._signupFired=false;return;}
  if(pass.length<6){toast('Password must be 6+ characters.','bad');return;}

  const btn=document.getElementById('ri-btn');
  if(btn){btn.textContent='Creating account...';btn.disabled=true;}

  try {
    const cred = await window.FB_FNS.createUserWithEmailAndPassword(window.FB_AUTH, email, pass);
    const uid = cred.user.uid;
    const name=fn+' '+ln;
    const user={
      uid,email,name,role:signupRole,country,category,
      title:signupRole==='freelancer'?'Digital Professional':'Employer / Client',
      bio:'',skills:_obSkills.length?_obSkills:[],badgeStatus:'beginner',score:0,repPoints:0,
      gigsCount:0,earned:0,skillId:null,gradient:gradFor(name),
      wallet:{balance:0,pending:0,earned:0,transactions:[]},
      created:Date.now(),isAdmin:false,avatar:null
    };
    await fbSet('users', uid, user);
    CACHE.users.push(user);
    if(save) LOCAL.set('saved_creds',{email,pass}); else LOCAL.del('saved_creds');
    LOCAL.set('session', uid);
    ME = user;
    window._loginInProgress = true;
    // Pre-load CACHE before enterApp so role is available at first render
    await Promise.all([
      fbGetAll('users').then(function(r){ if(r&&r.length) CACHE.users=r; }).catch(function(){}),
      fbGetAll('gigs').then(function(r){ if(r&&r.length) CACHE.gigs=r; }).catch(function(){}),
      fbGetAll('endorsements').then(function(r){ if(r&&r.length) CACHE.endorsements=r; }).catch(function(){})
    ]);
    toast('Welcome to SkillStamp, '+fn+'! 🎉');
    ME._isNew=true;
    // enterApp() handles startRealtimeListeners internally — do NOT call it separately
    enterApp();
    setTimeout(function(){
      if (typeof startNotifRealtimeListener === 'function') startNotifRealtimeListener();
    }, 1500);
    setTimeout(function(){
      if(!LOCAL.get('ob_done_'+ME.uid)) {
        if (typeof showOnboarding === 'function') showOnboarding();
      }
    }, 800);
  } catch(e) {
    const msg = e.code==='auth/email-already-in-use'
      ? 'Email already registered. Please sign in.'
      : 'Sign up failed: '+e.message;
    showAErr('ri-err', msg);
  } finally {
    if(btn){btn.textContent='Create Account & Get SkillID →';btn.disabled=false;}
    window._signupFired=false;
  }
};

function showAErr(id,msg){const el=document.getElementById(id);if(el){el.textContent=msg;el.style.display='block';setTimeout(()=>el.style.display='none',4000);}}

window.doLogout=async function(){
  var bn=document.getElementById('bottom-nav');if(bn){bn.style.display='none';bn.classList.remove('app-visible');}
  try { await window.FB_FNS.signOut(window.FB_AUTH); } catch(e){}
  // Use central listener registry for clean shutdown
  if (typeof unregisterAllListeners === 'function') unregisterAllListeners();
  else {
    if(_unsubPosts){_unsubPosts();_unsubPosts=null;}
    if(_unsubUsers){_unsubUsers();_unsubUsers=null;}
  }
  if (typeof stopNotifRealtimeListener === 'function') stopNotifRealtimeListener();
  // Reset all init guards so the next login starts clean
  window._appEntered       = false;
  window._loginInProgress  = false;
  window._googleAuthInProgress = false;
  ME=null; LOCAL.del('session'); activeConv=null;
  CACHE.users=[]; CACHE.posts=[]; CACHE.gigs=[]; CACHE.endorsements=[];
  var appEl=document.getElementById('screen-app');
  appEl.classList.remove('active'); appEl.style.display='none';
  var loginEl=document.getElementById('screen-login');
  loginEl.classList.add('active'); loginEl.style.display='';
  if(window.showLsScreen) showLsScreen('start');
  toast('Signed out.');
};


// ══════════════════════════════════════════════════════════════════
//  GOOGLE SIGN-IN
//  Works for both sign-in (existing user) and sign-up (new user).
//  On success: loads/creates user doc then enters app exactly like
//  the email flow. Data shape is identical — 100% compatible.
// ══════════════════════════════════════════════════════════════════

window.doGoogleAuth = async function() {
  if (!window.FB_FNS || !window.FB_AUTH || !window.FB_DB) {
    toast('Auth not ready — please refresh.', 'bad'); return;
  }

  // Disable button to prevent double-tap
  var btns = document.querySelectorAll('.ls-btn-google');
  btns.forEach(function(b){ b.disabled = true; b.style.opacity = '.6'; });

  var re_enable = function() {
    btns.forEach(function(b){ b.disabled = false; b.style.opacity = ''; });
    window._googleAuthInProgress = false;
  };

  // Block onAuthStateChanged from racing with our flow
  window._googleAuthInProgress = true;

  try {
    var provider = new window.FB_FNS.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });

    var result = await window.FB_FNS.signInWithPopup(window.FB_AUTH, provider);
    var fbUser  = result.user;
    if (!fbUser) { re_enable(); toast('Google sign-in failed.', 'bad'); return; }

    // Check if user already exists in Firestore
    var snap = await window.FB_FNS.getDoc(
      window.FB_FNS.doc(window.FB_DB, 'users', fbUser.uid)
    );

    if (snap.exists()) {
      // ── Returning user — log in ───────────────────────────────
      var existingUser = snap.data();
      if (existingUser.isBanned || existingUser.badgeStatus === 'suspended') {
        try { await window.FB_FNS.signOut(window.FB_AUTH); } catch(e) {}
        re_enable();
        toast('This account has been suspended.', 'bad');
        return;
      }
      window.ME = existingUser;
      if (typeof normalizeUser === 'function') window.ME = normalizeUser(window.ME);
      toast('Welcome back, ' + (window.ME.name||'').split(' ')[0] + '! 👋');
      await _loadCacheAndEnter(false); // false = returning user

    } else {
      // ── New user — show role picker FIRST, then create profile ──
      var displayName = fbUser.displayName || '';
      var firstName   = (displayName.split(' ')[0]) || 'there';
      re_enable(); // re-enable buttons; guard stays on until grConfirm completes
      _showGoogleRolePicker(fbUser, firstName);
    }

  } catch(err) {
    re_enable();
    console.warn('doGoogleAuth error:', err);
    if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
      return;
    }
    if (err.code === 'auth/popup-blocked') {
      toast('Popup was blocked. Please allow popups for this site and try again.', 'bad');
      return;
    }
    toast('Google sign-in failed: ' + (err.message || err.code || 'Unknown error'), 'bad');
  }
};

// Shared helper: fully load CACHE and enter app — used by Google auth flow.
// isNew = true triggers onboarding for brand-new Google sign-ups.
async function _loadCacheAndEnter(isNew) {
  // Both guards: block onAuthStateChanged from racing with us
  window._googleAuthInProgress = true;
  window._loginInProgress = true;

  // Pre-load CACHE before enterApp so role-based rendering has real data
  try {
    var results = await Promise.all([
      window.FB_FNS.getDocs(window.FB_FNS.collection(window.FB_DB, 'users')),
      window.FB_FNS.getDocs(window.FB_FNS.collection(window.FB_DB, 'gigs')),
      window.FB_FNS.getDocs(window.FB_FNS.collection(window.FB_DB, 'endorsements')),
    ]);
    window.CACHE = window.CACHE || {};
    CACHE.users        = results[0].docs.map(function(d){ return d.data(); });
    CACHE.gigs         = results[1].docs.map(function(d){ return d.data(); });
    CACHE.endorsements = results[2].docs.map(function(d){ return d.data(); });
  } catch(e) { console.warn('[GoogleAuth] Cache preload failed', e); }

  // Persist session
  if (window.ME && window.ME.uid) {
    LOCAL.set('session', window.ME.uid);
  }

  // Load avatar in background
  if (window.ME && window.ME.uid) {
    fbGet('avatars', window.ME.uid).then(function(av) {
      if (av && av.data && !window.ME.avatar) {
        window.ME.avatar = av.data;
      }
    }).catch(function(){});
  }

  // enterApp() is idempotent and handles startRealtimeListeners internally.
  // Do NOT call startRealtimeListeners() here.
  if (typeof enterApp === 'function') enterApp();

  // Release guards and show deferred UX
  setTimeout(function() {
    window._googleAuthInProgress = false;
    window._loginInProgress = false;
    if (!window.ME) return;
    if (typeof startNotifRealtimeListener === 'function') startNotifRealtimeListener();
    if (isNew) {
      if (typeof showOnboarding === 'function' && !LOCAL.get('ob_done_' + window.ME.uid)) {
        showOnboarding();
      }
    } else {
      if (typeof checkProfileComplete === 'function') checkProfileComplete();
    }
  }, 600);
}

// ══════════════════════════════════════════════════════════════════
//  CONDITIONAL ONBOARDING CONTROLLER (2-step signup flow)
//  All logic lives here — index.html calls these functions.
//  doSignup() / signupRole unchanged — 100% data compatibility.
// ══════════════════════════════════════════════════════════════════

(function(){
'use strict';

var _obStep      = 1;
var _obCat       = '';
var _obSkillsSel = [];
var MAX_SKILLS   = 5;

var SKILLS_MAP = {
  'Graphics Design':   ['Photoshop','Illustrator','Logo Design','Branding','Figma','Motion Graphics'],
  'UI/UX Design':      ['Figma','Wireframing','Prototyping','User Research','Webflow','Design Systems'],
  'Content Writing':   ['Copywriting','SEO Writing','Blog Writing','Ghostwriting','Proofreading','Email Copy'],
  'Data Analysis':     ['Python','SQL','Power BI','Tableau','Excel','Machine Learning'],
  'Digital Marketing': ['Facebook Ads','Google Ads','SEO','Email Marketing','Social Media','Analytics'],
  'Web & Mobile Dev':  ['React','Node.js','Flutter','Next.js','Firebase','API Design'],
};

// ── Role selection ────────────────────────────────────────────────
window.obSelectRole = function(role) {
  selRole(role); // calls the patched selRole which updates both old and new UI
};

// ── Step navigation ───────────────────────────────────────────────
window.obNextStep = function() {
  // Validate step 1 fields
  var fn  = (document.getElementById('ri-fn')||{}).value||'';
  var ln  = (document.getElementById('ri-ln')||{}).value||'';
  var em  = (document.getElementById('ri-em')||{}).value||'';
  var pw  = (document.getElementById('ri-pw')||{}).value||'';
  var co  = (document.getElementById('ri-co')||{}).value||'';

  if (!fn.trim() || !ln.trim()) { toast('Please enter your full name.','bad'); return; }
  if (!em.trim() || !/^[^@]+@[^@]+\.[^@]+$/.test(em)) { toast('Please enter a valid email.','bad'); return; }
  if (!pw || pw.length < 6) { toast('Password must be at least 6 characters.','bad'); return; }
  if (!co) { toast('Please select your country.','bad'); return; }

  // Slide to step 2
  _obStep = 2;
  var slider = document.getElementById('ob-slider');
  if (slider) slider.style.transform = 'translateX(-100%)';

  // Progress bar to 100%
  var prog = document.getElementById('ob-progress');
  if (prog) prog.style.width = '100%';

  // Step label
  var lbl = document.getElementById('ob-step-label');
  if (lbl) lbl.textContent = '2 / 2';

  // Show correct step 2 panel
  var isFreelancer = (typeof signupRole !== 'undefined') ? signupRole !== 'employer' : true;
  var fl  = document.getElementById('ob-step2-freelancer');
  var cl  = document.getElementById('ob-step2-client');
  if (fl) fl.style.display = isFreelancer ? '' : 'none';
  if (cl) cl.style.display = isFreelancer ? 'none' : '';

  // Build skill chips for freelancer
  if (isFreelancer) _obBuildSkillChips(_obCat || '');
};

window.obBack = function() {
  if (_obStep === 2) {
    _obStep = 1;
    var slider = document.getElementById('ob-slider');
    if (slider) slider.style.transform = 'translateX(0)';
    var prog = document.getElementById('ob-progress');
    if (prog) prog.style.width = '50%';
    var lbl = document.getElementById('ob-step-label');
    if (lbl) lbl.textContent = '1 / 2';
  } else {
    showLsScreen('start');
  }
};

// ── Category selection (step 2 freelancer) ───────────────────────
window.obSelectCat = function(el) {
  document.querySelectorAll('.ob-cat-pill').forEach(function(p){
    p.classList.remove('ob-selected');
  });
  el.classList.add('ob-selected');
  _obCat = el.dataset.val || el.getAttribute('data-val') || '';

  // Set hidden ri-cat input
  var catInput = document.getElementById('ri-cat');
  if (catInput) catInput.value = _obCat;

  // Rebuild skill chips for new category
  _obSkillsSel = [];
  _obBuildSkillChips(_obCat);
};

function _obBuildSkillChips(cat) {
  var grid = document.getElementById('ob-skills-grid');
  if (!grid) return;
  var skills = SKILLS_MAP[cat] || [];
  if (!skills.length) { grid.innerHTML = '<span style="font-size:11px;color:#b0bfaa;">Select a category first</span>'; return; }

  grid.innerHTML = skills.map(function(s) {
    var isSel = _obSkillsSel.indexOf(s) >= 0;
    return '<span class="ob-skill-chip'+(isSel?' ob-selected':'')+'" data-skill="'+s+'" onclick="obToggleSkill(this)">'
      + s + '</span>';
  }).join('');
  _obUpdateSkillCount();
}

window.obToggleSkill = function(el) {
  var skill = el.dataset.skill || el.getAttribute('data-skill') || '';
  var idx   = _obSkillsSel.indexOf(skill);
  if (idx >= 0) {
    _obSkillsSel.splice(idx, 1);
    el.classList.remove('ob-selected');
  } else {
    if (_obSkillsSel.length >= MAX_SKILLS) {
      // Shake feedback
      el.style.animation = 'ob-shake .3s';
      setTimeout(function(){ el.style.animation=''; }, 300);
      return;
    }
    _obSkillsSel.push(skill);
    el.classList.add('ob-selected');
  }
  _obUpdateSkillCount();
};

function _obUpdateSkillCount() {
  var cnt = document.getElementById('ob-skills-count');
  if (!cnt) return;
  cnt.textContent = _obSkillsSel.length + ' / ' + MAX_SKILLS + ' selected';
  cnt.style.color = _obSkillsSel.length === MAX_SKILLS ? '#1a6b3c' : '#b0bfaa';
}

// ── Client: set category from project intent ──────────────────────
window.obSetClientCat = function(val) {
  var catInput = document.getElementById('ri-cat');
  if (catInput) catInput.value = val;
};

// ── Email validation inline ───────────────────────────────────────
window.obValidateEmail = function(el) {
  var valid = el.value && /^[^@]+@[^@]+\.[^@]+$/.test(el.value);
  var check = document.getElementById('ob-em-check');
  if (check) check.style.opacity = valid ? '1' : '0';
};

// ── Password strength meter ───────────────────────────────────────
window.obPwStrength = function(val) {
  var score = 0;
  if (val.length >= 6)  score++;
  if (val.length >= 10) score++;
  if (/[A-Z]/.test(val) || /[0-9]/.test(val)) score++;
  if (/[^a-zA-Z0-9]/.test(val)) score++;

  var colors = ['','#ef4444','#f97316','#e8c547','#1a6b3c'];
  var labels = ['','Weak','Fair','Good','Strong'];
  for (var i = 1; i <= 4; i++) {
    var bar = document.getElementById('ob-pw-b'+i);
    if (bar) bar.style.background = i <= score ? colors[score] : '#e0e8dc';
  }
  var lbl = document.getElementById('ob-pw-label');
  if (lbl) {
    lbl.textContent = score > 0 ? labels[score] : '';
    lbl.style.color = score > 0 ? colors[score] : '#b0bfaa';
  }
};

// ── Reset when signup screen is shown ────────────────────────────
var _origShowLsScreen = window.showLsScreen;
window.showLsScreen = function(screen) {
  if (typeof _origShowLsScreen === 'function') _origShowLsScreen(screen);
  if (screen === 'signup') {
    // Reset to step 1
    _obStep = 1; _obCat = ''; _obSkillsSel = [];
    var slider = document.getElementById('ob-slider');
    if (slider) slider.style.transition = 'none';
    if (slider) slider.style.transform  = 'translateX(0)';
    // Re-enable transition after reset
    setTimeout(function(){
      if (slider) slider.style.transition = 'transform .42s cubic-bezier(.22,.68,0,1.2)';
    }, 50);
    var prog = document.getElementById('ob-progress');
    if (prog) prog.style.width = '50%';
    var lbl = document.getElementById('ob-step-label');
    if (lbl) lbl.textContent = '1 / 2';
    // Default to freelancer selected
    selRole('freelancer');
  }
};

})();

// ══════════════════════════════════════════════════════════════════
//  GOOGLE ROLE PICKER MODAL
//  Shown to new Google users BEFORE their account is created.
//  After picking role, creates the full user doc and enters app.
// ══════════════════════════════════════════════════════════════════

function _showGoogleRolePicker(fbUser, firstName) {
  // Remove any existing picker
  var old = document.getElementById('google-role-modal');
  if (old) old.remove();

  var modal = document.createElement('div');
  modal.id  = 'google-role-modal';
  modal.style.cssText = [
    'position:fixed;inset:0;z-index:9999',
    'background:rgba(0,0,0,.55)',
    'backdrop-filter:blur(8px)',
    '-webkit-backdrop-filter:blur(8px)',
    'display:flex;align-items:center;justify-content:center',
    'padding:24px',
    'animation:fadeIn .2s ease',
  ].join(';');

  modal.innerHTML = [
    '<div style="background:#fff;border-radius:28px;padding:28px 22px;width:100%;max-width:380px;box-shadow:0 24px 64px rgba(0,0,0,.3);">',
      // Avatar + name
      '<div style="display:flex;align-items:center;gap:12px;margin-bottom:22px;">',
        fbUser.photoURL
          ? '<img src="'+fbUser.photoURL+'" style="width:48px;height:48px;border-radius:50%;object-fit:cover;flex-shrink:0;border:2px solid #e8f5e9;">'
          : '<div style="width:48px;height:48px;border-radius:50%;background:#1a6b3c;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:18px;color:#fff;flex-shrink:0;">'+firstName[0].toUpperCase()+'</div>',
        '<div>',
          '<div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:800;font-size:15px;color:#0d1109;">Hi, '+firstName+'! 👋</div>',
          '<div style="font-size:11px;color:#7a8a74;margin-top:2px;">How will you use SkillStamp?</div>',
        '</div>',
      '</div>',

      // Role cards
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:11px;margin-bottom:22px;">',

        // Freelancer
        '<div id="gr-card-f" onclick="grSelectRole(\'freelancer\')" style="border:2px solid #e0e8dc;border-radius:20px;padding:20px 14px;text-align:center;cursor:pointer;transition:all .2s;background:#f7f9f6;">',
          '<div style="font-size:32px;margin-bottom:10px;">💼</div>',
          '<div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:800;font-size:13px;color:#0d1109;">Freelancer</div>',
          '<div style="font-size:10px;color:#7a8a74;margin-top:4px;line-height:1.4;">Find work<br>& get paid</div>',
          '<div id="gr-chk-f" style="margin-top:10px;opacity:0;transition:opacity .2s;">',
            '<span style="background:#1a6b3c;color:#fff;font-size:10px;font-weight:800;padding:3px 10px;border-radius:20px;">✓ Selected</span>',
          '</div>',
        '</div>',

        // Client
        '<div id="gr-card-e" onclick="grSelectRole(\'employer\')" style="border:2px solid #e0e8dc;border-radius:20px;padding:20px 14px;text-align:center;cursor:pointer;transition:all .2s;background:#f7f9f6;">',
          '<div style="font-size:32px;margin-bottom:10px;">🏢</div>',
          '<div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:800;font-size:13px;color:#0d1109;">Client</div>',
          '<div style="font-size:10px;color:#7a8a74;margin-top:4px;line-height:1.4;">Hire verified<br>talent</div>',
          '<div id="gr-chk-e" style="margin-top:10px;opacity:0;transition:opacity .2s;">',
            '<span style="background:#1a6b3c;color:#fff;font-size:10px;font-weight:800;padding:3px 10px;border-radius:20px;">✓ Selected</span>',
          '</div>',
        '</div>',

      '</div>',

      // CTA
      '<button id="gr-confirm-btn" onclick="grConfirm()" ',
        'style="width:100%;padding:15px;background:#1a6b3c;border:none;border-radius:16px;',
        'font-family:Plus Jakarta Sans,sans-serif;font-weight:800;font-size:15px;',
        'color:#fff;cursor:pointer;transition:opacity .15s;opacity:.4;" disabled>',
        'Continue →',
      '</button>',
      '<div style="font-size:10px;color:#b0bfaa;text-align:center;margin-top:12px;">',
        'You can change this later in Settings',
      '</div>',
    '</div>',
  ].join('');

  document.body.appendChild(modal);

  // Store fbUser for grConfirm to access
  window._grFbUser      = fbUser;
  window._grSelectedRole = null;
}

// Role selection inside the picker
window.grSelectRole = function(role) {
  window._grSelectedRole = role;

  var cardF = document.getElementById('gr-card-f');
  var cardE = document.getElementById('gr-card-e');
  var chkF  = document.getElementById('gr-chk-f');
  var chkE  = document.getElementById('gr-chk-e');
  var btn   = document.getElementById('gr-confirm-btn');

  if (cardF) cardF.style.cssText = 'border:2px solid '+(role==='freelancer'?'#1a6b3c':'#e0e8dc')+';border-radius:20px;padding:20px 14px;text-align:center;cursor:pointer;transition:all .2s;background:'+(role==='freelancer'?'rgba(26,107,60,.06)':'#f7f9f6')+';transform:'+(role==='freelancer'?'scale(1.03)':'scale(1)')+';box-shadow:'+(role==='freelancer'?'0 0 0 3px rgba(26,107,60,.15)':'none')+';';
  if (cardE) cardE.style.cssText = 'border:2px solid '+(role==='employer'?'#1a6b3c':'#e0e8dc')+';border-radius:20px;padding:20px 14px;text-align:center;cursor:pointer;transition:all .2s;background:'+(role==='employer'?'rgba(26,107,60,.06)':'#f7f9f6')+';transform:'+(role==='employer'?'scale(1.03)':'scale(1)')+';box-shadow:'+(role==='employer'?'0 0 0 3px rgba(26,107,60,.15)':'none')+';';
  if (chkF)  chkF.style.opacity  = role==='freelancer' ? '1' : '0';
  if (chkE)  chkE.style.opacity  = role==='employer'   ? '1' : '0';
  if (btn) { btn.disabled = false; btn.style.opacity = '1'; }
};

// Confirm and create the user account
window.grConfirm = async function() {
  var role   = window._grSelectedRole;
  var fbUser = window._grFbUser;
  if (!role || !fbUser) return;

  var btn = document.getElementById('gr-confirm-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Creating account…'; }

  try {
    var displayName = fbUser.displayName || '';
    var firstName   = displayName.split(' ')[0] || 'User';
    var fullName    = displayName || firstName;
    var email       = fbUser.email || '';
    var photoURL    = fbUser.photoURL || null;
    var uid         = fbUser.uid;

    // Build SkillID
    var ts36    = Date.now().toString(36).toUpperCase();
    var rand4   = Math.random().toString(36).substring(2,6).toUpperCase();
    var skillId = 'SKL-' + new Date().getFullYear() + '-' + ts36.slice(-2) + rand4;

    var gradients = ['#16a25a','#0ea5e9','#8b5cf6','#f59e0b','#ef4444','#ec4899'];
    var gradient  = gradients[Math.floor(Math.random() * gradients.length)];

    var newUser = {
      uid:      uid,
      email:    email,
      name:     fullName,
      role:     role,
      title:    role === 'freelancer' ? 'Digital Professional' : 'Client',
      bio: '', headline: '', country: '', category: '',
      skills: [], services: [], portfolio: [], applications: [],
      links: {},
      wallet: { balance: 0, pending: 0, earned: 0, transactions: [] },
      badgeStatus: 'beginner', score: 0, repPoints: 0, gigsCount: 0, earned: 0,
      skillId:  role === 'freelancer' ? skillId : null,
      gradient: gradient,
      avatar:   photoURL,
      available: true, availabilityStatus: 'available',
      isAdmin: false, isBanned: false,
      created:    Date.now(),
      lastSeen:   Date.now(),
      lastActive: Date.now(),
      _schemaVersion: 1,
    };

    // Save to Firestore
    await window.FB_FNS.setDoc(
      window.FB_FNS.doc(window.FB_DB, 'users', uid),
      newUser
    );

    // Save avatar separately
    if (photoURL) {
      try {
        await window.FB_FNS.setDoc(
          window.FB_FNS.doc(window.FB_DB, 'avatars', uid),
          { uid: uid, data: photoURL, ts: Date.now() }
        );
      } catch(e) {}
    }

    // Set ME
    window.ME = newUser;
    if (typeof normalizeUser === 'function') window.ME = normalizeUser(window.ME);

    // Remove modal
    var modal = document.getElementById('google-role-modal');
    if (modal) modal.remove();

    // Clean up globals
    window._grFbUser = null;
    window._grSelectedRole = null;

    toast('Welcome to SkillStamp, ' + firstName + '! 🎉');
    try { await _loadCacheAndEnter(true); } catch(e) { console.warn('cache enter', e); }

  } catch(err) {
    console.error('grConfirm error:', err);
    if (btn) { btn.disabled = false; btn.textContent = 'Continue →'; }
    toast('Account creation failed: ' + (err.message || err.code), 'bad');
  }
};
