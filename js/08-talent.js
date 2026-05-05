// Fixed talent page
function renderTalent(){
  if (!CACHE || !CACHE.users) {
    console.warn("Users not loaded yet");
    return;
  }
  const users = CACHE.users || [];
  // render logic continues...
}
