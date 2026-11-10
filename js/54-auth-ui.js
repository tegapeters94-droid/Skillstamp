/* SkillStamp - sign-in screen helpers (display only; remove this file to go back to the old behaviour)
   1) Show/hide password uses clean icons instead of emoji.
   2) The sign-up progress label reads "1 of 2" instead of "1 / 2". */
(function () {
  'use strict';
  var EYE = '<svg class="lc" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/></svg>';
  var OFF = '<svg class="lc" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49"/><path d="M14.084 14.158a3 3 0 0 1-4.242-4.242"/><path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143"/><path d="m2 2 20 20"/></svg>';
  window.togglePwdVis = function (inputId, btn) {
    var inp = document.getElementById(inputId);
    if (!inp) return;
    var show = inp.type === 'password';
    inp.type = show ? 'text' : 'password';
    var b = typeof btn === 'string' ? document.getElementById(btn) : btn;
    if (b) { b.innerHTML = show ? OFF : EYE; b.setAttribute('aria-label', show ? 'Hide password' : 'Show password'); }
  };
  function stepLabel() {
    var el = document.getElementById('ob-step-label');
    if (!el || el.__ssObs) return;
    el.__ssObs = true;
    var fix = function () { var t = el.textContent; if (/\s\/\s/.test(t)) el.textContent = t.replace(/\s\/\s/, ' of '); };
    new MutationObserver(fix).observe(el, { childList: true, characterData: true, subtree: true });
    fix();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', stepLabel); else stepLabel();
})();
