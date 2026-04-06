// SkillStamp — Endorsements

// ══════════════════════════════════════════════
//  ENDORSEMENTS
// ══════════════════════════════════════════════
window.openEndorse=function(uid){
  var u=getUser(uid);if(!u)return;
  var myPrev=getEndorsements().filter(function(e){return e.fromUid===ME.uid&&e.toUid===uid;});
  var firstName=u.name.split(' ')[0];
  var skillOpts=(u.skills&&u.skills.length?u.skills:['General Skills']).map(function(s){return '<option>'+s+'</option>';}).join('');
  var prevHtml=myPrev.length?'<div style="padding:9px;background:rgba(232,197,71,.05);border:1px solid rgba(232,197,71,.18);border-radius:6px;font-size:10px;color:var(--gld);margin-bottom:13px;">Already endorsed: '+myPrev.map(function(e){return e.skill;}).join(', ')+'</div>':'';
  var starHtml='';
  [5,4,3,2,1].forEach(function(n){
    starHtml+='<label style="display:flex;align-items:center;gap:3px;cursor:pointer;font-size:11px;"><input type="radio" name="en-star" value="'+n+'"'+(n===5?' checked':'')+'>'+('★').repeat(n)+'</label>';
  });
  var mh='<button class="mclose" id="endorse-close">✕</button>';
  mh+='<h3>Endorse '+firstName+'</h3>';
  mh+='<p>Endorsements give +15 rep to '+firstName+' and +5 to you.</p>';
  mh+=prevHtml;
  mh+='<div class="fg"><label class="fl">Skill to Endorse</label><select class="fi" id="en-skill" style="width:100%;">'+skillOpts+'</select></div>';
  mh+='<div class="fg"><label class="fl">Your Feedback</label><textarea class="fi" id="en-comment" rows="3" placeholder="Describe your experience with '+firstName+'..." style="resize:vertical;width:100%;"></textarea></div>';
  mh+='<div class="fg"><label class="fl">Rating</label><div style="display:flex;gap:8px;flex-wrap:wrap;">'+starHtml+'</div></div>';
  mh+='<button class="btn" id="endorse-submit-btn">Submit Endorsement →</button>';
  setModal(mh);
  document.getElementById('endorse-close').onclick=closeModal;
  document.getElementById('endorse-submit-btn').onclick=function(){submitEndorse(uid);};
};


window.submitEndorse=async function(uid){
  const skill=document.getElementById('en-skill').value;
  const comment=document.getElementById('en-comment').value.trim();
  const stars=parseInt(document.querySelector('input[name="star"]:checked')?.value||5);
  if(!comment){toast('Please write a comment.','bad');return;}
  const e={
    id:'e'+Date.now(),fromUid:ME.uid,fromName:ME.name,fromGrad:ME.gradient,
    fromAvatar:ME.avatar||null,toUid:uid,skill,comment,stars,ts:Date.now()
  };
  await fbSet('endorsements', e.id, e);
  CACHE.endorsements.push(e);
  // Update target user rep
  const target=CACHE.users.find(u=>u.uid===uid);
  if(target){
    target.repPoints=(target.repPoints||0)+15;
    target.score=Math.min(5,(3.5+target.repPoints/200));
    saveUser(target);
  }
 saveUser(ME);
  pushNotif(uid,'endorsed','🤝 New Endorsement',ME.name+' endorsed you for '+skill+' and gave you '+stars+' stars',{type:'endorsed',fromUid:ME.uid,skill:skill});
  closeModal();
  toast('Endorsed! +5 rep points for you, +15 for them 🤝');
  if(document.getElementById('page-talent').classList.contains('active')) renderTalent();
};

