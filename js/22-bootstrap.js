// SkillStamp — One-time Admin Bootstrap

// ═══════════════════════════════════════════════════════
//  ONE-TIME ADMIN BOOTSTRAP
// ═══════════════════════════════════════════════════════
(function checkBootstrap(){
  setTimeout(async function(){
    try {
      if(!window.FB_DB||!window.FB_FNS) return;
      var q=window.FB_FNS.query(
        window.FB_FNS.collection(window.FB_DB,'users'),
        window.FB_FNS.where('isAdmin','==',true),
        window.FB_FNS.limit(1)
      );
      var snap=await window.FB_FNS.getDocs(q);
      if(snap.empty){
        var panel=document.getElementById('bootstrap-panel');
        if(panel) panel.style.display='block';
      }
    } catch(e){}
  },2500);
})();

window.runBootstrap=async function(){
  var email=(document.getElementById('bootstrap-email')||{}).value.trim().toLowerCase();
  var msg=document.getElementById('bootstrap-msg');
  if(!email){if(msg) msg.textContent='Enter your email first.';return;}
  if(msg){msg.style.color='#e8c520';msg.textContent='Searching…';}
  try {
    var q=window.FB_FNS.query(
      window.FB_FNS.collection(window.FB_DB,'users'),
      window.FB_FNS.where('email','==',email),
      window.FB_FNS.limit(1)
    );
    var snap=await window.FB_FNS.getDocs(q);
    if(snap.empty){
      if(msg){msg.style.color='#ff6b35';msg.textContent='No account found. Sign up first, then use this.';}
      return;
    }
    var userDoc=snap.docs[0];
    var userData=userDoc.data();
    userData.isAdmin=true;
    await window.FB_FNS.setDoc(window.FB_FNS.doc(window.FB_DB,'users',userDoc.id),userData);
    if(msg){msg.style.color='#27ae60';msg.textContent='Done! '+userData.name+' is now admin. Sign in to access the admin panel.';}
    setTimeout(function(){
      var panel=document.getElementById('bootstrap-panel');
      if(panel) panel.style.display='none';
    },4000);
  } catch(e){
    if(msg){msg.style.color='#ff6b35';msg.textContent='Error: '+e.message;}
  }
};

