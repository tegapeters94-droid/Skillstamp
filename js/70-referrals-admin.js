/* SkillStamp - Admin > Referrals tab. Who invited whom, how far each invited person is, and which bonuses were paid.
   Settings (bonus amounts, minimum gig, how many days a new member has to add a code, on/off) are saved here.
   Needs the Payments tool. Bonuses are paid by the Worker; "Cancel" stops one that is not paid yet. Removing this file removes the tab. */
(function () {
  'use strict';
  var API = window.SS_API || 'https://skillstamp-email.tegapeters94.workers.dev';
  function $(id) { return document.getElementById(id); }
  function F() { return window.FB_FNS; }
  function me() { return window.ME; }
  function can() { var m = me(); return !!(m && m.isAdmin && (!Array.isArray(m.adminScope) || m.adminScope.indexOf('payments') >= 0)); }
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function ngn(n) { return '₦' + (Number(n) || 0).toLocaleString('en-US'); }
  function say(m, bad) { try { if (window.toast) window.toast(m, bad ? 'bad' : undefined); } catch (e) {} }
  function ago(ts) { try { return typeof window.timeAgo === 'function' ? window.timeAgo(ts) : new Date(ts).toLocaleString(); } catch (e) { return ''; } }
  async function call(path, body) {
    var u = window.FB_AUTH && window.FB_AUTH.currentUser; if (!u) throw new Error('signed-out');
    var tok = await u.getIdToken();
    var r = await fetch(API + path, { method: 'POST', headers: { 'Authorization': 'Bearer ' + tok, 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}) });
    var j = {}; try { j = await r.json(); } catch (e) {} j._status = r.status; return j;
  }
  var ROWS = [], SET = { enabled: true, freelancerBonus: 500, clientBonus: 1000, minGig: 10000, windowDays: 7 }, FILTER = 'all', Q = '';
  var CSS = '<style>.rg-b{padding:7px 12px;font-size:11px;font-weight:700;border-radius:8px;border:1px solid var(--br);background:var(--s);color:var(--tx);cursor:pointer;font-family:inherit}.rg-b.p{background:var(--acc);color:#fff;border-color:var(--acc)}.rg-b.d{color:#b42318}.rg-t{display:inline-block;padding:2px 8px;border-radius:10px;font-size:10px;font-weight:800;white-space:nowrap}.rg-i{padding:7px;border:1px solid var(--br);border-radius:8px;background:var(--s);color:var(--tx);font-size:12px;width:100%;box-sizing:border-box}.rg-c{border:1px solid var(--br);border-radius:12px;padding:12px;margin-bottom:8px;background:var(--s)}</style>';
  function badge() { var n = ROWS.filter(function (r) { return r.status === 'pending'; }).length; var b = $('admt-referrals'); if (b) b.textContent = '🎁 Referrals' + (n ? ' (' + n + ')' : ''); }
  async function load() {
    if (!can()) return;
    try {
      var s = await F().getDocs(F().collection(window.FB_DB, 'referrals'));
      ROWS = s.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); }).sort(function (a, b) { return (b.created || 0) - (a.created || 0); });
      try { var d = await F().getDoc(F().doc(window.FB_DB, 'payment_settings', 'referral')); if (d.exists()) { var x = d.data() || {}; SET = { enabled: x.enabled !== false, freelancerBonus: x.freelancerBonus != null ? Number(x.freelancerBonus) : 500, clientBonus: x.clientBonus != null ? Number(x.clientBonus) : 1000, minGig: x.minGig != null ? Number(x.minGig) : 10000, windowDays: x.windowDays != null ? Number(x.windowDays) : 7 }; } } catch (e) {}
      badge();
    } catch (e) { console.warn('[referrals]', e); }
  }
  function prog(r) {
    var p = r.progress || {};
    var it = r.role === 'freelancer' ? [['Verified', p.verified]] : [['Profile', p.profile], ['Gig posted', p.posted], ['Hired', p.hired]];
    return it.map(function (x) { return (x[1] ? '✅' : '⬜') + ' ' + x[0]; }).join(' · ');
  }
  function stat(r) {
    return r.status === 'paid' ? '<span class="rg-t" style="background:rgba(74,222,128,.15);color:#15803d;">Paid ' + ngn(r.bonus) + '</span>' : r.status === 'void' ? '<span class="rg-t" style="background:rgba(148,163,184,.2);color:#475569;">Cancelled</span>' : '<span class="rg-t" style="background:rgba(255,167,38,.18);color:#9a5b00;">In progress</span>';
  }
  function draw() {
    var p = $('admtab-referrals'); if (!p) return;
    var paid = ROWS.filter(function (r) { return r.status === 'paid'; }), pend = ROWS.filter(function (r) { return r.status === 'pending'; });
    var total = paid.reduce(function (t, r) { return t + (Number(r.bonus) || 0); }, 0);
    var by = {}; ROWS.forEach(function (r) { var k = r.referrerUid; (by[k] = by[k] || { name: r.referrerName, n: 0, paid: 0, amt: 0 }); by[k].n++; if (r.status === 'paid') { by[k].paid++; by[k].amt += Number(r.bonus) || 0; } });
    var top = Object.keys(by).map(function (k) { return by[k]; }).sort(function (a, b) { return b.n - a.n; }).slice(0, 5);
    var q = Q.trim().toLowerCase();
    var list = ROWS.filter(function (r) { return (FILTER === 'all' || r.status === FILTER) && (!q || (String(r.referrerName) + ' ' + String(r.referredName) + ' ' + String(r.code)).toLowerCase().indexOf(q) >= 0); });
    function tile(a, b) { return '<div class="rg-c" style="flex:1;min-width:90px;text-align:center;margin:0;"><div style="font-weight:800;font-size:17px;">' + a + '</div><div style="font-size:10px;color:var(--td);">' + b + '</div></div>'; }
    p.innerHTML = CSS + '<div style="padding:12px;max-width:760px;"><div style="font-weight:800;font-size:15px;margin-bottom:4px;">Referrals</div>'
      + '<div style="font-size:12px;color:var(--td);line-height:1.6;margin-bottom:10px;">Who invited whom, how far each invited person is, and what has been paid. Bonuses are paid automatically once the requirements are met.</div>'
      + '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;">' + tile(ROWS.length, 'Referred members') + tile(pend.length, 'In progress') + tile(paid.length, 'Paid') + tile(ngn(total), 'Total bonuses paid') + '</div>'
      + '<details class="rg-c"><summary style="cursor:pointer;font-weight:700;font-size:13px;">Settings (' + (SET.enabled ? 'on' : 'paused') + ')</summary><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px;">'
      + '<label style="font-size:11px;">Freelancer bonus (₦)<input id="rg-fb" class="rg-i" type="number" min="0" value="' + SET.freelancerBonus + '"></label>'
      + '<label style="font-size:11px;">Client bonus (₦)<input id="rg-cb" class="rg-i" type="number" min="0" value="' + SET.clientBonus + '"></label>'
      + '<label style="font-size:11px;">Smallest gig that counts (₦)<input id="rg-mg" class="rg-i" type="number" min="0" value="' + SET.minGig + '"></label>'
      + '<label style="font-size:11px;">Days a new member can add a code<input id="rg-wd" class="rg-i" type="number" min="0" value="' + SET.windowDays + '"></label></div>'
      + '<label style="display:block;font-size:12px;margin:10px 0;"><input id="rg-on" type="checkbox"' + (SET.enabled ? ' checked' : '') + '> Referral bonuses are on</label>'
      + '<button class="rg-b p" onclick="ssRefSave()">Save settings</button> <span style="font-size:10px;color:var(--td);">Changes apply to every unpaid referral. Needs the admin panel unlocked.</span></details>'
      + (top.length ? '<div class="rg-c"><div style="font-weight:700;font-size:13px;margin-bottom:6px;">Top referrers</div>' + top.map(function (t) { return '<div style="font-size:12px;display:flex;justify-content:space-between;padding:3px 0;"><span>' + esc(t.name) + '</span><span style="color:var(--td);">' + t.n + ' invited · ' + t.paid + ' paid · ' + ngn(t.amt) + '</span></div>'; }).join('') + '</div>' : '')
      + '<div style="display:flex;gap:6px;flex-wrap:wrap;margin:10px 0;align-items:center;">'
      + ['all', 'pending', 'paid', 'void'].map(function (f) { return '<button class="rg-b' + (FILTER === f ? ' p' : '') + '" onclick="ssRefFilter(\'' + f + '\')">' + { all: 'All', pending: 'In progress', paid: 'Paid', void: 'Cancelled' }[f] + '</button>'; }).join('')
      + '<input id="rg-q" class="rg-i" style="max-width:200px;" placeholder="Search name or code" value="' + esc(Q) + '" oninput="ssRefSearch(this.value)">'
      + '<button class="rg-b" onclick="ssRefSweep()">Re-check all now</button></div>'
      + (list.length ? list.map(function (r) {
        return '<div class="rg-c"><div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;align-items:center;"><div style="font-size:13px;"><b>' + esc(r.referrerName) + '</b> invited <b>' + esc(r.referredName) + '</b> <span style="color:var(--td);font-size:11px;">(' + (r.role === 'freelancer' ? 'freelancer' : 'client') + ')</span></div>' + stat(r) + '</div>'
          + '<div style="font-size:11px;color:var(--td);margin-top:5px;line-height:1.6;">Code ' + esc(r.code) + ' · joined ' + esc(ago(r.created)) + (r.paidAt ? ' · paid ' + esc(ago(r.paidAt)) : '') + (r.note ? ' · ' + esc(r.note) : '') + '</div>'
          + (r.status === 'pending' ? '<div style="font-size:12px;margin-top:5px;">' + prog(r) + '</div><div style="margin-top:8px;"><button class="rg-b d" onclick="ssRefAct(\'' + esc(r.id) + '\',\'void\')">Cancel this referral</button></div>' : '')
          + (r.status === 'void' ? '<div style="margin-top:8px;"><button class="rg-b" onclick="ssRefAct(\'' + esc(r.id) + '\',\'reopen\')">Reopen</button></div>' : '') + '</div>';
      }).join('') : '<div style="font-size:12px;color:var(--td);">Nothing here yet.</div>') + '</div>';
  }
  window.ssRefFilter = function (f) { FILTER = f; draw(); };
  window.ssRefSearch = function (v) { Q = v; draw(); var i = $('rg-q'); if (i) { i.focus(); i.setSelectionRange(v.length, v.length); } };
  window.ssRefSave = async function () {
    function n(id, def) { var v = Number(($(id) || {}).value); return v >= 0 ? Math.round(v) : def; }
    var x = { enabled: !!($('rg-on') || {}).checked, freelancerBonus: n('rg-fb', 500), clientBonus: n('rg-cb', 1000), minGig: n('rg-mg', 10000), windowDays: n('rg-wd', 7), updatedBy: me().uid, updatedAt: Date.now() };
    try { await F().setDoc(F().doc(window.FB_DB, 'payment_settings', 'referral'), x); SET = x; say('Referral settings saved.'); draw(); }
    catch (e) { console.warn(e); say('Could not save (is the admin panel unlocked?).', true); }
  };
  window.ssRefAct = async function (id, action) {
    var note = ''; if (action === 'void') { try { note = (prompt('Why are you cancelling this referral? (optional)', '') || '').slice(0, 200); } catch (e) {} }
    var r; try { r = await call('/referral/admin', { action: action, id: id, note: note }); } catch (e) { r = {}; }
    if (r.ok) { say(action === 'void' ? 'Referral cancelled.' : 'Referral reopened.'); await load(); draw(); }
    else say(r.error === 'locked' ? 'Unlock the admin panel first.' : 'Could not update (' + (r.error || 'error') + ').', true);
  };
  window.ssRefSweep = async function () {
    var r; try { r = await call('/referral/admin', { action: 'sweep' }); } catch (e) { r = {}; }
    if (r.ok) { say('Checked ' + r.checked + ' referral(s). ' + r.paid + ' paid.'); await load(); draw(); }
    else say(r.error === 'locked' ? 'Unlock the admin panel first.' : 'Could not check right now.', true);
  };
  function addTab() {
    var tabs = $('adm-tabs'), root = $('admin-root'); if (!tabs || !root || $('admt-referrals')) return;
    var b = document.createElement('button'); b.id = 'admt-referrals'; b.textContent = '🎁 Referrals'; b.setAttribute('onclick', "adminTab('referrals')");
    b.style.cssText = 'padding:7px 13px;font-size:11px;font-family:Plus Jakarta Sans,sans-serif;font-weight:700;border-radius:6px;border:1px solid var(--br);background:var(--s);color:var(--td);cursor:pointer;';
    tabs.appendChild(b);
    var p = document.createElement('div'); p.id = 'admtab-referrals'; p.style.display = 'none'; root.appendChild(p);
  }
  var rA = window.renderAdminV6;
  if (typeof rA === 'function') window.renderAdminV6 = function () { var r = rA.apply(this, arguments); try { if (can()) { addTab(); load(); } } catch (e) {} return r; };
  var tA = window.adminTab;
  if (typeof tA === 'function') window.adminTab = function (name) {
    var r = tA.apply(this, arguments);
    try {
      var p = $('admtab-referrals'), b = $('admt-referrals'), on = name === 'referrals' && can();
      if (p) p.style.display = on ? 'block' : 'none';
      if (b) { b.style.background = on ? 'var(--acc)' : 'var(--s)'; b.style.color = on ? '#fff' : 'var(--td)'; b.style.borderColor = on ? 'var(--acc)' : 'var(--br)'; }
      if (on) load().then(draw);
    } catch (e) {}
    return r;
  };
})();
