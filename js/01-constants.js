// SkillStamp — Constants & Helpers

// ─── Setup Banner & Safety Timeout ───────────────────────
// Hide banner once Firebase is actually configured
window.addEventListener('load', function() {
  setTimeout(function() {
    try { if(window.FB_AUTH) document.getElementById('setup-banner').style.display='none'; } catch(e) {}
  }, 1500);
  // Safety timeout - show login if Firebase hasn't fired after 5 seconds
  setTimeout(function(){
    var loading=document.getElementById('screen-loading');
    var app=document.getElementById('screen-app');
    if(loading&&loading.style.display!=='none'){
      loading.style.display='none';
      if(!app||!app.classList.contains('active')) document.getElementById('screen-login').classList.add('active'); if(window.showLsScreen) showLsScreen('start');
    }
  },5000);
});

// ─── Main Application ────────────────────────────────────

// V6 cache buster - clears old data from previous versions
(function(){
  try {
    var ver = localStorage.getItem('ss5_app_version');
    if(ver !== 'fb1') {
      // Clear all old SkillStamp data
      var keys = [];
      for(var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if(k && k.indexOf('ss5_') === 0) keys.push(k);
      }
      for(var j = 0; j < keys.length; j++) localStorage.removeItem(keys[j]);
      localStorage.setItem('ss5_app_version', 'fb1');
    }
  } catch(e) {}
})();

