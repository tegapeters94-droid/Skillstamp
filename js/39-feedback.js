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
      var now = Date.now();
      if (now - lastShown < 6000) return;
      lastShown = now;
      var denied = /permission|insufficient/i.test(String(code));
      if (typeof window.toast === 'function') {
        window.toast(denied
          ? 'Could not save (' + col + '): blocked by security rules.'
          : 'Could not save (' + col + '). Check your connection and try again.', 'bad');
      }
    } catch (e) {}
  };
})();
