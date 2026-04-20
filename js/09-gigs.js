// SkillStamp — Gigs — render & post

// ══════════════════════════════════════════════
//  GIGS
// ══════════════════════════════════════════════
window.filterGigCat=function(cat,el){activeGigCat=cat;document.querySelectorAll('#gig-cats .cat').forEach(c=>c.classList.remove('active'));el.classList.add('active');renderGigs();};

function renderGigs(){
  var isClient=ME&&ME.role==='employer';
  // Remove My Applications content area if client is viewing
  if(isClient){var ca=document.getElementById('gig-content-area');if(ca)ca.remove();}
  // Client: hide browse category chips, show workspace section header
  var gigCats=document.getElementById('gig-cats');
  if(gigCats) gigCats.style.display = isClient ? 'none' : '';
  // Client: update page section header
  var st = document.querySelector('#page-gigs .st');
  if(isClient && st) { st.textContent = 'Your Gigs & Workspace'; }
  else if(!isClient && st) { st.textContent = 'Open Gigs'; }
  // Add My Gigs tab for clients (only once)
  if(isClient&&!document.getElementById('gtab-bar')){
    var gigsPage=document.getElementById('page-gigs');
    var firstChild=gigsPage?gigsPage.firstElementChild:null;
    if(firstChild){
      var tabBar=document.createElement('div');
      tabBar.id='gtab-bar';
      tabBar.style.cssText='display:flex;gap:8px;padding:0 16px 12px;';
      var b1=document.createElement('button');
      b1.className='bsm';b1.id='gtab-all';b1.textContent='All Gigs';
      b1.onclick=function(){window._gigsMode='all';renderGigs();};
      var b2=document.createElement('button');
      b2.className='bsm';b2.id='gtab-mine';b2.textContent='My Posted Gigs';
      b2.onclick=function(){window._gigsMode='mine';renderGigs();};
      tabBar.appendChild(b1);tabBar.appendChild(b2);
      firstChild.parentNode.insertBefore(tabBar,firstChild);
    }
  }
  var tabAll=document.getElementById('gtab-all');
  var tabMine=document.getElementById('gtab-mine');
  var mode=window._gigsMode||'all';
  if(tabAll) tabAll.style.background=mode!=='mine'?'var(--gld)':'';
  if(tabAll) tabAll.style.color=mode!=='mine'?'#000':'';
  if(tabMine) tabMine.style.background=mode==='mine'?'#4d9fff':'';
  if(tabMine) tabMine.style.color=mode==='mine'?'#000':'';
  var gigs=getGigs();
  if(mode==='mine'&&ME){
    gigs=gigs.filter(function(g){return g.posterUid===ME.uid;});
    document.getElementById('gigs-count').textContent=gigs.length+' posted';
  } else {
    // Only show open gigs in browse view
    gigs=gigs.filter(function(g){return !g.status||g.status==='open';});
    if(activeGigCat!=='All') gigs=gigs.filter(function(g){return g.category===activeGigCat;});
    document.getElementById('gigs-count').textContent=gigs.length+' open';
  }
  // Show/hide Post Gig button based on role
  var pgBtn=document.getElementById('post-gig-btn');
  if(pgBtn) pgBtn.style.display=(ME&&ME.role==='employer')?'':'none';
  var list=document.getElementById('gig-list');
  if(!gigs.length){list.innerHTML='<div class="empty">'+(mode==='mine'?'No gigs posted yet.':'No gigs available.')+'</div>';return;}
  var rows='';
  gigs.filter(function(g){return g.title&&g.title.trim();}).slice(0,40).forEach(function(g,i){
    var statusTag=g.status&&g.status!=='open'?'<span style="font-size:9px;padding:2px 7px;border-radius:10px;background:rgba(77,159,255,.1);color:#4d9fff;border:1px solid rgba(77,159,255,.2);margin-left:5px;">'+g.status+'</span>':'';
    var escrowTag=g.escrowAmount?'<span style="font-size:9px;color:#ffa500;margin-left:4px;">🔒 $'+g.escrowAmount.toLocaleString()+'</span>':'';
    var skills='';
    (g.skills||[]).slice(0,3).forEach(function(s){
      skills+='<span style="display:inline-block;font-size:9px;background:rgba(232,197,71,.07);border:1px solid rgba(232,197,71,.2);color:var(--gld);padding:1px 6px;border-radius:3px;margin:2px;">'+s+'</span>';
    });
    rows+='<div class="gig-item" data-gid="'+g.id+'">';
    rows+='<div class="gig-icon" style="background:'+GIG_COLS[i%GIG_COLS.length]+'">'+GIG_ICONS[i%GIG_ICONS.length]+'</div>';
    rows+='<div style="flex:1;min-width:0;">';
    rows+='<div class="gig-title">'+g.title+statusTag+'</div>';
    rows+='<div style="font-size:10px;color:var(--td);">'+g.posterName+' · '+g.category+' · '+timeAgo(g.created)+'</div>';
    rows+='<div style="margin-top:4px;">'+skills+'</div>';
    if(escrowTag) rows+='<div style="margin-top:2px;">'+escrowTag+'</div>';
    rows+='</div>';
    rows+='<div style="text-align:right;flex-shrink:0;"><div class="gig-pay">'+g.pay+'</div><div style="font-size:9px;color:var(--td);text-transform:uppercase;letter-spacing:.06em;margin-top:2px;">'+g.type+'</div></div>';
    rows+='</div>';
  });
  list.innerHTML=rows;
  // Attach click handlers via event delegation (no inline onclick)
  list.onclick=function(e){
    var item=e.target.closest('[data-gid]');
    if(item) showGigDetail(item.dataset.gid);
  };
}




// ═══════════════════════════════════════════════════════
//  POST GIG WIZARD — 5-step state machine
// ═══════════════════════════════════════════════════════

var _GW = null;

var _GW_CAT_KEYWORDS = {
  'Graphics Design':   ['logo','brand','poster','flyer','illustration','banner','graphic','design','visual','artwork','packaging','motion'],
  'UI/UX Design':      ['ui','ux','figma','wireframe','prototype','user interface','app design','dashboard','mockup','usability','interaction'],
  'Content Writing':   ['blog','article','copy','seo','write','content','ghostwrit','proofreading','email copy','technical writing'],
  'Data Analysis':     ['data','python','sql','analytics','power bi','tableau','machine learning','statistics','visuali','ml','ai','dataset'],
  'Digital Marketing': ['marketing','ads','google ads','facebook ads','instagram','seo','campaign','influencer','email marketing','social media'],
  'Web & Mobile Dev':  ['website','web','app','mobile','react','node','flutter','api','backend','frontend','firebase','nextjs','django','develop']
};

function _gwSuggestCategory(title) {
  var t = title.toLowerCase();
  var best = null, bestScore = 0;
  Object.keys(_GW_CAT_KEYWORDS).forEach(function(cat) {
    var score = 0;
    _GW_CAT_KEYWORDS[cat].forEach(function(kw) { if (t.indexOf(kw) >= 0) score++; });
    if (score > bestScore) { bestScore = score; best = cat; }
  });
  return bestScore > 0 ? best : null;
}

var _GW_EXAMPLES = {
  'Graphics Design':   ['Design a modern logo for a fintech startup','Create a brand identity kit for a Lagos restaurant','Design social media banners for a product launch'],
  'UI/UX Design':      ['Design a mobile app UI for a delivery service','Create a dashboard UX for an analytics platform','Redesign the checkout flow for an e-commerce site'],
  'Content Writing':   ['Write 10 SEO blog posts about personal finance','Ghostwrite a LinkedIn article series for a CEO','Create email marketing copy for a product launch'],
  'Data Analysis':     ['Build a Python data pipeline for sales analytics','Create Power BI dashboards for a retail chain','Analyse customer churn data and provide insights'],
  'Digital Marketing': ['Run a Google Ads campaign for a beauty brand','Manage Instagram marketing for a fashion startup','Create a 90-day social media content strategy'],
  'Web & Mobile Dev':  ['Build a React e-commerce frontend with Paystack','Develop a Flutter app for a logistics company','Create a Node.js REST API for a mobile application']
};

function _gwInjectStyles() {
  if (document.getElementById('gw-style')) return;
  var s = document.createElement('style');
  s.id = 'gw-style';
  s.textContent = [
    '#gw-overlay{position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.55);backdrop-filter:blur(4px);display:flex;align-items:flex-end;justify-content:center;animation:gw-fade .2s ease;}',
    '@keyframes gw-fade{from{opacity:0}to{opacity:1}}',
    '#gw-sheet{background:var(--s);width:100%;max-width:480px;border-radius:24px 24px 0 0;max-height:92vh;display:flex;flex-direction:column;overflow:hidden;animation:gw-up .3s cubic-bezier(.4,0,.2,1);}',
    '@keyframes gw-up{from{transform:translateY(100%)}to{transform:translateY(0)}}',
    '#gw-header{padding:16px 20px 0;flex-shrink:0;position:relative;}',
    '#gw-handle{width:36px;height:4px;background:var(--br);border-radius:2px;margin:0 auto 14px;}',
    '#gw-progress-bar-wrap{height:4px;background:var(--s2);border-radius:2px;margin-bottom:12px;overflow:hidden;}',
    '#gw-progress-bar{height:100%;background:linear-gradient(90deg,#059669,#16a34a);border-radius:2px;transition:width .35s cubic-bezier(.4,0,.2,1);}',
    '#gw-step-label{font-size:10px;font-weight:700;color:var(--td);letter-spacing:.06em;text-transform:uppercase;margin-bottom:3px;}',
    '#gw-step-title{font-size:20px;font-weight:800;color:var(--tx);letter-spacing:-.02em;margin-bottom:2px;font-family:-apple-system,BlinkMacSystemFont,"Inter","Plus Jakarta Sans",sans-serif;}',
    '#gw-step-sub{font-size:12px;color:var(--td);line-height:1.5;padding-bottom:12px;}',
    '#gw-body{flex:1;overflow-y:auto;padding:4px 20px 16px;}',
    '.gw-field{margin-bottom:16px;}',
    '.gw-label{font-size:12px;font-weight:700;color:var(--tx);margin-bottom:6px;display:block;}',
    '.gw-input{width:100%;background:var(--s2);border:1.5px solid var(--br);border-radius:12px;padding:12px 14px;font-size:14px;color:var(--tx);font-family:-apple-system,BlinkMacSystemFont,"Inter",sans-serif;outline:none;box-sizing:border-box;transition:border-color .2s;}',
    '.gw-input:focus{border-color:#059669;}',
    '.gw-input::placeholder{color:var(--td);opacity:.7;}',
    '.gw-textarea{resize:vertical;min-height:90px;line-height:1.6;}',
    '.gw-select{appearance:none;-webkit-appearance:none;}',
    '.gw-tip{display:flex;align-items:flex-start;gap:8px;background:rgba(5,150,105,.06);border:1px solid rgba(5,150,105,.15);border-radius:10px;padding:10px 12px;font-size:11px;color:var(--td);line-height:1.5;margin-top:10px;}',
    '.gw-tip strong{color:#059669;}',
    '.gw-scope-cards{display:flex;flex-direction:column;gap:10px;}',
    '.gw-scope-card{background:var(--s2);border:2px solid var(--br);border-radius:14px;padding:14px 16px;cursor:pointer;transition:border-color .2s,background .2s;display:flex;align-items:center;gap:14px;}',
    '.gw-scope-card.sel{border-color:#059669;background:rgba(5,150,105,.06);}',
    '.gw-scope-icon{font-size:24px;flex-shrink:0;}',
    '.gw-scope-name{font-weight:700;font-size:14px;color:var(--tx);font-family:-apple-system,BlinkMacSystemFont,"Inter",sans-serif;}',
    '.gw-scope-desc{font-size:11px;color:var(--td);margin-top:2px;}',
    '.gw-scope-radio{width:20px;height:20px;border-radius:50%;border:2px solid var(--br);margin-left:auto;flex-shrink:0;display:flex;align-items:center;justify-content:center;transition:border-color .2s,background .2s;}',
    '.gw-scope-card.sel .gw-scope-radio{border-color:#059669;background:#059669;}',
    '.gw-scope-card.sel .gw-scope-radio::after{content:"";width:8px;height:8px;border-radius:50%;background:#fff;display:block;}',
    '.gw-skill-cloud{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px;}',
    '.gw-skill{padding:5px 11px;background:var(--s2);border:1.5px solid var(--br);border-radius:20px;font-size:11px;font-weight:600;color:var(--td);cursor:pointer;transition:all .15s;user-select:none;}',
    '.gw-skill.sel{background:rgba(5,150,105,.1);border-color:#059669;color:#059669;}',
    '.gw-example{font-size:11px;color:var(--td);cursor:pointer;padding:5px 10px;background:var(--s2);border:1px solid var(--br);border-radius:8px;margin:0 5px 5px 0;display:inline-block;}',
    '#gw-budget-preview{background:var(--s2);border:1px solid var(--br);border-radius:12px;padding:12px 14px;margin-top:10px;}',
    '.gw-brow{display:flex;justify-content:space-between;align-items:center;font-size:12px;padding:4px 0;}',
    '.gw-brow.total{border-top:1px solid var(--br);padding-top:8px;margin-top:4px;font-weight:700;}',
    '#gw-review-section{background:var(--s2);border:1px solid var(--br);border-radius:14px;padding:14px;margin-bottom:12px;}',
    '.gw-rv-row{display:flex;justify-content:space-between;align-items:flex-start;padding:6px 0;border-bottom:1px solid var(--br);}',
    '.gw-rv-row:last-child{border-bottom:none;}',
    '.gw-rv-label{font-size:10px;font-weight:700;color:var(--td);text-transform:uppercase;letter-spacing:.06em;padding-top:2px;}',
    '.gw-rv-right{display:flex;align-items:flex-start;gap:8px;max-width:65%;}',
    '.gw-rv-val{font-size:12px;color:var(--tx);font-weight:600;text-align:right;line-height:1.4;word-break:break-word;}',
    '.gw-rv-edit{font-size:10px;color:#059669;cursor:pointer;font-weight:700;flex-shrink:0;white-space:nowrap;}',
    '#gw-footer{padding:14px 20px 32px;flex-shrink:0;border-top:1px solid var(--br);}',
    '#gw-btn-row{display:flex;gap:10px;}',
    '#gw-back{flex:0 0 auto;padding:13px 18px;background:var(--s2);border:1.5px solid var(--br);border-radius:12px;color:var(--td);font-family:-apple-system,BlinkMacSystemFont,"Inter",sans-serif;font-weight:600;font-size:13px;cursor:pointer;}',
    '#gw-next{flex:1;padding:14px;background:linear-gradient(135deg,#059669,#047857);border:none;border-radius:12px;color:#fff;font-family:-apple-system,BlinkMacSystemFont,"Inter",sans-serif;font-weight:700;font-size:14px;cursor:pointer;box-shadow:0 4px 14px rgba(5,150,105,.35);transition:transform .12s;}',
    '#gw-next:active{transform:scale(.98);}',
    '#gw-next:disabled{background:#6b7280;box-shadow:none;cursor:not-allowed;}',
    '#gw-close-btn{position:absolute;top:0;right:0;background:none;border:none;color:var(--td);font-size:20px;cursor:pointer;padding:4px 6px;}',
    '.gw-char-count{font-size:10px;color:var(--td);text-align:right;margin-top:3px;}',
    '.gw-wallet-warn{display:flex;align-items:flex-start;gap:8px;background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;padding:10px 12px;margin-top:8px;font-size:11px;color:#9a3412;line-height:1.5;}',
    '.gw-cat-badge{display:inline-flex;align-items:center;gap:4px;background:rgba(5,150,105,.08);border:1px solid rgba(5,150,105,.2);color:#059669;font-size:10px;font-weight:700;padding:3px 10px;border-radius:20px;margin-top:6px;}',
    '#gw-escrow-row{display:flex;align-items:flex-start;gap:10px;padding:12px 14px;background:rgba(5,150,105,.06);border:1px solid rgba(5,150,105,.2);border-radius:12px;cursor:pointer;margin-bottom:4px;}',
    '#gw-escrow-row input{width:18px;height:18px;accent-color:#059669;flex-shrink:0;margin-top:1px;cursor:pointer;}',
    '#gw-escrow-row label{font-size:12px;color:var(--tx);line-height:1.5;cursor:pointer;}'
  ].join('');
  document.head.appendChild(s);
}

window.openPostGig = function() {
  if (ME && ME.role !== 'employer') { toast('Only clients can post gigs.', 'bad'); return; }
  if (document.getElementById('gw-overlay')) return;
  _gwInjectStyles();
  _GW = {
    step: 1,
    data: { title:'', category:'Graphics Design', description:'', skills:[], screeningQ:'', scope:'medium', duration:'1-3 months', budget:'', escrowAgreed:false }
  };
  var ov = document.createElement('div');
  ov.id = 'gw-overlay';
  ov.innerHTML = '<div id="gw-sheet">'
    + '<div id="gw-header">'
    + '<div id="gw-handle"></div>'
    + '<button id="gw-close-btn">✕</button>'
    + '<div id="gw-progress-bar-wrap"><div id="gw-progress-bar"></div></div>'
    + '<div id="gw-step-label"></div>'
    + '<div id="gw-step-title"></div>'
    + '<div id="gw-step-sub"></div>'
    + '</div>'
    + '<div id="gw-body"></div>'
    + '<div id="gw-footer"><div id="gw-btn-row">'
    + '<button id="gw-back">← Back</button>'
    + '<button id="gw-next">Continue →</button>'
    + '</div></div>'
    + '</div>';
  document.body.appendChild(ov);
  ov.addEventListener('click', function(e) { if (e.target === ov) _gwClose(); });
  document.getElementById('gw-close-btn').onclick = _gwClose;
  document.getElementById('gw-back').onclick  = _gwBack;
  document.getElementById('gw-next').onclick  = _gwNext;
  _gwRender();
};

function _gwClose() {
  var el = document.getElementById('gw-overlay');
  if (!el) return;
  el.style.transition = 'opacity .2s ease';
  el.style.opacity = '0';
  setTimeout(function() { if (el.parentNode) el.remove(); _GW = null; }, 200);
}

function _gwBack() {
  if (!_GW) return;
  _gwSave(); // save current step data before going back
  if (_GW.step > 1) { _GW.step--; _gwRender(); }
}

function _gwNext() {
  if (!_GW) return;
  _gwSave(); // SAVE FIRST — then validate against the saved data
  var err = _gwValidate();
  if (err) { _gwShake(); toast(err, 'bad'); return; }
  if (_GW.step < 5) { _GW.step++; _gwRender(); } else { _gwSubmit(); }
}

function _gwShake() {
  var btn = document.getElementById('gw-next'); if (!btn) return;
  btn.style.transform = 'translateX(-5px)';
  setTimeout(function() { btn.style.transform = 'translateX(5px)'; }, 75);
  setTimeout(function() { btn.style.transform = ''; }, 150);
}

function _gwSave() {
  if (!_GW) return;
  var d = _GW.data, s = _GW.step;
  if (s === 1) {
    var t = document.getElementById('gw-title'); if (t) d.title = t.value.trim();
    var c = document.getElementById('gw-cat');   if (c) d.category = c.value;
  }
  if (s === 2) {
    var de = document.getElementById('gw-desc'); if (de) d.description = de.value.trim();
    var sq = document.getElementById('gw-sq');   if (sq) d.screeningQ  = sq.value.trim();
    d.skills = [];
    document.querySelectorAll('#gw-skill-cloud .gw-skill.sel').forEach(function(el) { d.skills.push(el.dataset.skill); });
  }
  if (s === 3) { var du = document.getElementById('gw-duration'); if (du) d.duration = du.value; }
  if (s === 4) { var b = document.getElementById('gw-budget'); if (b) d.budget = b.value.trim(); }
  if (s === 5) { var cb = document.getElementById('gw-escrow-cb'); if (cb) d.escrowAgreed = cb.checked; }
}

function _gwValidate() {
  if (!_GW) return 'No state.';
  var d = _GW.data, s = _GW.step;
  if (s === 1) {
    if (!d.title || d.title.length < 10) return 'Please enter a title (at least 10 characters).';
    // category always has a default, but guard against empty just in case
    if (!d.category) return 'Please select a category.';
  }
  if (s === 2) {
    if (!d.description || d.description.length < 50) return 'Description must be at least 50 characters.';
  }
  if (s === 4) {
    var num = parseFloat((d.budget || '').replace(/[^0-9.]/g, '')) || 0;
    if (!num || num < 1) return 'Please enter a valid budget.';
    if (num > ((ME.wallet && ME.wallet.balance) || 0)) return 'Insufficient wallet balance. Please top up first.';
  }
  if (s === 5) {
    if (!d.escrowAgreed) return 'Please agree to the escrow terms to continue.';
  }
  return null;
}

function _gwRender() {
  if (!_GW) return;
  var step = _GW.step, d = _GW.data;
  var pct  = Math.round((step / 5) * 100);
  var pb   = document.getElementById('gw-progress-bar');
  if (pb) pb.style.width = pct + '%';

  var meta = [
    ['Step 1 of 5', 'The Headline',   'What are you looking to get done?'],
    ['Step 2 of 5', 'The Brief',      'Help freelancers understand the project.'],
    ['Step 3 of 5', 'The Scope',      'How big is this project?'],
    ['Step 4 of 5', 'The Budget',     'Set your investment and lock escrow.'],
    ['Step 5 of 5', 'Review & Post',  'Everything look right?']
  ][step - 1];
  var el;
  el = document.getElementById('gw-step-label'); if (el) el.textContent = meta[0];
  el = document.getElementById('gw-step-title'); if (el) el.textContent = meta[1];
  el = document.getElementById('gw-step-sub');   if (el) el.textContent = meta[2];

  var back = document.getElementById('gw-back');
  var next = document.getElementById('gw-next');
  if (back) back.style.display = step === 1 ? 'none' : '';
  if (next) { next.textContent = step === 5 ? '🔒 Post Gig & Lock Escrow' : 'Continue →'; next.disabled = false; }

  var body = document.getElementById('gw-body');
  if (!body) return;
  body.style.cssText = 'opacity:0;transform:translateX(16px);';
  body.innerHTML = _gwBuildStep(step, d);
  requestAnimationFrame(function() {
    body.style.cssText = 'transition:opacity .22s ease,transform .22s cubic-bezier(.4,0,.2,1);opacity:1;transform:translateX(0);';
  });
  _gwWireStep(step, d);
  body.scrollTop = 0;
}

function _gwBuildStep(step, d) {
  if (step === 1) return _gwStep1(d);
  if (step === 2) return _gwStep2(d);
  if (step === 3) return _gwStep3(d);
  if (step === 4) return _gwStep4(d);
  if (step === 5) return _gwStep5(d);
  return '';
}

// ─ Step 1: Headline ──────────────────────────────────────────
function _gwStep1(d) {
  var cats = ['Graphics Design','UI/UX Design','Content Writing','Data Analysis','Digital Marketing','Web & Mobile Dev'];
  var exs  = (d.category && _GW_EXAMPLES[d.category]) || _GW_EXAMPLES['Web & Mobile Dev'];
  var sug  = d.title && d.title.length > 5 ? _gwSuggestCategory(d.title) : null;
  var sugH = '';
  if (sug) {
    var icon = (typeof CAT_ICONS !== 'undefined' && CAT_ICONS[sug]) || '🌐';
    sugH = '<div class="gw-cat-badge" id="gw-sug">' + icon + ' Suggested: ' + sug
      + ' <button onclick="(function(){document.getElementById(\'gw-cat\').value=\'' + sug.replace(/'/g,"\\'") + '\';document.getElementById(\'gw-sug\').style.display=\'none\';})();" style="background:none;border:none;color:#059669;font-size:10px;font-weight:700;cursor:pointer;margin-left:4px;">Apply ✓</button></div>';
  }
  return '<div class="gw-field">'
    + '<label class="gw-label">Gig Title <span style="color:#ef4444;">*</span></label>'
    + '<input id="gw-title" class="gw-input" placeholder="e.g. Design a modern logo for a fintech startup" value="' + (d.title||'') + '" maxlength="80" autocomplete="off">'
    + '<div class="gw-char-count"><span id="gw-tc">' + (d.title||'').length + '</span>/80</div>'
    + sugH
    + '</div>'
    + '<div class="gw-field">'
    + '<label class="gw-label">💡 Try an example</label>'
    + '<div>' + exs.map(function(e) { return '<span class="gw-example" data-ex="' + e.replace(/"/g,'&quot;') + '">' + e + '</span>'; }).join('') + '</div>'
    + '</div>'
    + '<div class="gw-field">'
    + '<label class="gw-label">Category <span style="color:#ef4444;">*</span></label>'
    + '<select id="gw-cat" class="gw-input gw-select">'
    + cats.map(function(c) { return '<option value="' + c + '"' + (c === d.category ? ' selected' : '') + '>' + ((typeof CAT_ICONS !== 'undefined' && CAT_ICONS[c]) || '') + ' ' + c + '</option>'; }).join('')
    + '</select>'
    + '</div>'
    + '<div class="gw-tip">💡 <div><strong>Pro Tip:</strong> A specific title gets 3× more professional bids than a vague one.</div></div>';
}

// ─ Step 2: Brief ─────────────────────────────────────────────
function _gwStep2(d) {
  var skills = (typeof SKILLS_BY_CAT !== 'undefined' && d.category && SKILLS_BY_CAT[d.category])
    || ['Communication','Research','Documentation','Project Management'];
  return '<div class="gw-field">'
    + '<label class="gw-label">Project Description <span style="color:#ef4444;">*</span></label>'
    + '<textarea id="gw-desc" class="gw-input gw-textarea" placeholder="Describe deliverables, requirements, tools to use, and what success looks like...">' + (d.description||'') + '</textarea>'
    + '<div class="gw-char-count"><span id="gw-dc">' + (d.description||'').length + '</span> / 50 min</div>'
    + '</div>'
    + '<div class="gw-field">'
    + '<label class="gw-label">Required Skills</label>'
    + '<div class="gw-skill-cloud" id="gw-skill-cloud">'
    + skills.map(function(sk) { return '<span class="gw-skill' + (d.skills.indexOf(sk) >= 0 ? ' sel' : '') + '" data-skill="' + sk + '">' + sk + '</span>'; }).join('')
    + '</div></div>'
    + '<div class="gw-field">'
    + '<label class="gw-label">Screening Question <span style="font-size:10px;font-weight:400;color:var(--td);">(optional)</span></label>'
    + '<input id="gw-sq" class="gw-input" placeholder="e.g. How many similar projects have you completed?" value="' + (d.screeningQ||'') + '">'
    + '</div>'
    + '<div class="gw-tip">🎯 <div><strong>Pro Tip:</strong> A screening question filters low-effort applicants and saves review time.</div></div>';
}

// ─ Step 3: Scope ─────────────────────────────────────────────
function _gwStep3(d) {
  var scopes = [
    {id:'small', icon:'⚡', name:'Small',  desc:'Quick, well-defined task. Deliverable within days.'},
    {id:'medium',icon:'🏗️',name:'Medium', desc:'Standard project with clear milestones.'},
    {id:'large', icon:'🚀', name:'Large',  desc:'Long-term initiative requiring ongoing collaboration.'}
  ];
  var durs = ['Less than 1 week','1–4 weeks','1–3 months','3–6 months','6+ months'];
  return '<div class="gw-field">'
    + '<label class="gw-label">Project Scale</label>'
    + '<div class="gw-scope-cards">'
    + scopes.map(function(sc) {
        return '<div class="gw-scope-card' + (d.scope === sc.id ? ' sel' : '') + '" data-scope="' + sc.id + '">'
          + '<div class="gw-scope-icon">' + sc.icon + '</div>'
          + '<div><div class="gw-scope-name">' + sc.name + '</div><div class="gw-scope-desc">' + sc.desc + '</div></div>'
          + '<div class="gw-scope-radio"></div></div>';
      }).join('')
    + '</div></div>'
    + '<div class="gw-field">'
    + '<label class="gw-label">Estimated Duration</label>'
    + '<select id="gw-duration" class="gw-input gw-select">'
    + durs.map(function(du) { return '<option' + (du === d.duration ? ' selected' : '') + '>' + du + '</option>'; }).join('')
    + '</select></div>'
    + '<div class="gw-tip">📅 <div><strong>Pro Tip:</strong> Realistic timelines improve freelancer commitment rates significantly.</div></div>';
}

// ─ Step 4: Budget ────────────────────────────────────────────
function _gwStep4(d) {
  var bal = (ME.wallet && ME.wallet.balance) || 0;
  var num = parseFloat((d.budget || '').replace(/[^0-9.]/g, '')) || 0;
  var fee = Math.round(num * 0.10);
  var pay = num - fee;
  var low = bal < num && num > 0;
  return '<div class="gw-field">'
    + '<label class="gw-label">Budget ($) <span style="color:#ef4444;">*</span></label>'
    + '<input id="gw-budget" class="gw-input" type="number" placeholder="e.g. 150000" value="' + (d.budget||'') + '" min="1" inputmode="numeric">'
    + '<div style="font-size:11px;color:var(--td);margin-top:4px;">Wallet balance: <strong style="color:' + (low ? '#ef4444' : '#059669') + ';">$' + bal.toLocaleString() + '</strong></div>'
    + (low ? '<div class="gw-wallet-warn">⚠️ <div>Your balance is below this budget. <span onclick="showPage(\'wallet\');" style="color:#ea580c;font-weight:700;cursor:pointer;text-decoration:underline;">Top up →</span></div></div>' : '')
    + '</div>'
    + '<div id="gw-bp" style="' + (num ? '' : 'display:none') + '">'
    + '<div style="font-size:11px;font-weight:700;color:var(--tx);margin-bottom:8px;">💰 Escrow Breakdown</div>'
    + '<div class="gw-brow"><span style="color:var(--td);">Contract Value</span><span id="gw-bp-t">$' + num.toLocaleString() + '</span></div>'
    + '<div class="gw-brow"><span style="color:var(--td);">SkillStamp Fee (10%)</span><span id="gw-bp-f" style="color:#ef4444;">-$' + fee.toLocaleString() + '</span></div>'
    + '<div class="gw-brow total"><span>Freelancer Receives</span><span id="gw-bp-p" style="color:#059669;">$' + pay.toLocaleString() + '</span></div>'
    + '</div>'
    + '<div class="gw-tip">🔒 <div>Budget is <strong>locked in escrow</strong> when you post. Released only after you confirm delivery.</div></div>';
}

// ─ Step 5: Review ────────────────────────────────────────────
function _gwStep5(d) {
  var num = parseFloat((d.budget || '').replace(/[^0-9.]/g, '')) || 0;
  var rows = [
    {label:'Title',       val:d.title,                                          step:1},
    {label:'Category',    val:d.category,                                       step:1},
    {label:'Scope',       val:d.scope.charAt(0).toUpperCase()+d.scope.slice(1)+' · '+d.duration, step:3},
    {label:'Budget',      val:'$'+num.toLocaleString(),                         step:4},
    {label:'Skills',      val:d.skills.length ? d.skills.join(', ') : 'None',  step:2},
    {label:'Description', val:d.description.slice(0,80)+(d.description.length>80?'…':''), step:2}
  ];
  return '<div id="gw-review-section">'
    + rows.map(function(r) {
        return '<div class="gw-rv-row">'
          + '<div class="gw-rv-label">' + r.label + '</div>'
          + '<div class="gw-rv-right">'
          + '<div class="gw-rv-val">' + r.val + '</div>'
          + '<span class="gw-rv-edit" onclick="_GW.step=' + r.step + ';_gwRender();">Edit</span>'
          + '</div></div>';
      }).join('')
    + '</div>'
    + '<div id="gw-escrow-row">'
    + '<input type="checkbox" id="gw-escrow-cb"' + (d.escrowAgreed ? ' checked' : '') + '>'
    + '<label for="gw-escrow-cb">I agree to lock <strong>$' + num.toLocaleString() + '</strong> in escrow. Funds release only after I confirm delivery.</label>'
    + '</div>'
    + '<div class="gw-tip" style="margin-top:12px;">🛡️ <div>Your money is <strong>protected</strong>. SkillStamp holds funds securely until you are satisfied.</div></div>';
}

// ─ Wire interactions ──────────────────────────────────────────
function _gwWireStep(step, d) {
  if (step === 1) {
    var tEl = document.getElementById('gw-title');
    var tc  = document.getElementById('gw-tc');
    if (tEl) {
      tEl.addEventListener('input', function() {
        var v = tEl.value; if (tc) tc.textContent = v.length; _GW.data.title = v.trim();
        var sug = v.length > 8 ? _gwSuggestCategory(v) : null;
        var badge = document.getElementById('gw-sug');
        if (sug) {
          if (!badge) { badge = document.createElement('div'); badge.id='gw-sug'; badge.className='gw-cat-badge'; tEl.parentNode.appendChild(badge); }
          badge.innerHTML = ((typeof CAT_ICONS !== 'undefined' && CAT_ICONS[sug]) || '🌐') + ' Suggested: ' + sug
            + ' <button onclick="(function(){document.getElementById(\'gw-cat\').value=\'' + sug.replace(/'/g,"\\'") + '\';document.getElementById(\'gw-sug\').style.display=\'none\';})();" style="background:none;border:none;color:#059669;font-size:10px;font-weight:700;cursor:pointer;margin-left:4px;">Apply ✓</button>';
          badge.style.display = '';
        } else if (badge) { badge.style.display = 'none'; }
      });
      document.querySelectorAll('.gw-example').forEach(function(ex) {
        ex.onclick = function() {
          var txt = ex.dataset.ex || ex.textContent;
          tEl.value = txt; if (tc) tc.textContent = txt.length; _GW.data.title = txt;
          tEl.dispatchEvent(new Event('input'));
        };
      });
      tEl.focus();
    }
  }
  if (step === 2) {
    var dEl = document.getElementById('gw-desc'), dc = document.getElementById('gw-dc');
    if (dEl) dEl.addEventListener('input', function() { var n=dEl.value.length; if(dc){dc.textContent=n;dc.style.color=n>=50?'#059669':'var(--td)';} });
    document.querySelectorAll('#gw-skill-cloud .gw-skill').forEach(function(el) { el.onclick=function(){this.classList.toggle('sel');}; });
  }
  if (step === 3) {
    document.querySelectorAll('.gw-scope-card').forEach(function(card) {
      card.onclick = function() {
        document.querySelectorAll('.gw-scope-card').forEach(function(c){c.classList.remove('sel');});
        card.classList.add('sel'); _GW.data.scope = card.dataset.scope;
      };
    });
  }
  if (step === 4) {
    var bEl = document.getElementById('gw-budget');
    if (bEl) {
      bEl.addEventListener('input', function() {
        var num=parseFloat(bEl.value)||0, fee=Math.round(num*.1), pay=num-fee;
        var pr=document.getElementById('gw-bp'); if(pr) pr.style.display=num>0?'':'none';
        var t=document.getElementById('gw-bp-t'); if(t) t.textContent='$'+num.toLocaleString();
        var f=document.getElementById('gw-bp-f'); if(f) f.textContent='-$'+fee.toLocaleString();
        var p=document.getElementById('gw-bp-p'); if(p) p.textContent='$'+pay.toLocaleString();
        var bal=(ME.wallet&&ME.wallet.balance)||0;
        var warn=document.querySelector('.gw-wallet-warn');
        if(num>bal&&num>0){if(!warn){warn=document.createElement('div');warn.className='gw-wallet-warn';warn.innerHTML='⚠️ <div>Balance <strong>$'+bal.toLocaleString()+'</strong> is below this budget. <span onclick="showPage(\'wallet\');" style="color:#ea580c;font-weight:700;cursor:pointer;text-decoration:underline;">Top up →</span></div>';bEl.parentNode.appendChild(warn);}}
        else if(warn){warn.remove();}
        _GW.data.budget=bEl.value;
      });
      bEl.focus();
    }
  }
}

// ─ Submit ─────────────────────────────────────────────────────
window.submitGig = async function() { _gwSubmit(); };

async function _gwSubmit() {
  if (!_GW) return;
  _gwSave();
  var d   = _GW.data;
  var num = parseFloat((d.budget || '').replace(/[^0-9.]/g, '')) || 0;
  var bal = (ME.wallet && ME.wallet.balance) || 0;

  if (!d.title || !d.category || !d.description || !num || !d.escrowAgreed) { toast('Please complete all required fields.', 'bad'); return; }
  if (num > bal) { toast('Insufficient wallet balance. Top up first.', 'bad'); return; }

  var btn = document.getElementById('gw-next');
  if (btn) { btn.disabled = true; btn.textContent = 'Posting…'; }

  try {
    if (!ME.wallet) ME.wallet = { balance:0, pending:0, earned:0, transactions:[] };
    ME.wallet.balance  = Math.max(0, bal - num);
    ME.wallet.pending  = (ME.wallet.pending || 0) + num;
    ME.wallet.transactions.unshift({ id:'escrow_'+Date.now(), type:'out', amount:num, from:'Escrow', desc:'Escrow: '+d.title, ts:Date.now() });

    var gig = {
      id:'g'+Date.now(), title:d.title, description:d.description,
      pay:'$'+num.toLocaleString(), payNum:num, category:d.category, type:'Project',
      scope:d.scope, duration:d.duration, skills:d.skills, screeningQ:d.screeningQ||null,
      posterUid:ME.uid, posterName:ME.name, created:Date.now(), applicants:[],
      status:'open', escrowAmount:num, deadline:null, hiredUid:null
    };
    await fbSet('gigs', gig.id, gig);
    CACHE.gigs.unshift(gig);
    ME.gigsCount = (ME.gigsCount || 0) + 1;
    await saveUser(ME);

    // Notify matching-category freelancers (up to 40)
    getAllUsers().filter(function(u) { return u.role==='freelancer' && u.uid!==ME.uid && u.category===d.category; })
      .slice(0, 40).forEach(function(u) {
        pushNotif(u.uid, 'gig_posted', '💼 New Gig: '+d.title, ME.name+' posted a '+d.category+' gig — $'+num.toLocaleString(), {type:'gig_posted',gigId:gig.id});
      });

    _gwClose();
    toast('Gig posted! $'+num.toLocaleString()+' locked in escrow. ✅');
    showPage('gigs');
    if (typeof renderWallet === 'function') setTimeout(renderWallet, 500);

  } catch(err) {
    console.error('submitGig failed', err);
    ME.wallet.balance  = bal;
    ME.wallet.pending  = Math.max(0, (ME.wallet.pending||0) - num);
    ME.wallet.transactions.shift();
    if (btn) { btn.disabled = false; btn.textContent = '🔒 Post Gig & Lock Escrow'; }
    toast('Failed to post gig. Please try again.', 'bad');
  }
}


window.showGigDetail=function(gid){
  var g=getGigs().find(function(x){return x.id===gid;});
  if(!g)return;
  var payNum=parseFloat((g.pay||'0').replace(/[^0-9.]/g,''))||0;
  var fee=Math.round(payNum*0.10);
  var payout=payNum-fee;
  var isOwn=g.posterUid===ME.uid;
  var alreadyApplied=(g.applicants||[]).indexOf(ME.uid)>=0;
  var isHired=g.hiredUid===ME.uid;

  // Build modal HTML using variable concatenation — no inline onclick
  var mh='<button class="mclose" id="gd-close">✕</button>';
  mh+='<div style="font-size:22px;margin-bottom:8px;">'+(CAT_ICONS[g.category]||'💼')+'</div>';
  mh+='<h3>'+g.title+'</h3>';
  mh+='<p>'+g.posterName+' · '+g.category+' · '+g.type+' · '+timeAgo(g.created)+'</p>';
  if(g.description) mh+='<div style="font-size:11px;color:var(--td);line-height:1.75;margin-bottom:13px;padding:12px;background:var(--s2);border-radius:6px;">'+g.description+'</div>';
  var skillTags='';
  (g.skills||[]).forEach(function(s){skillTags+='<span style="display:inline-block;font-size:9px;background:rgba(232,197,71,.07);border:1px solid rgba(232,197,71,.2);color:var(--gld);padding:2px 8px;border-radius:3px;margin:2px;">'+s+'</span>';});
  if(skillTags) mh+='<div style="margin-bottom:14px;">'+skillTags+'</div>';
  // Escrow breakdown
  mh+='<div class="escrow">';
  mh+='<div style="font-size:11px;font-weight:600;margin-bottom:9px;">💰 Escrow Breakdown</div>';
  mh+='<div class="erow"><span style="color:var(--td);">Contract Value</span><span>'+g.pay+'</span></div>';
  mh+='<div class="erow"><span style="color:var(--td);">SkillStamp Fee (10%)</span><span style="color:var(--acc);">-$'+fee+'</span></div>';
  mh+='<div class="erow" style="border-top:1px solid var(--br);padding-top:6px;margin-top:4px;font-weight:700;"><span>Freelancer Receives</span><span style="color:var(--grn);">$'+payout+'</span></div>';
  mh+='</div>';
  // Action buttons — using ids, wired after render
  mh+='<div id="gd-actions" style="margin-top:14px;"></div>';
  setModal(mh);

  // Wire close
  var cl=document.getElementById('gd-close');
  if(cl) cl.onclick=closeModal;

  // Wire actions based on role
  var acts=document.getElementById('gd-actions');
  if(!acts)return;

  if(isOwn){
    // Client view
    var status=g.status||'open';
    var statusColor={open:'#4ade80',hired:'#4d9fff',completed:'var(--gld)',disputed:'#ef4444',cancelled:'var(--td)'}[status]||'var(--td)';
    acts.innerHTML='<div style="margin-bottom:10px;"><span style="font-size:10px;padding:3px 10px;border-radius:20px;background:rgba(255,255,255,.06);color:'+statusColor+';">'+status+'</span>'+(g.escrowAmount?'<span style="font-size:10px;color:#ffa500;margin-left:8px;">🔒 $'+g.escrowAmount.toLocaleString()+' in escrow</span>':'')+'</div>';
    if(status==='open'){
      var hBtn=document.createElement('button');
      hBtn.className='btn';hBtn.style.cssText='width:100%;margin-bottom:8px;';
      hBtn.textContent='👤 Review Applicants ('+(g.applicants||[]).length+')';
      hBtn.onclick=function(){openHireModal(gid);};
      acts.appendChild(hBtn);
    }
    if(status==='hired'){
      var wsBtn2=document.createElement('button');
      wsBtn2.className='btn';wsBtn2.style.cssText='width:100%;margin-bottom:8px;';
      wsBtn2.textContent='\uD83D\uDCBC Open Gig Workspace';
      wsBtn2.onclick=function(){openGigWorkspace(gid);};
      acts.appendChild(wsBtn2);
      var cBtn=document.createElement('button');
      cBtn.className='btn2';cBtn.style.cssText='width:100%;margin-bottom:8px;';
      cBtn.textContent='\u2705 Mark Complete & Release Payment';
      cBtn.onclick=function(){openCompleteGig(gid);};
      acts.appendChild(cBtn);
      var dBtn=document.createElement('button');
      dBtn.className='btn2';dBtn.style.cssText='width:100%;margin-bottom:8px;border-color:rgba(239,68,68,.4);color:#ef4444;';
      dBtn.textContent='⚠️ Raise Dispute';
      dBtn.onclick=function(){openDispute(gid);};
      acts.appendChild(dBtn);
    }
    var delBtn=document.createElement('button');
    delBtn.className='btn2';delBtn.style.cssText='width:100%;font-size:11px;';
    delBtn.textContent='Delete Gig';
    delBtn.onclick=function(){deleteGig(gid);};
    acts.appendChild(delBtn);
  } else {
    // Freelancer view
    if(isHired&&g.status==='hired'){
      var wsBtn=document.createElement('button');
      wsBtn.className='btn';wsBtn.style.cssText='width:100%;margin-bottom:8px;';
      wsBtn.textContent='\uD83D\uDCBC Open Gig Workspace';
      wsBtn.onclick=function(){openGigWorkspace(gid);};
      acts.appendChild(wsBtn);
      var fdBtn=document.createElement('button');
      fdBtn.className='btn2';fdBtn.style.cssText='width:100%;border-color:rgba(239,68,68,.4);color:#ef4444;';
      fdBtn.textContent='\u26A0\uFE0F Raise Dispute';
      fdBtn.onclick=function(){openDispute(gid);};
      acts.appendChild(fdBtn);
    } else if(g.status!=='open'){
      acts.innerHTML='<div style="font-size:11px;color:var(--td);text-align:center;padding:12px;">This gig is no longer accepting applications.</div>';
    } else if(alreadyApplied){
      acts.innerHTML='<div style="background:rgba(74,222,128,.06);border:1px solid rgba(74,222,128,.2);border-radius:8px;padding:12px;font-size:11px;color:var(--grn);text-align:center;">✓ Applied — waiting for client to review.</div>';
    } else {
      var apBtn=document.createElement('button');
      apBtn.className='btn';apBtn.style.cssText='width:100%;';
      apBtn.textContent='Apply with SkillID →';
      apBtn.onclick=function(){applyGig(gid,g.title,g.posterUid);};
      acts.appendChild(apBtn);
    }
  }
};

// ── PROPOSAL HELPERS ────────────────────────────────────────
function getProposalTracker(){
  var currentMonth=new Date().toISOString().slice(0,7);
  var tracker=ME.proposalTracker||{count:0,month:currentMonth};
  if(tracker.month!==currentMonth) tracker={count:0,month:currentMonth};
  return tracker;
}
function saveProposalTracker(tracker){ME.proposalTracker=tracker;saveUser(ME);}
function getProposalCredits(){return ME.proposalCredits||0;}

window.purchaseProposalPack=async function(count,price){
  if(!ME.wallet||(ME.wallet.balance||0)<price){toast('Insufficient wallet balance. Top up first.','bad');closeModal();showPage('wallet');return;}
  ME.wallet.balance=(ME.wallet.balance||0)-price;
  ME.wallet.transactions.unshift({id:'pp_'+Date.now(),type:'out',amount:price,from:'SkillStamp',desc:count+' Proposal Credits',ts:Date.now()});
  ME.proposalCredits=(ME.proposalCredits||0)+count;
  await saveUser(ME);
  closeModal();toast('✓ '+count+' proposal credits added!');
};
function openProposalCredits(){
  setModal('<button class="mclose" onclick="closeModal()">✕</button>'
    +'<div style="text-align:center;padding:8px 0 14px;">'
    +'<div style="font-size:40px;margin-bottom:12px;">📦</div>'
    +'<div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:800;font-size:16px;margin-bottom:6px;">Proposal Credits</div>'
    +'<p style="font-size:12px;color:var(--td);line-height:1.7;margin-bottom:18px;">You\'ve used all your free proposals this month. Buy a credit pack to keep applying, or get verified for unlimited proposals.</p>'
    +'</div>'
    +'<div style="display:grid;gap:10px;margin-bottom:14px;">'
    +'<div style="background:var(--s2);border:1px solid var(--br);border-radius:10px;padding:14px;cursor:pointer;" onclick="purchaseProposalPack(5,3)">'
    +'<div style="display:flex;justify-content:space-between;align-items:center;">'
    +'<div><div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:700;font-size:13px;">Starter Pack</div><div style="font-size:11px;color:var(--td);">5 extra proposals</div></div>'
    +'<div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:800;font-size:15px;color:var(--gld);">$3</div>'
    +'</div></div>'
    +'<div style="background:var(--s2);border:2px solid var(--gld);border-radius:10px;padding:14px;cursor:pointer;position:relative;" onclick="purchaseProposalPack(15,8)">'
    +'<div style="position:absolute;top:-8px;right:12px;background:var(--gld);color:#000;font-size:8px;font-weight:800;padding:2px 8px;border-radius:8px;font-family:Plus Jakarta Sans,sans-serif;">BEST VALUE</div>'
    +'<div style="display:flex;justify-content:space-between;align-items:center;">'
    +'<div><div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:700;font-size:13px;">Pro Pack</div><div style="font-size:11px;color:var(--td);">15 extra proposals</div></div>'
    +'<div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:800;font-size:15px;color:var(--gld);">$8</div>'
    +'</div></div>'
    +'</div>'
    +'<button class="btn2" onclick="closeModal();openSubmitSkill();" style="width:100%;margin-bottom:8px;">⚡ Get Verified Instead (Unlimited)</button>'
    +'<div style="font-size:10px;color:var(--td);text-align:center;">Deducted from your wallet balance</div>');
}

window.applyGig=async function(gid,title,posterUid){
  if(!checkRateLimit('apply_gig',5,60000)) return;
  var isVerified=ME.badgeStatus==='verified'||ME.badgeStatus==='expert'||ME.badgeStatus==='elite';
  var tracker=getProposalTracker();
  var credits=getProposalCredits();
  var FREE_LIMIT=3;
  var gig=getGigs().find(function(g){return g.id===gid;});
  if(gig&&(gig.applicants||[]).indexOf(ME.uid)>=0){toast('You have already applied to this gig.','bad');return;}
  if(!isVerified&&tracker.count>=FREE_LIMIT&&credits<=0){openProposalCredits();return;}

  var portfolio=ME.portfolio||[];
  var pfOpts=portfolio.map(function(p){return '<option value="'+p.id+'">'+p.title+'</option>';}).join('');
  var pfSection=portfolio.length?'<div class="fg"><label class="fl">Portfolio Item <span style="font-size:9px;color:var(--td);">(optional)</span></label><select class="fi" id="ap-portfolio"><option value="">— None selected —</option>'+pfOpts+'</select></div>':'';
  var isOpenBudget=!gig||!gig.pay||gig.pay==='Open'||gig.pay===0;
  var rateSection=isOpenBudget?'<div class="fg"><label class="fl">Your Proposed Rate ($)</label><input class="fi" id="ap-rate" type="number" placeholder="e.g. 500" min="1"></div>':'';
  var remaining=isVerified?null:(FREE_LIMIT-tracker.count+credits);
  var proposalNotice=!isVerified?('<div style="background:rgba(255,107,53,.06);border:1px solid rgba(255,107,53,.2);border-radius:8px;padding:10px 12px;margin-bottom:14px;">'
    +'<div style="display:flex;justify-content:space-between;align-items:center;font-size:11px;">'
    +'<span style="color:var(--acc);font-weight:700;">📋 Proposals Used</span>'
    +'<span style="color:var(--acc);font-weight:700;">'+tracker.count+'/'+FREE_LIMIT+' this month'+(credits>0?' · '+credits+' credits':'')+'</span>'
    +'</div><div style="font-size:10px;color:var(--td);margin-top:3px;">Get verified for unlimited proposals + lower platform fees.</div>'
    +'</div>'):'';


  // -- Client timeframe (read-only) and screening questions
  var clientTimeline = (gig && gig.duration) ? gig.duration : null;
  var timelineHTML = clientTimeline
    ? '<div style="background:rgba(96,165,250,.06);border:1px solid rgba(96,165,250,.18);border-radius:10px;padding:11px 14px;margin-bottom:14px;display:flex;align-items:center;gap:10px;">'
      +'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>'
      +'<div style="flex:1;"><div style="font-size:10px;font-weight:700;color:#60a5fa;text-transform:uppercase;letter-spacing:.05em;margin-bottom:2px;">Client Required Timeframe</div>'
      +'<div style="font-size:13px;color:var(--tx);font-weight:700;">'+clientTimeline+'</div>'
      +'<div style="font-size:9px;color:var(--td);margin-top:1px;">Commit to delivering within this window.</div></div></div>'
    : '';
  var screeningQ = (gig && gig.screeningQ) ? gig.screeningQ.trim() : '';
  var screeningHTML = screeningQ
    ? '<div class="fg" style="margin-bottom:14px;"><div style="background:rgba(232,197,71,.06);border:1px solid rgba(232,197,71,.22);border-radius:10px;padding:12px;">'
      +'<div style="font-size:10px;font-weight:700;color:var(--gld);text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px;">Screening Question</div>'
      +'<div style="font-size:12px;color:var(--tx);font-weight:600;line-height:1.5;background:var(--s2);border-radius:7px;padding:9px 10px;margin-bottom:10px;">'+screeningQ+'</div>'
      +'<textarea class="fi" id="ap-screening" rows="3" placeholder="Answer the clients question directly..." style="resize:vertical;margin-bottom:4px;"></textarea>'
      +'<div style="font-size:9px;color:var(--td);" id="ap-screening-counter">0 characters</div>'
      +'</div></div>'
    : '';

  var mh='<button class="mclose" onclick="closeModal()">✕</button>';
  mh+='<div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;">';
  mh+='<div style="width:42px;height:42px;border-radius:12px;background:rgba(232,197,71,.1);border:1px solid rgba(232,197,71,.2);display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;">'+(CAT_ICONS[(gig&&gig.category)]||'💼')+'</div>';
  mh+='<div><div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:800;font-size:15px;color:var(--tx);">Submit Proposal</div>';
  mh+='<div style="font-size:10px;color:var(--td);margin-top:2px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;max-width:220px;">'+title+'</div></div>';
  mh+='</div>';
  mh+=proposalNotice;
  mh+=timelineHTML;
  mh+='<div class="fg"><label class="fl">Cover Note <span style="font-size:9px;color:var(--acc);">*required min 50 chars</span></label>';
  mh+='<textarea class="fi" id="ap-cover" rows="5" placeholder="Introduce yourself and explain your approach to this project..." style="resize:vertical;"></textarea>';
  mh+='<div style="font-size:9px;color:var(--td);margin-top:4px;" id="ap-cover-counter">0 characters</div></div>';
  mh+=screeningHTML;
  mh+=pfSection;
  mh+=rateSection;
  mh+='<button class="btn" id="ap-submit-btn" style="width:100%;margin-top:6px;">Submit Proposal</button>';
  mh+=rateSection;
  mh+='<button class="btn" id="ap-submit-btn" style="width:100%;">Submit Proposal →</button>';
  setModal(mh);

  setTimeout(function(){
    var coverEl=document.getElementById('ap-cover');
    var counterEl=document.getElementById('ap-cover-counter');
    if(coverEl&&counterEl){
      coverEl.addEventListener('input',function(){
        var len=coverEl.value.length;
        counterEl.style.color=len>=50?'var(--grn)':'var(--acc)';
        counterEl.textContent=len+' characters'+(len<50?' — '+Math.max(0,50-len)+' more needed':' ✓');
      });
    }
    var scrEl=document.getElementById('ap-screening');
    var scrCnt=document.getElementById('ap-screening-counter');
    if(scrEl&&scrCnt){
      scrEl.addEventListener('input',function(){
        var l=scrEl.value.length;
        scrCnt.style.color=l>0?'var(--grn)':'var(--td)';
        scrCnt.textContent=l+' characters'+(l>0?' ✓':'');
      });
    }
    var submitBtn=document.getElementById('ap-submit-btn');
    if(submitBtn) submitBtn.onclick=async function(){
      var cover=(document.getElementById('ap-cover').value||'').trim();
      // Use client's required timeframe — freelancer does not set their own
      var timeline=clientTimeline||(gig&&gig.duration)||'1 week';
      var screeningAns=document.getElementById('ap-screening')?(document.getElementById('ap-screening').value||'').trim():'';
      var pfId=document.getElementById('ap-portfolio')?document.getElementById('ap-portfolio').value:'';
      var rate=document.getElementById('ap-rate')?parseFloat(document.getElementById('ap-rate').value)||null:null;
      if(cover.length<50){toast('Cover note must be at least 50 characters.','bad');return;}
      if(screeningQ&&!screeningAns){toast('Please answer the screening question.','bad');return;}
      submitBtn.disabled=true;submitBtn.textContent='Submitting...';

      // Deduct proposal for unverified users
      if(!isVerified){
        if(tracker.count<FREE_LIMIT){tracker.count++;saveProposalTracker(tracker);}
        else if(credits>0){ME.proposalCredits=credits-1;await saveUser(ME);}
      }
      // Save to user applications
      if(!ME.applications) ME.applications=[];
      var alreadySaved=ME.applications.find(function(a){return a.gigId===gid;});
      if(!alreadySaved){
        ME.applications.push({gigId:gid,title:title,posterUid:posterUid,status:'pending',appliedAt:Date.now(),cover:cover,timeline:timeline,rate:rate,pfId:pfId,screeningAns:screeningAns});
      }
      saveUser(ME);
      // Update gig
      var currentGig=getGigs().find(function(g){return g.id===gid;});
      if(currentGig){
        if(!currentGig.applicants) currentGig.applicants=[];
        currentGig.applicants.push(ME.uid);
        if(!currentGig.proposals) currentGig.proposals={};
        currentGig.proposals[ME.uid]={cover:cover,timeline:timeline,rate:rate,pfId:pfId,screeningAns:screeningAns,submittedAt:Date.now()};
        await fbSet('gigs',currentGig.id,currentGig);
      }
      // Message client
      var appMsg='👋 Hi! I\'d like to apply for: '+title+'\n\n'+cover;
      if(timeline) appMsg+='\n\n📅 Proposed timeline: '+timeline;
      if(rate) appMsg+='\n💰 Proposed rate: $'+rate;
      appMsg+='\n\n🏷 SkillID: '+(ME.skillId||'Pending Verification')+' · '+(isVerified?'✓ Verified':'Unverified');
      sendAutoMsg(posterUid,appMsg);
      pushNotif(posterUid,'gig_application','💼 New Proposal',ME.name+' submitted a proposal for: '+title+'. Tap to review.',{type:'gig_application',gigId:gid,applicantUid:ME.uid});

      closeModal();
      var leftover=isVerified?null:(FREE_LIMIT-tracker.count+(ME.proposalCredits||0));
      var mhtml='<div style="text-align:center;padding:16px 0 8px;">';
      mhtml+='<div class="success-icon" style="width:64px;height:64px;border-radius:50%;background:linear-gradient(135deg,rgba(74,222,128,.2),rgba(74,222,128,.06));border:2px solid rgba(74,222,128,.35);display:flex;align-items:center;justify-content:center;margin:0 auto 14px;font-size:28px;">✓</div>';
      mhtml+='<div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:800;font-size:18px;letter-spacing:-.03em;margin-bottom:6px;color:var(--tx);">Proposal Sent!</div>';
      mhtml+='<div style="font-size:12px;color:var(--td);line-height:1.6;margin-bottom:16px;">Your cover note has been delivered to the client. They will review and respond.</div>';
      mhtml+='</div>';
      if(!isVerified) mhtml+='<div style="background:rgba(255,107,53,.06);border:1px solid rgba(255,107,53,.2);border-radius:8px;padding:10px;font-size:11px;color:var(--acc);margin:10px 0;"><strong>'+(leftover>0?leftover:'0')+' proposals</strong> left this month. <span onclick="closeModal();openSubmitSkill();" style="color:var(--gld);cursor:pointer;text-decoration:underline;">Get verified</span> for unlimited.</div>';
      mhtml+='<div style="background:rgba(74,222,128,.06);border:1px solid rgba(74,222,128,.15);border-radius:8px;padding:10px;font-size:11px;color:var(--td);margin:10px 0;">Track this in <strong>Gigs → My Applications</strong></div>';
      mhtml+='<button class="btn" style="margin-top:14px;" onclick="closeModal();showPage(\'gigs\');switchGigTab(\'myapps\');">View My Applications →</button>';
      setModal(mhtml);
    };
  },80);
};

window.msgUser=function(el){openMsg(el.dataset.uid);};
window.endorseUser=function(el){openEndorse(el.dataset.uid);};
window.goWallet=function(){showPage('wallet');};
window.goTimeline=function(){showPage('timeline');};
window.deleteGig=function(gid){
  if(!confirm('Delete this gig?'))return;
  (async()=>{
  await fbDelete('gigs', gid);
  CACHE.gigs=CACHE.gigs.filter(g=>g.id!==gid);
  closeModal(); toast('Gig deleted.');
  renderGigs();
})();
};

