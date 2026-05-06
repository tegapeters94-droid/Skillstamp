// SkillStamp — Portfolio Wizard (Case Study System)
// Replaces openAddPortfolio() — all other portfolio functions in 06-app-shell.js unchanged.
// New data shape is backward-compatible (title/cat/image/desc/link preserved).

(function() {
'use strict';

// ── Wizard state ────────────────────────────────────────────────────────────
var _PW = {
  step: 1,
  totalSteps: 5,
  images: [],      // [{dataUrl, file}]
  form: {}         // accumulated field values
};

// ── Helper: compress image to dataUrl ───────────────────────────────────────
function _compressImg(file, maxPx, quality, cb) {
  var reader = new FileReader();
  reader.onload = function(e) {
    var img = new Image();
    img.onload = function() {
      var w = img.width, h = img.height;
      if (w > maxPx) { h = Math.round(h * maxPx / w); w = maxPx; }
      if (h > maxPx) { w = Math.round(w * maxPx / h); h = maxPx; }
      var c = document.createElement('canvas');
      c.width = w; c.height = h;
      c.getContext('2d').drawImage(img, 0, 0, w, h);
      cb(c.toDataURL('image/jpeg', quality));
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

// ── Helper: svg icon ────────────────────────────────────────────────────────
function _ico(paths, size) {
  size = size || 16;
  return '<svg width="'+size+'" height="'+size+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'+paths+'</svg>';
}
var ICO = {
  img:  _ico('<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>'),
  info: _ico('<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>'),
  doc:  _ico('<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>'),
  star: _ico('<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>'),
  eye:  _ico('<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>'),
  plus: _ico('<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>'),
  x:    _ico('<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>'),
  chk:  _ico('<polyline points="20 6 9 17 4 12"/>'),
  arr:  _ico('<line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>'),
  back: _ico('<line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>'),
  quote:_ico('<path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 2v8c0 6 3 7 5 8m0 0h2m-2 0c0 1.5-.5 2-2 2m12-10c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 2v8c0 6 3 7 5 8m0 0h2m-2 0c0 1.5-.5 2-2 2"/>'),
  tool: _ico('<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>'),
  time: _ico('<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>'),
};

// ── CSS injected once ────────────────────────────────────────────────────────
function _injectCSS() {
  if (document.getElementById('pw-styles')) return;
  var style = document.createElement('style');
  style.id = 'pw-styles';
  style.textContent = `
/* ── Portfolio Wizard ── */
#pw-panel {
  position: fixed; inset: 0; z-index: 3000;
  background: var(--bg); overflow-y: auto;
  animation: pwSlideIn .28s cubic-bezier(.22,.68,0,1.2);
  font-family: 'DM Sans', 'Plus Jakarta Sans', sans-serif;
}
@keyframes pwSlideIn {
  from { opacity:0; transform:translateX(100%) scale(.98); }
  to   { opacity:1; transform:translateX(0) scale(1); }
}

/* Header */
.pw-header {
  position: sticky; top:0; z-index:10;
  background: var(--s); border-bottom: 1px solid var(--br);
  padding: 13px 16px;
  display: flex; align-items: center; gap: 12px;
}
.pw-back-btn {
  background: none; border: none; color: var(--tx);
  cursor: pointer; padding: 0 4px; line-height:1;
  display:flex; align-items:center;
}
.pw-header-title {
  font-family: 'Syne', 'Plus Jakarta Sans', sans-serif;
  font-weight: 800; font-size: 17px; flex:1;
}
.pw-step-counter {
  font-size: 11px; color: var(--td);
  font-weight: 600; white-space:nowrap;
}

/* Progress bar */
.pw-progress {
  height: 3px; background: var(--s2);
  position: relative; overflow:hidden;
}
.pw-progress-fill {
  height: 100%; background: var(--gld);
  transition: width .4s cubic-bezier(.22,.68,0,1.2);
}

/* Step indicators */
.pw-steps-row {
  display: flex; padding: 12px 16px; gap: 6px;
  background: var(--s); border-bottom: 1px solid var(--br);
}
.pw-step-dot {
  flex:1; display:flex; flex-direction:column;
  align-items:center; gap:4px;
}
.pw-step-dot-circle {
  width: 28px; height: 28px; border-radius: 50%;
  display:flex; align-items:center; justify-content:center;
  font-size: 12px; font-weight: 700;
  transition: all .25s;
}
.pw-step-dot-circle.done   { background: rgba(74,222,128,.15); border: 1.5px solid #4ade80; color: #4ade80; }
.pw-step-dot-circle.active { background: var(--gld); border: 1.5px solid var(--gld); color: #000; }
.pw-step-dot-circle.idle   { background: var(--s2); border: 1.5px solid var(--br); color: var(--td); }
.pw-step-dot-label {
  font-size: 8px; color: var(--td); font-weight: 600;
  text-align: center; letter-spacing:.02em; text-transform:uppercase;
  line-height:1.2;
}
.pw-step-dot-label.active { color: var(--gld); }
.pw-step-dot-label.done   { color: #4ade80; }

/* Body */
.pw-body { padding: 20px 16px 100px; max-width: 600px; margin: 0 auto; }

/* Section headers */
.pw-sec-title {
  font-family: 'Syne', 'Plus Jakarta Sans', sans-serif;
  font-weight: 800; font-size: 20px; margin-bottom: 4px; color: var(--tx);
}
.pw-sec-sub {
  font-size: 13px; color: var(--td); margin-bottom: 20px; line-height:1.6;
}

/* Form fields */
.pw-fg { margin-bottom: 18px; }
.pw-label {
  display:block; font-size: 13px; font-weight: 700;
  color: var(--tx); margin-bottom: 6px; letter-spacing:.01em;
}
.pw-hint {
  font-size: 11px; color: var(--td); margin-top: 5px; line-height:1.5;
}
.pw-input {
  width: 100%; box-sizing: border-box;
  background: var(--s); border: 1.5px solid var(--br);
  border-radius: 10px; padding: 12px 14px;
  font-size: 15px; color: var(--tx);
  font-family: inherit; outline: none;
  transition: border-color .15s, box-shadow .15s;
  -webkit-appearance: none;
}
.pw-input:focus {
  border-color: var(--gld);
  box-shadow: 0 0 0 3px rgba(232,197,71,.12);
}
.pw-input::placeholder { color: var(--td); }
.pw-textarea { resize: vertical; min-height: 80px; line-height:1.6; }
.pw-select { cursor: pointer; }

/* Character counter */
.pw-char-row { display:flex; justify-content:space-between; align-items:center; }
.pw-char { font-size:10px; color:var(--td); }

/* Results callout */
.pw-callout {
  background: rgba(232,197,71,.06); border: 1px solid rgba(232,197,71,.2);
  border-radius: 10px; padding: 12px 14px; margin-bottom: 16px;
  display:flex; gap:10px; align-items:flex-start;
}
.pw-callout-ico { font-size:16px; flex-shrink:0; }
.pw-callout-text { font-size:12px; color:var(--td); line-height:1.6; }
.pw-callout-text strong { color: var(--gld); }

/* Multi-image upload */
.pw-drop-zone {
  border: 2px dashed var(--br); border-radius: 12px;
  padding: 28px 16px; text-align:center; cursor:pointer;
  transition: border-color .2s, background .2s;
  background: var(--s2);
}
.pw-drop-zone:hover, .pw-drop-zone.drag-over {
  border-color: var(--gld); background: rgba(232,197,71,.04);
}
.pw-drop-ico { font-size: 28px; margin-bottom: 8px; }
.pw-drop-title { font-size: 14px; font-weight:700; color:var(--tx); margin-bottom:3px; }
.pw-drop-sub   { font-size: 11px; color: var(--td); }

/* Image preview strip */
.pw-img-strip {
  display:flex; gap:8px; overflow-x:auto; padding: 8px 0 4px;
  -webkit-overflow-scrolling:touch;
}
.pw-img-strip::-webkit-scrollbar { height: 3px; }
.pw-img-strip::-webkit-scrollbar-thumb { background: var(--br); border-radius:2px; }
.pw-img-thumb {
  position:relative; flex-shrink:0;
  width:90px; height:80px; border-radius:8px; overflow:hidden;
  border: 2px solid transparent; cursor:pointer;
  transition: border-color .15s;
}
.pw-img-thumb.cover { border-color: var(--gld); }
.pw-img-thumb img { width:100%; height:100%; object-fit:cover; display:block; }
.pw-img-thumb-del {
  position:absolute; top:3px; right:3px;
  background: rgba(0,0,0,.7); border:none; border-radius:50%;
  width:18px; height:18px; display:flex; align-items:center; justify-content:center;
  cursor:pointer; color:#fff; line-height:1;
}
.pw-img-cover-badge {
  position:absolute; bottom:3px; left:3px;
  background: var(--gld); color:#000; font-size:7px; font-weight:800;
  padding:1px 5px; border-radius:4px; letter-spacing:.04em;
}
.pw-img-count { font-size:11px; color:var(--td); margin-top:6px; }

/* Skills multi-select */
.pw-skill-grid { display:flex; flex-wrap:wrap; gap:7px; }
.pw-skill-chip {
  padding:7px 13px; border-radius:20px; font-size:12px; font-weight:600;
  border: 1.5px solid var(--br); background: var(--s2); color: var(--td);
  cursor:pointer; transition: all .15s; user-select:none;
}
.pw-skill-chip.selected {
  border-color: var(--gld); background: rgba(232,197,71,.1); color: var(--gld);
}

/* Project type pills */
.pw-type-row { display:flex; gap:8px; flex-wrap:wrap; }
.pw-type-pill {
  flex:1; min-width:90px; padding:11px 10px; border-radius:10px;
  border: 1.5px solid var(--br); background: var(--s2);
  text-align:center; cursor:pointer; transition: all .15s;
}
.pw-type-pill.selected {
  border-color: var(--gld); background: rgba(232,197,71,.08);
}
.pw-type-pill-ico { font-size:18px; margin-bottom:4px; }
.pw-type-pill-lbl { font-size:11px; font-weight:700; color:var(--tx); }
.pw-type-pill.selected .pw-type-pill-lbl { color: var(--gld); }

/* Duration pills */
.pw-dur-row { display:flex; gap:6px; flex-wrap:wrap; }
.pw-dur-pill {
  padding:8px 13px; border-radius:20px; font-size:12px; font-weight:600;
  border: 1.5px solid var(--br); background: var(--s2); color: var(--td);
  cursor:pointer; transition: all .15s;
}
.pw-dur-pill.selected {
  border-color: var(--gld); background: rgba(232,197,71,.1); color: var(--gld);
}

/* Preview card */
.pw-preview-card {
  background: var(--s); border: 1px solid var(--br);
  border-radius: 14px; overflow:hidden;
}
.pw-preview-gallery {
  width:100%; height:200px; background:var(--s2);
  position:relative; overflow:hidden;
}
.pw-preview-gallery img { width:100%; height:100%; object-fit:cover; display:block; }
.pw-preview-gallery-placeholder {
  width:100%; height:100%; display:flex; align-items:center;
  justify-content:center; font-size:40px; color:var(--td);
}
.pw-preview-gallery-dots {
  position:absolute; bottom:8px; left:50%; transform:translateX(-50%);
  display:flex; gap:4px;
}
.pw-preview-gallery-dot {
  width:5px; height:5px; border-radius:50%; background:rgba(255,255,255,.4);
  cursor:pointer; transition:background .15s;
}
.pw-preview-gallery-dot.active { background:#fff; }
.pw-preview-body { padding:16px; }
.pw-preview-title { font-family:'Syne','Plus Jakarta Sans',sans-serif; font-weight:800; font-size:18px; margin-bottom:6px; }
.pw-preview-meta { display:flex; gap:8px; align-items:center; margin-bottom:14px; flex-wrap:wrap; }
.pw-preview-tag { background:var(--s2); border:1px solid var(--br); border-radius:20px; padding:3px 10px; font-size:11px; color:var(--td); font-weight:600; }
.pw-preview-type-tag { background:rgba(232,197,71,.1); border:1px solid rgba(232,197,71,.25); border-radius:20px; padding:3px 10px; font-size:11px; color:var(--gld); font-weight:700; }
.pw-preview-section { margin-bottom:14px; }
.pw-preview-sec-label { font-size:10px; font-weight:800; color:var(--gld); text-transform:uppercase; letter-spacing:.08em; margin-bottom:5px; }
.pw-preview-sec-text { font-size:13px; color:var(--tx); line-height:1.7; }
.pw-preview-skills { display:flex; flex-wrap:wrap; gap:6px; }
.pw-preview-skill { background:var(--s2); border:1px solid var(--br); border-radius:6px; padding:3px 9px; font-size:11px; color:var(--td); }
.pw-preview-testimonial {
  background: rgba(232,197,71,.04); border-left:3px solid var(--gld);
  padding:10px 14px; border-radius:0 8px 8px 0; font-size:13px;
  color:var(--td); line-height:1.7; font-style:italic; margin-top:10px;
}

/* CTA footer */
.pw-footer {
  position: fixed; bottom:0; left:0; right:0;
  background: var(--s); border-top: 1px solid var(--br);
  padding: 12px 16px; display:flex; gap:10px; z-index:10;
  max-width:600px; margin:0 auto;
}
.pw-btn-next {
  flex:1; background:var(--gld); border:none; border-radius:10px;
  padding:14px; font-family:'Plus Jakarta Sans',sans-serif;
  font-weight:800; font-size:15px; color:#000; cursor:pointer;
  display:flex; align-items:center; justify-content:center; gap:8px;
  transition:opacity .15s, transform .1s;
}
.pw-btn-next:active { transform:scale(.97); }
.pw-btn-next:disabled { opacity:.4; cursor:not-allowed; }
.pw-btn-prev {
  background:var(--s2); border:1.5px solid var(--br); border-radius:10px;
  padding:14px 16px; cursor:pointer; color:var(--tx);
  display:flex; align-items:center; justify-content:center;
  transition:background .15s;
}
.pw-btn-prev:hover { background:var(--s3); }
.pw-btn-publish {
  flex:1; background:var(--gld); border:none; border-radius:10px;
  padding:14px; font-family:'Plus Jakarta Sans',sans-serif;
  font-weight:800; font-size:15px; color:#000; cursor:pointer;
  display:flex; align-items:center; justify-content:center; gap:8px;
  transition: all .2s;
}
.pw-btn-publish:hover { transform:translateY(-1px); box-shadow:0 6px 20px rgba(232,197,71,.3); }
.pw-btn-publish:disabled { opacity:.4; cursor:not-allowed; }

/* Confidential toggle */
.pw-toggle-row {
  display:flex; align-items:center; justify-content:space-between;
  background:var(--s2); border:1.5px solid var(--br); border-radius:10px;
  padding:12px 14px;
}
.pw-toggle-label { font-size:13px; font-weight:600; color:var(--tx); }
.pw-toggle-sub { font-size:11px; color:var(--td); margin-top:2px; }
.pw-toggle-switch {
  width:42px; height:24px; background:var(--br); border-radius:12px;
  cursor:pointer; position:relative; transition:background .2s; flex-shrink:0;
}
.pw-toggle-switch.on { background:var(--gld); }
.pw-toggle-switch::after {
  content:''; position:absolute; top:3px; left:3px;
  width:18px; height:18px; border-radius:50%; background:#fff;
  transition:transform .2s; box-shadow:0 1px 3px rgba(0,0,0,.3);
}
.pw-toggle-switch.on::after { transform:translateX(18px); }

/* Divider between detail sections */
.pw-divider { border:none; border-top:1px solid var(--br); margin:18px 0; }

/* Tools input tag area */
.pw-tags-wrap {
  background:var(--s); border:1.5px solid var(--br); border-radius:10px;
  padding:8px 10px; min-height:48px;
  display:flex; flex-wrap:wrap; gap:6px; align-items:center;
  cursor:text; transition:border-color .15s;
}
.pw-tags-wrap:focus-within { border-color:var(--gld); box-shadow:0 0 0 3px rgba(232,197,71,.12); }
.pw-tag-chip {
  background:rgba(232,197,71,.1); border:1px solid rgba(232,197,71,.25);
  color:var(--gld); border-radius:6px; padding:3px 8px 3px 10px;
  font-size:12px; font-weight:700; display:flex; align-items:center; gap:5px;
}
.pw-tag-chip button { background:none; border:none; cursor:pointer; color:var(--gld); padding:0; line-height:1; font-size:12px; }
.pw-tags-input { background:none; border:none; outline:none; font-size:14px; color:var(--tx); font-family:inherit; min-width:80px; flex:1; padding:3px 4px; }
`;
  document.head.appendChild(style);
}

// ── Render the wizard panel ─────────────────────────────────────────────────
function _render() {
  var el = document.getElementById('pw-panel');
  if (!el) return;

  var pct = Math.round((_PW.step / _PW.totalSteps) * 100);
  var stepNames = ['Media','Info','Details','Proof','Preview'];
  var stepIcos  = [ICO.img, ICO.info, ICO.doc, ICO.star, ICO.eye];

  // Header
  var stepsHtml = stepNames.map(function(nm, i) {
    var s   = i + 1;
    var cls = s < _PW.step ? 'done' : (s === _PW.step ? 'active' : 'idle');
    var inner = s < _PW.step ? ICO.chk : String(s);
    return '<div class="pw-step-dot">'
      + '<div class="pw-step-dot-circle '+cls+'">'+inner+'</div>'
      + '<div class="pw-step-dot-label '+cls+'">'+nm+'</div>'
      + '</div>';
  }).join('');

  var html = ''
    + '<div class="pw-header">'
    +   '<button class="pw-back-btn" id="pw-back-hdr">'
    +     (_PW.step > 1 ? ICO.back : ICO.x)
    +   '</button>'
    +   '<div class="pw-header-title">Add Portfolio</div>'
    +   '<div class="pw-step-counter">'+_PW.step+' / '+_PW.totalSteps+'</div>'
    + '</div>'
    + '<div class="pw-progress"><div class="pw-progress-fill" style="width:'+pct+'%"></div></div>'
    + '<div class="pw-steps-row">'+stepsHtml+'</div>'
    + '<div class="pw-body" id="pw-body">'
    + _renderStep(_PW.step)
    + '</div>'
    + _renderFooter();

  el.innerHTML = html;
  _bindStep(_PW.step);

  // Back / close
  var backBtn = document.getElementById('pw-back-hdr');
  if (backBtn) backBtn.onclick = function() {
    if (_PW.step > 1) { _PW.step--; _render(); }
    else              { _close(); }
  };
}

// ── Render step body ────────────────────────────────────────────────────────
function _renderStep(step) {
  if (step === 1) return _renderStep1();
  if (step === 2) return _renderStep2();
  if (step === 3) return _renderStep3();
  if (step === 4) return _renderStep4();
  if (step === 5) return _renderStep5();
  return '';
}

// STEP 1 — Media
function _renderStep1() {
  var imgs = _PW.images;
  var stripHtml = '';
  if (imgs.length) {
    stripHtml = '<div class="pw-img-strip" id="pw-img-strip">';
    imgs.forEach(function(img, i) {
      stripHtml += '<div class="pw-img-thumb'+(i===0?' cover':'')+'" data-idx="'+i+'">'
        + '<img src="'+img.dataUrl+'">'
        + (i===0 ? '<div class="pw-img-cover-badge">COVER</div>' : '')
        + '<button class="pw-img-thumb-del" data-del="'+i+'">'+ICO.x+'</button>'
        + '</div>';
    });
    stripHtml += '</div>';
    stripHtml += '<div class="pw-img-count">'+imgs.length+' / 7 images · First image is cover</div>';
  }
  var canAdd = imgs.length < 7;
  return '<div class="pw-sec-title">Project Media</div>'
    + '<div class="pw-sec-sub">Upload 1–7 images. The first image becomes the cover shown on your profile.</div>'
    + (canAdd ? '<label for="pw-file-input">'
        + '<div class="pw-drop-zone" id="pw-drop-zone">'
        + '<div class="pw-drop-ico">'+ICO.img+'</div>'
        + '<div class="pw-drop-title">Tap to add images</div>'
        + '<div class="pw-drop-sub">JPG or PNG · Max 7 images</div>'
        + '</div>'
        + '</label>'
        + '<input type="file" id="pw-file-input" accept="image/*" multiple style="display:none;">'
        : '<div style="font-size:12px;color:var(--gld);padding:10px 0;">Maximum 7 images reached.</div>')
    + stripHtml;
}

// STEP 2 — Basic Info
function _renderStep2() {
  var f = _PW.form;
  var catOptions = (typeof CATEGORIES !== 'undefined' ? CATEGORIES : ['Graphics Design','UI/UX Design','Content Writing','Data Analysis','Digital Marketing','Web & Mobile Dev'])
    .map(function(c) {
      return '<option value="'+c+'"'+(f.cat===c?' selected':'')+'>'+c+'</option>';
    }).join('');

  var typeHtml = [
    {v:'Client Work',  ico:'💼', lbl:'Client Work'},
    {v:'Personal',     ico:'🧑‍💻', lbl:'Personal Project'},
    {v:'Company Work', ico:'🏢', lbl:'Company Work'}
  ].map(function(t) {
    return '<div class="pw-type-pill'+(f.projectType===t.v?' selected':'')+'" data-type="'+t.v+'">'
      + '<div class="pw-type-pill-ico">'+t.ico+'</div>'
      + '<div class="pw-type-pill-lbl">'+t.lbl+'</div>'
      + '</div>';
  }).join('');

  return '<div class="pw-sec-title">Basic Info</div>'
    + '<div class="pw-sec-sub">Give your case study a clear, searchable title.</div>'
    + '<div class="pw-fg">'
    +   '<label class="pw-label">Project Title <span style="color:var(--acc);">*</span></label>'
    +   '<input class="pw-input" id="pw-title" placeholder="e.g. Brand Identity for TechCorp Lagos" maxlength="80" value="'+(f.title||'')+'">'
    +   '<div class="pw-char-row"><div class="pw-hint">Make it specific — clients search by project name.</div><div class="pw-char" id="pw-title-count">'+(f.title?f.title.length:0)+'/80</div></div>'
    + '</div>'
    + '<div class="pw-fg">'
    +   '<label class="pw-label">Category</label>'
    +   '<select class="pw-input pw-select" id="pw-cat">'
    +   catOptions
    +   '</select>'
    + '</div>'
    + '<div class="pw-fg">'
    +   '<label class="pw-label">Project Type</label>'
    +   '<div class="pw-type-row" id="pw-type-row">'+typeHtml+'</div>'
    + '</div>'
    + '<div class="pw-fg">'
    +   '<div class="pw-toggle-row">'
    +     '<div><div class="pw-toggle-label">Confidential Client</div><div class="pw-toggle-sub">Hides the client name</div></div>'
    +     '<div class="pw-toggle-switch'+(f.confidential?' on':'')+'" id="pw-conf-toggle"></div>'
    +   '</div>'
    + '</div>'
    + '<div class="pw-fg" id="pw-client-fg" style="'+(f.confidential?'display:none;':'')+'">'
    +   '<label class="pw-label">Client / Brand Name <span style="font-size:10px;color:var(--td);font-weight:400;">(optional)</span></label>'
    +   '<input class="pw-input" id="pw-client" placeholder="e.g. Google, StartupXYZ, Confidential" value="'+(f.clientName||'')+'">'
    + '</div>'
    + '<div class="pw-fg">'
    +   '<label class="pw-label">Project URL <span style="font-size:10px;color:var(--td);font-weight:400;">(optional)</span></label>'
    +   '<input class="pw-input" id="pw-link" placeholder="https://..." type="url" value="'+(f.link||'')+'">'
    + '</div>';
}

// STEP 3 — Project Details
function _renderStep3() {
  var f = _PW.form;
  return '<div class="pw-sec-title">Project Details</div>'
    + '<div class="pw-sec-sub">Break down the story of this project. Structured projects get hired 3× more often.</div>'
    + '<div class="pw-fg">'
    +   '<label class="pw-label">Project Overview <span style="color:var(--acc);">*</span></label>'
    +   '<textarea class="pw-input pw-textarea" id="pw-overview" placeholder="1–3 sentences: what was this project about?" rows="3" maxlength="300">'+(f.overview||'')+'</textarea>'
    +   '<div class="pw-char-row"><div class="pw-hint">Your elevator pitch for this project.</div><div class="pw-char" id="pw-ov-count">'+(f.overview?f.overview.length:0)+'/300</div></div>'
    + '</div>'
    + '<hr class="pw-divider">'
    + '<div class="pw-fg">'
    +   '<label class="pw-label">Problem / Goal</label>'
    +   '<textarea class="pw-input pw-textarea" id="pw-problem" placeholder="What challenge did the client face? What did they need?" rows="3" maxlength="300">'+(f.problem||'')+'</textarea>'
    +   '<div class="pw-hint">Context helps clients understand your relevance to their own needs.</div>'
    + '</div>'
    + '<hr class="pw-divider">'
    + '<div class="pw-fg">'
    +   '<label class="pw-label">Your Solution</label>'
    +   '<textarea class="pw-input pw-textarea" id="pw-solution" placeholder="What specifically did you do? What was your approach?" rows="3" maxlength="400">'+(f.solution||'')+'</textarea>'
    +   '<div class="pw-hint">Be specific — avoid generic descriptions like "I designed a logo."</div>'
    + '</div>'
    + '<hr class="pw-divider">'
    + '<div class="pw-fg">'
    +   '<div class="pw-callout">'
    +     '<div class="pw-callout-ico">📈</div>'
    +     '<div class="pw-callout-text"><strong>Results matter most.</strong> Projects with measurable outcomes are 3× more likely to attract clients. Include numbers: "increased conversions by 40%", "delivered in 5 days", "client saved $2K/month".</div>'
    +   '</div>'
    +   '<label class="pw-label">Results Achieved</label>'
    +   '<textarea class="pw-input pw-textarea" id="pw-results" placeholder="What was the outcome? Include numbers if possible." rows="3" maxlength="400">'+(f.results||'')+'</textarea>'
    + '</div>';
}

// STEP 4 — Proof & Skills
function _renderStep4() {
  var f = _PW.form;
  var selectedSkills = f.skills || [];
  var cat = f.cat || (typeof CATEGORIES !== 'undefined' ? CATEGORIES[0] : 'Graphics Design');
  var allSkills = (typeof SKILLS_BY_CAT !== 'undefined' && SKILLS_BY_CAT[cat])
    ? SKILLS_BY_CAT[cat]
    : ['Design','Development','Writing','Marketing','Research'];
  // Also add cross-category common skills
  var extraSkills = ['Communication','Project Management','Client Relations','Problem Solving'];
  var skillPool = allSkills.concat(extraSkills.filter(function(s) { return allSkills.indexOf(s) < 0; }));

  var skillsHtml = skillPool.map(function(s) {
    return '<div class="pw-skill-chip'+(selectedSkills.indexOf(s)>=0?' selected':'')+'" data-skill="'+s+'">'+s+'</div>';
  }).join('');

  var durOptions = ['1 day','2–3 days','1 week','2 weeks','1 month','2–3 months','3+ months'];
  var durHtml = durOptions.map(function(d) {
    return '<div class="pw-dur-pill'+(f.duration===d?' selected':'')+'" data-dur="'+d+'">'+d+'</div>';
  }).join('');

  // Tools tags
  var toolTags = f.tools || [];
  var toolTagsHtml = toolTags.map(function(t) {
    return '<div class="pw-tag-chip">'+t+'<button data-deltool="'+t+'">×</button></div>';
  }).join('');

  return '<div class="pw-sec-title">Proof & Skills</div>'
    + '<div class="pw-sec-sub">Demonstrate your expertise with specifics. Clients look for tools and skills before hiring.</div>'
    + '<div class="pw-fg">'
    +   '<label class="pw-label">Skills Used</label>'
    +   '<div class="pw-skill-grid" id="pw-skill-grid">'+skillsHtml+'</div>'
    +   '<div class="pw-hint">Select all that apply.</div>'
    + '</div>'
    + '<hr class="pw-divider">'
    + '<div class="pw-fg">'
    +   '<label class="pw-label">Tools & Tech Stack</label>'
    +   '<div class="pw-tags-wrap" id="pw-tools-wrap">'+toolTagsHtml+'<input class="pw-tags-input" id="pw-tools-input" placeholder="Type a tool and press Enter…"></div>'
    +   '<div class="pw-hint">e.g. Figma, Photoshop, React, Webflow</div>'
    + '</div>'
    + '<hr class="pw-divider">'
    + '<div class="pw-fg">'
    +   '<label class="pw-label">Project Duration</label>'
    +   '<div class="pw-dur-row" id="pw-dur-row">'+durHtml+'</div>'
    + '</div>'
    + '<hr class="pw-divider">'
    + '<div class="pw-fg">'
    +   '<label class="pw-label" style="display:flex;align-items:center;gap:6px;">'+ICO.quote+' Client Testimonial <span style="font-size:10px;color:var(--td);font-weight:400;">(optional)</span></label>'
    +   '<textarea class="pw-input pw-textarea" id="pw-testimonial" placeholder="Paste what your client said about your work…" rows="3" maxlength="400">'+(f.testimonial||'')+'</textarea>'
    +   '<div class="pw-hint">Social proof builds instant trust with new clients.</div>'
    + '</div>';
}

// STEP 5 — Preview
function _renderStep5() {
  var f  = _PW.form;
  var imgs = _PW.images;

  var galleryHtml = '';
  if (imgs.length) {
    galleryHtml += '<img id="pw-prev-img" src="'+imgs[0].dataUrl+'">';
    if (imgs.length > 1) {
      galleryHtml += '<div class="pw-preview-gallery-dots">';
      imgs.forEach(function(_, i) {
        galleryHtml += '<div class="pw-preview-gallery-dot'+(i===0?' active':'')+'" data-galleri="'+i+'"></div>';
      });
      galleryHtml += '</div>';
    }
  } else {
    galleryHtml = '<div class="pw-preview-gallery-placeholder">'+ICO.img+'</div>';
  }

  var skills  = f.skills  || [];
  var tools   = f.tools   || [];
  var allTags = skills.concat(tools);

  var sectionsHtml = '';
  if (f.overview) sectionsHtml += '<div class="pw-preview-section"><div class="pw-preview-sec-label">Overview</div><div class="pw-preview-sec-text">'+f.overview+'</div></div>';
  if (f.problem)  sectionsHtml += '<div class="pw-preview-section"><div class="pw-preview-sec-label">Problem / Goal</div><div class="pw-preview-sec-text">'+f.problem+'</div></div>';
  if (f.solution) sectionsHtml += '<div class="pw-preview-section"><div class="pw-preview-sec-label">Solution</div><div class="pw-preview-sec-text">'+f.solution+'</div></div>';
  if (f.results)  sectionsHtml += '<div class="pw-preview-section"><div class="pw-preview-sec-label" style="color:#4ade80;">📈 Results</div><div class="pw-preview-sec-text">'+f.results+'</div></div>';

  var testHtml = f.testimonial
    ? '<div class="pw-preview-testimonial">"'+f.testimonial+'"</div>'
    : '';

  var tagsHtml = allTags.length
    ? '<div class="pw-preview-section"><div class="pw-preview-sec-label">Skills & Tools</div><div class="pw-preview-skills">'+allTags.map(function(t){return '<span class="pw-preview-skill">'+t+'</span>';}).join('')+'</div></div>'
    : '';

  var metaHtml = '';
  if (f.cat)         metaHtml += '<span class="pw-preview-tag">'+f.cat+'</span>';
  if (f.projectType) metaHtml += '<span class="pw-preview-type-tag">'+f.projectType+'</span>';
  if (f.duration)    metaHtml += '<span class="pw-preview-tag">'+ICO.time+' '+f.duration+'</span>';

  return '<div class="pw-sec-title">Preview & Publish</div>'
    + '<div class="pw-sec-sub">This is how your case study will appear on your profile.</div>'
    + '<div class="pw-preview-card">'
    +   '<div class="pw-preview-gallery">'+galleryHtml+'</div>'
    +   '<div class="pw-preview-body">'
    +     '<div class="pw-preview-title">'+(f.title||'Untitled Project')+'</div>'
    +     '<div class="pw-preview-meta">'+metaHtml+'</div>'
    +     sectionsHtml
    +     tagsHtml
    +     testHtml
    +   '</div>'
    + '</div>';
}

// ── Render footer ───────────────────────────────────────────────────────────
function _renderFooter() {
  if (_PW.step === 5) {
    return '<div class="pw-footer">'
      + '<button class="pw-btn-prev" id="pw-prev-btn">'+ICO.back+'</button>'
      + '<button class="pw-btn-publish" id="pw-publish-btn">Publish Portfolio</button>'
      + '</div>';
  }
  var label = _PW.step === 4 ? 'Preview' : 'Continue';
  var prevBtn = _PW.step > 1
    ? '<button class="pw-btn-prev" id="pw-prev-btn">'+ICO.back+'</button>'
    : '';
  return '<div class="pw-footer">'
    + prevBtn
    + '<button class="pw-btn-next" id="pw-next-btn">'+label+' '+ICO.arr+'</button>'
    + '</div>';
}

// ── Bind step-specific interactions ────────────────────────────────────────
function _bindStep(step) {
  // Common nav
  var prevBtn = document.getElementById('pw-prev-btn');
  if (prevBtn) prevBtn.onclick = function() { _collectStep(step); _PW.step--; _render(); };

  var nextBtn = document.getElementById('pw-next-btn');
  if (nextBtn) nextBtn.onclick = function() {
    if (!_validateStep(step)) return;
    _collectStep(step);
    _PW.step++;
    _render();
  };

  var pubBtn = document.getElementById('pw-publish-btn');
  if (pubBtn) pubBtn.onclick = _publish;

  if (step === 1) _bindStep1();
  if (step === 2) _bindStep2();
  if (step === 3) _bindStep3();
  if (step === 4) _bindStep4();
  if (step === 5) _bindStep5();
}

function _bindStep1() {
  var input = document.getElementById('pw-file-input');
  if (input) {
    input.onchange = function() {
      var files = Array.from(this.files);
      var remaining = 7 - _PW.images.length;
      files = files.slice(0, remaining);
      var done = 0;
      files.forEach(function(file) {
        _compressImg(file, 1200, 0.82, function(dataUrl) {
          _PW.images.push({ dataUrl: dataUrl });
          done++;
          if (done === files.length) _render();
        });
      });
      // Reset so same file can be added again
      this.value = '';
    };
  }

  // Drag and drop
  var zone = document.getElementById('pw-drop-zone');
  if (zone) {
    zone.ondragover = function(e) { e.preventDefault(); zone.classList.add('drag-over'); };
    zone.ondragleave = function() { zone.classList.remove('drag-over'); };
    zone.ondrop = function(e) {
      e.preventDefault(); zone.classList.remove('drag-over');
      var files = Array.from(e.dataTransfer.files).filter(function(f){ return f.type.startsWith('image/'); });
      var remaining = 7 - _PW.images.length;
      files = files.slice(0, remaining);
      var done = 0;
      if (!files.length) return;
      files.forEach(function(file) {
        _compressImg(file, 1200, 0.82, function(dataUrl) {
          _PW.images.push({ dataUrl: dataUrl });
          done++;
          if (done === files.length) _render();
        });
      });
    };
  }

  // Delete thumbs
  var strip = document.getElementById('pw-img-strip');
  if (strip) {
    strip.addEventListener('click', function(e) {
      var delBtn = e.target.closest('[data-del]');
      if (delBtn) {
        var idx = parseInt(delBtn.getAttribute('data-del'));
        _PW.images.splice(idx, 1);
        _render();
      }
    });
  }
}

function _bindStep2() {
  var titleEl = document.getElementById('pw-title');
  if (titleEl) {
    titleEl.oninput = function() {
      var cnt = document.getElementById('pw-title-count');
      if (cnt) cnt.textContent = this.value.length + '/80';
    };
  }

  var typeRow = document.getElementById('pw-type-row');
  if (typeRow) {
    typeRow.addEventListener('click', function(e) {
      var pill = e.target.closest('[data-type]');
      if (!pill) return;
      _PW.form.projectType = pill.getAttribute('data-type');
      typeRow.querySelectorAll('.pw-type-pill').forEach(function(p) {
        p.classList.toggle('selected', p === pill);
      });
    });
  }

  var confToggle = document.getElementById('pw-conf-toggle');
  if (confToggle) {
    confToggle.onclick = function() {
      _PW.form.confidential = !_PW.form.confidential;
      confToggle.classList.toggle('on', _PW.form.confidential);
      var clientFg = document.getElementById('pw-client-fg');
      if (clientFg) clientFg.style.display = _PW.form.confidential ? 'none' : '';
    };
  }
}

function _bindStep3() {
  var ovEl = document.getElementById('pw-overview');
  if (ovEl) {
    ovEl.oninput = function() {
      var cnt = document.getElementById('pw-ov-count');
      if (cnt) cnt.textContent = this.value.length + '/300';
    };
  }
}

function _bindStep4() {
  // Skills toggle
  var skillGrid = document.getElementById('pw-skill-grid');
  if (skillGrid) {
    skillGrid.addEventListener('click', function(e) {
      var chip = e.target.closest('[data-skill]');
      if (!chip) return;
      var skill = chip.getAttribute('data-skill');
      if (!_PW.form.skills) _PW.form.skills = [];
      var idx = _PW.form.skills.indexOf(skill);
      if (idx >= 0) _PW.form.skills.splice(idx, 1);
      else          _PW.form.skills.push(skill);
      chip.classList.toggle('selected', idx < 0);
    });
  }

  // Tools tag input
  var toolsInput = document.getElementById('pw-tools-input');
  var toolsWrap  = document.getElementById('pw-tools-wrap');
  if (toolsInput) {
    toolsInput.onkeydown = function(e) {
      if ((e.key === 'Enter' || e.key === ',') && this.value.trim()) {
        e.preventDefault();
        var val = this.value.trim().replace(/,/g,'');
        if (val && (!_PW.form.tools || _PW.form.tools.indexOf(val) < 0)) {
          if (!_PW.form.tools) _PW.form.tools = [];
          _PW.form.tools.push(val);
          // Re-render tags area
          var tagArea = toolsWrap;
          // Insert chip before input
          var chip = document.createElement('div');
          chip.className = 'pw-tag-chip';
          chip.innerHTML = val + '<button data-deltool="'+val+'">×</button>';
          tagArea.insertBefore(chip, toolsInput);
          this.value = '';
        }
      } else if (e.key === 'Backspace' && !this.value && _PW.form.tools && _PW.form.tools.length) {
        _PW.form.tools.pop();
        var chips = toolsWrap.querySelectorAll('.pw-tag-chip');
        if (chips.length) chips[chips.length-1].remove();
      }
    };
  }
  if (toolsWrap) {
    toolsWrap.addEventListener('click', function(e) {
      var delBtn = e.target.closest('[data-deltool]');
      if (delBtn) {
        var tool = delBtn.getAttribute('data-deltool');
        if (_PW.form.tools) {
          var idx = _PW.form.tools.indexOf(tool);
          if (idx >= 0) _PW.form.tools.splice(idx, 1);
        }
        delBtn.closest('.pw-tag-chip').remove();
      }
      // Focus input on wrap click
      if (toolsInput) toolsInput.focus();
    });
  }

  // Duration pills
  var durRow = document.getElementById('pw-dur-row');
  if (durRow) {
    durRow.addEventListener('click', function(e) {
      var pill = e.target.closest('[data-dur]');
      if (!pill) return;
      _PW.form.duration = pill.getAttribute('data-dur');
      durRow.querySelectorAll('.pw-dur-pill').forEach(function(p) {
        p.classList.toggle('selected', p === pill);
      });
    });
  }
}

function _bindStep5() {
  // Gallery dot navigation
  var panel = document.getElementById('pw-panel');
  if (!panel) return;
  panel.addEventListener('click', function(e) {
    var dot = e.target.closest('[data-galleri]');
    if (!dot) return;
    var idx = parseInt(dot.getAttribute('data-galleri'));
    var previewImg = document.getElementById('pw-prev-img');
    if (previewImg && _PW.images[idx]) previewImg.src = _PW.images[idx].dataUrl;
    panel.querySelectorAll('.pw-preview-gallery-dot').forEach(function(d, i) {
      d.classList.toggle('active', i === idx);
    });
  });
}

// ── Collect data from DOM into _PW.form ────────────────────────────────────
function _collectStep(step) {
  if (step === 2) {
    var t = document.getElementById('pw-title');
    var c = document.getElementById('pw-cat');
    var l = document.getElementById('pw-link');
    var cl = document.getElementById('pw-client');
    if (t) _PW.form.title       = t.value.trim();
    if (c) _PW.form.cat         = c.value;
    if (l) _PW.form.link        = l.value.trim();
    if (cl) _PW.form.clientName = cl.value.trim();
  }
  if (step === 3) {
    var ov  = document.getElementById('pw-overview');
    var pr  = document.getElementById('pw-problem');
    var sol = document.getElementById('pw-solution');
    var res = document.getElementById('pw-results');
    if (ov)  _PW.form.overview  = ov.value.trim();
    if (pr)  _PW.form.problem   = pr.value.trim();
    if (sol) _PW.form.solution  = sol.value.trim();
    if (res) _PW.form.results   = res.value.trim();
  }
  if (step === 4) {
    var test = document.getElementById('pw-testimonial');
    if (test) _PW.form.testimonial = test.value.trim();
    // tools input - flush any pending value
    var ti = document.getElementById('pw-tools-input');
    if (ti && ti.value.trim()) {
      var val = ti.value.trim();
      if (!_PW.form.tools) _PW.form.tools = [];
      if (_PW.form.tools.indexOf(val) < 0) _PW.form.tools.push(val);
      ti.value = '';
    }
  }
}

// ── Validate step before proceeding ────────────────────────────────────────
function _validateStep(step) {
  if (step === 1) {
    if (!_PW.images.length) {
      toast('Please add at least one image.', 'bad'); return false;
    }
  }
  if (step === 2) {
    _collectStep(2);
    if (!(_PW.form.title || '').trim()) {
      toast('Please add a project title.', 'bad'); return false;
    }
  }
  if (step === 3) {
    _collectStep(3);
    if (!(_PW.form.overview || '').trim()) {
      toast('Please add a project overview.', 'bad'); return false;
    }
  }
  return true;
}

// ── Publish ─────────────────────────────────────────────────────────────────
function _publish() {
  var pubBtn = document.getElementById('pw-publish-btn');
  if (pubBtn) { pubBtn.disabled = true; pubBtn.textContent = 'Publishing…'; }

  var f = _PW.form;
  var imgs = _PW.images;

  // Build data shape — superset of old shape (title/cat/image/desc/link preserved)
  var item = {
    id:          'pf' + Date.now(),
    title:       f.title || 'Untitled Project',
    cat:         f.cat   || 'Graphics Design',
    // ── Legacy fields (kept for backward compat with buildPortfolio + openPortfolioItem)
    image:       imgs.length ? imgs[0].dataUrl : null,
    images:      imgs.map(function(i) { return i.dataUrl; }),
    desc:        [f.overview, f.problem, f.solution, f.results].filter(Boolean).join('\n\n'),
    link:        f.link || null,
    // ── New case study fields
    projectType: f.projectType || null,
    clientName:  f.confidential ? 'Confidential' : (f.clientName || null),
    confidential:f.confidential || false,
    overview:    f.overview  || null,
    problem:     f.problem   || null,
    solution:    f.solution  || null,
    results:     f.results   || null,
    skills:      f.skills    || [],
    tools:       f.tools     || [],
    duration:    f.duration  || null,
    testimonial: f.testimonial || null,
    ts:          Date.now()
  };

  if (!ME.portfolio) ME.portfolio = [];
  ME.portfolio.unshift(item);

  saveUser(ME).then(function() {
    toast('Portfolio item published! 🎉');
    _close();
    renderMyProfile();
  }).catch(function() {
    toast('Save failed — please try again.', 'bad');
    if (pubBtn) { pubBtn.disabled = false; pubBtn.textContent = 'Publish Portfolio'; }
    // Rollback local
    ME.portfolio = ME.portfolio.filter(function(p) { return p.id !== item.id; });
  });
}

// ── Open / Close ─────────────────────────────────────────────────────────────
window.openAddPortfolio = function() {
  _injectCSS();
  _PW.step  = 1;
  _PW.images = [];
  _PW.form   = {};

  // Remove any stale panel
  var old = document.getElementById('pw-panel');
  if (old) old.remove();

  var panel = document.createElement('div');
  panel.id  = 'pw-panel';
  document.body.appendChild(panel);
  _render();
};

function _close() {
  var panel = document.getElementById('pw-panel');
  if (panel) panel.remove();
}

})();
