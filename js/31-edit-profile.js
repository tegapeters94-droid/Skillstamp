// SkillStamp — Edit Profile Wizard (Professional Identity Builder)
// Replaces openEditProfile() and saveProfile() — all other profile functions untouched.
// Fully backward-compatible: missing fields never crash. Safe partial saves.

(function () {
'use strict';

// ── Section definitions ────────────────────────────────────────────────────
var EP_SECTIONS = [
  { id: 'basic',        label: 'Basic Info',          icon: '👤' },
  { id: 'professional', label: 'Professional',         icon: '💼' },
  { id: 'skills',       label: 'Skills & Services',    icon: '⚡' },
  { id: 'links',        label: 'Links',                icon: '🔗' },
  { id: 'availability', label: 'Availability',         icon: '🟢' },
];

// Client-specific sections (no skills/availability/professional)
var EP_CLIENT_SECTIONS = [
  { id: 'basic',  label: 'Basic Info', icon: '👤' },
  { id: 'client', label: 'Business',   icon: '🏢' },
];

// ── Experience levels ──────────────────────────────────────────────────────
var EXP_LEVELS = [
  { v: 'entry',    label: 'Entry Level',    sub: '0–1 years',   col: '#60a5fa' },
  { v: 'mid',      label: 'Mid Level',      sub: '2–4 years',   col: '#4ade80' },
  { v: 'senior',   label: 'Senior',         sub: '5–8 years',   col: '#e8c547' },
  { v: 'expert',   label: 'Expert / Lead',  sub: '8+ years',    col: '#ff6b35' },
];

// ── Availability statuses ──────────────────────────────────────────────────
var AVAIL_STATUSES = [
  { v: 'available',  label: 'Available for Work',  sub: 'Actively looking for projects',  dot: '#4ade80' },
  { v: 'open',       label: 'Open to Offers',       sub: 'Not actively looking, but open',  dot: '#e8c547' },
  { v: 'busy',       label: 'Busy',                 sub: 'On a project, limited capacity',  dot: '#ff6b35' },
  { v: 'unavailable',label: 'Unavailable',          sub: 'Not accepting new work',           dot: '#ef4444' },
];

// ── Skills per category (from app constants) ───────────────────────────────
function _skillsForCat(cat) {
  var byCat = (typeof SKILLS_BY_CAT !== 'undefined') ? SKILLS_BY_CAT : {};
  return byCat[cat] || (typeof ALL_SKILLS !== 'undefined' ? ALL_SKILLS.slice(0,12) : []);
}

// ── SVG helper ─────────────────────────────────────────────────────────────
function _svg(paths, sz) {
  sz = sz || 16;
  return '<svg width="'+sz+'" height="'+sz+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'+paths+'</svg>';
}
var _ICO = {
  check: _svg('<polyline points="20 6 9 17 4 12"/>'),
  back:  _svg('<line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>'),
  save:  _svg('<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>'),
  link:  _svg('<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>'),
  user:  _svg('<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>'),
  search:_svg('<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>'),
  x:     _svg('<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>'),
};

// ── Inject CSS once ────────────────────────────────────────────────────────
function _injectCSS() {
  if (document.getElementById('ep-wizard-styles')) return;
  var s = document.createElement('style');
  s.id = 'ep-wizard-styles';
  s.textContent = `
/* ── Edit Profile Wizard ── */
#ep-panel {
  position: fixed; inset: 0; z-index: 3000;
  background: var(--bg); overflow-y: auto; overflow-x: hidden;
  animation: epSlideIn .28s cubic-bezier(.22,.68,0,1.2);
  font-family: 'DM Sans', 'Plus Jakarta Sans', sans-serif;
  -webkit-overflow-scrolling: touch;
}
@keyframes epSlideIn {
  from { opacity:0; transform:translateX(100%) scale(.98); }
  to   { opacity:1; transform:none; }
}

/* Sticky header */
.ep-header {
  position: sticky; top:0; z-index:20;
  background: var(--s); border-bottom: 1px solid var(--br);
  padding: 13px 16px;
  display: flex; align-items: center; gap: 12px;
}
.ep-header-title {
  font-family: 'Syne', 'Plus Jakarta Sans', sans-serif;
  font-weight: 800; font-size: 17px; flex:1; color: var(--tx);
}
.ep-back-btn {
  background: none; border: none; color: var(--tx);
  cursor: pointer; padding: 0 4px; line-height:1;
  display: flex; align-items: center;
}
.ep-save-pill {
  background: var(--gld); border: none; border-radius: 20px;
  padding: 7px 16px; font-family: 'Plus Jakarta Sans',sans-serif;
  font-weight: 800; font-size: 12px; color: #000; cursor: pointer;
  display: flex; align-items: center; gap: 5px;
  transition: opacity .15s, transform .1s; white-space: nowrap;
}
.ep-save-pill:active { transform: scale(.95); }
.ep-save-pill:disabled { opacity: .4; cursor: not-allowed; }

/* Completion bar */
.ep-comp-bar {
  padding: 10px 16px; background: var(--s);
  border-bottom: 1px solid var(--br);
  display: flex; align-items: center; gap: 10px;
}
.ep-comp-track {
  flex:1; height:4px; background:var(--s3); border-radius:2px; overflow:hidden;
}
.ep-comp-fill {
  height:100%; background: linear-gradient(90deg, var(--gld), #4ade80);
  border-radius:2px; transition: width .4s ease;
}
.ep-comp-label { font-size:11px; color:var(--td); font-weight:600; white-space:nowrap; }

/* Section nav tabs */
.ep-section-nav {
  display: flex; gap: 0; overflow-x: auto;
  background: var(--s); border-bottom: 1px solid var(--br);
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}
.ep-section-nav::-webkit-scrollbar { display:none; }
.ep-sec-tab {
  flex-shrink:0; padding: 10px 14px;
  font-size: 11px; font-weight: 700; color: var(--td);
  background: none; border: none; border-bottom: 2px solid transparent;
  cursor: pointer; transition: all .15s; white-space: nowrap;
  display: flex; align-items: center; gap: 5px;
}
.ep-sec-tab.active { color: var(--gld); border-bottom-color: var(--gld); }
.ep-sec-tab-done { color: #4ade80 !important; }

/* Scrollable body */
.ep-body { padding: 20px 16px 120px; max-width: 600px; margin: 0 auto; }

/* Section card */
.ep-section-card {
  background: var(--s); border: 1px solid var(--br);
  border-radius: 14px; padding: 18px 16px; margin-bottom: 14px;
}
.ep-section-header {
  display: flex; align-items: center; gap: 10px; margin-bottom: 16px;
}
.ep-section-icon {
  width: 36px; height: 36px; border-radius: 10px;
  background: rgba(232,197,71,.08); border: 1px solid rgba(232,197,71,.15);
  display: flex; align-items: center; justify-content: center; font-size: 17px;
  flex-shrink: 0;
}
.ep-section-title {
  font-family: 'Syne', 'Plus Jakarta Sans', sans-serif;
  font-weight: 800; font-size: 15px; color: var(--tx);
}
.ep-section-sub { font-size: 11px; color: var(--td); margin-top: 1px; }

/* Field groups */
.ep-fg { margin-bottom: 16px; }
.ep-fg:last-child { margin-bottom: 0; }
.ep-label {
  display: block; font-size: 13px; font-weight: 700;
  color: var(--tx); margin-bottom: 6px; letter-spacing: .01em;
}
.ep-label-row { display:flex; justify-content:space-between; align-items:center; margin-bottom:6px; }
.ep-label-badge { font-size:10px; color:var(--td); font-weight:500; }
.ep-hint { font-size: 11px; color: var(--td); margin-top: 5px; line-height:1.5; }
.ep-input {
  width: 100%; box-sizing: border-box;
  background: var(--s2); border: 1.5px solid var(--br);
  border-radius: 10px; padding: 12px 14px;
  font-size: 15px; color: var(--tx);
  font-family: inherit; outline: none;
  transition: border-color .15s, box-shadow .15s;
  -webkit-appearance: none;
}
.ep-input:focus {
  border-color: var(--gld);
  box-shadow: 0 0 0 3px rgba(232,197,71,.1);
  background: var(--s);
}
.ep-input::placeholder { color: var(--td); font-size:14px; }
.ep-textarea { resize: vertical; min-height: 90px; line-height: 1.65; }
.ep-select { cursor: pointer; }
.ep-char { font-size: 10px; color: var(--td); text-align: right; margin-top: 4px; }

/* Input with prefix icon */
.ep-input-wrap { position: relative; }
.ep-input-prefix {
  position: absolute; left: 12px; top: 50%; transform: translateY(-50%);
  color: var(--td); display: flex; align-items: center;
  pointer-events: none; font-size: 13px;
}
.ep-input-wrap .ep-input { padding-left: 36px; }

/* Username field */
.ep-username-status {
  display: flex; align-items: center; gap: 5px;
  font-size: 11px; margin-top: 5px; font-weight: 600;
}
.ep-username-ok   { color: #4ade80; }
.ep-username-err  { color: #ef4444; }
.ep-username-warn { color: var(--gld); }

/* Experience level selector */
.ep-exp-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.ep-exp-card {
  padding: 11px 12px; border-radius: 10px;
  border: 1.5px solid var(--br); background: var(--s2);
  cursor: pointer; transition: all .15s;
  text-align: left;
}
.ep-exp-card.selected {
  border-color: var(--gld); background: rgba(232,197,71,.07);
}
.ep-exp-card-label { font-size: 13px; font-weight: 700; color: var(--tx); }
.ep-exp-card.selected .ep-exp-card-label { color: var(--gld); }
.ep-exp-card-sub { font-size: 10px; color: var(--td); margin-top: 2px; }

/* Skills section */
.ep-skills-search-wrap { position: relative; margin-bottom: 10px; }
.ep-skills-search-wrap .ep-input { padding-left: 36px; }
.ep-skills-search-icon {
  position: absolute; left: 11px; top: 50%; transform: translateY(-50%);
  color: var(--td); pointer-events: none;
}
.ep-skills-grid { display: flex; flex-wrap: wrap; gap: 7px; }
.ep-skill-chip {
  padding: 7px 13px; border-radius: 20px; font-size: 12px; font-weight: 600;
  border: 1.5px solid var(--br); background: var(--s2); color: var(--td);
  cursor: pointer; transition: all .18s; user-select: none;
  display: flex; align-items: center; gap: 5px;
}
.ep-skill-chip:active { transform: scale(.94); }
.ep-skill-chip.on {
  border-color: var(--gld); background: rgba(232,197,71,.1); color: var(--gld);
}
.ep-skill-counter {
  font-size: 11px; color: var(--td); margin-top: 8px; font-weight: 600;
}
.ep-skill-counter span { color: var(--gld); }

/* Services tags */
.ep-tags-wrap {
  background: var(--s2); border: 1.5px solid var(--br); border-radius: 10px;
  padding: 8px 10px; min-height: 48px;
  display: flex; flex-wrap: wrap; gap: 6px; align-items: center;
  cursor: text; transition: border-color .15s, background .15s;
}
.ep-tags-wrap:focus-within {
  border-color: var(--gld); background: var(--s);
  box-shadow: 0 0 0 3px rgba(232,197,71,.1);
}
.ep-tag-chip {
  background: rgba(232,197,71,.1); border: 1px solid rgba(232,197,71,.25);
  color: var(--gld); border-radius: 6px; padding: 4px 8px 4px 11px;
  font-size: 12px; font-weight: 700; display: flex; align-items: center; gap: 5px;
}
.ep-tag-chip button {
  background: none; border: none; cursor: pointer;
  color: var(--gld); padding: 0; line-height: 1; font-size: 13px;
}
.ep-tags-input {
  background: none; border: none; outline: none;
  font-size: 14px; color: var(--tx); font-family: inherit;
  min-width: 100px; flex: 1; padding: 3px 4px;
}

/* Link inputs */
.ep-link-item { margin-bottom: 11px; }
.ep-link-label {
  display: flex; align-items: center; gap: 7px;
  font-size: 12px; font-weight: 700; color: var(--td); margin-bottom: 5px;
}
.ep-link-ico {
  width: 22px; height: 22px; border-radius: 6px;
  display: flex; align-items: center; justify-content: center;
  font-size: 13px; flex-shrink: 0;
}

/* Availability cards */
.ep-avail-list { display: flex; flex-direction: column; gap: 8px; }
.ep-avail-card {
  display: flex; align-items: center; gap: 12px;
  padding: 13px 14px; border-radius: 12px;
  border: 1.5px solid var(--br); background: var(--s2);
  cursor: pointer; transition: all .15s;
}
.ep-avail-card.selected {
  border-color: var(--gld); background: rgba(232,197,71,.06);
}
.ep-avail-dot {
  width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0;
}
.ep-avail-label { font-size: 13px; font-weight: 700; color: var(--tx); }
.ep-avail-sub { font-size: 11px; color: var(--td); margin-top: 2px; }
.ep-avail-check {
  margin-left: auto; color: var(--gld);
  opacity: 0; transition: opacity .15s;
}
.ep-avail-card.selected .ep-avail-check { opacity: 1; }

/* Sticky footer */
.ep-footer {
  position: fixed; bottom:0; left:0; right:0;
  background: var(--s); border-top: 1px solid var(--br);
  padding: 12px 16px; z-index: 20;
  max-width: 600px; margin: 0 auto;
}
.ep-footer-save {
  width: 100%; background: var(--gld); border: none; border-radius: 12px;
  padding: 15px; font-family: 'Plus Jakarta Sans', sans-serif;
  font-weight: 800; font-size: 16px; color: #000; cursor: pointer;
  display: flex; align-items: center; justify-content: center; gap: 8px;
  transition: opacity .15s, transform .1s;
}
.ep-footer-save:active { transform: scale(.98); }
.ep-footer-save:disabled { opacity: .4; cursor: not-allowed; }

/* Divider */
.ep-divider { border: none; border-top: 1px solid var(--br); margin: 14px 0; }

/* Name preview chip */
.ep-name-preview {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 14px; background: var(--s2); border-radius: 10px;
  border: 1px solid var(--br); margin-bottom: 14px;
}
.ep-name-preview-av {
  width: 36px; height: 36px; border-radius: 50%; flex-shrink: 0;
  overflow: hidden; display: flex; align-items: center; justify-content: center;
  font-family: 'Plus Jakarta Sans',sans-serif; font-weight: 800; font-size: 14px;
}
.ep-name-preview-txt { font-size: 13px; font-weight: 700; color: var(--tx); }
.ep-name-preview-sub { font-size: 11px; color: var(--td); margin-top: 1px; }

/* Success toast wrapper */
.ep-saved-flash {
  position: fixed; top: 70px; left: 50%; transform: translateX(-50%);
  background: rgba(74,222,128,.12); border: 1px solid rgba(74,222,128,.3);
  color: #4ade80; padding: 8px 20px; border-radius: 20px;
  font-size: 12px; font-weight: 700; z-index: 4000;
  animation: epFlash .25s ease; pointer-events: none;
}
@keyframes epFlash { from { opacity:0; transform:translateX(-50%) translateY(-8px); } to { opacity:1; transform:translateX(-50%) translateY(0); } }
`;
  document.head.appendChild(s);
}

// ── State ──────────────────────────────────────────────────────────────────
var _EP = {
  activeSection: 'basic',
  skillFilter: '',
  services: [],
  skills: [],
  dirty: false,
};

// ── Open ────────────────────────────────────────────────────────────────────
window.openEditProfile = function () {
  _injectCSS();
  _EP.activeSection = 'basic';
  _EP.skillFilter   = '';
  _EP.services      = (ME.services || []).slice();
  _EP.skills        = (ME.skills   || []).slice();
  _EP.dirty         = false;

  var old = document.getElementById('ep-panel');
  if (old) old.remove();

  var panel = document.createElement('div');
  panel.id  = 'ep-panel';
  document.body.appendChild(panel);
  _render();
};

// ── Close ───────────────────────────────────────────────────────────────────
function _close() {
  var p = document.getElementById('ep-panel');
  if (p) p.remove();
}

// ── Completion % ────────────────────────────────────────────────────────────
// _completion() removed — use calculateProfileCompletion(ME) from 34-profile-completion.js

// ── Full render ──────────────────────────────────────────────────────────────
function _render() {
  var panel = document.getElementById('ep-panel');
  if (!panel) return;

  var avImg = ME.avatar
    ? '<img src="'+ME.avatar+'" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">'
    : '<div style="background:linear-gradient(135deg,'+(ME.gradient||'#16a25a')+','+(ME.gradient||'#16a25a')+'88);width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-family:Plus Jakarta Sans,sans-serif;font-weight:800;font-size:14px;color:#000;">'+initials(ME.name||'?')+'</div>';

  // Tabs — role-aware
  var _activeSections = (ME && ME.role === 'employer') ? EP_CLIENT_SECTIONS : EP_SECTIONS;
  // Reset to valid section if current one doesn't exist for this role
  if (!_activeSections.find(function(s){return s.id===_EP.activeSection;})) {
    _EP.activeSection = _activeSections[0].id;
  }
  var tabsHtml = _activeSections.map(function(sec) {
    var isDone = _isSectionDone(sec.id);
    return '<button class="ep-sec-tab'+(sec.id===_EP.activeSection?' active':'')+(isDone?' ep-sec-tab-done':'')+'" data-sec="'+sec.id+'">'
      + sec.icon + ' ' + sec.label
      + '</button>';
  }).join('');

  var html = ''
    + '<div class="ep-header">'
    +   '<button class="ep-back-btn" id="ep-back-btn">'+_ICO.back+'</button>'
    +   '<div class="ep-header-title">Edit Profile</div>'
    +   '<button class="ep-save-pill" id="ep-header-save">'+_ICO.save+' Save</button>'
    + '</div>'
    // Progress bar removed — lives on home dashboard only
    + '<div class="ep-section-nav" id="ep-section-nav">'+tabsHtml+'</div>'
    + '<div class="ep-body" id="ep-body">'
    + _renderSection(_EP.activeSection, avImg)
    + '</div>'
    + '<div class="ep-footer">'
    +   '<button class="ep-footer-save" id="ep-footer-save">Save Profile</button>'
    + '</div>';

  panel.innerHTML = html;
  _bindAll();
}

// ── Section done check (for tab indicator) ──────────────────────────────────
function _isSectionDone(id) {
  if (id === 'basic')        return !!(ME.name && ME.title && ME.bio);
  if (id === 'professional') return !!(ME.category && ME.experience);
  if (id === 'skills')       return _EP.skills.length > 0 && _EP.services.length > 0;
  if (id === 'links')        return !!((ME.links||{}).linkedin || (ME.links||{}).github || (ME.links||{}).website);
  if (id === 'availability') return !!(ME.availabilityStatus);
  if (id === 'client')       return !!(ME.industry) && (ME.projectTypes||[]).length > 0;
  return false;
}

// ── Render a section ─────────────────────────────────────────────────────────
function _renderSection(id, avImg) {
  if (id === 'basic')        return _secBasic(avImg);
  if (id === 'professional') return _secProfessional();
  if (id === 'skills')       return _secSkills();
  if (id === 'links')        return _secLinks();
  if (id === 'availability') return _secAvailability();
  if (id === 'client')       return _secClient();
  return '';
}

// ── SECTION 1: Basic Info ────────────────────────────────────────────────────
function _secBasic(avImg) {
  var u = ME;
  var lastUsernameChange = u.lastUsernameChange || 0;
  var canChangeUsername  = (Date.now() - lastUsernameChange) > (30 * 86400000);
  var daysLeft = canChangeUsername ? 0 : Math.ceil((30 * 86400000 - (Date.now() - lastUsernameChange)) / 86400000);

  var countryOpts = (typeof COUNTRIES !== 'undefined' ? COUNTRIES : [
    'Nigeria','Ghana','Kenya','South Africa','Senegal','Rwanda','Ethiopia','Uganda','Tanzania','Cameroon'
  ]).map(function(c) {
    return '<option value="'+c+'"'+(u.country===c?' selected':'')+'>'+c+'</option>';
  }).join('');

  return '<div class="ep-section-card">'
    + '<div class="ep-section-header"><div class="ep-section-icon">👤</div><div><div class="ep-section-title">Basic Information</div><div class="ep-section-sub">Your public identity on SkillStamp</div></div></div>'

    // Avatar quick-change
    + '<div class="ep-fg" style="display:flex;align-items:center;gap:14px;padding:12px;background:var(--s2);border-radius:10px;border:1px solid var(--br);">'
    +   '<div style="width:54px;height:54px;border-radius:50%;overflow:hidden;border:2px solid var(--gld);flex-shrink:0;">'+avImg+'</div>'
    +   '<div style="flex:1;">'
    +     '<div style="font-size:13px;font-weight:700;color:var(--tx);margin-bottom:3px;">Profile Photo</div>'
    +     '<div style="font-size:11px;color:var(--td);">Your photo helps clients recognise you</div>'
    +   '</div>'
    +   '<button onclick="openChangePhoto()" style="background:rgba(232,197,71,.1);border:1px solid rgba(232,197,71,.25);color:var(--gld);border-radius:8px;padding:8px 13px;font-family:Plus Jakarta Sans,sans-serif;font-weight:700;font-size:12px;cursor:pointer;white-space:nowrap;">Change</button>'
    + '</div>'

    + '<hr class="ep-divider">'

    // Full name
    + '<div class="ep-fg">'
    +   '<label class="ep-label">Full Name <span style="color:var(--acc);">*</span></label>'
    +   '<input class="ep-input" id="ep-name" value="'+(u.name||'')+'" placeholder="Your full name" maxlength="50">'
    +   '<div class="ep-hint">This is your display name across the platform.</div>'
    + '</div>'

    // Username
    + '<div class="ep-fg">'
    +   '<div class="ep-label-row">'
    +     '<label class="ep-label" style="margin:0;">Username</label>'
    +     (canChangeUsername
        ? '<span class="ep-label-badge" style="color:#4ade80;">✓ Can change</span>'
        : '<span class="ep-label-badge" style="color:var(--acc);">'+daysLeft+' days left</span>')
    +   '</div>'
    +   '<div class="ep-input-wrap">'
    +     '<div class="ep-input-prefix">@</div>'
    +     '<input class="ep-input" id="ep-username" value="'+(u.username||u.name||'').toLowerCase().replace(/\s+/g,'')+'" placeholder="yourname"'+(canChangeUsername?'':' disabled style="opacity:.5;"')+'>'
    +   '</div>'
    +   '<div id="ep-username-status" class="ep-username-status"><span style="color:var(--td);font-size:10px;">'+(!canChangeUsername?'You can change your username once every 30 days.':'')+'</span></div>'
    + '</div>'

    // Professional Title
    + '<div class="ep-fg">'
    +   '<label class="ep-label">Professional Title <span style="color:var(--acc);">*</span></label>'
    +   '<input class="ep-input" id="ep-title" value="'+(u.title||'')+'" placeholder="e.g. Senior UI/UX Designer · Figma Expert" maxlength="80">'
    +   '<div id="ep-title-chars" class="ep-char">'+(u.title?u.title.length:0)+'/80</div>'
    + '</div>'

    // Headline / Tagline
    + '<div class="ep-fg">'
    +   '<label class="ep-label">Short Headline</label>'
    +   '<input class="ep-input" id="ep-headline" value="'+(u.headline||u.tagline||'')+'" placeholder="e.g. I help startups launch faster through clean design" maxlength="120">'
    +   '<div class="ep-hint">One powerful sentence that sells you. Shown on your profile card.</div>'
    + '</div>'

    // Bio
    + '<div class="ep-fg">'
    +   '<div class="ep-label-row"><label class="ep-label" style="margin:0;">Bio <span style="color:var(--acc);">*</span></label><div id="ep-bio-chars" class="ep-char">'+(u.bio?u.bio.length:0)+'/600</div></div>'
    +   '<textarea class="ep-input ep-textarea" id="ep-bio" placeholder="Tell clients about your experience, what you do, and why you love it. Be specific and authentic." maxlength="600">'+((u.bio||'').replace(/</g,'&lt;').replace(/>/g,'&gt;'))+'</textarea>'
    +   '<div class="ep-hint">Profiles with complete bios get 4× more views.</div>'
    + '</div>'

    // Country + City
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">'
    +   '<div class="ep-fg">'
    +     '<label class="ep-label">Country <span style="color:var(--acc);">*</span></label>'
    +     '<select class="ep-input ep-select" id="ep-country">'+countryOpts+'</select>'
    +   '</div>'
    +   '<div class="ep-fg">'
    +     '<label class="ep-label">City <span style="font-size:10px;font-weight:400;color:var(--td);">(optional)</span></label>'
    +     '<input class="ep-input" id="ep-city" value="'+(u.city||'')+'" placeholder="e.g. Lagos">'
    +   '</div>'
    + '</div>'

    + '</div>';
}

// ── SECTION 2: Professional Info ──────────────────────────────────────────────
function _secProfessional() {
  var u   = ME;
  var cat = u.category || (typeof CATEGORIES !== 'undefined' ? CATEGORIES[0] : 'Graphics Design');

  var catOpts = (typeof CATEGORIES !== 'undefined' ? CATEGORIES : ['Graphics Design','UI/UX Design','Content Writing','Data Analysis','Digital Marketing','Web & Mobile Dev'])
    .map(function(c) { return '<option value="'+c+'"'+(u.category===c?' selected':'')+'>'+c+'</option>'; }).join('');

  var expHtml = EXP_LEVELS.map(function(e) {
    var sel = (u.experience === e.v);
    return '<div class="ep-exp-card'+(sel?' selected':'')+'" data-exp="'+e.v+'">'
      + '<div class="ep-exp-card-label" style="color:'+(sel?'var(--gld)':e.col)+';">'+e.label+'</div>'
      + '<div class="ep-exp-card-sub">'+e.sub+'</div>'
      + '</div>';
  }).join('');

  return '<div class="ep-section-card">'
    + '<div class="ep-section-header"><div class="ep-section-icon">💼</div><div><div class="ep-section-title">Professional Information</div><div class="ep-section-sub">Helps clients find and trust you faster</div></div></div>'

    + '<div class="ep-fg">'
    +   '<label class="ep-label">Primary Category <span style="color:var(--acc);">*</span></label>'
    +   '<select class="ep-input ep-select" id="ep-cat">'+catOpts+'</select>'
    +   '<div class="ep-hint">This affects which skills are suggested and which gigs you appear in.</div>'
    + '</div>'

    + '<div class="ep-fg">'
    +   '<label class="ep-label">Experience Level</label>'
    +   '<div class="ep-exp-grid" id="ep-exp-grid">'+expHtml+'</div>'
    + '</div>'

    + '</div>';
}

// ── SECTION 3: Skills & Services ─────────────────────────────────────────────
function _secSkills() {
  var u         = ME;
  var cat       = u.category || (typeof CATEGORIES !== 'undefined' ? CATEGORIES[0] : 'Graphics Design');
  var allSkills = _skillsForCat(cat);
  var filter    = (_EP.skillFilter || '').toLowerCase();
  var visible   = filter ? allSkills.filter(function(s) { return s.toLowerCase().indexOf(filter) >= 0; }) : allSkills;

  var skillsHtml = visible.map(function(s) {
    var on = _EP.skills.indexOf(s) >= 0;
    return '<span class="ep-skill-chip'+(on?' on':'')+'" data-skill="'+s+'">'
      + (on ? _ICO.check + ' ' : '')
      + s + '</span>';
  }).join('');

  // Services tags
  var tagsHtml = _EP.services.map(function(t) {
    return '<div class="ep-tag-chip">'+t+'<button data-delsvc="'+t+'">×</button></div>';
  }).join('');

  return '<div class="ep-section-card">'
    + '<div class="ep-section-header"><div class="ep-section-icon">⚡</div><div><div class="ep-section-title">Skills & Services</div><div class="ep-section-sub">Showcase what you can do and what you offer</div></div></div>'

    // Skills
    + '<div class="ep-fg">'
    +   '<div class="ep-label-row"><label class="ep-label" style="margin:0;">Skills</label><span class="ep-label-badge">Based on: '+cat+'</span></div>'
    +   '<div class="ep-skills-search-wrap">'
    +     '<div class="ep-skills-search-icon">'+_ICO.search+'</div>'
    +     '<input class="ep-input" id="ep-skill-search" placeholder="Search skills…" value="'+(filter)+'">'
    +   '</div>'
    +   '<div class="ep-skills-grid" id="ep-skills-grid">'+skillsHtml+'</div>'
    +   '<div class="ep-skill-counter" id="ep-skill-count"><span>'+_EP.skills.length+'</span> skills selected</div>'
    + '</div>'

    + '<hr class="ep-divider">'

    // Services offered
    + '<div class="ep-fg">'
    +   '<label class="ep-label">Services Offered</label>'
    +   '<div class="ep-tags-wrap" id="ep-svc-wrap">'+tagsHtml+'<input class="ep-tags-input" id="ep-svc-input" placeholder="Type a service, press Enter…"></div>'
    +   '<div class="ep-hint">e.g. "Logo Design", "Brand Strategy", "React Development". Different from skills — these are what you charge for.</div>'
    + '</div>'

    + '</div>';
}

// ── SECTION 4: Professional Links ────────────────────────────────────────────
function _secLinks() {
  var lnk = ME.links || {};
  var LINKS = [
    { id:'linkedin',  label:'LinkedIn',       ico:'💼', placeholder:'linkedin.com/in/yourname', prefix:'https://' },
    { id:'github',    label:'GitHub',          ico:'🐙', placeholder:'github.com/yourname',      prefix:'https://' },
    { id:'behance',   label:'Behance',         ico:'🎨', placeholder:'behance.net/yourname',      prefix:'https://' },
    { id:'dribbble',  label:'Dribbble',        ico:'🏀', placeholder:'dribbble.com/yourname',     prefix:'https://' },
    { id:'website',   label:'Personal Website',ico:'🌐', placeholder:'yourwebsite.com',           prefix:'https://' },
  ];

  var html = '<div class="ep-section-card">'
    + '<div class="ep-section-header"><div class="ep-section-icon">🔗</div><div><div class="ep-section-title">Professional Links</div><div class="ep-section-sub">Strengthen your credibility with verified presence</div></div></div>';

  LINKS.forEach(function(l) {
    html += '<div class="ep-link-item">'
      + '<div class="ep-link-label"><div class="ep-link-ico">'+l.ico+'</div>'+l.label+'</div>'
      + '<div class="ep-input-wrap">'
      +   '<div class="ep-input-prefix" style="font-size:11px;color:var(--td);">https://</div>'
      +   '<input class="ep-input" id="ep-link-'+l.id+'" value="'+(lnk[l.id]||'').replace(/^https?:\/\//,'')+'" placeholder="'+l.placeholder+'">'
      + '</div>'
      + '</div>';
  });

  html += '</div>';
  return html;
}

// ── SECTION 5: Availability & Visibility ─────────────────────────────────────
function _secAvailability() {
  var currentStatus = ME.availabilityStatus || (ME.available !== false ? 'available' : 'busy');

  var availHtml = AVAIL_STATUSES.map(function(a) {
    var sel = (currentStatus === a.v);
    return '<div class="ep-avail-card'+(sel?' selected':'')+'" data-avail="'+a.v+'">'
      + '<div class="ep-avail-dot" style="background:'+a.dot+';"></div>'
      + '<div style="flex:1;">'
      +   '<div class="ep-avail-label">'+a.label+'</div>'
      +   '<div class="ep-avail-sub">'+a.sub+'</div>'
      + '</div>'
      + '<div class="ep-avail-check">'+_ICO.check+'</div>'
      + '</div>';
  }).join('');

  return '<div class="ep-section-card">'
    + '<div class="ep-section-header"><div class="ep-section-icon">🟢</div><div><div class="ep-section-title">Availability Status</div><div class="ep-section-sub">Let clients know if you are open for work</div></div></div>'
    + '<div class="ep-avail-list" id="ep-avail-list">'+availHtml+'</div>'
    + '<div class="ep-hint" style="margin-top:10px;">This status is shown on your public profile and affects how you appear in search results.</div>'
    + '</div>';
}

// ── SECTION: Client Business Info ────────────────────────────────────────────
function _secClient() {
  var u = ME;
  var industries = ['Technology','Finance','Healthcare','Education','E-commerce',
    'Media & Entertainment','Real Estate','Fashion','Food & Beverage',
    'Non-profit','Consulting','Manufacturing','Other'];
  var projectTypeOpts = ['Logo & Branding','Website Design','Mobile App',
    'Content Creation','Social Media','Video Production','Data Analysis',
    'Marketing Campaign','UI/UX Design','Copywriting','Other'];

  var industryOpts = '<option value="">Select industry...</option>'
    + industries.map(function(ind) {
      return '<option value="'+ind+'"'+(u.industry===ind?' selected':'')+'>'+ind+'</option>';
    }).join('');

  var savedTypes = u.projectTypes || [];
  var typeChips  = projectTypeOpts.map(function(t) {
    var on = savedTypes.indexOf(t) >= 0;
    return '<span class="ep-skill-chip'+(on?' on':'')+'" data-ptype="'+t+'">'+t+'</span>';
  }).join('');

  return '<div class="ep-section-card">'
    + '<div class="ep-section-header"><div class="ep-section-icon">🏢</div>'
    + '<div><div class="ep-section-title">Business Information</div>'
    + '<div class="ep-section-sub">Help freelancers understand your company and needs</div></div></div>'
    + '<div class="ep-fg">'
    +   '<label class="ep-label">Industry</label>'
    +   '<select class="ep-input ep-select" id="ep-industry">'+industryOpts+'</select>'
    +   '<div class="ep-hint">Helps match you with the most relevant freelancers.</div>'
    + '</div>'
    + '<div class="ep-fg">'
    +   '<label class="ep-label">Project Types <span style="font-size:10px;font-weight:400;color:var(--td);">(select all that apply)</span></label>'
    +   '<div class="ep-skills-grid" id="ep-ptypes-grid">'+typeChips+'</div>'
    +   '<div class="ep-skill-counter" id="ep-ptype-count"><span>'+savedTypes.length+'</span> selected</div>'
    + '</div>'
    + '</div>';
}

// ── Bind all interactions ────────────────────────────────────────────────────
function _bindAll() {
  var panel = document.getElementById('ep-panel');
  if (!panel) return;

  // Back
  var backBtn = document.getElementById('ep-back-btn');
  if (backBtn) backBtn.onclick = function () {
    if (_EP.dirty) {
      if (!confirm('You have unsaved changes. Leave anyway?')) return;
    }
    _close();
  };

  // Section nav tabs
  var nav = document.getElementById('ep-section-nav');
  if (nav) {
    nav.addEventListener('click', function(e) {
      var btn = e.target.closest('[data-sec]');
      if (!btn) return;
      _collectCurrentSection();
      _EP.activeSection = btn.getAttribute('data-sec');
      _render();
      // Scroll body back to top
      var body = document.getElementById('ep-body');
      if (body) body.scrollTop = 0;
      panel.scrollTop = 0;
    });
    // Auto-scroll active tab into view
    setTimeout(function() {
      var activeTab = nav.querySelector('.active');
      if (activeTab) activeTab.scrollIntoView({ inline: 'nearest', behavior: 'smooth' });
    }, 50);
  }

  // Save buttons
  var saveFns = [document.getElementById('ep-header-save'), document.getElementById('ep-footer-save')];
  saveFns.forEach(function(btn) { if (btn) btn.onclick = _save; });

  // Mark dirty on any input change
  panel.addEventListener('input', function() { _EP.dirty = true; });
  panel.addEventListener('change', function() { _EP.dirty = true; });

  // Section-specific binds
  if (_EP.activeSection === 'basic')        _bindBasic();
  if (_EP.activeSection === 'professional') _bindProfessional();
  if (_EP.activeSection === 'skills')       _bindSkills();
  if (_EP.activeSection === 'links')        {} // links are pure inputs, nothing extra needed
  if (_EP.activeSection === 'availability') _bindAvailability();
  if (_EP.activeSection === 'client')       _bindClient();
}

function _bindBasic() {
  // Bio char counter
  var bioEl = document.getElementById('ep-bio');
  if (bioEl) bioEl.oninput = function() {
    var cnt = document.getElementById('ep-bio-chars');
    if (cnt) cnt.textContent = this.value.length + '/600';
  };

  // Title char counter
  var titleEl = document.getElementById('ep-title');
  if (titleEl) titleEl.oninput = function() {
    var cnt = document.getElementById('ep-title-chars');
    if (cnt) cnt.textContent = this.value.length + '/80';
  };

  // Username validation
  var unEl = document.getElementById('ep-username');
  if (unEl) {
    unEl.oninput = function() {
      var val = this.value.trim().toLowerCase().replace(/[^a-z0-9_\.]/g, '');
      this.value = val;
      var status = document.getElementById('ep-username-status');
      if (!status) return;
      if (!val) { status.innerHTML = '<span class="ep-username-err">Username cannot be empty.</span>'; return; }
      if (val.length < 3) { status.innerHTML = '<span class="ep-username-err">Too short — minimum 3 characters.</span>'; return; }
      // Check against other users
      var allUsers = typeof getAllUsers === 'function' ? getAllUsers() : [];
      var taken = allUsers.some(function(u) { return u.uid !== ME.uid && (u.username||u.name||'').toLowerCase().replace(/\s+/g,'') === val; });
      if (taken) { status.innerHTML = '<span class="ep-username-err">@'+val+' is already taken.</span>'; return; }
      status.innerHTML = '<span class="ep-username-ok">'+_ICO.check+' @'+val+' is available</span>';
    };
  }
}

function _bindProfessional() {
  // Experience level cards
  var expGrid = document.getElementById('ep-exp-grid');
  if (expGrid) {
    expGrid.addEventListener('click', function(e) {
      var card = e.target.closest('[data-exp]');
      if (!card) return;
      expGrid.querySelectorAll('.ep-exp-card').forEach(function(c) {
        var sel = c === card;
        c.classList.toggle('selected', sel);
        var lbl = c.querySelector('.ep-exp-card-label');
        if (lbl) lbl.style.color = sel ? 'var(--gld)' : '';
      });
      ME.experience = card.getAttribute('data-exp');
      _EP.dirty = true;
    });
  }

  // Category change → re-render skills section next time
  var catEl = document.getElementById('ep-cat');
  if (catEl) catEl.onchange = function() {
    ME.category = this.value;
    _EP.skills = []; // reset skills on category change
    _EP.dirty = true;
  };
}

function _bindSkills() {
  // Skill chip toggles
  var grid = document.getElementById('ep-skills-grid');
  if (grid) {
    grid.addEventListener('click', function(e) {
      var chip = e.target.closest('[data-skill]');
      if (!chip) return;
      var skill = chip.getAttribute('data-skill');
      var idx   = _EP.skills.indexOf(skill);
      if (idx >= 0) _EP.skills.splice(idx, 1);
      else          _EP.skills.push(skill);
      chip.classList.toggle('on', idx < 0);
      chip.innerHTML = (idx < 0 ? _ICO.check + ' ' : '') + skill;
      var cnt = document.getElementById('ep-skill-count');
      if (cnt) cnt.innerHTML = '<span>'+_EP.skills.length+'</span> skills selected';
      _EP.dirty = true;
    });
  }

  // Search/filter
  var searchEl = document.getElementById('ep-skill-search');
  if (searchEl) {
    searchEl.oninput = function() {
      _EP.skillFilter = this.value;
      // Re-render only the skills grid
      var cat       = (document.getElementById('ep-cat') ? document.getElementById('ep-cat').value : null) || ME.category || '';
      var allSkills = _skillsForCat(cat);
      var filter    = _EP.skillFilter.toLowerCase();
      var visible   = filter ? allSkills.filter(function(s) { return s.toLowerCase().indexOf(filter) >= 0; }) : allSkills;
      var newHtml   = visible.map(function(s) {
        var on = _EP.skills.indexOf(s) >= 0;
        return '<span class="ep-skill-chip'+(on?' on':'')+'" data-skill="'+s+'">'+(on?_ICO.check+' ':'')+s+'</span>';
      }).join('');
      var skillGrid = document.getElementById('ep-skills-grid');
      if (skillGrid) skillGrid.innerHTML = newHtml;
      // Re-bind grid (new DOM)
      _bindSkillGrid();
    };
  }
  _bindSkillGrid();

  // Services tag input
  var svcInput = document.getElementById('ep-svc-input');
  var svcWrap  = document.getElementById('ep-svc-wrap');
  if (svcInput) {
    svcInput.onkeydown = function(e) {
      if ((e.key === 'Enter' || e.key === ',') && this.value.trim()) {
        e.preventDefault();
        var val = this.value.trim().replace(/,/g, '');
        if (val && _EP.services.indexOf(val) < 0) {
          _EP.services.push(val);
          var chip = document.createElement('div');
          chip.className = 'ep-tag-chip';
          chip.innerHTML = val + '<button data-delsvc="'+val+'">×</button>';
          svcWrap.insertBefore(chip, svcInput);
          _EP.dirty = true;
        }
        this.value = '';
      } else if (e.key === 'Backspace' && !this.value && _EP.services.length) {
        _EP.services.pop();
        var chips = svcWrap.querySelectorAll('.ep-tag-chip');
        if (chips.length) chips[chips.length - 1].remove();
      }
    };
  }
  if (svcWrap) {
    svcWrap.addEventListener('click', function(e) {
      var del = e.target.closest('[data-delsvc]');
      if (del) {
        var svc = del.getAttribute('data-delsvc');
        var i   = _EP.services.indexOf(svc);
        if (i >= 0) _EP.services.splice(i, 1);
        del.closest('.ep-tag-chip').remove();
        _EP.dirty = true;
      }
      if (svcInput) svcInput.focus();
    });
  }
}

function _bindSkillGrid() {
  var grid = document.getElementById('ep-skills-grid');
  if (!grid) return;
  grid.addEventListener('click', function(e) {
    var chip = e.target.closest('[data-skill]');
    if (!chip) return;
    var skill = chip.getAttribute('data-skill');
    var idx   = _EP.skills.indexOf(skill);
    if (idx >= 0) _EP.skills.splice(idx, 1);
    else          _EP.skills.push(skill);
    chip.classList.toggle('on', idx < 0);
    chip.innerHTML = (idx < 0 ? _ICO.check + ' ' : '') + skill;
    var cnt = document.getElementById('ep-skill-count');
    if (cnt) cnt.innerHTML = '<span>'+_EP.skills.length+'</span> skills selected';
    _EP.dirty = true;
  });
}

function _bindClient() {
  // Project type chips
  var grid = document.getElementById('ep-ptypes-grid');
  if (!grid) return;
  grid.addEventListener('click', function(e) {
    var chip = e.target.closest('[data-ptype]');
    if (!chip) return;
    var t   = chip.getAttribute('data-ptype');
    var pts = ME.projectTypes || [];
    var idx = pts.indexOf(t);
    if (idx >= 0) pts.splice(idx, 1);
    else          pts.push(t);
    ME.projectTypes = pts;
    chip.classList.toggle('on', idx < 0);
    var cnt = document.getElementById('ep-ptype-count');
    if (cnt) cnt.innerHTML = '<span>'+pts.length+'</span> selected';
    _EP.dirty = true;
  });
}

function _bindAvailability() {
  var list = document.getElementById('ep-avail-list');
  if (!list) return;
  list.addEventListener('click', function(e) {
    var card = e.target.closest('[data-avail]');
    if (!card) return;
    list.querySelectorAll('.ep-avail-card').forEach(function(c) {
      c.classList.toggle('selected', c === card);
    });
    ME.availabilityStatus = card.getAttribute('data-avail');
    ME.available = (ME.availabilityStatus === 'available' || ME.availabilityStatus === 'open');
    _EP.dirty = true;
  });
}

// ── Collect current section DOM values into ME ───────────────────────────────
function _collectCurrentSection() {
  var sec = _EP.activeSection;

  if (sec === 'basic') {
    var name    = document.getElementById('ep-name');
    var un      = document.getElementById('ep-username');
    var title   = document.getElementById('ep-title');
    var hl      = document.getElementById('ep-headline');
    var bio     = document.getElementById('ep-bio');
    var country = document.getElementById('ep-country');
    var city    = document.getElementById('ep-city');
    if (name)    ME.name     = name.value.trim() || ME.name;
    if (title)   ME.title    = title.value.trim();
    if (hl)      ME.headline = hl.value.trim();
    if (bio)     ME.bio      = bio.value.trim();
    if (country) ME.country  = country.value;
    if (city)    ME.city     = city.value.trim();
    // Username with 30-day guard
    if (un && un.value.trim() && !un.disabled) {
      var newUn = un.value.trim().toLowerCase();
      if (newUn !== (ME.username||'').toLowerCase() && newUn.length >= 3) {
        ME.username            = newUn;
        ME.lastUsernameChange  = Date.now();
      }
    }
  }

  if (sec === 'professional') {
    var cat = document.getElementById('ep-cat');
    if (cat) ME.category = cat.value;
    // experience is set live via card clicks
  }

  if (sec === 'skills') {
    ME.skills   = _EP.skills.slice();
    ME.services = _EP.services.slice();
    // flush any pending service input
    var si = document.getElementById('ep-svc-input');
    if (si && si.value.trim()) {
      var sv = si.value.trim();
      if (_EP.services.indexOf(sv) < 0) { ME.services.push(sv); _EP.services.push(sv); }
      si.value = '';
    }
  }

  if (sec === 'links') {
    var linkIds = ['linkedin','github','behance','dribbble','website'];
    var links   = ME.links || {};
    linkIds.forEach(function(id) {
      var el = document.getElementById('ep-link-'+id);
      if (!el) return;
      var val = el.value.trim();
      if (val) links[id] = val.startsWith('http') ? val : 'https://' + val;
      else     delete links[id];
    });
    ME.links = links;
  }

  if (sec === 'availability') {
    // availability is set live via card clicks
  }
  if (sec === 'client') {
    var indEl = document.getElementById('ep-industry');
    if (indEl && indEl.value) ME.industry = indEl.value;
    // projectTypes set live via chip clicks (stored in ME.projectTypes)
  }
}

// ── Save ────────────────────────────────────────────────────────────────────
window.saveProfile = function() { _save(); };

function _save() {
  _collectCurrentSection();

  // Validation
  if (!(ME.name||'').trim())    { toast('Name cannot be empty.', 'bad');  return; }
  if (!(ME.title||'').trim())   { toast('Add a professional title.', 'bad'); return; }

  // Disable save buttons
  var btns = ['ep-header-save','ep-footer-save'];
  btns.forEach(function(id) { var b=document.getElementById(id); if(b){b.disabled=true; b.textContent='Saving…';} });

  saveUser(ME).then(function() {
    _EP.dirty = false;
    toast('Profile updated! ✓');
    _close();
    renderMyProfile();

    // Also push a profile update notification (silent, no popup)
    try { pushNotif(ME.uid, 'system', '✅ Profile Updated', 'Your profile changes have been saved.', { type:'system' }); } catch(e) {}
  }).catch(function(err) {
    console.error('saveProfile error', err);
    toast('Save failed — please try again.', 'bad');
    btns.forEach(function(id) { var b=document.getElementById(id); if(b){b.disabled=false; b.textContent='Save Profile';} });
  });
}

// ── Also expose toggleAvailability for backward compat (called from profile) ─
window.toggleAvailability = window.toggleAvailability || function() {
  ME.available = !ME.available;
  ME.availabilityStatus = ME.available ? 'available' : 'busy';
  saveUser(ME);
  renderMyProfile();
};

})();
