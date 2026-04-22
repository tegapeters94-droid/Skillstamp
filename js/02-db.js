// SkillStamp — DB Layer — Firebase Firestore

// ══════════════════════════════════════════════
//  CONSTANTS & HELPERS
// ══════════════════════════════════════════════
const NAMES_F=['Adaeze','Amara','Fatima','Chioma','Ngozi','Yetunde','Abena','Akosua','Wanjiru','Aisha','Nadia','Zainab','Oluwaseun','Temitope','Blessing','Chiamaka','Ifunanya','Onyinye','Ebele','Ndidi','Aminata','Mariama','Kadiatou','Rokhaya','Awa','Makena','Zawadi','Adhiambo','Nyambura','Wambui','Thandiwe','Sibongile','Nompumelelo','Zanele','Lindiwe','Nomsa','Precious','Chanda','Mwamba','Bupe'];
const NAMES_M=['Chidi','Emeka','Kofi','Kwame','Seun','Tunde','Babatunde','Olumide','Chukwuemeka','Ifeanyi','Jomo','Kamau','Mwangi','Kariuki','Kipchoge','Thabo','Lerato','Bongani','Sipho','Andile','Moussa','Ibrahima','Abdoulaye','Cheikh','Oumar','Amara','Seydou','Boubacar','Mamadou','Lamine','Dawit','Yohannes','Bekele','Haile','Girma','Moses','Dennis','Patrick','Victor','Emmanuel'];
const SURNAMES=['Okafor','Mensah','Kamau','Dlamini','Diallo','Okonkwo','Asante','Waweru','Nkosi','Traore','Mwangi','Banda','Achebe','Eze','Nwosu','Adeyemi','Abubakar','Ibrahim','Hassan','Mohammed','Jallow','Sow','Barry','Bah','Camara','Kouyate','Keita','Doumbia','Coulibaly','Toure','Haile','Bekele','Tadesse','Gebre','Tesfaye','Kimani','Njoroge','Kariuki','Otieno','Ochieng'];
const COUNTRIES=['Nigeria','Ghana','Kenya','South Africa','Senegal','Rwanda','Ethiopia','Uganda','Tanzania','Cameroon'];
const CATEGORIES=['Graphics Design','UI/UX Design','Content Writing','Data Analysis','Digital Marketing','Web & Mobile Dev'];
const ALL_SKILLS=['Python','Data Science','UI/UX Design','React','Cloud Engineering','Product Management','Node.js','SQL','Mobile Dev','DevOps','Machine Learning','Figma','AWS','Docker','TypeScript','Flutter','Django','Next.js','Vue.js','FastAPI','Go','Rust','Solidity','Web3.js','SEO','Content Strategy','Email Marketing','Google Ads','Analytics','Graphic Design','Video Editing','Copywriting','Branding'];
const CAT_ICONS={'Graphics Design':'🎨','UI/UX Design':'🖥️','Content Writing':'✍️','Data Analysis':'📊','Digital Marketing':'📣','Web & Mobile Dev':'💻'};
const SKILLS_BY_CAT={
  'Graphics Design':['Logo Design','Brand Identity','Poster Design','Flyer Design','Social Media Graphics','Illustration','Packaging Design','Motion Graphics'],
  'UI/UX Design':['Figma','User Research','Wireframing','Prototyping','Adobe XD','Interaction Design','Usability Testing','Design Systems'],
  'Content Writing':['Copywriting','Blog Writing','SEO Writing','Technical Writing','Social Media Content','Email Marketing Copy','Ghostwriting','Proofreading'],
  'Data Analysis':['Python','SQL','Excel','Power BI','Tableau','Data Visualisation','Statistical Analysis','Machine Learning'],
  'Digital Marketing':['SEO','Google Ads','Social Media Marketing','Email Campaigns','Content Strategy','Influencer Marketing','Analytics','Facebook Ads'],
  'Web & Mobile Dev':['React','Node.js','Flutter','React Native','Next.js','Vue.js','Django','Firebase']
};
const GRADS=['#e8a020','#20a0e8','#20e860','#e82060','#a020e8','#e8c020','#20e8c0','#e86020','#20c8e8','#c0e820'];
const FLAGS={Nigeria:'🇳🇬',Ghana:'🇬🇭',Kenya:'🇰🇪','South Africa':'🇿🇦',Senegal:'🇸🇳',Rwanda:'🇷🇼',Ethiopia:'🇪🇹',Uganda:'🇺🇬',Tanzania:'🇹🇿',Cameroon:'🇨🇲'};
const GIG_ICONS=['🐍','🎨','☁️','📱','📊','🔧','🤖','⚙️','🌐','📡','🎯','💡'];
const GIG_COLS=['rgba(74,222,128,.08)','rgba(96,165,250,.08)','rgba(232,197,71,.08)','rgba(255,107,53,.08)'];
const POST_TEMPLATES=[
  function(u){return 'Just completed a major '+pick(SKILLS_BY_CAT[u.category])+' project for a fintech client in '+u.country+'! 🚀 The platform handles 50K+ daily transactions. Proud of this work. #'+u.category+' #SkillStamp #AfricanTech';},
  function(u){return 'Looking for a '+pick(SKILLS_BY_CAT[u.category])+' engineer for a 3-month contract. Remote-friendly. Budget: $'+(r(2,8)*500)+'. Must have SkillID verification. DM me! 💼 #Hiring';},
  function(u){return '5 things I learned after 3 years of '+pick(SKILLS_BY_CAT[u.category])+' in the African tech ecosystem:\n\n1️⃣ Community > Competition\n2️⃣ Documentation saves projects\n3️⃣ Client communication is a skill\n4️⃣ Build in public\n5️⃣ Always be learning';},
  function(u){return 'Just got verified on SkillStamp! My SkillID is now live. '+u.category+' professional with '+r(2,8)+' years experience. Let us connect! ✨ #SkillStamp #'+u.country;},
  function(u){return 'Hot take: African developers are some of the most resourceful engineers in the world. We build with constraints that make us 10x better problem solvers. 🌍 Agree? #AfricanTech';},
  function(u){return 'Passed my '+pick(SKILLS_BY_CAT[u.category])+' certification today! 🎓 Months of late nights finally paid off. Reputation score up by +10. Next goal: expert badge! #LevelUp';},
  function(u){return 'PSA for employers: Stop offering African tech talent rates 3x lower than global peers. Our SkillIDs prove we deliver the same quality. 💪 #PayEquity';},
  function(u){return 'Just endorsed 3 amazing '+u.category+' professionals on SkillStamp. The quality of talent here is unreal. 🤝 #Community #SkillStamp';},
  function(u){return 'My journey: from learning '+pick(SKILLS_BY_CAT[u.category])+' to landing a $'+(r(3,12)*500)+'/month remote contract. Keep building. 🛤️ #'+u.country;},
  function(u){return 'Working on an open source '+pick(SKILLS_BY_CAT[u.category])+' project solving '+pick(['fintech','health','education','logistics'])+' challenges in Africa. Who wants to collaborate? 🔧';}
];

// ═══════════════════════════════════════════════════════
//  DB LAYER — Firebase Firestore (replaces localStorage)
// ═══════════════════════════════════════════════════════

// Keep localStorage only for session preferences (saved creds, UI state)
const LOCAL = {
  get(k){try{return JSON.parse(localStorage.getItem('ss5_'+k))||null;}catch{return null;}},
  set(k,v){try{localStorage.setItem('ss5_'+k,JSON.stringify(v));}catch(e){}},
  del(k){localStorage.removeItem('ss5_'+k);}
};

// Async Firebase helpers
async function fbGet(col, id) {
  try {
    const snap = await window.FB_FNS.getDoc(window.FB_FNS.doc(window.FB_DB, col, id));
    return snap.exists() ? snap.data() : null;
  } catch(e) { console.warn('fbGet error', col, id, e); return null; }
}
async function fbSet(col, id, data) {
  try {
    await window.FB_FNS.setDoc(window.FB_FNS.doc(window.FB_DB, col, id), data);
  } catch(e) { console.warn('fbSet error', col, id, e); }
}
async function fbGetAll(col, retries) {
  retries = retries || 3;
  for(var attempt=0; attempt<retries; attempt++){
    try {
      const snap = await window.FB_FNS.getDocs(window.FB_FNS.collection(window.FB_DB, col));
      return snap.docs.map(d => d.data());
    } catch(e) {
      console.warn('fbGetAll attempt '+(attempt+1)+' failed for '+col, e.message);
      if(attempt < retries-1){
        await new Promise(function(res){ setTimeout(res, 1000*(attempt+1)); });
      }
    }
  }
  console.warn('fbGetAll failed after '+retries+' attempts for '+col);
  return [];
}
async function fbAdd(col, data) {
  try {
    const ref = await window.FB_FNS.addDoc(window.FB_FNS.collection(window.FB_DB, col), data);
    return ref.id;
  } catch(e) { console.warn('fbAdd error', col, e); return null; }
}
async function fbDelete(col, id) {
  try {
    await window.FB_FNS.deleteDoc(window.FB_FNS.doc(window.FB_DB, col, id));
  } catch(e) { console.warn('fbDelete error', col, id, e); }
}

// Real-time listener helpers
function fbListen(col, cb, orderField='ts') {
  try {
    const q = window.FB_FNS.query(
      window.FB_FNS.collection(window.FB_DB, col),
      window.FB_FNS.orderBy(orderField, 'desc'),
      window.FB_FNS.limit(100)
    );
    return window.FB_FNS.onSnapshot(q, snap => {
      cb(snap.docs.map(d => ({id: d.id, ...d.data()})));
    });
  } catch(e) { console.warn('fbListen error', col, e); return ()=>{}; }
}

// ── In-memory cache for fast reads ─────────────────────
const CACHE = { users:[], posts:[], gigs:[], endorsements:[], messages:{} };

// Load gigs and endorsements once on login (not real-time — less critical)
async function loadGigsToCache(){
  CACHE.gigs = await fbGetAll('gigs');
}
async function loadEndorsementsToCache(){
  CACHE.endorsements = await fbGetAll('endorsements');
}
let _unsubPosts = null;
let _unsubUsers = null;

// Start real-time listeners once app loads
function startRealtimeListeners() {
  // Live posts feed
  if (_unsubPosts) _unsubPosts();
  _unsubPosts = fbListen('posts', posts => {
    CACHE.posts = posts;
    updateHomeStats();
  }, 'ts');

  // Live users (for talent page, leaderboard)
  if (_unsubUsers) _unsubUsers();
  try {
    const uq = window.FB_FNS.query(window.FB_FNS.collection(window.FB_DB, 'users'));
    _unsubUsers = window.FB_FNS.onSnapshot(uq, snap => {
      CACHE.users = snap.docs.map(d => d.data());
      if(document.getElementById('page-talent').classList.contains('active')) renderTalent();
      if(document.getElementById('page-home').classList.contains('active')) renderRoleHome();
      updateHomeStats();
    });
  } catch(e) { console.warn('user listener error', e); }
}

function r(min,max){return Math.floor(Math.random()*(max-min+1))+min;}
function pick(arr){return arr[r(0,arr.length-1)];}
function gradFor(s){var h=0;for(var i=0;i<s.length;i++)h+=s.charCodeAt(i);return GRADS[h%GRADS.length];}
function initials(n){return(n||'?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();}
function flag(c){return FLAGS[c]||'🌍';}
function timeAgo(ts){if(!ts)return '';var d=Date.now()-ts;if(d<60000)return 'just now';if(d<3600000)return Math.floor(d/60000)+'m ago';if(d<86400000)return Math.floor(d/3600000)+'h ago';return Math.floor(d/86400000)+'d ago';}
function toast(msg,type='ok'){const t=document.getElementById('toast');t.textContent=msg;t.className='toast show '+type;clearTimeout(t._t);t._t=setTimeout(()=>t.classList.remove('show'),3500);}
function setModal(html){document.getElementById('mcontent').innerHTML=html;document.getElementById('moverlay').classList.add('show');}
function closeModal(){document.getElementById('moverlay').classList.remove('show');}
window.closeModal=closeModal;
function verifiedSVG(color){
  return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:inline-block;vertical-align:middle;flex-shrink:0;">'
    +'<path d="M12 1.5L14.16 3.78L17.25 2.72L18.12 5.88L21.28 6.75L20.22 9.84L22.5 12L20.22 14.16L21.28 17.25L18.12 18.12L17.25 21.28L14.16 20.22L12 22.5L9.84 20.22L6.75 21.28L5.88 18.12L2.72 17.25L3.78 14.16L1.5 12L3.78 9.84L2.72 6.75L5.88 5.88L6.75 2.72L9.84 3.78Z" fill="'+color+'"/>'
    +'<path d="M8.5 12L10.8 14.3L15.5 9.5" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>'
    +'</svg>';
}
function getVerifColor(){
  var isLight=document.documentElement.getAttribute('data-theme')==='light';
  return isLight?'#1a6b3c':'#e8c547';
}
function badgeHTML(s){
  if(s==='verified'||s==='expert'||s==='elite'){
    return verifiedSVG(getVerifColor());
  }
  var m={review:'In Review',beginner:'Beginner',suspended:'Suspended'};
  var c={review:'var(--blu)',beginner:'var(--td)',suspended:'var(--red,#ef4444)'};
  return '<span style="font-size:9px;padding:3px 8px;border-radius:20px;background:rgba(255,255,255,.06);color:'+(c[s]||'var(--td)')+';">'+(m[s]||'Beginner')+'</span>';
}
function genSkillId(){var y=new Date().getFullYear();var c='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';var code='';for(var i=0;i<6;i++)code+=c[r(0,c.length-1)];return 'SKL-'+y+'-'+code;}
function avHTML(u, size, radius){
  size=size||40; radius=radius||'50%';
  var g=u.gradient||'#888';
  var style='width:'+size+'px;height:'+size+'px;border-radius:'+radius+';overflow:hidden;display:flex;align-items:center;justify-content:center;font-family:Syne,sans-serif;font-weight:800;font-size:'+Math.round(size*.35)+'px;color:#000;background:linear-gradient(135deg,'+g+','+g+'88);flex-shrink:0;';
  if(u.avatar) return '<div style="'+style+'"><img src="'+u.avatar+'" style="width:100%;height:100%;object-fit:cover;"></div>';
  return '<div style="'+style+'">'+initials(u.name)+'</div>';
}

