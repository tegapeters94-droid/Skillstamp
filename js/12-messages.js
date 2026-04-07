// SkillStamp — Messages / Inbox

// ══════════════════════════════════════════════
//  MESSAGES
// ══════════════════════════════════════════════
function convId(a,b){return [a,b].sort().join('_');}

function sendAutoMsg(toUid,text){
  const msgs=getMessages();
  const cid=convId(ME.uid,toUid);
  if(!msgs[cid])msgs[cid]={participants:[ME.uid,toUid],messages:[]};
  msgs[cid].messages.push({from:ME.uid,text,ts:Date.now(),read:false});
  saveMessages(msgs);updateUnreadBadge();
}

function updateUnreadBadge(){
  const msgs=getMessages();let total=0;
  Object.values(msgs).forEach(c=>{if(c.participants?.includes(ME.uid))c.messages.forEach(m=>{if(m.from!==ME.uid&&!m.read)total++;});});
  const b=document.getElementById('ubadge');
  if(total>0){b.textContent=total;b.style.display='';}else b.style.display='none';
}

async function renderConvList(){
  var list=document.getElementById('conv-list');
  if(!list) return;
  list.innerHTML='<div style="padding:20px;text-align:center;font-size:12px;color:var(--td);">Loading…</div>';
  try {
    // Refresh users so names show correctly (not "Unknown")
    var freshUsers=await fbGetAll('users');
    if(freshUsers&&freshUsers.length) CACHE.users=freshUsers;
    // Load all conversations involving current user from Firebase
    var q=window.FB_FNS.query(
      window.FB_FNS.collection(window.FB_DB,'conversations'),
      window.FB_FNS.where('participants','array-contains',ME.uid)
    );
    var snap=await window.FB_FNS.getDocs(q);
    var convs=[];
    snap.forEach(function(d){ convs.push({id:d.id,...d.data()}); });
    convs.sort(function(a,b){return (b.lastTs||0)-(a.lastTs||0);});
    if(!convs.length){
      list.innerHTML='<div style="padding:18px;color:var(--td);font-size:11px;text-align:center;">No conversations yet.<br>Message someone from the Talent page.</div>';
      return;
    }
    var h='';
    convs.forEach(function(c){
      var otherId=c.participants.find(function(p){return p!==ME.uid;});
      var other=getUser(otherId)||{name:'Unknown',gradient:'#888'};
      var lastMsg=c.messages&&c.messages.length?c.messages[c.messages.length-1]:null;
      var unread=c.messages?c.messages.filter(function(m){return m.from!==ME.uid&&!m.read;}).length:0;
      var avH=other.avatar
        ?'<img src="'+other.avatar+'" style="width:40px;height:40px;border-radius:50%;object-fit:cover;">'
        :'<div style="width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,'+other.gradient+','+other.gradient+'88);display:flex;align-items:center;justify-content:center;font-family:Plus Jakarta Sans,sans-serif;font-weight:800;font-size:14px;color:#fff;flex-shrink:0;">'+initials(other.name)+'</div>';
      h+='<div style="display:flex;align-items:center;border-bottom:1px solid var(--br);background:'+(unread?'rgba(255,107,53,.04)':'var(--bg)')+';">'
        +'<div onclick="openConv(this.dataset.cid)" data-cid="'+c.id+'" style="display:flex;align-items:center;gap:11px;padding:13px 16px;cursor:pointer;flex:1;min-width:0;">'

        +avH
        +'<div style="flex:1;min-width:0;">'
        +'<div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:700;font-size:13px;display:flex;justify-content:space-between;">'
        +'<span>'+other.name+'</span>'
        +(unread?'<span style="background:var(--acc);color:#fff;border-radius:8px;padding:1px 6px;font-size:9px;">'+unread+'</span>':'<span style="font-size:9px;color:var(--td);">'+(lastMsg?timeAgo(lastMsg.ts):'')+'</span>')
        +'</div>'
        +'<div style="font-size:11px;color:var(--td);overflow:hidden;white-space:nowrap;text-overflow:ellipsis;">'+(lastMsg?lastMsg.text:'Start a conversation')+'</div>'
        +'</div></div>'
        +'<button onclick="event.stopPropagation();deleteConv(\''+c.id+'\')" style="background:none;border:none;color:var(--td);font-size:15px;padding:13px 14px;cursor:pointer;flex-shrink:0;opacity:.4;">🗑</button>'
        +'</div>';
    });
    list.innerHTML=h;
  } catch(e){
    list.innerHTML='<div style="padding:18px;color:var(--td);font-size:11px;text-align:center;">No conversations yet.<br>Message someone from the Talent page.</div>';
  }
}

window.openConv=async function(cid){
  activeConv=cid;
  // Refresh users cache so names show correctly
  var freshUsers=await fbGetAll('users');
  if(freshUsers&&freshUsers.length) CACHE.users=freshUsers;
  // Load conversation from Firebase
  var convData = await fbGet('conversations', cid);
  if(!convData) convData = {participants:[ME.uid], messages:[]};
  // Store in cache
  if(!CACHE.messages) CACHE.messages={};
  CACHE.messages[cid] = convData;
  convData.messages.forEach(function(m){if(m.from!==ME.uid) m.read=true;});
  fbSet('conversations', cid, convData);
  updateUnreadBadge();
  var otherId=convData.participants.find(function(p){return p!==ME.uid;});
  var other=getUser(otherId)||{name:'Unknown',gradient:'#888',title:'',country:''};
  var avH=other.avatar
    ?'<img src="'+other.avatar+'" style="width:38px;height:38px;border-radius:50%;object-fit:cover;">'
    :'<div style="width:38px;height:38px;border-radius:50%;background:linear-gradient(135deg,'+other.gradient+','+other.gradient+'88);display:flex;align-items:center;justify-content:center;font-family:Plus Jakarta Sans,sans-serif;font-weight:800;font-size:13px;color:#fff;">'+initials(other.name)+'</div>';
  var msgsH='';
  convData.messages.forEach(function(m){
    var isMe=m.from===ME.uid;
    msgsH+='<div style="display:flex;justify-content:'+(isMe?'flex-end':'flex-start')+';margin-bottom:10px;">'
      +'<div style="max-width:75%;background:'+(isMe?'var(--acc)':'var(--s)')+';color:'+(isMe?'#fff':'var(--fg)')+';border-radius:'+(isMe?'12px 12px 2px 12px':'12px 12px 12px 2px')+';padding:9px 13px;font-size:12px;line-height:1.5;">'
      +m.text
      +'<div style="font-size:9px;opacity:.6;margin-top:3px;text-align:'+(isMe?'right':'left')+';">'+timeAgo(m.ts)+'</div>'
      +'</div></div>';
  });
  var pg=document.getElementById('page-messages');
  if(!pg) return;
  pg.innerHTML='<div style="display:flex;flex-direction:column;height:calc(100vh - 125px - 65px);max-height:calc(100vh - 125px - 65px);">'
    +'<div style="display:flex;align-items:center;gap:10px;padding:12px 16px;border-bottom:1px solid var(--br);background:var(--bg);">'
    +'<button onclick="backToInbox()" style="background:none;border:none;color:var(--fg);font-size:18px;cursor:pointer;">←</button>'
    +avH
    +'<div><div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:700;font-size:13px;display:flex;align-items:center;gap:4px;">'+other.name+((['verified','expert','elite'].indexOf(other.badgeStatus)>=0)?verifiedSVG(getVerifColor()):'')+'</div>'
    +'<div style="font-size:10px;color:var(--td);">'+( other.title||other.role||'')+'</div></div>'
    +'</div>'
    +'<div id="msg-feed" style="flex:1;overflow-y:auto;padding:14px 16px;">'+msgsH+'</div>'
    +'<div class="msg-input-bar" style="padding:10px 14px;padding-bottom:max(14px,env(safe-area-inset-bottom));border-top:1px solid var(--br);display:flex;gap:8px;background:var(--bg);flex-shrink:0;position:relative;z-index:1;">'
    +'<input class="fi" id="msg-input" placeholder="Type a message\u2026" style="flex:1;" data-cid="'+cid+'" data-other="'+otherId+'" onkeydown="if(event.key===\'Enter\'){var el=this;sendMsg(el.dataset.cid,el.dataset.other);}">' 
    +'<button class="hbtn" onclick="var el=document.getElementById(\'msg-input\');sendMsg(el.dataset.cid,el.dataset.other)" style="padding:10px 16px;">Send</button>'
    +'</div></div>';
  var feed=document.getElementById('msg-feed');
  if(feed) feed.scrollTop=feed.scrollHeight;
  // Real-time listener for new messages
  if(window._unsubConv) window._unsubConv();
  try{
    window._unsubConv = window.FB_FNS.onSnapshot(
      window.FB_FNS.doc(window.FB_DB,'conversations',cid),
      function(snap){
        if(!snap.exists()) return;
        var data=snap.data();
        var feed2=document.getElementById('msg-feed');
        if(!feed2) return; // User left the conversation
        var msgsH='';
        (data.messages||[]).forEach(function(m){
          var isMe=m.from===ME.uid;
          msgsH+='<div style="display:flex;justify-content:'+(isMe?'flex-end':'flex-start')+';margin-bottom:10px;">'
            +'<div style="max-width:75%;background:'+(isMe?'var(--acc)':'var(--s)')+';color:'+(isMe?'#fff':'var(--fg)')+';border-radius:'+(isMe?'12px 12px 2px 12px':'12px 12px 12px 2px')+';padding:9px 13px;font-size:12px;line-height:1.5;">'
            +m.text
            +'<div style="font-size:9px;opacity:.6;margin-top:3px;text-align:'+(isMe?'right':'left')+';">'+timeAgo(m.ts)+'</div>'
            +'</div></div>';
        });
        var wasAtBottom=feed2.scrollHeight-feed2.scrollTop<=feed2.clientHeight+60;
        feed2.innerHTML=msgsH;
        if(wasAtBottom) feed2.scrollTop=feed2.scrollHeight;
      }
    );
  } catch(e){ console.warn('Conv listener error',e); }
};

window.backToInbox=function(){
  if(window._unsubConv){ window._unsubConv(); window._unsubConv=null; }
  var pg=document.getElementById('page-messages');
  if(pg){
    var inboxHTML = '<div class="msg-layout">';
    inboxHTML += '<div class="msg-sb">';
    inboxHTML += '<div style="padding:14px 16px;border-bottom:1px solid var(--br);">Inbox <button class="bsm" onclick="openNewMsg()">+ New</button></div>';
    inboxHTML += '<div id="conv-list"></div>';
    inboxHTML += '</div>';
    inboxHTML += '<div class="msg-main" id="msg-main">';
    inboxHTML += '<div style="flex:1;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:10px;color:var(--td);">';
    inboxHTML += '<div style="font-size:32px;">💬</div>';
    inboxHTML += '<div style="font-size:12px;">Select a conversation</div>';
    inboxHTML += '</div></div></div>';
    pg.innerHTML = inboxHTML;
  }
  renderConvList();
};

window.sendMsg=async function(cid,otherId){
  const inp=document.getElementById('msg-input');
  const text=inp.value.trim(); if(!text)return; inp.value='';
  const msg={from:ME.uid,text,ts:Date.now(),read:false};
  // Store in Firebase under conversations/{cid}/messages
  const convRef = 'convs_'+cid;
  const convData = (await fbGet('conversations', cid)) || {participants:[ME.uid,otherId],messages:[]};
  convData.messages.push(msg);
  convData.lastMsg=text; convData.lastTs=Date.now();
  await fbSet('conversations', cid, convData);
  // Notify recipient
  pushNotif(otherId,'message','💬 New Message',ME.name+': '+text.slice(0,80),{type:'message',cid:cid,fromUid:ME.uid});
  openConv(cid);
};

window.deleteMsg=async function(cid,msgTs){
  if(!confirm('Delete this message?')) return;
  var convData=await fbGet('conversations',cid);
  if(!convData) return;
  convData.messages=convData.messages.filter(function(m){
    return !(m.ts===msgTs&&m.from===ME.uid);
  });
  var last=convData.messages[convData.messages.length-1];
  convData.lastMsg=last?last.text:'';
  convData.lastTs=last?last.ts:0;
  await fbSet('conversations',cid,convData);
  toast('Message deleted.');
};

window.deleteConv=async function(cid){
  if(!confirm('Delete this entire conversation? This cannot be undone.')) return;
  try{
    await window.FB_FNS.deleteDoc(window.FB_FNS.doc(window.FB_DB,'conversations',cid));
    toast('Conversation deleted.');
    renderConvList();
  }catch(e){ toast('Could not delete. Try again.','bad'); }
};

window.openMsg=async function(uid){
  const cid=convId(ME.uid,uid);
  // Ensure target user in cache
  if(!getUser(uid)){
    var freshUser=await fbGet('users',uid);
    if(freshUser){
      var ci=CACHE.users.findIndex(function(u){return u.uid===uid;});
      if(ci>=0) CACHE.users[ci]=freshUser; else CACHE.users.push(freshUser);
    }
  }
  // Create conversation in Firebase so participants are correct
  try{
    var existing=await fbGet('conversations',cid);
    if(!existing){
      await fbSet('conversations',cid,{participants:[ME.uid,uid],messages:[],lastMsg:'',lastTs:Date.now()});
    } else if(!existing.participants||!existing.participants.includes(uid)){
      existing.participants=[ME.uid,uid];
      await fbSet('conversations',cid,existing);
    }
  }catch(e){
    await fbSet('conversations',cid,{participants:[ME.uid,uid],messages:[],lastMsg:'',lastTs:Date.now()});
  }
  // Navigate to messages page first, then open the conversation
  showPage('messages');
  // Wait for inbox to render before opening conv (prevents blank white page)
  setTimeout(function(){ openConv(cid); }, 400);
};

window.openNewMsg=function(){
  var allUsers=getAllUsers().filter(function(u){return u.uid!==ME.uid;}).slice(0,50);
  var listHTML='';
  allUsers.forEach(function(u){
    listHTML+='<div class="nm-user-row" data-uid="'+u.uid+'" style="display:flex;align-items:center;gap:9px;padding:10px;background:var(--s2);border:1px solid var(--br);border-radius:var(--r);cursor:pointer;margin-bottom:6px;">';
    listHTML+=avHTML(u,34,'50%');
    listHTML+='<div style="flex:1;"><div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:600;font-size:11px;">'+u.name+'</div>';
    listHTML+='<div style="font-size:9px;color:var(--td);">'+(u.title||u.role||'')+'</div></div>';
    listHTML+=badgeHTML(u.badgeStatus);
    listHTML+='</div>';
  });
  var mh='<button class="mclose" id="nm-close">X</button>';
  mh+='<h3>New Message</h3><p>Choose who to message:</p>';
  mh+='<input class="fi" id="nm-search" placeholder="Search users..." style="margin-bottom:10px;width:100%;">';
  mh+='<div style="display:flex;flex-direction:column;max-height:360px;overflow-y:auto;" id="nm-list">'+listHTML+'</div>';
  setModal(mh);
  document.getElementById('nm-close').onclick=closeModal;
  document.getElementById('nm-list').onclick=function(e){
    var row=e.target.closest('[data-uid]');
    if(row){ closeModal(); openMsg(row.dataset.uid); }
  };
  document.getElementById('nm-search').oninput=function(){
    filterMsgSearch(this.value);
  };
};
window.filterMsgSearch=function(q){
  var users=getAllUsers().filter(function(u){
    return u.uid!==ME.uid&&u.name.toLowerCase().includes(q.toLowerCase());
  }).slice(0,20);
  var listHTML='';
  users.forEach(function(u){
    listHTML+='<div class="nm-user-row" data-uid="'+u.uid+'" style="display:flex;align-items:center;gap:9px;padding:10px;background:var(--s2);border:1px solid var(--br);border-radius:var(--r);cursor:pointer;margin-bottom:6px;">';
    listHTML+=avHTML(u,34,'50%');
    listHTML+='<div style="flex:1;"><div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:600;font-size:11px;">'+u.name+'</div>';
    listHTML+='<div style="font-size:9px;color:var(--td);">'+(u.title||u.role||'')+'</div></div>';
    listHTML+=badgeHTML(u.badgeStatus);
    listHTML+='</div>';
  });
  var list=document.getElementById('nm-list');
  if(list){
    list.innerHTML=listHTML;
    list.onclick=function(e){
      var row=e.target.closest('[data-uid]');
      if(row){ closeModal(); openMsg(row.dataset.uid); }
    };
  }
};

