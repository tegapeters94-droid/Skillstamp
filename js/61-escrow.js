/* SkillStamp - live-wallet escrow settlement via the Worker.
   Test wallets keep the older client-side behaviour. For live (real-money) wallets:
   - a freelancer collects a completed gig's payout through the Worker, which checks the client's
     escrow really exists and moves the money;
   - a client who deletes an unhired gig gets the escrow back through the Worker. */
(function () {
  'use strict';
  var API = window.SS_API || 'https://skillstamp-email.tegapeters94.workers.dev';
  function me() { return window.ME; }
  function live() { return !!(me() && me().walletMode !== 'test'); }
  function say(m, bad) { try { if (window.toast) window.toast(m, bad ? 'bad' : undefined); } catch (e) {} }
  async function post(path, body) {
    var u = window.FB_AUTH && window.FB_AUTH.currentUser; if (!u) throw new Error('signed-out');
    var tok = await u.getIdToken();
    var r = await fetch(API + path, { method: 'POST', headers: { 'Authorization': 'Bearer ' + tok, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    var j = {}; try { j = await r.json(); } catch (e) {}
    j._status = r.status; return j;
  }

  /* helpers used by posting, proposals, re-hire and the admin dispute tool */
  window.ssEscrowLock = async function (kind, id) {
    try {
      var j = await post('/escrow/lock', { kind: kind, id: id });
      if (j._status === 409) j = await post('/escrow/lock', { kind: kind, id: id });
      return j;
    } catch (e) { return { ok: false, error: 'network' }; }
  };
  window.ssEscrowCancel = function (proposalId) { return post('/escrow/cancel-proposal', { proposalId: proposalId }); };
  window.ssEscrowSettle = function (gigId) { return post('/escrow/settle', { gigId: gigId }); };

  /* client: collect the escrow back for proposals the freelancer declined */
  var refunding = false;
  function doneSet() { try { return JSON.parse(localStorage.getItem('ss_prop_refunded') || '{}'); } catch (e) { return {}; } }
  async function refundRejected() {
    if (refunding || !me() || !me().uid || !live()) return;
    refunding = true;
    try {
      var F = window.FB_FNS;
      var snap = await F.getDocs(F.query(F.collection(window.FB_DB, 'proposals'), F.where('fromUid', '==', me().uid)));
      var done = doneSet(), changed = false;
      var list = snap.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); }).filter(function (p) { return p.status === 'rejected' && !done[p.id]; });
      for (var i = 0; i < list.length; i++) {
        var j = await post('/escrow/cancel-proposal', { proposalId: list[i].id });
        if (j.ok) {
          done[list[i].id] = 1; changed = true;
          if (j.refunded > 0) { if (j.wallet) me().wallet = j.wallet; say('₦' + Number(j.refunded).toLocaleString() + ' escrow returned: proposal declined.'); try { window.renderWallet(); } catch (e) {} }
        }
      }
      if (changed) { try { localStorage.setItem('ss_prop_refunded', JSON.stringify(done)); } catch (e) {} }
    } catch (e) { console.warn('[escrow] refundRejected', e); }
    refunding = false;
  }
  setTimeout(refundRejected, 6000);
  setInterval(refundRejected, 120000);

  /* freelancer: collect payouts for completed gigs */
  var claiming = false;
  async function claimAll() {
    if (claiming || !me() || me().role !== 'freelancer' || !live()) return;
    claiming = true;
    try {
      var all = await window.fbGetAll('gigs');
      var mine = (all || []).filter(function (g) { return g.hiredUid === me().uid && g.status === 'completed'; });
      for (var i = 0; i < mine.length; i++) {
        var g = mine[i], txs = (me().wallet && me().wallet.transactions) || [];
        if (txs.some(function (t) { return t.id === 'pay_' + g.id; })) continue;
        var j = await post('/escrow/claim', { gigId: g.id });
        if (j._status === 409) { j = await post('/escrow/claim', { gigId: g.id }); }
        if (j.ok && j.wallet) {
          var fresh = !j.already;
          me().wallet = j.wallet;
          if (fresh) { me().repPoints = (me().repPoints || 0) + 20; me().gigsCount = (me().gigsCount || 0) + 1; }
          try { await window.saveUser(me()); } catch (e) { console.warn('[escrow] save after claim', e); }
          if (fresh) say('Payment received for: ' + (g.title || 'your gig') + '.');
          try { if (window.renderWallet) window.renderWallet(); if (window.updateHomeStats) window.updateHomeStats(); } catch (e) {}
        } else if (j.error === 'client-underfunded') {
          console.warn('[escrow] client escrow missing for', g.id);
        }
      }
    } catch (e) { console.warn('[escrow] claimAll', e); }
    claiming = false;
  }
  var rec = window.reconcileFreelancerGigState;
  if (typeof rec === 'function') {
    window.reconcileFreelancerGigState = async function () {
      var r = await rec.apply(this, arguments);
      await claimAll();
      return r;
    };
  }
  setInterval(function () { if (me() && me().role === 'freelancer') claimAll(); }, 60000);

  /* client: delete an unhired gig and get the escrow back */
  var del = window.deleteGig;
  if (typeof del === 'function') {
    window.deleteGig = function (gid) {
      var gig = (window.getGigs && window.getGigs() || []).filter(function (g) { return g.id === gid; })[0];
      if (!live() || !gig || !(Number(gig.escrowAmount) > 0) || gig.hiredUid || gig.status !== 'open') return del.apply(this, arguments);
      if (!confirm('Delete this gig? Your escrow of ₦' + Number(gig.escrowAmount).toLocaleString() + ' will go back to your wallet.')) return;
      (async function () {
        try {
          var j = await post('/escrow/refund', { gigId: gid });
          if (j.ok) {
            if (j.wallet) me().wallet = j.wallet;
            CACHE.gigs = CACHE.gigs.filter(function (g) { return g.id !== gid; });
            if (window.closeModal) window.closeModal();
            say('Gig deleted. ₦' + Number(j.refunded || 0).toLocaleString() + ' returned to your wallet.');
            if (window.renderGigs) window.renderGigs();
            if (window.renderWallet) window.renderWallet();
          } else if (j.error === 'already-refunded') { say('This gig was already refunded.', true); }
          else if (j.error === 'no-lock') { say('This older gig has no escrow record. Please ask support to refund it.', true); }
          else { say('Could not delete the gig right now. Please try again.', true); }
        } catch (e) { say('Could not delete the gig right now. Please try again.', true); }
      })();
    };
  }
})();
