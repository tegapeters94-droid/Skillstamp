// SkillStamp — Home — Timeline render

// ══════════════════════════════════════════════
//  TIMELINE
// ══════════════════════════════════════════════
let postTypeActive='general';
window.selPostType=function(type,el){
  postTypeActive=type;
  document.querySelectorAll('.ptype').forEach(p=>p.classList.remove('active'));
  el.classList.add('active');
};

function renderTimeline(){
  // Update composer avatar
  const compAv=document.getElementById('composer-av');
  if(ME.avatar){compAv.innerHTML=`<img src="${ME.avatar}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;compAv.style.background='';}
  else{compAv.textContent=initials(ME.name);compAv.style.cssText=`width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,${ME.gradient},${ME.gradient}88);display:flex;align-items:center;justify-content:center;font-family:Plus Jakarta Sans,sans-serif;font-weight:800;font-size:14px;color:#000;flex-shrink:0;`;}
  const posts=getPosts().slice(0,50);
  const feed=document.getElementById('timeline-feed');
  feed.innerHTML=posts.map(p=>postHTML(p)).join('');
  // Sidebar
  renderTrending();renderSuggested();renderMyRepMini();
}

function postHTML(p){
  var u=getUser(p.uid)||{name:p.userName,gradient:p.userGrad||'#888',title:p.userTitle||'',avatar:p.userAvatar||null};
  var grad=u.gradient||'#888';
  var avStyle='width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,'+grad+','+grad+'88);display:flex;align-items:center;justify-content:center;font-family:Plus Jakarta Sans,sans-serif;font-weight:800;font-size:14px;color:#000;flex-shrink:0;cursor:pointer;overflow:hidden;';
  var avContent=u.avatar?'<img src="'+u.avatar+'" style="width:100%;height:100%;object-fit:cover;">':initials(u.name);
  var typeLabel='';
  if(p.type==='achievement') typeLabel='<div class="achievement-post" style="font-size:11px;">🏆 Achievement Unlocked</div>';
  else if(p.type==='skill') typeLabel='<div class="skill-verify-post" style="font-size:11px;">⚡ Skill Update</div>';
  else if(p.type==='hiring') typeLabel='<div style="background:rgba(96,165,250,.08);border:1px solid rgba(96,165,250,.18);border-radius:6px;padding:10px;margin-bottom:9px;font-size:11px;color:var(--blu);">💼 Hiring Post</div>';

  var deleteBtn='';
  if(p.uid===ME.uid) deleteBtn='<button onclick="deletePost(\''+p.id+'\')" style="background:none;border:none;color:var(--td);cursor:pointer;font-size:14px;padding:4px;">✕</button>';

  var profileBtn='';
  if(p.uid!==ME.uid) profileBtn='<div class="paction" style="cursor:pointer;" onclick="viewProfile(\''+p.uid+'\')">👤 Profile</div>';

  var content=(p.content||'').replace(/#(\w+)/g,'<span class="post-tag">#$1</span>');

  var commentsHtml='';
  var cs=p.comments||[];
  for(var ci=0;ci<cs.length;ci++){
    var c=cs[ci];
    commentsHtml+='<div style="display:flex;gap:8px;margin-bottom:8px;font-size:11px;">'
      +'<div style="width:26px;height:26px;border-radius:50%;background:'+(c.grad||'#888')+';display:flex;align-items:center;justify-content:center;font-family:Plus Jakarta Sans,sans-serif;font-weight:700;font-size:9px;color:#000;flex-shrink:0;">'+initials(c.name)+'</div>'
      +'<div style="background:var(--s2);border-radius:6px;padding:7px 10px;flex:1;">'
      +'<div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:600;font-size:10px;margin-bottom:2px;">'+c.name+'</div>'
      +c.text+'</div></div>';
  }

  var likeClass=p.liked?'paction liked':'paction';
  var commentCount=(p.comments&&p.comments.length)||0;

  return '<div class="post" id="post-'+p.id+'">'  
    +'<div class="post-header">'  
    +'<div style="'+avStyle+';flex-shrink:0;" onclick="viewProfile(\''+p.uid+'\')" >'+avContent+'</div>'  
    +'<div class="post-meta" style="flex:1;min-width:0;">'  
    +'<div style="display:flex;align-items:center;justify-content:space-between;">'  
    +'<div style="display:flex;align-items:center;gap:5px;flex-wrap:wrap;">'  
    +'<span class="post-name" onclick="viewProfile(\''+p.uid+'\')" >'+p.userName+(function(){var pu=getUser(p.uid);var bs=pu?pu.badgeStatus:(p.userBadge||'');return (bs==='verified'||bs==='expert'||bs==='elite')?verifiedSVG(getVerifColor()):'';})()+'</span>'  
    +'<span style="font-size:11px;color:var(--td);">· '+timeAgo(p.ts)+'</span>'  
    +'</div>'  
    +deleteBtn  
    +'</div>'  
    +'<div style="font-size:12px;color:var(--td);margin-bottom:6px;">'+(p.userTitle||'SkillStamp Member')+'</div>'  
    +'</div></div>'  
    +typeLabel  
    +(p.image?'<img src="'+p.image+'" class="post-img" alt="Post image">':'')  
    +'<div class="post-content">'+content+'</div>'  
    +'<div class="post-actions">'  
    +'<div class="paction like-btn '+(p.liked?'liked':'')+' " onclick="likePost(\''+p.id+'\')" style="gap:6px;"><svg width="18" height="18" viewBox="0 0 24 24" fill="'+(p.liked?'#ef4444':'none')+'" stroke="'+(p.liked?'#ef4444':'currentColor')+'" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg><span id="likes-'+p.id+'">'+p.likes+'</span></div>'  
    +'<div class="paction comment-btn" onclick="toggleComments(\''+p.id+'\')" ><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>'+commentCount+'</div>'  
    +'<div class="paction share-btn" onclick="sharePost(\''+p.id+'\')" ><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg></div>'  
    +'</div>'  
    +'<div id="comments-'+p.id+'" style="display:none;margin-top:10px;padding-top:10px;border-top:1px solid var(--br);">'  
    +commentsHtml  
    +'<div style="display:flex;gap:7px;margin-top:8px;">'  
    +'<input class="fi" id="comment-input-'+p.id+'" placeholder="Reply..." style="flex:1;padding:7px 10px;font-size:11px;border-radius:20px;" onkeydown="if(event.key===\'Enter\')submitComment(\''+p.id+'\')">'
    +'<button class="bsm" style="border-radius:20px;" onclick="submitComment(\''+p.id+'\')" >&rarr;</button>'  
    +'</div>'  
    +'</div>'  
    +'</div>';


}
window.submitPost=async function(){
  const text=document.getElementById('post-input').value.trim();
  if(!text&&!_postImageData){toast('Write something or add a photo!','bad');return;}
  // If image with no caption, that's fine - image speaks for itself
  const post={
    id:'p'+Date.now(),uid:ME.uid,userName:ME.name,userTitle:ME.title||'',
    userBadge:ME.badgeStatus||'beginner',userGrad:ME.gradient,userAvatar:ME.avatar||null,
    content:text,type:postTypeActive,image:_postImageData||null,likes:0,likedBy:[],comments:[],ts:Date.now()
  };
  // Write to Firebase
  await fbSet('posts', post.id, post);
  CACHE.posts.unshift(post);
  document.getElementById('post-input').value='';
  clearPostImage();
  saveUser(ME);
  toast('Posted! ✅');
  renderTimeline(); updateHomeStats();
};

window.likePost=async function(pid){
  const p=CACHE.posts.find(x=>x.id===pid);if(!p)return;
  if(!p.likedBy) p.likedBy=[];
  const alreadyLiked=p.likedBy.includes(ME.uid);
  if(alreadyLiked){
    p.likedBy=p.likedBy.filter(id=>id!==ME.uid); p.likes=Math.max(0,(p.likes||1)-1);
  } else {
    p.likedBy.push(ME.uid); p.likes=(p.likes||0)+1;
  }
  p.liked=!alreadyLiked;
  fbSet('posts', pid, p);
  const el=document.getElementById('likes-'+pid); if(el) el.textContent=p.likes;
  const btn=document.querySelector('#post-'+pid+' .paction');
  if(btn) btn.className='paction'+(p.liked?' liked':'');
  if(!alreadyLiked){
    // Notify post owner if not yourself
    if(p.uid&&p.uid!==ME.uid){
      pushNotif(p.uid,'post_liked','❤️ Post Liked',ME.name+' liked your post',{type:'post_liked',postId:pid});
    }
  }
};

window.toggleComments=function(pid){
  const el=document.getElementById('comments-'+pid);
  if(el)el.style.display=el.style.display==='none'?'block':'none';
};

window.submitComment=async function(pid){
  const inp=document.getElementById('comment-input-'+pid);
  const text=inp?.value?.trim(); if(!text)return;
  const p=CACHE.posts.find(x=>x.id===pid); if(!p)return;
  if(!p.comments) p.comments=[];
  p.comments.push({uid:ME.uid,name:ME.name,grad:ME.gradient,text,ts:Date.now()});
  await fbSet('posts', pid, p);
  inp.value='';
  renderTimeline();
  // Notify post owner if not yourself
  if(p.uid&&p.uid!==ME.uid){
    pushNotif(p.uid,'post_commented','💬 New Comment',ME.name+' commented on your post: "'+text.slice(0,60)+'"',{type:'post_commented',postId:pid});
  }
};

window.deletePost=function(pid){
  const posts=getPosts().filter(p=>p.id!==pid);savePosts(posts);
  toast('Post deleted.');renderTimeline();updateHomeStats();
};

window.sharePost=function(pid){
  navigator.clipboard&&navigator.clipboard.writeText(`Check out this SkillStamp post: ${window.location.href}#post/${pid}`).then(()=>toast('Link copied to clipboard! 📋'));
};

function renderTrending(){
  const freq={};
  getPosts().forEach(p=>{const tags=p.content.match(/#(\w+)/g)||[];tags.forEach(t=>freq[t]=(freq[t]||0)+1);});
  const top=Object.entries(freq).sort((a,b)=>b[1]-a[1]).slice(0,8);
  document.getElementById('trending-skills').innerHTML=top.map(([t,n])=>`<div style="display:flex;justify-content:space-between;font-size:11px;padding:5px 0;border-bottom:1px solid var(--br);cursor:pointer;" onclick="document.getElementById('post-input').value='${t} ';document.getElementById('post-input').focus()"><span style="color:var(--blu);">${t}</span><span style="color:var(--td);">${n} posts</span></div>`).join('');
}

function renderSuggested(){
  const users=getAllUsers().filter(u=>u.uid!==ME.uid&&u.role==='freelancer').sort(()=>Math.random()-.5).slice(0,4);
  document.getElementById('suggested-users').innerHTML=users.map(u=>`<div style="display:flex;align-items:center;gap:9px;margin-bottom:10px;">${avHTML(u,32,'50%')}<div style="flex:1;min-width:0;"><div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:600;font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${u.name}</div><div style="font-size:9px;color:var(--td);">${u.category}</div></div><button class="bblu" style="padding:4px 8px;font-size:9px;" onclick="viewProfile('${u.uid}')">View</button></div>`).join('');
}

function renderMyRepMini(){
  const el=document.getElementById('my-rep-mini');
  if(!el)return;
  el.innerHTML=`<div style="text-align:center;padding:8px 0;"><div style="font-family:Plus Jakarta Sans,sans-serif;font-size:32px;font-weight:800;color:var(--pur);line-height:1;">${ME.repPoints||0}</div><div style="font-size:9px;color:var(--td);margin-top:2px;">reputation points</div><div style="margin-top:10px;">${badgeHTML(ME.badgeStatus)}</div></div>`;
}

// ══════════════════════════════════════════════
//  AI SIMULATION
// ══════════════════════════════════════════════
function simulateAIActivity(){ /* Disabled — no fake activity */ }

