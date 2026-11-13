/* SkillStamp - ask the Worker to email the admin when a member claims a deposit or requests a withdrawal.
   Wraps the existing functions and only adds a background call afterwards; it never changes their result.
   Removing this file restores the old behaviour (alerts then show only while the admin page is open). */
(function () {
  'use strict';
  var API = window.SS_API || 'https://skillstamp-email.tegapeters94.workers.dev';
  async function alertAdmin(kind) {
    try {
      var u = window.FB_AUTH && window.FB_AUTH.currentUser; if (!u) return;
      var tok = await u.getIdToken();
      var r = await fetch(API + '/admin/alert', { method: 'POST', headers: { 'Authorization': 'Bearer ' + tok, 'Content-Type': 'application/json' }, body: JSON.stringify({ kind: kind }) });
      var j = {}; try { j = await r.json(); } catch (e2) {}
      console.log('[admin alert]', kind, r.status, JSON.stringify(j));
    } catch (e) { /* the admin page still shows it; ignore */ }
  }
  function wrap(name, kind) {
    var orig = window[name];
    if (typeof orig !== 'function') return;
    window[name] = async function () {
      var r = await orig.apply(this, arguments);
      alertAdmin(kind);
      return r;
    };
  }
  wrap('ssDepositPaid', 'deposit');
  wrap('ssWithdrawGo', 'withdrawal');
})();
