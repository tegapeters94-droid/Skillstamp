// SkillStamp — Mobile / iPhone

// ══════════════════════════════════════════════
//  MOBILE / iPHONE FUNCTIONS
// ══════════════════════════════════════════════
function setBottomNav(name){
  document.querySelectorAll('.bn').forEach(b=>b.classList.remove('active'));
  const bn=document.getElementById('bn-'+name);
  if(bn) bn.classList.add('active');
}

function updateBnBadge(){
  const msgs=getMessages();let total=0;
  Object.values(msgs).forEach(c=>{if(c.participants?.includes(ME?.uid))c.messages.forEach(m=>{if(m.from!==ME.uid&&!m.read)total++;});});
  const b=document.getElementById('bn-ubadge');
  if(b){if(total>0){b.textContent=total;b.style.display='flex';}else b.style.display='none';}
}

// Override showPage to also update bottom nav
const _origShowPage = window.showPage;
window.showPage = function(name){
  _origShowPage(name);
  setBottomNav(name);
  updateBnBadge();
  // Show/hide bottom nav based on screen
  const bn=document.getElementById('bottom-nav');
  // Only show bottom nav when app screen is active (not on login/loading)
  if(bn){
    var appActive=document.getElementById('screen-app')&&document.getElementById('screen-app').classList.contains('active');
    bn.style.display = appActive ? '' : 'none';
  }
};

// Override updateUnreadBadge to also update bottom nav
const _origUpdateUnread = window.updateUnreadBadge || function(){};
window.updateUnreadBadge = function(){
  _origUpdateUnread();
  updateBnBadge();
};

// Override enterApp to setup mobile avatar
const _origEnterApp = typeof enterApp === 'function' ? enterApp : null;

function setupMobileAv(){
  const bnAv=document.getElementById('bn-av');
  if(bnAv&&ME){
    if(ME.avatar) bnAv.innerHTML=`<img src="${ME.avatar}" style="width:22px;height:22px;border-radius:50%;object-fit:cover;">`;
    else bnAv.textContent=ME.name?ME.name[0].toUpperCase():'👤';
  }
}

// Patch enterApp to also setup mobile avatar (safe — enterApp is sync)
const _enterAppOrig = window.enterApp;
window.enterApp = function(){
  _enterAppOrig.apply(this, arguments);
  setTimeout(setupMobileAv, 300);
};

// Handle messages page on mobile - show conversation list
window.showMsgMobile = function(){ /* Bottom nav always visible */ };

// iOS tap fix - Safari requires this to enable click events on non-button elements
document.addEventListener('touchstart', function(){}, {passive:true});

// Fix iOS input zoom - already handled via CSS font-size:16px
// Add "Add to Home Screen" prompt hint for iOS
function showIOSInstallHint(){
  if(navigator.userAgent.includes('iPhone')||navigator.userAgent.includes('iPad')){
    const hint=document.createElement('div');
    hint.style.cssText='position:fixed;bottom:90px;left:50%;transform:translateX(-50%);background:var(--s);border:1px solid var(--gld);border-radius:10px;padding:10px 16px;font-size:10px;color:var(--td);z-index:9999;text-align:center;max-width:260px;box-shadow:0 4px 20px rgba(0,0,0,.5);';
    hint.innerHTML='<span style="color:var(--gld);font-family:Plus Jakarta Sans,sans-serif;font-weight:700;display:block;margin-bottom:3px;">📲 Add to Home Screen</span>Tap <strong>Share</strong> → <strong>Add to Home Screen</strong> for the best experience';
    document.body.appendChild(hint);
    setTimeout(()=>hint.remove(), 6000);
  }
}

// Show hint 3 seconds after login
setTimeout(()=>{if(ME) showIOSInstallHint();}, 3000);

// Call setupMobileAv on page load if session exists
window.addEventListener('load',()=>{
  setTimeout(()=>{
    if(ME) setupMobileAv();
  }, 500);
});



