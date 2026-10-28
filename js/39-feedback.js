// SkillStamp — Visible feedback (39-feedback.js)
// Presentation-only helpers so problems are no longer silent.
//  1) Sign-up errors are written into a message box on step 1 of the form, which
//     is hidden once the user is on the last step. Mirror them into a toast.
//  2) Firestore writes that the server rejects were only logged to the console.
//     Show a short notice (rate-limited) so a "success" that didn't save is noticed.
// Removing this <script> tag restores the old behaviour. No logic is changed.
(function () {
  'use strict';

  // 1) sign-up / login error visibility
  if (typeof window.showAErr === 'function') {
    var _orig = window.showAErr;
    window.showAErr = function (id, msg) {
      try { _orig.apply(this, arguments); } catch (e) {}
      try {
        if (msg && (id === 'ri-err') && typeof window.toast === 'function') window.toast(msg, 'bad');
      } catch (e) {}
    };
  }

  // 2) rejected saves
  var lastShown = 0;
  window.onFbWriteFail = function (col, id, err) {
    try {
      var code = (err && (err.code || err.message)) || 'error';
      // quiet collections where failures are expected / unimportant to the user
      if (col === 'analytics_events' || col === 'notifications') return;
      // Visitors who are not signed in never see save errors (the landing page
      // makes background writes that are correctly refused for them).
      if (!window.ME || !window.ME.uid) return;
      var now = Date.now();
      if (now - lastShown < 6000) return;
      lastShown = now;
      var denied = /permission|insufficient/i.test(String(code));
      if (typeof window.toast === 'function') {
        window.toast(denied
          ? 'We couldn\'t save that change. Please refresh and try again.'
          : 'Couldn\'t save. Check your connection and try again.', 'bad');
      }
    } catch (e) {}
  };

  // 3) Landing page "Members" pill: the real member count is only readable
  //    after sign-in. If it can't be read, hide the pill instead of showing a
  //    bare label ("Growing Members").
  function fixMembersPill() {
    var el = document.getElementById('login-user-count');
    if (!el) return;
    var pill = el.closest('.ls-gs-pill');
    var apply = function () {
      if (!pill) return;
      var t = (el.textContent || '').trim();
      pill.style.display = (t === 'Growing' || t === '') ? 'none' : '';
    };
    new MutationObserver(apply).observe(el, { childList: true, characterData: true, subtree: true });
    apply();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fixMembersPill);
  else fixMembersPill();
})();
