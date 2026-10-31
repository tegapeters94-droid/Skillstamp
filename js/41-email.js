/* Welcome email hook. Calls the SkillStamp email service once for a brand-new account.
   Does not touch auth or data logic; fails silently. */
(function () {
  var API = 'https://skillstamp-email.tegapeters94.workers.dev';
  if (!API) return;
  var tries = 0;
  function key(uid) { return 'ss_welcome_' + uid; }
  function check() {
    tries++;
    if (tries > 600) return clearInterval(t);
    try {
      var me = window.ME, u = window.FB_AUTH && window.FB_AUTH.currentUser;
      if (!me || !me.uid || !u || u.uid !== me.uid) return;
      var created = Number(me.created) || 0;
      if (!created || Date.now() - created > 15 * 60 * 1000) return clearInterval(t);
      if (localStorage.getItem(key(me.uid))) return clearInterval(t);
      clearInterval(t);
      localStorage.setItem(key(me.uid), '1');
      u.getIdToken().then(function (tok) {
        return fetch(API + '/welcome', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + tok },
          body: JSON.stringify({ name: me.name || '', role: me.role || '' })
        });
      }).catch(function () { try { localStorage.removeItem(key(me.uid)); } catch (e) {} });
    } catch (e) {}
  }
  var t = setInterval(check, 3000);
})();

/* Settings: email notifications switch (stored on the user's own profile as emailNotifs) */
(function () {
  function inject() {
    try {
      var panel = document.getElementById('settings-panel');
      if (!panel || panel.querySelector('#ss-email-pref') || !window.ME) return;
      var body = panel.querySelector('.ss-body');
      if (!body) return;
      var on = window.ME.emailNotifs !== false;
      var card = document.createElement('div');
      card.id = 'ss-email-pref';
      card.style.cssText = 'margin:0 16px 12px;';
      card.innerHTML =
        '<div style="font-size:10px;font-weight:700;color:var(--td);text-transform:uppercase;letter-spacing:.08em;padding:0 4px;margin-bottom:6px;">Email</div>' +
        '<div style="background:var(--s);border:1px solid var(--br);border-radius:14px;padding:14px 16px;display:flex;align-items:center;gap:14px;">' +
        '<div style="flex:1;min-width:0;"><div style="font-weight:700;font-size:14px;color:var(--tx);">Email notifications</div>' +
        '<div style="font-size:12px;color:var(--td);margin-top:2px;line-height:1.45;">Get an email for new proposals, hires, deliveries, payments and verification updates.</div></div>' +
        '<button id="ss-email-sw" type="button" role="switch" aria-checked="' + on + '" style="flex-shrink:0;width:46px;height:28px;border-radius:14px;border:none;cursor:pointer;position:relative;transition:background .2s;background:' + (on ? '#1a6b3c' : '#9aa59d') + ';">' +
        '<span style="position:absolute;top:3px;left:' + (on ? '21px' : '3px') + ';width:22px;height:22px;border-radius:50%;background:#fff;transition:left .2s;box-shadow:0 1px 3px rgba(0,0,0,.3);"></span></button></div>';
      var first = body.children[1] || body.children[0];
      if (first && first.nextSibling) body.insertBefore(card, first.nextSibling); else body.appendChild(card);
      var sw = card.querySelector('#ss-email-sw');
      sw.onclick = function () {
        var next = !(window.ME.emailNotifs !== false);
        window.ME.emailNotifs = next;
        sw.setAttribute('aria-checked', String(next));
        sw.style.background = next ? '#1a6b3c' : '#9aa59d';
        sw.firstChild.style.left = next ? '21px' : '3px';
        try {
          var F = window.FB_FNS;
          F.updateDoc(F.doc(window.FB_DB, 'users', window.ME.uid), { emailNotifs: next }).catch(function () {
            window.ME.emailNotifs = !next;
            sw.setAttribute('aria-checked', String(!next));
            sw.style.background = !next ? '#1a6b3c' : '#9aa59d';
            sw.firstChild.style.left = !next ? '21px' : '3px';
            if (window.toast) window.toast("Couldn't save that. Please try again.");
          });
        } catch (e) {}
      };
    } catch (e) {}
  }
  var prev = window.openSettings;
  if (typeof prev === 'function') {
    window.openSettings = function () {
      var r = prev.apply(this, arguments);
      inject();
      return r;
    };
  }
})();
