// SkillStamp — Data Init — Generate seed data

// ══════════════════════════════════════════════
//  DATA INIT — generate 500 AI users
// ══════════════════════════════════════════════
function generateUsers(){
  if(LOCAL.get('live_init')) return;
  const users=[];
  // Admin + featured users
  const featured=[
    {uid:'u1',email:'admin@skillstamp.com',pass:'admin123',name:'Adaeze Okafor',role:'freelancer',isAdmin:true,country:'Nigeria',category:'Tech',title:'Senior Full-Stack Engineer',bio:'10+ years building scalable apps. EDVP-certified. Driving the African tech ecosystem forward.',skills:['React','Node.js','Python','AWS','PostgreSQL'],badgeStatus:'verified',score:4.9,repPoints:580,gigsCount:47,earned:42000,skillId:'SKL-2026-7X4K92',gradient:'#e8a020',wallet:{balance:4200,pending:800,earned:42000,transactions:[{id:'t1',type:'in',amount:3500,from:'TechCorp Africa',desc:'React Dashboard Contract',ts:Date.now()-86400000},{id:'t2',type:'in',amount:1800,desc:'Python API Project',from:'StartupNG',ts:Date.now()-172800000},{id:'t3',type:'out',amount:100,desc:'Platform Fee',from:'SkillStamp',ts:Date.now()-259200000}]},created:Date.now()-9000000},
    {uid:'u2',email:'chidi@demo.com',pass:'demo123',name:'Chidi Mensah',role:'freelancer',isAdmin:false,country:'Ghana',category:'Blockchain',title:'Blockchain & Smart Contract Developer',bio:'Solidity expert. Built DeFi protocols for 3 African fintech startups.',skills:['Solidity','Web3.js','Ethereum','Hardhat'],badgeStatus:'verified',score:4.7,repPoints:420,gigsCount:31,earned:28000,skillId:'SKL-2026-9M2P44',gradient:'#20a0e8',wallet:{balance:2800,pending:500,earned:28000,transactions:[]},created:Date.now()-7000000},
    {uid:'u3',email:'fatima@demo.com',pass:'demo123',name:'Fatima Al-Hassan',role:'freelancer',isAdmin:false,country:'Kenya',category:'Data',title:'Data Scientist & ML Engineer',bio:'Specialized in NLP. PhD candidate at University of Nairobi.',skills:['Python','TensorFlow','Pandas','SQL'],badgeStatus:'verified',score:4.8,repPoints:490,gigsCount:38,earned:34000,skillId:'SKL-2026-4F8R21',gradient:'#20e880',wallet:{balance:3400,pending:0,earned:34000,transactions:[]},created:Date.now()-8000000},
  ];
  featured.forEach(u=>users.push(u));
  // Add employer
  users.push({uid:'u501',email:'employer@demo.com',pass:'demo123',name:'TechCorp Africa',role:'employer',isAdmin:false,country:'South Africa',category:'Tech',title:'Tech Recruiter & Employer',bio:'Leading African tech company hiring remote talent.',skills:[],badgeStatus:'verified',score:0,repPoints:0,gigsCount:0,earned:0,skillId:'SKL-2026-6E1M33',gradient:'#e8c020',wallet:{balance:50000,pending:5000,earned:0,transactions:[]},created:Date.now()-6000000});
  (async()=>{for(var u of users) await fbSet('users',u.uid,u);CACHE.users=users;})();
  /* users:index removed */ void(users.map(u=>u.uid));
  generateGigs(users);
  generatePosts(users);
  generateEndorsements(users);
  generateMessages(users);
  LOCAL.set('pending',[]);
  LOCAL.set('live_init',true);
}

function generateGigs(users){
  /* gigs seeded async below */
  (async()=>{
    // No seed gigs — load from Firebase only
    CACHE.gigs=[];
  })()
}

function generatePosts(users){
  /* posts are user-generated */
}

function generateEndorsements(users){
  /* endorsements are user-generated */
}

function generateMessages(users){
  /* messages are user-generated */
}

