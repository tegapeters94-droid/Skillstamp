// SkillStamp — Training Centers

// ═══════════════════════════════════════════════════════
// TRAINING CENTERS
// ═══════════════════════════════════════════════════════
function renderCentersV6(){
  var ac=LOCAL.get('ctcat')||'All';
  var cats=['All','Tech','Data','Design','Blockchain','Marketing'];
  var icons={Tech:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>',Data:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>',Design:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="13.5" cy="6.5" r=".5"/><circle cx="17.5" cy="10.5" r=".5"/><circle cx="8.5" cy="7.5" r=".5"/><circle cx="6.5" cy="12.5" r=".5"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg>',Blockchain:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>',Marketing:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>'};
  var fil=ac==='All'?CENTERS:CENTERS.filter(function(c){return c.category===ac;});

  var catH='';
  for(var ci=0;ci<cats.length;ci++){
    catH+='<div class="cat'+(ac===cats[ci]?' on':'')+'" onclick="setCtcat(\''+cats[ci]+'\')">'+cats[ci]+'</div>';
  }

  var cardsH='';
  for(var i=0;i<fil.length;i++){
    var c=fil[i];
    var icon=icons[c.category]||'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>';
    var crsH='';
    for(var j=0;j<c.courses.length;j++) crsH+='<span class="chip" style="font-size:9px;">'+c.courses[j]+'</span>';
    cardsH+='<div class="center-card">'
      +'<div style="display:flex;gap:12px;align-items:flex-start;margin-bottom:10px;">'
      +'<div style="width:46px;height:46px;border-radius:10px;background:rgba(232,197,71,.06);border:1px solid rgba(232,197,71,.18);display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0;">'+icon+'</div>'
      +'<div style="flex:1;"><div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:700;font-size:13px;margin-bottom:2px;">'+c.name+'</div>'
      +'<div style="font-size:10px;color:var(--td);">'+flag(c.country)+' '+c.city+', '+c.country+'</div>'
      +(c.verified?'<span style="display:inline-block;margin-top:3px;background:rgba(74,222,128,.1);border:1px solid rgba(74,222,128,.25);color:var(--grn);font-size:8px;padding:1px 6px;border-radius:4px;font-family:Plus Jakarta Sans,sans-serif;font-weight:700;">✓ VERIFIED</span>':'')
      +'</div>'
      +'<div style="text-align:right;flex-shrink:0;"><div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:700;font-size:15px;color:var(--gld);">'+c.rating+'★</div>'
      +'<div style="font-size:9px;color:var(--td);">'+c.students.toLocaleString()+' trained</div></div></div>'
      +'<div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:10px;">'+crsH+'</div>'
      +'<div style="display:flex;align-items:center;font-size:10px;color:var(--td);margin-bottom:10px;"><span class="clive"></span>'+c.address+'</div>'
      +'<div style="display:flex;gap:7px;">'
      +'<button class="hbtn" style="flex:1;padding:9px;font-size:11px;" onclick="openCenterV6(\''+c.id+'\')">Enrol Here</button>'
      +'<button class="hbtn2" style="padding:9px 12px;font-size:11px;" onclick="contactCenterV6(\''+c.id+'\')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.21h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.91a16 16 0 0 0 6.1 6.1l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg></button>'
      +'</div></div>';
  }

  return '<div style="padding:18px 16px 0;">'
    +'<div style="display:flex;align-items:center;gap:12px;margin-bottom:14px;">'
    +'<span style="font-size:30px;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg></span>'
    +'<div><div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:800;font-size:20px;">Training Centers</div>'
    +'<div style="font-size:10px;color:var(--td);">Find a SkillStamp-certified center near you</div></div></div>'
    +'<input class="fi" placeholder="Search city, country or skill..." style="margin-bottom:10px;" oninput="searchCentersV6(this.value)">'
    +'<div class="cats">'+catH+'</div></div>'
    +'<div style="padding:0 16px 100px;" id="centers-grid">'+cardsH+'</div>';
}
window.renderCentersV6=renderCentersV6;

function setCtcat(cat){LOCAL.set('ctcat',cat);var p=document.getElementById('page-centers');if(p)p.innerHTML=renderCentersV6();}
window.setCtcat=setCtcat;

function searchCentersV6(q){
  var g=document.getElementById('centers-grid');if(!g)return;
  var fil=q?CENTERS.filter(function(c){return c.name.toLowerCase().indexOf(q.toLowerCase())>=0||c.city.toLowerCase().indexOf(q.toLowerCase())>=0||c.country.toLowerCase().indexOf(q.toLowerCase())>=0;}):CENTERS;
  var h='';
  for(var i=0;i<fil.length;i++){
    var c=fil[i];
    h+='<div class="center-card" onclick="openCenterV6(\''+c.id+'\')" style="cursor:pointer;">'
      +'<div style="display:flex;justify-content:space-between;align-items:center;">'
      +'<div><div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:700;font-size:13px;">'+c.name+'</div>'
      +'<div style="font-size:10px;color:var(--td);">'+flag(c.country)+' '+c.city+' · '+c.rating+'★</div></div>'
      +'<span style="font-size:22px;">'+(({Tech:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>',Data:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>',Design:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="13.5" cy="6.5" r=".5"/><circle cx="17.5" cy="10.5" r=".5"/><circle cx="8.5" cy="7.5" r=".5"/><circle cx="6.5" cy="12.5" r=".5"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg>',Blockchain:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>',Marketing:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>'})[c.category]||'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>')+'</span>'
      +'</div></div>';
  }
  g.innerHTML=h;
}
window.searchCentersV6=searchCentersV6;

function openCenterV6(cid){
  var c=null;
  for(var i=0;i<CENTERS.length;i++) if(CENTERS[i].id===cid){c=CENTERS[i];break;}
  if(!c)return;
  var crsH='';
  for(var j=0;j<c.courses.length;j++) crsH+='<span class="chip" style="margin:2px;">'+c.courses[j]+'</span>';
  setModal('<button class="mclose" onclick="closeModal()">✕</button>'
    +'<h3 style="margin-bottom:4px;">'+c.name+'</h3>'
    +'<div style="font-size:10px;color:var(--td);margin-bottom:14px;">'+flag(c.country)+' '+c.address+'</div>'
    +'<div style="display:grid;gap:6px;margin-bottom:14px;">'
    +'<div class="irow"><span class="ilbl">Students Trained</span><span class="ival">'+c.students.toLocaleString()+'</span></div>'
    +'<div class="irow"><span class="ilbl">Rating</span><span class="ival" style="color:var(--gld);">'+c.rating+' ★</span></div>'
    +'<div class="irow"><span class="ilbl">Capacity</span><span class="ival">'+c.capacity+' students</span></div>'
    +'<div class="irow"><span class="ilbl">Email</span><span class="ival" style="color:var(--blu);">'+c.email+'</span></div>'
    +'<div class="irow"><span class="ilbl">Phone</span><span class="ival">'+c.phone+'</span></div>'
    +'</div>'
    +'<div style="margin-bottom:14px;"><div style="font-family:Plus Jakarta Sans,sans-serif;font-size:11px;font-weight:700;margin-bottom:7px;">Courses Offered</div>'+crsH+'</div>'
    +'<button class="btn" onclick="confirmCenterV6(\''+cid+'\')">Request Enrollment</button>');
}
window.openCenterV6=openCenterV6;

function confirmCenterV6(cid){
  var c=null;for(var i=0;i<CENTERS.length;i++) if(CENTERS[i].id===cid){c=CENTERS[i];break;}
  ME.repPoints=(ME.repPoints||0)+2;saveUser(ME);
  closeModal();toast('Enrollment request sent to '+c.name+'! +2 pts <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>');
}
window.confirmCenterV6=confirmCenterV6;

function contactCenterV6(cid){
  var c=null;for(var i=0;i<CENTERS.length;i++) if(CENTERS[i].id===cid){c=CENTERS[i];break;}
  if(!c)return;
  setModal('<button class="mclose" onclick="closeModal()">✕</button>'
    +'<h3>Contact '+c.name+'</h3>'
    +'<div class="irow" style="margin-bottom:8px;"><span class="ilbl">Email</span><span class="ival" style="color:var(--blu);">'+c.email+'</span></div>'
    +'<div class="irow" style="margin-bottom:14px;"><span class="ilbl">Phone</span><span class="ival">'+c.phone+'</span></div>'
    +'<div class="fg"><label class="fl">Your Message</label><textarea class="fi" id="ctr-msg" rows="4" placeholder="Hi, I am interested in enrolling for React..." style="resize:vertical;"></textarea></div>'
    +'<button class="btn" onclick="sendCenterMsgV6(\''+cid+'\')">Send Message</button>');
}
window.contactCenterV6=contactCenterV6;

function sendCenterMsgV6(cid){
  var msg=document.getElementById('ctr-msg');
  if(!msg||!msg.value.trim()){toast('Write a message first.','bad');return;}
  closeModal();toast('Message sent! The center will contact you within 24hrs <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4ade80" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>');
}
window.sendCenterMsgV6=sendCenterMsgV6;

