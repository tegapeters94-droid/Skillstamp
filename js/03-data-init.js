// SkillStamp — Data Init — Generate seed data

// ══════════════════════════════════════════════
//  DATA INIT — generate 500 AI users
// ══════════════════════════════════════════════
function generateUsers(){
  // Demo accounts are no longer seeded. Every account is a real sign-up,
  // and nothing is written to the database before someone signs in.
  if(LOCAL.get('live_init')) return;
  const users=[];
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

