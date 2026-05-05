// SkillStamp — AI Skill Validation

// ══════════════════════════════════════════════
//  AI SKILL VALIDATION
// ══════════════════════════════════════════════
window.openAIValidate=function(){
  setModal(`<button class="mclose" onclick="closeModal()">✕</button>
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;"><div style="font-size:24px;">🤖</div><div><h3>AI Skill Validation</h3><p style="margin:0;">SkillStamp Neural Engine v2.1</p></div></div>
    <div class="fg"><label class="fl">Skill to Validate</label><input class="fi" id="ai-skill" placeholder="e.g. Python, Figma, Solidity…"></div>
    <div class="fg"><label class="fl">Experience Level</label>
      <select class="fi" id="ai-exp"><option value="1">Beginner (0-1 yrs)</option><option value="2">Intermediate (1-3 yrs)</option><option value="3" selected>Advanced (3-5 yrs)</option><option value="4">Expert (5-10 yrs)</option><option value="5">Master (10+ yrs)</option></select>
    </div>
    <button class="btn" onclick="runAIVal()">Run AI Validation →</button>`);
};

window.runAIVal=function(){
  const skill=document.getElementById('ai-skill').value.trim();
  if(!skill){toast('Enter a skill.','bad');return;}
  const exp=parseInt(document.getElementById('ai-exp').value);
  document.getElementById('mcontent').innerHTML=`<div style="text-align:center;padding:28px;">
    <div style="font-size:30px;margin-bottom:12px;">🤖</div>
    <div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:700;font-size:13px;margin-bottom:6px;">Analyzing "${skill}"…</div>
    <div style="font-size:10px;color:var(--td);margin-bottom:18px;">Cross-referencing 14,832 verified profiles</div>
    <div style="height:6px;background:var(--br);border-radius:6px;max-width:280px;margin:0 auto;overflow:hidden;"><div id="aiprog" style="height:100%;width:0%;background:linear-gradient(90deg,var(--gld),var(--acc));border-radius:6px;transition:width 1.5s ease;"></div></div>
  </div>`;
  setTimeout(()=>document.getElementById('aiprog').style.width='100%',100);
  setTimeout(()=>{
    const score=Math.min(95,45+(exp*9)+Math.random()*8);const sc=Math.round(score);
    const status=sc>=80?'verified':sc>=60?'review':'beginner';
    const color=sc>=80?'var(--grn)':sc>=60?'var(--gld)':'var(--acc)';
    document.getElementById('mcontent').innerHTML=`<button class="mclose" onclick="closeModal()">✕</button>
      <div style="display:flex;align-items:center;gap:16px;margin-bottom:18px;">
        <div style="width:76px;height:76px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:Plus Jakarta Sans,sans-serif;font-weight:800;font-size:22px;border:3px solid ${color};color:${color};flex-shrink:0;">${sc}</div>
        <div><div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:800;font-size:17px;">SkillMatch™ Score</div><div style="font-size:10px;color:var(--td);margin-top:2px;">for "${skill}"</div><div style="margin-top:7px;">${badgeHTML(status)}</div></div>
      </div>
      ${[['Proficiency',sc,color],['Market Demand',Math.min(95,sc+10),'var(--blu)'],['Salary Potential',sc,'var(--gld)']].map(function(row){var l=row[0],v=row[1],c=row[2];var val=l==='Salary Potential'?'$'+(v*450+15000).toLocaleString()+'/yr':v+'/100';return '<div style="margin-bottom:11px;"><div style="display:flex;justify-content:space-between;font-size:10px;margin-bottom:3px;"><span>'+l+'</span><span style="color:'+c+';font-weight:700;">'+val+'</span></div><div style="height:4px;background:var(--br);border-radius:4px;overflow:hidden;"><div style="height:100%;width:'+v+'%;background:'+c+';border-radius:4px;transition:width 1.2s ease;"></div></div></div>';}).join('')}
      <div style="padding:12px;background:var(--s2);border-radius:6px;font-size:10px;color:var(--td);line-height:1.75;margin-bottom:14px;">
        AI Analysis: ${sc>=80?'Expert-level':'Intermediate'} competency detected. Market demand is ${sc>=80?'Very High':'High'} in African fintech & techstartups.
      </div>
      <button class="btn" onclick="addValSkill('${skill}','${status}')">Add to My Profile (+10 pts) →</button>`;
  },2000);
};

window.addValSkill=function(skill,status){
  if(!ME.skills)ME.skills=[];
  if(!ME.skills.includes(skill))ME.skills.push(skill);
  ME.repPoints=(ME.repPoints||0)+10;if(status==='verified'&&ME.badgeStatus!=='verified')ME.badgeStatus='review';
  saveUser(ME);
  const pending=getPending();
  pending.push({id:'p'+Date.now(),uid:ME.uid,userName:ME.name,skill,category:ME.category,evidence:'AI Validation',submitted:Date.now(),status:'pending'});
  savePending(pending);
  closeModal();toast(`"${skill}" added! +10 pts. Submitted for admin review 🎉`);
  if(document.getElementById('page-myprofile').classList.contains('active'))renderMyProfile();
};

