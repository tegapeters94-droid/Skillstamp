/* SkillStamp - keeps live (real naira) wallets safe on the member's own device.
   A live wallet is changed only by the Worker or an admin. This module:
   1. stops profile saves (the member's own, or an admin's edit of a member) from writing a possibly out-of-date wallet back over the real one;
   2. refreshes the member's wallet from the server every minute and when they return to the tab, so a payout or top-up
      that arrived while the page was open shows up and is never overwritten.
   Test wallets are untouched. Removing this file restores the old behaviour. */
(function () {
  'use strict';
  var o = window.fbSet;
  if (typeof o === 'function') {
    window.fbSet = function (col, id, data) {
      try {
        var m = window.ME;
        if (col === 'users' && m && data && typeof data === 'object' && 'wallet' in data) {
          /* a saved copy of a profile may hold an out-of-date wallet: never write it back for live wallets
             (test wallets are still managed on the device; admin money tools write wallets directly) */
          var t = id === m.uid ? m : (typeof window.getUser === 'function' ? window.getUser(id) : null);
          if (!t || t.walletMode !== 'test') { data = Object.assign({}, data); delete data.wallet; }
        }
      } catch (e) {}
      return o.call(this, col, id, data);
    };
  }
  var busy = false;
  async function refresh() {
    var m = window.ME;
    if (busy || !m || !m.uid || m.walletMode === 'test' || typeof window.fbGet !== 'function' || document.hidden) return;
    busy = true;
    try {
      var f = await window.fbGet('users', m.uid);
      if (f && window.ME && window.ME.uid === m.uid) {
        var changed = JSON.stringify(f.wallet || null) !== JSON.stringify(window.ME.wallet || null);
        if (f.wallet) window.ME.wallet = f.wallet;
        if (Array.isArray(f.repDue)) window.ME.repDue = f.repDue;
        if (changed) {
          try { if (location.hash === '#wallet' && window.renderWallet) window.renderWallet(); } catch (e) {}
          try { if (window.updateHomeStats) window.updateHomeStats(); } catch (e) {}
        }
      }
    } catch (e) {}
    busy = false;
  }
  setInterval(refresh, 60000);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) refresh(); });
})();
