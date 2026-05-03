// SkillStamp — SkillStamp Learn

// ═══════════════════════════════════════════════════════
// V6 DATA
// ═══════════════════════════════════════════════════════
var CENTERS=[
  {id:'c1',name:'Lagos Tech Hub',country:'Nigeria',city:'Lagos',address:'14 Bode Thomas St, Surulere',category:'Tech',capacity:80,phone:'+234 901 234 5678',email:'info@lagostechhub.ng',courses:['React','Python','Data Science'],rating:4.7,students:1200,verified:true},
  {id:'c2',name:'Accra Code Academy',country:'Ghana',city:'Accra',address:'Ring Road Central, Accra',category:'Tech',capacity:60,phone:'+233 24 567 8901',email:'hello@accracode.gh',courses:['JavaScript','Node.js','UI/UX'],rating:4.6,students:890,verified:true},
  {id:'c3',name:'Nairobi Digital School',country:'Kenya',city:'Nairobi',address:'Westlands, Nairobi',category:'Data',capacity:100,phone:'+254 712 345 678',email:'learn@nairobidigital.ke',courses:['Python','ML','SQL'],rating:4.8,students:1500,verified:true},
  {id:'c4',name:'Cape Town Creative Hub',country:'South Africa',city:'Cape Town',address:'Woodstock Exchange',category:'Design',capacity:50,phone:'+27 21 234 5678',email:'studio@ctcreative.za',courses:['Figma','Brand Design','Motion'],rating:4.9,students:780,verified:true},
  {id:'c5',name:'Kigali Innovation Center',country:'Rwanda',city:'Kigali',address:'KN 78 St, Nyarugenge',category:'Blockchain',capacity:40,phone:'+250 788 123 456',email:'info@kigaliinno.rw',courses:['Solidity','DeFi','Web3'],rating:4.7,students:420,verified:true},
  {id:'c6',name:'Dakar Web Institute',country:'Senegal',city:'Dakar',address:'Plateau, Dakar',category:'Marketing',capacity:70,phone:'+221 77 234 5678',email:'contact@dakarweb.sn',courses:['SEO','Digital Marketing','Analytics'],rating:4.5,students:660,verified:true},
  {id:'c7',name:'Addis Tech Campus',country:'Ethiopia',city:'Addis Ababa',address:'Bole Road, Addis',category:'Tech',capacity:90,phone:'+251 91 234 5678',email:'hello@addistech.et',courses:['Python','Flutter','DevOps'],rating:4.6,students:980,verified:true},
  {id:'c8',name:'Kampala Code School',country:'Uganda',city:'Kampala',address:'Nakasero Hill, Kampala',category:'Tech',capacity:55,phone:'+256 772 345 678',email:'learn@kampalacode.ug',courses:['React','Node.js','Mobile'],rating:4.4,students:510,verified:true},
  {id:'c9',name:'Abuja Digital Academy',country:'Nigeria',city:'Abuja',address:'Wuse 2, Abuja',category:'Data',capacity:65,phone:'+234 803 456 7890',email:'info@abujadigital.ng',courses:['Data Science','Power BI','ML'],rating:4.7,students:740,verified:true},
  {id:'c10',name:'Johannesburg Tech Centre',country:'South Africa',city:'Johannesburg',address:'Sandton City',category:'Tech',capacity:120,phone:'+27 11 567 8901',email:'info@joztech.za',courses:['React','AWS','Blockchain'],rating:4.8,students:1800,verified:true},
  {id:'c11',name:'Douala Digital Hub',country:'Cameroon',city:'Douala',address:'Akwa, Douala',category:'Tech',capacity:45,phone:'+237 677 123 456',email:'info@doualadigital.cm',courses:['Python','JavaScript','Mobile'],rating:4.3,students:380,verified:true},
  {id:'c12',name:'Dar es Salaam Tech',country:'Tanzania',city:'Dar es Salaam',address:'Kariakoo, Dar es Salaam',category:'Design',capacity:60,phone:'+255 754 123 456',email:'learn@darstech.tz',courses:['UI/UX','Figma','Design'],rating:4.5,students:560,verified:true}
];

var COURSES=[
  {id:'oc1',title:'Complete React Developer Bootcamp',tutor:'Dr. Amara Diallo',cat:'Tech',level:'Beginner',weeks:'12 weeks',price:0,free:true,emoji:'⚛️',bg:'#1e3a5f',students:3200,rating:4.9,lessons:48,desc:'Master React from zero to hero. Build 5 real projects. Fully certified.',skills:['React','JavaScript','CSS']},
  {id:'oc2',title:'Python for Data Science and ML',tutor:'Dr. Amara Diallo',cat:'Data',level:'Intermediate',weeks:'10 weeks',price:89,free:false,emoji:'🐍',bg:'#1a3a1a',students:2800,rating:4.8,lessons:42,desc:'Learn Python, Pandas, TensorFlow and deploy ML models to production.',skills:['Python','TensorFlow','SQL']},
  {id:'oc3',title:'Solidity and Smart Contracts',tutor:'Kofi Asante',cat:'Blockchain',level:'Advanced',weeks:'8 weeks',price:149,free:false,emoji:'⛓️',bg:'#1a1040',students:1400,rating:4.8,lessons:36,desc:'Build DeFi protocols and NFT platforms on Ethereum. Real deployments.',skills:['Solidity','Web3.js','Ethereum']},
  {id:'oc4',title:'UI/UX Design with Figma',tutor:'Zanele Dlamini',cat:'Design',level:'Beginner',weeks:'6 weeks',price:0,free:true,emoji:'🎨',bg:'#3a1a30',students:4100,rating:4.7,lessons:28,desc:'Design beautiful digital products from scratch using Figma.',skills:['Figma','UI/UX','Prototyping']},
  {id:'oc5',title:'Digital Marketing and SEO',tutor:'Moussa Traore',cat:'Marketing',level:'Beginner',weeks:'6 weeks',price:59,free:false,emoji:'📣',bg:'#3a2a0a',students:2200,rating:4.6,lessons:32,desc:'Grow any business online with proven SEO, Google Ads and email strategy.',skills:['SEO','Google Ads','Analytics']},
  {id:'oc6',title:'AWS Cloud Solutions Architect',tutor:'Dr. Amara Diallo',cat:'Tech',level:'Advanced',weeks:'14 weeks',price:199,free:false,emoji:'☁️',bg:'#0a2a3a',students:980,rating:4.9,lessons:56,desc:'Prepare for AWS certification with real architecture projects.',skills:['AWS','DevOps','Cloud']},
  {id:'oc7',title:'Content Writing and Copywriting',tutor:'Adaeze Nwachukwu',cat:'Writing',level:'Beginner',weeks:'4 weeks',price:0,free:true,emoji:'✍️',bg:'#2a1a0a',students:1800,rating:4.5,lessons:18,desc:'Write compelling content that converts. Real client briefs included.',skills:['Copywriting','SEO Writing','Strategy']},
  {id:'oc8',title:'Power BI and Data Visualization',tutor:'Wanjiru Kamau',cat:'Data',level:'Intermediate',weeks:'6 weeks',price:79,free:false,emoji:'📊',bg:'#1a0a3a',students:1600,rating:4.7,lessons:30,desc:'Turn raw data into powerful business dashboards with Power BI.',skills:['Power BI','SQL','Tableau']},
  {id:'oc9',title:'Flutter Mobile App Development',tutor:'Dr. Amara Diallo',cat:'Tech',level:'Intermediate',weeks:'10 weeks',price:119,free:false,emoji:'📱',bg:'#1a2a3a',students:1200,rating:4.8,lessons:44,desc:'Build iOS and Android apps with one codebase in Flutter and Dart.',skills:['Flutter','Dart','Firebase']},
  {id:'oc10',title:'NFT Creation and Web3 Business',tutor:'Kofi Asante',cat:'Blockchain',level:'Beginner',weeks:'5 weeks',price:0,free:true,emoji:'🖼️',bg:'#2a0a1a',students:3500,rating:4.6,lessons:22,desc:'Create, list and sell NFTs. Build a Web3 personal brand.',skills:['NFT','Web3','Marketing']},
  {id:'oc11',title:'Brand Identity Design',tutor:'Zanele Dlamini',cat:'Design',level:'Intermediate',weeks:'7 weeks',price:89,free:false,emoji:'🏷️',bg:'#3a0a2a',students:920,rating:4.8,lessons:35,desc:'Create full brand identities from logo to style guide.',skills:['Figma','Branding','Illustration']},
  {id:'oc12',title:'Growth Hacking for Startups',tutor:'Moussa Traore',cat:'Marketing',level:'Advanced',weeks:'8 weeks',price:129,free:false,emoji:'🚀',bg:'#2a3a0a',students:760,rating:4.9,lessons:38,desc:'Scale a startup from 0 to 10,000 users with zero budget.',skills:['Growth','Analytics','Email']}
];

function getEnrollments(){return LOCAL.get('enr_'+ME.uid)||[];}
function saveEnrollments(e){LOCAL.set('enr_'+ME.uid,e);}
function getCProg(id){return LOCAL.get('cp_'+ME.uid+'_'+id)||0;}
function saveCProg(id,v){LOCAL.set('cp_'+ME.uid+'_'+id,v);}

// ═══════════════════════════════════════════════════════
// SKILLSTAMP LEARN
// ═══════════════════════════════════════════════════════
function renderLearnV6(){
  var enr=getEnrollments();
  var ac=LOCAL.get('lcat')||'All';
  var cats=['All','Tech','Data','Design','Blockchain','Marketing','Writing'];
  var fil=ac==='All'?COURSES:COURSES.filter(function(c){return c.cat===ac;});

  var catH='';
  for(var ci=0;ci<cats.length;ci++){
    catH+='<div class="cat'+(ac===cats[ci]?' on':'')+'" onclick="setLcat(\''+cats[ci]+'\')">'+cats[ci]+'</div>';
  }

  var cardsH='';
  for(var ci2=0;ci2<fil.length;ci2++){
    var c=fil[ci2];
    var enrolled=enr.indexOf(c.id)>=0;
    var prog=enrolled?getCProg(c.id):0;
    cardsH+='<div class="course-card" onclick="openCourseV6(\''+c.id+'\')">';
    cardsH+='<div class="course-thumb" style="background:'+c.bg+';position:relative;">';
    cardsH+='<span style="font-size:40px;">'+c.emoji+'</span>';
    if(c.free){
      cardsH+='<span style="position:absolute;top:8px;right:8px;background:var(--grn);color:#000;font-size:8px;font-weight:700;padding:2px 7px;border-radius:4px;font-family:Plus Jakarta Sans,sans-serif;">FREE</span>';
    } else {
      cardsH+='<span style="position:absolute;top:8px;right:8px;background:rgba(0,0,0,.65);color:var(--gld);font-size:9px;font-weight:700;padding:2px 7px;border-radius:4px;">$'+c.price+'</span>';
    }
    if(enrolled){
      cardsH+='<span style="position:absolute;top:8px;left:8px;background:rgba(96,165,250,.9);color:#000;font-size:8px;font-weight:700;padding:2px 7px;border-radius:4px;font-family:Plus Jakarta Sans,sans-serif;">ENROLLED</span>';
    }
    cardsH+='</div>';
    cardsH+='<div class="course-body">';
    cardsH+='<div class="course-title">'+c.title+'</div>';
    cardsH+='<div class="course-meta">'+c.tutor+' · '+c.level+' · '+c.weeks+'</div>';
    var skH='';
    for(var si=0;si<c.skills.length;si++) skH+='<span class="chip" style="font-size:8px;padding:1px 6px;">'+c.skills[si]+'</span>';
    cardsH+='<div style="display:flex;gap:3px;flex-wrap:wrap;margin-bottom:8px;">'+skH+'</div>';
    if(enrolled){
      cardsH+='<div class="cpbar"><div class="cpfill" style="width:'+prog+'%;"></div></div>';
      cardsH+='<div style="display:flex;justify-content:space-between;font-size:9px;color:var(--td);"><span>'+prog+'% complete</span><span style="color:var(--blu);">Continue</span></div>';
    } else {
      cardsH+='<div style="display:flex;justify-content:space-between;align-items:center;">';
      cardsH+='<span style="color:var(--gld);font-size:11px;">★★★★★ '+c.rating+'</span>';
      cardsH+='<span style="font-size:9px;color:var(--td);">'+c.students.toLocaleString()+' students</span></div>';
    }
    cardsH+='</div></div>';
  }

  var freeCount=0;
  for(var fi=0;fi<COURSES.length;fi++) if(COURSES[fi].free) freeCount++;

  return '<div class="learn-hero">'
    +'<div style="display:flex;align-items:center;gap:12px;margin-bottom:14px;">'
    +'<span style="font-size:32px;">🎓</span>'
    +'<div><div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:800;font-size:22px;letter-spacing:-.5px;">SkillStamp <span style="color:var(--blu);">Learn</span></div>'
    +'<div style="font-size:11px;color:var(--td);margin-top:2px;">Master skills. Get verified. Get hired.</div></div></div>'
    +'<div style="display:flex;gap:18px;flex-wrap:wrap;">'
    +'<div><span style="font-family:Plus Jakarta Sans,sans-serif;font-weight:800;font-size:20px;color:var(--grn);">'+COURSES.length+'</span><div style="font-size:9px;color:var(--td);">Courses</div></div>'
    +'<div><span style="font-family:Plus Jakarta Sans,sans-serif;font-weight:800;font-size:20px;color:var(--gld);">'+freeCount+'</span><div style="font-size:9px;color:var(--td);">Free</div></div>'
    +'<div><span style="font-family:Plus Jakarta Sans,sans-serif;font-weight:800;font-size:20px;color:var(--blu);">'+enr.length+'</span><div style="font-size:9px;color:var(--td);">Enrolled</div></div>'
    +'</div></div>'
    +'<div style="padding:14px 16px 4px;">'
    +'<input class="fi" placeholder="Search courses..." style="margin-bottom:10px;" oninput="searchLearnV6(this.value)">'
    +'<div class="cats">'+catH+'</div></div>'
    +'<div style="padding:0 16px 100px;" id="learn-grid">'+cardsH+'</div>';
}
window.renderLearnV6=renderLearnV6;

function setLcat(cat){LOCAL.set('lcat',cat);var p=document.getElementById('page-learn');if(p)p.innerHTML=renderLearnV6();}
window.setLcat=setLcat;

function searchLearnV6(q){
  var grid=document.getElementById('learn-grid');if(!grid)return;
  var enr=getEnrollments();
  var fil=q?COURSES.filter(function(c){
    return c.title.toLowerCase().indexOf(q.toLowerCase())>=0||c.tutor.toLowerCase().indexOf(q.toLowerCase())>=0;
  }):COURSES;
  var h='';
  for(var i=0;i<fil.length;i++){
    var c=fil[i];
    var enrolled=enr.indexOf(c.id)>=0;
    h+='<div class="course-card" onclick="openCourseV6(\''+c.id+'\')"><div class="course-thumb" style="background:'+c.bg+';position:relative;"><span style="font-size:36px;">'+c.emoji+'</span>'+(c.free?'<span style="position:absolute;top:8px;right:8px;background:var(--grn);color:#000;font-size:8px;font-weight:700;padding:2px 7px;border-radius:4px;font-family:Plus Jakarta Sans,sans-serif;">FREE</span>':'<span style="position:absolute;top:8px;right:8px;background:rgba(0,0,0,.65);color:var(--gld);font-size:9px;padding:2px 7px;border-radius:4px;">$'+c.price+'</span>')+'</div><div class="course-body"><div class="course-title">'+c.title+'</div><div class="course-meta">'+c.tutor+' · '+c.level+'</div><span style="color:var(--gld);font-size:10px;">★★★★★</span></div></div>';
  }
  grid.innerHTML=h;
}
window.searchLearnV6=searchLearnV6;

function openCourseV6(cid){
  var c=null;
  for(var i=0;i<COURSES.length;i++) if(COURSES[i].id===cid){c=COURSES[i];break;}
  if(!c)return;
  var enr=getEnrollments();
  var enrolled=enr.indexOf(c.id)>=0;
  var prog=enrolled?getCProg(c.id):0;
  var lessonNames=['Introduction and Setup','Core Concepts','Building Your First Project','Advanced Techniques','Real-World Application','Testing and Debugging','Deployment and Launch','Portfolio Project'];
  var lsH='';
  for(var li=0;li<Math.min(8,c.lessons);li++){
    var done=prog>=Math.round((li+1)/8*100);
    lsH+='<div style="display:flex;align-items:center;gap:10px;padding:10px;background:var(--s2);border-radius:6px;margin-bottom:5px;">'
      +'<span style="font-size:14px;">'+(done?'✅':'🔒')+'</span>'
      +'<div style="flex:1;font-size:11px;color:'+(done?'#f0ede6':'var(--td)')+';">Lesson '+(li+1)+': '+lessonNames[li]+'</div>'
      +(done?'<span style="font-size:9px;color:var(--grn);">Done ✓</span>':'')
      +'</div>';
  }
  var skH='';
  for(var si=0;si<c.skills.length;si++) skH+='<span class="chip" style="margin:2px;">'+c.skills[si]+'</span>';

  var body='<button class="mclose" onclick="closeModal()">✕</button>'
    +'<div style="display:flex;gap:12px;align-items:center;margin-bottom:14px;">'
    +'<div style="width:64px;height:64px;border-radius:12px;background:'+c.bg+';display:flex;align-items:center;justify-content:center;font-size:32px;flex-shrink:0;">'+c.emoji+'</div>'
    +'<div><div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:800;font-size:15px;line-height:1.3;">'+c.title+'</div>'
    +'<div style="font-size:10px;color:var(--td);margin-top:2px;">'+c.tutor+' · '+c.level+' · '+c.weeks+'</div>'
    +'<div style="color:var(--gld);font-size:11px;margin-top:3px;">★★★★★ '+c.rating+' ('+c.students.toLocaleString()+')</div></div></div>'
    +'<p style="font-size:11px;color:var(--td);line-height:1.8;padding:10px;background:var(--s2);border-radius:6px;margin-bottom:12px;">'+c.desc+'</p>'
    +'<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:14px;">'
    +'<div style="text-align:center;padding:10px;background:var(--s2);border-radius:6px;"><div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:700;font-size:15px;">'+c.lessons+'</div><div style="font-size:8px;color:var(--td);">LESSONS</div></div>'
    +'<div style="text-align:center;padding:10px;background:var(--s2);border-radius:6px;"><div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:700;font-size:12px;">'+c.weeks+'</div><div style="font-size:8px;color:var(--td);">DURATION</div></div>'
    +'<div style="text-align:center;padding:10px;background:var(--s2);border-radius:6px;"><div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:700;font-size:15px;color:'+(c.free?'var(--grn)':'var(--gld)')+'">'+(c.free?'FREE':'$'+c.price)+'</div><div style="font-size:8px;color:var(--td);">PRICE</div></div>'
    +'</div>'
    +'<div style="margin-bottom:10px;">'+skH+'</div>';

  if(enrolled){
    body+='<div style="margin-bottom:12px;"><div style="display:flex;justify-content:space-between;font-size:10px;margin-bottom:5px;"><span>Progress</span><span style="color:var(--blu);font-weight:700;">'+prog+'%</span></div>'
      +'<div class="cpbar" style="height:7px;"><div class="cpfill" style="width:'+prog+'%;"></div></div></div>'
      +lsH;
    if(prog<100){
      body+='<button class="btn" style="margin-top:12px;" onclick="doLessonV6(\''+c.id+'\')">Continue Learning</button>';
    } else {
      body+='<div style="padding:14px;background:rgba(74,222,128,.07);border:1px solid rgba(74,222,128,.2);border-radius:var(--r);text-align:center;font-family:Plus Jakarta Sans,sans-serif;font-weight:700;color:var(--grn);margin-top:12px;">🏆 Course Completed!</div>';
    }
  } else {
    body+='<button class="btn" onclick="enrollCourseV6(\''+c.id+'\')">'+(c.free?'Enrol Free →':'Enrol Now — $'+c.price+' →')+'</button>';
  }
  setModal(body);
}
window.openCourseV6=openCourseV6;

function enrollCourseV6(cid){
  var enr=getEnrollments();
  if(enr.indexOf(cid)<0){enr.push(cid);saveEnrollments(enr);}
  saveCProg(cid,5);
  ME.repPoints=(ME.repPoints||0)+3;saveUser(ME);
  closeModal();toast('+3 rep pts — enrolled! 🎓');
  var p=document.getElementById('page-learn');if(p)p.innerHTML=renderLearnV6();
}
window.enrollCourseV6=enrollCourseV6;

function doLessonV6(cid){
  var prog=getCProg(cid);
  prog=Math.min(100,prog+13);
  saveCProg(cid,prog);
  ME.repPoints=(ME.repPoints||0)+2;saveUser(ME);
  if(prog>=100){
    toast('🏆 Course complete! +15 pts');
    ME.repPoints=(ME.repPoints||0)+13;saveUser(ME);
  } else {
    toast('Lesson done! '+prog+'% complete 📚');
  }
  closeModal();
  var p=document.getElementById('page-learn');if(p)p.innerHTML=renderLearnV6();
}
window.doLessonV6=doLessonV6;

