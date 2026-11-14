/* SkillStamp - Admin > Risk tab. Shows payouts and withdrawals the Worker flagged as risky (new accounts, big or very fast
   payouts, repeated pairs, freshly topped-up money going straight out) so you can look before paying by hand.
   Nothing is blocked automatically. Needs the Payments tool. Removing this file just removes the tab. */
(function () {
  'use strict';
  function $(id) { return document.getElementById(id); }
  function F() { return window.FB_FNS; }
  function me() { return window.ME; }
  function can() { var m = me(); return !!(m && m.isAdmin && (!Array.isArray(m.adminScope) || m.adminScope.indexOf('payments') >= 0)); }
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function ngn(n) { return '₦' + (Number(n) || 0).toLocaleString('en-US'); }
  function say(m, bad) { try { if (window.toast) window.toast(m, bad ? 'bad' : undefined); } catch (e) {} }
  var FLAGS = [], INFO = {};
  var CSS = '<style>.rk-b{padding:7px 12px;font-size:11px;font-weight:700;border-radius:8px;border:1px solid var(--br);background:var(--s);color:var(--tx);cursor:pointer;font-family:inherit}.rk-b.p{background:var(--acc);color:#fff;border-color:var(--acc)}.rk-b.d{color:#b42318}.rk-c{border:1px solid var(--br);border-radius:12px;padding:12px;margin-bottom:10px;background:var(--s)}.rk-s{display:inline-block;padding:2px 8px;border-radius:10px;font-size:10px;font-weight:800}</style>';
  function badge() {
    var n = FLAGS.filter(function (f) { return f.status === 'open'; }).length;
    var b = $('admt-risk'); if (b) b.textContent = '🚩 Risk' + (n ? ' (' + n + ')' : '');
  }
  async function loadFlags() {
    if (!can()) return;
    try {
      var s = await F().getDocs(F().collection(window.FB_DB, 'risk_flags'));
      FLAGS = s.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); }).sort(function (a, b) {
        var ao = a.status === 'open' ? 0 : 1, bo = b.status === 'open' ? 0 : 1;
        return ao - bo || (b.score || 0) - (a.score || 0) || (b.created || 0) - (a.created || 0);
      });
      badge();
    } catch (e) { console.warn('[risk]', e); }
  }
  async function who(uid) {
    if (INFO[uid]) return INFO[uid];
    try {
      var d = await F().getDoc(F().doc(window.FB_DB, 'users', uid)), u = d.data() || {}, w = u.wallet || {};
      INFO[uid] = { name: u.name, days: Math.floor((Date.now() - (Number(u.created) || Date.now())) / 86400000), balance: w.balance || 0, held: w.held || 0, earned: w.earned || 0 };
    } catch (e) { INFO[uid] = {}; }
    return INFO[uid];
  }
  function ago(ts) { try { return typeof window.timeAgo === 'function' ? window.timeAgo(ts) : new Date(ts).toLocaleString(); } catch (e) { return ''; } }
  async function draw() {
    var p = $('admtab-risk'); if (!p) return;
    p.innerHTML = CSS + '<div style="padding:12px;font-size:12px;color:var(--td);">Loading...</div>';
    await loadFlags();
    var open = FLAGS.filter(function (f) { return f.status === 'open'; }), done = FLAGS.filter(function (f) { return f.status !== 'open'; }).slice(0, 12);
    for (var i = 0; i < open.length && i < 20; i++) if (open[i].payeeUid) await who(open[i].payeeUid);
    function card(f) {
      var pi = INFO[f.payeeUid] || {}, hi = f.score >= 70, isOpen = f.status === 'open';
      var title = f.kind === 'withdrawal' ? 'Withdrawal ' + ngn(f.amount) + (f.ref ? ' · ' + esc(f.ref) : '') : 'Payout ' + ngn(f.payout || f.amount) + ' · ' + esc(f.gigTitle || 'gig');
      var who1 = f.kind === 'withdrawal' ? 'Member: <b>' + esc(f.payeeName) + '</b>' : 'Client <b>' + esc(f.posterName) + '</b> paid freelancer <b>' + esc(f.payeeName) + '</b>';
      return '<div class="rk-c"><div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;align-items:center;"><div style="font-weight:800;font-size:13px;">' + title + '</div><span class="rk-s" style="background:' + (hi ? 'rgba(239,68,68,.12);color:#b42318' : 'rgba(255,167,38,.18);color:#9a5b00') + ';">Risk ' + esc(f.score) + '</span></div>'
        + '<div style="font-size:12px;margin:6px 0;line-height:1.6;">' + who1 + ' · ' + esc(ago(f.created)) + '</div>'
        + '<ul style="margin:4px 0 8px 16px;padding:0;font-size:12px;line-height:1.55;">' + (f.reasons || []).map(function (r) { return '<li>' + esc(r) + '</li>'; }).join('') + '</ul>'
        + (pi.name ? '<div style="font-size:11px;color:var(--td);margin-bottom:8px;">Account is ' + pi.days + ' day(s) old · balance ' + ngn(pi.balance) + ' · held for withdrawal ' + ngn(pi.held) + ' · earned ' + ngn(pi.earned) + '</div>' : '')
        + (isOpen ? '<div style="display:flex;gap:6px;flex-wrap:wrap;"><button class="rk-b p" onclick="ssRiskSet(\'' + esc(f.id) + '\',\'cleared\')">Looks fine</button><button class="rk-b d" onclick="ssRiskSet(\'' + esc(f.id) + '\',\'confirmed\')">Suspicious: keep an eye</button></div>'
          : '<div style="font-size:11px;color:var(--td);">' + (f.status === 'cleared' ? '✅ Cleared' : '⚠️ Marked suspicious') + (f.note ? ' · ' + esc(f.note) : '') + '</div>')
        + '</div>';
    }
    p.innerHTML = CSS + '<div style="padding:12px;max-width:640px;"><div style="font-weight:800;font-size:15px;margin-bottom:4px;">Risk review</div>'
      + '<div style="font-size:12px;color:var(--td);line-height:1.6;margin-bottom:12px;">Payouts and withdrawals that look unusual. Nothing is blocked: this is a list to check before you pay a withdrawal by hand. Marking one &ldquo;suspicious&rdquo; also warns you on that member&rsquo;s future withdrawals.</div>'
      + '<div style="font-weight:700;font-size:13px;margin-bottom:6px;">Needs a look (' + open.length + ')</div>' + (open.map(card).join('') || '<div style="font-size:12px;color:var(--td);margin-bottom:12px;">Nothing flagged. 🎉</div>')
      + (done.length ? '<div style="font-weight:700;font-size:13px;margin:14px 0 6px;">Reviewed</div>' + done.map(card).join('') : '') + '</div>';
  }
  window.ssRiskSet = async function (id, status) {
    var note = ''; try { note = (prompt('Add a note (optional):', '') || '').slice(0, 200); } catch (e) {}
    try {
      await F().updateDoc(F().doc(window.FB_DB, 'risk_flags', id), { status: status, note: note, reviewedBy: me().uid, reviewedAt: Date.now() });
      say(status === 'cleared' ? 'Marked as fine.' : 'Marked as suspicious.'); draw();
    } catch (e) { console.warn(e); say('Could not save (is the admin panel unlocked?).', true); }
  };
  function addTab() {
    var tabs = $('adm-tabs'), root = $('admin-root'); if (!tabs || !root || $('admt-risk')) return;
    var b = document.createElement('button'); b.id = 'admt-risk'; b.textContent = '🚩 Risk'; b.setAttribute('onclick', "adminTab('risk')");
    b.style.cssText = 'padding:7px 13px;font-size:11px;font-family:Plus Jakarta Sans,sans-serif;font-weight:700;border-radius:6px;border:1px solid var(--br);background:var(--s);color:var(--td);cursor:pointer;';
    tabs.appendChild(b);
    var p = document.createElement('div'); p.id = 'admtab-risk'; p.style.display = 'none'; root.appendChild(p);
  }
  var rA = window.renderAdminV6;
  if (typeof rA === 'function') window.renderAdminV6 = function () { var r = rA.apply(this, arguments); try { if (can()) { addTab(); loadFlags(); } } catch (e) {} return r; };
  var tA = window.adminTab;
  if (typeof tA === 'function') window.adminTab = function (name) {
    var r = tA.apply(this, arguments);
    try {
      var p = $('admtab-risk'), b = $('admt-risk'), on = name === 'risk' && can();
      if (p) p.style.display = on ? 'block' : 'none';
      if (b) { b.style.background = on ? 'var(--acc)' : 'var(--s)'; b.style.color = on ? '#fff' : 'var(--td)'; b.style.borderColor = on ? 'var(--acc)' : 'var(--br)'; }
      if (on) draw();
    } catch (e) {}
    return r;
  };
  setInterval(function () { try { var r = $('admin-root'); if (can() && r && r.offsetParent !== null) loadFlags(); } catch (e) {} }, 120000);
})();
