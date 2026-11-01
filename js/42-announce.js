/* Shows the admin's broadcast announcement to every signed-in user.
   The admin panel saves it to Firestore (meta/announcement); this listens for it. */
(function () {
  var started = false, unsub = null, current = null;
  function dismissedTs() { try { return Number(localStorage.getItem('ss_ann_dismissed') || 0); } catch (e) { return 0; } }
  function setDismissed(ts) { try { localStorage.setItem('ss_ann_dismissed', String(ts || 0)); } catch (e) {} }

  function render(ann) {
    var bar = document.getElementById('ann-bar'), txt = document.getElementById('ann-text');
    if (!bar || !txt) return;
    current = ann && ann.text ? ann : null;
    if (!current || (current.ts && current.ts <= dismissedTs())) { bar.style.display = 'none'; return; }
    txt.textContent = current.text;
    bar.style.display = 'flex';
  }

  function start() {
    if (started) return;
    var F = window.FB_FNS;
    if (!F || !window.FB_DB || !window.ME || !window.ME.uid) return;
    started = true;
    try {
      unsub = F.onSnapshot(F.doc(window.FB_DB, 'meta', 'announcement'), function (snap) {
        var d = snap && snap.exists && snap.exists() ? snap.data() : null;
        try { if (window.CACHE) window.CACHE.announcement = d && d.text ? d : null; } catch (e) {}
        render(d);
      }, function () { started = false; });
    } catch (e) { started = false; }
  }

  document.addEventListener('click', function (e) {
    var b = e.target && e.target.closest && e.target.closest('#ann-bar button');
    if (b && current && current.ts) setDismissed(current.ts);
  }, true);

  var n = 0;
  var t = setInterval(function () {
    n++;
    if (window.ME && window.ME.uid) {
      if (!started) start();
    } else if (started) {
      // signed out: stop listening so the next account starts clean
      try { if (unsub) unsub(); } catch (e) {}
      started = false; unsub = null; current = null;
      var bar = document.getElementById('ann-bar'); if (bar) bar.style.display = 'none';
    }
  }, 2000);
})();
