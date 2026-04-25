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
window.selRole=function(r_){signupRole=r_;document.getElementById('role-f').classList.toggle('sel',r_==='freelancer');document.getElementById('role-e').classList.toggle('sel',r_==='employer');};

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

  try {
    const cred = await window.FB_FNS.signInWithEmailAndPassword(window.FB_AUTH, email, pass);
    const snap = await fbGet('users', cred.user.uid);
    if(!snap){showAErr('li-err','Account not found. Please sign up.');return;}
    ME = snap;
    // Check if banned BEFORE letting them in
    if(ME.isBanned||ME.badgeStatus==='suspended'){
      await window.FB_FNS.signOut(window.FB_AUTH);
      showBannedScreen();
      return;
    }
    if(save) LOCAL.set('saved_creds',{email,pass}); else LOCAL.del('saved_creds');
    LOCAL.set('session', ME.uid);
    startRealtimeListeners();
    await loadGigsToCache();
    await loadEndorsementsToCache();
    // Load avatar from dedicated collection (more reliable than user doc)
    fbGet('avatars', ME.uid).then(function(av){
      if(av&&av.data&&!ME.avatar){
        ME.avatar=av.data;
        var navAv=document.getElementById('nav-av');
        if(navAv){navAv.innerHTML='<img src="'+av.data+'" style="width:100%;height:100%;object-fit:cover;">';navAv.style.background='';}
      }
    }).catch(function(){});
    toast('Welcome back, '+ME.name.split(' ')[0]+'! 👋');
    setTimeout(function(){if(!LOCAL.get('ob_done_'+ME.uid)) showOnboarding(); else checkProfileComplete();},1200);
    // Seed test wallet if empty
    if(!ME.wallet) ME.wallet={balance:0,pending:0,earned:0,transactions:[]};
    var hasWelcome=(ME.wallet.transactions||[]).find(function(t){return t.id==='t_welcome';});
    if(!hasWelcome){
      ME.wallet.balance=(ME.wallet.balance||0)+1000;
      ME.wallet.transactions.unshift({id:'t_welcome',type:'in',amount:1000,from:'SkillStamp',desc:'Demo credit — not withdrawable (for testing only)',ts:Date.now()});
      saveUser(ME);
    }
    enterApp();
    // Force admin tab visible if isAdmin
    // Admin access via admin.html only
    showPage('home');
  } catch(e) {
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
  const category=document.getElementById('ri-cat').value;
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
      bio:'',skills:[],badgeStatus:'beginner',score:0,repPoints:0,
      gigsCount:0,earned:0,skillId:null,gradient:gradFor(name),
      wallet:{balance:0,pending:0,earned:0,transactions:[]},
      created:Date.now(),isAdmin:false,avatar:null
    };
    await fbSet('users', uid, user);
    CACHE.users.push(user);
    if(save) LOCAL.set('saved_creds',{email,pass}); else LOCAL.del('saved_creds');
    LOCAL.set('session', uid);
    ME = user;
    startRealtimeListeners();
    await loadGigsToCache();
    await loadEndorsementsToCache();
    toast('Welcome to SkillStamp, '+fn+'! 🎉');
    ME._isNew=true;
    enterApp();
    showPage('home');
    setTimeout(function(){if(!LOCAL.get('ob_done_'+ME.uid)) showOnboarding();},800);
    enterApp();
    showPage('home');
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
  if(_unsubPosts){_unsubPosts();_unsubPosts=null;}
  if(_unsubUsers){_unsubUsers();_unsubUsers=null;}
  ME=null; LOCAL.del('session'); activeConv=null;
  CACHE.users=[]; CACHE.posts=[]; CACHE.gigs=[]; CACHE.endorsements=[];
  var appEl=document.getElementById('screen-app');
  appEl.classList.remove('active'); appEl.style.display='none';
  var loginEl=document.getElementById('screen-login');
  loginEl.classList.add('active'); loginEl.style.display='';
  if(window.showLsScreen) showLsScreen('start');
  toast('Signed out.');
};

