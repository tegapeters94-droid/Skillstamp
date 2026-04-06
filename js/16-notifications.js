// SkillStamp — Notifications

// ══════════════════════════════════════════════
//  NOTIFICATIONS
// ══════════════════════════════════════════════
window.toggleNotifs=function(){
  var panel=document.getElementById('notif-panel');
  if(panel.classList.contains('show')){
    panel.classList.remove('show');
    return;
  }
  // Load from Firebase first then render
  loadFirebaseNotifs().then(function(){
    renderNotifPanel();
    panel.classList.add('show');
    // Mark all as read
    var n=getNotifs().map(function(x){return Object.assign({},x,{read:true});});
    saveNotifs(n);
    updateNotifBadge();
  });
};

function renderNotifPanel(){
  var panel=document.getElementById('notif-panel');
  var notifs=getNotifs();
  var unreadCount=notifs.filter(function(n){return !n.read;}).length;

  var iconMap={
    hired:'🎉',application:'💼',gig_hired:'🎉',gig_application:'💼',
    verification_approved:'★',verification_rejected:'✗',
    payment:'💰',account_banned:'🚫',account_unbanned:'✅',
    delivery:'📦',revision:'🔄',post_liked:'❤️',post_commented:'💬',
    endorsed:'🤝',message:'💬',dispute_raised:'⚠️',gig_posted:'💼',default:'🔔'
  };

  var headHTML='<div class="notif-head">';
  headHTML+='<div class="notif-head-title">';
  headHTML+='<div class="notif-head-dot"></div>';
  headHTML+='Notifications';
  if(unreadCount>0) headHTML+='<span style="background:var(--gld);color:#000;font-size:9px;padding:2px 6px;border-radius:10px;font-weight:800;">'+unreadCount+' new</span>';
  headHTML+='</div>';
  headHTML+='<div class="notif-head-actions">';
  headHTML+='<button class="notif-head-btn" onclick="clearNotifs()">Clear all</button>';
  headHTML+='<button class="notif-head-btn" onclick="toggleNotifs()" style="font-size:14px;padding:0 4px;">✕</button>';
  headHTML+='</div></div>';

  var bodyHTML='<div class="notif-scroll">';
  if(!notifs.length){
    bodyHTML+='<div class="notif-empty">';
    bodyHTML+='<div class="notif-empty-icon">🔔</div>';
    bodyHTML+='<div class="notif-empty-text">All caught up! No notifications yet.</div>';
    bodyHTML+='</div>';
  } else {
    notifs.slice(0,30).forEach(function(n){
      var type=n.type||'default';
      var icon=iconMap[type]||iconMap.default;
      var title=n.title||'Notification';
      var msg=n.body||n.msg||'';
      var isUnread=!n.read;
      var metaStr=JSON.stringify(n.meta||{}).replace(/"/g,'&quot;');
      bodyHTML+='<div class="nitem'+(isUnread?' unread':'')+'" onclick="navigateFromNotif(\''+type+'\','+metaStr+')" style="cursor:pointer;">';
      bodyHTML+='<div class="nitem-icon type-'+type+'">'+icon+'</div>';
      bodyHTML+='<div class="nitem-body">';
      bodyHTML+='<div class="nitem-title">'+title+'</div>';
      if(msg) bodyHTML+='<div class="nitem-msg">'+msg+'</div>';
      bodyHTML+='<div class="nitem-time">'+timeAgo(n.ts)+'</div>';
      bodyHTML+='</div>';
      if(isUnread) bodyHTML+='<div class="nitem-unread-dot"></div>';
      bodyHTML+='</div>';
    });
  }
  bodyHTML+='</div>';

  panel.innerHTML=headHTML+bodyHTML;
}


window.clearNotifs=function(){saveNotifs([]);updateNotifBadge();document.getElementById('notif-panel').classList.remove('show');toast('Notifications cleared.');};


