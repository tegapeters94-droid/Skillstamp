// SkillStamp — Getters, State Vars, Theme, Notifications

// ══════════════════════════════════════════════
//  GETTERS
// ══════════════════════════════════════════════
let ME=null, activeCat='All', activeGigCat='All', activeConv=null, postType='general', notifs=[];

function getAllUsers(){return CACHE.users||[];}
function getUser(uid){return CACHE.users.find(x=>x.uid===uid);}
function saveUser(u){
  // Update local ME if this is the current user
  if(ME&&ME.uid===u.uid) ME=u;
  // Sync cache
  var ci=CACHE.users.findIndex(x=>x.uid===u.uid);
  if(ci>=0) CACHE.users[ci]=u; else CACHE.users.push(u);
  // Save to Firebase — returns promise but don't block callers
  return fbSet('users', u.uid, u);
}
function getPosts(){return CACHE.posts||[];}
function savePosts(p){CACHE.posts=p;/* individual post ops use fbSet/fbAdd directly */}
function getGigs(){return CACHE.gigs||[];}
function saveGigs(g){CACHE.gigs=g;/* individual gig ops use fbSet directly */}
function getEndorsements(){return CACHE.endorsements||[];}
function saveEndorsements(e){/* endorse via fbSet */ void(e);}
function getMessages(){return CACHE.messages||{};}
function saveMessages(m){/* messages saved directly to Firebase */}
function getPending(){return LOCAL.get('pending')||[];}
function savePending(p){LOCAL.set('pending',p);}
// Apply saved theme immediately on load
(function(){
  var saved=localStorage.getItem('ss_theme');
  // Default to light mode if no preference saved
  if(!saved||saved==='light'){
    document.documentElement.setAttribute('data-theme','light');
    if(!saved) localStorage.setItem('ss_theme','light');
  }
})();

async function checkMaintenanceMode(){
  try{
    var meta=await fbGet('meta','maintenance');
    if(meta&&meta.active){
      if(ME&&ME.isAdmin) return false;
      var existing=document.getElementById('maintenance-screen');
      if(existing) existing.remove();
      var div=document.createElement('div');
      div.id='maintenance-screen';
      div.style.cssText='position:fixed;inset:0;background:#070706;display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:999999;text-align:center;padding:32px;';
      div.innerHTML='<div style="font-family:Syne,sans-serif;font-weight:800;font-size:28px;color:#1a6b3c;">Skill<span style="color:#f0ede6;">Stamp</span></div>'
        +'<div style="font-size:40px;margin:20px 0;">⚙️</div>'
        +'<div style="font-family:Syne,sans-serif;font-weight:800;font-size:18px;color:#f0ede6;margin-bottom:10px;">Under Maintenance</div>'
        +'<div style="font-size:13px;color:#6e6e66;line-height:1.7;max-width:300px;margin-bottom:16px;">'+(meta.message||'We are making improvements. We will be back shortly.')+'</div>'
        +(meta.returnTime?'<div style="font-size:11px;color:#1a6b3c;">Expected back: '+meta.returnTime+'</div>':'')
        +'<div style="font-size:10px;color:#6e6e66;margin-top:20px;">— The SkillStamp Team</div>';
      document.body.appendChild(div);
      return true;
    }
  }catch(e){}
  var existing=document.getElementById('maintenance-screen');
  if(existing) existing.remove();
  return false;
}

// Apply saved theme immediately on load
(function(){
  var saved=localStorage.getItem('ss_theme');
  if(saved==='light') document.documentElement.setAttribute('data-theme','light');
})();

function applyThemeBtn(){
  var isLight=document.documentElement.getAttribute('data-theme')==='light';
  var btn=document.getElementById('theme-btn');
  if(btn) btn.textContent=isLight?'🌙':'☀️';
}

window.toggleTheme=function(){
  var isLight=document.documentElement.getAttribute('data-theme')==='light';
  if(isLight){
    document.documentElement.removeAttribute('data-theme');
    localStorage.setItem('ss_theme','dark');
    var btn=document.getElementById('theme-btn');
    if(btn) btn.textContent='☀️';
  } else {
    document.documentElement.setAttribute('data-theme','light');
    localStorage.setItem('ss_theme','light');
    var btn=document.getElementById('theme-btn');
    if(btn) btn.textContent='🌙';
  }
};

// navigateFromNotif is defined in 16-notifications.js

async function pushNotif(uid, type, title, body, meta){
  // Save to Firebase so user sees it even after refresh
  var notifId='notif_'+Date.now()+'_'+Math.random().toString(36).slice(2,7);
  var notif={id:notifId,uid:uid,type:type,title:title,body:body,meta:meta||{},read:false,ts:Date.now()};
  try{ await fbSet('notifications',notifId,notif); }catch(e){}
  // If this is for the current user, also update local cache immediately
  if(ME&&ME.uid===uid){
    var existing=getNotifs();
    existing.unshift({id:notifId,type:type,title:title,msg:body,ts:Date.now(),read:false});
    saveNotifs(existing.slice(0,50));
    updateNotifBadge();
  }
}

function getNotifs(){return LOCAL.get('notifs:'+ME?.uid)||[];}
function saveNotifs(n){LOCAL.set('notifs:'+ME.uid,n);}
async function loadFirebaseNotifs(){
  if(!ME||!ME.uid) return;
  try{
    var all=await fbGetAll('notifications');
    var mine=all.filter(function(n){return n.uid===ME.uid;}).sort(function(a,b){return (b.ts||0)-(a.ts||0);});
    if(!mine.length) return;
    var existing=getNotifs();
    var existingIds=existing.map(function(n){return n.id||n.ts;});
    mine.forEach(function(n){
      if(existingIds.indexOf(n.id||n.ts)<0){
        existing.unshift({id:n.id,type:n.type,title:n.title||'Notification',body:n.body||n.message||n.msg||'',ts:n.ts,read:n.read||false});
      }
    });
    saveNotifs(existing.slice(0,50));
    updateNotifBadge();
  }catch(e){}
}

function addNotif(icon,msg){
  const n=getNotifs();
  n.unshift({id:'n'+Date.now(),icon,msg,ts:Date.now(),read:false});
  saveNotifs(n.slice(0,50));
  updateNotifBadge();
}

function updateNotifBadge(){
  const n=getNotifs();
  const unread=n.filter(x=>!x.read).length;
  const el=document.getElementById('notif-count');
  if(unread>0){el.textContent=unread;el.style.display='flex';}else el.style.display='none';
}

