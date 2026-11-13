/* SkillStamp - "funded" check for open gigs.
   A gig counts as funded when the Worker has locked the client's money (escrowOk),
   when it was posted with test credits (escrowTest), or when it was posted before this
   check existed. Open gigs that are not funded are hidden from other members, cannot be
   applied to, and are tagged "Unfunded" for their owner. Removing this file restores the old behaviour. */
(function () {
  'use strict';
  var CUTOFF = 1794571200000; /* gigs posted before this are treated as funded (legacy) */
  function funded(g) {
    return !!g && (g.escrowOk === true || g.escrowTest === true || (Number(g.created) || 0) < CUTOFF || (g.status && g.status !== 'open'));
  }
  window.ssGigFunded = funded;

  /* hide unfunded open gigs from everybody except their owner and the admin */
  var orig = window.getGigs;
  if (typeof orig === 'function') {
    window.getGigs = function () {
      var all = orig();
      var m = window.ME;
      if (!m || m.isAdmin || !Array.isArray(all)) return all;
      return all.filter(function (g) { return g.posterUid === m.uid || funded(g); });
    };
  }

  /* block applying to an unfunded gig, even if it is somehow still on screen */
  var oa = window.applyGig;
  if (typeof oa === 'function') {
    window.applyGig = function (gid) {
      try {
        var g = (window.CACHE && CACHE.gigs || []).find(function (x) { return x.id === gid; });
        if (g && !funded(g)) { if (window.toast) window.toast('This gig has no money locked in escrow yet, so it cannot take applications.', 'bad'); return; }
      } catch (e) {}
      return oa.apply(this, arguments);
    };
  }

  /* tag the owner's own unfunded gigs on the gig list */
  function tag() {
    try {
      var m = window.ME; if (!m) return;
      document.querySelectorAll('.gig-item[data-gid]').forEach(function (el) {
        if (el.getAttribute('data-ufd')) return;
        var g = (window.CACHE && CACHE.gigs || []).find(function (x) { return x.id === el.getAttribute('data-gid'); });
        if (!g || funded(g)) return;
        el.setAttribute('data-ufd', '1');
        var t = el.querySelector('.gig-title');
        if (t) t.insertAdjacentHTML('beforeend', '<span title="No money is locked for this gig. Freelancers cannot see it." style="font-size:9px;padding:2px 7px;border-radius:10px;background:rgba(239,68,68,.1);color:#ef4444;border:1px solid rgba(239,68,68,.25);margin-left:5px;">Unfunded</span>');
      });
    } catch (e) {}
  }
  var busy = false;
  try {
    var mo = new MutationObserver(function () {
      if (busy) return; busy = true;
      try { tag(); } finally { mo.takeRecords(); busy = false; }
    });
    var start = function () { mo.observe(document.body, { childList: true, subtree: true }); };
    if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
  } catch (e) {}
})();
