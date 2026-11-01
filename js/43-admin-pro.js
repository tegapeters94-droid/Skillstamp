/* SkillStamp - Admin tools: disputes & refunds, gig/escrow oversight, user management
   (message, ban with reason, permanent removal) and platform health numbers.
   Adds to the existing admin panel; does not change sign-in or user-facing logic. */
(function () {
  'use strict';

  var FEE = 0.10;
  var HELD = ['open', 'hired', 'delivered', 'in_progress', 'disputed'];
  var ACTIVE = ['hired', 'delivered', 'in_progress', 'disputed'];

  /* ───────────── helpers ───────────── */
  function F() { return window.FB_FNS; }
  function DB() { return window.FB_DB; }
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function money(n) { n = Number(n) || 0; return '$' + (Math.round(n * 100) / 100).toLocaleString(undefined, { maximumFractionDigits: 2 }); }
  function ago(ts) {
    if (!ts) return 'unknown';
    var s = Math.max(1, Math.floor((Date.now() - ts) / 1000));
    if (s < 3600) return Math.max(1, Math.floor(s / 60)) + 'm ago';
    if (s < 86400) return Math.floor(s / 3600) + 'h ago';
    return Math.floor(s / 86400) + 'd ago';
  }
  function dt(ts) { return ts ? new Date(ts).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '-'; }
  function say(m, bad) { try { if (window.toast) window.toast(m, bad ? 'bad' : undefined); } catch (e) {} }
  function admin() { return !!(window.ME && window.ME.isAdmin); }
  async function readAll(col) {
    var s = await F().getDocs(F().collection(DB(), col));
    return s.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); });
  }
  async function readDoc(col, id) {
    var s = await F().getDoc(F().doc(DB(), col, id));
    return s.exists() ? Object.assign({ id: s.id }, s.data()) : null;
  }
  function upd(col, id, data) { return F().updateDoc(F().doc(DB(), col, id), data); }
  function put(col, id, data) { return F().setDoc(F().doc(DB(), col, id), data); }
  function log(a, uid, name, detail) { try { if (window.ssLog) window.ssLog(a, uid, name, detail); } catch (e) {} }
  function userName(uid) { var u = window.getUser && window.getUser(uid); return u ? u.name : 'Unknown user'; }
  function escrowOf(g) { return Number((g && g.escrowAmount) || 0); }
  function title(g) { return (g && g.title) || 'Untitled gig'; }
  function notify(uid, type, ttl, body, meta) {
    var id = 'notif_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
    return put('notifications', id, {
      id: id, uid: uid, type: type, title: String(ttl).slice(0, 120), body: String(body).slice(0, 400),
      meta: Object.assign({ type: type }, meta || {}), read: false, ts: Date.now(), fromUid: window.ME.uid
    });
  }
  function pill(text, tone) { return '<span class="ap-pill ap-' + (tone || 'n') + '">' + esc(text) + '</span>'; }
  function statusTone(s) { return { open: 'b', hired: 'b', in_progress: 'b', delivered: 'a', disputed: 'r', completed: 'g', cancelled: 'n', pending: 'a', resolved: 'g' }[s] || 'n'; }
  function loading() { return '<div class="ap-empty">Loading…</div>'; }
  function empty(t) { return '<div class="ap-empty">' + esc(t) + '</div>'; }

  /* ───────────── drawer ───────────── */
  function apOpen(html) {
    apClose();
    var o = document.createElement('div');
    o.id = 'ap-ov'; o.className = 'ap-ov';
    o.innerHTML = '<div class="ap-panel" role="dialog" aria-modal="true">' + html + '</div>';
    o.addEventListener('mousedown', function (e) { if (e.target === o) apClose(); });
    document.body.appendChild(o);
    requestAnimationFrame(function () { o.classList.add('in'); });
    return o;
  }
  function apClose() { var o = $('ap-ov'); if (o) o.remove(); }
  window.apClose = apClose;
  function head(t, sub) {
    return '<div class="ap-head"><div><div class="ap-title">' + esc(t) + '</div>' + (sub ? '<div class="ap-sub">' + sub + '</div>' : '') + '</div>'
      + '<button class="ap-x" onclick="apClose()" aria-label="Close">&times;</button></div>';
  }
  function kv(k, v) { return '<div class="ap-kv"><span>' + esc(k) + '</span><b>' + v + '</b></div>'; }

  /* ═════════════════════ DISPUTES ═════════════════════ */
  var D = { list: [], filter: 'open' };
  var RES = { type: 'refund' };

  function isOpenDisp(d) { return d.status !== 'resolved'; }

  window.renderAdminDisputes = async function () {
    var el = $('admtab-disputes'); if (!el) return;
    el.innerHTML = loading();
    try { D.list = await readAll('disputes'); }
    catch (e) { el.innerHTML = empty('Could not load disputes. Check your connection and the Firestore rules.'); return; }
    drawDisputes();
    updateTabBadge();
  };

  function updateTabBadge() {
    var b = $('admt-disputes'); if (!b) return;
    var old = b.querySelector('.ap-count'); if (old) old.remove();
    var n = D.list.filter(isOpenDisp).length;
    if (n) { var s = document.createElement('span'); s.className = 'ap-count'; s.textContent = n; b.appendChild(s); }
  }

  function drawDisputes() {
    var el = $('admtab-disputes'); if (!el) return;
    var open = D.list.filter(isOpenDisp), done = D.list.filter(function (d) { return !isOpenDisp(d); });
    var shown = D.filter === 'open' ? open : D.filter === 'resolved' ? done : D.list;
    shown = shown.slice().sort(function (a, b) { return D.filter === 'open' ? (a.ts || 0) - (b.ts || 0) : (b.ts || 0) - (a.ts || 0); });
    var h = '<div class="ap-bar"><div class="ap-chips">'
      + chip('open', 'Open', open.length) + chip('resolved', 'Resolved', done.length) + chip('all', 'All', D.list.length)
      + '</div><button class="ap-btn ap-ghost" onclick="renderAdminDisputes()">Refresh</button></div>';
    if (!shown.length) h += empty(D.filter === 'open' ? 'No open disputes. Everything is resolved.' : 'Nothing to show here yet.');
    h += shown.map(function (d) {
      var g = (CACHE.gigs || []).find(function (x) { return x.id === d.gigId; }) || {};
      var overdue = isOpenDisp(d) && Date.now() - (d.ts || 0) > 864e5;
      return '<button class="ap-card" onclick="apDispute(\'' + esc(d.id) + '\')">'
        + '<div class="ap-card-top"><b>' + esc(title(g)) + '</b>' + (isOpenDisp(d) ? pill(overdue ? 'Overdue' : 'Open', overdue ? 'r' : 'a') : pill('Resolved', 'g')) + '</div>'
        + '<div class="ap-card-mid">' + esc(d.reason || 'Dispute') + ' &middot; raised by ' + esc(d.raisedByName || userName(d.raisedBy)) + '</div>'
        + '<div class="ap-card-bot"><span>' + money(escrowOf(g)) + ' in escrow</span><span>' + ago(d.ts) + '</span></div></button>';
    }).join('');
    el.innerHTML = h;
  }
  function chip(k, label, n) {
    return '<button class="ap-chip' + (D.filter === k ? ' on' : '') + '" onclick="apDispFilter(\'' + k + '\')">' + label + ' <i>' + n + '</i></button>';
  }
  window.apDispFilter = function (k) { D.filter = k; drawDisputes(); };

  window.apDispute = async function (id) {
    var d = D.list.find(function (x) { return x.id === id; });
    if (!d) return;
    apOpen(head('Dispute', 'Loading…') + loading());
    var g = null;
    try { g = await readDoc('gigs', d.gigId); } catch (e) {}
    if (!g) { apOpen(head('Dispute') + empty('The gig for this dispute no longer exists.')); return; }
    RES.type = 'refund';
    var open = isOpenDisp(d);
    var h = head(title(g), pill(open ? 'Open dispute' : 'Resolved', open ? 'a' : 'g') + ' &nbsp;' + money(escrowOf(g)) + ' in escrow')
      + '<div class="ap-body">'
      + sec('What was reported')
      + '<div class="ap-note"><b>' + esc(d.reason || 'Dispute') + '</b><br>' + esc(d.detail || '').replace(/\n/g, '<br>') + '<div class="ap-meta">Raised by ' + esc(d.raisedByName || userName(d.raisedBy)) + ' &middot; ' + dt(d.ts) + '</div></div>'
      + sec('The work')
      + gigFacts(g)
      + '<div class="ap-row"><button class="ap-btn ap-ghost" onclick="apChat(\'' + esc(g.id) + '\')">View workspace chat</button>'
      + '<button class="ap-btn ap-ghost" onclick="apMessage(\'' + esc(g.posterUid) + '\',\'' + esc(g.id) + '\')">Message client</button>'
      + (g.hiredUid ? '<button class="ap-btn ap-ghost" onclick="apMessage(\'' + esc(g.hiredUid) + '\',\'' + esc(g.id) + '\')">Message freelancer</button>' : '') + '</div>'
      + '<div id="ap-chat"></div>';
    if (open) h += sec('Your decision') + decisionHTML(g, d.id);
    else h += sec('Decision') + '<div class="ap-note"><b>' + esc(resLabel(d.resolution)) + '</b>' + (d.note ? '<br>' + esc(d.note) : '') + '<div class="ap-meta">By ' + esc(d.resolvedByName || 'admin') + ' &middot; ' + dt(d.resolvedAt) + '</div></div>';
    h += '</div>';
    apOpen(h);
    if (open) previewDecision(g);
  };
  function resLabel(r) { return { refund: 'Refunded the client in full', release: 'Released payment to the freelancer', split: 'Split the payment', dismiss: 'Dismissed, work continues' }[r] || 'Resolved'; }
  function sec(t) { return '<div class="ap-sec">' + esc(t) + '</div>'; }
  function gigFacts(g) {
    return '<div class="ap-box">'
      + kv('Client', esc(g.posterName || userName(g.posterUid)))
      + kv('Freelancer', esc(g.hiredUid ? userName(g.hiredUid) : 'Not hired'))
      + kv('Gig status', pill(g.status || 'open', statusTone(g.status)))
      + kv('Escrow', money(escrowOf(g)))
      + kv('Posted', dt(g.created))
      + (g.hiredAt ? kv('Hired', dt(g.hiredAt)) : '')
      + (g.deliveredAt ? kv('Delivered', dt(g.deliveredAt)) : '')
      + (g.deliveryLink ? kv('Delivery link', '<a href="' + esc(g.deliveryLink) + '" target="_blank" rel="noopener noreferrer">Open</a>') : '')
      + (g.deliveryNote ? kv('Delivery note', esc(String(g.deliveryNote).slice(0, 200))) : '')
      + (g.revisionCount ? kv('Revisions', esc(g.revisionCount)) : '')
      + '</div>';
  }

  /* decision form (shared by disputes and direct gig interventions) */
  function decisionHTML(g, dispId, only) {
    var opts = [
      ['refund', 'Refund the client', 'All of the escrow goes back to the client\'s wallet. The gig is cancelled.'],
      ['release', 'Pay the freelancer', 'Payment is released to the freelancer (minus the 10% platform fee). The gig is marked complete.'],
      ['split', 'Split the payment', 'Return part to the client and pay the rest to the freelancer.'],
      ['dismiss', 'Dismiss the dispute', 'No money moves. The gig goes back to in progress.']
    ].filter(function (o) { return !only || only.indexOf(o[0]) >= 0; });
    if (only) RES.type = only[0];
    var h = '<div class="ap-opts">' + opts.map(function (o) {
      return '<label class="ap-opt' + (o[0] === RES.type ? ' on' : '') + '" id="ap-o-' + o[0] + '"><input type="radio" name="apd" ' + (o[0] === RES.type ? 'checked' : '') + ' onchange="apPick(\'' + o[0] + '\')"><span><b>' + o[1] + '</b><small>' + o[2] + '</small></span></label>';
    }).join('') + '</div>';
    h += '<div id="ap-split" style="display:none;"><label class="ap-lbl">Refund to client ($)</label><input class="ap-in" id="ap-refund" type="number" min="0" max="' + escrowOf(g) + '" step="1" value="' + Math.round(escrowOf(g) / 2) + '" oninput="apPreview()"></div>';
    h += '<div class="ap-prev" id="ap-prev"></div>';
    h += '<label class="ap-lbl">Note to both people (required)</label><textarea class="ap-in" id="ap-note" rows="3" placeholder="Explain the decision. Both the client and freelancer will see this."></textarea>';
    h += '<button class="ap-btn ap-primary" id="ap-apply" onclick="apApply(\'' + esc(g.id) + '\',\'' + esc(dispId || '') + '\')">Apply decision</button>';
    window._apGig = g;
    return h;
  }
  window.apPick = function (t) {
    RES.type = t;
    ['refund', 'release', 'split', 'dismiss'].forEach(function (k) { var e = $('ap-o-' + k); if (e) e.classList.toggle('on', k === t); });
    var sp = $('ap-split'); if (sp) sp.style.display = t === 'split' ? 'block' : 'none';
    var b = $('ap-apply'); if (b) { b.textContent = 'Apply decision'; b.dataset.arm = ''; }
    previewDecision(window._apGig);
  };
  window.apPreview = function () { previewDecision(window._apGig); };
  function amounts(g) {
    var e = escrowOf(g), t = RES.type, refund = 0, release = 0;
    if (t === 'refund') refund = e;
    else if (t === 'release') release = e;
    else if (t === 'split') {
      var v = Number(($('ap-refund') || {}).value);
      refund = Math.min(e, Math.max(0, isFinite(v) ? v : 0)); release = e - refund;
    }
    var fee = Math.round(release * FEE * 100) / 100;
    return { refund: refund, release: release, fee: fee, payout: release - fee };
  }
  function previewDecision(g) {
    var p = $('ap-prev'); if (!p || !g) return;
    var a = amounts(g);
    if (RES.type === 'dismiss') { p.innerHTML = 'No money moves. ' + money(escrowOf(g)) + ' stays locked in escrow.'; return; }
    p.innerHTML = '<div><span>Client gets back</span><b>' + money(a.refund) + '</b></div>'
      + '<div><span>Freelancer receives</span><b>' + money(a.payout) + '</b></div>'
      + '<div><span>Platform fee (10%)</span><b>' + money(a.fee) + '</b></div>';
  }

  window.apApply = async function (gid, dispId) {
    var btn = $('ap-apply'); if (!btn) return;
    var note = (($('ap-note') || {}).value || '').trim();
    if (!note) { say('Add a note that explains the decision.', true); return; }
    if (btn.dataset.arm !== '1') { btn.dataset.arm = '1'; btn.textContent = RES.type === 'dismiss' ? 'Tap again to confirm' : 'Tap again to confirm - this moves money'; return; }
    btn.disabled = true; btn.textContent = 'Applying…';
    try {
      var g = await readDoc('gigs', gid);
      if (!g) throw new Error('gig missing');
      var type = RES.type, now = Date.now(), e = escrowOf(g);
      var a = amounts(g);
      var poster = await readDoc('users', g.posterUid);
      var held = 0, back = 0;
      if (type !== 'dismiss') {
        if (!poster) throw new Error('client account missing');
        var w = Object.assign({ balance: 0, pending: 0, earned: 0, transactions: [] }, poster.wallet || {});
        w.transactions = (w.transactions || []).slice();
        held = Math.min(e, Number(w.pending) || 0);   // never move more than was really locked
        back = Math.min(a.refund, held);
        w.pending = (Number(w.pending) || 0) - held;
        w.balance = (Number(w.balance) || 0) + back;
        if (back > 0) w.transactions.unshift({ id: 'refund_' + gid + '_' + now, type: 'in', amount: back, from: 'SkillStamp Support', desc: 'Refund: ' + title(g), ts: now });
        if (held - back > 0) w.transactions.unshift({ id: 'rel_' + gid + '_' + now, type: 'out', amount: held - back, from: g.hiredUid ? userName(g.hiredUid) : 'Freelancer', desc: 'Released by Support: ' + title(g), ts: now });
        await upd('users', g.posterUid, { wallet: w });
        var cu = (CACHE.users || []).find(function (u) { return u.uid === g.posterUid; });
        if (cu) cu.wallet = w;
      }
      var res = { type: type, note: note, refund: back, release: type === 'dismiss' ? 0 : a.release, by: window.ME.uid, byName: window.ME.name || '', at: now };
      var patch = { resolution: res };
      if (type === 'refund') { patch.status = 'cancelled'; patch.escrowRefunded = back; }
      else if (type === 'release') { patch.status = 'completed'; patch.completedAt = now; }
      else if (type === 'split') {
        patch.originalEscrow = e; patch.escrowAmount = a.release; patch.escrowRefunded = back; patch.completedAt = now;
        patch.status = a.release > 0 ? 'completed' : 'cancelled';
      } else patch.status = g.deliveredAt ? 'delivered' : 'hired';
      await upd('gigs', gid, patch);
      var cg = (CACHE.gigs || []).findIndex(function (x) { return x.id === gid; });
      if (cg >= 0) Object.assign(CACHE.gigs[cg], patch);
      if (dispId) await upd('disputes', dispId, { status: 'resolved', resolution: type, note: note, refund: back, release: res.release, resolvedBy: window.ME.uid, resolvedByName: window.ME.name || '', resolvedAt: now });

      // tell both people
      var t = title(g);
      var clientMsg = type === 'refund' ? money(back) + ' was returned to your wallet.' : type === 'release' ? 'Payment was released to the freelancer.' : type === 'split' ? money(back) + ' was returned to your wallet and the rest was paid to the freelancer.' : 'The dispute was dismissed and the work continues.';
      var flMsg = type === 'refund' ? 'The payment was refunded to the client.' : type === 'dismiss' ? 'The dispute was dismissed and the work continues.' : 'You will receive ' + money(a.payout) + ' (after the 10% platform fee). It appears in your wallet next time you open SkillStamp.';
      var jobs = [notify(g.posterUid, 'dispute_resolved', 'Dispute resolved: ' + t, clientMsg + ' Note from Support: ' + note, { gigId: gid })];
      if (g.hiredUid) jobs.push(notify(g.hiredUid, 'dispute_resolved', 'Dispute resolved: ' + t, flMsg + ' Note from Support: ' + note, { gigId: gid }));
      await Promise.all(jobs.map(function (p) { return p.catch(function () {}); }));
      log('resolve_dispute', g.posterUid, g.posterName || '', type + ' · ' + t + ' · refund ' + money(back) + ' · pay ' + money(a.payout));
      say('Decision applied. Both people were notified.');
      apClose();
      if ($('admtab-disputes') && $('admtab-disputes').style.display !== 'none') window.renderAdminDisputes();
      if ($('admtab-gigs') && $('admtab-gigs').style.display !== 'none') window.renderAdminGigs();
    } catch (err) {
      console.warn('[admin] decision failed', err);
      say('Could not apply the decision: ' + (err && err.message ? err.message : 'try again'), true);
      btn.disabled = false; btn.dataset.arm = ''; btn.textContent = 'Apply decision';
    }
  };

  /* workspace chat (evidence) */
  window.apChat = async function (gid) {
    var box = $('ap-chat'); if (!box) return;
    box.innerHTML = loading();
    try {
      var g = await readDoc('gigs', gid);
      var q = F().query(F().collection(DB(), 'conversations'), F().where('participants', 'array-contains', g.posterUid));
      var snap = await F().getDocs(q);
      var c = snap.docs.map(function (d) { return d.data(); }).find(function (x) { return (x.participants || []).indexOf(g.hiredUid) >= 0; });
      log('view_chat', g.posterUid, g.posterName || '', 'Dispute evidence for ' + title(g));
      if (!c || !(c.messages || []).length) { box.innerHTML = '<div class="ap-note">No messages between these two people.</div>'; return; }
      var msgs = c.messages.slice(-40);
      box.innerHTML = '<div class="ap-chat">' + msgs.map(function (m) {
        var mine = m.from === g.posterUid;
        return '<div class="ap-msg ' + (mine ? 'c' : 'f') + '"><small>' + esc(userName(m.from)) + ' &middot; ' + esc(dt(m.ts)) + '</small>' + esc(m.text || '') + (m.img ? '<em>[photo]</em>' : '') + '</div>';
      }).join('') + '</div><div class="ap-meta">Showing the last ' + msgs.length + ' messages. Viewing is recorded in the activity log.</div>';
    } catch (e) {
      box.innerHTML = '<div class="ap-note">Could not load the chat. Publish the latest firestore.rules (admins need read access to conversations).</div>';
    }
  };

  /* contact a user */
  window.apMessage = function (uid, gid) {
    var u = (window.getUser && window.getUser(uid)) || { name: 'this person' };
    apOpen(head('Message ' + (u.name || 'user'), 'Sent as SkillStamp Support. They get it in their notifications and by email.')
      + '<div class="ap-body"><label class="ap-lbl">Your message</label><textarea class="ap-in" id="ap-msg" rows="5" maxlength="380" placeholder="Write clearly and politely. For example: we are looking into your dispute and need a delivery link."></textarea>'
      + '<button class="ap-btn ap-primary" id="ap-send" onclick="apSendMsg(\'' + esc(uid) + '\',\'' + esc(gid || '') + '\')">Send message</button></div>');
  };
  window.apSendMsg = async function (uid, gid) {
    var t = (($('ap-msg') || {}).value || '').trim();
    if (t.length < 5) { say('Write a message first.', true); return; }
    var b = $('ap-send'); if (b) { b.disabled = true; b.textContent = 'Sending…'; }
    try {
      await notify(uid, 'support', 'Message from SkillStamp Support', t, gid ? { gigId: gid } : {});
      log('message_user', uid, userName(uid), t.slice(0, 120));
      say('Message sent.'); apClose();
    } catch (e) { say('Could not send. Try again.', true); if (b) { b.disabled = false; b.textContent = 'Send message'; } }
  };

  /* ═════════════════════ GIGS & ESCROW ═════════════════════ */
  var G = { list: [], filter: 'all', q: '' };

  window.renderAdminGigs = async function () {
    var el = $('admtab-gigs'); if (!el) return;
    el.innerHTML = loading();
    try { G.list = await readAll('gigs'); } catch (e) { G.list = (CACHE.gigs || []).slice(); }
    drawGigs();
  };

  function gigStats(list) {
    var held = 0, disputed = 0, gmv = 0, fees = 0, done = 0;
    list.forEach(function (g) {
      var e = escrowOf(g);
      if (HELD.indexOf(g.status) >= 0) held += e;
      if (g.status === 'disputed') disputed += e;
      if (g.status === 'completed') { gmv += e; fees += e * FEE; done++; }
    });
    return { held: held, disputed: disputed, gmv: gmv, fees: fees, done: done };
  }
  function tile(label, val, sub, tone) {
    return '<div class="ap-tile"><div class="ap-tv' + (tone ? ' ' + tone : '') + '">' + val + '</div><div class="ap-tl">' + esc(label) + '</div>' + (sub ? '<div class="ap-ts">' + esc(sub) + '</div>' : '') + '</div>';
  }

  function drawGigs() {
    var el = $('admtab-gigs'); if (!el) return;
    var st = gigStats(G.list);
    var counts = { all: G.list.length, open: 0, active: 0, disputed: 0, completed: 0, cancelled: 0 };
    G.list.forEach(function (g) {
      if (g.status === 'open') counts.open++;
      else if (ACTIVE.indexOf(g.status) >= 0 && g.status !== 'disputed') counts.active++;
      else if (g.status === 'disputed') counts.disputed++;
      else if (g.status === 'completed') counts.completed++;
      else if (g.status === 'cancelled') counts.cancelled++;
    });
    var f = G.filter, q = G.q.toLowerCase();
    var rows = G.list.filter(function (g) {
      var ok = f === 'all' || (f === 'active' ? (ACTIVE.indexOf(g.status) >= 0 && g.status !== 'disputed') : g.status === f);
      if (!ok) return false;
      return !q || (title(g) + ' ' + (g.posterName || '') + ' ' + userName(g.hiredUid)).toLowerCase().indexOf(q) >= 0;
    }).sort(function (a, b) { return (b.created || 0) - (a.created || 0); });
    var h = '<div class="ap-tiles">'
      + tile('Held in escrow', money(st.held), 'across open and active gigs')
      + tile('In dispute', money(st.disputed), '', st.disputed ? 'r' : '')
      + tile('Completed value', money(st.gmv), st.done + ' gigs')
      + tile('Platform fees earned', money(st.fees), '10% of completed gigs', 'g') + '</div>';
    h += '<div class="ap-bar"><div class="ap-chips">'
      + ['all', 'open', 'active', 'disputed', 'completed', 'cancelled'].map(function (k) { return '<button class="ap-chip' + (f === k ? ' on' : '') + '" onclick="apGigFilter(\'' + k + '\')">' + k[0].toUpperCase() + k.slice(1) + ' <i>' + counts[k] + '</i></button>'; }).join('')
      + '</div><input class="ap-in ap-search" placeholder="Search gig or person…" value="' + esc(G.q) + '" oninput="apGigSearch(this.value)"></div>';
    if (!rows.length) h += empty('No gigs match.');
    h += rows.slice(0, 80).map(function (g) {
      return '<button class="ap-card" onclick="apGig(\'' + esc(g.id) + '\')"><div class="ap-card-top"><b>' + esc(title(g)) + '</b>' + pill(g.status || 'open', statusTone(g.status)) + '</div>'
        + '<div class="ap-card-mid">' + esc(g.posterName || userName(g.posterUid)) + (g.hiredUid ? ' &rarr; ' + esc(userName(g.hiredUid)) : ' &middot; no freelancer yet') + '</div>'
        + '<div class="ap-card-bot"><span>' + money(escrowOf(g)) + '</span><span>' + ago(g.created) + '</span></div></button>';
    }).join('');
    if (rows.length > 80) h += '<div class="ap-meta" style="text-align:center;">Showing the 80 newest. Use search to narrow down.</div>';
    el.innerHTML = h;
    var s = el.querySelector('.ap-search'); if (s && G.q) { s.focus(); s.setSelectionRange(G.q.length, G.q.length); }
  }
  window.apGigFilter = function (k) { G.filter = k; drawGigs(); };
  window.apGigSearch = function (v) { G.q = v || ''; drawGigs(); };

  window.apGig = function (gid) {
    var g = G.list.find(function (x) { return x.id === gid; }) || (CACHE.gigs || []).find(function (x) { return x.id === gid; });
    if (!g) return;
    var h = head(title(g), pill(g.status || 'open', statusTone(g.status)) + ' &nbsp;' + money(escrowOf(g)) + ' in escrow') + '<div class="ap-body">' + sec('Details') + gigFacts(g);
    if (g.description) h += '<div class="ap-note">' + esc(String(g.description).slice(0, 600)).replace(/\n/g, '<br>') + '</div>';
    if (g.resolution) h += '<div class="ap-note"><b>' + esc(resLabel(g.resolution.type)) + '</b><br>' + esc(g.resolution.note || '') + '<div class="ap-meta">' + dt(g.resolution.at) + '</div></div>';
    h += '<div class="ap-row"><button class="ap-btn ap-ghost" onclick="apMessage(\'' + esc(g.posterUid) + '\',\'' + esc(g.id) + '\')">Message client</button>'
      + (g.hiredUid ? '<button class="ap-btn ap-ghost" onclick="apMessage(\'' + esc(g.hiredUid) + '\',\'' + esc(g.id) + '\')">Message freelancer</button>' : '')
      + '<button class="ap-btn ap-ghost" onclick="apClose();viewProfile(\'' + esc(g.posterUid) + '\')">Client profile</button></div>';
    if (g.status === 'open') {
      h += sec('Take this gig down') + '<div class="ap-note">Removes the gig and returns the escrow to the client\'s wallet.</div>' + decisionHTML(g, '', ['refund']);
    } else if (ACTIVE.indexOf(g.status) >= 0) {
      h += '<div class="ap-row"><button class="ap-btn ap-ghost" onclick="apChat(\'' + esc(g.id) + '\')">View workspace chat</button></div><div id="ap-chat"></div>';
      h += sec('Step in on this gig') + decisionHTML(g, '', null);
    }
    h += '</div>';
    apOpen(h);
    if (g.status === 'open' || ACTIVE.indexOf(g.status) >= 0) previewDecision(g);
  };

  /* ═════════════════════ USERS ═════════════════════ */
  window.ssAdminUser = async function (uid) {
    var u = window.getUser && window.getUser(uid);
    if (!u) return;
    apOpen(head(u.name || 'User', esc(u.email || '')) + loading());
    var reports = [], disputes = [];
    try { reports = (await readAll('reports')).filter(function (r) { return r.targetUid === uid; }); } catch (e) {}
    try { disputes = (await readAll('disputes')).filter(function (d) { return d.raisedBy === uid; }); } catch (e) {}
    var gigs = CACHE.gigs || [];
    var posted = gigs.filter(function (g) { return g.posterUid === uid; }), worked = gigs.filter(function (g) { return g.hiredUid === uid; });
    var w = u.wallet || {};
    var banned = u.badgeStatus === 'suspended' || u.isBanned;
    var self = uid === window.ME.uid;
    var h = head(u.name || 'User', esc(u.email || '') + ' &nbsp;' + pill(banned ? 'Suspended' : (u.badgeStatus || 'beginner'), banned ? 'r' : 'g'))
      + '<div class="ap-body">' + sec('Account')
      + '<div class="ap-box">' + kv('Role', esc(u.role || '-')) + kv('Country', esc(u.country || '-')) + kv('Joined', dt(u.created)) + kv('Last active', dt(u.lastActive))
      + kv('Skill ID', esc(u.skillId || '-')) + kv('Reputation', esc(u.repPoints || 0)) + '</div>'
      + sec('Money') + '<div class="ap-box">' + kv('Wallet balance', money(w.balance)) + kv('Locked in escrow', money(w.pending)) + kv('Total earned', money(w.earned)) + '</div>'
      + sec('Activity') + '<div class="ap-box">' + kv('Gigs posted', posted.length) + kv('Gigs worked', worked.length)
      + kv('Reports against them', reports.length ? '<span style="color:var(--acc)">' + reports.length + '</span>' : '0') + kv('Disputes they raised', disputes.length) + '</div>';
    if (u.banReason) h += '<div class="ap-note"><b>Suspension reason</b><br>' + esc(u.banReason) + '</div>';
    h += sec('Actions') + '<div class="ap-row">'
      + '<button class="ap-btn ap-ghost" onclick="apMessage(\'' + esc(uid) + '\')">Message</button>'
      + '<button class="ap-btn ap-ghost" onclick="apClose();viewProfile(\'' + esc(uid) + '\')">View profile</button>';
    if (!self && !u.isAdmin) {
      h += banned ? '<button class="ap-btn ap-ghost" onclick="apBan(\'' + esc(uid) + '\',false)">Lift suspension</button>' : '<button class="ap-btn ap-warn" onclick="apBan(\'' + esc(uid) + '\',true)">Suspend</button>';
      h += '<button class="ap-btn ap-danger" onclick="apDelete(\'' + esc(uid) + '\')">Remove permanently</button>';
    }
    h += '</div></div>';
    apOpen(h);
  };

  window.apBan = function (uid, ban) {
    var u = window.getUser(uid); if (!u) return;
    if (!ban) { applyBan(uid, false, ''); return; }
    apOpen(head('Suspend ' + (u.name || 'user'), 'They will not be able to sign in, and their profile and gigs disappear from the platform.')
      + '<div class="ap-body"><label class="ap-lbl">Reason (shown in the activity log)</label><textarea class="ap-in" id="ap-reason" rows="3" placeholder="e.g. Repeated spam, fake portfolio, abusive messages"></textarea>'
      + '<button class="ap-btn ap-warn" id="ap-go" onclick="apBanGo(\'' + esc(uid) + '\')">Suspend account</button></div>');
  };
  window.apBanGo = function (uid) {
    var r = (($('ap-reason') || {}).value || '').trim();
    if (r.length < 3) { say('Add a short reason.', true); return; }
    applyBan(uid, true, r);
  };
  async function applyBan(uid, ban, reason) {
    var u = window.getUser(uid); if (!u) return;
    var patch = ban
      ? { badgeStatus: 'suspended', isBanned: true, banReason: reason, badgeBeforeBan: (u.badgeStatus && u.badgeStatus !== 'suspended') ? u.badgeStatus : 'beginner' }
      : { badgeStatus: u.badgeBeforeBan || 'beginner', isBanned: false, banReason: '' };
    try {
      await upd('users', uid, patch);
      Object.assign(u, patch);
      log(ban ? 'ban_user' : 'unban_user', uid, u.name || '', ban ? reason : 'Suspension lifted');
      say(ban ? (u.name || 'User') + ' suspended.' : (u.name || 'User') + ' reinstated.');
      apClose();
      if (typeof window.adminFilterUsers === 'function') window.adminFilterUsers();
    } catch (e) { say('Could not update the account.', true); }
  }

  /* permanent removal */
  window.apDelete = function (uid) {
    var u = window.getUser(uid); if (!u) return;
    var gigs = CACHE.gigs || [];
    var active = gigs.filter(function (g) { return (g.posterUid === uid || g.hiredUid === uid) && ACTIVE.indexOf(g.status) >= 0; });
    var openLocked = gigs.filter(function (g) { return g.posterUid === uid && g.status === 'open'; });
    var w = u.wallet || {};
    var block = '';
    if (active.length) block = 'They are part of ' + active.length + ' active gig' + (active.length > 1 ? 's' : '') + '. Resolve or cancel ' + (active.length > 1 ? 'those' : 'that') + ' first (use Gigs &amp; Escrow).';
    else if (Number(w.pending) > 0 || openLocked.length) block = 'They still have ' + money(w.pending) + ' locked in escrow' + (openLocked.length ? ' on ' + openLocked.length + ' open gig(s)' : '') + '. Take those gigs down first so the money is refunded.';
    var h = head('Remove ' + (u.name || 'user') + ' permanently', 'This cannot be undone.') + '<div class="ap-body">';
    h += '<div class="ap-note">This deletes their sign-in account, profile, avatar, posts, endorsements, proposals, skill submissions and gigs. The platform will no longer show them anywhere. Chat history with other people is kept for those people.</div>';
    if (Number(w.balance) > 0) h += '<div class="ap-note ap-warnbox">Their wallet holds ' + money(w.balance) + '. That balance will be lost when the account is removed.</div>';
    if (block) h += '<div class="ap-note ap-dangerbox">' + block + '</div>';
    else h += '<label class="ap-lbl">Type DELETE to confirm</label><input class="ap-in" id="ap-del-in" autocomplete="off" placeholder="DELETE"><button class="ap-btn ap-danger" id="ap-del-go" onclick="apDeleteGo(\'' + esc(uid) + '\')">Remove permanently</button>';
    h += '</div>';
    apOpen(h);
  };

  window.apDeleteGo = async function (uid) {
    if ((($('ap-del-in') || {}).value || '').trim() !== 'DELETE') { say('Type DELETE to confirm.', true); return; }
    var u = window.getUser(uid); if (!u) return;
    var b = $('ap-del-go'); if (b) { b.disabled = true; b.textContent = 'Removing…'; }
    try {
      // 1) the sign-in account (needs the email service)
      var api = window.SS_API;
      if (!api) throw new Error('email service address missing');
      var user = window.FB_AUTH && window.FB_AUTH.currentUser;
      if (!user) throw new Error('not signed in');
      var tok = await user.getIdToken();
      var r = await fetch(api + '/admin/delete-user', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tok }, body: JSON.stringify({ uid: uid }) });
      if (!r.ok) throw new Error(r.status === 503 ? 'delete service not set up yet' : r.status === 403 ? 'not allowed' : 'sign-in account could not be removed');
      // 2) their data
      var del = function (col, id) { return F().deleteDoc(F().doc(DB(), col, id)).catch(function () {}); };
      var sweep = async function (col, field) {
        try {
          var s = await F().getDocs(F().query(F().collection(DB(), col), F().where(field, '==', uid)));
          await Promise.all(s.docs.map(function (d) { return del(col, d.id); }));
        } catch (e) { console.warn('[admin] cleanup', col, field, e && e.message); }
      };
      await Promise.all([sweep('posts', 'uid'), sweep('gigs', 'posterUid'), sweep('endorsements', 'fromUid'), sweep('endorsements', 'toUid'),
        sweep('proposals', 'fromUid'), sweep('proposals', 'toUid'), sweep('skillVerifications', 'uid'), del('avatars', uid)]);
      await del('users', uid);
      CACHE.users = (CACHE.users || []).filter(function (x) { return x.uid !== uid; });
      CACHE.gigs = (CACHE.gigs || []).filter(function (x) { return x.posterUid !== uid; });
      CACHE.posts = (CACHE.posts || []).filter(function (x) { return x.uid !== uid; });
      log('delete_user', uid, u.name || '', 'Account removed permanently');
      say((u.name || 'Account') + ' was removed.');
      apClose();
      if (typeof window.renderAdminV6 === 'function') { window.renderAdminV6(); if (window.adminTab) window.adminTab('users'); }
    } catch (e) {
      console.warn('[admin] remove failed', e);
      say('Could not remove the account: ' + (e && e.message ? e.message : 'try again'), true);
      if (b) { b.disabled = false; b.textContent = 'Remove permanently'; }
    }
  };

  /* ═════════════════════ OVERVIEW: attention + money + funnel + growth ═════════════════════ */
  function days(n) {
    var out = [], d = new Date(); d.setHours(0, 0, 0, 0);
    for (var i = n - 1; i >= 0; i--) { var t = d.getTime() - i * 864e5; out.push({ t: t, v: 0 }); }
    return out;
  }
  function bucket(list, field, n) {
    var b = days(n), first = b[0].t;
    list.forEach(function (x) { var t = Number(x[field]) || 0; if (t >= first) { var i = Math.min(n - 1, Math.floor((t - first) / 864e5)); b[i].v++; } });
    return b;
  }
  function bars(b, color) {
    var max = Math.max.apply(null, b.map(function (x) { return x.v; }).concat([1])), w = 300, h = 64, gap = 4, bw = (w - gap * (b.length - 1)) / b.length;
    var svg = '<svg viewBox="0 0 ' + w + ' ' + (h + 14) + '" class="ap-chart" role="img">';
    b.forEach(function (x, i) {
      var bh = Math.max(x.v ? 4 : 1.5, (x.v / max) * h), X = i * (bw + gap);
      svg += '<rect x="' + X.toFixed(1) + '" y="' + (h - bh) + '" width="' + bw.toFixed(1) + '" height="' + bh.toFixed(1) + '" rx="2" fill="' + color + '" opacity="' + (x.v ? 1 : .25) + '"><title>' + new Date(x.t).toLocaleDateString() + ': ' + x.v + '</title></rect>';
    });
    svg += '<text x="0" y="' + (h + 11) + '" class="ap-ax">' + new Date(b[0].t).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + '</text>'
      + '<text x="' + w + '" y="' + (h + 11) + '" text-anchor="end" class="ap-ax">Today</text></svg>';
    return svg;
  }
  function funnelRow(label, n, total, tone) {
    var pct = total ? Math.round(n / total * 100) : 0;
    return '<div class="ap-fn"><div class="ap-fn-top"><span>' + esc(label) + '</span><b>' + n + ' <i>' + pct + '%</i></b></div><div class="ap-fn-bar"><div style="width:' + Math.max(pct, n ? 2 : 0) + '%;background:' + tone + ';"></div></div></div>';
  }

  async function injectOverview() {
    var panel = $('admtab-overview'); if (!panel) return;
    var host = $('ap-ov-host');
    if (!host) { host = document.createElement('div'); host.id = 'ap-ov-host'; panel.insertBefore(host, panel.firstChild); }
    host.innerHTML = '<div class="ap-empty">Loading platform health…</div>';
    var disputes = [], reports = [];
    try { disputes = await readAll('disputes'); } catch (e) {}
    try { reports = await readAll('reports'); } catch (e) {}
    D.list = disputes; updateTabBadge();
    var users = CACHE.users || [], gigs = CACHE.gigs || [];
    var openD = disputes.filter(isOpenDisp), openR = reports.filter(function (r) { return (r.status || 'open') === 'open'; });
    var pendSk = ((typeof LOCAL !== 'undefined' && LOCAL.get('pending')) || []).filter(function (p) { return p.status === 'pending'; }).length;
    var susp = users.filter(function (u) { return u.badgeStatus === 'suspended'; }).length;
    var oldest = openD.length ? Math.min.apply(null, openD.map(function (d) { return d.ts || Date.now(); })) : 0;
    var st = gigStats(gigs);
    var total = gigs.length, hired = gigs.filter(function (g) { return g.hiredUid; }).length;
    var delivered = gigs.filter(function (g) { return g.deliveredAt || g.status === 'delivered' || g.status === 'completed'; }).length;
    var completed = gigs.filter(function (g) { return g.status === 'completed'; }).length;
    var disp = gigs.filter(function (g) { return g.status === 'disputed' || (g.resolution && g.resolution.type); }).length;
    var avg = completed ? st.gmv / completed : 0;
    function att(label, n, sub, tab, tone) {
      return '<button class="ap-att ' + (n ? tone : '') + '" onclick="adminTab(\'' + tab + '\')"><b>' + n + '</b><span>' + esc(label) + '</span><small>' + esc(sub) + '</small></button>';
    }
    host.innerHTML = '<div class="ap-h">Needs your attention</div><div class="ap-atts">'
      + att('Open disputes', openD.length, openD.length ? 'Oldest ' + ago(oldest) : 'All clear', 'disputes', 'r')
      + att('Open reports', openR.length, openR.length ? 'Review and act' : 'All clear', 'reports', 'a')
      + att('Skills to review', pendSk, pendSk ? 'Waiting for approval' : 'All clear', 'skills', 'a')
      + att('Suspended accounts', susp, 'Manage in Users', 'users', 'n') + '</div>'
      + '<div class="ap-h">Money</div><div class="ap-tiles">'
      + tile('Held in escrow', money(st.held), 'open and active gigs')
      + tile('In dispute', money(st.disputed), '', st.disputed ? 'r' : '')
      + tile('Completed value', money(st.gmv), st.done + ' completed')
      + tile('Platform fees', money(st.fees), '10% of completed', 'g') + '</div>'
      + '<div class="ap-two"><div class="ap-cardbox"><div class="ap-h2">Gig funnel</div>'
      + funnelRow('Posted', total, total, '#1a6b3c') + funnelRow('Hired', hired, total, '#2563eb') + funnelRow('Delivered', delivered, total, '#b45309') + funnelRow('Completed', completed, total, '#15803d') + funnelRow('Disputed or intervened', disp, total, '#b91c1c')
      + '<div class="ap-meta">Average completed gig: ' + money(avg) + '</div></div>'
      + '<div class="ap-cardbox"><div class="ap-h2">Last 14 days</div><div class="ap-lbl2">New sign-ups</div>' + bars(bucket(users, 'created', 14), '#1a6b3c')
      + '<div class="ap-lbl2">Gigs posted</div>' + bars(bucket(gigs, 'created', 14), '#2563eb') + '</div></div>';
  }
  window.renderAdminHealth = injectOverview;

  /* ═════════════════════ wiring ═════════════════════ */
  function wrapAdminTab() {
    var prev = window.adminTab;
    if (typeof prev !== 'function' || prev.__ap) return;
    var w = function (name) {
      var r = prev.apply(this, arguments);
      try {
        ['disputes', 'gigs'].forEach(function (t) {
          var p = $('admtab-' + t), b = $('admt-' + t);
          if (p) p.style.display = t === name ? 'block' : 'none';
          if (b) { b.style.background = t === name ? 'var(--acc)' : 'var(--s)'; b.style.color = t === name ? '#fff' : 'var(--td)'; b.style.borderColor = t === name ? 'var(--acc)' : 'var(--br)'; }
        });
        if (name === 'disputes') window.renderAdminDisputes();
        if (name === 'gigs') window.renderAdminGigs();
        if (name === 'overview') injectOverview();
      } catch (e) { console.warn('[admin] tab', e); }
      return r;
    };
    w.__ap = true;
    window.adminTab = w;
  }
  wrapAdminTab();
})();
